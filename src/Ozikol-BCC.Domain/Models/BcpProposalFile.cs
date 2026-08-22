using System;
using System.ComponentModel.DataAnnotations;

namespace Ozikol_BCC.Domain.Models
{
    public class BcpProposalFile
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        public Guid BcpProposalId { get; set; }
        public BcpProposal? BcpProposal { get; set; }

        [Required, StringLength(200)]
        public string? Title { get; set; }

        [Required]
        public string? Url { get; set; }

        public string? Key { get; set; }
    }
}


