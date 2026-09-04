using System.Globalization;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace Ozikol.Central.Pages;

/// <summary>
/// Page model for the master Features Catalog hub page (/features).
/// Presents all 37 modular capabilities across 9 enterprise suites,
/// providing localized routing and direct onboarding access.
/// </summary>
public class FeaturesModel : PageModel
{
    /// <summary>
    /// Gets the active 2-letter ISO language code for culture-aware URL routing.
    /// </summary>
    public string CurrentCulture { get; private set; } = "en";

    /// <summary>
    /// Handles GET requests to the features catalog hub, resolving active culture.
    /// </summary>
    public void OnGet()
    {
        var culture = CultureInfo.CurrentUICulture.TwoLetterISOLanguageName.ToLowerInvariant();
        CurrentCulture = culture is "en" or "fr" or "es" or "de" ? culture : "en";
    }
}
