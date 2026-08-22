using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace Ozikol_BCC.Website.Areas.BcpGroups.Pages.Workspace
{
    [Authorize]
    public class InvitationsModel : PageModel
    {
        private readonly DashboardDbContext _db;

        public InvitationsModel(DashboardDbContext db)
        {
            _db = db;
        }

        public List<BcpGroupInvitation> PendingInvitations { get; set; } = new();

        public async Task OnGetAsync()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return;

            PendingInvitations = await _db.BcpGroupInvitations
                .Where(i => i.InvitedUserId == userId && i.Status == "Pending")
                .Include(i => i.Group)
                .Include(i => i.InvitedByUser)
                .OrderByDescending(i => i.CreatedAt)
                .ToListAsync();
        }
    }
}
