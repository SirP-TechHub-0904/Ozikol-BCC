using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;
using Ozikol_BCC.Website.Services;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Website.Areas.BcpIdentity.Pages.Console;

/// <summary>
/// Console surface for assigning BCP feature-level permissions to identity users.
/// These assignments are the data source that should later drive sidebar visibility
/// and feature action authorization across Console and Workspace pages.
/// </summary>
[Authorize]
public class PermissionsModel : PageModel
{
    private readonly DashboardDbContext _context;
    private readonly UserManager<Profile> _userManager;

    public PermissionsModel(DashboardDbContext context, UserManager<Profile> userManager)
    {
        _context = context;
        _userManager = userManager;
    }

    [BindProperty]
    public AssignPermissionInput Input { get; set; } = new();

    [TempData]
    public string? StatusMessage { get; set; }

    public IReadOnlyList<UserOption> Users { get; private set; } = [];
    public IReadOnlyList<FeatureOption> Features { get; private set; } = [];
    public IReadOnlyList<ActionRoleOption> ActionRoles { get; private set; } = [];
    public IReadOnlyList<PermissionRow> Permissions { get; private set; } = [];

    public int TotalUsers { get; private set; }
    public int UsersWithFeatureAccess { get; private set; }
    public int ActiveAssignments { get; private set; }
    public int InactiveAssignments { get; private set; }

    public async Task OnGetAsync()
    {
        await LoadPageAsync();
    }

    public async Task<IActionResult> OnPostAssignAsync()
    {
        if (!ModelState.IsValid)
        {
            await LoadPageAsync();
            return Page();
        }

        var user = await _userManager.FindByIdAsync(Input.ProfileId);
        if (user == null)
        {
            ModelState.AddModelError(nameof(Input.ProfileId), "The selected user was not found.");
            await LoadPageAsync();
            return Page();
        }

        var feature = BcpFeatureCatalog.Features.FirstOrDefault(x => x.ModuleFolder == Input.FeatureAreaKey);
        if (feature == null)
        {
            ModelState.AddModelError(nameof(Input.FeatureAreaKey), "The selected feature was not found in the BCP feature catalog.");
            await LoadPageAsync();
            return Page();
        }

        var assignedBy = _userManager.GetUserId(User);
        var existing = await _context.BcpUserFeatureRoles
            .FirstOrDefaultAsync(x => x.ProfileId == Input.ProfileId && x.FeatureAreaKey == Input.FeatureAreaKey);

        // Keep one active record per user/feature pair so the latest role can be audited and changed in place.
        if (existing == null)
        {
            _context.BcpUserFeatureRoles.Add(new BcpUserFeatureRole
            {
                ProfileId = Input.ProfileId,
                FeatureAreaKey = Input.FeatureAreaKey,
                ActionRole = Input.ActionRole,
                IsActive = Input.IsActive,
                AssignedBy = assignedBy,
                Date = DateTime.UtcNow
            });
        }
        else
        {
            existing.ActionRole = Input.ActionRole;
            existing.IsActive = Input.IsActive;
            existing.AssignedBy = assignedBy;
            existing.Date = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();

        StatusMessage = $"Permission saved for {DisplayName(user)} on {feature.FeatureName}.";
        return RedirectToPage();
    }

    public async Task<IActionResult> OnPostRevokeAsync(Guid id)
    {
        var assignment = await _context.BcpUserFeatureRoles.FindAsync(id);
        if (assignment == null)
        {
            StatusMessage = "Permission assignment was not found.";
            return RedirectToPage();
        }

        // Revoke by deactivating instead of deleting; administrators need the historical access trail.
        assignment.IsActive = false;
        assignment.AssignedBy = _userManager.GetUserId(User);
        assignment.Date = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        StatusMessage = "Permission assignment revoked.";
        return RedirectToPage();
    }

    private async Task LoadPageAsync()
    {
        // Load users, catalog features, and existing assignments together so the Razor page
        // can present both the assignment form and the current permission matrix.
        var users = await _context.Users
            .OfType<Profile>()
            .OrderBy(x => x.FirstName)
            .ThenBy(x => x.LastName)
            .ThenBy(x => x.Email)
            .ToListAsync();

        var assignments = await _context.BcpUserFeatureRoles
            .Include(x => x.Profile)
            .OrderByDescending(x => x.IsActive)
            .ThenBy(x => x.FeatureAreaKey)
            .ThenBy(x => x.Profile!.FirstName)
            .ToListAsync();

        Users = users.Select(x => new UserOption(x.Id, DisplayName(x), x.Email ?? x.UserName ?? x.Id)).ToList();
        Features = BcpFeatureCatalog.Features
            .OrderBy(x => x.SortOrder)
            .Select(x => new FeatureOption(x.ModuleFolder, x.FeatureName, x.Icon, x.HasConsole, x.HasWorkspace))
            .ToList();
        // Action roles describe what the user may do inside a feature after access is granted.
        ActionRoles = Enum.GetValues<BcpActionRole>()
            .Select(x => new ActionRoleOption(x, DisplayActionRole(x), DescribeActionRole(x)))
            .ToList();

        Permissions = assignments.Select(x =>
        {
            var feature = BcpFeatureCatalog.Features.FirstOrDefault(f => f.ModuleFolder == x.FeatureAreaKey);
            return new PermissionRow(
                x.Id,
                x.ProfileId ?? string.Empty,
                DisplayName(x.Profile),
                x.Profile?.Email ?? x.Profile?.UserName ?? "No email",
                x.FeatureAreaKey ?? "Unknown",
                feature?.FeatureName ?? x.FeatureAreaKey ?? "Unknown feature",
                feature?.Icon ?? "admin_panel_settings",
                x.ActionRole,
                DisplayActionRole(x.ActionRole),
                x.IsActive,
                x.AssignedBy,
                x.Date);
        }).ToList();

        TotalUsers = users.Count;
        UsersWithFeatureAccess = assignments.Where(x => x.IsActive).Select(x => x.ProfileId).Distinct().Count();
        ActiveAssignments = assignments.Count(x => x.IsActive);
        InactiveAssignments = assignments.Count(x => !x.IsActive);
    }

    private static string DisplayName(Profile? profile)
    {
        if (profile == null)
        {
            return "Unknown user";
        }

        var fullName = profile.FullName;
        return string.IsNullOrWhiteSpace(fullName) ? profile.Email ?? profile.UserName ?? profile.Id : fullName;
    }

    private static string DisplayActionRole(BcpActionRole role)
    {
        return role switch
        {
            BcpActionRole.GlobalEditor => "Global Editor",
            BcpActionRole.FeatureEditor => "Feature Editor",
            BcpActionRole.Readonly => "Read Only",
            _ => role.ToString()
        };
    }

    private static string DescribeActionRole(BcpActionRole role)
    {
        return role switch
        {
            BcpActionRole.GlobalEditor => "Can manage all BCP features within the tenant.",
            BcpActionRole.FeatureEditor => "Can manage the selected feature.",
            BcpActionRole.Readonly => "Can view the selected feature without making changes.",
            _ => "Custom BCP permission level."
        };
    }

    public class AssignPermissionInput
    {
        [Required]
        public string ProfileId { get; set; } = string.Empty;

        [Required]
        public string FeatureAreaKey { get; set; } = string.Empty;

        [Required]
        public BcpActionRole ActionRole { get; set; } = BcpActionRole.Readonly;

        public bool IsActive { get; set; } = true;
    }

    public sealed record UserOption(string Id, string Name, string Email);
    public sealed record FeatureOption(string Key, string Name, string Icon, bool HasConsole, bool HasWorkspace);
    public sealed record ActionRoleOption(BcpActionRole Value, string Label, string Description);
    public sealed record PermissionRow(
        Guid Id,
        string ProfileId,
        string UserName,
        string Email,
        string FeatureAreaKey,
        string FeatureName,
        string Icon,
        BcpActionRole ActionRole,
        string ActionRoleLabel,
        bool IsActive,
        string? AssignedBy,
        DateTime Date);
}
