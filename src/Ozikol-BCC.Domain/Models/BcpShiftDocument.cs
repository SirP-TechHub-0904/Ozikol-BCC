using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Represents a compliance credential, professional license, proof of identity,
    /// training certificate, or verified baseline headshot photo uploaded for a workforce member.
    /// Table: [dbo].[BcpShiftDocuments]
    /// </summary>
    public class BcpShiftDocument : IBcpWorkforceEntity
    {
        /// <summary>
        /// Unique primary key identifier for the compliance document record.
        /// </summary>
        [Key]
        public Guid Id { get; set; } = Guid.CreateVersion7();

        /// <summary>
        /// Tenant identifier isolating this document to the specific organization workspace.
        /// </summary>
        [Required]
        [StringLength(100)]
        public string TenantKey { get; set; } = string.Empty;

        /// <summary>
        /// User identifier of the staff member to whom this document belongs.
        /// </summary>
        [Required]
        [StringLength(100)]
        public string UserId { get; set; } = string.Empty;

        /// <summary>
        /// Document category (e.g., "SIA License", "Right to Work", "Passport", "Proof of Address", "First Aid", "Headshot", "Application Form").
        /// </summary>
        [Required]
        [StringLength(100)]
        public string DocumentType { get; set; } = "General";

        /// <summary>
        /// Original human-readable filename (e.g., "SIA_DoorSupervisor_Badge.pdf", "Passport_Scan.jpg").
        /// </summary>
        [Required]
        [StringLength(200)]
        public string DocumentName { get; set; } = string.Empty;

        /// <summary>
        /// Optional operational notes or qualification description (e.g., "NVQ Level 2 Door Supervision").
        /// </summary>
        [StringLength(500)]
        public string? Description { get; set; }

        /// <summary>
        /// Optional credential registration or reference number (e.g., license number, passport number, certificate ID).
        /// </summary>
        [StringLength(100)]
        public string? ReferenceNumber { get; set; }

        /// <summary>
        /// Cloud storage location URL (Cloudflare R2 or S3) where the encrypted document file resides.
        /// </summary>
        [Required]
        [StringLength(1000)]
        public string FileUrl { get; set; } = string.Empty;

        /// <summary>
        /// Identity or role of the entity that uploaded the document: "Staff", "Company", or supervisor username.
        /// </summary>
        [Required]
        [StringLength(100)]
        public string UploadedBy { get; set; } = "Staff";

        /// <summary>
        /// Optional official document expiration date in UTC (e.g. visa expiration, SIA badge expiry).
        /// </summary>
        public DateTime? ExpiryDateUtc { get; set; }

        /// <summary>
        /// Backward-compatible alias for ExpiryDateUtc.
        /// </summary>
        [NotMapped]
        public DateTime? ExpirationDateUtc
        {
            get => ExpiryDateUtc;
            set => ExpiryDateUtc = value;
        }

        /// <summary>
        /// Indicates whether an organization manager or compliance officer has formally verified the document.
        /// </summary>
        public bool IsVerified { get; set; }

        /// <summary>
        /// User identifier of the administrator who verified the document.
        /// </summary>
        [StringLength(100)]
        public string? VerifiedByUserId { get; set; }

        /// <summary>
        /// Timestamp in UTC when the document was verified.
        /// </summary>
        public DateTime? VerifiedAtUtc { get; set; }

        /// <summary>
        /// Timestamp when the document was uploaded in UTC.
        /// </summary>
        public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Timestamp when the document record was last modified in UTC.
        /// </summary>
        public DateTime? UpdatedUtc { get; set; }
    }
}

