using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace Ozikol.Central.Pages
{
    public class CookiesModel : PageModel
    {
        private readonly ILogger<CookiesModel> _logger;

        public CookiesModel(ILogger<CookiesModel> logger)
        {
            _logger = logger;
        }

        public void OnGet()
        {
        }
    }
}
