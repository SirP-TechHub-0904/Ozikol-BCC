using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Areas.Centralwks.Pages.Tenants
{
    /// <summary>
    /// PageModel enabling administrators to toggle, provision, and configure modular capability subscriptions for a specific tenant database.
    /// </summary>
    public class FeaturesModel : PageModel
    {
        private readonly MasterCatalogDbContext _dbContext;

        /// <summary>
        /// Initializes a new instance of the <see cref="FeaturesModel"/> class.
        /// </summary>
        /// <param name="dbContext">Master catalog database context.</param>
        public FeaturesModel(MasterCatalogDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        /// <summary>
        /// Tenant ID whose subscriptions are being managed.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public Guid Id { get; set; }

        /// <summary>
        /// Alias tenant ID parameter for navigation links.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public Guid? TenantId { get; set; }

        /// <summary>
        /// The loaded tenant entity.
        /// </summary>
        public MasterTenantCatalog Tenant { get; set; } = null!;

        /// <summary>
        /// All platform capabilities grouped by category.
        /// </summary>
        public List<FeatureItemDto> AvailableFeatures { get; set; } = new();

        /// <summary>
        /// Handles HTTP GET requests to build the feature activation matrix.
        /// </summary>
        public async Task<IActionResult> OnGetAsync()
        {
            var targetId = Id != Guid.Empty ? Id : (TenantId ?? Guid.Empty);
            var tenant = await _dbContext.MasterTenantCatalogs
                .Include(t => t.FeatureSubscriptions)
                .FirstOrDefaultAsync(t => t.Id == targetId);

            if (tenant == null)
            {
                TempData["Error"] = "Tenant organization not found.";
                return RedirectToPage("/Tenants/Index");
            }

            Id = tenant.Id;
            Tenant = tenant;

            var allFeatures = await _dbContext.MasterFeatureCatalogs
                .Where(f => f.IsActive)
                .OrderBy(f => f.Category)
                .ThenBy(f => f.Name)
                .ToListAsync();

            var tenantSubscriptions = tenant.FeatureSubscriptions.ToDictionary(s => s.MasterFeatureCatalogId);

            AvailableFeatures = allFeatures.Select(f =>
            {
                tenantSubscriptions.TryGetValue(f.Id, out var sub);
                return new FeatureItemDto
                {
                    Feature = f,
                    Subscription = sub,
                    IsSubscribed = sub != null && sub.IsActive
                };
            }).ToList();

            return Page();
        }

        /// <summary>
        /// Handles HTTP POST requests to activate a modular capability for this tenant.
        /// </summary>
        /// <param name="featureId">Target feature catalog ID.</param>
        /// <param name="durationType">Billing cadence (1=Monthly, 2=Quarterly, 3=Yearly).</param>
        /// <param name="priceOverride">Optional custom price override.</param>
        public async Task<IActionResult> OnPostActivateAsync(Guid featureId, int durationType = 1, decimal? priceOverride = null)
        {
            var tenant = await _dbContext.MasterTenantCatalogs
                .Include(t => t.FeatureSubscriptions)
                .FirstOrDefaultAsync(t => t.Id == Id);

            if (tenant == null)
            {
                TempData["Error"] = "Tenant not found.";
                return RedirectToPage("/Tenants/Index");
            }

            var feature = await _dbContext.MasterFeatureCatalogs.FindAsync(featureId);
            if (feature == null)
            {
                TempData["Error"] = "Feature capability not found.";
                return RedirectToPage(new { id = Id });
            }

            var existing = tenant.FeatureSubscriptions.FirstOrDefault(s => s.MasterFeatureCatalogId == featureId);
            var duration = (SubscriptionBillingDuration)durationType;

            if (existing != null)
            {
                existing.IsActive = true;
                existing.Status = "Active";
                existing.DurationType = duration;
                existing.CustomPriceOverride = priceOverride;
                existing.ExpiresAtUtc = duration switch
                {
                    SubscriptionBillingDuration.Yearly => DateTime.UtcNow.AddYears(1),
                    SubscriptionBillingDuration.Quarterly => DateTime.UtcNow.AddMonths(3),
                    _ => DateTime.UtcNow.AddMonths(1)
                };
            }
            else
            {
                var newSub = new MasterTenantFeatureSubscription
                {
                    Id = Guid.NewGuid(),
                    MasterTenantCatalogId = tenant.Id,
                    MasterFeatureCatalogId = feature.Id,
                    DurationType = duration,
                    RecurringPrice = duration switch
                    {
                        SubscriptionBillingDuration.Yearly => feature.YearlyPrice > 0 ? feature.YearlyPrice : feature.MonthlyPrice * 12 * 0.8m,
                        SubscriptionBillingDuration.Quarterly => feature.QuarterlyPrice > 0 ? feature.QuarterlyPrice : feature.MonthlyPrice * 3 * 0.9m,
                        _ => feature.MonthlyPrice
                    },
                    CustomPriceOverride = priceOverride,
                    StartsAtUtc = DateTime.UtcNow,
                    ExpiresAtUtc = duration switch
                    {
                        SubscriptionBillingDuration.Yearly => DateTime.UtcNow.AddYears(1),
                        SubscriptionBillingDuration.Quarterly => DateTime.UtcNow.AddMonths(3),
                        _ => DateTime.UtcNow.AddMonths(1)
                    },
                    AutoRenew = true,
                    IsActive = true,
                    Status = "Active",
                    CreatedUtc = DateTime.UtcNow
                };
                _dbContext.MasterTenantFeatureSubscriptions.Add(newSub);
            }

            _dbContext.MasterAuditLogs.Add(new MasterAuditLog
            {
                UserId = User.Identity?.Name,
                UserName = User.Identity?.Name,
                Action = "Activate",
                EntityType = "FeatureSubscription",
                EntityId = feature.Id.ToString(),
                Summary = $"Activated feature '{feature.Name}' ({feature.FeatureCode}) for tenant '{tenant.OrganizationName}'",
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers["User-Agent"].ToString(),
                CreatedUtc = DateTime.UtcNow
            });

            await _dbContext.SaveChangesAsync();
            TempData["Success"] = $"Capability '{feature.Name}' activated for {tenant.OrganizationName}.";

            return RedirectToPage(new { id = Id });
        }

        /// <summary>
        /// Handles HTTP POST requests to deactivate / suspend a specific module for this tenant.
        /// </summary>
        /// <param name="subscriptionId">Subscription identifier.</param>
        public async Task<IActionResult> OnPostDeactivateAsync(Guid subscriptionId)
        {
            var sub = await _dbContext.MasterTenantFeatureSubscriptions
                .Include(s => s.MasterFeatureCatalog)
                .Include(s => s.MasterTenantCatalog)
                .FirstOrDefaultAsync(s => s.Id == subscriptionId && s.MasterTenantCatalogId == Id);

            if (sub == null)
            {
                TempData["Error"] = "Subscription not found.";
                return RedirectToPage(new { id = Id });
            }

            sub.IsActive = false;
            sub.Status = "Suspended";

            _dbContext.MasterAuditLogs.Add(new MasterAuditLog
            {
                UserId = User.Identity?.Name,
                UserName = User.Identity?.Name,
                Action = "Suspend",
                EntityType = "FeatureSubscription",
                EntityId = sub.Id.ToString(),
                Summary = $"Suspended feature '{sub.MasterFeatureCatalog?.Name}' for tenant '{sub.MasterTenantCatalog?.OrganizationName}'",
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers["User-Agent"].ToString(),
                CreatedUtc = DateTime.UtcNow
            });

            await _dbContext.SaveChangesAsync();
            TempData["Success"] = $"Capability suspended.";

            return RedirectToPage(new { id = Id });
        }

        /// <summary>
        /// View transfer representation of a capability with optional subscription state.
        /// </summary>
        public class FeatureItemDto
        {
            public MasterFeatureCatalog Feature { get; set; } = null!;
            public MasterTenantFeatureSubscription? Subscription { get; set; }
            public bool IsSubscribed { get; set; }
        }
    }
}
