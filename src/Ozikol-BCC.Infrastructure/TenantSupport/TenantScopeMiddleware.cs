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
            path.StartsWith("/favicon", StringComparison.OrdinalIgnoreCase))
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
        string tenantKey = resolvedTenantKey ?? "(Default Fallback)";

        if (tenantProvider is TenantProvider tp)
        {
            var cachedTenants = tp.GetAllCachedTenants();
            var searchKey = (resolvedTenantKey ?? host).ToLowerInvariant();

            var match = cachedTenants.FirstOrDefault(t => t.IsActive && (
                t.TenantKey.Equals(searchKey, StringComparison.OrdinalIgnoreCase) ||
                t.PrimaryDomain.Equals(searchKey, StringComparison.OrdinalIgnoreCase) ||
                (!string.IsNullOrEmpty(t.CustomDomain) && t.CustomDomain.Equals(searchKey, StringComparison.OrdinalIgnoreCase)) ||
                (!string.IsNullOrEmpty(resolvedTenantKey) && t.TenantKey.Equals(resolvedTenantKey, StringComparison.OrdinalIgnoreCase))
            ));

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
        }

        IDisposable? scope = null;
        if (!string.IsNullOrEmpty(resolvedTenantKey))
        {
            scope = tenantProvider.BeginScope(resolvedTenantKey);
        }

        try
        {
            var connStr = tenantProvider.ConnectionString;
            if (targetDb == "Unknown") targetDb = ExtractDbName(connStr);

            Console.ForegroundColor = ConsoleColor.Yellow;
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
        // 1. Priority 1: Check explicit HTTP headers sent by Angular SPA (X-Tenant-Key or X-Tenant-Domain)
        if (httpContext.Request.Headers.TryGetValue("X-Tenant-Key", out var headerTenantKey) && !string.IsNullOrWhiteSpace(headerTenantKey))
        {
            return CleanIdentifier(headerTenantKey.ToString());
        }

        if (httpContext.Request.Headers.TryGetValue("X-Tenant-Domain", out var headerTenantDomain) && !string.IsNullOrWhiteSpace(headerTenantDomain))
        {
            return CleanIdentifier(headerTenantDomain.ToString());
        }

        // 2. Priority 2: Check Authorization Bearer header or User claims for tenant_key
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

        // 3. Priority 3: Check CORS Origin or Referer header (Angular client domain)
        string? originHeader = httpContext.Request.Headers["Origin"].ToString();
        if (string.IsNullOrEmpty(originHeader))
        {
            originHeader = httpContext.Request.Headers["Referer"].ToString();
        }

        if (!string.IsNullOrEmpty(originHeader) && Uri.TryCreate(originHeader, UriKind.Absolute, out var originUri))
        {
            string host = originUri.Authority; // e.g. "cocacola.localhost" or "localhost:4200"
            var cleanOrigin = CleanIdentifier(host);
            if (!string.IsNullOrEmpty(cleanOrigin))
            {
                return cleanOrigin;
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
