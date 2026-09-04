using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace Ozikol.Central.Pages
{
    public class ClientLoginModel : PageModel
    {
        private readonly ILogger<ClientLoginModel> _logger;

        public ClientLoginModel(ILogger<ClientLoginModel> logger)
        {
            _logger = logger;
        }

        public void OnGet()
        {
        }
    }
}
