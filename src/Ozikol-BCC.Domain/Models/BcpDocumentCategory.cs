using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Represents a tenant-governed compliance document category or credential type.
    /// Eliminates hardcoded document assumptions (e.g. SIA licenses, CSCS cards, nursing PINs, driver licenses)
    /// and allows each organization to manage their own regulatory qualification requirements.
    /// Table: [dbo].[BcpDocumentCategories]
    /// </summary>
    public class BcpDocumentCategory : IBcpWorkforceEntity
    {
        /// <summary>
        /// Unique primary key identifier for the document category record.
        /// </summary>
        [Key]
        public Guid Id { get; set; } = Guid.CreateVersion7();

        /// <summary>
        /// Tenant identifier isolating this document category to the specific organization workspace.
        /// </summary>
        [Required]
        [StringLength(100)]
        public string TenantKey { get; set; } = string.Empty;

        /// <summary>
        /// Display title of the document category (e.g., "Professional License", "Right to Work / Passport", "Criminal Background / DBS", "Driving License").
        /// </summary>
        [Required]
        [StringLength(100)]
        public string Name { get; set; } = string.Empty;

        /// <summary>
        /// Short unique alphanumeric code identifying this category (e.g., "LIC", "RTW", "DBS", "DRV", "POA", "TRN").
        /// </summary>
        [Required]
        [StringLength(50)]
        public string Code { get; set; } = string.Empty;

        /// <summary>
        /// Optional description explaining why this document category is required and what proofs are accepted.
        /// </summary>
        [StringLength(500)]
        public string? Description { get; set; }

        /// <summary>
        /// Indicates whether this document is mandatory for personnel during self-enrollment or direct onboarding.
        /// </summary>
        public bool IsMandatory { get; set; }

        /// <summary>
        /// Indicates whether documents uploaded under this category require an expiration date and expiry countdown alerts.
        /// </summary>
        public bool RequiresExpiryDate { get; set; } = true;

        /// <summary>
        /// Indicates whether this document category is actively available for selection across roles, sites, and profiles.
        /// </summary>
        public bool IsActive { get; set; } = true;

        /// <summary>
        /// Visual display sort order in dropdown lists and settings matrices.
        /// </summary>
        public int SortOrder { get; set; }

        /// <summary>
        /// Timestamp in UTC when the category was created.
        /// </summary>
        public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Timestamp in UTC when the category was last updated.
        /// </summary>
        public DateTime? UpdatedUtc { get; set; }
    }
}

