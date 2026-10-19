using System;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.Extensions.Logging;
using Ozikol.Central.Services;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Areas.Centralwks.Pages
{
    /// <summary>
    /// PageModel verifying operator 6-digit OTP codes and resetting administrative account passwords in Centralwks.
    /// </summary>
    public class ResetPasswordModel : PageModel
    {
        private readonly UserManager<CentralUser> _userManager;
        private readonly ICentralTwoFactorService _twoFactorService;
        private readonly ICentralEmailService _emailService;
        private readonly MasterCatalogDbContext _dbContext;
        private readonly ILogger<ResetPasswordModel> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="ResetPasswordModel"/> class.
        /// </summary>
        /// <param name="userManager">Identity user manager for CentralUser accounts.</param>
        /// <param name="twoFactorService">Security service for validating numeric OTP codes.</param>
        /// <param name="emailService">Service for dispatching outbound transactional emails.</param>
        /// <param name="dbContext">Master catalog database context for logging audit trail events.</param>
        /// <param name="logger">Security diagnostics logger.</param>
        public ResetPasswordModel(
            UserManager<CentralUser> userManager,
            ICentralTwoFactorService twoFactorService,
            ICentralEmailService emailService,
            MasterCatalogDbContext dbContext,
            ILogger<ResetPasswordModel> logger)
        {
            _userManager = userManager ?? throw new ArgumentNullException(nameof(userManager));
            _twoFactorService = twoFactorService ?? throw new ArgumentNullException(nameof(twoFactorService));
            _emailService = emailService ?? throw new ArgumentNullException(nameof(emailService));
            _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>
        /// Gets or sets the reset credentials input model.
        /// </summary>
        [BindProperty]
        public InputModel Input { get; set; } = new InputModel();

        /// <summary>
        /// Error message displayed when password reset fails.
        /// </summary>
        public string? ErrorMessage { get; set; }

        /// <summary>
        /// Input model schema for OTP verification and password reset.
        /// </summary>
        public class InputModel
        {
            /// <summary>
            /// Operator's registered administrative email address.
            /// </summary>
            [Required(ErrorMessage = "Please enter your operator email.")]
            [EmailAddress(ErrorMessage = "Please enter a valid email address.")]
            [Display(Name = "Work Email")]
            public string Email { get; set; } = string.Empty;

            /// <summary>
            /// 6-digit verification code received via email.
            /// </summary>
            [Required(ErrorMessage = "Please enter the 6-digit security code.")]
            [StringLength(6, MinimumLength = 6, ErrorMessage = "Security code must be exactly 6 digits.")]
            [RegularExpression(@"^\d{6}$", ErrorMessage = "Security code must contain 6 numbers.")]
            [Display(Name = "6-Digit Code")]
            public string OtpCode { get; set; } = string.Empty;

            /// <summary>
            /// New secret password for the operator account.
            /// </summary>
            [Required(ErrorMessage = "Please enter a new password.")]
            [StringLength(100, MinimumLength = 6, ErrorMessage = "Password must be at least 6 characters long.")]
            [DataType(DataType.Password)]
            [Display(Name = "New Password")]
            public string NewPassword { get; set; } = string.Empty;

            /// <summary>
            /// Confirmation of the new secret password.
            /// </summary>
            [Required(ErrorMessage = "Please confirm your new password.")]
            [DataType(DataType.Password)]
            [Compare("NewPassword", ErrorMessage = "The password and confirmation password do not match.")]
            [Display(Name = "Confirm Password")]
            public string ConfirmPassword { get; set; } = string.Empty;
        }

        /// <summary>
        /// Handles HTTP GET requests to display the Reset Password interface.
        /// </summary>
        /// <param name="email">Optional operator email prefilled from the request query.</param>
        public void OnGet(string? email = null)
        {
            if (!string.IsNullOrWhiteSpace(email))
            {
                Input.Email = email.Trim();
            }
        }

        /// <summary>
        /// Handles HTTP POST requests to validate the 6-digit OTP and reset the administrator password.
        /// </summary>
        /// <returns>Redirect to login on success, or page with errors on failure.</returns>
        public async Task<IActionResult> OnPostAsync()
        {
            if (!ModelState.IsValid)
            {
                return Page();
            }

            var cleanEmail = Input.Email.Trim().ToLowerInvariant();
            var cleanOtp = Input.OtpCode.Trim();

            // 1. Verify 6-digit OTP code against memory cache
            var isOtpValid = _twoFactorService.VerifyPasswordResetOtp(cleanEmail, cleanOtp);
            if (!isOtpValid)
            {
                _logger.LogWarning("Invalid or expired password reset OTP submitted for {Email}", cleanEmail);
                ErrorMessage = "The 6-digit verification code is invalid or has expired. Please request a new code.";
                return Page();
            }

            // 2. Locate the operator account
            var user = await _userManager.FindByEmailAsync(cleanEmail);
            if (user == null || !user.IsActive)
            {
                _logger.LogWarning("Password reset rejected: Operator {Email} not found or deactivated.", cleanEmail);
                ErrorMessage = "Administrator account could not be found or has been deactivated.";
                return Page();
            }

            // 3. Generate native ASP.NET Identity token and execute reset
            var resetToken = await _userManager.GeneratePasswordResetTokenAsync(user);
            var result = await _userManager.ResetPasswordAsync(user, resetToken, Input.NewPassword);

            if (result.Succeeded)
            {
                _logger.LogInformation("Password successfully reset for operator {Email}", cleanEmail);

                // Record audit trail event
                try
                {
                    _dbContext.MasterAuditLogs.Add(new MasterAuditLog
                    {
                        UserId = user.Id,
                        UserName = user.FullName ?? user.UserName,
                        Action = "PasswordReset",
                        EntityType = "User",
                        EntityId = user.Id,
                        Summary = $"Administrator password self-reset with OTP verification from IP {HttpContext.Connection.RemoteIpAddress}",
                        IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                        UserAgent = Request.Headers["User-Agent"].ToString(),
                        CreatedUtc = DateTime.UtcNow
                    });
                    await _dbContext.SaveChangesAsync();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to record audit log for password reset of {Email}.", cleanEmail);
                }

                TempData["StatusMessage"] = "Your password has been reset successfully. Please sign in with your new credentials.";
                return Redirect("/centralwks/login");
            }

            _logger.LogWarning("Password reset failed for {Email}: {Errors}", cleanEmail, string.Join(", ", result.Errors.Select(e => e.Description)));
            ErrorMessage = string.Join(" ", result.Errors.Select(e => e.Description));
            return Page();
        }

        /// <summary>
        /// Request payload for resending a 6-digit OTP code via AJAX.
        /// </summary>
        public class ResendOtpRequest
        {
            /// <summary>
            /// Gets or sets the operator email address to receive the verification OTP.
            /// </summary>
            public string? Email { get; set; }
        }

        /// <summary>
        /// Handles HTTP POST requests to resend a new 6-digit verification OTP code to the operator email.
        /// </summary>
        /// <param name="request">Optional JSON request body containing the email.</param>
        /// <returns>JSON result indicating success and response message.</returns>
        public async Task<IActionResult> OnPostResendAsync([FromBody] ResendOtpRequest? request)
        {
            var targetEmail = (request?.Email ?? Input.Email).Trim().ToLowerInvariant();
            if (string.IsNullOrWhiteSpace(targetEmail))
            {
                return new JsonResult(new { success = false, message = "Email address is required." });
            }

            var user = await _userManager.FindByEmailAsync(targetEmail);
            if (user == null || !user.IsActive)
            {
                return new JsonResult(new { success = false, message = "Administrator account not found or deactivated." });
            }

            try
            {
                _logger.LogInformation("Resending password reset OTP to {Email}", targetEmail);
                var otp = _twoFactorService.GeneratePasswordResetOtp(targetEmail);
                var sent = await _emailService.SendPasswordResetOtpEmailAsync(targetEmail, otp);

                if (sent)
                {
                    return new JsonResult(new { success = true, message = "A new 6-digit security code has been dispatched to your email." });
                }
                else
                {
                    return new JsonResult(new { success = false, message = "Email dispatch failed. Please verify provider configuration." });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error while resending password reset OTP to {Email}", targetEmail);
                return new JsonResult(new { success = false, message = "An unexpected error occurred while dispatching the code." });
            }
        }
    }
}
