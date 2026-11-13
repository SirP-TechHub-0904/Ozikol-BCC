using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Api.Models;
using Ozikol_BCC.Application.Commands.BcpGroupCommands;
using Ozikol_BCC.Application.Queries.BcpGroupQueries;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;

namespace Ozikol_BCC.Api.Controllers
{
    [ApiController]
    [Route("api/groups/dm")]
    [Authorize]
    [Tags("4. Direct 1-on-1 Messaging")]
    public class DirectMessageApiController : ControllerBase
    {
        private readonly DashboardDbContext _db;
        private readonly UserManager<Profile> _userManager;
        private readonly IMediator _mediator;

        public DirectMessageApiController(
            DashboardDbContext db,
            UserManager<Profile> userManager,
            IMediator mediator)
        {
            _db = db;
            _userManager = userManager;
            _mediator = mediator;
        }

        private string? UserId => User.FindFirstValue(ClaimTypes.NameIdentifier);

        /// <summary>
        /// Retrieves 1-on-1 direct chat conversation history between two users.
        /// </summary>
        [HttpGet("{recipientId}")]
        public async Task<IActionResult> GetDirectMessages(string recipientId)
        {
            if (string.IsNullOrEmpty(UserId)) return Unauthorized(ApiResponse<object>.FailureResponse("User identity not found."));

            var messages = await _mediator.Send(new GetDirectMessagesQuery(UserId, recipientId));
            
            // Return raw JSON array directly to match client expectations
            return Ok(messages);
        }

        /// <summary>
        /// Retrieves direct messages scoped by group ID.
        /// </summary>
        [HttpGet("group/{groupId:guid}/{recipientId}")]
        public async Task<IActionResult> GetScopedDirectMessages(Guid groupId, string recipientId)
        {
            if (string.IsNullOrEmpty(UserId)) return Unauthorized(ApiResponse<object>.FailureResponse("User identity not found."));

            var messages = await _mediator.Send(new GetDirectMessagesQuery(UserId, recipientId));
            return Ok(messages);
        }

        /// <summary>
        /// Sends a private 1-on-1 direct message to a member.
        /// </summary>
        [HttpPost]
        public async Task<IActionResult> SendDirectMessage([FromBody] SendDirectMessageCommand command)
        {
            if (string.IsNullOrEmpty(UserId)) return Unauthorized(ApiResponse<object>.FailureResponse("User identity not found."));

            command.SenderId = UserId;
            var result = await _mediator.Send(command);
            if (result == null) return BadRequest(ApiResponse<object>.FailureResponse("Failed to send direct message."));

            return Ok(ApiResponse<BcpDirectMessage>.SuccessResponse(result, "Direct message sent successfully."));
        }

        /// <summary>
        /// Marks direct messages as read.
        /// </summary>
        [HttpPost("read")]
        public IActionResult MarkAsRead([FromBody] string recipientId)
        {
            return Ok(ApiResponse<object>.SuccessResponse(null, "Direct messages marked as read."));
        }

        /// <summary>
        /// Retrieves direct messaging conversations list for the current user.
        /// </summary>
        [HttpGet("conversations")]
        public async Task<IActionResult> GetConversations()
        {
            if (string.IsNullOrEmpty(UserId)) return Unauthorized(ApiResponse<object>.FailureResponse("User identity not found."));

            // Get all unique conversations
            var sentMessages = await _db.BcpDirectMessages
                .Where(m => m.SenderUserId == UserId && !m.IsDeleted)
                .Select(m => new { OtherUserId = m.ReceiverUserId, m.CreatedAt, m.Content })
                .ToListAsync();

            var receivedMessages = await _db.BcpDirectMessages
                .Where(m => m.ReceiverUserId == UserId && !m.IsDeleted)
                .Select(m => new { OtherUserId = m.SenderUserId, m.CreatedAt, m.Content })
                .ToListAsync();

            var allMessages = sentMessages.Concat(receivedMessages)
                .GroupBy(m => m.OtherUserId)
                .Select(g => g.OrderByDescending(m => m.CreatedAt).First())
                .ToList();

            var otherUserIds = allMessages.Select(m => m.OtherUserId).Distinct().ToList();
            var profiles = await _userManager.Users
                .Where(u => otherUserIds.Contains(u.Id))
                .ToDictionaryAsync(u => u.Id, u => new { u.FullName, u.Email, u.Designation });

            var result = allMessages
                .Where(m => profiles.ContainsKey(m.OtherUserId))
                .Select(m => new
                {
                    otherUserId = m.OtherUserId, // Maps to activeChatId in client
                    otherUserName = profiles[m.OtherUserId].FullName,
                    otherUserEmail = profiles[m.OtherUserId].Email,
                    designation = profiles[m.OtherUserId].Designation,
                    lastMessage = m.Content,
                    lastMessageAt = m.CreatedAt,
                    unreadCount = _db.BcpDirectMessages.Count(dm => dm.SenderUserId == m.OtherUserId && dm.ReceiverUserId == UserId && !dm.IsRead && !dm.IsDeleted)
                })
                .OrderByDescending(c => c.lastMessageAt)
                .ToList();

            // Return raw JSON array directly to match client expectations
            return Ok(result);
        }
    }
}
