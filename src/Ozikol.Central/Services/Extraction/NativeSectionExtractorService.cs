using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using AngleSharp;
using AngleSharp.Dom;
using AngleSharp.Html.Dom;
using AngleSharp.Html.Parser;
using Microsoft.Extensions.Logging;

namespace Ozikol.Central.Services.Extraction
{
    /// <summary>
    /// High-performance in-process .NET 9 HTML section decomposition,
    /// class-based CSS scoping, and Mustache template tokenization engine.
    /// Uses AngleSharp for W3C HTML5 DOM parsing and CSS manipulation.
    /// </summary>
    public class NativeSectionExtractorService : INativeSectionExtractorService
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<NativeSectionExtractorService> _logger;

        private static readonly string[] GenericTagsToExclude = { "script", "style", "noscript", "svg", "iframe", "canvas" };
        private static readonly Regex PreloaderRegex = new(@"preloader|loading|spinner|page-loader", RegexOptions.IgnoreCase | RegexOptions.Compiled);
        private static readonly Regex CookieBannerRegex = new(@"cookie|gdpr|consent|privacy-bar", RegexOptions.IgnoreCase | RegexOptions.Compiled);

        public NativeSectionExtractorService(
            HttpClient httpClient,
            ILogger<NativeSectionExtractorService> logger)
        {
            _httpClient = httpClient;
            _logger = logger;
        }

        /// <inheritdoc />
        public async Task<SectionsBuilderResponseDto> ExtractSectionsFromSourceAsync(
            string htmlSource,
            string? baseUrl = null,
            string? suiteName = null,
            string? brandName = null,
            string? customCss = null,
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(htmlSource))
            {
                throw new ArgumentException("HTML source cannot be empty.", nameof(htmlSource));
            }

            var cleanBaseUrl = baseUrl?.Trim().TrimEnd('/');
            var cleanBrand = string.IsNullOrWhiteSpace(brandName) ? "Enterprise Workspace" : brandName.Trim();
            var cleanSuite = string.IsNullOrWhiteSpace(suiteName) ? GenerateSuiteNameFromUrl(cleanBaseUrl) : suiteName.Trim();
            var groupCode = GenerateGroupCode(cleanSuite, cleanBaseUrl);

            _logger.LogInformation("Starting native in-process C# section extraction for Suite: '{SuiteName}'", cleanSuite);

            // 1. Initialize AngleSharp parser
            var parser = new HtmlParser();
            var document = await parser.ParseDocumentAsync(htmlSource, cancellationToken);

            // 2. Extract external and inline CSS stylesheets
            var collectedCss = new StringBuilder();
            if (!string.IsNullOrWhiteSpace(customCss))
            {
                collectedCss.AppendLine(customCss);
            }

            // Extract inline <style> tags
            var inlineStyles = document.QuerySelectorAll("style");
            foreach (var styleTag in inlineStyles)
            {
                if (!string.IsNullOrWhiteSpace(styleTag.TextContent))
                {
                    collectedCss.AppendLine(styleTag.TextContent);
                }
            }

            // Extract referenced external <link rel="stylesheet"> files if base URL is available
            if (!string.IsNullOrWhiteSpace(cleanBaseUrl))
            {
                var stylesheetLinks = document.QuerySelectorAll("link[rel*='stylesheet']")
                    .Select(l => l.GetAttribute("href"))
                    .Where(href => !string.IsNullOrWhiteSpace(href))
                    .Select(href => ResolveAbsoluteUrl(cleanBaseUrl, href!))
                    .Distinct()
                    .Take(15)
                    .ToList();

                var downloadedCssList = await DownloadStylesheetsAsync(stylesheetLinks, cancellationToken);
                foreach (var cssContent in downloadedCssList)
                {
                    collectedCss.AppendLine(cssContent);
                }
            }

            var fullCss = collectedCss.ToString();

            // 3. Slice sections from DOM
            var rawSections = SliceSectionsFromDom(document);
            _logger.LogInformation("Native DOM Slicer discovered {Count} raw candidate sections", rawSections.Count);

            // 4. Build modular ExtractedSectionDto items with Scoped CSS and Mustache Debranding
            var sections = new List<ExtractedSectionDto>();
            var categoryCounts = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);

            for (int i = 0; i < rawSections.Count; i++)
            {
                var element = rawSections[i];
                var category = ClassifySectionCategory(element, i, rawSections.Count);
                var sectionId = $"sec_{Guid.NewGuid().ToString("N").Substring(0, 8)}";
                var variantCode = $"{category.ToUpperInvariant()}_{i + 1:D2}";
                var label = $"{ToTitleCase(category)} Section {i + 1}";
                var sectionName = GenerateSectionName(element, category, i + 1);

                // Scope CSS classes used within this section
                var scopedCss = ExtractAndScopeCssForElement(element, fullCss, variantCode);

                // Apply Mustache token debranding to HTML template
                var rawOuterHtml = element.OuterHtml;
                var debrandedHtml = ApplyMustacheDebranding(rawOuterHtml, cleanBrand);

                var sectionDto = new ExtractedSectionDto
                {
                    Id = sectionId,
                    CategoryKey = category,
                    VariantCode = variantCode,
                    Name = sectionName,
                    Label = label,
                    Description = GenerateSectionDescription(category, element),
                    DomTag = element.TagName.ToLowerInvariant(),
                    HtmlTemplate = debrandedHtml,
                    ScopedCss = scopedCss,
                    PreviewIcon = GetCategoryIcon(category),
                    ThumbnailGradient = GetCategoryGradient(category, i),
                    ParentPageSlugs = new List<string> { "home" },
                    SortOrder = (i + 1) * 10,
                    IsSelected = true,
                    IsPublished = false,
                    CustomBadge = "Modular"
                };

                sections.Add(sectionDto);

                if (!categoryCounts.ContainsKey(category))
                    categoryCounts[category] = 0;
                categoryCounts[category]++;
            }

            // 5. Discover external CDN scripts and fonts for code injections
            var codeInjections = ExtractCodeInjections(document, cleanBaseUrl);

            var response = new SectionsBuilderResponseDto
            {
                JobId = $"sb_native_{Guid.NewGuid().ToString("N").Substring(0, 10)}",
                Status = "complete",
                GroupCode = groupCode,
                SuiteName = cleanSuite,
                SourceUrl = cleanBaseUrl ?? "Direct HTML Upload",
                TotalSections = sections.Count,
                TotalPages = 1,
                Pages = new List<DiscoveredPageDto>
                {
                    new DiscoveredPageDto
                    {
                        Title = document.Title ?? "Home",
                        Slug = "home",
                        Url = cleanBaseUrl ?? "#",
                        IsHome = true,
                        SectionIds = sections.Select(s => s.Id).ToList()
                    }
                },
                Sections = sections,
                CodeInjections = codeInjections,
                CategoryBreakdown = categoryCounts,
                Message = $"Successfully sliced {sections.Count} modular sections with precision scoped CSS natively in C#."
            };

            return response;
        }

        /// <inheritdoc />
        public async Task<RawAssetsInspectResponseDto> InspectRawAssetsAsync(
            RawAssetsInspectRequestDto request,
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(request.HtmlSource))
            {
                throw new ArgumentException("HTML source cannot be empty.", nameof(request));
            }

            var parser = new HtmlParser();
            var document = await parser.ParseDocumentAsync(request.HtmlSource, cancellationToken);
            var cleanBaseUrl = request.BaseUrl?.Trim().TrimEnd('/');

            var stylesheets = new List<RawAssetItemDto>();
            var scripts = new List<RawAssetItemDto>();
            var fonts = new List<string>();

            // 1. Gather CSS
            var styleElements = document.QuerySelectorAll("link[rel*='stylesheet']");
            foreach (var link in styleElements)
            {
                var href = link.GetAttribute("href");
                if (string.IsNullOrWhiteSpace(href)) continue;

                var resolvedUrl = ResolveAbsoluteUrl(cleanBaseUrl, href);
                var fileName = Path.GetFileName(href.Split('?')[0]);
                if (string.IsNullOrWhiteSpace(fileName)) fileName = "stylesheet.css";

                string? content = null;
                double sizeKb = 0.0;

                if (!string.IsNullOrWhiteSpace(resolvedUrl) && resolvedUrl.StartsWith("http", StringComparison.OrdinalIgnoreCase))
                {
                    try
                    {
                        var cssText = await _httpClient.GetStringAsync(resolvedUrl, cancellationToken);
                        content = cssText;
                        sizeKb = Math.Round(Encoding.UTF8.GetByteCount(cssText) / 1024.0, 1);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogDebug("Could not fetch remote stylesheet {Url}: {Error}", resolvedUrl, ex.Message);
                    }
                }

                stylesheets.Add(new RawAssetItemDto
                {
                    Name = fileName,
                    Url = resolvedUrl,
                    AssetType = "css",
                    SizeKb = sizeKb,
                    Content = content
                });
            }

            // Inline styles
            var inlineStyles = document.QuerySelectorAll("style");
            for (int i = 0; i < inlineStyles.Length; i++)
            {
                var text = inlineStyles[i].TextContent;
                if (!string.IsNullOrWhiteSpace(text))
                {
                    stylesheets.Add(new RawAssetItemDto
                    {
                        Name = $"inline-style-{i + 1}.css",
                        Url = "inline",
                        AssetType = "css",
                        SizeKb = Math.Round(Encoding.UTF8.GetByteCount(text) / 1024.0, 1),
                        Content = text
                    });
                }
            }

            // 2. Gather Scripts
            var scriptElements = document.QuerySelectorAll("script[src]");
            foreach (var script in scriptElements)
            {
                var src = script.GetAttribute("src");
                if (string.IsNullOrWhiteSpace(src)) continue;

                var resolvedUrl = ResolveAbsoluteUrl(cleanBaseUrl, src);
                var fileName = Path.GetFileName(src.Split('?')[0]);
                if (string.IsNullOrWhiteSpace(fileName)) fileName = "script.js";

                scripts.Add(new RawAssetItemDto
                {
                    Name = fileName,
                    Url = resolvedUrl,
                    AssetType = "js",
                    SizeKb = 0.0
                });
            }

            // 3. Fonts
            var fontElements = document.QuerySelectorAll("link[href*='fonts.googleapis.com'], link[href*='use.typekit.net']");
            foreach (var font in fontElements)
            {
                var href = font.GetAttribute("href");
                if (!string.IsNullOrWhiteSpace(href))
                {
                    fonts.Add(href);
                }
            }

            return new RawAssetsInspectResponseDto
            {
                JobId = $"insp_{Guid.NewGuid().ToString("N").Substring(0, 8)}",
                BaseUrl = cleanBaseUrl,
                SuiteName = request.SuiteName ?? "Inspected Suite",
                BrandName = request.BrandName ?? "Enterprise Workspace",
                PageTitle = document.Title ?? "Page Source",
                PageSlug = "home",
                HtmlSource = request.HtmlSource,
                Stylesheets = stylesheets,
                Scripts = scripts,
                Fonts = fonts.Distinct().ToList(),
                TotalCssKb = stylesheets.Sum(s => s.SizeKb),
                TotalJsKb = scripts.Sum(s => s.SizeKb),
                Message = $"Inspected {stylesheets.Count} stylesheets and {scripts.Count} external scripts."
            };
        }

        /// <inheritdoc />
        public async Task<SectionsBuilderResponseDto> SliceAndScopeAsync(
            SliceAndScopeRequestDto request,
            CancellationToken cancellationToken = default)
        {
            var combinedCss = new StringBuilder();
            if (!string.IsNullOrWhiteSpace(request.CombinedCss))
            {
                combinedCss.AppendLine(request.CombinedCss);
            }
            if (!string.IsNullOrWhiteSpace(request.CustomCss))
            {
                combinedCss.AppendLine(request.CustomCss);
            }
            if (request.Stylesheets != null)
            {
                foreach (var sheet in request.Stylesheets)
                {
                    if (!string.IsNullOrWhiteSpace(sheet.Content))
                    {
                        combinedCss.AppendLine(sheet.Content);
                    }
                }
            }

            return await ExtractSectionsFromSourceAsync(
                request.HtmlSource,
                request.BaseUrl,
                request.SuiteName,
                request.BrandName,
                combinedCss.ToString(),
                cancellationToken);
        }

        /// <inheritdoc />
        public async Task<DiscoverPagesResponseDto> DiscoverPagesAsync(
            string targetUrl,
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(targetUrl))
            {
                throw new ArgumentException("Target URL cannot be empty.", nameof(targetUrl));
            }

            targetUrl = targetUrl.Trim();
            _logger.LogInformation("Discovering navigation menu pages natively from URL: {Url}", targetUrl);

            var pages = new List<DiscoveredPageSummaryDto>();

            try
            {
                // Fetch homepage HTML with browser headers
                using var requestMessage = new HttpRequestMessage(HttpMethod.Get, targetUrl);
                requestMessage.Headers.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36");
                requestMessage.Headers.Add("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8");

                var response = await _httpClient.SendAsync(requestMessage, cancellationToken);
                var html = await response.Content.ReadAsStringAsync(cancellationToken);

                var parser = new HtmlParser();
                var document = await parser.ParseDocumentAsync(html, cancellationToken);

                var baseUri = new Uri(targetUrl);
                var baseHost = baseUri.Host.ToLowerInvariant();

                // Add Home page
                pages.Add(new DiscoveredPageSummaryDto
                {
                    Title = document.Title ?? "Home",
                    Slug = "home",
                    Url = targetUrl,
                    IsHome = true,
                    MenuSortOrder = 10
                });

                // Extract all navigation menu links from <header>, <nav>, and topbars
                var navLinks = document.QuerySelectorAll("header a[href], nav a[href], .menu a[href], .navbar a[href], .navigation a[href]");
                var seenUrls = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { targetUrl };

                int sortOrder = 20;
                foreach (var link in navLinks)
                {
                    var href = link.GetAttribute("href")?.Trim();
                    if (string.IsNullOrWhiteSpace(href) || href.StartsWith("#") || href.StartsWith("javascript:") || href.StartsWith("mailto:") || href.StartsWith("tel:"))
                    {
                        continue;
                    }

                    var resolved = ResolveAbsoluteUrl(targetUrl, href);
                    if (string.IsNullOrWhiteSpace(resolved) || seenUrls.Contains(resolved))
                    {
                        continue;
                    }

                    // Check if internal domain
                    if (Uri.TryCreate(resolved, UriKind.Absolute, out var linkUri))
                    {
                        if (linkUri.Host.ToLowerInvariant() == baseHost || linkUri.Host.ToLowerInvariant().EndsWith("." + baseHost))
                        {
                            seenUrls.Add(resolved);
                            var text = link.TextContent.Trim();
                            if (string.IsNullOrWhiteSpace(text) || text.Length > 40)
                            {
                                text = Path.GetFileNameWithoutExtension(linkUri.AbsolutePath);
                                text = string.IsNullOrWhiteSpace(text) ? "Page" : ToTitleCase(text.Replace("-", " ").Replace("_", " "));
                            }

                            var slug = GenerateSlug(text, resolved);
                            pages.Add(new DiscoveredPageSummaryDto
                            {
                                Title = text,
                                Slug = slug,
                                Url = resolved,
                                IsHome = false,
                                MenuSortOrder = sortOrder
                            });

                            sortOrder += 10;
                            if (pages.Count >= 40) break;
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not crawl remote URL directly for menu discovery: {Message}", ex.Message);
                // Fallback home page item
                pages.Add(new DiscoveredPageSummaryDto
                {
                    Title = "Home",
                    Slug = "home",
                    Url = targetUrl,
                    IsHome = true,
                    MenuSortOrder = 10
                });
            }

            return new DiscoverPagesResponseDto
            {
                SourceUrl = targetUrl,
                TotalPages = pages.Count,
                Pages = pages,
                Message = $"Discovered {pages.Count} navigation pages."
            };
        }

        /// <inheritdoc />
        public string BuildStandaloneSectionPreviewHtml(
            ExtractedSectionDto section,
            string? suiteName = null,
            string? baseUrl = null)
        {
            var cleanSuite = suiteName ?? "Modular Section";
            var cleanBase = baseUrl ?? string.Empty;

            var sb = new StringBuilder();
            sb.AppendLine("<!DOCTYPE html>");
            sb.AppendLine("<html lang=\"en\">");
            sb.AppendLine("<head>");
            sb.AppendLine("    <meta charset=\"UTF-8\">");
            sb.AppendLine("    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">");
            sb.AppendLine($"    <title>{section.Name} - {cleanSuite} Sandbox</title>");

            if (!string.IsNullOrWhiteSpace(cleanBase))
            {
                sb.AppendLine($"    <base href=\"{cleanBase.TrimEnd('/')}/\">");
            }

            // Standard modern fonts and icons
            sb.AppendLine("    <link rel=\"preconnect\" href=\"https://fonts.googleapis.com\">");
            sb.AppendLine("    <link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin>");
            sb.AppendLine("    <link href=\"https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@400;500;600;700;800&display=swap\" rel=\"stylesheet\">");
            sb.AppendLine("    <link rel=\"stylesheet\" href=\"https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css\">");
            sb.AppendLine("    <link rel=\"stylesheet\" href=\"https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0\" />");

            // Modern reset and sandbox container styles
            sb.AppendLine("    <style>");
            sb.AppendLine("        *, *::before, *::after { box-sizing: border-box; }");
            sb.AppendLine("        html, body { margin: 0; padding: 0; width: 100%; min-height: 100%; font-family: 'Inter', system-ui, -apple-system, sans-serif; background: #ffffff; color: #1e293b; overflow-x: hidden; }");
            sb.AppendLine("        img { max-width: 100%; height: auto; display: block; }");
            sb.AppendLine("        a { text-decoration: none; color: inherit; }");
            sb.AppendLine("        ul, ol { list-style: none; margin: 0; padding: 0; }");

            // Scoped CSS
            if (!string.IsNullOrWhiteSpace(section.ScopedCss))
            {
                sb.AppendLine("        /* === Scoped Section CSS === */");
                sb.AppendLine(section.ScopedCss);
            }

            sb.AppendLine("    </style>");
            sb.AppendLine("</head>");
            sb.AppendLine("<body>");

            // Section Container wrapper
            sb.AppendLine($"    <div class=\"ozikol-section-sandbox sec-variant-{section.VariantCode.ToLowerInvariant()}\">");
            sb.AppendLine(section.HtmlTemplate);
            sb.AppendLine("    </div>");

            if (!string.IsNullOrWhiteSpace(section.JsScript))
            {
                sb.AppendLine("    <script>");
                sb.AppendLine(section.JsScript);
                sb.AppendLine("    </script>");
            }

            sb.AppendLine("</body>");
            sb.AppendLine("</html>");

            return sb.ToString();
        }

        #region Internal Helper Methods

        /// <summary>
        /// Slices DOM tree into candidate semantic sections.
        /// </summary>
        private List<IElement> SliceSectionsFromDom(IHtmlDocument document)
        {
            var candidates = new List<IElement>();

            // 1. Check for standard HTML5 semantic landmarks
            var header = document.QuerySelector("header, [role='banner']");
            if (header != null && IsValidSection(header))
            {
                candidates.Add(header);
            }

            // 2. Query all <section> elements
            var sectionElements = document.QuerySelectorAll("section");
            foreach (var sec in sectionElements)
            {
                if (IsValidSection(sec) && !candidates.Contains(sec))
                {
                    candidates.Add(sec);
                }
            }

            // 3. If sections count is low, look inside <main> or <body> for top-level content divisions
            if (candidates.Count < 3)
            {
                var mainOrBody = document.QuerySelector("main, #main, #content, .site-content, body");
                if (mainOrBody != null)
                {
                    foreach (var child in mainOrBody.Children)
                    {
                        if (IsValidSection(child) && !candidates.Contains(child))
                        {
                            var tag = child.TagName.ToLowerInvariant();
                            if (tag is "section" or "div" or "article" or "aside")
                            {
                                // Filter out thin boilerplate wrappers
                                if (child.TextContent.Trim().Length > 30 || child.QuerySelector("h1, h2, h3, h4, img, a") != null)
                                {
                                    candidates.Add(child);
                                }
                            }
                        }
                    }
                }
            }

            // 4. Check for <footer>
            var footer = document.QuerySelector("footer, [role='contentinfo']");
            if (footer != null && IsValidSection(footer) && !candidates.Contains(footer))
            {
                candidates.Add(footer);
            }

            // 5. If still no candidates found, fallback to body direct children
            if (candidates.Count == 0 && document.Body != null)
            {
                foreach (var child in document.Body.Children)
                {
                    if (IsValidSection(child))
                    {
                        candidates.Add(child);
                    }
                }
            }

            return candidates;
        }

        private static bool IsValidSection(IElement element)
        {
            var tag = element.TagName.ToLowerInvariant();
            if (GenericTagsToExclude.Contains(tag)) return false;

            var cls = (element.ClassName ?? string.Empty).ToLowerInvariant();
            var id = (element.Id ?? string.Empty).ToLowerInvariant();

            if (PreloaderRegex.IsMatch(cls) || PreloaderRegex.IsMatch(id)) return false;
            if (CookieBannerRegex.IsMatch(cls) || CookieBannerRegex.IsMatch(id)) return false;

            return true;
        }

        /// <summary>
        /// Classifies a section element into categories: menu, hero, body, footer, blog, ecommerce, breadcrumb.
        /// </summary>
        private static string ClassifySectionCategory(IElement element, int index, int totalCount)
        {
            var tag = element.TagName.ToLowerInvariant();
            var cls = (element.ClassName ?? string.Empty).ToLowerInvariant();
            var id = (element.Id ?? string.Empty).ToLowerInvariant();
            var combined = $"{tag} {cls} {id}";

            if (tag == "header" || combined.Contains("header") || combined.Contains("navbar") || combined.Contains("nav-") || combined.Contains("topbar") || (index == 0 && tag == "nav"))
            {
                return "menu";
            }

            if (tag == "footer" || combined.Contains("footer") || combined.Contains("copyright") || (index == totalCount - 1 && combined.Contains("bottom")))
            {
                return "footer";
            }

            if (combined.Contains("hero") || combined.Contains("banner") || combined.Contains("slider") || combined.Contains("intro") || (index == 1 && combined.Contains("main")))
            {
                return "hero";
            }

            if (combined.Contains("breadcrumb") || combined.Contains("page-title") || combined.Contains("sub-header"))
            {
                return "breadcrumb";
            }

            if (combined.Contains("blog") || combined.Contains("news") || combined.Contains("post") || combined.Contains("article"))
            {
                return "blog";
            }

            if (combined.Contains("pricing") || combined.Contains("price") || combined.Contains("product") || combined.Contains("shop") || combined.Contains("cart"))
            {
                return "ecommerce";
            }

            return "body";
        }

        /// <summary>
        /// Extracts CSS rules matching the classes and IDs of the element and prefixes them for scoping.
        /// </summary>
        private static string ExtractAndScopeCssForElement(IElement element, string fullCss, string variantCode)
        {
            if (string.IsNullOrWhiteSpace(fullCss))
            {
                return string.Empty;
            }

            // Gather all class names and IDs present in this section
            var classNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var ids = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            if (!string.IsNullOrWhiteSpace(element.ClassName))
            {
                foreach (var c in element.ClassName.Split(' ', StringSplitOptions.RemoveEmptyEntries))
                    classNames.Add(c.Trim());
            }

            if (!string.IsNullOrWhiteSpace(element.Id))
            {
                ids.Add(element.Id.Trim());
            }

            var allDescendants = element.QuerySelectorAll("*");
            foreach (var child in allDescendants)
            {
                if (!string.IsNullOrWhiteSpace(child.ClassName))
                {
                    foreach (var c in child.ClassName.Split(' ', StringSplitOptions.RemoveEmptyEntries))
                        classNames.Add(c.Trim());
                }
                if (!string.IsNullOrWhiteSpace(child.Id))
                {
                    ids.Add(child.Id.Trim());
                }
            }

            var scopeClass = $".sec-variant-{variantCode.ToLowerInvariant()}";
            var matchedRules = new StringBuilder();

            // Simple fast CSS rule regex matching
            var ruleRegex = new Regex(@"([^{]+)\{([^}]+)\}", RegexOptions.Compiled);
            var matches = ruleRegex.Matches(fullCss);

            var seenSelectors = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            foreach (Match m in matches)
            {
                var selector = m.Groups[1].Value.Trim();
                var body = m.Groups[2].Value.Trim();

                if (selector.StartsWith("@") || selector.StartsWith("/*") || string.IsNullOrWhiteSpace(body))
                {
                    continue;
                }

                // Check if selector touches any class or ID in this section
                bool matchesSection = classNames.Any(c => selector.Contains("." + c)) ||
                                     ids.Any(id => selector.Contains("#" + id));

                if (matchesSection && seenSelectors.Add(selector))
                {
                    // Scope selector with section wrapper class
                    var scopedSelectors = selector.Split(',')
                        .Select(s => $"{scopeClass} {s.Trim()}")
                        .ToArray();

                    matchedRules.AppendLine($"{string.Join(",\n", scopedSelectors)} {{\n    {body}\n}}\n");
                }
            }

            return matchedRules.ToString();
        }

        /// <summary>
        /// Replaces hardcoded brand text, phone numbers, and emails with standard Mustache tokens.
        /// </summary>
        private static string ApplyMustacheDebranding(string html, string brandName)
        {
            if (string.IsNullOrWhiteSpace(html)) return string.Empty;

            var result = html;

            // 1. Replace brand name
            if (!string.IsNullOrWhiteSpace(brandName) && brandName.Length >= 3)
            {
                result = Regex.Replace(result, Regex.Escape(brandName), "{{Organization.Name}}", RegexOptions.IgnoreCase);
            }

            // 2. Replace email addresses
            result = Regex.Replace(result, @"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", "{{Organization.Email}}");

            // 3. Replace phone numbers
            result = Regex.Replace(result, @"(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}", "{{Organization.Phone}}");

            return result;
        }

        private async Task<List<string>> DownloadStylesheetsAsync(List<string> urls, CancellationToken cancellationToken)
        {
            var results = new List<string>();
            foreach (var url in urls)
            {
                try
                {
                    using var req = new HttpRequestMessage(HttpMethod.Get, url);
                    req.Headers.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36");
                    var res = await _httpClient.SendAsync(req, cancellationToken);
                    if (res.IsSuccessStatusCode)
                    {
                        var text = await res.Content.ReadAsStringAsync(cancellationToken);
                        results.Add(text);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogDebug("Could not download external stylesheet {Url}: {Message}", url, ex.Message);
                }
            }
            return results;
        }

        private static List<ImportableTagDto> ExtractCodeInjections(IHtmlDocument document, string? baseUrl)
        {
            var tags = new List<ImportableTagDto>();

            var scripts = document.QuerySelectorAll("script[src]");
            int order = 10;
            foreach (var script in scripts)
            {
                var src = script.GetAttribute("src");
                if (!string.IsNullOrWhiteSpace(src) && (src.Contains("cdnjs") || src.Contains("jsdelivr") || src.Contains("unpkg") || src.Contains("bootstrap") || src.Contains("swiper") || src.Contains("fontawesome")))
                {
                    var fileName = Path.GetFileName(src.Split('?')[0]);
                    tags.Add(new ImportableTagDto
                    {
                        Name = string.IsNullOrWhiteSpace(fileName) ? "external-library.js" : fileName,
                        Zone = "body_bottom",
                        TagType = "script",
                        Content = script.OuterHtml,
                        SortOrder = order
                    });
                    order += 10;
                }
            }

            return tags;
        }

        private static string ResolveAbsoluteUrl(string? baseUrl, string relativeUrl)
        {
            if (string.IsNullOrWhiteSpace(relativeUrl)) return string.Empty;
            if (relativeUrl.StartsWith("http://", StringComparison.OrdinalIgnoreCase) || relativeUrl.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
                return relativeUrl;

            if (string.IsNullOrWhiteSpace(baseUrl)) return relativeUrl;

            if (Uri.TryCreate(new Uri(baseUrl), relativeUrl, out var combined))
                return combined.ToString();

            return relativeUrl;
        }

        private static string GenerateSuiteNameFromUrl(string? url)
        {
            if (string.IsNullOrWhiteSpace(url)) return "Modular Theme Suite";
            try
            {
                var uri = new Uri(url);
                var host = uri.Host.Replace("www.", "").Split('.')[0];
                return $"{ToTitleCase(host)} Theme Suite";
            }
            catch
            {
                return "Modular Theme Suite";
            }
        }

        private static string GenerateGroupCode(string suiteName, string? url)
        {
            var clean = Regex.Replace(suiteName, @"[^a-zA-Z0-9]", "_").ToLowerInvariant().Trim('_');
            return string.IsNullOrWhiteSpace(clean) ? "suite_modular" : $"suite_{clean}";
        }

        private static string GenerateSectionName(IElement element, string category, int index)
        {
            var h = element.QuerySelector("h1, h2, h3, h4")?.TextContent.Trim();
            if (!string.IsNullOrWhiteSpace(h) && h.Length < 45)
            {
                return h;
            }
            return $"{ToTitleCase(category)} Section {index}";
        }

        private static string GenerateSectionDescription(string category, IElement element)
        {
            var p = element.QuerySelector("p")?.TextContent.Trim();
            if (!string.IsNullOrWhiteSpace(p))
            {
                return p.Length > 120 ? p.Substring(0, 117) + "..." : p;
            }
            return $"Modular {category} section with isolated scoped CSS, responsive flex/grid layouts, and customizable Mustache tokens.";
        }

        private static string GetCategoryIcon(string category) => category.ToLowerInvariant() switch
        {
            "menu" => "menu",
            "hero" => "view_carousel",
            "body" => "view_quilt",
            "footer" => "dock_to_bottom",
            "blog" => "newspaper",
            "ecommerce" => "shopping_bag",
            "breadcrumb" => "linear_scale",
            _ => "widgets"
        };

        private static string GetCategoryGradient(string category, int index)
        {
            var gradients = new[]
            {
                "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)",
                "linear-gradient(135deg, #0ea5e9 0%, #0369a1 100%)",
                "linear-gradient(135deg, #10b981 0%, #047857 100%)",
                "linear-gradient(135deg, #f59e0b 0%, #b45309 100%)",
                "linear-gradient(135deg, #ec4899 0%, #be185d 100%)",
                "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)"
            };
            return gradients[index % gradients.Length];
        }

        private static string GenerateSlug(string text, string url)
        {
            var clean = Regex.Replace(text, @"[^a-zA-Z0-9]", "-").ToLowerInvariant().Trim('-');
            if (string.IsNullOrWhiteSpace(clean))
            {
                clean = Path.GetFileNameWithoutExtension(url).ToLowerInvariant();
            }
            return string.IsNullOrWhiteSpace(clean) ? "page" : clean;
        }

        private static string ToTitleCase(string input)
        {
            if (string.IsNullOrWhiteSpace(input)) return string.Empty;
            return System.Globalization.CultureInfo.CurrentCulture.TextInfo.ToTitleCase(input.ToLower());
        }

        #endregion
    }
}
