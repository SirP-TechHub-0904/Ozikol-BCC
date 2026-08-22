using System;
using System.ComponentModel.DataAnnotations;

namespace Ozikol_BCC.Domain.Models
{
    public class BcpProposalPhase
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        public Guid BcpProposalId { get; set; }
        public BcpProposal? BcpProposal { get; set; }

        [Required, StringLength(150)]
        public string? Title { get; set; }

        public string? Description { get; set; }

        public Enum.Enum.PhaseStatus Status { get; set; } = Enum.Enum.PhaseStatus.Upcoming;

        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }

        // Markdown or HTML report for this specific phase
        public string? ReportSummary { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}


