using System.Globalization;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace Ozikol.Central.Pages.Features;

/// <summary>
/// Page model for the Staff Rota and Shift Scheduling feature detail page.
/// Provides culture-aware routing for regional onboarding and platform registration.
/// </summary>
public class StaffRotaModel : PageModel
{
    /// <summary>
    /// Gets the active 2-letter ISO language code for localized links.
    /// </summary>
    public string CurrentCulture { get; private set; } = "en";

    /// <summary>
    /// Handles GET requests for the Staff Rota feature showcase.
    /// </summary>
    public void OnGet()
    {
        var culture = CultureInfo.CurrentUICulture.TwoLetterISOLanguageName.ToLowerInvariant();
        CurrentCulture = culture is "en" or "fr" or "es" or "de" ? culture : "en";
    }
}

