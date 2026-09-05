using Microsoft.AspNetCore.Mvc.RazorPages;

namespace Ozikol.Central.Pages
{
    /// <summary>
    /// Page model for the visual HTML Sitemap directory of the Ozikol Central Portal.
    /// Provides search engines and enterprise users with a comprehensive, categorized navigation index of all live portal pages.
    /// </summary>
    public class SitemapModel : PageModel
    {
        /// <summary>
        /// Handles HTTP GET requests to the platform sitemap.
        /// </summary>
        public void OnGet()
        {
            // Simple page rendering; route prefix handles current culture localization
        }
    }
}
