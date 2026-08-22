using System;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Domain.Models
{
    public class BcpSmsSenderId
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();
        
        public string? SenderId { get; set; }
        
        public string? SampleMessage { get; set; }
        
        public BcpSenderIdStatus Status { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}


