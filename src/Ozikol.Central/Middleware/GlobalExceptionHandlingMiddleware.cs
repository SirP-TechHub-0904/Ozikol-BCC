using System;
using System.Collections.Concurrent;
using System.Net;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Ozikol.Central.Configuration;
using Ozikol_BCC.EmailServices.Postmark.Interfaces;
using Ozikol_BCC.EmailServices.Postmark.Models;

namespace Ozikol.Central.Middleware;

/// <summary>
/// Global exception-intercepting middleware that captures unhandled server crashes in production,
/// formats rich HTML diagnostic reports, and dispatches automated email alerts to system administrators via Postmark.
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
    /// Invokes the middleware to execute the HTTP pipeline and intercept any unhandled exceptions.
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
            try
            {
                _logger.LogError(ex, "Unhandled server exception captured on route '{Path}' from IP {ClientIp}",
                    context.Request.Path, context.Connection.RemoteIpAddress);
            }
            catch
            {
                // Fallback in case logger console formatter encounters reflection issues during StackTrace generation
                Console.WriteLine($"[CRITICAL ERROR] {ex.GetType().Name}: {ex.Message} at {context.Request.Path}");
            }

            // Trigger asynchronous background email alert without blocking error page presentation
            _ = DispatchCrashAlertEmailAsync(context, ex);

            // Re-throw so ASP.NET Core exception handler can render the Error page
            throw;
        }
    }

    /// <summary>
    /// Formats and dispatches a rich HTML diagnostic email report via Postmark.
    /// </summary>
    private async Task DispatchCrashAlertEmailAsync(HttpContext context, Exception ex)
    {
        try
        {
            var options = context.RequestServices.GetService<IOptions<ErrorAlertSettings>>()?.Value ?? new ErrorAlertSettings();
            if (!options.EnableEmailAlerts || string.IsNullOrWhiteSpace(options.RecipientEmails))
            {
                return;
            }

            var postmarkService = context.RequestServices.GetService<IPostmarkEmailService>();
            if (postmarkService == null)
            {
                return;
            }

            // Deduplication cooldown check to prevent flooding on rapid identical crashes
            var errorFingerprint = $"{ex.GetType().FullName}:{ex.Message}:{context.Request.Path}";
            var now = DateTime.UtcNow;
            if (_recentAlertCooldowns.TryGetValue(errorFingerprint, out var lastSentTime))
            {
                if (now - lastSentTime < TimeSpan.FromMinutes(options.CooldownMinutes))
                {
                    _logger.LogInformation("Suppressed duplicate crash alert email for '{Fingerprint}' (Cooldown active).", errorFingerprint);
                    return;
                }
            }
            _recentAlertCooldowns[errorFingerprint] = now;

            // Extract context telemetry
            var requestUrl = $"{context.Request.Scheme}://{context.Request.Host}{context.Request.Path}{context.Request.QueryString}";
            var method = context.Request.Method;
            var clientIp = context.Connection.RemoteIpAddress?.ToString() ?? "Unknown";
            var userAgent = context.Request.Headers.UserAgent.ToString();
            var userEmail = context.User.Identity?.IsAuthenticated == true ? context.User.Identity.Name : "Anonymous Visitor";

            var htmlBody = GenerateCrashReportHtml(ex, requestUrl, method, clientIp, userEmail, userAgent, now);

            var recipients = options.RecipientEmails.Split(new[] { ',', ';', ' ' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            foreach (var recipient in recipients)
            {
                await postmarkService.SendHtmlEmailAsync(
                    to: recipient,
                    subject: $"🚨 [CRITICAL ALERT] {ex.GetType().Name} on {context.Request.Host}",
                    htmlBody: htmlBody,
                    from: "Ozikol System Check <systemcheck@ozikol.cloud>",
                    tag: "server-crash-alert");
            }
        }
        catch (Exception alertEx)
        {
            _logger.LogError(alertEx, "Failed to dispatch automated crash alert email.");
        }
    }

    /// <summary>
    /// Generates a modern, clean HTML diagnostic report email template.
    /// </summary>
    private static string GenerateCrashReportHtml(
        Exception ex,
        string url,
        string method,
        string ip,
        string user,
        string userAgent,
        DateTime timestampUtc)
    {
        var sb = new StringBuilder();
        sb.Append($@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; margin: 0; padding: 24px; }}
        .container {{ max-width: 680px; margin: 0 auto; background: #1e293b; border-radius: 12px; border: 1px solid #334155; overflow: hidden; }}
        .header {{ background: linear-gradient(135deg, #e11d48 0%, #be123c 100%); padding: 24px 30px; color: #ffffff; }}
        .header h1 {{ margin: 0 0 4px 0; font-size: 20px; font-weight: 700; }}
        .header p {{ margin: 0; font-size: 13px; opacity: 0.9; }}
        .body {{ padding: 28px 30px; font-size: 14px; line-height: 1.6; color: #cbd5e1; }}
        .meta-table {{ width: 100%; border-collapse: collapse; margin-bottom: 24px; }}
        .meta-table td {{ padding: 8px 12px; border-bottom: 1px solid #334155; font-size: 13px; }}
        .meta-label {{ color: #94a3b8; font-weight: 600; width: 140px; }}
        .meta-val {{ color: #ffffff; font-family: monospace; word-break: break-all; }}
        .error-box {{ background: #0f172a; border-left: 4px solid #f43f5e; padding: 16px; border-radius: 6px; margin-bottom: 24px; }}
        .error-type {{ color: #fb7185; font-weight: 700; font-size: 15px; margin-bottom: 6px; }}
        .error-msg {{ color: #ffffff; font-size: 14px; font-weight: 500; word-break: break-word; }}
        .trace-title {{ color: #94a3b8; font-weight: 600; margin-bottom: 8px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; }}
        .trace-pre {{ background: #020617; border: 1px solid #1e293b; border-radius: 8px; padding: 14px; color: #a5b4fc; font-family: Consolas, Monaco, monospace; font-size: 11.5px; overflow-x: auto; max-height: 320px; white-space: pre-wrap; word-break: break-all; }}
        .footer {{ padding: 18px 30px; background: #0f172a; border-top: 1px solid #334155; text-align: center; font-size: 12px; color: #64748b; }}
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1>🚨 Production Server Exception Alert</h1>
            <p>Ozikol Central Infrastructure Telemetry — Automated Incident Dispatch</p>
        </div>
        <div class='body'>
            <div class='error-box'>
                <div class='error-type'>{WebUtility.HtmlEncode(ex.GetType().FullName ?? "Unknown Exception")}</div>
                <div class='error-msg'>{WebUtility.HtmlEncode(ex.Message)}</div>
            </div>

            <table class='meta-table'>
                <tr><td class='meta-label'>Request URL:</td><td class='meta-val'>[{method}] {WebUtility.HtmlEncode(url)}</td></tr>
                <tr><td class='meta-label'>Client IP:</td><td class='meta-val'>{WebUtility.HtmlEncode(ip)}</td></tr>
                <tr><td class='meta-label'>Authenticated User:</td><td class='meta-val'>{WebUtility.HtmlEncode(user)}</td></tr>
                <tr><td class='meta-label'>Timestamp (UTC):</td><td class='meta-val'>{timestampUtc:yyyy-MM-dd HH:mm:ss} UTC</td></tr>
                <tr><td class='meta-label'>User Agent:</td><td class='meta-val'>{WebUtility.HtmlEncode(userAgent)}</td></tr>
            </table>

            <div class='trace-title'>Full Exception Stack Trace</div>
            <pre class='trace-pre'>{WebUtility.HtmlEncode(ex.ToString())}</pre>
        </div>
        <div class='footer'>
            Sent automatically by Ozikol Central Error Telemetry Monitor via Postmark Transactional API.
        </div>
    </div>
</body>
</html>");
        return sb.ToString();
    }
}
