using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Ozikol_BCC.Domain.Models;

namespace Ozikol_BCC.Website.Areas.BcpIdentity.Pages.Workspace;

[Authorize]
public class RecoveryCodesModel : PageModel
{
    private readonly UserManager<Profile> _userManager;

    public RecoveryCodesModel(UserManager<Profile> userManager)
    {
        _userManager = userManager;
    }

    public string[] RecoveryCodes { get; set; } = Array.Empty<string>();

    [TempData]
    public string? StatusMessage { get; set; }

    public async Task<IActionResult> OnGetAsync()
    {
        var user = await _userManager.GetUserAsync(User);
        if (user == null)
        {
            return NotFound("Unable to load user.");
        }

        var is2faEnabled = await _userManager.GetTwoFactorEnabledAsync(user);
        if (!is2faEnabled)
        {
            return RedirectToPage("/Workspace/TwoFactor", new { area = "BcpIdentity" });
        }

        return Page();
    }

    public async Task<IActionResult> OnPostGenerateAsync()
    {
        var user = await _userManager.GetUserAsync(User);
        if (user == null)
        {
            return NotFound("Unable to load user.");
        }

        var is2faEnabled = await _userManager.GetTwoFactorEnabledAsync(user);
        if (!is2faEnabled)
        {
            return RedirectToPage("/Workspace/TwoFactor", new { area = "BcpIdentity" });
        }

        var recoveryCodes = await _userManager.GenerateNewTwoFactorRecoveryCodesAsync(user, 10);
        RecoveryCodes = recoveryCodes?.ToArray() ?? Array.Empty<string>();

        StatusMessage = "New 2FA recovery codes generated. Store them in a safe place.";
        return Page();
    }
}