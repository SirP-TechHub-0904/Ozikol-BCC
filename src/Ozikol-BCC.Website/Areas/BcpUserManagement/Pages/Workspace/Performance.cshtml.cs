using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;

namespace Ozikol_BCC.Website.Areas.BcpUserManagement.Pages.Workspace;

[Authorize]
public class PerformanceModel : PageModel
{
    private readonly UserManager<Profile> _userManager;
    private readonly DashboardDbContext _context;
    public PerformanceModel(UserManager<Profile> userManager, DashboardDbContext context) { _userManager = userManager; _context = context; }
    public List<BcpKpiUserScore> Scores { get; private set; } = [];
    public async Task OnGetAsync()
    {
        var current = await _userManager.GetUserAsync(User);
        if (current is not null) Scores = await _context.BcpKpiUserScores.Include(x => x.BcpKpiIndicator).Where(x => x.ProfileId == current.Id).OrderByDescending(x => x.Date).ToListAsync();
    }
}
