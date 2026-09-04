using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace Ozikol.Central.Pages
{
    public class PrivacyNoticeModel : PageModel
    {
        private readonly ILogger<PrivacyNoticeModel> _logger;

        public PrivacyNoticeModel(ILogger<PrivacyNoticeModel> logger)
        {
            _logger = logger;
        }

        public void OnGet()
        {
        }
    }
}
