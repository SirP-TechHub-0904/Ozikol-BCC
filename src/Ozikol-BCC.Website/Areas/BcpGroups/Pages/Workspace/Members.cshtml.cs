using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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
    public class MembersModel : PageModel
    {
        private readonly DashboardDbContext _db;

        public MembersModel(DashboardDbContext db)
        {
            _db = db;
        }

        public BcpGroup Group { get; set; } = null!;
        public List<BcpGroupMember> Members { get; set; } = new();
        public string CurrentUserId { get; set; } = string.Empty;

        public async Task<IActionResult> OnGetAsync(Guid id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();
            CurrentUserId = userId;

            var group = await _db.BcpGroups.FindAsync(id);
            if (group == null) return NotFound();
            Group = group;

            Members = await _db.BcpGroupMembers
                .Where(m => m.BcpGroupId == id && m.MembershipStatus == "Active")
                .Include(m => m.UserProfile)
                .OrderBy(m => m.GroupRole)
                .ThenBy(m => m.UserProfile!.FirstName)
                .ToListAsync();

            return Page();
        }
    }
}
