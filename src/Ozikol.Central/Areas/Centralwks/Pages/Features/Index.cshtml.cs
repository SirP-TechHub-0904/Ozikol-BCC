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
    /// Supports category filtering, capability search, subscription counts, and active status toggling.
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
        /// Search keyword filter for feature name, code, or description.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? Search { get; set; }

        /// <summary>
        /// Category filter (e.g. Operations, Governance, HR, Communications).
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? Category { get; set; }

        /// <summary>
        /// Total features count.
        /// </summary>
        public int TotalCount { get; set; }

        /// <summary>
        /// Total compulsory core modules.
        /// </summary>
        public int CompulsoryCount { get; set; }

        /// <summary>
        /// Total active capabilities.
        /// </summary>
        public int ActiveCount { get; set; }

        /// <summary>
        /// Available category list for filter dropdown.
        /// </summary>
        public List<string> Categories { get; set; } = new();

        /// <summary>
        /// Item transfer model containing feature details and active subscriber count.
        /// </summary>
        public List<FeatureCatalogItemDto> Features { get; set; } = new();

        /// <summary>
        /// Handles HTTP GET requests to load catalog features.
        /// </summary>
        public async Task OnGetAsync()
        {
            Categories = await _dbContext.MasterFeatureCatalogs
                .Select(f => f.Category)
                .Distinct()
                .OrderBy(c => c)
                .ToListAsync();

            TotalCount = await _dbContext.MasterFeatureCatalogs.CountAsync();
            ActiveCount = await _dbContext.MasterFeatureCatalogs.CountAsync(f => f.IsActive);
            CompulsoryCount = await _dbContext.MasterFeatureCatalogs.CountAsync(f => f.IsCompulsory);

            var query = _dbContext.MasterFeatureCatalogs.AsQueryable();

            if (!string.IsNullOrWhiteSpace(Search))
            {
                var term = Search.Trim().ToLower();
                query = query.Where(f => f.Name.ToLower().Contains(term)
                                      || f.FeatureCode.ToLower().Contains(term)
                                      || (f.Description != null && f.Description.ToLower().Contains(term)));
            }

            if (!string.IsNullOrWhiteSpace(Category))
            {
                query = query.Where(f => f.Category == Category);
            }

            var featureEntities = await query
                .OrderBy(f => f.Category)
                .ThenBy(f => f.SortOrder)
                .ThenBy(f => f.Name)
                .ToListAsync();

            // Fetch subscriber counts in a single efficient query
            var subscriptionCounts = await _dbContext.MasterTenantFeatureSubscriptions
                .Where(s => s.IsActive)
                .GroupBy(s => s.MasterFeatureCatalogId)
                .Select(g => new { FeatureId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.FeatureId, x => x.Count);

            Features = featureEntities.Select(f => new FeatureCatalogItemDto
            {
                Feature = f,
                SubscriberCount = subscriptionCounts.TryGetValue(f.Id, out var count) ? count : 0
            }).ToList();
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
            TempData["Success"] = $"Feature '{feature.Name}' status toggled to {(feature.IsActive ? "Active" : "Inactive")}.";

            return RedirectToPage();
        }

        /// <summary>
        /// Data transfer item combining catalog entity with subscriber metrics.
        /// </summary>
        public class FeatureCatalogItemDto
        {
            public MasterFeatureCatalog Feature { get; set; } = null!;
            public int SubscriberCount { get; set; }
        }
    }
}
