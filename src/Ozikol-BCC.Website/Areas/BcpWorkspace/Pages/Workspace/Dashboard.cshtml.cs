using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;

namespace Ozikol_BCC.Website.Areas.BcpWorkspace.Pages.Workspace;

[Authorize]
public class DashboardModel : PageModel
{
    private readonly UserManager<Profile> _userManager;
    private readonly DashboardDbContext _context;

    public DashboardModel(UserManager<Profile> userManager, DashboardDbContext context)
    {
        _userManager = userManager;
        _context = context;
    }

    public Profile? CurrentProfile { get; private set; }
    public DateTime Today { get; private set; }
    public DateTime VisibleMonth { get; private set; }
    public int FeatureAccessCount { get; private set; }
    public int PendingActionsCount { get; private set; }
    public int VisibleNotesCount { get; private set; }
    public int PerformanceRecordsCount { get; private set; }
    public List<WorkspaceCalendarDay> CalendarDays { get; private set; } = [];
    public List<WorkspaceChecklistItem> TodayChecklist { get; private set; } = [];
    public List<WorkspaceShortcut> Shortcuts { get; private set; } = [];
    public List<WorkspaceFeedItem> RecentActivity { get; private set; } = [];
    public List<WorkspaceFeedItem> Notifications { get; private set; } = [];

    public async Task OnGetAsync(int? year = null, int? month = null)
    {
        Today = DateTime.Today;
        var targetYear = year.GetValueOrDefault(Today.Year);
        var targetMonth = month.GetValueOrDefault(Today.Month);
        VisibleMonth = new DateTime(targetYear, targetMonth, 1);

        var current = await _userManager.GetUserAsync(User);
        if (current is not null)
        {
            CurrentProfile = await _userManager.Users
                .Include(x => x.BcpUserCategory)
                .FirstOrDefaultAsync(x => x.Id == current.Id);

            FeatureAccessCount = await _context.BcpUserFeatureRoles.CountAsync(x => x.ProfileId == current.Id && x.IsActive);
            VisibleNotesCount = await _context.BcpUserNotes.CountAsync(x => x.ProfileId == current.Id && !x.IsPrivate);
            PerformanceRecordsCount = await _context.BcpKpiUserScores.CountAsync(x => x.ProfileId == current.Id);
            RecentActivity = await BuildActivityAsync(current.Id);
        }

        BuildChecklist();
        BuildCalendar();
        BuildShortcuts();
        BuildNotifications();
        PendingActionsCount = TodayChecklist.Count(x => !x.IsDone);
    }

    private async Task<List<WorkspaceFeedItem>> BuildActivityAsync(string userId)
    {
        var logs = await _context.BcpActivityLogs
            .Where(x => x.TargetProfileId == userId || x.PerformedByProfileId == userId)
            .OrderByDescending(x => x.Date)
            .Take(5)
            .ToListAsync();

        if (logs.Count == 0)
        {
            return
            [
                new("Welcome to your workspace", "Your personal BCP activity will appear here.", "waving_hand", "info", "/BcpWorkspace/Workspace/Dashboard")
            ];
        }

        return logs
            .Select(x => new WorkspaceFeedItem(x.ActionType ?? "Activity", x.Description ?? "User activity", "history", "info", "/BcpUserManagement/Workspace/Activity"))
            .ToList();
    }

    private void BuildChecklist()
    {
        // These seed items define the UI contract. Feature modules will later contribute
        // real calendar/checklist entries through a shared schedule service.
        TodayChecklist =
        [
            new("09:00 AM", "Review assigned report", "Reports", "Normal", false),
            new("10:30 AM", "Team meeting", "Calendar", "Normal", false),
            new("12:00 PM", "Submit KPI update", "User Management", "High", false),
            new("02:00 PM", "Approve pending form", "Forms", "Normal", false),
            new("04:00 PM", "Check project task", "Projects", "Low", false)
        ];
    }

    private void BuildCalendar()
    {
        var firstDayOffset = ((int)VisibleMonth.DayOfWeek + 6) % 7;
        var gridStart = VisibleMonth.AddDays(-firstDayOffset);
        var monthEnd = VisibleMonth.AddMonths(1).AddDays(-1);
        var gridCount = firstDayOffset + DateTime.DaysInMonth(VisibleMonth.Year, VisibleMonth.Month);
        var totalCells = (int)Math.Ceiling(gridCount / 7d) * 7;

        CalendarDays = Enumerable.Range(0, totalCells)
            .Select(offset =>
            {
                var date = gridStart.AddDays(offset);
                var markers = new List<string>();

                if (date.Date == Today.Date) markers.Add("task");
                if (date.Day % 5 == 0) markers.Add("event");
                if (date.Day % 7 == 0) markers.Add("reminder");
                if (date.Day == monthEnd.Day) markers.Add("deadline");

                return new WorkspaceCalendarDay(date, date.Month == VisibleMonth.Month, date.Date == Today.Date, markers);
            })
            .ToList();
    }

    private void BuildShortcuts()
    {
        Shortcuts =
        [
            new("My Profile", "Business profile", "person", "/BcpUserManagement/Workspace/Profile", true),
            new("My Security", "Password and MFA", "shield_lock", "/BcpIdentity/Workspace/Dashboard", true),
            new("My Performance", "KPI history", "monitoring", "/BcpUserManagement/Workspace/Performance", true),
            new("My Notes", "Visible notes", "sticky_note_2", "/BcpUserManagement/Workspace/Notes", true),
            new("My Reports", "Coming soon", "summarize", "javascript:void(0)", false),
            new("My Projects", "Coming soon", "task_alt", "javascript:void(0)", false),
            new("My Tickets", "Coming soon", "confirmation_number", "javascript:void(0)", false),
            new("Messages", "Coming soon", "campaign", "javascript:void(0)", false)
        ];
    }

    private void BuildNotifications()
    {
        Notifications =
        [
            new("Calendar widget is ready", "Today checklist now anchors the workspace dashboard.", "calendar_month", "good", "/BcpWorkspace/Workspace/Dashboard"),
            new("Enable two-factor authentication", "Keep your account safer with MFA.", "lock", "warn", "/BcpIdentity/Workspace/TwoFactor"),
            new("Review your feature access", "See the modules currently assigned to you.", "verified_user", "info", "/BcpUserManagement/Workspace/FeatureAccess")
        ];
    }
}

public sealed record WorkspaceCalendarDay(DateTime Date, bool IsCurrentMonth, bool IsToday, List<string> Markers);
public sealed record WorkspaceChecklistItem(string Time, string Title, string Source, string Priority, bool IsDone);
public sealed record WorkspaceShortcut(string Title, string Subtitle, string Icon, string Url, bool IsActive);
public sealed record WorkspaceFeedItem(string Title, string Subtitle, string Icon, string Tone, string Url);
