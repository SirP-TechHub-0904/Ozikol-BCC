using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Areas.Admin.Pages.Features
{
    /// <summary>
    /// PageModel displaying capability diagnostics, pricing matrix, and active subscribing tenant fleet instances.
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
        /// Feature ID to inspect.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public Guid Id { get; set; }

        /// <summary>
        /// The loaded feature entity.
        /// </summary>
        public MasterFeatureCatalog Feature { get; set; } = null!;

        /// <summary>
        /// All tenant subscriptions for this capability.
        /// </summary>
        public List<MasterTenantFeatureSubscription> Subscriptions { get; set; } = new();

        /// <summary>
        /// Handles HTTP GET requests to retrieve capability details and subscribing tenants.
        /// </summary>
        public async Task<IActionResult> OnGetAsync()
        {
            var feature = await _dbContext.MasterFeatureCatalogs.FindAsync(Id);
            if (feature == null)
            {
                TempData["Error"] = "Capability not found.";
                return RedirectToPage("/Features/Index");
            }

            Feature = feature;

            Subscriptions = await _dbContext.MasterTenantFeatureSubscriptions
                .Where(s => s.MasterFeatureCatalogId == Id)
                .Include(s => s.MasterTenantCatalog)
                .OrderByDescending(s => s.IsActive)
                .ThenBy(s => s.ExpiresAtUtc)
                .ToListAsync();

            return Page();
        }

        /// <summary>
        /// Handles HTTP POST requests to toggle capability status.
        /// </summary>
        public async Task<IActionResult> OnPostToggleStatusAsync()
        {
            var feature = await _dbContext.MasterFeatureCatalogs.FindAsync(Id);
            if (feature == null)
            {
                TempData["Error"] = "Capability not found.";
                return RedirectToPage("/Features/Index");
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

            return RedirectToPage(new { id = Id });
        }
    }
}
