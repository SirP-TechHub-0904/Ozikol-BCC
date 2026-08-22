using System;
using System.ComponentModel.DataAnnotations;

namespace Ozikol_BCC.Domain.Models
{
    public class BcpMarketingCampaign
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        [Required]
        [StringLength(250)]
        public string CampaignName { get; set; } = string.Empty;

        [Required]
        [StringLength(500)]
        public string EmailSubject { get; set; } = string.Empty;

        public Guid? BcpProductId { get; set; }
        public BcpProduct? Product { get; set; }

        [Required]
        public string TemplateType { get; set; } = "ProductLaunch"; // "ProductLaunch", "FlashSale", "ServiceInvitation", "ProductDigest", "CustomBuilder"

        [Required]
        public string HtmlContent { get; set; } = string.Empty;

        public string? AudienceFilter { get; set; } // "AllMembers", "Category:Guid", "ManualUpload"
        public int TotalRecipients { get; set; } = 0;
        public int SentCount { get; set; } = 0;
        public int FailedCount { get; set; } = 0;

        public string Status { get; set; } = "Draft"; // "Draft", "Queued", "Sending", "Completed", "Failed"

        public DateTime? ScheduledForUtc { get; set; }
        public DateTime? CompletedAtUtc { get; set; }

        public string? CreatedByUserId { get; set; }
        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    }
}
