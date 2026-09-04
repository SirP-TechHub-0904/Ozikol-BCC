using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol.MasterDomain.Models
{
    /// <summary>
    /// Pure content model for Contact Us & Lead Capture templates.
    /// </summary>
    [Table("MasterContactContents")]
    public class MasterContactContent
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [ForeignKey("MasterMarketplaceTemplate")]
        public Guid MasterMarketplaceTemplateId { get; set; }
        public MasterMarketplaceTemplate MasterMarketplaceTemplate { get; set; } = null!;

        [MaxLength(100)]
        public string? MiniTitle { get; set; }

        [Required]
        [MaxLength(250)]
        public string Title { get; set; } = string.Empty;

        [MaxLength(300)]
        public string? SubTitle { get; set; }

        public string? Description { get; set; }

        [MaxLength(100)]
        public string? SubmitButtonText { get; set; } = "Send Inquiry";

        [MaxLength(1000)]
        public string? MapEmbedUrl { get; set; }

        public ICollection<MasterContactChannelItem> Channels { get; set; } = new List<MasterContactChannelItem>();
    }

    /// <summary>
    /// Child direct communication channel item (Phone, Email, Office Address, Hours).
    /// </summary>
    [Table("MasterContactChannelItems")]
    public class MasterContactChannelItem
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [ForeignKey("ContactContent")]
        public Guid MasterContactContentId { get; set; }
        public MasterContactContent ContactContent { get; set; } = null!;

        [Required]
        [MaxLength(100)]
        public string Title { get; set; } = string.Empty; // e.g. "Direct Phone Hotline"

        [Required]
        [MaxLength(200)]
        public string ValueText { get; set; } = string.Empty; // e.g. "+1 (800) 555-0199"

        public string? Description { get; set; }

        [MaxLength(100)]
        public string? IconClass { get; set; }

        [MaxLength(500)]
        public string? ActionUrl { get; set; }

        public int SortOrder { get; set; } = 1;
    }
}
