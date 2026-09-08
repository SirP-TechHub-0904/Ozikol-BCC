using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace Ozikol.Central.Areas.Centralwks.Pages.Helpdesk
{
    /// <summary>
    /// Page model for Helpdesk root route, automatically redirecting operators to knowledge base articles.
    /// </summary>
    public class IndexModel : PageModel
    {
        /// <summary>
        /// Handles HTTP GET request by redirecting to the helpdesk articles list.
        /// </summary>
        /// <returns>Redirect result to /centralwks/helpdesk/articles.</returns>
        public IActionResult OnGet()
        {
            return RedirectToPage("/Helpdesk/Articles/Index");
        }
    }
}
