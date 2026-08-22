using System;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Represents a cast vote for a candidate in one category. It intentionally
    /// avoids a direct Profile relationship so vote auditing can use encrypted codes.
    /// </summary>
    public class BcpUserVote
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        public Guid BcpVoteCategoryId { get; set; }
        public BcpVoteCategory? BcpVoteCategory { get; set; }

        public Guid BcpCandidateId { get; set; }
        public BcpCandidate? BcpCandidate { get; set; }

        /// <summary>
        /// Encrypted voter reference used to validate uniqueness without exposing identity.
        /// </summary>
        public string? EncryptCode { get; set; }
        public DateTime DateCast { get; set; }
    }
}


