using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Ozikol_BCC.Domain.Models
{
    public class BcpTicketType
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        public Guid BcpEventId { get; set; }
        public BcpEvent? BcpEvent { get; set; }

        [Required, StringLength(100)]
        public string? Name { get; set; } // e.g., VIP, Regular, Early Bird, Free

        public string? Description { get; set; }

        public decimal Price { get; set; } // 0 means Free

        public int? TotalCapacity { get; set; } // null means unlimited

        public int SoldCount { get; set; } = 0;

        public bool IsActive { get; set; } = true;

        public ICollection<BcpEventTicket> Tickets { get; set; } = new List<BcpEventTicket>();
    }
}


