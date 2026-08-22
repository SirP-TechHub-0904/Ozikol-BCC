using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using Ozikol_BCC.Domain.Enum;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Domain.Models
{
    public class BcpFinanceCategory
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();
        public string? Title { get; set; }
        public string? Description { get; set; }
        public bool IsCompulsory { get; set; }
        public Enum.Enum.PaymentFrequency Frequency { get; set; }
        public decimal? FixedAmount { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<BcpFinanceTransaction>? Transactions { get; set; }
    }
}


