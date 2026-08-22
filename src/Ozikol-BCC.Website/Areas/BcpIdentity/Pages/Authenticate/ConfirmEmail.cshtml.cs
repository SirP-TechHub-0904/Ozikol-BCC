using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Ozikol_BCC.Application.Services;
using Ozikol_BCC.Domain.Models;
using System.ComponentModel.DataAnnotations;
using System.Threading.Tasks;

namespace Ozikol_BCC.Website.Areas.BcpIdentity.Pages.Authenticate
{
    [AllowAnonymous]
    public class ConfirmEmailModel : PageModel
    {
        private readonly UserManager<Profile> _userManager;
        private readonly IOtpVerificationService _otpService;

        public ConfirmEmailModel(UserManager<Profile> userManager, IOtpVerificationService otpService)
        {
            _userManager = userManager;
            _otpService = otpService;
        }

        public bool VerificationAttempted { get; set; }
        public bool VerificationSucceeded { get; set; }

        [BindProperty]
        public string? DisplayEmail { get; set; }

        [BindProperty]
        [Required, StringLength(6, MinimumLength = 6)]
        public string? OtpCode { get; set; }

        [TempData]
        public string? StatusMessage { get; set; }

        public async Task<IActionResult> OnGetAsync(string? userId, string? code, string? email)
        {
            DisplayEmail = email;

            if (!string.IsNullOrWhiteSpace(userId) && !string.IsNullOrWhiteSpace(code))
            {
                VerificationAttempted = true;
                var user = await _userManager.FindByIdAsync(userId);
                if (user == null)
                {
                    VerificationSucceeded = false;
                    StatusMessage = "Error: User account not found.";
                    return Page();
                }

                var (success, msg) = await _otpService.VerifyEmailOtpAsync(userId, code);
                if (!success)
                {
                    var result = await _userManager.ConfirmEmailAsync(user, code);
                    success = result.Succeeded;
                    msg = success ? "Email address confirmed successfully!" : "Invalid or expired OTP code.";
                }

                VerificationSucceeded = success;
                StatusMessage = msg;
            }

            return Page();
        }

        public async Task<IActionResult> OnPostConfirmOtpAsync(string? userId)
        {
            if (string.IsNullOrWhiteSpace(OtpCode))
            {
                ModelState.AddModelError("OtpCode", "Please enter the 6-digit OTP code.");
                return Page();
            }

            Profile? user = null;
            if (!string.IsNullOrWhiteSpace(userId))
            {
                user = await _userManager.FindByIdAsync(userId);
            }
            else if (!string.IsNullOrWhiteSpace(DisplayEmail))
            {
                user = await _userManager.FindByEmailAsync(DisplayEmail);
            }

            if (user == null)
            {
                StatusMessage = "Error: Account not found for verification.";
                return Page();
            }

            VerificationAttempted = true;
            var (success, msg) = await _otpService.VerifyEmailOtpAsync(user.Id, OtpCode);
            VerificationSucceeded = success;
            StatusMessage = msg;

            return Page();
        }

        public async Task<IActionResult> OnPostResendOtpAsync(string? userId)
        {
            Profile? user = null;
            if (!string.IsNullOrWhiteSpace(userId))
            {
                user = await _userManager.FindByIdAsync(userId);
            }
            else if (!string.IsNullOrWhiteSpace(DisplayEmail))
            {
                user = await _userManager.FindByEmailAsync(DisplayEmail);
            }

            if (user == null)
            {
                StatusMessage = "Error: Unable to locate account to resend OTP.";
                return Page();
            }

            var sent = await _otpService.SendEmailOtpAsync(user.Id, user.Email!);
            if (sent.Success)
            {
                StatusMessage = $"A fresh 6-digit OTP code has been sent to {user.Email}.";
            }
            else
            {
                StatusMessage = "Error: Failed to resend OTP code. Please try again.";
            }

            return Page();
        }
    }
}