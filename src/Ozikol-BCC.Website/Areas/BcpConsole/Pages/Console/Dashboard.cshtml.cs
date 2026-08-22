using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;
using Ozikol_BCC.Website.Services;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Website.Areas.BcpConsole.Pages.Console;

[Authorize]
public class DashboardModel : PageModel
{
    private readonly DashboardDbContext _context;
    private readonly UserManager<Profile> _userManager;
    private readonly IConfiguration _configuration;

    public DashboardModel(DashboardDbContext context, UserManager<Profile> userManager, IConfiguration configuration)
    {
        _context = context;
        _userManager = userManager;
        _configuration = configuration;
    }

    public int TotalCatalogFeatures { get; private set; }
    public int ActiveFeatures { get; private set; }
    public int InactiveFeatures { get; private set; }
    public int SuspendedFeatures { get; private set; }
    public int LockedFeatures { get; private set; }
    public int NeedsSetupFeatures { get; private set; }
    public int TotalUsers { get; private set; }
    public int MaximumUsers { get; private set; } = 10;
    public int PendingUsers { get; private set; }
    public int OnlineUsers { get; private set; }
    public int ConfirmedEmailUsers { get; private set; }
    public int TwoFactorUsers { get; private set; }
    public int LockedAccounts { get; private set; }
    public int AttentionCount { get; private set; }
    public int HealthScore { get; private set; }
    public decimal CurrentBill { get; private set; }
    public decimal ForecastBill { get; private set; }
    public string CurrencyCode { get; private set; } = "NGN";
    public string CacheProvider { get; private set; } = "Memory";
    public string DatabaseStatus { get; private set; } = "Healthy";
    public string EmailStatus { get; private set; } = "Missing";
    public string SmsStatus { get; private set; } = "Missing";
    public string PaymentStatus { get; private set; } = "Missing";
    public string RedisStatus { get; private set; } = "Local Memory";
    public bool DatabaseReady { get; private set; } = true;
    public List<ConsoleFeatureRow> FeatureRows { get; private set; } = [];
    public List<ConsoleItem> RecentVisits { get; private set; } = [];
    public List<ConsoleItem> AttentionItems { get; private set; } = [];
    public List<ConsoleItem> Recommendations { get; private set; } = [];
    public List<ConsoleItem> Reports { get; private set; } = [];
    public List<ConsoleItem> Announcements { get; private set; } = [];

    public async Task OnGetAsync()
    {
        TotalCatalogFeatures = BcpFeatureCatalog.Features.Count;
        CacheProvider = _configuration["Cache:Provider"] ?? "Memory";
        RedisStatus = CacheProvider.Equals("Redis", StringComparison.OrdinalIgnoreCase) ? "Redis Ready" : "Local Memory";

        try
        {
            var features = await _context.BcpFeatures.AsNoTracking().ToListAsync();
            var management = await _context.ManagementSettings.AsNoTracking().FirstOrDefaultAsync();
            var config = await _context.ConfigSettings.AsNoTracking().FirstOrDefaultAsync();
            var bcp = await _context.BcpSettings.AsNoTracking().FirstOrDefaultAsync();

            TotalUsers = await _userManager.Users.CountAsync();
            PendingUsers = await _userManager.Users.CountAsync(x => x.UserStatus == UserStatus.Pending);
            ConfirmedEmailUsers = await _userManager.Users.CountAsync(x => x.EmailConfirmed);
            TwoFactorUsers = await _userManager.Users.CountAsync(x => x.TwoFactorEnabled);
            LockedAccounts = await _userManager.Users.CountAsync(x => x.LockoutEnd != null && x.LockoutEnd > DateTimeOffset.UtcNow);
            OnlineUsers = await _context.BcpUserRecentVisits.Select(x => x.UserId).Distinct().CountAsync();

            MaximumUsers = management?.MaximumUsers > 0 ? management.MaximumUsers : 10;
            CurrencyCode = config?.CurrencyCode ?? "NGN";
            ActiveFeatures = features.Count(x => x.Status == FeatureBillingStatus.Active);
            InactiveFeatures = features.Count(x => x.Status == FeatureBillingStatus.Disabled);
            SuspendedFeatures = features.Count(x => x.Status == FeatureBillingStatus.Suspended);
            NeedsSetupFeatures = Math.Max(0, TotalCatalogFeatures - features.Select(x => x.ModuleFolder).Distinct(StringComparer.OrdinalIgnoreCase).Count());
            LockedFeatures = Math.Max(0, TotalCatalogFeatures - ActiveFeatures - InactiveFeatures - SuspendedFeatures - NeedsSetupFeatures);

            CurrentBill = features.Where(x => x.Status == FeatureBillingStatus.Active).Sum(x => x.CostPerDuration);
            ForecastBill = CurrentBill;

            EmailStatus = HasEmailProvider(bcp) ? "Configured" : "Missing";
            SmsStatus = management?.ActivateSMS == true ? "Configured" : "Missing";
            PaymentStatus = HasPaymentProvider(bcp) ? "Configured" : "Missing";

            BuildFeatureRows(features);
            BuildLists();
            CalculateAttentionAndHealth();
        }
        catch
        {
            DatabaseReady = false;
            DatabaseStatus = "Error";
            BuildFeatureRows([]);
            BuildLists();
            CalculateAttentionAndHealth();
        }
    }

    private void BuildFeatureRows(List<BcpFeature> features)
    {
        FeatureRows = BcpFeatureCatalog.Features
            .OrderBy(x => x.SortOrder)
            .Select(def =>
            {
                var record = features.FirstOrDefault(x => x.ModuleFolder.Equals(def.ModuleFolder, StringComparison.OrdinalIgnoreCase));
                var status = record?.Status switch
                {
                    FeatureBillingStatus.Active => "active",
                    FeatureBillingStatus.Suspended => "locked",
                    FeatureBillingStatus.Disabled => "inactive",
                    _ => "setup"
                };

                var label = status switch
                {
                    "active" => "Active",
                    "locked" => "Suspended",
                    "inactive" => "Inactive",
                    _ => "Needs setup"
                };

                var pill = status switch
                {
                    "active" => "good",
                    "locked" => "bad",
                    "inactive" => "muted",
                    _ => "warn"
                };

                var route = def.HasConsole ? $"{def.ConsolePath}/Dashboard" : "javascript:void(0)";
                var sub = record is null ? "Feature not seeded for this tenant" : $"{record.BillingDuration} billing, {record.CostPerDuration:0.##} {CurrencyCode}";

                return new ConsoleFeatureRow(def.FeatureName, def.Icon, route, status, label, pill, sub);
            })
            .ToList();
    }

    private void BuildLists()
    {
        RecentVisits =
        [
            new("Console Dashboard", "Platform command center", "space_dashboard", "/BcpConsole/Console/Dashboard", "info"),
            new("Identity Dashboard", "Authentication and security", "admin_panel_settings", "/BcpIdentity/Console/Dashboard", "violet"),
            new("User Management", "People and performance", "groups", "/BcpUserManagement/Console/Dashboard", "good"),
            new("Feature Access", "Permission matrix", "verified_user", "/BcpUserManagement/Console/FeatureAccess", "info")
        ];

        AttentionItems =
        [
            new($"{PendingUsers} users pending approval", "Review onboarding status", "person_check", "/BcpUserManagement/Console/Users?status=Pending", PendingUsers > 0 ? "info" : "good"),
            new($"{NeedsSetupFeatures} features need setup", "Seed or configure feature records", "pending_actions", "/BcpConsole/Console/Dashboard", NeedsSetupFeatures > 0 ? "warn" : "good"),
            new($"Email provider: {EmailStatus}", "Required for account and notification flows", "alternate_email", "/BcpConsole/Console/Dashboard", EmailStatus == "Configured" ? "good" : "bad"),
            new($"Payment provider: {PaymentStatus}", "Required before billing is active", "payments", "/BcpConsole/Console/Dashboard", PaymentStatus == "Configured" ? "good" : "warn")
        ];

        Recommendations =
        [
            new($"Enable MFA for admins", $"{TwoFactorUsers} users currently have 2FA", "lock", "/BcpIdentity/Console/Dashboard", TwoFactorUsers > 0 ? "good" : "warn"),
            new("Configure Redis for production", RedisStatus, "memory", "/BcpConsole/Console/Dashboard", CacheProvider.Equals("Redis", StringComparison.OrdinalIgnoreCase) ? "good" : "info"),
            new("Complete provider setup", $"Email: {EmailStatus}, SMS: {SmsStatus}, Payment: {PaymentStatus}", "task_alt", "/BcpConsole/Console/Dashboard", "info")
        ];

        Reports =
        [
            new("Platform Health Report", "Database, cache, features, providers", "summarize", "/BcpConsole/Console/Dashboard", "info"),
            new("User Management Summary", "Users, categories, roles, KPI setup", "groups", "/BcpUserManagement/Console/Dashboard", "good"),
            new("Identity Security Summary", "MFA, locked accounts, confirmed emails", "security", "/BcpIdentity/Console/Dashboard", "violet")
        ];

        Announcements =
        [
            new("Main Console Dashboard", "Overall BCP command center is now separated from feature dashboards.", "campaign", "/BcpConsole/Console/Dashboard", "info"),
            new("Feature Dashboards", "Identity and User Management keep their own focused dashboards.", "dashboard", "/BcpUserManagement/Console/Dashboard", "good")
        ];
    }

    private void CalculateAttentionAndHealth()
    {
        AttentionCount = PendingUsers + NeedsSetupFeatures + LockedAccounts;
        if (EmailStatus != "Configured") AttentionCount++;
        if (PaymentStatus != "Configured") AttentionCount++;
        if (!DatabaseReady) AttentionCount += 5;

        var issues = 0;
        if (!DatabaseReady) issues += 35;
        if (EmailStatus != "Configured") issues += 10;
        if (PaymentStatus != "Configured") issues += 8;
        if (SmsStatus != "Configured") issues += 5;
        if (NeedsSetupFeatures > 0) issues += Math.Min(20, NeedsSetupFeatures);
        if (LockedAccounts > 0) issues += 5;
        HealthScore = Math.Max(0, 100 - issues);
    }

    private static bool HasEmailProvider(BcpSetting? bcp)
    {
        if (bcp is null) return false;
        var text = string.Join('|', bcp.GetType().GetProperties().Where(p => p.PropertyType == typeof(string)).Select(p => p.GetValue(bcp) as string));
        return text.Contains("zepto", StringComparison.OrdinalIgnoreCase)
            || text.Contains("postmark", StringComparison.OrdinalIgnoreCase)
            || text.Contains("@", StringComparison.OrdinalIgnoreCase);
    }

    private static bool HasPaymentProvider(BcpSetting? bcp)
    {
        if (bcp is null) return false;
        var text = string.Join('|', bcp.GetType().GetProperties().Where(p => p.PropertyType == typeof(string)).Select(p => p.GetValue(bcp) as string));
        return text.Contains("paystack", StringComparison.OrdinalIgnoreCase)
            || text.Contains("pixel", StringComparison.OrdinalIgnoreCase)
            || text.Contains("secret", StringComparison.OrdinalIgnoreCase);
    }
}

public sealed record ConsoleFeatureRow(string Title, string Icon, string Url, string Status, string StatusLabel, string PillClass, string Subtitle);
public sealed record ConsoleItem(string Title, string Subtitle, string Icon, string Url, string Tone);
