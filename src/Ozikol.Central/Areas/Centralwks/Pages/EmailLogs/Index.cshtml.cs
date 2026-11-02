using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Areas.Centralwks.Pages.EmailLogs
{
    /// <summary>
    /// Page model for viewing, filtering, paginating, purging, and auditing platform transactional emails in Centralwks.
    /// </summary>
    public class IndexModel : PageModel
    {
        private readonly MasterCatalogDbContext _context;
        private readonly Ozikol_BCC.EmailServices.Postmark.Interfaces.IPostmarkEmailService _postmarkEmailService;
        private readonly ILogger<IndexModel> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="IndexModel"/> class.
        /// </summary>
        /// <param name="context">Master catalog database context.</param>
        /// <param name="postmarkEmailService">Postmark delivery provider service.</param>
        /// <param name="logger">Structured logging service.</param>
        public IndexModel(
            MasterCatalogDbContext context,
            Ozikol_BCC.EmailServices.Postmark.Interfaces.IPostmarkEmailService postmarkEmailService,
            ILogger<IndexModel> logger)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _postmarkEmailService = postmarkEmailService ?? throw new ArgumentNullException(nameof(postmarkEmailService));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>
        /// Gets or sets the list of email delivery audit logs matching search filters and current page.
        /// </summary>
        public IList<MasterEmailLog> EmailLogs { get; set; } = new List<MasterEmailLog>();

        /// <summary>
        /// Gets or sets the search term for filtering by recipient email or subject text.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? Search { get; set; }

        /// <summary>
        /// Gets or sets the delivery status filter (All, Sent, Failed, NotSent).
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? StatusFilter { get; set; }

        /// <summary>
        /// Gets or sets the delivery provider filter (e.g. SMTP, SendGrid, AmazonSES).
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? ProviderFilter { get; set; }

        /// <summary>
        /// Gets or sets current 1-based pagination index.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public int PageIndex { get; set; } = 1;

        /// <summary>
        /// Gets or sets number of items per page.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public int PageSize { get; set; } = 20;

        /// <summary>
        /// Gets or sets total count of filtered matching logs.
        /// </summary>
        public int TotalFilteredItems { get; set; }

        /// <summary>
        /// Gets or sets total calculated pages.
        /// </summary>
        public int TotalPages { get; set; }

        /// <summary>
        /// Indicates if there is a previous page available.
        /// </summary>
        public bool HasPreviousPage => PageIndex > 1;

        /// <summary>
        /// Indicates if there is a next page available.
        /// </summary>
        public bool HasNextPage => PageIndex < TotalPages;

        /// <summary>
        /// Gets or sets the total count of logged transactional emails in system.
        /// </summary>
        public int TotalCount { get; set; }

        /// <summary>
        /// Gets or sets the count of successfully delivered emails.
        /// </summary>
        public int SentCount { get; set; }

        /// <summary>
        /// Gets or sets the count of failed email deliveries.
        /// </summary>
        public int FailedCount { get; set; }

        /// <summary>
        /// Gets or sets the count of pending or unattempted emails.
        /// </summary>
        public int PendingCount { get; set; }

        /// <summary>
        /// Gets or sets the list of distinct delivery providers present in the logs.
        /// </summary>
        public IList<string> Providers { get; set; } = new List<string>();

        /// <summary>
        /// Gets or sets user notification feedback message.
        /// </summary>
        [TempData]
        public string? StatusMessage { get; set; }

        /// <summary>
        /// Handles HTTP GET requests to query, filter, and paginate email audit logs.
        /// </summary>
        /// <returns>A task representing asynchronous execution.</returns>
        public async Task OnGetAsync()
        {
            // Normalize page bounds
            if (PageIndex < 1) PageIndex = 1;
            if (PageSize < 10) PageSize = 20;
            if (PageSize > 100) PageSize = 100;

            // Compute global delivery metrics
            TotalCount = await _context.MasterEmailLogs.CountAsync();
            SentCount = await _context.MasterEmailLogs.CountAsync(e => e.Status == "Sent");
            FailedCount = await _context.MasterEmailLogs.CountAsync(e => e.Status == "Failed");
            PendingCount = await _context.MasterEmailLogs.CountAsync(e => e.Status == "NotSent");

            Providers = await _context.MasterEmailLogs
                .Where(e => !string.IsNullOrEmpty(e.Provider))
                .Select(e => e.Provider!)
                .Distinct()
                .OrderBy(p => p)
                .ToListAsync();

            var query = _context.MasterEmailLogs.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(Search))
            {
                var term = Search.Trim().ToLower();
                query = query.Where(e => e.RecipientEmail.ToLower().Contains(term) || e.Subject.ToLower().Contains(term));
            }

            if (!string.IsNullOrWhiteSpace(StatusFilter) && StatusFilter != "All")
            {
                query = query.Where(e => e.Status == StatusFilter);
            }

            if (!string.IsNullOrWhiteSpace(ProviderFilter) && ProviderFilter != "All")
            {
                query = query.Where(e => e.Provider == ProviderFilter);
            }

            TotalFilteredItems = await query.CountAsync();
            TotalPages = (int)Math.Ceiling(TotalFilteredItems / (double)PageSize);
            if (TotalPages == 0) TotalPages = 1;

            if (PageIndex > TotalPages)
            {
                PageIndex = TotalPages;
            }

            EmailLogs = await query
                .OrderByDescending(e => e.SentAtUtc)
                .Skip((PageIndex - 1) * PageSize)
                .Take(PageSize)
                .ToListAsync();
        }

        /// <summary>
        /// Handles re-queuing or resending a failed transactional email message.
        /// </summary>
        /// <param name="id">Unique identifier of the email log to re-dispatch.</param>
        /// <returns>Redirects back to email logs page.</returns>
        public async Task<IActionResult> OnPostResendAsync(Guid id)
        {
            var log = await _context.MasterEmailLogs.FirstOrDefaultAsync(e => e.Id == id);
            if (log == null)
            {
                StatusMessage = "Error: Email log entry not found.";
                return RedirectToPage();
            }

            var retryLog = new MasterEmailLog
            {
                Id = Guid.NewGuid(),
                RecipientEmail = log.RecipientEmail,
                Subject = log.Subject,
                BodyHtml = log.BodyHtml,
                Provider = "Postmark",
                SentAtUtc = DateTime.UtcNow,
                Status = "NotSent"
            };

            try
            {
                var response = await _postmarkEmailService.SendHtmlEmailAsync(
                    to: log.RecipientEmail,
                    subject: log.Subject,
                    htmlBody: log.BodyHtml,
                    tag: "central-resend");

                if (response.Status == PostmarkDotNet.PostmarkStatus.Success)
                {
                    retryLog.Status = "Sent";
                    retryLog.ErrorMessage = null;
                    StatusMessage = $"Successfully re-transmitted email to '{log.RecipientEmail}' via Postmark.";
                }
                else
                {
                    retryLog.Status = "Failed";
                    retryLog.ErrorMessage = response.Message ?? "Postmark rejected re-transmission attempt.";
                    StatusMessage = $"Error: Re-transmission to '{log.RecipientEmail}' failed: {retryLog.ErrorMessage}";
                }
            }
            catch (Exception ex)
            {
                retryLog.Status = "Failed";
                retryLog.ErrorMessage = ex.Message;
                StatusMessage = $"Error: Re-transmission failed with exception: {ex.Message}";
            }

            _context.MasterEmailLogs.Add(retryLog);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Re-dispatched transactional email to {Recipient} with status {Status}", log.RecipientEmail, retryLog.Status);
            return RedirectToPage(new { Search, StatusFilter, ProviderFilter, PageIndex, PageSize });
        }

        /// <summary>
        /// Handles single record deletion for a specific email audit log.
        /// </summary>
        /// <param name="id">Unique log identifier to delete.</param>
        /// <returns>Redirects back to email logs page.</returns>
        public async Task<IActionResult> OnPostDeleteAsync(Guid id)
        {
            var log = await _context.MasterEmailLogs.FirstOrDefaultAsync(e => e.Id == id);
            if (log != null)
            {
                _context.MasterEmailLogs.Remove(log);
                await _context.SaveChangesAsync();
                _logger.LogInformation("Deleted email audit log entry {Id} for recipient {Recipient}", id, log.RecipientEmail);
                StatusMessage = $"Deleted email log for '{log.RecipientEmail}'.";
            }
            return RedirectToPage(new { Search, StatusFilter, ProviderFilter, PageIndex, PageSize });
        }

        /// <summary>
        /// Handles bulk purging of all queued/unsent email records (Status == 'NotSent').
        /// </summary>
        /// <returns>Redirects back to email logs page.</returns>
        public async Task<IActionResult> OnPostPurgeNotSentAsync()
        {
            var unsentLogs = await _context.MasterEmailLogs.Where(e => e.Status == "NotSent").ToListAsync();
            if (unsentLogs.Count > 0)
            {
                _context.MasterEmailLogs.RemoveRange(unsentLogs);
                await _context.SaveChangesAsync();
                _logger.LogInformation("Purged {Count} unsent/queued email log entries.", unsentLogs.Count);
                StatusMessage = $"Successfully purged {unsentLogs.Count} queued/unsent email logs.";
            }
            else
            {
                StatusMessage = "No queued/unsent email logs found to purge.";
            }

            return RedirectToPage();
        }

        /// <summary>
        /// Handles bulk purging of email audit logs older than a specified number of days.
        /// </summary>
        /// <param name="days">Threshold age in days (default 30).</param>
        /// <returns>Redirects back to email logs page.</returns>
        public async Task<IActionResult> OnPostPurgeOlderThanAsync(int days = 30)
        {
            if (days < 1) days = 30;
            var cutoff = DateTime.UtcNow.AddDays(-days);

            var oldLogs = await _context.MasterEmailLogs.Where(e => e.SentAtUtc < cutoff).ToListAsync();
            if (oldLogs.Count > 0)
            {
                _context.MasterEmailLogs.RemoveRange(oldLogs);
                await _context.SaveChangesAsync();
                _logger.LogInformation("Purged {Count} email logs older than {Days} days (before {Cutoff}).", oldLogs.Count, days, cutoff);
                StatusMessage = $"Successfully purged {oldLogs.Count} email logs older than {days} days.";
            }
            else
            {
                StatusMessage = $"No email logs older than {days} days were found.";
            }

            return RedirectToPage();
        }
    }
}
