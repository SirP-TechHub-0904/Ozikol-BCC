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
    /// PageModel creating new modular capability definitions in the central master catalog.
    /// Supports USD default base pricing, multi-duration discounts, and suite classification.
    /// </summary>
    public class CreateModel : PageModel
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
            "Life Events & Publications",
            "Workspace"
        };

        /// <summary>
        /// Initializes a new instance of the <see cref="CreateModel"/> class.
        /// </summary>
        /// <param name="dbContext">Master catalog database context.</param>
        /// <param name="currencyService">Central platform currency engine service.</param>
        public CreateModel(MasterCatalogDbContext dbContext, ICurrencyService currencyService)
        {
            _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
            _currencyService = currencyService ?? throw new ArgumentNullException(nameof(currencyService));
        }

        /// <summary>
        /// Exchange rate multipliers for live client-side currency conversion.
        /// </summary>
        public decimal NgnRate => _currencyService.GetExchangeRate("NGN");
        public decimal GbpRate => _currencyService.GetExchangeRate("GBP");
        public decimal EurRate => _currencyService.GetExchangeRate("EUR");

        /// <summary>
        /// Input model binding user parameters for the new feature.
        /// </summary>
        [BindProperty]
        public FeatureInputModel Input { get; set; } = new();

        /// <summary>
        /// Converts a USD amount to formatted regional currency for preview.
        /// </summary>
        public string FormatPreview(decimal usdAmount, string currencyCode) => _currencyService.FormatUsdConverted(usdAmount, currencyCode);

        /// <summary>
        /// Handles HTTP GET requests to display the capability creation form.
        /// </summary>
        public void OnGet()
        {
        }

        /// <summary>
        /// Handles HTTP POST requests to validate and save the new feature catalog entry.
        /// </summary>
        public async Task<IActionResult> OnPostAsync()
        {
            if (!ModelState.IsValid)
            {
                return Page();
            }

            var cleanCode = Input.FeatureCode.Trim().ToLowerInvariant();
            var exists = await _dbContext.MasterFeatureCatalogs.AnyAsync(f => f.FeatureCode == cleanCode);
            if (exists)
            {
                ModelState.AddModelError("Input.FeatureCode", $"A feature with code '{cleanCode}' already exists.");
                return Page();
            }

            decimal monthly = 0m;
            decimal quarterly = 0m;
            decimal yearly = 0m;

            if (string.Equals(Input.BillingCadence, "Yearly", StringComparison.OrdinalIgnoreCase))
            {
                monthly = 0m;
                quarterly = 0m;
                yearly = Math.Max(0m, Input.YearlyPrice);
            }
            else
            {
                monthly = Math.Max(0m, Input.MonthlyPrice);
                var qDisc = Math.Clamp(Input.QuarterlyDiscountPercent, 0, 100);
                var yDisc = Math.Clamp(Input.YearlyDiscountPercent, 0, 100);

                quarterly = Math.Round((monthly * 3m) * (1.0m - (qDisc / 100m)), 2);
                yearly = Math.Round((monthly * 12m) * (1.0m - (yDisc / 100m)), 2);
            }

            bool hasPrice = monthly > 0m || yearly > 0m;
            var feature = new MasterFeatureCatalog
            {
                Id = Guid.NewGuid(),
                FeatureCode = cleanCode,
                Name = Input.Name.Trim(),
                Category = Input.Category.Trim(),
                Description = Input.Description?.Trim(),
                Icon = Input.Icon?.Trim(),
                BillingType = (FeatureBillingType)Input.BillingType,
                MonthlyPrice = monthly,
                QuarterlyPrice = quarterly,
                YearlyPrice = yearly,
                IsCompulsory = false,
                IsMetered = Input.IsMetered,
                MeterUnitName = Input.IsMetered ? Input.MeterUnitName?.Trim() : null,
                MeterUnitPrice = Input.IsMetered ? Input.MeterUnitPrice : 0m,
                MeterBlockSize = Input.IsMetered && Input.MeterBatchSize > 0 ? Input.MeterBatchSize : 1,
                SortOrder = Input.DisplayOrder,
                IsActive = hasPrice,
                IsPublished = hasPrice,
                CreatedUtc = DateTime.UtcNow
            };

            _dbContext.MasterFeatureCatalogs.Add(feature);
            _dbContext.MasterAuditLogs.Add(new MasterAuditLog
            {
                UserId = User.Identity?.Name,
                UserName = User.Identity?.Name,
                Action = "Create",
                EntityType = "Feature",
                EntityId = feature.Id.ToString(),
                Summary = $"Created modular feature capability '{feature.Name}' ({feature.FeatureCode})",
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers["User-Agent"].ToString(),
                CreatedUtc = DateTime.UtcNow
            });

            await _dbContext.SaveChangesAsync();
            _currencyService.InvalidatePricingCache();

            TempData["Success"] = $"Capability '{feature.Name}' created successfully.";
            return RedirectToPage("/Features/Details", new { id = feature.Id });
        }

        /// <summary>
        /// Form input binding model.
        /// </summary>
        public class FeatureInputModel
        {
            [Required(ErrorMessage = "Feature code is required.")]
            [RegularExpression("^[a-z0-9-]+$", ErrorMessage = "Feature code may only contain lowercase letters, numbers, and hyphens.")]
            [StringLength(60)]
            [Display(Name = "Feature Code Identifier")]
            public string FeatureCode { get; set; } = string.Empty;

            [Required(ErrorMessage = "Capability name is required.")]
            [StringLength(120)]
            [Display(Name = "Display Name")]
            public string Name { get; set; } = string.Empty;

            [Required(ErrorMessage = "Category is required.")]
            [StringLength(60)]
            [Display(Name = "Category")]
            public string Category { get; set; } = "People, Community & Collaboration";

            [StringLength(500)]
            [Display(Name = "Description")]
            public string? Description { get; set; }

            [StringLength(60)]
            [Display(Name = "Icon Identifier")]
            public string? Icon { get; set; }

            [Display(Name = "Billing Model")]
            public int BillingType { get; set; } = 1;

            /// <summary>
            /// Billing cadence: "Yearly" (Annual fixed subscription) or "Monthly".
            /// </summary>
            public string BillingCadence { get; set; } = "Yearly";

            [Range(0, 100000)]
            [Display(Name = "Monthly Price ($)")]
            public decimal MonthlyPrice { get; set; } = 0.00m;

            [Range(0, 100)]
            [Display(Name = "Quarterly Discount (%)")]
            public int QuarterlyDiscountPercent { get; set; } = 10;

            [Range(0, 100)]
            [Display(Name = "Yearly Discount (%)")]
            public int YearlyDiscountPercent { get; set; } = 20;

            [Range(0, 300000)]
            [Display(Name = "Quarterly Price ($)")]
            public decimal QuarterlyPrice { get; set; }

            [Range(0, 1000000)]
            [Display(Name = "Yearly Price ($)")]
            public decimal YearlyPrice { get; set; } = 0.74m;

            [Display(Name = "Compulsory Core Feature")]
            public bool IsCompulsory { get; set; } = true;

            [Display(Name = "Metered Usage Billing")]
            public bool IsMetered { get; set; } = false;

            [StringLength(50)]
            [Display(Name = "Meter Unit Name")]
            public string? MeterUnitName { get; set; }

            [Range(0, 1000)]
            [Display(Name = "Meter Unit Price ($)")]
            public decimal MeterUnitPrice { get; set; } = 0.0000m;

            [Range(1, 100000)]
            [Display(Name = "Meter Batch Size")]
            public int MeterBatchSize { get; set; } = 1;

            [Display(Name = "Sort Display Order")]
            public int DisplayOrder { get; set; } = 10;
        }
    }
}
