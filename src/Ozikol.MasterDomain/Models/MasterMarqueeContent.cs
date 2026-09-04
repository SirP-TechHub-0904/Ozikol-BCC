using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol.MasterDomain.Models
{
    /// <summary>
    /// Pure content model for Marquee & Partner Logo Ticker templates.
    /// </summary>
    [Table("MasterMarqueeContents")]
    public class MasterMarqueeContent
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [ForeignKey("MasterMarketplaceTemplate")]
        public Guid MasterMarketplaceTemplateId { get; set; }
        public MasterMarketplaceTemplate MasterMarketplaceTemplate { get; set; } = null!;

        [MaxLength(200)]
        public string? KickerText { get; set; } // "TRUSTED BY LEADING ENTERPRISES"

        public ICollection<MasterMarqueeItem> Items { get; set; } = new List<MasterMarqueeItem>();
    }

    /// <summary>
    /// Child partner logo item inside a Marquee Ticker.
    /// </summary>
    [Table("MasterMarqueeItems")]
    public class MasterMarqueeItem
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [ForeignKey("MarqueeContent")]
        public Guid MasterMarqueeContentId { get; set; }
        public MasterMarqueeContent MarqueeContent { get; set; } = null!;

        [Required]
        [MaxLength(150)]
        public string BrandName { get; set; } = string.Empty;

        [Required]
        [MaxLength(500)]
        public string LogoUrl { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? DarkLogoUrl { get; set; }

        [MaxLength(500)]
        public string? WebsiteUrl { get; set; }

        public int SortOrder { get; set; } = 1;
    }
}
