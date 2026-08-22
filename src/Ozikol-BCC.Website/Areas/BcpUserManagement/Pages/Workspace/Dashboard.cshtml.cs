using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;

namespace Ozikol_BCC.Website.Areas.BcpUserManagement.Pages.Workspace;

[Authorize]
public class DashboardModel : PageModel
{
    private readonly UserManager<Profile> _userManager;
    private readonly DashboardDbContext _context;
    public DashboardModel(UserManager<Profile> userManager, DashboardDbContext context) { _userManager = userManager; _context = context; }
    public Profile? UserProfile { get; private set; }
    public int FeatureRoleCount { get; private set; }
    public int PerformanceCount { get; private set; }
    public int VisibleNoteCount { get; private set; }
    public async Task OnGetAsync()
    {
        var current = await _userManager.GetUserAsync(User);
        if (current is null) return;
        UserProfile = await _userManager.Users.Include(x => x.BcpUserCategory).FirstOrDefaultAsync(x => x.Id == current.Id);
        FeatureRoleCount = await _context.BcpUserFeatureRoles.CountAsync(x => x.ProfileId == current.Id && x.IsActive);
        PerformanceCount = await _context.BcpKpiUserScores.CountAsync(x => x.ProfileId == current.Id);
        VisibleNoteCount = await _context.BcpUserNotes.CountAsync(x => x.ProfileId == current.Id && !x.IsPrivate);
    }
}
