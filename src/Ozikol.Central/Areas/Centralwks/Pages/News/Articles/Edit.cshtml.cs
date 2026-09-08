using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Areas.Centralwks.Pages.News.Articles
{
    /// <summary>
    /// Page model for updating existing corporate news articles and release notes in Centralwks.
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
        /// Gets or sets the article edit form model.
        /// </summary>
        [BindProperty]
        public ArticleEditModel Input { get; set; } = new ArticleEditModel();

        /// <summary>
        /// Gets or sets available news categories for selection.
        /// </summary>
        public IList<MasterNewsCategory> Categories { get; set; } = new List<MasterNewsCategory>();

        /// <summary>
        /// Gets or sets the original article ID.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public Guid Id { get; set; }

        /// <summary>
        /// Input model for editing existing news articles.
        /// </summary>
        public class ArticleEditModel
        {
            /// <summary>Gets or sets the article title.</summary>
            [Required(ErrorMessage = "Article title is required.")]
            [MaxLength(250)]
            public string Title { get; set; } = string.Empty;

            /// <summary>Gets or sets the URL permalink slug.</summary>
            [Required(ErrorMessage = "Permalink slug is required.")]
            [MaxLength(150)]
            public string Slug { get; set; } = string.Empty;

            /// <summary>Gets or sets the parent category identifier.</summary>
            [Required(ErrorMessage = "Please select a category.")]
            public Guid MasterNewsCategoryId { get; set; }

            /// <summary>Gets or sets the article excerpt summary.</summary>
            [MaxLength(1000)]
            public string Excerpt { get; set; } = string.Empty;

            /// <summary>Gets or sets the full rich HTML body content.</summary>
            [Required(ErrorMessage = "Article content is required.")]
            public string ContentHtml { get; set; } = string.Empty;

            /// <summary>Gets or sets the author display name.</summary>
            [Required(ErrorMessage = "Author name is required.")]
            [MaxLength(100)]
            public string AuthorName { get; set; } = "Ozikol Editorial";

            /// <summary>Gets or sets the author professional role or group.</summary>
            [MaxLength(100)]
            public string AuthorRole { get; set; } = "Platform Architecture";

            /// <summary>Gets or sets the read time estimate text.</summary>
            [MaxLength(30)]
            public string ReadTimeText { get; set; } = "4 min read";

            /// <summary>Gets or sets the cover gradient style class.</summary>
            [MaxLength(50)]
            public string CoverGradientClass { get; set; } = "oz-news-cover-indigo";

            /// <summary>Gets or sets topic tags (comma-separated or JSON).</summary>
            [MaxLength(500)]
            public string Tags { get; set; } = string.Empty;

            /// <summary>Gets or sets whether this is highlighted as featured.</summary>
            public bool IsFeatured { get; set; }

            /// <summary>Gets or sets whether the article is published live.</summary>
            public bool IsPublished { get; set; } = true;

            /// <summary>Gets or sets the scheduled publication date in UTC.</summary>
            public DateTime PublishedAtUtc { get; set; } = DateTime.UtcNow;
        }

        /// <summary>
        /// Handles HTTP GET request to populate the edit form with existing article data.
        /// </summary>
        /// <param name="id">The unique identifier of the article.</param>
        /// <returns>Page result or NotFound.</returns>
        public async Task<IActionResult> OnGetAsync(Guid id)
        {
            var article = await _context.MasterNewsArticles.FindAsync(id);
            if (article == null)
            {
                return NotFound();
            }

            Id = id;
            Categories = await _context.MasterNewsCategories
                .Where(c => c.IsActive)
                .OrderBy(c => c.SortOrder)
                .AsNoTracking()
                .ToListAsync();

            Input = new ArticleEditModel
            {
                Title = article.Title,
                Slug = article.Slug,
                MasterNewsCategoryId = article.MasterNewsCategoryId,
                Excerpt = article.Excerpt,
                ContentHtml = article.ContentHtml,
                AuthorName = article.AuthorName,
                AuthorRole = article.AuthorRole,
                ReadTimeText = article.ReadTimeText,
                CoverGradientClass = article.CoverGradientClass,
                Tags = article.TagsJson,
                IsFeatured = article.IsFeatured,
                IsPublished = article.IsPublished,
                PublishedAtUtc = article.PublishedAtUtc
            };

            return Page();
        }

        /// <summary>
        /// Handles HTTP POST request to save modifications to the news article.
        /// </summary>
        /// <param name="id">The unique identifier of the article.</param>
        /// <returns>Redirect to Details page or re-renders form on error.</returns>
        public async Task<IActionResult> OnPostAsync(Guid id)
        {
            Categories = await _context.MasterNewsCategories
                .Where(c => c.IsActive)
                .OrderBy(c => c.SortOrder)
                .AsNoTracking()
                .ToListAsync();

            if (!ModelState.IsValid)
            {
                return Page();
            }

            var article = await _context.MasterNewsArticles.FindAsync(id);
            if (article == null)
            {
                return NotFound();
            }

            // Verify slug uniqueness against other articles
            var normalizedSlug = Input.Slug.Trim().ToLowerInvariant();
            var slugExists = await _context.MasterNewsArticles
                .AnyAsync(a => a.Slug == normalizedSlug && a.Id != id);

            if (slugExists)
            {
                ModelState.AddModelError("Input.Slug", "This permalink slug is already taken by another article.");
                return Page();
            }

            // Resolve parent category
            var category = await _context.MasterNewsCategories.FindAsync(Input.MasterNewsCategoryId);
            if (category == null)
            {
                ModelState.AddModelError("Input.MasterNewsCategoryId", "Selected category does not exist.");
                return Page();
            }

            article.Title = Input.Title.Trim();
            article.Slug = normalizedSlug;
            article.MasterNewsCategoryId = category.Id;
            article.CategoryKey = category.Key;
            article.Excerpt = Input.Excerpt?.Trim() ?? string.Empty;
            article.ContentHtml = Input.ContentHtml;
            article.AuthorName = Input.AuthorName.Trim();
            article.AuthorRole = Input.AuthorRole?.Trim() ?? string.Empty;
            article.ReadTimeText = Input.ReadTimeText?.Trim() ?? "4 min read";
            article.CoverGradientClass = Input.CoverGradientClass?.Trim() ?? "oz-news-cover-indigo";
            article.TagsJson = string.IsNullOrWhiteSpace(Input.Tags) ? "[]" : Input.Tags.Trim();
            article.IsFeatured = Input.IsFeatured;
            article.IsPublished = Input.IsPublished;
            article.PublishedAtUtc = Input.PublishedAtUtc;

            await _context.SaveChangesAsync();
            _logger.LogInformation("Central operator updated news article {ArticleId} ({Title})", id, article.Title);

            TempData["StatusMessage"] = $"Article '{article.Title}' updated successfully.";
            return RedirectToPage("/News/Articles/Details", new { id });
        }
    }
}
