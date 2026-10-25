using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Api.Models;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using static Ozikol_BCC.Domain.Enum.Enum;

using Microsoft.AspNetCore.SignalR;
using Ozikol_BCC.Api.Hubs;
using Ozikol_BCC.Application.Hubs;
using Ozikol_BCC.Application.Common;
using Ozikol_BCC.Application.Interfaces.Services;

namespace Ozikol_BCC.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    [Tags("2b. Identity Administration")]
    public class IdentityApiController : ControllerBase
    {
        private static readonly HashSet<string> _seededDatabases = new(StringComparer.OrdinalIgnoreCase);
        private static readonly SemaphoreSlim _seedLock = new(1, 1);

        private readonly RoleManager<AppRole> _roleManager;
        private readonly UserManager<Profile> _userManager;
        private readonly DashboardDbContext _dbContext;
        private readonly IHubContext<GroupChatHub>? _hubContext;
        private readonly IHubContext<NotificationHub>? _notificationHubContext;
        private readonly ICentralNotificationDispatcher? _notificationDispatcher;

        public IdentityApiController(
            RoleManager<AppRole> roleManager,
            UserManager<Profile> userManager,
            DashboardDbContext dbContext,
            IHubContext<GroupChatHub>? hubContext = null,
            IHubContext<NotificationHub>? notificationHubContext = null,
            ICentralNotificationDispatcher? notificationDispatcher = null)
        {
            _roleManager = roleManager;
            _userManager = userManager;
            _dbContext = dbContext;
            _hubContext = hubContext;
            _notificationHubContext = notificationHubContext;
            _notificationDispatcher = notificationDispatcher;
        }

        /// <summary>
        /// Validates whether the calling principal possesses authority to grant, modify, or revoke system roles.
        /// Strictly restricted to SuperAdmin, Admin (implicit Global Editor), or assigned Identity Manager roles.
        /// Feature Editors for other domains (e.g. User Management) cannot assign or alter roles.
        /// </summary>
        private async Task<bool> CallerCanAssignRolesAsync()
        {
            bool HasRoleClaim(string roleName) =>
                User.IsInRole(roleName) ||
                User.Claims.Any(c => (c.Type == ClaimTypes.Role || c.Type == "role" || c.Type == "http://schemas.microsoft.com/ws/2008/06/identity/claims/role") &&
                                     string.Equals(c.Value, roleName, StringComparison.OrdinalIgnoreCase));

            if (HasRoleClaim("SuperAdmin") || HasRoleClaim("Admin"))
                return true;

            if (HasRoleClaim("Identity Manager") || HasRoleClaim("IdentityManager"))
                return true;

            var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!string.IsNullOrEmpty(currentUserId))
            {
                var hasIdentityFeature = await _dbContext.BcpUserFeatureRoles
                    .AsNoTracking()
                    .AnyAsync(f => f.ProfileId == currentUserId &&
                                   f.IsActive &&
                                   (f.FeatureAreaKey == "IdentityManager" || f.FeatureAreaKey == "IdentityAccessControl") &&
                                   (f.ActionRole == BcpActionRole.GlobalEditor || f.ActionRole == BcpActionRole.FeatureEditor));
                if (hasIdentityFeature)
                    return true;
            }

            return false;
        }

        /// <summary>
        /// Ensures all standard platform and feature authority roles exist in the tenant Identity role store.
        /// Uses single-query non-blocking batch lookup and in-memory cache to guarantee zero database overhead on repeated calls.
        /// </summary>
        private async Task EnsureSeededRolesAsync()
        {
            var dbName = _dbContext.Database.GetDbConnection().Database ?? "TenantDb";
            if (_seededDatabases.Contains(dbName))
                return;

            await _seedLock.WaitAsync();
            try
            {
                if (_seededDatabases.Contains(dbName))
                    return;

                var systemRoles = new (string Name, RoleCategory Category)[]
                {
                    ("SuperAdmin", RoleCategory.BCP),
                    ("Admin", RoleCategory.Both),
                    ("Identity Manager", RoleCategory.BCP),
                    ("User Manager", RoleCategory.BCP),
                    ("Global Editor", RoleCategory.BCP),
                    ("Feature Editor", RoleCategory.BCP),
                    ("Read Only", RoleCategory.BCP),
                    ("Member", RoleCategory.BCP)
                };

                // Single non-blocking fast query for all existing role names
                var existingRoleNames = await _dbContext.Roles
                    .AsNoTracking()
                    .Select(r => r.Name)
                    .ToListAsync();

                var existingSet = new HashSet<string>(existingRoleNames.Where(n => !string.IsNullOrEmpty(n))!, StringComparer.OrdinalIgnoreCase);

                bool changed = false;
                foreach (var (name, cat) in systemRoles)
                {
                    if (!existingSet.Contains(name))
                    {
                        _dbContext.Roles.Add(new AppRole(name)
                        {
                            NormalizedName = name.ToUpperInvariant(),
                            RoleCategory = cat,
                            ConcurrencyStamp = Guid.NewGuid().ToString()
                        });
                        changed = true;
                    }
                }

                if (changed)
                {
                    await _dbContext.SaveChangesAsync();
                }

                _seededDatabases.Add(dbName);
            }
            finally
            {
                _seedLock.Release();
            }
        }

        /// <summary>
        /// Retrieves the list of assignable system roles, strictly excluding SuperAdmin.
        /// </summary>
        [HttpGet("roles")]
        [Authorize(Roles = "SuperAdmin,Admin,Identity Manager,IdentityManager")]
        public async Task<IActionResult> GetRoles([FromQuery] bool includeSuperAdmin = false)
        {
            await EnsureSeededRolesAsync();

            var rolesQuery = _roleManager.Roles.AsNoTracking();
            // SuperAdmin can never be selected or assigned from general role dropdowns
            if (!includeSuperAdmin || !User.IsInRole("SuperAdmin"))
            {
                rolesQuery = rolesQuery.Where(r => r.Name != "SuperAdmin");
            }

            var roles = await rolesQuery
                .OrderBy(r => r.Name == "Admin" ? 1 :
                              r.Name == "Identity Manager" ? 2 :
                              r.Name == "User Manager" ? 3 :
                              r.Name == "Global Editor" ? 4 :
                              r.Name == "Feature Editor" ? 5 :
                              r.Name == "Read Only" ? 6 : 7)
                .Select(r => new
                {
                    r.Id,
                    r.Name,
                    r.NormalizedName
                }).ToListAsync();

            return Ok(ApiResponse<object>.SuccessResponse(roles, "Roles retrieved."));
        }

        /// <summary>
        /// Retrieves the fixed 6-tier system role catalog with assigned members and scope specifications.
        /// Pre-populates all standard roles so the console view is never blank.
        /// </summary>
        [HttpGet("roles/catalog")]
        [Authorize(Roles = "SuperAdmin,Admin,Identity Manager,IdentityManager")]
        public async Task<IActionResult> GetRolesCatalog()
        {
            try
            {
                await EnsureSeededRolesAsync();

                // Fetch all user roles mapped with profile info using non-blocking read
                var allUserRoles = await _dbContext.UserRoles
                    .AsNoTracking()
                    .Join(_dbContext.Roles.AsNoTracking(), ur => ur.RoleId, r => r.Id, (ur, r) => new { ur.UserId, RoleName = r.Name })
                    .ToListAsync();

                var userIds = allUserRoles.Select(ur => ur.UserId).Distinct().ToList();
                var profilesList = await _dbContext.Users
                    .AsNoTracking()
                    .Where(u => userIds.Contains(u.Id))
                    .Select(u => new
                    {
                        u.Id,
                        FullName = ((u.FirstName ?? "") + " " + (u.LastName ?? "")).Trim(),
                        u.Email,
                        u.MemberId,
                        u.AvatarUrl
                    })
                    .ToListAsync();

                var profiles = profilesList.ToDictionary(u => u.Id);

                var featureRoles = await _dbContext.BcpUserFeatureRoles
                    .AsNoTracking()
                    .Where(f => f.IsActive)
                    .ToListAsync();

                var featureRolesByUser = featureRoles
                    .Where(f => !string.IsNullOrEmpty(f.ProfileId))
                    .GroupBy(f => f.ProfileId!)
                    .ToDictionary(g => g.Key, g => g.Select(f => f.FeatureAreaKey ?? "").Where(s => !string.IsNullOrEmpty(s)).Distinct().ToList());

                // Build catalog for system and operational roles
                var catalogDefinitions = new[]
                {
                    new
                    {
                        Name = "SuperAdmin",
                        Description = "Root workspace administrator with full sovereignty across master catalog and tenant systems. Locked to root account.",
                        Scope = "Root System Access (Non-assignable)",
                        CanAssign = false,
                        Badge = "badge-root",
                        Icon = "shield_with_house",
                        Group = "system_feature",
                        Order = 1
                    },
                    new
                    {
                        Name = "Admin",
                        Description = "Global workspace administrator with unrestricted operational authority across identity, content, configuration, and data.",
                        Scope = "Global Administrator (Unrestricted)",
                        CanAssign = true,
                        Badge = "badge-admin",
                        Icon = "admin_panel_settings",
                        Group = "system_feature",
                        Order = 2
                    },
                    new
                    {
                        Name = "Identity Manager",
                        Description = "Sovereign identity and access administrator authorized to manage system roles, grant operational permissions, and issue user invitations.",
                        Scope = "Identity & Access Control (RBAC Sovereign)",
                        CanAssign = true,
                        Badge = "badge-identity",
                        Icon = "badge",
                        Group = "system_feature",
                        Order = 3
                    },
                    new
                    {
                        Name = "User Manager",
                        Description = "Directory and cohort administrator authorized to manage user profiles, categories, custom fields, and member statuses across the workspace.",
                        Scope = "User Directory & Cohort Management",
                        CanAssign = true,
                        Badge = "badge-usermanager",
                        Icon = "manage_accounts",
                        Group = "system_feature",
                        Order = 4
                    },
                    new
                    {
                        Name = "Member",
                        Description = "Standard tenant member account with directory listing and personal workspace self-service capabilities.",
                        Scope = "Standard Member Access",
                        CanAssign = true,
                        Badge = "badge-member",
                        Icon = "person",
                        Group = "system_feature",
                        Order = 5
                    },
                    new
                    {
                        Name = "Global Editor",
                        Description = "Global operational editor with permissions to modify content, records, and operations across all active workspace features.",
                        Scope = "Global Scope (All Active Features)",
                        CanAssign = true,
                        Badge = "badge-editor",
                        Icon = "edit_square",
                        Group = "operational_level",
                        Order = 6
                    },
                    new
                    {
                        Name = "Feature Editor",
                        Description = "Modular feature editor with modification privileges scoped specifically to assigned feature modules (e.g. User Management, CMS, Products).",
                        Scope = "Scoped Feature Scope (e.g. UserManager, CMS)",
                        CanAssign = true,
                        Badge = "badge-feature",
                        Icon = "rule_settings",
                        Group = "operational_level",
                        Order = 7
                    },
                    new
                    {
                        Name = "Read Only",
                        Description = "Read-only auditor with comprehensive viewing permissions across modules, but zero modification or deletion capabilities.",
                        Scope = "Read-Only (All Features)",
                        CanAssign = true,
                        Badge = "badge-readonly",
                        Icon = "visibility",
                        Group = "operational_level",
                        Order = 8
                    }
                };

                // SuperAdmin tier is strictly visible only when an authenticated SuperAdmin is logged in.
                // Standard administrators and lower operational roles must not see or manage the root SuperAdmin role.
                var isSuperAdmin = User.IsInRole("SuperAdmin") ||
                                   User.Claims.Any(c => (c.Type == System.Security.Claims.ClaimTypes.Role || c.Type == "role" || c.Type == "http://schemas.microsoft.com/ws/2008/06/identity/claims/role") &&
                                                        string.Equals(c.Value, "SuperAdmin", StringComparison.OrdinalIgnoreCase));

                var visibleDefinitions = catalogDefinitions
                    .Where(def => isSuperAdmin || !string.Equals(def.Name, "SuperAdmin", StringComparison.OrdinalIgnoreCase))
                    .OrderBy(def => def.Order)
                    .ToList();

                var catalog = visibleDefinitions.Select(def =>
                {
                    var assignedUsers = allUserRoles
                        .Where(ur => string.Equals(ur.RoleName, def.Name, StringComparison.OrdinalIgnoreCase))
                        .Select(ur =>
                        {
                            profiles.TryGetValue(ur.UserId, out var p);
                            featureRolesByUser.TryGetValue(ur.UserId, out var fList);
                            return new
                            {
                                userId = ur.UserId,
                                fullName = !string.IsNullOrWhiteSpace(p?.FullName) ? p.FullName : "Member",
                                email = p?.Email ?? "",
                                memberId = p?.MemberId ?? "",
                                avatarUrl = p?.AvatarUrl,
                                features = fList ?? new List<string> { "UserManager" }
                            };
                        })
                        .ToList();

                    return new
                    {
                        name = def.Name,
                        description = def.Description,
                        scope = def.Scope,
                        canAssign = def.CanAssign,
                        badge = def.Badge,
                        icon = def.Icon,
                        group = def.Group,
                        order = def.Order,
                        memberCount = assignedUsers.Count,
                        members = assignedUsers
                    };
                }).ToList();

                return Ok(ApiResponse<object>.SuccessResponse(catalog, "Role catalog retrieved successfully."));
            }
            catch (Exception ex)
            {
                return StatusCode(500, ApiResponse<object>.FailureResponse($"Failed to retrieve roles catalog: {ex.Message}"));
            }
        }

        /// <summary>
        /// Assigns a member to an authorized system role. SuperAdmin cannot be assigned to any member.
        /// </summary>
        [HttpPost("roles/assign")]
        public async Task<IActionResult> AssignRole([FromBody] RoleAssignmentRequest request)
        {
            if (!await CallerCanAssignRolesAsync())
            {
                return StatusCode(403, ApiResponse<object>.FailureResponse("Access Denied: Only administrators or users with the 'Identity Manager' role can assign system roles."));
            }

            if (string.IsNullOrWhiteSpace(request.RoleName) || string.IsNullOrWhiteSpace(request.UserId))
                return BadRequest(ApiResponse<object>.FailureResponse("RoleName and UserId are required."));

            if (string.Equals(request.RoleName, "SuperAdmin", StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest(ApiResponse<object>.FailureResponse("The SuperAdmin role cannot be assigned to any member account. It is strictly reserved for the root workspace account."));
            }

            var user = await _userManager.FindByIdAsync(request.UserId);
            if (user == null)
                return NotFound(ApiResponse<object>.FailureResponse("User not found."));

            await EnsureSeededRolesAsync();

            if (!await _roleManager.RoleExistsAsync(request.RoleName))
                return BadRequest(ApiResponse<object>.FailureResponse($"Role '{request.RoleName}' does not exist."));

            // Remove existing non-SuperAdmin roles to guarantee a single unambiguous active role
            var existingRoles = await _userManager.GetRolesAsync(user);
            var rolesToRemove = existingRoles.Where(r => !string.Equals(r, "SuperAdmin", StringComparison.OrdinalIgnoreCase)).ToList();
            if (rolesToRemove.Any())
            {
                await _userManager.RemoveFromRolesAsync(user, rolesToRemove);
            }

            var addRes = await _userManager.AddToRoleAsync(user, request.RoleName);
            if (!addRes.Succeeded)
                return BadRequest(ApiResponse<object>.FailureResponse(string.Join(", ", addRes.Errors.Select(e => e.Description))));

            // If Feature Editor, assign feature scope (default UserManager)
            if (string.Equals(request.RoleName, "Feature Editor", StringComparison.OrdinalIgnoreCase))
            {
                var featureKey = request.ResolvedFeatureArea;
                var existingFeature = await _dbContext.BcpUserFeatureRoles
                    .FirstOrDefaultAsync(f => f.ProfileId == user.Id && f.FeatureAreaKey == featureKey);

                if (existingFeature == null)
                {
                    _dbContext.BcpUserFeatureRoles.Add(new BcpUserFeatureRole
                    {
                        Id = Guid.CreateVersion7(),
                        ProfileId = user.Id,
                        FeatureAreaKey = featureKey,
                        ActionRole = BcpActionRole.FeatureEditor,
                        IsActive = true,
                        AssignedBy = User.FindFirstValue(ClaimTypes.NameIdentifier),
                        Date = DateTime.UtcNow
                    });
                }
                else
                {
                    existingFeature.ActionRole = BcpActionRole.FeatureEditor;
                    existingFeature.IsActive = true;
                }
            }

            await _dbContext.SaveChangesAsync();
            return Ok(ApiResponse<object>.SuccessResponse(null, $"User '{user.Email}' assigned to role '{request.RoleName}' successfully."));
        }

        /// <summary>
        /// Unassigns a member from a system role. SuperAdmin cannot be unassigned.
        /// </summary>
        [HttpPost("roles/unassign")]
        public async Task<IActionResult> UnassignRole([FromBody] RoleUnassignmentRequest request)
        {
            if (!await CallerCanAssignRolesAsync())
            {
                return StatusCode(403, ApiResponse<object>.FailureResponse("Access Denied: Only administrators or users with the 'Identity Manager' role can unassign system roles."));
            }

            if (string.IsNullOrWhiteSpace(request.RoleName) || string.IsNullOrWhiteSpace(request.UserId))
                return BadRequest(ApiResponse<object>.FailureResponse("RoleName and UserId are required."));

            if (string.Equals(request.RoleName, "SuperAdmin", StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest(ApiResponse<object>.FailureResponse("The SuperAdmin role cannot be modified."));
            }

            var user = await _userManager.FindByIdAsync(request.UserId);
            if (user == null)
                return NotFound(ApiResponse<object>.FailureResponse("User not found."));

            if (await _userManager.IsInRoleAsync(user, request.RoleName))
            {
                await _userManager.RemoveFromRoleAsync(user, request.RoleName);
            }

            // Clear feature role if feature editor
            if (string.Equals(request.RoleName, "Feature Editor", StringComparison.OrdinalIgnoreCase))
            {
                var fRoles = await _dbContext.BcpUserFeatureRoles.Where(f => f.ProfileId == user.Id).ToListAsync();
                if (fRoles.Any())
                {
                    _dbContext.BcpUserFeatureRoles.RemoveRange(fRoles);
                }
            }

            await _dbContext.SaveChangesAsync();
            return Ok(ApiResponse<object>.SuccessResponse(null, $"User '{user.Email}' unassigned from role '{request.RoleName}' successfully."));
        }

        [HttpGet("permissions")]
        [Authorize(Roles = "SuperAdmin,Admin,Identity Manager,IdentityManager")]
        public IActionResult GetPermissions()
        {
            var modules = new[]
            {
                new { Module = "Command Center", Permissions = new[] { "View Dashboard", "Export Telemetry", "Manage Widgets" } },
                new { Module = "Content CMS", Permissions = new[] { "Manage WebPages", "Publish Content", "Edit Section Templates", "Manage FAQs & Sliders" } },
                new { Module = "Identity Administration", Permissions = new[] { "Manage Roles", "Send Invitations", "View Audit Logs", "Configure Policies" } },
                new { Module = "User Management", Permissions = new[] { "View Directory", "Edit Member Profiles", "Manage Categories", "Assign KPIs" } },
                new { Module = "Community & Groups", Permissions = new[] { "Create Channels", "Moderate Discussions", "Invite Members" } },
                new { Module = "Configuration", Permissions = new[] { "Edit Brand Settings", "Update Logos & Colors", "Manage System Features" } }
            };

            return Ok(ApiResponse<object>.SuccessResponse(modules, "Permission matrix retrieved."));
        }

        /// <summary>
        /// Retrieves the complete registry of pending and accepted user invitations.
        /// </summary>
        /// <returns>A collection of workspace onboarding invitations.</returns>
        [HttpGet("invitations")]
        [Authorize(Roles = "SuperAdmin,Admin,Identity Manager,IdentityManager")]
        public async Task<IActionResult> GetInvitations()
        {
            var origin = Request.Headers.Origin.ToString();
            if (string.IsNullOrEmpty(origin)) origin = "http://localhost:4200";

            var rawInvitations = await _dbContext.BcpUserInvitations
                .AsNoTracking()
                .OrderByDescending(i => i.CreatedAt)
                .Select(i => new
                {
                    i.Id,
                    i.Email,
                    i.Token,
                    RawRole = i.RoleName ?? "Member",
                    i.BcpUserCategoryId,
                    Status = i.IsAccepted ? "Accepted" : (i.ExpiresAt < DateTime.UtcNow ? "Expired" : "Pending"),
                    SentDate = i.CreatedAt,
                    ExpiresDate = i.ExpiresAt
                })
                .ToListAsync();

            var invitations = rawInvitations.Select(i =>
            {
                var roleName = i.RawRole;
                string? featureArea = null;
                string? actionRole = null;
                if (roleName.Contains(':'))
                {
                    var parts = roleName.Split(':');
                    roleName = parts[0];
                    if (parts.Length > 1 && !string.IsNullOrWhiteSpace(parts[1]))
                        featureArea = parts[1];
                    if (parts.Length > 2 && !string.IsNullOrWhiteSpace(parts[2]))
                        actionRole = parts[2];
                }

                return new
                {
                    i.Id,
                    i.Email,
                    i.Token,
                    AssignedRole = roleName,
                    FeatureArea = featureArea,
                    ActionRole = actionRole,
                    i.BcpUserCategoryId,
                    i.Status,
                    i.SentDate,
                    i.ExpiresDate,
                    InvitationUrl = $"{origin}/auth/register?token={i.Token}&email={Uri.EscapeDataString(i.Email)}"
                };
            }).ToList();

            return Ok(ApiResponse<object>.SuccessResponse(invitations, "Invitations retrieved."));
        }

        /// <summary>
        /// Dispatches a cryptographic onboarding invitation to a prospective member.
        /// Pre-provisions enterprise system roles and optional modular capability edit scopes.
        /// </summary>
        /// <param name="request">Invitation payload containing recipient email, role, and capability scope.</param>
        /// <returns>The generated invitation token and registration link.</returns>
        [HttpPost("invitations")]
        public async Task<IActionResult> SendInvitation([FromBody] InvitationRequest request)
        {
            if (!await CallerCanAssignRolesAsync())
            {
                return StatusCode(403, ApiResponse<object>.FailureResponse("Access Denied: Only administrators or users with the 'Identity Manager' role can invite users or provision roles."));
            }

            if (string.IsNullOrWhiteSpace(request.Email))
                return BadRequest(ApiResponse<object>.FailureResponse("Email address is required."));

            // SuperAdmin cannot be provisioned via invitations under any circumstances
            if (string.Equals(request.Role, "SuperAdmin", StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest(ApiResponse<object>.FailureResponse("The SuperAdmin role is strictly reserved for the root workspace account and cannot be provisioned via invitations."));
            }

            var emailClean = request.Email.Trim().ToLowerInvariant();

            // 1. Check if user already exists
            var existingUser = await _userManager.FindByEmailAsync(emailClean);
            if (existingUser != null)
                return BadRequest(ApiResponse<object>.FailureResponse("A user with this email address is already registered on the platform."));

            // 2. Clear any active pending invitations for this email to avoid duplicates
            var existingPending = await _dbContext.BcpUserInvitations
                .Where(i => i.Email == emailClean && !i.IsAccepted)
                .ToListAsync();
            if (existingPending.Any())
            {
                _dbContext.BcpUserInvitations.RemoveRange(existingPending);
            }

            // 3. Format pre-assigned role with modular feature area and operational action role
            var baseRole = !string.IsNullOrWhiteSpace(request.Role) ? request.Role.Trim() : "Member";
            var actionRole = !string.IsNullOrWhiteSpace(request.ActionRole) ? request.ActionRole.Trim() : null;
            var featureArea = !string.IsNullOrWhiteSpace(request.FeatureArea) ? request.FeatureArea.Trim() : null;

            var storedRole = baseRole;
            if (!string.IsNullOrEmpty(featureArea) || !string.IsNullOrEmpty(actionRole))
            {
                storedRole = $"{baseRole}:{featureArea ?? string.Empty}:{actionRole ?? string.Empty}";
            }

            // 4. Create new invitation
            var token = Guid.NewGuid().ToString("N");
            var invitedBy = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var expiresDays = request.ExpirationDays.HasValue && request.ExpirationDays.Value > 0 ? request.ExpirationDays.Value : 7;
            var invitation = new BcpUserInvitation
            {
                Id = Guid.CreateVersion7(),
                Email = emailClean,
                Token = token,
                RoleName = storedRole,
                BcpUserCategoryId = request.CategoryId,
                InvitedByProfileId = invitedBy,
                CreatedAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddDays(expiresDays),
                IsAccepted = false
            };
            _dbContext.BcpUserInvitations.Add(invitation);

            // 5. Resolve client register link host dynamically
            var origin = Request.Headers.Origin.FirstOrDefault() 
                ?? Request.Headers.Referer.FirstOrDefault() 
                ?? $"{Request.Scheme}://{Request.Host}";

            var registrationUrl = $"{origin.TrimEnd('/')}/auth/register?token={token}&email={Uri.EscapeDataString(emailClean)}";

            // Resolve dynamic tenant brand name
            var tenantSettings = await _dbContext.MisWebsiteSettings.AsNoTracking().FirstOrDefaultAsync();
            var tenantBrand = !string.IsNullOrWhiteSpace(tenantSettings?.BrandName)
                ? tenantSettings.BrandName.Trim()
                : (!string.IsNullOrWhiteSpace(tenantSettings?.CompanyName) ? tenantSettings.CompanyName.Trim() : "Workspace");

            var customMsgBlock = string.IsNullOrWhiteSpace(request.CustomMessage)
                ? string.Empty
                : $@"<div style='background:#f8fafc; border-left:4px solid #0050e5; padding:12px 16px; margin:18px 0; font-style:italic; color:#475569; font-size:13.5px; border-radius:0 8px 8px 0;'>&ldquo;{System.Net.WebUtility.HtmlEncode(request.CustomMessage.Trim())}&rdquo;</div>";

            var actionDescription = actionRole switch
            {
                "GlobalEditor" => "Global Editor",
                "FeatureEditor" => "Feature Editor",
                "Readonly" => "Read Only",
                _ => string.Empty
            };

            var featureScopeNotice = !string.IsNullOrWhiteSpace(featureArea)
                ? $" with <strong>{(!string.IsNullOrEmpty(actionDescription) ? actionDescription : "Feature Editor")}</strong> access for <strong>{System.Net.WebUtility.HtmlEncode(featureArea)}</strong>"
                : (!string.IsNullOrEmpty(actionDescription) ? $" with <strong>{actionDescription}</strong> operational access" : string.Empty);

            var emailBody = $@"
                <p style='color:#334155; font-size:14.5px; line-height:1.6; margin-top:0; margin-bottom:18px;'>
                    You have been invited to join the <strong>{System.Net.WebUtility.HtmlEncode(tenantBrand)}</strong> workspace as a <strong>{baseRole}</strong>{featureScopeNotice}. Accept the invitation below to establish your account credentials and access the workspace.
                </p>
                {customMsgBlock}
                <div style='margin:28px 0; text-align:center;'>
                    <a href='{registrationUrl}' 
                       style='background-color:#0050e5; color:#ffffff; padding:13px 28px; border-radius:8px; text-decoration:none; font-weight:bold; display:inline-block; font-size:14px; box-shadow:0 4px 6px -1px rgba(0, 80, 229, 0.2);'>
                        Accept Invitation & Register
                    </a>
                </div>
                <p style='color:#64748b; font-size:12px; line-height:1.5; border-top:1px solid #f1f5f9; padding-top:16px; margin-bottom:0;'>
                    This invitation is secure and will expire in {expiresDays} days. If you did not request this invitation, you can safely ignore this message.
                </p>";

            var emailQueueItem = new BcpEmailQueue
            {
                Id = Guid.CreateVersion7(),
                RecipientEmail = emailClean,
                RecipientName = emailClean.Split('@')[0],
                Subject = $"You are invited to join {tenantBrand} Workspace",
                HtmlBody = emailBody,
                Category = BcpMessageCategory.General,
                Priority = BcpMessagePriority.High,
                Status = BcpQueueStatus.Queued,
                CreatedAt = DateTime.UtcNow
            };
            _dbContext.BcpEmailQueue.Add(emailQueueItem);

            await _dbContext.SaveChangesAsync();

            return Ok(ApiResponse<object>.SuccessResponse(new
            {
                token = token,
                invitationUrl = registrationUrl,
                email = emailClean,
                role = baseRole,
                featureArea = request.FeatureArea,
                expiresAt = invitation.ExpiresAt
            }, $"Invitation successfully sent to '{emailClean}' with role '{baseRole}'."));
        }

        /// <summary>
        /// Resends an existing pending invitation email and refreshes the token expiration window.
        /// </summary>
        /// <param name="id">Unique identifier of the invitation to resend.</param>
        /// <returns>A response indicating whether the email was re-enqueued.</returns>
        [HttpPost("invitations/{id}/resend")]
        public async Task<IActionResult> ResendInvitation([FromRoute] string id)
        {
            if (!await CallerCanAssignRolesAsync())
            {
                return StatusCode(403, ApiResponse<object>.FailureResponse("Access Denied: Only administrators or Identity Managers can manage invitations."));
            }

            if (!Guid.TryParse(id, out var invitationId))
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Invalid invitation identifier format."));
            }

            var invitation = await _dbContext.BcpUserInvitations.FirstOrDefaultAsync(i => i.Id == invitationId);
            if (invitation == null)
            {
                return NotFound(ApiResponse<object>.FailureResponse("Invitation record not found."));
            }

            if (invitation.IsAccepted)
            {
                return BadRequest(ApiResponse<object>.FailureResponse("This invitation has already been accepted and activated."));
            }

            // Refresh expiration duration by another 7 days
            invitation.ExpiresAt = DateTime.UtcNow.AddDays(7);

            var origin = Request.Headers.Origin.FirstOrDefault() 
                ?? Request.Headers.Referer.FirstOrDefault() 
                ?? $"{Request.Scheme}://{Request.Host}";

            var registrationUrl = $"{origin.TrimEnd('/')}/auth/register?token={invitation.Token}&email={Uri.EscapeDataString(invitation.Email)}";

            var tenantSettings = await _dbContext.MisWebsiteSettings.AsNoTracking().FirstOrDefaultAsync();
            var tenantBrand = !string.IsNullOrWhiteSpace(tenantSettings?.BrandName)
                ? tenantSettings.BrandName.Trim()
                : (!string.IsNullOrWhiteSpace(tenantSettings?.CompanyName) ? tenantSettings.CompanyName.Trim() : "Workspace");

            var baseRole = invitation.RoleName?.Split(':')[0] ?? "Member";

            var emailBody = $@"
                <p style='color:#334155; font-size:14.5px; line-height:1.6; margin-top:0; margin-bottom:18px;'>
                    You have been invited to join the <strong>{System.Net.WebUtility.HtmlEncode(tenantBrand)}</strong> workspace as a <strong>{baseRole}</strong>. This is a reminder to establish your account credentials and access the workspace.
                </p>
                <div style='margin:28px 0; text-align:center;'>
                    <a href='{registrationUrl}' 
                       style='background-color:#0050e5; color:#ffffff; padding:13px 28px; border-radius:8px; text-decoration:none; font-weight:bold; display:inline-block; font-size:14px; box-shadow:0 4px 6px -1px rgba(0, 80, 229, 0.2);'>
                        Accept Invitation & Register
                    </a>
                </div>
                <p style='color:#64748b; font-size:12px; line-height:1.5; border-top:1px solid #f1f5f9; padding-top:16px; margin-bottom:0;'>
                    This invitation is secure and will expire in 7 days. If you did not request this invitation, you can safely ignore this message.
                </p>";

            var emailQueueItem = new BcpEmailQueue
            {
                Id = Guid.CreateVersion7(),
                RecipientEmail = invitation.Email,
                RecipientName = invitation.Email.Split('@')[0],
                Subject = $"Reminder: You are invited to join {tenantBrand} Workspace",
                HtmlBody = emailBody,
                Category = BcpMessageCategory.General,
                Priority = BcpMessagePriority.High,
                Status = BcpQueueStatus.Queued,
                CreatedAt = DateTime.UtcNow
            };
            _dbContext.BcpEmailQueue.Add(emailQueueItem);

            await _dbContext.SaveChangesAsync();

            return Ok(ApiResponse<object>.SuccessResponse(new
            {
                invitationUrl = registrationUrl,
                expiresAt = invitation.ExpiresAt
            }, $"Invitation email successfully re-enqueued for '{invitation.Email}'."));
        }

        /// <summary>
        /// Revokes an existing invitation token, preventing prospective user registration.
        /// </summary>
        /// <param name="id">Unique identifier of the invitation to revoke.</param>
        /// <returns>A response indicating whether the token was revoked.</returns>
        [HttpDelete("invitations/{id}")]
        public async Task<IActionResult> RevokeInvitation([FromRoute] string id)
        {
            if (!await CallerCanAssignRolesAsync())
            {
                return StatusCode(403, ApiResponse<object>.FailureResponse("Access Denied: Only administrators or Identity Managers can revoke invitations."));
            }

            if (!Guid.TryParse(id, out var invitationId))
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Invalid invitation identifier format."));
            }

            var invitation = await _dbContext.BcpUserInvitations.FirstOrDefaultAsync(i => i.Id == invitationId);
            if (invitation == null)
            {
                return NotFound(ApiResponse<object>.FailureResponse("Invitation record not found."));
            }

            _dbContext.BcpUserInvitations.Remove(invitation);
            await _dbContext.SaveChangesAsync();

            return Ok(ApiResponse<object>.SuccessResponse(null, "Invitation token successfully revoked."));
        }

        /// <summary>
        /// Retrieves the real-time security login audit stream.
        /// When the calling user is not a SuperAdmin, audit records associated with SuperAdmin accounts are strictly filtered out.
        /// </summary>
        /// <returns>A collection of login audit records limited to the latest 250 rows.</returns>
        [HttpGet("login-audit")]
        [Authorize(Roles = "SuperAdmin,Admin,Identity Manager,IdentityManager")]
        public async Task<IActionResult> GetLoginAuditLogs()
        {
            var isSuperAdmin = User.IsInRole("SuperAdmin") ||
                               User.Claims.Any(c => (c.Type == ClaimTypes.Role || c.Type == "role" || c.Type == "http://schemas.microsoft.com/ws/2008/06/identity/claims/role") &&
                                                    string.Equals(c.Value, "SuperAdmin", StringComparison.OrdinalIgnoreCase));

            IQueryable<BcpLoginAuditLog> query = _dbContext.BcpLoginAuditLogs.AsNoTracking();

            // Non-SuperAdmin administrators must never see SuperAdmin login attempts or telemetry
            if (!isSuperAdmin)
            {
                // Identify SuperAdmin role and all associated user identifiers/emails to strictly shield them from non-SuperAdmin callers
                var superAdminRole = await _dbContext.Roles
                    .AsNoTracking()
                    .FirstOrDefaultAsync(r => r.Name == "SuperAdmin" || r.NormalizedName == "SUPERADMIN");

                var superAdminUserIds = new List<string>();
                var superAdminEmails = new List<string>();

                if (superAdminRole != null)
                {
                    superAdminUserIds = await _dbContext.UserRoles
                        .AsNoTracking()
                        .Where(ur => ur.RoleId == superAdminRole.Id)
                        .Select(ur => ur.UserId)
                        .ToListAsync();

                    if (superAdminUserIds.Count > 0)
                    {
                        superAdminEmails = await _dbContext.Users
                            .AsNoTracking()
                            .Where(u => superAdminUserIds.Contains(u.Id) && !string.IsNullOrEmpty(u.Email))
                            .Select(u => u.Email!)
                            .ToListAsync();
                    }
                }

                // Construct normalized list of known superadmin emails
                var emailFilterList = superAdminEmails
                    .SelectMany(e => new[] { e, e.ToLower(), e.ToUpper() })
                    .Distinct()
                    .ToList();

                // Apply comprehensive exclusion: exclude by UserId, known SuperAdmin emails, and any 'superadmin' handle
                if (superAdminUserIds.Count > 0)
                {
                    query = query.Where(l => l.UserId == null || !superAdminUserIds.Contains(l.UserId));
                }

                if (emailFilterList.Count > 0)
                {
                    query = query.Where(l => string.IsNullOrEmpty(l.Email) || !emailFilterList.Contains(l.Email));
                }

                query = query.Where(l => string.IsNullOrEmpty(l.Email) || !l.Email.Contains("superadmin"));
            }

            var logs = await query
                .OrderByDescending(l => l.Timestamp)
                .Take(250) // Limit to latest 250 rows for performance
                .ToListAsync();

            var parsedLogs = logs.Select(l =>
            {
                var parsed = UserAgentParser.Parse(l.UserAgent);
                return new
                {
                    l.Id,
                    l.UserId,
                    l.Email,
                    l.IpAddress,
                    l.SystemId,
                    l.Status,
                    l.UserAgent,
                    Device = parsed.FriendlyDeviceTitle,
                    Browser = parsed.FriendlyBrowserDetails,
                    BrowserName = parsed.BrowserName,
                    ClientType = parsed.ClientType,
                    Icon = parsed.Icon,
                    IsTrusted = l.Status != null && l.Status.Contains("Trusted", StringComparison.OrdinalIgnoreCase),
                    l.Timestamp
                };
            }).ToList();

            return Ok(ApiResponse<object>.SuccessResponse(parsedLogs, "Login audit logs retrieved."));
        }

        [HttpGet("password-policy")]
        [Authorize(Roles = "SuperAdmin,Admin,Identity Manager,IdentityManager")]
        public async Task<IActionResult> GetPasswordPolicy()
        {
            var settings = await _dbContext.MisConfigurationSettings.FirstOrDefaultAsync();
            if (settings == null)
                return BadRequest(ApiResponse<object>.FailureResponse("Tenant configuration settings not found."));

            var policy = new
            {
                MinLength = settings.PasswordMinLength,
                RequireUppercase = settings.PasswordRequireUppercase,
                RequireLowercase = settings.PasswordRequireLowercase,
                RequireDigit = settings.PasswordRequireDigit,
                RequireNonAlphanumeric = settings.PasswordRequireNonAlphanumeric,
                MaxFailedAccessAttempts = settings.MaxFailedAccessAttempts,
                DefaultLockoutTimeSpanMinutes = settings.LockoutDurationMinutes
            };

            return Ok(ApiResponse<object>.SuccessResponse(policy, "Password policy retrieved."));
        }

        [HttpPut("password-policy")]
        [Authorize(Roles = "SuperAdmin,Admin,Identity Manager,IdentityManager")]
        public async Task<IActionResult> UpdatePasswordPolicy([FromBody] PasswordPolicyUpdateRequest request)
        {
            var settings = await _dbContext.MisConfigurationSettings.FirstOrDefaultAsync();
            if (settings == null)
                return BadRequest(ApiResponse<object>.FailureResponse("Tenant configuration settings not found."));

            settings.PasswordMinLength = request.MinLength;
            settings.PasswordRequireUppercase = request.RequireUppercase;
            settings.PasswordRequireLowercase = request.RequireLowercase;
            settings.PasswordRequireDigit = request.RequireDigit;
            settings.PasswordRequireNonAlphanumeric = request.RequireNonAlphanumeric;
            settings.MaxFailedAccessAttempts = request.MaxFailedAccessAttempts;
            settings.LockoutDurationMinutes = request.DefaultLockoutTimeSpanMinutes;

            await _dbContext.SaveChangesAsync();
            return Ok(ApiResponse<object>.SuccessResponse(request, "Password policy updated successfully."));
        }

        [HttpGet("mfa-policy")]
        [Authorize(Roles = "SuperAdmin,Admin,Identity Manager,IdentityManager")]
        public async Task<IActionResult> GetMfaPolicy()
        {
            var settings = await _dbContext.MisConfigurationSettings.FirstOrDefaultAsync();
            if (settings == null)
                return BadRequest(ApiResponse<object>.FailureResponse("Tenant configuration settings not found."));

            var mfa = new
            {
                EnforceMfaForAllUsers = settings.MfaRequiredGlobally,
                EnforceMfaForAdmins = settings.MfaRequiredForAdmins,
                AllowedMethods = new[] { "Google Authenticator", "Microsoft Authenticator", "Email OTP", "SMS OTP" }
            };

            return Ok(ApiResponse<object>.SuccessResponse(mfa, "MFA policy retrieved."));
        }

        [HttpPut("mfa-policy")]
        [Authorize(Roles = "SuperAdmin,Admin,Identity Manager,IdentityManager")]
        public async Task<IActionResult> UpdateMfaPolicy([FromBody] MfaPolicyUpdateRequest request)
        {
            var settings = await _dbContext.MisConfigurationSettings.FirstOrDefaultAsync();
            if (settings == null)
                return BadRequest(ApiResponse<object>.FailureResponse("Tenant configuration settings not found."));

            settings.MfaRequiredGlobally = request.EnforceMfaForAllUsers;
            settings.MfaRequiredForAdmins = request.EnforceMfaForAdmins;

            await _dbContext.SaveChangesAsync();
            return Ok(ApiResponse<object>.SuccessResponse(request, "MFA policy updated successfully."));
        }

        [HttpGet("sessions")]
        [Authorize]
        public async Task<IActionResult> GetActiveSessions()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(ApiResponse<object>.FailureResponse("Unauthorized access."));

            string? tokenJti = null;
            var authHeader = Request.Headers.Authorization.ToString();
            if (!string.IsNullOrEmpty(authHeader) && authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            {
                var rawToken = authHeader.Substring(7).Trim();
                try
                {
                    var tokenHandler = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler();
                    if (tokenHandler.CanReadToken(rawToken))
                    {
                        var jwt = tokenHandler.ReadJwtToken(rawToken);
                        tokenJti = jwt.Claims.FirstOrDefault(c => c.Type == "jti" || c.Type == System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Jti)?.Value;
                    }
                }
                catch { }
            }

            var currentJti = tokenJti
                ?? User.FindFirstValue(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Jti)
                ?? User.FindFirstValue("jti")
                ?? User.Claims.FirstOrDefault(c => c.Type.EndsWith("/jti") || c.Type == "jti")?.Value;

            // Reject if this calling session has been explicitly revoked/terminated
            if (!string.IsNullOrEmpty(currentJti))
            {
                var isExplicitlyDeactivated = await _dbContext.BcpUserDevices
                    .AsNoTracking()
                    .AnyAsync(d => d.UserId == userId && d.JwtId == currentJti && !d.IsActiveSession)
                    && !await _dbContext.BcpUserDevices
                        .AsNoTracking()
                        .AnyAsync(d => d.UserId == userId && d.JwtId == currentJti && d.IsActiveSession);

                if (isExplicitlyDeactivated)
                {
                    return Unauthorized(ApiResponse<object>.FailureResponse("This device session has been terminated. Please sign in again."));
                }
            }

            var deviceEntities = await _dbContext.BcpUserDevices
                .Where(d => d.UserId == userId && d.IsActiveSession)
                .OrderByDescending(d => d.LastUsedAt)
                .ToListAsync();

            // Automatic de-duplication: deactivate older duplicate sessions for the same physical device/browser
            var seenDeviceKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var duplicatesToDeactivate = new List<BcpUserDevice>();
            var uniqueDeviceEntities = new List<BcpUserDevice>();

            foreach (var dev in deviceEntities)
            {
                var parsedDev = UserAgentParser.Parse(dev.DeviceName);
                var deviceKey = $"{parsedDev.FriendlyDeviceTitle}";
                if (seenDeviceKeys.Add(deviceKey))
                {
                    uniqueDeviceEntities.Add(dev);
                }
                else
                {
                    dev.IsActiveSession = false;
                    duplicatesToDeactivate.Add(dev);
                }
            }

            if (duplicatesToDeactivate.Count > 0)
            {
                await _dbContext.SaveChangesAsync();
                deviceEntities = uniqueDeviceEntities;
            }

            if (deviceEntities.Count == 0)
            {
                // Check if user already had sessions that were terminated; if so, do not resurrect a new session!
                var wasTerminated = !string.IsNullOrEmpty(currentJti) &&
                    await _dbContext.BcpUserDevices.AnyAsync(d => d.UserId == userId && d.JwtId == currentJti && !d.IsActiveSession)
                    && !await _dbContext.BcpUserDevices.AnyAsync(d => d.UserId == userId && d.JwtId == currentJti && d.IsActiveSession);

                if (wasTerminated)
                {
                    return Unauthorized(ApiResponse<object>.FailureResponse("This device session has been terminated. Please sign in again."));
                }

                var userAgent = Request.Headers["User-Agent"].ToString();
                if (string.IsNullOrEmpty(userAgent)) userAgent = "Current Browser Session";
                var ip = Request.Headers["X-Forwarded-For"].FirstOrDefault()
                    ?? HttpContext.Connection.RemoteIpAddress?.ToString()
                    ?? "127.0.0.1";

                var newDevice = new BcpUserDevice
                {
                    Id = Guid.CreateVersion7(),
                    UserId = userId,
                    DeviceName = userAgent,
                    IpAddress = ip,
                    TrustToken = Guid.NewGuid().ToString("N"),
                    JwtId = currentJti ?? Guid.NewGuid().ToString(),
                    IsTrusted = false,
                    CreatedAt = DateTime.UtcNow,
                    LastUsedAt = DateTime.UtcNow,
                    IsActiveSession = true
                };
                _dbContext.BcpUserDevices.Add(newDevice);
                await _dbContext.SaveChangesAsync();
                deviceEntities.Add(newDevice);
            }

            var callerUserAgent = Request.Headers.UserAgent.ToString();
            var callerParsed = UserAgentParser.Parse(callerUserAgent);

            // Priority 1: Match device by exact JWT JTI
            var currentDevice = !string.IsNullOrEmpty(currentJti)
                ? deviceEntities.FirstOrDefault(d => d.JwtId == currentJti)
                : null;

            // Priority 2: Match by exact caller User-Agent
            if (currentDevice == null && !string.IsNullOrEmpty(callerUserAgent))
            {
                currentDevice = deviceEntities.FirstOrDefault(d => d.DeviceName == callerUserAgent);
            }

            // Priority 3: Match by matching parsed client application type & operating system (e.g. Web Browser vs Desktop App)
            if (currentDevice == null)
            {
                currentDevice = deviceEntities.FirstOrDefault(d =>
                {
                    var dParsed = UserAgentParser.Parse(d.DeviceName);
                    return dParsed.ClientType == callerParsed.ClientType && dParsed.OperatingSystem == callerParsed.OperatingSystem;
                });
            }

            // Touch current device's LastUsedAt, synchronize latest User-Agent (e.g. Edge vs Chrome), and link token if matched
            if (currentDevice != null)
            {
                currentDevice.LastUsedAt = DateTime.UtcNow;
                if (!string.IsNullOrEmpty(currentJti) && currentDevice.JwtId != currentJti)
                {
                    currentDevice.JwtId = currentJti;
                }
                if (!string.IsNullOrWhiteSpace(callerUserAgent) && currentDevice.DeviceName != callerUserAgent)
                {
                    currentDevice.DeviceName = callerUserAgent;
                }
                await _dbContext.SaveChangesAsync();
            }

            var sessions = deviceEntities.Select(d =>
            {
                var parsed = UserAgentParser.Parse(d.DeviceName);
                var isCurrent = currentDevice != null && d.Id == currentDevice.Id;

                var utcLastActive = d.LastUsedAt.Kind == DateTimeKind.Utc
                    ? d.LastUsedAt
                    : DateTime.SpecifyKind(d.LastUsedAt, DateTimeKind.Utc);
                var utcCreatedAt = d.CreatedAt.Kind == DateTimeKind.Utc
                    ? d.CreatedAt
                    : DateTime.SpecifyKind(d.CreatedAt, DateTimeKind.Utc);

                return new
                {
                    SessionId = d.Id,
                    Device = parsed.FriendlyDeviceTitle,
                    Browser = parsed.FriendlyBrowserDetails,
                    BrowserName = parsed.BrowserName,
                    ClientType = parsed.ClientType,
                    OperatingSystem = parsed.OperatingSystem,
                    DeviceType = parsed.DeviceType,
                    Icon = parsed.Icon,
                    RawDevice = d.DeviceName,
                    IpAddress = d.IpAddress,
                    LastActive = utcLastActive,
                    IsCurrent = isCurrent,
                    IsTrusted = d.IsTrusted,
                    CreatedAt = utcCreatedAt
                };
            }).ToList();

            return Ok(ApiResponse<object>.SuccessResponse(sessions, "Active sessions retrieved."));
        }

        [HttpDelete("sessions/{sessionId}")]
        public async Task<IActionResult> TerminateSession(Guid sessionId)
        {
            var session = await _dbContext.BcpUserDevices.FirstOrDefaultAsync(s => s.Id == sessionId);
            if (session == null)
                return NotFound(ApiResponse<object>.FailureResponse("Session not found."));

            session.IsActiveSession = false;

            // Audit
            var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var currentUserEmail = User.FindFirstValue(ClaimTypes.Email) ?? "Admin";
            var log = new BcpLoginAuditLog
            {
                Id = Guid.CreateVersion7(),
                Email = currentUserEmail,
                Status = "Session Revoked",
                IpAddress = Request.Headers["X-Forwarded-For"].FirstOrDefault() ?? HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = session.DeviceName,
                Timestamp = DateTime.UtcNow
            };
            _dbContext.BcpLoginAuditLogs.Add(log);

            // Notify user
            var user = await _userManager.FindByIdAsync(session.UserId);
            if (user != null)
            {
                // In-App Notification
                var notif = new BcpNotification
                {
                    Id = Guid.CreateVersion7(),
                    UserId = user.Id,
                    Title = "Session Terminated",
                    Message = $"Your active session on '{session.DeviceName}' was terminated by user/admin command.",
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow
                };
                _dbContext.BcpNotifications.Add(notif);

                // Email Notification - pure content snippet enqueued to the pool
                var emailBody = $@"
                    <p style='color:#334155; font-size:14px; line-height:1.6; margin-top:0;'>
                        An active logged-in device session on your account was recently terminated by a workspace administrator.
                    </p>
                    <ul style='color:#475569; font-size:13.5px; line-height:1.8; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:14px 20px 14px 34px;'>
                        <li><strong>Device:</strong> {session.DeviceName}</li>
                        <li><strong>IP Address:</strong> {session.IpAddress}</li>
                        <li><strong>Action Time:</strong> {DateTime.UtcNow:MMMM dd, yyyy HH:mm} UTC</li>
                    </ul>
                    <p style='color:#64748b; font-size:12px; margin-bottom:0;'>
                        If you did not authorize this session termination or suspect unauthorized access, please update your login credentials immediately to secure your account.
                    </p>";

                var emailQueueItem = new BcpEmailQueue
                {
                    Id = Guid.CreateVersion7(),
                    RecipientEmail = user.Email ?? string.Empty,
                    RecipientName = !string.IsNullOrWhiteSpace(user.FirstName) ? user.FirstName : "Member",
                    Subject = "Security Alert: Active Session Terminated",
                    HtmlBody = emailBody,
                    Category = BcpMessageCategory.General,
                    Priority = BcpMessagePriority.Normal,
                    Status = BcpQueueStatus.Queued,
                    CreatedAt = DateTime.UtcNow
                };
                _dbContext.BcpEmailQueue.Add(emailQueueItem);

                // Dispatch real-time In-App security notification
                if (_notificationDispatcher != null)
                {
                    var terminatedParsed = UserAgentParser.Parse(session.DeviceName);
                    await _notificationDispatcher.DispatchAsync(new NotificationDispatchPayload
                    {
                        TargetType = NotificationDispatchTarget.SingleUser,
                        TargetUserId = user.Id,
                        Title = "Security Alert: Session Terminated",
                        Message = $"Your active session on '{terminatedParsed.FriendlyDeviceTitle}' was terminated.",
                        Severity = NotificationSeverity.Warning,
                        Channels = NotificationChannels.InApp,
                        ActionUrl = "/identity/console/account?tab=devices",
                        Module = "Security",
                        Icon = "phonelink_erase",
                        Category = BcpMessageCategory.Security,
                        Priority = BcpMessagePriority.Normal
                    });
                }

                _dbContext.BcpActivityLogs.Add(new BcpActivityLog
                {
                    Id = Guid.CreateVersion7(),
                    ActionType = "SESSION_TERMINATED",
                    Description = $"Active session on '{UserAgentParser.Parse(session.DeviceName).FriendlyDeviceTitle}' was terminated.",
                    Module = "Security",
                    PerformedByProfileId = user.Id,
                    PerformedByFullName = $"{user.FirstName} {user.LastName}".Trim(),
                    PerformedByUserEmail = user.Email,
                    Date = DateTime.UtcNow,
                    IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1",
                    UserAgent = Request.Headers.UserAgent.ToString()
                });
            }

            await _dbContext.SaveChangesAsync();

            // Broadcast real-time session termination event over SignalR so connected sockets disconnect immediately
            var singleTerminatedPayload = new
            {
                userId = session.UserId,
                terminatedSessionIds = new[] { session.Id },
                terminatedJwtIds = !string.IsNullOrEmpty(session.JwtId) ? new[] { session.JwtId } : Array.Empty<string>(),
                timestamp = DateTime.UtcNow
            };

            if (_hubContext != null)
            {
                try
                {
                    await _hubContext.Clients.Group($"user-{session.UserId}").SendAsync("SessionRevoked", singleTerminatedPayload);
                    await _hubContext.Clients.Group($"user_{session.UserId}").SendAsync("SessionRevoked", singleTerminatedPayload);
                }
                catch { }
            }

            if (_notificationHubContext != null)
            {
                try
                {
                    await _notificationHubContext.Clients.Group($"user-{session.UserId}").SendAsync("SessionRevoked", singleTerminatedPayload);
                    await _notificationHubContext.Clients.Group($"user_{session.UserId}").SendAsync("SessionRevoked", singleTerminatedPayload);
                }
                catch { }
            }

            return Ok(ApiResponse<object>.SuccessResponse(null, $"Session '{sessionId}' successfully terminated."));
        }

        /// <summary>
        /// Revokes all active sessions for the authenticated user except the current active session.
        /// </summary>
        /// <returns>Execution confirmation and count of terminated sessions.</returns>
        [HttpPost("sessions/terminate-others")]
        public async Task<IActionResult> TerminateOtherSessions()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(ApiResponse<object>.FailureResponse("Unauthorized access."));

            string? tokenJti = null;
            var authHeader = Request.Headers.Authorization.ToString();
            if (!string.IsNullOrEmpty(authHeader) && authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            {
                var rawToken = authHeader.Substring(7).Trim();
                try
                {
                    var tokenHandler = new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler();
                    if (tokenHandler.CanReadToken(rawToken))
                    {
                        var jwt = tokenHandler.ReadJwtToken(rawToken);
                        tokenJti = jwt.Claims.FirstOrDefault(c => c.Type == "jti" || c.Type == System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Jti)?.Value;
                    }
                }
                catch { }
            }

            var currentJti = tokenJti
                ?? User.FindFirstValue(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Jti)
                ?? User.FindFirstValue("jti")
                ?? User.Claims.FirstOrDefault(c => c.Type.EndsWith("/jti") || c.Type == "jti")?.Value;

            // Fetch all active devices for this user
            var allUserSessions = await _dbContext.BcpUserDevices
                .Where(d => d.UserId == userId && d.IsActiveSession)
                .OrderByDescending(d => d.LastUsedAt)
                .ToListAsync();

            var callerUserAgent = Request.Headers.UserAgent.ToString();
            var callerParsed = UserAgentParser.Parse(callerUserAgent);

            var currentDevice = !string.IsNullOrEmpty(currentJti)
                ? allUserSessions.FirstOrDefault(d => d.JwtId == currentJti)
                : null;

            if (currentDevice == null && !string.IsNullOrEmpty(callerUserAgent))
            {
                currentDevice = allUserSessions.FirstOrDefault(d => d.DeviceName == callerUserAgent);
            }

            if (currentDevice == null)
            {
                currentDevice = allUserSessions.FirstOrDefault(d =>
                {
                    var dParsed = UserAgentParser.Parse(d.DeviceName);
                    return dParsed.ClientType == callerParsed.ClientType && dParsed.OperatingSystem == callerParsed.OperatingSystem;
                });
            }

            var otherSessions = allUserSessions.Where(d => currentDevice != null ? d.Id != currentDevice.Id : d != allUserSessions.FirstOrDefault()).ToList();

            if (!otherSessions.Any())
            {
                return Ok(ApiResponse<object>.SuccessResponse(new { TerminatedCount = 0 }, "No other active sessions found."));
            }

            foreach (var session in otherSessions)
            {
                session.IsActiveSession = false;
            }

            var currentUserEmail = User.FindFirstValue(ClaimTypes.Email) ?? "Admin";
            var log = new BcpLoginAuditLog
            {
                Id = Guid.CreateVersion7(),
                Email = currentUserEmail,
                Status = "All Other Sessions Revoked",
                IpAddress = Request.Headers["X-Forwarded-For"].FirstOrDefault() ?? HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers["User-Agent"].ToString(),
                Timestamp = DateTime.UtcNow
            };
            _dbContext.BcpLoginAuditLogs.Add(log);

            // Record operational activity log
            _dbContext.BcpActivityLogs.Add(new BcpActivityLog
            {
                Id = Guid.CreateVersion7(),
                ActionType = "SESSIONS_REVOKED",
                Description = $"{otherSessions.Count} other active device sessions were remotely revoked.",
                Module = "Security",
                PerformedByProfileId = userId,
                PerformedByFullName = currentUserEmail,
                PerformedByUserEmail = currentUserEmail,
                Date = DateTime.UtcNow,
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1",
                UserAgent = callerUserAgent
            });

            // Dispatch in-app security alert
            if (_notificationDispatcher != null)
            {
                await _notificationDispatcher.DispatchAsync(new NotificationDispatchPayload
                {
                    TargetType = NotificationDispatchTarget.SingleUser,
                    TargetUserId = userId,
                    Title = "Security Alert: Other Sessions Revoked",
                    Message = $"{otherSessions.Count} other active login session(s) were revoked.",
                    Severity = NotificationSeverity.Warning,
                    Channels = NotificationChannels.InApp,
                    ActionUrl = "/identity/console/account?tab=devices",
                    Module = "Security",
                    Icon = "phonelink_erase",
                    Category = BcpMessageCategory.Security,
                    Priority = BcpMessagePriority.Normal
                });
            }

            await _dbContext.SaveChangesAsync();

            // Broadcast real-time session termination event over SignalR so all other connected sockets disconnect immediately
            var allOtherTerminatedPayload = new
            {
                userId = userId,
                terminatedSessionIds = otherSessions.Select(s => s.Id).ToList(),
                terminatedJwtIds = otherSessions.Select(s => s.JwtId).Where(j => !string.IsNullOrEmpty(j)).ToList(),
                timestamp = DateTime.UtcNow
            };

            if (_hubContext != null)
            {
                try
                {
                    await _hubContext.Clients.Group($"user-{userId}").SendAsync("SessionRevoked", allOtherTerminatedPayload);
                    await _hubContext.Clients.Group($"user_{userId}").SendAsync("SessionRevoked", allOtherTerminatedPayload);
                }
                catch { }
            }

            if (_notificationHubContext != null)
            {
                try
                {
                    await _notificationHubContext.Clients.Group($"user-{userId}").SendAsync("SessionRevoked", allOtherTerminatedPayload);
                    await _notificationHubContext.Clients.Group($"user_{userId}").SendAsync("SessionRevoked", allOtherTerminatedPayload);
                }
                catch { }
            }

            return Ok(ApiResponse<object>.SuccessResponse(new { TerminatedCount = otherSessions.Count }, $"{otherSessions.Count} other session(s) successfully terminated."));
        }

        /// <summary>
        /// Retrieves the personal activity audit trail and security history for the authenticated user with a 30-day retention window and server-side pagination.
        /// </summary>
        /// <param name="page">Current 1-based page index (defaults to 1).</param>
        /// <param name="pageSize">Number of records per page (defaults to 10, max 100).</param>
        /// <returns>Paged collection of operational tasks, security events, and retention metadata.</returns>
        [HttpGet("account/login-history")]
        [HttpGet("account/my-activity")]
        [Authorize]
        public async Task<IActionResult> GetPersonalLoginHistory(
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var userEmail = User.FindFirstValue(ClaimTypes.Email);
            if (string.IsNullOrEmpty(userId) && string.IsNullOrEmpty(userEmail))
                return Unauthorized(ApiResponse<object>.FailureResponse("Unauthorized access."));

            // Sanitize pagination bounds
            if (page < 1) page = 1;
            if (pageSize < 5) pageSize = 5;
            if (pageSize > 100) pageSize = 100;

            // Strict 30-day retention boundary for personal activity view
            var cutoffDate = DateTime.UtcNow.AddDays(-30);

            // 1. Query operational activities performed by this user
            var activityQuery = _dbContext.BcpActivityLogs
                .AsNoTracking()
                .Where(a => (userId != null && a.PerformedByProfileId == userId) || (userEmail != null && a.PerformedByUserEmail == userEmail));

            // 2. Query login authentication events for this user
            var loginQuery = _dbContext.BcpLoginAuditLogs
                .AsNoTracking()
                .Where(l => (userId != null && l.UserId == userId) || (userEmail != null && l.Email == userEmail));

            // Check if older records exist beyond 30 days
            var hasOlderActivity = await activityQuery.AnyAsync(a => a.Date < cutoffDate);
            var hasOlderLogin = await loginQuery.AnyAsync(l => l.Timestamp < cutoffDate);
            var hasOlderRecords = hasOlderActivity || hasOlderLogin;

            // Filter to last 30 days
            var recentActivities = await activityQuery
                .Where(a => a.Date >= cutoffDate)
                .OrderByDescending(a => a.Date)
                .Take(200)
                .Select(a => new
                {
                    Id = a.Id.ToString(),
                    Email = a.PerformedByUserEmail ?? userEmail ?? "account@domain.com",
                    Status = a.ActionType ?? "Operational Task",
                    Description = a.Description ?? a.ActionType ?? "User activity",
                    Module = a.Module ?? "System",
                    IpAddress = a.IpAddress ?? "127.0.0.1",
                    UserAgent = a.UserAgent ?? "Web Browser",
                    Timestamp = a.Date
                })
                .ToListAsync();

            var recentLogins = await loginQuery
                .Where(l => l.Timestamp >= cutoffDate)
                .OrderByDescending(l => l.Timestamp)
                .Take(200)
                .Select(l => new
                {
                    Id = l.Id.ToString(),
                    Email = l.Email,
                    Status = l.Status ?? "Sign-in",
                    Description = l.Status != null && l.Status.Contains("Success", StringComparison.OrdinalIgnoreCase)
                        ? "Successful authentication sign-in"
                        : (l.Status ?? "Authentication challenge"),
                    Module = "Authentication",
                    IpAddress = l.IpAddress ?? "127.0.0.1",
                    UserAgent = l.UserAgent ?? "Web Browser",
                    Timestamp = l.Timestamp
                })
                .ToListAsync();

            // Unified chronological feed
            var combinedFeed = recentActivities
                .Concat(recentLogins)
                .OrderByDescending(x => x.Timestamp)
                .ToList();

            // If empty, guarantee at least the current session is registered
            if (!combinedFeed.Any())
            {
                var callerUserAgent = Request.Headers.UserAgent.ToString();
                if (string.IsNullOrEmpty(callerUserAgent)) callerUserAgent = "Web Browser";
                var ip = Request.Headers["X-Forwarded-For"].FirstOrDefault()
                    ?? HttpContext.Connection.RemoteIpAddress?.ToString()
                    ?? "127.0.0.1";

                var initialLog = new BcpLoginAuditLog
                {
                    Id = Guid.CreateVersion7(),
                    UserId = userId ?? string.Empty,
                    Email = userEmail ?? "account@domain.com",
                    IpAddress = ip,
                    SystemId = "BCC-Client",
                    Status = "Success",
                    UserAgent = callerUserAgent,
                    Timestamp = DateTime.UtcNow
                };
                _dbContext.BcpLoginAuditLogs.Add(initialLog);
                await _dbContext.SaveChangesAsync();

                combinedFeed.Add(new
                {
                    Id = initialLog.Id.ToString(),
                    Email = initialLog.Email,
                    Status = "Success",
                    Description = "Initial session authenticated",
                    Module = "Authentication",
                    IpAddress = initialLog.IpAddress,
                    UserAgent = initialLog.UserAgent,
                    Timestamp = initialLog.Timestamp
                });
            }

            var totalCount = combinedFeed.Count;
            var pagedItems = combinedFeed
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToList();

            var formatted = pagedItems.Select(h =>
            {
                var parsed = UserAgentParser.Parse(h.UserAgent);
                return new
                {
                    h.Id,
                    h.Email,
                    ActionType = h.Status,
                    h.Status,
                    h.Description,
                    h.Module,
                    h.IpAddress,
                    h.UserAgent,
                    Device = parsed.FriendlyDeviceTitle,
                    Browser = parsed.FriendlyBrowserDetails,
                    BrowserName = parsed.BrowserName,
                    ClientType = parsed.ClientType,
                    Icon = parsed.Icon,
                    IsTrusted = h.Status != null && h.Status.Contains("Trusted", StringComparison.OrdinalIgnoreCase),
                    Date = h.Timestamp,
                    h.Timestamp
                };
            }).ToList();

            var totalPages = (int)Math.Ceiling((double)totalCount / pageSize);
            if (totalPages < 1) totalPages = 1;

            return Ok(ApiResponse<object>.SuccessResponse(new
            {
                items = formatted,
                totalCount,
                page,
                pageSize,
                totalPages,
                hasOlderRecords,
                retentionDays = 30,
                retentionNotice = "Showing activity records from the last 30 days. For archival records older than 1 month, please contact your workspace Administrator."
            }, "Personal activity history retrieved."));
        }

        /// <summary>
        /// Retrieves a consolidated summary of account security, active devices count, assigned roles, and MFA state.
        /// </summary>
        /// <returns>Account security summary details.</returns>
        [HttpGet("account/summary")]
        public async Task<IActionResult> GetAccountSummary()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(ApiResponse<object>.FailureResponse("Unauthorized access."));

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
                return NotFound(ApiResponse<object>.FailureResponse("User not found."));

            var roles = await _userManager.GetRolesAsync(user);
            var activeSessionCount = await _dbContext.BcpUserDevices
                .CountAsync(d => d.UserId == userId && d.IsActiveSession);

            var summary = new
            {
                user.Id,
                user.Email,
                user.UserName,
                user.FullName,
                user.FirstName,
                user.LastName,
                user.AvatarUrl,
                user.Designation,
                user.TwoFactorEnabled,
                Provider = user.PreferredTwoFactorProvider.ToString(),
                user.LastLogin,
                Roles = roles,
                ActiveSessionsCount = activeSessionCount,
                user.MustChangePassword
            };

            return Ok(ApiResponse<object>.SuccessResponse(summary, "Account summary retrieved."));
        }

        [HttpGet("telemetry")]
        [Authorize(Roles = "SuperAdmin,Admin,Identity Manager,IdentityManager")]
        public async Task<IActionResult> GetTelemetry()
        {
            var totalUsers = await _userManager.Users.CountAsync();

            // 2FA Provider counts
            var googleCount = await _userManager.Users.CountAsync(u => u.PreferredTwoFactorProvider == BcpTwoFactorProvider.GoogleAuthenticator);
            var microsoftCount = await _userManager.Users.CountAsync(u => u.PreferredTwoFactorProvider == BcpTwoFactorProvider.MicrosoftAuthenticator);
            var emailCount = await _userManager.Users.CountAsync(u => u.PreferredTwoFactorProvider == BcpTwoFactorProvider.Email);
            var smsCount = await _userManager.Users.CountAsync(u => u.PreferredTwoFactorProvider == BcpTwoFactorProvider.SMS);
            var noneCount = await _userManager.Users.CountAsync(u => u.PreferredTwoFactorProvider == BcpTwoFactorProvider.None);

            // Lockouts
            var lockedCount = await _userManager.Users.CountAsync(u => u.LockoutEnd != null && u.LockoutEnd > DateTimeOffset.UtcNow);

            // Brute Force Retries (Users with >= 2 failed attempts in last 7 days)
            var retryCount = await _dbContext.BcpLoginAuditLogs
                .AsNoTracking()
                .Where(l => l.Status != "Success" && l.Timestamp > DateTime.UtcNow.AddDays(-7))
                .GroupBy(l => l.Email)
                .Where(g => g.Count() >= 2)
                .CountAsync();

            var data = new
            {
                TotalUsers = totalUsers,
                MfaGoogleCount = googleCount,
                MfaMicrosoftCount = microsoftCount,
                MfaEmailCount = emailCount,
                MfaSmsCount = smsCount,
                MfaNoneCount = noneCount,
                LockedOutCount = lockedCount,
                RetryAlertsCount = retryCount
            };

            return Ok(ApiResponse<object>.SuccessResponse(data, "Telemetry metrics retrieved successfully."));
        }

        [HttpGet("users/search")]
        [Authorize(Roles = "SuperAdmin,Admin,Identity Manager,IdentityManager")]
        public async Task<IActionResult> SearchUsers([FromQuery] string term)
        {
            if (string.IsNullOrWhiteSpace(term))
                return Ok(ApiResponse<object>.SuccessResponse(new List<object>(), "Empty query."));

            var isSuperAdmin = User.IsInRole("SuperAdmin");
            var query = _userManager.Users.AsNoTracking();

            // Filter out SuperAdmins if caller is not SuperAdmin
            if (!isSuperAdmin)
            {
                var superAdminUsers = await _userManager.GetUsersInRoleAsync("SuperAdmin");
                var superAdminIds = superAdminUsers.Select(u => u.Id).ToList();
                query = query.Where(u => !superAdminIds.Contains(u.Id));
            }

            var cleanTerm = term.Trim().ToLowerInvariant();
            var matched = await query
                .Where(u => u.Email!.Contains(cleanTerm) || u.FirstName!.Contains(cleanTerm) || u.LastName!.Contains(cleanTerm))
                .Take(25)
                .Select(u => new
                {
                    u.Id,
                    u.Email,
                    FullName = (u.FirstName + " " + u.LastName).Trim(),
                    u.MemberId,
                    u.Designation
                })
                .ToListAsync();

            return Ok(ApiResponse<object>.SuccessResponse(matched, "Matching users list."));
        }

        [HttpGet("users/{userId}/feature-roles")]
        [Authorize(Roles = "SuperAdmin,Admin,Identity Manager,IdentityManager")]
        public async Task<IActionResult> GetUserFeatureRoles(string userId)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
                return NotFound(ApiResponse<object>.FailureResponse("User not found."));

            // Filter out SuperAdmins if caller is not SuperAdmin
            if (!User.IsInRole("SuperAdmin") && await _userManager.IsInRoleAsync(user, "SuperAdmin"))
            {
                return Forbid();
            }

            var globalRoles = await _userManager.GetRolesAsync(user);
            var isSuperAdmin = globalRoles.Contains("SuperAdmin");
            var isAdmin = isSuperAdmin || globalRoles.Contains("Admin");
            var primaryRole = isSuperAdmin ? "SuperAdmin" :
                              (globalRoles.FirstOrDefault(r => !string.Equals(r, "Member", StringComparison.OrdinalIgnoreCase)) ?? 
                               globalRoles.FirstOrDefault() ?? "Member");

            var featureRoles = await _dbContext.BcpUserFeatureRoles
                .AsNoTracking()
                .Where(r => r.ProfileId == userId)
                .Select(r => new
                {
                    FeatureName = r.FeatureAreaKey,
                    Scope = r.ActionRole == BcpActionRole.GlobalEditor ? "GlobalEdit" : (r.ActionRole == BcpActionRole.FeatureEditor ? "FeatureEdit" : "ReadOnly")
                })
                .ToListAsync();

            var data = new
            {
                UserId = user.Id,
                Email = user.Email,
                FirstName = user.FirstName,
                LastName = user.LastName,
                FullName = $"{user.FirstName} {user.LastName}".Trim(),
                AvatarUrl = user.AvatarUrl,
                CurrentRole = primaryRole,
                AllRoles = globalRoles,
                IsAdmin = isAdmin,
                IsSuperAdmin = isSuperAdmin,
                FeatureRoles = featureRoles
            };

            return Ok(ApiResponse<object>.SuccessResponse(data, "User security feature roles retrieved."));
        }

        /// <summary>
        /// Saves updated security feature roles, assigns system access tiers, and dispatches real-time security notifications &amp; emails.
        /// </summary>
        [HttpPost("users/{userId}/feature-roles")]
        [Authorize(Roles = "SuperAdmin,Admin,Identity Manager,IdentityManager")]
        public async Task<IActionResult> SaveUserFeatureRoles(string userId, [FromBody] SaveFeatureRolesRequest request)
        {
            if (!await CallerCanAssignRolesAsync())
            {
                return StatusCode(403, ApiResponse<object>.FailureResponse("Access Denied: Only administrators or users with the 'Identity Manager' role can modify security feature roles."));
            }

            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
                return NotFound(ApiResponse<object>.FailureResponse("User not found."));

            var isSuperAdminCaller = User.IsInRole("SuperAdmin");

            // Stop standard admin modifying SuperAdmin users
            if (!isSuperAdminCaller && await _userManager.IsInRoleAsync(user, "SuperAdmin"))
            {
                return StatusCode(403, ApiResponse<object>.FailureResponse("Permission Denied: Standard admins cannot modify SuperAdmin security levels."));
            }

            var globalRoles = await _userManager.GetRolesAsync(user);
            var isTargetSuperAdmin = globalRoles.Contains("SuperAdmin");

            // Determine target system role
            var targetRole = !string.IsNullOrWhiteSpace(request.SystemRole)
                ? request.SystemRole.Trim()
                : (request.IsAdmin ? "Admin" : "Member");

            if (string.Equals(targetRole, "SuperAdmin", StringComparison.OrdinalIgnoreCase) && !isTargetSuperAdmin)
            {
                return BadRequest(ApiResponse<object>.FailureResponse("The SuperAdmin role cannot be assigned. It is strictly reserved for the root workspace account."));
            }

            // Sync Identity role if not root SuperAdmin
            if (!isTargetSuperAdmin)
            {
                await EnsureSeededRolesAsync();
                var currentRoles = await _userManager.GetRolesAsync(user);
                var rolesToRemove = currentRoles.Where(r => !string.Equals(r, "SuperAdmin", StringComparison.OrdinalIgnoreCase)).ToList();
                if (rolesToRemove.Any())
                {
                    await _userManager.RemoveFromRolesAsync(user, rolesToRemove);
                }

                if (await _roleManager.RoleExistsAsync(targetRole))
                {
                    await _userManager.AddToRoleAsync(user, targetRole);
                }
                else
                {
                    await _userManager.AddToRoleAsync(user, request.IsAdmin ? "Admin" : "Member");
                }
            }

            // Clear old feature roles
            var oldRoles = await _dbContext.BcpUserFeatureRoles.Where(r => r.ProfileId == userId).ToListAsync();
            _dbContext.BcpUserFeatureRoles.RemoveRange(oldRoles);

            var activeScopesList = new List<string>();

            // Add new feature roles
            if (request.FeatureRoles != null)
            {
                foreach (var r in request.FeatureRoles)
                {
                    if (string.IsNullOrEmpty(r.Scope) || r.Scope == "None") continue;

                    BcpActionRole actionRole;
                    string scopeLabel;
                    if (r.Scope == "GlobalEdit") 
                    {
                        actionRole = BcpActionRole.GlobalEditor;
                        scopeLabel = "Global Editor (Tenant-Wide Authority)";
                    }
                    else if (r.Scope == "FeatureEdit") 
                    {
                        actionRole = BcpActionRole.FeatureEditor;
                        scopeLabel = "Feature Editor (Full CRUD)";
                    }
                    else 
                    {
                        actionRole = BcpActionRole.Readonly;
                        scopeLabel = "Read Only (Auditor)";
                    }

                    activeScopesList.Add($"• <strong>{r.FeatureName}</strong>: {scopeLabel}");

                    var featureRole = new BcpUserFeatureRole
                    {
                        Id = Guid.CreateVersion7(),
                        ProfileId = userId,
                        FeatureAreaKey = r.FeatureName,
                        ActionRole = actionRole,
                        IsActive = true,
                        AssignedBy = User.FindFirstValue(ClaimTypes.NameIdentifier),
                        Date = DateTime.UtcNow
                    };
                    _dbContext.BcpUserFeatureRoles.Add(featureRole);
                }
            }

            var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var currentUserEmail = User.FindFirstValue(ClaimTypes.Email) ?? "Admin";

            // Save database changes
            await _dbContext.SaveChangesAsync();

            // Format dynamic scopes summary for notification & email
            var scopesHtmlSummary = activeScopesList.Any()
                ? string.Join("<br/>", activeScopesList)
                : "<em>Standard Member Access (No custom capability scopes assigned).</em>";

            // 1. In-App Notification (Persistent BcpNotification)
            var notif = new BcpNotification
            {
                Id = Guid.CreateVersion7(),
                UserId = user.Id,
                Title = "Security: Permissions Matrix Updated",
                Message = $"Your system role has been set to '{targetRole}' with {activeScopesList.Count} capability authorizations.",
                Severity = NotificationSeverity.Failed,
                ActionUrl = "/users/workspace/security",
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            };
            _dbContext.BcpNotifications.Add(notif);

            // 2. Transactional Email Layout (Pure content snippet enqueued to the pool, wrapped by TenantEmailShellService)
            var origin = Request.Headers.Origin.FirstOrDefault()
                ?? Request.Headers.Referer.FirstOrDefault()
                ?? $"{Request.Scheme}://{Request.Host}";
            var securityUrl = $"{origin.TrimEnd('/')}/users/workspace/security";

            var recipientFirstName = !string.IsNullOrWhiteSpace(user.FirstName) ? user.FirstName.Trim() : "Member";
            var emailBody = $@"
<p style='font-size:14px; line-height:1.6; color:#475569; margin-top:0;'>
  This is an official security advisory to inform you that a workspace administrator has updated your system role and action authorizations.
</p>
<div style='background:#f1f5f9; border-left:4px solid #0050e5; padding:14px 18px; border-radius:4px; margin:20px 0;'>
  <p style='margin:0 0 6px 0; font-size:14px;'><strong>Primary System Role:</strong> <span style='color:#0050e5; font-weight:700;'>{targetRole}</span></p>
  <p style='margin:0 0 6px 0; font-size:14px;'><strong>Administrative Privileges:</strong> {(targetRole == "Admin" || targetRole == "SuperAdmin" || request.IsAdmin ? "Granted (Administrator)" : "Restricted (Standard Member)")}</p>
  <p style='margin:0; font-size:14px;'><strong>Effective Date:</strong> {DateTime.UtcNow:MMMM dd, yyyy HH:mm} UTC</p>
</div>
<h4 style='color:#0f172a; margin:20px 0 10px 0; font-size:14px; font-weight:700;'>Assigned Modular Capability Scopes:</h4>
<div style='background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:14px 18px; font-size:13px; line-height:1.8; color:#334155;'>
  {scopesHtmlSummary}
</div>
<p style='color:#64748b; font-size:12.5px; line-height:1.5; margin-top:24px;'>
  <strong>Security Tip:</strong> To ensure all updated privileges take effect immediately across your active sessions, please log out and sign back into your workspace.
</p>
<div style='margin-top:24px; text-align:center;'>
  <a href='{securityUrl}' style='background:#0050e5; color:#ffffff; padding:10px 22px; text-decoration:none; border-radius:8px; font-size:13px; font-weight:700; display:inline-block;'>
    Review Security Settings
  </a>
</div>";

            var emailQueueItem = new BcpEmailQueue
            {
                Id = Guid.CreateVersion7(),
                RecipientEmail = user.Email ?? string.Empty,
                RecipientName = recipientFirstName,
                Subject = "Security Alert: Workspace Role & Permissions Matrix Updated",
                HtmlBody = emailBody,
                Category = BcpMessageCategory.Security,
                Priority = BcpMessagePriority.Urgent,
                Status = BcpQueueStatus.Queued,
                CreatedAt = DateTime.UtcNow
            };
            _dbContext.BcpEmailQueue.Add(emailQueueItem);

            // 3. CentralNotificationDispatcher Multi-Channel Delivery (Rule 16)
            if (_notificationDispatcher != null)
            {
                try
                {
                    await _notificationDispatcher.DispatchAsync(new NotificationDispatchPayload
                    {
                        TargetType = NotificationDispatchTarget.SingleUser,
                        TargetUserId = user.Id,
                        Title = "Security: Permissions Matrix Updated",
                        Message = $"Your system role has been set to '{targetRole}' with {activeScopesList.Count} capability authorizations.",
                        Severity = NotificationSeverity.Failed,
                        Channels = NotificationChannels.InApp | NotificationChannels.Email,
                        ActionUrl = "/users/workspace/security",
                        Module = "Identity & Access Governance",
                        Icon = "admin_panel_settings",
                        Category = BcpMessageCategory.Security,
                        Priority = BcpMessagePriority.Urgent,
                        SendEmailCopy = true,
                        EmailSubject = "Security Alert: Workspace Role & Permissions Matrix Updated",
                        EmailHtmlBody = emailBody
                    });
                }
                catch { }
            }

            // 4. Audit Log Entry
            var wasAdmin = globalRoles.Contains("Admin") || globalRoles.Contains("SuperAdmin");
            var adminStatusChanged = wasAdmin != request.IsAdmin;

            var activityLog = new BcpActivityLog
            {
                Id = Guid.CreateVersion7(),
                Module = "Identity & Access Governance",
                ActionType = adminStatusChanged
                    ? (request.IsAdmin ? "Privilege Escalation: Granted Global Admin" : "Privilege Demotion: Revoked Global Admin")
                    : "Permissions Profile Updated",
                Description = adminStatusChanged
                    ? $"{(request.IsAdmin ? "Granted Global Administrator authority to" : "Revoked Global Administrator rights from")} user '{user.Email}' ({user.FirstName} {user.LastName})."
                    : $"Updated role to '{targetRole}' and configured {activeScopesList.Count} capability scopes for '{user.Email}'.",
                PerformedByProfileId = currentUserId,
                PerformedByFullName = currentUserEmail,
                TargetProfileId = user.Id,
                TargetFullName = $"{user.FirstName} {user.LastName}".Trim(),
                PerformedByUserEmail = currentUserEmail,
                Date = DateTime.UtcNow,
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1",
                UserAgent = Request.Headers.UserAgent.ToString()
            };
            _dbContext.BcpActivityLogs.Add(activityLog);

            await _dbContext.SaveChangesAsync();

            // 5. Broadcast live real-time SignalR security event to the target user's active browser sessions
            if (_hubContext != null)
            {
                try
                {
                    await _hubContext.Clients.Group($"user-{userId}").SendAsync("UserPermissionsUpdated", new
                    {
                        userId = user.Id,
                        email = user.Email,
                        role = targetRole,
                        isAdmin = request.IsAdmin,
                        timestamp = DateTime.UtcNow
                    });
                }
                catch { }
            }

            return Ok(ApiResponse<object>.SuccessResponse(null, $"Security permissions updated successfully. System role set to '{targetRole}' and user notification alerts dispatched."));
        }
    }

    /// <summary>
    /// Payload request for issuing a workspace member invitation.
    /// </summary>
    public class InvitationRequest
    {
        /// <summary>
        /// Gets or sets the target recipient email address.
        /// </summary>
        public string Email { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the pre-assigned system role.
        /// </summary>
        public string Role { get; set; } = "Member";

        /// <summary>
        /// Gets or sets the operational action level (GlobalEditor, FeatureEditor, Readonly).
        /// </summary>
        public string? ActionRole { get; set; }

        /// <summary>
        /// Gets or sets the optional pre-assigned member category ID.
        /// </summary>
        public Guid? CategoryId { get; set; }

        /// <summary>
        /// Gets or sets the number of days until the invitation expires (defaults to 7).
        /// </summary>
        public int? ExpirationDays { get; set; }

        /// <summary>
        /// Gets or sets the scoped feature/module domain when assigning Feature Editor.
        /// </summary>
        public string? FeatureArea { get; set; }

        /// <summary>
        /// Gets or sets an optional welcome note from the issuing administrator.
        /// </summary>
        public string? CustomMessage { get; set; }
    }

    public class PasswordPolicyUpdateRequest
    {
        public int MinLength { get; set; } = 8;
        public bool RequireUppercase { get; set; } = true;
        public bool RequireLowercase { get; set; } = true;
        public bool RequireDigit { get; set; } = true;
        public bool RequireNonAlphanumeric { get; set; } = true;
        public int MaxFailedAccessAttempts { get; set; } = 5;
        public int DefaultLockoutTimeSpanMinutes { get; set; } = 15;
    }

    public class MfaPolicyUpdateRequest
    {
        public bool EnforceMfaForAllUsers { get; set; }
        public bool EnforceMfaForAdmins { get; set; }
    }

    public class SaveFeatureRolesRequest
    {
        public bool IsAdmin { get; set; }
        public string? SystemRole { get; set; }
        public List<FeatureRoleScopeDto>? FeatureRoles { get; set; }
    }

    public class FeatureRoleScopeDto
    {
        public string FeatureName { get; set; } = string.Empty;
        public string Scope { get; set; } = "None"; // None, ReadOnly, FeatureEdit, GlobalEdit
    }

    public class RoleAssignmentRequest
    {
        public string RoleName { get; set; } = string.Empty;
        public string UserId { get; set; } = string.Empty;
        public string? FeatureArea { get; set; }
        public string? FeatureName { get; set; }

        public string ResolvedFeatureArea =>
            !string.IsNullOrWhiteSpace(FeatureArea) ? FeatureArea.Trim() :
            (!string.IsNullOrWhiteSpace(FeatureName) ? FeatureName.Trim() : "UserManager");
    }

    public class RoleUnassignmentRequest
    {
        public string RoleName { get; set; } = string.Empty;
        public string UserId { get; set; } = string.Empty;
    }
}
