using Microsoft.AspNetCore.Mvc;

namespace Ozikol.Central.Pages.Features;

/// <summary>
/// Page model for the ShiftSwapsLeave feature detail page.
/// Permanently redirects to the consolidated Staff Rota & Shift Management feature.
/// </summary>
public class ShiftSwapsLeaveModel : FeatureDetailPageModel
{
    /// <summary>
    /// Handles GET requests by issuing a permanent 301 redirect to the consolidated Staff Rota page.
    /// </summary>
    /// <returns>Permanent redirect to Staff Rota.</returns>
    public new IActionResult OnGet()
    {
        base.OnGet();
        return RedirectToPagePermanent("/Features/StaffRota");
    }
}
