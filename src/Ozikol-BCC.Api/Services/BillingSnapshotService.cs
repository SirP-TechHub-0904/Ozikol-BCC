using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;
using Ozikol_BCC.Api.Models;
using Ozikol_BCC.Application.Hubs;
using Ozikol_BCC.Infrastructure.TenantSupport;

namespace Ozikol_BCC.Api.Services
{
    /// <summary>
    /// Builds the tenant-facing feature billing snapshot and pushes it to connected clients in real time.
    /// </summary>
    public interface IBillingSnapshotService
    {
        /// <summary>
        /// Builds the current feature billing snapshot for a tenant straight from the master catalog.
        /// </summary>
        /// <param name="tenantKey">Tenant key.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>The snapshot, or null when the tenant is not registered.</returns>
        Task<BillingFeaturesSnapshotDto?> BuildAsync(string tenantKey, CancellationToken cancellationToken = default);

        /// <summary>
        /// Invalidates the tenant's cached entitlements and broadcasts a fresh snapshot
        /// (<c>BillingUpdated</c>) to every socket in the tenant's room.
        /// </summary>
        /// <param name="tenantKey">Tenant key.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        Task PublishAsync(string tenantKey, CancellationToken cancellationToken = default);
    }

    /// <summary>
    /// Default <see cref="IBillingSnapshotService"/> implementation backed by <see cref="MasterCatalogDbContext"/>.
    /// </summary>
    public class BillingSnapshotService : IBillingSnapshotService
    {
        /// <summary>Socket event carrying the full <see cref="BillingFeaturesSnapshotDto"/>.</summary>
        public const string BillingUpdatedEvent = "BillingUpdated";

        /// <summary>
        /// Canonical ordering of the 10 platform suites matching the Master Feature Catalog (/centralwks/features).
        /// </summary>
        public static readonly string[] CanonicalSuites = new[]
        {
            "People, Community & Collaboration",
            "Workforce, Rota & Scheduling",
            "Reports, Forms & Analytics",
            "Events & Training Management",
            "Finance & Commercial Revenue",
            "Operations & Workflows",
            "Communication, AI & Support",
            "Compliance, Learning & Certification",
            "Demographics & Civic Census",
            "Life Events & Publications"
        };

        /// <summary>
        /// Feature codes that are built and live for immediate use in tenant workspaces by default.
        /// </summary>
        private static readonly HashSet<string> DefaultAvailableCodes = new(StringComparer.OrdinalIgnoreCase)
        {
            "bcp-community-messenger",
            "bcp-committees",
            "bcp-alumni-directory",
            "bcp-form-builder",
            "bcp-store-ecommerce",
            "bcp-ai-smart-assist",
            "bcp-mass-communication"
        };

        /// <summary>
        /// Resolves the canonical sequence index for a given suite name.
        /// </summary>
        /// <param name="category">Suite / category name.</param>
        /// <returns>Zero-based suite order index.</returns>
        public static int GetSuiteOrder(string? category)
        {
            if (string.IsNullOrWhiteSpace(category)) return 999;
            var idx = Array.FindIndex(CanonicalSuites, s => s.Equals(category.Trim(), StringComparison.OrdinalIgnoreCase));
            return idx >= 0 ? idx : 500;
        }

        private readonly MasterCatalogDbContext _master;
        private readonly IMemoryCache _cache;
        private readonly IHubContext<NotificationHub> _hub;

        /// <summary>
        /// Initializes a new instance of <see cref="BillingSnapshotService"/>.
        /// </summary>
        /// <param name="master">Master catalog database context.</param>
        /// <param name="cache">Memory cache holding tenant entitlements.</param>
        /// <param name="hub">Notification hub context used for socket broadcasts.</param>
        public BillingSnapshotService(
            MasterCatalogDbContext master,
            IMemoryCache cache,
            IHubContext<NotificationHub> hub)
        {
            _master = master;
            _cache = cache;
            _hub = hub;
        }

        /// <summary>
        /// Computes the renewal severity bucket for a remaining-days value.
        /// </summary>
        /// <param name="daysRemaining">Whole days remaining (ceiling); zero or less means expired.</param>
        /// <returns>None, Warning, Urgent, or Critical.</returns>
        public static string SeverityFor(int daysRemaining) =>
            daysRemaining <= 0 ? "Critical" : daysRemaining <= 3 ? "Urgent" : daysRemaining <= 14 ? "Warning" : "None";

        /// <summary>
        /// Builds tenant-neutral renewal wording for a feature.
        /// </summary>
        /// <param name="featureName">Feature display name.</param>
        /// <param name="daysRemaining">Whole days remaining.</param>
        /// <returns>Message text suitable for notices and alerts.</returns>
        public static string MessageFor(string featureName, int daysRemaining) =>
            daysRemaining <= 0
                ? $"Your {featureName} subscription has expired. Renew to restore access."
                : daysRemaining == 1
                    ? $"Your {featureName} subscription expires tomorrow. Renew to avoid interruption."
                    : $"Your {featureName} subscription expires in {daysRemaining} days.";

        /// <inheritdoc />
        public async Task<BillingFeaturesSnapshotDto?> BuildAsync(string tenantKey, CancellationToken cancellationToken = default)
        {
            var key = (tenantKey ?? "workspace").Trim().ToLowerInvariant();

            // Read straight from the database (no entitlement cache) so the snapshot is always current
            MasterTenantCatalog? tenant = null;
            try
            {
                tenant = await _master.MasterTenantCatalogs
                    .AsNoTracking()
                    .Include(t => t.FeatureSubscriptions)
                    .FirstOrDefaultAsync(t =>
                        t.TenantKey.ToLower() == key ||
                        (t.PrimaryDomain != null && t.PrimaryDomain.ToLower().StartsWith(key + ".")) ||
                        (t.CustomDomain != null && t.CustomDomain.ToLower() == key),
                        cancellationToken);
            }
            catch
            {
                // Graceful fallback if UseCustomPricing / UseCustomAvailability / IsAvailableForUseOverride columns are pending migration
                tenant = await _master.MasterTenantCatalogs
                    .AsNoTracking()
                    .Where(t =>
                        t.TenantKey.ToLower() == key ||
                        (t.PrimaryDomain != null && t.PrimaryDomain.ToLower().StartsWith(key + ".")) ||
                        (t.CustomDomain != null && t.CustomDomain.ToLower() == key))
                    .Select(t => new MasterTenantCatalog
                    {
                        Id = t.Id,
                        TenantKey = t.TenantKey,
                        OrganizationName = t.OrganizationName,
                        UseCustomPricing = false,
                        UseCustomAvailability = false,
                        FeatureSubscriptions = t.FeatureSubscriptions.Select(s => new MasterTenantFeatureSubscription
                        {
                            Id = s.Id,
                            MasterTenantCatalogId = s.MasterTenantCatalogId,
                            MasterFeatureCatalogId = s.MasterFeatureCatalogId,
                            IsActive = s.IsActive,
                            Status = s.Status,
                            AutoRenew = s.AutoRenew,
                            DurationType = s.DurationType,
                            RecurringPrice = s.RecurringPrice,
                            CustomPriceOverride = s.CustomPriceOverride,
                            IsAvailableForUseOverride = null,
                            ExpiresAtUtc = s.ExpiresAtUtc
                        }).ToList()
                    })
                    .FirstOrDefaultAsync(cancellationToken);
            }

            List<MasterFeatureCatalog> rawFeatures;
            bool usedFallbackQuery = false;
            try
            {
                rawFeatures = await _master.MasterFeatureCatalogs
                    .AsNoTracking()
                    .Where(f => f.IsActive)
                    .ToListAsync(cancellationToken);
            }
            catch
            {
                usedFallbackQuery = true;
                // Graceful fallback if the IsAvailableForUse / IsPublished migration has not yet been applied to SQL Server
                rawFeatures = await _master.MasterFeatureCatalogs
                    .AsNoTracking()
                    .Where(f => f.IsActive)
                    .Select(f => new MasterFeatureCatalog
                    {
                        Id = f.Id,
                        FeatureCode = f.FeatureCode,
                        Name = f.Name,
                        Category = f.Category,
                        Description = f.Description,
                        Icon = f.Icon,
                        RoutePrefix = f.RoutePrefix,
                        IsCompulsory = f.IsCompulsory,
                        BillingType = f.BillingType,
                        MonthlyPrice = f.MonthlyPrice,
                        QuarterlyPrice = f.QuarterlyPrice,
                        YearlyPrice = f.YearlyPrice,
                        IsMetered = f.IsMetered,
                        IsActive = f.IsActive,
                        IsPublished = true,
                        IsInBeta = f.IsInBeta,
                        SortOrder = f.SortOrder
                    })
                    .ToListAsync(cancellationToken);
            }

            // Order strictly by Canonical Suite Sequence -> SortOrder -> Name (matching Master /centralwks/features)
            var features = rawFeatures
                .OrderBy(f => GetSuiteOrder(f.Category))
                .ThenBy(f => f.SortOrder)
                .ThenBy(f => f.Name)
                .ToList();

            var now = DateTime.UtcNow;
            var subsByFeature = tenant != null
                ? tenant.FeatureSubscriptions
                    .GroupBy(s => s.MasterFeatureCatalogId)
                    .ToDictionary(g => g.Key, g => g.OrderByDescending(s => s.ExpiresAtUtc).First())
                : new Dictionary<Guid, MasterTenantFeatureSubscription>();

            var snapshot = new BillingFeaturesSnapshotDto
            {
                TenantKey = tenant?.TenantKey ?? key,
                ServerTimeUtc = now
            };

            foreach (var f in features)
            {
                subsByFeature.TryGetValue(f.Id, out var sub);

                bool masterAvailForUse = usedFallbackQuery
                    ? DefaultAvailableCodes.Contains(f.FeatureCode)
                    : f.IsAvailableForUse;

                // Apply per-tenant availability override when tenant policy is set to Custom Availability
                bool isAvailForUse = (tenant?.UseCustomAvailability == true && sub?.IsAvailableForUseOverride != null)
                    ? sub.IsAvailableForUseOverride.Value
                    : masterAvailForUse;

                // Apply per-tenant custom monthly price override when tenant policy is set to Custom Pricing
                decimal effectiveMonthly = (tenant?.UseCustomPricing == true && sub?.CustomPriceOverride != null)
                    ? sub.CustomPriceOverride.Value
                    : f.MonthlyPrice;

                var item = new BillingFeatureItemDto
                {
                    FeatureId = f.Id,
                    FeatureCode = f.FeatureCode,
                    Name = f.Name,
                    Category = f.Category,
                    Description = f.Description,
                    Icon = f.Icon,
                    RoutePrefix = f.RoutePrefix,
                    IsCompulsory = f.IsCompulsory,
                    IsAvailableForUse = isAvailForUse,
                    IsInBeta = f.IsInBeta,
                    SortOrder = f.SortOrder,
                    BillingType = f.BillingType.ToString(),
                    MonthlyPrice = effectiveMonthly,
                    QuarterlyPrice = (tenant?.UseCustomPricing == true && sub?.CustomPriceOverride != null)
                        ? Math.Round(effectiveMonthly * 3m * 0.9m, 2)
                        : (f.QuarterlyPrice > 0 ? f.QuarterlyPrice : Math.Round(f.MonthlyPrice * 3m * 0.9m, 2)),
                    YearlyPrice = (tenant?.UseCustomPricing == true && sub?.CustomPriceOverride != null)
                        ? Math.Round(effectiveMonthly * 10m, 2)
                        : (f.YearlyPrice > 0 ? f.YearlyPrice : f.MonthlyPrice * 10m)
                };

                if (f.IsCompulsory)
                {
                    bool compActive = sub == null || sub.IsActive;
                    item.IsSubscribed = compActive;
                    item.IsActive = compActive;
                    item.Status = compActive ? "Included" : "Suspended";
                    item.BillingCadence = "Included";
                    item.EffectivePrice = effectiveMonthly;
                    if (compActive && effectiveMonthly > 0)
                    {
                        snapshot.TotalRecurringMonthly += effectiveMonthly;
                    }
                    snapshot.Included.Add(item);
                    continue;
                }

                if (sub == null)
                {
                    item.Status = "Available";
                    item.BillingCadence = "Monthly";
                    snapshot.Available.Add(item);
                    continue;
                }

                var days = (int)Math.Ceiling((sub.ExpiresAtUtc - now).TotalDays);
                var live = sub.IsActive
                           && string.Equals(sub.Status, "Active", StringComparison.OrdinalIgnoreCase)
                           && sub.ExpiresAtUtc > now;
                // A lapsed subscription is reported as Expired regardless of the stored status string
                var status = !live && sub.IsActive && sub.ExpiresAtUtc <= now ? "Expired" : sub.Status;

                item.SubscriptionId = sub.Id;
                item.IsSubscribed = true;
                item.IsActive = live;
                item.AutoRenew = sub.AutoRenew;
                item.Status = status;
                item.BillingCadence = sub.DurationType.ToString();
                item.EffectivePrice = (tenant?.UseCustomPricing == true && sub.CustomPriceOverride != null)
                    ? sub.CustomPriceOverride.Value
                    : (sub.RecurringPrice > 0 ? sub.RecurringPrice : f.MonthlyPrice);
                item.ExpiresAtUtc = sub.ExpiresAtUtc;
                item.DaysRemaining = days;
                item.Severity = sub.IsActive && !string.Equals(sub.Status, "Pending", StringComparison.OrdinalIgnoreCase)
                    ? SeverityFor(days)
                    : "None";

                snapshot.Subscribed.Add(item);

                if (item.Severity != "None")
                {
                    snapshot.Notices.Add(new FeatureExpirationNoticeDto
                    {
                        FeatureCode = f.FeatureCode,
                        FeatureName = f.Name,
                        Category = f.Category,
                        ExpiresAtUtc = sub.ExpiresAtUtc,
                        DaysRemaining = days,
                        IsExpired = days <= 0,
                        Severity = item.Severity,
                        NoticeMessage = MessageFor(f.Name, days)
                    });
                }

                if (live && item.EffectivePrice > 0)
                {
                    // Normalise every cadence to a monthly equivalent
                    snapshot.TotalRecurringMonthly += sub.DurationType switch
                    {
                        SubscriptionBillingDuration.Quarterly => item.EffectivePrice / 3m,
                        SubscriptionBillingDuration.Yearly => item.EffectivePrice / 12m,
                        _ => item.EffectivePrice
                    };
                }
            }

            snapshot.TotalRecurringMonthly = Math.Round(snapshot.TotalRecurringMonthly, 2);
            snapshot.Notices = snapshot.Notices.OrderBy(n => n.DaysRemaining).ToList();
            return snapshot;
        }

        /// <inheritdoc />
        public async Task PublishAsync(string tenantKey, CancellationToken cancellationToken = default)
        {
            var key = (tenantKey ?? "workspace").Trim().ToLowerInvariant();

            // Drop cached entitlements so feature gates reflect the change on the very next request
            _cache.Remove($"{TenantFeatureGateService.CacheKeyPrefix}{key}");

            var snapshot = await BuildAsync(key, cancellationToken);
            if (snapshot == null) return;

            if (key == "workspace")
            {
                await _hub.Clients.All.SendAsync(BillingUpdatedEvent, snapshot, cancellationToken);
            }
            else
            {
                await _hub.Clients.Group($"tenant_{key}").SendAsync(BillingUpdatedEvent, snapshot, cancellationToken);
            }
        }
    }
}
