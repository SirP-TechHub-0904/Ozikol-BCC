using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Ozikol_BCC.Domain.Models
{
    public class BcpProposal
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        public string? UserId { get; set; }
        [System.ComponentModel.DataAnnotations.Schema.ForeignKey("UserId")]
        public Profile? UserProfile { get; set; }

        [Required, StringLength(300)]
        public string? Title { get; set; }

        public string? Description { get; set; }

        public string? Address { get; set; }

        public string? Note { get; set; }

        public string? TypedProposal { get; set; }

        public Enum.Enum.ProposalStatus Status { get; set; } = Enum.Enum.ProposalStatus.Draft;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? DateSubmitted { get; set; }
        public DateTime? DateApproved { get; set; }

        public ICollection<BcpProposalFile> ProposalFiles { get; set; } = new List<BcpProposalFile>();
        
        // Link to resulting grant if approved
        public BcpGrant? LinkedGrant { get; set; }

        public string? ExecutionDuration { get; set; }
        public DateTime? ProjectStartDate { get; set; }
        public DateTime? ProjectEndDate { get; set; }

        public ICollection<BcpProposalPhase> Phases { get; set; } = new List<BcpProposalPhase>();
    }
}


