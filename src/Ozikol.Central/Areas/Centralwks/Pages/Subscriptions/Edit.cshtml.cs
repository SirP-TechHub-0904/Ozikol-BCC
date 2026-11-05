using System;
using System.ComponentModel.DataAnnotations;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Areas.Centralwks.Pages.Subscriptions
{
    /// <summary>
    /// PageModel modifying an existing tenant feature subscription, override rate, expiration date, and auto-renew policy.
    /// </summary>
    public class EditModel : PageModel
    {
        private readonly MasterCatalogDbContext _dbContext;

        /// <summary>
        /// Initializes a new instance of the <see cref="EditModel"/> class.
        /// </summary>
        /// <param name="dbContext">Master catalog database context.</param>
        public EditModel(MasterCatalogDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        /// <summary>
        /// Subscription ID to edit.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public Guid Id { get; set; }

        /// <summary>
        /// Loaded subscription entity.
        /// </summary>
        public MasterTenantFeatureSubscription Subscription { get; set; } = null!;

        /// <summary>
        /// Input model for editing subscription parameters.
        /// </summary>
        [BindProperty]
        public SubscriptionEditInputModel Input { get; set; } = new();

        /// <summary>
        /// Handles HTTP GET requests to populate subscription fields.
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

            Input = new SubscriptionEditInputModel
            {
                DurationType = (int)sub.DurationType,
                CustomPriceOverride = sub.CustomPriceOverride,
                ExpiresAtUtc = sub.ExpiresAtUtc,
                AutoRenew = sub.AutoRenew,
                IsActive = sub.IsActive,
                Status = sub.Status
            };

            return Page();
        }

        /// <summary>
        /// Handles HTTP POST requests to save subscription updates with audit logging.
        /// </summary>
        public async Task<IActionResult> OnPostAsync()
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

            Subscription = sub;

            if (!ModelState.IsValid)
            {
                return Page();
            }

            sub.DurationType = (SubscriptionBillingDuration)Input.DurationType;
            sub.CustomPriceOverride = Input.CustomPriceOverride;
            sub.ExpiresAtUtc = Input.ExpiresAtUtc;
            sub.AutoRenew = Input.AutoRenew;
            sub.IsActive = Input.IsActive;
            sub.Status = Input.Status;

            _dbContext.MasterAuditLogs.Add(new MasterAuditLog
            {
                UserId = User.Identity?.Name,
                UserName = User.Identity?.Name,
                Action = "Update",
                EntityType = "Subscription",
                EntityId = sub.Id.ToString(),
                Summary = $"Updated subscription terms for '{sub.MasterFeatureCatalog?.Name}' on tenant '{sub.MasterTenantCatalog?.OrganizationName}'",
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers["User-Agent"].ToString(),
                CreatedUtc = DateTime.UtcNow
            });

            await _dbContext.SaveChangesAsync();

            TempData["Success"] = "Subscription updated successfully.";
            return RedirectToPage("/Subscriptions/Details", new { id = sub.Id });
        }

        /// <summary>
        /// Handles HTTP POST requests to immediately set subscription expiration by a specific number of days from now.
        /// Useful for testing 2-day warning thresholds, 30-day monthly cycles, 365-day annual terms, or immediate overdue status (-1 day).
        /// </summary>
        /// <param name="days">Number of days from UTC now to set expiration.</param>
        /// <returns>Redirect back to subscription details with updated countdown.</returns>
        public async Task<IActionResult> OnPostSetExpiryDaysAsync(int days)
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

            var newExpiry = DateTime.UtcNow.AddDays(days);
            sub.ExpiresAtUtc = newExpiry;
            if (days < 0)
            {
                sub.Status = "Expired";
            }
            else if (sub.Status == "Expired" || sub.Status == "Suspended")
            {
                sub.Status = "Active";
                sub.IsActive = true;
            }

            _dbContext.MasterAuditLogs.Add(new MasterAuditLog
            {
                UserId = User.Identity?.Name,
                UserName = User.Identity?.Name,
                Action = "SetSubscriptionExpiryDays",
                EntityType = "Subscription",
                EntityId = sub.Id.ToString(),
                Summary = $"Subscription expiration for '{sub.MasterFeatureCatalog?.Name}' set to {days} days from now ({newExpiry:yyyy-MM-dd HH:mm:ss} UTC) for tenant '{sub.MasterTenantCatalog?.OrganizationName}'.",
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers["User-Agent"].ToString(),
                CreatedUtc = DateTime.UtcNow
            });

            await _dbContext.SaveChangesAsync();

            TempData["Success"] = $"Expiration successfully set to {days} day(s) from now ({newExpiry:MMM dd, yyyy HH:mm} UTC).";
            return RedirectToPage("/Subscriptions/Details", new { id = sub.Id });
        }

        /// <summary>
        /// Input binding model for editing.
        /// </summary>
        public class SubscriptionEditInputModel
        {
            [Display(Name = "Billing Duration Cadence")]
            public int DurationType { get; set; }

            [Display(Name = "Custom Price Override ($)")]
            public decimal? CustomPriceOverride { get; set; }

            [Required]
            [Display(Name = "Expiration Date UTC")]
            public DateTime ExpiresAtUtc { get; set; }

            [Display(Name = "Auto-Renew Enabled")]
            public bool AutoRenew { get; set; }

            [Display(Name = "Active Status")]
            public bool IsActive { get; set; }

            [Required]
            [StringLength(30)]
            [Display(Name = "Status String")]
            public string Status { get; set; } = "Active";
        }
    }
}
