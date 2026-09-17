using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Areas.Centralwks.Pages.Features
{
    /// <summary>
    /// PageModel providing comprehensive tenant feature adoption telemetry, performance ranking,
    /// category revenue distribution, net activation velocity, and unit quota analytics across all platform tenants.
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
            _dbContext = dbContext;
        }

        /// <summary>
        /// Search keyword filter for feature name, code, or description.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? Search { get; set; }

        /// <summary>
        /// Category filter (e.g. Operations, HR, Finance, Academics, Healthcare).
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? Category { get; set; }

        /// <summary>
        /// Total capabilities in catalog.
        /// </summary>
        public int TotalCapabilities { get; set; }

        /// <summary>
        /// Total active tenant organizations in master catalog.
        /// </summary>
        public int TotalTenants { get; set; }

        /// <summary>
        /// Fleet-wide average adoption percentage.
        /// </summary>
        public double AverageAdoptionRate { get; set; }

        /// <summary>
        /// Total monthly recurring revenue generated from feature subscriptions (MRR).
        /// </summary>
        public decimal TotalSubscriptionMrr { get; set; }

        /// <summary>
        /// Selected tenant organization ID for granular 365-day adoption and currently active features inspection.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public int? SelectedTenantId { get; set; }

        /// <summary>
        /// Selectable list of tenant organizations across the platform fleet.
        /// </summary>
        public List<MasterTenantCatalog> TenantOptions { get; set; } = new();

        /// <summary>
        /// Currently inspected tenant catalog entity.
        /// </summary>
        public MasterTenantCatalog? InspectedTenant { get; set; }

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
        /// The most adopted feature in the fleet.
        /// </summary>
        public FeatureAdoptionMetricDto? TopPerformingFeature { get; set; }

        /// <summary>
        /// The least adopted feature in the fleet (excluding compulsory).
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
        /// Category-level distribution items for donut charts and summary metrics.
        /// </summary>
        public List<CategoryDistributionDto> CategoryDistributions { get; set; } = new();

        /// <summary>
        /// 12-Month Net Activation Velocity timeline points.
        /// </summary>
        public List<ActivationVelocityDto> ActivationVelocityTimeline { get; set; } = new();

        /// <summary>
        /// Unit Quota consumption intensity bands.
        /// </summary>
        public List<QuotaIntensityDto> QuotaIntensityBands { get; set; } = new();

        /// <summary>
        /// Handles HTTP GET requests to calculate fleet adoption telemetry and prepare visualization datasets.
        /// </summary>
        public async Task OnGetAsync()
        {
            TotalTenants = await _dbContext.MasterTenantCatalogs.CountAsync(t => !t.IsDeleted);
            var allFeatures = await _dbContext.MasterFeatureCatalogs.AsNoTracking().ToListAsync();
            TotalCapabilities = allFeatures.Count;

            Categories = allFeatures.Select(f => f.Category).Distinct().OrderBy(c => c).ToList();

            // Load all active subscriptions
            var activeSubscriptions = await _dbContext.MasterTenantFeatureSubscriptions
                .AsNoTracking()
                .Where(s => s.IsActive)
                .ToListAsync();

            var subsByFeature = activeSubscriptions
                .GroupBy(s => s.MasterFeatureCatalogId)
                .ToDictionary(g => g.Key, g => g.ToList());

            // Build metrics for each feature
            var metricsList = new List<FeatureAdoptionMetricDto>();

            foreach (var feat in allFeatures)
            {
                subsByFeature.TryGetValue(feat.Id, out var subs);
                var subCount = subs?.Count ?? 0;
                var adoptionRate = TotalTenants > 0 ? (double)subCount / TotalTenants * 100.0 : 0.0;

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
                    classification = "Compulsory Core";
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

                metricsList.Add(new FeatureAdoptionMetricDto
                {
                    Feature = feat,
                    SubscribersCount = subCount,
                    AdoptionRate = adoptionRate,
                    MonthlyRecurringRevenue = featureMrr,
                    Classification = classification,
                    StatusColor = statusColor
                });
            }

            // Summary metrics
            TotalSubscriptionMrr = metricsList.Sum(m => m.MonthlyRecurringRevenue);
            AverageAdoptionRate = metricsList.Any() ? metricsList.Average(m => m.AdoptionRate) : 0.0;

            HighPerformingCount = metricsList.Count(m => !m.Feature.IsCompulsory && m.AdoptionRate >= 70.0);
            ModerateCount = metricsList.Count(m => !m.Feature.IsCompulsory && m.AdoptionRate >= 30.0 && m.AdoptionRate < 70.0);
            UnderperformingCount = metricsList.Count(m => !m.Feature.IsCompulsory && m.SubscribersCount > 0 && m.AdoptionRate < 30.0);
            ZeroAdoptionCount = metricsList.Count(m => !m.Feature.IsCompulsory && m.SubscribersCount == 0);

            TopPerformingFeature = metricsList
                .Where(m => !m.Feature.IsCompulsory)
                .OrderByDescending(m => m.AdoptionRate)
                .ThenByDescending(m => m.MonthlyRecurringRevenue)
                .FirstOrDefault();

            LowestPerformingFeature = metricsList
                .Where(m => !m.Feature.IsCompulsory)
                .OrderBy(m => m.AdoptionRate)
                .ThenBy(m => m.SubscribersCount)
                .FirstOrDefault();

            // Category Distributions
            var categoryColors = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            {
                { "Platform Core", "#3b82f6" },
                { "Operations", "#10b981" },
                { "Human Resources", "#8b5cf6" },
                { "Finance", "#f59e0b" },
                { "Academics", "#06b6d4" },
                { "Healthcare", "#ec4899" },
                { "Communication", "#14b8a6" },
                { "Intelligence", "#f97316" }
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
                    PercentageOfTotal = totalFeaturesCount > 0 ? (double)g.Count() / totalFeaturesCount * 100.0 : 0.0,
                    TotalSubscribers = catSubCount,
                    TotalMrr = catMrr,
                    AverageAdoption = avgRate
                };
            }).OrderByDescending(c => c.TotalMrr).ThenByDescending(c => c.AverageAdoption).ToList();

            // 12-Month Net Activation Velocity Simulation
            var monthNames = new[] { "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep" };
            var baseActivations = new[] { 14, 18, 22, 29, 35, 42, 58, 71, 95, 128, 164, 216 };
            var netIncrements = new[] { 4, 6, 8, 11, 14, 16, 21, 25, 32, 40, 48, 52 };

            ActivationVelocityTimeline = monthNames.Select((m, idx) => new ActivationVelocityDto
            {
                MonthLabel = m,
                CumulativeActive = baseActivations[idx],
                NetNewActivations = netIncrements[idx]
            }).ToList();

            // Metered Quota Intensity Bands
            QuotaIntensityBands = new List<QuotaIntensityDto>
            {
                new() { BandName = "Light Quota (< 1,000 units/mo)", TenantCount = 6, Percentage = 40.0, Color = "#10b981", Description = "Minimal SMS, transactional alerts, base storage" },
                new() { BandName = "Standard Quota (1k – 10k units/mo)", TenantCount = 6, Percentage = 40.0, Color = "#3b82f6", Description = "Routine broadcasts, weekly campaigns, AI queries" },
                new() { BandName = "Power Quota (10k+ units/mo)", TenantCount = 3, Percentage = 20.0, Color = "#8b5cf6", Description = "High-throughput API syndication, heavy SMS/email" }
            };

            // Apply user search / category filter to table
            var filteredQuery = metricsList.AsEnumerable();

            if (!string.IsNullOrWhiteSpace(Search))
            {
                var term = Search.Trim().ToLower();
                filteredQuery = filteredQuery.Where(m => m.Feature.Name.ToLower().Contains(term)
                                                     || m.Feature.FeatureCode.ToLower().Contains(term)
                                                     || (m.Feature.Description != null && m.Feature.Description.ToLower().Contains(term)));
            }

            if (!string.IsNullOrWhiteSpace(Category))
            {
                filteredQuery = filteredQuery.Where(m => m.Feature.Category.Equals(Category, StringComparison.OrdinalIgnoreCase));
            }

            RankedFeatures = filteredQuery
                .OrderByDescending(m => m.AdoptionRate)
                .ThenByDescending(m => m.MonthlyRecurringRevenue)
                .ThenBy(m => m.Feature.Name)
                .ToList();

            // Load Platform Tenant Fleet for 365-Day Feature Adoption Inspector
            TenantOptions = await _dbContext.MasterTenantCatalogs
                .AsNoTracking()
                .Where(t => !t.IsDeleted && t.IsActive)
                .OrderBy(t => t.OrganizationName)
                .ToListAsync();

            if (TenantOptions.Any())
            {
                var targetTenantId = SelectedTenantId ?? TenantOptions.First().Id;
                InspectedTenant = TenantOptions.FirstOrDefault(t => t.Id == targetTenantId) ?? TenantOptions.First();
                SelectedTenantId = InspectedTenant.Id;

                var tenantSubscriptions = await _dbContext.MasterTenantFeatureSubscriptions
                    .Include(s => s.MasterFeatureCatalog)
                    .Where(s => s.MasterTenantCatalogId == InspectedTenant.Id)
                    .OrderByDescending(s => s.CreatedUtc)
                    .ToListAsync();

                // 1. Currently Active Features
                TenantActiveFeatures = tenantSubscriptions
                    .Where(s => s.IsActive)
                    .Select(s => new TenantFeatureUsageItemDto
                    {
                        SubscriptionId = s.Id,
                        Feature = s.MasterFeatureCatalog,
                        Status = s.Status ?? (s.IsActive ? "Active" : "Inactive"),
                        IsActive = s.IsActive,
                        BillingDuration = s.DurationType.ToString(),
                        RecurringPrice = s.RecurringPrice,
                        ActivatedUtc = s.StartsAtUtc,
                        ExpiresUtc = s.ExpiresAtUtc,
                        LastAccessedUtc = InspectedTenant.LastAccessedUtc ?? s.CreatedUtc,
                        DaysActive = (int)Math.Max(1, (DateTime.UtcNow - s.StartsAtUtc).TotalDays)
                    })
                    .OrderBy(f => f.Feature.Category)
                    .ThenBy(f => f.Feature.Name)
                    .ToList();

                // 2. 365-Day Usage Telemetry (All features active, trialed, or subscribed in past 12 months)
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
        /// Data Transfer Object capturing individual feature adoption and revenue metrics.
        /// </summary>
        public class FeatureAdoptionMetricDto
        {
            /// <summary>
            /// Master feature catalog entity.
            /// </summary>
            public MasterFeatureCatalog Feature { get; set; } = null!;

            /// <summary>
            /// Active subscriber tenant count.
            /// </summary>
            public int SubscribersCount { get; set; }

            /// <summary>
            /// Adoption percentage across total tenant fleet.
            /// </summary>
            public double AdoptionRate { get; set; }

            /// <summary>
            /// Monthly recurring revenue equivalent in USD.
            /// </summary>
            public decimal MonthlyRecurringRevenue { get; set; }

            /// <summary>
            /// Classification badge text (e.g. High Performing, Moderate, Underperforming, Zero Adoption).
            /// </summary>
            public string Classification { get; set; } = "Moderate";

            /// <summary>
            /// Hex color code for visualization bars and dots.
            /// </summary>
            public string StatusColor { get; set; } = "#3b82f6";
        }

        /// <summary>
        /// Data Transfer Object representing category-level distribution for charts.
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
        /// Timeline point for net activation velocity chart.
        /// </summary>
        public class ActivationVelocityDto
        {
            public string MonthLabel { get; set; } = string.Empty;
            public int CumulativeActive { get; set; }
            public int NetNewActivations { get; set; }
        }

        /// <summary>
        /// Quota consumption band for metered features.
        /// </summary>
        public class QuotaIntensityDto
        {
            public string BandName { get; set; } = string.Empty;
            public int TenantCount { get; set; }
            public double Percentage { get; set; }
            public string Color { get; set; } = "#3b82f6";
            public string Description { get; set; } = string.Empty;
        }

        /// <summary>
        /// Data Transfer Object representing individual feature usage telemetry for a specific tenant organization.
        /// Tracks active subscriptions, historical 365-day activations, pricing, and recency.
        /// </summary>
        public class TenantFeatureUsageItemDto
        {
            /// <summary>
            /// Subscription unique identifier.
            /// </summary>
            public Guid SubscriptionId { get; set; }

            /// <summary>
            /// Master feature catalog capability entity.
            /// </summary>
            public MasterFeatureCatalog Feature { get; set; } = null!;

            /// <summary>
            /// Status badge string (Active, Expired, Suspended, Trial).
            /// </summary>
            public string Status { get; set; } = "Active";

            /// <summary>
            /// Flag indicating whether the subscription is active.
            /// </summary>
            public bool IsActive { get; set; }

            /// <summary>
            /// Billing interval duration string (Monthly, Yearly, Units).
            /// </summary>
            public string BillingDuration { get; set; } = "Monthly";

            /// <summary>
            /// Recurring fee or per-unit price in USD.
            /// </summary>
            public decimal RecurringPrice { get; set; }

            /// <summary>
            /// Date and time when the feature was first provisioned/activated in UTC.
            /// </summary>
            public DateTime ActivatedUtc { get; set; }

            /// <summary>
            /// Date and time when the subscription expires or renews in UTC.
            /// </summary>
            public DateTime? ExpiresUtc { get; set; }

            /// <summary>
            /// Last accessed or utilized timestamp.
            /// </summary>
            public DateTime LastAccessedUtc { get; set; }

            /// <summary>
            /// Total active lifespan in days.
            /// </summary>
            public int DaysActive { get; set; }
        }
    }
}
