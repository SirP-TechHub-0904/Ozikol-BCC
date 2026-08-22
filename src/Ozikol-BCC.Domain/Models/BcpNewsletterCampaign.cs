using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Ozikol_BCC.Domain.Enum;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Tenant email/newsletter broadcast created by a BCP user. The background
    /// worker uses status and schedule fields to send messages without blocking UI.
    /// </summary>
    public class BcpNewsletterCampaign
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        public string UserId { get; set; } = string.Empty;
        public Profile? User { get; set; }

        [Required]
        public string Subject { get; set; } = string.Empty;

        [Display(Name = "HTML Body")]
        public string HtmlBody { get; set; } = string.Empty;

        /// <summary>
        /// Campaign workflow state used by schedulers and delivery logs.
        /// </summary>
        public Enum.Enum.BcpNewsletterCampaignStatus Status { get; set; } = Enum.Enum.BcpNewsletterCampaignStatus.Draft;

        [Display(Name = "Created At")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Display(Name = "Scheduled Date")]
        public DateTime? ScheduledDate { get; set; }

        [Display(Name = "Sent At")]
        public DateTime? SentAt { get; set; }

        [Display(Name = "Total Recipients")]
        public int TotalRecipients { get; set; }

        public ICollection<BcpNewsletterRecipient>? Recipients { get; set; }
    }
}


