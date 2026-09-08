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

namespace Ozikol.Central.Areas.Centralwks.Pages.Helpdesk.Articles
{
    /// <summary>
    /// Page model for editing an existing helpdesk knowledge base article in Centralwks.
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
        /// Gets or sets the target article ID.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public Guid Id { get; set; }

        /// <summary>
        /// Gets or sets the article edit form model.
        /// </summary>
        [BindProperty]
        public ArticleEditModel Input { get; set; } = new ArticleEditModel();

        /// <summary>
        /// Input model for editing a helpdesk article.
        /// </summary>
        public class ArticleEditModel
        {
            /// <summary>Gets or sets article title.</summary>
            [Required(ErrorMessage = "Title is required.")]
            [MaxLength(200)]
            public string Title { get; set; } = string.Empty;

            /// <summary>Gets or sets URL permalink slug.</summary>
            [Required(ErrorMessage = "Permalink slug is required.")]
            [MaxLength(200)]
            public string Slug { get; set; } = string.Empty;

            /// <summary>Gets or sets parent enterprise suite code.</summary>
            [Required(ErrorMessage = "Suite code is required.")]
            [MaxLength(80)]
            public string SuiteCode { get; set; } = "suite-operations";

            /// <summary>Gets or sets optional feature code.</summary>
            [MaxLength(80)]
            public string? FeatureCode { get; set; }

            /// <summary>Gets or sets concise summary for cards and search.</summary>
            [Required(ErrorMessage = "Summary is required.")]
            [MaxLength(500)]
            public string Summary { get; set; } = string.Empty;

            /// <summary>Gets or sets rich HTML body content.</summary>
            [Required(ErrorMessage = "Article content is required.")]
            public string ContentHtml { get; set; } = string.Empty;

            /// <summary>Gets or sets category classification.</summary>
            [Required(ErrorMessage = "Category is required.")]
            [MaxLength(60)]
            public string Category { get; set; } = "Getting Started";

            /// <summary>Gets or sets language culture code.</summary>
            [Required(ErrorMessage = "Culture is required.")]
            [MaxLength(10)]
            public string Culture { get; set; } = "en";

            /// <summary>Gets or sets estimated read duration in minutes.</summary>
            public int EstimatedReadMinutes { get; set; } = 3;

            /// <summary>Gets or sets display sort order.</summary>
            public int SortOrder { get; set; } = 1;

            /// <summary>Gets or sets whether the article is published live.</summary>
            public bool IsPublished { get; set; } = true;
        }

        /// <summary>
        /// Handles HTTP GET request to load article data.
        /// </summary>
        /// <param name="id">The unique identifier of the article.</param>
        /// <returns>Page result or NotFound.</returns>
        public async Task<IActionResult> OnGetAsync(Guid id)
        {
            var article = await _context.MasterHelpdeskArticles.FindAsync(id);
            if (article == null)
            {
                return NotFound();
            }

            Id = id;
            Input = new ArticleEditModel
            {
                Title = article.Title,
                Slug = article.Slug,
                SuiteCode = article.SuiteCode,
                FeatureCode = article.FeatureCode,
                Summary = article.Summary,
                ContentHtml = article.ContentHtml,
                Category = article.Category,
                Culture = article.Culture,
                EstimatedReadMinutes = article.EstimatedReadMinutes,
                SortOrder = article.SortOrder,
                IsPublished = article.IsPublished
            };

            return Page();
        }

        /// <summary>
        /// Handles HTTP POST request to save article modifications.
        /// </summary>
        /// <param name="id">The unique identifier of the article.</param>
        /// <returns>Redirect to details or page on validation error.</returns>
        public async Task<IActionResult> OnPostAsync(Guid id)
        {
            if (!ModelState.IsValid)
            {
                return Page();
            }

            var article = await _context.MasterHelpdeskArticles.FindAsync(id);
            if (article == null)
            {
                return NotFound();
            }

            var normalizedSlug = Input.Slug.Trim().ToLowerInvariant();
            var normalizedCulture = Input.Culture.Trim().ToLowerInvariant();

            var slugExists = await _context.MasterHelpdeskArticles
                .AnyAsync(a => a.Slug == normalizedSlug && a.Culture == normalizedCulture && a.Id != id);

            if (slugExists)
            {
                ModelState.AddModelError("Input.Slug", "Another article already uses this permalink slug and language culture.");
                return Page();
            }

            article.Title = Input.Title.Trim();
            article.Slug = normalizedSlug;
            article.SuiteCode = Input.SuiteCode.Trim().ToLowerInvariant();
            article.FeatureCode = string.IsNullOrWhiteSpace(Input.FeatureCode) ? null : Input.FeatureCode.Trim().ToLowerInvariant();
            article.Summary = Input.Summary.Trim();
            article.ContentHtml = Input.ContentHtml;
            article.Category = Input.Category.Trim();
            article.Culture = normalizedCulture;
            article.EstimatedReadMinutes = Input.EstimatedReadMinutes > 0 ? Input.EstimatedReadMinutes : 3;
            article.SortOrder = Input.SortOrder;
            article.IsPublished = Input.IsPublished;
            article.UpdatedUtc = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Central operator updated helpdesk article {ArticleId} ({Title})", id, article.Title);
            TempData["StatusMessage"] = $"Helpdesk guide '{article.Title}' updated successfully.";

            return RedirectToPage("/Helpdesk/Articles/Details", new { id });
        }
    }
}
