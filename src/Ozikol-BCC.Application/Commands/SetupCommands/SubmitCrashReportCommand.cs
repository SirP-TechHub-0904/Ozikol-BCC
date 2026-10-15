using System;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.Extensions.Logging;

namespace Ozikol_BCC.Application.Commands.SetupCommands
{
    /// <summary>
    /// Data transfer object representing a client-side sanitized crash or unhandled error report.
    /// </summary>
    public class CrashReportDto
    {
        /// <summary>
        /// Gets or sets the client operating system platform ("windows", "macos", "linux", "android", "ios", "web").
        /// </summary>
        public string Platform { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the client application version at the time of the crash (e.g., "1.0.0").
        /// </summary>
        public string AppVersion { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the client build number.
        /// </summary>
        public int BuildNumber { get; set; }

        /// <summary>
        /// Gets or sets the scrubbed exception message.
        /// </summary>
        public string ExceptionMessage { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the scrubbed exception stack trace.
        /// </summary>
        public string StackTrace { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the active tenant key if the user was signed into a workspace when the error occurred.
        /// </summary>
        public string? ActiveTenantKey { get; set; }

        /// <summary>
        /// Gets or sets the client timestamp when the exception occurred.
        /// </summary>
        public DateTime OccurredAtUtc { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Gets or sets additional sanitized diagnostic metadata (device model, screen resolution, free memory).
        /// </summary>
        public string? DiagnosticMetadata { get; set; }
    }

    /// <summary>
    /// Command submitting an anonymized, sanitized crash report for administrative diagnostics.
    /// </summary>
    public class SubmitCrashReportCommand : IRequest<bool>
    {
        /// <summary>
        /// Gets the crash report payload.
        /// </summary>
        public CrashReportDto Report { get; }

        /// <summary>
        /// Initializes a new instance of the <see cref="SubmitCrashReportCommand"/> class.
        /// </summary>
        /// <param name="report">The sanitized crash report data.</param>
        public SubmitCrashReportCommand(CrashReportDto report)
        {
            Report = report ?? throw new ArgumentNullException(nameof(report));
        }
    }

    /// <summary>
    /// Handler processing and logging incoming client application crash telemetry.
    /// </summary>
    public class SubmitCrashReportCommandHandler : IRequestHandler<SubmitCrashReportCommand, bool>
    {
        private readonly ILogger<SubmitCrashReportCommandHandler> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="SubmitCrashReportCommandHandler"/> class.
        /// </summary>
        /// <param name="logger">Structured logger instance.</param>
        public SubmitCrashReportCommandHandler(ILogger<SubmitCrashReportCommandHandler> logger)
        {
            _logger = logger;
        }

        /// <summary>
        /// Ingests and records the client crash report.
        /// </summary>
        /// <param name="request">The crash report command.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>True if recorded successfully.</returns>
        public Task<bool> Handle(SubmitCrashReportCommand request, CancellationToken cancellationToken)
        {
            var r = request.Report;
            _logger.LogError(
                "Client Crash Telemetry received from {Platform} v{Version}+{Build} (Tenant: {TenantKey}). Error: {Error}\nStack: {Stack}",
                r.Platform,
                r.AppVersion,
                r.BuildNumber,
                r.ActiveTenantKey ?? "None",
                r.ExceptionMessage,
                r.StackTrace);

            return Task.FromResult(true);
        }
    }
}
