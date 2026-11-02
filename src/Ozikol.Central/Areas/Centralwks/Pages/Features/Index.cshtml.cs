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
    /// PageModel displaying and managing the master modular capability catalog across the platform.
    /// Supports canonical suite ordering, search, category & status filtering, column sorting, and status toggling.
    /// </summary>
    public class IndexModel : PageModel
    {
        private readonly MasterCatalogDbContext _dbContext;

        /// <summary>
        /// Canonical ordering of the 10 platform suites matching the public showcase (/en/features).
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
        /// Initializes a new instance of the <see cref="IndexModel"/> class.
        /// </summary>
        /// <param name="dbContext">Master catalog database context.</param>
        public IndexModel(MasterCatalogDbContext dbContext)
        {
            _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
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
        /// Available category list arranged in canonical order.
        /// </summary>
        public List<string> Categories { get; set; } = new();

        /// <summary>
        /// Filtered and sorted capability catalog list.
        /// </summary>
        public List<MasterFeatureCatalog> Features { get; set; } = new();

        /// <summary>
        /// Handles HTTP GET requests to load catalog statistics, filters, and features.
        /// </summary>
        public async Task OnGetAsync()
        {
            // Load all features for accurate stat cards calculations
            var allFeatures = await _dbContext.MasterFeatureCatalogs.AsNoTracking().ToListAsync();

            TotalCount = allFeatures.Count;
            ActiveCount = allFeatures.Count(f => f.IsActive && !f.IsInBeta);
            InactiveCount = allFeatures.Count(f => !f.IsActive && !f.IsInBeta);
            MaintenanceCount = allFeatures.Count(f => f.IsInBeta);

            // Populate suites in canonical sequence
            var distinctDbCategories = allFeatures
                .Select(f => f.Category)
                .Where(c => !string.IsNullOrWhiteSpace(c))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            Categories = CanonicalSuites
                .Where(s => distinctDbCategories.Contains(s, StringComparer.OrdinalIgnoreCase))
                .Concat(distinctDbCategories.Where(c => !CanonicalSuites.Contains(c, StringComparer.OrdinalIgnoreCase)).OrderBy(c => c))
                .ToList();

            SuitesCount = Categories.Count;

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
                if (statusNorm == "active")
                {
                    filtered = filtered.Where(f => f.IsActive && !f.IsInBeta);
                }
                else if (statusNorm == "inactive")
                {
                    filtered = filtered.Where(f => !f.IsActive && !f.IsInBeta);
                }
                else if (statusNorm == "maintenance" || statusNorm == "beta")
                {
                    filtered = filtered.Where(f => f.IsInBeta);
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
                        ? filtered.OrderByDescending(f => GetSuiteOrder(f.Category)).ThenBy(f => f.SortOrder)
                        : filtered.OrderBy(f => GetSuiteOrder(f.Category)).ThenBy(f => f.SortOrder);
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

                default:
                    // Default canonical suite sequence
                    filtered = filtered
                        .OrderBy(f => GetSuiteOrder(f.Category))
                        .ThenBy(f => f.SortOrder)
                        .ThenBy(f => f.Name);
                    break;
            }

            Features = filtered.ToList();
        }

        /// <summary>
        /// Resolves the canonical sequence index for a given suite name.
        /// </summary>
        private static int GetSuiteOrder(string? category)
        {
            if (string.IsNullOrWhiteSpace(category)) return 999;
            var idx = Array.FindIndex(CanonicalSuites, s => s.Equals(category.Trim(), StringComparison.OrdinalIgnoreCase));
            return idx >= 0 ? idx : 500;
        }

        /// <summary>
        /// Handles HTTP POST requests to toggle feature active/inactive status with audit logging.
        /// </summary>
        public async Task<IActionResult> OnPostToggleStatusAsync(Guid id)
        {
            var feature = await _dbContext.MasterFeatureCatalogs.FindAsync(id);
            if (feature == null)
            {
                TempData["Error"] = "Feature not found.";
                return RedirectToPage();
            }

            feature.IsActive = !feature.IsActive;

            _dbContext.MasterAuditLogs.Add(new MasterAuditLog
            {
                UserId = User.Identity?.Name,
                UserName = User.Identity?.Name,
                Action = feature.IsActive ? "Activate" : "Deactivate",
                EntityType = "Feature",
                EntityId = feature.Id.ToString(),
                Summary = $"Feature '{feature.Name}' ({feature.FeatureCode}) was {(feature.IsActive ? "activated" : "deactivated")}",
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers["User-Agent"].ToString(),
                CreatedUtc = DateTime.UtcNow
            });

            await _dbContext.SaveChangesAsync();
            TempData["Success"] = $"Feature status updated to {(feature.IsActive ? "Active" : "Inactive")}.";

            return RedirectToPage(new { search = Search, category = Category, status = Status, sortBy = SortBy, sortDir = SortDir });
        }
    }
}
