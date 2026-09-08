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

namespace Ozikol.Central.Areas.Centralwks.Pages.Careers.Applications
{
    /// <summary>
    /// Page model for reviewing candidate job applications, filtering talent by role or review stage,
    /// and managing candidate recruitment pipelines.
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
        /// Gets or sets the list of applicant submissions.
        /// </summary>
        public IList<MasterJobApplication> Applications { get; set; } = new List<MasterJobApplication>();

        /// <summary>
        /// Gets or sets available job openings for the role filter dropdown.
        /// </summary>
        public IList<MasterJobOpening> AvailableOpenings { get; set; } = new List<MasterJobOpening>();

        /// <summary>
        /// Gets or sets total candidate applications count.
        /// </summary>
        public int TotalCount { get; set; }

        /// <summary>
        /// Gets or sets count of newly submitted applications awaiting review.
        /// </summary>
        public int SubmittedCount { get; set; }

        /// <summary>
        /// Gets or sets count of candidates currently under review.
        /// </summary>
        public int UnderReviewCount { get; set; }

        /// <summary>
        /// Gets or sets count of candidates with interviews scheduled.
        /// </summary>
        public int InterviewCount { get; set; }

        /// <summary>
        /// Gets or sets count of hired candidates.
        /// </summary>
        public int HiredCount { get; set; }

        /// <summary>
        /// Gets or sets search query for candidate name, email, or application reference code.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? Search { get; set; }

        /// <summary>
        /// Gets or sets role filter (job ID).
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public Guid? JobId { get; set; }

        /// <summary>
        /// Gets or sets review status filter (Submitted, UnderReview, InterviewScheduled, Rejected, Hired).
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? StatusFilter { get; set; }

        /// <summary>
        /// Gets or sets notification message.
        /// </summary>
        [TempData]
        public string? StatusMessage { get; set; }

        /// <summary>
        /// Handles HTTP GET request to query candidate applications.
        /// </summary>
        public async Task OnGetAsync()
        {
            // Collect recruitment pipeline metrics
            TotalCount = await _context.MasterJobApplications.CountAsync();
            SubmittedCount = await _context.MasterJobApplications.CountAsync(a => a.Status == "Submitted");
            UnderReviewCount = await _context.MasterJobApplications.CountAsync(a => a.Status == "UnderReview");
            InterviewCount = await _context.MasterJobApplications.CountAsync(a => a.Status == "InterviewScheduled");
            HiredCount = await _context.MasterJobApplications.CountAsync(a => a.Status == "Hired");

            AvailableOpenings = await _context.MasterJobOpenings
                .OrderBy(o => o.Title)
                .AsNoTracking()
                .ToListAsync();

            var query = _context.MasterJobApplications
                .Include(a => a.JobOpening)
                .AsNoTracking()
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(Search))
            {
                var term = Search.Trim().ToLowerInvariant();
                query = query.Where(a => a.FullName.ToLower().Contains(term)
                                      || a.Email.ToLower().Contains(term)
                                      || a.ApplicationReference.ToLower().Contains(term)
                                      || a.City.ToLower().Contains(term)
                                      || a.Country.ToLower().Contains(term));
            }

            if (JobId.HasValue && JobId != Guid.Empty)
            {
                query = query.Where(a => a.MasterJobOpeningId == JobId.Value);
            }

            if (!string.IsNullOrWhiteSpace(StatusFilter) && StatusFilter != "All")
            {
                query = query.Where(a => a.Status == StatusFilter);
            }

            Applications = await query
                .OrderByDescending(a => a.SubmittedUtc)
                .ToListAsync();
        }

        /// <summary>
        /// Fast-triages an applicant's review status.
        /// </summary>
        /// <param name="id">The application identifier.</param>
        /// <param name="newStatus">The updated status string.</param>
        /// <returns>Redirect back to applications list.</returns>
        public async Task<IActionResult> OnPostQuickStatusAsync(Guid id, string newStatus)
        {
            var app = await _context.MasterJobApplications.FindAsync(id);
            if (app == null)
            {
                return NotFound();
            }

            app.Status = newStatus;
            await _context.SaveChangesAsync();

            StatusMessage = $"Applicant {app.FullName} status updated to {newStatus}.";
            _logger.LogInformation("Central operator triaged applicant {ApplicationId} ({Name}) to status {Status}", id, app.FullName, newStatus);

            return RedirectToPage(new { Search, JobId, StatusFilter });
        }

        /// <summary>
        /// Deletes a candidate application record.
        /// </summary>
        /// <param name="id">The application identifier.</param>
        /// <returns>Redirect back to applications list.</returns>
        public async Task<IActionResult> OnPostDeleteAsync(Guid id)
        {
            var app = await _context.MasterJobApplications.FindAsync(id);
            if (app != null)
            {
                _context.MasterJobApplications.Remove(app);
                await _context.SaveChangesAsync();
                _logger.LogWarning("Central operator deleted applicant record {ApplicationId} ({Name})", id, app.FullName);
            }

            TempData["StatusMessage"] = "Candidate application deleted.";
            return RedirectToPage(new { Search, JobId, StatusFilter });
        }
    }
}
