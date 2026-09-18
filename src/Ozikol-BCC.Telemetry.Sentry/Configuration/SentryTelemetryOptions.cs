using System;

namespace Ozikol_BCC.Telemetry.Sentry.Configuration;

/// <summary>
/// Configuration options for the Ozikol Sentry Cloud Telemetry integration.
/// Supports resolution from environment variables, .env, or appsettings.json.
/// </summary>
public class SentryTelemetryOptions
{
    /// <summary>
    /// Configuration section key name in appsettings.json.
    /// </summary>
    public const string SectionName = "Sentry";

    /// <summary>
    /// Gets or sets the public/secret Data Source Name (DSN) provided by your Sentry.io project.
    /// Example: "https://examplePublicKey@o0.ingest.sentry.io/0".
    /// </summary>
    public string? Dsn { get; set; }

    /// <summary>
    /// Gets or sets the target runtime environment (e.g. "Production", "Staging", "Development").
    /// Defaults to the ASPNETCORE_ENVIRONMENT value or "Production".
    /// </summary>
    public string? Environment { get; set; }

    /// <summary>
    /// Gets or sets the application release version identifier (e.g. "Ozikol-Central@1.0.0").
    /// </summary>
    public string? Release { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether HTTP request body payloads should be captured with error events.
    /// </summary>
    public bool MaxRequestBodySizeAlways { get; set; } = true;

    /// <summary>
    /// Gets or sets the sample rate for performance profiling and transactions (0.0 to 1.0). Defaults to 1.0.
    /// </summary>
    public double TracesSampleRate { get; set; } = 1.0;

    /// <summary>
    /// Gets or sets a value indicating whether unhandled exceptions should automatically capture EF Core query breadcrumbs.
    /// </summary>
    public bool EnableEfCoreBreadcrumbs { get; set; } = true;

    /// <summary>
    /// Gets or sets a value indicating whether Sentry telemetry is active.
    /// When DSN is empty or null, Sentry initialization is safely skipped without throwing errors.
    /// </summary>
    public bool IsConfigured => !string.IsNullOrWhiteSpace(Dsn) && !Dsn.Contains("YOUR_SENTRY_DSN", StringComparison.OrdinalIgnoreCase);
}
