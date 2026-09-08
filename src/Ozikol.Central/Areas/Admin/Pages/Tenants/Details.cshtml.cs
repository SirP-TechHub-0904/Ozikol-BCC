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
    /// PageModel presenting comprehensive sovereign tenant workspace diagnostics, feature subscriptions, billing transactions, and audit history.
    /// </summary>
    public class DetailsModel : PageModel
    {
        private readonly MasterCatalogDbContext _dbContext;

        /// <summary>
        /// Initializes a new instance of the <see cref="DetailsModel"/> class.
        /// </summary>
        /// <param name="dbContext">Master catalog database context.</param>
        public DetailsModel(MasterCatalogDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        /// <summary>
        /// Tenant ID to view.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public int Id { get; set; }

        /// <summary>
        /// The loaded tenant entity.
        /// </summary>
        public MasterTenantCatalog Tenant { get; set; } = null!;

        /// <summary>
        /// Active feature subscriptions activated for this tenant.
        /// </summary>
        public List<MasterTenantFeatureSubscription> Subscriptions { get; set; } = new();

        /// <summary>
        /// Billing and payment transaction records linked to this tenant.
        /// </summary>
        public List<MasterBillingTransaction> BillingTransactions { get; set; } = new();

        /// <summary>
        /// Historical audit log events associated with this tenant entity.
        /// </summary>
        public List<MasterAuditLog> AuditLogs { get; set; } = new();

        /// <summary>
        /// Handles HTTP GET requests to load full tenant diagnostics.
        /// </summary>
        public async Task<IActionResult> OnGetAsync()
        {
            var tenant = await _dbContext.MasterTenantCatalogs
                .Include(t => t.FeatureSubscriptions)
                    .ThenInclude(s => s.MasterFeatureCatalog)
                .FirstOrDefaultAsync(t => t.Id == Id);

            if (tenant == null)
            {
                TempData["Error"] = "Tenant organization not found.";
                return RedirectToPage("/Tenants/Index");
            }

            Tenant = tenant;
            Subscriptions = tenant.FeatureSubscriptions.OrderByDescending(s => s.IsActive).ThenBy(s => s.CreatedUtc).ToList();

            BillingTransactions = await _dbContext.MasterBillingTransactions
                .Where(b => b.MasterTenantCatalogId == Id)
                .OrderByDescending(b => b.CreatedUtc)
                .Take(10)
                .ToListAsync();

            var tenantIdString = Id.ToString();
            AuditLogs = await _dbContext.MasterAuditLogs
                .Where(a => a.EntityType == "Tenant" && a.EntityId == tenantIdString)
                .OrderByDescending(a => a.CreatedUtc)
                .Take(10)
                .ToListAsync();

            return Page();
        }

        /// <summary>
        /// Handles HTTP POST requests to toggle tenant active/suspended status from the details view.
        /// </summary>
        public async Task<IActionResult> OnPostToggleStatusAsync()
        {
            var tenant = await _dbContext.MasterTenantCatalogs.FindAsync(Id);
            if (tenant == null)
            {
                TempData["Error"] = "Tenant organization not found.";
                return RedirectToPage("/Tenants/Index");
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

            return RedirectToPage(new { id = Id });
        }
    }
}
