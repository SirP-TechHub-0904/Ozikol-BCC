using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol.MasterDomain.Models
{
    /// <summary>
    /// Represents a canonical platform capability suite stored in the Central Master Catalog database.
    /// Separates Suite metadata (Full Title, short Sidebar Menu Title, Suite Letter, Description, and ordering)
    /// from individual <see cref="MasterFeatureCatalog"/> items.
    /// </summary>
    [Table("MasterFeatureSuites")]
    public class MasterFeatureSuite
    {
        /// <summary>
        /// Unique primary key identifier for the suite.
        /// </summary>
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        /// <summary>
        /// Stable unique code for the suite (e.g. "suite-people-community", "suite-workforce-rota").
        /// </summary>
        [Required]
        [MaxLength(60)]
        public string SuiteCode { get; set; } = string.Empty;

        /// <summary>
        /// Canonical suite letter badge (e.g. "A", "B", "C" ... "J").
        /// </summary>
        [Required]
        [MaxLength(10)]
        public string SuiteLetter { get; set; } = "A";

        /// <summary>
        /// Full descriptive title of the suite displayed in tables, cards, and feature details pages
        /// (e.g. "People, Community & Collaboration").
        /// </summary>
        [Required]
        [MaxLength(120)]
        public string Name { get; set; } = string.Empty;

        /// <summary>
        /// Concise title displayed as the section header in the tenant sidebar navigation menu
        /// so it never wraps or truncates (e.g. "People & Community").
        /// </summary>
        [Required]
        [MaxLength(60)]
        public string MenuTitle { get; set; } = string.Empty;

        /// <summary>
        /// Executive summary explaining what capabilities belong to this suite.
        /// </summary>
        [MaxLength(500)]
        public string? Description { get; set; }

        /// <summary>
        /// Material Symbol icon name representing the suite.
        /// </summary>
        [MaxLength(60)]
        public string? Icon { get; set; }

        /// <summary>
        /// 1-based canonical display order of the suite across Central and tenant workspaces.
        /// </summary>
        public int SortOrder { get; set; } = 1;

        /// <summary>
        /// Indicates whether the suite is published and visible to tenant workspaces.
        /// </summary>
        public bool IsPublished { get; set; } = true;

        /// <summary>
        /// Indicates whether the suite is active in the master catalog.
        /// </summary>
        public bool IsActive { get; set; } = true;

        /// <summary>
        /// UTC timestamp when the suite record was created.
        /// </summary>
        public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Modular capabilities belonging to this suite.
        /// </summary>
        public ICollection<MasterFeatureCatalog> Features { get; set; } = new List<MasterFeatureCatalog>();
    }
}

