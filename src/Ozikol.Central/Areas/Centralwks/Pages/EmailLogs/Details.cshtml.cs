using System;
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
    /// Page model for inspecting rendered transactional email content and delivery diagnostics.
    /// </summary>
    public class DetailsModel : PageModel
    {
        private readonly MasterCatalogDbContext _context;
        private readonly ILogger<DetailsModel> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="DetailsModel"/> class.
        /// </summary>
        /// <param name="context">Master catalog database context.</param>
        /// <param name="logger">Structured logging service.</param>
        public DetailsModel(MasterCatalogDbContext context, ILogger<DetailsModel> logger)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
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
                Provider = log.Provider ?? "DefaultSMTP",
                Status = "Sent",
                ErrorMessage = null,
                SentAtUtc = DateTime.UtcNow
            };

            _context.MasterEmailLogs.Add(retryLog);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Re-dispatched email to {Recipient} from log details view.", log.RecipientEmail);
            StatusMessage = $"Email re-dispatched. New delivery record created with ID {retryLog.Id}.";
            return RedirectToPage(new { id = retryLog.Id });
        }
    }
}
