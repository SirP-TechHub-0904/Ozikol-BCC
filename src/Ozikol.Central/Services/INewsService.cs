using System.Collections.Generic;
using System.Threading.Tasks;
using Ozikol.Central.Models.News;

namespace Ozikol.Central.Services;

/// <summary>
/// Service contract for querying company news, releases, and editorial categories.
/// </summary>
public interface INewsService
{
    /// <summary>
    /// Retrieves all active newsroom categories.
    /// </summary>
    /// <returns>Collection of available news categories.</returns>
    Task<IReadOnlyList<NewsCategory>> GetCategoriesAsync();

    /// <summary>
    /// Queries news articles filtered optionally by category and keyword search.
    /// </summary>
    /// <param name="categoryKey">Optional category key filter.</param>
    /// <param name="search">Optional keyword search string.</param>
    /// <returns>Filtered list of news articles ordered by publication date descending.</returns>
    Task<IReadOnlyList<NewsArticle>> GetArticlesAsync(string? categoryKey = null, string? search = null);

    /// <summary>
    /// Retrieves the current flagship headline featured article.
    /// </summary>
    /// <returns>The featured article or the latest available article.</returns>
    Task<NewsArticle?> GetFeaturedArticleAsync();

    /// <summary>
    /// Finds a news article by its URL permalink slug.
    /// </summary>
    /// <param name="slug">The article slug.</param>
    /// <returns>The matching article or null if not found.</returns>
    Task<NewsArticle?> GetArticleBySlugAsync(string slug);

    /// <summary>
    /// Retrieves related articles belonging to the same category, excluding the current article.
    /// </summary>
    /// <param name="categoryKey">The category key.</param>
    /// <param name="currentSlug">The slug of the active article to exclude.</param>
    /// <param name="count">Maximum count of related articles to return.</param>
    /// <returns>List of related news articles.</returns>
    Task<IReadOnlyList<NewsArticle>> GetRelatedArticlesAsync(string categoryKey, string currentSlug, int count = 3);
}
