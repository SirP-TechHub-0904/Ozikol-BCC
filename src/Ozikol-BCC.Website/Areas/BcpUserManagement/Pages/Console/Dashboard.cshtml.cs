using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Website.Areas.BcpUserManagement.Pages.Console;

[Authorize]
public class DashboardModel : PageModel
{
    private readonly DashboardDbContext _context;
    private readonly UserManager<Profile> _userManager;

    public DashboardModel(DashboardDbContext context, UserManager<Profile> userManager)
    {
        _context = context;
        _userManager = userManager;
    }

    public int TotalUsers { get; private set; }
    public int MaximumUsers { get; private set; } = 10;
    public int ActiveUsers { get; private set; }
    public int PendingUsers { get; private set; }
    public int SuspendedUsers { get; private set; }
    public int LeaveUsers { get; private set; }
    public int DeletedUsers { get; private set; }
    public int UsersWithoutCategory { get; private set; }
    public int UsersWithFeatureAccess { get; private set; }
    public int UsersWithoutFeatureAccess { get; private set; }
    public int GlobalEditorCount { get; private set; }
    public int FeatureEditorCount { get; private set; }
    public int ReadonlyCount { get; private set; }
    public int NotesCount { get; private set; }
    public int PerformanceRecordCount { get; private set; }
    public decimal AveragePerformance { get; private set; }
    public string CurrentPeriod { get; private set; } = DateTime.UtcNow.ToString("MMMM yyyy");
    public int CategoryCount { get; private set; }
    public int KpiCount { get; private set; }
    public List<UserManagementChartSlice> StatusBreakdown { get; private set; } = [];
    public List<UserManagementChartSlice> CategoryBreakdown { get; private set; } = [];
    public List<UserManagementChartSlice> FeatureAccessBreakdown { get; private set; } = [];
    public List<UserManagementAttentionItem> AttentionItems { get; private set; } = [];
    public List<UserManagementRecentUser> RecentUsers { get; private set; } = [];
    public List<BcpActivityLog> RecentLogs { get; private set; } = [];

    public async Task OnGetAsync()
    {
        TotalUsers = await _userManager.Users.CountAsync();
        ActiveUsers = await _userManager.Users.CountAsync(x => x.UserStatus == UserStatus.Active);
        PendingUsers = await _userManager.Users.CountAsync(x => x.UserStatus == UserStatus.Pending);
        SuspendedUsers = await _userManager.Users.CountAsync(x => x.UserStatus == UserStatus.Suspended);
        LeaveUsers = await _userManager.Users.CountAsync(x => x.UserStatus == UserStatus.Leave);
        DeletedUsers = await _userManager.Users.CountAsync(x => x.UserStatus == UserStatus.Deleted);
        UsersWithoutCategory = await _userManager.Users.CountAsync(x => x.BcpUserCategoryId == null);
        CategoryCount = await _context.BcpUserCategories.CountAsync();
        KpiCount = await _context.BcpKpiIndicators.CountAsync(x => x.IsActive);
        MaximumUsers = (await _context.ManagementSettings.FirstOrDefaultAsync())?.MaximumUsers ?? 10;
        UsersWithFeatureAccess = await _context.BcpUserFeatureRoles.Where(x => x.IsActive).Select(x => x.ProfileId).Distinct().CountAsync();
        UsersWithoutFeatureAccess = Math.Max(0, TotalUsers - UsersWithFeatureAccess);
        GlobalEditorCount = await _context.BcpUserFeatureRoles.CountAsync(x => x.IsActive && x.ActionRole == BcpActionRole.GlobalEditor);
        FeatureEditorCount = await _context.BcpUserFeatureRoles.CountAsync(x => x.IsActive && x.ActionRole == BcpActionRole.FeatureEditor);
        ReadonlyCount = await _context.BcpUserFeatureRoles.CountAsync(x => x.IsActive && x.ActionRole == BcpActionRole.Readonly);
        NotesCount = await _context.BcpUserNotes.CountAsync();
        PerformanceRecordCount = await _context.BcpKpiUserScores.CountAsync();
        CurrentPeriod = await _context.BcpKpiUserScores.Select(x => x.Period).OrderByDescending(x => x).FirstOrDefaultAsync() ?? DateTime.UtcNow.ToString("MMMM yyyy");
        AveragePerformance = await CalculateAveragePerformanceAsync(CurrentPeriod);
        RecentLogs = await _context.BcpActivityLogs.OrderByDescending(x => x.Date).Take(8).ToListAsync();
        var recentProfiles = await _userManager.Users
            .Include(x => x.BcpUserCategory)
            .OrderByDescending(x => x.Id)
            .Take(6)
            .ToListAsync();

        RecentUsers = recentProfiles
            .Select(x => new UserManagementRecentUser(
                x.Id,
                string.IsNullOrWhiteSpace(x.FullName) ? x.Email ?? "Unknown" : x.FullName,
                x.Email ?? string.Empty,
                x.UserStatus.ToString(),
                x.BcpUserCategory?.Name ?? "Uncategorized"))
            .ToList();

        var categoryProfiles = await _userManager.Users
            .Include(x => x.BcpUserCategory)
            .Select(x => new { CategoryName = x.BcpUserCategory != null ? x.BcpUserCategory.Name : null })
            .ToListAsync();

        CategoryBreakdown = categoryProfiles
            .GroupBy(x => string.IsNullOrWhiteSpace(x.CategoryName) ? "Uncategorized" : x.CategoryName)
            .Select(x => new UserManagementChartSlice(x.Key, x.Count(), "#2563eb"))
            .OrderByDescending(x => x.Value)
            .Take(8)
            .ToList();
        BuildCharts();
        BuildAttentionItems();
    }

    private async Task<decimal> CalculateAveragePerformanceAsync(string period)
    {
        var scores = await _context.BcpKpiUserScores
            .Include(x => x.BcpKpiIndicator)
            .Where(x => x.Period == period)
            .ToListAsync();

        if (scores.Count == 0) return 0;
        var scoredUsers = scores.GroupBy(x => x.ProfileId).ToList();
        var maxPossible = await _context.BcpKpiIndicators.Where(x => x.IsActive).SumAsync(x => x.MaxScore);
        if (maxPossible <= 0 || scoredUsers.Count == 0) return 0;

        var average = scoredUsers.Average(group => group.Sum(x => x.Score) / maxPossible * 100);
        return Math.Round(average, 1);
    }

    private void BuildCharts()
    {
        StatusBreakdown =
        [
            new("Active", ActiveUsers, "#16a34a"),
            new("Pending", PendingUsers, "#f59e0b"),
            new("Suspended", SuspendedUsers, "#dc2626"),
            new("Leave", LeaveUsers, "#2563eb"),
            new("Deleted", DeletedUsers, "#64748b")
        ];

        FeatureAccessBreakdown =
        [
            new("Global Editor", GlobalEditorCount, "#7c3aed"),
            new("Feature Editor", FeatureEditorCount, "#2563eb"),
            new("Read Only", ReadonlyCount, "#0f766e"),
            new("No Access", UsersWithoutFeatureAccess, "#f59e0b")
        ];
    }

    private void BuildAttentionItems()
    {
        AttentionItems =
        [
            new($"{PendingUsers} pending users", "Review onboarding and approval status.", "person_check", PendingUsers > 0 ? "warn" : "good", "/BcpUserManagement/Console/Users?status=Pending"),
            new($"{UsersWithoutCategory} users without category", "Assign categories for reporting and filtering.", "category", UsersWithoutCategory > 0 ? "warn" : "good", "/BcpUserManagement/Console/Users"),
            new($"{UsersWithoutFeatureAccess} users without feature access", "Assign module access where needed.", "verified_user", UsersWithoutFeatureAccess > 0 ? "info" : "good", "/BcpUserManagement/Console/FeatureAccess"),
            new($"{KpiCount} KPI indicators", "Add KPI indicators before scoring performance.", "monitoring", KpiCount > 0 ? "good" : "warn", "/BcpUserManagement/Console/KpiIndicators")
        ];
    }
}

public sealed record UserManagementChartSlice(string Label, int Value, string Color);
public sealed record UserManagementAttentionItem(string Title, string Subtitle, string Icon, string Tone, string Url);
public sealed record UserManagementRecentUser(string Id, string Name, string Email, string Status, string Category);
