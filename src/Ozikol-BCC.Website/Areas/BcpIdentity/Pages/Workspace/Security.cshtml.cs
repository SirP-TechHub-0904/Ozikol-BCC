using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Ozikol_BCC.Domain.Models;

namespace Ozikol_BCC.Website.Areas.BcpIdentity.Pages.Workspace;

[Authorize]
public class SecurityModel : PageModel
{
    private readonly UserManager<Profile> _userManager;

    public SecurityModel(UserManager<Profile> userManager)
    {
        _userManager = userManager;
    }

    public bool Is2FaEnabled { get; set; }
    public bool HasAuthenticatorKey { get; set; }
    public int RecoveryCodesLeft { get; set; }
    public DateTime? LastLogin { get; set; }
    public string UserEmail { get; set; } = string.Empty;

    public async Task<IActionResult> OnGetAsync()
    {
        var user = await _userManager.GetUserAsync(User);
        if (user == null)
        {
            return NotFound("Unable to load user.");
        }

        UserEmail = user.Email ?? string.Empty;
        Is2FaEnabled = await _userManager.GetTwoFactorEnabledAsync(user);
        HasAuthenticatorKey = await _userManager.GetAuthenticatorKeyAsync(user) != null;
        RecoveryCodesLeft = await _userManager.CountRecoveryCodesAsync(user);
        LastLogin = user.LastLogin;

        return Page();
    }
}