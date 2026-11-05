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
        /// Gets or sets aggregate total article reads / reader impressions.
        /// </summary>
        public long TotalReadCount { get; set; }

        /// <summary>
        /// Gets or sets the current 1-based page number for pagination.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public int PageNumber { get; set; } = 1;

        /// <summary>
        /// Gets or sets the page size (number of articles per page).
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public int PageSize { get; set; } = 10;

        /// <summary>
        /// Gets or sets total count of filtered articles matching query criteria.
        /// </summary>
        public int TotalFilteredCount { get; set; }

        /// <summary>
        /// Gets the total number of calculated pages.
        /// </summary>
        public int TotalPages => (int)Math.Ceiling(TotalFilteredCount / (double)Math.Max(1, PageSize));

        /// <summary>
        /// Gets whether a previous page exists.
        /// </summary>
        public bool HasPreviousPage => PageNumber > 1;

        /// <summary>
        /// Gets whether a next page exists.
        /// </summary>
        public bool HasNextPage => PageNumber < TotalPages;

        /// <summary>
        /// Gets the 1-based starting index for items shown on the current page.
        /// </summary>
        public int StartItemIndex => TotalFilteredCount == 0 ? 0 : ((PageNumber - 1) * PageSize) + 1;

        /// <summary>
        /// Gets the 1-based ending index for items shown on the current page.
        /// </summary>
        public int EndItemIndex => Math.Min(PageNumber * PageSize, TotalFilteredCount);

        /// <summary>
        /// Gets or sets feedback or notification message for user action.
        /// </summary>
        [TempData]
        public string? StatusMessage { get; set; }

        /// <summary>
        /// Handles HTTP GET requests to query and render editorial news articles with server-side pagination.
        /// </summary>
        /// <returns>A task representing asynchronous execution.</returns>
        public async Task OnGetAsync()
        {
            TotalCount = await _context.MasterNewsArticles.CountAsync();
            PublishedCount = await _context.MasterNewsArticles.CountAsync(a => a.IsPublished);
            FeaturedCount = await _context.MasterNewsArticles.CountAsync(a => a.IsFeatured);
            CategoriesCount = await _context.MasterNewsCategories.CountAsync();
            TotalReadCount = await _context.MasterNewsArticles.SumAsync(a => (long?)a.ReadCount) ?? 0;

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
                query = query.Where(a => a.CategoryKey == CategoryFilter || (a.Category != null && a.Category.Slug == CategoryFilter));
            }

            if (!string.IsNullOrWhiteSpace(PublishFilter) && PublishFilter != "All")
            {
                var isPublished = PublishFilter == "Published";
                query = query.Where(a => a.IsPublished == isPublished);
            }

            TotalFilteredCount = await query.CountAsync();

            if (PageSize < 5) PageSize = 10;
            if (PageSize > 100) PageSize = 100;

            if (PageNumber < 1)
            {
                PageNumber = 1;
            }

            if (TotalPages > 0 && PageNumber > TotalPages)
            {
                PageNumber = TotalPages;
            }

            Articles = await query
                .OrderByDescending(a => a.PublishedAtUtc)
                .Skip((PageNumber - 1) * PageSize)
                .Take(PageSize)
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
