using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Ozikol_BCC.Website.Areas.BcpUserManagement.Pages.Workspace;

[Authorize]
public class ActivityModel : PageModel
{
    private readonly UserManager<Profile> _userManager;
    private readonly DashboardDbContext _context;

    public ActivityModel(UserManager<Profile> userManager, DashboardDbContext context)
    {
        _userManager = userManager;
        _context = context;
    }

    public List<UserActivityItem> Activities { get; private set; } = [];

    public async Task OnGetAsync()
    {
        var current = await _userManager.GetUserAsync(User);
        if (current == null) return;

        var items = new List<UserActivityItem>();

        // 1. Activity Logs (Admin & System actions on or by user)
        var activityLogs = await _context.BcpActivityLogs
            .Where(x => x.TargetProfileId == current.Id || x.PerformedByProfileId == current.Id)
            .OrderByDescending(x => x.Date)
            .Take(100)
            .ToListAsync();

        foreach (var log in activityLogs)
        {
            items.Add(new UserActivityItem
            {
                Title = log.ActionType ?? "Activity",
                Description = log.Description ?? string.Empty,
                PerformedBy = !string.IsNullOrWhiteSpace(log.PerformedByFullName) ? log.PerformedByFullName : (log.PerformedByProfileId == current.Id ? current.FullName : "System"),
                Date = log.Date,
                Icon = GetIconForAction(log.ActionType),
                Category = log.Module ?? "Activity"
            });
        }

        // 2. Security & User Notifications (User self-service actions: Password reset, 2FA, logins, etc.)
        var notifications = await _context.BcpNotifications
            .Where(x => x.UserId == current.Id)
            .OrderByDescending(x => x.CreatedAt)
            .Take(100)
            .ToListAsync();

        foreach (var notif in notifications)
        {
            items.Add(new UserActivityItem
            {
                Title = notif.Title ?? "Security Event",
                Description = notif.Message ?? string.Empty,
                PerformedBy = current.FullName,
                Date = notif.CreatedAt,
                Icon = notif.Icon ?? "notifications",
                Category = notif.Category.ToString()
            });
        }

        // Combine and order by date descending
        Activities = items.OrderByDescending(x => x.Date).Take(100).ToList();
    }

    private static string GetIconForAction(string? actionType)
    {
        if (string.IsNullOrWhiteSpace(actionType)) return "history";
        var lower = actionType.ToLowerInvariant();
        if (lower.Contains("kpi")) return "monitoring";
        if (lower.Contains("role")) return "shield_person";
        if (lower.Contains("feature")) return "verified_user";
        if (lower.Contains("password")) return "lock_reset";
        if (lower.Contains("note")) return "sticky_note_2";
        return "history";
    }

    public class UserActivityItem
    {
        public string Title { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string PerformedBy { get; set; } = string.Empty;
        public DateTime Date { get; set; }
        public string Icon { get; set; } = "history";
        public string Category { get; set; } = "General";
    }
}
