using System;

namespace Ozikol_BCC.Domain.Models
{
    public class BcpContact
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();
        
        public Guid BcpPhoneBookId { get; set; }
        public BcpPhoneBook? BcpPhoneBook { get; set; }
        
        public string? Name { get; set; }
        public string? PhoneNumber { get; set; }
        
        public bool IsActive { get; set; } = true;
    }
}


