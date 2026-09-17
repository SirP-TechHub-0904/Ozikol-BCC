using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Areas.Centralwks.Pages.Subscriptions
{
    /// <summary>
    /// PageModel displaying and managing the fleet-wide feature activation matrix across all tenant databases.
    /// Supports tenant filtering, capability filtering, cadence filtering, pagination, and status toggling.
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
        /// Optional tenant ID filter.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public int? TenantId { get; set; }

        /// <summary>
        /// Optional feature catalog ID filter.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public Guid? FeatureId { get; set; }

        /// <summary>
        /// Status filter (Active, Suspended, Expired, All).
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? Status { get; set; }

        /// <summary>
        /// Keyword search for tenant name or feature name.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? Search { get; set; }

        /// <summary>
        /// 1-based page index.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public int PageNumber { get; set; } = 1;

        public int TotalCount { get; set; }
        public int TotalPages { get; set; }
        public int ActiveCount { get; set; }
        public int SuspendedCount { get; set; }
        public decimal TotalMonthlyValue { get; set; }

        public List<MasterTenantFeatureSubscription> Subscriptions { get; set; } = new();

        /// <summary>
        /// Page size for server-side pagination.
        /// </summary>
        public int PageSize { get; set; } = 20;

        /// <summary>
        /// Handles HTTP GET requests to query and paginate subscription records.
        /// </summary>
        public async Task OnGetAsync()
        {
            ActiveCount = await _dbContext.MasterTenantFeatureSubscriptions.CountAsync(s => s.IsActive);
            SuspendedCount = await _dbContext.MasterTenantFeatureSubscriptions.CountAsync(s => !s.IsActive);

            TotalMonthlyValue = await _dbContext.MasterTenantFeatureSubscriptions
                .Where(s => s.IsActive)
                .SumAsync(s => (decimal?)(s.CustomPriceOverride ?? s.RecurringPrice)) ?? 0m;

            var query = _dbContext.MasterTenantFeatureSubscriptions
                .Include(s => s.MasterTenantCatalog)
                .Include(s => s.MasterFeatureCatalog)
                .AsQueryable();

            if (TenantId.HasValue)
            {
                query = query.Where(s => s.MasterTenantCatalogId == TenantId.Value);
            }

            if (FeatureId.HasValue)
            {
                query = query.Where(s => s.MasterFeatureCatalogId == FeatureId.Value);
            }

            if (!string.IsNullOrWhiteSpace(Status))
            {
                if (Status.Equals("active", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(s => s.IsActive);
                }
                else if (Status.Equals("suspended", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(s => !s.IsActive);
                }
            }

            if (!string.IsNullOrWhiteSpace(Search))
            {
                var term = Search.Trim().ToLower();
                query = query.Where(s => s.MasterTenantCatalog.OrganizationName.ToLower().Contains(term)
                                      || s.MasterTenantCatalog.TenantKey.ToLower().Contains(term)
                                      || s.MasterFeatureCatalog.Name.ToLower().Contains(term)
                                      || s.MasterFeatureCatalog.FeatureCode.ToLower().Contains(term));
            }

            TotalCount = await query.CountAsync();
            TotalPages = (int)Math.Ceiling(TotalCount / (double)PageSize);
            if (TotalPages < 1) TotalPages = 1;
            if (PageNumber < 1) PageNumber = 1;
            if (PageNumber > TotalPages) PageNumber = TotalPages;

            Subscriptions = await query
                .OrderByDescending(s => s.CreatedUtc)
                .Skip((PageNumber - 1) * PageSize)
                .Take(PageSize)
                .ToListAsync();
        }

        /// <summary>
        /// Handles HTTP POST requests to toggle subscription active/suspended state.
        /// </summary>
        public async Task<IActionResult> OnPostToggleStatusAsync(Guid id)
        {
            var sub = await _dbContext.MasterTenantFeatureSubscriptions
                .Include(s => s.MasterTenantCatalog)
                .Include(s => s.MasterFeatureCatalog)
                .FirstOrDefaultAsync(s => s.Id == id);

            if (sub == null)
            {
                TempData["Error"] = "Subscription not found.";
                return RedirectToPage();
            }

            sub.IsActive = !sub.IsActive;
            sub.Status = sub.IsActive ? "Active" : "Suspended";

            _dbContext.MasterAuditLogs.Add(new MasterAuditLog
            {
                UserId = User.Identity?.Name,
                UserName = User.Identity?.Name,
                Action = sub.IsActive ? "Activate" : "Suspend",
                EntityType = "Subscription",
                EntityId = sub.Id.ToString(),
                Summary = $"Subscription for '{sub.MasterFeatureCatalog?.Name}' on tenant '{sub.MasterTenantCatalog?.OrganizationName}' was {(sub.IsActive ? "activated" : "suspended")}",
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers["User-Agent"].ToString(),
                CreatedUtc = DateTime.UtcNow
            });

            await _dbContext.SaveChangesAsync();
            TempData["Success"] = $"Subscription status changed to {sub.Status}.";

            return RedirectToPage();
        }
    }
}
