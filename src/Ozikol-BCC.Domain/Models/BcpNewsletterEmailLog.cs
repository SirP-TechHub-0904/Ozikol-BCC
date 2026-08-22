using System;
using System.ComponentModel.DataAnnotations;

namespace Ozikol_BCC.Domain.Models
{
    public class BcpNewsletterEmailLog
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        [Required]
        [EmailAddress]
        public string? EmailAddress { get; set; }

        public string? Subject { get; set; }

        public string? MailBody { get; set; }

        public DateTime SentDatetime { get; set; } = DateTime.UtcNow;

        public DateTime? ReceivedDatetime { get; set; }

        public Ozikol_BCC.Domain.Enum.Enum.EmailLogStatus Status { get; set; } = Ozikol_BCC.Domain.Enum.Enum.EmailLogStatus.Pending;

        public Guid? CampaignId { get; set; }
        public BcpNewsletterCampaign? Campaign { get; set; }

        public int RetryCount { get; set; } = 0;

        public string? ErrorMessage { get; set; }
    }
}


