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

namespace Ozikol.Central.Areas.Centralwks.Pages.News.Articles
{
    /// <summary>
    /// Page model for managing official company news, announcements, release notes, and blog posts in Centralwks.
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
        /// Gets or sets the list of news articles matching active filter criteria.
        /// </summary>
        public IList<MasterNewsArticle> Articles { get; set; } = new List<MasterNewsArticle>();

        /// <summary>
        /// Gets or sets the active news editorial categories for filtering.
        /// </summary>
        public IList<MasterNewsCategory> Categories { get; set; } = new List<MasterNewsCategory>();

        /// <summary>
        /// Gets or sets search query for title, excerpt, and author.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? Search { get; set; }

        /// <summary>
        /// Gets or sets the category filter slug or key.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? CategoryFilter { get; set; }

        /// <summary>
        /// Gets or sets the publication status filter (All, Published, Draft).
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? PublishFilter { get; set; }

        /// <summary>
        /// Gets or sets total articles count.
        /// </summary>
        public int TotalCount { get; set; }

        /// <summary>
        /// Gets or sets published articles count.
        /// </summary>
        public int PublishedCount { get; set; }

        /// <summary>
        /// Gets or sets featured headline articles count.
        /// </summary>
        public int FeaturedCount { get; set; }

        /// <summary>
        /// Gets or sets total categories count.
        /// </summary>
        public int CategoriesCount { get; set; }

        /// <summary>
        /// Gets or sets feedback or notification message for user action.
        /// </summary>
        [TempData]
        public string? StatusMessage { get; set; }

        /// <summary>
        /// Handles HTTP GET requests to query and render editorial news articles.
        /// </summary>
        /// <returns>A task representing asynchronous execution.</returns>
        public async Task OnGetAsync()
        {
            TotalCount = await _context.MasterNewsArticles.CountAsync();
            PublishedCount = await _context.MasterNewsArticles.CountAsync(a => a.IsPublished);
            FeaturedCount = await _context.MasterNewsArticles.CountAsync(a => a.IsFeatured);
            CategoriesCount = await _context.MasterNewsCategories.CountAsync();

            Categories = await _context.MasterNewsCategories
                .AsNoTracking()
                .OrderBy(c => c.SortOrder)
                .ToListAsync();

            var query = _context.MasterNewsArticles
                .Include(a => a.Category)
                .AsNoTracking()
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(Search))
            {
                var term = Search.Trim().ToLower();
                query = query.Where(a => a.Title.ToLower().Contains(term)
                    || a.Excerpt.ToLower().Contains(term)
                    || a.AuthorName.ToLower().Contains(term)
                    || a.Slug.ToLower().Contains(term));
            }

            if (!string.IsNullOrWhiteSpace(CategoryFilter) && CategoryFilter != "All")
            {
                query = query.Where(a => a.CategoryKey == CategoryFilter || a.Category.Slug == CategoryFilter);
            }

            if (!string.IsNullOrWhiteSpace(PublishFilter) && PublishFilter != "All")
            {
                var isPublished = PublishFilter == "Published";
                query = query.Where(a => a.IsPublished == isPublished);
            }

            Articles = await query
                .OrderByDescending(a => a.PublishedAtUtc)
                .ToListAsync();
        }

        /// <summary>
        /// Handles toggling the published status of an article.
        /// </summary>
        /// <param name="id">Unique article identifier.</param>
        /// <returns>Redirects back to the articles list.</returns>
        public async Task<IActionResult> OnPostTogglePublishAsync(Guid id)
        {
            var article = await _context.MasterNewsArticles.FirstOrDefaultAsync(a => a.Id == id);
            if (article == null)
            {
                StatusMessage = "Error: Article not found.";
                return RedirectToPage();
            }

            article.IsPublished = !article.IsPublished;
            await _context.SaveChangesAsync();

            _logger.LogInformation("Article {Slug} publish state set to {IsPublished}", article.Slug, article.IsPublished);
            StatusMessage = $"Article '{article.Title}' publication status updated to {(article.IsPublished ? "Published" : "Draft")}.";
            return RedirectToPage();
        }

        /// <summary>
        /// Handles toggling the featured headline status of an article.
        /// </summary>
        /// <param name="id">Unique article identifier.</param>
        /// <returns>Redirects back to the articles list.</returns>
        public async Task<IActionResult> OnPostToggleFeaturedAsync(Guid id)
        {
            var article = await _context.MasterNewsArticles.FirstOrDefaultAsync(a => a.Id == id);
            if (article == null)
            {
                StatusMessage = "Error: Article not found.";
                return RedirectToPage();
            }

            article.IsFeatured = !article.IsFeatured;
            await _context.SaveChangesAsync();

            _logger.LogInformation("Article {Slug} featured state set to {IsFeatured}", article.Slug, article.IsFeatured);
            StatusMessage = $"Article '{article.Title}' is now {(article.IsFeatured ? "marked as Featured" : "unmarked as Featured")}.";
            return RedirectToPage();
        }

        /// <summary>
        /// Handles permanently deleting an article.
        /// </summary>
        /// <param name="id">Unique article identifier.</param>
        /// <returns>Redirects back to the articles list.</returns>
        public async Task<IActionResult> OnPostDeleteAsync(Guid id)
        {
            var article = await _context.MasterNewsArticles.FirstOrDefaultAsync(a => a.Id == id);
            if (article == null)
            {
                StatusMessage = "Error: Article not found.";
                return RedirectToPage();
            }

            _context.MasterNewsArticles.Remove(article);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Article {Slug} deleted by operator.", article.Slug);
            StatusMessage = $"Article '{article.Title}' has been permanently deleted.";
            return RedirectToPage();
        }
    }
}
