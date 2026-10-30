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
        /// Canonical ordering of the 11 platform suites matching the Master Feature Catalog (/centralwks/features).
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
            "Life Events & Publications",
            "Workspace"
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
        private readonly Microsoft.AspNetCore.Http.IHttpContextAccessor? _httpContextAccessor;

        /// <summary>
        /// Initializes a new instance of <see cref="BillingSnapshotService"/>.
        /// </summary>
        /// <param name="master">Master catalog database context.</param>
        /// <param name="cache">Memory cache holding tenant entitlements.</param>
        /// <param name="hub">Notification hub context used for socket broadcasts.</param>
        /// <param name="httpContextAccessor">Optional HTTP context accessor for background regional currency detection on startup.</param>
        public BillingSnapshotService(
            MasterCatalogDbContext master,
            IMemoryCache cache,
            IHubContext<NotificationHub> hub,
            Microsoft.AspNetCore.Http.IHttpContextAccessor? httpContextAccessor = null)
        {
            _master = master;
            _cache = cache;
            _hub = hub;
            _httpContextAccessor = httpContextAccessor;
        }

        /// <summary>
        /// Computes the renewal severity bucket for a remaining-days value (within the 30-day renewal horizon).
        /// </summary>
        /// <param name="daysRemaining">Whole days remaining (ceiling); zero or less means expired.</param>
        /// <returns>None, Warning (30 days or fewer), Urgent (3 days or fewer), or Critical (expired).</returns>
        public static string SeverityFor(int daysRemaining) =>
            daysRemaining <= 0 ? "Critical" : daysRemaining <= 3 ? "Urgent" : daysRemaining <= 30 ? "Warning" : "None";

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
            try
            {
                rawFeatures = await _master.MasterFeatureCatalogs
                    .AsNoTracking()
                    .Include(f => f.Suite)
                    .Where(f => f.IsActive)
                    .ToListAsync(cancellationToken);
            }
            catch
            {
                // Graceful fallback if the MasterFeatureSuites / MenuTitle migration has not yet been applied to SQL Server
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
                        FreeTrialDays = 14,
                        IsMetered = f.IsMetered,
                        IsActive = f.IsActive,
                        IsPublished = f.IsActive,
                        IsAvailableForUse = f.IsAvailableForUse,
                        IsInBeta = f.IsInBeta,
                        SortOrder = f.SortOrder
                    })
                    .ToListAsync(cancellationToken);
            }

            List<MasterFeatureSuite> allSuites;
            try
            {
                allSuites = await _master.MasterFeatureSuites
                    .AsNoTracking()
                    .OrderBy(s => s.SortOrder)
                    .ToListAsync(cancellationToken);
                if (allSuites.Count == 0)
                {
                    allSuites = MasterFeatureSuiteDefaults.GetDefaultSuites();
                }
            }
            catch
            {
                allSuites = MasterFeatureSuiteDefaults.GetDefaultSuites();
            }

            MasterFeatureSuite? ResolveMatchedSuite(MasterFeatureCatalog f)
            {
                if (f.Suite != null) return f.Suite;
                if (f.MasterFeatureSuiteId.HasValue)
                {
                    var byId = allSuites.FirstOrDefault(s => s.Id == f.MasterFeatureSuiteId.Value);
                    if (byId != null) return byId;
                }
                if (!string.IsNullOrWhiteSpace(f.Category))
                {
                    var byName = allSuites.FirstOrDefault(s => string.Equals(s.Name.Trim(), f.Category.Trim(), StringComparison.OrdinalIgnoreCase));
                    if (byName != null) return byName;
                }
                return null;
            }

            int ResolveSuiteSortOrder(MasterFeatureCatalog f)
            {
                var s = ResolveMatchedSuite(f);
                return s?.SortOrder ?? (GetSuiteOrder(f.Category) + 1);
            }

            // Order strictly by Suite SortOrder -> Feature SortOrder -> Name (matching Master /centralwks/features)
            var features = rawFeatures
                .OrderBy(f => ResolveSuiteSortOrder(f))
                .ThenBy(f => f.SortOrder)
                .ThenBy(f => f.Name)
                .ToList();

            var now = DateTime.UtcNow;
            var subsByFeature = tenant != null
                ? tenant.FeatureSubscriptions
                    .GroupBy(s => s.MasterFeatureCatalogId)
                    .ToDictionary(g => g.Key, g => g.OrderByDescending(s => s.ExpiresAtUtc).First())
                : new Dictionary<Guid, MasterTenantFeatureSubscription>();

            // Resolve tenant running currency & exchange rate from MasterCurrencyRates (with background regional detection on startup if empty)
            string currCode = tenant?.DefaultCurrencyCode?.Trim().ToUpperInvariant() ?? "";
            string currSymbol = "$";
            decimal currRate = 1.0m;
            try
            {
                var rates = await _master.MasterCurrencyRates.AsNoTracking().Where(r => r.IsActive).ToListAsync(cancellationToken);
                if (string.IsNullOrWhiteSpace(currCode))
                {
                    var httpCtx = _httpContextAccessor?.HttpContext;
                    string? countryIso = httpCtx?.Request.Headers["CF-IPCountry"].FirstOrDefault()
                                      ?? httpCtx?.Request.Headers["CloudFront-Viewer-Country"].FirstOrDefault()
                                      ?? httpCtx?.Request.Headers["X-Country-Code"].FirstOrDefault();

                    if (!string.IsNullOrWhiteSpace(countryIso))
                    {
                        var matchedRate = rates.FirstOrDefault(r =>
                            !string.IsNullOrWhiteSpace(r.AssociatedCountryCodes) &&
                            r.AssociatedCountryCodes.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                                .Any(c => c.Equals(countryIso.Trim(), StringComparison.OrdinalIgnoreCase)));
                        if (matchedRate != null)
                        {
                            currCode = matchedRate.CurrencyCode.ToUpperInvariant();
                        }
                    }

                    if (string.IsNullOrWhiteSpace(currCode))
                    {
                        var acceptLang = httpCtx?.Request.Headers["Accept-Language"].FirstOrDefault();
                        if (!string.IsNullOrWhiteSpace(acceptLang))
                        {
                            if (acceptLang.Contains("NG", StringComparison.OrdinalIgnoreCase)) currCode = "NGN";
                            else if (acceptLang.Contains("GB", StringComparison.OrdinalIgnoreCase)) currCode = "GBP";
                            else if (acceptLang.Contains("GH", StringComparison.OrdinalIgnoreCase)) currCode = "GHS";
                            else if (acceptLang.Contains("KE", StringComparison.OrdinalIgnoreCase)) currCode = "KES";
                            else if (acceptLang.Contains("ZA", StringComparison.OrdinalIgnoreCase)) currCode = "ZAR";
                        }
                    }

                    if (string.IsNullOrWhiteSpace(currCode))
                    {
                        currCode = "USD";
                    }

                    if (tenant != null)
                    {
                        var trackedTenant = await _master.MasterTenantCatalogs.FirstOrDefaultAsync(t => t.Id == tenant.Id, cancellationToken);
                        if (trackedTenant != null && string.IsNullOrWhiteSpace(trackedTenant.DefaultCurrencyCode))
                        {
                            trackedTenant.DefaultCurrencyCode = currCode;
                            await _master.SaveChangesAsync(cancellationToken);
                        }
                    }
                }

                var rateObj = rates.FirstOrDefault(r => r.CurrencyCode.Equals(currCode, StringComparison.OrdinalIgnoreCase));
                if (rateObj != null)
                {
                    currSymbol = rateObj.CurrencySymbol;
                    currRate = rateObj.RateFromUsd > 0 ? rateObj.RateFromUsd : 1.0m;
                }

                // Stamp LastAccessedUtc when a tenant workspace actively requests its billing/startup snapshot
                if (tenant != null && _httpContextAccessor?.HttpContext != null &&
                    (!tenant.LastAccessedUtc.HasValue || (now - tenant.LastAccessedUtc.Value).TotalMinutes >= 1))
                {
                    var tracked = await _master.MasterTenantCatalogs.FirstOrDefaultAsync(t => t.Id == tenant.Id, cancellationToken);
                    if (tracked != null)
                    {
                        tracked.LastAccessedUtc = now;
                        await _master.SaveChangesAsync(cancellationToken);
                    }
                }
            }
            catch
            {
                if (string.IsNullOrWhiteSpace(currCode)) currCode = "USD";
            }

            var snapshot = new BillingFeaturesSnapshotDto
            {
                TenantKey = tenant?.TenantKey ?? key,
                CurrencyCode = currCode,
                CurrencySymbol = currSymbol,
                ExchangeRateFromUsd = currRate,
                UseCustomPricing = tenant?.UseCustomPricing ?? false,
                UseCustomAvailability = tenant?.UseCustomAvailability ?? false,
                ServerTimeUtc = now
            };

            foreach (var f in features)
            {
                subsByFeature.TryGetValue(f.Id, out var sub);

                bool masterAvailForUse = f.IsAvailableForUse;

                // Apply per-tenant availability override when tenant policy is set to Custom Availability,
                // automatically syncing features that have a custom price or active subscription.
                // Both Available (isAvailForUse == true) and Coming Soon (isAvailForUse == false) published features
                // are returned so the tenant sidebar and catalog can display Locked (Available, Not Active) vs Coming Soon.
                bool isAvailForUse = (tenant?.UseCustomAvailability == true)
                    ? (sub?.IsAvailableForUseOverride ?? ((sub?.CustomPriceOverride != null || (sub != null && sub.IsActive && !f.IsCompulsory)) ? true : masterAvailForUse))
                    : masterAvailForUse;

                // Apply per-tenant custom monthly price override when tenant policy is set to Custom Pricing
                bool hasCustomPrice = tenant?.UseCustomPricing == true && sub?.CustomPriceOverride != null;
                decimal effectiveMonthlyUsd = hasCustomPrice
                    ? sub!.CustomPriceOverride!.Value
                    : f.MonthlyPrice;

                decimal effectiveMonthly = Math.Round(effectiveMonthlyUsd * currRate, 2);
                decimal quarterlyUsd = hasCustomPrice
                    ? Math.Round(effectiveMonthlyUsd * 3m * 0.9m, 2)
                    : (f.QuarterlyPrice > 0 ? f.QuarterlyPrice : Math.Round(f.MonthlyPrice * 3m * 0.9m, 2));
                decimal yearlyUsd = hasCustomPrice
                    ? Math.Round(effectiveMonthlyUsd * 10m, 2)
                    : (f.YearlyPrice > 0 ? f.YearlyPrice : f.MonthlyPrice * 10m);

                var matchedSuite = ResolveMatchedSuite(f);
                var suiteFullTitle = matchedSuite?.Name ?? f.Category;
                var suiteMenuTitle = MasterFeatureSuiteDefaults.ResolveSuiteMenuTitle(suiteFullTitle, matchedSuite?.MenuTitle);
                var featureMenuTitle = MasterFeatureSuiteDefaults.ResolveFeatureMenuTitle(f.FeatureCode, f.MenuTitle, f.Name);
                var suiteSortOrder = matchedSuite?.SortOrder ?? (GetSuiteOrder(suiteFullTitle) + 1);

                bool hasCustomTrial = sub?.CustomFreeTrialDaysOverride != null;
                int catalogTrialDays = f.FreeTrialDays > 0 ? f.FreeTrialDays : 0;
                int effectiveTrialDays = ((tenant?.UseCustomPricing == true || tenant?.UseCustomAvailability == true || hasCustomTrial) && hasCustomTrial)
                    ? Math.Max(0, sub!.CustomFreeTrialDaysOverride!.Value)
                    : catalogTrialDays;
                bool hasUsedTrial = sub?.HasUsedFreeTrial ?? false;
                bool isTrialPeriod = (sub?.IsTrialPeriod ?? false) && (sub?.ExpiresAtUtc > now);
                bool isEligibleForFreeTrial = effectiveTrialDays > 0 && !hasUsedTrial;

                var item = new BillingFeatureItemDto
                {
                    FeatureId = f.Id,
                    FeatureCode = f.FeatureCode,
                    Name = f.Name,
                    MenuTitle = featureMenuTitle,
                    SuiteId = matchedSuite?.Id ?? f.MasterFeatureSuiteId ?? MasterFeatureSuiteDefaults.ResolveSuiteId(suiteFullTitle),
                    Category = suiteFullTitle,
                    SuiteMenuTitle = suiteMenuTitle,
                    SuiteSortOrder = suiteSortOrder,
                    Description = f.Description,
                    Icon = f.Icon,
                    RoutePrefix = f.RoutePrefix,
                    IsCompulsory = f.IsCompulsory,
                    IsAvailableForUse = isAvailForUse,
                    IsInBeta = f.IsInBeta,
                    HasCustomPriceOverride = sub?.CustomPriceOverride != null,
                    HasCustomAvailabilityOverride = sub?.IsAvailableForUseOverride != null,
                    FreeTrialDays = catalogTrialDays,
                    EffectiveFreeTrialDays = effectiveTrialDays,
                    HasCustomFreeTrialOverride = hasCustomTrial,
                    HasUsedFreeTrial = hasUsedTrial,
                    IsTrialPeriod = isTrialPeriod,
                    IsEligibleForFreeTrial = isEligibleForFreeTrial,
                    SortOrder = f.SortOrder,
                    BillingType = f.BillingType.ToString(),
                    MonthlyPrice = effectiveMonthly,
                    QuarterlyPrice = Math.Round(quarterlyUsd * currRate, 2),
                    YearlyPrice = Math.Round(yearlyUsd * currRate, 2)
                };

                if (!isAvailForUse)
                {
                    item.IsSubscribed = false;
                    item.IsActive = false;
                    item.Status = "ComingSoon";
                    item.BillingCadence = f.IsCompulsory ? "Included" : "Monthly";
                    item.EffectivePrice = effectiveMonthly;
                    snapshot.Available.Add(item);
                    continue;
                }

                if (sub == null)
                {
                    item.IsSubscribed = false;
                    item.IsActive = false;
                    item.Status = "Available";
                    item.BillingCadence = f.IsCompulsory ? "Included" : "Monthly";
                    item.EffectivePrice = effectiveMonthly;
                    snapshot.Available.Add(item);
                    continue;
                }

                var days = (int)Math.Ceiling((sub.ExpiresAtUtc - now).TotalDays);
                bool notSuspended = !string.Equals(sub.Status, "Suspended", StringComparison.OrdinalIgnoreCase)
                                    && !string.Equals(sub.Status, "Cancelled", StringComparison.OrdinalIgnoreCase)
                                    && !string.Equals(sub.Status, "Inactive", StringComparison.OrdinalIgnoreCase);
                var live = sub.IsActive
                           && notSuspended
                           && (f.IsCompulsory || sub.ExpiresAtUtc > now);
                // A lapsed subscription is reported as Expired regardless of the stored status string
                var status = !live && sub.IsActive && notSuspended && !f.IsCompulsory && sub.ExpiresAtUtc <= now
                    ? "Expired"
                    : (live ? "Active" : sub.Status);

                decimal subEffectiveUsd = (tenant?.UseCustomPricing == true && sub.CustomPriceOverride != null)
                    ? sub.CustomPriceOverride.Value
                    : (sub.RecurringPrice > 0 ? sub.RecurringPrice : f.MonthlyPrice);

                item.SubscriptionId = sub.Id;
                item.IsSubscribed = live;
                item.IsActive = live;
                item.AutoRenew = sub.AutoRenew;
                item.Status = status;
                item.BillingCadence = sub.DurationType.ToString();
                item.EffectivePrice = Math.Round(subEffectiveUsd * currRate, 2);
                item.ExpiresAtUtc = sub.ExpiresAtUtc;
                item.DaysRemaining = days;
                bool isTrackedForRenewal = sub.IsActive
                                           && notSuspended
                                           && !f.IsCompulsory
                                           && !string.Equals(sub.Status, "Pending", StringComparison.OrdinalIgnoreCase);
                item.Severity = isTrackedForRenewal
                    ? SeverityFor(days)
                    : "None";

                if (live && f.IsCompulsory && item.EffectivePrice <= 0)
                {
                    snapshot.Included.Add(item);
                }
                else if (live)
                {
                    snapshot.Subscribed.Add(item);
                }
                else
                {
                    snapshot.Available.Add(item);
                }

                if (item.Severity != "None")
                {
                    decimal renewalPrice = item.EffectivePrice > 0 ? item.EffectivePrice : item.MonthlyPrice;
                    snapshot.Notices.Add(new FeatureExpirationNoticeDto
                    {
                        FeatureCode = f.FeatureCode,
                        FeatureName = f.Name,
                        Category = f.Category,
                        ExpiresAtUtc = sub.ExpiresAtUtc,
                        DaysRemaining = days,
                        IsExpired = days <= 0,
                        Severity = item.Severity,
                        NoticeMessage = MessageFor(f.Name, days),
                        RenewalPrice = renewalPrice,
                        CurrencyCode = currCode,
                        CurrencySymbol = currSymbol,
                        BillingCadence = item.BillingCadence,
                        IsTrialPeriod = sub.IsTrialPeriod
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
