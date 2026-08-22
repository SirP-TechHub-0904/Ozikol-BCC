using System;
using System.Collections.Generic;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Per-user BCP wallet for prepaid communication or feature usage credits.
    /// Balance changes should be represented by wallet transactions for auditability.
    /// </summary>
    public class BcpWallet
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();
        
        public string? UserId { get; set; }
        public Profile? User { get; set; }
        
        /// <summary>
        /// Current available balance. Services should update this together with a transaction record.
        /// </summary>
        public decimal Balance { get; set; }
        
        public DateTime LastUpdated { get; set; } = DateTime.UtcNow;

        public ICollection<BcpWalletTransaction> Transactions { get; set; } = new List<BcpWalletTransaction>();
    }
}


