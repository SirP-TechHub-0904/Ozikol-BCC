using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Ozikol_BCC.Domain.Models
{
    public class BcpEvent
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        [Required, StringLength(200)]
        public string? Title { get; set; }

        public string? Description { get; set; }

        [Required, StringLength(300)]
        public string? Venue { get; set; }

        [Required]
        public DateTime StartDate { get; set; }

        public DateTime? EndDate { get; set; }

        public string? BannerImageUrl { get; set; }

        public bool IsActive { get; set; } = true;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Links to the overall finance category to track all ticket revenue for this event
        public Guid? BcpFinanceCategoryId { get; set; }
        public BcpFinanceCategory? BcpFinanceCategory { get; set; }

        public ICollection<BcpTicketType> TicketTypes { get; set; } = new List<BcpTicketType>();
    }
}


