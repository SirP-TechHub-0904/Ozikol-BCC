using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Ozikol.Central.Services;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Areas.Centralwks.Pages.Vouchers
{
    /// <summary>
    /// Administrative management console for reviewing, verifying, and approving promotional voucher applications.
    /// Supports granular configuration of granted access duration and selective feature scoping.
    /// </summary>
    [Authorize]
    public class IndexModel : PageModel
    {
        private readonly MasterCatalogDbContext _masterDbContext;
        private readonly ICentralEmailService _emailService;
        private readonly ILogger<IndexModel> _logger;

        public IndexModel(
            MasterCatalogDbContext masterDbContext,
            ICentralEmailService emailService,
            ILogger<IndexModel> logger)
        {
            _masterDbContext = masterDbContext;
            _emailService = emailService;
            _logger = logger;
        }

        public List<MasterVoucherApplication> Applications { get; set; } = new();
        public List<MasterFeatureCatalog> AvailableFeatures { get; set; } = new();

        public int TotalCount { get; set; }
        public int PendingCount { get; set; }
        public int ApprovedCount { get; set; }
        public int RejectedCount { get; set; }

        [BindProperty(SupportsGet = true)]
        public string? StatusFilter { get; set; } = "Pending";

        [BindProperty(SupportsGet = true)]
        public string? SearchTerm { get; set; }

        public async Task OnGetAsync()
        {
            await LoadDataAsync();
        }

        public async Task<IActionResult> OnPostApproveAsync(
            long applicationId,
            int durationDays,
            decimal discountPercentage,
            string scopeType,
            List<Guid> selectedFeatureIds,
            string? adminNotes)
        {
            var application = await _masterDbContext.MasterVoucherApplications
                .FirstOrDefaultAsync(a => a.Id == applicationId);

            if (application == null)
            {
                TempData["ErrorMessage"] = "Voucher application record not found.";
                return RedirectToPage(new { StatusFilter, SearchTerm });
            }

            if (application.Status == "Approved")
            {
                TempData["ErrorMessage"] = "This application has already been approved.";
                return RedirectToPage(new { StatusFilter, SearchTerm });
            }

            if (durationDays <= 0)
            {
                durationDays = 365;
            }

            if (discountPercentage <= 0 || discountPercentage > 100)
            {
                discountPercentage = 100.00m;
            }

            // Build feature summary
            string featuresSummary;
            string? allowedFeaturesJson = null;

            if (scopeType == "selective" && selectedFeatureIds != null && selectedFeatureIds.Any())
            {
                var featureNames = await _masterDbContext.MasterFeatureCatalogs
                    .Where(f => selectedFeatureIds.Contains(f.Id))
                    .Select(f => f.Name)
                    .ToListAsync();

                featuresSummary = string.Join(", ", featureNames);
                allowedFeaturesJson = JsonSerializer.Serialize(selectedFeatureIds);
            }
            else
            {
                featuresSummary = "Full Platform Suite";
            }

            // Generate unique voucher coupon code (e.g. VOUCHER-1YR-7F92A or VOUCHER-60D-9B12C)
            var durationCodePart = durationDays >= 365 ? "1YR" : $"{durationDays}D";
            var discountCodePart = discountPercentage >= 100.00m ? "" : $"-{discountPercentage:G29}PCT";
            var randomCode = Guid.NewGuid().ToString("N")[..5].ToUpperInvariant();
            var couponCode = $"VOUCHER-{durationCodePart}{discountCodePart}-{randomCode}";

            // Create MasterCoupon in Master DB
            var coupon = new MasterCoupon
            {
                Id = Guid.NewGuid(),
                Code = couponCode,
                Description = $"Promotional voucher for {application.OrganizationName} ({discountPercentage:G29}% OFF for {durationDays} days access)",
                IsPercentage = true,
                DiscountPercentage = discountPercentage,
                DurationDays = durationDays,
                AllowedFeatureIdsJson = allowedFeaturesJson,
                GrantedFeaturesSummary = featuresSummary,
                MaxRedemptions = 1,
                StartsAtUtc = DateTime.UtcNow,
                ExpiresAtUtc = DateTime.UtcNow.AddDays(Math.Max(durationDays, 60) + 30),
                IsActive = true,
                CreatedUtc = DateTime.UtcNow
            };

            _masterDbContext.MasterCoupons.Add(coupon);

            // Update Application Record
            application.Status = "Approved";
            application.IssuedCouponCode = couponCode;
            application.IssuedCouponId = coupon.Id;
            application.GrantedDurationDays = durationDays;
            application.GrantedDiscountPercentage = discountPercentage;
            application.GrantedFeaturesSummary = featuresSummary;
            application.AdminNotes = adminNotes?.Trim();
            application.ReviewedByAdminId = User.Identity?.Name ?? "CentralAdmin";
            application.ReviewedAtUtc = DateTime.UtcNow;

            await _masterDbContext.SaveChangesAsync();

            _logger.LogInformation("Approved voucher application [{Ref}]. Generated coupon [{Code}] ({Discount}% OFF, {Days}d) for [{Org}].",
                application.ReferenceNumber, couponCode, discountPercentage, durationDays, application.OrganizationName);

            // Dispatch Approval Email with Voucher Code
            try
            {
                await _emailService.SendVoucherApprovedEmailAsync(
                    application,
                    couponCode,
                    durationDays,
                    featuresSummary,
                    discountPercentage);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to dispatch voucher approval email for {Ref}", application.ReferenceNumber);
            }

            TempData["SuccessMessage"] = $"Voucher [{couponCode}] ({discountPercentage:G29}% OFF, {durationDays}d) approved and issued to {application.OrganizationName}.";
            return RedirectToPage(new { StatusFilter, SearchTerm });
        }

        public async Task<IActionResult> OnPostRejectAsync(long applicationId, string? reason)
        {
            var application = await _masterDbContext.MasterVoucherApplications
                .FirstOrDefaultAsync(a => a.Id == applicationId);

            if (application == null)
            {
                TempData["ErrorMessage"] = "Voucher application record not found.";
                return RedirectToPage(new { StatusFilter, SearchTerm });
            }

            application.Status = "Rejected";
            application.AdminNotes = reason?.Trim();
            application.ReviewedByAdminId = User.Identity?.Name ?? "CentralAdmin";
            application.ReviewedAtUtc = DateTime.UtcNow;

            await _masterDbContext.SaveChangesAsync();

            _logger.LogInformation("Rejected voucher application [{Ref}] for [{Org}]. Reason: {Reason}",
                application.ReferenceNumber, application.OrganizationName, reason);

            TempData["SuccessMessage"] = $"Application #{application.ReferenceNumber} marked as Rejected.";
            return RedirectToPage(new { StatusFilter, SearchTerm });
        }

        private async Task LoadDataAsync()
        {
            TotalCount = await _masterDbContext.MasterVoucherApplications.CountAsync();
            PendingCount = await _masterDbContext.MasterVoucherApplications.CountAsync(a => a.Status == "Pending");
            ApprovedCount = await _masterDbContext.MasterVoucherApplications.CountAsync(a => a.Status == "Approved");
            RejectedCount = await _masterDbContext.MasterVoucherApplications.CountAsync(a => a.Status == "Rejected");

            var query = _masterDbContext.MasterVoucherApplications.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(StatusFilter) && StatusFilter != "All")
            {
                query = query.Where(a => a.Status == StatusFilter);
            }

            if (!string.IsNullOrWhiteSpace(SearchTerm))
            {
                var term = SearchTerm.Trim().ToLower();
                query = query.Where(a =>
                    a.ReferenceNumber.ToLower().Contains(term) ||
                    a.FullName.ToLower().Contains(term) ||
                    a.WorkEmail.ToLower().Contains(term) ||
                    a.OrganizationName.ToLower().Contains(term) ||
                    (a.TwitterHandle != null && a.TwitterHandle.ToLower().Contains(term)));
            }

            Applications = await query
                .OrderByDescending(a => a.CreatedAtUtc)
                .Take(100)
                .ToListAsync();

            AvailableFeatures = await _masterDbContext.MasterFeatureCatalogs
                .AsNoTracking()
                .Where(f => f.IsActive)
                .OrderBy(f => f.Category)
                .ThenBy(f => f.Name)
                .ToListAsync();
        }
    }
}
