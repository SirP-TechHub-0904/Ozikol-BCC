using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Ozikol.Central.Services;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Areas.Centralwks.Pages.Features
{
    /// <summary>
    /// PageModel displaying capability diagnostics, intelligent monthly/yearly discount calculations,
    /// and location-detected currency pricing breakdown.
    /// </summary>
    public class DetailsModel : PageModel
    {
        private readonly MasterCatalogDbContext _dbContext;
        private readonly ICurrencyService _currencyService;

        /// <summary>
        /// Initializes a new instance of the <see cref="DetailsModel"/> class.
        /// </summary>
        /// <param name="dbContext">Master catalog database context.</param>
        /// <param name="currencyService">Central platform currency engine service.</param>
        public DetailsModel(MasterCatalogDbContext dbContext, ICurrencyService currencyService)
        {
            _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
            _currencyService = currencyService ?? throw new ArgumentNullException(nameof(currencyService));
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
        /// The resolved currency ISO code determined by user location or preferences.
        /// </summary>
        public string ResolvedCurrency { get; private set; } = "USD";

        /// <summary>
        /// Metadata descriptor for the active currency.
        /// </summary>
        public CurrencyInfo ActiveCurrency { get; private set; } = default!;

        /// <summary>
        /// Returns true if the capability has no subscription price and no metered usage.
        /// </summary>
        public bool IsFreeIncluded => Feature.MonthlyPrice == 0 && Feature.YearlyPrice == 0 && !Feature.IsMetered;

        /// <summary>
        /// Returns true if the capability has a recurring monthly price.
        /// </summary>
        public bool IsMonthlyBilled => Feature.MonthlyPrice > 0;

        /// <summary>
        /// Formatted monthly rate in the location-resolved currency.
        /// </summary>
        public string FormattedMonthlyPrice => _currencyService.FormatUsdConverted(Feature.MonthlyPrice, ResolvedCurrency);

        /// <summary>
        /// Formatted quarterly rate in the location-resolved currency.
        /// </summary>
        public string FormattedQuarterlyPrice => _currencyService.FormatUsdConverted(Feature.QuarterlyPrice, ResolvedCurrency);

        /// <summary>
        /// Formatted yearly rate in the location-resolved currency.
        /// </summary>
        public string FormattedYearlyPrice => _currencyService.FormatUsdConverted(Feature.YearlyPrice, ResolvedCurrency);

        /// <summary>
        /// Formatted undiscounted annualized price (Monthly * 12).
        /// </summary>
        public string FormattedFullAnnualRate => _currencyService.FormatUsdConverted(Feature.MonthlyPrice * 12m, ResolvedCurrency);

        /// <summary>
        /// Formatted annual savings amount when billed yearly.
        /// </summary>
        public string FormattedAnnualSavings
        {
            get
            {
                var annualFull = Feature.MonthlyPrice * 12m;
                var savings = Math.Max(0, annualFull - Feature.YearlyPrice);
                return _currencyService.FormatUsdConverted(savings, ResolvedCurrency);
            }
        }

        /// <summary>
        /// Calculated discount percentage for annual billing vs 12 monthly payments.
        /// </summary>
        public int AnnualDiscountPercentage
        {
            get
            {
                if (Feature.MonthlyPrice <= 0) return 0;
                var annualFull = Feature.MonthlyPrice * 12m;
                if (annualFull <= 0 || Feature.YearlyPrice >= annualFull) return 0;
                return (int)Math.Round((1.0m - (Feature.YearlyPrice / annualFull)) * 100m);
            }
        }

        /// <summary>
        /// Formatted metered unit rate in the location-resolved currency.
        /// </summary>
        public string FormattedMeterUnitPrice => _currencyService.FormatUsdConverted(Feature.MeterUnitPrice, ResolvedCurrency, compact: false);

        /// <summary>
        /// Handles HTTP GET requests to retrieve capability details.
        /// </summary>
        public async Task<IActionResult> OnGetAsync([FromQuery] string? currency)
        {
            var feature = await _dbContext.MasterFeatureCatalogs.FindAsync(Id);
            if (feature == null)
            {
                TempData["Error"] = "Capability not found.";
                return RedirectToPage("/Features/Index");
            }

            Feature = feature;

            // Resolve currency based on user location (Query > Cookie > GeoIP > Default)
            ResolvedCurrency = _currencyService.ResolveCurrencyCodeFromRequest(HttpContext, currency);
            ActiveCurrency = _currencyService.ResolveCurrency(ResolvedCurrency);

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
            _currencyService.InvalidatePricingCache();
            TempData["Success"] = $"Feature status updated to {(feature.IsActive ? "Active" : "Inactive")}.";

            return RedirectToPage(new { id = Id });
        }
    }
}
