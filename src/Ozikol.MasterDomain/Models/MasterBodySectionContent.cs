using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol.MasterDomain.Models
{
    /// <summary>
    /// Pure content model for Body Section templates (Services, Pricing, Testimonials, FAQ, About, Team, CTA, Timeline, Gallery, Tabs, Stats).
    /// Holds semantic headlines, descriptions, media URLs, dual CTAs, and repeating card lists.
    /// </summary>
    [Table("MasterBodySectionContents")]
    public class MasterBodySectionContent
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [ForeignKey("MasterMarketplaceTemplate")]
        public Guid MasterMarketplaceTemplateId { get; set; }
        public MasterMarketplaceTemplate MasterMarketplaceTemplate { get; set; } = null!;

        [Required]
        [MaxLength(50)]
        public string SectionSubType { get; set; } = "Services"; // Services, Pricing, Testimonials, FAQ, About, Team, CTA, Timeline, Gallery, Tabs, Stats

        [MaxLength(100)]
        public string? MiniTitle { get; set; }

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

        [MaxLength(100)]
        public string? PrimaryButtonText { get; set; }

        [MaxLength(500)]
        public string? PrimaryButtonUrl { get; set; }

        [MaxLength(100)]
        public string? SecondaryButtonText { get; set; }

        [MaxLength(500)]
        public string? SecondaryButtonUrl { get; set; }

        public int SortOrder { get; set; } = 1;

        public ICollection<MasterBodySectionList> SectionLists { get; set; } = new List<MasterBodySectionList>();
    }

    /// <summary>
    /// Child repeating card, pricing plan, FAQ item, testimonial, or team member inside a Body Section.
    /// </summary>
    [Table("MasterBodySectionLists")]
    public class MasterBodySectionList
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [ForeignKey("BodySectionContent")]
        public Guid MasterBodySectionContentId { get; set; }
        public MasterBodySectionContent BodySectionContent { get; set; } = null!;

        [MaxLength(50)]
        public string ItemType { get; set; } = "Card"; // Card, PricingPlan, Testimonial, FAQItem, TeamMember, TimelineStep, TabItem, GalleryItem, StatCounter

        [Required]
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        [MaxLength(250)]
        public string? SubTitle { get; set; }

        public string? Description { get; set; }

        [MaxLength(500)]
        public string? ImageUrl { get; set; }

        [MaxLength(100)]
        public string? IconClass { get; set; }

        [MaxLength(50)]
        public string? BadgeText { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? PriceAmount { get; set; }

        [MaxLength(30)]
        public string? PricePeriod { get; set; }

        [Column(TypeName = "decimal(3,2)")]
        public decimal? Rating { get; set; }

        [MaxLength(100)]
        public string? ButtonText { get; set; }

        [MaxLength(500)]
        public string? ButtonLink { get; set; }

        public int SortOrder { get; set; } = 1;
    }
}
