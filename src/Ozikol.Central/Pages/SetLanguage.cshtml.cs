using System;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Localization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace Ozikol.Central.Pages
{
    /// <summary>
    /// Endpoint that handles user-initiated language and culture switching across the Ozikol Central portal.
    /// Updates the ASP.NET Core culture cookie and dynamically redirects the user to the corresponding localized URL route.
    /// </summary>
    [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
    public class SetLanguageModel : PageModel
    {
        /// <summary>
        /// Regular expression matching leading supported culture segments in route URLs (e.g. /en/, /fr/, /es/, /de/).
        /// </summary>
        private static readonly Regex CulturePrefixRegex = new Regex(@"^/(en|fr|es|de)(/|$)", RegexOptions.Compiled | RegexOptions.IgnoreCase);

        /// <summary>
        /// Processes GET requests to switch the application culture and redirect to the localized destination.
        /// </summary>
        /// <param name="culture">The target culture ISO code (e.g. 'en', 'fr', 'es', 'de').</param>
        /// <param name="returnUrl">The local URL the user was viewing prior to triggering the language switch.</param>
        /// <returns>A redirect result pointing to the localized URL route with the updated culture cookie.</returns>
        public IActionResult OnGet(string culture, string returnUrl)
        {
            // Normalize culture fallback to English if invalid or unspecified
            if (string.IsNullOrWhiteSpace(culture))
            {
                culture = "en";
            }
            culture = culture.ToLowerInvariant();

            // Set the persistent ASP.NET Core culture cookie for cross-session continuity
            Response.Cookies.Append(
                CookieRequestCultureProvider.DefaultCookieName,
                CookieRequestCultureProvider.MakeCookieValue(new RequestCulture(culture)),
                new CookieOptions
                {
                    Expires = DateTimeOffset.UtcNow.AddYears(1),
                    IsEssential = true,
                    SameSite = SameSiteMode.Lax,
                    HttpOnly = false // Allow client-side scripts to read active culture if required
                });

            // Validate returnUrl to avoid open redirect vulnerabilities or recursive SetLanguage calls
            if (string.IsNullOrWhiteSpace(returnUrl) || 
                !Url.IsLocalUrl(returnUrl) || 
                returnUrl.Contains("SetLanguage", StringComparison.OrdinalIgnoreCase))
            {
                return LocalRedirect($"/{culture}");
            }

            // Strip any existing culture prefix from the returnUrl (e.g. /fr/pricing -> /pricing)
            var cleanPath = CulturePrefixRegex.Replace(returnUrl, "/");
            if (!cleanPath.StartsWith("/"))
            {
                cleanPath = "/" + cleanPath;
            }

            // Prevent SetLanguage loop if cleanPath is SetLanguage
            if (cleanPath.StartsWith("/SetLanguage", StringComparison.OrdinalIgnoreCase))
            {
                cleanPath = "/";
            }

            // Build the new localized destination URL
            string localizedTarget = cleanPath == "/" ? $"/{culture}" : $"/{culture}{cleanPath}";
            return LocalRedirect(localizedTarget);
        }
    }
}
