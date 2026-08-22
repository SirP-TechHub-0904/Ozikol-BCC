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
using System.Threading.Tasks;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Website.Areas.BcpIdentity.Pages.Workspace;

[Authorize]
public class SecurityLogModel : PageModel
{
    private readonly DashboardDbContext _context;
    private readonly UserManager<Profile> _userManager;

    public SecurityLogModel(DashboardDbContext context, UserManager<Profile> userManager)
    {
        _context = context;
        _userManager = userManager;
    }

    public List<SecurityLogItem> SecurityLogs { get; set; } = [];

    public async Task<IActionResult> OnGetAsync()
    {
        var user = await _userManager.GetUserAsync(User);
        if (user == null)
        {
            return NotFound("Unable to load user.");
        }

        var items = new List<SecurityLogItem>();

        // 1. Fetch Security Notifications for User (Password Reset, 2FA, Logins, Password Changes)
        var notifications = await _context.BcpNotifications
            .Where(n => n.UserId == user.Id && n.Category == BcpMessageCategory.Security)
            .OrderByDescending(n => n.CreatedAt)
            .Take(50)
            .ToListAsync();

        foreach (var notif in notifications)
        {
            items.Add(new SecurityLogItem
            {
                Date = notif.CreatedAt,
                ActionType = notif.Title ?? "Security Event",
                Description = notif.Message ?? string.Empty,
                PerformedBy = user.FullName,
                Icon = notif.Icon ?? "shield"
            });
        }

        // 2. Fetch Security-related Audit Logs (excluding KPI scores & general user management)
        var activityLogs = await _context.BcpActivityLogs
            .Where(x => (x.TargetProfileId == user.Id || x.PerformedByProfileId == user.Id) 
                     && (x.Module == "Security" 
                         || x.ActionType!.Contains("Password") 
                         || x.ActionType.Contains("2FA") 
                         || x.ActionType.Contains("Login") 
                         || x.ActionType.Contains("Session")
                         || x.ActionType.Contains("Security")))
            .OrderByDescending(x => x.Date)
            .Take(50)
            .ToListAsync();

        foreach (var log in activityLogs)
        {
            items.Add(new SecurityLogItem
            {
                Date = log.Date,
                ActionType = log.ActionType ?? "Security Update",
                Description = log.Description ?? string.Empty,
                PerformedBy = !string.IsNullOrWhiteSpace(log.PerformedByFullName) ? log.PerformedByFullName : "System",
                Icon = "security"
            });
        }

        // Order chronologically descending
        SecurityLogs = items.OrderByDescending(x => x.Date).Take(50).ToList();

        return Page();
    }

    public class SecurityLogItem
    {
        public DateTime Date { get; set; }
        public string ActionType { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
        public string PerformedBy { get; set; } = string.Empty;
        public string Icon { get; set; } = "shield";
    }
}