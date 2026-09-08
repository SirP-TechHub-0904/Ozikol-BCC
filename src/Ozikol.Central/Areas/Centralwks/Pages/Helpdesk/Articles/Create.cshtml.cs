using System;
using System.ComponentModel.DataAnnotations;
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
    /// Page model for authoring and publishing new helpdesk knowledge base guides in Centralwks.
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
        /// Gets or sets the helpdesk article creation input model.
        /// </summary>
        [BindProperty]
        public ArticleInputModel Input { get; set; } = new ArticleInputModel();

        /// <summary>
        /// Input model for authoring a new helpdesk article.
        /// </summary>
        public class ArticleInputModel
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
        /// Handles HTTP GET request.
        /// </summary>
        public void OnGet()
        {
        }

        /// <summary>
        /// Handles HTTP POST request to persist new knowledge base article.
        /// </summary>
        /// <returns>Redirect to helpdesk articles index or page on error.</returns>
        public async Task<IActionResult> OnPostAsync()
        {
            if (!ModelState.IsValid)
            {
                return Page();
            }

            var normalizedSlug = Input.Slug.Trim().ToLowerInvariant();
            var slugExists = await _context.MasterHelpdeskArticles
                .AnyAsync(a => a.Slug == normalizedSlug && a.Culture == Input.Culture.Trim().ToLowerInvariant());

            if (slugExists)
            {
                ModelState.AddModelError("Input.Slug", "An article with this permalink slug and language culture already exists.");
                return Page();
            }

            var article = new MasterHelpdeskArticle
            {
                Id = Guid.NewGuid(),
                Title = Input.Title.Trim(),
                Slug = normalizedSlug,
                SuiteCode = Input.SuiteCode.Trim().ToLowerInvariant(),
                FeatureCode = string.IsNullOrWhiteSpace(Input.FeatureCode) ? null : Input.FeatureCode.Trim().ToLowerInvariant(),
                Summary = Input.Summary.Trim(),
                ContentHtml = Input.ContentHtml,
                Category = Input.Category.Trim(),
                Culture = Input.Culture.Trim().ToLowerInvariant(),
                EstimatedReadMinutes = Input.EstimatedReadMinutes > 0 ? Input.EstimatedReadMinutes : 3,
                SortOrder = Input.SortOrder,
                IsPublished = Input.IsPublished,
                CreatedUtc = DateTime.UtcNow,
                UpdatedUtc = DateTime.UtcNow
            };

            _context.MasterHelpdeskArticles.Add(article);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Central operator created helpdesk article {ArticleId} ({Title})", article.Id, article.Title);
            TempData["StatusMessage"] = $"Helpdesk guide '{article.Title}' published successfully.";

            return RedirectToPage("/Helpdesk/Articles/Index");
        }
    }
}
