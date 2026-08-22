using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;

namespace Ozikol_BCC.Website.Areas.BcpIdentity.Pages.Console;

[Authorize]
public class LoginAuditModel : PageModel
{
    private readonly DashboardDbContext _context;

    public LoginAuditModel(DashboardDbContext context)
    {
        _context = context;
    }

    public List<BcpActivityLog> AuditLogs { get; set; } = [];

    public async Task OnGetAsync()
    {
        AuditLogs = await _context.Set<BcpActivityLog>()
            .Where(x => x.Module == "Identity.Login" || x.Module == "Identity" || x.Module == null)
            .OrderByDescending(x => x.Date)
            .Take(100)
            .ToListAsync();
    }
}