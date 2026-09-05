using System;
using System.Collections.Generic;
using System.Globalization;
using Microsoft.AspNetCore.Mvc;
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
        /// Handles HTTP GET requests by redirecting to the official Professional Certifications portal.
        /// </summary>
        /// <returns>A permanent redirect result to the certifications page.</returns>
        public IActionResult OnGet()
        {
            ResolveCulture();
            return RedirectPermanent($"/{CurrentCulture}/support/certifications");
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
