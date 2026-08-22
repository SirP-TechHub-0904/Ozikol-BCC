using System;
using System.ComponentModel.DataAnnotations;

namespace Ozikol_BCC.Domain.Models.Settings
{
    /// <summary>
    /// Streamlined master platform settings managed EXCLUSIVELY by the Central System / Platform SuperAdmin.
    /// Manages tenant plan tiers, hard caps, and global system configurations.
    /// Authority: Platform SuperAdmin Only.
    /// </summary>
    public class BcpPlatformSuperAdminSetting
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        /// <summary>
        /// The tenant's assigned plan tier (e.g. Starter, Professional, Enterprise).
        /// </summary>
        [StringLength(50)]
        public string PlanType { get; set; } = "Starter";

        /// <summary>
        /// Hard subscription limit on the maximum number of user accounts allowed.
        /// </summary>
        public int MaximumUsers { get; set; } = 100;

        /// <summary>
        /// Master platform kill-switch for outgoing SMS services.
        /// </summary>
        public bool ActivateSMS { get; set; } = true;

        /// <summary>
        /// Prepaid SMS wallet credit balance for this tenant.
        /// </summary>
        public decimal SmsCreditBalance { get; set; }

        /// <summary>
        /// Monthly email send quota limit.
        /// </summary>
        public int GlobalNewsletterQuota { get; set; } = 10000;

        /// <summary>
        /// Expiration / reset date for monthly email quota.
        /// </summary>
        public DateTime? GlobalNewsletterQuotaExpiry { get; set; }

        /// <summary>
        /// If true, restricts tenant to website mode only (disables BCP workspace modules).
        /// </summary>
        public bool JustWebsite { get; set; }

        /// <summary>
        /// Live production JSON feature flags & platform configuration flags.
        /// </summary>
        public string? LiveConfiguration { get; set; }
    }
}
