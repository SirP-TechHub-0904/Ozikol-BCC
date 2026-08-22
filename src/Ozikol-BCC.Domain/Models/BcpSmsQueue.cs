using System;
using System.ComponentModel.DataAnnotations;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Queued SMS message. Background workers will drain this table and send
    /// through the configured SMS provider when ready.
    /// </summary>
    public class BcpSmsQueue
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        /// <summary>
        /// The user this SMS relates to (nullable for external recipients).
        /// </summary>
        public string? RelatedUserId { get; set; }
        public Profile? RelatedUser { get; set; }

        [Required]
        [StringLength(20)]
        public string RecipientPhone { get; set; } = string.Empty;

        [Required]
        [StringLength(480)]
        public string Message { get; set; } = string.Empty;

        public BcpMessageCategory Category { get; set; } = BcpMessageCategory.General;

        public BcpMessagePriority Priority { get; set; } = BcpMessagePriority.Normal;

        public BcpEventType? EventType { get; set; }

        public BcpQueueStatus Status { get; set; } = BcpQueueStatus.Queued;

        public int Retries { get; set; } = 0;

        public int MaxRetries { get; set; } = 3;

        public string? LastError { get; set; }

        public DateTime? ScheduledAt { get; set; }

        public DateTime? SentAt { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}

