using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Ozikol_BCC.Website.Areas.BcpGroups.Pages.Console
{
    [Authorize]
    public class DetailsModel : PageModel
    {
        private readonly DashboardDbContext _db;

        public DetailsModel(DashboardDbContext db)
        {
            _db = db;
        }

        public BcpGroup Group { get; set; } = null!;
        public int MemberCount { get; set; }
        public int MessageCount { get; set; }
        public int FileCount { get; set; }
        public List<BcpGroupMember> Members { get; set; } = new();
        public List<BcpGroupPost> RecentMessages { get; set; } = new();

        public async Task<IActionResult> OnGetAsync(Guid id)
        {
            var g = await _db.BcpGroups
                .Include(g => g.CreatedByUser)
                .FirstOrDefaultAsync(g => g.Id == id);

            if (g == null) return NotFound();

            Group = g;
            MemberCount = await _db.BcpGroupMembers.CountAsync(m => m.BcpGroupId == id && m.MembershipStatus == "Active");
            MessageCount = await _db.BcpGroupPosts.CountAsync(p => p.BcpGroupId == id && !p.IsDeleted);
            FileCount = await _db.BcpGroupFiles.CountAsync(f => f.BcpGroupId == id);

            Members = await _db.BcpGroupMembers
                .Where(m => m.BcpGroupId == id && m.MembershipStatus == "Active")
                .Include(m => m.UserProfile)
                .OrderBy(m => m.GroupRole)
                .Take(10)
                .ToListAsync();

            RecentMessages = await _db.BcpGroupPosts
                .Where(p => p.BcpGroupId == id && !p.IsDeleted)
                .Include(p => p.UserProfile)
                .OrderByDescending(p => p.CreatedAt)
                .Take(15)
                .ToListAsync();

            return Page();
        }
    }
}
