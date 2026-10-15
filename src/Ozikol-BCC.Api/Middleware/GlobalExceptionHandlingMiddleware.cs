using System;
using System.Collections.Concurrent;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
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

            _logger.LogError(
                ex,
                "Unhandled API Exception on {Method} {Path} (Tenant: {TenantKey}, TraceId: {TraceId}): {Message}",
                method,
                path,
                string.IsNullOrWhiteSpace(tenantKey) ? "None" : tenantKey,
                context.TraceIdentifier,
                ex.Message);

            // Trigger background crash alert without blocking client response
            _ = DispatchCrashAlertEmailAsync(context, ex, tenantKey, path, method);

            await HandleExceptionAsync(context, ex);
        }
    }

    /// <summary>
    /// Formats a predictable, standardized JSON error envelope for client consumption.
    /// </summary>
    private static async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        context.Response.ContentType = "application/json";
        context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;

        var responsePayload = new
        {
            success = false,
            message = "An unexpected internal server error occurred. Our engineering team has been notified.",
            traceId = context.TraceIdentifier,
            statusCode = 500,
            occurredAtUtc = DateTime.UtcNow
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
            if (postmarkService == null)
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

            await postmarkService.SendHtmlEmailAsync(
                to: alertRecipient,
                subject: $"[API Crash] {ex.GetType().Name} at {method} {path}",
                htmlBody: body,
                from: "Ozikol System Check <systemcheck@ozikol.cloud>",
                tag: "api-crash-telemetry");
        }
        catch
        {
            // Telemetry failure must never affect server stability
        }
    }
}
