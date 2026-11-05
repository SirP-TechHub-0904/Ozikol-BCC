using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Represents a category group of pages used to construct navbar dropdown menus and organized footer columns.
    /// Supports recursive hierarchy (Parent Category -> Child Sub-Category).
    /// </summary>
    [Table("PageCategories")]
    public class PageCategory
    {
        /// <summary>
        /// Unique primary key identifier for the page category.
        /// </summary>
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        /// <summary>
        /// Name of the category (e.g., "Services", "About Us", "Solutions").
        /// </summary>
        [Required]
        [MaxLength(150)]
        [Display(Name = "Category Title")]
        public string Title { get; set; } = string.Empty;

        /// <summary>
        /// Explicit positioning of this category dropdown in the navigation layout (First/Left, Middle/Center, Last/Right, or Top Utility Bar).
        /// Navigation items are grouped first by MenuPosition, then sorted by MenuSortOrder within that group.
        /// </summary>
        [Display(Name = "Menu Zone Position")]
        public MenuPosition MenuPosition { get; set; } = MenuPosition.Middle;

        /// <summary>
        /// Position in the primary navigation header menu within its MenuPosition group.
        /// </summary>
        [Display(Name = "Menu Sort Order")]
        public int MenuSortOrder { get; set; } = 0;

        /// <summary>
        /// Toggle visibility for this category on the public UI.
        /// </summary>
        public bool Publish { get; set; } = true;

        /// <summary>
        /// Toggle visibility as a dropdown menu in the website navigation header.
        /// When true, this category and its attached child pages will render in the navbar.
        /// </summary>
        [Display(Name = "Show In Menu")]
        public bool ShowInMenu { get; set; } = true;

        /// <summary>
        /// Toggle visibility as a column header in the website footer.
        /// When true, child WebPages with ShowInFooter = true will be rendered under this category column.
        /// </summary>
        [Display(Name = "Show In Footer")]
        public bool ShowInFooter { get; set; } = true;

        /// <summary>
        /// Explicit sorting position of this category column within the website footer columns layout.
        /// </summary>
        [Display(Name = "Footer Sort Order")]
        public int FooterSortOrder { get; set; } = 0;

        /// <summary>
        /// Custom display title to use when displayed as a footer column header.
        /// If left empty, the footer column will default to Title.
        /// </summary>
        [MaxLength(150)]
        [Display(Name = "Footer Display Title")]
        public string? FooterDisplayTitle { get; set; }

        /// <summary>
        /// Optional: Allows creating cascading sub-dropdown menus (Parent Category -> Child Category).
        /// </summary>
        [Display(Name = "Parent Category")]
        public Guid? ParentId { get; set; }

        /// <summary>
        /// Navigation property to the parent category.
        /// </summary>
        [ForeignKey("ParentId")]
        public PageCategory? Parent { get; set; }

        /// <summary>
        /// Navigation collection of child sub-categories.
        /// </summary>
        public ICollection<PageCategory> Children { get; set; } = new List<PageCategory>();

        /// <summary>
        /// Navigation collection of all WebPages assigned to this category.
        /// </summary>
        public ICollection<WebPage> WebPages { get; set; } = new List<WebPage>();

        /// <summary>
        /// Optional FontAwesome or Bootstrap icon class string (e.g. 'fa-solid fa-folder', 'bi bi-grid').
        /// </summary>
        [MaxLength(100)]
        public string? Icon { get; set; }

        /// <summary>
        /// Optional custom CSS class applied to this category's dropdown trigger or column container.
        /// Injected into templates via {{ CustomClass }}.
        /// </summary>
        [MaxLength(200)]
        [Display(Name = "Custom CSS Class")]
        public string? CustomClass { get; set; }

        /// <summary>
        /// Category creation timestamp in UTC.
        /// </summary>
        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Last updated timestamp in UTC.
        /// </summary>
        public DateTime? UpdatedAtUtc { get; set; }
    }
}
