using System;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Domain.Models
{
    public class BcpSmsRecipient
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();
        
        public Guid BcpSmsCampaignId { get; set; }
        public BcpSmsCampaign? BcpSmsCampaign { get; set; }
        
        public string? PhoneNumber { get; set; }
        
        public BcpSmsDeliveryStatus DeliveryStatus { get; set; }
        
        public string? Reference { get; set; }
    }
}


