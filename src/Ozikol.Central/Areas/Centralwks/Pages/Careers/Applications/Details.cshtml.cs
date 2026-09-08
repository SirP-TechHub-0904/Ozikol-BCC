using System;
using System.ComponentModel.DataAnnotations;
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
    /// Page model for reviewing candidate application dossiers, reading cover letters,
    /// inspecting uploaded resumes and passports, and recording internal recruiter review notes.
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
        /// Gets or sets the candidate application entity.
        /// </summary>
        public MasterJobApplication Application { get; set; } = null!;

        /// <summary>
        /// Gets or sets the review triage form input model.
        /// </summary>
        [BindProperty]
        public ReviewTriageInput Input { get; set; } = new ReviewTriageInput();

        /// <summary>
        /// Gets or sets status notification message.
        /// </summary>
        [TempData]
        public string? StatusMessage { get; set; }

        /// <summary>
        /// Form input model for candidate evaluation and notes.
        /// </summary>
        public class ReviewTriageInput
        {
            /// <summary>Gets or sets application review stage.</summary>
            [Required(ErrorMessage = "Status is required.")]
            [MaxLength(50)]
            public string Status { get; set; } = "UnderReview";

            /// <summary>Gets or sets recruiter review notes.</summary>
            [MaxLength(2000)]
            public string? ReviewNotes { get; set; }
        }

        /// <summary>
        /// Handles HTTP GET request to load candidate profile.
        /// </summary>
        /// <param name="id">The application unique identifier.</param>
        /// <returns>Page result or NotFound.</returns>
        public async Task<IActionResult> OnGetAsync(Guid id)
        {
            var app = await _context.MasterJobApplications
                .Include(a => a.JobOpening)
                .AsNoTracking()
                .FirstOrDefaultAsync(a => a.Id == id);

            if (app == null)
            {
                return NotFound();
            }

            Application = app;
            Input = new ReviewTriageInput
            {
                Status = app.Status,
                ReviewNotes = app.ReviewNotes
            };

            return Page();
        }

        /// <summary>
        /// Handles HTTP POST request to update candidate review notes and status.
        /// </summary>
        /// <param name="id">The application unique identifier.</param>
        /// <returns>Redirect back to details on success.</returns>
        public async Task<IActionResult> OnPostUpdateReviewAsync(Guid id)
        {
            var app = await _context.MasterJobApplications
                .Include(a => a.JobOpening)
                .FirstOrDefaultAsync(a => a.Id == id);

            if (app == null)
            {
                return NotFound();
            }

            if (!ModelState.IsValid)
            {
                Application = app;
                return Page();
            }

            app.Status = Input.Status;
            app.ReviewNotes = Input.ReviewNotes?.Trim();

            await _context.SaveChangesAsync();

            _logger.LogInformation("Central operator updated review status for candidate {ApplicationId} ({Name}) to {Status}", id, app.FullName, app.Status);
            StatusMessage = $"Review status for candidate '{app.FullName}' saved.";

            return RedirectToPage(new { id });
        }

        /// <summary>
        /// Permanently deletes the candidate application record.
        /// </summary>
        /// <param name="id">The application unique identifier.</param>
        /// <returns>Redirect to applications index.</returns>
        public async Task<IActionResult> OnPostDeleteAsync(Guid id)
        {
            var app = await _context.MasterJobApplications.FindAsync(id);
            if (app != null)
            {
                _context.MasterJobApplications.Remove(app);
                await _context.SaveChangesAsync();
                _logger.LogWarning("Central operator deleted candidate record {ApplicationId} ({Name})", id, app.FullName);
            }

            TempData["StatusMessage"] = "Candidate application deleted.";
            return RedirectToPage("/Careers/Applications/Index");
        }
    }
}
