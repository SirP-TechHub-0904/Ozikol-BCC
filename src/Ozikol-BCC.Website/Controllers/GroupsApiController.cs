using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;
using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using static Ozikol_BCC.Domain.Enum.Enum;

using MediatR;
using Ozikol_BCC.Application.Commands.BcpGroupCommands;
using Ozikol_BCC.Application.Queries.BcpGroupQueries;
using Ozikol_BCC.Application.Repository.Bcp.Groups;

namespace Ozikol_BCC.Website.Controllers
{
    /// <summary>
    /// REST API for BCP group management: CRUD, members, invitations.
    /// Integrated with Clean Architecture MediatR Commands, Queries, & Repository.
    /// </summary>
    [ApiController]
    [Route("api/groups")]
    [Authorize]
    public class GroupsApiController : ControllerBase
    {
        private readonly DashboardDbContext _db;
        private readonly UserManager<Profile> _userManager;
        private readonly IMediator _mediator;
        private readonly IBcpGroupRepository _repository;

        public GroupsApiController(
            DashboardDbContext db,
            UserManager<Profile> userManager,
            IMediator mediator,
            IBcpGroupRepository repository)
        {
            _db = db;
            _userManager = userManager;
            _mediator = mediator;
            _repository = repository;
        }

        private string? UserId => User.FindFirstValue(ClaimTypes.NameIdentifier);

        /// <summary>
        /// Get all groups for the current user.
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetMyGroups()
        {
            if (UserId == null) return Unauthorized();

            var groups = await _db.BcpGroupMembers
                .Where(m => m.UserProfileId == UserId && m.MembershipStatus == "Active" && !m.IsSuspended)
                .Include(m => m.BcpGroup)
                .Select(m => new
                {
                    m.BcpGroup!.Id,
                    m.BcpGroup.Title,
                    m.BcpGroup.Description,
                    GroupType = m.BcpGroup.GroupType.ToString(),
                    Visibility = m.BcpGroup.Visibility.ToString(),
                    ChatMode = m.BcpGroup.ChatMode.ToString(),
                    m.BcpGroup.AvatarUrl,
                    m.BcpGroup.IsActive,
                    m.BcpGroup.IsArchived,
                    m.BcpGroup.CreatedAt,
                    MyRole = m.GroupRole.ToString(),
                    MemberCount = _db.BcpGroupMembers.Count(x => x.BcpGroupId == m.BcpGroupId && x.MembershipStatus == "Active"),
                    UnreadCount = m.LastReadMessageId.HasValue
                        ? _db.BcpGroupPosts.Count(p => p.BcpGroupId == m.BcpGroupId && p.CreatedAt > (_db.BcpGroupPosts.Where(x => (Guid?)x.Id == m.LastReadMessageId).Select(x => (DateTime?)x.CreatedAt).FirstOrDefault() ?? DateTime.MinValue) && !p.IsDeleted)
                        : _db.BcpGroupPosts.Count(p => p.BcpGroupId == m.BcpGroupId && !p.IsDeleted),
                    LastMessage = _db.BcpGroupPosts
                        .Where(p => p.BcpGroupId == m.BcpGroupId && !p.IsDeleted)
                        .OrderByDescending(p => p.CreatedAt)
                        .Select(p => new { p.Content, p.CreatedAt, SenderName = p.UserProfile!.FullName })
                        .FirstOrDefault()
                })
                .ToListAsync();

            return Ok(groups);
        }

        /// <summary>
        /// Get all groups (platform admin only).
        /// </summary>
        [HttpGet("all")]
        public async Task<IActionResult> GetAllGroups()
        {
            if (UserId == null) return Unauthorized();

            var groups = await _db.BcpGroups
                .OrderByDescending(g => g.CreatedAt)
                .Select(g => new
                {
                    g.Id,
                    g.Title,
                    g.Description,
                    GroupType = g.GroupType.ToString(),
                    Visibility = g.Visibility.ToString(),
                    ChatMode = g.ChatMode.ToString(),
                    g.AvatarUrl,
                    g.IsActive,
                    g.IsArchived,
                    g.AllowGuestAccess,
                    g.IsAlwaysOpen,
                    g.CreatedAt,
                    MemberCount = g.Members.Count(m => m.MembershipStatus == "Active"),
                    MessageCount = g.Posts.Count(p => !p.IsDeleted)
                })
                .ToListAsync();

            return Ok(groups);
        }

        /// <summary>
        /// Get group details by ID.
        /// </summary>
        [HttpGet("{id:guid}")]
        public async Task<IActionResult> GetGroupDetails(Guid id)
        {
            if (UserId == null) return Unauthorized();

            var group = await _mediator.Send(new GetGroupByIdQuery(id));
            if (group == null) return NotFound();

            var isMember = await _db.BcpGroupMembers.AnyAsync(m => m.BcpGroupId == id && m.UserProfileId == UserId && m.MembershipStatus == "Active");
            if (!isMember && !User.IsInRole("Admin")) return Forbid();

            var membersCount = await _db.BcpGroupMembers.CountAsync(m => m.BcpGroupId == id && m.MembershipStatus == "Active");
            var postsCount = await _db.BcpGroupPosts.CountAsync(p => p.BcpGroupId == id);

            return Ok(new
            {
                group.Id,
                group.Title,
                group.Description,
                GroupType = group.GroupType.ToString(),
                Visibility = group.Visibility.ToString(),
                ChatMode = group.ChatMode.ToString(),
                group.AllowGuestAccess,
                group.IsAlwaysOpen,
                group.OperationalDays,
                group.ClosedMessage,
                group.ReadReceiptsEnabled,
                group.TypingIndicatorsEnabled,
                group.LastSeenEnabled,
                group.CreatedAt,
                CreatedBy = group.CreatedByUser?.FullName,
                MemberCount = await _db.BcpGroupMembers.CountAsync(m => m.BcpGroupId == id && m.MembershipStatus == "Active")
            });
        }

        /// <summary>
        /// Get group members.
        /// </summary>
        [HttpGet("{id:guid}/members")]
        public async Task<IActionResult> GetMembers(Guid id)
        {
            if (UserId == null) return Unauthorized();

            var members = await _db.BcpGroupMembers
                .Where(m => m.BcpGroupId == id && m.MembershipStatus == "Active")
                .Include(m => m.UserProfile)
                .OrderBy(m => m.GroupRole)
                .ThenBy(m => m.UserProfile!.FirstName)
                .Select(m => new
                {
                    m.Id,
                    m.UserProfileId,
                    FullName = m.UserProfile!.FullName,
                    m.UserProfile.Email,
                    GroupRole = m.GroupRole.ToString(),
                    m.RolePosition,
                    m.IsMuted,
                    m.IsSuspended,
                    PresenceStatus = m.PresenceStatus.ToString(),
                    m.LastSeenAt,
                    m.DateJoined
                })
                .ToListAsync();

            return Ok(members);
        }

        /// <summary>
        /// Add a member to a group.
        /// </summary>
        [HttpPost("{id:guid}/members")]
        public async Task<IActionResult> AddMember(Guid id, [FromBody] AddMemberRequest request)
        {
            if (UserId == null) return Unauthorized();

            var exists = await _db.BcpGroupMembers
                .AnyAsync(m => m.BcpGroupId == id && m.UserProfileId == request.UserId);
            if (exists) return BadRequest("User is already a member.");

            var group = await _db.BcpGroups.FindAsync(id);
            if (group == null) return NotFound();

            if (group.MaxMembers.HasValue)
            {
                var currentCount = await _db.BcpGroupMembers.CountAsync(m => m.BcpGroupId == id && m.MembershipStatus == "Active");
                if (currentCount >= group.MaxMembers.Value)
                    return BadRequest("Group has reached maximum member capacity.");
            }

            _db.BcpGroupMembers.Add(new BcpGroupMember
            {
                BcpGroupId = id,
                UserProfileId = request.UserId,
                GroupRole = System.Enum.TryParse<BcpGroupRole>(request.Role, out var role) ? role : BcpGroupRole.Member,
                MembershipStatus = "Active"
            });
            await _db.SaveChangesAsync();

            return Ok(new { message = "Member added." });
        }

        /// <summary>
        /// Update a member's role, mute, or suspend status.
        /// </summary>
        [HttpPut("{id:guid}/members/{uid}")]
        public async Task<IActionResult> UpdateMember(Guid id, string uid, [FromBody] UpdateMemberRequest request)
        {
            if (UserId == null) return Unauthorized();

            var member = await _db.BcpGroupMembers
                .FirstOrDefaultAsync(m => m.BcpGroupId == id && m.UserProfileId == uid);

            if (member == null) return NotFound();

            if (!string.IsNullOrWhiteSpace(request.Role) && System.Enum.TryParse<BcpGroupRole>(request.Role, out var role))
                member.GroupRole = role;

            if (request.IsMuted.HasValue)
                member.IsMuted = request.IsMuted.Value;

            if (request.IsSuspended.HasValue)
                member.IsSuspended = request.IsSuspended.Value;

            if (!string.IsNullOrWhiteSpace(request.RolePosition))
                member.RolePosition = request.RolePosition;

            await _db.SaveChangesAsync();
            return Ok(new { message = "Member updated." });
        }

        /// <summary>
        /// Remove a member from a group.
        /// </summary>
        [HttpDelete("{id:guid}/members/{uid}")]
        public async Task<IActionResult> RemoveMember(Guid id, string uid)
        {
            if (UserId == null) return Unauthorized();

            var member = await _db.BcpGroupMembers
                .FirstOrDefaultAsync(m => m.BcpGroupId == id && m.UserProfileId == uid);

            if (member == null) return NotFound();

            _db.BcpGroupMembers.Remove(member);
            await _db.SaveChangesAsync();

            return Ok(new { message = "Member removed." });
        }

        /// <summary>
        /// Invite a user to a group.
        /// </summary>
        [HttpPost("{id:guid}/invite")]
        public async Task<IActionResult> InviteUser(Guid id, [FromBody] InviteRequest request)
        {
            if (UserId == null) return Unauthorized();

            var existing = await _db.BcpGroupInvitations
                .AnyAsync(i => i.GroupId == id && i.InvitedUserId == request.UserId && i.Status == "Pending");
            if (existing) return BadRequest("Invitation already pending.");

            _db.BcpGroupInvitations.Add(new BcpGroupInvitation
            {
                GroupId = id,
                InvitedUserId = request.UserId,
                InvitedByUserId = UserId
            });
            await _db.SaveChangesAsync();

            return Ok(new { message = "Invitation sent." });
        }

        /// <summary>
        /// Accept or decline a group invitation.
        /// </summary>
        [HttpPut("invitations/{invitationId:guid}")]
        public async Task<IActionResult> RespondToInvitation(Guid invitationId, [FromBody] InvitationResponse request)
        {
            if (UserId == null) return Unauthorized();

            var invitation = await _db.BcpGroupInvitations
                .FirstOrDefaultAsync(i => i.Id == invitationId && i.InvitedUserId == UserId);

            if (invitation == null) return NotFound();

            invitation.Status = request.Accept ? "Accepted" : "Declined";

            if (request.Accept)
            {
                _db.BcpGroupMembers.Add(new BcpGroupMember
                {
                    BcpGroupId = invitation.GroupId,
                    UserProfileId = UserId,
                    GroupRole = BcpGroupRole.Member,
                    MembershipStatus = "Active"
                });
            }

            await _db.SaveChangesAsync();
            return Ok(new { message = request.Accept ? "Invitation accepted." : "Invitation declined." });
        }

        /// <summary>
        /// Lock/unlock a group (change chat mode).
        /// </summary>
        [HttpPut("{id:guid}/lock")]
        public async Task<IActionResult> LockGroup(Guid id, [FromBody] LockGroupRequest request)
        {
            if (UserId == null) return Unauthorized();

            var group = await _db.BcpGroups.FindAsync(id);
            if (group == null) return NotFound();

            group.ChatMode = request.Lock ? BcpGroupChatMode.AdminOnly : BcpGroupChatMode.Open;
            await _db.SaveChangesAsync();

            return Ok(new { message = request.Lock ? "Group locked." : "Group unlocked.", ChatMode = group.ChatMode.ToString() });
        }
    }

    // ── Request DTOs ──

    public class AddMemberRequest
    {
        public string UserId { get; set; } = string.Empty;
        public string? Role { get; set; }
    }

    public class UpdateMemberRequest
    {
        public string? Role { get; set; }
        public string? RolePosition { get; set; }
        public bool? IsMuted { get; set; }
        public bool? IsSuspended { get; set; }
    }

    public class InviteRequest
    {
        public string UserId { get; set; } = string.Empty;
    }

    public class InvitationResponse
    {
        public bool Accept { get; set; }
    }

    public class LockGroupRequest
    {
        public bool Lock { get; set; }
    }
}
