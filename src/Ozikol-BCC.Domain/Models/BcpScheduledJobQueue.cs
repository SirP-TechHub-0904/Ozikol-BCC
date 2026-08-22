using System;
using System.ComponentModel.DataAnnotations;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Universal Scheduled Job Queue.
    /// Stores future tasks (e.g. Scheduled Blog Publishing, Scheduled Broadcasts, Message Queues)
    /// to be processed by background workers when ScheduledAt <= DateTime.UtcNow.
    /// </summary>
    public class BcpScheduledJobQueue
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        /// <summary>
        /// ID of the target entity (e.g. Blog.Id, Notification.Id, Email.Id).
        /// </summary>
        [Required]
        [StringLength(100)]
        public string SourceId { get; set; } = string.Empty;

        /// <summary>
        /// Entity model name (e.g. "Blog", "Notification", "Email", "Sms", "Order").
        /// </summary>
        [Required]
        [StringLength(100)]
        public string SourceModel { get; set; } = string.Empty;

        /// <summary>
        /// The specific action to execute (e.g. "PublishBlog", "BroadcastNotification", "SendEmail").
        /// </summary>
        [Required]
        [StringLength(100)]
        public string ActionType { get; set; } = string.Empty;

        /// <summary>
        /// Optional JSON payload containing execution parameters.
        /// </summary>
        public string? Payload { get; set; }

        /// <summary>
        /// Scheduled execution timestamp.
        /// </summary>
        public DateTime ScheduledAt { get; set; }

        /// <summary>
        /// Timestamp when the task was processed by a background worker.
        /// </summary>
        public DateTime? ExecutedAt { get; set; }

        /// <summary>
        /// Current queue execution status.
        /// </summary>
        public BcpQueueStatus Status { get; set; } = BcpQueueStatus.Queued;

        /// <summary>
        /// Current retry attempt counter.
        /// </summary>
        public int Retries { get; set; } = 0;

        /// <summary>
        /// Maximum allowed retry attempts.
        /// </summary>
        public int MaxRetries { get; set; } = 3;

        /// <summary>
        /// Last error description if execution failed.
        /// </summary>
        public string? LastError { get; set; }

        /// <summary>
        /// Multi-tenant domain isolation key.
        /// </summary>
        [StringLength(100)]
        public string? TenantKey { get; set; }

        /// <summary>
        /// Timestamp when the job was enqueued.
        /// </summary>
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
