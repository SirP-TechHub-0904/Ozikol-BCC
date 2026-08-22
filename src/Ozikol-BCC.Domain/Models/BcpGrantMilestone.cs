using System;
using System.ComponentModel.DataAnnotations;

namespace Ozikol_BCC.Domain.Models
{
    public class BcpGrantMilestone
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        public Guid BcpGrantId { get; set; }
        public BcpGrant? BcpGrant { get; set; }

        [Required, StringLength(150)]
        public string? Title { get; set; } // e.g., "Tranche 1", "Q3 Report Delivery"

        public decimal ExpectedAmount { get; set; }

        public decimal? AmountReceived { get; set; } // Null if not yet received

        public DateTime ExpectedDate { get; set; }

        public DateTime? ReceivedDate { get; set; }
        
        public string? Note { get; set; }
    }
}


