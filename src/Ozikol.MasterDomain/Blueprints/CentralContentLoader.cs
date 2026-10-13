using System.Collections.Concurrent;
using System.Reflection;
using System.Text;
using System.Text.Json;

namespace Ozikol.MasterDomain.Blueprints;

/// <summary>
/// Service responsible for loading and resolving turnkey default content from central embedded resources.
/// Powers tenant onboarding and first-run seeder suites with rich HTML editorial blogs, pre-configured website pages,
/// dynamic CMS forms, contact channels, categories, SEO meta tags, and global site settings.
/// </summary>
public static class CentralContentLoader
{
    private static readonly Assembly TargetAssembly = typeof(CentralContentLoader).Assembly;
    private static readonly ConcurrentDictionary<string, string> ContentCache = new();

    private static readonly Lazy<List<EditorialBlogBlueprint>> DefaultBlogsCache = new(() =>
    {
        string manifestJson = ReadContentFile("blogs/blogs-manifest.json", "Ozikol.MasterDomain.Blueprints.Content.blogs.blogs-manifest.json");
        var manifest = JsonSerializer.Deserialize<List<BlogManifestItem>>(manifestJson, new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
                       ?? new List<BlogManifestItem>();

        var result = new List<EditorialBlogBlueprint>(manifest.Count);

        foreach (var item in manifest)
        {
            string htmlResourceName = TargetAssembly.GetManifestResourceNames()
                .FirstOrDefault(n => n.EndsWith(item.HtmlFile, StringComparison.OrdinalIgnoreCase))
                ?? throw new FileNotFoundException($"Blog HTML body resource '{item.HtmlFile}' not found.");

            string htmlBody = ReadContentFile($"blogs/{item.HtmlFile}", htmlResourceName);

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
        string pagesJson = ReadContentFile("website-pages-content.json", "Ozikol.MasterDomain.Blueprints.Content.website-pages-content.json");
        return JsonSerializer.Deserialize<WebsiteContentManifest>(pagesJson, new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
               ?? new WebsiteContentManifest();
    });

    private static readonly Lazy<List<WebCategoryBlueprint>> DefaultCategoriesCache = new(() =>
    {
        string json = ReadContentFile("website-categories-content.json", "Ozikol.MasterDomain.Blueprints.Content.website-categories-content.json");
        return JsonSerializer.Deserialize<List<WebCategoryBlueprint>>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
               ?? new List<WebCategoryBlueprint>();
    });

    private static readonly Lazy<List<WebFormBlueprint>> DefaultFormsCache = new(() =>
    {
        string json = ReadContentFile("website-forms-content.json", "Ozikol.MasterDomain.Blueprints.Content.website-forms-content.json");
        return JsonSerializer.Deserialize<List<WebFormBlueprint>>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
               ?? new List<WebFormBlueprint>();
    });

    private static readonly Lazy<List<WebContactChannelBlueprint>> DefaultContactChannelsCache = new(() =>
    {
        string json = ReadContentFile("website-contact-channels.json", "Ozikol.MasterDomain.Blueprints.Content.website-contact-channels.json");
        return JsonSerializer.Deserialize<List<WebContactChannelBlueprint>>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
               ?? new List<WebContactChannelBlueprint>();
    });

    private static readonly Lazy<List<WebCodeInjectionTagBlueprint>> DefaultCodeInjectionTagsCache = new(() =>
    {
        string json = ReadContentFile("website-code-injection-tags.json", "Ozikol.MasterDomain.Blueprints.Content.website-code-injection-tags.json");
        return JsonSerializer.Deserialize<List<WebCodeInjectionTagBlueprint>>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
               ?? new List<WebCodeInjectionTagBlueprint>();
    });

    private static readonly Lazy<WebDefaultSettingsBlueprint> DefaultWebsiteSettingsCache = new(() =>
    {
        string json = ReadContentFile("website-default-settings.json", "Ozikol.MasterDomain.Blueprints.Content.website-default-settings.json");
        return JsonSerializer.Deserialize<WebDefaultSettingsBlueprint>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
               ?? new WebDefaultSettingsBlueprint();
    });

    /// <summary>
    /// Retrieves all factory-standard editorial blog articles showcasing Ozikol's sovereign cloud, automation, and security.
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

    /// <summary>
    /// Retrieves all factory-default page categories (e.g. Service, Product) from central blueprints.
    /// </summary>
    /// <returns>A read-only collection of <see cref="WebCategoryBlueprint"/> instances.</returns>
    public static IReadOnlyList<WebCategoryBlueprint> GetDefaultCategories()
    {
        return DefaultCategoriesCache.Value;
    }

    /// <summary>
    /// Retrieves all turnkey CMS forms (Contact Us, Newsletter, Service Request &amp; Intake) and their dynamic fields.
    /// </summary>
    /// <returns>A read-only collection of <see cref="WebFormBlueprint"/> instances.</returns>
    public static IReadOnlyList<WebFormBlueprint> GetDefaultForms()
    {
        return DefaultFormsCache.Value;
    }

    /// <summary>
    /// Retrieves all default communication channels, hotlines, addresses, and social media profile blueprints.
    /// </summary>
    /// <returns>A read-only collection of <see cref="WebContactChannelBlueprint"/> instances.</returns>
    public static IReadOnlyList<WebContactChannelBlueprint> GetDefaultContactChannels()
    {
        return DefaultContactChannelsCache.Value;
    }

    /// <summary>
    /// Retrieves all turnkey SEO meta tags, social share cards, favicons, and code injection tags.
    /// </summary>
    /// <returns>A read-only collection of <see cref="WebCodeInjectionTagBlueprint"/> instances.</returns>
    public static IReadOnlyList<WebCodeInjectionTagBlueprint> GetDefaultCodeInjectionTags()
    {
        return DefaultCodeInjectionTagsCache.Value;
    }

    /// <summary>
    /// Retrieves the factory-default website copywriting, taglines, and brand settings blueprint.
    /// </summary>
    /// <returns>A <see cref="WebDefaultSettingsBlueprint"/> instance.</returns>
    public static WebDefaultSettingsBlueprint GetDefaultWebsiteSettings()
    {
        return DefaultWebsiteSettingsCache.Value;
    }

    private static string ReadContentFile(string relativePath, string resourceName)
    {
        var diskContent = TryReadFromDisk(relativePath);
        if (diskContent != null)
        {
            return diskContent;
        }

        return ReadResource(resourceName);
    }

    private static string? TryReadFromDisk(string relativePath)
    {
        var baseDir = AppContext.BaseDirectory;
        var dir = new DirectoryInfo(baseDir);
        while (dir != null && !File.Exists(Path.Combine(dir.FullName, "Ozikol-BCC.sln")))
        {
            dir = dir.Parent;
        }

        if (dir != null)
        {
            string normalizedRelative = relativePath.Replace('/', Path.DirectorySeparatorChar);
            string filePath = Path.Combine(dir.FullName, "src", "Ozikol.MasterDomain", "Blueprints", "Content", normalizedRelative);
            if (File.Exists(filePath))
            {
                return File.ReadAllText(filePath, Encoding.UTF8);
            }
        }

        return null;
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
/// Strongly-typed blueprint model for a turnkey page category.
/// </summary>
public class WebCategoryBlueprint
{
    /// <summary>
    /// Gets or sets the category display title.
    /// </summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the footer display title override.
    /// </summary>
    public string? FooterDisplayTitle { get; set; }

    /// <summary>
    /// Gets or sets the menu sort order.
    /// </summary>
    public int MenuSortOrder { get; set; }

    /// <summary>
    /// Gets or sets the menu position ("First", "Middle", "Last").
    /// </summary>
    public string MenuPosition { get; set; } = "Middle";

    /// <summary>
    /// Gets or sets whether to display in the header menu.
    /// </summary>
    public bool ShowInMenu { get; set; } = true;

    /// <summary>
    /// Gets or sets whether to display as a footer column.
    /// </summary>
    public bool ShowInFooter { get; set; } = true;

    /// <summary>
    /// Gets or sets the footer column sort order.
    /// </summary>
    public int FooterSortOrder { get; set; }

    /// <summary>
    /// Gets or sets whether this category is published.
    /// </summary>
    public bool Publish { get; set; } = true;
}

/// <summary>
/// Strongly-typed blueprint model for a turnkey CMS page form.
/// </summary>
public class WebFormBlueprint
{
    /// <summary>
    /// Gets or sets the form title.
    /// </summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the unique form key identifier.
    /// </summary>
    public string FormKey { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the form instructions or description.
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// Gets or sets the submit button text.
    /// </summary>
    public string SubmitButtonText { get; set; } = "Submit";

    /// <summary>
    /// Gets or sets the success feedback message.
    /// </summary>
    public string SuccessMessage { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets whether this form is active.
    /// </summary>
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Gets or sets the dynamic form fields.
    /// </summary>
    public List<WebFormFieldBlueprint> Fields { get; set; } = new();
}

/// <summary>
/// Strongly-typed blueprint model for a dynamic field inside a CMS form.
/// </summary>
public class WebFormFieldBlueprint
{
    /// <summary>
    /// Gets or sets the unique field key identifier.
    /// </summary>
    public string FieldKey { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the field label.
    /// </summary>
    public string Label { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the input placeholder hint text.
    /// </summary>
    public string? Placeholder { get; set; }

    /// <summary>
    /// Gets or sets the input control type (e.g. "text", "email", "phone", "textarea", "dropdown", "pill_select").
    /// </summary>
    public string FieldType { get; set; } = "text";

    /// <summary>
    /// Gets or sets JSON-serialized options for select and dropdown controls.
    /// </summary>
    public string? OptionsJson { get; set; }

    /// <summary>
    /// Gets or sets whether input is required.
    /// </summary>
    public bool IsRequired { get; set; }

    /// <summary>
    /// Gets or sets the presentation display order.
    /// </summary>
    public int SortOrder { get; set; }

    /// <summary>
    /// Gets or sets the Bootstrap grid width (e.g. "col-md-6", "col-md-12").
    /// </summary>
    public string GridWidth { get; set; } = "col-md-12";
}

/// <summary>
/// Strongly-typed blueprint model for a default contact channel or social media link.
/// </summary>
public class WebContactChannelBlueprint
{
    /// <summary>
    /// Gets or sets the channel type (e.g. "Email", "Phone", "Address", "Hours", "SocialMedia").
    /// </summary>
    public string ChannelType { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the platform name (e.g. "Support", "Office", "Twitter", "LinkedIn").
    /// </summary>
    public string Platform { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the channel title.
    /// </summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the channel description or operational schedule.
    /// </summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the target contact value template (e.g. "support@{safeHandle}.com").
    /// </summary>
    public string Value { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the icon CSS class.
    /// </summary>
    public string IconClass { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets whether this channel is the primary default.
    /// </summary>
    public bool IsDefault { get; set; }

    /// <summary>
    /// Gets or sets whether this channel is published.
    /// </summary>
    public bool IsPublished { get; set; } = true;

    /// <summary>
    /// Gets or sets the display sort order.
    /// </summary>
    public int SortOrder { get; set; }
}

/// <summary>
/// Strongly-typed blueprint model for a turnkey site code injection tag (e.g. SEO suite).
/// </summary>
public class WebCodeInjectionTagBlueprint
{
    /// <summary>
    /// Gets or sets the injection name.
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the target zone ("head", "body_open", "footer").
    /// </summary>
    public string Zone { get; set; } = "head";

    /// <summary>
    /// Gets or sets the tag type ("meta_tag", "script_url", etc.).
    /// </summary>
    public string TagType { get; set; } = "meta_tag";

    /// <summary>
    /// Gets or sets the execution sort order.
    /// </summary>
    public int SortOrder { get; set; }

    /// <summary>
    /// Gets or sets whether the tag is active.
    /// </summary>
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Gets or sets the suite code (e.g. "suite_corporate").
    /// </summary>
    public string SuiteCode { get; set; } = "suite_corporate";

    /// <summary>
    /// Gets or sets the raw code content.
    /// </summary>
    public string Content { get; set; } = string.Empty;
}

/// <summary>
/// Strongly-typed blueprint model for default website brand and copywriting settings.
/// </summary>
public class WebDefaultSettingsBlueprint
{
    /// <summary>
    /// Gets or sets the brand tagline.
    /// </summary>
    public string Tagline { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the company overview description template with {orgName} placeholder.
    /// </summary>
    public string CompanyDescription { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the footer mission statement template with {orgName} placeholder.
    /// </summary>
    public string FooterDescription { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the copyright notice template with {year} and {orgName} placeholders.
    /// </summary>
    public string CopyrightNotice { get; set; } = string.Empty;
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
    /// Gets or sets the optional parent category title for dropdown grouping (e.g. "Services", "Company").
    /// </summary>
    public string? Category { get; set; }

    /// <summary>
    /// Gets or sets whether this page acts as an official Call-to-Action button in the navigation header.
    /// </summary>
    public bool IsMenuCTA { get; set; } = false;

    /// <summary>
    /// Gets or sets whether this page is a legal compliance document (e.g. Privacy Policy, Terms of Service).
    /// </summary>
    public bool IsLegal { get; set; } = false;

    /// <summary>
    /// Gets or sets optional comma-separated tags (e.g. "quicklinks").
    /// </summary>
    public string? Tags { get; set; }

    /// <summary>
    /// Gets or sets whether this page should be displayed in footer columns.
    /// </summary>
    public bool? ShowInFooter { get; set; }

    /// <summary>
    /// Gets or sets the CTA button style ("primary", "secondary", etc.).
    /// </summary>
    public string? MenuCtaStyle { get; set; }

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
    /// Gets or sets the extended rich HTML body content for the section (used for legal documents and long-form articles).
    /// </summary>
    public string? FullDescription { get; set; }

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
    /// Gets or sets the optional kicker, badge, or mini title.
    /// </summary>
    public string? MiniTitle { get; set; }

    /// <summary>
    /// Gets or sets the card description or body text.
    /// </summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets extended HTML list items or bullet details (e.g. for pricing cards).
    /// </summary>
    public string? MoreDescription { get; set; }

    /// <summary>
    /// Gets or sets an optional CSS class applied to the list item container (e.g. 'featured').
    /// </summary>
    public string? CustomClass { get; set; }

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

    /// <summary>
    /// Gets or sets the secondary action button label.
    /// </summary>
    public string? SecondaryButtonText { get; set; }

    /// <summary>
    /// Gets or sets the secondary action button destination link.
    /// </summary>
    public string? SecondaryButtonLink { get; set; }
}
