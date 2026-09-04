using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol.MasterDomain.Models
{
    /// <summary>
    /// Pure content model for Menu & Navigation templates.
    /// Stores brand headers, logos, action CTAs, and cascading nav items.
    /// </summary>
    [Table("MasterMenuContents")]
    public class MasterMenuContent
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [ForeignKey("MasterMarketplaceTemplate")]
        public Guid MasterMarketplaceTemplateId { get; set; }
        public MasterMarketplaceTemplate MasterMarketplaceTemplate { get; set; } = null!;

        [MaxLength(500)]
        public string? LogoUrl { get; set; }

        [MaxLength(500)]
        public string? DarkLogoUrl { get; set; }

        [MaxLength(150)]
        public string? BrandName { get; set; }

        [MaxLength(100)]
        public string? PrimaryButtonText { get; set; }

        [MaxLength(500)]
        public string? PrimaryButtonUrl { get; set; }

        [MaxLength(100)]
        public string? SecondaryButtonText { get; set; }

        [MaxLength(500)]
        public string? SecondaryButtonUrl { get; set; }

        public ICollection<MasterMenuNavItem> NavItems { get; set; } = new List<MasterMenuNavItem>();
    }

    /// <summary>
    /// Multi-tier cascading navigation item supporting up to 3 levels (Root -> SubMenu -> Flyout Link).
    /// </summary>
    [Table("MasterMenuNavItems")]
    public class MasterMenuNavItem
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [ForeignKey("MenuContent")]
        public Guid MasterMenuContentId { get; set; }
        public MasterMenuContent MenuContent { get; set; } = null!;

        /// <summary>
        /// Self-referencing ParentId enabling 3-tier hierarchy (Level 1 Root -> Level 2 Sub-menu -> Level 3 Flyout).
        /// </summary>
        public Guid? ParentId { get; set; }
        public MasterMenuNavItem? Parent { get; set; }

        [Required]
        [MaxLength(150)]
        public string Title { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? Url { get; set; }

        [MaxLength(100)]
        public string? IconClass { get; set; }

        [MaxLength(50)]
        public string? BadgeText { get; set; } // e.g. "New", "Pro"

        public int HierarchyLevel { get; set; } = 1; // 1 = Main, 2 = SubMenu, 3 = NestedLink
        public int SortOrder { get; set; } = 1;

        public ICollection<MasterMenuNavItem> Children { get; set; } = new List<MasterMenuNavItem>();
    }
}
