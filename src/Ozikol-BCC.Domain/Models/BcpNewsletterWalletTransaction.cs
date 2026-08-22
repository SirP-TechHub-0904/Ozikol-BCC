using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Ozikol_BCC.Domain.Enum;

namespace Ozikol_BCC.Domain.Models
{
    public class BcpNewsletterWalletTransaction
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        public Guid BcpNewsletterWalletId { get; set; }
        public BcpNewsletterWallet? BcpNewsletterWallet { get; set; }

        [Display(Name = "Amount (Quota)")]
        public int Amount { get; set; }

        [Display(Name = "Transaction Type")]
        public Enum.Enum.BcpWalletTransactionType TransactionType { get; set; }

        [Display(Name = "Description")]
        public string Description { get; set; } = string.Empty;

        public DateTime Date { get; set; } = DateTime.UtcNow;
    }
}


