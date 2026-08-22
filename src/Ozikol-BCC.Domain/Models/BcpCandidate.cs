using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Ozikol_BCC.Domain.Models
{
    public class BcpCandidate
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        public Guid BcpVoteCategoryId { get; set; }
        public BcpVoteCategory? BcpVoteCategory { get; set; }

        public string? ProfileId { get; set; }
        public Profile? Profile { get; set; }

        [Required]
        [Display(Name = "Candidate Name (Title)")]
        public string? Title { get; set; }

        public string? CandidateImageUrl { get; set; }
        public string? CandidateImageKey { get; set; }

        [Display(Name = "Short Profile")]
        public string? ShortProfile { get; set; }
        
        public string? Manifesto { get; set; }

        public ICollection<BcpUserVote>? BcpUserVotes { get; set; }
    }
}


