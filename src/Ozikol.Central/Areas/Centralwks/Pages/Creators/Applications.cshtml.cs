using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Areas.Centralwks.Pages.Creators
{
    /// <summary>
    /// PageModel managing incoming creator partner applications, reviewing portfolio submissions,
    /// and executing approval or rejection status transitions.
    /// </summary>
    public class ApplicationsModel : PageModel
    {
        private readonly MasterCatalogDbContext _dbContext;

        /// <summary>
        /// Initializes a new instance of the <see cref="ApplicationsModel"/> class.
        /// </summary>
        /// <param name="dbContext">Master catalog database context.</param>
        public ApplicationsModel(MasterCatalogDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        /// <summary>
        /// Status filter for applications (UnderReview, Rejected, Approved, All).
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string Status { get; set; } = "UnderReview";

        /// <summary>
        /// Search keyword filter.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? Search { get; set; }

        /// <summary>
        /// List of retrieved creator applications.
        /// </summary>
        public List<MasterCreatorApplication> Applications { get; set; } = new();

        /// <summary>
        /// Count of applications waiting for review.
        /// </summary>
        public int PendingCount { get; set; }

        /// <summary>
        /// Count of approved applications.
        /// </summary>
        public int ApprovedCount { get; set; }

        /// <summary>
        /// Count of rejected applications.
        /// </summary>
        public int RejectedCount { get; set; }

        /// <summary>
        /// Feedback status message.
        /// </summary>
        [TempData]
        public string? StatusMessage { get; set; }

        /// <summary>
        /// Handles HTTP GET requests to query and list creator applications.
        /// </summary>
        public async Task OnGetAsync()
        {
            var baseQuery = _dbContext.MasterCreatorApplications.AsNoTracking();

            PendingCount = await baseQuery.CountAsync(a => a.Status == "UnderReview");
            ApprovedCount = await baseQuery.CountAsync(a => a.Status == "Approved");
            RejectedCount = await baseQuery.CountAsync(a => a.Status == "Rejected");

            var query = baseQuery.AsQueryable();

            if (!string.IsNullOrWhiteSpace(Status) && !Status.Equals("all", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(a => a.Status == Status);
            }

            if (!string.IsNullOrWhiteSpace(Search))
            {
                var term = Search.Trim().ToLower();
                query = query.Where(a =>
                    a.CreatorCode.ToLower().Contains(term) ||
                    a.FullName.ToLower().Contains(term) ||
                    (a.StudioOrBrandName != null && a.StudioOrBrandName.ToLower().Contains(term)) ||
                    a.Email.ToLower().Contains(term) ||
                    a.Specialization.ToLower().Contains(term));
            }

            Applications = await query
                .OrderByDescending(a => a.CreatedUtc)
                .ToListAsync();
        }

        /// <summary>
        /// Approves a creator application and marks their status as Approved.
        /// </summary>
        /// <param name="id">Application identifier.</param>
        public async Task<IActionResult> OnPostApproveAsync(Guid id)
        {
            var app = await _dbContext.MasterCreatorApplications.FindAsync(id);
            if (app == null)
            {
                return NotFound();
            }

            app.Status = "Approved";
            await _dbContext.SaveChangesAsync();

            StatusMessage = $"Application for '{app.FullName}' ({app.CreatorCode}) has been approved.";
            return RedirectToPage(new { Status });
        }

        /// <summary>
        /// Rejects a creator application with optional review notes.
        /// </summary>
        /// <param name="id">Application identifier.</param>
        /// <param name="notes">Review justification notes.</param>
        public async Task<IActionResult> OnPostRejectAsync(Guid id, string? notes = null)
        {
            var app = await _dbContext.MasterCreatorApplications.FindAsync(id);
            if (app == null)
            {
                return NotFound();
            }

            app.Status = "Rejected";
            if (!string.IsNullOrWhiteSpace(notes))
            {
                app.ReviewNotes = notes.Trim();
            }

            await _dbContext.SaveChangesAsync();

            StatusMessage = $"Application for '{app.FullName}' was marked as Rejected.";
            return RedirectToPage(new { Status });
        }
    }
}
