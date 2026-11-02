using System;
using System.ComponentModel.DataAnnotations;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.Extensions.Logging;
using Ozikol.MasterDomain.Models;

namespace Ozikol.Central.Areas.Affiliate.Pages
{
    /// <summary>
    /// PageModel authenticating registered and approved Affiliate Partners into their partner earnings and referral portal.
    /// </summary>
    public class LoginModel : PageModel
    {
        private readonly SignInManager<CentralUser> _signInManager;
        private readonly UserManager<CentralUser> _userManager;
        private readonly Ozikol.Central.Services.IRecaptchaService _recaptchaService;
        private readonly ILogger<LoginModel> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="LoginModel"/> class.
        /// </summary>
        /// <param name="signInManager">Identity sign-in manager for CentralUser accounts.</param>
        /// <param name="userManager">Identity user manager for CentralUser accounts.</param>
        /// <param name="recaptchaService">reCAPTCHA verification service.</param>
        /// <param name="logger">Logging facility for partner portal security diagnostics.</param>
        public LoginModel(
            SignInManager<CentralUser> signInManager,
            UserManager<CentralUser> userManager,
            Ozikol.Central.Services.IRecaptchaService recaptchaService,
            ILogger<LoginModel> logger)
        {
            _signInManager = signInManager;
            _userManager = userManager;
            _recaptchaService = recaptchaService;
            _logger = logger;
        }

        /// <summary>
        /// Gets the public Google reCAPTCHA site key for widget rendering.
        /// </summary>
        public string RecaptchaSiteKey => _recaptchaService.SiteKey;

        /// <summary>
        /// Partner registered email address.
        /// </summary>
        [BindProperty]
        [Required(ErrorMessage = "Please enter your partner account email.")]
        [EmailAddress(ErrorMessage = "Please enter a valid email address.")]
        [Display(Name = "Partner Email")]
        public string Email { get; set; } = string.Empty;

        /// <summary>
        /// Partner account password.
        /// </summary>
        [BindProperty]
        [Required(ErrorMessage = "Please enter your password.")]
        [DataType(DataType.Password)]
        [Display(Name = "Password")]
        public string Password { get; set; } = string.Empty;

        /// <summary>
        /// Indicates whether partner session should persist across browser restarts.
        /// </summary>
        [BindProperty]
        [Display(Name = "Keep me signed in")]
        public bool RememberMe { get; set; }

        /// <summary>
        /// Destination URL after successful authentication.
        /// </summary>
        public string? ReturnUrl { get; set; }

        /// <summary>
        /// Error message displayed upon authentication failure.
        /// </summary>
        public string? ErrorMessage { get; set; }

        /// <summary>
        /// Handles HTTP GET requests to display the partner sign-in interface.
        /// </summary>
        /// <param name="returnUrl">Optional destination URL.</param>
        /// <returns>Page result or redirect if already authenticated.</returns>
        public IActionResult OnGet(string? returnUrl = null)
        {
            ReturnUrl = returnUrl;

            if (User.Identity?.IsAuthenticated == true && (User.IsInRole("AffiliatePartner") || User.IsInRole("SuperAdmin")))
            {
                return RedirectToPage("/Affiliate/Dashboard/Index");
            }

            return Page();
        }

        /// <summary>
        /// Handles HTTP POST requests to authenticate an affiliate partner.
        /// </summary>
        /// <param name="returnUrl">Optional destination URL.</param>
        /// <returns>Redirect to partner dashboard or redisplayed page with errors.</returns>
        public async Task<IActionResult> OnPostAsync(string? returnUrl = null)
        {
            ReturnUrl = returnUrl;

            if (!ModelState.IsValid)
            {
                return Page();
            }

            var cleanEmail = Email.Trim().ToLowerInvariant();
            var clientIp = HttpContext.Connection.RemoteIpAddress?.ToString();

            // 1. Verify Google reCAPTCHA
            var recaptchaResponse = Request.Form["g-recaptcha-response"].ToString();
            _logger.LogInformation("Affiliate Partner Sign-In attempt for '{Email}' from IP {ClientIp}. Verifying reCAPTCHA...", cleanEmail, clientIp);

            var isCaptchaValid = await _recaptchaService.ValidateTokenAsync(recaptchaResponse, clientIp);
            if (!isCaptchaValid)
            {
                _logger.LogWarning("Partner login rejected: Google reCAPTCHA verification failed for '{Email}' from IP {ClientIp}.", cleanEmail, clientIp);
                ErrorMessage = "Security verification failed. Please complete the reCAPTCHA challenge.";
                return Page();
            }

            var user = await _userManager.FindByEmailAsync(cleanEmail);

            if (user == null || !user.IsActive)
            {
                _logger.LogWarning("Partner login rejected: Account '{Email}' not found or inactive.", cleanEmail);
                ErrorMessage = "Invalid partner credentials or inactive account.";
                return Page();
            }

            var isPartner = await _userManager.IsInRoleAsync(user, "AffiliatePartner") || await _userManager.IsInRoleAsync(user, "SuperAdmin");
            if (!isPartner)
            {
                _logger.LogWarning("Partner login denied: User '{Email}' is not registered as an AffiliatePartner.", cleanEmail);
                ErrorMessage = "Access denied. Your account is not an approved Affiliate Partner account.";
                return Page();
            }

            var result = await _signInManager.PasswordSignInAsync(user, Password, RememberMe, lockoutOnFailure: true);

            if (result.Succeeded)
            {
                _logger.LogInformation("Affiliate partner '{Email}' signed in successfully.", cleanEmail);

                if (!string.IsNullOrWhiteSpace(returnUrl) && Url.IsLocalUrl(returnUrl))
                {
                    return Redirect(returnUrl);
                }

                return RedirectToPage("/Affiliate/Dashboard/Index");
            }

            if (result.IsLockedOut)
            {
                _logger.LogWarning("Partner account '{Email}' locked out due to multiple failed attempts.", cleanEmail);
                ErrorMessage = "Account is temporarily locked out. Please try again later or contact support.";
                return Page();
            }

            ErrorMessage = "Invalid email or password. Please verify your credentials.";
            return Page();
        }
    }
}
