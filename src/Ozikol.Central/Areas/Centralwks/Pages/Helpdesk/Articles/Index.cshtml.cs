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

namespace Ozikol.Central.Areas.Centralwks.Pages.Helpdesk.Articles
{
    /// <summary>
    /// Page model for managing dynamic knowledge base and helpdesk guides in Centralwks.
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
        /// Gets or sets the list of helpdesk articles.
        /// </summary>
        public IList<MasterHelpdeskArticle> Articles { get; set; } = new List<MasterHelpdeskArticle>();

        /// <summary>
        /// Gets or sets available enterprise suite codes.
        /// </summary>
        public IList<string> Suites { get; set; } = new List<string>();

        /// <summary>
        /// Gets or sets available article categories.
        /// </summary>
        public IList<string> Categories { get; set; } = new List<string>();

        /// <summary>
        /// Gets or sets available culture languages.
        /// </summary>
        public IList<string> Cultures { get; set; } = new List<string>();

        /// <summary>
        /// Gets or sets total articles count.
        /// </summary>
        public int TotalCount { get; set; }

        /// <summary>
        /// Gets or sets published articles count.
        /// </summary>
        public int PublishedCount { get; set; }

        /// <summary>
        /// Gets or sets total reader views across all articles.
        /// </summary>
        public int TotalViews { get; set; }

        /// <summary>
        /// Gets or sets total helpful feedback upvotes.
        /// </summary>
        public int TotalHelpfulVotes { get; set; }

        /// <summary>
        /// Gets or sets search query for title, slug, summary, or suite.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? Search { get; set; }

        /// <summary>
        /// Gets or sets suite filter.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? SuiteFilter { get; set; }

        /// <summary>
        /// Gets or sets category filter.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? CategoryFilter { get; set; }

        /// <summary>
        /// Gets or sets culture language filter.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? CultureFilter { get; set; }

        /// <summary>
        /// Gets or sets status notification message.
        /// </summary>
        [TempData]
        public string? StatusMessage { get; set; }

        /// <summary>
        /// Handles HTTP GET request to list knowledge base articles.
        /// </summary>
        public async Task OnGetAsync()
        {
            TotalCount = await _context.MasterHelpdeskArticles.CountAsync();
            PublishedCount = await _context.MasterHelpdeskArticles.CountAsync(a => a.IsPublished);
            TotalViews = await _context.MasterHelpdeskArticles.SumAsync(a => (int?)a.ViewCount) ?? 0;
            TotalHelpfulVotes = await _context.MasterHelpdeskArticles.SumAsync(a => (int?)a.HelpfulCount) ?? 0;

            Suites = await _context.MasterHelpdeskArticles
                .Select(a => a.SuiteCode)
                .Distinct()
                .OrderBy(s => s)
                .ToListAsync();

            Categories = await _context.MasterHelpdeskArticles
                .Select(a => a.Category)
                .Distinct()
                .OrderBy(c => c)
                .ToListAsync();

            Cultures = await _context.MasterHelpdeskArticles
                .Select(a => a.Culture)
                .Distinct()
                .OrderBy(c => c)
                .ToListAsync();

            var query = _context.MasterHelpdeskArticles
                .AsNoTracking()
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(Search))
            {
                var term = Search.Trim().ToLowerInvariant();
                query = query.Where(a => a.Title.ToLower().Contains(term)
                                      || a.Slug.ToLower().Contains(term)
                                      || a.Summary.ToLower().Contains(term)
                                      || a.SuiteCode.ToLower().Contains(term));
            }

            if (!string.IsNullOrWhiteSpace(SuiteFilter) && SuiteFilter != "All")
            {
                query = query.Where(a => a.SuiteCode == SuiteFilter);
            }

            if (!string.IsNullOrWhiteSpace(CategoryFilter) && CategoryFilter != "All")
            {
                query = query.Where(a => a.Category == CategoryFilter);
            }

            if (!string.IsNullOrWhiteSpace(CultureFilter) && CultureFilter != "All")
            {
                query = query.Where(a => a.Culture == CultureFilter);
            }

            Articles = await query
                .OrderBy(a => a.SuiteCode)
                .ThenBy(a => a.SortOrder)
                .ThenBy(a => a.Title)
                .ToListAsync();
        }

        /// <summary>
        /// Toggles the published visibility of an article.
        /// </summary>
        /// <param name="id">The article unique identifier.</param>
        /// <returns>Redirect back to index.</returns>
        public async Task<IActionResult> OnPostTogglePublishAsync(Guid id)
        {
            var article = await _context.MasterHelpdeskArticles.FindAsync(id);
            if (article == null)
            {
                return NotFound();
            }

            article.IsPublished = !article.IsPublished;
            article.UpdatedUtc = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            StatusMessage = article.IsPublished
                ? $"Article '{article.Title}' published live."
                : $"Article '{article.Title}' unlisted (draft).";

            _logger.LogInformation("Central operator toggled helpdesk article {ArticleId} publish to {IsPublished}", id, article.IsPublished);
            return RedirectToPage();
        }

        /// <summary>
        /// Deletes a helpdesk article.
        /// </summary>
        /// <param name="id">The article unique identifier.</param>
        /// <returns>Redirect back to index.</returns>
        public async Task<IActionResult> OnPostDeleteAsync(Guid id)
        {
            var article = await _context.MasterHelpdeskArticles.FindAsync(id);
            if (article != null)
            {
                _context.MasterHelpdeskArticles.Remove(article);
                await _context.SaveChangesAsync();
                _logger.LogWarning("Central operator deleted helpdesk article {ArticleId} ({Title})", id, article.Title);
            }

            TempData["StatusMessage"] = "Helpdesk article deleted.";
            return RedirectToPage();
        }
    }
}
