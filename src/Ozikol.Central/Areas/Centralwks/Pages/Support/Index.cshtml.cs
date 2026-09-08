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

namespace Ozikol.Central.Areas.Centralwks.Pages.Support
{
    /// <summary>
    /// Page model for managing enterprise support inquiries, customer helpdesk tickets, and support triage in Centralwks.
    /// </summary>
    public class IndexModel : PageModel
    {
        private readonly MasterCatalogDbContext _context;
        private readonly ILogger<IndexModel> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="IndexModel"/> class.
        /// </summary>
        /// <param name="context">Master catalog database context for querying support tickets.</param>
        /// <param name="logger">Structured logging service.</param>
        public IndexModel(MasterCatalogDbContext context, ILogger<IndexModel> logger)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>
        /// Gets or sets the collection of support tickets matching current search and filter criteria.
        /// </summary>
        public IList<SupportInquiryItemViewModel> Inquiries { get; set; } = new List<SupportInquiryItemViewModel>();

        /// <summary>
        /// Gets or sets the search term for filtering by reference code, name, email, or subject.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? Search { get; set; }

        /// <summary>
        /// Gets or sets the operational lifecycle status filter (e.g., All, New, InProgress, Resolved, Closed).
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? StatusFilter { get; set; }

        /// <summary>
        /// Gets or sets the inquiry category type filter (e.g., All, Sales, Support, Partnership, Billing, General).
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? InquiryTypeFilter { get; set; }

        /// <summary>
        /// Gets or sets the culture/language filter.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? CultureFilter { get; set; }

        /// <summary>
        /// Gets or sets the total count of tickets recorded across the platform.
        /// </summary>
        public int TotalCount { get; set; }

        /// <summary>
        /// Gets or sets the count of new tickets awaiting initial triage.
        /// </summary>
        public int NewCount { get; set; }

        /// <summary>
        /// Gets or sets the count of tickets actively in progress.
        /// </summary>
        public int InProgressCount { get; set; }

        /// <summary>
        /// Gets or sets the count of resolved tickets.
        /// </summary>
        public int ResolvedCount { get; set; }

        /// <summary>
        /// Gets or sets the count of closed tickets.
        /// </summary>
        public int ClosedCount { get; set; }

        /// <summary>
        /// Gets or sets optional feedback or notification message for user action.
        /// </summary>
        [TempData]
        public string? StatusMessage { get; set; }

        /// <summary>
        /// Lightweight projection model for displaying support inquiry listings.
        /// </summary>
        public class SupportInquiryItemViewModel
        {
            /// <summary>Gets or sets the primary key identifier.</summary>
            public Guid Id { get; set; }

            /// <summary>Gets or sets the tracking reference number.</summary>
            public string ReferenceNumber { get; set; } = string.Empty;

            /// <summary>Gets or sets the inquirer's full name.</summary>
            public string FullName { get; set; } = string.Empty;

            /// <summary>Gets or sets the contact email address.</summary>
            public string Email { get; set; } = string.Empty;

            /// <summary>Gets or sets the inquirer's company or institution.</summary>
            public string Organization { get; set; } = string.Empty;

            /// <summary>Gets or sets the inquiry classification category.</summary>
            public string InquiryType { get; set; } = string.Empty;

            /// <summary>Gets or sets the subject title.</summary>
            public string Subject { get; set; } = string.Empty;

            /// <summary>Gets or sets the ISO culture code.</summary>
            public string Culture { get; set; } = string.Empty;

            /// <summary>Gets or sets the current lifecycle status.</summary>
            public string Status { get; set; } = string.Empty;

            /// <summary>Gets or sets the ticket creation timestamp in UTC.</summary>
            public DateTime CreatedUtc { get; set; }

            /// <summary>Gets or sets the timestamp of the latest activity in UTC.</summary>
            public DateTime LastActivityUtc { get; set; }

            /// <summary>Gets or sets the count of replies posted to this ticket thread.</summary>
            public int ReplyCount { get; set; }
        }

        /// <summary>
        /// Handles HTTP GET requests to query, filter, and display the support inquiry tickets.
        /// </summary>
        /// <returns>A task representing asynchronous execution.</returns>
        public async Task OnGetAsync()
        {
            // Compute global metric counts for quick triage summary
            TotalCount = await _context.MasterSupportInquiries.CountAsync();
            NewCount = await _context.MasterSupportInquiries.CountAsync(i => i.Status == "New");
            InProgressCount = await _context.MasterSupportInquiries.CountAsync(i => i.Status == "InProgress");
            ResolvedCount = await _context.MasterSupportInquiries.CountAsync(i => i.Status == "Resolved");
            ClosedCount = await _context.MasterSupportInquiries.CountAsync(i => i.Status == "Closed");

            // Build dynamic query
            var query = _context.MasterSupportInquiries.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(Search))
            {
                var term = Search.Trim().ToLower();
                query = query.Where(i => i.ReferenceNumber.ToLower().Contains(term)
                    || i.FullName.ToLower().Contains(term)
                    || i.Email.ToLower().Contains(term)
                    || i.Organization.ToLower().Contains(term)
                    || i.Subject.ToLower().Contains(term));
            }

            if (!string.IsNullOrWhiteSpace(StatusFilter) && StatusFilter != "All")
            {
                query = query.Where(i => i.Status == StatusFilter);
            }

            if (!string.IsNullOrWhiteSpace(InquiryTypeFilter) && InquiryTypeFilter != "All")
            {
                query = query.Where(i => i.InquiryType == InquiryTypeFilter);
            }

            if (!string.IsNullOrWhiteSpace(CultureFilter) && CultureFilter != "All")
            {
                query = query.Where(i => i.Culture == CultureFilter);
            }

            // Project results ordered by LastActivityUtc descending to prioritize active issues
            Inquiries = await query
                .OrderByDescending(i => i.LastActivityUtc)
                .Select(i => new SupportInquiryItemViewModel
                {
                    Id = i.Id,
                    ReferenceNumber = i.ReferenceNumber,
                    FullName = i.FullName,
                    Email = i.Email,
                    Organization = i.Organization,
                    InquiryType = i.InquiryType,
                    Subject = i.Subject,
                    Culture = i.Culture,
                    Status = i.Status,
                    CreatedUtc = i.CreatedUtc,
                    LastActivityUtc = i.LastActivityUtc,
                    ReplyCount = i.Replies.Count
                })
                .ToListAsync();
        }

        /// <summary>
        /// Handles quick resolution of a support inquiry from the dashboard listing.
        /// </summary>
        /// <param name="id">Unique identifier of the ticket to resolve.</param>
        /// <returns>Redirects back to the support ticket index.</returns>
        public async Task<IActionResult> OnPostQuickResolveAsync(Guid id)
        {
            var ticket = await _context.MasterSupportInquiries.FirstOrDefaultAsync(i => i.Id == id);
            if (ticket == null)
            {
                StatusMessage = "Error: Ticket not found.";
                return RedirectToPage();
            }

            ticket.Status = "Resolved";
            ticket.ClosedAtUtc = DateTime.UtcNow;
            ticket.LastActivityUtc = DateTime.UtcNow;
            ticket.AutoClosedReason = "Marked resolved by central operator";

            await _context.SaveChangesAsync();
            _logger.LogInformation("Support ticket {ReferenceNumber} resolved by operator.", ticket.ReferenceNumber);

            StatusMessage = $"Ticket {ticket.ReferenceNumber} has been marked as Resolved.";
            return RedirectToPage();
        }

        /// <summary>
        /// Handles quick closure of an inactive or concluded ticket.
        /// </summary>
        /// <param name="id">Unique identifier of the ticket to close.</param>
        /// <returns>Redirects back to the support ticket index.</returns>
        public async Task<IActionResult> OnPostCloseAsync(Guid id)
        {
            var ticket = await _context.MasterSupportInquiries.FirstOrDefaultAsync(i => i.Id == id);
            if (ticket == null)
            {
                StatusMessage = "Error: Ticket not found.";
                return RedirectToPage();
            }

            ticket.Status = "Closed";
            ticket.ClosedAtUtc = DateTime.UtcNow;
            ticket.LastActivityUtc = DateTime.UtcNow;
            ticket.AutoClosedReason = "Closed by central operator";

            await _context.SaveChangesAsync();
            _logger.LogInformation("Support ticket {ReferenceNumber} closed by operator.", ticket.ReferenceNumber);

            StatusMessage = $"Ticket {ticket.ReferenceNumber} has been closed.";
            return RedirectToPage();
        }
    }
}
