using System;
using System.ComponentModel.DataAnnotations;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.Extensions.Logging;
using Ozikol.Central.Services.Support;
using Ozikol.MasterDomain.Models;

namespace Ozikol.Central.Pages.Support
{
    /// <summary>
    /// Page model for the public customer support ticket tracking, discussion thread, and reply portal.
    /// Allows customers to look up tickets by reference number, view specialist updates, post follow-up replies,
    /// and resolve/close tickets.
    /// </summary>
    public class TicketModel : PageModel
    {
        private readonly ISupportService _supportService;
        private readonly ILogger<TicketModel> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="TicketModel"/> class.
        /// </summary>
        /// <param name="supportService">Support service providing ticket querying and reply management.</param>
        /// <param name="logger">System logger instance.</param>
        public TicketModel(ISupportService supportService, ILogger<TicketModel> logger)
        {
            _supportService = supportService ?? throw new ArgumentNullException(nameof(supportService));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>
        /// Gets or sets the tracking reference number from the route or search query (e.g. OZK-SUP-20260905-XXXX).
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? ReferenceNumber { get; set; }

        /// <summary>
        /// Gets or sets the retrieved support inquiry and conversation thread.
        /// </summary>
        public MasterSupportInquiry? Inquiry { get; set; }

        /// <summary>
        /// Gets a value indicating whether a valid ticket was found.
        /// </summary>
        public bool TicketFound => Inquiry != null;

        /// <summary>
        /// Gets or sets the search reference code input when looking up a ticket without a route param.
        /// </summary>
        [BindProperty]
        public string? SearchReference { get; set; }

        /// <summary>
        /// Gets or sets the reply message content submitted by the customer.
        /// </summary>
        [BindProperty]
        [Required(ErrorMessage = "Please enter your reply message.")]
        public string ReplyMessage { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the sender display name for the reply.
        /// </summary>
        [BindProperty]
        [Required(ErrorMessage = "Please enter your name.")]
        public string ReplySenderName { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the sender email address for the reply.
        /// </summary>
        [BindProperty]
        [Required(ErrorMessage = "Please enter your email address.")]
        [EmailAddress(ErrorMessage = "Please enter a valid email address.")]
        public string ReplySenderEmail { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the optional closure note when resolving a ticket.
        /// </summary>
        [BindProperty]
        public string? CloseReason { get; set; }

        /// <summary>
        /// Gets or sets an operational error alert message.
        /// </summary>
        [TempData]
        public string? ErrorMessage { get; set; }

        /// <summary>
        /// Gets or sets a success confirmation banner message.
        /// </summary>
        [TempData]
        public string? SuccessMessage { get; set; }

        /// <summary>
        /// Handles HTTP GET requests. Evaluates 24-hour inactivity ticket auto-close rules,
        /// and loads the requested ticket if a reference number is specified.
        /// </summary>
        /// <param name="referenceNumber">Optional ticket reference number from the route.</param>
        /// <returns>A page result rendering the ticket thread or search view.</returns>
        public async Task<IActionResult> OnGetAsync(string? referenceNumber)
        {
            // Execute automated 24-hour inactivity ticket auto-close sweep
            try
            {
                await _supportService.AutoCloseInactiveTicketsAsync();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Background inactivity auto-close sweep encountered a notice during GET");
            }

            var activeRef = !string.IsNullOrWhiteSpace(referenceNumber) ? referenceNumber : ReferenceNumber;

            if (!string.IsNullOrWhiteSpace(activeRef))
            {
                Inquiry = await _supportService.GetInquiryByReferenceAsync(activeRef);
                if (Inquiry != null)
                {
                    ReplySenderName = Inquiry.FullName;
                    ReplySenderEmail = Inquiry.Email;
                }
            }

            return Page();
        }

        /// <summary>
        /// Handles searching for a ticket using the lookup reference input.
        /// </summary>
        /// <returns>Redirects to the specific ticket route or reloads with an error.</returns>
        public IActionResult OnPostSearch()
        {
            if (string.IsNullOrWhiteSpace(SearchReference))
            {
                ErrorMessage = "Please enter a valid ticket reference number (e.g. OZK-SUP-20260905-XXXX).";
                return RedirectToPage();
            }

            return RedirectToPage(new { referenceNumber = SearchReference.Trim().ToUpperInvariant() });
        }

        /// <summary>
        /// Submits a customer reply message to the conversation thread, updates ticket activity,
        /// and dispatches notifications to the support staff pool.
        /// </summary>
        /// <param name="referenceNumber">The target ticket reference number.</param>
        /// <returns>Redirects to the refreshed ticket thread view.</returns>
        public async Task<IActionResult> OnPostReplyAsync(string referenceNumber)
        {
            if (string.IsNullOrWhiteSpace(referenceNumber))
            {
                ErrorMessage = "Ticket reference number is missing.";
                return RedirectToPage();
            }

            Inquiry = await _supportService.GetInquiryByReferenceAsync(referenceNumber);
            if (Inquiry == null)
            {
                ErrorMessage = $"Support ticket '{referenceNumber}' could not be located.";
                return RedirectToPage();
            }

            if (string.IsNullOrWhiteSpace(ReplyMessage))
            {
                ErrorMessage = "Please enter a message before submitting your reply.";
                return Page();
            }

            var senderName = !string.IsNullOrWhiteSpace(ReplySenderName) ? ReplySenderName.Trim() : Inquiry.FullName;
            var senderEmail = !string.IsNullOrWhiteSpace(ReplySenderEmail) ? ReplySenderEmail.Trim() : Inquiry.Email;

            await _supportService.AddTicketReplyAsync(
                Inquiry.Id,
                senderName,
                senderEmail,
                ReplyMessage.Trim(),
                isStaff: false);

            SuccessMessage = "Your reply has been posted. Our support engineering team has been notified.";
            return RedirectToPage(new { referenceNumber });
        }

        /// <summary>
        /// Resolves and closes a ticket at the customer's request.
        /// </summary>
        /// <param name="referenceNumber">The target ticket reference number.</param>
        /// <returns>Redirects to the refreshed ticket view.</returns>
        public async Task<IActionResult> OnPostCloseAsync(string referenceNumber)
        {
            if (string.IsNullOrWhiteSpace(referenceNumber))
            {
                ErrorMessage = "Ticket reference number is missing.";
                return RedirectToPage();
            }

            Inquiry = await _supportService.GetInquiryByReferenceAsync(referenceNumber);
            if (Inquiry == null)
            {
                ErrorMessage = $"Support ticket '{referenceNumber}' was not found.";
                return RedirectToPage();
            }

            var reason = !string.IsNullOrWhiteSpace(CloseReason)
                ? CloseReason.Trim()
                : "Resolved by customer via Support Ticket Portal.";

            await _supportService.CloseTicketAsync(Inquiry.Id, reason);

            SuccessMessage = "Ticket marked as resolved and closed. Thank you for using Ozikol Support.";
            return RedirectToPage(new { referenceNumber });
        }
    }
}
