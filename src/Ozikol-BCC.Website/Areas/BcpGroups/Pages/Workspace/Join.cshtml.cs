using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Website.Areas.BcpGroups.Pages.Workspace
{
    [AllowAnonymous]
    public class JoinModel : PageModel
    {
        private readonly DashboardDbContext _db;

        public JoinModel(DashboardDbContext db)
        {
            _db = db;
        }

        public BcpGroup Group { get; set; } = null!;
        public int MemberCount { get; set; }
        public bool IsAlreadyMember { get; set; }
        public bool IsUserLoggedIn { get; set; }
        public string Message { get; set; } = string.Empty;
        public string GroupAvatarUrl { get; set; } = string.Empty;
        public string GroupCoverUrl { get; set; } = string.Empty;

        public async Task<IActionResult> OnGetAsync(Guid id)
        {
            var group = await _db.BcpGroups
                .Include(g => g.Members)
                .FirstOrDefaultAsync(g => g.Id == id);

            if (group == null || !group.IsActive || group.IsArchived)
            {
                Message = "This group invitation link is invalid, expired, or archived.";
                return Page();
            }

            Group = group;
            MemberCount = group.Members.Count(m => m.MembershipStatus == "Active");

            // Setup image fallbacks
            GroupAvatarUrl = !string.IsNullOrWhiteSpace(group.AvatarUrl) 
                ? group.AvatarUrl 
                : "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=300&q=80";

            GroupCoverUrl = !string.IsNullOrWhiteSpace(group.CoverImageUrl) 
                ? group.CoverImageUrl 
                : "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1200&q=80";

            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            IsUserLoggedIn = !string.IsNullOrWhiteSpace(userId);

            if (IsUserLoggedIn && userId != null)
            {
                var existingMember = group.Members.FirstOrDefault(m => m.UserProfileId == userId && m.MembershipStatus == "Active");
                if (existingMember != null)
                {
                    IsAlreadyMember = true;
                }
            }

            return Page();
        }

        public async Task<IActionResult> OnPostJoinAsync(Guid id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(userId))
            {
                return RedirectToPage("/Authenticate/Login", new { area = "BcpIdentity", returnUrl = $"/BcpGroups/Workspace/Join?id={id}" });
            }

            var group = await _db.BcpGroups.FindAsync(id);
            if (group == null || !group.IsActive || group.IsArchived)
            {
                Message = "This group link is no longer active.";
                return Page();
            }

            var existingMember = await _db.BcpGroupMembers
                .FirstOrDefaultAsync(m => m.BcpGroupId == id && m.UserProfileId == userId);

            if (existingMember == null)
            {
                var newMember = new BcpGroupMember
                {
                    BcpGroupId = id,
                    UserProfileId = userId,
                    GroupRole = BcpGroupRole.Member,
                    MembershipStatus = "Active",
                    DateJoined = DateTime.UtcNow
                };
                _db.BcpGroupMembers.Add(newMember);
                await _db.SaveChangesAsync();
            }
            else
            {
                existingMember.MembershipStatus = "Active";
                await _db.SaveChangesAsync();
            }

            return RedirectToPage("/Workspace/Chat", new { id });
        }
    }
}
