using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Website.Areas.BcpGroups.Pages.Console
{
    [Authorize]
    public class DashboardModel : PageModel
    {
        private readonly DashboardDbContext _db;

        public DashboardModel(DashboardDbContext db)
        {
            _db = db;
        }

        // Row 1: KPI Counters
        public int TotalGroups { get; set; }
        public int ActiveGroups { get; set; }
        public int TotalMembers { get; set; }
        public int MessagesToday { get; set; }
        public int FilesShared { get; set; }
        public int ActiveGuests { get; set; }

        // Row 2: Operational & Moderation
        public int AlwaysOpenCount { get; set; }
        public int ScheduledHoursCount { get; set; }
        public int CurrentlyClosedCount { get; set; }
        public int LockedGroupsCount { get; set; }
        public int MutedMembersCount { get; set; }
        public int SuspendedMembersCount { get; set; }

        // Charts Data (JSON serialized for Chart.js)
        public string TrendDatesJson { get; set; } = "[]";
        public string TrendMessagesJson { get; set; } = "[]";
        public string TrendFilesJson { get; set; } = "[]";
        public string GroupTypeLabelsJson { get; set; } = "[]";
        public string GroupTypeDataJson { get; set; } = "[]";
        public string HourlyHeatmapDataJson { get; set; } = "[]";

        // Lists
        public List<GroupLeaderboardDto> TopGroups { get; set; } = new();
        public List<BcpChatAuditLog> RecentAuditLogs { get; set; } = new();

        public async Task OnGetAsync()
        {
            TotalGroups = await _db.BcpGroups.CountAsync();
            ActiveGroups = await _db.BcpGroups.CountAsync(g => g.IsActive && !g.IsArchived);
            TotalMembers = await _db.BcpGroupMembers.CountAsync(m => m.MembershipStatus == "Active");

            var today = DateTime.UtcNow.Date;
            MessagesToday = await _db.BcpGroupPosts.CountAsync(p => p.CreatedAt >= today && !p.IsDeleted);
            FilesShared = await _db.BcpGroupFiles.CountAsync();
            ActiveGuests = await _db.Users.CountAsync(u => u.UserType == BcpUserType.Guest);

            AlwaysOpenCount = await _db.BcpGroups.CountAsync(g => g.IsAlwaysOpen);
            ScheduledHoursCount = await _db.BcpGroups.CountAsync(g => !g.IsAlwaysOpen);
            
            // Check currently closed scheduled groups
            var nowTime = DateTime.UtcNow.TimeOfDay;
            var closedGroups = await _db.BcpGroups
                .Where(g => !g.IsAlwaysOpen && g.OpenTime.HasValue && g.CloseTime.HasValue)
                .ToListAsync();
            CurrentlyClosedCount = closedGroups.Count(g => g.OpenTime.HasValue && g.CloseTime.HasValue && (nowTime < g.OpenTime.Value || nowTime > g.CloseTime.Value));

            LockedGroupsCount = await _db.BcpGroups.CountAsync(g => g.ChatMode == BcpGroupChatMode.AdminOnly || g.ChatMode == BcpGroupChatMode.Announcement);
            MutedMembersCount = await _db.BcpGroupMembers.CountAsync(m => m.IsMuted);
            SuspendedMembersCount = await _db.BcpGroupMembers.CountAsync(m => m.IsSuspended);

            // 1. Chart Data: 30-Day Message & File Trend
            var startDate = DateTime.UtcNow.Date.AddDays(-29);
            var posts = await _db.BcpGroupPosts
                .Where(p => p.CreatedAt >= startDate && !p.IsDeleted)
                .Select(p => new { p.CreatedAt, p.MessageType })
                .ToListAsync();

            var datesList = new List<string>();
            var msgsList = new List<int>();
            var filesList = new List<int>();

            for (int i = 0; i < 30; i++)
            {
                var dt = startDate.AddDays(i);
                datesList.Add(dt.ToString("MMM dd"));
                msgsList.Add(posts.Count(p => p.CreatedAt.Date == dt));
                filesList.Add(posts.Count(p => p.CreatedAt.Date == dt && p.MessageType == BcpChatMessageType.File));
            }

            TrendDatesJson = System.Text.Json.JsonSerializer.Serialize(datesList);
            TrendMessagesJson = System.Text.Json.JsonSerializer.Serialize(msgsList);
            TrendFilesJson = System.Text.Json.JsonSerializer.Serialize(filesList);

            // 2. Chart Data: Group Type Distribution (Donut)
            var typeCounts = await _db.BcpGroups
                .GroupBy(g => g.GroupType)
                .Select(g => new { Type = g.Key.ToString(), Count = g.Count() })
                .ToListAsync();

            GroupTypeLabelsJson = System.Text.Json.JsonSerializer.Serialize(typeCounts.Select(c => c.Type));
            GroupTypeDataJson = System.Text.Json.JsonSerializer.Serialize(typeCounts.Select(c => c.Count));

            // 3. Chart Data: Hourly Activity Heatmap (24 hours)
            var todayPosts = posts.Where(p => p.CreatedAt.Date == today).ToList();
            var hourlyData = new int[24];
            foreach (var p in todayPosts)
            {
                hourlyData[p.CreatedAt.Hour]++;
            }
            HourlyHeatmapDataJson = System.Text.Json.JsonSerializer.Serialize(hourlyData);

            // 4. Leaderboard: Top 5 Active Groups
            TopGroups = await _db.BcpGroups
                .Select(g => new GroupLeaderboardDto
                {
                    Id = g.Id,
                    Title = g.Title,
                    AvatarUrl = g.AvatarUrl,
                    GroupType = g.GroupType.ToString(),
                    CloudinaryFolder = g.CloudinaryFolder,
                    MemberCount = g.Members.Count(m => m.MembershipStatus == "Active"),
                    MessageCount = g.Posts.Count(p => !p.IsDeleted)
                })
                .OrderByDescending(g => g.MessageCount)
                .Take(5)
                .ToListAsync();

            // 5. Recent Audit Logs
            RecentAuditLogs = await _db.BcpChatAuditLogs
                .Include(a => a.User)
                .OrderByDescending(a => a.Timestamp)
                .Take(5)
                .ToListAsync();
        }

        public class GroupLeaderboardDto
        {
            public Guid Id { get; set; }
            public string Title { get; set; } = string.Empty;
            public string? AvatarUrl { get; set; }
            public string GroupType { get; set; } = string.Empty;
            public string? CloudinaryFolder { get; set; }
            public int MemberCount { get; set; }
            public int MessageCount { get; set; }
        }
    }
}
