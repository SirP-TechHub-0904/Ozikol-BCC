using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Ozikol.Central.Services;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Pages;

/// <summary>
/// Page model representing the all-inclusive annual pricing showcase.
/// Dynamically calculates the global flat rate by aggregating the sum of all active compulsory core features.
/// Manages multi-currency display (NGN, USD, GBP, EUR, etc.), domain onboarding guidance,
/// and instant trial onboarding routes.
/// </summary>
public class PricingModel : PageModel
{
    private readonly ILogger<PricingModel> _logger;
    private readonly ICurrencyService _currencyService;
    private readonly MasterCatalogDbContext _dbContext;

    /// <summary>
    /// Initializes a new instance of the <see cref="PricingModel"/> class with currency, database, and logging dependencies.
    /// </summary>
    /// <param name="logger">Application logger instance.</param>
    /// <param name="currencyService">Central currency management and regional pricing service.</param>
    /// <param name="dbContext">Master catalog database context.</param>
    public PricingModel(ILogger<PricingModel> logger, ICurrencyService currencyService, MasterCatalogDbContext dbContext)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _currencyService = currencyService ?? throw new ArgumentNullException(nameof(currencyService));
        _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
    }

    /// <summary>
    /// The currently selected currency ISO code (NGN, USD, GBP, EUR, etc.).
    /// </summary>
    public string SelectedCurrency { get; private set; } = "NGN";

    /// <summary>
    /// Metadata descriptor for the currently active currency.
    /// </summary>
    public CurrencyInfo ActiveCurrency { get; private set; } = default!;

    /// <summary>
    /// The active regional price book corresponding to the selected currency.
    /// </summary>
    public CurrencyPriceBook PriceBook { get; private set; } = default!;

    /// <summary>
    /// The full list of supported currencies available for selection.
    /// </summary>
    public IReadOnlyList<CurrencyInfo> SupportedCurrencies => _currencyService.GetSupportedCurrencies();

    /// <summary>
    /// The total count of active compulsory features included in the base license.
    /// </summary>
    public int CompulsoryFeaturesCount { get; private set; }

    /// <summary>
    /// The total count of all active modular capabilities in the master catalog.
    /// </summary>
    public int TotalFeaturesCount { get; private set; }

    /// <summary>
    /// The total count of distinct active suites/categories in the master catalog.
    /// </summary>
    public int TotalSuitesCount { get; private set; }

    /// <summary>
    /// The aggregated baseline annual USD sum across all active compulsory features.
    /// </summary>
    public decimal BaseCompulsoryUsd { get; private set; }

    /// <summary>
    /// The list of compulsory features included with the all-inclusive subscription.
    /// </summary>
    public IReadOnlyList<MasterFeatureCatalog> CompulsoryFeatures { get; private set; } = Array.Empty<MasterFeatureCatalog>();

    /// <summary>
    /// Formatted annual price string in the active currency.
    /// </summary>
    public string FormattedAnnualPrice => _currencyService.Format(PriceBook.AnnualPrice, SelectedCurrency, compact: true);

    /// <summary>
    /// Formatted monthly equivalent price string in the active currency.
    /// </summary>
    public string FormattedMonthlyEquivalent => _currencyService.Format(PriceBook.MonthlyEquivalent, SelectedCurrency, compact: true);

    /// <summary>
    /// Handles HTTP GET requests, resolving user currency preferences and querying active compulsory features.
    /// </summary>
    /// <param name="currency">Optional currency ISO code passed via URL query parameter.</param>
    public async Task OnGetAsync([FromQuery] string? currency)
    {
        // 1. Resolve currency using 4-tier waterfall: Query Param -> Cookie -> Cloudflare/GeoIP -> Accept-Language -> Default
        SelectedCurrency = _currencyService.ResolveCurrencyCodeFromRequest(HttpContext, currency);
        ActiveCurrency = _currencyService.ResolveCurrency(SelectedCurrency);
        PriceBook = _currencyService.GetPriceBook(SelectedCurrency);

        TotalFeaturesCount = _currencyService.GetActiveFeaturesCount();
        TotalSuitesCount = _currencyService.GetActiveSuitesCount();

        // 2. Query compulsory features list & stats dynamically from master catalog (without publish restriction)
        CompulsoryFeatures = await _dbContext.MasterFeatureCatalogs
            .AsNoTracking()
            .Where(f => f.IsCompulsory)
            .OrderBy(f => f.SortOrder)
            .ToListAsync();

        CompulsoryFeaturesCount = CompulsoryFeatures.Count;
        BaseCompulsoryUsd = CompulsoryFeatures.Sum(f => f.YearlyPrice);

        // 3. Persist currency selection cookie for subsequent visits if explicitly chosen via query param
        if (!string.IsNullOrWhiteSpace(currency))
        {
            Response.Cookies.Append("oz_currency", SelectedCurrency, new CookieOptions
            {
                Expires = DateTimeOffset.UtcNow.AddYears(1),
                HttpOnly = false,
                SameSite = SameSiteMode.Lax,
                Secure = Request.IsHttps
            });
        }

        _logger.LogInformation("Pricing page rendered dynamically: {Count} compulsory features total ${BaseUsd} USD/yr -> {FormattedPrice}/yr ({Currency})",
            CompulsoryFeaturesCount, BaseCompulsoryUsd, FormattedAnnualPrice, SelectedCurrency);
    }
}
