using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace Ozikol.Central.Areas.Centralwks.Pages.Careers
{
    /// <summary>
    /// Page model for Careers root route, redirecting operators to the active job openings list.
    /// </summary>
    public class IndexModel : PageModel
    {
        /// <summary>
        /// Handles HTTP GET request by redirecting to the job openings list.
        /// </summary>
        /// <returns>Redirect result to /centralwks/careers/openings.</returns>
        public IActionResult OnGet()
        {
            return RedirectToPage("/Careers/Openings/Index");
        }
    }
}
