using System;
using System.ComponentModel.DataAnnotations;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Records a user's vote on a specific poll option.
    /// </summary>
    public class BcpGroupPollVote
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        public Guid PollId { get; set; }
        public BcpGroupPoll? Poll { get; set; }

        public Guid OptionId { get; set; }
        public BcpGroupPollOption? Option { get; set; }

        public string UserId { get; set; } = string.Empty;
        public Profile? User { get; set; }

        [Display(Name = "Voted At")]
        public DateTime VotedAt { get; set; } = DateTime.UtcNow;
    }
}

