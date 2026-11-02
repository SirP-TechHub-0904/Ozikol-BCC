using System.Collections.Concurrent;
using System.Reflection;
using System.Text;
using System.Text.Json;

namespace Ozikol.MasterDomain.Blueprints;

/// <summary>
/// Service responsible for loading and resolving embedded central template blueprints.
/// Reads character-for-character raw HTML, CSS, JavaScript, and mock sample JSON from the compiled assembly.
/// </summary>
public static class CentralBlueprintLoader
{
    private static readonly Assembly TargetAssembly = typeof(CentralBlueprintLoader).Assembly;
    private static readonly ConcurrentDictionary<string, string> ResourceCache = new();
    private static readonly ConcurrentDictionary<string, TemplateBlueprint> BlueprintCache = new();

    private static readonly Lazy<List<PresetManifestItem>> PresetsManifest = new(() =>
    {
        string json = ReadResource("Ozikol.MasterDomain.Blueprints.Templates.body.presets-manifest.json");
        return JsonSerializer.Deserialize<List<PresetManifestItem>>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
               ?? new List<PresetManifestItem>();
    });

    /// <summary>
    /// Gets a self-contained blueprint package for the specified category and optional section identifier.
    /// </summary>
    /// <param name="categoryKey">Category identifier (e.g., "menu", "hero", "breadcrumb", "body", "footer", "blog", "blog_detail").</param>
    /// <param name="sectionKey">Optional sub-section or preset key (e.g. "01-feature-grid").</param>
    /// <param name="forceReload">If true, evicts cache and re-reads fresh files.</param>
    /// <returns>A populated <see cref="TemplateBlueprint"/> instance.</returns>
    public static TemplateBlueprint GetBlueprint(string categoryKey, string? sectionKey = null, bool forceReload = false)
    {
        string normCategory = NormalizeKey(categoryKey);
        string? normSection = string.IsNullOrWhiteSpace(sectionKey) ? null : NormalizeKey(sectionKey);
        string cacheKey = normSection != null ? $"{normCategory}::{normSection}" : normCategory;

        if (forceReload)
        {
            BlueprintCache.TryRemove(cacheKey, out _);
        }

        return BlueprintCache.GetOrAdd(cacheKey, _ =>
        {
            string html = ReadBlueprintFile(normCategory, normSection, "template.html");
            string css = ReadBlueprintFile(normCategory, normSection, "styles.css");
            string js = ReadBlueprintFile(normCategory, normSection, "script.js");
            string sampleJson = ReadBlueprintFile(normCategory, normSection, "sample-content.json");

            var blueprint = new TemplateBlueprint
            {
                CategoryKey = categoryKey,
                SectionKey = sectionKey ?? categoryKey,
                HtmlTemplate = html,
                CssStyles = css,
                JsScript = js,
                SampleContentJson = sampleJson
            };

            PopulateMetadata(blueprint, normCategory, normSection);
            return blueprint;
        });
    }

    /// <summary>
    /// Retrieves all 11 canonical body section blueprints in sequential order.
    /// </summary>
    /// <returns>A read-only collection of <see cref="TemplateBlueprint"/> representing body archetypes.</returns>
    public static IReadOnlyList<TemplateBlueprint> GetBodySectionBlueprints()
    {
        var manifest = PresetsManifest.Value;
        var list = new List<TemplateBlueprint>(manifest.Count);

        foreach (var item in manifest)
        {
            var bp = GetBlueprint("body", item.FolderKey);
            bp.Name = item.Name;
            bp.Icon = item.Icon;
            bp.Badge = item.Badge;
            bp.Description = item.Description;
            bp.VariantCode = $"BODY_{item.FolderKey.Replace("-", "_").ToUpperInvariant()}";
            list.Add(bp);
        }

        return list;
    }

    /// <summary>
    /// Retrieves all foundational suite blueprints (Navbar, Hero, Breadcrumbs, 11 Body Sections, Footer, Blog Feed, Blog Detail).
    /// </summary>
    /// <returns>A list of all canonical suite template blueprints.</returns>
    public static IReadOnlyList<TemplateBlueprint> GetAllSuiteBlueprints()
    {
        var list = new List<TemplateBlueprint>
        {
            GetBlueprint("menu"),
            GetBlueprint("hero"),
            GetBlueprint("breadcrumb")
        };

        list.AddRange(GetBodySectionBlueprints());

        list.Add(GetBlueprint("footer"));
        list.Add(GetBlueprint("blog"));
        list.Add(GetBlueprint("blog-detail"));

        return list;
    }

    /// <summary>
    /// Evicts all cached blueprint and resource entries to force fresh re-reading from disk or embedded manifests.
    /// </summary>
    public static void InvalidateCache()
    {
        BlueprintCache.Clear();
        ResourceCache.Clear();
    }

    private static string ReadBlueprintFile(string category, string? section, string fileName)
    {
        // 1. Try reading directly from physical disk in development so live edits to .html, .css, .js, .json take effect immediately
        try
        {
            var diskContent = TryReadFromDisk(category, section, fileName);
            if (diskContent != null)
            {
                return diskContent;
            }
        }
        catch
        {
            // Fall back to assembly manifest resources if disk resolution fails
        }

        // 2. Build candidate search suffix for embedded assembly resources
        // E.g. .Templates.menu.template.html or .Templates.body._01_feature_grid.template.html
        var allNames = TargetAssembly.GetManifestResourceNames();

        string expectedPart = section != null
            ? $"{category}.{ConvertFolderToResourceSegment(section)}.{fileName}"
            : $"{category}.{fileName}";

        var match = allNames.FirstOrDefault(n => n.EndsWith(expectedPart, StringComparison.OrdinalIgnoreCase));

        if (match == null)
        {
            // Fallback match: contains category and filename
            match = allNames.FirstOrDefault(n =>
                n.Contains(category, StringComparison.OrdinalIgnoreCase) &&
                (section == null || n.Contains(ConvertFolderToResourceSegment(section), StringComparison.OrdinalIgnoreCase)) &&
                n.EndsWith(fileName, StringComparison.OrdinalIgnoreCase));
        }

        if (match == null)
        {
            // Return empty for optional script.js if not found
            if (fileName.Equals("script.js", StringComparison.OrdinalIgnoreCase))
            {
                return string.Empty;
            }

            throw new FileNotFoundException($"Blueprint resource not found for category='{category}', section='{section}', file='{fileName}'.");
        }

        return ReadResource(match);
    }

    /// <summary>
    /// Attempts to read template file directly from source workspace disk directory.
    /// </summary>
    /// <param name="category">Normalized category name.</param>
    /// <param name="section">Optional section name.</param>
    /// <param name="fileName">File name to read.</param>
    /// <returns>File text content if found on disk; otherwise null.</returns>
    private static string? TryReadFromDisk(string category, string? section, string fileName)
    {
        var baseDir = AppContext.BaseDirectory;
        var dir = new DirectoryInfo(baseDir);
        while (dir != null && !File.Exists(Path.Combine(dir.FullName, "Ozikol-BCC.sln")))
        {
            dir = dir.Parent;
        }

        if (dir != null)
        {
            string folderCategory = category.Replace('_', '-');
            string filePath = section != null
                ? Path.Combine(dir.FullName, "src", "Ozikol.MasterDomain", "Blueprints", "Templates", folderCategory, section, fileName)
                : Path.Combine(dir.FullName, "src", "Ozikol.MasterDomain", "Blueprints", "Templates", folderCategory, fileName);

            if (File.Exists(filePath))
            {
                return File.ReadAllText(filePath, Encoding.UTF8);
            }
        }

        return null;
    }

    private static string ReadResource(string resourceName)
    {
        return ResourceCache.GetOrAdd(resourceName, name =>
        {
            using var stream = TargetAssembly.GetManifestResourceStream(name);
            if (stream == null)
            {
                throw new InvalidOperationException($"Embedded manifest stream '{name}' was not found in assembly '{TargetAssembly.FullName}'.");
            }

            using var reader = new StreamReader(stream, Encoding.UTF8);
            return reader.ReadToEnd();
        });
    }

    private static string NormalizeKey(string key)
    {
        return key.Trim().ToLowerInvariant().Replace('-', '_');
    }

    private static string ConvertFolderToResourceSegment(string folderKey)
    {
        string norm = folderKey.Trim().Replace('-', '_');
        // MSBuild prepends an underscore if segment begins with digit
        if (norm.Length > 0 && char.IsDigit(norm[0]))
        {
            return $"_{norm}";
        }
        return norm;
    }

    private static void PopulateMetadata(TemplateBlueprint blueprint, string category, string? section)
    {
        switch (category)
        {
            case "menu":
                blueprint.Name = "Classic Light Corporate Navbar";
                blueprint.VariantCode = "MENU_CLASSIC";
                blueprint.Description = "Responsive 3-zone corporate navbar with top utility bar, search/auth controls, and mobile navigation drawer.";
                blueprint.Icon = "menu";
                blueprint.Badge = "Navigation";
                break;

            case "hero":
                blueprint.Name = "Omni-Slider Showcase Hero";
                blueprint.VariantCode = "HERO_SLIDER";
                blueprint.Description = "Full-bleed dual-slide showcase with backdrop blur, customizable headlines, and action button pairing.";
                blueprint.Icon = "view_carousel";
                blueprint.Badge = "Showcase";
                break;

            case "breadcrumb":
                blueprint.Name = "Subpage Banner & Breadcrumb Trail";
                blueprint.VariantCode = "BREADCRUMB_BANNER";
                blueprint.Description = "Subpage header banner with high-contrast graphic background, page title, and structured breadcrumb navigation trail.";
                blueprint.Icon = "linear_scale";
                blueprint.Badge = "Utility";
                break;

            case "footer":
                blueprint.Name = "Corporate Multi-Column Mega Footer";
                blueprint.VariantCode = "FOOTER_MEGA";
                blueprint.Description = "Comprehensive enterprise footer with category links, quicklinks, newsletter opt-in, business hours, and legal policy strip.";
                blueprint.Icon = "vertical_align_bottom";
                blueprint.Badge = "Footer";
                break;

            case "blog":
                blueprint.Name = "Grid Article Showcase";
                blueprint.VariantCode = "BLOG_GRID";
                blueprint.Description = "3-column responsive article feed with category pills, author stamps, publication dates, and read more actions.";
                blueprint.Icon = "newspaper";
                blueprint.Badge = "Articles";
                break;

            case "blog_detail":
            case "blog_details":
                blueprint.Name = "Longform Editorial Article Detail";
                blueprint.VariantCode = "BLOG_DETAIL";
                blueprint.Description = "Two-column editorial article layout with rich typography, author biography card, topic tags, and sidebar widgets.";
                blueprint.Icon = "article";
                blueprint.Badge = "Article";
                break;

            case "body":
                if (section != null)
                {
                    var item = PresetsManifest.Value.FirstOrDefault(m => NormalizeKey(m.FolderKey) == NormalizeKey(section));
                    if (item != null)
                    {
                        blueprint.Name = item.Name;
                        blueprint.Icon = item.Icon;
                        blueprint.Badge = item.Badge;
                        blueprint.Description = item.Description;
                        blueprint.VariantCode = $"BODY_{item.FolderKey.Replace("-", "_").ToUpperInvariant()}";
                    }
                }
                else
                {
                    blueprint.Name = "3-Col Feature Grid";
                    blueprint.VariantCode = "BODY_01_FEATURE_GRID";
                    blueprint.Description = "Elevated 3-column cards with vibrant icon badges, soft drop shadows, and hover elevation.";
                    blueprint.Icon = "grid_view";
                    blueprint.Badge = "Features";
                }
                break;
        }
    }

    private class PresetManifestItem
    {
        public int Index { get; set; }
        public string FolderKey { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Icon { get; set; } = string.Empty;
        public string Badge { get; set; } = string.Empty;
        public string Description { get; set; } = string.Empty;
    }
}
