using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Areas.Admin.Pages.Tenants
{
    /// <summary>
    /// PageModel displaying and managing sovereign tenant organization databases.
    /// Provides search, status filtering, pagination, and one-click database activation/suspension.
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
        /// Query filter for organization name, tenant key, or domain.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? Search { get; set; }

        /// <summary>
        /// Filter by active or suspended status.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? Status { get; set; }

        /// <summary>
        /// Current pagination index (1-based).
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public int PageNumber { get; set; } = 1;

        /// <summary>
        /// Total pages available.
        /// </summary>
        public int TotalPages { get; set; }

        /// <summary>
        /// Total matching tenant count.
        /// </summary>
        public int TotalCount { get; set; }

        /// <summary>
        /// Total active count across all tenants.
        /// </summary>
        public int ActiveCount { get; set; }

        /// <summary>
        /// Total suspended count across all tenants.
        /// </summary>
        public int SuspendedCount { get; set; }

        /// <summary>
        /// List of tenants for the current page.
        /// </summary>
        public List<MasterTenantCatalog> Tenants { get; set; } = new();

        private const int PageSize = 15;

        /// <summary>
        /// Handles HTTP GET requests to retrieve paginated tenant records.
        /// </summary>
        public async Task OnGetAsync()
        {
            ActiveCount = await _dbContext.MasterTenantCatalogs.CountAsync(t => t.IsActive);
            SuspendedCount = await _dbContext.MasterTenantCatalogs.CountAsync(t => !t.IsActive);

            var query = _dbContext.MasterTenantCatalogs.AsQueryable();

            if (!string.IsNullOrWhiteSpace(Search))
            {
                var term = Search.Trim().ToLower();
                query = query.Where(t => t.OrganizationName.ToLower().Contains(term)
                                      || t.TenantKey.ToLower().Contains(term)
                                      || t.PrimaryDomain.ToLower().Contains(term)
                                      || (t.AdminEmail != null && t.AdminEmail.ToLower().Contains(term)));
            }

            if (!string.IsNullOrWhiteSpace(Status))
            {
                if (Status.Equals("active", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(t => t.IsActive);
                }
                else if (Status.Equals("suspended", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(t => !t.IsActive);
                }
            }

            TotalCount = await query.CountAsync();
            TotalPages = (int)Math.Ceiling(TotalCount / (double)PageSize);
            if (TotalPages < 1) TotalPages = 1;
            if (PageNumber < 1) PageNumber = 1;
            if (PageNumber > TotalPages) PageNumber = TotalPages;

            Tenants = await query
                .OrderByDescending(t => t.CreatedUtc)
                .Skip((PageNumber - 1) * PageSize)
                .Take(PageSize)
                .Include(t => t.FeatureSubscriptions)
                .ToListAsync();
        }

        /// <summary>
        /// Handles HTTP POST requests to toggle tenant active/suspended status with audit trail logging.
        /// </summary>
        /// <param name="id">Tenant primary key.</param>
        /// <returns>Redirect back to tenant listing with flash notification.</returns>
        public async Task<IActionResult> OnPostToggleStatusAsync(int id)
        {
            var tenant = await _dbContext.MasterTenantCatalogs.FindAsync(id);
            if (tenant == null)
            {
                TempData["Error"] = "Tenant not found.";
                return RedirectToPage();
            }

            tenant.IsActive = !tenant.IsActive;
            tenant.UpdatedUtc = DateTime.UtcNow;

            _dbContext.MasterAuditLogs.Add(new MasterAuditLog
            {
                UserId = User.Identity?.Name,
                UserName = User.Identity?.Name,
                Action = tenant.IsActive ? "Activate" : "Suspend",
                EntityType = "Tenant",
                EntityId = tenant.Id.ToString(),
                Summary = $"Tenant '{tenant.OrganizationName}' ({tenant.TenantKey}) was {(tenant.IsActive ? "activated" : "suspended")}",
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers["User-Agent"].ToString(),
                CreatedUtc = DateTime.UtcNow
            });

            await _dbContext.SaveChangesAsync();
            TempData["Success"] = $"Tenant '{tenant.OrganizationName}' status changed to {(tenant.IsActive ? "Active" : "Suspended")}.";

            return RedirectToPage();
        }
    }
}
