using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Represents a tenant-governed staff classification or employment type (e.g., "Permanent", "Temporary", "Contractor", "Casual / Zero-Hours").
    /// Seeded automatically and compulsory upon tenant creation to standardize rota scheduling, contracted hours, and compliance rules.
    /// Table: [dbo].[BcpStaffTypes]
    /// </summary>
    public class BcpStaffType : IBcpWorkforceEntity
    {
        /// <summary>
        /// Unique primary key identifier for the staff classification.
        /// </summary>
        [Key]
        public Guid Id { get; set; } = Guid.CreateVersion7();

        /// <summary>
        /// Tenant identifier isolating this staff type to the specific organization workspace.
        /// </summary>
        [Required]
        [StringLength(100)]
        public string TenantKey { get; set; } = string.Empty;

        /// <summary>
        /// Display title of the staff employment classification (e.g., "Permanent", "Temporary", "Contractor / Agency").
        /// </summary>
        [Required]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;

        /// <summary>
        /// Normalized machine code for programmatic filtering (e.g., "permanent", "temporary", "contractor", "other").
        /// </summary>
        [Required]
        [StringLength(50)]
        public string Code { get; set; } = string.Empty;

        /// <summary>
        /// Human-readable explanation of the employment conditions and scheduling expectations for this staff category.
        /// </summary>
        [StringLength(500)]
        public string Description { get; set; } = string.Empty;

        /// <summary>
        /// Baseline contracted duty hours per week for this staff category (e.g. 40.0 for permanent, 0.0 for zero-hours).
        /// </summary>
        [Column(TypeName = "decimal(6,2)")]
        public decimal DefaultContractedHours { get; set; } = 40.0m;

        /// <summary>
        /// Whether this staff type is a platform-compulsory default provisioned during tenant creation.
        /// Compulsory staff types cannot be deleted by administrators, preserving system-wide scheduling integrity.
        /// </summary>
        public bool IsCompulsory { get; set; } = false;

        /// <summary>
        /// Indicates whether this staff classification is actively selectable during staff enrollment and shift planning.
        /// </summary>
        public bool IsActive { get; set; } = true;

        /// <summary>
        /// Visual display sequence order in dropdown selectors and configuration lists.
        /// </summary>
        public int SortOrder { get; set; } = 0;

        /// <summary>
        /// Timestamp when the staff type was created in UTC.
        /// </summary>
        public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Timestamp when the staff type was last modified in UTC.
        /// </summary>
        public DateTime? UpdatedUtc { get; set; }
    }
}
