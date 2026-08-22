using System;
using System.ComponentModel.DataAnnotations;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// A 1-on-1 direct message between two members of the same group.
    /// DMs are scoped to a group — users can only DM people in their shared groups.
    /// </summary>
    public class BcpDirectMessage
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        public string SenderUserId { get; set; } = string.Empty;
        public Profile? SenderUser { get; set; }

        public string ReceiverUserId { get; set; } = string.Empty;
        public Profile? ReceiverUser { get; set; }

        /// <summary>
        /// The group context in which this DM was initiated.
        /// </summary>
        public Guid GroupId { get; set; }
        public BcpGroup? Group { get; set; }

        [Required]
        [Display(Name = "Content")]
        public string Content { get; set; } = string.Empty;

        [Display(Name = "Message Type")]
        public BcpChatMessageType MessageType { get; set; } = BcpChatMessageType.Text;

        /// <summary>
        /// Optional file attachment.
        /// </summary>
        public Guid? FileId { get; set; }
        public BcpGroupFile? File { get; set; }

        /// <summary>
        /// Reply to a previous DM.
        /// </summary>
        public Guid? ReplyToMessageId { get; set; }
        public BcpDirectMessage? ReplyToMessage { get; set; }

        [Display(Name = "Is Read")]
        public bool IsRead { get; set; }

        [Display(Name = "Is Deleted")]
        public bool IsDeleted { get; set; }

        [Display(Name = "Date Sent")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}

