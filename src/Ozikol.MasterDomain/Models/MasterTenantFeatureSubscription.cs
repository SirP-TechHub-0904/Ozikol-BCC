using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol.MasterDomain.Models
{
    public enum SubscriptionBillingDuration
    {
        Monthly = 1,
        Quarterly = 2,
        Yearly = 3
    }

    /// <summary>
    /// Tracks individual feature subscriptions for a specific tenant in the Master DB.
    /// Supports modular activations, duration choices (monthly/quarterly/yearly), and auto-renewals.
    /// </summary>
    [Table("MasterTenantFeatureSubscriptions")]
    public class MasterTenantFeatureSubscription
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [ForeignKey("MasterTenantCatalog")]
        public Guid MasterTenantCatalogId { get; set; }
        public MasterTenantCatalog MasterTenantCatalog { get; set; } = null!;

        [ForeignKey("MasterFeatureCatalog")]
        public Guid MasterFeatureCatalogId { get; set; }
        public MasterFeatureCatalog MasterFeatureCatalog { get; set; } = null!;

        public SubscriptionBillingDuration DurationType { get; set; } = SubscriptionBillingDuration.Monthly;

        [Column(TypeName = "decimal(18,2)")]
        public decimal RecurringPrice { get; set; }

        public DateTime StartsAtUtc { get; set; } = DateTime.UtcNow;
        public DateTime ExpiresAtUtc { get; set; } = DateTime.UtcNow.AddMonths(1);

        public bool AutoRenew { get; set; } = true;
        public bool IsActive { get; set; } = true;

        [MaxLength(30)]
        public string Status { get; set; } = "Active"; // Active, Suspended, Expired, Cancelled

        [Column(TypeName = "decimal(18,2)")]
        public decimal? CustomPriceOverride { get; set; }

        /// <summary>
        /// Optional tenant-specific override for whether this capability is Available for Use (true)
        /// or Coming Soon (false) for this tenant when UseCustomAvailability is enabled.
        /// Null inherits from MasterFeatureCatalog.IsAvailableForUse.
        /// </summary>
        public bool? IsAvailableForUseOverride { get; set; }

        /// <summary>
        /// Optional tenant-specific override for the number of first-time free trial days before payment
        /// when Custom Mode is active. Null inherits from <see cref="MasterFeatureCatalog.FreeTrialDays"/>.
        /// </summary>
        public int? CustomFreeTrialDaysOverride { get; set; }

        /// <summary>
        /// Indicates whether this tenant has already consumed their first-time free trial for this capability.
        /// Once true, subsequent activations require payment unless reset by a Central administrator.
        /// </summary>
        public bool HasUsedFreeTrial { get; set; } = false;

        /// <summary>
        /// Indicates whether the current active subscription period is running as a free trial test period before payment.
        /// </summary>
        public bool IsTrialPeriod { get; set; } = false;

        public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;
        public DateTime? LastRenewedUtc { get; set; }
    }
}
