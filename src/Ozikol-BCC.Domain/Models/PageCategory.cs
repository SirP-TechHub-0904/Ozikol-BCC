using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Represents a group of pages, typically used to build dropdown menus or footer categories.
    /// </summary>
    public class PageCategory
    {
        /// <summary>
        /// Primary Key.
        /// </summary>
        public Guid Id { get; set; }

        /// <summary>
        /// Name of the category (e.g., "About Us Menu").
        /// </summary>
        public string? Title { get; set; }

        /// <summary>
        /// Navigation property for all WebPages inside this category.
        /// </summary>
        public ICollection<WebPage>? WebPages { get; set; }

        /// <summary>
        /// Toggle visibility for this category on the UI.
        /// </summary>
        public bool Publish { get; set; }

        /// <summary>
        /// Position in the navigation bar.
        /// </summary>
        [Display(Name = "Menu Sort Order")]
        public int MenuSortOrder { get; set; }

        /// <summary>
        /// Toggle visibility as a column header in the website footer.
        /// When true, child WebPages with ShowInFooter = true will be rendered under this category column.
        /// </summary>
        [Display(Name = "Show In Footer")]
        public bool ShowInFooter { get; set; } = true;

        /// <summary>
        /// Custom display title to use when displayed as a footer column header.
        /// If left empty, the footer column will default to Title.
        /// </summary>
        [MaxLength(150)]
        [Display(Name = "Footer Display Title")]
        public string? FooterDisplayTitle { get; set; }

        /// <summary>
        /// Determines where on the home page this category's children are sorted from.
        /// </summary>
        [Display(Name = "Home Sort From")]
        public HomeSortFrom HomeSortFrom { get; set; }

        /// <summary>
        /// Optional: Allows creating cascading sub-dropdown menus (e.g., Parent Category -> Child Category).
        /// </summary>
        [Display(Name = "Parent Category")]
        public Guid? ParentId { get; set; }

        /// <summary>
        /// Navigation property to the parent category.
        /// </summary>
        public PageCategory? Parent { get; set; }

        /// <summary>
        /// Navigation property for the sub-categories.
        /// </summary>
        public ICollection<PageCategory>? Children { get; set; }

        /// <summary>
        /// Optional FontAwesome / Bootstrap icon class string (e.g. 'fa-solid fa-folder').
        /// </summary>
        public string? Icon { get; set; }

        /// <summary>
        /// Category creation timestamp in UTC.
        /// </summary>
        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    }
}


