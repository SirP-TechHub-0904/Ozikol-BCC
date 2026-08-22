using System;
using System.Collections.Generic;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Represents a category for grouping news articles (e.g., 'Technology News', 'Announcements').
    /// </summary>
    public class BlogCategory
    {
        /// <summary>
        /// Primary Key.
        /// </summary>
        public Guid Id { get; set; }

        /// <summary>
        /// Name of the category.
        /// </summary>
        public string? Title { get; set; }

        /// <summary>
        /// Navigation property for all blog posts in this category.
        /// </summary>
        public ICollection<Blog>? Blogs { get; set; }

        /// <summary>
        /// Toggle visibility for the category.
        /// </summary>
        public bool Publish { get; set; }

        /// <summary>
        /// Optional: Allows creating cascading sub-dropdowns (e.g., Tech -> AI).
        /// </summary>
        public Guid? ParentId { get; set; }

        /// <summary>
        /// Navigation property to the parent category.
        /// </summary>
        public BlogCategory? Parent { get; set; }

        /// <summary>
        /// Navigation property for the sub-categories.
        /// </summary>
        public ICollection<BlogCategory>? Children { get; set; }
    }
}


