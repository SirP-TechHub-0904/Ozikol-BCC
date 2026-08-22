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
using System.Threading.Tasks;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Website.Areas.BcpUserManagement.Pages.Console
{
    [Authorize]
    public class MessageLogsModel : PageModel
    {
        private readonly DashboardDbContext _db;
        private readonly UserManager<Profile> _userManager;

        public MessageLogsModel(DashboardDbContext db, UserManager<Profile> userManager)
        {
            _db = db;
            _userManager = userManager;
        }

        // ── Input Parameters ────────────────────────────────────────────────
        [BindProperty(SupportsGet = true)]
        public string Tab { get; set; } = "InApp";

        [BindProperty(SupportsGet = true)]
        public string? SearchQuery { get; set; }

        [BindProperty(SupportsGet = true)]
        public int PageIndex { get; set; } = 1;

        public int PageSize { get; } = 10;

        // ── Stats Counts ────────────────────────────────────────────────────
        public int TotalInAppCount { get; set; }
        public int TotalEmailCount { get; set; }
        public int TotalSmsCount { get; set; }

        // ── Paginated Log Data ──────────────────────────────────────────────
        public List<BcpNotification> InAppLogs { get; set; } = [];
        public List<BcpEmailQueue> EmailLogs { get; set; } = [];
        public List<BcpSmsQueue> SmsLogs { get; set; } = [];

        public int TotalItems { get; set; }
        public int TotalPages => (int)Math.Ceiling((double)TotalItems / PageSize);

        [TempData]
        public string? StatusMessage { get; set; }

        public async Task OnGetAsync()
        {
            // Reset index if invalid
            if (PageIndex < 1) PageIndex = 1;

            // Load overall statistics
            TotalInAppCount = await _db.BcpNotifications.CountAsync();
            TotalEmailCount = await _db.BcpEmailQueue.CountAsync();
            TotalSmsCount = await _db.BcpSmsQueue.CountAsync();

            var searchLower = SearchQuery?.Trim().ToLower();

            // Load specific logs depending on the selected tab
            if (Tab == "Email")
            {
                var query = _db.BcpEmailQueue
                    .Include(q => q.RelatedUser)
                    .AsQueryable();

                if (!string.IsNullOrWhiteSpace(searchLower))
                {
                    query = query.Where(q => 
                        q.RecipientEmail.ToLower().Contains(searchLower) ||
                        (q.RecipientName != null && q.RecipientName.ToLower().Contains(searchLower)) ||
                        q.Subject.ToLower().Contains(searchLower) ||
                        q.HtmlBody.ToLower().Contains(searchLower)
                    );
                }

                TotalItems = await query.CountAsync();
                EmailLogs = await query
                    .OrderByDescending(q => q.CreatedAt)
                    .Skip((PageIndex - 1) * PageSize)
                    .Take(PageSize)
                    .ToListAsync();
            }
            else if (Tab == "Sms")
            {
                var query = _db.BcpSmsQueue
                    .Include(q => q.RelatedUser)
                    .AsQueryable();

                if (!string.IsNullOrWhiteSpace(searchLower))
                {
                    query = query.Where(q => 
                        q.RecipientPhone.Contains(searchLower) ||
                        q.Message.ToLower().Contains(searchLower)
                    );
                }

                TotalItems = await query.CountAsync();
                SmsLogs = await query
                    .OrderByDescending(q => q.CreatedAt)
                    .Skip((PageIndex - 1) * PageSize)
                    .Take(PageSize)
                    .ToListAsync();
            }
            else // Default: InApp
            {
                var query = _db.BcpNotifications
                    .Include(n => n.User)
                    .AsQueryable();

                if (!string.IsNullOrWhiteSpace(searchLower))
                {
                    query = query.Where(n => 
                        n.Title!.ToLower().Contains(searchLower) ||
                        n.Message!.ToLower().Contains(searchLower) ||
                        (n.User != null && n.User.Email != null && n.User.Email.ToLower().Contains(searchLower)) ||
                        (n.User != null && n.User.FirstName.ToLower().Contains(searchLower)) ||
                        (n.User != null && n.User.LastName.ToLower().Contains(searchLower))
                    );
                }

                TotalItems = await query.CountAsync();
                InAppLogs = await query
                    .OrderByDescending(n => n.CreatedAt)
                    .Skip((PageIndex - 1) * PageSize)
                    .Take(PageSize)
                    .ToListAsync();
            }
        }

        public async Task<IActionResult> OnPostCleanupAsync(string logType, int days)
        {
            if (days <= 0)
            {
                StatusMessage = "Invalid duration for cleanup.";
                return RedirectToPage(new { tab = logType });
            }

            var cutoff = DateTime.UtcNow.AddDays(-days);
            int deletedCount = 0;

            if (logType == "Email")
            {
                var oldEmails = await _db.BcpEmailQueue
                    .Where(q => q.CreatedAt < cutoff)
                    .ToListAsync();

                _db.BcpEmailQueue.RemoveRange(oldEmails);
                deletedCount = oldEmails.Count;
            }
            else if (logType == "Sms")
            {
                var oldSms = await _db.BcpSmsQueue
                    .Where(q => q.CreatedAt < cutoff)
                    .ToListAsync();

                _db.BcpSmsQueue.RemoveRange(oldSms);
                deletedCount = oldSms.Count;
            }
            else // InApp
            {
                var oldNotifications = await _db.BcpNotifications
                    .Where(n => n.CreatedAt < cutoff)
                    .ToListAsync();

                _db.BcpNotifications.RemoveRange(oldNotifications);
                deletedCount = oldNotifications.Count;
            }

            if (deletedCount > 0)
            {
                await _db.SaveChangesAsync();
                StatusMessage = $"Successfully purged {deletedCount} old logs older than {days} days.";
            }
            else
            {
                StatusMessage = "No logs met the cleanup criteria.";
            }

            return RedirectToPage(new { tab = logType });
        }
    }
}
