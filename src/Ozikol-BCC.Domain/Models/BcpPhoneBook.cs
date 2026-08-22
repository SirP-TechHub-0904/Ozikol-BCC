using System;
using System.Collections.Generic;

namespace Ozikol_BCC.Domain.Models
{
    public class BcpPhoneBook
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();
        
        public string? UserId { get; set; }
        public Profile? User { get; set; }
        
        public string? Name { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<BcpContact> Contacts { get; set; } = new List<BcpContact>();
    }
}


