using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol.MasterDomain.Models
{
    /// <summary>
    /// Represents an official application for a free promotional platform voucher (up to 1 year access).
    /// Stores applicant identity, organization metadata, verified social engagement handles, and administrative review status.
    /// </summary>
    [Table("MasterVoucherApplications")]
    public class MasterVoucherApplication
    {
        /// <summary>
        /// Unique primary key identifier for the application record.
        /// </summary>
        [Key]
        public long Id { get; set; }

        /// <summary>
        /// Unique human-readable reference tracking number (e.g. "VCH-2026-8291").
        /// </summary>
        [Required]
        [MaxLength(50)]
        public string ReferenceNumber { get; set; } = string.Empty;

        /// <summary>
        /// Full name of the applicant or designated organization administrator.
        /// </summary>
        [Required]
        [MaxLength(150)]
        public string FullName { get; set; } = string.Empty;

        /// <summary>
        /// Official work email address of the applicant.
        /// </summary>
        [Required]
        [MaxLength(200)]
        public string WorkEmail { get; set; } = string.Empty;

        /// <summary>
        /// Contact phone number of the applicant or organization.
        /// </summary>
        [MaxLength(50)]
        public string? PhoneNumber { get; set; }

        /// <summary>
        /// Legal or operating display name of the applicant organization.
        /// </summary>
        [Required]
        [MaxLength(200)]
        public string OrganizationName { get; set; } = string.Empty;

        /// <summary>
        /// Target workspace subdomain slug (e.g. "acme" for acme.ozikol.cloud).
        /// </summary>
        [MaxLength(100)]
        public string? WorkspaceSlug { get; set; }

        /// <summary>
        /// Two-letter ISO country code or regional identifier (e.g. "NG", "US", "GB").
        /// </summary>
        [MaxLength(10)]
        public string? CountryCode { get; set; }

        /// <summary>
        /// Applicant's X / Twitter handle used to verify following @OzikolCloud.
        /// </summary>
        [MaxLength(100)]
        public string? TwitterHandle { get; set; }

        /// <summary>
        /// Applicant's LinkedIn profile URL used to verify company page follow.
        /// </summary>
        [MaxLength(300)]
        public string? LinkedInProfile { get; set; }

        /// <summary>
        /// Applicant's YouTube channel or username used to verify channel subscription.
        /// </summary>
        [MaxLength(150)]
        public string? YouTubeHandle { get; set; }

        /// <summary>
        /// Applicant's Facebook profile or page handle used to verify page follow.
        /// </summary>
        [MaxLength(200)]
        public string? FacebookProfile { get; set; }

        /// <summary>
        /// Applicant's Instagram handle used to verify profile follow.
        /// </summary>
        [MaxLength(100)]
        public string? InstagramHandle { get; set; }

        /// <summary>
        /// Applicant's Snapchat username used to verify add.
        /// </summary>
        [MaxLength(100)]
        public string? SnapchatHandle { get; set; }

        /// <summary>
        /// Indicates whether the applicant opted-in to product briefings and platform announcements.
        /// </summary>
        public bool IsNewsletterSubscribed { get; set; } = true;

        /// <summary>
        /// JSON array of feature codes/names the applicant expressed special interest in.
        /// </summary>
        public string? RequestedFeaturesJson { get; set; }

        /// <summary>
        /// Optional notes or justification submitted by the applicant.
        /// </summary>
        [MaxLength(1000)]
        public string? Remarks { get; set; }

        /// <summary>
        /// Current application review status: "Pending", "Approved", or "Rejected".
        /// </summary>
        [Required]
        [MaxLength(30)]
        public string Status { get; set; } = "Pending";

        /// <summary>
        /// The issued promotional coupon code if approved (e.g. "VOUCHER-1YR-7F92A").
        /// </summary>
        [MaxLength(50)]
        public string? IssuedCouponCode { get; set; }

        /// <summary>
        /// Foreign key reference to the issued MasterCoupon entity if approved.
        /// </summary>
        public Guid? IssuedCouponId { get; set; }

        /// <summary>
        /// Duration in days granted upon approval (e.g. 30, 60, 90, 180, 365).
        /// </summary>
        public int GrantedDurationDays { get; set; } = 365;

        /// <summary>
        /// Human-readable summary of features granted (e.g. "Full Suite", or "Mass SMS & Email, Voting").
        /// </summary>
        [MaxLength(500)]
        public string? GrantedFeaturesSummary { get; set; }

        /// <summary>
        /// Internal notes recorded by the Central Administrator during review.
        /// </summary>
        [MaxLength(1000)]
        public string? AdminNotes { get; set; }

        /// <summary>
        /// Identifier or email of the Central Administrator who reviewed the application.
        /// </summary>
        [MaxLength(150)]
        public string? ReviewedByAdminId { get; set; }

        /// <summary>
        /// UTC timestamp when the application was submitted.
        /// </summary>
        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// UTC timestamp when the application was reviewed and approved/rejected.
        /// </summary>
        public DateTime? ReviewedAtUtc { get; set; }
    }
}
