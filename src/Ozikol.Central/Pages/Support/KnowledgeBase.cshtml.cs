using System;
using System.Collections.Generic;
using System.Globalization;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.Extensions.Localization;
using Microsoft.Extensions.Logging;
using Ozikol.Central.Services.Support;
using Ozikol.MasterDomain.Models;

namespace Ozikol.Central.Pages.Support
{
    /// <summary>
    /// PageModel presenting the dedicated Knowledge Base and Helpdesk documentation library.
    /// </summary>
    public class KnowledgeBaseModel : PageModel
    {
        private readonly ISupportService _supportService;
        private readonly IStringLocalizer<SharedResource> _localizer;
        private readonly ILogger<KnowledgeBaseModel> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="KnowledgeBaseModel"/> class.
        /// </summary>
        /// <param name="supportService">Support service providing knowledge base articles.</param>
        /// <param name="localizer">Shared localizer instance.</param>
        /// <param name="logger">Logger instance.</param>
        public KnowledgeBaseModel(
            ISupportService supportService,
            IStringLocalizer<SharedResource> localizer,
            ILogger<KnowledgeBaseModel> logger)
        {
            _supportService = supportService ?? throw new ArgumentNullException(nameof(supportService));
            _localizer = localizer ?? throw new ArgumentNullException(nameof(localizer));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>
        /// Gets the active 2-letter ISO culture code.
        /// </summary>
        public string CurrentCulture { get; private set; } = "en";

        /// <summary>
        /// Gets the list of 9 enterprise suites and their feature hierarchies.
        /// </summary>
        public IReadOnlyList<SuiteSupportViewModel> Suites { get; private set; } = new List<SuiteSupportViewModel>();

        /// <summary>
        /// Gets the filtered list of knowledge base articles.
        /// </summary>
        public IReadOnlyList<MasterHelpdeskArticle> Articles { get; private set; } = new List<MasterHelpdeskArticle>();

        /// <summary>
        /// Gets or sets the active suite filter.
        /// </summary>
        public string? ActiveSuiteCode { get; set; }

        /// <summary>
        /// Gets or sets the active feature filter.
        /// </summary>
        public string? ActiveFeatureCode { get; set; }

        /// <summary>
        /// Gets or sets the active category filter (e.g. Getting Started, Configuration).
        /// </summary>
        public string? ActiveCategory { get; set; }

        /// <summary>
        /// Gets or sets the search keyword.
        /// </summary>
        public string? SearchQuery { get; set; }

        /// <summary>
        /// Handles GET requests to load knowledge base articles and navigation hierarchies.
        /// </summary>
        /// <param name="suite">Optional suite filter.</param>
        /// <param name="feature">Optional feature filter.</param>
        /// <param name="category">Optional category filter.</param>
        /// <param name="q">Optional search term.</param>
        public async Task OnGetAsync(string? suite, string? feature, string? category, string? q)
        {
            ResolveCulture();
            ActiveSuiteCode = suite;
            ActiveFeatureCode = feature;
            ActiveCategory = category;
            SearchQuery = q;

            Suites = await _supportService.GetSuitesWithHierarchyAsync(CurrentCulture);
            var allArticles = await _supportService.GetArticlesAsync(ActiveSuiteCode, ActiveFeatureCode, SearchQuery, CurrentCulture);

            if (!string.IsNullOrWhiteSpace(ActiveCategory))
            {
                Articles = allArticles.Where(a => string.Equals(a.Category, ActiveCategory, StringComparison.OrdinalIgnoreCase)).ToList();
            }
            else
            {
                Articles = allArticles;
            }
        }

        /// <summary>
        /// AJAX endpoint returning full article content payload for the interactive article reader modal.
        /// </summary>
        /// <param name="id">The unique article GUID.</param>
        public async Task<IActionResult> OnGetArticleDetailsAsync(Guid id)
        {
            var article = await _supportService.GetArticleByIdAsync(id);
            if (article == null)
            {
                return NotFound(new { message = "Article not found." });
            }

            return new JsonResult(new
            {
                id = article.Id,
                title = article.Title,
                summary = article.Summary,
                contentHtml = article.ContentHtml,
                category = article.Category,
                suiteCode = article.SuiteCode,
                featureCode = article.FeatureCode,
                readMinutes = article.EstimatedReadMinutes,
                viewCount = article.ViewCount,
                helpfulCount = article.HelpfulCount,
                updated = article.UpdatedUtc.ToString("MMMM dd, yyyy")
            });
        }

        /// <summary>
        /// AJAX endpoint for recording user helpfulness votes.
        /// </summary>
        /// <param name="id">The article GUID.</param>
        /// <param name="helpful">True if voted helpful.</param>
        public async Task<IActionResult> OnPostVoteArticleAsync([FromForm] Guid id, [FromForm] bool helpful)
        {
            await _supportService.RecordArticleVoteAsync(id, helpful);
            return new JsonResult(new { success = true });
        }

        private void ResolveCulture()
        {
            var routeCulture = RouteData.Values["culture"]?.ToString()?.ToLowerInvariant();
            if (routeCulture is "en" or "fr" or "es" or "de")
            {
                CurrentCulture = routeCulture;
                return;
            }

            var current = CultureInfo.CurrentUICulture.TwoLetterISOLanguageName.ToLowerInvariant();
            CurrentCulture = current is "en" or "fr" or "es" or "de" ? current : "en";
        }
    }
}
