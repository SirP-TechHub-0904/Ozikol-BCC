using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Ozikol_BCC.Api.Filters;
using Ozikol_BCC.Application.Common.Errors;
using Ozikol_BCC.Infrastructure.Services.Email;

namespace Ozikol_BCC.Api.Middleware;

/// <summary>
/// Global API exception-intercepting middleware that captures unhandled server crashes,
/// logs structured diagnostic telemetry, scrubs PII, and returns standard JSON error envelopes.
/// </summary>
public class GlobalExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionHandlingMiddleware> _logger;
    private static readonly ConcurrentDictionary<string, DateTime> _recentAlertCooldowns = new();

    /// <summary>
    /// Initializes a new instance of the <see cref="GlobalExceptionHandlingMiddleware"/> class.
    /// </summary>
    /// <param name="next">The subsequent middleware request delegate.</param>
    /// <param name="logger">Diagnostic logging facility.</param>
    public GlobalExceptionHandlingMiddleware(RequestDelegate next, ILogger<GlobalExceptionHandlingMiddleware> logger)
    {
        _next = next ?? throw new ArgumentNullException(nameof(next));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Executes the middleware pipeline and safely intercepts any uncaught server exceptions.
    /// </summary>
    /// <param name="context">The active HTTP context.</param>
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            // If a tenant database was permanently dropped (SQL Error 4060 / 18456) while an API node still held
            // the tenant entry in its L1 in-memory cache, immediately evict and refresh the tenant cache and return 404 WorkspaceNotFound.
            if (IsTenantDatabaseMissingException(ex))
            {
                var effectiveTenantKeyForCache = context.Request.Headers["X-Tenant-Key"].ToString();
                try
                {
                    var cacheInvalidator = context.RequestServices.GetService<Ozikol_BCC.Infrastructure.Caching.ITenantCacheInvalidator>();
                    if (cacheInvalidator != null)
                    {
                        await cacheInvalidator.InvalidateTenantCatalogAsync(effectiveTenantKeyForCache);
                    }
                    var tp = context.RequestServices.GetService<Ozikol_BCC.Infrastructure.TenantSupport.ITenantProvider>();
                    if (tp is Ozikol_BCC.Infrastructure.TenantSupport.TenantProvider concreteTp)
                    {
                        concreteTp.RefreshCachedTenants();
                    }
                }
                catch
                {
                    // Ignore cache refresh errors
                }

                if (!context.Response.HasStarted)
                {
                    context.Response.StatusCode = (int)HttpStatusCode.NotFound;
                    context.Response.ContentType = "application/json";
                    await context.Response.WriteAsync(JsonSerializer.Serialize(new
                    {
                        statusCode = 404,
                        error = "WorkspaceNotFound",
                        message = "Workspace could not be found.",
                        timestamp = DateTime.UtcNow
                    }));
                    return;
                }
            }

            var tenantKey = context.Request.Headers["X-Tenant-Key"].ToString();
            var path = context.Request.Path.Value ?? string.Empty;
            var method = context.Request.Method;

            var clientContext = Ozikol_BCC.Application.Common.ClientContextHelper.Resolve(context);
            var effectiveTenantKey = !string.IsNullOrWhiteSpace(tenantKey) ? tenantKey : clientContext.TenantKey;

            _logger.LogError(
                ex,
                "Unhandled API Exception on {Method} {Path} (Tenant: {TenantKey}, TraceId: {TraceId}, IP: {Ip}, SystemId: {SystemId}, User: {UserEmail}): {Message}",
                method,
                path,
                string.IsNullOrWhiteSpace(effectiveTenantKey) ? "None" : effectiveTenantKey,
                context.TraceIdentifier,
                clientContext.IpAddress,
                clientContext.SystemId ?? "None",
                clientContext.UserEmail ?? clientContext.UserId ?? "Anonymous",
                ex.Message);

            // Trigger background crash alert without blocking client response
            _ = DispatchCrashAlertEmailAsync(context, ex, effectiveTenantKey ?? string.Empty, path, method);

            // Stream structured diagnostic event to Central MongoDB with rich telemetry
            var logCollector = context.RequestServices.GetService<Ozikol_BCC.Application.Interfaces.Services.ICentralLogCollector>();
            if (logCollector != null)
            {
                _ = logCollector.LogSystemExceptionAsync(
                    ex,
                    path,
                    method,
                    effectiveTenantKey,
                    context.TraceIdentifier,
                    ipAddress: clientContext.IpAddress,
                    systemId: clientContext.SystemId,
                    userId: clientContext.UserId,
                    userEmail: clientContext.UserEmail,
                    userAgent: clientContext.UserAgent);
            }

            var (def, customError, realError) = StandardErrorCodes.ResolveError(
                path,
                500,
                $"{ex.GetType().FullName}: {ex.Message}",
                StandardErrorCodes.UnexpectedError);

            await ApiErrorTrackingResultFilter.PersistApiErrorLogAsync(
                context,
                def.Code,
                def.Category,
                customError,
                realError,
                ex.ToString(),
                method,
                path,
                500,
                _logger);

            await HandleExceptionAsync(context, def.Code, customError);
        }
    }

    /// <summary>
    /// Determines whether an exception was caused by a dropped or non-existent physical SQL database (SQL Error 4060)
    /// or dropped tenant SQL login (SQL Error 18456 for `oz_usr_` / `oz_db_`).
    /// </summary>
    private static bool IsTenantDatabaseMissingException(Exception? ex)
    {
        var current = ex;
        while (current != null)
        {
            var msg = current.Message ?? string.Empty;
            if (msg.Contains("Cannot open database", StringComparison.OrdinalIgnoreCase) ||
                (msg.Contains("Login failed for user 'oz_usr_", StringComparison.OrdinalIgnoreCase)))
            {
                return true;
            }
            current = current.InnerException;
        }
        return false;
    }

    /// <summary>
    /// Formats a predictable, standardized JSON error envelope for client consumption without exposing internal exception details.
    /// </summary>
    private static async Task HandleExceptionAsync(HttpContext context, string errorCode, string customError)
    {
        context.Response.ContentType = "application/json";
        context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;

        var responsePayload = new
        {
            isSuccess = false,
            success = false,
            errorCode,
            message = customError,
            errors = new List<string> { customError },
            traceId = context.TraceIdentifier,
            statusCode = 500,
            timestamp = DateTime.UtcNow
        };

        var json = JsonSerializer.Serialize(responsePayload);
        await context.Response.WriteAsync(json);
    }

    /// <summary>
    /// Dispatches an administrative email alert via Mailcow SMTP with cooldown deduplication.
    /// </summary>
    private async Task DispatchCrashAlertEmailAsync(HttpContext context, Exception ex, string tenantKey, string path, string method)
    {
        try
        {
            var alertRecipient = Environment.GetEnvironmentVariable("ADMIN_CRASH_ALERT_EMAIL");
            if (string.IsNullOrWhiteSpace(alertRecipient))
            {
                return;
            }

            var smtpDispatcher = context.RequestServices.GetService<ISmtpEmailDispatcher>();
            if (smtpDispatcher == null)
            {
                return;
            }

            // Deduplicate crashes within 10-minute cooldown windows
            var fingerprint = $"{ex.GetType().Name}:{method}:{path}:{ex.Message}";
            var now = DateTime.UtcNow;
            if (_recentAlertCooldowns.TryGetValue(fingerprint, out var lastSent))
            {
                if (now - lastSent < TimeSpan.FromMinutes(10))
                {
                    return;
                }
            }
            _recentAlertCooldowns[fingerprint] = now;

            var body = $"""
                <h2>Ozikol-BCC API Critical Crash Alert</h2>
                <p><strong>Route:</strong> {method} {path}</p>
                <p><strong>Tenant:</strong> {tenantKey}</p>
                <p><strong>Trace ID:</strong> {context.TraceIdentifier}</p>
                <p><strong>Exception:</strong> {ex.GetType().FullName}: {ex.Message}</p>
                <h3>Stack Trace</h3>
                <pre>{ex.StackTrace}</pre>
                """;

            await smtpDispatcher.SendEmailAsync(
                toEmail: alertRecipient,
                subject: $"[API Crash] {ex.GetType().Name} at {method} {path}",
                htmlBody: body,
                fromEmail: "security@ozikol.cloud",
                fromName: "Ozikol API Crash Telemetry",
                isCentralPlatformEmail: true);
        }
        catch
        {
            // Telemetry failure must never affect server stability
        }
    }
}
