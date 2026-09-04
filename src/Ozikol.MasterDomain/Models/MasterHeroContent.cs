using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol.MasterDomain.Models
{
    /// <summary>
    /// Pure content model for Hero & Slider templates.
    /// Stores headlines, subtitles, media video/image URLs, dual CTA links, and slide collections.
    /// </summary>
    [Table("MasterHeroContents")]
    public class MasterHeroContent
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [ForeignKey("MasterMarketplaceTemplate")]
        public Guid MasterMarketplaceTemplateId { get; set; }
        public MasterMarketplaceTemplate MasterMarketplaceTemplate { get; set; } = null!;

        [MaxLength(200)]
        public string? MiniTitle { get; set; } // Kicker/Badge e.g. "⚡ ENTERPRISE PLATFORM"

        [Required]
        [MaxLength(250)]
        public string Title { get; set; } = string.Empty;

        [MaxLength(300)]
        public string? SubTitle { get; set; }

        public string? Description { get; set; }

        [MaxLength(500)]
        public string? PrimaryImageUrl { get; set; }

        [MaxLength(500)]
        public string? SecondaryImageUrl { get; set; }

        [MaxLength(500)]
        public string? VideoUrl { get; set; }

        [MaxLength(500)]
        public string? VideoPosterUrl { get; set; }

        [MaxLength(100)]
        public string? PrimaryButtonText { get; set; }

        [MaxLength(500)]
        public string? PrimaryButtonUrl { get; set; }

        [MaxLength(100)]
        public string? SecondaryButtonText { get; set; }

        [MaxLength(500)]
        public string? SecondaryButtonUrl { get; set; }

        public ICollection<MasterHeroSlideItem> Slides { get; set; } = new List<MasterHeroSlideItem>();
    }

    /// <summary>
    /// Child slide item inside a Hero Slider layout.
    /// </summary>
    [Table("MasterHeroSlideItems")]
    public class MasterHeroSlideItem
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [ForeignKey("HeroContent")]
        public Guid MasterHeroContentId { get; set; }
        public MasterHeroContent HeroContent { get; set; } = null!;

        [MaxLength(100)]
        public string? MiniTitle { get; set; }

        [Required]
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        [MaxLength(250)]
        public string? SubTitle { get; set; }

        public string? Description { get; set; }

        [MaxLength(500)]
        public string? ImageUrl { get; set; }

        [MaxLength(100)]
        public string? ButtonText { get; set; }

        [MaxLength(500)]
        public string? ButtonUrl { get; set; }

        public int SortOrder { get; set; } = 1;
    }
}
