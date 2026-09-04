using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace Ozikol.Central.Pages
{
    public class LegalHubModel : PageModel
    {
        private readonly ILogger<LegalHubModel> _logger;

        public LegalHubModel(ILogger<LegalHubModel> logger)
        {
            _logger = logger;
        }

        public void OnGet()
        {
        }
    }
}
