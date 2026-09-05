using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol.MasterDomain.Models
{
    /// <summary>
    /// Represents a dynamic knowledge base or helpdesk article associated with an enterprise suite or feature module.
    /// </summary>
    [Table("MasterHelpdeskArticles")]
    public class MasterHelpdeskArticle
    {
        /// <summary>
        /// Gets or sets the unique primary key identifier.
        /// </summary>
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        /// <summary>
        /// Gets or sets the parent enterprise suite code (e.g. suite-people, suite-workforce, suite-operations).
        /// </summary>
        [Required]
        [MaxLength(80)]
        public string SuiteCode { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the optional specific feature permalink code (e.g. staff-rota, community-messenger).
        /// If null, this article serves as a suite-wide foundational guide.
        /// </summary>
        [MaxLength(80)]
        public string? FeatureCode { get; set; }

        /// <summary>
        /// Gets or sets the public article title.
        /// </summary>
        [Required]
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the URL-friendly unique permalink slug.
        /// </summary>
        [Required]
        [MaxLength(200)]
        public string Slug { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets a concise summary or excerpt for listings and preview cards.
        /// </summary>
        [Required]
        [MaxLength(500)]
        public string Summary { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the rich formatted HTML or structured markdown content of the guide.
        /// </summary>
        [Required]
        public string ContentHtml { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the category classification (e.g., Getting Started, Configuration, Troubleshooting, Best Practices, API).
        /// </summary>
        [Required]
        [MaxLength(60)]
        public string Category { get; set; } = "Getting Started";

        /// <summary>
        /// Gets or sets the 2-letter ISO culture code (e.g. en, fr, es, de, or * for universal).
        /// </summary>
        [Required]
        [MaxLength(10)]
        public string Culture { get; set; } = "en";

        /// <summary>
        /// Gets or sets the estimated reading duration in minutes.
        /// </summary>
        public int EstimatedReadMinutes { get; set; } = 3;

        /// <summary>
        /// Gets or sets the cumulative reader view count.
        /// </summary>
        public int ViewCount { get; set; } = 0;

        /// <summary>
        /// Gets or sets the count of positive feedback votes ("Was this helpful?").
        /// </summary>
        public int HelpfulCount { get; set; } = 0;

        /// <summary>
        /// Gets or sets the sorting order within category listings.
        /// </summary>
        public int SortOrder { get; set; } = 0;

        /// <summary>
        /// Gets or sets a value indicating whether this guide is published and visible on the portal.
        /// </summary>
        public bool IsPublished { get; set; } = true;

        /// <summary>
        /// Gets or sets the date and time when the article was created in UTC.
        /// </summary>
        public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Gets or sets the date and time when the article was last updated in UTC.
        /// </summary>
        public DateTime UpdatedUtc { get; set; } = DateTime.UtcNow;
    }
}
