using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace Ozikol_BCC.Website.Areas.BcpWorkspace.Pages.Workspace
{
    [Authorize]
    public class NotificationsModel : PageModel
    {
        private readonly UserManager<Profile> _userManager;
        private readonly DashboardDbContext _context;

        public NotificationsModel(UserManager<Profile> userManager, DashboardDbContext context)
        {
            _userManager = userManager;
            _context = context;
        }

        public List<BcpNotification> Notifications { get; set; } = [];

        [BindProperty(SupportsGet = true)]
        public string Filter { get; set; } = "all"; // all | unread

        [TempData]
        public string? StatusMessage { get; set; }

        public async Task<IActionResult> OnGetAsync()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(userId)) return RedirectToPage("/Authenticate/Login", new { area = "BcpIdentity" });

            var query = _context.BcpNotifications
                .Where(n => n.UserId == userId || n.IsBroadcast)
                .AsQueryable();

            if (Filter == "unread")
            {
                query = query.Where(n => !n.IsRead);
            }

            Notifications = await query
                .OrderByDescending(n => n.CreatedAt)
                .Take(100)
                .ToListAsync();

            return Page();
        }

        public async Task<IActionResult> OnPostMarkAsReadAsync(Guid id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(userId)) return Unauthorized();

            var notification = await _context.BcpNotifications
                .FirstOrDefaultAsync(n => n.Id == id && (n.UserId == userId || n.IsBroadcast));

            if (notification != null && !notification.IsRead)
            {
                notification.IsRead = true;
                await _context.SaveChangesAsync();
                StatusMessage = "Notification marked as read.";
            }

            return RedirectToPage(new { filter = Filter });
        }

        public async Task<IActionResult> OnPostMarkAllAsReadAsync()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(userId)) return Unauthorized();

            var unread = await _context.BcpNotifications
                .Where(n => (n.UserId == userId || n.IsBroadcast) && !n.IsRead)
                .ToListAsync();

            if (unread.Any())
            {
                foreach (var n in unread)
                {
                    n.IsRead = true;
                }
                await _context.SaveChangesAsync();
                StatusMessage = $"Marked {unread.Count} notifications as read.";
            }
            else
            {
                StatusMessage = "No unread notifications.";
            }

            return RedirectToPage(new { filter = Filter });
        }

        public async Task<IActionResult> OnPostClearAllAsync()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(userId)) return Unauthorized();

            var allNotifications = await _context.BcpNotifications
                .Where(n => n.UserId == userId || n.IsBroadcast)
                .ToListAsync();

            _context.BcpNotifications.RemoveRange(allNotifications);

            await _context.SaveChangesAsync();
            StatusMessage = "All notifications cleared.";
            return RedirectToPage();
        }

        public async Task<IActionResult> OnPostGoAsync(Guid id)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrWhiteSpace(userId)) return Unauthorized();

            var notification = await _context.BcpNotifications
                .FirstOrDefaultAsync(n => n.Id == id && (n.UserId == userId || n.IsBroadcast));

            if (notification != null)
            {
                if (!notification.IsRead)
                {
                    notification.IsRead = true;
                    await _context.SaveChangesAsync();
                }

                if (!string.IsNullOrWhiteSpace(notification.ActionUrl))
                {
                    return Redirect(notification.ActionUrl);
                }
            }

            return RedirectToPage(new { filter = Filter });
        }
    }
}
