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
    public class BookmarksModel : PageModel
    {
        private readonly DashboardDbContext _db;

        public BookmarksModel(DashboardDbContext db)
        {
            _db = db;
        }

        public List<BcpBookmarkedMessage> Bookmarks { get; set; } = new();

        public async Task OnGetAsync()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return;

            Bookmarks = await _db.BcpBookmarkedMessages
                .Where(b => b.UserId == userId)
                .Include(b => b.Message)
                    .ThenInclude(m => m!.UserProfile)
                .Include(b => b.Group)
                .OrderByDescending(b => b.BookmarkedAt)
                .ToListAsync();
        }
    }
}
