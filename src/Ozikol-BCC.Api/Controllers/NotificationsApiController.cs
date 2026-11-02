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
using Ozikol_BCC.Application.Dtos.NotifyDtos;
using Ozikol_BCC.Application.Interfaces.Services;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Api.Controllers
{
    /// <summary>
    /// Multi-channel notifications API controller. Manages real-time feeds, badge counts,
    /// read/unread states, and multi-channel administrative dispatches across in-app, push,
    /// email, SMS, and WhatsApp channels with canonical 6-tier severities.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Route("api/Notifications")]
    [Authorize]
    [Tags("10. In-App Notifications & Alerts Engine")]
    public class NotificationsApiController : ControllerBase
    {
        private readonly DashboardDbContext _dbContext;
        private readonly UserManager<Profile> _userManager;
        private readonly ICentralNotificationDispatcher _notificationDispatcher;

        /// <summary>
        /// Initializes a new instance of the <see cref="NotificationsApiController"/> class.
        /// </summary>
        /// <param name="dbContext">Database context for the tenant.</param>
        /// <param name="userManager">Identity user manager.</param>
        /// <param name="notificationDispatcher">Central multi-channel notification dispatcher.</param>
        public NotificationsApiController(
            DashboardDbContext dbContext,
            UserManager<Profile> userManager,
            ICentralNotificationDispatcher notificationDispatcher)
        {
            _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
            _userManager = userManager ?? throw new ArgumentNullException(nameof(userManager));
            _notificationDispatcher = notificationDispatcher ?? throw new ArgumentNullException(nameof(notificationDispatcher));
        }

        private string? GetCurrentUserId()
        {
            return User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        }

        /// <summary>
        /// Data transfer model representing a notification item returned to client apps.
        /// </summary>
        public class NotificationDto
        {
            /// <summary>Unique notification identifier.</summary>
            public Guid Id { get; set; }

            /// <summary>Title or headline.</summary>
            public string? Title { get; set; }

            /// <summary>Detailed message content.</summary>
            public string? Message { get; set; }

            /// <summary>Action redirection route.</summary>
            public string? ActionUrl { get; set; }

            /// <summary>Read state indicator.</summary>
            public bool IsRead { get; set; }

            /// <summary>Originating module or feature.</summary>
            public string? Module { get; set; }

            /// <summary>Icon identifier.</summary>
            public string? Icon { get; set; }

            /// <summary>Message category name.</summary>
            public string Category { get; set; } = "General";

            /// <summary>Message priority level name.</summary>
            public string Priority { get; set; } = "Normal";

            /// <summary>Canonical 6-tier severity name (Error, Failed, Success, NewFeature, Update, Maintenance).</summary>
            public string Severity { get; set; } = "Update";

            /// <summary>Numeric severity code (1 to 6).</summary>
            public int SeverityCode { get; set; } = 5;

            /// <summary>Hex color token matching the severity tier for consistent UI styling.</summary>
            public string SeverityColor { get; set; } = "#1F6BFF";

            /// <summary>Icon identifier matching the severity tier.</summary>
            public string SeverityIcon { get; set; } = "info_outline";

            /// <summary>Optional structured JSON metadata.</summary>
            public string? MetadataJson { get; set; }

            /// <summary>Whether this is a system-wide broadcast announcement.</summary>
            public bool IsBroadcast { get; set; }

            /// <summary>Creation timestamp (UTC).</summary>
            public DateTime CreatedAt { get; set; }
        }

        /// <summary>
        /// Real-time topbar feed response containing unread counter and latest items.
        /// </summary>
        public class NotificationFeedResponse
        {
            /// <summary>Count of unread notifications for the active user.</summary>
            public int UnreadCount { get; set; }

            /// <summary>List of the latest notifications.</summary>
            public List<NotificationDto> Items { get; set; } = new();
        }

        /// <summary>
        /// Request model for dispatching notifications across one or more delivery channels.
        /// </summary>
        public class DispatchNotificationRequest
        {
            /// <summary>Audience target: "SingleUser", "Category", or "BroadcastAll".</summary>
            public string TargetType { get; set; } = "SingleUser";

            /// <summary>Recipient user profile ID (required for SingleUser).</summary>
            public string? TargetUserId { get; set; }

            /// <summary>Target category GUID (required for Category).</summary>
            public string? TargetCategoryId { get; set; }

            /// <summary>Title or headline of the alert.</summary>
            public string Title { get; set; } = string.Empty;

            /// <summary>Message body of the alert.</summary>
            public string Message { get; set; } = string.Empty;

            /// <summary>Optional action redirection route.</summary>
            public string? ActionUrl { get; set; }

            /// <summary>Originating module or capability.</summary>
            public string? Module { get; set; } = "General";

            /// <summary>Material Symbols icon identifier.</summary>
            public string? Icon { get; set; }

            /// <summary>Priority level: Low, Normal, High, Urgent.</summary>
            public string Priority { get; set; } = "Normal";

            /// <summary>Category name: General, Security, Account, etc.</summary>
            public string Category { get; set; } = "General";

            /// <summary>Canonical 6-tier severity: Error, Failed, Success, NewFeature, Update, Maintenance.</summary>
            public string Severity { get; set; } = "Update";

            /// <summary>Dispatch in-app notification feed item (default true).</summary>
            public bool SendInApp { get; set; } = true;

            /// <summary>Dispatch native push notification to mobile and desktop apps.</summary>
            public bool SendPush { get; set; } = false;

            /// <summary>Dispatch transactional email via Postmark.</summary>
            public bool SendEmailCopy { get; set; } = false;

            /// <summary>Dispatch direct SMS text alert via carrier gateway.</summary>
            public bool SendSms { get; set; } = false;

            /// <summary>Dispatch transactional WhatsApp alert.</summary>
            public bool SendWhatsApp { get; set; } = false;

            /// <summary>Optional structured JSON metadata.</summary>
            public string? MetadataJson { get; set; }

            /// <summary>Optional in-app title override.</summary>
            public string? InAppTitle { get; set; }

            /// <summary>Optional in-app message body override.</summary>
            public string? InAppBody { get; set; }

            /// <summary>Optional push lock-screen title override (max 50 chars).</summary>
            public string? PushTitle { get; set; }

            /// <summary>Optional push lock-screen body override (max 140 chars).</summary>
            public string? PushBody { get; set; }

            /// <summary>Optional email subject line override.</summary>
            public string? EmailSubject { get; set; }

            /// <summary>Optional custom rich HTML email body.</summary>
            public string? EmailHtmlBody { get; set; }

            /// <summary>Optional plain-text SMS message (strictly 160 GSM chars).</summary>
            public string? SmsMessage { get; set; }

            /// <summary>Optional WhatsApp markdown message (*bold*, _italic_).</summary>
            public string? WhatsAppMessage { get; set; }

            /// <summary>Optional system event type name (e.g. "LoginOtp", "SystemAnnouncement") to auto-render channel templates.</summary>
            public string? EventType { get; set; }

            /// <summary>Optional dynamic token placeholders dictionary for template rendering.</summary>
            public Dictionary<string, string>? Placeholders { get; set; }
        }

        /// <summary>
        /// Retrieves the real-time notification feed and unread count for topbar bell dropdowns across Web and Mobile.
        /// </summary>
        /// <returns>Feed response containing unread count and latest 10 items.</returns>
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
                    Severity = n.Severity.ToString(),
                    SeverityCode = (int)n.Severity,
                    SeverityColor = BcpNotificationDto.GetColorForSeverity(n.Severity),
                    SeverityIcon = BcpNotificationDto.GetDefaultIconForSeverity(n.Severity),
                    MetadataJson = n.MetadataJson,
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
        /// Retrieves a paginated or filtered list of notifications for the dedicated Notification Center.
        /// </summary>
        /// <param name="filter">Optional filter ("unread", "security", "broadcast", "severity:Error", etc.).</param>
        /// <returns>List of matching notification items.</returns>
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

            if (!string.IsNullOrWhiteSpace(filter))
            {
                var lower = filter.Trim().ToLowerInvariant();
                if (lower == "unread")
                {
                    query = query.Where(n => !n.IsRead);
                }
                else if (lower == "broadcast")
                {
                    query = query.Where(n => n.IsBroadcast);
                }
                else if (lower == "security")
                {
                    query = query.Where(n => (n.Module != null && n.Module.ToLower().Contains("security")) || n.Category == BcpMessageCategory.Security);
                }
                else if (lower.StartsWith("severity:"))
                {
                    var sevStr = lower.Substring("severity:".Length);
                    if (Enum.TryParse<NotificationSeverity>(sevStr, true, out var sev))
                    {
                        query = query.Where(n => n.Severity == sev);
                    }
                }
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
                    Severity = n.Severity.ToString(),
                    SeverityCode = (int)n.Severity,
                    SeverityColor = BcpNotificationDto.GetColorForSeverity(n.Severity),
                    SeverityIcon = BcpNotificationDto.GetDefaultIconForSeverity(n.Severity),
                    MetadataJson = n.MetadataJson,
                    IsBroadcast = n.IsBroadcast,
                    CreatedAt = n.CreatedAt
                })
                .ToListAsync();

            return Ok(ApiResponse<List<NotificationDto>>.SuccessResponse(items, "List retrieved."));
        }

        /// <summary>
        /// Marks a specific notification as read.
        /// </summary>
        /// <param name="id">Notification GUID.</param>
        /// <returns>Success response.</returns>
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
        /// <returns>Success response.</returns>
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
        /// <param name="id">Notification GUID.</param>
        /// <returns>Success response.</returns>
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
        /// <returns>Success response.</returns>
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
        /// Admin Dispatch Studio: Sends a targeted notification to a single user, category, or all members
        /// through the central multi-channel notification engine (In-App, Push, Email, SMS, WhatsApp).
        /// </summary>
        /// <param name="request">Dispatch request containing audience, content, severity, and selected channels.</param>
        /// <returns>Multi-channel delivery metrics and diagnostic status.</returns>
        [HttpPost("dispatch")]
        [Authorize(Roles = "SuperAdmin,Admin,IdentityManager,Identity Manager,UserManager,User Manager,GlobalEditor,Global Editor")]
        [ProducesResponseType(typeof(ApiResponse<object>), 200)]
        public async Task<IActionResult> DispatchNotification([FromBody] DispatchNotificationRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Title) || string.IsNullOrWhiteSpace(request.Message))
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Title and Message are required."));
            }

            Enum.TryParse<BcpMessagePriority>(request.Priority, true, out var priority);
            Enum.TryParse<BcpMessageCategory>(request.Category, true, out var category);
            if (!Enum.TryParse<NotificationSeverity>(request.Severity, true, out var severity))
            {
                severity = NotificationSeverity.Update;
            }

            var channels = NotificationChannels.None;
            if (request.SendInApp) channels |= NotificationChannels.InApp;
            if (request.SendPush) channels |= NotificationChannels.Push;
            if (request.SendEmailCopy) channels |= NotificationChannels.Email;
            if (request.SendSms) channels |= NotificationChannels.Sms;
            if (request.SendWhatsApp) channels |= NotificationChannels.WhatsApp;

            // Default to InApp if no specific channel was activated
            if (channels == NotificationChannels.None)
            {
                channels = NotificationChannels.InApp;
            }

            NotificationDispatchTarget targetType;
            Guid? categoryGuid = null;

            if (request.TargetType.Equals("BroadcastAll", StringComparison.OrdinalIgnoreCase))
            {
                targetType = NotificationDispatchTarget.BroadcastAll;
            }
            else if (request.TargetType.Equals("Category", StringComparison.OrdinalIgnoreCase))
            {
                targetType = NotificationDispatchTarget.Category;
                if (!Guid.TryParse(request.TargetCategoryId, out var parsedCategoryGuid))
                {
                    return BadRequest(ApiResponse<object>.FailureResponse("Valid target category ID is required."));
                }
                categoryGuid = parsedCategoryGuid;
            }
            else
            {
                targetType = NotificationDispatchTarget.SingleUser;
                if (string.IsNullOrWhiteSpace(request.TargetUserId))
                {
                    return BadRequest(ApiResponse<object>.FailureResponse("Target user ID is required for SingleUser dispatch."));
                }
            }

            var tenantKey = Request.Headers["X-Tenant-Key"].ToString();

            BcpEventType? eventType = null;
            if (!string.IsNullOrWhiteSpace(request.EventType) && Enum.TryParse<BcpEventType>(request.EventType, true, out var parsedEvt))
            {
                eventType = parsedEvt;
            }

            var payload = new NotificationDispatchPayload
            {
                TargetType = targetType,
                TargetUserId = request.TargetUserId,
                TargetCategoryId = categoryGuid,
                TenantKey = tenantKey,
                Title = request.Title.Trim(),
                Message = request.Message.Trim(),
                Severity = severity,
                Channels = channels,
                ActionUrl = request.ActionUrl,
                Module = request.Module ?? "General",
                Icon = request.Icon,
                Category = category,
                Priority = priority,
                MetadataJson = request.MetadataJson,
                SendEmailCopy = request.SendEmailCopy,
                EventType = eventType,
                Placeholders = request.Placeholders,
                InAppTitle = request.InAppTitle,
                InAppBody = request.InAppBody,
                PushTitle = request.PushTitle,
                PushBody = request.PushBody,
                EmailSubject = request.EmailSubject,
                EmailHtmlBody = request.EmailHtmlBody,
                SmsMessage = request.SmsMessage,
                WhatsAppMessage = request.WhatsAppMessage
            };

            var dispatchResult = await _notificationDispatcher.DispatchAsync(payload);

            if (!dispatchResult.Success && dispatchResult.Errors.Count > 0)
            {
                return BadRequest(ApiResponse<object>.FailureResponse(string.Join("; ", dispatchResult.Errors)));
            }

            return Ok(ApiResponse<object>.SuccessResponse(new
            {
                inAppDispatched = dispatchResult.DispatchedInAppCount,
                pushDispatched = dispatchResult.DispatchedPushCount,
                emailDispatched = dispatchResult.DispatchedEmailCount,
                smsDispatched = dispatchResult.DispatchedSmsCount,
                whatsAppDispatched = dispatchResult.DispatchedWhatsAppCount,
                warnings = dispatchResult.Errors
            }, "Notification dispatched successfully across requested delivery channels."));
        }
    }
}
