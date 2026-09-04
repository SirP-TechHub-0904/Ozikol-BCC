using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Ozikol.Central.Services;

namespace Ozikol.Central.Pages;

/// <summary>
/// Page model representing the flat ₦40,000/year all-inclusive pricing showcase.
/// Manages multi-currency display (NGN, USD, GBP, GHS), domain onboarding guidance,
/// and instant trial onboarding routes.
/// </summary>
public class PricingModel : PageModel
{
    private readonly ILogger<PricingModel> _logger;
    private readonly ICurrencyService _currencyService;

    /// <summary>
    /// Initializes a new instance of the <see cref="PricingModel"/> class with currency and logging dependencies.
    /// </summary>
    /// <param name="logger">Application logger instance.</param>
    /// <param name="currencyService">Central currency management and regional pricing service.</param>
    public PricingModel(ILogger<PricingModel> logger, ICurrencyService currencyService)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _currencyService = currencyService ?? throw new ArgumentNullException(nameof(currencyService));
    }

    /// <summary>
    /// The currently selected currency ISO code (NGN, USD, GBP, or GHS).
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
    /// Formatted annual price string in the active currency.
    /// </summary>
    public string FormattedAnnualPrice => _currencyService.Format(PriceBook.AnnualPrice, SelectedCurrency, compact: true);

    /// <summary>
    /// Formatted monthly equivalent price string in the active currency.
    /// </summary>
    public string FormattedMonthlyEquivalent => _currencyService.Format(PriceBook.MonthlyEquivalent, SelectedCurrency, compact: true);

    /// <summary>
    /// Handles HTTP GET requests, resolving user currency preferences from query parameters or cookies.
    /// </summary>
    /// <param name="currency">Optional currency ISO code passed via URL query parameter.</param>
    public void OnGet([FromQuery] string? currency)
    {
        // Resolve currency precedence: Query Parameter -> Existing Cookie -> Default NGN
        string? resolvedCode = currency;
        if (string.IsNullOrWhiteSpace(resolvedCode))
        {
            Request.Cookies.TryGetValue("oz_currency", out resolvedCode);
        }

        ActiveCurrency = _currencyService.ResolveCurrency(resolvedCode);
        SelectedCurrency = ActiveCurrency.Code;
        PriceBook = _currencyService.GetPriceBook(SelectedCurrency);

        // Persist currency selection cookie for subsequent requests if explicitly specified
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

        _logger.LogInformation("Pricing page rendered with flat rate {FormattedPrice}/yr ({Currency})", FormattedAnnualPrice, SelectedCurrency);
    }
}
