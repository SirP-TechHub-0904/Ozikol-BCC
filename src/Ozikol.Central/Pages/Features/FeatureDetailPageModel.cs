using System.Globalization;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace Ozikol.Central.Pages.Features;

/// <summary>
/// Base page model for all modular feature detail pages across the 9 enterprise suites.
/// Provides standardized culture-aware routing, title formatting, and common platform parameters.
/// </summary>
public abstract class FeatureDetailPageModel : PageModel
{
    /// <summary>
    /// Gets the active 2-letter ISO language code for localized URL routing.
    /// Defaults to "en" if unsupported or unspecified.
    /// </summary>
    public string CurrentCulture { get; private set; } = "en";

    /// <summary>
    /// Handles GET requests for the feature detail page, resolving active language culture.
    /// </summary>
    public virtual void OnGet()
    {
        var culture = CultureInfo.CurrentUICulture.TwoLetterISOLanguageName.ToLowerInvariant();
        CurrentCulture = culture is "en" or "fr" or "es" or "de" ? culture : "en";
    }
}
