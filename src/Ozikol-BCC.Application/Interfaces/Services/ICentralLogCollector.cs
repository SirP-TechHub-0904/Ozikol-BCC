using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Ozikol_BCC.Application.Commands.SetupCommands;
using Ozikol_BCC.Application.Models.Logging;

namespace Ozikol_BCC.Application.Interfaces.Services
{
    /// <summary>
    /// Service contract for central platform logging and telemetry ingestion into MongoDB.
    /// Strictly dedicated to platform-wide telemetry, crash ingestion, and infrastructure security alerts.
    /// </summary>
    public interface ICentralLogCollector
    {
        /// <summary>
        /// Logs an uncaught server exception or critical runtime crash into MongoDB.
        /// </summary>
        /// <param name="ex">The intercepted exception.</param>
        /// <param name="route">The request URL path.</param>
        /// <param name="method">The HTTP request method.</param>
        /// <param name="tenantKey">The active workspace tenant key if any.</param>
        /// <param name="traceId">The correlation or trace identifier.</param>
        /// <param name="metadata">Optional contextual key-value pairs.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        Task LogSystemExceptionAsync(
            Exception ex,
            string route,
            string method,
            string? tenantKey,
            string traceId,
            Dictionary<string, object?>? metadata = null,
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Logs a client-side crash telemetry report (from Windows, Android, iOS, macOS) into MongoDB.
        /// </summary>
        /// <param name="report">The sanitized client crash report DTO.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        Task LogClientCrashAsync(CrashReportDto report, CancellationToken cancellationToken = default);

        /// <summary>
        /// Logs an infrastructure or platform security alert (bot block, rate limit breach) into MongoDB.
        /// </summary>
        /// <param name="alertType">Security classification (e.g. "RateLimitExceeded", "TurnstileBotBlocked").</param>
        /// <param name="message">Explanatory description.</param>
        /// <param name="tenantKey">Targeted tenant if identified.</param>
        /// <param name="ipAddress">Originating IP address.</param>
        /// <param name="metadata">Additional diagnostic details.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        Task LogSecurityAlertAsync(
            string alertType,
            string message,
            string? tenantKey,
            string? ipAddress,
            Dictionary<string, object?>? metadata = null,
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Appends an arbitrary structured log document to MongoDB.
        /// </summary>
        /// <param name="document">The pre-constructed central log document.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        Task LogTraceAsync(CentralLogDocument document, CancellationToken cancellationToken = default);
    }
}
