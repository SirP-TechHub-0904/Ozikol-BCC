using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Represents a category group for FAQs (e.g. "Membership", "Billing & Dues", "General").
    /// </summary>
    public class FAQCategory
    {
        /// <summary>
        /// Primary Key.
        /// </summary>
        public int Id { get; set; }

        /// <summary>
        /// Display title of the FAQ category.
        /// </summary>
        [Required]
        [Display(Name = "Category Title")]
        public string Title { get; set; } = string.Empty;

        /// <summary>
        /// Sorting order for the category tabs on the UI.
        /// </summary>
        [Display(Name = "Sort Order")]
        public int SortOrder { get; set; }

        /// <summary>
        /// Toggle to publish or hide this entire FAQ category.
        /// </summary>
        public bool Publish { get; set; } = true;

        /// <summary>
        /// Navigation property for all FAQs belonging to this category.
        /// </summary>
        public ICollection<FAQ>? FAQs { get; set; }

        /// <summary>
        /// Creation timestamp in UTC.
        /// </summary>
        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    }
}
