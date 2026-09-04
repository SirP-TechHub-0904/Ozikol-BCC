using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol.MasterDomain.Models
{
    /// <summary>
    /// Central Marketplace category grouping for templates (e.g. Hero, FeatureGrid, Team, Testimonials, Footer).
    /// </summary>
    [Table("MasterMarketplaceCategories")]
    public class MasterMarketplaceCategory
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [Required]
        [MaxLength(50)]
        public string CategoryKey { get; set; } = null!; // "hero", "feature-grid", "team", "testimonials", "pricing", "footer"

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = null!;

        [MaxLength(250)]
        public string? Description { get; set; }

        [MaxLength(50)]
        public string Icon { get; set; } = "widgets";

        public int SortOrder { get; set; } = 0;

        public bool IsActive { get; set; } = true;

        public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;

        public ICollection<MasterMarketplaceTemplate> Templates { get; set; } = new List<MasterMarketplaceTemplate>();
    }
}
