using System.Globalization;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace Ozikol.Central.Pages.Platform
{
    /// <summary>
    /// Page model for the Executive MIS (Management Information System) console showcase.
    /// </summary>
    public class MisSystemModel : PageModel
    {
        /// <summary>
        /// Gets or sets the current ISO 2-letter culture code.
        /// </summary>
        public string CurrentCulture { get; set; } = "en";

        /// <summary>
        /// Handles HTTP GET requests to initialize the page.
        /// </summary>
        public void OnGet()
        {
            CurrentCulture = CultureInfo.CurrentUICulture.TwoLetterISOLanguageName.ToLowerInvariant();
        }
    }
}
