using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace Ozikol_BCC.Infrastructure.TenantSupport
{
    /// <summary>
    /// Status information for an individual modular feature capability.
    /// </summary>
    public class TenantFeatureStatusDto
    {
        /// <summary>
        /// Stable canonical feature code (e.g. "bcp-store-ecommerce", "bcp-community-messenger").
        /// </summary>
        public string FeatureCode { get; set; } = string.Empty;

        /// <summary>
        /// Display name of the feature.
        /// </summary>
        public string Name { get; set; } = string.Empty;

        /// <summary>
        /// Feature category/suite classification.
        /// </summary>
        public string Category { get; set; } = string.Empty;

        /// <summary>
        /// Whether the feature is currently active and usable by the tenant.
        /// </summary>
        public bool IsActive { get; set; }

        /// <summary>
        /// Compulsory baseline features are included for all tenants without expiration.
        /// </summary>
        public bool IsCompulsory { get; set; }

        /// <summary>
        /// Expiration timestamp in UTC if subscription-based.
        /// </summary>
        public DateTime? ExpiresAtUtc { get; set; }

        /// <summary>
        /// Days remaining until expiration, or negative if already expired.
        /// </summary>
        public int? DaysUntilExpiration { get; set; }

        /// <summary>
        /// Subscription status string ("Active", "Suspended", "Expired", "Cancelled").
        /// </summary>
        public string Status { get; set; } = "Active";
    }

    /// <summary>
    /// Notice alerting administrators of an expiring or expired feature subscription or free trial.
    /// Strictly visible to tenant administrators only.
    /// </summary>
    public class FeatureExpirationNoticeDto
    {
        public string FeatureCode { get; set; } = string.Empty;
        public string FeatureName { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public DateTime ExpiresAtUtc { get; set; }
        public int DaysRemaining { get; set; }
        public bool IsExpired { get; set; }
        public string Severity { get; set; } = "Warning"; // "Warning" (<=30d), "Urgent" (<=3d), "Critical" (expired)
        public string NoticeMessage { get; set; } = string.Empty;

        /// <summary>
        /// Amount due to renew this capability in the tenant's active running currency.
        /// </summary>
        public decimal RenewalPrice { get; set; }

        /// <summary>
        /// ISO 4217 currency code for the tenant (e.g. "NGN", "USD").
        /// </summary>
        public string CurrencyCode { get; set; } = "USD";

        /// <summary>
        /// Currency symbol for the tenant (e.g. "₦", "$").
        /// </summary>
        public string CurrencySymbol { get; set; } = "$";

        /// <summary>
        /// Billing cadence for renewal ("Monthly", "Quarterly", "Yearly").
        /// </summary>
        public string BillingCadence { get; set; } = "Monthly";

        /// <summary>
        /// True when the expiring entitlement is a First-Time Free Trial.
        /// </summary>
        public bool IsTrialPeriod { get; set; }
    }

    /// <summary>
    /// Complete feature entitlements package for a tenant.
    /// </summary>
    public class TenantFeatureEntitlementsDto
    {
        public string TenantKey { get; set; } = string.Empty;
        public HashSet<string> ActiveFeatureCodes { get; set; } = new(StringComparer.OrdinalIgnoreCase);
        public Dictionary<string, TenantFeatureStatusDto> Features { get; set; } = new(StringComparer.OrdinalIgnoreCase);
        public List<FeatureExpirationNoticeDto> ExpirationNotices { get; set; } = new();
    }

    /// <summary>
    /// Evaluates and enforces modular feature availability dynamically from the Central Master Catalog Database.
    /// Reflects Central administrative activations, suspensions, and expirations in real time.
    /// </summary>
    public interface ITenantFeatureGateService
    {
        /// <summary>
        /// Retrieves complete feature entitlements and active capabilities for a tenant.
        /// </summary>
        /// <param name="tenantKey">The unique tenant key.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>Entitlements model containing active feature codes, status details, and notices.</returns>
        Task<TenantFeatureEntitlementsDto> GetTenantFeatureEntitlementsAsync(string tenantKey, CancellationToken cancellationToken = default);

        /// <summary>
        /// Fast check verifying whether a specific capability is active and licensed for a tenant.
        /// </summary>
        /// <param name="tenantKey">The unique tenant key.</param>
        /// <param name="featureCode">The stable feature code.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>True if active and within valid subscription duration; otherwise false.</returns>
        Task<bool> IsFeatureActiveAsync(string tenantKey, string featureCode, CancellationToken cancellationToken = default);

        /// <summary>
        /// Retrieves upcoming expiration notices for licensed features and free trials (within 30 days or overdue).
        /// Strictly visible to administrators.
        /// </summary>
        /// <param name="tenantKey">The unique tenant key.</param>
        /// <param name="daysThreshold">Days threshold for expiration warnings (defaults to 30 days).</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>List of expiration notices sorted by urgency.</returns>
        Task<List<FeatureExpirationNoticeDto>> GetExpiringFeaturesAsync(string tenantKey, int daysThreshold = 30, CancellationToken cancellationToken = default);
    }
}
