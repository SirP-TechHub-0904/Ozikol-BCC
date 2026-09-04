using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace Ozikol.Central.Pages
{
    public class SupportHubContactSalesModel : PageModel
    {
        private readonly ILogger<SupportHubContactSalesModel> _logger;

        public SupportHubContactSalesModel(ILogger<SupportHubContactSalesModel> logger)
        {
            _logger = logger;
        }

        public void OnGet()
        {
        }
    }
}
