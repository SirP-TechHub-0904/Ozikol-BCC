using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;

namespace Ozikol_BCC.Website.Areas.BcpUserManagement.Pages.Console;

[Authorize]
public class ActivityLogsModel : PageModel
{
    private readonly DashboardDbContext _context;
    public ActivityLogsModel(DashboardDbContext context) => _context = context;
    public List<BcpActivityLog> Logs { get; private set; } = [];
    public async Task OnGetAsync() => Logs = await _context.BcpActivityLogs.OrderByDescending(x => x.Date).Take(100).ToListAsync();
}
