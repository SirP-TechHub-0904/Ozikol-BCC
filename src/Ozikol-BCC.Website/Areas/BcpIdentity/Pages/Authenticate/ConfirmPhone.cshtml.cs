using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Application.Services;
using Ozikol_BCC.Domain.Models;
using System.ComponentModel.DataAnnotations;
using System.Threading.Tasks;

namespace Ozikol_BCC.Website.Areas.BcpIdentity.Pages.Authenticate
{
    [AllowAnonymous]
    public class ConfirmPhoneModel : PageModel
    {
        private readonly UserManager<Profile> _userManager;
        private readonly IOtpVerificationService _otpService;

        public ConfirmPhoneModel(UserManager<Profile> userManager, IOtpVerificationService otpService)
        {
            _userManager = userManager;
            _otpService = otpService;
        }

        public bool VerificationAttempted { get; set; }
        public bool VerificationSucceeded { get; set; }

        [BindProperty]
        public string? DisplayPhone { get; set; }

        [BindProperty]
        [Required, StringLength(6, MinimumLength = 6)]
        public string? OtpCode { get; set; }

        [TempData]
        public string? StatusMessage { get; set; }

        public void OnGet(string? phone)
        {
            DisplayPhone = phone;
        }

        public async Task<IActionResult> OnPostConfirmOtpAsync()
        {
            if (string.IsNullOrWhiteSpace(OtpCode))
            {
                ModelState.AddModelError("OtpCode", "Please enter the 6-digit SMS OTP code.");
                return Page();
            }

            var user = await _userManager.GetUserAsync(User);
            if (user == null && !string.IsNullOrWhiteSpace(DisplayPhone))
            {
                user = await _userManager.Users.FirstOrDefaultAsync(u => u.PhoneNumber == DisplayPhone);
            }

            if (user == null)
            {
                StatusMessage = "Error: Account not found for phone verification.";
                return Page();
            }

            VerificationAttempted = true;
            var (success, msg) = await _otpService.VerifyPhoneOtpAsync(user.Id, OtpCode);
            VerificationSucceeded = success;
            StatusMessage = msg;

            return Page();
        }

        public async Task<IActionResult> OnPostResendOtpAsync()
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null && !string.IsNullOrWhiteSpace(DisplayPhone))
            {
                user = await _userManager.Users.FirstOrDefaultAsync(u => u.PhoneNumber == DisplayPhone);
            }

            if (user == null || string.IsNullOrWhiteSpace(user.PhoneNumber))
            {
                StatusMessage = "Error: Unable to locate account phone number to resend SMS OTP.";
                return Page();
            }

            var sent = await _otpService.SendPhoneOtpAsync(user.Id, user.PhoneNumber);
            if (sent.Success)
            {
                StatusMessage = $"A fresh 6-digit SMS OTP code has been sent to {user.PhoneNumber}.";
            }
            else
            {
                StatusMessage = "Error: Failed to resend SMS OTP code. Please try again.";
            }

            return Page();
        }
    }
}
