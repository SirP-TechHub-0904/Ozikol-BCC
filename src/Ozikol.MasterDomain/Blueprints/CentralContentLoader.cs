using System.Collections.Concurrent;
using System.Reflection;
using System.Text;
using System.Text.Json;

namespace Ozikol.MasterDomain.Blueprints;

/// <summary>
/// Service responsible for loading and resolving turnkey default content from central embedded resources.
/// Powers tenant onboarding and first-run seeder suites with rich HTML editorial blogs and pre-configured website pages.
/// </summary>
public static class CentralContentLoader
{
    private static readonly Assembly TargetAssembly = typeof(CentralContentLoader).Assembly;
    private static readonly ConcurrentDictionary<string, string> ContentCache = new();

    private static readonly Lazy<List<EditorialBlogBlueprint>> DefaultBlogsCache = new(() =>
    {
        string manifestJson = ReadResource("Ozikol.MasterDomain.Blueprints.Content.blogs.blogs-manifest.json");
        var manifest = JsonSerializer.Deserialize<List<BlogManifestItem>>(manifestJson, new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
                       ?? new List<BlogManifestItem>();

        var result = new List<EditorialBlogBlueprint>(manifest.Count);

        foreach (var item in manifest)
        {
            string htmlResourceName = TargetAssembly.GetManifestResourceNames()
                .FirstOrDefault(n => n.EndsWith(item.HtmlFile, StringComparison.OrdinalIgnoreCase))
                ?? throw new FileNotFoundException($"Blog HTML body resource '{item.HtmlFile}' not found.");

            string htmlBody = ReadResource(htmlResourceName);

            result.Add(new EditorialBlogBlueprint
            {
                SortOrder = item.SortOrder,
                Title = item.Title,
                Slug = item.Slug,
                Summary = item.Summary,
                Category = item.Category,
                AuthorName = item.AuthorName,
                AuthorRole = item.AuthorRole,
                AuthorAvatarUrl = item.AuthorAvatarUrl,
                CoverImageUrl = item.CoverImageUrl,
                ReadTime = item.ReadTime,
                BodyHtml = htmlBody,
                Tags = item.Tags ?? new List<string>()
            });
        }

        return result;
    });

    private static readonly Lazy<WebsiteContentManifest> DefaultPagesCache = new(() =>
    {
        string pagesJson = ReadResource("Ozikol.MasterDomain.Blueprints.Content.website-pages-content.json");
        return JsonSerializer.Deserialize<WebsiteContentManifest>(pagesJson, new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
               ?? new WebsiteContentManifest();
    });

    /// <summary>
    /// Retrieves the 3 factory-standard editorial blog articles showcasing Ozikol's sovereign cloud, automation, and security.
    /// Each article includes full rich-text HTML formatted with subheadings, styled quotes, and feature checklists.
    /// </summary>
    /// <returns>A read-only collection of <see cref="EditorialBlogBlueprint"/> instances.</returns>
    public static IReadOnlyList<EditorialBlogBlueprint> GetDefaultBlogs()
    {
        return DefaultBlogsCache.Value;
    }

    /// <summary>
    /// Retrieves all default website pages (Home, Services, About Us, Contact Us, Careers, FAQ) with their section hierarchies and lists.
    /// </summary>
    /// <returns>A read-only collection of <see cref="WebPageBlueprint"/> instances.</returns>
    public static IReadOnlyList<WebPageBlueprint> GetDefaultPages()
    {
        return DefaultPagesCache.Value.Pages;
    }

    private static string ReadResource(string resourceName)
    {
        return ContentCache.GetOrAdd(resourceName, name =>
        {
            using var stream = TargetAssembly.GetManifestResourceStream(name);
            if (stream == null)
            {
                throw new InvalidOperationException($"Embedded content stream '{name}' was not found in assembly '{TargetAssembly.FullName}'.");
            }

            using var reader = new StreamReader(stream, Encoding.UTF8);
            return reader.ReadToEnd();
        });
    }

    private class BlogManifestItem
    {
        public int SortOrder { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Slug { get; set; } = string.Empty;
        public string Summary { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string AuthorName { get; set; } = string.Empty;
        public string AuthorRole { get; set; } = string.Empty;
        public string AuthorAvatarUrl { get; set; } = string.Empty;
        public string CoverImageUrl { get; set; } = string.Empty;
        public string ReadTime { get; set; } = string.Empty;
        public string HtmlFile { get; set; } = string.Empty;
        public List<string>? Tags { get; set; }
    }
}

/// <summary>
/// Strongly-typed blueprint model for a turnkey editorial blog article.
/// </summary>
public class EditorialBlogBlueprint
{
    /// <summary>
    /// Gets or sets the presentation sort order.
    /// </summary>
    public int SortOrder { get; set; }

    /// <summary>
    /// Gets or sets the article headline.
    /// </summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the URL slug.
    /// </summary>
    public string Slug { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the short executive summary.
    /// </summary>
    public string Summary { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the primary category name.
    /// </summary>
    public string Category { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the author display name.
    /// </summary>
    public string AuthorName { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the author professional role.
    /// </summary>
    public string AuthorRole { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the author avatar photo URL.
    /// </summary>
    public string AuthorAvatarUrl { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the high-resolution cover image URL.
    /// </summary>
    public string CoverImageUrl { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the estimated read time badge (e.g. "5 min read").
    /// </summary>
    public string ReadTime { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the full rich-text HTML formatted body.
    /// </summary>
    public string BodyHtml { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the list of topic tags.
    /// </summary>
    public List<string> Tags { get; set; } = new();
}

/// <summary>
/// Root container manifest for turnkey website pages.
/// </summary>
public class WebsiteContentManifest
{
    /// <summary>
    /// Gets or sets the collection of page blueprints.
    /// </summary>
    public List<WebPageBlueprint> Pages { get; set; } = new();
}

/// <summary>
/// Strongly-typed blueprint model for a turnkey web page.
/// </summary>
public class WebPageBlueprint
{
    /// <summary>
    /// Gets or sets the navigation sort order.
    /// </summary>
    public int SortOrder { get; set; }

    /// <summary>
    /// Gets or sets the page title.
    /// </summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the route slug (empty string for homepage).
    /// </summary>
    public string Slug { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the browser title meta tag.
    /// </summary>
    public string MetaTitle { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the search engine description meta tag.
    /// </summary>
    public string MetaDescription { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the navigation position (e.g. "header", "topbar", "footer").
    /// </summary>
    public string MenuPosition { get; set; } = "header";

    /// <summary>
    /// Gets or sets the navbar zone (e.g. "first", "middle", "last").
    /// </summary>
    public string Zone { get; set; } = "first";

    /// <summary>
    /// Gets or sets whether the page is published publicly.
    /// </summary>
    public bool IsPublished { get; set; } = true;

    /// <summary>
    /// Gets or sets the ordered body sections associated with this page.
    /// </summary>
    public List<PageSectionBlueprint> Sections { get; set; } = new();
}

/// <summary>
/// Strongly-typed blueprint model for a section on a web page.
/// </summary>
public class PageSectionBlueprint
{
    /// <summary>
    /// Gets or sets the vertical presentation sort order on the page.
    /// </summary>
    public int SortOrder { get; set; }

    /// <summary>
    /// Gets or sets the installed template key matching a canonical archetype (e.g. "BODY_01_FEATURE_GRID").
    /// </summary>
    public string TemplateKey { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the primary section headline.
    /// </summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the eyebrow badge or mini title.
    /// </summary>
    public string MiniTitle { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the subtitle or narrative copy.
    /// </summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the optional section media graphic or hero photo URL.
    /// </summary>
    public string? ImageUrl { get; set; }

    /// <summary>
    /// Gets or sets the primary action button label.
    /// </summary>
    public string? ButtonText { get; set; }

    /// <summary>
    /// Gets or sets the primary action button destination link.
    /// </summary>
    public string? ButtonLink { get; set; }

    /// <summary>
    /// Gets or sets the secondary action button label.
    /// </summary>
    public string? SecondaryButtonText { get; set; }

    /// <summary>
    /// Gets or sets the secondary action button destination link.
    /// </summary>
    public string? SecondaryButtonLink { get; set; }

    /// <summary>
    /// Gets or sets child repeater cards, metrics, steps, or FAQ items.
    /// </summary>
    public List<SectionListBlueprint> Lists { get; set; } = new();
}

/// <summary>
/// Strongly-typed blueprint model for a card or repeater item inside a section.
/// </summary>
public class SectionListBlueprint
{
    /// <summary>
    /// Gets or sets the display order.
    /// </summary>
    public int SortOrder { get; set; }

    /// <summary>
    /// Gets or sets the card headline or title.
    /// </summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the card description or body text.
    /// </summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the Material Symbols or FontAwesome icon name.
    /// </summary>
    public string? Icon { get; set; }

    /// <summary>
    /// Gets or sets the optional card thumbnail or avatar URL.
    /// </summary>
    public string? ImageUrl { get; set; }

    /// <summary>
    /// Gets or sets the card button label.
    /// </summary>
    public string? ButtonText { get; set; }

    /// <summary>
    /// Gets or sets the card button destination link.
    /// </summary>
    public string? ButtonLink { get; set; }
}
