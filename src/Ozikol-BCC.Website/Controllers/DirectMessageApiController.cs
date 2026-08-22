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

namespace Ozikol_BCC.Website.Controllers
{
    /// <summary>
    /// REST API for 1-on-1 direct messages between group members.
    /// </summary>
    [ApiController]
    [Route("api/groups/dm")]
    [Authorize]
    public class DirectMessageApiController : ControllerBase
    {
        private readonly DashboardDbContext _db;
        private readonly UserManager<Profile> _userManager;

        public DirectMessageApiController(DashboardDbContext db, UserManager<Profile> userManager)
        {
            _db = db;
            _userManager = userManager;
        }

        private string? UserId => User.FindFirstValue(ClaimTypes.NameIdentifier);

        /// <summary>
        /// Get DM conversation history between current user and another user within a group.
        /// </summary>
        [HttpGet("{groupId:guid}/{otherUserId}")]
        public async Task<IActionResult> GetConversation(Guid groupId, string otherUserId, [FromQuery] Guid? before = null, [FromQuery] int take = 50)
        {
            if (UserId == null) return Unauthorized();

            var query = _db.BcpDirectMessages
                .Where(dm => dm.GroupId == groupId && !dm.IsDeleted &&
                    ((dm.SenderUserId == UserId && dm.ReceiverUserId == otherUserId) ||
                     (dm.SenderUserId == otherUserId && dm.ReceiverUserId == UserId)))
                .AsQueryable();

            if (before.HasValue)
                query = query.Where(dm => dm.Id < before.Value);

            var messages = await query
                .OrderByDescending(dm => dm.CreatedAt)
                .Take(take)
                .Include(dm => dm.SenderUser)
                .Select(dm => new
                {
                    dm.Id,
                    dm.SenderUserId,
                    SenderName = dm.SenderUser!.FullName,
                    dm.ReceiverUserId,
                    dm.Content,
                    MessageType = dm.MessageType.ToString(),
                    dm.IsRead,
                    dm.CreatedAt,
                    IsMine = dm.SenderUserId == UserId
                })
                .ToListAsync();

            return Ok(messages.OrderBy(m => m.CreatedAt));
        }

        /// <summary>
        /// Get list of active DM conversations for the current user.
        /// </summary>
        [HttpGet("conversations")]
        public async Task<IActionResult> GetConversations()
        {
            if (UserId == null) return Unauthorized();

            var conversations = await _db.BcpDirectMessages
                .Where(dm => (dm.SenderUserId == UserId || dm.ReceiverUserId == UserId) && !dm.IsDeleted)
                .GroupBy(dm => new
                {
                    OtherUserId = dm.SenderUserId == UserId ? dm.ReceiverUserId : dm.SenderUserId,
                    dm.GroupId
                })
                .Select(g => new
                {
                    g.Key.OtherUserId,
                    g.Key.GroupId,
                    LastMessage = g.OrderByDescending(dm => dm.CreatedAt).Select(dm => new
                    {
                        dm.Content,
                        dm.CreatedAt,
                        dm.IsRead
                    }).FirstOrDefault(),
                    UnreadCount = g.Count(dm => dm.ReceiverUserId == UserId && !dm.IsRead)
                })
                .ToListAsync();

            // Get user and group info
            var result = new System.Collections.Generic.List<object>();
            foreach (var conv in conversations)
            {
                var otherUser = await _userManager.FindByIdAsync(conv.OtherUserId);
                var group = await _db.BcpGroups.FindAsync(conv.GroupId);

                result.Add(new
                {
                    conv.OtherUserId,
                    OtherUserName = otherUser?.FullName ?? "Unknown",
                    conv.GroupId,
                    GroupName = group?.Title ?? "Unknown",
                    conv.LastMessage,
                    conv.UnreadCount
                });
            }

            return Ok(result);
        }

        /// <summary>
        /// Mark all DMs from a specific user as read.
        /// </summary>
        [HttpPut("{groupId:guid}/{otherUserId}/read")]
        public async Task<IActionResult> MarkAsRead(Guid groupId, string otherUserId)
        {
            if (UserId == null) return Unauthorized();

            var unread = await _db.BcpDirectMessages
                .Where(dm => dm.GroupId == groupId && dm.SenderUserId == otherUserId && dm.ReceiverUserId == UserId && !dm.IsRead)
                .ToListAsync();

            foreach (var dm in unread)
                dm.IsRead = true;

            await _db.SaveChangesAsync();

            return Ok(new { markedRead = unread.Count });
        }

        public class SendDmRequest
        {
            public Guid GroupId { get; set; }
            public string ReceiverUserId { get; set; } = string.Empty;
            public string Content { get; set; } = string.Empty;
            public Guid? FileId { get; set; }
        }

        /// <summary>
        /// Send/forward a direct message to a member of the group.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> SendMessage([FromBody] SendDmRequest req)
        {
            if (UserId == null) return Unauthorized();
            if (string.IsNullOrWhiteSpace(req.ReceiverUserId) || string.IsNullOrWhiteSpace(req.Content))
                return BadRequest("Invalid message content");

            // Verify both sender and receiver are members in this group
            var senderMember = await _db.BcpGroupMembers.FirstOrDefaultAsync(m => m.BcpGroupId == req.GroupId && m.UserProfileId == UserId && !m.IsSuspended);
            var receiverMember = await _db.BcpGroupMembers.FirstOrDefaultAsync(m => m.BcpGroupId == req.GroupId && m.UserProfileId == req.ReceiverUserId && !m.IsSuspended);

            if (senderMember == null || receiverMember == null)
                return BadRequest("Invalid group membership context");

            var dm = new BcpDirectMessage
            {
                SenderUserId = UserId,
                ReceiverUserId = req.ReceiverUserId,
                GroupId = req.GroupId,
                Content = req.Content,
                MessageType = req.FileId.HasValue ? BcpChatMessageType.File : BcpChatMessageType.Text,
                FileId = req.FileId,
                IsRead = false,
                IsDeleted = false,
                CreatedAt = DateTime.UtcNow
            };

            _db.BcpDirectMessages.Add(dm);
            await _db.SaveChangesAsync();

            return Ok(new
            {
                dm.Id,
                dm.SenderUserId,
                dm.ReceiverUserId,
                dm.Content,
                dm.CreatedAt
            });
        }
    }
}
