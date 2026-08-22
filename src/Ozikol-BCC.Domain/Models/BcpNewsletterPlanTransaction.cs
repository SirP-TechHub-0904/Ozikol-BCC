using System;
using System.ComponentModel.DataAnnotations;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Domain.Models
{
    public class BcpNewsletterPlanTransaction
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        public string UserId { get; set; } = string.Empty;
        public Profile? User { get; set; }

        public Guid BcpNewsletterPlanId { get; set; }
        public BcpNewsletterPlan? BcpNewsletterPlan { get; set; }

        public decimal Amount { get; set; }
        
        public int Quota { get; set; }

        public string Reference { get; set; } = string.Empty;

        public PaymentStatus Status { get; set; } = PaymentStatus.Pending;

        public string PaymentProvider { get; set; } = "Paystack";

        public bool IsGlobalPurchase { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? PaidAt { get; set; }
    }
}


