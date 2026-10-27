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
                .Where(f => f.IsActive)
                .ToListAsync(cancellationToken);

            var entitlements = new TenantFeatureEntitlementsDto
            {
                TenantKey = cleanKey
            };

            var now = DateTime.UtcNow;
            var subscriptionsByFeatureCode = tenant?.FeatureSubscriptions?
                .Where(s => s.MasterFeatureCatalog != null)
                .ToDictionary(s => s.MasterFeatureCatalog.FeatureCode, s => s, StringComparer.OrdinalIgnoreCase)
                ?? new Dictionary<string, MasterTenantFeatureSubscription>(StringComparer.OrdinalIgnoreCase);

            foreach (var feature in allActiveFeatures)
            {
                bool isSubscribed = subscriptionsByFeatureCode.TryGetValue(feature.FeatureCode, out var sub);
                bool isActive = false;
                DateTime? expiresAt = null;
                int? daysRemaining = null;
                string status = "Inactive";

                if (feature.IsCompulsory)
                {
                    // Compulsory core platform features are always active and never expire
                    isActive = true;
                    status = "Active";
                }
                else if (isSubscribed && sub != null)
                {
                    expiresAt = sub.ExpiresAtUtc;
                    daysRemaining = (int)Math.Ceiling((sub.ExpiresAtUtc - now).TotalDays);
                    status = sub.Status;

                    if (sub.IsActive && string.Equals(sub.Status, "Active", StringComparison.OrdinalIgnoreCase) && sub.ExpiresAtUtc > now)
                    {
                        isActive = true;
                    }
                    else if (sub.ExpiresAtUtc <= now)
                    {
                        status = "Expired";
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

                // Build expiration notice if applicable (non-compulsory, licensed subscription approaching expiry or expired)
                if (isSubscribed && sub != null && sub.IsActive && !feature.IsCompulsory)
                {
                    var rem = (int)Math.Ceiling((sub.ExpiresAtUtc - now).TotalDays);
                    if (rem <= 14)
                    {
                        bool isExpired = rem <= 0;
                        string severity = isExpired ? "Critical" : (rem <= 3 ? "Urgent" : "Warning");
                        string message = isExpired
                            ? $"Subscription for '{feature.Name}' has expired. Renew subscription to restore access."
                            : (rem == 1
                                ? $"Subscription for '{feature.Name}' expires tomorrow. Renew to prevent disruption."
                                : $"Subscription for '{feature.Name}' expires in {rem} days.");

                        entitlements.ExpirationNotices.Add(new FeatureExpirationNoticeDto
                        {
                            FeatureCode = feature.FeatureCode,
                            FeatureName = feature.Name,
                            Category = feature.Category,
                            ExpiresAtUtc = sub.ExpiresAtUtc,
                            DaysRemaining = rem,
                            IsExpired = isExpired,
                            Severity = severity,
                            NoticeMessage = message
                        });
                    }
                }
            }

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
        public async Task<List<FeatureExpirationNoticeDto>> GetExpiringFeaturesAsync(string tenantKey, int daysThreshold = 14, CancellationToken cancellationToken = default)
        {
            var entitlements = await GetTenantFeatureEntitlementsAsync(tenantKey, cancellationToken);
            return entitlements.ExpirationNotices;
        }
    }
}
