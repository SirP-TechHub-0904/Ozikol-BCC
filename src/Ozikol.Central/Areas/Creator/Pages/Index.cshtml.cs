using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace Ozikol.Central.Areas.Creator.Pages
{
    /// <summary>
    /// Page model for the Creator Studio root route, redirecting authenticated creators to the dashboard overview.
    /// </summary>
    public class IndexModel : PageModel
    {
        /// <summary>
        /// Handles HTTP GET request by redirecting to the creator studio dashboard.
        /// </summary>
        /// <returns>Redirect result to /creator/dashboard.</returns>
        public IActionResult OnGet()
        {
            return RedirectToPage("/Dashboard/Index");
        }
    }
}
