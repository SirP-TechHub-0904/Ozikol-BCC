using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Areas.Centralwks.Pages.Support
{
    /// <summary>
    /// Page model for inspecting full enterprise support ticket threads, client context, and posting staff specialist replies.
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
        /// Gets or sets the target support inquiry ticket entity.
        /// </summary>
        public MasterSupportInquiry Ticket { get; set; } = null!;

        /// <summary>
        /// Gets or sets the chronological conversation thread replies.
        /// </summary>
        public IList<MasterTicketReply> Replies { get; set; } = new List<MasterTicketReply>();

        /// <summary>
        /// Gets or sets the form input model for posting a new staff reply.
        /// </summary>
        [BindProperty]
        public ReplyInputModel ReplyInput { get; set; } = new ReplyInputModel();

        /// <summary>
        /// Gets or sets optional feedback message for operator actions.
        /// </summary>
        [TempData]
        public string? StatusMessage { get; set; }

        /// <summary>
        /// Input model for adding a reply to the ticket thread.
        /// </summary>
        public class ReplyInputModel
        {
            /// <summary>
            /// Gets or sets the staff specialist sender name.
            /// </summary>
            [Required(ErrorMessage = "Sender name is required.")]
            [MaxLength(120)]
            public string SenderName { get; set; } = "Ozikol Support Specialist";

            /// <summary>
            /// Gets or sets the staff sender email address.
            /// </summary>
            [Required(ErrorMessage = "Sender email is required.")]
            [EmailAddress]
            [MaxLength(150)]
            public string SenderEmail { get; set; } = "support@ozikol.com";

            /// <summary>
            /// Gets or sets the reply message body.
            /// </summary>
            [Required(ErrorMessage = "Message content is required.")]
            public string Message { get; set; } = string.Empty;

            /// <summary>
            /// Gets or sets whether to also transition the status to InProgress or Resolved upon replying.
            /// </summary>
            public string? PostReplyStatus { get; set; }
        }

        /// <summary>
        /// Handles HTTP GET requests to load ticket metadata and conversation history.
        /// </summary>
        /// <param name="id">Unique ticket GUID identifier.</param>
        /// <returns>Page result or NotFound if ticket does not exist.</returns>
        public async Task<IActionResult> OnGetAsync(Guid id)
        {
            var ticket = await _context.MasterSupportInquiries
                .Include(i => i.Replies)
                .FirstOrDefaultAsync(i => i.Id == id);

            if (ticket == null)
            {
                return NotFound();
            }

            Ticket = ticket;
            Replies = ticket.Replies.OrderBy(r => r.CreatedUtc).ToList();

            // Populate current staff user info if available
            if (User?.Identity?.IsAuthenticated == true && !string.IsNullOrEmpty(User.Identity.Name))
            {
                ReplyInput.SenderName = User.Identity.Name;
                ReplyInput.SenderEmail = User.Claims.FirstOrDefault(c => c.Type == System.Security.Claims.ClaimTypes.Email)?.Value ?? "specialist@ozikol.com";
            }

            return Page();
        }

        /// <summary>
        /// Handles posting a new staff reply message into the ticket thread.
        /// </summary>
        /// <param name="id">Unique ticket identifier.</param>
        /// <returns>Redirects back to the ticket details page.</returns>
        public async Task<IActionResult> OnPostAddReplyAsync(Guid id)
        {
            var ticket = await _context.MasterSupportInquiries
                .Include(i => i.Replies)
                .FirstOrDefaultAsync(i => i.Id == id);

            if (ticket == null)
            {
                return NotFound();
            }

            if (!ModelState.IsValid)
            {
                Ticket = ticket;
                Replies = ticket.Replies.OrderBy(r => r.CreatedUtc).ToList();
                return Page();
            }

            var reply = new MasterTicketReply
            {
                Id = Guid.NewGuid(),
                MasterSupportInquiryId = ticket.Id,
                SenderName = ReplyInput.SenderName.Trim(),
                SenderEmail = ReplyInput.SenderEmail.Trim(),
                IsStaffReply = true,
                Message = ReplyInput.Message.Trim(),
                CreatedUtc = DateTime.UtcNow
            };

            _context.MasterTicketReplies.Add(reply);

            // Update ticket activity and status
            ticket.LastActivityUtc = DateTime.UtcNow;

            if (!string.IsNullOrEmpty(ReplyInput.PostReplyStatus) && ReplyInput.PostReplyStatus != "Keep")
            {
                ticket.Status = ReplyInput.PostReplyStatus;
                if (ticket.Status == "Resolved" || ticket.Status == "Closed")
                {
                    ticket.ClosedAtUtc = DateTime.UtcNow;
                    ticket.AutoClosedReason = "Resolved with specialist reply";
                }
            }
            else if (ticket.Status == "New")
            {
                // Auto-advance new tickets to InProgress on staff reply
                ticket.Status = "InProgress";
            }

            await _context.SaveChangesAsync();
            _logger.LogInformation("Staff reply posted to ticket {ReferenceNumber} by {SenderName}", ticket.ReferenceNumber, reply.SenderName);

            StatusMessage = "Specialist response has been posted to the ticket thread.";
            return RedirectToPage(new { id = ticket.Id });
        }

        /// <summary>
        /// Handles lifecycle status changes (e.g., InProgress, Resolved, Closed, Reopened).
        /// </summary>
        /// <param name="id">Unique ticket identifier.</param>
        /// <param name="status">Target lifecycle status.</param>
        /// <returns>Redirects back to ticket details.</returns>
        public async Task<IActionResult> OnPostUpdateStatusAsync(Guid id, string status)
        {
            var ticket = await _context.MasterSupportInquiries.FirstOrDefaultAsync(i => i.Id == id);
            if (ticket == null)
            {
                return NotFound();
            }

            var validStatuses = new[] { "New", "InProgress", "Resolved", "Closed" };
            if (!validStatuses.Contains(status))
            {
                StatusMessage = "Error: Invalid status transition.";
                return RedirectToPage(new { id });
            }

            ticket.Status = status;
            ticket.LastActivityUtc = DateTime.UtcNow;

            if (status == "Resolved" || status == "Closed")
            {
                ticket.ClosedAtUtc = DateTime.UtcNow;
                ticket.AutoClosedReason = $"Status updated to {status} by operator";
            }
            else
            {
                ticket.ClosedAtUtc = null;
                ticket.AutoClosedReason = null;
            }

            await _context.SaveChangesAsync();
            _logger.LogInformation("Ticket {ReferenceNumber} status updated to {Status}", ticket.ReferenceNumber, status);

            StatusMessage = $"Ticket status updated to {status}.";
            return RedirectToPage(new { id });
        }
    }
}
