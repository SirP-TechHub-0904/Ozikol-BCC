namespace Ozikol.MasterDomain.Models.News;

/// <summary>
/// Represents an editorial news and release category presentation model in the Master Domain.
/// </summary>
public class NewsCategory
{
    /// <summary>
    /// Gets or sets the programmatic unique category key.
    /// </summary>
    public string Key { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the localized or display title of the category.
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the URL-friendly slug.
    /// </summary>
    public string Slug { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets a concise summary of stories in this category.
    /// </summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the CSS badge highlight class (e.g. oz-badge-blue, oz-badge-emerald).
    /// </summary>
    public string BadgeClass { get; set; } = "oz-badge-blue";
}
