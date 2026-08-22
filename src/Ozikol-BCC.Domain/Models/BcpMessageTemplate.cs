using System;
using System.ComponentModel.DataAnnotations;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Represents a customizable multi-channel message template (Email, SMS, In-App Notification).
    /// Supports dynamic placeholder interpolation (e.g. {{FullName}}, {{OtpCode}}, {{TemporaryPassword}}).
    /// </summary>
    public class BcpMessageTemplate
    {
        public Guid Id { get; set; } = Guid.NewGuid();

        /// <summary>
        /// System event type that triggers this message.
        /// </summary>
        public BcpEventType EventType { get; set; }

        /// <summary>
        /// Delivery channel (Email, SMS, InAppNotification).
        /// </summary>
        public BcpMessageChannel Channel { get; set; }

        /// <summary>
        /// Human-readable template display name.
        /// </summary>
        [Required]
        [StringLength(150)]
        public string Name { get; set; } = string.Empty;

        /// <summary>
        /// Subject line for email and in-app title.
        /// </summary>
        [StringLength(255)]
        public string? SubjectTemplate { get; set; }

        /// <summary>
        /// Template body (HTML for Email, Plaintext for SMS, Markdown/text for In-App).
        /// </summary>
        [Required]
        public string BodyTemplate { get; set; } = string.Empty;

        /// <summary>
        /// Optional comma-separated list of available placeholders for this template.
        /// </summary>
        [StringLength(500)]
        public string? AvailablePlaceholders { get; set; }

        /// <summary>
        /// When true, this template will be evaluated and used when the event triggers.
        /// </summary>
        public bool IsActive { get; set; } = true;

        /// <summary>
        /// Date and time when the template was last modified.
        /// </summary>
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Name or identifier of the user who last modified the template.
        /// </summary>
        [StringLength(150)]
        public string? UpdatedBy { get; set; }
    }
}
