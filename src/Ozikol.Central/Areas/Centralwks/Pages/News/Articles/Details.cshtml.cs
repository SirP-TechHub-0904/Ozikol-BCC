using System;
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
    /// Page model for viewing the complete details, full HTML body, and editorial metadata of a news article.
    /// </summary>
    public class DetailsModel : PageModel
    {
        private readonly MasterCatalogDbContext _context;
        private readonly ILogger<DetailsModel> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="DetailsModel"/> class.
        /// </summary>
        /// <param name="context">Master catalog database context.</param>
        /// <param name="logger">Structured logging service.</param>
        public DetailsModel(MasterCatalogDbContext context, ILogger<DetailsModel> logger)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>
        /// Gets the news article entity.
        /// </summary>
        public MasterNewsArticle Article { get; set; } = null!;

        /// <summary>
        /// Gets or sets optional status feedback message displayed in UI alerts.
        /// </summary>
        [TempData]
        public string? StatusMessage { get; set; }

        /// <summary>
        /// Handles HTTP GET request to load and display article details.
        /// </summary>
        /// <param name="id">The unique identifier of the article.</param>
        /// <returns>Page result or NotFound.</returns>
        public async Task<IActionResult> OnGetAsync(Guid id)
        {
            var article = await _context.MasterNewsArticles
                .Include(a => a.Category)
                .AsNoTracking()
                .FirstOrDefaultAsync(a => a.Id == id);

            if (article == null)
            {
                return NotFound();
            }

            Article = article;
            return Page();
        }

        /// <summary>
        /// Toggles the publication status of the article between Draft and Published.
        /// </summary>
        /// <param name="id">The unique identifier of the article.</param>
        /// <returns>Redirect back to Details page.</returns>
        public async Task<IActionResult> OnPostTogglePublishAsync(Guid id)
        {
            var article = await _context.MasterNewsArticles.FindAsync(id);
            if (article == null)
            {
                return NotFound();
            }

            article.IsPublished = !article.IsPublished;
            await _context.SaveChangesAsync();

            StatusMessage = article.IsPublished
                ? $"Article '{article.Title}' is now published live."
                : $"Article '{article.Title}' reverted to draft status.";

            _logger.LogInformation("Central operator toggled publication for article {ArticleId} to {IsPublished}", id, article.IsPublished);
            return RedirectToPage(new { id });
        }

        /// <summary>
        /// Toggles the featured headline flag of the article.
        /// </summary>
        /// <param name="id">The unique identifier of the article.</param>
        /// <returns>Redirect back to Details page.</returns>
        public async Task<IActionResult> OnPostToggleFeaturedAsync(Guid id)
        {
            var article = await _context.MasterNewsArticles.FindAsync(id);
            if (article == null)
            {
                return NotFound();
            }

            article.IsFeatured = !article.IsFeatured;
            await _context.SaveChangesAsync();

            StatusMessage = article.IsFeatured
                ? $"Article '{article.Title}' is now marked as a featured headline."
                : $"Article '{article.Title}' removed from featured headlines.";

            _logger.LogInformation("Central operator toggled featured status for article {ArticleId} to {IsFeatured}", id, article.IsFeatured);
            return RedirectToPage(new { id });
        }

        /// <summary>
        /// Permanently deletes the article from the Master database.
        /// </summary>
        /// <param name="id">The unique identifier of the article.</param>
        /// <returns>Redirect to news articles index page.</returns>
        public async Task<IActionResult> OnPostDeleteAsync(Guid id)
        {
            var article = await _context.MasterNewsArticles.FindAsync(id);
            if (article != null)
            {
                _context.MasterNewsArticles.Remove(article);
                await _context.SaveChangesAsync();
                _logger.LogWarning("Central operator deleted news article {ArticleId} ({Title})", id, article.Title);
            }

            TempData["StatusMessage"] = "Article deleted successfully.";
            return RedirectToPage("/News/Articles/Index");
        }
    }
}
