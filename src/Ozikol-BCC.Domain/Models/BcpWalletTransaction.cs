using System;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Domain.Models
{
    public class BcpWalletTransaction
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();
        
        public Guid? BcpWalletId { get; set; }
        public BcpWallet? BcpWallet { get; set; }

        public string? UserId { get; set; }
        public Profile? User { get; set; }
        
        public decimal Amount { get; set; }
        
        public BcpWalletTransactionType TransactionType { get; set; }
        
        public string? Description { get; set; }
        
        public string? Reference { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}


