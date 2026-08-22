using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Api.Models;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.EmailServices.Postmark.Interfaces;
using Ozikol_BCC.Persistence.EF.SQL;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    [Tags("10. In-App Notifications & Alerts Engine")]
    public class NotificationsApiController : ControllerBase
    {
        private readonly DashboardDbContext _dbContext;
        private readonly UserManager<Profile> _userManager;
        private readonly IPostmarkEmailService? _emailService;

        public NotificationsApiController(
            DashboardDbContext dbContext,
            UserManager<Profile> userManager,
            IPostmarkEmailService? emailService = null)
        {
            _dbContext = dbContext;
            _userManager = userManager;
            _emailService = emailService;
        }

        private string? GetCurrentUserId()
        {
            return User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        }

        public class NotificationDto
        {
            public Guid Id { get; set; }
            public string? Title { get; set; }
            public string? Message { get; set; }
            public string? ActionUrl { get; set; }
            public bool IsRead { get; set; }
            public string? Module { get; set; }
            public string? Icon { get; set; }
            public string Category { get; set; } = "General";
            public string Priority { get; set; } = "Normal";
            public bool IsBroadcast { get; set; }
            public DateTime CreatedAt { get; set; }
        }

        public class NotificationFeedResponse
        {
            public int UnreadCount { get; set; }
            public List<NotificationDto> Items { get; set; } = new();
        }

        public class DispatchNotificationRequest
        {
            public string TargetType { get; set; } = "SingleUser"; // "SingleUser" | "Category" | "BroadcastAll"
            public string? TargetUserId { get; set; }
            public string? TargetCategoryId { get; set; }
            public string Title { get; set; } = string.Empty;
            public string Message { get; set; } = string.Empty;
            public string? ActionUrl { get; set; }
            public string? Module { get; set; } = "General";
            public string? Icon { get; set; } = "notifications";
            public string Priority { get; set; } = "Normal"; // Low, Normal, High, Urgent
            public string Category { get; set; } = "General"; // General, Security, Membership, Performance, System
            public bool SendEmailCopy { get; set; } = false;
        }

        /// <summary>
        /// Retrieves the real-time notification feed and unread count for the topbar bell dropdown.
        /// </summary>
        [HttpGet("feed")]
        [ProducesResponseType(typeof(ApiResponse<NotificationFeedResponse>), 200)]
        public async Task<IActionResult> GetFeed()
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
            {
                return Ok(ApiResponse<NotificationFeedResponse>.SuccessResponse(new NotificationFeedResponse(), "Feed retrieved."));
            }

            var query = _dbContext.BcpNotifications
                .Where(n => n.UserId == userId || n.IsBroadcast);

            var unreadCount = await query.CountAsync(n => !n.IsRead);

            var items = await query
                .OrderByDescending(n => n.CreatedAt)
                .Take(10)
                .Select(n => new NotificationDto
                {
                    Id = n.Id,
                    Title = n.Title,
                    Message = n.Message,
                    ActionUrl = n.ActionUrl,
                    IsRead = n.IsRead,
                    Module = n.Module,
                    Icon = n.Icon ?? "notifications",
                    Category = n.Category.ToString(),
                    Priority = n.Priority.ToString(),
                    IsBroadcast = n.IsBroadcast,
                    CreatedAt = n.CreatedAt
                })
                .ToListAsync();

            var response = new NotificationFeedResponse
            {
                UnreadCount = unreadCount,
                Items = items
            };

            return Ok(ApiResponse<NotificationFeedResponse>.SuccessResponse(response, "Feed retrieved."));
        }

        /// <summary>
        /// Retrieves paginated notification list for the dedicated Notification Center.
        /// </summary>
        [HttpGet("all")]
        [ProducesResponseType(typeof(ApiResponse<List<NotificationDto>>), 200)]
        public async Task<IActionResult> GetAll([FromQuery] string? filter = null)
        {
            var userId = GetCurrentUserId();
            if (string.IsNullOrEmpty(userId))
            {
                return Ok(ApiResponse<List<NotificationDto>>.SuccessResponse(new List<NotificationDto>(), "List retrieved."));
            }

            var query = _dbContext.BcpNotifications
                .Where(n => n.UserId == userId || n.IsBroadcast);

            if (filter == "unread")
            {
                query = query.Where(n => !n.IsRead);
            }
            else if (filter == "security")
            {
                query = query.Where(n => n.Module == "Security" || n.Category == BcpMessageCategory.Security);
            }
            else if (filter == "broadcast")
            {
                query = query.Where(n => n.IsBroadcast);
            }

            var items = await query
                .OrderByDescending(n => n.CreatedAt)
                .Take(100)
                .Select(n => new NotificationDto
                {
                    Id = n.Id,
                    Title = n.Title,
                    Message = n.Message,
                    ActionUrl = n.ActionUrl,
                    IsRead = n.IsRead,
                    Module = n.Module,
                    Icon = n.Icon ?? "notifications",
                    Category = n.Category.ToString(),
                    Priority = n.Priority.ToString(),
                    IsBroadcast = n.IsBroadcast,
                    CreatedAt = n.CreatedAt
                })
                .ToListAsync();

            return Ok(ApiResponse<List<NotificationDto>>.SuccessResponse(items, "Notifications retrieved."));
        }

        /// <summary>
        /// Marks a specific notification as read.
        /// </summary>
        [HttpPut("{id:guid}/read")]
        [ProducesResponseType(typeof(ApiResponse<object>), 200)]
        public async Task<IActionResult> MarkAsRead(Guid id)
        {
            var userId = GetCurrentUserId();
            var notification = await _dbContext.BcpNotifications
                .FirstOrDefaultAsync(n => n.Id == id && (n.UserId == userId || n.IsBroadcast));

            if (notification != null)
            {
                notification.IsRead = true;
                await _dbContext.SaveChangesAsync();
            }

            return Ok(ApiResponse<object>.SuccessResponse(null, "Notification marked as read."));
        }

        /// <summary>
        /// Marks all notifications for the current user as read.
        /// </summary>
        [HttpPut("mark-all-read")]
        [ProducesResponseType(typeof(ApiResponse<object>), 200)]
        public async Task<IActionResult> MarkAllAsRead()
        {
            var userId = GetCurrentUserId();
            if (!string.IsNullOrEmpty(userId))
            {
                var unreadItems = await _dbContext.BcpNotifications
                    .Where(n => (n.UserId == userId || n.IsBroadcast) && !n.IsRead)
                    .ToListAsync();

                foreach (var item in unreadItems)
                {
                    item.IsRead = true;
                }

                await _dbContext.SaveChangesAsync();
            }

            return Ok(ApiResponse<object>.SuccessResponse(null, "All notifications marked as read."));
        }

        /// <summary>
        /// Deletes a specific notification.
        /// </summary>
        [HttpDelete("{id:guid}")]
        [ProducesResponseType(typeof(ApiResponse<object>), 200)]
        public async Task<IActionResult> DeleteNotification(Guid id)
        {
            var userId = GetCurrentUserId();
            var notification = await _dbContext.BcpNotifications
                .FirstOrDefaultAsync(n => n.Id == id && (n.UserId == userId || n.IsBroadcast));

            if (notification != null)
            {
                _dbContext.BcpNotifications.Remove(notification);
                await _dbContext.SaveChangesAsync();
            }

            return Ok(ApiResponse<object>.SuccessResponse(null, "Notification removed."));
        }

        /// <summary>
        /// Clears all notifications for the current user.
        /// </summary>
        [HttpDelete("clear-all")]
        [ProducesResponseType(typeof(ApiResponse<object>), 200)]
        public async Task<IActionResult> ClearAll()
        {
            var userId = GetCurrentUserId();
            if (!string.IsNullOrEmpty(userId))
            {
                var userNotifications = await _dbContext.BcpNotifications
                    .Where(n => n.UserId == userId)
                    .ToListAsync();

                _dbContext.BcpNotifications.RemoveRange(userNotifications);
                await _dbContext.SaveChangesAsync();
            }

            return Ok(ApiResponse<object>.SuccessResponse(null, "Notifications cleared."));
        }

        /// <summary>
        /// Admin Dispatch Studio: Sends a targeted notification to a single user, category, or all members.
        /// </summary>
        [HttpPost("dispatch")]
        [Authorize(Roles = "SuperAdmin,Admin,IdentityManager")]
        [ProducesResponseType(typeof(ApiResponse<object>), 200)]
        public async Task<IActionResult> DispatchNotification([FromBody] DispatchNotificationRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Title) || string.IsNullOrWhiteSpace(request.Message))
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Title and Message are required."));
            }

            Enum.TryParse<BcpMessagePriority>(request.Priority, true, out var priority);
            Enum.TryParse<BcpMessageCategory>(request.Category, true, out var category);

            var createdCount = 0;

            if (request.TargetType == "BroadcastAll")
            {
                // Create single broadcast notification entity
                var broadcastNotif = new BcpNotification
                {
                    UserId = null,
                    IsBroadcast = true,
                    Title = request.Title.Trim(),
                    Message = request.Message.Trim(),
                    ActionUrl = request.ActionUrl,
                    Module = request.Module ?? "Announcement",
                    Icon = request.Icon ?? "campaign",
                    Priority = priority,
                    Category = category,
                    CreatedAt = DateTime.UtcNow
                };

                _dbContext.BcpNotifications.Add(broadcastNotif);
                await _dbContext.SaveChangesAsync();
                createdCount = 1;
            }
            else if (request.TargetType == "Category")
            {
                if (!Guid.TryParse(request.TargetCategoryId, out var categoryGuid))
                {
                    return BadRequest(ApiResponse<object>.FailureResponse("Valid target category is required."));
                }

                var targetUsers = await _dbContext.Users
                    .Where(u => u.BcpUserCategoryId == categoryGuid)
                    .ToListAsync();

                foreach (var u in targetUsers)
                {
                    _dbContext.BcpNotifications.Add(new BcpNotification
                    {
                        UserId = u.Id,
                        IsBroadcast = false,
                        Title = request.Title.Trim(),
                        Message = request.Message.Trim(),
                        ActionUrl = request.ActionUrl,
                        Module = request.Module ?? "General",
                        Icon = request.Icon ?? "notifications",
                        Priority = priority,
                        Category = category,
                        CreatedAt = DateTime.UtcNow
                    });
                    createdCount++;
                }

                await _dbContext.SaveChangesAsync();
            }
            else // SingleUser
            {
                if (string.IsNullOrEmpty(request.TargetUserId))
                {
                    return BadRequest(ApiResponse<object>.FailureResponse("Target user is required."));
                }

                var targetUser = await _dbContext.Users.FindAsync(request.TargetUserId);
                if (targetUser == null)
                {
                    return NotFound(ApiResponse<object>.FailureResponse("Target user not found."));
                }

                var notif = new BcpNotification
                {
                    UserId = targetUser.Id,
                    IsBroadcast = false,
                    Title = request.Title.Trim(),
                    Message = request.Message.Trim(),
                    ActionUrl = request.ActionUrl,
                    Module = request.Module ?? "General",
                    Icon = request.Icon ?? "notifications",
                    Priority = priority,
                    Category = category,
                    CreatedAt = DateTime.UtcNow
                };

                _dbContext.BcpNotifications.Add(notif);
                await _dbContext.SaveChangesAsync();
                createdCount = 1;

                // Optional email dispatch
                if (request.SendEmailCopy && !string.IsNullOrWhiteSpace(targetUser.Email) && _emailService != null)
                {
                    try
                    {
                        await _emailService.SendSingleEmailAsync(new Ozikol_BCC.EmailServices.Postmark.Models.EmailRequest
                        {
                            To = targetUser.Email,
                            Subject = request.Title,
                            HtmlBody = $"<div style='font-family:sans-serif; padding:20px; line-height:1.6;'>" +
                                       $"<h2 style='color:#0050e5;'>{request.Title}</h2>" +
                                       $"<p>{request.Message}</p>" +
                                       $"<p style='color:#64748b; font-size:12px; margin-top:24px;'>This is an official administrative notice.</p>" +
                                       $"</div>"
                        });
                    }
                    catch { /* non-fatal email log */ }
                }
            }

            return Ok(ApiResponse<object>.SuccessResponse(new { dispatchedCount = createdCount }, "Notification dispatched successfully."));
        }
    }
}
