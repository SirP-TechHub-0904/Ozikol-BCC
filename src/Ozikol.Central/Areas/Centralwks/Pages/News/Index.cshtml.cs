using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace Ozikol.Central.Areas.Centralwks.Pages.News
{
    /// <summary>
    /// Page model for the News root route, automatically redirecting operators to the articles management list.
    /// </summary>
    public class IndexModel : PageModel
    {
        /// <summary>
        /// Handles HTTP GET request by redirecting to the news articles list.
        /// </summary>
        /// <returns>Redirect result to /centralwks/news/articles.</returns>
        public IActionResult OnGet()
        {
            return RedirectToPage("/News/Articles/Index");
        }
    }
}
