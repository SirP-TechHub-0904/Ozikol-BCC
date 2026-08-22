using System;
using System.Collections.Generic;
using Ozikol_BCC.Domain.Enum;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Domain.Models
{
    public class BcpFinanceTransaction
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();
        public Guid? BcpFinanceCategoryId { get; set; }
        public BcpFinanceCategory? Category { get; set; }

        public string? UserId { get; set; }
        public Profile? UserProfile { get; set; }

        // For public/guest payments
        public string? DonorName { get; set; }
        public string? DonorEmail { get; set; }
        public string? DonorPhone { get; set; }

        public decimal Amount { get; set; }
        public string Currency { get; set; } = "USD";
        public string? TransactionReference { get; set; }
        public string? PaymentProvider { get; set; } // "PixelPay" | "Paystack" | "Manual"

        public string Feature { get; set; } = "General"; // "ProductCatalog" | "Membership" | "Donation" | "EventTicket"
        public string? SourceId { get; set; } // e.g. Order ID or Registration ID

        public Enum.Enum.PaymentStatus Status { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? PaidAt { get; set; }

        public string? Notes { get; set; }
    }
}



