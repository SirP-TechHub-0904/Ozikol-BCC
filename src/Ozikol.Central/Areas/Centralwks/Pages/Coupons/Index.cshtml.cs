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
    /// PageModel displaying and managing the master promotional voucher and coupon catalog across the platform.
    /// Supports keyword search, scope filtering, active status toggling, and deletion with full audit logging.
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
        /// Search keyword filter for coupon code or description.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? Search { get; set; }

        /// <summary>
        /// Scope filter ("all", "universal", "feature").
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? Scope { get; set; }

        /// <summary>
        /// Total vouchers in catalog.
        /// </summary>
        public int TotalCount { get; set; }

        /// <summary>
        /// Total currently active vouchers.
        /// </summary>
        public int ActiveCount { get; set; }

        /// <summary>
        /// Total successful redemptions across all vouchers.
        /// </summary>
        public int TotalRedemptions { get; set; }

        /// <summary>
        /// Total financial discount value redeemed across the platform in USD.
        /// </summary>
        public decimal TotalDiscountValueGranted { get; set; }

        /// <summary>
        /// List of coupons matching active query filters.
        /// </summary>
        public List<MasterCoupon> Coupons { get; set; } = new();

        /// <summary>
        /// Handles HTTP GET requests to load coupons and financial metrics.
        /// </summary>
        public async Task OnGetAsync()
        {
            TotalCount = await _dbContext.MasterCoupons.CountAsync();
            ActiveCount = await _dbContext.MasterCoupons.CountAsync(c => c.IsActive);
            TotalRedemptions = await _dbContext.MasterCouponRedemptions.CountAsync();
            TotalDiscountValueGranted = await _dbContext.MasterCouponRedemptions.SumAsync(r => (decimal?)r.DiscountApplied) ?? 0.00m;

            var query = _dbContext.MasterCoupons
                .Include(c => c.SpecificFeature)
                .Include(c => c.Redemptions)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(Search))
            {
                var term = Search.Trim().ToLower();
                query = query.Where(c => c.Code.ToLower().Contains(term) || (c.Description != null && c.Description.ToLower().Contains(term)));
            }

            if (Scope == "universal")
            {
                query = query.Where(c => c.SpecificFeatureId == null);
            }
            else if (Scope == "feature")
            {
                query = query.Where(c => c.SpecificFeatureId != null);
            }

            Coupons = await query
                .OrderByDescending(c => c.CreatedUtc)
                .ToListAsync();
        }

        /// <summary>
        /// Handles HTTP POST requests to toggle coupon active status with audit logging.
        /// </summary>
        public async Task<IActionResult> OnPostToggleStatusAsync(Guid id)
        {
            var coupon = await _dbContext.MasterCoupons.FindAsync(id);
            if (coupon == null)
            {
                TempData["Error"] = "Voucher not found.";
                return RedirectToPage();
            }

            coupon.IsActive = !coupon.IsActive;

            _dbContext.MasterAuditLogs.Add(new MasterAuditLog
            {
                UserId = User.Identity?.Name,
                UserName = User.Identity?.Name,
                Action = coupon.IsActive ? "Activate" : "Deactivate",
                EntityType = "Coupon",
                EntityId = coupon.Id.ToString(),
                Summary = $"Voucher '{coupon.Code}' status toggled to {(coupon.IsActive ? "Active" : "Inactive")}",
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers["User-Agent"].ToString(),
                CreatedUtc = DateTime.UtcNow
            });

            await _dbContext.SaveChangesAsync();
            TempData["Success"] = $"Voucher '{coupon.Code}' is now {(coupon.IsActive ? "Active" : "Inactive")}.";

            return RedirectToPage();
        }

        /// <summary>
        /// Handles HTTP POST requests to delete a coupon if allowable.
        /// </summary>
        public async Task<IActionResult> OnPostDeleteAsync(Guid id)
        {
            var coupon = await _dbContext.MasterCoupons.FindAsync(id);
            if (coupon == null)
            {
                TempData["Error"] = "Voucher not found.";
                return RedirectToPage();
            }

            _dbContext.MasterCoupons.Remove(coupon);

            _dbContext.MasterAuditLogs.Add(new MasterAuditLog
            {
                UserId = User.Identity?.Name,
                UserName = User.Identity?.Name,
                Action = "Delete",
                EntityType = "Coupon",
                EntityId = id.ToString(),
                Summary = $"Deleted voucher promo code '{coupon.Code}'",
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers["User-Agent"].ToString(),
                CreatedUtc = DateTime.UtcNow
            });

            await _dbContext.SaveChangesAsync();
            TempData["Success"] = $"Voucher '{coupon.Code}' deleted successfully.";

            return RedirectToPage();
        }
    }
}
