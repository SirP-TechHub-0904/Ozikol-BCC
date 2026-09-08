using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
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
    /// Page model for publishing new global job vacancies and engineering career opportunities.
    /// </summary>
    public class CreateModel : PageModel
    {
        private readonly MasterCatalogDbContext _context;
        private readonly ILogger<CreateModel> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="CreateModel"/> class.
        /// </summary>
        /// <param name="context">Master catalog database context.</param>
        /// <param name="logger">Structured logging service.</param>
        public CreateModel(MasterCatalogDbContext context, ILogger<CreateModel> logger)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>
        /// Gets or sets the form submission input model.
        /// </summary>
        [BindProperty]
        public OpeningInputModel Input { get; set; } = new OpeningInputModel();

        /// <summary>
        /// Input model for job opening creation.
        /// </summary>
        public class OpeningInputModel
        {
            /// <summary>Gets or sets position title.</summary>
            [Required(ErrorMessage = "Position title is required.")]
            [MaxLength(200)]
            public string Title { get; set; } = string.Empty;

            /// <summary>Gets or sets URL permalink slug.</summary>
            [Required(ErrorMessage = "Permalink slug is required.")]
            [MaxLength(150)]
            public string Slug { get; set; } = string.Empty;

            /// <summary>Gets or sets department.</summary>
            [Required(ErrorMessage = "Department is required.")]
            [MaxLength(100)]
            public string Department { get; set; } = "Engineering";

            /// <summary>Gets or sets location or remote description.</summary>
            [Required(ErrorMessage = "Location is required.")]
            [MaxLength(150)]
            public string Location { get; set; } = "Remote (Global)";

            /// <summary>Gets or sets employment type.</summary>
            [Required(ErrorMessage = "Employment type is required.")]
            [MaxLength(50)]
            public string EmploymentType { get; set; } = "Full-time";

            /// <summary>Gets or sets experience seniority.</summary>
            [Required(ErrorMessage = "Experience level is required.")]
            [MaxLength(50)]
            public string ExperienceLevel { get; set; } = "Senior";

            /// <summary>Gets or sets language proficiencies.</summary>
            [Required(ErrorMessage = "Language requirement is required.")]
            [MaxLength(150)]
            public string LanguageRequirements { get; set; } = "English";

            /// <summary>Gets or sets summary excerpt for directory card.</summary>
            [MaxLength(1000)]
            public string Summary { get; set; } = string.Empty;

            /// <summary>Gets or sets rich HTML job role description.</summary>
            [Required(ErrorMessage = "Job role description is required.")]
            public string DescriptionHtml { get; set; } = string.Empty;

            /// <summary>Gets or sets responsibilities list (one bullet per line).</summary>
            public string ResponsibilitiesText { get; set; } = string.Empty;

            /// <summary>Gets or sets qualifications list (one bullet per line).</summary>
            public string QualificationsText { get; set; } = string.Empty;

            /// <summary>Gets or sets benefits list (one bullet per line).</summary>
            public string BenefitsText { get; set; } = string.Empty;

            /// <summary>Gets or sets display sort order.</summary>
            public int SortOrder { get; set; } = 1;

            /// <summary>Gets or sets whether the position is actively accepting applications.</summary>
            public bool IsActive { get; set; } = true;
        }

        /// <summary>
        /// Handles HTTP GET request.
        /// </summary>
        public void OnGet()
        {
        }

        /// <summary>
        /// Handles HTTP POST request to persist new career position.
        /// </summary>
        /// <returns>Redirect to openings index on success, or page on error.</returns>
        public async Task<IActionResult> OnPostAsync()
        {
            if (!ModelState.IsValid)
            {
                return Page();
            }

            var normalizedSlug = Input.Slug.Trim().ToLowerInvariant();
            var slugExists = await _context.MasterJobOpenings.AnyAsync(o => o.Slug == normalizedSlug);
            if (slugExists)
            {
                ModelState.AddModelError("Input.Slug", "A job opening with this permalink slug already exists.");
                return Page();
            }

            // Convert bulleted lines into JSON arrays for structured API consumption
            var responsibilitiesList = (Input.ResponsibilitiesText ?? string.Empty)
                .Split(new[] { "\r\n", "\r", "\n" }, StringSplitOptions.RemoveEmptyEntries)
                .Select(s => s.Trim())
                .Where(s => !string.IsNullOrWhiteSpace(s))
                .ToList();

            var qualificationsList = (Input.QualificationsText ?? string.Empty)
                .Split(new[] { "\r\n", "\r", "\n" }, StringSplitOptions.RemoveEmptyEntries)
                .Select(s => s.Trim())
                .Where(s => !string.IsNullOrWhiteSpace(s))
                .ToList();

            var benefitsList = (Input.BenefitsText ?? string.Empty)
                .Split(new[] { "\r\n", "\r", "\n" }, StringSplitOptions.RemoveEmptyEntries)
                .Select(s => s.Trim())
                .Where(s => !string.IsNullOrWhiteSpace(s))
                .ToList();

            var opening = new MasterJobOpening
            {
                Id = Guid.NewGuid(),
                Title = Input.Title.Trim(),
                Slug = normalizedSlug,
                Department = Input.Department.Trim(),
                Location = Input.Location.Trim(),
                EmploymentType = Input.EmploymentType.Trim(),
                ExperienceLevel = Input.ExperienceLevel.Trim(),
                LanguageRequirements = Input.LanguageRequirements.Trim(),
                Summary = Input.Summary?.Trim() ?? string.Empty,
                DescriptionHtml = Input.DescriptionHtml,
                ResponsibilitiesJson = JsonSerializer.Serialize(responsibilitiesList),
                QualificationsJson = JsonSerializer.Serialize(qualificationsList),
                BenefitsJson = JsonSerializer.Serialize(benefitsList),
                SortOrder = Input.SortOrder,
                IsActive = Input.IsActive,
                CreatedUtc = DateTime.UtcNow
            };

            _context.MasterJobOpenings.Add(opening);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Central operator posted job opening {OpeningId} ({Title})", opening.Id, opening.Title);
            TempData["StatusMessage"] = $"Job opening '{opening.Title}' posted successfully.";

            return RedirectToPage("/Careers/Openings/Index");
        }
    }
}
