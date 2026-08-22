using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Website.Services;
using System.ComponentModel.DataAnnotations;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Website.Areas.BcpIdentity.Pages.Authenticate;

[AllowAnonymous]
public class ResetPasswordModel : PageModel
{
    private readonly UserManager<Profile> _userManager;
    private readonly IBcpMessageQueueService _messageQueue;

    public ResetPasswordModel(
        UserManager<Profile> userManager,
        IBcpMessageQueueService messageQueue)
    {
        _userManager = userManager;
        _messageQueue = messageQueue;
    }

    [BindProperty]
    public InputModel Input { get; set; } = new();

    public bool ResetSucceeded { get; set; }

    public IActionResult OnGet(string? email = null)
    {
        Input = new InputModel
        {
            Email = email ?? string.Empty
        };

        ModelState.Clear();
        return Page();
    }

    public async Task<IActionResult> OnPostAsync()
    {
        if (!ModelState.IsValid)
        {
            return Page();
        }

        var user = await _userManager.FindByEmailAsync(Input.Email);
        if (user == null)
        {
            ModelState.AddModelError(string.Empty, "Invalid email address or user account not found.");
            return Page();
        }

        // Clean code string
        var cleanCode = Input.Code.Replace(" ", string.Empty).Replace("-", string.Empty);

        // Verify the 6-digit OTP token
        var isOtpValid = await _userManager.VerifyTwoFactorTokenAsync(user, "Email", cleanCode);
        if (!isOtpValid)
        {
            ModelState.AddModelError(string.Empty, "Invalid or expired 6-digit verification code.");
            return Page();
        }

        // Generate standard password reset token behind the scenes and execute reset
        var resetToken = await _userManager.GeneratePasswordResetTokenAsync(user);
        var result = await _userManager.ResetPasswordAsync(user, resetToken, Input.Password);

        if (result.Succeeded)
        {
            // Send unified security notification (In-App + Email)
            await _messageQueue.EnqueueAsync(
                BcpEventType.PasswordChanged,
                user.Id,
                "Password Successfully Reset",
                "Your password has been successfully reset. If you did not perform this action, please contact support immediately.",
                actionUrl: "/BcpIdentity/Workspace/Security");

            ResetSucceeded = true;
            return Page();
        }

        foreach (var error in result.Errors)
        {
            ModelState.AddModelError(string.Empty, error.Description);
        }

        return Page();
    }

    public class InputModel
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        [StringLength(10, MinimumLength = 6, ErrorMessage = "Please enter the 6-digit verification code.")]
        [Display(Name = "6-Digit Verification Code")]
        public string Code { get; set; } = string.Empty;

        [Required]
        [StringLength(100, ErrorMessage = "The {0} must be at least {2} and at most {1} characters long.", MinimumLength = 6)]
        [DataType(DataType.Password)]
        [Display(Name = "New Password")]
        public string Password { get; set; } = string.Empty;

        [DataType(DataType.Password)]
        [Display(Name = "Confirm Password")]
        [Compare("Password", ErrorMessage = "The password and confirmation password do not match.")]
        public string ConfirmPassword { get; set; } = string.Empty;
    }
}