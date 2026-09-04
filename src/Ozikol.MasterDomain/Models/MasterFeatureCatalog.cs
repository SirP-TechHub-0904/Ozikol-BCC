using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol.MasterDomain.Models
{
    public enum FeatureBillingType
    {
        FlatSubscription = 1,   // Flat recurring ($20/mo, $54/qtr, $192/yr)
        PayAsYouGo = 2,         // Pure usage ($0 base + unit charges)
        Hybrid = 3,             // Base flat subscription + metered overage
        CustomEnterprise = 4    // Contact sales / negotiated contract
    }

    /// <summary>
    /// Master platform feature definition stored centrally in MasterCatalogDbContext.
    /// Governs all modular BCP features, multi-duration pricing tiers, metered billing, and compulsory flags.
    /// </summary>
    [Table("MasterFeatureCatalogs")]
    public class MasterFeatureCatalog
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        /// <summary>
        /// Unique stable code (e.g. "bcp-core-identity", "bcp-voting-elections", "bcp-hr-recruitment").
        /// </summary>
        [Required]
        [MaxLength(60)]
        public string FeatureCode { get; set; } = string.Empty;

        [Required]
        [MaxLength(120)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(60)]
        public string Category { get; set; } = "Operations";

        [MaxLength(500)]
        public string? Description { get; set; }

        [MaxLength(60)]
        public string? Icon { get; set; }

        [MaxLength(100)]
        public string? RoutePrefix { get; set; }

        /// <summary>
        /// Compulsory core features are included in base tier and automatically activated for all tenants.
        /// </summary>
        public bool IsCompulsory { get; set; } = false;

        /// <summary>
        /// Billing model classification (FlatSubscription, PayAsYouGo, Hybrid, CustomEnterprise).
        /// </summary>
        public FeatureBillingType BillingType { get; set; } = FeatureBillingType.FlatSubscription;

        /// <summary>
        /// Standard Monthly recurring price in USD.
        /// </summary>
        [Column(TypeName = "decimal(18,2)")]
        public decimal MonthlyPrice { get; set; } = 0.00m;

        /// <summary>
        /// Standard Quarterly recurring price (10% discount) in USD.
        /// </summary>
        [Column(TypeName = "decimal(18,2)")]
        public decimal QuarterlyPrice { get; set; } = 0.00m;

        /// <summary>
        /// Standard Yearly recurring price (20% discount) in USD.
        /// </summary>
        [Column(TypeName = "decimal(18,2)")]
        public decimal YearlyPrice { get; set; } = 0.00m;

        /// <summary>
        /// Flag indicating whether this feature incurs additional metered/usage charges.
        /// </summary>
        public bool IsMetered { get; set; } = false;

        [MaxLength(50)]
        public string? MeterUnitName { get; set; }

        [Column(TypeName = "decimal(18,4)")]
        public decimal MeterUnitPrice { get; set; } = 0.0000m;

        /// <summary>
        /// Batch size for metering (e.g. 1 for single request/SMS, 50 for active records, 1000 for AI tokens).
        /// </summary>
        public int MeterBlockSize { get; set; } = 1;

        /// <summary>
        /// Free units included every month before charging starts (e.g. 100 free SMS or 25 free members).
        /// </summary>
        public int IncludedFreeUnits { get; set; } = 0;

        public bool IsActive { get; set; } = true;
        public bool IsInBeta { get; set; } = false;
        public int SortOrder { get; set; } = 0;
        public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;

        public ICollection<MasterTenantFeatureSubscription> Subscriptions { get; set; } = new List<MasterTenantFeatureSubscription>();
    }
}
