using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace Ozikol.Central.Pages
{
    public class SupportHubModel : PageModel
    {
        private readonly ILogger<SupportHubModel> _logger;

        public SupportHubModel(ILogger<SupportHubModel> logger)
        {
            _logger = logger;
        }

        public void OnGet()
        {
        }
    }
}
