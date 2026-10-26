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
    /// PageModel providing comprehensive tenant feature adoption telemetry, running capability tracking,
    /// activity usage levels, last used timestamps, and recurring subscription revenue (MRR) analytics.
    /// </summary>
    public class AnalyticsModel : PageModel
    {
        private readonly MasterCatalogDbContext _dbContext;

        /// <summary>
        /// Initializes a new instance of the <see cref="AnalyticsModel"/> class.
        /// </summary>
        /// <param name="dbContext">Master catalog database context.</param>
        public AnalyticsModel(MasterCatalogDbContext dbContext)
        {
            _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
        }

        /// <summary>
        /// Search keyword filter for feature name, code, or description.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? Search { get; set; }

        /// <summary>
        /// Search keyword filter for tenant organization or domain.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? TenantSearch { get; set; }

        /// <summary>
        /// Category / Suite filter.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? Category { get; set; }

        /// <summary>
        /// Usage activity level filter (e.g. All, High, Active, Moderate, Dormant).
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? UsageFilter { get; set; }

        /// <summary>
        /// Active navigation tab (tenants, ranking, inspector).
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string ActiveTab { get; set; } = "tenants";

        /// <summary>
        /// Total capabilities in catalog (e.g. 37).
        /// </summary>
        public int TotalCapabilities { get; set; }

        /// <summary>
        /// Total compulsory base capabilities (e.g. 27).
        /// </summary>
        public int TotalCompulsoryFeatures { get; set; }

        /// <summary>
        /// Total optional add-on capabilities (e.g. 10).
        /// </summary>
        public int TotalOptionalFeatures { get; set; }

        /// <summary>
        /// Total active tenant organizations in master catalog.
        /// </summary>
        public int TotalTenants { get; set; }

        /// <summary>
        /// Platform-wide average feature adoption percentage.
        /// </summary>
        public double AverageAdoptionRate { get; set; }

        /// <summary>
        /// Total monthly recurring revenue generated from paid feature subscriptions (MRR in USD).
        /// </summary>
        public decimal TotalSubscriptionMrr { get; set; }

        /// <summary>
        /// Selected tenant organization ID for granular deep-dive inspection.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public Guid? SelectedTenantId { get; set; }

        /// <summary>
        /// Selectable list of tenant organizations across the platform.
        /// </summary>
        public List<MasterTenantCatalog> TenantOptions { get; set; } = new();

        /// <summary>
        /// Currently inspected tenant catalog entity.
        /// </summary>
        public MasterTenantCatalog? InspectedTenant { get; set; }

        /// <summary>
        /// Granular list of all tenants with their running features and activity levels.
        /// </summary>
        public List<TenantFeatureUsageSummaryDto> AllTenantsFeatureMatrix { get; set; } = new();

        /// <summary>
        /// Features currently active for the inspected tenant organization.
        /// </summary>
        public List<TenantFeatureUsageItemDto> TenantActiveFeatures { get; set; } = new();

        /// <summary>
        /// Features utilized, subscribed, or tested by the inspected tenant in the last 365 days.
        /// </summary>
        public List<TenantFeatureUsageItemDto> Tenant365DayUsageHistory { get; set; } = new();

        /// <summary>
        /// Count of high-performing features (adoption >= 70%).
        /// </summary>
        public int HighPerformingCount { get; set; }

        /// <summary>
        /// Count of moderate-performing features (adoption between 30% and 69%).
        /// </summary>
        public int ModerateCount { get; set; }

        /// <summary>
        /// Count of underperforming features (adoption between 1% and 29%).
        /// </summary>
        public int UnderperformingCount { get; set; }

        /// <summary>
        /// Count of zero-adoption features (0 subscribers).
        /// </summary>
        public int ZeroAdoptionCount { get; set; }

        /// <summary>
        /// The most adopted optional feature across tenants.
        /// </summary>
        public FeatureAdoptionMetricDto? TopPerformingFeature { get; set; }

        /// <summary>
        /// The least adopted optional feature across tenants.
        /// </summary>
        public FeatureAdoptionMetricDto? LowestPerformingFeature { get; set; }

        /// <summary>
        /// List of distinct categories for filtering.
        /// </summary>
        public List<string> Categories { get; set; } = new();

        /// <summary>
        /// Granular list of all features with adoption and revenue metrics.
        /// </summary>
        public List<FeatureAdoptionMetricDto> RankedFeatures { get; set; } = new();

        /// <summary>
        /// Category-level distribution items for summary metrics and visualizations.
        /// </summary>
        public List<CategoryDistributionDto> CategoryDistributions { get; set; } = new();

        /// <summary>
        /// Handles HTTP GET requests to calculate tenant feature adoption telemetry and prepare visualization datasets.
        /// </summary>
        public async Task OnGetAsync()
        {
            var allTenants = await _dbContext.MasterTenantCatalogs
                .AsNoTracking()
                .Include(t => t.FeatureSubscriptions)
                    .ThenInclude(s => s.MasterFeatureCatalog)
                .Where(t => !t.IsDeleted)
                .OrderBy(t => t.OrganizationName)
                .ToListAsync();

            TotalTenants = allTenants.Count;
            TenantOptions = allTenants.Where(t => t.IsActive).ToList();

            var allFeatures = await _dbContext.MasterFeatureCatalogs
                .AsNoTracking()
                .OrderBy(f => f.SortOrder)
                .ToListAsync();

            TotalCapabilities = allFeatures.Count;
            TotalCompulsoryFeatures = allFeatures.Count(f => f.IsCompulsory);
            TotalOptionalFeatures = allFeatures.Count(f => !f.IsCompulsory);

            Categories = allFeatures.Select(f => f.Category).Distinct().OrderBy(c => c).ToList();

            // 1. Build All Tenants & Feature Usage Matrix
            var matrixList = new List<TenantFeatureUsageSummaryDto>();
            var now = DateTime.UtcNow;

            foreach (var tenant in allTenants)
            {
                var activeSubs = tenant.FeatureSubscriptions.Where(s => s.IsActive).ToList();
                var subscribedFeatureIds = new HashSet<Guid>(activeSubs.Select(s => s.MasterFeatureCatalogId));

                var (usageLevel, usageColor) = DetermineUsageLevel(tenant.LastAccessedUtc, tenant.IsActive, tenant.IsSuspended);
                var isTenantIdle = usageLevel == "Dormant" || usageLevel == "Inactive" || usageLevel == "Suspended";
                var relativeTime = FormatRelativeTime(tenant.LastAccessedUtc);

                // Running Add-ons
                var activeAddons = allFeatures
                    .Where(f => !f.IsCompulsory && subscribedFeatureIds.Contains(f.Id))
                    .Select(f =>
                    {
                        var sub = activeSubs.First(s => s.MasterFeatureCatalogId == f.Id);
                        return new ActiveFeaturePillDto
                        {
                            FeatureId = f.Id,
                            Name = f.Name,
                            FeatureCode = f.FeatureCode,
                            Category = f.Category,
                            Icon = string.IsNullOrEmpty(f.Icon) ? "extension" : f.Icon,
                            Price = sub.RecurringPrice,
                            Duration = sub.DurationType.ToString(),
                            IsIdle = isTenantIdle
                        };
                    }).ToList();

                var compulsoryCount = TotalCompulsoryFeatures;
                var addonCount = activeAddons.Count;
                var totalActiveCount = compulsoryCount + addonCount;
                var adoptionPercent = TotalCapabilities > 0 ? ((double)totalActiveCount / TotalCapabilities) * 100.0 : 0.0;

                // MRR for this tenant
                decimal tenantMrr = 0.00m;
                foreach (var s in activeSubs)
                {
                    if (s.DurationType == SubscriptionBillingDuration.Monthly)
                    {
                        tenantMrr += s.RecurringPrice;
                    }
                    else if (s.DurationType == SubscriptionBillingDuration.Quarterly)
                    {
                        tenantMrr += s.RecurringPrice / 3.0m;
                    }
                    else if (s.DurationType == SubscriptionBillingDuration.Yearly)
                    {
                        tenantMrr += s.RecurringPrice / 12.0m;
                    }
                }

                // Build complete list of 37 features for zero-reload modal breakdown
                var fullFeatureList = allFeatures.Select(f =>
                {
                    var isSubscribed = subscribedFeatureIds.Contains(f.Id);
                    var isRunning = f.IsCompulsory || isSubscribed;
                    var sub = activeSubs.FirstOrDefault(s => s.MasterFeatureCatalogId == f.Id);

                    return new TenantFeatureDetailDto
                    {
                        FeatureId = f.Id,
                        Name = f.Name,
                        FeatureCode = f.FeatureCode,
                        Category = f.Category,
                        Icon = string.IsNullOrEmpty(f.Icon) ? "extension" : f.Icon,
                        IsCompulsory = f.IsCompulsory,
                        IsActive = isRunning,
                        Status = isRunning ? (f.IsCompulsory ? "Included Base" : "Subscribed") : "Not Subscribed",
                        MonthlyPrice = f.MonthlyPrice,
                        RecurringPrice = sub?.RecurringPrice ?? 0.00m,
                        Duration = sub?.DurationType.ToString() ?? "Monthly",
                        ExpiresAtUtc = sub?.ExpiresAtUtc
                    };
                }).OrderBy(f => f.Category).ThenBy(f => f.Name).ToList();

                matrixList.Add(new TenantFeatureUsageSummaryDto
                {
                    TenantId = tenant.Id,
                    OrganizationName = tenant.OrganizationName,
                    TenantKey = tenant.TenantKey,
                    PrimaryDomain = tenant.PrimaryDomain,
                    AdminEmail = tenant.AdminEmail,
                    IsActive = tenant.IsActive,
                    IsSuspended = tenant.IsSuspended,
                    CreatedUtc = tenant.CreatedUtc,
                    LastAccessedUtc = tenant.LastAccessedUtc,
                    LastUsedDisplay = relativeTime,
                    UsageLevel = usageLevel,
                    UsageLevelColor = usageColor,
                    CompulsoryFeaturesCount = compulsoryCount,
                    SubscribedAddonsCount = addonCount,
                    TotalActiveFeaturesCount = totalActiveCount,
                    AdoptionPercentage = adoptionPercent,
                    MonthlyRevenueMrr = tenantMrr,
                    ActiveAddons = activeAddons,
                    AllFeaturesJson = JsonSerializer.Serialize(fullFeatureList, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase })
                });
            }

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

            AllTenantsFeatureMatrix = filteredMatrix
                .OrderByDescending(t => t.LastAccessedUtc ?? DateTime.MinValue)
                .ThenBy(t => t.OrganizationName)
                .ToList();

            // 2. Load all active subscriptions across the platform for feature-level metrics
            var activeSubscriptions = allTenants
                .SelectMany(t => t.FeatureSubscriptions)
                .Where(s => s.IsActive)
                .ToList();

            var subsByFeature = activeSubscriptions
                .GroupBy(s => s.MasterFeatureCatalogId)
                .ToDictionary(g => g.Key, g => g.ToList());

            // Build metrics for each feature
            var metricsList = new List<FeatureAdoptionMetricDto>();

            foreach (var feat in allFeatures)
            {
                subsByFeature.TryGetValue(feat.Id, out var subs);
                var subCount = subs?.Count ?? 0;
                
                // If compulsory, every active tenant is an active user
                var effectiveSubCount = feat.IsCompulsory ? TotalTenants : subCount;
                var adoptionRate = TotalTenants > 0 ? ((double)effectiveSubCount / TotalTenants) * 100.0 : 0.0;

                // Calculate Monthly Equivalent Revenue (MRR)
                decimal featureMrr = 0.00m;
                if (subs != null && subs.Any())
                {
                    foreach (var s in subs)
                    {
                        if (s.DurationType == SubscriptionBillingDuration.Monthly)
                        {
                            featureMrr += s.RecurringPrice;
                        }
                        else if (s.DurationType == SubscriptionBillingDuration.Quarterly)
                        {
                            featureMrr += s.RecurringPrice / 3.0m;
                        }
                        else if (s.DurationType == SubscriptionBillingDuration.Yearly)
                        {
                            featureMrr += s.RecurringPrice / 12.0m;
                        }
                    }
                }

                string classification;
                string statusColor;

                if (feat.IsCompulsory)
                {
                    classification = "Compulsory Base";
                    statusColor = "#3b82f6"; // Blue
                }
                else if (adoptionRate >= 70.0)
                {
                    classification = "High Performing";
                    statusColor = "#10b981"; // Emerald
                }
                else if (adoptionRate >= 30.0)
                {
                    classification = "Moderate";
                    statusColor = "#6366f1"; // Indigo
                }
                else if (subCount > 0)
                {
                    classification = "Underperforming";
                    statusColor = "#f59e0b"; // Amber
                }
                else
                {
                    classification = "Zero Adoption";
                    statusColor = "#64748b"; // Slate
                }

                var activeLiveCount = subs?.Count(s =>
                {
                    var t = allTenants.FirstOrDefault(x => x.Id == s.MasterTenantCatalogId);
                    return t != null && t.IsActive && !t.IsSuspended && t.LastAccessedUtc.HasValue && (DateTime.UtcNow - t.LastAccessedUtc.Value).TotalDays <= 30;
                }) ?? 0;

                metricsList.Add(new FeatureAdoptionMetricDto
                {
                    Feature = feat,
                    SubscribersCount = effectiveSubCount,
                    ActiveLiveUsageCount = activeLiveCount,
                    AdoptionRate = adoptionRate,
                    MonthlyRecurringRevenue = featureMrr,
                    Classification = classification,
                    StatusColor = statusColor
                });
            }

            // Summary metrics
            TotalSubscriptionMrr = matrixList.Sum(m => m.MonthlyRevenueMrr);
            AverageAdoptionRate = matrixList.Any() ? matrixList.Average(m => m.AdoptionPercentage) : 0.0;

            HighPerformingCount = metricsList.Count(m => !m.Feature.IsCompulsory && m.AdoptionRate >= 70.0);
            ModerateCount = metricsList.Count(m => !m.Feature.IsCompulsory && m.AdoptionRate >= 30.0 && m.AdoptionRate < 70.0);
            UnderperformingCount = metricsList.Count(m => !m.Feature.IsCompulsory && m.SubscribersCount > 0 && m.AdoptionRate < 30.0);
            ZeroAdoptionCount = metricsList.Count(m => !m.Feature.IsCompulsory && m.SubscribersCount == 0);

            // Top performing optional feature strictly requires active subscribers AND confirmed live usage activity
            TopPerformingFeature = metricsList
                .Where(m => !m.Feature.IsCompulsory && m.SubscribersCount > 0 && m.ActiveLiveUsageCount > 0)
                .OrderByDescending(m => m.AdoptionRate)
                .ThenByDescending(m => m.MonthlyRecurringRevenue)
                .FirstOrDefault();

            LowestPerformingFeature = metricsList
                .Where(m => !m.Feature.IsCompulsory && m.SubscribersCount > 0)
                .OrderBy(m => m.AdoptionRate)
                .ThenBy(m => m.SubscribersCount)
                .FirstOrDefault();

            // Category Distributions
            var categoryColors = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            {
                { "People, Community & Collaboration", "#3b82f6" },
                { "Workforce, Rota & Scheduling", "#10b981" },
                { "Reports, Forms & Analytics", "#8b5cf6" },
                { "Events & Training Management", "#f59e0b" },
                { "Finance & Commercial Revenue", "#06b6d4" },
                { "Operations & Workflows", "#ec4899" },
                { "Communication, AI & Support", "#14b8a6" },
                { "Compliance, Learning & Certification", "#f97316" },
                { "Demographics & Civic Census", "#6366f1" },
                { "Life Events & Publications", "#e11d48" }
            };

            var catGroups = metricsList.GroupBy(m => m.Feature.Category).ToList();
            var totalFeaturesCount = metricsList.Count;

            CategoryDistributions = catGroups.Select(g =>
            {
                var catName = g.Key;
                var color = categoryColors.TryGetValue(catName, out var col) ? col : "#64748b";
                var catMrr = g.Sum(x => x.MonthlyRecurringRevenue);
                var catSubCount = g.Sum(x => x.SubscribersCount);
                var avgRate = g.Average(x => x.AdoptionRate);

                return new CategoryDistributionDto
                {
                    CategoryName = catName,
                    Color = color,
                    FeatureCount = g.Count(),
                    PercentageOfTotal = totalFeaturesCount > 0 ? ((double)g.Count() / totalFeaturesCount) * 100.0 : 0.0,
                    TotalSubscribers = catSubCount,
                    TotalMrr = catMrr,
                    AverageAdoption = avgRate
                };
            }).OrderByDescending(c => c.TotalMrr).ThenByDescending(c => c.AverageAdoption).ToList();

            // Filter for Ranked Features Table
            var filteredRanked = metricsList.AsEnumerable();

            if (!string.IsNullOrWhiteSpace(Search))
            {
                var term = Search.Trim().ToLowerInvariant();
                filteredRanked = filteredRanked.Where(m =>
                    m.Feature.Name.ToLowerInvariant().Contains(term) ||
                    m.Feature.FeatureCode.ToLowerInvariant().Contains(term) ||
                    (m.Feature.Description != null && m.Feature.Description.ToLowerInvariant().Contains(term)));
            }

            if (!string.IsNullOrWhiteSpace(Category))
            {
                filteredRanked = filteredRanked.Where(m => m.Feature.Category.Equals(Category, StringComparison.OrdinalIgnoreCase));
            }

            RankedFeatures = filteredRanked
                .OrderByDescending(m => m.AdoptionRate)
                .ThenByDescending(m => m.MonthlyRecurringRevenue)
                .ThenBy(m => m.Feature.Name)
                .ToList();

            // 3. Load Selected Tenant for Deep-Dive Inspector
            if (TenantOptions.Any())
            {
                var targetTenantId = SelectedTenantId ?? TenantOptions.First().Id;
                InspectedTenant = allTenants.FirstOrDefault(t => t.Id == targetTenantId) ?? TenantOptions.First();
                SelectedTenantId = InspectedTenant.Id;

                var tenantSubscriptions = InspectedTenant.FeatureSubscriptions.ToList();
                var subscribedMap = tenantSubscriptions.ToDictionary(s => s.MasterFeatureCatalogId);

                // Build active features for inspected tenant (Compulsory + Subscribed Add-ons)
                TenantActiveFeatures = allFeatures
                    .Where(f => f.IsCompulsory || subscribedMap.ContainsKey(f.Id))
                    .Select(f =>
                    {
                        var isSub = subscribedMap.TryGetValue(f.Id, out var sub);
                        var active = f.IsCompulsory || (sub?.IsActive ?? false);

                        return new TenantFeatureUsageItemDto
                        {
                            SubscriptionId = sub?.Id ?? Guid.Empty,
                            Feature = f,
                            Status = active ? (f.IsCompulsory ? "Compulsory Base" : "Active Subscription") : "Inactive",
                            IsActive = active,
                            BillingDuration = sub?.DurationType.ToString() ?? "Included",
                            RecurringPrice = sub?.RecurringPrice ?? 0.00m,
                            ActivatedUtc = sub?.StartsAtUtc ?? InspectedTenant.CreatedUtc,
                            ExpiresUtc = sub?.ExpiresAtUtc,
                            LastAccessedUtc = InspectedTenant.LastAccessedUtc ?? InspectedTenant.CreatedUtc,
                            DaysActive = (int)Math.Max(1, (DateTime.UtcNow - (sub?.StartsAtUtc ?? InspectedTenant.CreatedUtc)).TotalDays)
                        };
                    })
                    .OrderByDescending(f => f.Feature.IsCompulsory)
                    .ThenBy(f => f.Feature.Category)
                    .ThenBy(f => f.Feature.Name)
                    .ToList();

                // 365-Day Historical Telemetry
                var cutoffDate = DateTime.UtcNow.AddDays(-365);
                Tenant365DayUsageHistory = tenantSubscriptions
                    .Where(s => s.CreatedUtc >= cutoffDate || s.ExpiresAtUtc >= cutoffDate || s.IsActive)
                    .Select(s => new TenantFeatureUsageItemDto
                    {
                        SubscriptionId = s.Id,
                        Feature = s.MasterFeatureCatalog,
                        Status = s.Status ?? (s.IsActive ? "Active" : "Expired"),
                        IsActive = s.IsActive,
                        BillingDuration = s.DurationType.ToString(),
                        RecurringPrice = s.RecurringPrice,
                        ActivatedUtc = s.StartsAtUtc,
                        ExpiresUtc = s.ExpiresAtUtc,
                        LastAccessedUtc = InspectedTenant.LastAccessedUtc ?? s.CreatedUtc,
                        DaysActive = (int)Math.Max(1, ((s.ExpiresAtUtc < DateTime.UtcNow ? s.ExpiresAtUtc : DateTime.UtcNow) - s.StartsAtUtc).TotalDays)
                    })
                    .OrderByDescending(f => f.IsActive)
                    .ThenByDescending(f => f.ActivatedUtc)
                    .ToList();
            }
        }

        /// <summary>
        /// Classifies usage activity level from the last accessed timestamp and status.
        /// </summary>
        private static (string Level, string Color) DetermineUsageLevel(DateTime? lastAccessedUtc, bool isActive, bool isSuspended)
        {
            if (isSuspended)
            {
                return ("Suspended", "#ef4444"); // Red
            }

            if (!isActive)
            {
                return ("Inactive", "#94a3b8"); // Slate
            }

            if (!lastAccessedUtc.HasValue)
            {
                return ("Dormant", "#64748b"); // Slate
            }

            var diff = DateTime.UtcNow - lastAccessedUtc.Value;

            if (diff.TotalHours <= 24)
            {
                return ("High Activity", "#10b981"); // Green
            }

            if (diff.TotalDays <= 7)
            {
                return ("Active", "#3b82f6"); // Blue
            }

            if (diff.TotalDays <= 30)
            {
                return ("Moderate", "#f59e0b"); // Amber
            }

            return ("Dormant", "#64748b"); // Slate
        }

        /// <summary>
        /// Formats UTC timestamp into human-readable relative time string.
        /// </summary>
        private static string FormatRelativeTime(DateTime? utc)
        {
            if (!utc.HasValue)
            {
                return "No recorded activity";
            }

            var diff = DateTime.UtcNow - utc.Value;

            if (diff.TotalSeconds < 60)
            {
                return "Just now";
            }
            if (diff.TotalMinutes < 60)
            {
                var mins = (int)diff.TotalMinutes;
                return $"{mins} min{(mins > 1 ? "s" : "")} ago";
            }
            if (diff.TotalHours < 24)
            {
                var hours = (int)diff.TotalHours;
                return $"{hours} hour{(hours > 1 ? "s" : "")} ago";
            }
            if (diff.TotalDays < 7)
            {
                var days = (int)diff.TotalDays;
                return $"{days} day{(days > 1 ? "s" : "")} ago";
            }
            if (diff.TotalDays < 30)
            {
                var weeks = (int)(diff.TotalDays / 7);
                return $"{weeks} week{(weeks > 1 ? "s" : "")} ago";
            }

            return utc.Value.ToString("MMM dd, yyyy");
        }

        #region DTOs

        /// <summary>
        /// Data Transfer Object capturing aggregate feature usage and activity telemetry for a tenant.
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
            public DateTime CreatedUtc { get; set; }
            public DateTime? LastAccessedUtc { get; set; }
            public string LastUsedDisplay { get; set; } = "Never";
            public string UsageLevel { get; set; } = "Dormant";
            public string UsageLevelColor { get; set; } = "#64748b";
            public int CompulsoryFeaturesCount { get; set; }
            public int SubscribedAddonsCount { get; set; }
            public int TotalActiveFeaturesCount { get; set; }
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
            public string Icon { get; set; } = "extension";
            public bool IsCompulsory { get; set; }
            public bool IsActive { get; set; }
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
            public int SubscribersCount { get; set; }
            public int ActiveLiveUsageCount { get; set; }
            public double AdoptionRate { get; set; }
            public decimal MonthlyRecurringRevenue { get; set; }
            public string Classification { get; set; } = "Moderate";
            public string StatusColor { get; set; } = "#3b82f6";
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

        /// <summary>
        /// Telemetry item for tenant's feature subscriptions.
        /// </summary>
        public class TenantFeatureUsageItemDto
        {
            public Guid SubscriptionId { get; set; }
            public MasterFeatureCatalog Feature { get; set; } = null!;
            public string Status { get; set; } = "Active";
            public bool IsActive { get; set; }
            public string BillingDuration { get; set; } = "Monthly";
            public decimal RecurringPrice { get; set; }
            public DateTime ActivatedUtc { get; set; }
            public DateTime? ExpiresUtc { get; set; }
            public DateTime? LastAccessedUtc { get; set; }
            public int DaysActive { get; set; }
        }

        #endregion
    }
}
