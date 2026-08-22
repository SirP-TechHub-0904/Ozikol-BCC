using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Persistence.EF.SQL;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Website.Areas.BcpUserManagement.Pages.Console;

[Authorize]
public class RolesModel : PageModel
{
    private readonly DashboardDbContext _context;
    public RolesModel(DashboardDbContext context) => _context = context;
    public int IdentityRoleCount { get; private set; }
    public int FeatureRoleCount { get; private set; }
    public int EditorCount { get; private set; }
    public async Task OnGetAsync()
    {
        IdentityRoleCount = await _context.Roles.CountAsync();
        FeatureRoleCount = await _context.BcpUserFeatureRoles.CountAsync();
        EditorCount = await _context.BcpUserFeatureRoles.CountAsync(x => x.IsActive && (x.ActionRole == BcpActionRole.GlobalEditor || x.ActionRole == BcpActionRole.FeatureEditor));
    }
}
