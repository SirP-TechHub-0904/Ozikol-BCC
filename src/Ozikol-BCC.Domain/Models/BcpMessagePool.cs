using System;
using System.ComponentModel.DataAnnotations;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Unified multi-channel communication outbox and delivery pool (Email, SMS, WhatsApp, In-App, Push).
    /// Centralizes all outgoing messages, provider delivery statuses, retries, and audit history in a single table.
    /// </summary>
    public class BcpMessagePool
    {
        /// <summary>
        /// Gets or sets the primary key sequential Version 7 GUID.
        /// </summary>
        public Guid Id { get; set; } = Guid.CreateVersion7();

        /// <summary>
        /// Gets or sets the target communication channel (Email = 0, Sms = 1, InAppNotification = 2, Push = 3, WhatsApp = 4).
        /// </summary>
        public BcpMessageChannel Channel { get; set; } = BcpMessageChannel.Email;

        /// <summary>
        /// The user this communication relates to (nullable for external recipients).
        /// </summary>
        public string? RelatedUserId { get; set; }
        public Profile? RelatedUser { get; set; }

        /// <summary>
        /// Target recipient destination: Email address, phone number (E.164), or user ID.
        /// </summary>
        [Required]
        [StringLength(255)]
        public string RecipientAddress { get; set; } = string.Empty;

        /// <summary>
        /// Full name of the recipient for salutations.
        /// </summary>
        [StringLength(255)]
        public string? RecipientName { get; set; }

        /// <summary>
        /// Subject line for emails, headline title for in-app and push alerts.
        /// </summary>
        [StringLength(500)]
        public string? Subject { get; set; }

        /// <summary>
        /// Primary message body content: Rich HTML for emails, GSM-7 for SMS, Markdown for WhatsApp, plain text for in-app.
        /// </summary>
        [Required]
        public string Content { get; set; } = string.Empty;

        /// <summary>
        /// Plain-text fallback for HTML emails or rich messages.
        /// </summary>
        public string? PlainTextFallback { get; set; }

        /// <summary>
        /// Optional clickable deep link or action URL for in-app, push, and WhatsApp.
        /// </summary>
        [StringLength(500)]
        public string? ActionUrl { get; set; }

        /// <summary>
        /// Optional Material Symbols icon name for in-app UI cards.
        /// </summary>
        [StringLength(60)]
        public string? Icon { get; set; }

        /// <summary>
        /// Canonical message category (General, Security, Account, UserManagement, etc.).
        /// </summary>
        public BcpMessageCategory Category { get; set; } = BcpMessageCategory.General;

        /// <summary>
        /// 6-tier platform alert severity (Error, Failed, Success, NewFeature, Update, Maintenance).
        /// </summary>
        public NotificationSeverity Severity { get; set; } = NotificationSeverity.Update;

        /// <summary>
        /// Message delivery priority (Low, Normal, High, Urgent).
        /// </summary>
        public BcpMessagePriority Priority { get; set; } = BcpMessagePriority.Normal;

        /// <summary>
        /// Optional event type trigger (e.g. PasswordReset, MemberInvitation, ShiftUrgentAlert).
        /// </summary>
        public BcpEventType? EventType { get; set; }

        /// <summary>
        /// Outbox queue status (Queued = 0, Processing = 1, Sent = 2, Failed = 3).
        /// </summary>
        public BcpQueueStatus Status { get; set; } = BcpQueueStatus.Queued;

        /// <summary>
        /// Current retry attempt counter.
        /// </summary>
        public int Retries { get; set; } = 0;

        /// <summary>
        /// Maximum allowed retry attempts before marking permanent failure.
        /// </summary>
        public int MaxRetries { get; set; } = 3;

        /// <summary>
        /// Diagnostic error description from carrier gateway, SMTP, Postmark, or WhatsApp Meta Cloud API.
        /// </summary>
        public string? LastError { get; set; }

        /// <summary>
        /// External provider message identifier (Postmark MessageID, Mailcow QueueID, Twilio SID, Meta wamid).
        /// </summary>
        [StringLength(255)]
        public string? ProviderMessageId { get; set; }

        /// <summary>
        /// Optional custom SMS sender ID or WhatsApp template name.
        /// </summary>
        [StringLength(100)]
        public string? SenderOrTemplateName { get; set; }

        /// <summary>
        /// Structured JSON metadata for custom attributes, HSM template params, or callback state.
        /// </summary>
        public string? MetadataJson { get; set; }

        /// <summary>
        /// Scheduled delivery time in UTC.
        /// </summary>
        public DateTime? ScheduledAt { get; set; }

        /// <summary>
        /// Actual delivery completion timestamp in UTC.
        /// </summary>
        public DateTime? SentAt { get; set; }

        /// <summary>
        /// Record creation timestamp in UTC.
        /// </summary>
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}

