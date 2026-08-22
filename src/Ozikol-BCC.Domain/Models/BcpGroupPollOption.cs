using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// A selectable option within a group poll.
    /// </summary>
    public class BcpGroupPollOption
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        public Guid PollId { get; set; }
        public BcpGroupPoll? Poll { get; set; }

        [Required]
        [StringLength(300)]
        [Display(Name = "Option Text")]
        public string OptionText { get; set; } = string.Empty;

        public virtual ICollection<BcpGroupPollVote> Votes { get; set; } = new List<BcpGroupPollVote>();
    }
}

