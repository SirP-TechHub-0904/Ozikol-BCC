using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// An inline poll inside a group chat. Created as part of a chat message.
    /// </summary>
    public class BcpGroupPoll
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        public Guid BcpGroupId { get; set; }
        public BcpGroup? BcpGroup { get; set; }

        /// <summary>
        /// The chat message that contains this poll.
        /// </summary>
        public Guid? MessageId { get; set; }

        [Required]
        [StringLength(500)]
        [Display(Name = "Question")]
        public string Question { get; set; } = string.Empty;

        [Display(Name = "Allow Multiple Choices")]
        public bool IsMultipleChoice { get; set; }

        [Display(Name = "Anonymous Voting")]
        public bool IsAnonymous { get; set; }

        [Display(Name = "Expires At")]
        public DateTime? ExpiresAt { get; set; }

        public string CreatedByUserId { get; set; } = string.Empty;
        public Profile? CreatedByUser { get; set; }

        [Display(Name = "Date Created")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public virtual ICollection<BcpGroupPollOption> Options { get; set; } = new List<BcpGroupPollOption>();
    }
}

