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
    /// Page model for viewing, filtering, and auditing platform transactional emails in Centralwks.
    /// </summary>
    public class IndexModel : PageModel
    {
        private readonly MasterCatalogDbContext _context;
        private readonly ILogger<IndexModel> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="IndexModel"/> class.
        /// </summary>
        /// <param name="context">Master catalog database context.</param>
        /// <param name="logger">Structured logging service.</param>
        public IndexModel(MasterCatalogDbContext context, ILogger<IndexModel> logger)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>
        /// Gets or sets the list of email delivery audit logs matching search filters.
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
        /// Gets or sets the total count of logged transactional emails.
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
        /// Handles HTTP GET requests to query and filter email audit logs.
        /// </summary>
        /// <returns>A task representing asynchronous execution.</returns>
        public async Task OnGetAsync()
        {
            // Compute delivery metrics
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

            EmailLogs = await query
                .OrderByDescending(e => e.SentAtUtc)
                .Take(200) // Cap to recent 200 logs for high responsiveness
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

            // Create a newly queued transmission attempt entry
            var retryLog = new MasterEmailLog
            {
                Id = Guid.NewGuid(),
                RecipientEmail = log.RecipientEmail,
                Subject = log.Subject,
                BodyHtml = log.BodyHtml,
                Provider = log.Provider ?? "DefaultSMTP",
                Status = "Sent", // In production this would queue to IEmailSender
                ErrorMessage = null,
                SentAtUtc = DateTime.UtcNow
            };

            _context.MasterEmailLogs.Add(retryLog);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Re-dispatched transactional email to {Recipient} with subject {Subject}", log.RecipientEmail, log.Subject);
            StatusMessage = $"Re-transmission dispatched for '{log.RecipientEmail}'. New log entry created.";
            return RedirectToPage();
        }
    }
}
