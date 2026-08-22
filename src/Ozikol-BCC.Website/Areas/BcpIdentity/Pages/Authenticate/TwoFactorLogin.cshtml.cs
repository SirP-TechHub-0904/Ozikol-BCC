using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Website.Services;
using System.ComponentModel.DataAnnotations;
using System.Threading.Tasks;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Website.Areas.BcpIdentity.Pages.Authenticate
{
    [AllowAnonymous]
    public class TwoFactorLoginModel : PageModel
    {
        private readonly SignInManager<Profile> _signInManager;
        private readonly UserManager<Profile> _userManager;
        private readonly IBcpMessageQueueService _messageQueue;

        public TwoFactorLoginModel(
            SignInManager<Profile> signInManager,
            UserManager<Profile> userManager,
            IBcpMessageQueueService messageQueue)
        {
            _signInManager = signInManager;
            _userManager = userManager;
            _messageQueue = messageQueue;
        }

        [BindProperty]
        public InputModel Input { get; set; } = new();

        public bool RememberMe { get; set; }
        public string? ReturnUrl { get; set; }

        public BcpTwoFactorProvider ActiveProvider { get; set; }
        public string? MaskedDestination { get; set; }

        [TempData]
        public string? StatusMessage { get; set; }

        public async Task<IActionResult> OnGetAsync(bool rememberMe, string? returnUrl = null)
        {
            // Ensure we have a user in the 2FA pipeline
            var user = await _signInManager.GetTwoFactorAuthenticationUserAsync();
            if (user == null)
            {
                return RedirectToPage("/Authenticate/Login", new { area = "BcpIdentity" });
            }

            RememberMe = rememberMe;
            ReturnUrl = returnUrl;
            ActiveProvider = user.PreferredTwoFactorProvider;

            // Trigger code dispatch if Email or SMS is active
            if (ActiveProvider == BcpTwoFactorProvider.Email)
            {
                var code = await _userManager.GenerateTwoFactorTokenAsync(user, "Email");
                await _messageQueue.EnqueueEmailAsync(
                    user.Email!,
                    user.FullName,
                    "Login Verification Code",
                    $"Your Ozikol sign-in verification code is: {code}.",
                    BcpMessageCategory.Security,
                    BcpMessagePriority.Urgent,
                    user.Id,
                    BcpEventType.LoginOtp);

                MaskedDestination = MaskEmail(user.Email ?? "your email");
                StatusMessage = "A verification code has been dispatched to your email address.";
            }
            else if (ActiveProvider == BcpTwoFactorProvider.SMS)
            {
                var code = await _userManager.GenerateTwoFactorTokenAsync(user, "Phone");
                await _messageQueue.EnqueueSmsAsync(
                    user.PhoneNumber!,
                    $"Your Ozikol 2FA code is: {code}",
                    BcpMessageCategory.Security,
                    BcpMessagePriority.Urgent,
                    user.Id,
                    BcpEventType.LoginOtp);

                MaskedDestination = MaskPhone(user.PhoneNumber ?? "your phone");
                StatusMessage = "A verification code has been sent via SMS to your mobile device.";
            }

            return Page();
        }

        public async Task<IActionResult> OnPostAsync(bool rememberMe, string? returnUrl = null)
        {
            var user = await _signInManager.GetTwoFactorAuthenticationUserAsync();
            if (user == null)
            {
                return RedirectToPage("/Authenticate/Login", new { area = "BcpIdentity" });
            }

            ReturnUrl = returnUrl ?? Url.Content("~/");
            ActiveProvider = user.PreferredTwoFactorProvider;

            if (!ModelState.IsValid)
            {
                return Page();
            }

            var code = Input.Code.Replace(" ", string.Empty).Replace("-", string.Empty);
            Microsoft.AspNetCore.Identity.SignInResult result;

            if (ActiveProvider == BcpTwoFactorProvider.Email)
            {
                result = await _signInManager.TwoFactorSignInAsync("Email", code, rememberMe, rememberClient: Input.RememberClient);
            }
            else if (ActiveProvider == BcpTwoFactorProvider.SMS)
            {
                result = await _signInManager.TwoFactorSignInAsync("Phone", code, rememberMe, rememberClient: Input.RememberClient);
            }
            else
            {
                // Authenticator app TOTP code
                result = await _signInManager.TwoFactorAuthenticatorSignInAsync(code, rememberMe, rememberClient: Input.RememberClient);
            }

            if (result.Succeeded)
            {
                // Update last login timestamp
                user.LastLogin = DateTime.UtcNow;
                await _userManager.UpdateAsync(user);

                // Check Admin Console roles vs Workspace
                var roles = await _userManager.GetRolesAsync(user);
                bool isAdmin = roles.Contains("Administrator") || roles.Contains("SuperAdmin") || roles.Contains("PlatformOwner");

                if (isAdmin)
                {
                    return RedirectToPage("/Console/Dashboard", new { area = "BcpConsole" });
                }

                return RedirectToPage("/Workspace/Dashboard", new { area = "BcpWorkspace" });
            }

            if (result.IsLockedOut)
            {
                return RedirectToPage("/Authenticate/LockedOut", new { area = "BcpIdentity" });
            }

            ModelState.AddModelError(string.Empty, "Invalid verification code.");
            return Page();
        }

        public async Task<IActionResult> OnPostResendCodeAsync(bool rememberMe, string? returnUrl = null)
        {
            var user = await _signInManager.GetTwoFactorAuthenticationUserAsync();
            if (user == null)
            {
                return RedirectToPage("/Authenticate/Login", new { area = "BcpIdentity" });
            }

            RememberMe = rememberMe;
            ReturnUrl = returnUrl;
            ActiveProvider = user.PreferredTwoFactorProvider;

            if (ActiveProvider == BcpTwoFactorProvider.Email)
            {
                var code = await _userManager.GenerateTwoFactorTokenAsync(user, "Email");
                await _messageQueue.EnqueueEmailAsync(
                    user.Email!,
                    user.FullName,
                    "Your Login Security Verification Code",
                    $"<div style='font-family:sans-serif;padding:20px;'><h3 style='color:#2563eb;'>2FA Login Code</h3><p>Your 2FA verification code is:</p><div style='font-size:28px;font-weight:bold;color:#2563eb;letter-spacing:4px;'>{code}</div></div>",
                    BcpMessageCategory.Security,
                    BcpMessagePriority.Urgent,
                    user.Id,
                    BcpEventType.LoginOtp
                );
                StatusMessage = "A fresh 2FA code has been sent to your email.";
            }
            else if (ActiveProvider == BcpTwoFactorProvider.SMS && !string.IsNullOrWhiteSpace(user.PhoneNumber))
            {
                var code = await _userManager.GenerateTwoFactorTokenAsync(user, "Phone");
                await _messageQueue.EnqueueSmsAsync(
                    user.PhoneNumber,
                    $"Your 2FA verification code is: {code}",
                    BcpMessageCategory.Security,
                    BcpMessagePriority.Urgent,
                    user.Id,
                    BcpEventType.LoginOtp
                );
                StatusMessage = "A fresh 2FA SMS code has been sent to your phone.";
            }

            return Page();
        }

        private string MaskEmail(string email)
        {
            var parts = email.Split('@');
            if (parts.Length != 2) return email;
            var name = parts[0];
            var domain = parts[1];
            if (name.Length <= 3) return $"***@{domain}";
            return $"{name.Substring(0, 2)}***{name.Substring(name.Length - 1)}@{domain}";
        }

        private string MaskPhone(string phone)
        {
            if (phone.Length < 4) return phone;
            return $"***-***-{phone.Substring(phone.Length - 4)}";
        }

        public class InputModel
        {
            [Required]
            [DataType(DataType.Text)]
            [Display(Name = "Verification Code")]
            public string Code { get; set; } = string.Empty;

            [Display(Name = "Trust this browser")]
            public bool RememberClient { get; set; }
        }
    }
}