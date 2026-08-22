using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Persistence.EF.SQL;
using System.Security.Claims;

namespace Ozikol_BCC.Website.Controllers
{
    /// <summary>
    /// JSON API for the topbar notification bell. Returns the current user's
    /// unread notifications and supports mark-as-read and clear-all.
    /// </summary>
    [ApiController]
    [Route("api/notifications")]
    [Authorize]
    public class NotificationsApiController : ControllerBase
    {
        private readonly DashboardDbContext _db;

        public NotificationsApiController(DashboardDbContext db)
        {
            _db = db;
        }

        /// <summary>
        /// Get the latest notifications for the current user (personal + broadcast).
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> GetNotifications([FromQuery] int take = 15)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(userId)) return Unauthorized();

            var notifications = await _db.BcpNotifications
                .Where(n => (n.UserId == userId || n.IsBroadcast) && !n.IsRead)
                .OrderByDescending(n => n.CreatedAt)
                .Take(take)
                .Select(n => new
                {
                    n.Id,
                    n.Title,
                    n.Message,
                    n.Icon,
                    n.ActionUrl,
                    n.IsRead,
                    n.IsBroadcast,
                    Category = n.Category.ToString(),
                    CreatedAt = n.CreatedAt.ToString("yyyy-MM-ddTHH:mm:ssZ"),
                    TimeAgo = GetTimeAgo(n.CreatedAt)
                })
                .ToListAsync();

            var unreadCount = await _db.BcpNotifications
                .CountAsync(n => (n.UserId == userId || n.IsBroadcast) && !n.IsRead);

            return Ok(new { unreadCount, notifications });
        }

        /// <summary>
        /// Mark a single notification as read.
        /// </summary>
        [HttpPost("{id:guid}/read")]
        public async Task<IActionResult> MarkAsRead(Guid id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            var notification = await _db.BcpNotifications
                .FirstOrDefaultAsync(n => n.Id == id && (n.UserId == userId || n.IsBroadcast));

            if (notification != null)
            {
                notification.IsRead = true;
                await _db.SaveChangesAsync();
            }

            return Ok();
        }

        /// <summary>
        /// Clear/Mark all notifications as read for the current user.
        /// </summary>
        [HttpPost("read-all")]
        public async Task<IActionResult> MarkAllAsRead()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(userId)) return Unauthorized();

            var userNotifs = await _db.BcpNotifications
                .Where(n => n.UserId == userId)
                .ToListAsync();

            _db.BcpNotifications.RemoveRange(userNotifs);

            var broadcastUnread = await _db.BcpNotifications
                .Where(n => n.IsBroadcast && !n.IsRead)
                .ToListAsync();

            foreach (var n in broadcastUnread)
            {
                n.IsRead = true;
            }

            await _db.SaveChangesAsync();
            return Ok(new { cleared = userNotifs.Count + broadcastUnread.Count });
        }

        private static string GetTimeAgo(DateTime createdAt)
        {
            var span = DateTime.UtcNow - createdAt;
            if (span.TotalMinutes < 1) return "Just now";
            if (span.TotalMinutes < 60) return $"{(int)span.TotalMinutes} min ago";
            if (span.TotalHours < 24) return $"{(int)span.TotalHours}h ago";
            if (span.TotalDays < 7) return $"{(int)span.TotalDays}d ago";
            return createdAt.ToString("dd MMM yyyy");
        }
    }
}
