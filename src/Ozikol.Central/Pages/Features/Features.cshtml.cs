using System;
using System.Globalization;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Ozikol.Central.Services;

namespace Ozikol.Central.Pages;

/// <summary>
/// Page model for the master Features Catalog hub page (/features).
/// Dynamically queries active modular capabilities and distinct suites,
/// providing localized routing and direct onboarding access.
/// </summary>
public class FeaturesModel : PageModel
{
    private readonly ICurrencyService _currencyService;

    /// <summary>
    /// Initializes a new instance of the <see cref="FeaturesModel"/> class.
    /// </summary>
    /// <param name="currencyService">Central platform currency and catalog stats service.</param>
    public FeaturesModel(ICurrencyService currencyService)
    {
        _currencyService = currencyService ?? throw new ArgumentNullException(nameof(currencyService));
    }

    /// <summary>
    /// Gets the active 2-letter ISO language code for culture-aware URL routing.
    /// </summary>
    public string CurrentCulture { get; private set; } = "en";

    /// <summary>
    /// The dynamic total count of active modular capabilities in the platform.
    /// </summary>
    public int TotalFeaturesCount { get; private set; }

    /// <summary>
    /// The dynamic total count of active suites/categories in the platform.
    /// </summary>
    public int TotalSuitesCount { get; private set; }

    /// <summary>
    /// Handles GET requests to the features catalog hub, resolving active culture and dynamic catalog stats.
    /// </summary>
    public void OnGet()
    {
        var culture = CultureInfo.CurrentUICulture.TwoLetterISOLanguageName.ToLowerInvariant();
        CurrentCulture = culture is "en" or "fr" or "es" or "de" ? culture : "en";

        TotalFeaturesCount = _currencyService.GetActiveFeaturesCount();
        TotalSuitesCount = _currencyService.GetActiveSuitesCount();
    }
}

