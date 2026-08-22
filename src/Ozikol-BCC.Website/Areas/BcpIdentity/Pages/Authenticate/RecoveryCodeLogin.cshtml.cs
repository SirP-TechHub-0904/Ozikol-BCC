using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Website.Services;
using System.ComponentModel.DataAnnotations;
using System.Threading.Tasks;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Website.Areas.BcpIdentity.Pages.Authenticate;

[AllowAnonymous]
public class RecoveryCodeLoginModel : PageModel
{
    private readonly SignInManager<Profile> _signInManager;
    private readonly UserManager<Profile> _userManager;
    private readonly IBcpMessageQueueService _messageQueue;

    public RecoveryCodeLoginModel(
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

    public async Task<IActionResult> OnGetAsync()
    {
        // Ensure user is in two-factor pipeline
        var user = await _signInManager.GetTwoFactorAuthenticationUserAsync();
        if (user == null)
        {
            return RedirectToPage("/Authenticate/Login", new { area = "BcpIdentity" });
        }

        return Page();
    }

    public async Task<IActionResult> OnPostAsync()
    {
        if (!ModelState.IsValid)
        {
            return Page();
        }

        var user = await _signInManager.GetTwoFactorAuthenticationUserAsync();
        if (user == null)
        {
            return RedirectToPage("/Authenticate/Login", new { area = "BcpIdentity" });
        }

        var recoveryCode = Input.RecoveryCode.Replace(" ", string.Empty).Replace("-", string.Empty);

        var result = await _signInManager.TwoFactorRecoveryCodeSignInAsync(recoveryCode);

        if (result.Succeeded)
        {
            // Log security notification
            await _messageQueue.EnqueueAsync(
                BcpEventType.TwoFactorDisabled, // Logged as security alert
                user.Id,
                "Signed In via Emergency Recovery Code",
                "You successfully signed into your account using an emergency 2FA recovery code.",
                actionUrl: "/BcpIdentity/Workspace/Security");

            user.LastLogin = DateTime.UtcNow;
            await _userManager.UpdateAsync(user);

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

        ModelState.AddModelError(string.Empty, "Invalid emergency recovery code entered.");
        return Page();
    }

    public class InputModel
    {
        [Required]
        [DataType(DataType.Text)]
        [Display(Name = "Recovery Code")]
        public string RecoveryCode { get; set; } = string.Empty;
    }
}