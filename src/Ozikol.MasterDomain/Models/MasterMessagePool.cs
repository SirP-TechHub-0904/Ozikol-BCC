using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol.MasterDomain.Models;

/// <summary>
/// Central cross-tenant message pool and delivery outbox (Email, SMS, Push, WhatsApp).
/// Decouples background workers from individual tenant databases, allowing high-throughput
/// autonomous delivery with zero tenant database connections.
/// </summary>
[Table("MasterMessagePools")]
public class MasterMessagePool
{
    /// <summary>
    /// Gets or sets the sequential primary key identifier (UUIDv7).
    /// </summary>
    [Key]
    public Guid Id { get; set; } = Guid.CreateVersion7();

    /// <summary>
    /// Gets or sets the target tenant organization key (e.g. 'nightpress', 'choosehc').
    /// </summary>
    [Required]
    [MaxLength(100)]
    public string TenantKey { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the human-readable organization name for display and audit logging.
    /// </summary>
    [MaxLength(255)]
    public string? OrganizationName { get; set; }

    /// <summary>
    /// Gets or sets the target communication channel (Email, Sms, Push, WhatsApp, InAppNotification).
    /// </summary>
    [Required]
    [MaxLength(50)]
    public string Channel { get; set; } = "Email";

    /// <summary>
    /// Gets or sets the target provider responsible for transmission (Mailcow, Postmark, KudiSms, Twilio, MetaWhatsApp).
    /// </summary>
    [Required]
    [MaxLength(50)]
    public string Provider { get; set; } = "Mailcow";

    /// <summary>
    /// Gets or sets the target recipient address (email address, phone number in E.164, or user ID).
    /// </summary>
    [Required]
    [MaxLength(255)]
    public string RecipientAddress { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the full name of the recipient for salutations.
    /// </summary>
    [MaxLength(255)]
    public string? RecipientName { get; set; }

    /// <summary>
    /// Gets or sets the subject line for emails or title headline for push/SMS alerts.
    /// </summary>
    [MaxLength(500)]
    public string? Subject { get; set; }

    /// <summary>
    /// Gets or sets the primary message body content (Rich HTML for emails, GSM-7 for SMS).
    /// </summary>
    [Required]
    public string Content { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets an optional plain-text fallback for rich HTML messages.
    /// </summary>
    public string? PlainTextFallback { get; set; }

    /// <summary>
    /// Gets or sets an optional clickable deep link or action URL.
    /// </summary>
    [MaxLength(500)]
    public string? ActionUrl { get; set; }

    /// <summary>
    /// Gets or sets the canonical category (General, Security, Workforce, Billing, Marketing).
    /// </summary>
    [MaxLength(100)]
    public string Category { get; set; } = "General";

    /// <summary>
    /// Gets or sets the alert severity (Error, Failed, Success, NewFeature, Update, Maintenance).
    /// </summary>
    [MaxLength(50)]
    public string Severity { get; set; } = "Update";

    /// <summary>
    /// Gets or sets the delivery priority (Low, Normal, High, Urgent).
    /// </summary>
    [MaxLength(50)]
    public string Priority { get; set; } = "Normal";

    /// <summary>
    /// Gets or sets the delivery status (Queued, Processing, Sent, Failed).
    /// </summary>
    [Required]
    [MaxLength(50)]
    public string Status { get; set; } = "Queued";

    /// <summary>
    /// Gets or sets the current retry attempt counter.
    /// </summary>
    public int Retries { get; set; } = 0;

    /// <summary>
    /// Gets or sets the maximum allowed retries before permanent failure (default 3, max 5).
    /// </summary>
    public int MaxRetries { get; set; } = 3;

    /// <summary>
    /// Gets or sets the diagnostic error message from carrier gateway, SMTP, or provider.
    /// </summary>
    public string? LastError { get; set; }

    /// <summary>
    /// Gets or sets the external provider message identifier (Mailcow QueueID, Postmark MessageID, etc.).
    /// </summary>
    [MaxLength(255)]
    public string? ProviderMessageId { get; set; }

    /// <summary>
    /// Gets or sets the optional sender email/name or template identifier.
    /// </summary>
    [MaxLength(255)]
    public string? SenderOrTemplateName { get; set; }

    /// <summary>
    /// Gets or sets structured JSON metadata for custom attributes and audit trails.
    /// </summary>
    public string? MetadataJson { get; set; }

    /// <summary>
    /// Gets or sets the scheduled delivery time in UTC.
    /// </summary>
    public DateTime? ScheduledAt { get; set; }

    /// <summary>
    /// Gets or sets the actual delivery completion timestamp in UTC.
    /// </summary>
    public DateTime? SentAt { get; set; }

    /// <summary>
    /// Gets or sets the record creation timestamp in UTC.
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
