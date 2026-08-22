using System;
using System.ComponentModel.DataAnnotations;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Per-user delivery/read tracking for a group chat message.
    /// Enables WhatsApp-style read receipts and the Message Info panel.
    /// </summary>
    public class BcpMessageReadReceipt
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        /// <summary>
        /// The message being tracked.
        /// </summary>
        public Guid MessageId { get; set; }
        public BcpGroupPost? Message { get; set; }

        /// <summary>
        /// The user who received/read the message.
        /// </summary>
        public string UserId { get; set; } = string.Empty;
        public Profile? User { get; set; }

        /// <summary>
        /// Current delivery status for this user.
        /// </summary>
        [Display(Name = "Status")]
        public BcpMessageDeliveryStatus Status { get; set; } = BcpMessageDeliveryStatus.Sent;

        /// <summary>
        /// Timestamp when the message was delivered to this user's client.
        /// </summary>
        [Display(Name = "Delivered At")]
        public DateTime? DeliveredAt { get; set; }

        /// <summary>
        /// Timestamp when this user actually read (scrolled into view) the message.
        /// </summary>
        [Display(Name = "Read At")]
        public DateTime? ReadAt { get; set; }
    }
}

