using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Ozikol_BCC.Domain.Models;

namespace Ozikol_BCC.Website.Areas.BcpIdentity.Pages.Workspace;

[Authorize]
public class TrustedDevicesModel : PageModel
{
    private readonly UserManager<Profile> _userManager;
    private readonly SignInManager<Profile> _signInManager;

    public TrustedDevicesModel(UserManager<Profile> userManager, SignInManager<Profile> signInManager)
    {
        _userManager = userManager;
        _signInManager = signInManager;
    }

    public bool Is2FaBrowserRemembered { get; set; }

    [TempData]
    public string? StatusMessage { get; set; }

    public async Task<IActionResult> OnGetAsync()
    {
        var user = await _userManager.GetUserAsync(User);
        if (user == null)
        {
            return NotFound("Unable to load user.");
        }

        Is2FaBrowserRemembered = await _signInManager.IsTwoFactorClientRememberedAsync(user);
        return Page();
    }

    public async Task<IActionResult> OnPostForgetBrowserAsync()
    {
        await _signInManager.ForgetTwoFactorClientAsync();
        StatusMessage = "Current browser key forgotten. You will be prompted for 2FA next time you log in.";
        return RedirectToPage();
    }
}