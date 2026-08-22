using System;
using System.Collections.Generic;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Tenant SMS broadcast request created by a BCP user. Recipients and delivery
    /// state are tracked separately so background workers can process safely.
    /// </summary>
    public class BcpSmsCampaign
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();
        
        public string? UserId { get; set; }
        public Profile? User { get; set; }
        
        /// <summary>
        /// Approved sender identity used by the SMS provider.
        /// </summary>
        public string? SenderId { get; set; }
        
        public string? Subject { get; set; }
        public string? Message { get; set; }
        
        public decimal CostIncurred { get; set; }
        public int TotalRecipients { get; set; }
        
        /// <summary>
        /// Campaign workflow state used by schedulers and dashboard reporting.
        /// </summary>
        public BcpSmsCampaignStatus Status { get; set; }
        
        public DateTime? ScheduledDate { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public ICollection<BcpSmsRecipient> Recipients { get; set; } = new List<BcpSmsRecipient>();
    }
}


