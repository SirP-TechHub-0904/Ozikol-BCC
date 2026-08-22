using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Text.Json;
using System.Threading.Tasks;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Website.Areas.BcpGroups.Pages.Workspace
{
    [Authorize]
    public class ChatModel : PageModel
    {
        private readonly DashboardDbContext _db;

        public ChatModel(DashboardDbContext db)
        {
            _db = db;
        }

        public BcpGroup Group { get; set; } = null!;
        public BcpGroupMember MyMemberInfo { get; set; } = null!;
        public List<BcpGroupMember> Members { get; set; } = new();
        public List<BcpGroupPost> InitialMessages { get; set; } = new();
        public string CurrentUserId { get; set; } = string.Empty;
        public bool IsReadOnlyObserver { get; set; }

        public string GroupMembersJson { get; set; } = "[]";
        public string GroupModeText { get; set; } = string.Empty;

        public async Task<IActionResult> OnGetAsync(Guid id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return Unauthorized();
            CurrentUserId = userId;

            var isPlatformSuperAdmin = User.IsInRole("PlatformOwner") || User.IsInRole("SuperAdmin") || User.IsInRole("Administrator");

            var member = await _db.BcpGroupMembers
                .Include(m => m.BcpGroup)
                .FirstOrDefaultAsync(m => m.BcpGroupId == id && m.UserProfileId == userId && m.MembershipStatus == "Active" && !m.IsSuspended);

            var group = await _db.BcpGroups.FirstOrDefaultAsync(g => g.Id == id);
            if (group == null) return NotFound("Group not found.");

            Group = group;
            GroupModeText = $"{Group.GroupType} | Mode: {Group.ChatMode}";

            if (member == null)
            {
                if (isPlatformSuperAdmin)
                {
                    // SuperAdmin viewing group they are not explicitly enrolled in
                    MyMemberInfo = new BcpGroupMember
                    {
                        BcpGroupId = id,
                        UserProfileId = userId,
                        GroupRole = BcpGroupRole.Observer,
                        MembershipStatus = "Active"
                    };
                    IsReadOnlyObserver = true;
                }
                else
                {
                    return Forbid();
                }
            }
            else
            {
                MyMemberInfo = member;
                IsReadOnlyObserver = isPlatformSuperAdmin || member.GroupRole == BcpGroupRole.Observer;
            }

            Members = await _db.BcpGroupMembers
                .Where(m => m.BcpGroupId == id && m.MembershipStatus == "Active")
                .Include(m => m.UserProfile)
                .OrderBy(m => m.GroupRole)
                .ThenBy(m => m.UserProfile!.FirstName)
                .ToListAsync();

            var memberDtos = Members.Select(m => new
            {
                id = m.UserProfileId,
                name = m.UserProfile?.FullName ?? "User",
                firstName = m.UserProfile?.FirstName ?? "U"
            }).ToList();

            GroupMembersJson = JsonSerializer.Serialize(memberDtos);

            InitialMessages = await _db.BcpGroupPosts
                .Where(p => p.BcpGroupId == id && !p.IsDeleted)
                .Include(p => p.UserProfile)
                .Include(p => p.File)
                .Include(p => p.ReplyToMessage)
                    .ThenInclude(r => r!.UserProfile)
                .OrderByDescending(p => p.CreatedAt)
                .Take(50)
                .ToListAsync();

            InitialMessages = InitialMessages.OrderBy(p => p.CreatedAt).ToList();

            return Page();
        }
    }
}
