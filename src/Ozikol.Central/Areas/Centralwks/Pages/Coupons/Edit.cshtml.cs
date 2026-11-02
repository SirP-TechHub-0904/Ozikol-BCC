using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Areas.Centralwks.Pages.Coupons
{
    /// <summary>
    /// PageModel for editing an existing promotional voucher / coupon in the master platform database.
    /// Supports updating discount percentage, feature scope, expiration dates, and redemption caps.
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
        /// The coupon ID being modified.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public Guid Id { get; set; }

        /// <summary>
        /// Input model capturing updated coupon parameters.
        /// </summary>
        [BindProperty]
        public CouponEditInputModel Input { get; set; } = new();

        /// <summary>
        /// Selectable list of modular capabilities for feature-restricted voucher scopes.
        /// </summary>
        public List<SelectListItem> FeatureOptions { get; set; } = new();

        /// <summary>
        /// The existing coupon entity for display.
        /// </summary>
        public MasterCoupon Coupon { get; set; } = null!;

        /// <summary>
        /// Handles HTTP GET requests to load the coupon for editing.
        /// </summary>
        /// <param name="id">The coupon unique identifier.</param>
        /// <returns>Page result or NotFound.</returns>
        public async Task<IActionResult> OnGetAsync(Guid id)
        {
            var coupon = await _dbContext.MasterCoupons.FindAsync(id);
            if (coupon == null)
            {
                return NotFound();
            }

            Coupon = coupon;
            Input = new CouponEditInputModel
            {
                Code = coupon.Code,
                Description = coupon.Description,
                IsPercentage = coupon.IsPercentage,
                DiscountPercentage = coupon.DiscountPercentage,
                DiscountAmount = coupon.DiscountAmount,
                SpecificFeatureId = coupon.SpecificFeatureId,
                MaxRedemptions = coupon.MaxRedemptions,
                StartsAtUtc = coupon.StartsAtUtc,
                ExpiresAtUtc = coupon.ExpiresAtUtc,
                IsActive = coupon.IsActive
            };

            await PopulateFeatureOptionsAsync();
            return Page();
        }

        /// <summary>
        /// Handles HTTP POST requests to validate and save changes to the voucher.
        /// </summary>
        /// <returns>Redirect to details or re-render page on validation error.</returns>
        public async Task<IActionResult> OnPostAsync()
        {
            var coupon = await _dbContext.MasterCoupons.FindAsync(Id);
            if (coupon == null)
            {
                return NotFound();
            }

            Coupon = coupon;

            if (!ModelState.IsValid)
            {
                await PopulateFeatureOptionsAsync();
                return Page();
            }

            var cleanCode = Input.Code.Trim().ToUpperInvariant();

            // Check if code was renamed and conflicts with an existing code
            if (cleanCode != coupon.Code)
            {
                var codeExists = await _dbContext.MasterCoupons.AnyAsync(c => c.Code == cleanCode && c.Id != Id);
                if (codeExists)
                {
                    ModelState.AddModelError("Input.Code", $"The promo code '{cleanCode}' already exists.");
                    await PopulateFeatureOptionsAsync();
                    return Page();
                }
            }

            coupon.Code = cleanCode;
            coupon.Description = Input.Description?.Trim();
            coupon.IsPercentage = Input.IsPercentage;
            coupon.DiscountPercentage = Input.IsPercentage ? Input.DiscountPercentage : 0.00m;
            coupon.DiscountAmount = !Input.IsPercentage ? Input.DiscountAmount : 0.00m;
            coupon.SpecificFeatureId = Input.SpecificFeatureId;
            coupon.MaxRedemptions = Input.MaxRedemptions;
            coupon.StartsAtUtc = Input.StartsAtUtc ?? DateTime.UtcNow;
            coupon.ExpiresAtUtc = Input.ExpiresAtUtc;
            coupon.IsActive = Input.IsActive;

            _dbContext.MasterAuditLogs.Add(new MasterAuditLog
            {
                UserId = User.Identity?.Name,
                UserName = User.Identity?.Name,
                Action = "Update",
                EntityType = "Coupon",
                EntityId = coupon.Id.ToString(),
                Summary = $"Updated voucher promo code '{coupon.Code}' configuration",
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers["User-Agent"].ToString(),
                CreatedUtc = DateTime.UtcNow
            });

            await _dbContext.SaveChangesAsync();
            TempData["Success"] = $"Voucher '{coupon.Code}' updated successfully.";

            return RedirectToPage("/Coupons/Details", new { id = coupon.Id });
        }

        private async Task PopulateFeatureOptionsAsync()
        {
            FeatureOptions = await _dbContext.MasterFeatureCatalogs
                .AsNoTracking()
                .OrderBy(f => f.Category)
                .ThenBy(f => f.Name)
                .Select(f => new SelectListItem
                {
                    Value = f.Id.ToString(),
                    Text = $"{f.Name} ({f.Category} • {f.FeatureCode})"
                })
                .ToListAsync();
        }

        /// <summary>
        /// Input model schema for coupon editing.
        /// </summary>
        public class CouponEditInputModel
        {
            [Required]
            [MaxLength(40)]
            [Display(Name = "Voucher Promo Code")]
            public string Code { get; set; } = string.Empty;

            [MaxLength(300)]
            [Display(Name = "Campaign Description")]
            public string? Description { get; set; }

            [Display(Name = "Discount Type")]
            public bool IsPercentage { get; set; } = true;

            [Range(1, 100)]
            [Display(Name = "Discount Percentage (1 - 100%)")]
            public decimal DiscountPercentage { get; set; } = 100.00m;

            [Range(0, 100000)]
            [Display(Name = "Fixed Discount Amount ($)")]
            public decimal DiscountAmount { get; set; } = 0.00m;

            [Display(Name = "Specific Feature Restriction (Optional)")]
            public Guid? SpecificFeatureId { get; set; }

            [Range(0, 1000000)]
            [Display(Name = "Max Redemptions (0 for Unlimited)")]
            public int MaxRedemptions { get; set; } = 0;

            [Display(Name = "Valid From Date (UTC)")]
            public DateTime? StartsAtUtc { get; set; }

            [Display(Name = "Expiration Date (UTC - Optional)")]
            public DateTime? ExpiresAtUtc { get; set; }

            [Display(Name = "Is Active")]
            public bool IsActive { get; set; } = true;
        }
    }
}
