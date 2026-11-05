using Microsoft.AspNetCore.Mvc.RazorPages;

namespace Ozikol.Central.Pages
{
    /// <summary>
    /// Page model for the Ozikol Cloud UI Marketplace catalog and coming soon status screen.
    /// </summary>
    public class MarketplaceModel : PageModel
    {
        /// <summary>
        /// Gets or sets a value indicating whether the full marketplace catalog is live and accessible.
        /// Defaults to false so the public marketplace displays the Coming Soon screen.
        /// </summary>
        public bool IsLive { get; set; } = false;

        /// <summary>
        /// Handles incoming HTTP GET requests for the marketplace page.
        /// </summary>
        public void OnGet()
        {
        }
    }
}
