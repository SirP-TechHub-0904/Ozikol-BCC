using System;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Areas.Centralwks.Pages.Legal
{
    /// <summary>
    /// Page model for updating existing regulatory legal policy documents, terms, or SLA schedules in Centralwks.
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
        /// Gets or sets the document ID.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public Guid Id { get; set; }

        /// <summary>
        /// Gets or sets the document edit form model.
        /// </summary>
        [BindProperty]
        public DocumentEditModel Input { get; set; } = new DocumentEditModel();

        /// <summary>
        /// Input model for editing an existing legal document.
        /// </summary>
        public class DocumentEditModel
        {
            /// <summary>Gets or sets document title.</summary>
            [Required(ErrorMessage = "Title is required.")]
            [MaxLength(200)]
            public string Title { get; set; } = string.Empty;

            /// <summary>Gets or sets URL permalink slug.</summary>
            [Required(ErrorMessage = "Permalink slug is required.")]
            [MaxLength(100)]
            public string Slug { get; set; } = string.Empty;

            /// <summary>Gets or sets governance category.</summary>
            [Required(ErrorMessage = "Category is required.")]
            [MaxLength(80)]
            public string Category { get; set; } = "Privacy";

            /// <summary>Gets or sets concise summary for search and cards.</summary>
            [Required(ErrorMessage = "Summary excerpt is required.")]
            [MaxLength(500)]
            public string Summary { get; set; } = string.Empty;

            /// <summary>Gets or sets rich HTML body content.</summary>
            [Required(ErrorMessage = "Document body HTML is required.")]
            public string ContentHtml { get; set; } = string.Empty;

            /// <summary>Gets or sets formal version number.</summary>
            [Required(ErrorMessage = "Version number is required.")]
            [MaxLength(20)]
            public string Version { get; set; } = "1.0";

            /// <summary>Gets or sets legal effective date.</summary>
            public DateTime EffectiveDate { get; set; } = DateTime.UtcNow.Date;

            /// <summary>Gets or sets 2-letter ISO culture code.</summary>
            [Required(ErrorMessage = "Language culture is required.")]
            [MaxLength(10)]
            public string Culture { get; set; } = "en";

            /// <summary>Gets or sets sort order.</summary>
            public int SortOrder { get; set; } = 1;

            /// <summary>Gets or sets whether the document is published.</summary>
            public bool IsPublished { get; set; } = true;
        }

        /// <summary>
        /// Handles HTTP GET request to load existing legal policy.
        /// </summary>
        /// <param name="id">The unique identifier of the legal document.</param>
        /// <returns>Page result or NotFound.</returns>
        public async Task<IActionResult> OnGetAsync(Guid id)
        {
            var doc = await _context.MasterLegalDocuments.FindAsync(id);
            if (doc == null)
            {
                return NotFound();
            }

            Id = id;
            Input = new DocumentEditModel
            {
                Title = doc.Title,
                Slug = doc.Slug,
                Category = doc.Category,
                Summary = doc.Summary,
                ContentHtml = doc.ContentHtml,
                Version = doc.Version,
                EffectiveDate = doc.EffectiveDate,
                Culture = doc.Culture,
                SortOrder = doc.SortOrder,
                IsPublished = doc.IsPublished
            };

            return Page();
        }

        /// <summary>
        /// Handles HTTP POST request to save modifications.
        /// </summary>
        /// <param name="id">The unique identifier of the legal document.</param>
        /// <returns>Redirect to details or page on validation error.</returns>
        public async Task<IActionResult> OnPostAsync(Guid id)
        {
            if (!ModelState.IsValid)
            {
                return Page();
            }

            var doc = await _context.MasterLegalDocuments.FindAsync(id);
            if (doc == null)
            {
                return NotFound();
            }

            var normalizedSlug = Input.Slug.Trim().ToLowerInvariant();
            var normalizedCulture = Input.Culture.Trim().ToLowerInvariant();

            var slugExists = await _context.MasterLegalDocuments
                .AnyAsync(d => d.Slug == normalizedSlug && d.Culture == normalizedCulture && d.Id != id);

            if (slugExists)
            {
                ModelState.AddModelError("Input.Slug", "Another legal document already uses this permalink slug and language culture.");
                return Page();
            }

            doc.Title = Input.Title.Trim();
            doc.Slug = normalizedSlug;
            doc.Category = Input.Category.Trim();
            doc.Summary = Input.Summary.Trim();
            doc.ContentHtml = Input.ContentHtml;
            doc.Version = Input.Version.Trim();
            doc.EffectiveDate = Input.EffectiveDate;
            doc.Culture = normalizedCulture;
            doc.SortOrder = Input.SortOrder;
            doc.IsPublished = Input.IsPublished;
            doc.LastUpdatedUtc = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Central operator updated legal document {DocId} ({Title})", id, doc.Title);
            TempData["StatusMessage"] = $"Legal policy '{doc.Title}' updated successfully.";

            return RedirectToPage("/Legal/Details", new { id });
        }
    }
}
