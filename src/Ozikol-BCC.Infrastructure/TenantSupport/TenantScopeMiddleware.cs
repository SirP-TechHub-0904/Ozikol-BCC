using System.Net;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;

namespace Ozikol_BCC.Infrastructure.TenantSupport;

/// <summary>
/// Intercepts incoming HTTP requests in Website & API to resolve and set the active Tenant Scope context.
/// Supports resolution via X-Tenant-Key header (Angular SPA), Origin/Referer header, JWT claims, and Host header.
/// </summary>
public class TenantScopeMiddleware
{
    private readonly RequestDelegate _next;

    public TenantScopeMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task Invoke(HttpContext httpContext, ITenantProvider tenantProvider)
    {
        var path = httpContext.Request.Path.ToString();
        if (path.StartsWith("/swagger", StringComparison.OrdinalIgnoreCase) ||
            path.StartsWith("/scalar", StringComparison.OrdinalIgnoreCase) ||
            path.StartsWith("/openapi", StringComparison.OrdinalIgnoreCase) ||
            path.StartsWith("/favicon", StringComparison.OrdinalIgnoreCase) ||
            path.StartsWith("/health", StringComparison.OrdinalIgnoreCase) ||
            path.StartsWith("/api/tenants", StringComparison.OrdinalIgnoreCase) ||
            path.StartsWith("/api/setup", StringComparison.OrdinalIgnoreCase))
        {
            await _next(httpContext);
            return;
        }

        string? resolvedTenantKey = ExtractTenantIdentifier(httpContext);
        var host = httpContext.Request.Host.ToString();
        var method = httpContext.Request.Method;
        var origin = httpContext.Request.Headers["Origin"].ToString();
        if (string.IsNullOrEmpty(origin)) origin = httpContext.Request.Headers["Referer"].ToString();

        // 1. Resolve Master Tenant Record from fast in-memory cache (< 0.1ms)
        string orgName = "Unknown";
        string primaryDomain = "None";
        string customDomain = "None";
        string apiUrl = "Default";
        string websiteUrl = "Default";
        string targetDb = "Unknown";
        string? targetLookup = resolvedTenantKey ?? CleanIdentifier(origin) ?? CleanIdentifier(host);

        CachedTenantEntry? match = null;
        if (tenantProvider is TenantProvider tp)
        {
            var cachedTenants = tp.GetAllCachedTenants();
            match = TenantProvider.FindMatchingTenant(cachedTenants, targetLookup);

            // On cache miss, immediately refresh from Master DB to capture newly onboarded tenants
            if (match == null && !string.IsNullOrEmpty(targetLookup) && !IsSystemDomain(targetLookup))
            {
                cachedTenants = tp.RefreshCachedTenants();
                match = TenantProvider.FindMatchingTenant(cachedTenants, targetLookup);
            }
        }

        // 2. Fail-Safe: If an explicit tenant domain or subdomain was requested but does not exist in Master Catalog,
        // STOP the pipeline immediately and return 404. Never silently fall back to another company's database!
        if (match == null && !string.IsNullOrEmpty(targetLookup) && !IsSystemDomain(targetLookup))
        {
            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine("========================================================================");
            Console.WriteLine($"[ROUTING ERROR] {method} {path}");
            Console.WriteLine($"  * Incoming Host URL : {host}");
            Console.WriteLine($"  * Origin / Referer  : {(string.IsNullOrEmpty(origin) ? "(Direct)" : origin)}");
            Console.WriteLine($"  * Requested Target  : {targetLookup}");
            Console.WriteLine($"  * Result            : 404 NOT FOUND (No active workspace matching this domain/subdomain)");
            Console.WriteLine("========================================================================");
            Console.ResetColor();

            httpContext.Response.StatusCode = (int)HttpStatusCode.NotFound;
            httpContext.Response.ContentType = "application/json";
            await httpContext.Response.WriteAsync(System.Text.Json.JsonSerializer.Serialize(new
            {
                statusCode = 404,
                error = "WorkspaceNotFound",
                message = "Workspace could not be found.",
                timestamp = DateTime.UtcNow
            }));
            return;
        }

        string tenantKey = match?.TenantKey ?? resolvedTenantKey ?? "(Default)";
        if (match != null)
        {
            tenantKey = match.TenantKey;
            orgName = match.OrganizationName;
            primaryDomain = match.PrimaryDomain;
            customDomain = match.CustomDomain ?? "(None)";
            apiUrl = match.ApiUrl ?? "(Default)";
            websiteUrl = match.WebsiteUrl ?? "(Default)";
            targetDb = match.DatabaseName;
        }

        IDisposable? scope = null;
        if (match != null)
        {
            // Bind scope directly to the matched TenantKey
            scope = tenantProvider.BeginScope(match.TenantKey);
        }
        else if (!string.IsNullOrEmpty(resolvedTenantKey))
        {
            scope = tenantProvider.BeginScope(resolvedTenantKey);
        }

        try
        {
            var connStr = tenantProvider.ConnectionString;
            if (targetDb == "Unknown") targetDb = ExtractDbName(connStr);

            Console.ForegroundColor = ConsoleColor.Green;
            Console.WriteLine("========================================================================");
            Console.WriteLine($"[MASTER ROUTING & DOMAIN CHECK] {method} {path}");
            Console.WriteLine($"  * Incoming Host URL : {host}");
            Console.WriteLine($"  * Origin / Referer  : {(string.IsNullOrEmpty(origin) ? "(Direct)" : origin)}");
            Console.WriteLine($"  * Tenant Key        : {tenantKey}");
            Console.WriteLine($"  * Organization      : {orgName}");
            Console.WriteLine($"  * Default Domain    : {primaryDomain}");
            Console.WriteLine($"  * Custom Domain     : {customDomain}");
            Console.WriteLine($"  * API Gateway URL   : {apiUrl}");
            Console.WriteLine($"  * Website URL       : {websiteUrl}");
            Console.WriteLine($"  * Channeled Database: {targetDb}");
            Console.WriteLine("========================================================================");
            Console.ResetColor();

            await _next(httpContext);
        }
        finally
        {
            scope?.Dispose();
        }
    }

    /// <summary>
    /// Checks if a hostname or token is a reserved local system word rather than a sovereign tenant.
    /// </summary>
    private static bool IsSystemDomain(string? val)
    {
        if (string.IsNullOrWhiteSpace(val)) return true;
        var lower = val.Trim().ToLowerInvariant().Split(':')[0];
        return lower == "localhost" || lower == "127.0.0.1" || lower == "www" || lower == "api" || lower == "central" || lower == "admin";
    }

    private static string ExtractDbName(string? connStr)
    {
        if (string.IsNullOrEmpty(connStr)) return "Unknown";
        var parts = connStr.Split(';');
        foreach (var p in parts)
        {
            if (p.Trim().StartsWith("Database=", StringComparison.OrdinalIgnoreCase) ||
                p.Trim().StartsWith("Initial Catalog=", StringComparison.OrdinalIgnoreCase))
            {
                return p.Split('=')[1].Trim();
            }
        }
        return "Unknown";
    }

    private static string? ExtractTenantIdentifier(HttpContext httpContext)
    {
        // 1. Priority 1: Check CORS Origin or Referer header (the browser's active URL/domain)
        // If the browser is actively on a tenant subdomain/domain (e.g. cocacolanm.localhost), it MUST take precedence
        // over any potentially stale localStorage headers sent by the client SPA.
        string? originHeader = httpContext.Request.Headers["Origin"].ToString();
        if (string.IsNullOrEmpty(originHeader))
        {
            originHeader = httpContext.Request.Headers["Referer"].ToString();
        }

        if (!string.IsNullOrEmpty(originHeader) && Uri.TryCreate(originHeader, UriKind.Absolute, out var originUri))
        {
            string originHost = originUri.Authority; // e.g. "cocacolanm.localhost:4200" or "company.org"
            var cleanOrigin = CleanIdentifier(originHost);
            if (!string.IsNullOrEmpty(cleanOrigin))
            {
                return cleanOrigin;
            }
        }

        // 2. Priority 2: Check explicit HTTP headers sent by Angular SPA (X-Tenant-Key or X-Tenant-Domain)
        if (httpContext.Request.Headers.TryGetValue("X-Tenant-Key", out var headerTenantKey) && !string.IsNullOrWhiteSpace(headerTenantKey))
        {
            return CleanIdentifier(headerTenantKey.ToString());
        }

        if (httpContext.Request.Headers.TryGetValue("X-Tenant-Domain", out var headerTenantDomain) && !string.IsNullOrWhiteSpace(headerTenantDomain))
        {
            return CleanIdentifier(headerTenantDomain.ToString());
        }

        // 3. Priority 3: Check Authorization Bearer header or User claims for tenant_key
        string? authHeader = httpContext.Request.Headers["Authorization"].ToString();
        if (!string.IsNullOrEmpty(authHeader) && authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            var tokenStr = authHeader.Substring("Bearer ".Length).Trim();
            try
            {
                var parts = tokenStr.Split('.');
                if (parts.Length >= 2)
                {
                    var payload = parts[1];
                    switch (payload.Length % 4)
                    {
                        case 2: payload += "=="; break;
                        case 3: payload += "="; break;
                    }
                    var jsonBytes = Convert.FromBase64String(payload.Replace('-', '+').Replace('_', '/'));
                    using var doc = System.Text.Json.JsonDocument.Parse(jsonBytes);
                    var root = doc.RootElement;
                    if (root.TryGetProperty("tenant_key", out var tProp) ||
                        root.TryGetProperty("TenantKey", out tProp) ||
                        root.TryGetProperty("tenant", out tProp))
                    {
                        var val = tProp.GetString();
                        var cleanVal = CleanIdentifier(val ?? string.Empty);
                        if (!string.IsNullOrEmpty(cleanVal))
                        {
                            return cleanVal;
                        }
                    }
                }
            }
            catch { }
        }

        var user = httpContext.User;
        if (user?.Identity?.IsAuthenticated == true)
        {
            var tenantClaim = user.FindFirst("tenant_key")?.Value ?? user.FindFirst("TenantKey")?.Value;
            var cleanClaim = CleanIdentifier(tenantClaim ?? string.Empty);
            if (!string.IsNullOrEmpty(cleanClaim))
            {
                return cleanClaim;
            }
        }

        // 4. Priority 4: Fallback to HTTP Host header
        string hostHeader = httpContext.Request.Headers["Host"].ToString();
        var cleanHost = CleanIdentifier(hostHeader);
        if (!string.IsNullOrEmpty(cleanHost))
        {
            return cleanHost;
        }

        return null;
    }

    private static string? CleanIdentifier(string rawValue)
    {
        if (string.IsNullOrWhiteSpace(rawValue)) return null;

        var cleaned = rawValue
            .Trim()
            .Replace("https://", "", StringComparison.OrdinalIgnoreCase)
            .Replace("http://", "", StringComparison.OrdinalIgnoreCase)
            .Replace("www.", "", StringComparison.OrdinalIgnoreCase)
            .Split('/')[0];

        // If it's a domain with port like "cocacola.localhost:4200", extract the host part
        var hostOnly = cleaned.Split(':')[0];

        // Ignore generic local loopback hostnames that don't specify a tenant
        if (hostOnly.Equals("localhost", StringComparison.OrdinalIgnoreCase) ||
            hostOnly.Equals("127.0.0.1", StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        return hostOnly;
    }
}

public static class TenantScopeMiddlewareExtensions
{
    public static IApplicationBuilder UseTenantScopeMiddleware(this IApplicationBuilder builder)
    {
        return builder.UseMiddleware<TenantScopeMiddleware>();
    }
}
