using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol.MasterDomain.Models
{
    /// <summary>
    /// Central UI Marketplace template/block definition.
    /// Stores the pure HTML markup with {{ Mustache }} placeholders, scoped CSS properties, sandboxed JS, and mock data.
    /// Stored strictly in the central Master Catalog database (MasterCatalogDbContext).
    /// </summary>
    [Table("MasterMarketplaceTemplates")]
    public class MasterMarketplaceTemplate
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [ForeignKey("Category")]
        public Guid CategoryId { get; set; }
        public MasterMarketplaceCategory Category { get; set; } = null!;

        [Required]
        [MaxLength(50)]
        public string CategoryKey { get; set; } = null!;

        [Required]
        [MaxLength(150)]
        public string Name { get; set; } = null!; // "Split Product Hero Showcase"

        [Required]
        [MaxLength(100)]
        public string VariantCode { get; set; } = null!; // "Hero_SplitProduct"

        [MaxLength(50)]
        public string Tag { get; set; } = "modern"; // "modern", "dark", "corporate", "ecommerce"

        [MaxLength(50)]
        public string? Badge { get; set; } // "Popular", "New", "Trending"

        [MaxLength(500)]
        public string? Description { get; set; }

        [MaxLength(150)]
        public string ThumbnailGradient { get; set; } = "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)";

        [MaxLength(50)]
        public string PreviewIcon { get; set; } = "widgets";

        [MaxLength(200)]
        public string? PreviewTitle { get; set; }

        [MaxLength(200)]
        public string? PreviewSubtitle { get; set; }

        public string? PreviewBody { get; set; }

        [MaxLength(500)]
        public string? PreviewImageUrl { get; set; }

        /// <summary>
        /// Pure Semantic HTML template with {{ Title }}, {{ MiniTitle }}, {{ ImageUrl }}, and {{#each PageSectionLists}} loops.
        /// </summary>
        public string HtmlTemplate { get; set; } = null!;

        /// <summary>
        /// Scoped CSS properties stylesheet guaranteeing zero style collisions with platform themes.
        /// </summary>
        public string CssStyles { get; set; } = null!;

        /// <summary>
        /// Optional sandboxed JavaScript execution hook (for sliders, counters, accordions, tabs).
        /// </summary>
        public string? JsScript { get; set; }

        /// <summary>
        /// Default JSON array of child SectionList cards/items.
        /// </summary>
        public string? DefaultSectionListsJson { get; set; }

        [MaxLength(20)]
        public string Version { get; set; } = "1.0.0";

        public bool IsActive { get; set; } = true;
        public int SortOrder { get; set; } = 0;
        public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;
        public DateTime? UpdatedUtc { get; set; }

        public ICollection<MasterTemplatePlaceholder> Placeholders { get; set; } = new List<MasterTemplatePlaceholder>();
        public ICollection<MasterTemplateSection> Sections { get; set; } = new List<MasterTemplateSection>();

        // Pure Category Content Navigations
        public MasterMenuContent? MenuContent { get; set; }
        public MasterHeroContent? HeroContent { get; set; }
        public ICollection<MasterBodySectionContent> BodySections { get; set; } = new List<MasterBodySectionContent>();
        public MasterBlogContent? BlogContent { get; set; }
        public MasterMarqueeContent? MarqueeContent { get; set; }
        public MasterContactContent? ContactContent { get; set; }
        public MasterFooterContent? FooterContent { get; set; }
    }
}
