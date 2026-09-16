using System;
using System.ComponentModel.DataAnnotations;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.Extensions.Logging;
using Ozikol.Central.Services;
using Ozikol.MasterDomain.Models;

namespace Ozikol.Central.Areas.Centralwks.Pages
{
    /// <summary>
    /// PageModel facilitating password recovery for Central Console platform administrators and operators.
    /// Dispatches a time-limited 6-digit numeric OTP to the operator's registered work email.
    /// </summary>
    public class ForgotPasswordModel : PageModel
    {
        private readonly UserManager<CentralUser> _userManager;
        private readonly ICentralTwoFactorService _twoFactorService;
        private readonly ICentralEmailService _emailService;
        private readonly ILogger<ForgotPasswordModel> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="ForgotPasswordModel"/> class.
        /// </summary>
        /// <param name="userManager">ASP.NET Identity user manager for CentralUser.</param>
        /// <param name="twoFactorService">Security service for generating and tracking OTP codes.</param>
        /// <param name="emailService">Service for dispatching outbound notification emails.</param>
        /// <param name="logger">Security audit logger.</param>
        public ForgotPasswordModel(
            UserManager<CentralUser> userManager,
            ICentralTwoFactorService twoFactorService,
            ICentralEmailService emailService,
            ILogger<ForgotPasswordModel> logger)
        {
            _userManager = userManager ?? throw new ArgumentNullException(nameof(userManager));
            _twoFactorService = twoFactorService ?? throw new ArgumentNullException(nameof(twoFactorService));
            _emailService = emailService ?? throw new ArgumentNullException(nameof(emailService));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>
        /// Gets or sets the operator input model containing the recovery email address.
        /// </summary>
        [BindProperty]
        public InputModel Input { get; set; } = new InputModel();

        /// <summary>
        /// Error message displayed when processing fails.
        /// </summary>
        public string? ErrorMessage { get; set; }

        /// <summary>
        /// Input model schema for requesting an admin password recovery OTP.
        /// </summary>
        public class InputModel
        {
            /// <summary>
            /// Operator's registered administrative email address.
            /// </summary>
            [Required(ErrorMessage = "Please enter your operator email address.")]
            [EmailAddress(ErrorMessage = "Please enter a valid email address.")]
            [Display(Name = "Work Email")]
            public string Email { get; set; } = string.Empty;
        }

        /// <summary>
        /// Handles HTTP GET requests to display the Forgot Password interface.
        /// </summary>
        public void OnGet()
        {
        }

        /// <summary>
        /// Handles HTTP POST requests to generate and email a 6-digit OTP code to the administrator.
        /// </summary>
        /// <returns>Redirect to the Reset Password verification screen.</returns>
        public async Task<IActionResult> OnPostAsync()
        {
            if (!ModelState.IsValid)
            {
                return Page();
            }

            var cleanEmail = Input.Email.Trim().ToLowerInvariant();
            var user = await _userManager.FindByEmailAsync(cleanEmail);

            if (user != null && user.IsActive)
            {
                // Verify that user possesses administrative privileges
                var isAdmin = await _userManager.IsInRoleAsync(user, "SuperAdmin")
                           || await _userManager.IsInRoleAsync(user, "Admin")
                           || await _userManager.IsInRoleAsync(user, "BillingAdmin")
                           || await _userManager.IsInRoleAsync(user, "Operator")
                           || await _userManager.IsInRoleAsync(user, "SupportAgent")
                           || await _userManager.IsInRoleAsync(user, "TemplateManager")
                           || await _userManager.IsInRoleAsync(user, "ReferralManager");

                if (isAdmin)
                {
                    _logger.LogInformation("Generating password recovery OTP for operator {Email}", cleanEmail);
                    var otp = _twoFactorService.GeneratePasswordResetOtp(cleanEmail);
                    await _emailService.SendPasswordResetOtpEmailAsync(cleanEmail, otp);
                }
                else
                {
                    _logger.LogWarning("Password reset requested for non-admin user {Email} on Central console.", cleanEmail);
                }
            }
            else
            {
                _logger.LogWarning("Password reset requested for non-existent or inactive user {Email}.", cleanEmail);
            }

            // Always redirect to the ResetPassword page with email prefilled to facilitate immediate entry of OTP
            return RedirectToPage("/ResetPassword", new { area = "Centralwks", email = cleanEmail });
        }
    }
}
