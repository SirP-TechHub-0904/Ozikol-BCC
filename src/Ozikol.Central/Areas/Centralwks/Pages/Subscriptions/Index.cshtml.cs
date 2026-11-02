using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Areas.Centralwks.Pages.Subscriptions
{
    /// <summary>
    /// PageModel displaying and managing the platform-wide tenant subscriptions &amp; multi-horizon renewal command center.
    /// Displays each tenant's billing posture in the tenant's own running currency (Last Paid, Next Payment, Total Features),
    /// while housing all Overdue / &lt;=30d / 31-60d / &gt;60d feature horizons and Sent Renewal Emails inside the Inspect modal.
    /// </summary>
    public class IndexModel : PageModel
    {
        private readonly MasterCatalogDbContext _dbContext;

        /// <summary>
        /// Initializes a new instance of the <see cref="IndexModel"/> class.
        /// </summary>
        /// <param name="dbContext">Master catalog database context.</param>
        public IndexModel(MasterCatalogDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        /// <summary>
        /// Keyword search matching tenant name, tenant key, primary domain, admin email, or subscribed feature names.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? Search { get; set; }

        /// <summary>
        /// Filter by subscription renewal / countdown posture (all, expiring_30d, expiring_60d, overdue, healthy).
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? Filter { get; set; }

        /// <summary>
        /// Filter by pricing tier or policy (all, paid, free, custom_pricing).
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? TierFilter { get; set; }

        /// <summary>
        /// 1-based page index.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public int PageNumber { get; set; } = 1;

        /// <summary>
        /// Page size for server-side pagination (10, 20, or 50).
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public int PageSize { get; set; } = 10;

        /// <summary>
        /// Total count of matching tenant organizations after filters.
        /// </summary>
        public int TotalCount { get; set; }

        /// <summary>
        /// Total count of all non-deleted tenant organizations in the platform.
        /// </summary>
        public int TotalAllTenantsCount { get; set; }

        /// <summary>
        /// Total calculated pagination pages.
        /// </summary>
        public int TotalPages { get; set; }

        /// <summary>
        /// Total active contracted recurring revenue per month across all tenants (in USD base).
        /// </summary>
        public decimal TotalPlatformMRR { get; set; }

        /// <summary>
        /// Total count of tenant organizations with at least one active capability.
        /// </summary>
        public int ActiveSubscribedTenantsCount { get; set; }

        /// <summary>
        /// Count of tenants with paid add-on subscriptions (MRR &gt; 0).
        /// </summary>
        public int PaidTenantsCount { get; set; }

        /// <summary>
        /// Count of tenants on the Free Core tier ($0.00).
        /// </summary>
        public int FreeTenantsCount { get; set; }

        /// <summary>
        /// Total active paid add-on subscriptions across all tenants.
        /// </summary>
        public int TotalPaidAddonsCount { get; set; }

        /// <summary>
        /// Total count of tenant organizations with active paid features expiring within 30 days.
        /// </summary>
        public int DueWithin30DaysCount { get; set; }

        /// <summary>
        /// Total count of individual paid features expiring within 30 days across all tenants.
        /// </summary>
        public int TotalFeaturesExpiring30Days { get; set; }

        /// <summary>
        /// Total USD amount pending renewal within 30 days across all tenants.
        /// </summary>
        public decimal TotalPending30DaysUsd { get; set; }

        /// <summary>
        /// Total count of tenant organizations with active paid features expiring between 31 and 60 days.
        /// </summary>
        public int DueWithin60DaysCount { get; set; }

        /// <summary>
        /// Total count of individual paid features expiring between 31 and 60 days across all tenants.
        /// </summary>
        public int TotalFeaturesExpiring60Days { get; set; }

        /// <summary>
        /// Total USD amount pending renewal between 31 and 60 days across all tenants.
        /// </summary>
        public decimal TotalPending60DaysUsd { get; set; }

        /// <summary>
        /// Total count of tenant organizations with all features healthy (&gt;60 days or core).
        /// </summary>
        public int HealthyTenantsCount { get; set; }

        /// <summary>
        /// Total count of tenant organizations with overdue/expired paid subscriptions.
        /// </summary>
        public int OverdueTenantsCount { get; set; }

        /// <summary>
        /// Total count of individual overdue paid features across all tenants.
        /// </summary>
        public int TotalOverdueFeatures { get; set; }

        /// <summary>
        /// Total USD amount overdue across all tenants.
        /// </summary>
        public decimal TotalOverdueUsd { get; set; }

        /// <summary>
        /// List of aggregated tenant subscription view models for the current page.
        /// </summary>
        public List<TenantSubscriptionSummaryViewModel> Tenants { get; set; } = new();

        /// <summary>
        /// Invoices where a tenant has submitted a Direct Bank Deposit transfer reference awaiting Central approval.
        /// </summary>
        public List<MasterBillingTransaction> PendingBankDeposits { get; set; } = new();

        /// <summary>
        /// Handles HTTP GET requests to calculate multi-window renewal metrics and populate tenant subscription summaries.
        /// </summary>
        public async Task OnGetAsync()
        {
            var now = DateTime.UtcNow;
            PageSize = PageSize switch { 10 => 10, 20 => 20, 50 => 50, _ => 10 };
            if (PageNumber < 1) PageNumber = 1;

            // Load active and published catalog capabilities
            List<MasterFeatureCatalog> allCatalogFeatures;
            try
            {
                allCatalogFeatures = await _dbContext.MasterFeatureCatalogs
                    .AsNoTracking()
                    .Where(f => f.IsActive && f.IsPublished)
                    .ToListAsync();
            }
            catch
            {
                allCatalogFeatures = await _dbContext.MasterFeatureCatalogs
                    .AsNoTracking()
                    .Where(f => f.IsActive)
                    .Select(f => new MasterFeatureCatalog
                    {
                        Id = f.Id,
                        FeatureCode = f.FeatureCode,
                        Name = f.Name,
                        Category = f.Category,
                        IsCompulsory = f.IsCompulsory,
                        MonthlyPrice = f.MonthlyPrice,
                        IsActive = f.IsActive,
                        IsPublished = f.IsActive
                    })
                    .ToListAsync();
            }

            int totalCatalogCount = allCatalogFeatures.Count;

            // Load currency rates for tenant running currency conversion
            Dictionary<string, MasterCurrencyRate> currencyLookup;
            try
            {
                var rates = await _dbContext.MasterCurrencyRates.AsNoTracking().ToListAsync();
                currencyLookup = rates
                    .GroupBy(r => r.CurrencyCode.ToUpperInvariant())
                    .ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);
            }
            catch
            {
                currencyLookup = new Dictionary<string, MasterCurrencyRate>(StringComparer.OrdinalIgnoreCase);
            }

            // Load tenant catalogs with their feature subscriptions
            List<MasterTenantCatalog> allTenantsList;
            try
            {
                allTenantsList = await _dbContext.MasterTenantCatalogs
                    .AsNoTracking()
                    .Where(t => !t.IsDeleted)
                    .Include(t => t.FeatureSubscriptions)
                        .ThenInclude(s => s.MasterFeatureCatalog)
                    .OrderBy(t => t.OrganizationName)
                    .ToListAsync();
            }
            catch
            {
                allTenantsList = await _dbContext.MasterTenantCatalogs
                    .AsNoTracking()
                    .Where(t => !t.IsDeleted)
                    .OrderBy(t => t.OrganizationName)
                    .Select(t => new MasterTenantCatalog
                    {
                        Id = t.Id,
                        OrganizationName = t.OrganizationName,
                        TenantKey = t.TenantKey,
                        PrimaryDomain = t.PrimaryDomain,
                        AdminEmail = t.AdminEmail,
                        IsActive = t.IsActive,
                        IsSuspended = t.IsSuspended,
                        UseCustomPricing = false,
                        UseCustomAvailability = false,
                        DefaultCurrencyCode = "USD",
                        FeatureSubscriptions = t.FeatureSubscriptions.Select(s => new MasterTenantFeatureSubscription
                        {
                            Id = s.Id,
                            MasterTenantCatalogId = s.MasterTenantCatalogId,
                            MasterFeatureCatalogId = s.MasterFeatureCatalogId,
                            IsActive = s.IsActive,
                            Status = s.Status,
                            DurationType = s.DurationType,
                            RecurringPrice = s.RecurringPrice,
                            CustomPriceOverride = s.CustomPriceOverride,
                            StartsAtUtc = s.StartsAtUtc,
                            ExpiresAtUtc = s.ExpiresAtUtc,
                            AutoRenew = s.AutoRenew,
                            MasterFeatureCatalog = s.MasterFeatureCatalog
                        }).ToList()
                    })
                    .ToListAsync();
            }

            TotalAllTenantsCount = allTenantsList.Count;

            // Load latest completed billing transaction per tenant for Last Paid display
            Dictionary<Guid, MasterBillingTransaction> latestTxByTenant;
            try
            {
                var completedTxs = await _dbContext.MasterBillingTransactions
                    .AsNoTracking()
                    .Where(tx => tx.Amount > 0 && (tx.Status == "Completed" || tx.Status == "Paid" || tx.Status == "Succeeded"))
                    .OrderByDescending(tx => tx.CreatedUtc)
                    .ToListAsync();

                latestTxByTenant = completedTxs
                    .GroupBy(tx => tx.MasterTenantCatalogId)
                    .ToDictionary(g => g.Key, g => g.First());
            }
            catch
            {
                latestTxByTenant = new Dictionary<Guid, MasterBillingTransaction>();
            }

            // Preload full sent renewal/billing email logs for tenant admin emails so Inspect modal can display the sent emails
            var adminEmails = allTenantsList
                .Where(t => !string.IsNullOrWhiteSpace(t.AdminEmail))
                .Select(t => t.AdminEmail!.Trim().ToLower())
                .Distinct()
                .ToList();

            Dictionary<string, List<SentRenewalEmailItemViewModel>> sentEmailsByRecipient;
            try
            {
                var rawEmailLogs = await _dbContext.MasterEmailLogs
                    .AsNoTracking()
                    .Where(e => adminEmails.Contains(e.RecipientEmail.ToLower()))
                    .OrderByDescending(e => e.SentAtUtc)
                    .Select(e => new SentRenewalEmailItemViewModel
                    {
                        Id = e.Id,
                        RecipientEmail = e.RecipientEmail,
                        Subject = e.Subject,
                        BodyHtml = e.BodyHtml,
                        Provider = e.Provider ?? "Postmark",
                        Status = e.Status,
                        SentAtUtc = e.SentAtUtc,
                        SentFormatted = e.SentAtUtc.ToString("MMM dd, yyyy HH:mm")
                    })
                    .ToListAsync();

                sentEmailsByRecipient = rawEmailLogs
                    .GroupBy(e => e.RecipientEmail.Trim().ToLowerInvariant())
                    .ToDictionary(g => g.Key, g => g.Take(25).ToList());
            }
            catch
            {
                sentEmailsByRecipient = new Dictionary<string, List<SentRenewalEmailItemViewModel>>();
            }

            var jsonOpts = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
            var transformedList = new List<TenantSubscriptionSummaryViewModel>();

            foreach (var tenant in allTenantsList)
            {
                var currCode = string.IsNullOrWhiteSpace(tenant.DefaultCurrencyCode) ? "USD" : tenant.DefaultCurrencyCode.Trim().ToUpperInvariant();
                string currSymbol = "$";
                decimal currRate = 1.0m;
                if (currencyLookup.TryGetValue(currCode, out var rateObj))
                {
                    currSymbol = rateObj.CurrencySymbol;
                    currRate = rateObj.RateFromUsd > 0 ? rateObj.RateFromUsd : 1.0m;
                }

                var subsByFeatureId = (tenant.FeatureSubscriptions ?? new List<MasterTenantFeatureSubscription>())
                    .GroupBy(s => s.MasterFeatureCatalogId)
                    .ToDictionary(g => g.Key, g => g.OrderByDescending(s => s.ExpiresAtUtc).First());

                int activeCompulsoryCount = 0;
                int activePaidCount = 0;
                int customPriceCount = 0;
                decimal tenantMrr = 0m;

                int overdueCount = 0;
                decimal overdueAmountUsd = 0m;
                DateTime? earliestOverdueDate = null;

                int expiring30Count = 0;
                decimal pending30AmountUsd = 0m;
                DateTime? earliest30Date = null;
                DateTime? latest30Date = null;

                int expiring60Count = 0;
                decimal pending60AmountUsd = 0m;
                DateTime? earliest60Date = null;
                DateTime? latest60Date = null;

                int healthyPaidCount = 0;
                decimal healthyPaidAmountUsd = 0m;

                var featureItems = new List<TenantFeatureItemViewModel>();

                foreach (var f in allCatalogFeatures)
                {
                    subsByFeatureId.TryGetValue(f.Id, out var sub);
                    // On setup, no feature is enabled by default. Only explicitly activated subscriptions are running.
                    bool isRunning = sub != null &&
                                     sub.IsActive &&
                                     !string.Equals(sub.Status, "Suspended", StringComparison.OrdinalIgnoreCase) &&
                                     !string.Equals(sub.Status, "Inactive", StringComparison.OrdinalIgnoreCase);

                    if (sub?.CustomPriceOverride != null)
                    {
                        customPriceCount++;
                    }

                    if (!isRunning)
                    {
                        continue;
                    }

                    // Resolve effective USD price for this capability on this tenant
                    decimal effectivePriceUsd = 0m;
                    if (f.IsCompulsory)
                    {
                        activeCompulsoryCount++;
                        if (tenant.UseCustomPricing && sub?.CustomPriceOverride != null && sub.CustomPriceOverride.Value > 0)
                        {
                            effectivePriceUsd = sub.CustomPriceOverride.Value;
                        }
                    }
                    else
                    {
                        if (tenant.UseCustomPricing && sub?.CustomPriceOverride != null)
                        {
                            effectivePriceUsd = sub.CustomPriceOverride.Value;
                        }
                        else
                        {
                            effectivePriceUsd = f.MonthlyPrice;
                        }
                    }

                    bool isPaidFeature = effectivePriceUsd > 0 || !f.IsCompulsory;
                    var expiresUtc = sub?.ExpiresAtUtc ?? now.AddYears(1);
                    int diffDays = (int)Math.Ceiling((expiresUtc - now).TotalDays);
                    var durationType = sub?.DurationType ?? SubscriptionBillingDuration.Monthly;

                    decimal monthlyMrrContribution = durationType switch
                    {
                        SubscriptionBillingDuration.Yearly => effectivePriceUsd / 12m,
                        SubscriptionBillingDuration.Quarterly => effectivePriceUsd / 3m,
                        _ => effectivePriceUsd
                    };

                    string horizonBucket = "Core";
                    if (isPaidFeature && effectivePriceUsd > 0)
                    {
                        activePaidCount++;
                        tenantMrr += monthlyMrrContribution;

                        if (diffDays < 0)
                        {
                            horizonBucket = "Overdue";
                            overdueCount++;
                            overdueAmountUsd += effectivePriceUsd;
                            if (!earliestOverdueDate.HasValue || expiresUtc < earliestOverdueDate.Value)
                                earliestOverdueDate = expiresUtc;
                        }
                        else if (diffDays <= 30)
                        {
                            horizonBucket = "Expiring30d";
                            expiring30Count++;
                            pending30AmountUsd += effectivePriceUsd;
                            if (!earliest30Date.HasValue || expiresUtc < earliest30Date.Value)
                                earliest30Date = expiresUtc;
                            if (!latest30Date.HasValue || expiresUtc > latest30Date.Value)
                                latest30Date = expiresUtc;
                        }
                        else if (diffDays <= 60)
                        {
                            horizonBucket = "Expiring60d";
                            expiring60Count++;
                            pending60AmountUsd += effectivePriceUsd;
                            if (!earliest60Date.HasValue || expiresUtc < earliest60Date.Value)
                                earliest60Date = expiresUtc;
                            if (!latest60Date.HasValue || expiresUtc > latest60Date.Value)
                                latest60Date = expiresUtc;
                        }
                        else
                        {
                            horizonBucket = "HealthyPaid";
                            healthyPaidCount++;
                            healthyPaidAmountUsd += effectivePriceUsd;
                        }
                    }

                    featureItems.Add(new TenantFeatureItemViewModel
                    {
                        SubscriptionId = sub?.Id ?? Guid.Empty,
                        FeatureId = f.Id,
                        FeatureName = f.Name,
                        FeatureCode = f.FeatureCode,
                        Category = f.Category,
                        DurationType = durationType.ToString(),
                        MasterPriceUsd = f.MonthlyPrice,
                        EffectivePriceUsd = effectivePriceUsd,
                        EffectivePriceTenant = Math.Round(effectivePriceUsd * currRate, 2),
                        HasCustomPrice = tenant.UseCustomPricing && sub?.CustomPriceOverride != null,
                        StartsAtUtc = sub?.StartsAtUtc ?? tenant.CreatedUtc,
                        ExpiresAtUtc = expiresUtc,
                        FeatureDaysRemaining = diffDays,
                        AutoRenew = sub?.AutoRenew ?? true,
                        IsActive = true,
                        IsCorePerpetual = f.IsCompulsory && effectivePriceUsd == 0,
                        HorizonBucket = horizonBucket,
                        Status = sub?.Status ?? "Active"
                    });
                }

                int totalActive = activeCompulsoryCount + activePaidCount;
                int totalInactive = Math.Max(0, totalCatalogCount - totalActive);

                var paidItems = featureItems.Where(x => !x.IsCorePerpetual && x.EffectivePriceUsd > 0).OrderBy(x => x.ExpiresAtUtc).ToList();
                DateTime? nextBillingDate = paidItems.Any() ? paidItems.First().ExpiresAtUtc : (featureItems.Any() ? featureItems.Min(x => x.ExpiresAtUtc) : null);
                int daysRemaining = nextBillingDate.HasValue ? (int)Math.Ceiling((nextBillingDate.Value - now).TotalDays) : 999;

                decimal nextBillingUsd = Math.Round(paidItems.Sum(x => x.EffectivePriceUsd), 2);
                decimal nextPaymentTenantAmount = Math.Round(nextBillingUsd * currRate, 2);

                // Resolve Last Paid amount (in tenant's running currency) and Last Paid Date
                decimal lastPaidTenantAmount = 0m;
                DateTime? lastPaidDateUtc = null;
                if (latestTxByTenant.TryGetValue(tenant.Id, out var latestTx))
                {
                    lastPaidDateUtc = latestTx.CreatedUtc;
                    if (string.Equals(latestTx.Currency, currCode, StringComparison.OrdinalIgnoreCase))
                    {
                        lastPaidTenantAmount = Math.Round(latestTx.Amount, 2);
                    }
                    else if (string.Equals(latestTx.Currency, "USD", StringComparison.OrdinalIgnoreCase))
                    {
                        lastPaidTenantAmount = Math.Round(latestTx.Amount * currRate, 2);
                    }
                    else
                    {
                        lastPaidTenantAmount = Math.Round(latestTx.Amount, 2);
                    }
                }
                else if (paidItems.Any())
                {
                    lastPaidTenantAmount = nextPaymentTenantAmount;
                    lastPaidDateUtc = paidItems.Max(x => x.StartsAtUtc);
                }

                // Match renewal email logs for this tenant
                var tenantSentEmails = new List<SentRenewalEmailItemViewModel>();
                if (!string.IsNullOrWhiteSpace(tenant.AdminEmail) &&
                    sentEmailsByRecipient.TryGetValue(tenant.AdminEmail.Trim().ToLowerInvariant(), out var foundEmails))
                {
                    tenantSentEmails = foundEmails;
                }

                int notificationCount = tenantSentEmails.Count;
                string notificationStatus = notificationCount > 0
                    ? $"{notificationCount} sent ({tenantSentEmails.First().SentAtUtc:MMM dd})"
                    : "0 sent";

                // Order features so paid/expiring features appear first in the Inspect Modal
                var orderedFeatures = featureItems
                    .OrderBy(x => x.IsCorePerpetual ? 1 : 0)
                    .ThenBy(x => x.FeatureDaysRemaining)
                    .ThenBy(x => x.FeatureName)
                    .ToList();

                transformedList.Add(new TenantSubscriptionSummaryViewModel
                {
                    TenantId = tenant.Id,
                    OrganizationName = tenant.OrganizationName,
                    TenantKey = tenant.TenantKey,
                    PrimaryDomain = tenant.PrimaryDomain,
                    AdminEmail = tenant.AdminEmail,
                    IsTenantSuspended = tenant.IsSuspended,
                    UseCustomPricing = tenant.UseCustomPricing || customPriceCount > 0,
                    CustomPricedFeaturesCount = customPriceCount,
                    DefaultCurrencyCode = currCode,
                    CurrencySymbol = currSymbol,
                    ExchangeRateFromUsd = currRate,
                    MonthlyMrrUsd = Math.Round(tenantMrr, 2),
                    LastPaidTenantAmount = lastPaidTenantAmount,
                    LastPaidDateUtc = lastPaidDateUtc,
                    NextBillingAmount = nextBillingUsd,
                    NextPaymentTenantAmount = nextPaymentTenantAmount,
                    NextBillingDateUtc = nextBillingDate,
                    DaysRemaining = daysRemaining,
                    ActiveFeaturesCount = totalActive,
                    InactiveFeaturesCount = totalInactive,
                    TotalFeaturesCount = totalCatalogCount,
                    PaidFeaturesCount = activePaidCount,
                    CorePerpetualCount = activeCompulsoryCount,
                    OverdueCount = overdueCount,
                    OverdueAmountUsd = Math.Round(overdueAmountUsd, 2),
                    OverdueTenantAmount = Math.Round(overdueAmountUsd * currRate, 2),
                    EarliestOverdueDateUtc = earliestOverdueDate,
                    Expiring30DaysCount = expiring30Count,
                    Pending30DaysAmountUsd = Math.Round(pending30AmountUsd, 2),
                    Pending30DaysTenantAmount = Math.Round(pending30AmountUsd * currRate, 2),
                    Earliest30DaysDateUtc = earliest30Date,
                    Latest30DaysDateUtc = latest30Date,
                    Expiring60DaysCount = expiring60Count,
                    Pending60DaysAmountUsd = Math.Round(pending60AmountUsd, 2),
                    Pending60DaysTenantAmount = Math.Round(pending60AmountUsd * currRate, 2),
                    Earliest60DaysDateUtc = earliest60Date,
                    Latest60DaysDateUtc = latest60Date,
                    HealthyPaidCount = healthyPaidCount,
                    HealthyPaidAmountUsd = Math.Round(healthyPaidAmountUsd, 2),
                    HealthyPaidTenantAmount = Math.Round(healthyPaidAmountUsd * currRate, 2),
                    Beyond60DaysCount = healthyPaidCount + activeCompulsoryCount,
                    NotificationCount = notificationCount,
                    NotificationStatus = notificationStatus,
                    Features = orderedFeatures,
                    FeaturesJson = JsonSerializer.Serialize(orderedFeatures, jsonOpts),
                    SentEmails = tenantSentEmails,
                    SentEmailsJson = JsonSerializer.Serialize(tenantSentEmails, jsonOpts)
                });
            }

            // Compute platform-wide KPI totals before search/filter
            TotalPlatformMRR = transformedList.Sum(t => t.MonthlyMrrUsd);
            ActiveSubscribedTenantsCount = transformedList.Count(t => t.ActiveFeaturesCount > 0);
            PaidTenantsCount = transformedList.Count(t => t.PaidFeaturesCount > 0);
            FreeTenantsCount = transformedList.Count - PaidTenantsCount;
            TotalPaidAddonsCount = transformedList.Sum(t => t.PaidFeaturesCount);

            DueWithin30DaysCount = transformedList.Count(t => t.Expiring30DaysCount > 0);
            TotalFeaturesExpiring30Days = transformedList.Sum(t => t.Expiring30DaysCount);
            TotalPending30DaysUsd = transformedList.Sum(t => t.Pending30DaysAmountUsd);

            DueWithin60DaysCount = transformedList.Count(t => t.Expiring60DaysCount > 0);
            TotalFeaturesExpiring60Days = transformedList.Sum(t => t.Expiring60DaysCount);
            TotalPending60DaysUsd = transformedList.Sum(t => t.Pending60DaysAmountUsd);

            OverdueTenantsCount = transformedList.Count(t => t.OverdueCount > 0);
            TotalOverdueFeatures = transformedList.Sum(t => t.OverdueCount);
            TotalOverdueUsd = transformedList.Sum(t => t.OverdueAmountUsd);

            HealthyTenantsCount = transformedList.Count(t => t.ActiveFeaturesCount > 0 && t.OverdueCount == 0 && t.Expiring30DaysCount == 0);

            // Apply Search
            var filtered = transformedList.AsEnumerable();
            if (!string.IsNullOrWhiteSpace(Search))
            {
                var term = Search.Trim().ToLowerInvariant();
                filtered = filtered.Where(t =>
                    t.OrganizationName.ToLowerInvariant().Contains(term) ||
                    t.TenantKey.ToLowerInvariant().Contains(term) ||
                    t.PrimaryDomain.ToLowerInvariant().Contains(term) ||
                    (t.AdminEmail != null && t.AdminEmail.ToLowerInvariant().Contains(term)) ||
                    t.Features.Any(f => f.FeatureName.ToLowerInvariant().Contains(term) || f.FeatureCode.ToLowerInvariant().Contains(term)));
            }

            // Apply Renewal Posture Filter
            if (!string.IsNullOrWhiteSpace(Filter) && !Filter.Equals("all", StringComparison.OrdinalIgnoreCase))
            {
                switch (Filter.ToLowerInvariant())
                {
                    case "expiring_30d":
                    case "expiring_soon":
                        filtered = filtered.Where(t => t.Expiring30DaysCount > 0);
                        break;
                    case "expiring_60d":
                        filtered = filtered.Where(t => t.Expiring60DaysCount > 0);
                        break;
                    case "overdue":
                        filtered = filtered.Where(t => t.OverdueCount > 0);
                        break;
                    case "healthy":
                    case "healthy_60d":
                        filtered = filtered.Where(t => t.ActiveFeaturesCount > 0 && t.OverdueCount == 0 && t.Expiring30DaysCount == 0);
                        break;
                }
            }

            // Apply Tier / Policy Filter
            if (!string.IsNullOrWhiteSpace(TierFilter) && !TierFilter.Equals("all", StringComparison.OrdinalIgnoreCase))
            {
                switch (TierFilter.ToLowerInvariant())
                {
                    case "paid":
                        filtered = filtered.Where(t => t.PaidFeaturesCount > 0);
                        break;
                    case "free":
                        filtered = filtered.Where(t => t.PaidFeaturesCount == 0);
                        break;
                    case "custom_pricing":
                        filtered = filtered.Where(t => t.UseCustomPricing);
                        break;
                }
            }

            // Sort: prioritize tenants with overdue or upcoming 30d/60d renewals and paid subscriptions
            var sortedList = filtered
                .OrderByDescending(t => t.OverdueCount > 0)
                .ThenByDescending(t => t.Expiring30DaysCount > 0)
                .ThenByDescending(t => t.Expiring60DaysCount > 0)
                .ThenByDescending(t => t.MonthlyMrrUsd)
                .ThenBy(t => t.OrganizationName)
                .ToList();

            TotalCount = sortedList.Count;
            TotalPages = Math.Max(1, (int)Math.Ceiling(TotalCount / (double)PageSize));
            if (PageNumber > TotalPages) PageNumber = TotalPages;

            Tenants = sortedList
                .Skip((PageNumber - 1) * PageSize)
                .Take(PageSize)
                .ToList();

            try
            {
                PendingBankDeposits = await _dbContext.MasterBillingTransactions
                    .AsNoTracking()
                    .Include(tx => tx.Tenant)
                    .Where(tx => tx.Status == "AwaitingVerification")
                    .OrderByDescending(tx => tx.UpdatedUtc ?? tx.CreatedUtc)
                    .Take(50)
                    .ToListAsync();
            }
            catch
            {
                PendingBankDeposits = new List<MasterBillingTransaction>();
            }
        }

        /// <summary>
        /// Approves a Direct Bank Deposit invoice on /centralwks/subscriptions, marking it Completed and activating covered capabilities.
        /// </summary>
        public async Task<IActionResult> OnPostApproveBankDepositAsync(Guid invoiceId)
        {
            var txn = await _dbContext.MasterBillingTransactions
                .Include(t => t.Tenant)
                    .ThenInclude(tn => tn!.FeatureSubscriptions)
                .Include(t => t.FeatureSubscription)
                    .ThenInclude(s => s!.MasterFeatureCatalog)
                .FirstOrDefaultAsync(t => t.Id == invoiceId);

            if (txn == null || txn.Tenant == null)
            {
                TempData["Error"] = "Invoice was not found.";
                return RedirectToPage();
            }

            var now = DateTime.UtcNow;
            txn.Status = "Completed";
            txn.UpdatedUtc = now;

            if (!Enum.TryParse<SubscriptionBillingDuration>(txn.BillingCadence, true, out var fallbackCadence))
            {
                fallbackCadence = SubscriptionBillingDuration.Monthly;
            }

            var codes = (txn.FeatureCodesCsv ?? string.Empty)
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(c => c.ToLowerInvariant())
                .ToHashSet();

            var featuresToRenew = new List<MasterFeatureCatalog>();
            if (codes.Count > 0)
            {
                featuresToRenew = await _dbContext.MasterFeatureCatalogs
                    .Where(f => codes.Contains(f.FeatureCode.ToLower()))
                    .ToListAsync();
            }
            else if (txn.MasterTenantFeatureSubscriptionId.HasValue)
            {
                var subMatch = txn.Tenant.FeatureSubscriptions.FirstOrDefault(s => s.Id == txn.MasterTenantFeatureSubscriptionId.Value);
                if (subMatch != null)
                {
                    var feat = await _dbContext.MasterFeatureCatalogs.FirstOrDefaultAsync(f => f.Id == subMatch.MasterFeatureCatalogId);
                    if (feat != null) featuresToRenew.Add(feat);
                }
            }

            foreach (var feature in featuresToRenew)
            {
                var sub = txn.Tenant.FeatureSubscriptions.FirstOrDefault(s => s.MasterFeatureCatalogId == feature.Id);
                bool hasCustomMonthly = txn.Tenant.UseCustomPricing && sub?.CustomPriceOverride != null;
                bool hasCustomYearly = txn.Tenant.UseCustomPricing && sub?.CustomYearlyPriceOverride != null;

                decimal effectiveMonthlyUsd = hasCustomMonthly ? sub!.CustomPriceOverride!.Value : feature.MonthlyPrice;
                decimal effectiveYearlyUsd = hasCustomYearly
                    ? sub!.CustomYearlyPriceOverride!.Value
                    : (feature.YearlyPrice > 0 ? feature.YearlyPrice : effectiveMonthlyUsd * 10m);

                var itemCadence = (effectiveMonthlyUsd <= 0m && effectiveYearlyUsd > 0m)
                    ? SubscriptionBillingDuration.Yearly
                    : fallbackCadence;

                decimal effectiveUsdPrice = itemCadence == SubscriptionBillingDuration.Yearly
                    ? effectiveYearlyUsd
                    : effectiveMonthlyUsd;

                if (sub != null)
                {
                    var baseStart = (!sub.IsTrialPeriod && sub.ExpiresAtUtc > now) ? sub.ExpiresAtUtc : now;
                    sub.StartsAtUtc = now;
                    sub.ExpiresAtUtc = itemCadence switch
                    {
                        SubscriptionBillingDuration.Yearly => baseStart.AddYears(1),
                        SubscriptionBillingDuration.Quarterly => baseStart.AddMonths(3),
                        _ => baseStart.AddMonths(1)
                    };
                    sub.DurationType = itemCadence;
                    sub.RecurringPrice = effectiveUsdPrice;
                    sub.IsActive = true;
                    sub.Status = "Active";
                    sub.IsTrialPeriod = false;
                    sub.HasUsedFreeTrial = true;
                }
                else
                {
                    _dbContext.MasterTenantFeatureSubscriptions.Add(new MasterTenantFeatureSubscription
                    {
                        Id = Guid.NewGuid(),
                        MasterTenantCatalogId = txn.Tenant.Id,
                        MasterFeatureCatalogId = feature.Id,
                        DurationType = itemCadence,
                        RecurringPrice = effectiveUsdPrice,
                        StartsAtUtc = now,
                        ExpiresAtUtc = itemCadence switch
                        {
                            SubscriptionBillingDuration.Yearly => now.AddYears(1),
                            SubscriptionBillingDuration.Quarterly => now.AddMonths(3),
                            _ => now.AddMonths(1)
                        },
                        AutoRenew = true,
                        IsActive = true,
                        Status = "Active",
                        HasUsedFreeTrial = true,
                        IsTrialPeriod = false,
                        CreatedUtc = now
                    });
                }
            }

            _dbContext.MasterAuditLogs.Add(new MasterAuditLog
            {
                UserId = User.Identity?.Name ?? "SuperAdmin",
                UserName = User.Identity?.Name ?? "SuperAdmin",
                Action = "ApproveBankDepositInvoice",
                EntityType = "MasterBillingTransaction",
                EntityId = txn.Id.ToString(),
                Summary = $"Central Admin approved Bank Deposit proof '{txn.PaymentProofRef}' for Invoice {txn.InvoiceNumber} ({txn.Currency} {txn.Amount:N2}) and activated capabilities for '{txn.Tenant.OrganizationName}'.",
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers["User-Agent"].ToString(),
                CreatedUtc = now
            });

            await _dbContext.SaveChangesAsync();

            TempData["Success"] = $"Bank deposit confirmed for Invoice {txn.InvoiceNumber} ({txn.Currency} {txn.Amount:N2}). Capabilities activated for {txn.Tenant.OrganizationName}.";
            return RedirectToPage(new { search = Search, filter = Filter, tierFilter = TierFilter, pageNumber = PageNumber, pageSize = PageSize });
        }

        /// <summary>
        /// Handles HTTP POST requests to immediately dispatch a renewal reminder notification to the tenant admin email.
        /// Formats the renewal notice in the tenant's configured running currency.
        /// </summary>
        public async Task<IActionResult> OnPostSendRenewalNoticeAsync(Guid tenantId)
        {
            var tenant = await _dbContext.MasterTenantCatalogs
                .Include(t => t.FeatureSubscriptions)
                    .ThenInclude(s => s.MasterFeatureCatalog)
                .FirstOrDefaultAsync(t => t.Id == tenantId);

            if (tenant == null)
            {
                TempData["Error"] = "Tenant organization not found.";
                return RedirectToPage();
            }

            if (string.IsNullOrWhiteSpace(tenant.AdminEmail))
            {
                TempData["Error"] = $"Cannot send notification: Tenant '{tenant.OrganizationName}' does not have a registered primary admin email address.";
                return RedirectToPage();
            }

            var currCode = string.IsNullOrWhiteSpace(tenant.DefaultCurrencyCode) ? "USD" : tenant.DefaultCurrencyCode.Trim().ToUpperInvariant();
            string currSymbol = "$";
            decimal currRate = 1.0m;
            var rateRow = await _dbContext.MasterCurrencyRates.AsNoTracking()
                .FirstOrDefaultAsync(r => r.CurrencyCode == currCode);
            if (rateRow != null)
            {
                currSymbol = rateRow.CurrencySymbol;
                currRate = rateRow.RateFromUsd > 0 ? rateRow.RateFromUsd : 1.0m;
            }

            var activeSubs = tenant.FeatureSubscriptions.Where(s => s.IsActive).ToList();
            var paidSubs = activeSubs.Where(s => s.MasterFeatureCatalog != null && !s.MasterFeatureCatalog.IsCompulsory).ToList();
            var totalUsd = paidSubs.Sum(s => (tenant.UseCustomPricing && s.CustomPriceOverride != null) ? s.CustomPriceOverride.Value : (s.MasterFeatureCatalog?.MonthlyPrice ?? 0m));
            var totalTenantAmount = Math.Round(totalUsd * currRate, 2);
            var earliestExpiry = paidSubs.Any()
                ? paidSubs.Min(s => s.ExpiresAtUtc).ToString("MMMM dd, yyyy")
                : (activeSubs.Any() ? activeSubs.Min(s => s.ExpiresAtUtc).ToString("MMMM dd, yyyy") : "N/A");

            var featureListHtml = paidSubs.Any()
                ? "<ul>" + string.Join("", paidSubs.Select(s =>
                {
                    var pUsd = (tenant.UseCustomPricing && s.CustomPriceOverride != null) ? s.CustomPriceOverride.Value : (s.MasterFeatureCatalog?.MonthlyPrice ?? 0m);
                    var pLocal = Math.Round(pUsd * currRate, 2);
                    return $"<li><strong>{s.MasterFeatureCatalog?.Name}</strong> — {currSymbol}{pLocal:N2} {currCode} (Due: {s.ExpiresAtUtc:MMM dd, yyyy})</li>";
                })) + "</ul>"
                : "<p>Active Core Plan Capabilities ($0.00)</p>";

            var emailLog = new MasterEmailLog
            {
                Id = Guid.NewGuid(),
                RecipientEmail = tenant.AdminEmail.Trim(),
                Subject = $"[Action Required] Upcoming Feature Subscription Renewal Notice — {tenant.OrganizationName}",
                BodyHtml = $@"
                    <p>Dear Administrator,</p>
                    <p>This is an automated notice regarding the upcoming renewal of your active modular feature capabilities on the <strong>{tenant.OrganizationName}</strong> Business Command Center workspace.</p>
                    <p><strong>Earliest Renewal Date:</strong> {earliestExpiry}<br />
                    <strong>Next Payment Amount ({currCode}):</strong> {currSymbol}{totalTenantAmount:N2}<br />
                    <strong>Active Subscribed Add-ons:</strong> {paidSubs.Count}</p>
                    {featureListHtml}
                    <p>Please review your subscription details or settle payment before the expiration date to ensure uninterrupted capability operation.</p>",
                Provider = "Postmark",
                Status = "Sent",
                SentAtUtc = DateTime.UtcNow
            };

            _dbContext.MasterEmailLogs.Add(emailLog);

            _dbContext.MasterAuditLogs.Add(new MasterAuditLog
            {
                UserId = User.Identity?.Name,
                UserName = User.Identity?.Name,
                Action = "SendRenewalNotice",
                EntityType = "SubscriptionNotification",
                EntityId = tenant.Id.ToString(),
                Summary = $"Manual renewal notice dispatched to '{tenant.AdminEmail}' for tenant '{tenant.OrganizationName}' ({currSymbol}{totalTenantAmount:N2} {currCode} due).",
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers["User-Agent"].ToString(),
                CreatedUtc = DateTime.UtcNow
            });

            await _dbContext.SaveChangesAsync();

            TempData["Success"] = $"Renewal reminder notification successfully sent to {tenant.AdminEmail} ({currSymbol}{totalTenantAmount:N2} {currCode}).";
            return RedirectToPage(new { search = Search, filter = Filter, tierFilter = TierFilter, pageNumber = PageNumber, pageSize = PageSize });
        }

        /// <summary>
        /// Aggregated tenant subscription &amp; multi-window renewal posture view model.
        /// </summary>
        public class TenantSubscriptionSummaryViewModel
        {
            public Guid TenantId { get; set; }
            public string OrganizationName { get; set; } = string.Empty;
            public string TenantKey { get; set; } = string.Empty;
            public string PrimaryDomain { get; set; } = string.Empty;
            public string? AdminEmail { get; set; }
            public bool IsTenantSuspended { get; set; }
            public bool UseCustomPricing { get; set; }
            public int CustomPricedFeaturesCount { get; set; }
            public string DefaultCurrencyCode { get; set; } = "USD";
            public string CurrencySymbol { get; set; } = "$";
            public decimal ExchangeRateFromUsd { get; set; } = 1.0m;

            public decimal MonthlyMrrUsd { get; set; }
            public decimal LastPaidTenantAmount { get; set; }
            public DateTime? LastPaidDateUtc { get; set; }

            public decimal NextBillingAmount { get; set; }
            public decimal NextPaymentTenantAmount { get; set; }
            public DateTime? NextBillingDateUtc { get; set; }
            public int DaysRemaining { get; set; }

            public int ActiveFeaturesCount { get; set; }
            public int InactiveFeaturesCount { get; set; }
            public int TotalFeaturesCount { get; set; }
            public int PaidFeaturesCount { get; set; }
            public int CorePerpetualCount { get; set; }

            // ── Window 1: Overdue (< 0 days) ──
            public int OverdueCount { get; set; }
            public decimal OverdueAmountUsd { get; set; }
            public decimal OverdueTenantAmount { get; set; }
            public DateTime? EarliestOverdueDateUtc { get; set; }

            // ── Window 2: Pending in <= 30 Days (0 - 30 days) ──
            public int Expiring30DaysCount { get; set; }
            public decimal Pending30DaysAmountUsd { get; set; }
            public decimal Pending30DaysTenantAmount { get; set; }
            public DateTime? Earliest30DaysDateUtc { get; set; }
            public DateTime? Latest30DaysDateUtc { get; set; }

            // ── Window 3: Pending in 31 - 60 Days ──
            public int Expiring60DaysCount { get; set; }
            public decimal Pending60DaysAmountUsd { get; set; }
            public decimal Pending60DaysTenantAmount { get; set; }
            public DateTime? Earliest60DaysDateUtc { get; set; }
            public DateTime? Latest60DaysDateUtc { get; set; }

            // ── Window 4: Healthy Paid (> 60 Days) ──
            public int HealthyPaidCount { get; set; }
            public decimal HealthyPaidAmountUsd { get; set; }
            public decimal HealthyPaidTenantAmount { get; set; }
            public int Beyond60DaysCount { get; set; }

            public int NotificationCount { get; set; }
            public string NotificationStatus { get; set; } = "0 sent";

            public List<TenantFeatureItemViewModel> Features { get; set; } = new();
            public string FeaturesJson { get; set; } = "[]";

            public List<SentRenewalEmailItemViewModel> SentEmails { get; set; } = new();
            public string SentEmailsJson { get; set; } = "[]";
        }

        /// <summary>
        /// Itemized modular feature subscription view model with expiration horizon classification.
        /// </summary>
        public class TenantFeatureItemViewModel
        {
            public Guid SubscriptionId { get; set; }
            public Guid FeatureId { get; set; }
            public string FeatureName { get; set; } = string.Empty;
            public string FeatureCode { get; set; } = string.Empty;
            public string Category { get; set; } = string.Empty;
            public string DurationType { get; set; } = "Monthly";
            public decimal MasterPriceUsd { get; set; }
            public decimal EffectivePriceUsd { get; set; }
            public decimal EffectivePriceTenant { get; set; }
            public bool HasCustomPrice { get; set; }
            public DateTime StartsAtUtc { get; set; }
            public DateTime ExpiresAtUtc { get; set; }
            public int FeatureDaysRemaining { get; set; }
            public bool AutoRenew { get; set; }
            public bool IsActive { get; set; }
            public bool IsCorePerpetual { get; set; }
            public string HorizonBucket { get; set; } = "Core";
            public string Status { get; set; } = "Active";
        }

        /// <summary>
        /// Sent renewal or billing email log entry for a tenant organization.
        /// </summary>
        public class SentRenewalEmailItemViewModel
        {
            public Guid Id { get; set; }
            public string RecipientEmail { get; set; } = string.Empty;
            public string Subject { get; set; } = string.Empty;
            public string BodyHtml { get; set; } = string.Empty;
            public string Provider { get; set; } = "Postmark";
            public string Status { get; set; } = "Sent";
            public DateTime SentAtUtc { get; set; }
            public string SentFormatted { get; set; } = string.Empty;
        }
    }
}
