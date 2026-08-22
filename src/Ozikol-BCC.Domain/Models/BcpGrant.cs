using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Ozikol_BCC.Domain.Models
{
    public class BcpGrant
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        // Optional link to the proposal that triggered this grant
        public Guid? BcpProposalId { get; set; }
        public BcpProposal? BcpProposal { get; set; }

        [Required, StringLength(300)]
        public string? Title { get; set; } // The name of the funded project

        public Guid BcpDonorId { get; set; }
        public BcpDonor? BcpDonor { get; set; }

        public decimal TotalAwardAmount { get; set; }

        [StringLength(10)]
        public string Currency { get; set; } = "NGN";

        public DateTime StartDate { get; set; }
        public DateTime? EndDate { get; set; }

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<BcpGrantMilestone> Milestones { get; set; } = new List<BcpGrantMilestone>();
    }
}


