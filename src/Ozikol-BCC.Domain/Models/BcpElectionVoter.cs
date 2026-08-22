namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Links a Profile to an election and records accreditation/voting completion.
    /// This is the eligibility record; it should not store the selected candidate.
    /// </summary>
    public class BcpElectionVoter
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        public Guid BcpElectionId { get; set; }
        public BcpElection? BcpElection { get; set; }

        public string? UserId { get; set; }
        public Profile? User { get; set; }

        /// <summary>
        /// True when the user is allowed to vote in a closed election.
        /// </summary>
        public bool IsAccredited { get; set; }

        /// <summary>
        /// True after the user completes the election workflow.
        /// </summary>
        public bool HasVoted { get; set; }
    }
}


