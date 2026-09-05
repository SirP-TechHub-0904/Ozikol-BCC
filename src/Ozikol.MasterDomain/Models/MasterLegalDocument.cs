using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol.MasterDomain.Models
{
    /// <summary>
    /// Represents a dynamic central legal policy, agreement, compliance report, or terms document
    /// managed through the master platform catalog and served across the central portal.
    /// </summary>
    [Table("MasterLegalDocuments")]
    public class MasterLegalDocument
    {
        /// <summary>
        /// Gets or sets the unique primary key identifier.
        /// </summary>
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        /// <summary>
        /// Gets or sets the unique URL slug identifier (e.g., "privacy-notice", "terms-of-use", "cookies", "privacy-choices", "policies-and-reports").
        /// </summary>
        [Required]
        [MaxLength(100)]
        public string Slug { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the formal public document title.
        /// </summary>
        [Required]
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the governance category classification (e.g., "Privacy", "Terms", "Cookies", "Compliance", "Governance").
        /// </summary>
        [Required]
        [MaxLength(80)]
        public string Category { get; set; } = "Governance";

        /// <summary>
        /// Gets or sets a concise summary or excerpt for preview listings, search cards, and meta descriptions.
        /// </summary>
        [Required]
        [MaxLength(500)]
        public string Summary { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the rich formatted HTML body content of the legal document.
        /// </summary>
        [Required]
        public string ContentHtml { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the formal document version number (e.g., "2026.1", "2.4").
        /// </summary>
        [Required]
        [MaxLength(20)]
        public string Version { get; set; } = "1.0";

        /// <summary>
        /// Gets or sets the official legal effective date for this document.
        /// </summary>
        public DateTime EffectiveDate { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Gets or sets the timestamp when this document was last revised or updated in UTC.
        /// </summary>
        public DateTime LastUpdatedUtc { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Gets or sets the 2-letter ISO culture code (e.g., "en", "fr", "es", "de").
        /// </summary>
        [Required]
        [MaxLength(10)]
        public string Culture { get; set; } = "en";

        /// <summary>
        /// Gets or sets a value indicating whether this document is published and publicly viewable.
        /// </summary>
        public bool IsPublished { get; set; } = true;

        /// <summary>
        /// Gets or sets the sorting order index for listing inside hubs or policy listings.
        /// </summary>
        public int SortOrder { get; set; } = 0;

        /// <summary>
        /// Gets or sets the record creation timestamp in UTC.
        /// </summary>
        public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;
    }
}
