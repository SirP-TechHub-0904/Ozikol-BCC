using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Central catalog category for the Master UI Marketplace (e.g. Navigation, Hero, Body, Footer, Contact, etc.).
    /// Stored strictly in the central Master Catalog database (MasterCatalogDbContext).
    /// </summary>
    [Table("MasterMarketplaceCategories")]
    public class MasterMarketplaceCategory
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        /// <summary>
        /// System key used in code and APIs (e.g., "menu", "hero", "body", "footer", "newsletter", "contact", "blog", "ecommerce", "breadcrumb").
        /// </summary>
        [Required]
        [MaxLength(50)]
        public string CategoryKey { get; set; } = null!;

        /// <summary>
        /// Human-readable display name (e.g., "Hero & Sliders", "Navigation & Menu").
        /// </summary>
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = null!;

        /// <summary>
        /// Material design symbol icon name (e.g., "view_carousel", "menu", "view_quilt").
        /// </summary>
        [MaxLength(50)]
        public string Icon { get; set; } = "widgets";

        /// <summary>
        /// Short summary description of components in this category.
        /// </summary>
        [MaxLength(300)]
        public string? Description { get; set; }

        public int SortOrder { get; set; } = 0;
        public bool IsActive { get; set; } = true;

        public ICollection<MasterMarketplaceTemplate> Templates { get; set; } = new List<MasterMarketplaceTemplate>();
    }
}
