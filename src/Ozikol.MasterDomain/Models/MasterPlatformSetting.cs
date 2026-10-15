using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;

namespace Ozikol.MasterDomain.Models
{
    /// <summary>
    /// Represents global platform settings and system automation parameters for the central portal.
    /// Contains configurable administrator notification pools, support ticketing automation thresholds, and general platform parameters.
    /// </summary>
    [Table("MasterPlatformSettings")]
    public class MasterPlatformSetting
    {
        /// <summary>
        /// Gets or sets the primary key identifier. Typically singleton record with Id = 1.
        /// </summary>
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.None)]
        public int Id { get; set; } = 1;

        /// <summary>
        /// Gets or sets the platform brand display name (e.g. "Ozikol").
        /// </summary>
        [Required]
        [MaxLength(100)]
        public string PlatformName { get; set; } = "Ozikol";

        /// <summary>
        /// Gets or sets the general support contact email address displayed on public pages.
        /// </summary>
        [MaxLength(150)]
        public string? SupportContactEmail { get; set; }

        /// <summary>
        /// Gets or sets the default sender email address for outgoing system communications.
        /// </summary>
        [MaxLength(150)]
        public string? DefaultFromEmail { get; set; }

        /// <summary>
        /// Gets or sets a value indicating whether administrator notification emails are enabled across all departments.
        /// When false, outgoing administrator notification emails are suppressed while customer confirmation receipts remain active.
        /// </summary>
        public bool EnableAdminNotifications { get; set; } = true;

        /// <summary>
        /// Gets or sets the pool of administrator email addresses for support tickets and inquiry notifications.
        /// Accepts one or more email addresses separated by commas, semicolons, or whitespace.
        /// </summary>
        public string? SupportAdminEmails { get; set; }

        /// <summary>
        /// Gets or sets the pool of administrator email addresses for affiliate partner application notifications.
        /// Accepts one or more email addresses separated by commas, semicolons, or whitespace.
        /// </summary>
        public string? PartnerAdminEmails { get; set; }

        /// <summary>
        /// Gets or sets the pool of administrator email addresses for creator program application notifications.
        /// Accepts one or more email addresses separated by commas, semicolons, or whitespace.
        /// </summary>
        public string? CreatorAdminEmails { get; set; }

        /// <summary>
        /// Gets or sets the pool of administrator email addresses for job candidate application notifications.
        /// Accepts one or more email addresses separated by commas, semicolons, or whitespace.
        /// </summary>
        public string? CareersAdminEmails { get; set; }

        /// <summary>
        /// Gets or sets the pool of administrator email addresses for certification exam booking notifications.
        /// Accepts one or more email addresses separated by commas, semicolons, or whitespace.
        /// </summary>
        public string? CertificationAdminEmails { get; set; }

        /// <summary>
        /// Gets or sets the inactivity threshold in hours after which an inactive ticket is automatically closed.
        /// Defaults to 24 hours.
        /// </summary>
        public int TicketAutoCloseHours { get; set; } = 24;

        /// <summary>
        /// Gets or sets a value indicating whether the 24-hour inactivity ticket auto-close process is active.
        /// </summary>
        public bool EnableTicketAutoClose { get; set; } = true;

        /// <summary>
        /// Gets or sets the default number of free trial days granted to new organization workspaces (e.g. 14, 15, 30, 40, 60, 90).
        /// Defaults to 14 days.
        /// </summary>
        public int DefaultTrialDays { get; set; } = 14;

        /// <summary>
        /// Gets or sets the global default fallback 3-letter currency code (e.g. "USD", "NGN", "GBP")
        /// when country detection yields no specific regional match.
        /// </summary>
        [MaxLength(10)]
        public string DefaultCurrencyCode { get; set; } = "USD";

        /// <summary>
        /// Gets or sets the comma-separated list of support inquiry categories available on the public contact form and enterprise inquiries.
        /// Defaults to "Support, Sales, Billing, Partnership, Enterprise, General".
        /// </summary>
        public string SupportCategories { get; set; } = "Support, Sales, Billing, Partnership, Enterprise, General";

        /// <summary>
        /// Helper property returning the support categories as a clean parsed list of strings.
        /// Not mapped to the database.
        /// </summary>
        [NotMapped]
        public List<string> SupportCategoryList
        {
            get
            {
                if (string.IsNullOrWhiteSpace(SupportCategories))
                {
                    return new List<string> { "Support", "Sales", "Billing", "Partnership", "Enterprise", "General" };
                }

                return SupportCategories.Split(new[] { ',', ';', '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                                        .Distinct(StringComparer.OrdinalIgnoreCase)
                                        .ToList();
            }
        }

        /// <summary>
        /// Gets or sets the Master platform Cloudinary Cloud Name used as the global default for media, assets, and templates.
        /// </summary>
        [MaxLength(255)]
        public string? CloudinaryCloudName { get; set; }

        /// <summary>
        /// Gets or sets the Master platform Cloudinary API Key.
        /// </summary>
        [MaxLength(255)]
        public string? CloudinaryApiKey { get; set; }

        /// <summary>
        /// Gets or sets the Master platform Cloudinary API Secret.
        /// </summary>
        [MaxLength(255)]
        public string? CloudinaryApiSecret { get; set; }

        /// <summary>
        /// Gets or sets the OneSignal App ID used for mobile and desktop push notifications.
        /// </summary>
        [MaxLength(255)]
        public string? OneSignalAppId { get; set; }

        /// <summary>
        /// Gets or sets the Sentry DSN used for client crash reporting on web, mobile, and desktop.
        /// </summary>
        [MaxLength(500)]
        public string? SentryDsn { get; set; }

        /// <summary>
        /// Gets or sets the Cloudflare Turnstile public Site Key for client-side bot verification.
        /// </summary>
        [MaxLength(255)]
        public string? CloudflareTurnstileSiteKey { get; set; }

        /// <summary>
        /// Gets or sets a value indicating whether global platform maintenance mode is engaged.
        /// </summary>
        public bool IsMaintenanceMode { get; set; } = false;

        /// <summary>
        /// Gets or sets the maintenance message displayed to users when maintenance mode is active.
        /// </summary>
        [MaxLength(500)]
        public string? MaintenanceMessage { get; set; }

        /// <summary>
        /// Gets or sets the minimum supported mobile and desktop client application version (e.g. "1.0.0").
        /// </summary>
        [MaxLength(50)]
        public string MinimumAppVersion { get; set; } = "1.0.0";

        /// <summary>
        /// Gets or sets the UTC timestamp when these settings were last modified.
        /// </summary>
        public DateTime UpdatedUtc { get; set; } = DateTime.UtcNow;
    }
}
