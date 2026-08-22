using System.Collections.Generic;

namespace Ozikol_BCC.Domain.Models
{
    public class BcpVoteCategory
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();
        
        public Guid BcpElectionId { get; set; }
        public BcpElection? BcpElection { get; set; }
        
        public string? Title { get; set; }
        public string? Description { get; set; }
        
        public int SortOrder { get; set; }

        public ICollection<BcpCandidate>? BcpCandidates { get; set; }
        public ICollection<BcpUserVote>? BcpUserVotes { get; set; }
    }
}


