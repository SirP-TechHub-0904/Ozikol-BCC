using System;
using System.ComponentModel.DataAnnotations;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// User-specific BCP in-app notification. The Module, ActionUrl, Icon, and Category
    /// fields allow the UI to route users back into the correct feature page with
    /// rich visual context.
    /// </summary>
    public class BcpNotification
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        public string? UserId { get; set; }
        public Profile? User { get; set; }

        [Required]
        [StringLength(255)]
        public string? Title { get; set; }

        [Required]
        public string? Message { get; set; }

        public string? ActionUrl { get; set; }

        public bool IsRead { get; set; }

        /// <summary>
        /// Feature/module key that produced the notification, used for filtering and badges.
        /// </summary>
        public string? Module { get; set; }

        /// <summary>
        /// Material Symbols icon name for UI rendering (e.g. "security", "person", "monitoring").
        /// </summary>
        public string? Icon { get; set; }

        /// <summary>
        /// Feature category for grouping and filtering notifications.
        /// </summary>
        public BcpMessageCategory Category { get; set; } = BcpMessageCategory.General;

        /// <summary>
        /// Priority level for ordering and visual emphasis.
        /// </summary>
        public BcpMessagePriority Priority { get; set; } = BcpMessagePriority.Normal;

        /// <summary>
        /// The event type that triggered this notification.
        /// </summary>
        public BcpEventType? EventType { get; set; }

        /// <summary>
        /// If true, this notification is shown to all users (system-wide announcement).
        /// UserId is null for broadcast notifications.
        /// </summary>
        public bool IsBroadcast { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}

