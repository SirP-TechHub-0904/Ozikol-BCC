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
    /// PageModel for creating a new promotional voucher / coupon in the master platform database.
    /// Supports percentage discount configuration (1-100%), feature restriction mapping, and redemption cap controls.
    /// </summary>
    public class CreateModel : PageModel
    {
        private readonly MasterCatalogDbContext _dbContext;

        /// <summary>
        /// Initializes a new instance of the <see cref="CreateModel"/> class.
        /// </summary>
        /// <param name="dbContext">Master catalog database context.</param>
        public CreateModel(MasterCatalogDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        /// <summary>
        /// Input model capturing voucher parameters.
        /// </summary>
        [BindProperty]
        public CouponInputModel Input { get; set; } = new();

        /// <summary>
        /// Selectable list of modular capabilities for feature-restricted voucher scopes.
        /// </summary>
        public List<SelectListItem> FeatureOptions { get; set; } = new();

        /// <summary>
        /// Handles HTTP GET requests to initialize the voucher creation form.
        /// </summary>
        public async Task OnGetAsync()
        {
            await PopulateFeatureOptionsAsync();
        }

        /// <summary>
        /// Handles HTTP POST requests to validate and save the new voucher.
        /// </summary>
        public async Task<IActionResult> OnPostAsync()
        {
            if (!ModelState.IsValid)
            {
                await PopulateFeatureOptionsAsync();
                return Page();
            }

            var cleanCode = Input.Code.Trim().ToUpperInvariant();

            var codeExists = await _dbContext.MasterCoupons.AnyAsync(c => c.Code == cleanCode);
            if (codeExists)
            {
                ModelState.AddModelError("Input.Code", $"The promo code '{cleanCode}' already exists. Please choose a unique code.");
                await PopulateFeatureOptionsAsync();
                return Page();
            }

            var coupon = new MasterCoupon
            {
                Id = Guid.NewGuid(),
                Code = cleanCode,
                Description = Input.Description?.Trim(),
                IsPercentage = Input.IsPercentage,
                DiscountPercentage = Input.IsPercentage ? Input.DiscountPercentage : 0.00m,
                DiscountAmount = !Input.IsPercentage ? Input.DiscountAmount : 0.00m,
                SpecificFeatureId = Input.SpecificFeatureId,
                MaxRedemptions = Input.MaxRedemptions,
                TimesRedeemed = 0,
                StartsAtUtc = Input.StartsAtUtc ?? DateTime.UtcNow,
                ExpiresAtUtc = Input.ExpiresAtUtc,
                IsActive = Input.IsActive,
                CreatedUtc = DateTime.UtcNow
            };

            _dbContext.MasterCoupons.Add(coupon);

            _dbContext.MasterAuditLogs.Add(new MasterAuditLog
            {
                UserId = User.Identity?.Name,
                UserName = User.Identity?.Name,
                Action = "Create",
                EntityType = "Coupon",
                EntityId = coupon.Id.ToString(),
                Summary = $"Created new voucher promo code '{coupon.Code}' with {(coupon.IsPercentage ? $"{coupon.DiscountPercentage}%" : $"${coupon.DiscountAmount}")} discount",
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers["User-Agent"].ToString(),
                CreatedUtc = DateTime.UtcNow
            });

            await _dbContext.SaveChangesAsync();
            TempData["Success"] = $"Voucher '{coupon.Code}' created successfully.";

            return RedirectToPage("/Coupons/Index");
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
        /// Input model schema for coupon creation and updates.
        /// </summary>
        public class CouponInputModel
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
            public DateTime? StartsAtUtc { get; set; } = DateTime.UtcNow;

            [Display(Name = "Expiration Date (UTC - Optional)")]
            public DateTime? ExpiresAtUtc { get; set; }

            [Display(Name = "Is Active")]
            public bool IsActive { get; set; } = true;
        }
    }
}
