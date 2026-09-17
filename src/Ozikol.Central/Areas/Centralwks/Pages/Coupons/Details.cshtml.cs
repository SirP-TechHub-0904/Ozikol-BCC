using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Areas.Centralwks.Pages.Coupons
{
    /// <summary>
    /// PageModel displaying granular performance metrics, redemption audit records,
    /// and tenant organization history for an individual promotional coupon voucher.
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
        /// The loaded coupon voucher entity.
        /// </summary>
        public MasterCoupon Coupon { get; set; } = null!;

        /// <summary>
        /// Total discount value saved by tenants across all redemptions in USD.
        /// </summary>
        public decimal TotalDiscountsGranted { get; set; }

        /// <summary>
        /// Percentage of redemption quota consumed (0 - 100%).
        /// </summary>
        public double QuotaConsumptionPercentage { get; set; }

        /// <summary>
        /// Collection of historical redemption records for this voucher.
        /// </summary>
        public List<MasterCouponRedemption> RedemptionsList { get; set; } = new();

        /// <summary>
        /// Handles HTTP GET requests to load voucher details and associated redemption history.
        /// </summary>
        /// <param name="id">The unique identifier of the coupon.</param>
        /// <returns>Page result or NotFound if the voucher does not exist.</returns>
        public async Task<IActionResult> OnGetAsync(Guid id)
        {
            var coupon = await _dbContext.MasterCoupons
                .Include(c => c.SpecificFeature)
                .Include(c => c.Redemptions)
                    .ThenInclude(r => r.MasterTenantCatalog)
                .Include(c => c.Redemptions)
                    .ThenInclude(r => r.MasterFeatureCatalog)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (coupon == null)
            {
                return NotFound();
            }

            Coupon = coupon;
            RedemptionsList = coupon.Redemptions
                .OrderByDescending(r => r.RedeemedAtUtc)
                .ToList();

            TotalDiscountsGranted = RedemptionsList.Sum(r => r.DiscountApplied);

            if (coupon.MaxRedemptions > 0)
            {
                QuotaConsumptionPercentage = Math.Min(100.0, (double)coupon.TimesRedeemed / coupon.MaxRedemptions * 100.0);
            }

            return Page();
        }

        /// <summary>
        /// Handles HTTP POST requests to toggle the active status of the voucher.
        /// </summary>
        /// <param name="id">Coupon unique identifier.</param>
        /// <returns>Redirect back to details page.</returns>
        public async Task<IActionResult> OnPostToggleActiveAsync(Guid id)
        {
            var coupon = await _dbContext.MasterCoupons.FindAsync(id);
            if (coupon == null)
            {
                return NotFound();
            }

            coupon.IsActive = !coupon.IsActive;

            _dbContext.MasterAuditLogs.Add(new MasterAuditLog
            {
                UserId = User.Identity?.Name,
                UserName = User.Identity?.Name,
                Action = "Update",
                EntityType = "Coupon",
                EntityId = coupon.Id.ToString(),
                Summary = $"Toggled voucher status for '{coupon.Code}' to {(coupon.IsActive ? "Active" : "Inactive")}",
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers["User-Agent"].ToString(),
                CreatedUtc = DateTime.UtcNow
            });

            await _dbContext.SaveChangesAsync();
            TempData["Success"] = $"Voucher status updated to {(coupon.IsActive ? "Active" : "Inactive")}.";

            return RedirectToPage(new { id });
        }
    }
}
