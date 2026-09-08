using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.Extensions.Logging;
using Ozikol.MasterDomain.Models;

namespace Ozikol.Central.Pages.Creator
{
    /// <summary>
    /// PageModel handling sign-out for Template Creators.
    /// </summary>
    public class LogoutModel : PageModel
    {
        private readonly SignInManager<CentralUser> _signInManager;
        private readonly ILogger<LogoutModel> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="LogoutModel"/> class.
        /// </summary>
        /// <param name="signInManager">Identity sign-in manager.</param>
        /// <param name="logger">Diagnostic logging facility.</param>
        public LogoutModel(SignInManager<CentralUser> signInManager, ILogger<LogoutModel> logger)
        {
            _signInManager = signInManager;
            _logger = logger;
        }

        /// <summary>
        /// Handles HTTP GET requests by redirecting to creator login.
        /// </summary>
        public IActionResult OnGet()
        {
            return RedirectToPage("/Creator/Login");
        }

        /// <summary>
        /// Handles HTTP POST requests to terminate the creator session.
        /// </summary>
        public async Task<IActionResult> OnPostAsync()
        {
            await _signInManager.SignOutAsync();
            _logger.LogInformation("Template creator signed out.");
            return RedirectToPage("/Creator/Login");
        }
    }
}
