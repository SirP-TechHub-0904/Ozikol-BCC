using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;

namespace Ozikol_BCC.Website.Areas.BcpIdentity.Pages.Console;

[Authorize]
public class MfaPolicyModel : PageModel
{
    private readonly DashboardDbContext _context;

    public MfaPolicyModel(DashboardDbContext context)
    {
        _context = context;
    }

    [BindProperty]
    public InputModel Input { get; set; } = new();

    [TempData]
    public string? StatusMessage { get; set; }

    public async Task OnGetAsync()
    {
        var settings = await _context.BcpSettings.FirstOrDefaultAsync();

        if (settings != null)
        {
            Input = new InputModel
            {
                MfaRequiredGlobally = settings.MfaRequiredGlobally,
                MfaRequiredForAdmins = settings.MfaRequiredForAdmins
            };
        }
    }

    public async Task<IActionResult> OnPostAsync()
    {
        if (!ModelState.IsValid)
        {
            return Page();
        }

        var settings = await _context.BcpSettings.FirstOrDefaultAsync();
        if (settings == null)
        {
            settings = new BcpSetting();
            _context.BcpSettings.Add(settings);
        }

        settings.MfaRequiredGlobally = Input.MfaRequiredGlobally;
        settings.MfaRequiredForAdmins = Input.MfaRequiredForAdmins;

        await _context.SaveChangesAsync();
        StatusMessage = "Multi-Factor Authentication policy updated successfully.";

        return RedirectToPage();
    }

    public class InputModel
    {
        [Display(Name = "Enforce MFA for ALL platform users globally")]
        public bool MfaRequiredGlobally { get; set; }

        [Display(Name = "Enforce MFA for Console Admin users")]
        public bool MfaRequiredForAdmins { get; set; }
    }
}