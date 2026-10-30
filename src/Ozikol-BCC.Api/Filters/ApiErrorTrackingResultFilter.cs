using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;
using Ozikol_BCC.Api.Models;
using Ozikol_BCC.Application.Common;
using Ozikol_BCC.Application.Common.Errors;

namespace Ozikol_BCC.Api.Filters;

/// <summary>
/// Global MVC result filter that intercepts every non-success API response (<c>IsSuccess == false</c> or <c>HTTP &gt;= 400</c>),
/// assigns a standardized <c>ERR-XXXX</c> code and clean <c>CustomError</c> for the client, strips raw internal details,
/// and records the full <c>CustomError + RealError + ErrorCode</c> entry into <c>MasterApiErrorLogs</c> for Central inspection.
/// </summary>
public sealed class ApiErrorTrackingResultFilter : IAsyncActionFilter, IAsyncResultFilter
{
    private readonly ILogger<ApiErrorTrackingResultFilter> _logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="ApiErrorTrackingResultFilter"/> class.
    /// </summary>
    /// <param name="logger">Diagnostic logger.</param>
    public ApiErrorTrackingResultFilter(ILogger<ApiErrorTrackingResultFilter> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Enforces operational editor action boundaries before controller action execution:
    /// 1. Blocks <c>Read Only</c> auditors from executing write operations (POST, PUT, DELETE, PATCH) on console controllers.
    /// 2. Enforces module scope boundaries for <c>Feature Editor</c> accounts across User Management, CMS, Commerce, and Identity.
    /// </summary>
    /// <param name="context">The active action executing context.</param>
    /// <param name="next">The action execution continuation delegate.</param>
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var httpContext = context.HttpContext;
        var user = httpContext.User;
        if (user?.Identity?.IsAuthenticated == true)
        {
            var roles = user.Claims
                .Where(c => c.Type == System.Security.Claims.ClaimTypes.Role || c.Type == "role" || c.Type == "http://schemas.microsoft.com/ws/2008/06/identity/claims/role")
                .Select(c => c.Value.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            bool HasAnyRole(params string[] candidates) =>
                roles.Any(r => candidates.Contains(r.Replace(" ", ""), StringComparer.OrdinalIgnoreCase));

            var isGlobalPrivileged = HasAnyRole("SuperAdmin", "Admin", "SystemAdministrator", "GlobalEditor", "GlobalEdit");
            if (!isGlobalPrivileged)
            {
                var path = (httpContext.Request.Path.Value ?? string.Empty).ToLowerInvariant();
                var method = httpContext.Request.Method.ToUpperInvariant();
                var isWriteMethod = method is "POST" or "PUT" or "DELETE" or "PATCH";

                // Self-service and member endpoints are always permitted for authenticated users
                var isSelfServicePath = path.StartsWith("/api/auth") ||
                                        path.StartsWith("/api/portalusersapi") ||
                                        path.StartsWith("/api/profile") ||
                                        path.StartsWith("/api/groups") ||
                                        path.StartsWith("/api/notifications") ||
                                        path.StartsWith("/api/workspaceapi") ||
                                        path.EndsWith("/orders/checkout");

                if (!isSelfServicePath)
                {
                    var isReadOnlyAuditor = HasAnyRole("ReadOnly") &&
                                            !HasAnyRole("FeatureEditor", "FeatureEdit", "IdentityManager", "UserManager", "CmsManager", "ContentManager", "CommerceManager");

                    if (isReadOnlyAuditor && isWriteMethod)
                    {
                        context.Result = new ObjectResult(new ApiResponse<object>
                        {
                            IsSuccess = false,
                            ErrorCode = "ERR-4030",
                            Message = "Read-Only Auditor: You have view-only access and cannot create, modify, or delete workspace records.",
                            Errors = new List<string> { "Read-Only role cannot perform write operations." },
                            Timestamp = DateTime.UtcNow
                        })
                        {
                            StatusCode = StatusCodes.Status403Forbidden
                        };
                        return;
                    }

                    // Enforce per-feature view vs. edit/delete (CRUD) scope boundaries across all modular capability suites
                    bool HasViewScope(params string[] scopes) =>
                        HasAnyRole(scopes) ||
                        roles.Any(r => scopes.Any(s => r.Replace(" ", "").Contains(s, StringComparison.OrdinalIgnoreCase)));

                    bool HasEditScope(params string[] scopes) =>
                        HasAnyRole(scopes) ||
                        roles.Any(r =>
                        {
                            var clean = r.Replace(" ", "");
                            if (clean.StartsWith("ReadOnly:", StringComparison.OrdinalIgnoreCase) ||
                                clean.EndsWith(":Readonly", StringComparison.OrdinalIgnoreCase))
                            {
                                return false;
                            }
                            return scopes.Any(s => clean.Contains(s, StringComparison.OrdinalIgnoreCase));
                        });

                    IActionResult ForbiddenScope(string suiteName, bool isEditAttempt) =>
                        new ObjectResult(new ApiResponse<object>
                        {
                            IsSuccess = false,
                            ErrorCode = isEditAttempt ? "ERR-4030" : "ERR-4031",
                            Message = isEditAttempt
                                ? $"Action Restricted: You need Global Editor or Feature Editor permission on '{suiteName}' to create, edit, or delete records."
                                : $"Feature Restricted: Your role does not include access to '{suiteName}'.",
                            Errors = new List<string> { isEditAttempt ? $"Insufficient edit/delete authority for {suiteName}." : $"No access scope for {suiteName}." },
                            Timestamp = DateTime.UtcNow
                        })
                        {
                            StatusCode = StatusCodes.Status403Forbidden
                        };

                    if (path.StartsWith("/api/usersapi") || path.StartsWith("/api/registrationformapi"))
                    {
                        var scopes = new[] { "UserManager", "IdentityManager", "CrmManager", "UserManagement" };
                        if (!HasViewScope(scopes) && !HasAnyRole("ReadOnly"))
                        {
                            context.Result = ForbiddenScope("User Management", false);
                            return;
                        }
                        if (isWriteMethod && !HasEditScope(scopes))
                        {
                            context.Result = ForbiddenScope("User Management", true);
                            return;
                        }
                    }
                    else if (path.StartsWith("/api/contentapi") || path.StartsWith("/api/cmsdashboardapi"))
                    {
                        var scopes = new[] { "CMS", "CmsManager", "ContentManager", "Content" };
                        if (!HasViewScope(scopes) && !HasAnyRole("ReadOnly"))
                        {
                            context.Result = ForbiddenScope("Website & CMS Studio", false);
                            return;
                        }
                        if (isWriteMethod && !HasEditScope(scopes))
                        {
                            context.Result = ForbiddenScope("Website & CMS Studio", true);
                            return;
                        }
                    }
                    else if (path.StartsWith("/api/pageformsapi"))
                    {
                        var scopes = new[] { "FormsManager", "CMS", "CmsManager", "ContentManager" };
                        if (!HasViewScope(scopes) && !HasAnyRole("ReadOnly"))
                        {
                            context.Result = ForbiddenScope("Forms & Survey Studio", false);
                            return;
                        }
                        if (isWriteMethod && !HasEditScope(scopes))
                        {
                            context.Result = ForbiddenScope("Forms & Survey Studio", true);
                            return;
                        }
                    }
                    else if (path.StartsWith("/api/productsapi") && isWriteMethod)
                    {
                        var scopes = new[] { "StoreManager", "Commerce", "CommerceManager", "Products", "CMS", "CmsManager" };
                        if (!HasEditScope(scopes))
                        {
                            context.Result = ForbiddenScope("Store & Commerce Catalog", true);
                            return;
                        }
                    }
                    else if ((path.StartsWith("/api/mxmailsapi") || path.StartsWith("/api/mxsmsapi")) && isWriteMethod)
                    {
                        var scopes = new[] { "TelemetryManager", "UserManager", "IdentityManager", "CrmManager" };
                        if (!HasEditScope(scopes))
                        {
                            context.Result = ForbiddenScope("System Communications & Telemetry", true);
                            return;
                        }
                    }
                }
            }
        }

        await next();
    }

    /// <inheritdoc />
    public async Task OnResultExecutionAsync(ResultExecutingContext context, ResultExecutionDelegate next)
    {
        try
        {
            var httpContext = context.HttpContext;
            var path = httpContext.Request.Path.Value ?? string.Empty;
            var method = httpContext.Request.Method;

            if (context.Result is ObjectResult objectResult)
            {
                var statusCode = objectResult.StatusCode ?? httpContext.Response.StatusCode;
                if (statusCode == 0) statusCode = 200;

                if (objectResult.Value is IApiErrorEnvelope envelope)
                {
                    if (!envelope.IsSuccess || statusCode >= 400)
                    {
                        var effectiveStatus = statusCode >= 400 ? statusCode : 400;
                        var rawDetail = !string.IsNullOrWhiteSpace(envelope.RealError)
                            ? envelope.RealError
                            : (!string.IsNullOrWhiteSpace(envelope.Message)
                                ? envelope.Message
                                : (envelope.Errors != null && envelope.Errors.Count > 0
                                    ? string.Join(" | ", envelope.Errors)
                                    : "Request failed."));

                        var (def, customError, realError) = StandardErrorCodes.ResolveError(
                            path,
                            effectiveStatus,
                            rawDetail,
                            envelope.ErrorCode);

                        // If the caller explicitly set both RealError and a clean Message, preserve the caller's clean Message
                        if (!string.IsNullOrWhiteSpace(envelope.RealError) &&
                            !string.IsNullOrWhiteSpace(envelope.Message) &&
                            !string.Equals(envelope.Message, envelope.RealError, StringComparison.Ordinal))
                        {
                            customError = envelope.Message;
                            realError = envelope.RealError;
                        }

                        envelope.IsSuccess = false;
                        envelope.ErrorCode = def.Code;
                        envelope.Message = customError;
                        envelope.TraceId = httpContext.TraceIdentifier;
                        envelope.Errors = new List<string> { customError };

                        await PersistApiErrorLogAsync(
                            httpContext,
                            def.Code,
                            def.Category,
                            customError,
                            realError,
                            stackTrace: null,
                            method,
                            path,
                            effectiveStatus,
                            _logger);
                    }
                }
                else if (statusCode >= 400)
                {
                    string rawDetail = ExtractRawDetailFromNonEnvelope(objectResult.Value, statusCode);
                    var (def, customError, realError) = StandardErrorCodes.ResolveError(path, statusCode, rawDetail);

                    objectResult.Value = new ApiResponse<object>
                    {
                        IsSuccess = false,
                        ErrorCode = def.Code,
                        Message = customError,
                        TraceId = httpContext.TraceIdentifier,
                        Errors = new List<string> { customError },
                        Timestamp = DateTime.UtcNow
                    };

                    await PersistApiErrorLogAsync(
                        httpContext,
                        def.Code,
                        def.Category,
                        customError,
                        realError,
                        stackTrace: null,
                        method,
                        path,
                        statusCode,
                        _logger);
                }
            }
            else if (context.Result is StatusCodeResult statusCodeResult && statusCodeResult.StatusCode >= 400)
            {
                var statusCode = statusCodeResult.StatusCode;
                var (def, customError, realError) = StandardErrorCodes.ResolveError(
                    path,
                    statusCode,
                    $"HTTP {statusCode} status returned by {method} {path}.");

                context.Result = new ObjectResult(new ApiResponse<object>
                {
                    IsSuccess = false,
                    ErrorCode = def.Code,
                    Message = customError,
                    TraceId = httpContext.TraceIdentifier,
                    Errors = new List<string> { customError },
                    Timestamp = DateTime.UtcNow
                })
                {
                    StatusCode = statusCode
                };

                await PersistApiErrorLogAsync(
                    httpContext,
                    def.Code,
                    def.Category,
                    customError,
                    realError,
                    stackTrace: null,
                    method,
                    path,
                    statusCode,
                    _logger);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Non-fatal exception in ApiErrorTrackingResultFilter.");
        }

        await next();
    }

    /// <summary>
    /// Persists an API error telemetry entry into <c>MasterApiErrorLogs</c>, scoping it either to the active Tenant
    /// (<c>SourceScope = "Tenant"</c>) or to Central (<c>SourceScope = "Central"</c>).
    /// </summary>
    public static async Task PersistApiErrorLogAsync(
        HttpContext httpContext,
        string errorCode,
        string category,
        string customError,
        string realError,
        string? stackTrace,
        string httpMethod,
        string endpoint,
        int httpStatusCode,
        ILogger? logger = null)
    {
        try
        {
            var masterDb = httpContext.RequestServices.GetService<MasterCatalogDbContext>();
            if (masterDb == null) return;

            var clientContext = ClientContextHelper.Resolve(httpContext);
            var headerTenantKey = httpContext.Request.Headers["X-Tenant-Key"].ToString()?.Trim();
            var effectiveTenantKey = !string.IsNullOrWhiteSpace(headerTenantKey)
                ? headerTenantKey
                : clientContext.TenantKey?.Trim();

            // Fallback: inspect Origin / Referer subdomain if X-Tenant-Key header was omitted
            if (string.IsNullOrWhiteSpace(effectiveTenantKey))
            {
                var origin = httpContext.Request.Headers["Origin"].FirstOrDefault()
                    ?? httpContext.Request.Headers["Referer"].FirstOrDefault();
                if (!string.IsNullOrWhiteSpace(origin) && Uri.TryCreate(origin, UriKind.Absolute, out var uri))
                {
                    var hostParts = uri.Host.Split('.', StringSplitOptions.RemoveEmptyEntries);
                    if (hostParts.Length >= 2 &&
                        !hostParts[0].Equals("www", StringComparison.OrdinalIgnoreCase) &&
                        !hostParts[0].Equals("localhost", StringComparison.OrdinalIgnoreCase))
                    {
                        effectiveTenantKey = hostParts[0].ToLowerInvariant();
                    }
                }
            }

            Guid? tenantId = null;
            string? resolvedTenantKey = null;
            string? organizationName = null;

            if (!string.IsNullOrWhiteSpace(effectiveTenantKey))
            {
                var normalizedKey = effectiveTenantKey.ToLowerInvariant();
                var tenant = await masterDb.MasterTenantCatalogs
                    .AsNoTracking()
                    .Where(t =>
                        t.TenantKey.ToLower() == normalizedKey ||
                        (t.PrimaryDomain != null && t.PrimaryDomain.ToLower().StartsWith(normalizedKey + ".")) ||
                        (t.CustomDomain != null && t.CustomDomain.ToLower() == normalizedKey))
                    .Select(t => new { t.Id, t.TenantKey, t.OrganizationName })
                    .FirstOrDefaultAsync();

                if (tenant != null)
                {
                    tenantId = tenant.Id;
                    resolvedTenantKey = tenant.TenantKey;
                    organizationName = tenant.OrganizationName;
                }
                else
                {
                    resolvedTenantKey = normalizedKey;
                }
            }

            var isTenantScoped = tenantId.HasValue || !string.IsNullOrWhiteSpace(resolvedTenantKey);

            var logEntry = new MasterApiErrorLog
            {
                Id = Guid.NewGuid(),
                MasterTenantCatalogId = tenantId,
                TenantKey = resolvedTenantKey,
                OrganizationName = organizationName,
                SourceScope = isTenantScoped ? "Tenant" : "Central",
                ErrorCode = string.IsNullOrWhiteSpace(errorCode) ? StandardErrorCodes.UnexpectedError : errorCode,
                Category = string.IsNullOrWhiteSpace(category) ? "System" : category,
                CustomError = customError.Length > 500 ? customError[..500] : customError,
                RealError = string.IsNullOrWhiteSpace(realError) ? customError : realError,
                StackTrace = stackTrace,
                HttpMethod = httpMethod.Length > 16 ? httpMethod[..16] : httpMethod,
                Endpoint = endpoint.Length > 500 ? endpoint[..500] : endpoint,
                HttpStatusCode = httpStatusCode,
                UserId = clientContext.UserId,
                UserEmail = clientContext.UserEmail,
                IpAddress = clientContext.IpAddress,
                TraceId = httpContext.TraceIdentifier,
                CreatedUtc = DateTime.UtcNow
            };

            masterDb.MasterApiErrorLogs.Add(logEntry);
            await masterDb.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            logger?.LogDebug(ex, "Could not persist MasterApiErrorLog (table may be pending migration).");
        }
    }

    private static string ExtractRawDetailFromNonEnvelope(object? value, int statusCode)
    {
        if (value == null) return $"HTTP {statusCode} error.";
        if (value is string str) return str;
        if (value is ValidationProblemDetails vpd)
        {
            var flat = vpd.Errors.SelectMany(kvp => kvp.Value.Select(v => $"{kvp.Key}: {v}")).ToList();
            return flat.Count > 0 ? string.Join(" | ", flat) : (vpd.Title ?? "Validation failed.");
        }
        if (value is ProblemDetails pd)
        {
            return !string.IsNullOrWhiteSpace(pd.Detail) ? $"{pd.Title}: {pd.Detail}" : (pd.Title ?? $"HTTP {statusCode} problem.");
        }

        try
        {
            var type = value.GetType();
            var msgProp = type.GetProperty("Message") ?? type.GetProperty("message") ?? type.GetProperty("Error") ?? type.GetProperty("error");
            if (msgProp != null)
            {
                var val = msgProp.GetValue(value)?.ToString();
                if (!string.IsNullOrWhiteSpace(val)) return val;
            }
        }
        catch { }

        return $"HTTP {statusCode} error.";
    }
}

