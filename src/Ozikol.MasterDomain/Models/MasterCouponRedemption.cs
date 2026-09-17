using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol.MasterDomain.Models
{
    /// <summary>
    /// Audit and accounting record representing an individual voucher redemption by a specific tenant organization.
    /// Stores the original invoice amount, discount value applied, final price paid, and timestamps.
    /// </summary>
    [Table("MasterCouponRedemptions")]
    public class MasterCouponRedemption
    {
        /// <summary>
        /// Unique primary key identifier for the redemption record.
        /// </summary>
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        /// <summary>
        /// Foreign key linking to the redeemed coupon entity.
        /// </summary>
        [ForeignKey("MasterCoupon")]
        public Guid MasterCouponId { get; set; }

        /// <summary>
        /// Navigation property to the redeemed coupon.
        /// </summary>
        public MasterCoupon MasterCoupon { get; set; } = null!;

        /// <summary>
        /// Foreign key linking to the tenant organization that redeemed the coupon.
        /// </summary>
        [ForeignKey("MasterTenantCatalog")]
        public int MasterTenantCatalogId { get; set; }

        /// <summary>
        /// Navigation property to the tenant organization entity.
        /// </summary>
        public MasterTenantCatalog MasterTenantCatalog { get; set; } = null!;

        /// <summary>
        /// Optional foreign key to the specific feature subscription if redeemed for an add-on module.
        /// </summary>
        [ForeignKey("MasterFeatureCatalog")]
        public Guid? MasterFeatureCatalogId { get; set; }

        /// <summary>
        /// Navigation property to the redeemed feature if applicable.
        /// </summary>
        public MasterFeatureCatalog? MasterFeatureCatalog { get; set; }

        /// <summary>
        /// Original catalog price before discount was applied in USD.
        /// </summary>
        [Column(TypeName = "decimal(18,2)")]
        public decimal OriginalPrice { get; set; }

        /// <summary>
        /// Total financial discount value applied in USD.
        /// </summary>
        [Column(TypeName = "decimal(18,2)")]
        public decimal DiscountApplied { get; set; }

        /// <summary>
        /// Final net price paid by the tenant after discount (e.g., $0.00 for 100% discount vouchers).
        /// </summary>
        [Column(TypeName = "decimal(18,2)")]
        public decimal FinalPricePaid { get; set; }

        /// <summary>
        /// Timestamp when the redemption took place in UTC.
        /// </summary>
        public DateTime RedeemedAtUtc { get; set; } = DateTime.UtcNow;
    }
}
