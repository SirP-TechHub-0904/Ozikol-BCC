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
    /// Page model for editing an existing career vacancy and role requirements in Centralwks.
    /// </summary>
    public class EditModel : PageModel
    {
        private readonly MasterCatalogDbContext _context;
        private readonly ILogger<EditModel> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="EditModel"/> class.
        /// </summary>
        /// <param name="context">Master catalog database context.</param>
        /// <param name="logger">Structured logging service.</param>
        public EditModel(MasterCatalogDbContext context, ILogger<EditModel> logger)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>
        /// Gets or sets the target opening ID.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public Guid Id { get; set; }

        /// <summary>
        /// Gets or sets the opening edit form model.
        /// </summary>
        [BindProperty]
        public OpeningEditModel Input { get; set; } = new OpeningEditModel();

        /// <summary>
        /// Input model for editing existing job openings.
        /// </summary>
        public class OpeningEditModel
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
            public string Department { get; set; } = string.Empty;

            /// <summary>Gets or sets location or remote description.</summary>
            [Required(ErrorMessage = "Location is required.")]
            [MaxLength(150)]
            public string Location { get; set; } = string.Empty;

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
        /// Handles HTTP GET request to prefill form with opening data.
        /// </summary>
        /// <param name="id">The unique identifier of the opening.</param>
        /// <returns>Page result or NotFound.</returns>
        public async Task<IActionResult> OnGetAsync(Guid id)
        {
            var opening = await _context.MasterJobOpenings.FindAsync(id);
            if (opening == null)
            {
                return NotFound();
            }

            Id = id;

            // Deserialize JSON arrays into multi-line strings
            var respList = SafeDeserializeList(opening.ResponsibilitiesJson);
            var qualList = SafeDeserializeList(opening.QualificationsJson);
            var benList = SafeDeserializeList(opening.BenefitsJson);

            Input = new OpeningEditModel
            {
                Title = opening.Title,
                Slug = opening.Slug,
                Department = opening.Department,
                Location = opening.Location,
                EmploymentType = opening.EmploymentType,
                ExperienceLevel = opening.ExperienceLevel,
                LanguageRequirements = opening.LanguageRequirements,
                Summary = opening.Summary,
                DescriptionHtml = opening.DescriptionHtml,
                ResponsibilitiesText = string.Join(Environment.NewLine, respList),
                QualificationsText = string.Join(Environment.NewLine, qualList),
                BenefitsText = string.Join(Environment.NewLine, benList),
                SortOrder = opening.SortOrder,
                IsActive = opening.IsActive
            };

            return Page();
        }

        /// <summary>
        /// Handles HTTP POST request to save modifications.
        /// </summary>
        /// <param name="id">The unique identifier of the opening.</param>
        /// <returns>Redirect to details or page on validation error.</returns>
        public async Task<IActionResult> OnPostAsync(Guid id)
        {
            if (!ModelState.IsValid)
            {
                return Page();
            }

            var opening = await _context.MasterJobOpenings.FindAsync(id);
            if (opening == null)
            {
                return NotFound();
            }

            var normalizedSlug = Input.Slug.Trim().ToLowerInvariant();
            var slugExists = await _context.MasterJobOpenings
                .AnyAsync(o => o.Slug == normalizedSlug && o.Id != id);

            if (slugExists)
            {
                ModelState.AddModelError("Input.Slug", "Another opening already uses this permalink slug.");
                return Page();
            }

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

            opening.Title = Input.Title.Trim();
            opening.Slug = normalizedSlug;
            opening.Department = Input.Department.Trim();
            opening.Location = Input.Location.Trim();
            opening.EmploymentType = Input.EmploymentType.Trim();
            opening.ExperienceLevel = Input.ExperienceLevel.Trim();
            opening.LanguageRequirements = Input.LanguageRequirements.Trim();
            opening.Summary = Input.Summary?.Trim() ?? string.Empty;
            opening.DescriptionHtml = Input.DescriptionHtml;
            opening.ResponsibilitiesJson = JsonSerializer.Serialize(responsibilitiesList);
            opening.QualificationsJson = JsonSerializer.Serialize(qualificationsList);
            opening.BenefitsJson = JsonSerializer.Serialize(benefitsList);
            opening.SortOrder = Input.SortOrder;
            opening.IsActive = Input.IsActive;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Central operator updated job opening {OpeningId} ({Title})", id, opening.Title);
            TempData["StatusMessage"] = $"Job opening '{opening.Title}' updated successfully.";

            return RedirectToPage("/Careers/Openings/Details", new { id });
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
