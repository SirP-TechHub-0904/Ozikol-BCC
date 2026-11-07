using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;
using Ozikol_BCC.Infrastructure.TenantSupport;

namespace Ozikol_BCC.Api.Services
{
    /// <summary>
    /// Evaluates and enforces modular feature availability dynamically from the Central Master Catalog Database.
    /// Incorporates real-time caching to reflect Central activations, suspensions, and expirations without latency.
    /// </summary>
    public class TenantFeatureGateService : ITenantFeatureGateService
    {
        /// <summary>
        /// Memory cache key prefix for tenant entitlements. Public so billing services can invalidate
        /// a tenant's cached entitlements immediately when subscriptions change.
        /// </summary>
        public const string CacheKeyPrefix = "tenant_feature_entitlements_";
        private readonly MasterCatalogDbContext _masterCatalogDbContext;
        private readonly IMemoryCache _memoryCache;
        private readonly ILogger<TenantFeatureGateService> _logger;

        /// <summary>
        /// Initializes a new instance of <see cref="TenantFeatureGateService"/>.
        /// </summary>
        /// <param name="masterCatalogDbContext">Master catalog database context.</param>
        /// <param name="memoryCache">In-memory caching provider.</param>
        /// <param name="logger">Structured logger instance.</param>
        public TenantFeatureGateService(
            MasterCatalogDbContext masterCatalogDbContext,
            IMemoryCache memoryCache,
            ILogger<TenantFeatureGateService> logger)
        {
            _masterCatalogDbContext = masterCatalogDbContext;
            _memoryCache = memoryCache;
            _logger = logger;
        }

        /// <inheritdoc />
        public async Task<TenantFeatureEntitlementsDto> GetTenantFeatureEntitlementsAsync(string tenantKey, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(tenantKey))
            {
                return new TenantFeatureEntitlementsDto();
            }

            var cleanKey = tenantKey.Trim().ToLowerInvariant();
            var cacheKey = $"{CacheKeyPrefix}{cleanKey}";
            if (_memoryCache.TryGetValue(cacheKey, out TenantFeatureEntitlementsDto? cached) && cached != null)
            {
                return cached;
            }

            var tenant = await _masterCatalogDbContext.MasterTenantCatalogs
                .AsNoTracking()
                .Include(t => t.FeatureSubscriptions)
                    .ThenInclude(s => s.MasterFeatureCatalog)
                .FirstOrDefaultAsync(t => t.TenantKey.ToLower() == cleanKey, cancellationToken);

            var allActiveFeatures = await _masterCatalogDbContext.MasterFeatureCatalogs
                .AsNoTracking()
                .Where(f => f.IsActive && f.IsPublished && (f.IsCompulsory || f.MonthlyPrice > 0m || f.YearlyPrice > 0m || f.QuarterlyPrice > 0m))
                .ToListAsync(cancellationToken);

            var entitlements = new TenantFeatureEntitlementsDto
            {
                TenantKey = cleanKey
            };

            var now = DateTime.UtcNow;
            var subscriptionsByFeatureCode = tenant?.FeatureSubscriptions?
                .Where(s => s.MasterFeatureCatalog != null)
                .GroupBy(s => s.MasterFeatureCatalog.FeatureCode, StringComparer.OrdinalIgnoreCase)
                .ToDictionary(g => g.Key, g => g.OrderByDescending(x => x.ExpiresAtUtc).First(), StringComparer.OrdinalIgnoreCase)
                ?? new Dictionary<string, MasterTenantFeatureSubscription>(StringComparer.OrdinalIgnoreCase);

            string currCode = !string.IsNullOrWhiteSpace(tenant?.DefaultCurrencyCode)
                ? tenant!.DefaultCurrencyCode.Trim().ToUpperInvariant()
                : "USD";
            string currSymbol = "$";
            decimal currRate = 1.0m;
            try
            {
                var rateObj = await _masterCatalogDbContext.MasterCurrencyRates
                    .AsNoTracking()
                    .FirstOrDefaultAsync(r => r.IsActive && r.CurrencyCode.ToUpper() == currCode, cancellationToken);
                if (rateObj != null)
                {
                    currSymbol = !string.IsNullOrWhiteSpace(rateObj.CurrencySymbol) ? rateObj.CurrencySymbol : "$";
                    currRate = rateObj.RateFromUsd > 0 ? rateObj.RateFromUsd : 1.0m;
                }
            }
            catch
            {
                // Fallback to USD if currency table is unavailable
            }

            foreach (var feature in allActiveFeatures)
            {
                bool isSubscribed = subscriptionsByFeatureCode.TryGetValue(feature.FeatureCode, out var sub);
                bool isActive = false;
                DateTime? expiresAt = null;
                int? daysRemaining = null;
                string status = "Not Active";

                // On setup, no feature is enabled by default. A feature is only active when explicitly activated by the tenant admin or Central operator.
                bool isFreeCapability = feature.MonthlyPrice <= 0m && feature.YearlyPrice <= 0m && (sub == null || sub.CustomPriceOverride == null || sub.CustomPriceOverride <= 0m);

                if (isSubscribed && sub != null)
                {
                    expiresAt = isFreeCapability ? null : sub.ExpiresAtUtc;
                    daysRemaining = isFreeCapability ? null : (int)Math.Ceiling((sub.ExpiresAtUtc - now).TotalDays);
                    status = string.IsNullOrWhiteSpace(sub.Status) ? (sub.IsActive ? "Active" : "Not Active") : sub.Status;

                    if (sub.IsActive &&
                        !string.Equals(sub.Status, "Suspended", StringComparison.OrdinalIgnoreCase) &&
                        !string.Equals(sub.Status, "Cancelled", StringComparison.OrdinalIgnoreCase) &&
                        !string.Equals(sub.Status, "Inactive", StringComparison.OrdinalIgnoreCase) &&
                        (feature.IsCompulsory || isFreeCapability || sub.ExpiresAtUtc > now))
                    {
                        isActive = true;
                        status = "Active";
                    }
                    else if (!feature.IsCompulsory && !isFreeCapability && sub.IsActive && sub.ExpiresAtUtc <= now)
                    {
                        status = "Expired";
                    }
                    else
                    {
                        status = "Not Active";
                    }
                }

                if (isActive)
                {
                    entitlements.ActiveFeatureCodes.Add(feature.FeatureCode);
                }

                entitlements.Features[feature.FeatureCode] = new TenantFeatureStatusDto
                {
                    FeatureCode = feature.FeatureCode,
                    Name = feature.Name,
                    Category = feature.Category,
                    IsActive = isActive,
                    IsCompulsory = feature.IsCompulsory,
                    ExpiresAtUtc = expiresAt,
                    DaysUntilExpiration = daysRemaining,
                    Status = status
                };

                // Build expiration notice if applicable (strictly for non-compulsory, paid capabilities or active free trials within 30 days of expiry)
                if (isSubscribed && sub != null && sub.IsActive &&
                    !isFreeCapability &&
                    !string.Equals(sub.Status, "Suspended", StringComparison.OrdinalIgnoreCase) &&
                    !string.Equals(sub.Status, "Cancelled", StringComparison.OrdinalIgnoreCase) &&
                    !string.Equals(sub.Status, "Inactive", StringComparison.OrdinalIgnoreCase) &&
                    !feature.IsCompulsory)
                {
                    var rem = (int)Math.Ceiling((sub.ExpiresAtUtc - now).TotalDays);
                    if (rem <= 30)
                    {
                        bool isExpired = rem <= 0;
                        string severity = isExpired ? "Critical" : (rem <= 3 ? "Urgent" : "Warning");
                        decimal baseUsd = (tenant?.UseCustomPricing == true && sub.CustomPriceOverride != null)
                            ? sub.CustomPriceOverride.Value
                            : (sub.RecurringPrice > 0 ? sub.RecurringPrice : feature.MonthlyPrice);
                        decimal renewalPrice = Math.Round(baseUsd * currRate, 2);

                        string message = isExpired
                            ? $"{(sub.IsTrialPeriod ? "Free trial" : "Subscription")} for '{feature.Name}' has expired. Renew ({currSymbol}{renewalPrice:N2}) to restore access."
                            : (rem == 1
                                ? $"{(sub.IsTrialPeriod ? "Free trial" : "Subscription")} for '{feature.Name}' expires in 24 hours. Renew ({currSymbol}{renewalPrice:N2}) to prevent disruption."
                                : $"{(sub.IsTrialPeriod ? "Free trial" : "Subscription")} for '{feature.Name}' expires in {rem} days ({currSymbol}{renewalPrice:N2}).");

                        entitlements.ExpirationNotices.Add(new FeatureExpirationNoticeDto
                        {
                            FeatureCode = feature.FeatureCode,
                            FeatureName = feature.Name,
                            Category = feature.Category,
                            ExpiresAtUtc = sub.ExpiresAtUtc,
                            DaysRemaining = rem,
                            IsExpired = isExpired,
                            Severity = severity,
                            NoticeMessage = message,
                            RenewalPrice = renewalPrice,
                            CurrencyCode = currCode,
                            CurrencySymbol = currSymbol,
                            BillingCadence = sub.DurationType.ToString(),
                            IsTrialPeriod = sub.IsTrialPeriod
                        });
                    }
                }
            }

            entitlements.ExpirationNotices = entitlements.ExpirationNotices
                .OrderBy(n => n.DaysRemaining)
                .ThenBy(n => n.FeatureName)
                .ToList();

            // Cache for 60 seconds so Central modifications propagate near-instantaneously
            _memoryCache.Set(cacheKey, entitlements, new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(60),
                Size = 1
            });
            return entitlements;
        }

        /// <inheritdoc />
        public async Task<bool> IsFeatureActiveAsync(string tenantKey, string featureCode, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(tenantKey) || string.IsNullOrWhiteSpace(featureCode))
                return false;

            var entitlements = await GetTenantFeatureEntitlementsAsync(tenantKey, cancellationToken);
            return entitlements.ActiveFeatureCodes.Contains(featureCode);
        }

        /// <inheritdoc />
        public async Task<List<FeatureExpirationNoticeDto>> GetExpiringFeaturesAsync(string tenantKey, int daysThreshold = 30, CancellationToken cancellationToken = default)
        {
            var entitlements = await GetTenantFeatureEntitlementsAsync(tenantKey, cancellationToken);
            return entitlements.ExpirationNotices
                .Where(n => n.DaysRemaining <= daysThreshold)
                .ToList();
        }
    }
}
