using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Ozikol_BCC.Domain.Models;

namespace Ozikol_BCC.Website.Areas.BcpIdentity.Pages.Authenticate;

/// <summary>
/// Ends the active BCP identity cookie and returns the user to the public sign-in route.
/// </summary>
[Authorize]
public class LogoutModel : PageModel
{
    private readonly SignInManager<Profile> _signInManager;

    public LogoutModel(SignInManager<Profile> signInManager)
    {
        _signInManager = signInManager;
    }

    public void OnGet()
    {
    }

    public async Task<IActionResult> OnPostAsync()
    {
        // Central sign-out point for the Authenticate area; later session revocation can hook in here.
        await _signInManager.SignOutAsync();
        return RedirectToPage("/Authenticate/Login", new { area = "BcpIdentity" });
    }
}
