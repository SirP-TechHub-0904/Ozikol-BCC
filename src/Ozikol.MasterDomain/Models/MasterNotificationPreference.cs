using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol.MasterDomain.Models
{
    /// <summary>
    /// Stores an operator's channel alert preferences per functional notification category.
    /// </summary>
    [Table("MasterNotificationPreferences")]
    public class MasterNotificationPreference
    {
        /// <summary>
        /// Unique identifier for this preference record.
        /// </summary>
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        /// <summary>
        /// The operator user ID owning this preference.
        /// </summary>
        [Required]
        [MaxLength(450)]
        public string UserId { get; set; } = string.Empty;

        /// <summary>
        /// The functional category (e.g. "Tenants", "Billing", "BackgroundJobs", "Security", "Support", "Creators", "Affiliates", "System").
        /// </summary>
        [Required]
        [MaxLength(60)]
        public string Category { get; set; } = "System";

        /// <summary>
        /// Whether in-app notifications (bell & center) are enabled for this category.
        /// </summary>
        public bool InAppEnabled { get; set; } = true;

        /// <summary>
        /// Whether OneSignal web/device push notifications are enabled for this category.
        /// </summary>
        public bool PushEnabled { get; set; } = true;

        /// <summary>
        /// Whether daily/weekly email digests are enabled for this category.
        /// </summary>
        public bool EmailDigestEnabled { get; set; } = false;

        /// <summary>
        /// Whether instant high-priority emails are dispatched for this category.
        /// </summary>
        public bool InstantEmailEnabled { get; set; } = false;

        /// <summary>
        /// UTC timestamp when this preference was last updated.
        /// </summary>
        public DateTime UpdatedUtc { get; set; } = DateTime.UtcNow;
    }
}
