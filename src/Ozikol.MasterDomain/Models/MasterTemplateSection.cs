using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol.MasterDomain.Models
{
    /// <summary>
    /// Represents a distinct section block within a master template layout in the Master Catalog.
    /// Cloned into a tenant's PageSection table during template installation.
    /// </summary>
    [Table("MasterTemplateSections")]
    public class MasterTemplateSection
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [ForeignKey("MasterMarketplaceTemplate")]
        public Guid MasterMarketplaceTemplateId { get; set; }
        public MasterMarketplaceTemplate MasterMarketplaceTemplate { get; set; } = null!;

        /// <summary>
        /// 7 Core Marketplace Categories: menu, hero, bodysections, blogs, marquee, contactus, footer
        /// </summary>
        [Required]
        [MaxLength(50)]
        public string CategoryKey { get; set; } = "bodysections";

        /// <summary>
        /// Specific layout sub-type: Services, Pricing, Testimonials, FAQ, About, Team, CTA, Timeline, Gallery, Tabs, ContactForm, Standard
        /// </summary>
        [MaxLength(50)]
        public string SectionSubType { get; set; } = "Services";

        /// <summary>
        /// Unique section code within template e.g. "hero-slider-01", "pricing-matrix-03"
        /// </summary>
        [Required]
        [MaxLength(100)]
        public string SectionKey { get; set; } = string.Empty;

        [Required]
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        [MaxLength(250)]
        public string? SubTitle { get; set; }

        [MaxLength(100)]
        public string? MiniTitle { get; set; } // Badge text e.g. "⚡ POWERING 10,000+ TEAMS"

        public string? Description { get; set; }

        [MaxLength(500)]
        public string? PrimaryImageUrl { get; set; }

        [MaxLength(500)]
        public string? SecondaryImageUrl { get; set; }

        [MaxLength(50)]
        public string BackgroundType { get; set; } = "Color"; // Color, Image, Gradient, Video

        [MaxLength(500)]
        public string? BackgroundValue { get; set; }

        [MaxLength(100)]
        public string? ButtonText { get; set; }

        [MaxLength(500)]
        public string? ButtonUrl { get; set; }

        [MaxLength(100)]
        public string? SecondaryButtonText { get; set; }

        [MaxLength(500)]
        public string? SecondaryButtonUrl { get; set; }

        public int SortOrder { get; set; } = 1;
        public bool IsActive { get; set; } = true;
        public string? CustomCss { get; set; }

        public ICollection<MasterTemplateSectionList> SectionLists { get; set; } = new List<MasterTemplateSectionList>();
    }
}
