using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Ozikol_BCC.Domain.Models
{
    public class BcpNewsletterWallet
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        public string UserId { get; set; } = string.Empty;
        public Profile? User { get; set; }

        [Display(Name = "Email Quota Balance")]
        public int EmailQuotaBalance { get; set; }

        [Display(Name = "Expiry Date")]
        public DateTime? ExpiryDate { get; set; }

        public ICollection<BcpNewsletterWalletTransaction>? Transactions { get; set; }
    }
}


