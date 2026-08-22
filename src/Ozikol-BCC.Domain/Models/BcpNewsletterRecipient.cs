using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Ozikol_BCC.Domain.Enum;

namespace Ozikol_BCC.Domain.Models
{
    public class BcpNewsletterRecipient
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        public Guid BcpNewsletterCampaignId { get; set; }
        public BcpNewsletterCampaign? BcpNewsletterCampaign { get; set; }

        public string UserId { get; set; } = string.Empty;
        public Profile? User { get; set; }

        [Display(Name = "Contact Name")]
        public string Name { get; set; } = string.Empty;

        [Display(Name = "Email Address")]
        public string EmailAddress { get; set; } = string.Empty;

        public Enum.Enum.BcpNewsletterDeliveryStatus DeliveryStatus { get; set; } = Enum.Enum.BcpNewsletterDeliveryStatus.Pending;

        [Display(Name = "Opened At")]
        public DateTime? OpenedAt { get; set; }

        public Guid TrackingGuid { get; set; } = Guid.NewGuid();
    }
}


