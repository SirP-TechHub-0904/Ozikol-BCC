using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol.MasterDomain.Models
{
    /// <summary>
    /// Master promotional voucher or coupon definition stored centrally in MasterCatalogDbContext.
    /// Governs percentage discounts, fixed-amount discounts, max redemption caps, feature restrictions, and validity windows.
    /// </summary>
    [Table("MasterCoupons")]
    public class MasterCoupon
    {
        /// <summary>
        /// Unique primary key identifier for the coupon entity.
        /// </summary>
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        /// <summary>
        /// Unique uppercase coupon promo code (e.g., "LAUNCH100", "ACADEMICS50", "SUMMER2026").
        /// </summary>
        [Required]
        [MaxLength(40)]
        public string Code { get; set; } = string.Empty;

        /// <summary>
        /// Marketing or operational description of this voucher campaign.
        /// </summary>
        [MaxLength(300)]
        public string? Description { get; set; }

        /// <summary>
        /// Flag indicating whether the discount is calculated as a percentage (true) or a fixed amount (false).
        /// </summary>
        public bool IsPercentage { get; set; } = true;

        /// <summary>
        /// Percentage discount (1.00% to 100.00%). A value of 100.00 makes the target feature or annual fee completely free.
        /// </summary>
        [Column(TypeName = "decimal(18,2)")]
        public decimal DiscountPercentage { get; set; } = 100.00m;

        /// <summary>
        /// Fixed amount discount in USD if not percentage-based.
        /// </summary>
        [Column(TypeName = "decimal(18,2)")]
        public decimal DiscountAmount { get; set; } = 0.00m;

        /// <summary>
        /// Optional restriction to a specific modular capability. If null, this is a Universal voucher.
        /// </summary>
        [ForeignKey("MasterFeatureCatalog")]
        public Guid? SpecificFeatureId { get; set; }

        /// <summary>
        /// Navigation property to the restricted feature if applicable.
        /// </summary>
        public MasterFeatureCatalog? SpecificFeature { get; set; }

        /// <summary>
        /// Optional JSON array of specific MasterFeatureCatalog GUIDs this coupon is restricted to.
        /// If null or empty, this voucher applies to all platform features or base subscription.
        /// </summary>
        public string? AllowedFeatureIdsJson { get; set; }

        /// <summary>
        /// Duration in days this promotional voucher covers (e.g., 30 for 1 month, 60 for 2 months, 365 for 1 full year).
        /// </summary>
        public int DurationDays { get; set; } = 365;

        /// <summary>
        /// Human-readable description of granted capabilities (e.g. "Full Suite (1 Year)", "SMS & Voting (60 Days)").
        /// </summary>
        [MaxLength(300)]
        public string? GrantedFeaturesSummary { get; set; }

        /// <summary>
        /// Maximum number of total allowable redemptions across all tenants (0 = unlimited).
        /// </summary>
        public int MaxRedemptions { get; set; } = 0;

        /// <summary>
        /// Total number of successful redemptions executed by tenant organizations.
        /// </summary>
        public int TimesRedeemed { get; set; } = 0;

        /// <summary>
        /// Start timestamp from when this voucher becomes valid in UTC.
        /// </summary>
        public DateTime StartsAtUtc { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Expiration timestamp after which this voucher cannot be redeemed in UTC.
        /// </summary>
        public DateTime? ExpiresAtUtc { get; set; }

        /// <summary>
        /// Flag indicating whether the voucher is currently active and accepting redemptions.
        /// </summary>
        public bool IsActive { get; set; } = true;

        /// <summary>
        /// Creation timestamp in UTC.
        /// </summary>
        public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Collection of historical redemption records for this voucher.
        /// </summary>
        public ICollection<MasterCouponRedemption> Redemptions { get; set; } = new List<MasterCouponRedemption>();
    }
}
