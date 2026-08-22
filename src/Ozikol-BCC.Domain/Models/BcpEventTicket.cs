using System;
using System.ComponentModel.DataAnnotations;

namespace Ozikol_BCC.Domain.Models
{
    public class BcpEventTicket
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        public Guid BcpTicketTypeId { get; set; }
        public BcpTicketType? BcpTicketType { get; set; }

        public string? UserId { get; set; }
        public Profile? UserProfile { get; set; }

        // For public/guest booking
        [StringLength(100)]
        public string? GuestName { get; set; }

        [StringLength(100)]
        public string? GuestEmail { get; set; }

        [StringLength(30)]
        public string? GuestPhone { get; set; }

        // Link to BcpFinanceTransaction (if Paid ticket)
        public string? TransactionReference { get; set; }

        [Required, StringLength(100)]
        public string? QrCodeText { get; set; } // Random string for scanning

        public bool IsUsed { get; set; } = false;
        
        public DateTime? ScannedAt { get; set; }

        public string? ScannedByUserId { get; set; }
        public Profile? ScannedByUser { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}


