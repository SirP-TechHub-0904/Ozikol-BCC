using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Website.Services;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Website.Areas.BcpIdentity.Pages.Authenticate;

/// <summary>
/// Handles the BCP public sign-in flow, including email-to-username resolution,
/// lockout-on-failure, two-factor redirects, and safe local return navigation.
/// </summary>
[AllowAnonymous]
public class LoginModel : PageModel
{
    private readonly SignInManager<Profile> _signInManager;
    private readonly UserManager<Profile> _userManager;
    private readonly IBcpMessageQueueService _messageQueue;
    private readonly Ozikol_BCC.Application.Services.IOtpVerificationService _otpService;

    public LoginModel(
        SignInManager<Profile> signInManager, 
        UserManager<Profile> userManager,
        IBcpMessageQueueService messageQueue,
        Ozikol_BCC.Application.Services.IOtpVerificationService otpService)
    {
        _signInManager = signInManager;
        _userManager = userManager;
        _messageQueue = messageQueue;
        _otpService = otpService;
    }

    [BindProperty]
    public LoginInput Input { get; set; } = new();

    public string ReturnUrl { get; set; } = "/BcpConsole/Console/Dashboard";

    public void OnGet(string? returnUrl = null)
    {
        ReturnUrl = string.IsNullOrWhiteSpace(returnUrl) ? "/BcpConsole/Console/Dashboard" : returnUrl;
    }

    public async Task<IActionResult> OnPostAsync(string? returnUrl = null)
    {
        ReturnUrl = string.IsNullOrWhiteSpace(returnUrl) ? "/BcpConsole/Console/Dashboard" : returnUrl;

        if (!ModelState.IsValid)
        {
            return Page();
        }

        var userName = Input.Login;
        var user = await _userManager.FindByEmailAsync(Input.Login);
        if (user == null)
        {
            user = await _userManager.FindByNameAsync(Input.Login);
        }

        if (user != null)
        {
            // ASP.NET Identity signs in by user name; allow users to type email on the BCP form.
            userName = user.UserName ?? Input.Login;

            // Intercept and enforce email confirmation check with 6-digit OTP
            var isPasswordValid = await _userManager.CheckPasswordAsync(user, Input.Password);
            if (isPasswordValid && !user.EmailConfirmed)
            {
                await _otpService.SendEmailOtpAsync(user.Id, user.Email!);
                return RedirectToPage("/Authenticate/ConfirmEmail", new { area = "BcpIdentity", email = user.Email });
            }
        }

        // Lockout is enabled here so repeated failed attempts participate in the tenant security policy.
        var result = await _signInManager.PasswordSignInAsync(userName, Input.Password, Input.RememberMe, lockoutOnFailure: true);
        if (result.Succeeded)
        {
            if (user != null)
            {
                user.LastLogin = DateTime.UtcNow;
                await _userManager.UpdateAsync(user);
            }

            if (!string.IsNullOrWhiteSpace(returnUrl) && !returnUrl.Equals("/BcpConsole/Console/Dashboard", StringComparison.OrdinalIgnoreCase))
            {
                return LocalRedirect(returnUrl);
            }

            if (user != null)
            {
                var userRoles = await _userManager.GetRolesAsync(user);
                bool isAdmin = userRoles.Any(r => r.Equals("Administrator", StringComparison.OrdinalIgnoreCase)
                                               || r.Equals("SuperAdmin", StringComparison.OrdinalIgnoreCase)
                                               || r.Equals("PlatformOwner", StringComparison.OrdinalIgnoreCase));

                if (isAdmin)
                {
                    return RedirectToPage("/Console/Dashboard", new { area = "BcpConsole" });
                }
            }

            return RedirectToPage("/Workspace/Dashboard", new { area = "BcpWorkspace" });
        }

        if (result.RequiresTwoFactor)
        {
            // Preserve ReturnUrl and RememberMe through MFA so the post-MFA redirect matches the original request.
            return RedirectToPage("/Authenticate/TwoFactorLogin", new { area = "BcpIdentity", returnUrl = ReturnUrl, rememberMe = Input.RememberMe });
        }

        if (result.IsLockedOut)
        {
            return RedirectToPage("/Authenticate/LockedOut", new { area = "BcpIdentity" });
        }

        ModelState.AddModelError(string.Empty, "Invalid sign-in attempt.");
        return Page();
    }

    public class LoginInput
    {
        [Required]
        public string Login { get; set; } = string.Empty;

        [Required]
        [DataType(DataType.Password)]
        public string Password { get; set; } = string.Empty;

        public bool RememberMe { get; set; }
    }
}
