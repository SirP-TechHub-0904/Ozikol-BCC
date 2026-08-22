using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;

namespace Ozikol_BCC.Website.Areas.BcpIdentity.Pages.Console;

public class DashboardModel : PageModel
{
    private readonly DashboardDbContext _context;
    private readonly UserManager<Profile> _userManager;
    private readonly IdentityOptions _identityOptions;

    public DashboardModel(DashboardDbContext context, UserManager<Profile> userManager, IOptions<IdentityOptions> identityOptions)
    {
        _context = context;
        _userManager = userManager;
        _identityOptions = identityOptions.Value;
    }

    public int TotalUsers { get; private set; }
    public int ConfirmedEmailUsers { get; private set; }
    public int UnconfirmedEmailUsers { get; private set; }
    public int TwoFactorUsers { get; private set; }
    public int TwoFactorDisabledUsers { get; private set; }
    public int LockedAccounts { get; private set; }
    public int LockoutEnabledUsers { get; private set; }
    public int UsersWithFailedAttempts { get; private set; }
    public int TotalFailedAttempts { get; private set; }
    public int RoleCount { get; private set; }
    public int AdminUsers { get; private set; }
    public int AdminsWithoutTwoFactor { get; private set; }
    public int UsersWithoutRole { get; private set; }
    public decimal TwoFactorCoveragePercent { get; private set; }
    public string PasswordPolicySummary { get; private set; } = string.Empty;
    public string LockoutPolicySummary { get; private set; } = string.Empty;
    public bool DatabaseReady { get; private set; } = true;
    public List<IdentitySecurityItem> SecurityItems { get; private set; } = [];
    public List<IdentitySecurityItem> QuickActions { get; private set; } = [];

    public async Task OnGetAsync()
    {
        try
        {
            var users = _userManager.Users;
            TotalUsers = await users.CountAsync();
            ConfirmedEmailUsers = await users.CountAsync(x => x.EmailConfirmed);
            UnconfirmedEmailUsers = Math.Max(0, TotalUsers - ConfirmedEmailUsers);
            TwoFactorUsers = await users.CountAsync(x => x.TwoFactorEnabled);
            TwoFactorDisabledUsers = Math.Max(0, TotalUsers - TwoFactorUsers);
            LockedAccounts = await users.CountAsync(x => x.LockoutEnd != null && x.LockoutEnd > DateTimeOffset.UtcNow);
            LockoutEnabledUsers = await users.CountAsync(x => x.LockoutEnabled);
            UsersWithFailedAttempts = await users.CountAsync(x => x.AccessFailedCount > 0);
            TotalFailedAttempts = await users.SumAsync(x => x.AccessFailedCount);
            RoleCount = await _context.Roles.CountAsync();
            UsersWithoutRole = await GetUsersWithoutRoleCountAsync();
            AdminUsers = await GetAdminUsersAsync();
            AdminsWithoutTwoFactor = await GetAdminsWithoutTwoFactorAsync();
            TwoFactorCoveragePercent = TotalUsers == 0 ? 0 : Math.Round((decimal)TwoFactorUsers / TotalUsers * 100, 1);

            PasswordPolicySummary = $"{_identityOptions.Password.RequiredLength}+ chars, digit: {YesNo(_identityOptions.Password.RequireDigit)}, uppercase: {YesNo(_identityOptions.Password.RequireUppercase)}";
            LockoutPolicySummary = $"{_identityOptions.Lockout.MaxFailedAccessAttempts} failed attempts, {_identityOptions.Lockout.DefaultLockoutTimeSpan.TotalMinutes:0} minutes";
            BuildLists();
        }
        catch
        {
            DatabaseReady = false;
            BuildLists();
        }
    }

    private async Task<int> GetUsersWithoutRoleCountAsync()
    {
        var usersWithRole = await _context.UserRoles.Select(x => x.UserId).Distinct().CountAsync();
        return Math.Max(0, TotalUsers - usersWithRole);
    }

    private async Task<int> GetAdminUsersAsync()
    {
        var roleNames = new[] { "PlatformOwner", "SuperAdmin", "Administrator" };
        var roleIds = await _context.Roles.Where(x => roleNames.Contains(x.Name!)).Select(x => x.Id).ToListAsync();
        return await _context.UserRoles.Where(x => roleIds.Contains(x.RoleId)).Select(x => x.UserId).Distinct().CountAsync();
    }

    private async Task<int> GetAdminsWithoutTwoFactorAsync()
    {
        var roleNames = new[] { "PlatformOwner", "SuperAdmin", "Administrator" };
        var roleIds = await _context.Roles.Where(x => roleNames.Contains(x.Name!)).Select(x => x.Id).ToListAsync();
        var adminIds = await _context.UserRoles.Where(x => roleIds.Contains(x.RoleId)).Select(x => x.UserId).Distinct().ToListAsync();
        return await _userManager.Users.CountAsync(x => adminIds.Contains(x.Id) && !x.TwoFactorEnabled);
    }

    private void BuildLists()
    {
        SecurityItems =
        [
            new("MFA coverage", $"{TwoFactorUsers} enabled, {TwoFactorDisabledUsers} disabled", "passkey", TwoFactorCoveragePercent >= 80 ? "good" : "warn", "/BcpIdentity/Console/MfaPolicy"),
            new("Locked accounts", $"{LockedAccounts} accounts currently locked", "lock", LockedAccounts == 0 ? "good" : "bad", "/BcpIdentity/Console/LockedAccounts"),
            new("Email confirmation", $"{ConfirmedEmailUsers} confirmed, {UnconfirmedEmailUsers} pending", "mark_email_read", UnconfirmedEmailUsers == 0 ? "good" : "info", "/BcpIdentity/Console/Users"),
            new("Failed attempts", $"{TotalFailedAttempts} total failed attempts across {UsersWithFailedAttempts} users", "report", TotalFailedAttempts == 0 ? "good" : "warn", "/BcpIdentity/Console/LoginAudit"),
            new("Admin MFA gap", $"{AdminsWithoutTwoFactor} admin accounts without MFA", "admin_panel_settings", AdminsWithoutTwoFactor == 0 ? "good" : "bad", "/BcpIdentity/Console/MfaPolicy")
        ];

        QuickActions =
        [
            new("Users", "Open identity accounts", "groups", "info", "/BcpIdentity/Console/Users"),
            new("Roles", "Manage broad Identity roles", "admin_panel_settings", "violet", "/BcpIdentity/Console/Roles"),
            new("Permissions", "Review policy/permission surface", "verified_user", "info", "/BcpIdentity/Console/Permissions"),
            new("Invitations", "Invite and verify accounts", "forward_to_inbox", "good", "/BcpIdentity/Console/Invitations"),
            new("Login Audit", "Review authentication history", "manage_search", "warn", "/BcpIdentity/Console/LoginAudit"),
            new("MFA Policy", "Set two-factor posture", "passkey", "good", "/BcpIdentity/Console/MfaPolicy"),
            new("Password Policy", "Review password rules", "password", "info", "/BcpIdentity/Console/PasswordPolicy"),
            new("Sessions", "Review account sessions", "devices", "violet", "/BcpIdentity/Console/Sessions")
        ];
    }

    private static string YesNo(bool value) => value ? "yes" : "no";
}

public sealed record IdentitySecurityItem(string Title, string Subtitle, string Icon, string Tone, string Url);
