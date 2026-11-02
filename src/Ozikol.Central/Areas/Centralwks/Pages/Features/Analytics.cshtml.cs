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

namespace Ozikol.Central.Areas.Centralwks.Pages.Features
{
    /// <summary>
    /// PageModel providing comprehensive tenant feature adoption telemetry, per-tenant active/inactive tracking,
    /// General vs. Custom Pricing and Availability policy visibility, pagination, and recurring subscription revenue (MRR) analytics.
    /// </summary>
    public class AnalyticsModel : PageModel
    {
        private readonly MasterCatalogDbContext _dbContext;

        /// <summary>
        /// Canonical 10-suite sequence matching the Master Feature Catalog (/centralwks/features).
        /// </summary>
        public static readonly (string Code, string Name)[] CanonicalSuites = new[]
        {
            ("SUITE A", "People, Community & Collaboration"),
            ("SUITE B", "Workforce, Rota & Scheduling"),
            ("SUITE C", "Reports, Forms & Analytics"),
            ("SUITE D", "Events & Training Management"),
            ("SUITE E", "Finance & Commercial Revenue"),
            ("SUITE F", "Operations & Workflows"),
            ("SUITE G", "Communication, AI & Support"),
            ("SUITE H", "Compliance, Learning & Certification"),
            ("SUITE I", "Demographics & Civic Census"),
            ("SUITE J", "Life Events & Publications")
        };

        /// <summary>
        /// Default live feature codes when the IsAvailableForUse database column has not yet been migrated.
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
        /// Initializes a new instance of the <see cref="AnalyticsModel"/> class.
        /// </summary>
        /// <param name="dbContext">Master catalog database context.</param>
        public AnalyticsModel(MasterCatalogDbContext dbContext)
        {
            _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
        }

        /// <summary>
        /// Search keyword filter for feature name, code, or description on Tab 2.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? Search { get; set; }

        /// <summary>
        /// Search keyword filter for tenant organization, key, domain, or email on Tab 1.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? TenantSearch { get; set; }

        /// <summary>
        /// Category / Suite filter on Tab 2.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? Category { get; set; }

        /// <summary>
        /// Usage activity level filter on Tab 1 (All, High Activity, Active, Moderate, Dormant).
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? UsageFilter { get; set; }

        /// <summary>
        /// Pricing &amp; Availability policy filter on Tab 1 (All, CustomPricing, GeneralPricing, CustomAvailability, PaidTier, FreeTier).
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? PolicyFilter { get; set; }

        /// <summary>
        /// Active navigation tab (tenants or ranking).
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string ActiveTab { get; set; } = "tenants";

        /// <summary>
        /// Current page number for the Tenants table (1-based).
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public int PageNumber { get; set; } = 1;

        /// <summary>
        /// Page size (rows per page) for the Tenants table.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public int PageSize { get; set; } = 10;

        /// <summary>
        /// Current page number for the Capabilities Ranking table (1-based).
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public int FeaturePageNumber { get; set; } = 1;

        /// <summary>
        /// Page size (rows per page) for the Capabilities Ranking table.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public int FeaturePageSize { get; set; } = 10;

        /// <summary>
        /// Total capabilities in catalog.
        /// </summary>
        public int TotalCapabilities { get; set; }

        /// <summary>
        /// Total compulsory base capabilities.
        /// </summary>
        public int TotalCompulsoryFeatures { get; set; }

        /// <summary>
        /// Total optional add-on capabilities.
        /// </summary>
        public int TotalOptionalFeatures { get; set; }

        /// <summary>
        /// Total capabilities available for immediate use.
        /// </summary>
        public int AvailableForUseCount { get; set; }

        /// <summary>
        /// Total capabilities marked as Coming Soon.
        /// </summary>
        public int ComingSoonCount { get; set; }

        /// <summary>
        /// Total tenant organizations in master catalog.
        /// </summary>
        public int TotalTenants { get; set; }

        /// <summary>
        /// Count of active (non-suspended) tenant organizations.
        /// </summary>
        public int ActiveTenantsCount { get; set; }

        /// <summary>
        /// Count of suspended or inactive tenant organizations.
        /// </summary>
        public int SuspendedTenantsCount { get; set; }

        /// <summary>
        /// Count of tenants generating paid recurring monthly revenue.
        /// </summary>
        public int PaidTierTenantsCount { get; set; }

        /// <summary>
        /// Count of tenants on the $0.00 Free Tier.
        /// </summary>
        public int FreeTierTenantsCount { get; set; }

        /// <summary>
        /// Count of tenants using Custom Pricing (or having custom feature price overrides).
        /// </summary>
        public int CustomPricingTenantsCount { get; set; }

        /// <summary>
        /// Count of tenants using Custom Availability (or having custom feature availability overrides).
        /// </summary>
        public int CustomAvailabilityTenantsCount { get; set; }

        /// <summary>
        /// Total active paid add-on subscriptions across all tenants.
        /// </summary>
        public int TotalPaidAddonSubscriptions { get; set; }

        /// <summary>
        /// Platform-wide average feature adoption percentage.
        /// </summary>
        public double AverageAdoptionRate { get; set; }

        /// <summary>
        /// Total monthly recurring revenue generated from paid feature subscriptions (MRR in USD).
        /// </summary>
        public decimal TotalSubscriptionMrr { get; set; }

        /// <summary>
        /// Full filtered list of tenants with their running features and policies.
        /// </summary>
        public List<TenantFeatureUsageSummaryDto> AllTenantsFeatureMatrix { get; set; } = new();

        /// <summary>
        /// Current page slice of tenants for the table.
        /// </summary>
        public List<TenantFeatureUsageSummaryDto> PaginatedTenants { get; set; } = new();

        /// <summary>
        /// Total number of filtered tenants before pagination.
        /// </summary>
        public int TotalFilteredTenants { get; set; }

        /// <summary>
        /// Total pages for the Tenants table.
        /// </summary>
        public int TotalTenantPages { get; set; }

        /// <summary>
        /// List of distinct suite categories in canonical order.
        /// </summary>
        public List<string> Categories { get; set; } = new();

        /// <summary>
        /// Full filtered list of all features with adoption and revenue metrics.
        /// </summary>
        public List<FeatureAdoptionMetricDto> RankedFeatures { get; set; } = new();

        /// <summary>
        /// Current page slice of ranked features for Tab 2.
        /// </summary>
        public List<FeatureAdoptionMetricDto> PaginatedRankedFeatures { get; set; } = new();

        /// <summary>
        /// Total number of filtered features before pagination.
        /// </summary>
        public int TotalFilteredFeatures { get; set; }

        /// <summary>
        /// Total pages for the Capabilities Ranking table.
        /// </summary>
        public int TotalFeaturePages { get; set; }

        /// <summary>
        /// Category-level distribution items for summary metrics.
        /// </summary>
        public List<CategoryDistributionDto> CategoryDistributions { get; set; } = new();

        /// <summary>
        /// Resolves the canonical suite code (e.g. SUITE A) and sort index for a category name.
        /// </summary>
        public static (string Code, int Order) GetSuiteMetadata(string? category)
        {
            if (string.IsNullOrWhiteSpace(category)) return ("SUITE", 999);
            var idx = Array.FindIndex(CanonicalSuites, s => s.Name.Equals(category.Trim(), StringComparison.OrdinalIgnoreCase));
            return idx >= 0 ? (CanonicalSuites[idx].Code, idx) : ("SUITE", 500);
        }

        /// <summary>
        /// Handles HTTP GET requests to calculate tenant feature adoption telemetry, custom pricing/availability policies, and pagination.
        /// </summary>
        public async Task OnGetAsync()
        {
            if (ActiveTab != "tenants" && ActiveTab != "ranking")
            {
                ActiveTab = "tenants";
            }

            PageSize = PageSize switch { 10 => 10, 20 => 20, 50 => 50, _ => 10 };
            FeaturePageSize = FeaturePageSize switch { 10 => 10, 20 => 20, 50 => 50, _ => 10 };
            if (PageNumber < 1) PageNumber = 1;
            if (FeaturePageNumber < 1) FeaturePageNumber = 1;

            List<MasterTenantCatalog> allTenants;
            try
            {
                allTenants = await _dbContext.MasterTenantCatalogs
                    .AsNoTracking()
                    .Include(t => t.FeatureSubscriptions)
                        .ThenInclude(s => s.MasterFeatureCatalog)
                    .Where(t => !t.IsDeleted)
                    .OrderBy(t => t.OrganizationName)
                    .ToListAsync();
            }
            catch
            {
                // Graceful fallback if UseCustomPricing / UseCustomAvailability / IsAvailableForUseOverride columns are pending migration
                allTenants = await _dbContext.MasterTenantCatalogs
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
                        CreatedUtc = t.CreatedUtc,
                        LastAccessedUtc = t.LastAccessedUtc,
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
                            IsAvailableForUseOverride = null,
                            StartsAtUtc = s.StartsAtUtc,
                            ExpiresAtUtc = s.ExpiresAtUtc
                        }).ToList()
                    })
                    .ToListAsync();
            }

            TotalTenants = allTenants.Count;
            ActiveTenantsCount = allTenants.Count(t => t.IsActive && !t.IsSuspended);
            SuspendedTenantsCount = TotalTenants - ActiveTenantsCount;

            List<MasterFeatureCatalog> rawFeatures;
            bool usedFeatureFallback = false;
            try
            {
                rawFeatures = await _dbContext.MasterFeatureCatalogs
                    .AsNoTracking()
                    .Where(f => f.IsActive && f.IsPublished)
                    .ToListAsync();
            }
            catch
            {
                usedFeatureFallback = true;
                rawFeatures = await _dbContext.MasterFeatureCatalogs
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
                        IsCompulsory = f.IsCompulsory,
                        MonthlyPrice = f.MonthlyPrice,
                        QuarterlyPrice = f.QuarterlyPrice,
                        YearlyPrice = f.YearlyPrice,
                        IsActive = f.IsActive,
                        IsPublished = f.IsActive,
                        SortOrder = f.SortOrder
                    })
                    .ToListAsync();
            }

            if (usedFeatureFallback)
            {
                foreach (var f in rawFeatures)
                {
                    f.IsAvailableForUse = DefaultAvailableCodes.Contains(f.FeatureCode);
                    f.IsPublished = f.IsActive;
                }
            }

            var allFeatures = rawFeatures
                .OrderBy(f => GetSuiteMetadata(f.Category).Order)
                .ThenBy(f => f.SortOrder)
                .ThenBy(f => f.Name)
                .ToList();

            TotalCapabilities = allFeatures.Count;
            TotalCompulsoryFeatures = allFeatures.Count(f => f.IsCompulsory);
            TotalOptionalFeatures = allFeatures.Count(f => !f.IsCompulsory);
            AvailableForUseCount = allFeatures.Count(f => f.IsAvailableForUse);
            ComingSoonCount = TotalCapabilities - AvailableForUseCount;

            Categories = CanonicalSuites.Select(s => s.Name).ToList();

            // Load currency exchange rates for tenant default currency resolution
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

            // 1. Build All Tenants & Feature Usage Matrix
            var matrixList = new List<TenantFeatureUsageSummaryDto>();

            foreach (var tenant in allTenants)
            {
                var subsByFeatureId = tenant.FeatureSubscriptions
                    .GroupBy(s => s.MasterFeatureCatalogId)
                    .ToDictionary(g => g.Key, g => g.OrderByDescending(s => s.ExpiresAtUtc).First());

                var (usageLevel, usageColor) = DetermineUsageLevel(tenant.LastAccessedUtc, tenant.IsActive, tenant.IsSuspended);
                var isTenantIdle = usageLevel == "Dormant" || usageLevel == "Inactive" || usageLevel == "Suspended";
                var relativeTime = FormatRelativeTime(tenant.LastAccessedUtc);

                int activeCompulsoryCount = 0;
                int activeAddonCount = 0;
                int customPriceCount = 0;
                int customAvailCount = 0;
                decimal tenantMrr = 0.00m;
                var activeAddons = new List<ActiveFeaturePillDto>();
                var fullFeatureList = new List<TenantFeatureDetailDto>();

                foreach (var f in allFeatures)
                {
                    subsByFeatureId.TryGetValue(f.Id, out var sub);
                    // On setup, no feature is enabled by default. Only explicitly activated subscriptions are running.
                    bool isRunning = sub != null &&
                                     sub.IsActive &&
                                     !string.Equals(sub.Status, "Suspended", StringComparison.OrdinalIgnoreCase) &&
                                     !string.Equals(sub.Status, "Inactive", StringComparison.OrdinalIgnoreCase);

                    if (sub?.CustomPriceOverride != null) customPriceCount++;
                    if (sub?.IsAvailableForUseOverride != null) customAvailCount++;

                    decimal effectiveMonthly = (tenant.UseCustomPricing && sub?.CustomPriceOverride != null)
                        ? sub.CustomPriceOverride.Value
                        : (sub?.CustomPriceOverride ?? f.MonthlyPrice);

                    if (isRunning)
                    {
                        if (f.IsCompulsory)
                        {
                            activeCompulsoryCount++;
                            if (tenant.UseCustomPricing && sub?.CustomPriceOverride != null && sub.CustomPriceOverride.Value > 0)
                            {
                                tenantMrr += sub.CustomPriceOverride.Value;
                            }
                        }
                        else
                        {
                            activeAddonCount++;
                            decimal subPrice = (tenant.UseCustomPricing && sub?.CustomPriceOverride != null)
                                ? sub.CustomPriceOverride.Value
                                : (sub!.RecurringPrice > 0 ? sub.RecurringPrice : f.MonthlyPrice);

                            if (sub.DurationType == SubscriptionBillingDuration.Quarterly)
                                tenantMrr += subPrice / 3.0m;
                            else if (sub.DurationType == SubscriptionBillingDuration.Yearly)
                                tenantMrr += subPrice / 12.0m;
                            else
                                tenantMrr += subPrice;

                            activeAddons.Add(new ActiveFeaturePillDto
                            {
                                FeatureId = f.Id,
                                Name = f.Name,
                                FeatureCode = f.FeatureCode,
                                Category = f.Category,
                                Icon = string.IsNullOrEmpty(f.Icon) ? "extension" : f.Icon,
                                Price = subPrice,
                                Duration = sub.DurationType.ToString(),
                                IsIdle = isTenantIdle
                            });
                        }
                    }

                    bool isAvailForTenant = (tenant.UseCustomAvailability && sub?.IsAvailableForUseOverride != null)
                        ? sub.IsAvailableForUseOverride.Value
                        : f.IsAvailableForUse;

                    fullFeatureList.Add(new TenantFeatureDetailDto
                    {
                        FeatureId = f.Id,
                        Name = f.Name,
                        FeatureCode = f.FeatureCode,
                        Category = f.Category,
                        SuiteCode = GetSuiteMetadata(f.Category).Code,
                        Icon = string.IsNullOrEmpty(f.Icon) ? "extension" : f.Icon,
                        IsCompulsory = f.IsCompulsory,
                        IsActive = isRunning,
                        IsAvailableForUse = isAvailForTenant,
                        HasCustomPrice = sub?.CustomPriceOverride != null,
                        Status = isRunning ? (f.IsCompulsory ? "Active (Core)" : "Active (Subscribed)") : "Not Active",
                        MonthlyPrice = f.MonthlyPrice,
                        RecurringPrice = effectiveMonthly,
                        Duration = sub?.DurationType.ToString() ?? "Monthly",
                        ExpiresAtUtc = sub?.ExpiresAtUtc
                    });
                }

                var totalActiveCount = activeCompulsoryCount + activeAddonCount;
                var adoptionPercent = TotalCapabilities > 0 ? ((double)totalActiveCount / TotalCapabilities) * 100.0 : 0.0;

                var tenantCurrCode = string.IsNullOrWhiteSpace(tenant.DefaultCurrencyCode) ? "USD" : tenant.DefaultCurrencyCode.Trim().ToUpperInvariant();
                string tenantCurrSymbol = "$";
                decimal tenantCurrRate = 1.0m;
                if (currencyLookup.TryGetValue(tenantCurrCode, out var matchedRate))
                {
                    tenantCurrSymbol = matchedRate.CurrencySymbol;
                    tenantCurrRate = matchedRate.RateFromUsd > 0 ? matchedRate.RateFromUsd : 1.0m;
                }

                matrixList.Add(new TenantFeatureUsageSummaryDto
                {
                    TenantId = tenant.Id,
                    OrganizationName = tenant.OrganizationName,
                    TenantKey = tenant.TenantKey,
                    PrimaryDomain = tenant.PrimaryDomain,
                    AdminEmail = tenant.AdminEmail,
                    IsActive = tenant.IsActive,
                    IsSuspended = tenant.IsSuspended,
                    UseCustomPricing = tenant.UseCustomPricing || customPriceCount > 0,
                    CustomPricedFeaturesCount = customPriceCount,
                    UseCustomAvailability = tenant.UseCustomAvailability || customAvailCount > 0,
                    CustomAvailabilityFeaturesCount = customAvailCount,
                    DefaultCurrencyCode = tenantCurrCode,
                    CurrencySymbol = tenantCurrSymbol,
                    ExchangeRateFromUsd = tenantCurrRate,
                    CreatedUtc = tenant.CreatedUtc,
                    LastAccessedUtc = tenant.LastAccessedUtc,
                    LastUsedDisplay = relativeTime,
                    UsageLevel = usageLevel,
                    UsageLevelColor = usageColor,
                    CompulsoryFeaturesCount = activeCompulsoryCount,
                    SubscribedAddonsCount = activeAddonCount,
                    TotalActiveFeaturesCount = totalActiveCount,
                    InactiveFeaturesCount = Math.Max(0, TotalCapabilities - totalActiveCount),
                    AdoptionPercentage = adoptionPercent,
                    MonthlyRevenueMrr = Math.Round(tenantMrr, 2),
                    ActiveAddons = activeAddons,
                    AllFeaturesJson = JsonSerializer.Serialize(fullFeatureList, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase })
                });
            }

            // Global KPI counters
            PaidTierTenantsCount = matrixList.Count(t => t.MonthlyRevenueMrr > 0);
            FreeTierTenantsCount = matrixList.Count - PaidTierTenantsCount;
            CustomPricingTenantsCount = matrixList.Count(t => t.UseCustomPricing);
            CustomAvailabilityTenantsCount = matrixList.Count(t => t.UseCustomAvailability);
            TotalPaidAddonSubscriptions = matrixList.Sum(t => t.SubscribedAddonsCount);
            TotalSubscriptionMrr = matrixList.Sum(m => m.MonthlyRevenueMrr);
            AverageAdoptionRate = matrixList.Any() ? matrixList.Average(m => m.AdoptionPercentage) : 0.0;

            // Apply Tenant Matrix Search & Filters
            var filteredMatrix = matrixList.AsEnumerable();

            if (!string.IsNullOrWhiteSpace(TenantSearch))
            {
                var term = TenantSearch.Trim().ToLowerInvariant();
                filteredMatrix = filteredMatrix.Where(t =>
                    t.OrganizationName.ToLowerInvariant().Contains(term) ||
                    t.TenantKey.ToLowerInvariant().Contains(term) ||
                    t.PrimaryDomain.ToLowerInvariant().Contains(term) ||
                    (t.AdminEmail != null && t.AdminEmail.ToLowerInvariant().Contains(term)));
            }

            if (!string.IsNullOrWhiteSpace(UsageFilter) && !UsageFilter.Equals("All", StringComparison.OrdinalIgnoreCase))
            {
                filteredMatrix = filteredMatrix.Where(t => t.UsageLevel.Equals(UsageFilter, StringComparison.OrdinalIgnoreCase));
            }

            if (!string.IsNullOrWhiteSpace(PolicyFilter) && !PolicyFilter.Equals("All", StringComparison.OrdinalIgnoreCase))
            {
                filteredMatrix = PolicyFilter switch
                {
                    "CustomPricing" => filteredMatrix.Where(t => t.UseCustomPricing),
                    "GeneralPricing" => filteredMatrix.Where(t => !t.UseCustomPricing),
                    "CustomAvailability" => filteredMatrix.Where(t => t.UseCustomAvailability),
                    "PaidTier" => filteredMatrix.Where(t => t.MonthlyRevenueMrr > 0),
                    "FreeTier" => filteredMatrix.Where(t => t.MonthlyRevenueMrr <= 0),
                    _ => filteredMatrix
                };
            }

            AllTenantsFeatureMatrix = filteredMatrix
                .OrderByDescending(t => t.MonthlyRevenueMrr)
                .ThenByDescending(t => t.LastAccessedUtc ?? DateTime.MinValue)
                .ThenBy(t => t.OrganizationName)
                .ToList();

            TotalFilteredTenants = AllTenantsFeatureMatrix.Count;
            TotalTenantPages = Math.Max(1, (int)Math.Ceiling(TotalFilteredTenants / (double)PageSize));
            if (PageNumber > TotalTenantPages) PageNumber = TotalTenantPages;

            PaginatedTenants = AllTenantsFeatureMatrix
                .Skip((PageNumber - 1) * PageSize)
                .Take(PageSize)
                .ToList();

            // 2. Build Metrics for Each Capability (Tab 2)
            var activeSubscriptions = allTenants
                .SelectMany(t => t.FeatureSubscriptions)
                .Where(s => s.IsActive)
                .ToList();

            var subsByFeature = activeSubscriptions
                .GroupBy(s => s.MasterFeatureCatalogId)
                .ToDictionary(g => g.Key, g => g.ToList());

            var metricsList = new List<FeatureAdoptionMetricDto>();

            foreach (var feat in allFeatures)
            {
                subsByFeature.TryGetValue(feat.Id, out var subs);
                var subCount = subs?.Count ?? 0;

                var effectiveSubCount = subCount;
                var adoptionRate = TotalTenants > 0 ? ((double)effectiveSubCount / TotalTenants) * 100.0 : 0.0;

                decimal featureMrr = 0.00m;
                if (subs != null && subs.Any())
                {
                    foreach (var s in subs)
                    {
                        decimal price = s.CustomPriceOverride ?? (s.RecurringPrice > 0 ? s.RecurringPrice : feat.MonthlyPrice);
                        if (s.DurationType == SubscriptionBillingDuration.Quarterly)
                            featureMrr += price / 3.0m;
                        else if (s.DurationType == SubscriptionBillingDuration.Yearly)
                            featureMrr += price / 12.0m;
                        else
                            featureMrr += price;
                    }
                }

                string classification;
                string statusColor;

                if (feat.IsCompulsory)
                {
                    classification = "Compulsory Core";
                    statusColor = "#0050E5";
                }
                else if (adoptionRate >= 70.0)
                {
                    classification = "High Adoption";
                    statusColor = "#10b981";
                }
                else if (adoptionRate >= 30.0)
                {
                    classification = "Moderate";
                    statusColor = "#6366f1";
                }
                else if (subCount > 0)
                {
                    classification = "Growing";
                    statusColor = "#f59e0b";
                }
                else
                {
                    classification = "0 Subscribers";
                    statusColor = "#64748b";
                }

                var (suiteCode, _) = GetSuiteMetadata(feat.Category);

                metricsList.Add(new FeatureAdoptionMetricDto
                {
                    Feature = feat,
                    SuiteCode = suiteCode,
                    SubscribersCount = effectiveSubCount,
                    AdoptionRate = adoptionRate,
                    MonthlyRecurringRevenue = Math.Round(featureMrr, 2),
                    Classification = classification,
                    StatusColor = statusColor
                });
            }

            var filteredRanked = metricsList.AsEnumerable();

            if (!string.IsNullOrWhiteSpace(Search))
            {
                var term = Search.Trim().ToLowerInvariant();
                filteredRanked = filteredRanked.Where(m =>
                    m.Feature.Name.ToLowerInvariant().Contains(term) ||
                    m.Feature.FeatureCode.ToLowerInvariant().Contains(term) ||
                    m.Feature.Category.ToLowerInvariant().Contains(term));
            }

            if (!string.IsNullOrWhiteSpace(Category))
            {
                filteredRanked = filteredRanked.Where(m => m.Feature.Category.Equals(Category, StringComparison.OrdinalIgnoreCase));
            }

            RankedFeatures = filteredRanked.ToList();
            TotalFilteredFeatures = RankedFeatures.Count;
            TotalFeaturePages = Math.Max(1, (int)Math.Ceiling(TotalFilteredFeatures / (double)FeaturePageSize));
            if (FeaturePageNumber > TotalFeaturePages) FeaturePageNumber = TotalFeaturePages;

            PaginatedRankedFeatures = RankedFeatures
                .Skip((FeaturePageNumber - 1) * FeaturePageSize)
                .Take(FeaturePageSize)
                .ToList();
        }

        /// <summary>
        /// Classifies usage activity level from the last accessed timestamp and status.
        /// </summary>
        private static (string Level, string Color) DetermineUsageLevel(DateTime? lastAccessedUtc, bool isActive, bool isSuspended)
        {
            if (isSuspended) return ("Suspended", "#ef4444");
            if (!isActive) return ("Inactive", "#94a3b8");
            if (!lastAccessedUtc.HasValue) return ("Dormant", "#64748b");

            var diff = DateTime.UtcNow - lastAccessedUtc.Value;
            if (diff.TotalHours <= 24) return ("High Activity", "#10b981");
            if (diff.TotalDays <= 7) return ("Active", "#0050E5");
            if (diff.TotalDays <= 30) return ("Moderate", "#f59e0b");
            return ("Dormant", "#64748b");
        }

        /// <summary>
        /// Formats UTC timestamp into human-readable relative time string.
        /// </summary>
        private static string FormatRelativeTime(DateTime? utc)
        {
            if (!utc.HasValue) return "No recorded activity";
            var diff = DateTime.UtcNow - utc.Value;
            if (diff.TotalSeconds < 60) return "Just now";
            if (diff.TotalMinutes < 60) return $"{(int)diff.TotalMinutes}m ago";
            if (diff.TotalHours < 24) return $"{(int)diff.TotalHours}h ago";
            if (diff.TotalDays < 7) return $"{(int)diff.TotalDays}d ago";
            if (diff.TotalDays < 30) return $"{(int)(diff.TotalDays / 7)}w ago";
            return utc.Value.ToString("MMM dd, yyyy");
        }

        #region DTOs

        /// <summary>
        /// Data Transfer Object capturing aggregate feature usage, custom pricing/availability policies, and activity telemetry for a tenant.
        /// </summary>
        public class TenantFeatureUsageSummaryDto
        {
            public Guid TenantId { get; set; }
            public string OrganizationName { get; set; } = string.Empty;
            public string TenantKey { get; set; } = string.Empty;
            public string PrimaryDomain { get; set; } = string.Empty;
            public string? AdminEmail { get; set; }
            public bool IsActive { get; set; }
            public bool IsSuspended { get; set; }
            public bool UseCustomPricing { get; set; }
            public int CustomPricedFeaturesCount { get; set; }
            public bool UseCustomAvailability { get; set; }
            public int CustomAvailabilityFeaturesCount { get; set; }
            public string DefaultCurrencyCode { get; set; } = "USD";
            public string CurrencySymbol { get; set; } = "$";
            public decimal ExchangeRateFromUsd { get; set; } = 1.0m;
            public DateTime CreatedUtc { get; set; }
            public DateTime? LastAccessedUtc { get; set; }
            public string LastUsedDisplay { get; set; } = "Never";
            public string UsageLevel { get; set; } = "Dormant";
            public string UsageLevelColor { get; set; } = "#64748b";
            public int CompulsoryFeaturesCount { get; set; }
            public int SubscribedAddonsCount { get; set; }
            public int TotalActiveFeaturesCount { get; set; }
            public int InactiveFeaturesCount { get; set; }
            public double AdoptionPercentage { get; set; }
            public decimal MonthlyRevenueMrr { get; set; }
            public List<ActiveFeaturePillDto> ActiveAddons { get; set; } = new();
            public string AllFeaturesJson { get; set; } = "[]";
        }

        /// <summary>
        /// Compact representation of an active add-on capability for pill badges.
        /// </summary>
        public class ActiveFeaturePillDto
        {
            public Guid FeatureId { get; set; }
            public string Name { get; set; } = string.Empty;
            public string FeatureCode { get; set; } = string.Empty;
            public string Category { get; set; } = string.Empty;
            public string Icon { get; set; } = "extension";
            public decimal Price { get; set; }
            public string Duration { get; set; } = "Monthly";
            public bool IsIdle { get; set; }
        }

        /// <summary>
        /// Granular feature detail item for the client-side breakdown modal.
        /// </summary>
        public class TenantFeatureDetailDto
        {
            public Guid FeatureId { get; set; }
            public string Name { get; set; } = string.Empty;
            public string FeatureCode { get; set; } = string.Empty;
            public string Category { get; set; } = string.Empty;
            public string SuiteCode { get; set; } = "SUITE";
            public string Icon { get; set; } = "extension";
            public bool IsCompulsory { get; set; }
            public bool IsActive { get; set; }
            public bool IsAvailableForUse { get; set; }
            public bool HasCustomPrice { get; set; }
            public string Status { get; set; } = string.Empty;
            public decimal MonthlyPrice { get; set; }
            public decimal RecurringPrice { get; set; }
            public string Duration { get; set; } = "Monthly";
            public DateTime? ExpiresAtUtc { get; set; }
        }

        /// <summary>
        /// Data Transfer Object capturing individual feature adoption and revenue metrics.
        /// </summary>
        public class FeatureAdoptionMetricDto
        {
            public MasterFeatureCatalog Feature { get; set; } = null!;
            public string SuiteCode { get; set; } = "SUITE";
            public int SubscribersCount { get; set; }
            public double AdoptionRate { get; set; }
            public decimal MonthlyRecurringRevenue { get; set; }
            public string Classification { get; set; } = "Moderate";
            public string StatusColor { get; set; } = "#0050E5";
        }

        /// <summary>
        /// Category distribution summary item.
        /// </summary>
        public class CategoryDistributionDto
        {
            public string CategoryName { get; set; } = string.Empty;
            public string Color { get; set; } = "#64748b";
            public int FeatureCount { get; set; }
            public double PercentageOfTotal { get; set; }
            public int TotalSubscribers { get; set; }
            public decimal TotalMrr { get; set; }
            public double AverageAdoption { get; set; }
        }

        #endregion
    }
}
