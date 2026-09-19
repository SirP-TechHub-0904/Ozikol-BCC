using System;
using System.Collections.Generic;

namespace Ozikol.MasterDomain.Models.News;

/// <summary>
/// Represents an official company announcement, product update, or security advisory presentation model in the Master Domain.
/// </summary>
public class NewsArticle
{
    /// <summary>
    /// Gets or sets the unique identifier of the article.
    /// </summary>
    public string Id { get; set; } = Guid.NewGuid().ToString("N");

    /// <summary>
    /// Gets or sets the URL-friendly slug used for routing and permalinks.
    /// </summary>
    public string Slug { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the article title.
    /// </summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the category key matching <see cref="NewsCategory.Key"/>.
    /// </summary>
    public string CategoryKey { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the display category name.
    /// </summary>
    public string CategoryName { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the short summary or lead text displayed on article cards.
    /// </summary>
    public string Excerpt { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the rich HTML body content of the article.
    /// </summary>
    public string ContentHtml { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the author full name.
    /// </summary>
    public string AuthorName { get; set; } = "Ozikol Editorial";

    /// <summary>
    /// Gets or sets the professional role of the author.
    /// </summary>
    public string AuthorRole { get; set; } = "Platform Architecture";

    /// <summary>
    /// Gets or sets the publication date.
    /// </summary>
    public DateTime PublishedAtUtc { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Gets or sets the estimated read time text (e.g. "4 min read").
    /// </summary>
    public string ReadTimeText { get; set; } = "4 min read";

    /// <summary>
    /// Gets or sets a value indicating whether this article is highlighted as the featured headline.
    /// </summary>
    public bool IsFeatured { get; set; }

    /// <summary>
    /// Gets or sets the list of searchable topic tags.
    /// </summary>
    public List<string> Tags { get; set; } = new();

    /// <summary>
    /// Gets or sets the total number of times this article has been read.
    /// </summary>
    public long ReadCount { get; set; } = 0;

    /// <summary>
    /// Gets or sets the theme gradient or cover styling token.
    /// </summary>
    public string CoverGradientClass { get; set; } = "oz-news-cover-indigo";
}
