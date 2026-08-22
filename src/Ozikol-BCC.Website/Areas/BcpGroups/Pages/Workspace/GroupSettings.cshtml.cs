using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;
using System.Security.Claims;
using System.Threading.Tasks;

namespace Ozikol_BCC.Website.Areas.BcpGroups.Pages.Workspace
{
    [Authorize]
    public class GroupSettingsModel : PageModel
    {
        private readonly DashboardDbContext _db;

        public GroupSettingsModel(DashboardDbContext db)
        {
            _db = db;
        }

        [BindProperty]
        public BcpGroupMember Member { get; set; } = null!;
        public BcpGroup Group { get; set; } = null!;

        public async Task<IActionResult> OnGetAsync(Guid groupId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();

            var m = await _db.BcpGroupMembers
                .Include(x => x.BcpGroup)
                .FirstOrDefaultAsync(x => x.BcpGroupId == groupId && x.UserProfileId == userId && x.MembershipStatus == "Active");

            if (m == null || m.BcpGroup == null) return NotFound();

            Member = m;
            Group = m.BcpGroup;
            return Page();
        }

        public async Task<IActionResult> OnPostAsync(Guid groupId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var dbMember = await _db.BcpGroupMembers
                .FirstOrDefaultAsync(x => x.BcpGroupId == groupId && x.UserProfileId == userId);

            if (dbMember == null) return NotFound();

            dbMember.NotificationTone = Member.NotificationTone;
            dbMember.NotificationVolume = Member.NotificationVolume;
            dbMember.IsNotificationMuted = Member.IsNotificationMuted;
            dbMember.ShowMyReadReceipts = Member.ShowMyReadReceipts;
            dbMember.ShowMyTyping = Member.ShowMyTyping;
            dbMember.ShowMyLastSeen = Member.ShowMyLastSeen;

            await _db.SaveChangesAsync();
            return RedirectToPage("/Workspace/Chat", new { id = groupId });
        }
    }
}
