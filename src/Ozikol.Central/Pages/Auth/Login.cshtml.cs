using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Ozikol.MasterDomain.Models;

namespace Ozikol.Central.Pages
{
    /// <summary>
    /// PageModel authenticating Central Platform Administrators, operators, and governance staff into the Central Console.
    /// In accordance with sovereign architecture, organization workspaces authenticate directly via their sovereign domains.
    /// </summary>
    public class LoginModel : PageModel
    {
        private readonly SignInManager<CentralUser> _signInManager;
        private readonly UserManager<CentralUser> _userManager;
        private readonly ILogger<LoginModel> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="LoginModel"/> class.
        /// </summary>
        /// <param name="signInManager">Central operator sign-in manager.</param>
        /// <param name="userManager">Central operator user manager.</param>
        /// <param name="logger">Application logging facility.</param>
        public LoginModel(
            SignInManager<CentralUser> signInManager,
            UserManager<CentralUser> userManager,
            ILogger<LoginModel> logger)
        {
            _signInManager = signInManager;
            _userManager = userManager;
            _logger = logger;
        }

        /// <summary>
        /// Central operator or system administrator work email address.
        /// </summary>
        [BindProperty]
        [Required(ErrorMessage = "Please enter your administrator email address.")]
        [EmailAddress(ErrorMessage = "Please enter a valid email address.")]
        [Display(Name = "Operator Email")]
        public string Email { get; set; } = string.Empty;

        /// <summary>
        /// Password for Central operator authentication.
        /// </summary>
        [BindProperty]
        [Required(ErrorMessage = "Please enter your password.")]
        [DataType(DataType.Password)]
        [Display(Name = "Password")]
        public string Password { get; set; } = string.Empty;

        /// <summary>
        /// Indicates whether operator credentials should persist across browser sessions.
        /// </summary>
        [BindProperty]
        [Display(Name = "Remember this device")]
        public bool RememberMe { get; set; }

        /// <summary>
        /// Target return URL upon successful authentication.
        /// </summary>
        public string? ReturnUrl { get; set; }

        /// <summary>
        /// User-friendly error message if authentication fails.
        /// </summary>
        public string? ErrorMessage { get; set; }

        /// <summary>
        /// Handles HTTP GET requests to render the Central operator sign-in console.
        /// </summary>
        /// <param name="returnUrl">Optional destination URL after login.</param>
        /// <param name="error">Optional error notification query.</param>
        public void OnGet(string? returnUrl = null, string? error = null)
        {
            ReturnUrl = returnUrl;
            if (!string.IsNullOrWhiteSpace(error))
            {
                ErrorMessage = error;
            }
        }

        /// <summary>
        /// Handles HTTP POST requests to authenticate Central platform operators and SuperAdmins.
        /// </summary>
        /// <param name="returnUrl">Optional destination URL after login.</param>
        /// <returns>Redirection to central console or redisplayed form on failure.</returns>
        public async Task<IActionResult> OnPostAsync(string? returnUrl = null)
        {
            ReturnUrl = returnUrl;

            if (!ModelState.IsValid)
            {
                return Page();
            }

            var cleanEmail = Email.Trim().ToLowerInvariant();
            var user = await _userManager.FindByEmailAsync(cleanEmail);

            if (user == null || !user.IsActive)
            {
                _logger.LogWarning("Central operator login rejected: Account '{Email}' not found or inactive.", cleanEmail);
                ErrorMessage = "Invalid operator credentials or inactive account.";
                return Page();
            }

            var result = await _signInManager.PasswordSignInAsync(user, Password, RememberMe, lockoutOnFailure: false);

            if (result.Succeeded)
            {
                _logger.LogInformation("Central platform operator '{Email}' signed in successfully.", cleanEmail);
                if (!string.IsNullOrWhiteSpace(returnUrl) && Url.IsLocalUrl(returnUrl))
                {
                    return Redirect(returnUrl);
                }
                return RedirectToPage("/Index");
            }

            if (result.IsLockedOut)
            {
                _logger.LogWarning("Central operator account '{Email}' locked out.", cleanEmail);
                ErrorMessage = "This operator account is temporarily locked out. Please contact platform security.";
                return Page();
            }

            ErrorMessage = "Invalid password. Please check your credentials and try again.";
            return Page();
        }
    }
}
