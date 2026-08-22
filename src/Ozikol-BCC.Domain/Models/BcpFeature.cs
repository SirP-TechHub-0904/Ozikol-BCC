using System;
using System.ComponentModel.DataAnnotations;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Describes one billable or controllable BCP feature/module in a tenant.
    /// Console dashboards use this entity to understand feature availability and billing state.
    /// </summary>
    public class BcpFeature
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        [Required]
        [Display(Name = "Feature Name")]
        public string FeatureName { get; set; } = string.Empty;

        [Display(Name = "Description")]
        public string? Description { get; set; }

        /// <summary>
        /// Stable module key used to connect billing, permissions, sidebar entries, and feature routes.
        /// </summary>
        [Required]
        [Display(Name = "Module / Route Key")]
        public string ModuleFolder { get; set; } = string.Empty;

        [Display(Name = "Cost Per Duration")]
        public decimal CostPerDuration { get; set; }

        [Display(Name = "Billing Duration")]
        public FeatureBillingDuration BillingDuration { get; set; }

        [Display(Name = "Grace Period (Days)")]
        public int GracePeriodDays { get; set; }

        /// <summary>
        /// Feature lifecycle state. Disabled or suspended features should not appear as usable modules.
        /// </summary>
        [Display(Name = "Subscription Status")]
        public FeatureBillingStatus Status { get; set; }

        [Display(Name = "Next Billing Date")]
        public DateTime? NextBillingDate { get; set; }
    }
}


