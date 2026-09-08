using System;
using System.ComponentModel.DataAnnotations;
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
    /// Page model for authoring and drafting new regulatory legal agreements, compliance policies, or privacy notices.
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
        /// Gets or sets the document form input model.
        /// </summary>
        [BindProperty]
        public DocumentInputModel Input { get; set; } = new DocumentInputModel();

        /// <summary>
        /// Input model for legal policy submission.
        /// </summary>
        public class DocumentInputModel
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
        /// Handles HTTP GET request.
        /// </summary>
        public void OnGet()
        {
        }

        /// <summary>
        /// Handles HTTP POST request to persist legal policy.
        /// </summary>
        /// <returns>Redirect to legal index or page on error.</returns>
        public async Task<IActionResult> OnPostAsync()
        {
            if (!ModelState.IsValid)
            {
                return Page();
            }

            var normalizedSlug = Input.Slug.Trim().ToLowerInvariant();
            var slugExists = await _context.MasterLegalDocuments
                .AnyAsync(d => d.Slug == normalizedSlug && d.Culture == Input.Culture.Trim().ToLowerInvariant());

            if (slugExists)
            {
                ModelState.AddModelError("Input.Slug", "A legal document with this permalink slug and language culture already exists.");
                return Page();
            }

            var doc = new MasterLegalDocument
            {
                Id = Guid.NewGuid(),
                Title = Input.Title.Trim(),
                Slug = normalizedSlug,
                Category = Input.Category.Trim(),
                Summary = Input.Summary.Trim(),
                ContentHtml = Input.ContentHtml,
                Version = Input.Version.Trim(),
                EffectiveDate = Input.EffectiveDate,
                Culture = Input.Culture.Trim().ToLowerInvariant(),
                SortOrder = Input.SortOrder,
                IsPublished = Input.IsPublished,
                CreatedUtc = DateTime.UtcNow,
                LastUpdatedUtc = DateTime.UtcNow
            };

            _context.MasterLegalDocuments.Add(doc);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Central operator created legal document {DocId} ({Title})", doc.Id, doc.Title);
            TempData["StatusMessage"] = $"Legal policy '{doc.Title}' created successfully.";

            return RedirectToPage("/Legal/Index");
        }
    }
}
