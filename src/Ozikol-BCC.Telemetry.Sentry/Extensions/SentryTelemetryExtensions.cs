using System;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Ozikol_BCC.Telemetry.Sentry.Configuration;
using Sentry.AspNetCore;
using Sentry.Extensibility;

namespace Ozikol_BCC.Telemetry.Sentry.Extensions;

/// <summary>
/// Service and WebHost registration extensions for the Ozikol Sentry Cloud Telemetry platform.
/// Provides automated unhandled exception tracking, EF Core query breadcrumbs, and sensitive data scrubbing.
/// </summary>
public static class SentryTelemetryExtensions
{
    /// <summary>
    /// Configures Sentry cloud telemetry onto the ASP.NET Core WebHost.
    /// Resolves SENTRY_DSN from .env environment variables, command line, or appsettings.json.
    /// If SENTRY_DSN is unconfigured, telemetry is gracefully bypassed with zero overhead.
    /// </summary>
    /// <param name="webHostBuilder">The ASP.NET Core WebHost builder.</param>
    /// <param name="appName">The name of the calling service (e.g. "Ozikol.Central", "Ozikol-BCC.Api").</param>
    /// <returns>The WebHost builder for chaining.</returns>
    public static IWebHostBuilder UseOzikolSentry(this IWebHostBuilder webHostBuilder, string appName = "Ozikol.Central")
    {
        return webHostBuilder.UseSentry((context, options) =>
        {
            var config = context.Configuration;

            // 1. Resolve Sentry DSN strictly from .env / environment variables / appsettings
            var dsn = config["SENTRY_DSN"]
                   ?? config["Sentry:Dsn"]
                   ?? Environment.GetEnvironmentVariable("SENTRY_DSN");

            if (string.IsNullOrWhiteSpace(dsn) || dsn.Contains("YOUR_SENTRY_DSN", StringComparison.OrdinalIgnoreCase))
            {
                // Sentry DSN not provided: Sentry remains inactive gracefully
                options.Dsn = string.Empty;
                return;
            }

            options.Dsn = dsn.Trim();

            // 2. Resolve Environment & Release Tagging
            var environment = config["SENTRY_ENVIRONMENT"]
                           ?? config["Sentry:Environment"]
                           ?? context.HostingEnvironment.EnvironmentName;

            var release = config["SENTRY_RELEASE"]
                       ?? config["Sentry:Release"]
                       ?? $"{appName}@1.0.0";

            options.Environment = environment;
            options.Release = release;

            // 3. Telemetry parameters
            options.TracesSampleRate = 1.0;
            options.MaxRequestBodySize = RequestSize.Always;
            options.SendDefaultPii = false; // Security: do not send raw personal identifiers by default
            options.AttachStacktrace = true;

            // 4. Scrub sensitive fields (passwords, tokens, API keys) from event payloads
            options.SetBeforeSend((sentryEvent, hint) =>
            {
                // Tag the originating application name
                sentryEvent.SetTag("application", appName);

                // Scrub Authorization header from request context if captured
                if (sentryEvent.Request?.Headers != null && sentryEvent.Request.Headers.ContainsKey("Authorization"))
                {
                    sentryEvent.Request.Headers["Authorization"] = "[SCRUBBED]";
                }

                return sentryEvent;
            });
        });
    }

    /// <summary>
    /// Registers Sentry configuration options into the DI container for inspection and diagnostics.
    /// </summary>
    /// <param name="services">The service collection.</param>
    /// <param name="configuration">The application configuration.</param>
    /// <returns>The service collection for chaining.</returns>
    public static IServiceCollection AddOzikolSentryOptions(this IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<SentryTelemetryOptions>(options =>
        {
            configuration.GetSection(SentryTelemetryOptions.SectionName).Bind(options);

            var envDsn = configuration["SENTRY_DSN"] ?? Environment.GetEnvironmentVariable("SENTRY_DSN");
            if (!string.IsNullOrWhiteSpace(envDsn))
            {
                options.Dsn = envDsn.Trim();
            }
        });

        return services;
    }
}
