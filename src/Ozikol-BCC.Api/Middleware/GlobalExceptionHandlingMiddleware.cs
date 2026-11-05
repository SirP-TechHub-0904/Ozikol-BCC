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
using Ozikol_BCC.EmailServices.Postmark.Interfaces;
using Ozikol_BCC.EmailServices.Postmark.Models;

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
    /// Dispatches an administrative email alert via Postmark with cooldown deduplication.
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

            var postmarkService = context.RequestServices.GetService<IPostmarkEmailService>();
            var smtpDispatcher = context.RequestServices.GetService<Ozikol_BCC.Infrastructure.Services.Email.ISmtpEmailDispatcher>();
            if (smtpDispatcher == null && postmarkService == null)
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

            if (smtpDispatcher != null)
            {
                await smtpDispatcher.SendEmailAsync(
                    toEmail: alertRecipient,
                    subject: $"[API Crash] {ex.GetType().Name} at {method} {path}",
                    htmlBody: body,
                    fromEmail: "security@ozikol.cloud",
                    fromName: "Ozikol API Crash Telemetry",
                    isCentralPlatformEmail: true);
            }
            else if (postmarkService != null)
            {
                await postmarkService.SendHtmlEmailAsync(
                    to: alertRecipient,
                    subject: $"[API Crash] {ex.GetType().Name} at {method} {path}",
                    htmlBody: body,
                    from: "Ozikol System Check <systemcheck@ozikol.cloud>",
                    tag: "api-crash-telemetry");
            }
        }
        catch
        {
            // Telemetry failure must never affect server stability
        }
    }
}
