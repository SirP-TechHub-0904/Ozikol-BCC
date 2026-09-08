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

namespace Ozikol.Central.Areas.Centralwks.Pages.Careers.Openings
{
    /// <summary>
    /// Page model for managing employment positions, job openings, and candidate hiring pipelines in Centralwks.
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
        /// View model representing a job opening row with calculated candidate metrics.
        /// </summary>
        public class JobOpeningRowViewModel
        {
            /// <summary>Gets or sets the opening ID.</summary>
            public Guid Id { get; set; }

            /// <summary>Gets or sets the job title.</summary>
            public string Title { get; set; } = string.Empty;

            /// <summary>Gets or sets the URL slug.</summary>
            public string Slug { get; set; } = string.Empty;

            /// <summary>Gets or sets organizational department.</summary>
            public string Department { get; set; } = string.Empty;

            /// <summary>Gets or sets location or remote flag.</summary>
            public string Location { get; set; } = string.Empty;

            /// <summary>Gets or sets employment type.</summary>
            public string EmploymentType { get; set; } = string.Empty;

            /// <summary>Gets or sets experience seniority.</summary>
            public string ExperienceLevel { get; set; } = string.Empty;

            /// <summary>Gets or sets whether the job is active.</summary>
            public bool IsActive { get; set; }

            /// <summary>Gets or sets display sort order.</summary>
            public int SortOrder { get; set; }

            /// <summary>Gets or sets the creation date.</summary>
            public DateTime CreatedUtc { get; set; }

            /// <summary>Gets or sets total applicant submissions.</summary>
            public int TotalApplications { get; set; }

            /// <summary>Gets or sets count of pending/submitted applications.</summary>
            public int PendingApplications { get; set; }
        }

        /// <summary>
        /// Gets or sets the list of matching job openings.
        /// </summary>
        public IList<JobOpeningRowViewModel> Openings { get; set; } = new List<JobOpeningRowViewModel>();

        /// <summary>
        /// Gets or sets available departments for filtering.
        /// </summary>
        public IList<string> Departments { get; set; } = new List<string>();

        /// <summary>
        /// Gets or sets total opening count.
        /// </summary>
        public int TotalOpeningsCount { get; set; }

        /// <summary>
        /// Gets or sets active openings count.
        /// </summary>
        public int ActiveOpeningsCount { get; set; }

        /// <summary>
        /// Gets or sets total candidate applications across all roles.
        /// </summary>
        public int TotalCandidateCount { get; set; }

        /// <summary>
        /// Gets or sets search query.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? Search { get; set; }

        /// <summary>
        /// Gets or sets department filter.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? DepartmentFilter { get; set; }

        /// <summary>
        /// Gets or sets status filter (All, Active, Inactive).
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? StatusFilter { get; set; }

        /// <summary>
        /// Gets or sets notification message.
        /// </summary>
        [TempData]
        public string? StatusMessage { get; set; }

        /// <summary>
        /// Handles HTTP GET request to query and display career openings with metrics.
        /// </summary>
        public async Task OnGetAsync()
        {
            // Collect overall platform recruitment statistics
            TotalOpeningsCount = await _context.MasterJobOpenings.CountAsync();
            ActiveOpeningsCount = await _context.MasterJobOpenings.CountAsync(o => o.IsActive);
            TotalCandidateCount = await _context.MasterJobApplications.CountAsync();

            // Extract distinct departments for filter options
            Departments = await _context.MasterJobOpenings
                .Select(o => o.Department)
                .Distinct()
                .OrderBy(d => d)
                .ToListAsync();

            var query = _context.MasterJobOpenings
                .Include(o => o.Applications)
                .AsNoTracking()
                .AsQueryable();

            // Apply search term on title, department, location
            if (!string.IsNullOrWhiteSpace(Search))
            {
                var term = Search.Trim().ToLowerInvariant();
                query = query.Where(o => o.Title.ToLower().Contains(term)
                                      || o.Department.ToLower().Contains(term)
                                      || o.Location.ToLower().Contains(term));
            }

            // Apply department filter
            if (!string.IsNullOrWhiteSpace(DepartmentFilter) && DepartmentFilter != "All")
            {
                query = query.Where(o => o.Department == DepartmentFilter);
            }

            // Apply active status filter
            if (!string.IsNullOrWhiteSpace(StatusFilter))
            {
                if (StatusFilter.Equals("Active", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(o => o.IsActive);
                }
                else if (StatusFilter.Equals("Inactive", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(o => !o.IsActive);
                }
            }

            Openings = await query
                .OrderBy(o => o.SortOrder)
                .ThenByDescending(o => o.CreatedUtc)
                .Select(o => new JobOpeningRowViewModel
                {
                    Id = o.Id,
                    Title = o.Title,
                    Slug = o.Slug,
                    Department = o.Department,
                    Location = o.Location,
                    EmploymentType = o.EmploymentType,
                    ExperienceLevel = o.ExperienceLevel,
                    IsActive = o.IsActive,
                    SortOrder = o.SortOrder,
                    CreatedUtc = o.CreatedUtc,
                    TotalApplications = o.Applications.Count,
                    PendingApplications = o.Applications.Count(a => a.Status == "Submitted")
                })
                .ToListAsync();
        }

        /// <summary>
        /// Toggles the active recruitment status of an opening.
        /// </summary>
        /// <param name="id">The opening identifier.</param>
        /// <returns>Redirect back to index.</returns>
        public async Task<IActionResult> OnPostToggleActiveAsync(Guid id)
        {
            var opening = await _context.MasterJobOpenings.FindAsync(id);
            if (opening == null)
            {
                return NotFound();
            }

            opening.IsActive = !opening.IsActive;
            await _context.SaveChangesAsync();

            StatusMessage = opening.IsActive
                ? $"Job opening '{opening.Title}' is now actively accepting applications."
                : $"Job opening '{opening.Title}' is now paused (inactive).";

            _logger.LogInformation("Central operator toggled job opening {OpeningId} active status to {IsActive}", id, opening.IsActive);
            return RedirectToPage();
        }

        /// <summary>
        /// Deletes a job opening and its associated candidate applications.
        /// </summary>
        /// <param name="id">The opening identifier.</param>
        /// <returns>Redirect back to index.</returns>
        public async Task<IActionResult> OnPostDeleteAsync(Guid id)
        {
            var opening = await _context.MasterJobOpenings
                .Include(o => o.Applications)
                .FirstOrDefaultAsync(o => o.Id == id);

            if (opening == null)
            {
                return NotFound();
            }

            _context.MasterJobOpenings.Remove(opening);
            await _context.SaveChangesAsync();

            StatusMessage = $"Job opening '{opening.Title}' deleted.";
            _logger.LogWarning("Central operator deleted job opening {OpeningId} ({Title})", id, opening.Title);
            return RedirectToPage();
        }
    }
}
