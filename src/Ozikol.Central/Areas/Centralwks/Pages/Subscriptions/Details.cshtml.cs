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
    /// PageModel presenting comprehensive subscription contract terms, billing transactions, and tenant workspace details.
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
        /// Subscription identifier.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public Guid Id { get; set; }

        /// <summary>
        /// Loaded subscription entity.
        /// </summary>
        public MasterTenantFeatureSubscription Subscription { get; set; } = null!;

        /// <summary>
        /// Billing transactions covering this subscription.
        /// </summary>
        public List<MasterBillingTransaction> Transactions { get; set; } = new();

        /// <summary>
        /// Handles HTTP GET requests to retrieve subscription details.
        /// </summary>
        public async Task<IActionResult> OnGetAsync()
        {
            var sub = await _dbContext.MasterTenantFeatureSubscriptions
                .Include(s => s.MasterTenantCatalog)
                .Include(s => s.MasterFeatureCatalog)
                .FirstOrDefaultAsync(s => s.Id == Id);

            if (sub == null)
            {
                TempData["Error"] = "Subscription record not found.";
                return RedirectToPage("/Subscriptions/Index");
            }

            Subscription = sub;

            Transactions = await _dbContext.MasterBillingTransactions
                .Where(b => b.MasterTenantFeatureSubscriptionId == Id)
                .OrderByDescending(b => b.CreatedUtc)
                .ToListAsync();

            return Page();
        }

        /// <summary>
        /// Handles HTTP POST requests to toggle subscription status.
        /// </summary>
        public async Task<IActionResult> OnPostToggleStatusAsync()
        {
            var sub = await _dbContext.MasterTenantFeatureSubscriptions
                .Include(s => s.MasterTenantCatalog)
                .Include(s => s.MasterFeatureCatalog)
                .FirstOrDefaultAsync(s => s.Id == Id);

            if (sub == null)
            {
                TempData["Error"] = "Subscription not found.";
                return RedirectToPage("/Subscriptions/Index");
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
            TempData["Success"] = $"Subscription status updated to {sub.Status}.";

            return RedirectToPage(new { id = Id });
        }
    }
}
