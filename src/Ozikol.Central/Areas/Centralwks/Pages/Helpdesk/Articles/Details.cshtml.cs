using System;
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
    /// Page model for viewing full technical guides, inspecting reader analytics,
    /// and managing publication toggles in Centralwks.
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
        /// Gets or sets the target helpdesk article.
        /// </summary>
        public MasterHelpdeskArticle Article { get; set; } = null!;

        /// <summary>
        /// Gets or sets status notification message.
        /// </summary>
        [TempData]
        public string? StatusMessage { get; set; }

        /// <summary>
        /// Handles HTTP GET request to load article details.
        /// </summary>
        /// <param name="id">The unique identifier of the article.</param>
        /// <returns>Page result or NotFound.</returns>
        public async Task<IActionResult> OnGetAsync(Guid id)
        {
            var article = await _context.MasterHelpdeskArticles
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
        /// Toggles the public visibility of the article.
        /// </summary>
        /// <param name="id">The unique identifier of the article.</param>
        /// <returns>Redirect back to details page.</returns>
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
                ? $"Article '{article.Title}' is now live on the knowledge base."
                : $"Article '{article.Title}' reverted to draft (unlisted).";

            _logger.LogInformation("Central operator toggled helpdesk article {ArticleId} publish status to {IsPublished}", id, article.IsPublished);
            return RedirectToPage(new { id });
        }

        /// <summary>
        /// Permanently deletes the helpdesk article.
        /// </summary>
        /// <param name="id">The unique identifier of the article.</param>
        /// <returns>Redirect to helpdesk articles index page.</returns>
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
            return RedirectToPage("/Helpdesk/Articles/Index");
        }
    }
}
