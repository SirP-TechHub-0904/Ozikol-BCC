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
            options.TracesSampleRate = 0.2; // 20% performance trace sample rate to conserve monthly quota
            options.MaxRequestBodySize = RequestSize.Medium;
            options.SendDefaultPii = false; // Security: do not send raw personal identifiers by default
            options.AttachStacktrace = true;

            // 4. Intelligent Noise Filtering & Tenant Context Enrichment
            options.SetBeforeSend((sentryEvent, hint) =>
            {
                // A. Filter out transient network disconnects and cancelled requests
                if (sentryEvent.Exception is OperationCanceledException or TaskCanceledException)
                {
                    return null; // Silently drop: does not consume Sentry quota
                }

                // B. Filter out bot probes and benign missing asset 404s
                var path = sentryEvent.Request?.Url?.ToLowerInvariant() ?? string.Empty;
                if (path.EndsWith(".php") ||
                    path.Contains("wp-login") ||
                    path.Contains("xmlrpc") ||
                    path.Contains(".env") ||
                    path.EndsWith("/favicon.ico") ||
                    path.EndsWith("/robots.txt"))
                {
                    return null; // Silently drop bot noise
                }

                // C. Tag Origin Application
                sentryEvent.SetTag("application", appName);

                // D. Extract & Tag Tenant Origin
                string? tenantKey = null;
                if (sentryEvent.Request?.Headers != null)
                {
                    if (sentryEvent.Request.Headers.TryGetValue("X-Tenant-Key", out var headerKey) && !string.IsNullOrWhiteSpace(headerKey))
                    {
                        tenantKey = headerKey.Trim();
                    }
                    else if (sentryEvent.Request.Headers.TryGetValue("Host", out var hostVal) && !string.IsNullOrWhiteSpace(hostVal))
                    {
                        var hostLower = hostVal.ToLowerInvariant();
                        var parts = hostLower.Split('.');
                        if (parts.Length > 1 && !new[] { "localhost", "127", "www", "api", "central", "admin" }.Contains(parts[0]))
                        {
                            tenantKey = parts[0];
                        }
                    }
                }

                if (!string.IsNullOrWhiteSpace(tenantKey))
                {
                    sentryEvent.SetTag("scope", "Tenant");
                    sentryEvent.SetTag("tenant", tenantKey.ToLowerInvariant());
                }
                else
                {
                    sentryEvent.SetTag("scope", "Central");
                    sentryEvent.SetTag("tenant", "Platform-Central");
                }

                // E. Scrub Sensitive Headers & PII
                if (sentryEvent.Request?.Headers != null)
                {
                    if (sentryEvent.Request.Headers.ContainsKey("Authorization"))
                    {
                        sentryEvent.Request.Headers["Authorization"] = "[SCRUBBED]";
                    }
                    if (sentryEvent.Request.Headers.ContainsKey("Cookie"))
                    {
                        sentryEvent.Request.Headers["Cookie"] = "[SCRUBBED]";
                    }
                    if (sentryEvent.Request.Headers.ContainsKey("X-Device-Trust-Token"))
                    {
                        sentryEvent.Request.Headers["X-Device-Trust-Token"] = "[SCRUBBED]";
                    }
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
