using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Captures a staff member's personalized shift departure and duty reminder schedule.
    /// Provides 3 configurable notification slots (defaulting to 1 day / 4 hours / 30 mins)
    /// and multi-channel delivery toggles across In-App, Email, and WhatsApp.
    /// Table: [dbo].[BcpShiftNotificationPreferences]
    /// </summary>
    public class BcpShiftNotificationPreference : IBcpWorkforceEntity
    {
        /// <summary>
        /// Unique primary key identifier for the notification preference record.
        /// </summary>
        [Key]
        public Guid Id { get; set; } = Guid.CreateVersion7();

        /// <summary>
        /// Tenant identifier isolating this preference to the specific organization workspace.
        /// </summary>
        [Required]
        [StringLength(100)]
        public string TenantKey { get; set; } = string.Empty;

        /// <summary>
        /// User identifier referencing the central <c>ApplicationUser</c>.
        /// </summary>
        [Required]
        [StringLength(100)]
        public string UserId { get; set; } = string.Empty;

        /// <summary>
        /// Slot 1 reminder timing in minutes before shift start (default: 1440 = 24 hours / 1 day).
        /// </summary>
        public int Slot1MinutesBefore { get; set; } = 1440;

        /// <summary>
        /// Indicates whether reminder Slot 1 is active.
        /// </summary>
        public bool EnableSlot1 { get; set; } = true;

        /// <summary>
        /// Slot 2 reminder timing in minutes before shift start (default: 240 = 4 hours).
        /// </summary>
        public int Slot2MinutesBefore { get; set; } = 240;

        /// <summary>
        /// Indicates whether reminder Slot 2 is active.
        /// </summary>
        public bool EnableSlot2 { get; set; } = true;

        /// <summary>
        /// Slot 3 reminder timing in minutes before shift start (default: 30 = 30 minutes).
        /// </summary>
        public int Slot3MinutesBefore { get; set; } = 30;

        /// <summary>
        /// Indicates whether reminder Slot 3 is active.
        /// </summary>
        public bool EnableSlot3 { get; set; } = true;

        /// <summary>
        /// Master toggle for receiving in-app notification alerts and bell badges.
        /// </summary>
        public bool EnableInApp { get; set; } = true;

        /// <summary>
        /// Master toggle for receiving transactional email reminders.
        /// </summary>
        public bool EnableEmail { get; set; } = true;

        /// <summary>
        /// Master toggle for receiving WhatsApp duty notices.
        /// </summary>
        public bool EnableWhatsApp { get; set; } = true;

        /// <summary>
        /// Optional mobile phone number formatted with country code for WhatsApp/SMS dispatch.
        /// </summary>
        [StringLength(50)]
        public string? PreferredContactPhone { get; set; }

        /// <summary>
        /// Timestamp when the preference record was created in UTC.
        /// </summary>
        public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Timestamp when the preference record was last modified in UTC.
        /// </summary>
        public DateTime? UpdatedUtc { get; set; }
    }
}

