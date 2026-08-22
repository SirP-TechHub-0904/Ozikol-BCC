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
public class ForgotPasswordModel : PageModel
{
    private readonly UserManager<Profile> _userManager;
    private readonly IBcpMessageQueueService _messageQueue;

    public ForgotPasswordModel(
        UserManager<Profile> userManager,
        IBcpMessageQueueService messageQueue)
    {
        _userManager = userManager;
        _messageQueue = messageQueue;
    }

    [BindProperty]
    public InputModel Input { get; set; } = new();

    public void OnGet()
    {
    }

    public async Task<IActionResult> OnPostAsync()
    {
        if (!ModelState.IsValid)
        {
            return Page();
        }

        var user = await _userManager.FindByEmailAsync(Input.Email);

        if (user != null)
        {
            // Generate 6-digit email OTP token
            var otpCode = await _userManager.GenerateTwoFactorTokenAsync(user, "Email");

            // Dispatch 6-digit OTP email via message queue
            var htmlBody = $@"
                <p>Hi <strong>{user.FullName}</strong>,</p>
                <p>We received a request to reset your Ozikol password. Use the 6-digit verification code below:</p>
                <div style='margin:24px 0; padding:16px; background:#f1f5f9; border-radius:10px; text-align:center;'>
                    <span style='font-size:32px; font-weight:800; letter-spacing:6px; color:#1e293b;'>{otpCode}</span>
                </div>
                <p style='font-size:13px; color:#6b7280;'>Enter this 6-digit code on the password reset page to create your new password.</p>
                <p style='font-size:12px; color:#9ca3af; margin-top:20px;'>If you did not request this, please ignore this email. Your password will remain unchanged.</p>";

            await _messageQueue.EnqueueEmailAsync(
                user.Email!,
                user.FullName,
                "Password Reset Verification Code",
                htmlBody,
                BcpMessageCategory.Security,
                BcpMessagePriority.Urgent,
                user.Id,
                BcpEventType.PasswordReset);
        }

        // Always redirect to ResetPassword page with email prefilled
        return RedirectToPage("/Authenticate/ResetPassword", new { area = "BcpIdentity", email = Input.Email });
    }

    public class InputModel
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;
    }
}