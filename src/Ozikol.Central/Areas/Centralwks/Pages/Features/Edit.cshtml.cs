using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol.Central.Services;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Areas.Centralwks.Pages.Features
{
    /// <summary>
    /// PageModel modifying modular capability configurations, pricing tiers in USD base currency, and metering models.
    /// </summary>
    public class EditModel : PageModel
    {
        private readonly MasterCatalogDbContext _dbContext;
        private readonly ICurrencyService _currencyService;

        /// <summary>
        /// The 10 canonical official Feature Suites of the Ozikol platform.
        /// </summary>
        public static readonly string[] CanonicalSuites = new[]
        {
            "People, Community & Collaboration",
            "Workforce, Rota & Scheduling",
            "Reports, Forms & Analytics",
            "Events & Training Management",
            "Finance & Commercial Revenue",
            "Operations & Workflows",
            "Communication, AI & Support",
            "Compliance, Learning & Certification",
            "Demographics & Civic Census",
            "Life Events & Publications"
        };

        /// <summary>
        /// Initializes a new instance of the <see cref="EditModel"/> class.
        /// </summary>
        /// <param name="dbContext">Master catalog database context.</param>
        /// <param name="currencyService">Central platform currency engine service.</param>
        public EditModel(MasterCatalogDbContext dbContext, ICurrencyService currencyService)
        {
            _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
            _currencyService = currencyService ?? throw new ArgumentNullException(nameof(currencyService));
        }

        /// <summary>
        /// Feature ID to edit.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public Guid Id { get; set; }

        /// <summary>
        /// The loaded feature entity.
        /// </summary>
        public MasterFeatureCatalog Feature { get; set; } = null!;

        /// <summary>
        /// Exchange rate multipliers for live client-side currency conversion.
        /// </summary>
        public decimal NgnRate => _currencyService.GetExchangeRate("NGN");
        public decimal GbpRate => _currencyService.GetExchangeRate("GBP");
        public decimal EurRate => _currencyService.GetExchangeRate("EUR");

        /// <summary>
        /// Form input binding model.
        /// </summary>
        [BindProperty]
        public FeatureEditInputModel Input { get; set; } = new();

        /// <summary>
        /// Converts a USD amount to formatted regional currency for preview.
        /// </summary>
        public string FormatPreview(decimal usdAmount, string currencyCode) => _currencyService.FormatUsdConverted(usdAmount, currencyCode);

        /// <summary>
        /// Handles HTTP GET requests to populate the edit form.
        /// </summary>
        public async Task<IActionResult> OnGetAsync()
        {
            var feature = await _dbContext.MasterFeatureCatalogs.FindAsync(Id);
            if (feature == null)
            {
                TempData["Error"] = "Capability not found in catalog.";
                return RedirectToPage("/Features/Index");
            }

            Feature = feature;

            var isYearlyOnly = feature.MonthlyPrice <= 0 && feature.YearlyPrice > 0;
            var qDiscount = 10;
            var yDiscount = 20;

            if (feature.MonthlyPrice > 0)
            {
                if (feature.YearlyPrice > 0 && feature.YearlyPrice < (feature.MonthlyPrice * 12m))
                {
                    yDiscount = (int)Math.Round((1.0m - (feature.YearlyPrice / (feature.MonthlyPrice * 12m))) * 100m);
                }
                if (feature.QuarterlyPrice > 0 && feature.QuarterlyPrice < (feature.MonthlyPrice * 3m))
                {
                    qDiscount = (int)Math.Round((1.0m - (feature.QuarterlyPrice / (feature.MonthlyPrice * 3m))) * 100m);
                }
            }

            Input = new FeatureEditInputModel
            {
                Name = feature.Name,
                Category = feature.Category,
                Description = feature.Description,
                Icon = feature.Icon,
                BillingType = (int)feature.BillingType,
                BillingCadence = isYearlyOnly ? "Yearly" : "Monthly",
                MonthlyPrice = feature.MonthlyPrice,
                QuarterlyDiscountPercent = qDiscount,
                YearlyDiscountPercent = yDiscount,
                QuarterlyPrice = feature.QuarterlyPrice,
                YearlyPrice = feature.YearlyPrice,
                IsCompulsory = feature.IsCompulsory,
                IsMetered = feature.IsMetered,
                MeterUnitName = feature.MeterUnitName,
                MeterUnitPrice = feature.MeterUnitPrice,
                MeterBatchSize = feature.MeterBlockSize,
                DisplayOrder = feature.SortOrder,
                IsActive = feature.IsActive
            };

            return Page();
        }

        /// <summary>
        /// Handles HTTP POST requests to persist updated capability configurations.
        /// </summary>
        public async Task<IActionResult> OnPostAsync()
        {
            var feature = await _dbContext.MasterFeatureCatalogs.FindAsync(Id);
            if (feature == null)
            {
                TempData["Error"] = "Capability not found.";
                return RedirectToPage("/Features/Index");
            }

            Feature = feature;

            if (!ModelState.IsValid)
            {
                return Page();
            }

            feature.Name = Input.Name.Trim();
            feature.Category = Input.Category.Trim();
            feature.Description = Input.Description?.Trim();
            feature.Icon = Input.Icon?.Trim();
            feature.BillingType = (FeatureBillingType)Input.BillingType;

            // Apply automated pricing logic based on cadence
            if (string.Equals(Input.BillingCadence, "Yearly", StringComparison.OrdinalIgnoreCase))
            {
                feature.MonthlyPrice = 0m;
                feature.QuarterlyPrice = 0m;
                feature.YearlyPrice = Math.Max(0m, Input.YearlyPrice);
            }
            else
            {
                // Monthly recurring with calculated percentage discounts
                var monthly = Math.Max(0m, Input.MonthlyPrice);
                var qDisc = Math.Clamp(Input.QuarterlyDiscountPercent, 0, 100);
                var yDisc = Math.Clamp(Input.YearlyDiscountPercent, 0, 100);

                feature.MonthlyPrice = monthly;
                feature.QuarterlyPrice = Math.Round((monthly * 3m) * (1.0m - (qDisc / 100m)), 2);
                feature.YearlyPrice = Math.Round((monthly * 12m) * (1.0m - (yDisc / 100m)), 2);
            }

            feature.IsCompulsory = Input.IsCompulsory;
            feature.IsMetered = Input.IsMetered;
            feature.MeterUnitName = Input.IsMetered ? Input.MeterUnitName?.Trim() : null;
            feature.MeterUnitPrice = Input.IsMetered ? Input.MeterUnitPrice : 0m;
            feature.MeterBlockSize = Input.IsMetered && Input.MeterBatchSize > 0 ? Input.MeterBatchSize : 1;
            feature.SortOrder = Input.DisplayOrder;
            feature.IsActive = Input.IsActive;

            _dbContext.MasterAuditLogs.Add(new MasterAuditLog
            {
                UserId = User.Identity?.Name,
                UserName = User.Identity?.Name,
                Action = "Update",
                EntityType = "Feature",
                EntityId = feature.Id.ToString(),
                Summary = $"Updated capability '{feature.Name}' ({feature.FeatureCode}) specifications and pricing",
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers["User-Agent"].ToString(),
                CreatedUtc = DateTime.UtcNow
            });

            await _dbContext.SaveChangesAsync();
            _currencyService.InvalidatePricingCache();

            TempData["Success"] = $"Capability '{feature.Name}' updated successfully.";
            return RedirectToPage("/Features/Details", new { id = feature.Id });
        }

        /// <summary>
        /// Form input binding model.
        /// </summary>
        public class FeatureEditInputModel
        {
            [Required(ErrorMessage = "Capability name is required.")]
            [StringLength(120)]
            public string Name { get; set; } = string.Empty;

            [Required(ErrorMessage = "Category is required.")]
            [StringLength(60)]
            public string Category { get; set; } = string.Empty;

            [StringLength(500)]
            public string? Description { get; set; }

            [StringLength(60)]
            public string? Icon { get; set; }

            public int BillingType { get; set; } = 1;

            /// <summary>
            /// Billing cadence: "Yearly" (Annual fixed subscription) or "Monthly".
            /// </summary>
            public string BillingCadence { get; set; } = "Yearly";

            [Range(0, 100000)]
            public decimal MonthlyPrice { get; set; }

            [Range(0, 100)]
            public int QuarterlyDiscountPercent { get; set; } = 10;

            [Range(0, 100)]
            public int YearlyDiscountPercent { get; set; } = 20;

            [Range(0, 300000)]
            public decimal QuarterlyPrice { get; set; }

            [Range(0, 1000000)]
            public decimal YearlyPrice { get; set; }

            public bool IsCompulsory { get; set; }

            public bool IsMetered { get; set; }

            [StringLength(50)]
            public string? MeterUnitName { get; set; }

            public decimal MeterUnitPrice { get; set; }

            public int MeterBatchSize { get; set; } = 1;

            public int DisplayOrder { get; set; }

            public bool IsActive { get; set; } = true;
        }
    }
}
