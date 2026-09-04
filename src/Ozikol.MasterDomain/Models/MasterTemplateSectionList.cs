using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol.MasterDomain.Models
{
    /// <summary>
    /// Represents a repeatable child card, slider slide, FAQ item, testimonial, or pricing plan inside a MasterTemplateSection.
    /// Cloned into a tenant's PageSectionList table during template installation.
    /// </summary>
    [Table("MasterTemplateSectionLists")]
    public class MasterTemplateSectionList
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [ForeignKey("MasterTemplateSection")]
        public Guid MasterTemplateSectionId { get; set; }
        public MasterTemplateSection MasterTemplateSection { get; set; } = null!;

        /// <summary>
        /// Item role/type: Slide, Card, Testimonial, PricingPlan, FAQItem, TeamMember, StepItem, GalleryItem, ContactCard, MarqueeLogo, NavItem, FooterLink
        /// </summary>
        [MaxLength(50)]
        public string ItemType { get; set; } = "Card";

        [Required]
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        [MaxLength(200)]
        public string? SubTitle { get; set; }

        public string? Description { get; set; }

        [MaxLength(500)]
        public string? ImageUrl { get; set; }

        [MaxLength(100)]
        public string? IconClass { get; set; } // e.g. "mdi-shield-check", "mdi-speedometer"

        [MaxLength(50)]
        public string? BadgeText { get; set; } // "Most Popular", "Step 1", "5 Stars"

        [MaxLength(100)]
        public string? ButtonText { get; set; }

        [MaxLength(500)]
        public string? ButtonLink { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal? PriceAmount { get; set; }

        [MaxLength(30)]
        public string? PricePeriod { get; set; } // "/month", "/year"

        [Column(TypeName = "decimal(3,2)")]
        public decimal? Rating { get; set; } // 5.00

        public int SortOrder { get; set; } = 1;
        public bool IsActive { get; set; } = true;
    }
}
