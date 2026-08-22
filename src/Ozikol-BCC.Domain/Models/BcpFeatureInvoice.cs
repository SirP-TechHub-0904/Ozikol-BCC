using System;
using System.ComponentModel.DataAnnotations;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Billing record for a BCP feature subscription or one-time feature charge.
    /// </summary>
    public class BcpFeatureInvoice
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        public Guid BcpFeatureId { get; set; }
        public BcpFeature BcpFeature { get; set; } = null!;

        [Display(Name = "Amount Due")]
        public decimal AmountDue { get; set; }

        [Display(Name = "Invoice Date")]
        public DateTime InvoiceDate { get; set; }

        [Display(Name = "Due Date")]
        public DateTime DueDate { get; set; }

        [Display(Name = "Is Paid")]
        public bool IsPaid { get; set; }

        [Display(Name = "Payment Date")]
        public DateTime? PaymentDate { get; set; }
    }
}


