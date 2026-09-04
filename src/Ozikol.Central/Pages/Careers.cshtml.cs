using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace Ozikol.Central.Pages
{
    public class CareersModel : PageModel
    {
        private readonly ILogger<CareersModel> _logger;

        public CareersModel(ILogger<CareersModel> logger)
        {
            _logger = logger;
        }

        public void OnGet()
        {
        }
    }
}
