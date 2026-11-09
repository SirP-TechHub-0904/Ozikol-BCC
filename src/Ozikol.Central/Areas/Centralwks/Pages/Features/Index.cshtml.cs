using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol.Central.Services;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Areas.Centralwks.Pages.Features
{
    /// <summary>
    /// PageModel displaying and managing the master modular capability catalog across the platform.
    /// Supports canonical suite ordering, search, category & status filtering, column sorting, and status toggling.
    /// </summary>
    public class IndexModel : PageModel
    {
        private readonly MasterCatalogDbContext _dbContext;
        private readonly ICurrencyService? _currencyService;

        /// <summary>
        /// Canonical ordering of the 11 platform suites matching the public showcase (/en/features).
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
        /// Initializes a new instance of the <see cref="IndexModel"/> class.
        /// </summary>
        /// <param name="dbContext">Master catalog database context.</param>
        /// <param name="currencyService">Optional currency and catalog cache service.</param>
        public IndexModel(MasterCatalogDbContext dbContext, ICurrencyService? currencyService = null)
        {
            _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
            _currencyService = currencyService;
        }

        /// <summary>
        /// Search keyword filter for feature name, code, or description.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? Search { get; set; }

        /// <summary>
        /// Category/Suite filter.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? Category { get; set; }

        /// <summary>
        /// Status filter ("all", "active", "inactive", "maintenance").
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? Status { get; set; }

        /// <summary>
        /// Column to sort by ("suite", "name", "billing", "tier", "status").
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? SortBy { get; set; }

        /// <summary>
        /// Sort direction ("asc" or "desc").
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? SortDir { get; set; }

        /// <summary>
        /// Display layout mode ("cards" or "table"). Defaults to "cards" matching GetStarted sequence.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string ViewMode { get; set; } = "cards";

        /// <summary>
        /// Total distinct suites count.
        /// </summary>
        public int SuitesCount { get; set; }

        /// <summary>
        /// Total features count.
        /// </summary>
        public int TotalCount { get; set; }

        /// <summary>
        /// Total active capabilities count.
        /// </summary>
        public int ActiveCount { get; set; }

        /// <summary>
        /// Total inactive capabilities count.
        /// </summary>
        public int InactiveCount { get; set; }

        /// <summary>
        /// Total capabilities currently under maintenance / beta count.
        /// </summary>
        public int MaintenanceCount { get; set; }

        /// <summary>
        /// Total capabilities marked as available for immediate use in tenant workspaces.
        /// </summary>
        public int AvailableForUseCount { get; set; }

        /// <summary>
        /// Total capabilities marked as coming soon while under development.
        /// </summary>
        public int ComingSoonCount { get; set; }

        /// <summary>
        /// Total capabilities published (visible to tenants).
        /// </summary>
        public int PublishedCount { get; set; }

        /// <summary>
        /// Total capabilities unpublished (hidden from tenants).
        /// </summary>
        public int UnpublishedCount { get; set; }

        /// <summary>
        /// Available category list arranged in canonical order.
        /// </summary>
        public List<string> Categories { get; set; } = new();

        /// <summary>
        /// Master feature suites loaded from <see cref="MasterFeatureSuites"/> (with fallback to canonical defaults).
        /// </summary>
        public List<MasterFeatureSuite> Suites { get; set; } = new();

        /// <summary>
        /// Filtered and sorted capability catalog list.
        /// </summary>
        public List<MasterFeatureCatalog> Features { get; set; } = new();

        /// <summary>
        /// Handles HTTP GET requests to load catalog statistics, filters, suites, and features.
        /// </summary>
        public async Task OnGetAsync()
        {
            // Load Suites from MasterFeatureSuites (with fallback if migration not yet applied)
            try
            {
                Suites = await _dbContext.MasterFeatureSuites
                    .AsNoTracking()
                    .OrderBy(s => s.SortOrder)
                    .ToListAsync();
                if (Suites.Count == 0)
                {
                    Suites = MasterFeatureSuiteDefaults.GetDefaultSuites();
                }
            }
            catch
            {
                Suites = MasterFeatureSuiteDefaults.GetDefaultSuites();
            }

            // Load all features for accurate stat cards calculations (with fallback if migration not yet applied)
            List<MasterFeatureCatalog> allFeatures;
            try
            {
                allFeatures = await _dbContext.MasterFeatureCatalogs.AsNoTracking().ToListAsync();
            }
            catch
            {
                try
                {
                    allFeatures = await _dbContext.MasterFeatureCatalogs
                        .AsNoTracking()
                        .Select(f => new MasterFeatureCatalog
                        {
                            Id = f.Id,
                            FeatureCode = f.FeatureCode,
                            Name = f.Name,
                            MenuTitle = f.MenuTitle,
                            MasterFeatureSuiteId = f.MasterFeatureSuiteId,
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
                            IsPublished = f.IsPublished,
                            IsAvailableForUse = f.IsAvailableForUse,
                            IsInBeta = f.IsInBeta,
                            SortOrder = f.SortOrder
                        })
                        .ToListAsync();
                }
                catch
                {
                    allFeatures = await _dbContext.MasterFeatureCatalogs
                        .AsNoTracking()
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
                            FreeTrialDays = 7,
                            IsMetered = f.IsMetered,
                            IsActive = f.IsActive,
                            IsPublished = true,
                            IsInBeta = f.IsInBeta,
                            SortOrder = f.SortOrder
                        })
                        .ToListAsync();
                }
            }

            TotalCount = allFeatures.Count;
            // "No price, don't publish" rule: non-compulsory capabilities MUST have BOTH Monthly and Yearly prices
            foreach (var f in allFeatures)
            {
                bool hasPrice = f.IsCompulsory || (f.MonthlyPrice > 0m && f.YearlyPrice > 0m);
                f.IsPublished = hasPrice && f.IsActive;
                f.MenuTitle = MasterFeatureSuiteDefaults.ResolveFeatureMenuTitle(f.FeatureCode, f.MenuTitle, f.Name);
            }
            PublishedCount = allFeatures.Count(f => f.IsPublished);
            UnpublishedCount = allFeatures.Count(f => !f.IsPublished);
            ActiveCount = PublishedCount;
            InactiveCount = UnpublishedCount;
            MaintenanceCount = allFeatures.Count(f => f.IsInBeta);
            AvailableForUseCount = allFeatures.Count(f => f.IsAvailableForUse);
            ComingSoonCount = allFeatures.Count(f => !f.IsAvailableForUse);

            // Build dynamic suite sort map from MasterFeatureSuites (strictly ordered by SortOrder)
            var suiteSortMap = Suites
                .GroupBy(s => s.Name.Trim(), StringComparer.OrdinalIgnoreCase)
                .ToDictionary(g => g.Key, g => g.First().SortOrder, StringComparer.OrdinalIgnoreCase);

            int ResolveDynamicSuiteSort(MasterFeatureCatalog f)
            {
                if (f.MasterFeatureSuiteId.HasValue)
                {
                    var matchedSuite = Suites.FirstOrDefault(s => s.Id == f.MasterFeatureSuiteId.Value);
                    if (matchedSuite != null) return matchedSuite.SortOrder;
                }
                if (!string.IsNullOrWhiteSpace(f.Category) && suiteSortMap.TryGetValue(f.Category.Trim(), out var order))
                    return order;
                return GetSuiteOrder(f.Category) + 100;
            }

            // Populate suites ordered strictly by SortOrder
            var distinctDbCategories = allFeatures
                .Select(f => f.Category)
                .Where(c => !string.IsNullOrWhiteSpace(c))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            var orderedSuiteNames = Suites
                .OrderBy(s => s.SortOrder)
                .ThenBy(s => s.Name)
                .Select(s => s.Name)
                .ToList();

            Categories = orderedSuiteNames
                .Where(s => distinctDbCategories.Contains(s, StringComparer.OrdinalIgnoreCase))
                .Concat(distinctDbCategories.Where(c => !orderedSuiteNames.Contains(c, StringComparer.OrdinalIgnoreCase)).OrderBy(c => c))
                .ToList();

            SuitesCount = Suites.Count > 0 ? Suites.Count : Categories.Count;

            // Apply in-memory or query filtering
            var filtered = allFeatures.AsEnumerable();

            if (!string.IsNullOrWhiteSpace(Search))
            {
                var term = Search.Trim().ToLowerInvariant();
                filtered = filtered.Where(f =>
                    (f.Name != null && f.Name.ToLowerInvariant().Contains(term)) ||
                    (f.FeatureCode != null && f.FeatureCode.ToLowerInvariant().Contains(term)) ||
                    (f.Category != null && f.Category.ToLowerInvariant().Contains(term)) ||
                    (f.Description != null && f.Description.ToLowerInvariant().Contains(term)));
            }

            if (!string.IsNullOrWhiteSpace(Category))
            {
                filtered = filtered.Where(f => f.Category.Equals(Category, StringComparison.OrdinalIgnoreCase));
            }

            if (!string.IsNullOrWhiteSpace(Status))
            {
                var statusNorm = Status.Trim().ToLowerInvariant();
                if (statusNorm == "published" || statusNorm == "active")
                {
                    filtered = filtered.Where(f => f.IsActive);
                }
                else if (statusNorm == "unpublished" || statusNorm == "inactive")
                {
                    filtered = filtered.Where(f => !f.IsActive);
                }
                else if (statusNorm == "available")
                {
                    filtered = filtered.Where(f => f.IsAvailableForUse);
                }
                else if (statusNorm == "coming_soon")
                {
                    filtered = filtered.Where(f => !f.IsAvailableForUse);
                }
            }

            // Apply sorting
            var isDesc = string.Equals(SortDir, "desc", StringComparison.OrdinalIgnoreCase);

            switch (SortBy?.ToLowerInvariant())
            {
                case "name":
                    filtered = isDesc ? filtered.OrderByDescending(f => f.Name) : filtered.OrderBy(f => f.Name);
                    break;

                case "suite":
                    filtered = isDesc
                        ? filtered.OrderByDescending(f => ResolveDynamicSuiteSort(f)).ThenBy(f => f.SortOrder)
                        : filtered.OrderBy(f => ResolveDynamicSuiteSort(f)).ThenBy(f => f.SortOrder);
                    break;

                case "billing":
                    filtered = isDesc ? filtered.OrderByDescending(f => f.BillingType) : filtered.OrderBy(f => f.BillingType);
                    break;

                case "tier":
                    filtered = isDesc ? filtered.OrderByDescending(f => f.IsCompulsory) : filtered.OrderBy(f => f.IsCompulsory);
                    break;

                case "status":
                    filtered = isDesc
                        ? filtered.OrderByDescending(f => f.IsInBeta ? 2 : (f.IsActive ? 1 : 0))
                        : filtered.OrderBy(f => f.IsInBeta ? 2 : (f.IsActive ? 1 : 0));
                    break;

                case "order":
                    filtered = isDesc
                        ? filtered.OrderByDescending(f => f.SortOrder).ThenBy(f => ResolveDynamicSuiteSort(f)).ThenBy(f => f.Name)
                        : filtered.OrderBy(f => ResolveDynamicSuiteSort(f)).ThenBy(f => f.SortOrder).ThenBy(f => f.Name);
                    break;

                default:
                    // Default strictly respects Suite SortOrder then Feature SortOrder
                    filtered = filtered
                        .OrderBy(f => ResolveDynamicSuiteSort(f))
                        .ThenBy(f => f.SortOrder)
                        .ThenBy(f => f.Name);
                    break;
            }

            Features = filtered.ToList();
        }

        /// <summary>
        /// Resolves the canonical sequence index for a given suite name.
        /// </summary>
        public static int GetSuiteOrder(string? category)
        {
            if (string.IsNullOrWhiteSpace(category)) return 999;
            var idx = Array.FindIndex(CanonicalSuites, s => s.Equals(category.Trim(), StringComparison.OrdinalIgnoreCase));
            return idx >= 0 ? idx : 500;
        }

        /// <summary>
        /// Handles HTTP POST requests to toggle feature active/inactive status with audit logging.
        /// </summary>
        /// <param name="id">The identifier of the feature to toggle.</param>
        /// <returns>A JSON response for AJAX requests or a redirect back to the feature directory.</returns>
        public async Task<IActionResult> OnPostToggleStatusAsync(Guid id)
        {
            return await OnPostTogglePublishAsync(id);
        }

        /// <summary>
        /// Handles HTTP POST requests to toggle whether a feature is Published (visible to tenants) or Unpublished (hidden).
        /// Supports instant AJAX toggle switching without full page reload.
        /// </summary>
        /// <param name="id">The identifier of the feature to toggle.</param>
        /// <returns>A JSON response for AJAX requests or a redirect back to the feature directory.</returns>
        public async Task<IActionResult> OnPostTogglePublishAsync(Guid id)
        {
            var feature = await _dbContext.MasterFeatureCatalogs
                .FirstOrDefaultAsync(f => f.Id == id);

            if (feature == null)
            {
                if (Request.Headers["X-Requested-With"] == "XMLHttpRequest")
                {
                    return new JsonResult(new { success = false, message = "Feature not found." }) { StatusCode = 404 };
                }
                TempData["Error"] = "Feature not found.";
                return RedirectToPage();
            }

            var newActive = !feature.IsActive;

            // Guard: Both Monthly and Yearly amounts are compulsory (> 0)
            if (newActive && !feature.IsCompulsory && (feature.MonthlyPrice <= 0m || feature.YearlyPrice <= 0m))
            {
                var priceMsg = $"Cannot publish '{feature.Name}' because both Monthly and Yearly amounts are compulsory (> ₦0.00 / $0.00). Please assign both Monthly and Yearly prices before publishing.";
                if (Request.Headers["X-Requested-With"] == "XMLHttpRequest")
                {
                    return new JsonResult(new { success = false, message = priceMsg }) { StatusCode = 400 };
                }
                TempData["Error"] = priceMsg;
                return RedirectToPage(new { search = Search, category = Category, status = Status, sortBy = SortBy, sortDir = SortDir, viewMode = ViewMode });
            }

            feature.IsActive = newActive;
            feature.IsPublished = newActive;

            _dbContext.MasterAuditLogs.Add(new MasterAuditLog
            {
                UserId = User.Identity?.Name,
                UserName = User.Identity?.Name,
                Action = newActive ? "Publish" : "Unpublish",
                EntityType = "Feature",
                EntityId = feature.Id.ToString(),
                Summary = $"Feature '{feature.Name}' ({feature.FeatureCode}) was {(newActive ? "published" : "unpublished")}",
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers["User-Agent"].ToString(),
                CreatedUtc = DateTime.UtcNow
            });

            await _dbContext.SaveChangesAsync();
            _currencyService?.InvalidatePricingCache();
            var msg = $"'{feature.Name}' is now {(newActive ? "Published (Visible to Tenants)" : "Unpublished (Hidden from Tenants)")}.";

            if (Request.Headers["X-Requested-With"] == "XMLHttpRequest")
            {
                return new JsonResult(new
                {
                    success = true,
                    id = feature.Id,
                    isActive = newActive,
                    isPublished = newActive,
                    isAvailableForUse = feature.IsAvailableForUse,
                    message = msg
                });
            }

            TempData["Success"] = msg;
            return RedirectToPage(new { search = Search, category = Category, status = Status, sortBy = SortBy, sortDir = SortDir, viewMode = ViewMode });
        }

        /// <summary>
        /// Handles HTTP POST requests to toggle whether a feature is Available for Use or Coming Soon in tenant workspaces.
        /// Supports instant AJAX toggle switching without full page reload.
        /// </summary>
        /// <param name="id">The identifier of the feature to toggle.</param>
        /// <returns>A JSON response for AJAX requests or a redirect back to the feature directory.</returns>
        public async Task<IActionResult> OnPostToggleAvailabilityAsync(Guid id)
        {
            var feature = await _dbContext.MasterFeatureCatalogs
                .FirstOrDefaultAsync(f => f.Id == id);

            if (feature == null)
            {
                if (Request.Headers["X-Requested-With"] == "XMLHttpRequest")
                {
                    return new JsonResult(new { success = false, message = "Feature not found." }) { StatusCode = 404 };
                }
                TempData["Error"] = "Feature not found.";
                return RedirectToPage();
            }

            var newAvailable = !feature.IsAvailableForUse;
            feature.IsAvailableForUse = newAvailable;

            _dbContext.MasterAuditLogs.Add(new MasterAuditLog
            {
                UserId = User.Identity?.Name,
                UserName = User.Identity?.Name,
                Action = newAvailable ? "MarkAvailableForUse" : "MarkComingSoon",
                EntityType = "Feature",
                EntityId = feature.Id.ToString(),
                Summary = $"Feature '{feature.Name}' ({feature.FeatureCode}) marked as {(newAvailable ? "Available for Use" : "Coming Soon")}",
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers["User-Agent"].ToString(),
                CreatedUtc = DateTime.UtcNow
            });

            await _dbContext.SaveChangesAsync();
            _currencyService?.InvalidatePricingCache();
            var msg = $"'{feature.Name}' marked as {(newAvailable ? "Available for Use" : "Coming Soon")}.";

            if (Request.Headers["X-Requested-With"] == "XMLHttpRequest")
            {
                return new JsonResult(new
                {
                    success = true,
                    id = feature.Id,
                    isActive = feature.IsActive,
                    isPublished = feature.IsActive,
                    isAvailableForUse = newAvailable,
                    message = msg
                });
            }

            TempData["Success"] = msg;
            return RedirectToPage(new { search = Search, category = Category, status = Status, sortBy = SortBy, sortDir = SortDir, viewMode = ViewMode });
        }

        /// <summary>
        /// Handles HTTP POST requests to update a Suite's Full Title (<see cref="MasterFeatureSuite.Name"/>),
        /// concise Sidebar Menu Title (<see cref="MasterFeatureSuite.MenuTitle"/>), and SortOrder in <c>MasterFeatureSuites</c>,
        /// automatically rearranging suite numbering (1..N, Suite A..K) and feature numbering (1..46) without duplicates.
        /// </summary>
        public async Task<IActionResult> OnPostUpdateSuiteAsync(Guid suiteId, string name, string menuTitle, string? description, int sortOrder = 1)
        {
            if (string.IsNullOrWhiteSpace(name) || string.IsNullOrWhiteSpace(menuTitle))
            {
                TempData["Error"] = "Both Suite Full Title and Suite Menu Title are required.";
                return RedirectToPage(new { search = Search, category = Category, status = Status, sortBy = SortBy, sortDir = SortDir, viewMode = ViewMode });
            }

            try
            {
                var allSuites = await _dbContext.MasterFeatureSuites
                    .OrderBy(s => s.SortOrder)
                    .ThenBy(s => s.Name)
                    .ToListAsync();

                if (allSuites.Count == 0)
                {
                    allSuites = MasterFeatureSuiteDefaults.GetDefaultSuites();
                    _dbContext.MasterFeatureSuites.AddRange(allSuites);
                }

                var suite = allSuites.FirstOrDefault(s => s.Id == suiteId);
                var oldName = suite?.Name;

                if (suite == null)
                {
                    var defaults = MasterFeatureSuiteDefaults.GetDefaultSuites();
                    var def = defaults.FirstOrDefault(s => s.Id == suiteId);
                    oldName = def?.Name;
                    suite = def ?? new MasterFeatureSuite
                    {
                        Id = suiteId == Guid.Empty ? Guid.NewGuid() : suiteId,
                        SuiteCode = $"suite-{sortOrder}",
                        SuiteLetter = ((char)('A' + Math.Max(0, sortOrder - 1))).ToString(),
                        SortOrder = sortOrder
                    };
                    _dbContext.MasterFeatureSuites.Add(suite);
                    allSuites.Add(suite);
                }

                suite.Name = name.Trim();
                suite.MenuTitle = menuTitle.Trim();
                if (!string.IsNullOrWhiteSpace(description))
                {
                    suite.Description = description.Trim();
                }

                // Rearrange Suite SortOrder (1..N) and SuiteLetter (A..K) cleanly without duplicates
                var otherSuites = allSuites
                    .Where(s => s.Id != suite.Id)
                    .OrderBy(s => s.SortOrder)
                    .ThenBy(s => s.Name)
                    .ToList();

                int targetSuiteIndex = Math.Clamp(sortOrder - 1, 0, otherSuites.Count);
                otherSuites.Insert(targetSuiteIndex, suite);

                for (int i = 0; i < otherSuites.Count; i++)
                {
                    otherSuites[i].SortOrder = i + 1;
                    otherSuites[i].SuiteLetter = ((char)('A' + i)).ToString();
                }

                // Synchronize Category and MasterFeatureSuiteId on all features, then rearrange feature numbering (1..N)
                var allFeatures = await _dbContext.MasterFeatureCatalogs.ToListAsync();
                foreach (var feat in allFeatures)
                {
                    if (feat.MasterFeatureSuiteId == suite.Id || (oldName != null && string.Equals(feat.Category, oldName, StringComparison.OrdinalIgnoreCase)))
                    {
                        feat.MasterFeatureSuiteId = suite.Id;
                        feat.Category = suite.Name;
                    }
                }

                var suiteOrderLookup = otherSuites.ToDictionary(s => s.Id, s => s.SortOrder);
                var suiteNameOrderLookup = otherSuites
                    .GroupBy(s => s.Name.Trim(), StringComparer.OrdinalIgnoreCase)
                    .ToDictionary(g => g.Key, g => g.First().SortOrder, StringComparer.OrdinalIgnoreCase);

                int ResolveSuiteOrderForFeature(MasterFeatureCatalog f)
                {
                    if (f.MasterFeatureSuiteId.HasValue && suiteOrderLookup.TryGetValue(f.MasterFeatureSuiteId.Value, out var byId))
                        return byId;
                    if (!string.IsNullOrWhiteSpace(f.Category) && suiteNameOrderLookup.TryGetValue(f.Category.Trim(), out var byName))
                        return byName;
                    return 999;
                }

                var orderedFeatures = allFeatures
                    .OrderBy(f => ResolveSuiteOrderForFeature(f))
                    .ThenBy(f => f.SortOrder)
                    .ThenBy(f => f.Name)
                    .ToList();

                for (int i = 0; i < orderedFeatures.Count; i++)
                {
                    orderedFeatures[i].SortOrder = i + 1;
                }

                _dbContext.MasterAuditLogs.Add(new MasterAuditLog
                {
                    UserId = User.Identity?.Name,
                    UserName = User.Identity?.Name,
                    Action = "UpdateSuite",
                    EntityType = "FeatureSuite",
                    EntityId = suite.Id.ToString(),
                    Summary = $"Updated Suite {suite.SuiteLetter} ('{suite.Name}', Menu: '{suite.MenuTitle}', SortOrder: {suite.SortOrder}) and rearranged catalog numbering",
                    IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                    UserAgent = Request.Headers["User-Agent"].ToString(),
                    CreatedUtc = DateTime.UtcNow
                });

                await _dbContext.SaveChangesAsync();
                _currencyService?.InvalidatePricingCache();
                TempData["Success"] = $"Suite '{suite.Name}' updated to position #{suite.SortOrder} (Suite {suite.SuiteLetter}) and all capability numbers rearranged.";
            }
            catch (Exception ex)
            {
                TempData["Error"] = $"Could not update suite (please ensure the latest database migration is applied): {ex.Message}";
            }

            return RedirectToPage(new { search = Search, category = Category, status = Status, sortBy = SortBy, sortDir = SortDir, viewMode = ViewMode });
        }

        /// <summary>
        /// Handles HTTP POST requests to update a Feature's <see cref="MasterFeatureCatalog.SortOrder"/>
        /// and automatically rearrange the numbering of all features sequentially without duplicates or gaps.
        /// </summary>
        /// <param name="featureId">The identifier of the feature to move.</param>
        /// <param name="newOrder">The requested 1-based position.</param>
        public async Task<IActionResult> OnPostUpdateFeatureOrderAsync(Guid featureId, int newOrder)
        {
            try
            {
                var allSuites = await _dbContext.MasterFeatureSuites
                    .AsNoTracking()
                    .OrderBy(s => s.SortOrder)
                    .ToListAsync();

                if (allSuites.Count == 0)
                {
                    allSuites = MasterFeatureSuiteDefaults.GetDefaultSuites();
                }

                var suiteOrderLookup = allSuites.ToDictionary(s => s.Id, s => s.SortOrder);
                var suiteNameOrderLookup = allSuites
                    .GroupBy(s => s.Name.Trim(), StringComparer.OrdinalIgnoreCase)
                    .ToDictionary(g => g.Key, g => g.First().SortOrder, StringComparer.OrdinalIgnoreCase);

                int ResolveSuiteOrder(MasterFeatureCatalog f)
                {
                    if (f.MasterFeatureSuiteId.HasValue && suiteOrderLookup.TryGetValue(f.MasterFeatureSuiteId.Value, out var byId))
                        return byId;
                    if (!string.IsNullOrWhiteSpace(f.Category) && suiteNameOrderLookup.TryGetValue(f.Category.Trim(), out var byName))
                        return byName;
                    return GetSuiteOrder(f.Category) + 100;
                }

                var allFeatures = await _dbContext.MasterFeatureCatalogs.ToListAsync();
                var target = allFeatures.FirstOrDefault(f => f.Id == featureId);
                if (target == null)
                {
                    TempData["Error"] = "Capability not found.";
                    return RedirectToPage(new { search = Search, category = Category, status = Status, sortBy = SortBy, sortDir = SortDir, viewMode = ViewMode });
                }

                // Order all features currently by Suite SortOrder -> Feature SortOrder -> Name
                var fullOrdered = allFeatures
                    .OrderBy(f => ResolveSuiteOrder(f))
                    .ThenBy(f => f.SortOrder)
                    .ThenBy(f => f.Name)
                    .ToList();

                int oldIdx = fullOrdered.FindIndex(f => f.Id == featureId);
                var others = fullOrdered.Where(f => f.Id != featureId).ToList();

                int targetIdx = Math.Clamp(newOrder - 1, 0, others.Count);

                // If moving across suite boundaries, adopt the destination neighbor's suite so features can move up/down between suites
                if (others.Count > 0 && oldIdx >= 0 && targetIdx != oldIdx)
                {
                    var neighbor = targetIdx < oldIdx
                        ? others[Math.Clamp(targetIdx, 0, others.Count - 1)]
                        : others[Math.Clamp(targetIdx - 1, 0, others.Count - 1)];

                    if (neighbor != null && !string.Equals(neighbor.Category, target.Category, StringComparison.OrdinalIgnoreCase))
                    {
                        target.Category = neighbor.Category;
                        target.MasterFeatureSuiteId = neighbor.MasterFeatureSuiteId;
                    }
                }

                others.Insert(targetIdx, target);

                // Re-number all features sequentially (1..N)
                for (int i = 0; i < others.Count; i++)
                {
                    others[i].SortOrder = i + 1;
                }

                _dbContext.MasterAuditLogs.Add(new MasterAuditLog
                {
                    UserId = User.Identity?.Name,
                    UserName = User.Identity?.Name,
                    Action = "ReorderFeature",
                    EntityType = "Feature",
                    EntityId = target.Id.ToString(),
                    Summary = $"Rearranged capability '{target.Name}' ({target.FeatureCode}) to SortOrder #{target.SortOrder} (Suite: {target.Category})",
                    IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                    UserAgent = Request.Headers["User-Agent"].ToString(),
                    CreatedUtc = DateTime.UtcNow
                });

                await _dbContext.SaveChangesAsync();
                _currencyService?.InvalidatePricingCache();

                if (Request.Headers["X-Requested-With"] == "XMLHttpRequest")
                {
                    return new JsonResult(new
                    {
                        success = true,
                        featureId = target.Id,
                        sortOrder = target.SortOrder,
                        message = $"'{target.Name}' moved to #{target.SortOrder} and numbering rearranged."
                    });
                }

                TempData["Success"] = $"'{target.Name}' moved to #{target.SortOrder} ({target.Category}) and all capability numbers rearranged.";
            }
            catch (Exception ex)
            {
                if (Request.Headers["X-Requested-With"] == "XMLHttpRequest")
                {
                    return new JsonResult(new { success = false, message = ex.Message }) { StatusCode = 500 };
                }
                TempData["Error"] = $"Could not rearrange capability order: {ex.Message}";
            }

            return RedirectToPage(new { search = Search, category = Category, status = Status, sortBy = SortBy, sortDir = SortDir, viewMode = ViewMode });
        }

        /// <summary>
        /// Moves an entire Feature Suite up or down by 1 position, automatically rearranging Suite SortOrder (1..N),
        /// SuiteLetter (A..K), and all 46 Feature SortOrder numbers sequentially.
        /// </summary>
        /// <param name="suiteId">The identifier of the suite to move.</param>
        /// <param name="direction">"up" or "down".</param>
        public async Task<IActionResult> OnPostMoveSuiteAsync(Guid suiteId, string direction)
        {
            var allSuites = await _dbContext.MasterFeatureSuites
                .AsNoTracking()
                .OrderBy(s => s.SortOrder)
                .ThenBy(s => s.Name)
                .ToListAsync();

            if (allSuites.Count == 0)
            {
                allSuites = MasterFeatureSuiteDefaults.GetDefaultSuites();
            }

            var idx = allSuites.FindIndex(s => s.Id == suiteId);
            if (idx < 0)
            {
                TempData["Error"] = "Suite not found.";
                return RedirectToPage(new { search = Search, category = Category, status = Status, sortBy = SortBy, sortDir = SortDir, viewMode = ViewMode });
            }

            var targetSuite = allSuites[idx];
            int newSortOrder = string.Equals(direction, "up", StringComparison.OrdinalIgnoreCase)
                ? Math.Max(1, idx)
                : Math.Min(allSuites.Count, idx + 2);

            return await OnPostUpdateSuiteAsync(targetSuite.Id, targetSuite.Name, targetSuite.MenuTitle, targetSuite.Description, newSortOrder);
        }

        /// <summary>
        /// Updates the General Mode pricing (<see cref="MasterFeatureCatalog.MonthlyPrice"/>, <see cref="MasterFeatureCatalog.YearlyPrice"/>),
        /// tier classification (<see cref="MasterFeatureCatalog.IsCompulsory"/>), and first-time free trial days
        /// (<see cref="MasterFeatureCatalog.FreeTrialDays"/>) directly from the Master Catalog Index modal without leaving the page.
        /// </summary>
        /// <param name="featureId">The identifier of the feature to update.</param>
        /// <param name="monthlyPrice">Monthly base subscription price in USD.</param>
        /// <param name="yearlyPrice">Optional yearly subscription price in USD (auto-calculated if 0 and monthlyPrice &gt; 0).</param>
        /// <param name="freeTrialDays">Number of free trial days before payment (0–365).</param>
        /// <param name="isCompulsory">Whether the feature is a Compulsory Core capability or Optional Add-on.</param>
        /// <returns>Redirects back to the Feature Catalog Index page with preserved filter state.</returns>
        public async Task<IActionResult> OnPostUpdateFreeTrialDaysAsync(
            Guid featureId,
            decimal? monthlyPrice = null,
            decimal? yearlyPrice = null,
            int freeTrialDays = 14,
            bool? isCompulsory = null)
        {
            var clampedDays = Math.Clamp(freeTrialDays, 0, 365);
            try
            {
                var featureInfo = await _dbContext.MasterFeatureCatalogs
                    .AsNoTracking()
                    .Where(f => f.Id == featureId)
                    .Select(f => new
                    {
                        f.Id,
                        f.Name,
                        f.FeatureCode,
                        f.MonthlyPrice,
                        f.QuarterlyPrice,
                        f.YearlyPrice,
                        f.IsCompulsory,
                        f.IsActive,
                        f.IsPublished
                    })
                    .FirstOrDefaultAsync();

                if (featureInfo == null)
                {
                    TempData["Error"] = "Capability not found.";
                    return RedirectToPage(new { search = Search, category = Category, status = Status, sortBy = SortBy, sortDir = SortDir, viewMode = ViewMode });
                }

                decimal effectiveMonthly = monthlyPrice.HasValue ? Math.Max(0m, monthlyPrice.Value) : featureInfo.MonthlyPrice;
                decimal effectiveQuarterly = monthlyPrice.HasValue
                    ? Math.Round(effectiveMonthly * 3m * 0.90m, 2)
                    : featureInfo.QuarterlyPrice;
                decimal effectiveYearly = yearlyPrice.HasValue && yearlyPrice.Value >= 0m
                    ? Math.Max(0m, yearlyPrice.Value)
                    : (monthlyPrice.HasValue ? Math.Round(effectiveMonthly * 10m, 2) : featureInfo.YearlyPrice);
                
                // Both Monthly and Yearly amounts are compulsory (> 0)
                bool hasPrice = featureInfo.IsCompulsory || (effectiveMonthly > 0m && effectiveYearly > 0m);
                bool newIsActive = hasPrice && featureInfo.IsActive;
                bool newIsPublished = hasPrice && featureInfo.IsPublished;

                try
                {
                    await _dbContext.MasterFeatureCatalogs
                        .Where(f => f.Id == featureId)
                        .ExecuteUpdateAsync(s => s
                            .SetProperty(f => f.MonthlyPrice, effectiveMonthly)
                            .SetProperty(f => f.QuarterlyPrice, effectiveQuarterly)
                            .SetProperty(f => f.YearlyPrice, effectiveYearly)
                            .SetProperty(f => f.IsCompulsory, false)
                            .SetProperty(f => f.FreeTrialDays, clampedDays)
                            .SetProperty(f => f.IsActive, newIsActive)
                            .SetProperty(f => f.IsPublished, newIsPublished));
                }
                catch
                {
                    // Fallback if FreeTrialDays column migration has not been applied yet: still save price immediately
                    await _dbContext.MasterFeatureCatalogs
                        .Where(f => f.Id == featureId)
                        .ExecuteUpdateAsync(s => s
                            .SetProperty(f => f.MonthlyPrice, effectiveMonthly)
                            .SetProperty(f => f.QuarterlyPrice, effectiveQuarterly)
                            .SetProperty(f => f.YearlyPrice, effectiveYearly)
                            .SetProperty(f => f.IsCompulsory, false)
                            .SetProperty(f => f.IsActive, newIsActive)
                            .SetProperty(f => f.IsPublished, newIsPublished));
                }

                _dbContext.MasterAuditLogs.Add(new MasterAuditLog
                {
                    UserId = User.Identity?.Name,
                    UserName = User.Identity?.Name,
                    Action = "QuickUpdatePriceAndTrial",
                    EntityType = "Feature",
                    EntityId = featureInfo.Id.ToString(),
                    Summary = $"Updated capability '{featureInfo.Name}' ({featureInfo.FeatureCode}): Price=${effectiveMonthly:F2}/mo (${effectiveYearly:F2}/yr), FreeTrial={clampedDays}d",
                    IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                    UserAgent = Request.Headers["User-Agent"].ToString(),
                    CreatedUtc = DateTime.UtcNow
                });

                await _dbContext.SaveChangesAsync();
                _currencyService?.InvalidatePricingCache();
                TempData["Success"] = $"Updated '{featureInfo.Name}': Price set to ${(effectiveMonthly > 0 ? $"{effectiveMonthly:F2}/mo" : "0.00 (Free)")} and First-Time Free Trial set to {clampedDays} day(s) before payment.";
            }
            catch (Exception ex)
            {
                TempData["Error"] = $"Could not update price and free trial days: {ex.Message}";
            }

            return RedirectToPage(new { search = Search, category = Category, status = Status, sortBy = SortBy, sortDir = SortDir, viewMode = ViewMode });
        }
    }
}
