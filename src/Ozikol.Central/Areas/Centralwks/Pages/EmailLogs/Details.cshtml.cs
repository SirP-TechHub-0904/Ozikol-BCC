using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Ozikol.Central.Services;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Areas.Centralwks.Pages.EmailLogs
{
    /// <summary>
    /// Page model for inspecting rendered transactional email content and delivery diagnostics.
    /// </summary>
    public class DetailsModel : PageModel
    {
        private readonly MasterCatalogDbContext _context;
        private readonly ICentralEmailService _emailService;
        private readonly ILogger<DetailsModel> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="DetailsModel"/> class.
        /// </summary>
        /// <param name="context">Master catalog database context.</param>
        /// <param name="emailService">Central email delivery service.</param>
        /// <param name="logger">Structured logging service.</param>
        public DetailsModel(
            MasterCatalogDbContext context,
            ICentralEmailService emailService,
            ILogger<DetailsModel> logger)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _emailService = emailService ?? throw new ArgumentNullException(nameof(emailService));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>
        /// Gets or sets the target email log record.
        /// </summary>
        public MasterEmailLog EmailLog { get; set; } = null!;

        /// <summary>
        /// Gets or sets user notification feedback message.
        /// </summary>
        [TempData]
        public string? StatusMessage { get; set; }

        /// <summary>
        /// Handles HTTP GET requests to load the email log entity.
        /// </summary>
        /// <param name="id">Unique identifier of the email log.</param>
        /// <returns>Page result or NotFound.</returns>
        public async Task<IActionResult> OnGetAsync(Guid id)
        {
            var log = await _context.MasterEmailLogs.AsNoTracking().FirstOrDefaultAsync(e => e.Id == id);
            if (log == null)
            {
                return NotFound();
            }

            EmailLog = log;
            return Page();
        }

        /// <summary>
        /// Handles re-dispatching this specific transactional email message.
        /// </summary>
        /// <param name="id">Unique identifier of the email log.</param>
        /// <returns>Redirects back to details page.</returns>
        public async Task<IActionResult> OnPostResendAsync(Guid id)
        {
            var log = await _context.MasterEmailLogs.FirstOrDefaultAsync(e => e.Id == id);
            if (log == null)
            {
                return NotFound();
            }

            var retryLog = new MasterEmailLog
            {
                Id = Guid.NewGuid(),
                RecipientEmail = log.RecipientEmail,
                Subject = log.Subject,
                BodyHtml = log.BodyHtml,
                Provider = "Mailcow",
                SentAtUtc = DateTime.UtcNow,
                Status = "NotSent"
            };

            try
            {
                var success = await _emailService.SendEmailAsync(
                    toEmail: log.RecipientEmail,
                    subject: log.Subject,
                    htmlBody: log.BodyHtml);

                if (success)
                {
                    retryLog.Status = "Sent";
                    retryLog.ErrorMessage = null;
                    StatusMessage = $"Successfully re-transmitted email to '{log.RecipientEmail}'.";
                }
                else
                {
                    retryLog.Status = "Failed";
                    retryLog.ErrorMessage = "Central email service failed to dispatch re-transmission.";
                    StatusMessage = $"Error: Re-transmission failed: {retryLog.ErrorMessage}";
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

            _logger.LogInformation("Re-dispatched email to {Recipient} from log details view with status {Status}.", log.RecipientEmail, retryLog.Status);
            return RedirectToPage(new { id = retryLog.Id });
        }
    }
}
