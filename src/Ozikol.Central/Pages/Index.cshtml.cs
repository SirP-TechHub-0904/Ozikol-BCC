using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace Ozikol.Central.Pages
{
    /// <summary>
    /// Page model representing the main landing homepage of the Ozikol Central Portal.
    /// Manages the presentation of the 9 modular enterprise suites, interactive capabilities, and customer conversion paths.
    /// </summary>
    public class IndexModel : PageModel
    {
        private readonly ILogger<IndexModel> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="IndexModel"/> class.
        /// </summary>
        /// <param name="logger">Application logger instance.</param>
        public IndexModel(ILogger<IndexModel> logger)
        {
            _logger = logger;
        }

        /// <summary>
        /// Handles HTTP GET requests for the central landing page.
        /// </summary>
        public void OnGet()
        {
        }
    }
}
