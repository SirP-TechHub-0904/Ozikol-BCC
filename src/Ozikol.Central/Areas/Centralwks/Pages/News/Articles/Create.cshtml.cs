using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text.RegularExpressions;
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
    /// Page model for authoring and publishing new corporate articles and announcements.
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
        /// Gets or sets the form input model for article creation.
        /// </summary>
        [BindProperty]
        public ArticleInputModel Input { get; set; } = new ArticleInputModel();

        /// <summary>
        /// Gets or sets available news categories for selection.
        /// </summary>
        public IList<MasterNewsCategory> Categories { get; set; } = new List<MasterNewsCategory>();

        /// <summary>
        /// Input model for authoring news articles.
        /// </summary>
        public class ArticleInputModel
        {
            /// <summary>Gets or sets the article title.</summary>
            [Required(ErrorMessage = "Article title is required.")]
            [MaxLength(250)]
            public string Title { get; set; } = string.Empty;

            /// <summary>Gets or sets the URL permalink slug.</summary>
            [Required(ErrorMessage = "Permalink slug is required.")]
            [MaxLength(150)]
            public string Slug { get; set; } = string.Empty;

            /// <summary>Gets or sets the selected news category identifier.</summary>
            [Required(ErrorMessage = "Please select an editorial category.")]
            public Guid MasterNewsCategoryId { get; set; }

            /// <summary>Gets or sets the card excerpt or summary.</summary>
            [MaxLength(1000)]
            public string Excerpt { get; set; } = string.Empty;

            /// <summary>Gets or sets the full HTML or formatted body content.</summary>
            [Required(ErrorMessage = "Article content is required.")]
            public string ContentHtml { get; set; } = string.Empty;

            /// <summary>Gets or sets the author display name.</summary>
            [Required(ErrorMessage = "Author name is required.")]
            [MaxLength(100)]
            public string AuthorName { get; set; } = "Ozikol Editorial";

            /// <summary>Gets or sets the author professional role.</summary>
            [MaxLength(100)]
            public string AuthorRole { get; set; } = "Platform Architecture";

            /// <summary>Gets or sets estimated read time.</summary>
            [MaxLength(30)]
            public string ReadTimeText { get; set; } = "4 min read";

            /// <summary>Gets or sets whether this is a featured headline.</summary>
            public bool IsFeatured { get; set; }

            /// <summary>Gets or sets comma-separated tags.</summary>
            public string TagsInput { get; set; } = "Architecture, MultiTenant, Cloud";

            /// <summary>Gets or sets the cover gradient style class.</summary>
            public string CoverGradientClass { get; set; } = "oz-news-cover-indigo";

            /// <summary>Gets or sets whether the article is published immediately.</summary>
            public bool IsPublished { get; set; } = true;
        }

        /// <summary>
        /// Handles HTTP GET requests to present the article authoring form.
        /// </summary>
        /// <returns>A task representing asynchronous execution.</returns>
        public async Task OnGetAsync()
        {
            Categories = await _context.MasterNewsCategories
                .Where(c => c.IsActive)
                .OrderBy(c => c.SortOrder)
                .ToListAsync();

            if (Categories.Any())
            {
                Input.MasterNewsCategoryId = Categories.First().Id;
            }
        }

        /// <summary>
        /// Handles submitting the article form for insertion.
        /// </summary>
        /// <returns>Redirects to articles listing on success.</returns>
        public async Task<IActionResult> OnPostAsync()
        {
            Categories = await _context.MasterNewsCategories
                .Where(c => c.IsActive)
                .OrderBy(c => c.SortOrder)
                .ToListAsync();

            // Auto-clean slug if needed
            var cleanSlug = Regex.Replace(Input.Slug.Trim().ToLower(), @"[^a-z0-9\-]", "-").Trim('-');
            if (string.IsNullOrWhiteSpace(cleanSlug))
            {
                cleanSlug = Regex.Replace(Input.Title.Trim().ToLower(), @"[^a-z0-9\-]", "-").Trim('-');
            }
            Input.Slug = cleanSlug;

            // Check slug uniqueness
            var slugExists = await _context.MasterNewsArticles.AnyAsync(a => a.Slug == cleanSlug);
            if (slugExists)
            {
                ModelState.AddModelError("Input.Slug", "An article with this URL slug already exists. Please specify a unique slug.");
            }

            var category = await _context.MasterNewsCategories.FirstOrDefaultAsync(c => c.Id == Input.MasterNewsCategoryId);
            if (category == null)
            {
                ModelState.AddModelError("Input.MasterNewsCategoryId", "Selected category not found.");
            }

            if (!ModelState.IsValid)
            {
                return Page();
            }

            // Convert comma-separated tags to JSON array
            var tags = (Input.TagsInput ?? "")
                .Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries)
                .Select(t => t.Trim())
                .Where(t => !string.IsNullOrEmpty(t))
                .ToArray();
            var tagsJson = System.Text.Json.JsonSerializer.Serialize(tags);

            var article = new MasterNewsArticle
            {
                Id = Guid.NewGuid(),
                Title = Input.Title.Trim(),
                Slug = cleanSlug,
                MasterNewsCategoryId = category!.Id,
                CategoryKey = category.Key,
                Excerpt = Input.Excerpt.Trim(),
                ContentHtml = Input.ContentHtml.Trim(),
                AuthorName = Input.AuthorName.Trim(),
                AuthorRole = (Input.AuthorRole ?? "Platform Architecture").Trim(),
                ReadTimeText = (Input.ReadTimeText ?? "4 min read").Trim(),
                IsFeatured = Input.IsFeatured,
                IsPublished = Input.IsPublished,
                TagsJson = tagsJson,
                CoverGradientClass = Input.CoverGradientClass,
                PublishedAtUtc = DateTime.UtcNow,
                CreatedUtc = DateTime.UtcNow
            };

            _context.MasterNewsArticles.Add(article);
            await _context.SaveChangesAsync();

            _logger.LogInformation("New article '{Title}' ({Slug}) created by operator.", article.Title, article.Slug);
            TempData["StatusMessage"] = $"Article '{article.Title}' published successfully.";
            return RedirectToPage("Index");
        }
    }
}
