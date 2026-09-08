using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace Ozikol.Central.Areas.Affiliate.Pages
{
    /// <summary>
    /// Page model for the Affiliate Portal root route, redirecting authenticated partners to the dashboard.
    /// </summary>
    public class IndexModel : PageModel
    {
        /// <summary>
        /// Handles HTTP GET request by redirecting to the partner dashboard.
        /// </summary>
        /// <returns>Redirect result to /affiliate/dashboard.</returns>
        public IActionResult OnGet()
        {
            return RedirectToPage("/Dashboard/Index");
        }
    }
}
