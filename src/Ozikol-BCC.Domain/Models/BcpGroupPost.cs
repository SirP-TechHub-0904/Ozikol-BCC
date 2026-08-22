using System;
using System.ComponentModel.DataAnnotations;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// A chat message inside a BCP group. Supports text, files, polls, system events,
    /// reply threading, pinning, editing, soft-deletion, @mentions, and read receipts.
    /// </summary>
    public class BcpGroupPost
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        public Guid BcpGroupId { get; set; }
        public BcpGroup? BcpGroup { get; set; }

        public string UserProfileId { get; set; } = string.Empty;
        public Profile? UserProfile { get; set; }

        [Required]
        [Display(Name = "Message Content")]
        public string Content { get; set; } = string.Empty;

        /// <summary>
        /// The type of content this message carries.
        /// </summary>
        [Display(Name = "Message Type")]
        public BcpChatMessageType MessageType { get; set; } = BcpChatMessageType.Text;

        // ── Reply Threading ──

        /// <summary>
        /// ID of the message this is replying to (flat reply, not nested threads).
        /// </summary>
        public Guid? ReplyToMessageId { get; set; }
        public BcpGroupPost? ReplyToMessage { get; set; }

        // ── File Attachment ──

        /// <summary>
        /// FK to BcpGroupFile when MessageType == File.
        /// </summary>
        public Guid? FileId { get; set; }
        public BcpGroupFile? File { get; set; }

        // ── Poll ──

        /// <summary>
        /// FK to BcpGroupPoll when MessageType == Poll.
        /// </summary>
        public Guid? PollId { get; set; }
        public BcpGroupPoll? Poll { get; set; }

        // ── Flags ──

        [Display(Name = "Is Pinned")]
        public bool IsPinned { get; set; }

        [Display(Name = "Is Deleted")]
        public bool IsDeleted { get; set; }

        [Display(Name = "Is Edited")]
        public bool IsEdited { get; set; }

        [Display(Name = "Edited At")]
        public DateTime? EditedAt { get; set; }

        // ── @Mentions ──

        /// <summary>
        /// Comma-separated user IDs that were @mentioned in this message.
        /// </summary>
        [StringLength(2000)]
        public string? MentionedUserIds { get; set; }

        // ── Delivery Status ──

        /// <summary>
        /// Overall delivery status of this message (Sent → Delivered → Read).
        /// Aggregate status; per-user tracking is in BcpMessageReadReceipt.
        /// </summary>
        [Display(Name = "Delivery Status")]
        public BcpMessageDeliveryStatus DeliveryStatus { get; set; } = BcpMessageDeliveryStatus.Sent;

        [Display(Name = "Date Posted")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}

