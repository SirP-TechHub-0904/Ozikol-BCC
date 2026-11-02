using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;
using Ozikol_BCC.Application.Interfaces.Services;

namespace Ozikol.Central.Services
{
    /// <summary>
    /// Enterprise Section & Page Compiler Renderer Service.
    /// Handles deterministic Mustache template hydration, multi-tier hierarchical menu and list loops,
    /// CDN dependency resolution, scoped CSS merging, and complete HTML5 document compilation.
    /// </summary>
    public class SectionCompilerRendererService : ISectionCompilerRendererService
    {
        private readonly ISectionLibraryResolverService? _libraryResolverService;
        private readonly ILogger<SectionCompilerRendererService>? _logger;

        private static readonly BrandIdentityRenderDto DefaultBrand = new()
        {
            LogoUrl = "https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=300",
            WhiteLogoUrl = "https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=300",
            FaviconUrl = "/favicon.ico",
            WebsiteUrl = "#",
            Name = "Ozikol Workspace",
            LoginButtonText = "Sign In",
            RegisterButtonText = "Get Started",
            PhoneNumber = "+1 (800) 555-0199",
            EmailAddress = "contact@ozikol.com",
            Address = "100 Innovation Parkway, Suite 500, San Francisco, CA"
        };

        /// <summary>
        /// Initializes a new instance of the <see cref="SectionCompilerRendererService"/> class.
        /// </summary>
        /// <param name="libraryResolverService">Optional library resolver for CDN asset resolution.</param>
        /// <param name="logger">Logger instance.</param>
        public SectionCompilerRendererService(
            ISectionLibraryResolverService? libraryResolverService = null,
            ILogger<SectionCompilerRendererService>? logger = null)
        {
            _libraryResolverService = libraryResolverService;
            _logger = logger;
        }

        /// <inheritdoc />
        public string HydrateTemplate(string htmlTemplate, string? sampleContentJson, BrandIdentityRenderDto? brand = null)
        {
            if (string.IsNullOrWhiteSpace(htmlTemplate))
                return string.Empty;

            var effectiveBrand = brand ?? DefaultBrand;
            var result = htmlTemplate;

            JsonDocument? doc = null;
            if (!string.IsNullOrWhiteSpace(sampleContentJson))
            {
                try
                {
                    doc = JsonDocument.Parse(sampleContentJson);
                }
                catch (Exception ex)
                {
                    _logger?.LogDebug(ex, "Failed to parse sampleContentJson in SectionCompilerRendererService. Proceeding with fallbacks.");
                }
            }

            var root = doc?.RootElement;

            // ---------------------------------------------------------------------
            // 1. TIER 1: HIERARCHICAL MENUS & NAVIGATION
            // ---------------------------------------------------------------------
            var menuRegex = new Regex(@"\{\{#(?:each\s+)?(?:menu_items|menu|navigation|nav_links|MenuItems|NavLinks)\}\}([\s\S]*?)\{\{\/(?:each\s+)?(?:menu_items|menu|navigation|nav_links|MenuItems|NavLinks)\}\}", RegexOptions.IgnoreCase);
            result = menuRegex.Replace(result, match =>
            {
                var itemTemplate = match.Groups[1].Value;
                var sb = new StringBuilder();

                var menuElement = FindJsonProperty(root, "menu_items", "MenuItems", "menu", "navigation", "nav_links");
                if (menuElement.HasValue && menuElement.Value.ValueKind == JsonValueKind.Array && menuElement.Value.GetArrayLength() > 0)
                {
                    var idx = 0;
                    foreach (var item in menuElement.Value.EnumerateArray())
                    {
                        var renderedItem = RenderMenuItem(itemTemplate, item, idx++);
                        sb.AppendLine(renderedItem);
                    }
                }
                else
                {
                    // Default navigation fallback
                    sb.AppendLine(RenderDefaultMenuFallback(itemTemplate));
                }

                return sb.ToString();
            });

            // ---------------------------------------------------------------------
            // 2. TIER 2: REPEATED LISTS & COMPONENT GRIDS
            // ---------------------------------------------------------------------
            var listBlockRegex = new Regex(@"\{\{#(?:each\s+)?([a-zA-Z0-9_\-]+)\}\}([\s\S]*?)\{\{\/(?:each\s+)?\1\}\}");
            result = listBlockRegex.Replace(result, match =>
            {
                var blockName = match.Groups[1].Value;
                var itemTemplate = match.Groups[2].Value;

                if (Regex.IsMatch(blockName, @"^(?:if|unless|with)$", RegexOptions.IgnoreCase))
                    return match.Value;

                var listProp = FindJsonProperty(root, blockName);
                if (listProp.HasValue && listProp.Value.ValueKind == JsonValueKind.Array)
                {
                    var sb = new StringBuilder();
                    var idx = 0;
                    foreach (var it in listProp.Value.EnumerateArray())
                    {
                        var rendered = RenderListItem(itemTemplate, it, idx++);
                        sb.AppendLine(rendered);
                    }
                    return sb.ToString();
                }

                // Fallback for SectionLists / PageSectionLists
                if (Regex.IsMatch(blockName, @"^(?:SectionLists|PageSectionLists|items|features|cards|services|testimonials|pricing_plans|faq)$", RegexOptions.IgnoreCase))
                {
                    return RenderDefaultSectionListsFallback(itemTemplate);
                }

                return string.Empty;
            });

            // ---------------------------------------------------------------------
            // 3. TIER 3: BRAND & IDENTITY TOKENS
            // ---------------------------------------------------------------------
            result = Regex.Replace(result, @"\{\{\s*Brand\.LogoUrl\s*\}\}", effectiveBrand.LogoUrl ?? DefaultBrand.LogoUrl ?? string.Empty, RegexOptions.IgnoreCase);
            result = Regex.Replace(result, @"\{\{\s*Brand\.WhiteLogoUrl\s*\}\}", effectiveBrand.WhiteLogoUrl ?? effectiveBrand.LogoUrl ?? DefaultBrand.WhiteLogoUrl ?? string.Empty, RegexOptions.IgnoreCase);
            result = Regex.Replace(result, @"\{\{\s*Brand\.FaviconUrl\s*\}\}", effectiveBrand.FaviconUrl ?? DefaultBrand.FaviconUrl ?? string.Empty, RegexOptions.IgnoreCase);
            result = Regex.Replace(result, @"\{\{\s*Brand\.WebsiteUrl\s*\}\}", effectiveBrand.WebsiteUrl ?? DefaultBrand.WebsiteUrl ?? string.Empty, RegexOptions.IgnoreCase);
            result = Regex.Replace(result, @"\{\{\s*Brand\.Name\s*\}\}", effectiveBrand.Name ?? DefaultBrand.Name ?? string.Empty, RegexOptions.IgnoreCase);
            result = Regex.Replace(result, @"\{\{\s*Brand\.LoginButtonText\s*\}\}", effectiveBrand.LoginButtonText ?? DefaultBrand.LoginButtonText ?? string.Empty, RegexOptions.IgnoreCase);
            result = Regex.Replace(result, @"\{\{\s*Brand\.RegisterButtonText\s*\}\}", effectiveBrand.RegisterButtonText ?? DefaultBrand.RegisterButtonText ?? string.Empty, RegexOptions.IgnoreCase);
            result = Regex.Replace(result, @"\{\{\s*Brand\.(?:PhoneNumber|Phone)\s*\}\}", effectiveBrand.PhoneNumber ?? DefaultBrand.PhoneNumber ?? string.Empty, RegexOptions.IgnoreCase);
            result = Regex.Replace(result, @"\{\{\s*Brand\.(?:EmailAddress|Email)\s*\}\}", effectiveBrand.EmailAddress ?? DefaultBrand.EmailAddress ?? string.Empty, RegexOptions.IgnoreCase);
            result = Regex.Replace(result, @"\{\{\s*Brand\.Address\s*\}\}", effectiveBrand.Address ?? DefaultBrand.Address ?? string.Empty, RegexOptions.IgnoreCase);

            result = Regex.Replace(result, @"\{\{\s*CompanyName\s*\}\}", effectiveBrand.Name ?? DefaultBrand.Name ?? string.Empty, RegexOptions.IgnoreCase);
            result = Regex.Replace(result, @"\{\{\s*CompanyEmail\s*\}\}", effectiveBrand.EmailAddress ?? DefaultBrand.EmailAddress ?? string.Empty, RegexOptions.IgnoreCase);
            result = Regex.Replace(result, @"\{\{\s*CompanyPhone\s*\}\}", effectiveBrand.PhoneNumber ?? DefaultBrand.PhoneNumber ?? string.Empty, RegexOptions.IgnoreCase);

            // ---------------------------------------------------------------------
            // 4. TIER 4: SCALAR ROOT TOKENS FROM JSON WITH BIDIRECTIONAL FALLBACK
            // ---------------------------------------------------------------------
            if (root.HasValue && root.Value.ValueKind == JsonValueKind.Object)
            {
                var descVal = GetJsonString(root.Value, "Description", "description");
                var fullDescVal = GetJsonString(root.Value, "FullDescription", "fullDescription", "full_description");

                if (string.IsNullOrWhiteSpace(descVal) && !string.IsNullOrWhiteSpace(fullDescVal))
                {
                    descVal = fullDescVal;
                }
                if (string.IsNullOrWhiteSpace(fullDescVal) && !string.IsNullOrWhiteSpace(descVal))
                {
                    fullDescVal = $"<p>{descVal}</p>";
                }

                if (!string.IsNullOrWhiteSpace(descVal))
                {
                    result = Regex.Replace(result, @"\{\{\s*Description\s*\}\}", descVal, RegexOptions.IgnoreCase);
                }
                if (!string.IsNullOrWhiteSpace(fullDescVal))
                {
                    result = Regex.Replace(result, @"\{\{\{\s*FullDescription\s*\}\}\}", fullDescVal, RegexOptions.IgnoreCase);
                    result = Regex.Replace(result, @"\{\{\s*FullDescription\s*\}\}", fullDescVal, RegexOptions.IgnoreCase);
                }

                foreach (var prop in root.Value.EnumerateObject())
                {
                    if (prop.Value.ValueKind == JsonValueKind.String)
                    {
                        var val = prop.Value.GetString() ?? string.Empty;
                        result = Regex.Replace(result, $@"\{{\{{\s*{Regex.Escape(prop.Name)}\s*\}}\}}", val, RegexOptions.IgnoreCase);
                    }
                    else if (prop.Value.ValueKind == JsonValueKind.Number)
                    {
                        var val = prop.Value.ToString();
                        result = Regex.Replace(result, $@"\{{\{{\s*{Regex.Escape(prop.Name)}\s*\}}\}}", val, RegexOptions.IgnoreCase);
                    }
                }
            }

            // ---------------------------------------------------------------------
            // 5. TIER 5: SMART FALLBACKS & RESILIENT CLEANUP
            // ---------------------------------------------------------------------
            result = Regex.Replace(result, @"\{\{\s*Title\s*\}\}", "Empower Your Digital Growth with Modern Architecture", RegexOptions.IgnoreCase);
            result = Regex.Replace(result, @"\{\{\s*MiniTitle\s*\}\}", "Next-Generation Capability", RegexOptions.IgnoreCase);
            result = Regex.Replace(result, @"\{\{\s*Description\s*\}\}", "Transform complex workflows into seamless, high-velocity digital experiences with zero architectural overhead.", RegexOptions.IgnoreCase);
            result = Regex.Replace(result, @"\{\{\{\s*FullDescription\s*\}\}\}", "<p>Transform complex workflows into seamless, high-velocity digital experiences with zero architectural overhead.</p>", RegexOptions.IgnoreCase);
            result = Regex.Replace(result, @"\{\{\s*FullDescription\s*\}\}", "<p>Transform complex workflows into seamless, high-velocity digital experiences with zero architectural overhead.</p>", RegexOptions.IgnoreCase);
            result = Regex.Replace(result, @"\{\{\s*MoreDescription\s*\}\}", "Engineered for reliability, modular flexibility, and lightning-fast global responsiveness.", RegexOptions.IgnoreCase);
            result = Regex.Replace(result, @"\{\{\s*ButtonText\s*\}\}", "Get Started Today", RegexOptions.IgnoreCase);
            result = Regex.Replace(result, @"\{\{\s*ButtonLink\s*\}\}", "#", RegexOptions.IgnoreCase);
            result = Regex.Replace(result, @"\{\{\s*SecondButtonText\s*\}\}", "Watch Product Tour", RegexOptions.IgnoreCase);
            result = Regex.Replace(result, @"\{\{\s*SecondButtonLink\s*\}\}", "#", RegexOptions.IgnoreCase);
            result = Regex.Replace(result, @"\{\{\s*IconText\s*\}\}", "fa-solid fa-arrow-right", RegexOptions.IgnoreCase);
            result = Regex.Replace(result, @"\{\{\s*ImageUrl\s*\}\}", "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1000", RegexOptions.IgnoreCase);
            result = Regex.Replace(result, @"\{\{\s*BannerImage\s*\}\}", "https://images.unsplash.com/photo-1551434678-e076c223a692?w=1200", RegexOptions.IgnoreCase);
            result = Regex.Replace(result, @"\{\{\s*VideoUrl\s*\}\}", "https://www.youtube.com/watch?v=dQw4w9WgXcQ", RegexOptions.IgnoreCase);
            result = Regex.Replace(result, @"\{\{\s*DirectUrl\s*\}\}", "#", RegexOptions.IgnoreCase);
            result = Regex.Replace(result, @"\{\{\s*Year\s*\}\}", DateTime.UtcNow.Year.ToString(), RegexOptions.IgnoreCase);
            result = Regex.Replace(result, @"\{\{\s*CopyrightText\s*\}\}", $"© {DateTime.UtcNow.Year} {effectiveBrand.Name}. All rights reserved.", RegexOptions.IgnoreCase);

            // Clean up unresolved block tags and dangling {{...}} tokens
            result = Regex.Replace(result, @"\{\{#(?:if|unless)\s+[\w\.\-]+\}\}", string.Empty, RegexOptions.IgnoreCase);
            result = Regex.Replace(result, @"\{\{\/(?:if|unless)\}\}", string.Empty, RegexOptions.IgnoreCase);
            result = Regex.Replace(result, @"\{\{#each\s+[\w\.\-]+\}\}", string.Empty, RegexOptions.IgnoreCase);
            result = Regex.Replace(result, @"\{\{\/each\}\}", string.Empty, RegexOptions.IgnoreCase);
            result = Regex.Replace(result, @"\{\{\{[a-zA-Z0-9_\-\.]+\}\}\}", string.Empty);
            result = Regex.Replace(result, @"\{\{[a-zA-Z0-9_\-\.]+\}\}", string.Empty);

            return result;
        }

        /// <inheritdoc />
        public SectionRenderResult RenderSection(SectionRenderRequest request)
        {
            if (request == null)
            {
                return new SectionRenderResult
                {
                    Success = false,
                    CompiledHtmlDocument = "<!DOCTYPE html><html><body><p>No section request provided.</p></body></html>"
                };
            }

            var isDark = string.Equals(request.CanvasTheme, "dark", StringComparison.OrdinalIgnoreCase);
            var canvasBg = isDark ? "#0b0f19" : "#ffffff";
            var canvasColor = isDark ? "#f8fafc" : "#111827";

            // Hydrate HTML
            var hydratedHtml = HydrateTemplate(request.HtmlTemplate ?? string.Empty, request.SampleContentJson, request.Brand);

            // Resolve dependencies
            var resolvedCss = new List<string>();
            var resolvedJs = new List<string>();
            var autoInits = new List<string>();

            if (request.RequiredLibraries != null && request.RequiredLibraries.Count > 0)
            {
                foreach (var libKey in request.RequiredLibraries)
                {
                    if (SectionLibraryResolverService.Catalog.TryGetValue(libKey, out var def))
                    {
                        resolvedCss.AddRange(def.CssUrls);
                        resolvedJs.AddRange(def.JsUrls);
                        if (!string.IsNullOrWhiteSpace(def.AutoInitJs))
                        {
                            autoInits.Add(def.AutoInitJs);
                        }
                    }
                }
            }

            // Deduplicate
            resolvedCss = resolvedCss.Distinct(StringComparer.OrdinalIgnoreCase).ToList();
            resolvedJs = resolvedJs.Distinct(StringComparer.OrdinalIgnoreCase).ToList();

            var fontLinks = @"<link rel=""preconnect"" href=""https://fonts.googleapis.com"">
    <link rel=""preconnect"" href=""https://fonts.gstatic.com"" crossorigin>
    <link href=""https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap"" rel=""stylesheet"">";

            var standardIcons = @"<link rel=""stylesheet"" href=""https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"">
    <link rel=""stylesheet"" href=""https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css"">
    <link rel=""stylesheet"" href=""https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0"">";

            var libCssTags = string.Join("\n    ", resolvedCss.Select(url => $@"<link rel=""stylesheet"" href=""{url}"">"));
            var suiteCssTag = !string.IsNullOrWhiteSpace(request.SuiteCompiledCssUrl)
                ? $@"<link rel=""stylesheet"" href=""{request.SuiteCompiledCssUrl}"">"
                : string.Empty;

            var libJsTags = string.Join("\n    ", resolvedJs.Select(url => $@"<script src=""{url}""></script>"));
            var autoInitsJs = autoInits.Count > 0 ? string.Join("\n        ", autoInits) : string.Empty;

            var sectionJs = (request.JsScript ?? string.Empty).Trim();
            var variantCode = request.VariantCode ?? "sec";

            var fullDocument = $@"<!DOCTYPE html>
<html lang=""en"" data-theme=""{(isDark ? "dark" : "light")}"">
<head>
    <meta charset=""utf-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
    <title>{request.Name ?? "Modular Section Preview"}</title>
    {fontLinks}
    {standardIcons}
    {libCssTags}
    {suiteCssTag}
    <style>
        :root {{
            --oz-canvas-bg: {canvasBg};
            --oz-canvas-text: {canvasColor};
            --oz-primary: #ec4899;
            --oz-primary-hover: #db2777;
            --oz-font-main: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
        }}
        *, *::before, *::after {{
            box-sizing: border-box;
        }}
        html, body {{
            margin: 0;
            padding: 0;
            background: var(--oz-canvas-bg);
            color: var(--oz-canvas-text);
            font-family: var(--oz-font-main);
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            overflow-x: hidden;
            min-height: 100vh;
        }}
        /* Scoped Component CSS */
        {request.ScopedCss ?? string.Empty}
    </style>
</head>
<body>
    <main id=""sectionPreviewRoot"" class=""oz-section-root"">
        {hydratedHtml}
    </main>

    {libJsTags}

    <script>
        document.addEventListener('DOMContentLoaded', function() {{
            try {{
                {autoInitsJs}
            }} catch (initErr) {{
                console.warn('[Sandbox AutoInit Notice]:', initErr);
            }}

            try {{
                (function(sectionId) {{
                    {sectionJs}
                }})('{variantCode}');
            }} catch (scriptErr) {{
                console.warn('[Sandbox Section Script Warning]:', scriptErr);
            }}

            setTimeout(function() {{
                window.dispatchEvent(new Event('resize'));
            }}, 150);
        }});
    </script>
</body>
</html>";

            return new SectionRenderResult
            {
                Success = true,
                CompiledHtmlDocument = fullDocument,
                HydratedSectionHtml = hydratedHtml,
                ResolvedCssUrls = resolvedCss,
                ResolvedJsUrls = resolvedJs
            };
        }

        /// <inheritdoc />
        public PageRenderResult RenderPage(PageRenderRequest request)
        {
            if (request == null || request.Sections == null || request.Sections.Count == 0)
            {
                return new PageRenderResult
                {
                    Success = false,
                    CompiledPageDocument = "<!DOCTYPE html><html><body><p>No sections to assemble.</p></body></html>",
                    TotalSectionsCount = 0
                };
            }

            var isDark = string.Equals(request.CanvasTheme, "dark", StringComparison.OrdinalIgnoreCase);
            var canvasBg = isDark ? "#0b0f19" : "#ffffff";
            var canvasColor = isDark ? "#f8fafc" : "#111827";

            // Collect all libraries
            var allLibs = request.Sections
                .Where(s => s.RequiredLibraries != null)
                .SelectMany(s => s.RequiredLibraries!)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            var resolvedCss = new List<string>();
            var resolvedJs = new List<string>();
            var autoInits = new List<string>();

            foreach (var libKey in allLibs)
            {
                if (SectionLibraryResolverService.Catalog.TryGetValue(libKey, out var def))
                {
                    resolvedCss.AddRange(def.CssUrls);
                    resolvedJs.AddRange(def.JsUrls);
                    if (!string.IsNullOrWhiteSpace(def.AutoInitJs))
                    {
                        autoInits.Add(def.AutoInitJs);
                    }
                }
            }

            resolvedCss = resolvedCss.Distinct(StringComparer.OrdinalIgnoreCase).ToList();
            resolvedJs = resolvedJs.Distinct(StringComparer.OrdinalIgnoreCase).ToList();

            var fontLinks = @"<link rel=""preconnect"" href=""https://fonts.googleapis.com"">
    <link rel=""preconnect"" href=""https://fonts.gstatic.com"" crossorigin>
    <link href=""https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap"" rel=""stylesheet"">";

            var standardIcons = @"<link rel=""stylesheet"" href=""https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"">
    <link rel=""stylesheet"" href=""https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css"">
    <link rel=""stylesheet"" href=""https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0"">";

            var libCssTags = string.Join("\n    ", resolvedCss.Select(url => $@"<link rel=""stylesheet"" href=""{url}"">"));
            var suiteCssTag = !string.IsNullOrWhiteSpace(request.SuiteCompiledCssUrl)
                ? $@"<link rel=""stylesheet"" href=""{request.SuiteCompiledCssUrl}"">"
                : string.Empty;

            var libJsTags = string.Join("\n    ", resolvedJs.Select(url => $@"<script src=""{url}""></script>"));
            var autoInitsJs = autoInits.Count > 0 ? string.Join("\n        ", autoInits) : string.Empty;

            var combinedCss = new List<string>();
            var combinedHtml = new List<string>();
            var combinedScripts = new List<string>();

            var idx = 0;
            foreach (var sec in request.Sections)
            {
                var secId = sec.VariantCode ?? $"sec_{idx}";
                if (!string.IsNullOrWhiteSpace(sec.ScopedCss))
                {
                    combinedCss.Add($"/* Section: {sec.Name ?? secId} */\n{sec.ScopedCss}");
                }

                var hydrated = HydrateTemplate(sec.HtmlTemplate ?? string.Empty, sec.SampleContentJson, sec.Brand ?? request.Brand);
                combinedHtml.Add($"<!-- Section: {sec.Name ?? secId} -->\n<div id=\"wrapper_{secId}\" class=\"oz-page-section-wrapper\">\n{hydrated}\n</div>");

                if (!string.IsNullOrWhiteSpace(sec.JsScript))
                {
                    combinedScripts.Add($@"
            // Section Script: {sec.Name ?? secId}
            try {{
                (function(sectionId) {{
                    {sec.JsScript.Trim()}
                }})('{secId}');
            }} catch (secErr_{idx}) {{
                console.warn('[Page Section Script Warning - {secId}]:', secErr_{idx});
            }}");
                }
                idx++;
            }

            var fullPageDocument = $@"<!DOCTYPE html>
<html lang=""en"" data-theme=""{(isDark ? "dark" : "light")}"">
<head>
    <meta charset=""utf-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
    <title>{request.PageTitle}</title>
    {fontLinks}
    {standardIcons}
    {libCssTags}
    {suiteCssTag}
    <style>
        :root {{
            --oz-canvas-bg: {canvasBg};
            --oz-canvas-text: {canvasColor};
            --oz-primary: #ec4899;
            --oz-font-main: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
        }}
        *, *::before, *::after {{
            box-sizing: border-box;
        }}
        html, body {{
            margin: 0;
            padding: 0;
            background: var(--oz-canvas-bg);
            color: var(--oz-canvas-text);
            font-family: var(--oz-font-main);
            -webkit-font-smoothing: antialiased;
            overflow-x: hidden;
            min-height: 100vh;
        }}
        {string.Join("\n\n", combinedCss)}
    </style>
</head>
<body>
    <div id=""ozikolPageRoot"" class=""oz-page-root"">
        {string.Join("\n\n", combinedHtml)}
    </div>

    {libJsTags}

    <script>
        document.addEventListener('DOMContentLoaded', function() {{
            try {{
                {autoInitsJs}
            }} catch (autoErr) {{
                console.warn('[Page AutoInit Warning]:', autoErr);
            }}

            {string.Join("\n", combinedScripts)}

            setTimeout(function() {{
                window.dispatchEvent(new Event('resize'));
            }}, 200);
        }});
    </script>
</body>
</html>";

            return new PageRenderResult
            {
                Success = true,
                CompiledPageDocument = fullPageDocument,
                TotalSectionsCount = request.Sections.Count
            };
        }

        #region Helper Methods

        private static JsonElement? FindJsonProperty(JsonElement? root, params string[] propertyNames)
        {
            if (!root.HasValue || root.Value.ValueKind != JsonValueKind.Object)
                return null;

            foreach (var name in propertyNames)
            {
                if (root.Value.TryGetProperty(name, out var prop))
                    return prop;
            }

            // Case-insensitive search
            foreach (var prop in root.Value.EnumerateObject())
            {
                foreach (var name in propertyNames)
                {
                    if (string.Equals(prop.Name, name, StringComparison.OrdinalIgnoreCase))
                        return prop.Value;
                }
            }

            return null;
        }

        private static string RenderMenuItem(string itemTemplate, JsonElement item, int index)
        {
            var itemHtml = itemTemplate;
            var itemTitle = GetJsonString(item, "Title", "title", "label", "name") ?? $"Menu {index + 1}";
            var itemUrl = GetJsonString(item, "Url", "url", "link", "href") ?? "#";
            var itemIcon = GetJsonString(item, "Icon", "icon", "IconText") ?? string.Empty;
            var itemBadge = GetJsonString(item, "Badge", "badge") ?? string.Empty;

            var subItems = FindJsonProperty(item, "SubItems", "sub_items", "children", "dropdown_items", "sub_menu");
            var hasChildren = subItems.HasValue && subItems.Value.ValueKind == JsonValueKind.Array && subItems.Value.GetArrayLength() > 0;

            // SubItems loop
            var subRegex = new Regex(@"\{\{#(?:each\s+)?(?:sub_items|children|dropdown_items|sub_menu|SubItems)\}\}([\s\S]*?)\{\{\/(?:each\s+)?(?:sub_items|children|dropdown_items|sub_menu|SubItems)\}\}", RegexOptions.IgnoreCase);
            itemHtml = subRegex.Replace(itemHtml, subMatch =>
            {
                if (!hasChildren) return string.Empty;
                var subTemplate = subMatch.Groups[1].Value;
                var sbSub = new StringBuilder();
                foreach (var sub in subItems!.Value.EnumerateArray())
                {
                    var subTitle = GetJsonString(sub, "Title", "title", "label", "name") ?? "Sub Item";
                    var subUrl = GetJsonString(sub, "Url", "url", "link", "href") ?? "#";
                    var subDesc = GetJsonString(sub, "Description", "description", "desc") ?? string.Empty;
                    var subIcon = GetJsonString(sub, "Icon", "icon", "IconText") ?? string.Empty;

                    var renderedSub = subTemplate;
                    renderedSub = Regex.Replace(renderedSub, @"\{\{\s*(?:Title|title|label|name)\s*\}\}", subTitle, RegexOptions.IgnoreCase);
                    renderedSub = Regex.Replace(renderedSub, @"\{\{\s*(?:Url|url|link|href)\s*\}\}", subUrl, RegexOptions.IgnoreCase);
                    renderedSub = Regex.Replace(renderedSub, @"\{\{\s*(?:Description|description|desc)\s*\}\}", subDesc, RegexOptions.IgnoreCase);
                    renderedSub = Regex.Replace(renderedSub, @"\{\{\s*(?:Icon|icon|IconText)\s*\}\}", subIcon, RegexOptions.IgnoreCase);
                    sbSub.AppendLine(renderedSub);
                }
                return sbSub.ToString();
            });

            // Conditionals
            if (hasChildren)
            {
                itemHtml = Regex.Replace(itemHtml, @"\{\{#(?:has_children|HasChildren)\}\}([\s\S]*?)\{\{\/(?:has_children|HasChildren)\}\}", "$1", RegexOptions.IgnoreCase);
                itemHtml = Regex.Replace(itemHtml, @"\{\{\^(?:has_children|HasChildren)\}\}([\s\S]*?)\{\{\/(?:has_children|HasChildren)\}\}", string.Empty, RegexOptions.IgnoreCase);
            }
            else
            {
                itemHtml = Regex.Replace(itemHtml, @"\{\{#(?:has_children|HasChildren)\}\}([\s\S]*?)\{\{\/(?:has_children|HasChildren)\}\}", string.Empty, RegexOptions.IgnoreCase);
                itemHtml = Regex.Replace(itemHtml, @"\{\{\^(?:has_children|HasChildren)\}\}([\s\S]*?)\{\{\/(?:has_children|HasChildren)\}\}", "$1", RegexOptions.IgnoreCase);
            }

            itemHtml = Regex.Replace(itemHtml, @"\{\{\s*(?:Title|title|label|name)\s*\}\}", itemTitle, RegexOptions.IgnoreCase);
            itemHtml = Regex.Replace(itemHtml, @"\{\{\s*(?:Url|url|link|href)\s*\}\}", itemUrl, RegexOptions.IgnoreCase);
            itemHtml = Regex.Replace(itemHtml, @"\{\{\s*(?:Icon|icon|IconText)\s*\}\}", itemIcon, RegexOptions.IgnoreCase);
            itemHtml = Regex.Replace(itemHtml, @"\{\{\s*(?:Badge|badge)\s*\}\}", itemBadge, RegexOptions.IgnoreCase);

            return itemHtml;
        }

        private static string RenderDefaultMenuFallback(string itemTemplate)
        {
            var sb = new StringBuilder();
            var items = new[]
            {
                new { Title = "Home", Url = "/" },
                new { Title = "Features", Url = "#features" },
                new { Title = "Solutions", Url = "#solutions" },
                new { Title = "Pricing", Url = "#pricing" },
                new { Title = "Contact", Url = "#contact" }
            };

            foreach (var item in items)
            {
                var h = itemTemplate;
                h = Regex.Replace(h, @"\{\{\s*(?:Title|title|label|name)\s*\}\}", item.Title, RegexOptions.IgnoreCase);
                h = Regex.Replace(h, @"\{\{\s*(?:Url|url|link|href)\s*\}\}", item.Url, RegexOptions.IgnoreCase);
                h = Regex.Replace(h, @"\{\{#(?:has_children|HasChildren)\}\}([\s\S]*?)\{\{\/(?:has_children|HasChildren)\}\}", string.Empty, RegexOptions.IgnoreCase);
                h = Regex.Replace(h, @"\{\{\^(?:has_children|HasChildren)\}\}([\s\S]*?)\{\{\/(?:has_children|HasChildren)\}\}", "$1", RegexOptions.IgnoreCase);
                sb.AppendLine(h);
            }

            return sb.ToString();
        }

        private static string RenderListItem(string itemTemplate, JsonElement it, int index)
        {
            var rendered = itemTemplate;
            if (it.ValueKind == JsonValueKind.String)
            {
                var s = it.GetString() ?? string.Empty;
                rendered = rendered.Replace("{{.}}", s).Replace("{{this}}", s);
                return rendered;
            }

            if (it.ValueKind == JsonValueKind.Object)
            {
                foreach (var prop in it.EnumerateObject())
                {
                    if (prop.Value.ValueKind == JsonValueKind.String)
                    {
                        var val = prop.Value.GetString() ?? string.Empty;
                        rendered = Regex.Replace(rendered, $@"\{{\{{\s*{Regex.Escape(prop.Name)}\s*\}}\}}", val, RegexOptions.IgnoreCase);
                    }
                    else if (prop.Value.ValueKind == JsonValueKind.Number)
                    {
                        var val = prop.Value.ToString();
                        rendered = Regex.Replace(rendered, $@"\{{\{{\s*{Regex.Escape(prop.Name)}\s*\}}\}}", val, RegexOptions.IgnoreCase);
                    }
                }
            }

            var title = GetJsonString(it, "Title", "title", "label", "name") ?? $"Item {index + 1}";
            var miniTitle = GetJsonString(it, "MiniTitle", "mini_title") ?? $"0{index + 1}";
            var desc = GetJsonString(it, "Description", "description") ?? string.Empty;
            var moreDesc = GetJsonString(it, "MoreDescription", "more_description") ?? string.Empty;
            var btnText = GetJsonString(it, "ButtonText", "button_text") ?? "Learn More";
            var btnLink = GetJsonString(it, "ButtonLink", "button_link") ?? "#";
            var iconText = GetJsonString(it, "IconText", "icon") ?? "fa-solid fa-check";
            var imgUrl = GetJsonString(it, "ImageUrl", "image") ?? "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600";
            var price = GetJsonString(it, "Price", "price") ?? "$49";
            var period = GetJsonString(it, "Period", "period") ?? "/mo";
            var customClass = GetJsonString(it, "CustomClass", "custom_class") ?? string.Empty;

            rendered = Regex.Replace(rendered, @"\{\{\s*Title\s*\}\}", title, RegexOptions.IgnoreCase);
            rendered = Regex.Replace(rendered, @"\{\{\s*MiniTitle\s*\}\}", miniTitle, RegexOptions.IgnoreCase);
            rendered = Regex.Replace(rendered, @"\{\{\s*Description\s*\}\}", desc, RegexOptions.IgnoreCase);
            rendered = Regex.Replace(rendered, @"\{\{\s*MoreDescription\s*\}\}", moreDesc, RegexOptions.IgnoreCase);
            rendered = Regex.Replace(rendered, @"\{\{\s*ButtonText\s*\}\}", btnText, RegexOptions.IgnoreCase);
            rendered = Regex.Replace(rendered, @"\{\{\s*ButtonLink\s*\}\}", btnLink, RegexOptions.IgnoreCase);
            rendered = Regex.Replace(rendered, @"\{\{\s*IconText\s*\}\}", iconText, RegexOptions.IgnoreCase);
            rendered = Regex.Replace(rendered, @"\{\{\s*ImageUrl\s*\}\}", imgUrl, RegexOptions.IgnoreCase);
            rendered = Regex.Replace(rendered, @"\{\{\s*Price\s*\}\}", price, RegexOptions.IgnoreCase);
            rendered = Regex.Replace(rendered, @"\{\{\s*Period\s*\}\}", period, RegexOptions.IgnoreCase);
            rendered = Regex.Replace(rendered, @"\{\{\s*CustomClass\s*\}\}", customClass, RegexOptions.IgnoreCase);

            return rendered;
        }

        private static string RenderDefaultSectionListsFallback(string itemTemplate)
        {
            var sb = new StringBuilder();
            var items = new[]
            {
                new { Title = "Cloud Architecture & Strategy", MiniTitle = "01", Description = "End-to-end resilient infrastructure designed for global scale.", Icon = "fa-solid fa-cloud" },
                new { Title = "Autonomous Intelligence Engine", MiniTitle = "02", Description = "Intelligent workflow automation and real-time operational analytics.", Icon = "fa-solid fa-brain" },
                new { Title = "Zero-Trust Enterprise Security", MiniTitle = "03", Description = "Continuous encryption, identity verification, and granular compliance.", Icon = "fa-solid fa-shield-halved" }
            };

            foreach (var it in items)
            {
                var r = itemTemplate;
                r = Regex.Replace(r, @"\{\{\s*Title\s*\}\}", it.Title, RegexOptions.IgnoreCase);
                r = Regex.Replace(r, @"\{\{\s*MiniTitle\s*\}\}", it.MiniTitle, RegexOptions.IgnoreCase);
                r = Regex.Replace(r, @"\{\{\s*Description\s*\}\}", it.Description, RegexOptions.IgnoreCase);
                r = Regex.Replace(r, @"\{\{\s*ButtonText\s*\}\}", "Explore Platform", RegexOptions.IgnoreCase);
                r = Regex.Replace(r, @"\{\{\s*ButtonLink\s*\}\}", "#", RegexOptions.IgnoreCase);
                r = Regex.Replace(r, @"\{\{\s*IconText\s*\}\}", it.Icon, RegexOptions.IgnoreCase);
                r = Regex.Replace(r, @"\{\{\s*ImageUrl\s*\}\}", "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600", RegexOptions.IgnoreCase);
                sb.AppendLine(r);
            }

            return sb.ToString();
        }

        private static string? GetJsonString(JsonElement element, params string[] propertyNames)
        {
            if (element.ValueKind != JsonValueKind.Object)
                return null;

            foreach (var name in propertyNames)
            {
                if (element.TryGetProperty(name, out var prop) && prop.ValueKind == JsonValueKind.String)
                    return prop.GetString();
            }

            foreach (var prop in element.EnumerateObject())
            {
                foreach (var name in propertyNames)
                {
                    if (string.Equals(prop.Name, name, StringComparison.OrdinalIgnoreCase) && prop.Value.ValueKind == JsonValueKind.String)
                        return prop.Value.GetString();
                }
            }

            return null;
        }

        #endregion
    }
}
