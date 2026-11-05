using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol.MasterDomain.Models
{
    /// <summary>
    /// Represents an administrative, operational, or security notification item in the Central platform.
    /// Supports multi-channel targeting (In-App, OneSignal Web Push, and Postmark Email).
    /// </summary>
    [Table("MasterNotifications")]
    public class MasterNotification
    {
        /// <summary>
        /// Unique identifier for this notification.
        /// </summary>
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        /// <summary>
        /// Specific operator recipient user ID, or null if targeted to a role group or broadcast to all operators.
        /// </summary>
        [MaxLength(450)]
        public string? RecipientUserId { get; set; }

        /// <summary>
        /// Target security role (e.g. "SuperAdmin", "Admin", "Billing", "Support", "Compliance"), or null for all.
        /// </summary>
        [MaxLength(100)]
        public string? TargetRole { get; set; }

        /// <summary>
        /// Target audience classification for broadcast messages (e.g. "All", "Operators", "Creators", "Affiliates", "TenantAdmins").
        /// </summary>
        [MaxLength(100)]
        public string? TargetAudience { get; set; }

        /// <summary>
        /// Functional category (e.g. "Tenants", "Billing", "BackgroundJobs", "Security", "Support", "Creators", "Affiliates", "System").
        /// </summary>
        [Required]
        [MaxLength(60)]
        public string Category { get; set; } = "System";

        /// <summary>
        /// Headline title for the notification.
        /// </summary>
        [Required]
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        /// <summary>
        /// Detailed notification content or event description.
        /// </summary>
        [Required]
        [MaxLength(2000)]
        public string Message { get; set; } = string.Empty;

        /// <summary>
        /// Severity level: "Info", "Success", "Warning", "Danger".
        /// </summary>
        [Required]
        [MaxLength(30)]
        public string Severity { get; set; } = "Info";

        /// <summary>
        /// Material symbol icon name for UI rendering (e.g. "notifications", "apartment", "payments", "bolt", "security").
        /// </summary>
        [MaxLength(60)]
        public string Icon { get; set; } = "notifications";

        /// <summary>
        /// Direct deep-link URL route that the user is navigated to when clicking this notification.
        /// </summary>
        [MaxLength(500)]
        public string? ActionUrl { get; set; }

        /// <summary>
        /// Associated primary key entity identifier (e.g. Tenant ID, Job ID, Ticket ID, User ID).
        /// </summary>
        [MaxLength(200)]
        public string? EntityId { get; set; }

        /// <summary>
        /// Indicates whether this notification has been read.
        /// </summary>
        public bool IsRead { get; set; }

        /// <summary>
        /// UTC timestamp when this notification was marked as read.
        /// </summary>
        public DateTime? ReadAtUtc { get; set; }

        /// <summary>
        /// Comma-separated list of delivery channels through which this notification was dispatched (e.g. "InApp,OneSignal,Email").
        /// </summary>
        [MaxLength(200)]
        public string? DispatchedChannels { get; set; }

        /// <summary>
        /// The user ID of the administrator who created/composed this notification (if manually broadcast).
        /// </summary>
        [MaxLength(450)]
        public string? CreatedByUserId { get; set; }

        /// <summary>
        /// UTC creation timestamp.
        /// </summary>
        public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;
    }
}
