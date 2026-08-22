using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace Ozikol_BCC.Website.Areas.BcpGroups.Pages.Workspace
{
    [Authorize]
    public class DashboardModel : PageModel
    {
        private readonly DashboardDbContext _db;

        public DashboardModel(DashboardDbContext db)
        {
            _db = db;
        }

        // Metrics
        public int JoinedGroupsCount { get; set; }
        public int TotalUnreadCount { get; set; }
        public int SavedBookmarksCount { get; set; }
        public int ActiveDmsCount { get; set; }
        public int PendingInvitationsCount { get; set; }

        [Microsoft.AspNetCore.Mvc.TempData]
        public string? StatusMessage { get; set; }

        // Weekly Activity Chart Data
        public string WeeklyDaysJson { get; set; } = "[]";
        public string WeeklyMessagesJson { get; set; } = "[]";

        // Lists
        public List<MyGroupCardDto> MyGroups { get; set; } = new();
        public List<BcpBookmarkedMessage> RecentBookmarks { get; set; } = new();

        public async Task OnGetAsync()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (userId == null) return;

            PendingInvitationsCount = await _db.BcpGroupInvitations
                .CountAsync(i => i.InvitedUserId == userId && i.Status == "Pending");

            SavedBookmarksCount = await _db.BcpBookmarkedMessages
                .CountAsync(b => b.UserId == userId);

            ActiveDmsCount = await _db.BcpDirectMessages
                .Where(dm => (dm.SenderUserId == userId || dm.ReceiverUserId == userId) && !dm.IsDeleted)
                .Select(dm => dm.SenderUserId == userId ? dm.ReceiverUserId : dm.SenderUserId)
                .Distinct()
                .CountAsync();

            MyGroups = await _db.BcpGroupMembers
                .Where(m => m.UserProfileId == userId && m.MembershipStatus == "Active" && !m.IsSuspended)
                .Include(m => m.BcpGroup)
                .Select(m => new MyGroupCardDto
                {
                    GroupId = m.BcpGroupId,
                    Title = m.BcpGroup!.Title,
                    Description = m.BcpGroup.Description,
                    GroupType = m.BcpGroup.GroupType.ToString(),
                    AvatarUrl = m.BcpGroup.AvatarUrl,
                    CoverImageUrl = m.BcpGroup.CoverImageUrl,
                    MyRole = m.GroupRole.ToString(),
                    IsAlwaysOpen = m.BcpGroup.IsAlwaysOpen,
                    OpenTime = m.BcpGroup.OpenTime,
                    CloseTime = m.BcpGroup.CloseTime,
                    ClosedMessage = m.BcpGroup.ClosedMessage,
                    MemberCount = _db.BcpGroupMembers.Count(x => x.BcpGroupId == m.BcpGroupId && x.MembershipStatus == "Active"),
                    UnreadCount = m.LastReadMessageId.HasValue
                        ? _db.BcpGroupPosts.Count(p => p.BcpGroupId == m.BcpGroupId && p.CreatedAt > (_db.BcpGroupPosts.Where(x => (Guid?)x.Id == m.LastReadMessageId).Select(x => (DateTime?)x.CreatedAt).FirstOrDefault() ?? DateTime.MinValue) && !p.IsDeleted)
                        : _db.BcpGroupPosts.Count(p => p.BcpGroupId == m.BcpGroupId && !p.IsDeleted),
                    LastMessageContent = _db.BcpGroupPosts
                        .Where(p => p.BcpGroupId == m.BcpGroupId && !p.IsDeleted)
                        .OrderByDescending(p => p.CreatedAt)
                        .Select(p => p.Content)
                        .FirstOrDefault(),
                    LastMessageTime = _db.BcpGroupPosts
                        .Where(p => p.BcpGroupId == m.BcpGroupId && !p.IsDeleted)
                        .OrderByDescending(p => p.CreatedAt)
                        .Select(p => (DateTime?)p.CreatedAt)
                        .FirstOrDefault()
                })
                .ToListAsync();

            JoinedGroupsCount = MyGroups.Count;
            TotalUnreadCount = MyGroups.Sum(g => g.UnreadCount);

            // Weekly personal message participation graph (Mon-Sun)
            var startOfWeek = DateTime.UtcNow.Date.AddDays(-(int)DateTime.UtcNow.DayOfWeek + (int)DayOfWeek.Monday);
            var myPosts = await _db.BcpGroupPosts
                .Where(p => p.UserProfileId == userId && p.CreatedAt >= startOfWeek && !p.IsDeleted)
                .Select(p => p.CreatedAt)
                .ToListAsync();

            var daysList = new List<string> { "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun" };
            var msgsList = new List<int>();
            for (int i = 0; i < 7; i++)
            {
                var dayDate = startOfWeek.AddDays(i);
                msgsList.Add(myPosts.Count(p => p.Date == dayDate));
            }

            WeeklyDaysJson = System.Text.Json.JsonSerializer.Serialize(daysList);
            WeeklyMessagesJson = System.Text.Json.JsonSerializer.Serialize(msgsList);

            // Recent bookmarks
            RecentBookmarks = await _db.BcpBookmarkedMessages
                .Where(b => b.UserId == userId)
                .Include(b => b.Message)
                    .ThenInclude(m => m!.UserProfile)
                .Include(b => b.Group)
                .OrderByDescending(b => b.BookmarkedAt)
                .Take(5)
                .ToListAsync();
        }

        public class MyGroupCardDto
        {
            public Guid GroupId { get; set; }
            public string Title { get; set; } = string.Empty;
            public string? Description { get; set; }
            public string GroupType { get; set; } = string.Empty;
            public string? AvatarUrl { get; set; }
            public string? CoverImageUrl { get; set; }
            public string MyRole { get; set; } = string.Empty;
            public bool IsAlwaysOpen { get; set; }
            public TimeSpan? OpenTime { get; set; }
            public TimeSpan? CloseTime { get; set; }
            public string? ClosedMessage { get; set; }
            public int MemberCount { get; set; }
            public int UnreadCount { get; set; }
            public string? LastMessageContent { get; set; }
            public DateTime? LastMessageTime { get; set; }

            public bool IsCurrentlyOpen
            {
                get
                {
                    if (IsAlwaysOpen) return true;
                    if (!OpenTime.HasValue || !CloseTime.HasValue) return true;
                    var now = DateTime.UtcNow.TimeOfDay;
                    return now >= OpenTime.Value && now <= CloseTime.Value;
                }
            }
        }
    }
}
