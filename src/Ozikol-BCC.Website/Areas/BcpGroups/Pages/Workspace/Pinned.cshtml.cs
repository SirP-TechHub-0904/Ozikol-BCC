using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Ozikol_BCC.Website.Areas.BcpGroups.Pages.Workspace
{
    [Authorize]
    public class PinnedModel : PageModel
    {
        private readonly DashboardDbContext _db;

        public PinnedModel(DashboardDbContext db)
        {
            _db = db;
        }

        public BcpGroup Group { get; set; } = null!;
        public List<BcpGroupPost> PinnedMessages { get; set; } = new();

        public async Task<IActionResult> OnGetAsync(Guid id)
        {
            var group = await _db.BcpGroups.FindAsync(id);
            if (group == null) return NotFound();
            Group = group;

            PinnedMessages = await _db.BcpGroupPosts
                .Where(p => p.BcpGroupId == id && p.IsPinned && !p.IsDeleted)
                .Include(p => p.UserProfile)
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();

            return Page();
        }
    }
}
