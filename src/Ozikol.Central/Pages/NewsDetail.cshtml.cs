using System;
using System.Collections.Generic;
using System.Globalization;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.Extensions.Localization;
using Ozikol.Central.Models.News;
using Ozikol.Central.Services;

namespace Ozikol.Central.Pages;

/// <summary>
/// Page model handling dynamic news article readers, social metadata, and related stories.
/// </summary>
public class NewsDetailModel : PageModel
{
    private readonly INewsService _newsService;
    private readonly IStringLocalizer<SharedResource> _localizer;

    /// <summary>
    /// Initializes a new instance of the <see cref="NewsDetailModel"/> class.
    /// </summary>
    /// <param name="newsService">News service provider.</param>
    /// <param name="localizer">Shared localization provider.</param>
    public NewsDetailModel(INewsService newsService, IStringLocalizer<SharedResource> localizer)
    {
        _newsService = newsService ?? throw new ArgumentNullException(nameof(newsService));
        _localizer = localizer ?? throw new ArgumentNullException(nameof(localizer));
    }

    /// <summary>
    /// Gets the active 2-letter ISO language code for localized URL routing.
    /// </summary>
    public string CurrentCulture { get; private set; } = "en";

    /// <summary>
    /// Gets the resolved news article.
    /// </summary>
    public NewsArticle Article { get; private set; } = null!;

    /// <summary>
    /// Gets related stories in the same category.
    /// </summary>
    public IReadOnlyList<NewsArticle> RelatedArticles { get; private set; } = Array.Empty<NewsArticle>();

    /// <summary>
    /// Handles GET requests to load and render the article by slug.
    /// </summary>
    /// <param name="slug">The article permalink slug.</param>
    /// <returns>Page result or NotFound if article does not exist.</returns>
    public async Task<IActionResult> OnGetAsync(string slug)
    {
        ResolveCulture();

        if (string.IsNullOrWhiteSpace(slug))
        {
            return RedirectToPage("/News", new { culture = CurrentCulture });
        }

        var article = await _newsService.GetArticleBySlugAsync(slug);
        if (article == null)
        {
            return NotFound();
        }

        Article = article;
        RelatedArticles = await _newsService.GetRelatedArticlesAsync(article.CategoryKey, article.Slug);
        return Page();
    }

    /// <summary>
    /// Resolves the current UI culture code for language-aware link routing.
    /// </summary>
    private void ResolveCulture()
    {
        var culture = CultureInfo.CurrentUICulture.TwoLetterISOLanguageName.ToLowerInvariant();
        CurrentCulture = culture is "en" or "fr" or "es" or "de" ? culture : "en";
    }
}
