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

namespace Ozikol_BCC.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "SuperAdmin,Admin,Identity Manager,IdentityManager")]
    [Tags("2b. Identity Administration")]
    public class IdentityApiController : ControllerBase
    {
        private static readonly HashSet<string> _seededDatabases = new(StringComparer.OrdinalIgnoreCase);
        private static readonly SemaphoreSlim _seedLock = new(1, 1);

        private readonly RoleManager<AppRole> _roleManager;
        private readonly UserManager<Profile> _userManager;
        private readonly DashboardDbContext _dbContext;
        private readonly IHubContext<GroupChatHub>? _hubContext;

        public IdentityApiController(
            RoleManager<AppRole> roleManager,
            UserManager<Profile> userManager,
            DashboardDbContext dbContext,
            IHubContext<GroupChatHub>? hubContext = null)
        {
            _roleManager = roleManager;
            _userManager = userManager;
            _dbContext = dbContext;
            _hubContext = hubContext;
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

        [HttpGet("invitations")]
        public async Task<IActionResult> GetInvitations()
        {
            var invitations = await _dbContext.BcpUserInvitations
                .AsNoTracking()
                .OrderByDescending(i => i.CreatedAt)
                .Select(i => new
                {
                    i.Id,
                    i.Email,
                    AssignedRole = i.RoleName ?? "Member",
                    Status = i.IsAccepted ? "Accepted" : (i.ExpiresAt < DateTime.UtcNow ? "Expired" : "Pending"),
                    SentDate = i.CreatedAt,
                    ExpiresDate = i.ExpiresAt
                })
                .ToListAsync();

            return Ok(ApiResponse<object>.SuccessResponse(invitations, "Invitations retrieved."));
        }

        [HttpPost("invitations")]
        public async Task<IActionResult> SendInvitation([FromBody] InvitationRequest request)
        {
            if (!await CallerCanAssignRolesAsync())
            {
                return StatusCode(403, ApiResponse<object>.FailureResponse("Access Denied: Only administrators or users with the 'Identity Manager' role can invite users or provision roles."));
            }

            if (string.IsNullOrWhiteSpace(request.Email))
                return BadRequest(ApiResponse<object>.FailureResponse("Email address is required."));

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

            // 3. Create new invitation
            var token = Guid.NewGuid().ToString("N");
            var invitedBy = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var invitation = new BcpUserInvitation
            {
                Id = Guid.CreateVersion7(),
                Email = emailClean,
                Token = token,
                RoleName = request.Role,
                InvitedByProfileId = invitedBy,
                CreatedAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddDays(7),
                IsAccepted = false
            };
            _dbContext.BcpUserInvitations.Add(invitation);

            // 4. Resolve client register link host dynamically
            var origin = Request.Headers.Origin.ToString();
            if (string.IsNullOrEmpty(origin)) origin = "http://localhost:4200";

            var emailBody = $@"
                <div style='font-family:sans-serif; padding:32px; max-width:550px; margin:0 auto; border:1px solid #e2e8f0; border-radius:16px; background-color:#ffffff;'>
                    <h2 style='color:#0f172a; margin-top:0; font-size:22px; font-weight:800; letter-spacing:-0.02em;'>Workspace Onboarding</h2>
                    <p style='color:#334155; font-size:14.5px; line-height:1.6; margin-bottom:24px;'>
                        You have been invited to join the <strong>Ozikol Workspace Portal</strong> as a <strong>{request.Role}</strong>. Accept the invitation below to register your account.
                    </p>
                    <div style='margin:30px 0; text-align:center;'>
                        <a href='{origin}/auth/register?token={token}&email={Uri.EscapeDataString(emailClean)}' 
                           style='background-color:#0050e5; color:#ffffff; padding:13px 28px; border-radius:8px; text-decoration:none; font-weight:bold; display:inline-block; font-size:14px; box-shadow:0 4px 6px -1px rgba(0, 80, 229, 0.2);'>
                            Accept Invitation & Register
                        </a>
                    </div>
                    <p style='color:#64748b; font-size:12px; line-height:1.5; border-top:1px solid #f1f5f9; padding-top:16px;'>
                        This invitation is secure and will expire in 7 days. If you did not request this invitation, you can safely ignore this message.
                    </p>
                </div>";

            var emailQueueItem = new BcpEmailQueue
            {
                Id = Guid.CreateVersion7(),
                RecipientEmail = emailClean,
                RecipientName = emailClean.Split('@')[0],
                Subject = "You are invited to join Ozikol BCC Workspace",
                HtmlBody = emailBody,
                Category = BcpMessageCategory.General,
                Priority = BcpMessagePriority.High,
                Status = BcpQueueStatus.Queued,
                CreatedAt = DateTime.UtcNow
            };
            _dbContext.BcpEmailQueue.Add(emailQueueItem);

            await _dbContext.SaveChangesAsync();
            return Ok(ApiResponse<object>.SuccessResponse(null, $"Invitation successfully sent to '{emailClean}' with role '{request.Role}'."));
        }

        [HttpGet("login-audit")]
        public async Task<IActionResult> GetLoginAuditLogs()
        {
            var logs = await _dbContext.BcpLoginAuditLogs
                .AsNoTracking()
                .OrderByDescending(l => l.Timestamp)
                .Take(250) // Limit to latest 250 rows for performance
                .ToListAsync();

            return Ok(ApiResponse<object>.SuccessResponse(logs, "Login audit logs retrieved."));
        }

        [HttpGet("password-policy")]
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
        public async Task<IActionResult> GetActiveSessions()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(ApiResponse<object>.FailureResponse("Unauthorized access."));

            var sessions = await _dbContext.BcpUserDevices
                .AsNoTracking()
                .Where(d => d.UserId == userId && d.IsActiveSession)
                .OrderByDescending(d => d.LastUsedAt)
                .Select(d => new
                {
                    SessionId = d.Id,
                    Device = d.DeviceName,
                    Browser = d.DeviceName,
                    IpAddress = d.IpAddress,
                    LastActive = d.LastUsedAt,
                    IsCurrent = false // client identifies current device by token
                })
                .ToListAsync();

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

                // Email Notification
                var emailBody = $@"
                    <div style='font-family:sans-serif; padding:24px; max-width:550px; margin:0 auto; border:1px solid #e2e8f0; border-radius:12px;'>
                        <h3 style='color:#ef4444; margin-top:0;'>Device Session Terminated</h3>
                        <p style='color:#334155; font-size:14px; line-height:1.6;'>
                            Hello, a logged-in device session on your account was successfully revoked/terminated.
                        </p>
                        <ul style='color:#475569; font-size:13.5px; line-height:1.5;'>
                            <li><strong>Device:</strong> {session.DeviceName}</li>
                            <li><strong>IP Address:</strong> {session.IpAddress}</li>
                            <li><strong>Action Time:</strong> {DateTime.UtcNow:f} UTC</li>
                        </ul>
                        <p style='color:#64748b; font-size:12px;'>
                            If you did not authorize this action, please change your login credentials immediately to secure your account.
                        </p>
                    </div>";

                var emailQueueItem = new BcpEmailQueue
                {
                    Id = Guid.CreateVersion7(),
                    RecipientEmail = user.Email ?? string.Empty,
                    Subject = "Security Alert: Active Session Terminated",
                    HtmlBody = emailBody,
                    Category = BcpMessageCategory.General,
                    Priority = BcpMessagePriority.Normal,
                    Status = BcpQueueStatus.Queued,
                    CreatedAt = DateTime.UtcNow
                };
                _dbContext.BcpEmailQueue.Add(emailQueueItem);
            }

            await _dbContext.SaveChangesAsync();
            return Ok(ApiResponse<object>.SuccessResponse(null, $"Session '{sessionId}' successfully terminated."));
        }

        [HttpGet("telemetry")]
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
            var isAdmin = globalRoles.Contains("Admin") || globalRoles.Contains("SuperAdmin");

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
                IsAdmin = isAdmin,
                FeatureRoles = featureRoles
            };

            return Ok(ApiResponse<object>.SuccessResponse(data, "User security feature roles retrieved."));
        }

        [HttpPost("users/{userId}/feature-roles")]
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

            // Sync global Admin role
            var globalRoles = await _userManager.GetRolesAsync(user);
            if (request.IsAdmin)
            {
                if (!globalRoles.Contains("Admin"))
                {
                    await _userManager.AddToRoleAsync(user, "Admin");
                }
            }
            else
            {
                if (globalRoles.Contains("Admin"))
                {
                    await _userManager.RemoveFromRoleAsync(user, "Admin");
                }
            }

            // Clear old feature roles
            var oldRoles = await _dbContext.BcpUserFeatureRoles.Where(r => r.ProfileId == userId).ToListAsync();
            _dbContext.BcpUserFeatureRoles.RemoveRange(oldRoles);

            // Add new feature roles
            if (request.FeatureRoles != null)
            {
                foreach (var r in request.FeatureRoles)
                {
                    if (string.IsNullOrEmpty(r.Scope) || r.Scope == "None") continue;

                    BcpActionRole actionRole;
                    if (r.Scope == "GlobalEdit") actionRole = BcpActionRole.GlobalEditor;
                    else if (r.Scope == "FeatureEdit") actionRole = BcpActionRole.FeatureEditor;
                    else actionRole = BcpActionRole.Readonly;

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

            // Dispatch Notifications & Audit Event
            var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var currentUserEmail = User.FindFirstValue(ClaimTypes.Email) ?? "Admin";

            // Save
            await _dbContext.SaveChangesAsync();

            // In-App Notification to modified user
            var notif = new BcpNotification
            {
                Id = Guid.CreateVersion7(),
                UserId = user.Id,
                Title = "Permissions Updated",
                Message = "Your workspace roles and access scopes have been updated by an administrator.",
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            };
            _dbContext.BcpNotifications.Add(notif);

            // Email to modified user
            var emailBody = $@"
                <div style='font-family:sans-serif; padding:24px; max-width:550px; margin:0 auto; border:1px solid #e2e8f0; border-radius:12px;'>
                    <h3 style='color:#0050e5; margin-top:0;'>Workspace Permissions Updated</h3>
                    <p style='color:#334155; font-size:14px; line-height:1.6;'>
                        Hello, an administrator has updated your global roles and feature-specific authorization scopes.
                    </p>
                    <p style='color:#334155; font-size:14.5px;'>
                        <strong>Global Admin Access:</strong> {(request.IsAdmin ? "Granted" : "Restricted")}
                    </p>
                    <p style='color:#475569; font-size:13.5px;'>
                        Please log out and sign back in to apply these new security configurations to your workspace.
                    </p>
                </div>";

            var emailQueueItem = new BcpEmailQueue
            {
                Id = Guid.CreateVersion7(),
                RecipientEmail = user.Email ?? string.Empty,
                Subject = "Security Alert: Permissions Matrix Updated",
                HtmlBody = emailBody,
                Category = BcpMessageCategory.General,
                Priority = BcpMessagePriority.High,
                Status = BcpQueueStatus.Queued,
                CreatedAt = DateTime.UtcNow
            };
            _dbContext.BcpEmailQueue.Add(emailQueueItem);

            // Activity log for privilege changes
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
                    : $"Updated feature access scopes for user '{user.Email}'.",
                PerformedByProfileId = currentUserId,
                PerformedByFullName = currentUserEmail,
                TargetProfileId = user.Id,
                TargetFullName = $"{user.FirstName} {user.LastName}".Trim(),
                Date = DateTime.UtcNow,
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1"
            };
            _dbContext.BcpActivityLogs.Add(activityLog);

            await _dbContext.SaveChangesAsync();

            // Broadcast live real-time SignalR security event to the target user's active browser sessions
            if (_hubContext != null)
            {
                try
                {
                    await _hubContext.Clients.Group($"user-{userId}").SendAsync("UserPermissionsUpdated", new
                    {
                        userId = user.Id,
                        email = user.Email,
                        isAdmin = request.IsAdmin,
                        timestamp = DateTime.UtcNow
                    });
                }
                catch { }
            }

            return Ok(ApiResponse<object>.SuccessResponse(null, "Security permissions updated successfully and user alerts dispatched."));
        }
    }

    public class InvitationRequest
    {
        public string Email { get; set; } = string.Empty;
        public string Role { get; set; } = "Member";
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
