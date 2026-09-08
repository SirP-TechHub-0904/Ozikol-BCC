using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Areas.Centralwks.Pages.Creators
{
    /// <summary>
    /// PageModel displaying in-depth review of a creator partner application, including proposal pitch,
    /// portfolio URL, internal review notes, and decision transition buttons.
    /// </summary>
    public class DetailsModel : PageModel
    {
        private readonly MasterCatalogDbContext _dbContext;

        /// <summary>
        /// Initializes a new instance of the <see cref="DetailsModel"/> class.
        /// </summary>
        /// <param name="dbContext">Master catalog database context.</param>
        public DetailsModel(MasterCatalogDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        /// <summary>
        /// The loaded creator application entity.
        /// </summary>
        public MasterCreatorApplication Application { get; set; } = default!;

        /// <summary>
        /// Internal review notes bound on POST.
        /// </summary>
        [BindProperty]
        public string? ReviewNotes { get; set; }

        /// <summary>
        /// Operation feedback message.
        /// </summary>
        [TempData]
        public string? StatusMessage { get; set; }

        /// <summary>
        /// Handles HTTP GET requests to load the creator application.
        /// </summary>
        /// <param name="id">Application identifier.</param>
        public async Task<IActionResult> OnGetAsync(Guid id)
        {
            var app = await _dbContext.MasterCreatorApplications.FindAsync(id);
            if (app == null)
            {
                return NotFound($"Creator application with ID {id} was not found.");
            }

            Application = app;
            ReviewNotes = app.ReviewNotes;
            return Page();
        }

        /// <summary>
        /// Approves the creator application.
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
            if (!string.IsNullOrWhiteSpace(ReviewNotes))
            {
                app.ReviewNotes = ReviewNotes.Trim();
            }

            await _dbContext.SaveChangesAsync();
            StatusMessage = $"Creator '{app.FullName}' ({app.CreatorCode}) has been officially Approved.";
            return RedirectToPage(new { id });
        }

        /// <summary>
        /// Rejects the creator application.
        /// </summary>
        /// <param name="id">Application identifier.</param>
        public async Task<IActionResult> OnPostRejectAsync(Guid id)
        {
            var app = await _dbContext.MasterCreatorApplications.FindAsync(id);
            if (app == null)
            {
                return NotFound();
            }

            app.Status = "Rejected";
            if (!string.IsNullOrWhiteSpace(ReviewNotes))
            {
                app.ReviewNotes = ReviewNotes.Trim();
            }

            await _dbContext.SaveChangesAsync();
            StatusMessage = $"Creator application for '{app.FullName}' marked as Rejected.";
            return RedirectToPage(new { id });
        }

        /// <summary>
        /// Saves updated internal review notes without changing application status.
        /// </summary>
        /// <param name="id">Application identifier.</param>
        public async Task<IActionResult> OnPostSaveNotesAsync(Guid id)
        {
            var app = await _dbContext.MasterCreatorApplications.FindAsync(id);
            if (app == null)
            {
                return NotFound();
            }

            app.ReviewNotes = ReviewNotes?.Trim();
            await _dbContext.SaveChangesAsync();

            StatusMessage = "Internal review notes saved.";
            return RedirectToPage(new { id });
        }
    }
}
