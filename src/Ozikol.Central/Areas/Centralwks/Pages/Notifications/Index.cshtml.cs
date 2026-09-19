using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Ozikol.Central.Services;
using Ozikol.Central.Services.Notifications;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Areas.Centralwks.Pages.Notifications
{
    /// <summary>
    /// Central Platform Notification Center orchestrating administrative alerts, system events,
    /// OneSignal push notifications, Postmark email dispatches, and full read/delete lifecycle management.
    /// </summary>
    public class IndexModel : PageModel
    {
        private readonly ICentralNotificationService _notificationService;
        private readonly MasterCatalogDbContext _context;
        private readonly UserManager<CentralUser> _userManager;
        private readonly ILogger<IndexModel> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="IndexModel"/> class.
        /// </summary>
        /// <param name="notificationService">Central notification engine.</param>
        /// <param name="context">Master catalog database context.</param>
        /// <param name="userManager">Identity user manager.</param>
        /// <param name="logger">Structured logger instance.</param>
        public IndexModel(
            ICentralNotificationService notificationService,
            MasterCatalogDbContext context,
            UserManager<CentralUser> userManager,
            ILogger<IndexModel> logger)
        {
            _notificationService = notificationService ?? throw new ArgumentNullException(nameof(notificationService));
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _userManager = userManager ?? throw new ArgumentNullException(nameof(userManager));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>Gets or sets the list of notifications.</summary>
        public IList<MasterNotification> Notifications { get; set; } = new List<MasterNotification>();

        /// <summary>Gets or sets active category filter.</summary>
        [BindProperty(SupportsGet = true)]
        public string Filter { get; set; } = "all";

        /// <summary>Gets or sets optional search term.</summary>
        [BindProperty(SupportsGet = true)]
        public string? Search { get; set; }

        /// <summary>Gets or sets total notifications count.</summary>
        public int TotalCount { get; set; }

        /// <summary>Gets or sets unread notifications count.</summary>
        public int UnreadCount { get; set; }

        /// <summary>Gets or sets status message.</summary>
        [TempData]
        public string? StatusMessage { get; set; }

        /// <summary>
        /// Handles HTTP GET request to aggregate platform notifications.
        /// </summary>
        public async Task OnGetAsync()
        {
            var userId = _userManager.GetUserId(User);
            var roles = User.Claims.Where(c => c.Type == ClaimTypes.Role).Select(c => c.Value).ToList();

            // Calculate live unread count
            UnreadCount = await _notificationService.GetUnreadCountAsync(userId, roles);

            var query = _context.MasterNotifications.AsNoTracking().AsQueryable();

            // Filter by user/role relevance
            if (!string.IsNullOrWhiteSpace(userId))
            {
                query = query.Where(n =>
                    (n.RecipientUserId == null && n.TargetRole == null) ||
                    n.RecipientUserId == userId ||
                    (n.TargetRole != null && roles.Contains(n.TargetRole)));
            }

            // Apply category filter
            if (Filter == "unread")
            {
                query = query.Where(n => !n.IsRead);
            }
            else if (!string.IsNullOrWhiteSpace(Filter) && !Filter.Equals("all", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(n => n.Category == Filter);
            }

            // Apply text search
            if (!string.IsNullOrWhiteSpace(Search))
            {
                var term = Search.Trim();
                query = query.Where(n =>
                    n.Title.Contains(term) ||
                    n.Message.Contains(term) ||
                    n.Category.Contains(term));
            }

            Notifications = await query.OrderByDescending(n => n.CreatedUtc).Take(100).ToListAsync();
            TotalCount = Notifications.Count;
        }

        /// <summary>
        /// Auto-marks notification as read and redirects user to its deep-link action URL.
        /// </summary>
        /// <param name="id">Notification unique identifier.</param>
        public async Task<IActionResult> OnGetRouteAsync(Guid id)
        {
            var notification = await _context.MasterNotifications.FirstOrDefaultAsync(n => n.Id == id);
            if (notification != null)
            {
                await _notificationService.MarkAsReadAsync(id);
                if (!string.IsNullOrWhiteSpace(notification.ActionUrl))
                {
                    return LocalRedirect(notification.ActionUrl.StartsWith("/") ? notification.ActionUrl : "/" + notification.ActionUrl);
                }
            }

            return RedirectToPage(new { filter = Filter, search = Search });
        }

        /// <summary>
        /// Handles HTTP POST to mark a single notification as read.
        /// </summary>
        /// <param name="id">Notification ID.</param>
        public async Task<IActionResult> OnPostMarkReadAsync(Guid id)
        {
            await _notificationService.MarkAsReadAsync(id);
            TempData["Success"] = "Notification marked as read.";
            return RedirectToPage(new { filter = Filter, search = Search });
        }

        /// <summary>
        /// Handles HTTP POST to mark all active notifications as read.
        /// </summary>
        public async Task<IActionResult> OnPostMarkAllReadAsync()
        {
            var userId = _userManager.GetUserId(User);
            var roles = User.Claims.Where(c => c.Type == ClaimTypes.Role).Select(c => c.Value).ToList();

            await _notificationService.MarkAllAsReadAsync(userId, roles, Filter == "all" || Filter == "unread" ? null : Filter);
            TempData["Success"] = "All matching notifications marked as read.";
            return RedirectToPage(new { filter = Filter, search = Search });
        }

        /// <summary>
        /// Handles HTTP POST to delete a single notification.
        /// </summary>
        /// <param name="id">Notification ID.</param>
        public async Task<IActionResult> OnPostDeleteAsync(Guid id)
        {
            await _notificationService.DeleteNotificationAsync(id);
            TempData["Success"] = "Notification deleted.";
            return RedirectToPage(new { filter = Filter, search = Search });
        }

        /// <summary>
        /// Handles HTTP POST to purge all read notifications.
        /// </summary>
        public async Task<IActionResult> OnPostClearAllReadAsync()
        {
            var userId = _userManager.GetUserId(User);
            var roles = User.Claims.Where(c => c.Type == ClaimTypes.Role).Select(c => c.Value).ToList();

            await _notificationService.ClearAllReadAsync(userId, roles, Filter == "all" || Filter == "unread" ? null : Filter);
            TempData["Success"] = "All read notifications cleared.";
            return RedirectToPage(new { filter = Filter, search = Search });
        }
    }
}
