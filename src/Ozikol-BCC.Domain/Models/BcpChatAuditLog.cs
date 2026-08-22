using System;
using System.ComponentModel.DataAnnotations;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Compliance audit trail for group chat. Preserves original content
    /// of edited/deleted messages and admin moderation actions.
    /// Only visible to Platform Admins.
    /// </summary>
    public class BcpChatAuditLog
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        /// <summary>
        /// The group where the action occurred.
        /// </summary>
        public Guid? GroupId { get; set; }
        public BcpGroup? Group { get; set; }

        public Guid? MessageId { get; set; }

        /// <summary>
        /// The user who performed the action.
        /// </summary>
        public string? UserId { get; set; }
        public Profile? User { get; set; }

        /// <summary>
        /// Action type: "MessageDeleted", "MessageEdited", "UserMuted",
        /// "UserSuspended", "ChatModeLocked", "UserRoleChanged", etc.
        /// </summary>
        [Required]
        [StringLength(100)]
        [Display(Name = "Action")]
        public string Action { get; set; } = string.Empty;

        /// <summary>
        /// The original content of a message before it was edited or deleted.
        /// </summary>
        [Display(Name = "Original Content")]
        public string? OriginalContent { get; set; }

        /// <summary>
        /// Additional details about the action (JSON or descriptive text).
        /// </summary>
        [Display(Name = "Details")]
        public string? Details { get; set; }

        [Display(Name = "Timestamp")]
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    }
}

