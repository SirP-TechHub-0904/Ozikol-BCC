using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace Ozikol.Central.Pages
{
    public class PoliciesAndReportsModel : PageModel
    {
        private readonly ILogger<PoliciesAndReportsModel> _logger;

        public PoliciesAndReportsModel(ILogger<PoliciesAndReportsModel> logger)
        {
            _logger = logger;
        }

        public void OnGet()
        {
        }
    }
}
