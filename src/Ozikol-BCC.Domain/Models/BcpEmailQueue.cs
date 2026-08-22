using System;
using System.ComponentModel.DataAnnotations;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Queued email message. Background workers will drain this table and send
    /// through the configured email provider when ready.
    /// </summary>
    public class BcpEmailQueue
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        /// <summary>
        /// The user this email relates to (nullable for system/external emails).
        /// </summary>
        public string? RelatedUserId { get; set; }
        public Profile? RelatedUser { get; set; }

        [Required]
        [StringLength(255)]
        public string RecipientEmail { get; set; } = string.Empty;

        [StringLength(255)]
        public string? RecipientName { get; set; }

        [Required]
        [StringLength(500)]
        public string Subject { get; set; } = string.Empty;

        [Required]
        public string HtmlBody { get; set; } = string.Empty;

        public string? PlainBody { get; set; }

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

