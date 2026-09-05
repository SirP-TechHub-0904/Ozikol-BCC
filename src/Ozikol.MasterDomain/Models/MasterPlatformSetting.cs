using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

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
        /// Gets or sets the UTC timestamp when these settings were last modified.
        /// </summary>
        public DateTime UpdatedUtc { get; set; } = DateTime.UtcNow;
    }
}
