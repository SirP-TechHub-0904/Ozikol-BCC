using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol.MasterDomain.Models
{
    /// <summary>
    /// Represents a dynamic support frequently asked question (FAQ) published across customer and helpdesk portals.
    /// </summary>
    [Table("MasterSupportFaqs")]
    public class MasterSupportFaq
    {
        /// <summary>
        /// Gets or sets the unique primary key identifier.
        /// </summary>
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        /// <summary>
        /// Gets or sets the customer-facing question text.
        /// </summary>
        [Required]
        [MaxLength(300)]
        public string Question { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the detailed answer content (supports plain text or formatted markdown/HTML).
        /// </summary>
        [Required]
        [MaxLength(2000)]
        public string Answer { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the categorization grouping (e.g. General, Support, Billing, Platform, Security).
        /// </summary>
        [MaxLength(60)]
        public string? Category { get; set; } = "General";

        /// <summary>
        /// Gets or sets the optional suite association code (e.g. suite-workforce) if question is suite-specific.
        /// </summary>
        [MaxLength(80)]
        public string? SuiteCode { get; set; }

        /// <summary>
        /// Gets or sets the 2-letter ISO culture code (e.g. en, fr, es, de, or * for universal).
        /// </summary>
        [Required]
        [MaxLength(10)]
        public string Culture { get; set; } = "en";

        /// <summary>
        /// Gets or sets the sorting order within category listings.
        /// </summary>
        public int SortOrder { get; set; } = 0;

        /// <summary>
        /// Gets or sets a value indicating whether this question is actively published and visible.
        /// </summary>
        public bool IsPublished { get; set; } = true;

        /// <summary>
        /// Gets or sets the date and time when the FAQ was created in UTC.
        /// </summary>
        public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Gets or sets the date and time when the FAQ was last updated in UTC.
        /// </summary>
        public DateTime UpdatedUtc { get; set; } = DateTime.UtcNow;
    }
}
