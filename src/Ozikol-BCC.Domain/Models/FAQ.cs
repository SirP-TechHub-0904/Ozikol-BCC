using System;
namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Represents a Frequently Asked Question displayed on the website.
    /// </summary>
    public class FAQ
    {
        /// <summary>
        /// Primary Key.
        /// </summary>
        public int Id { get; set; }

        /// <summary>
        /// The question being asked.
        /// </summary>
        public string? Title { get; set; }

        /// <summary>
        /// The answer content.
        /// </summary>
        public string? Message { get; set; }

        /// <summary>
        /// Positioning order on the UI.
        /// </summary>
        public int SortOrder { get; set; }

        /// <summary>
        /// Toggle visibility for this FAQ.
        /// </summary>
        public bool Show { get; set; }

        /// <summary>
        /// Optional Foreign Key linking to FAQCategory (null = Standalone/General question).
        /// </summary>
        public int? FAQCategoryId { get; set; }

        /// <summary>
        /// Navigation property to the parent FAQCategory.
        /// </summary>
        public FAQCategory? FAQCategory { get; set; }

        /// <summary>
        /// Creation timestamp in UTC.
        /// </summary>
        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    }
}


