using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
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
    /// Page model for viewing full opening specifications, responsibilities, compensation perks,
    /// and reviewing the list of candidate applicants who applied for this role.
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
        /// Gets the target job opening entity.
        /// </summary>
        public MasterJobOpening Opening { get; set; } = null!;

        /// <summary>
        /// Gets deserialized list of core responsibilities.
        /// </summary>
        public List<string> Responsibilities { get; set; } = new List<string>();

        /// <summary>
        /// Gets deserialized list of qualifications.
        /// </summary>
        public List<string> Qualifications { get; set; } = new List<string>();

        /// <summary>
        /// Gets deserialized list of role benefits.
        /// </summary>
        public List<string> Benefits { get; set; } = new List<string>();

        /// <summary>
        /// Gets the list of candidate applications submitted for this role.
        /// </summary>
        public IList<MasterJobApplication> Applications { get; set; } = new List<MasterJobApplication>();

        /// <summary>
        /// Gets or sets optional status feedback message.
        /// </summary>
        [TempData]
        public string? StatusMessage { get; set; }

        /// <summary>
        /// Handles HTTP GET request to load opening details and candidates.
        /// </summary>
        /// <param name="id">The unique identifier of the job opening.</param>
        /// <returns>Page result or NotFound.</returns>
        public async Task<IActionResult> OnGetAsync(Guid id)
        {
            var opening = await _context.MasterJobOpenings
                .Include(o => o.Applications)
                .AsNoTracking()
                .FirstOrDefaultAsync(o => o.Id == id);

            if (opening == null)
            {
                return NotFound();
            }

            Opening = opening;
            Applications = opening.Applications.OrderByDescending(a => a.SubmittedUtc).ToList();

            Responsibilities = SafeDeserializeList(opening.ResponsibilitiesJson);
            Qualifications = SafeDeserializeList(opening.QualificationsJson);
            Benefits = SafeDeserializeList(opening.BenefitsJson);

            return Page();
        }

        /// <summary>
        /// Toggles the active status of the job opening.
        /// </summary>
        /// <param name="id">The unique identifier of the job opening.</param>
        /// <returns>Redirect to details page.</returns>
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
                ? $"Position '{opening.Title}' is now actively accepting applications."
                : $"Position '{opening.Title}' recruitment is now paused.";

            _logger.LogInformation("Central operator toggled active status for opening {OpeningId} to {IsActive}", id, opening.IsActive);
            return RedirectToPage(new { id });
        }

        /// <summary>
        /// Deletes the opening and associated candidate records.
        /// </summary>
        /// <param name="id">The unique identifier of the job opening.</param>
        /// <returns>Redirect to openings index.</returns>
        public async Task<IActionResult> OnPostDeleteAsync(Guid id)
        {
            var opening = await _context.MasterJobOpenings
                .Include(o => o.Applications)
                .FirstOrDefaultAsync(o => o.Id == id);

            if (opening != null)
            {
                _context.MasterJobOpenings.Remove(opening);
                await _context.SaveChangesAsync();
                _logger.LogWarning("Central operator deleted job opening {OpeningId} ({Title})", id, opening.Title);
            }

            TempData["StatusMessage"] = "Job opening deleted successfully.";
            return RedirectToPage("/Careers/Openings/Index");
        }

        private static List<string> SafeDeserializeList(string? json)
        {
            if (string.IsNullOrWhiteSpace(json))
            {
                return new List<string>();
            }

            try
            {
                return JsonSerializer.Deserialize<List<string>>(json) ?? new List<string>();
            }
            catch
            {
                return new List<string>();
            }
        }
    }
}
