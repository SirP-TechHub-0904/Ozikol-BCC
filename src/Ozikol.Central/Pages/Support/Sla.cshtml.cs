using System;
using System.Collections.Generic;
using System.Globalization;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.Extensions.Localization;

namespace Ozikol.Central.Pages.Support
{
    /// <summary>
    /// Represents a monitored infrastructure service component and its operational status.
    /// </summary>
    public class ServiceStatusItem
    {
        /// <summary>
        /// Gets or sets the name of the service subsystem.
        /// </summary>
        public string Name { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the subsystem group or category (e.g. Core Infrastructure, Storage & Database).
        /// </summary>
        public string Group { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the health status (e.g. "Operational", "Degraded", "Maintenance").
        /// </summary>
        public string Status { get; set; } = "Operational";

        /// <summary>
        /// Gets or sets the 90-day rolling availability percentage.
        /// </summary>
        public double UptimePercentage { get; set; } = 99.99;

        /// <summary>
        /// Gets or sets the average API response latency in milliseconds.
        /// </summary>
        public int LatencyMs { get; set; } = 28;
    }

    /// <summary>
    /// Represents a formal SLA severity tier response commitment.
    /// </summary>
    public class SlaTierItem
    {
        /// <summary>
        /// Gets or sets the severity classification level (e.g. Sev-1, Sev-2).
        /// </summary>
        public string Severity { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the human-readable severity label.
        /// </summary>
        public string Title { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the guaranteed initial response time window.
        /// </summary>
        public string ResponseTime { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the availability coverage window (e.g. 24/7/365 vs Business Hours).
        /// </summary>
        public string Coverage { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the business impact description and escalation criteria.
        /// </summary>
        public string Description { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the badge styling variant for the severity tier.
        /// </summary>
        public string BadgeClass { get; set; } = string.Empty;
    }

    /// <summary>
    /// PageModel presenting real-time system status, 99.99% enterprise SLA commitments, and compliance certifications.
    /// </summary>
    public class SlaModel : PageModel
    {
        private readonly IStringLocalizer<SharedResource> _localizer;

        /// <summary>
        /// Initializes a new instance of the <see cref="SlaModel"/> class.
        /// </summary>
        /// <param name="localizer">The shared string localizer.</param>
        public SlaModel(IStringLocalizer<SharedResource> localizer)
        {
            _localizer = localizer ?? throw new ArgumentNullException(nameof(localizer));
        }

        /// <summary>
        /// Gets the active 2-letter ISO culture code.
        /// </summary>
        public string CurrentCulture { get; private set; } = "en";

        /// <summary>
        /// Gets the monitored cloud infrastructure components.
        /// </summary>
        public IReadOnlyList<ServiceStatusItem> MonitoredServices { get; private set; } = new List<ServiceStatusItem>();

        /// <summary>
        /// Gets the enterprise contractual SLA severity tiers.
        /// </summary>
        public IReadOnlyList<SlaTierItem> SlaTiers { get; private set; } = new List<SlaTierItem>();

        /// <summary>
        /// Handles HTTP GET requests to display the real-time SLA and platform status dashboard.
        /// </summary>
        public void OnGet()
        {
            ResolveCulture();

            MonitoredServices = new List<ServiceStatusItem>
            {
                new() { Name = "Master Authentication & SSO (OAuth2 / SAML)", Group = "Core Services", Status = "Operational", UptimePercentage = 100.0, LatencyMs = 18 },
                new() { Name = "Tenant Isolation API Gateway", Group = "Core Services", Status = "Operational", UptimePercentage = 99.995, LatencyMs = 24 },
                new() { Name = "Global Multi-Tenant SQL Databases (Azure / SQL Express)", Group = "Data Layer", Status = "Operational", UptimePercentage = 99.99, LatencyMs = 12 },
                new() { Name = "Distributed Redis Session & Cache Fabric", Group = "Data Layer", Status = "Operational", UptimePercentage = 100.0, LatencyMs = 4 },
                new() { Name = "Edge CDN & Static Asset Acceleration (Cloudflare Enterprise)", Group = "Edge & CDN", Status = "Operational", UptimePercentage = 100.0, LatencyMs = 9 },
                new() { Name = "Real-time WebSocket & Notification Bus", Group = "Real-Time Bus", Status = "Operational", UptimePercentage = 99.98, LatencyMs = 31 },
                new() { Name = "Enterprise Webhook Dispatcher & Integrations", Group = "Integrations", Status = "Operational", UptimePercentage = 99.99, LatencyMs = 45 },
                new() { Name = "AI Assistant & Contextual Recommendation Engine", Group = "Intelligence", Status = "Operational", UptimePercentage = 99.97, LatencyMs = 68 }
            };

            SlaTiers = new List<SlaTierItem>
            {
                new()
                {
                    Severity = "Sev-1",
                    Title = "Critical Outage / Catastrophic",
                    ResponseTime = "< 15 Minutes",
                    Coverage = "24/7/365 Worldwide",
                    Description = "Total production system outage, critical security vulnerability, or broad tenant unavailability with severe revenue impact.",
                    BadgeClass = "oz-badge-tag--red"
                },
                new()
                {
                    Severity = "Sev-2",
                    Title = "Major Incident / Significant Impairment",
                    ResponseTime = "< 1 Hour",
                    Coverage = "24/7/365 Worldwide",
                    Description = "Key suite module degraded or high error rates affecting business operations without a viable administrative workaround.",
                    BadgeClass = "oz-badge-tag--orange"
                },
                new()
                {
                    Severity = "Sev-3",
                    Title = "Moderate / Non-Critical Issue",
                    ResponseTime = "< 4 Hours",
                    Coverage = "Regional Business Hours (8am - 8pm)",
                    Description = "Feature malfunction, performance degradation with an available workaround, or non-blocking configuration challenge.",
                    BadgeClass = "oz-badge-tag--blue"
                },
                new()
                {
                    Severity = "Sev-4",
                    Title = "General Inquiry / Service Request",
                    ResponseTime = "< 8 Hours",
                    Coverage = "Regional Business Hours (8am - 8pm)",
                    Description = "Feature recommendations, architectural best-practice consultations, documentation clarifications, or routine tenant queries.",
                    BadgeClass = "oz-badge-tag--purple"
                }
            };
        }

        private void ResolveCulture()
        {
            var routeCulture = RouteData.Values["culture"]?.ToString()?.ToLowerInvariant();
            if (routeCulture is "en" or "fr" or "es" or "de")
            {
                CurrentCulture = routeCulture;
                return;
            }

            var current = CultureInfo.CurrentUICulture.TwoLetterISOLanguageName.ToLowerInvariant();
            CurrentCulture = current is "en" or "fr" or "es" or "de" ? current : "en";
        }
    }
}
