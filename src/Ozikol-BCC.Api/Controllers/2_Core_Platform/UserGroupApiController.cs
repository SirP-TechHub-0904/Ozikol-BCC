using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Api.Models;
using Ozikol_BCC.Application.Dtos;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Api.Controllers
{
    /// <summary>
    /// API controller providing endpoints for managing User Groups, permission blueprints,
    /// and bulk role assignments across workspace members.
    /// </summary>
    [ApiController]
    [Route("api/v1/user-groups")]
    public class UserGroupApiController : ControllerBase
    {
        private readonly DashboardDbContext _dbContext;
        private readonly UserManager<Profile> _userManager;
        private readonly RoleManager<AppRole> _roleManager;

        public UserGroupApiController(
            DashboardDbContext dbContext,
            UserManager<Profile> userManager,
            RoleManager<AppRole> roleManager)
        {
            _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
            _userManager = userManager ?? throw new ArgumentNullException(nameof(userManager));
            _roleManager = roleManager ?? throw new ArgumentNullException(nameof(roleManager));
        }

        /// <summary>
        /// Retrieves all configured user groups alongside their member counts.
        /// Automatically seeds baseline default groups (Member, Administrator) if the table is empty.
        /// </summary>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>A collection of user group summary DTOs.</returns>
        [HttpGet]
        [Authorize]
        [ProducesResponseType(typeof(ApiResponse<List<UserGroupSummaryDto>>), 200)]
        public async Task<IActionResult> GetUserGroups(CancellationToken cancellationToken = default)
        {
            try
            {
                await EnsureDefaultGroupsSeededAsync(cancellationToken);

                var groups = await _dbContext.BcpUserGroups
                    .AsNoTracking()
                    .Include(g => g.Permissions)
                    .Include(g => g.Members.Where(m => !m.IsDeleted))
                    .OrderByDescending(g => g.IsDefault)
                    .ThenBy(g => g.Name)
                    .ToListAsync(cancellationToken);

                var allActiveUsers = await _dbContext.Users
                    .AsNoTracking()
                    .Where(u => !u.IsDeleted)
                    .Select(u => new
                    {
                        u.Id,
                        u.BcpUserGroupId,
                        FullName = ((u.FirstName ?? "") + " " + (u.LastName ?? "")).Trim(),
                        u.Email,
                        u.MemberId,
                        u.AvatarUrl,
                        u.Designation
                    })
                    .ToListAsync(cancellationToken);

                var allUserRoles = await _dbContext.UserRoles
                    .AsNoTracking()
                    .Join(_dbContext.Roles.AsNoTracking(), ur => ur.RoleId, r => r.Id, (ur, r) => new { ur.UserId, RoleName = r.Name })
                    .ToListAsync(cancellationToken);

                var rolesByUser = allUserRoles
                    .GroupBy(x => x.UserId)
                    .ToDictionary(g => g.Key, g => g.Select(x => x.RoleName!).ToList());

                var dtos = new List<UserGroupSummaryDto>();

                foreach (var g in groups)
                {
                    // Direct members explicitly mapped to this group
                    var directMembers = allActiveUsers
                        .Where(u => u.BcpUserGroupId == g.Id)
                        .Select(u => new UserGroupMemberSummaryDto
                        {
                            Id = u.Id,
                            Email = u.Email ?? string.Empty,
                            FullName = string.IsNullOrWhiteSpace(u.FullName) ? "Workspace Member" : u.FullName,
                            Designation = u.Designation,
                            MemberId = u.MemberId,
                            AvatarUrl = u.AvatarUrl,
                            UserGroupId = g.Id
                        })
                        .ToList();

                    // If zero direct members, intelligently resolve from assigned roles as baseline preview
                    if (directMembers.Count == 0)
                    {
                        var matchingRole = g.BaseRole;
                        var fallbackCandidates = allActiveUsers.Where(u =>
                        {
                            if (u.BcpUserGroupId.HasValue) return false;
                            if (!rolesByUser.TryGetValue(u.Id, out var rList)) return g.IsDefault;
                            if (g.Name == "Administrator" || matchingRole == "Admin") return rList.Contains("Admin") || rList.Contains("SuperAdmin");
                            if (g.Name == "Operations & Workforce Manager" || matchingRole == "Feature Editor") return rList.Contains("Feature Editor") || rList.Contains("UserManager") || rList.Contains("Staff Rota & Shifts Manager");
                            if (matchingRole == "Read Only") return rList.Contains("Read Only");
                            if (!string.IsNullOrWhiteSpace(matchingRole) && rList.Contains(matchingRole)) return true;
                            if (g.IsDefault || matchingRole == "Member") return rList.Contains("Member") && !rList.Contains("Admin") && !rList.Contains("SuperAdmin") && !rList.Contains("Feature Editor");
                            return false;
                        }).ToList();

                        directMembers = fallbackCandidates.Select(u => new UserGroupMemberSummaryDto
                        {
                            Id = u.Id,
                            Email = u.Email ?? string.Empty,
                            FullName = string.IsNullOrWhiteSpace(u.FullName) ? "Workspace Member" : u.FullName,
                            Designation = u.Designation,
                            MemberId = u.MemberId,
                            AvatarUrl = u.AvatarUrl,
                            UserGroupId = g.Id
                        }).ToList();
                    }

                    dtos.Add(new UserGroupSummaryDto
                    {
                        Id = g.Id,
                        Name = g.Name,
                        Description = g.Description,
                        BaseRole = g.BaseRole,
                        IsDefault = g.IsDefault,
                        IsSystem = g.IsSystem,
                        ColorBadge = g.ColorBadge,
                        Icon = g.Icon,
                        CreatedUtc = g.CreatedUtc,
                        MembersCount = directMembers.Count,
                        PermissionsCount = g.Permissions.Count,
                        MembersPreview = directMembers.Take(5).ToList()
                    });
                }

                return Ok(ApiResponse<List<UserGroupSummaryDto>>.SuccessResponse(dtos, "User groups resolved successfully."));
            }
            catch (Exception)
            {
                // Defensive fallback: If database schema migration is pending, return default baseline groups in-memory
                var fallbackGroups = GetDefaultInMemoryGroups();
                return Ok(ApiResponse<List<UserGroupSummaryDto>>.SuccessResponse(fallbackGroups, "User groups resolved from baseline defaults (migration pending)."));
            }
        }

        /// <summary>
        /// Retrieves detailed information and full capability permission blueprint for a specific user group.
        /// </summary>
        /// <param name="id">The unique identifier of the user group.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>The detailed user group blueprint.</returns>
        [HttpGet("{id}")]
        [Authorize]
        [ProducesResponseType(typeof(ApiResponse<UserGroupDetailDto>), 200)]
        public async Task<IActionResult> GetUserGroupById(Guid id, CancellationToken cancellationToken = default)
        {
            var group = await _dbContext.BcpUserGroups
                .AsNoTracking()
                .Include(g => g.Permissions)
                .Include(g => g.Members.Where(m => !m.IsDeleted))
                .FirstOrDefaultAsync(g => g.Id == id, cancellationToken);

            if (group == null)
            {
                return NotFound(ApiResponse<object>.FailureResponse("User group not found."));
            }

            var dto = new UserGroupDetailDto
            {
                Id = group.Id,
                Name = group.Name,
                Description = group.Description,
                BaseRole = group.BaseRole,
                IsDefault = group.IsDefault,
                IsSystem = group.IsSystem,
                ColorBadge = group.ColorBadge,
                Icon = group.Icon,
                CreatedUtc = group.CreatedUtc,
                Permissions = group.Permissions.Select(p => new UserGroupPermissionItemDto
                {
                    Id = p.Id,
                    FeatureAreaKey = p.FeatureAreaKey,
                    ActionRole = p.ActionRole.ToString()
                }).ToList(),
                Members = group.Members.Select(m => new UserGroupMemberSummaryDto
                {
                    Id = m.Id,
                    Email = m.Email ?? string.Empty,
                    FullName = $"{m.FirstName} {m.LastName}".Trim(),
                    Designation = m.Designation,
                    MemberId = m.MemberId
                }).ToList()
            };

            return Ok(ApiResponse<UserGroupDetailDto>.SuccessResponse(dto, "User group blueprint loaded successfully."));
        }

        /// <summary>
        /// Creates a new user group with its primary system role and capability permissions matrix.
        /// </summary>
        /// <param name="request">Payload containing group metadata and permissions list.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>The newly created user group.</returns>
        [HttpPost]
        [Authorize(Roles = "SuperAdmin,Admin,Identity Manager,IdentityManager")]
        [ProducesResponseType(typeof(ApiResponse<UserGroupDetailDto>), 201)]
        public async Task<IActionResult> CreateUserGroup([FromBody] UpsertUserGroupRequest request, CancellationToken cancellationToken = default)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Name))
            {
                return BadRequest(ApiResponse<object>.FailureResponse("User group name is required."));
            }

            var trimmedName = request.Name.Trim();
            var exists = await _dbContext.BcpUserGroups.AnyAsync(g => g.Name.ToLower() == trimmedName.ToLower(), cancellationToken);
            if (exists)
            {
                return BadRequest(ApiResponse<object>.FailureResponse($"A user group named '{trimmedName}' already exists."));
            }

            var group = new BcpUserGroup
            {
                Id = Guid.NewGuid(),
                Name = trimmedName,
                Description = request.Description?.Trim(),
                BaseRole = !string.IsNullOrWhiteSpace(request.BaseRole) ? request.BaseRole.Trim() : "Member",
                IsDefault = request.IsDefault,
                IsSystem = false,
                ColorBadge = !string.IsNullOrWhiteSpace(request.ColorBadge) ? request.ColorBadge.Trim() : "#0050E5",
                Icon = !string.IsNullOrWhiteSpace(request.Icon) ? request.Icon.Trim() : "group",
                CreatedUtc = DateTime.UtcNow
            };

            if (request.IsDefault)
            {
                // Reset other default flags
                var currentDefaults = await _dbContext.BcpUserGroups.Where(g => g.IsDefault).ToListAsync(cancellationToken);
                foreach (var cd in currentDefaults)
                {
                    cd.IsDefault = false;
                }
            }

            if (request.Permissions != null && request.Permissions.Count > 0)
            {
                foreach (var p in request.Permissions)
                {
                    if (!string.IsNullOrWhiteSpace(p.FeatureAreaKey))
                    {
                        var action = ParseActionRole(p.ActionRole);
                        group.Permissions.Add(new BcpUserGroupPermission
                        {
                            Id = Guid.NewGuid(),
                            BcpUserGroupId = group.Id,
                            FeatureAreaKey = p.FeatureAreaKey.Trim(),
                            ActionRole = action
                        });
                    }
                }
            }

            _dbContext.BcpUserGroups.Add(group);
            await _dbContext.SaveChangesAsync(cancellationToken);

            return CreatedAtAction(nameof(GetUserGroupById), new { id = group.Id },
                ApiResponse<object>.SuccessResponse(new { group.Id, group.Name }, "User group created successfully."));
        }

        /// <summary>
        /// Updates an existing user group's metadata and permission blueprint, and syncs updated rights to its members.
        /// </summary>
        /// <param name="id">The unique identifier of the user group.</param>
        /// <param name="request">Payload containing updated group details and permissions.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>Success confirmation.</returns>
        [HttpPut("{id}")]
        [Authorize(Roles = "SuperAdmin,Admin,Identity Manager,IdentityManager")]
        [ProducesResponseType(typeof(ApiResponse<object>), 200)]
        public async Task<IActionResult> UpdateUserGroup(Guid id, [FromBody] UpsertUserGroupRequest request, CancellationToken cancellationToken = default)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Name))
            {
                return BadRequest(ApiResponse<object>.FailureResponse("User group name is required."));
            }

            var group = await _dbContext.BcpUserGroups
                .Include(g => g.Permissions)
                .Include(g => g.Members.Where(m => !m.IsDeleted))
                .FirstOrDefaultAsync(g => g.Id == id, cancellationToken);

            if (group == null)
            {
                return NotFound(ApiResponse<object>.FailureResponse("User group not found."));
            }

            var trimmedName = request.Name.Trim();
            var nameConflict = await _dbContext.BcpUserGroups.AnyAsync(g => g.Id != id && g.Name.ToLower() == trimmedName.ToLower(), cancellationToken);
            if (nameConflict)
            {
                return BadRequest(ApiResponse<object>.FailureResponse($"Another user group named '{trimmedName}' already exists."));
            }

            group.Name = trimmedName;
            group.Description = request.Description?.Trim();
            group.BaseRole = !string.IsNullOrWhiteSpace(request.BaseRole) ? request.BaseRole.Trim() : group.BaseRole;
            group.ColorBadge = !string.IsNullOrWhiteSpace(request.ColorBadge) ? request.ColorBadge.Trim() : group.ColorBadge;
            group.Icon = !string.IsNullOrWhiteSpace(request.Icon) ? request.Icon.Trim() : group.Icon;
            group.UpdatedUtc = DateTime.UtcNow;

            if (request.IsDefault && !group.IsDefault)
            {
                var others = await _dbContext.BcpUserGroups.Where(g => g.Id != id && g.IsDefault).ToListAsync(cancellationToken);
                foreach (var o in others)
                {
                    o.IsDefault = false;
                }
                group.IsDefault = true;
            }

            // Sync permissions collection
            _dbContext.BcpUserGroupPermissions.RemoveRange(group.Permissions);
            if (request.Permissions != null && request.Permissions.Count > 0)
            {
                foreach (var p in request.Permissions)
                {
                    if (!string.IsNullOrWhiteSpace(p.FeatureAreaKey))
                    {
                        var action = ParseActionRole(p.ActionRole);
                        group.Permissions.Add(new BcpUserGroupPermission
                        {
                            Id = Guid.NewGuid(),
                            BcpUserGroupId = group.Id,
                            FeatureAreaKey = p.FeatureAreaKey.Trim(),
                            ActionRole = action
                        });
                    }
                }
            }

            await _dbContext.SaveChangesAsync(cancellationToken);

            // Sync permissions to all assigned members
            if (group.Members != null && group.Members.Count > 0)
            {
                foreach (var member in group.Members)
                {
                    await SyncGroupPermissionsToMemberAsync(member.Id, group, cancellationToken);
                }
            }

            return Ok(ApiResponse<object>.SuccessResponse(new { group.Id, group.Name }, "User group blueprint updated and synchronized across members."));
        }

        /// <summary>
        /// Deletes a user group. Moves assigned members to the default user group.
        /// </summary>
        /// <param name="id">The unique identifier of the user group to delete.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>Success confirmation.</returns>
        [HttpDelete("{id}")]
        [Authorize(Roles = "SuperAdmin,Admin,Identity Manager,IdentityManager")]
        [ProducesResponseType(typeof(ApiResponse<object>), 200)]
        public async Task<IActionResult> DeleteUserGroup(Guid id, CancellationToken cancellationToken = default)
        {
            var group = await _dbContext.BcpUserGroups
                .Include(g => g.Members)
                .FirstOrDefaultAsync(g => g.Id == id, cancellationToken);

            if (group == null)
            {
                return NotFound(ApiResponse<object>.FailureResponse("User group not found."));
            }

            if (group.IsDefault || group.IsSystem)
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Default or system user groups cannot be deleted."));
            }

            // Fallback default group
            var defaultGroup = await _dbContext.BcpUserGroups.FirstOrDefaultAsync(g => g.Id != id && g.IsDefault, cancellationToken)
                ?? await _dbContext.BcpUserGroups.FirstOrDefaultAsync(g => g.Id != id, cancellationToken);

            foreach (var member in group.Members)
            {
                member.BcpUserGroupId = defaultGroup?.Id;
            }

            _dbContext.BcpUserGroups.Remove(group);
            await _dbContext.SaveChangesAsync(cancellationToken);

            return Ok(ApiResponse<object>.SuccessResponse(null, "User group deleted successfully."));
        }

        /// <summary>
        /// Assigns a specific member to a user group and immediately updates their feature roles and system tier.
        /// </summary>
        /// <param name="id">The user group identifier.</param>
        /// <param name="request">Payload containing the target user ID.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>Success confirmation.</returns>
        [HttpPost("{id}/assign")]
        [Authorize(Roles = "SuperAdmin,Admin,Identity Manager,IdentityManager")]
        [ProducesResponseType(typeof(ApiResponse<object>), 200)]
        public async Task<IActionResult> AssignUserToGroup(Guid id, [FromBody] AssignUserToGroupRequest request, CancellationToken cancellationToken = default)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.UserId))
            {
                return BadRequest(ApiResponse<object>.FailureResponse("UserId is required."));
            }

            var group = await _dbContext.BcpUserGroups
                .Include(g => g.Permissions)
                .FirstOrDefaultAsync(g => g.Id == id, cancellationToken);

            if (group == null)
            {
                return NotFound(ApiResponse<object>.FailureResponse("User group not found."));
            }

            var user = await _userManager.FindByIdAsync(request.UserId);
            if (user == null)
            {
                return NotFound(ApiResponse<object>.FailureResponse("User not found."));
            }

            user.BcpUserGroupId = group.Id;
            await _dbContext.SaveChangesAsync(cancellationToken);

            await SyncGroupPermissionsToMemberAsync(user.Id, group, cancellationToken);

            return Ok(ApiResponse<object>.SuccessResponse(null, $"Member assigned to group '{group.Name}' successfully."));
        }

        private async Task SyncGroupPermissionsToMemberAsync(string userId, BcpUserGroup group, CancellationToken cancellationToken)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null) return;

            // Update primary role if not SuperAdmin
            var currentRoles = await _userManager.GetRolesAsync(user);
            if (!currentRoles.Contains("SuperAdmin"))
            {
                var targetRole = group.BaseRole;
                if (!string.IsNullOrWhiteSpace(targetRole) && await _roleManager.RoleExistsAsync(targetRole))
                {
                    // Remove non-superadmin roles
                    foreach (var role in currentRoles)
                    {
                        if (!string.Equals(role, targetRole, StringComparison.OrdinalIgnoreCase))
                        {
                            await _userManager.RemoveFromRoleAsync(user, role);
                        }
                    }
                    if (!await _userManager.IsInRoleAsync(user, targetRole))
                    {
                        await _userManager.AddToRoleAsync(user, targetRole);
                    }
                }
            }

            // Sync feature roles
            var existingRoles = await _dbContext.BcpUserFeatureRoles
                .Where(r => r.ProfileId == userId)
                .ToListAsync(cancellationToken);

            _dbContext.BcpUserFeatureRoles.RemoveRange(existingRoles);

            foreach (var perm in group.Permissions)
            {
                if (perm.ActionRole != BcpActionRole.None)
                {
                    _dbContext.BcpUserFeatureRoles.Add(new BcpUserFeatureRole
                    {
                        Id = Guid.NewGuid(),
                        ProfileId = userId,
                        FeatureAreaKey = perm.FeatureAreaKey,
                        ActionRole = perm.ActionRole,
                        IsActive = true,
                        Date = DateTime.UtcNow
                    });
                }
            }

            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        private async Task EnsureDefaultGroupsSeededAsync(CancellationToken cancellationToken)
        {
            var anyGroups = await _dbContext.BcpUserGroups.AnyAsync(cancellationToken);
            if (anyGroups) return;

            var memberGroup = new BcpUserGroup
            {
                Id = Guid.NewGuid(),
                Name = "Member",
                Description = "Standard workspace member. Access to self-service directory, workspace dashboard, personal profile, and designated portal modules.",
                BaseRole = "Member",
                IsDefault = true,
                IsSystem = true,
                ColorBadge = "#64748B",
                Icon = "person",
                CreatedUtc = DateTime.UtcNow
            };

            var adminGroup = new BcpUserGroup
            {
                Id = Guid.NewGuid(),
                Name = "Administrator",
                Description = "Full workspace administrative authority across accounts, identity policies, communications, and system settings.",
                BaseRole = "Admin",
                IsDefault = false,
                IsSystem = true,
                ColorBadge = "#0050E5",
                Icon = "admin_panel_settings",
                CreatedUtc = DateTime.UtcNow
            };

            // Seed full global admin permissions
            var coreFeatures = new[] { "Dashboard", "UserManager", "IdentityManager", "ContentManager", "Broadcast", "BillingManager", "SettingsManager", "Workforce" };
            foreach (var feature in coreFeatures)
            {
                adminGroup.Permissions.Add(new BcpUserGroupPermission
                {
                    Id = Guid.NewGuid(),
                    BcpUserGroupId = adminGroup.Id,
                    FeatureAreaKey = feature,
                    ActionRole = BcpActionRole.GlobalEditor
                });
            }

            var operationsGroup = new BcpUserGroup
            {
                Id = Guid.NewGuid(),
                Name = "Operations & Workforce Manager",
                Description = "Operational management access restricted strictly to workspace operational modules (Workforce, Shifts, Attendance, and Member directory).",
                BaseRole = "Feature Editor",
                IsDefault = false,
                IsSystem = false,
                ColorBadge = "#059669",
                Icon = "badge",
                CreatedUtc = DateTime.UtcNow
            };

            foreach (var feature in new[] { "Workforce", "Dashboard", "UserManager", "Broadcast" })
            {
                operationsGroup.Permissions.Add(new BcpUserGroupPermission
                {
                    Id = Guid.NewGuid(),
                    BcpUserGroupId = operationsGroup.Id,
                    FeatureAreaKey = feature,
                    ActionRole = BcpActionRole.FeatureEditor
                });
            }

            var auditorGroup = new BcpUserGroup
            {
                Id = Guid.NewGuid(),
                Name = "Auditor & Compliance",
                Description = "Inspection and audit view privileges across directory listings, reports, and activity logs without permission to modify system records.",
                BaseRole = "Read Only",
                IsDefault = false,
                IsSystem = false,
                ColorBadge = "#7C3AED",
                Icon = "visibility",
                CreatedUtc = DateTime.UtcNow
            };

            foreach (var feature in coreFeatures)
            {
                auditorGroup.Permissions.Add(new BcpUserGroupPermission
                {
                    Id = Guid.NewGuid(),
                    BcpUserGroupId = auditorGroup.Id,
                    FeatureAreaKey = feature,
                    ActionRole = BcpActionRole.ReadOnly
                });
            }

            _dbContext.BcpUserGroups.AddRange(memberGroup, adminGroup, operationsGroup, auditorGroup);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        private static BcpActionRole ParseActionRole(string? roleStr)
        {
            if (string.IsNullOrWhiteSpace(roleStr)) return BcpActionRole.ReadOnly;
            var clean = roleStr.Trim().ToLowerInvariant();
            if (clean.Contains("global") || clean == "globaledit") return BcpActionRole.GlobalEditor;
            if (clean.Contains("feature") || clean == "featureedit") return BcpActionRole.FeatureEditor;
            if (clean.Contains("read") || clean == "readonly") return BcpActionRole.ReadOnly;
            if (clean.Contains("none")) return BcpActionRole.None;
            return BcpActionRole.ReadOnly;
        }

        private static List<UserGroupSummaryDto> GetDefaultInMemoryGroups()
        {
            return new List<UserGroupSummaryDto>
            {
                new UserGroupSummaryDto
                {
                    Id = Guid.Parse("11111111-1111-1111-1111-111111111111"),
                    Name = "Member",
                    Description = "Standard workspace member. Access to self-service directory, workspace dashboard, personal profile, and designated portal modules.",
                    BaseRole = "Member",
                    IsDefault = true,
                    IsSystem = true,
                    ColorBadge = "#64748B",
                    Icon = "person",
                    CreatedUtc = DateTime.UtcNow,
                    MembersCount = 0,
                    PermissionsCount = 0
                },
                new UserGroupSummaryDto
                {
                    Id = Guid.Parse("22222222-2222-2222-2222-222222222222"),
                    Name = "Administrator",
                    Description = "Full workspace administrative authority across accounts, identity policies, communications, and system settings.",
                    BaseRole = "Admin",
                    IsDefault = false,
                    IsSystem = true,
                    ColorBadge = "#0050E5",
                    Icon = "admin_panel_settings",
                    CreatedUtc = DateTime.UtcNow,
                    MembersCount = 0,
                    PermissionsCount = 7
                },
                new UserGroupSummaryDto
                {
                    Id = Guid.Parse("33333333-3333-3333-3333-333333333333"),
                    Name = "Operations & Workforce Manager",
                    Description = "Operational management access restricted strictly to workspace operational modules (Workforce, Shifts, Attendance, and Member directory).",
                    BaseRole = "Feature Editor",
                    IsDefault = false,
                    IsSystem = false,
                    ColorBadge = "#059669",
                    Icon = "badge",
                    CreatedUtc = DateTime.UtcNow,
                    MembersCount = 0,
                    PermissionsCount = 3
                },
                new UserGroupSummaryDto
                {
                    Id = Guid.Parse("44444444-4444-4444-4444-444444444444"),
                    Name = "Auditor & Compliance",
                    Description = "Inspection and audit view privileges across directory listings, reports, and activity logs without permission to modify system records.",
                    BaseRole = "Read Only",
                    IsDefault = false,
                    IsSystem = false,
                    ColorBadge = "#7C3AED",
                    Icon = "visibility",
                    CreatedUtc = DateTime.UtcNow,
                    MembersCount = 0,
                    PermissionsCount = 7
                }
            };
        }
    }

    public class UserGroupSummaryDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string BaseRole { get; set; } = "Member";
        public bool IsDefault { get; set; }
        public bool IsSystem { get; set; }
        public string ColorBadge { get; set; } = "#0050E5";
        public string Icon { get; set; } = "group";
        public DateTime CreatedUtc { get; set; }
        public int MembersCount { get; set; }
        public int PermissionsCount { get; set; }
        public List<UserGroupMemberSummaryDto> MembersPreview { get; set; } = new();
    }

    public class UserGroupDetailDto : UserGroupSummaryDto
    {
        public List<UserGroupPermissionItemDto> Permissions { get; set; } = new();
        public List<UserGroupMemberSummaryDto> Members { get; set; } = new();
    }

    public class UserGroupPermissionItemDto
    {
        public Guid Id { get; set; }
        public string FeatureAreaKey { get; set; } = string.Empty;
        public string ActionRole { get; set; } = "ReadOnly";
    }

    public class UserGroupMemberSummaryDto
    {
        public string Id { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string? Designation { get; set; }
        public string? MemberId { get; set; }
        public string? AvatarUrl { get; set; }
        public Guid? UserGroupId { get; set; }
    }

    public class UpsertUserGroupRequest
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string BaseRole { get; set; } = "Member";
        public bool IsDefault { get; set; }
        public string? ColorBadge { get; set; }
        public string? Icon { get; set; }
        public List<UserGroupPermissionItemDto>? Permissions { get; set; }
    }

    public class AssignUserToGroupRequest
    {
        public string UserId { get; set; } = string.Empty;
    }
}
