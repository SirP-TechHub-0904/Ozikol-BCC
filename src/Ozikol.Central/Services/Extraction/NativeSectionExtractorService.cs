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

        /// <summary>
        /// Global catalog of known JavaScript libraries and their high-availability universal CDN endpoints.
        /// Used for instant script normalization and resolving browser-saved local script artifacts.
        /// </summary>
        private static readonly Dictionary<string, string> VendorJsCdnMap = new(StringComparer.OrdinalIgnoreCase)
        {
            ["jquery-3.7.1.min.js"] = "https://code.jquery.com/jquery-3.7.1.min.js",
            ["jquery-3.7.0.min.js"] = "https://code.jquery.com/jquery-3.7.0.min.js",
            ["jquery-3.6.4.min.js"] = "https://code.jquery.com/jquery-3.6.4.min.js",
            ["jquery.min.js"] = "https://code.jquery.com/jquery-3.7.1.min.js",
            ["jquery.js"] = "https://code.jquery.com/jquery-3.7.1.min.js",
            ["bootstrap.bundle.min.js"] = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js",
            ["bootstrap.bundle.js"] = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js",
            ["bootstrap.min.js"] = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js",
            ["bootstrap.js"] = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js",
            ["swiper-bundle.min.js"] = "https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js",
            ["swiper-bundle.js"] = "https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js",
            ["swiper.min.js"] = "https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js",
            ["jquery.magnific-popup.min.js"] = "https://cdnjs.cloudflare.com/ajax/libs/magnific-popup.js/1.1.0/jquery.magnific-popup.min.js",
            ["jquery.magnific-popup.js"] = "https://cdnjs.cloudflare.com/ajax/libs/magnific-popup.js/1.1.0/jquery.magnific-popup.min.js",
            ["magnific-popup.min.js"] = "https://cdnjs.cloudflare.com/ajax/libs/magnific-popup.js/1.1.0/jquery.magnific-popup.min.js",
            ["jquery.odometer.min.js"] = "https://cdnjs.cloudflare.com/ajax/libs/odometer.js/0.4.8/odometer.min.js",
            ["odometer.min.js"] = "https://cdnjs.cloudflare.com/ajax/libs/odometer.js/0.4.8/odometer.min.js",
            ["jquery.nice-select.min.js"] = "https://cdnjs.cloudflare.com/ajax/libs/jquery-nice-select/1.1.0/js/jquery.nice-select.min.js",
            ["nice-select.min.js"] = "https://cdnjs.cloudflare.com/ajax/libs/jquery-nice-select/1.1.0/js/jquery.nice-select.min.js",
            ["aos.js"] = "https://unpkg.com/aos@2.3.1/dist/aos.js",
            ["slick.min.js"] = "https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/slick.min.js",
            ["slick.js"] = "https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/slick.min.js",
            ["anime.min.js"] = "https://cdnjs.cloudflare.com/ajax/libs/animejs/3.2.2/anime.min.js",
            ["gsap.min.js"] = "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"
        };

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

            // 1b. Sanitize browser-saved artifacts (Chrome/Firefox _files folders, .download extensions)
            SanitizeBrowserSavedDom(document, cleanBaseUrl);

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

            // Extract referenced external <link rel="stylesheet"> files
            var stylesheetLinks = document.QuerySelectorAll("link[rel*='stylesheet']")
                .Select(l => l.GetAttribute("href"))
                .Where(href => !string.IsNullOrWhiteSpace(href))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .Take(25)
                .ToList();

            foreach (var href in stylesheetLinks)
            {
                var (cssContent, _, _, _) = await FetchStylesheetContentWithFallbacksAsync(href!, cleanBaseUrl, cancellationToken);
                if (!string.IsNullOrWhiteSpace(cssContent))
                {
                    collectedCss.AppendLine(cssContent);
                }
            }

            var fullCss = collectedCss.ToString();

            // Detect and map Font & Icon CDNs (FontAwesome, Google Fonts, Bootstrap Icons, RemixIcon, Boxicons)
            var (detectedFontUrls, fontTagInjections) = DetectAndMapFontCdns(document, fullCss, cleanBaseUrl);

            // 3. Slice sections from DOM
            var rawSections = SliceSectionsFromDom(document);
            _logger.LogInformation("Native DOM Slicer discovered {Count} raw candidate sections", rawSections.Count);

            // 4. Build modular ExtractedSectionDto items with Scoped CSS, Mustache Debranding, and Placeholder Content
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
                var scopedCss = ExtractAndScopeCssForElement(element, fullCss, variantCode, category);

                // Extract structured placeholder content JSON from the original HTML element
                var sampleContentJson = ExtractPlaceholderSampleData(element, category, cleanBrand, cleanBaseUrl);

                // Generate self-contained interactive JavaScript for Menu, Sliders, and Drawers
                var sectionJs = GenerateSectionInteractiveScript(category, element);

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
                    JsScript = sectionJs,
                    SampleContentJson = sampleContentJson,
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
            foreach (var fontTag in fontTagInjections)
            {
                if (!codeInjections.Any(ci => ci.Content.Equals(fontTag.Content, StringComparison.OrdinalIgnoreCase)))
                {
                    codeInjections.Insert(0, fontTag);
                }
            }

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
                Message = $"Successfully sliced {sections.Count} modular sections with precision scoped CSS and structured placeholder schemas natively in C#."
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

            // Sanitize browser-saved artifacts (Chrome/Firefox _files folders, .download extensions)
            SanitizeBrowserSavedDom(document, cleanBaseUrl);

            var stylesheets = new List<RawAssetItemDto>();
            var scripts = new List<RawAssetItemDto>();
            var collectedCss = new StringBuilder();

            // 1. Gather CSS
            var styleElements = document.QuerySelectorAll("link[rel*='stylesheet']");
            foreach (var link in styleElements)
            {
                var href = link.GetAttribute("href");
                if (string.IsNullOrWhiteSpace(href)) continue;

                var (content, sizeKb, resolvedUrl, fileName) = await FetchStylesheetContentWithFallbacksAsync(href, cleanBaseUrl, cancellationToken);

                if (!string.IsNullOrWhiteSpace(content))
                {
                    collectedCss.AppendLine(content);
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
                    collectedCss.AppendLine(text);
                }
            }

            // 2. Gather Scripts with automated vendor CDN detection, content fetching, and path sanitization
            var scriptElements = document.QuerySelectorAll("script[src]");
            var seenScripts = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            foreach (var script in scriptElements)
            {
                var src = script.GetAttribute("src");
                if (string.IsNullOrWhiteSpace(src)) continue;

                var (content, sizeKb, resolvedUrl, fileName) = await FetchScriptContentWithFallbacksAsync(src, cleanBaseUrl, cancellationToken);

                if (!seenScripts.Add(fileName)) continue;

                scripts.Add(new RawAssetItemDto
                {
                    Name = fileName,
                    Url = resolvedUrl,
                    AssetType = "js",
                    SizeKb = sizeKb,
                    Content = content
                });
            }

            // Inline scripts
            var inlineScripts = document.QuerySelectorAll("script:not([src])");
            for (int i = 0; i < inlineScripts.Length; i++)
            {
                var text = inlineScripts[i].TextContent;
                if (!string.IsNullOrWhiteSpace(text) && text.Trim().Length > 10)
                {
                    scripts.Add(new RawAssetItemDto
                    {
                        Name = $"inline-script-{i + 1}.js",
                        Url = "inline",
                        AssetType = "js",
                        SizeKb = Math.Round(Encoding.UTF8.GetByteCount(text) / 1024.0, 1),
                        Content = text
                    });
                }
            }

            // 3. Detect and map Font & Icon CDNs
            var (detectedFontUrls, _) = DetectAndMapFontCdns(document, collectedCss.ToString(), cleanBaseUrl);

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
                Fonts = detectedFontUrls,
                TotalCssKb = Math.Round(stylesheets.Sum(s => s.SizeKb), 1),
                TotalJsKb = Math.Round(scripts.Sum(s => s.SizeKb), 1),
                Message = $"Inspected {stylesheets.Count} stylesheets ({Math.Round(stylesheets.Sum(s => s.SizeKb), 1)} KB), {scripts.Count} scripts, and mapped {detectedFontUrls.Count} live Font/Icon CDNs."
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
        private static string ExtractAndScopeCssForElement(IElement element, string fullCss, string variantCode, string category = "body")
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
                    // Scope selector with section wrapper class for both child elements and root container
                    var scopedSelectors = selector.Split(',')
                        .Select(s => {
                            var trimmed = s.Trim();
                            return $"{scopeClass} {trimmed}, {scopeClass}{trimmed}";
                        })
                        .ToArray();

                    matchedRules.AppendLine($"{string.Join(",\n", scopedSelectors)} {{\n    {body}\n}}\n");
                }
            }

            if (category.Equals("menu", StringComparison.OrdinalIgnoreCase))
            {
                matchedRules.AppendLine($@"
/* Base Navigation & Dropdown Styling for Menu Section */
{scopeClass} nav ul, {scopeClass} .menu, {scopeClass} .navbar-nav {{
    list-style: none;
    margin: 0;
    padding: 0;
}}
{scopeClass} nav li, {scopeClass} .menu-item {{
    position: relative;
}}
{scopeClass} .has-dropdown > .at-submenu, 
{scopeClass} .has-dropdown > .submenu, 
{scopeClass} .has-dropdown > .sub-menu,
{scopeClass} .has-dropdown > ul,
{scopeClass} .dropdown-menu {{
    display: none;
    position: absolute;
    top: 100%;
    left: 0;
    z-index: 9999;
    min-width: 220px;
    background: #ffffff;
    padding: 16px;
    border-radius: 10px;
    box-shadow: 0 14px 35px rgba(0, 0, 0, 0.12);
    border: 1px solid rgba(0, 0, 0, 0.06);
}}
{scopeClass} .has-dropdown:hover > .at-submenu, 
{scopeClass} .has-dropdown:hover > .submenu, 
{scopeClass} .has-dropdown:hover > .sub-menu,
{scopeClass} .has-dropdown:hover > ul,
{scopeClass} .has-dropdown.is-open > .at-submenu,
{scopeClass} .has-dropdown.is-open > .submenu {{
    display: block;
}}
{scopeClass} .at-megamenu {{
    max-width: 90vw;
}}
");
            }

            return matchedRules.ToString();
        }

        /// <summary>
        /// Generates lightweight, self-contained, vanilla JavaScript interactivity tailored to the section category
        /// (e.g., mobile offcanvas menu toggle, dropdown clicks, accordions, and slider initializations).
        /// </summary>
        /// <param name="category">The section category key.</param>
        /// <param name="element">The DOM element of the section.</param>
        /// <returns>A JavaScript code string or null if none required.</returns>
        private static string? GenerateSectionInteractiveScript(string category, IElement element)
        {
            if (category.Equals("menu", StringComparison.OrdinalIgnoreCase))
            {
                return @"/**
 * Menu Section Interactive Controller
 * Provides self-contained mobile hamburger drawer toggling, dropdown management, and sticky navigation.
 */
document.addEventListener('DOMContentLoaded', function () {
    var header = document.querySelector('header') || document.querySelector('nav') || document.body;
    if (!header) return;

    // 1. Mobile Menu / Drawer Toggle Handler
    var toggleBtns = header.querySelectorAll('.at-offcanvas-open-btn, .mobile-menu-toggle, .nav-toggle, [data-bs-toggle=""collapse""], .hamburger-btn, button[aria-label*=""menu""]');
    var mobileDrawer = document.querySelector('.at-offcanvas-area, .mobile-nav-drawer, .offcanvas-menu, .navbar-collapse');

    toggleBtns.forEach(function (btn) {
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            if (mobileDrawer) {
                var isOpen = mobileDrawer.classList.toggle('opened') || mobileDrawer.classList.toggle('show') || mobileDrawer.classList.toggle('is-open');
                btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            } else {
                // Fallback: toggle responsive navbar menu directly
                var nav = header.querySelector('nav, .at-main-menu, .navbar-nav');
                if (nav) {
                    nav.classList.toggle('d-none');
                    nav.classList.toggle('is-open');
                }
            }
        });
    });

    // 2. Dropdown / Submenu Click Toggle (Mobile Friendly)
    var dropdownItems = header.querySelectorAll('.has-dropdown > a, .menu-item-has-children > a, .dropdown-toggle');
    dropdownItems.forEach(function (link) {
        link.addEventListener('click', function (e) {
            if (window.innerWidth < 1200) {
                var parent = link.parentElement;
                if (parent) {
                    var submenu = parent.querySelector('.at-submenu, .submenu, .dropdown-menu');
                    if (submenu) {
                        e.preventDefault();
                        parent.classList.toggle('is-open');
                        submenu.style.display = parent.classList.contains('is-open') ? 'block' : 'none';
                    }
                }
            }
        });
    });

    // 3. Close on Outside Click
    document.addEventListener('click', function (e) {
        if (!header.contains(e.target) && mobileDrawer && !mobileDrawer.contains(e.target)) {
            mobileDrawer.classList.remove('opened', 'show', 'is-open');
            header.querySelectorAll('.has-dropdown.is-open').forEach(function (el) {
                el.classList.remove('is-open');
            });
        }
    });
});";
            }

            // Check if section contains Swiper slider classes
            if (element.QuerySelector(".swiper, .swiper-container") != null)
            {
                return @"/**
 * Swiper Slider Initialization Controller
 */
document.addEventListener('DOMContentLoaded', function () {
    if (typeof Swiper !== 'undefined') {
        new Swiper('.swiper', {
            slidesPerView: 1,
            spaceBetween: 24,
            loop: true,
            autoplay: { delay: 4500, disableOnInteraction: false },
            pagination: { el: '.swiper-pagination', clickable: true },
            navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
            breakpoints: {
                768: { slidesPerView: 2 },
                1024: { slidesPerView: 3 }
            }
        });
    }
});";
            }

            return null;
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
                    req.Headers.Add("Accept", "text/css,*/*;q=0.1");
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

        /// <summary>
        /// Intelligently resolves and downloads stylesheet contents using a 3-tier fallback strategy:
        /// 1. Known Vendor Public CDN matching (bootstrap.min.css, swiper-bundle.min.css, font-awesome-pro.css, etc.)
        /// 2. Chrome-saved local "_files/" path normalization and multi-path probing on the target Base URL
        /// 3. Direct absolute URL fetching.
        /// </summary>
        /// <param name="href">The raw href attribute from the HTML link tag.</param>
        /// <param name="cleanBaseUrl">The optional target website base URL.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>A tuple of (content, sizeKb, resolvedUrl, fileName).</returns>
        private async Task<(string? Content, double SizeKb, string ResolvedUrl, string FileName)> FetchStylesheetContentWithFallbacksAsync(
            string href,
            string? cleanBaseUrl,
            CancellationToken cancellationToken)
        {
            var cleanHref = SanitizeBrowserSavedAssetPath(href);
            var rawFileName = Path.GetFileName(cleanHref.Split('?')[0]);
            var fileName = string.IsNullOrWhiteSpace(rawFileName) ? "stylesheet.css" : rawFileName;

            // Tier 1: Known Vendor Public CDNs (Zero-latency instant high-availability mirrors)
            var vendorCdnMap = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
            {
                ["bootstrap.min.css"] = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css",
                ["bootstrap.css"] = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css",
                ["swiper-bundle.min.css"] = "https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css",
                ["swiper-bundle.css"] = "https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css",
                ["swiper.min.css"] = "https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css",
                ["font-awesome-pro.css"] = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css",
                ["font-awesome.min.css"] = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css",
                ["font-awesome.css"] = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css",
                ["all.min.css"] = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css",
                ["magnific-popup.css"] = "https://cdnjs.cloudflare.com/ajax/libs/magnific-popup.js/1.1.0/magnific-popup.min.css",
                ["nice-select.css"] = "https://cdnjs.cloudflare.com/ajax/libs/jquery-nice-select/1.1.0/css/nice-select.min.css",
                ["odometer.css"] = "https://cdnjs.cloudflare.com/ajax/libs/odometer.js/0.4.8/themes/odometer-theme-default.min.css",
                ["animate.min.css"] = "https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css",
                ["animate.css"] = "https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css",
                ["aos.css"] = "https://unpkg.com/aos@2.3.1/dist/aos.css",
                ["slick.css"] = "https://cdn.jsdelivr.net/npm/slick-carousel@1.8.1/slick/slick.css"
            };

            if (vendorCdnMap.TryGetValue(fileName, out var cdnUrl))
            {
                try
                {
                    using var req = new HttpRequestMessage(HttpMethod.Get, cdnUrl);
                    req.Headers.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
                    req.Headers.Add("Accept", "text/css,*/*;q=0.1");
                    var res = await _httpClient.SendAsync(req, cancellationToken);
                    if (res.IsSuccessStatusCode)
                    {
                        var css = await res.Content.ReadAsStringAsync(cancellationToken);
                        var kb = Math.Round(Encoding.UTF8.GetByteCount(css) / 1024.0, 1);
                        return (css, kb, cdnUrl, fileName);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogDebug("Vendor CDN mirror failed for {File}: {Error}", fileName, ex.Message);
                }
            }

            // Tier 2: Candidate URL Probing on Base URL (Handles Chrome "_files" local folders and relative assets)
            var candidateUrls = new List<string>();

            // Direct resolution
            var direct = ResolveAbsoluteUrl(cleanBaseUrl, href);
            if (!string.IsNullOrWhiteSpace(direct) && direct.StartsWith("http", StringComparison.OrdinalIgnoreCase))
            {
                candidateUrls.Add(direct);
            }

            if (!string.IsNullOrWhiteSpace(cleanBaseUrl))
            {
                // Multi-path probing for theme stylesheets (main.css, spacing.css, carouselTicker.css, etc.)
                candidateUrls.Add($"{cleanBaseUrl}/assets/css/vendors/{fileName}");
                candidateUrls.Add($"{cleanBaseUrl}/assets/css/{fileName}");
                candidateUrls.Add($"{cleanBaseUrl}/assets/scss/{fileName}");
                candidateUrls.Add($"{cleanBaseUrl}/css/vendors/{fileName}");
                candidateUrls.Add($"{cleanBaseUrl}/css/{fileName}");
                candidateUrls.Add($"{cleanBaseUrl}/assets/{fileName}");
                candidateUrls.Add($"{cleanBaseUrl}/{fileName}");
            }

            foreach (var probeUrl in candidateUrls.Distinct(StringComparer.OrdinalIgnoreCase))
            {
                try
                {
                    using var req = new HttpRequestMessage(HttpMethod.Get, probeUrl);
                    req.Headers.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36");
                    req.Headers.Add("Accept", "text/css,*/*;q=0.1");
                    var res = await _httpClient.SendAsync(req, cancellationToken);
                    if (res.IsSuccessStatusCode)
                    {
                        var css = await res.Content.ReadAsStringAsync(cancellationToken);
                        if (!string.IsNullOrWhiteSpace(css) && !css.TrimStart().StartsWith("<!DOCTYPE", StringComparison.OrdinalIgnoreCase))
                        {
                            var kb = Math.Round(Encoding.UTF8.GetByteCount(css) / 1024.0, 1);
                            return (css, kb, probeUrl, fileName);
                        }
                    }
                }
                catch
                {
                    // Continue probe
                }
            }

            return (null, 0.0, direct, fileName);
        }

        /// <summary>
        /// Intelligently resolves and downloads JavaScript file contents using a 3-tier fallback strategy:
        /// 1. Known Vendor Public CDN matching (jquery, bootstrap, swiper, magnific-popup, odometer, etc.)
        /// 2. Chrome-saved local "_files/" path normalization and multi-path probing on the target Base URL
        /// 3. Direct absolute URL fetching.
        /// </summary>
        /// <param name="src">The raw src attribute from the HTML script tag.</param>
        /// <param name="cleanBaseUrl">The optional target website base URL.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>A tuple of (content, sizeKb, resolvedUrl, fileName).</returns>
        private async Task<(string? Content, double SizeKb, string ResolvedUrl, string FileName)> FetchScriptContentWithFallbacksAsync(
            string src,
            string? cleanBaseUrl,
            CancellationToken cancellationToken)
        {
            var cleanSrc = SanitizeBrowserSavedAssetPath(src);
            var rawFileName = Path.GetFileName(cleanSrc.Split('?')[0]);
            var fileName = string.IsNullOrWhiteSpace(rawFileName) ? "script.js" : rawFileName;

            // Tier 1: Known Vendor Public CDNs (Zero-latency instant high-availability mirrors)
            if (VendorJsCdnMap.TryGetValue(fileName, out var cdnUrl))
            {
                try
                {
                    using var req = new HttpRequestMessage(HttpMethod.Get, cdnUrl);
                    req.Headers.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
                    req.Headers.Add("Accept", "*/*");
                    var res = await _httpClient.SendAsync(req, cancellationToken);
                    if (res.IsSuccessStatusCode)
                    {
                        var js = await res.Content.ReadAsStringAsync(cancellationToken);
                        var kb = Math.Round(Encoding.UTF8.GetByteCount(js) / 1024.0, 1);
                        return (js, kb, cdnUrl, fileName);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogDebug("Vendor JS CDN mirror failed for {File}: {Error}", fileName, ex.Message);
                }
            }

            // Tier 2: Candidate URL Probing on Base URL (Handles Chrome "_files" local folders and relative assets)
            var candidateUrls = new List<string>();

            var direct = ResolveAbsoluteUrl(cleanBaseUrl, cleanSrc);
            if (!string.IsNullOrWhiteSpace(direct) && direct.StartsWith("http", StringComparison.OrdinalIgnoreCase))
            {
                candidateUrls.Add(direct);
            }

            if (!string.IsNullOrWhiteSpace(cleanBaseUrl))
            {
                candidateUrls.Add($"{cleanBaseUrl}/assets/js/vendors/{fileName}");
                candidateUrls.Add($"{cleanBaseUrl}/assets/js/plugins/{fileName}");
                candidateUrls.Add($"{cleanBaseUrl}/assets/js/{fileName}");
                candidateUrls.Add($"{cleanBaseUrl}/assets/vendors/{fileName}");
                candidateUrls.Add($"{cleanBaseUrl}/js/vendors/{fileName}");
                candidateUrls.Add($"{cleanBaseUrl}/js/plugins/{fileName}");
                candidateUrls.Add($"{cleanBaseUrl}/js/{fileName}");
                candidateUrls.Add($"{cleanBaseUrl}/assets/{fileName}");
                candidateUrls.Add($"{cleanBaseUrl}/{fileName}");
            }

            foreach (var probeUrl in candidateUrls.Distinct(StringComparer.OrdinalIgnoreCase))
            {
                try
                {
                    using var req = new HttpRequestMessage(HttpMethod.Get, probeUrl);
                    req.Headers.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36");
                    req.Headers.Add("Accept", "*/*");
                    var res = await _httpClient.SendAsync(req, cancellationToken);
                    if (res.IsSuccessStatusCode)
                    {
                        var js = await res.Content.ReadAsStringAsync(cancellationToken);
                        if (!string.IsNullOrWhiteSpace(js) && !js.TrimStart().StartsWith("<!DOCTYPE", StringComparison.OrdinalIgnoreCase))
                        {
                            var kb = Math.Round(Encoding.UTF8.GetByteCount(js) / 1024.0, 1);
                            return (js, kb, probeUrl, fileName);
                        }
                    }
                }
                catch
                {
                    // Continue probe
                }
            }

            return (null, 0.0, direct, fileName);
        }

        /// <summary>
        /// Scans the HTML DOM and combined CSS stylesheets for font families, @font-face declarations,
        /// and icon framework class signatures (FontAwesome, Bootstrap Icons, RemixIcon, Boxicons, Google Fonts),
        /// mapping them to live, production-grade universal CDN links.
        /// </summary>
        /// <param name="document">The parsed HTML5 DOM document.</param>
        /// <param name="combinedCss">The full compiled CSS stylesheets string.</param>
        /// <param name="baseUrl">Optional target website base URL for resolving relative references.</param>
        /// <returns>A tuple containing the list of live CDN URLs and corresponding importable HTML tags.</returns>
        private static (List<string> FontUrls, List<ImportableTagDto> ImportableTags) DetectAndMapFontCdns(
            IHtmlDocument document,
            string combinedCss,
            string? baseUrl)
        {
            var fontUrls = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var importTags = new List<ImportableTagDto>();
            int sortOrder = 5;

            void AddCdn(string name, string url)
            {
                if (fontUrls.Add(url))
                {
                    importTags.Add(new ImportableTagDto
                    {
                        Name = name,
                        Zone = "head",
                        TagType = "link_stylesheet",
                        Content = $"<link rel=\"stylesheet\" href=\"{url}\" crossorigin=\"anonymous\" referrerpolicy=\"no-referrer\" />",
                        SortOrder = sortOrder
                    });
                    sortOrder += 5;
                }
            }

            // 1. Check existing external Google / Typekit font link elements in DOM
            var fontElements = document.QuerySelectorAll("link[href*='fonts.googleapis.com'], link[href*='use.typekit.net'], link[href*='cdnjs.cloudflare.com'], link[href*='cdn.jsdelivr.net']");
            foreach (var fontLink in fontElements)
            {
                var href = fontLink.GetAttribute("href");
                if (!string.IsNullOrWhiteSpace(href) && (href.Contains("font") || href.Contains("icon") || href.Contains("typekit")))
                {
                    var resolved = ResolveAbsoluteUrl(baseUrl, href);
                    if (!string.IsNullOrWhiteSpace(resolved))
                    {
                        var name = Path.GetFileName(resolved.Split('?')[0]);
                        AddCdn(string.IsNullOrWhiteSpace(name) ? "font-cdn.css" : name, resolved);
                    }
                }
            }

            var cssAndHtml = (combinedCss ?? string.Empty) + " " + (document.DocumentElement?.OuterHtml ?? string.Empty);

            // 2. Detect FontAwesome (Free / Pro / Light / Regular / Solid / Brands)
            if (Regex.IsMatch(cssAndHtml, @"fa-[a-z0-9-]|font-awesome|fontawesome|fa-light|fa-regular|fa-solid|fa-thin|fa-brands|fa-sharp|fa-duotone", RegexOptions.IgnoreCase))
            {
                AddCdn("FontAwesome 6 (All Icons)", "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css");
            }

            // 3. Detect Bootstrap Icons
            if (Regex.IsMatch(cssAndHtml, @"\bbi-[a-z0-9-]|bootstrap-icons", RegexOptions.IgnoreCase))
            {
                AddCdn("Bootstrap Icons", "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css");
            }

            // 4. Detect Remix Icon
            if (Regex.IsMatch(cssAndHtml, @"\bri-[a-z0-9-]|remixicon", RegexOptions.IgnoreCase))
            {
                AddCdn("RemixIcon", "https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css");
            }

            // 5. Detect Boxicons
            if (Regex.IsMatch(cssAndHtml, @"\bbx-[a-z0-9-]|bx\s+|boxicons", RegexOptions.IgnoreCase))
            {
                AddCdn("Boxicons", "https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css");
            }

            // 6. Detect Material Symbols / Material Icons
            if (Regex.IsMatch(cssAndHtml, @"material-symbols|material-icons", RegexOptions.IgnoreCase))
            {
                AddCdn("Material Symbols Outlined", "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200");
            }

            // 7. Detect Popular Google Fonts in CSS font-family rules
            var recognizedGoogleFonts = new[]
            {
                "Plus Jakarta Sans", "Inter", "Poppins", "Outfit", "Montserrat", "Roboto", "Open Sans",
                "Space Grotesk", "DM Sans", "Syne", "Urbanist", "Manrope", "Sora", "Playfair Display",
                "Cabinet Grotesk", "General Sans", "Epilogue", "Clash Display", "Work Sans", "Nunito"
            };

            foreach (var fontName in recognizedGoogleFonts)
            {
                if (Regex.IsMatch(combinedCss ?? string.Empty, $@"\b{Regex.Escape(fontName)}\b", RegexOptions.IgnoreCase))
                {
                    var formattedName = fontName.Replace(" ", "+");
                    var googleFontUrl = $"https://fonts.googleapis.com/css2?family={formattedName}:wght@300;400;500;600;700;800&display=swap";
                    AddCdn($"Google Font: {fontName}", googleFontUrl);
                }
            }

            return (fontUrls.ToList(), importTags);
        }

        /// <summary>
        /// Extracts structured sample data and placeholder copy from a sliced HTML section DOM element.
        /// Preserves the original text, buttons, links, icons, and repeating list cards to produce a
        /// rich JSON schema for preview hydration and template marketplace defaults.
        /// </summary>
        /// <param name="element">The AngleSharp DOM element of the sliced section.</param>
        /// <param name="category">The classified category (e.g. hero, body, footer, menu).</param>
        /// <param name="brandName">The brand name for debranding.</param>
        /// <param name="baseUrl">The base URL for resolving relative image links.</param>
        /// <returns>A formatted JSON string representing the extracted sample data dictionary.</returns>
        private static string ExtractPlaceholderSampleData(
            IElement element,
            string category,
            string brandName,
            string? baseUrl)
        {
            var data = new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase);

            // 1. Extract Main Title
            var titleEl = element.QuerySelector("h1, h2, h3, .title, .section-title, .heading");
            var titleText = titleEl?.TextContent.Trim();
            if (!string.IsNullOrWhiteSpace(titleText))
            {
                data["Title"] = CleanSampleText(titleText, brandName);
            }
            else
            {
                data["Title"] = $"{ToTitleCase(category)} Heading";
            }

            // 2. Extract Subtitle / MiniTitle
            var subTitleEl = element.QuerySelector(".sub-title, .subtitle, .tag, .badge, h5, h6, .sub-heading");
            if (subTitleEl != null && subTitleEl != titleEl)
            {
                var subText = subTitleEl.TextContent.Trim();
                if (!string.IsNullOrWhiteSpace(subText))
                {
                    data["MiniTitle"] = CleanSampleText(subText, brandName);
                }
            }

            // 3. Extract Full Description / Paragraph
            var pEl = element.QuerySelector("p, .desc, .description, .lead, .text");
            if (pEl != null)
            {
                var pText = pEl.TextContent.Trim();
                if (!string.IsNullOrWhiteSpace(pText))
                {
                    data["FullDescription"] = CleanSampleText(pText, brandName);
                    data["Description"] = data["FullDescription"];
                }
            }

            // 4. Extract Primary Action Button
            var btnEl = element.QuerySelector("a.btn, button, a[class*='btn'], a[class*='button']");
            if (btnEl != null)
            {
                var btnText = btnEl.TextContent.Trim();
                if (!string.IsNullOrWhiteSpace(btnText) && btnText.Length < 35)
                {
                    data["ActionText"] = btnText;
                }
                var href = btnEl.GetAttribute("href");
                if (!string.IsNullOrWhiteSpace(href))
                {
                    data["ActionUrl"] = href.StartsWith("#") ? href : ResolveAbsoluteUrl(baseUrl, href);
                }
            }

            // 5. Extract Section Image / Hero Visual
            var imgEl = element.QuerySelector("img[src]");
            if (imgEl != null)
            {
                var src = imgEl.GetAttribute("src");
                if (!string.IsNullOrWhiteSpace(src))
                {
                    data["ImageUrl"] = ResolveAbsoluteUrl(baseUrl, src);
                }
                var alt = imgEl.GetAttribute("alt");
                if (!string.IsNullOrWhiteSpace(alt))
                {
                    data["ImageAlt"] = alt;
                }
            }

            // 6. Extract Repeating Lists / Feature Grids / Cards
            var listItems = element.QuerySelectorAll("ul > li, .row > [class*='col-'], [class*='card'], [class*='item'], [class*='feature'], [class*='service'], [class*='box']");
            var sectionLists = new List<Dictionary<string, string>>();

            foreach (var item in listItems.Take(6))
            {
                var itemHeading = item.QuerySelector("h3, h4, h5, h6, strong, b, .item-title, .feature-title")?.TextContent.Trim();
                var itemDesc = item.QuerySelector("p, .item-desc, .feature-desc, span")?.TextContent.Trim();
                var iconTag = item.QuerySelector("i, span.material-symbols-outlined, [class*='icon']");
                var iconClass = iconTag?.ClassName?.Trim();
                var itemImg = item.QuerySelector("img")?.GetAttribute("src");
                var itemLink = item.QuerySelector("a")?.GetAttribute("href");

                if (!string.IsNullOrWhiteSpace(itemHeading) && itemHeading != (string)data["Title"])
                {
                    var itemDict = new Dictionary<string, string>
                    {
                        ["Title"] = CleanSampleText(itemHeading, brandName),
                        ["Description"] = !string.IsNullOrWhiteSpace(itemDesc) ? CleanSampleText(itemDesc, brandName) : "High-performance modular capability designed for rapid scaling."
                    };

                    if (!string.IsNullOrWhiteSpace(iconClass))
                    {
                        itemDict["IconClass"] = iconClass;
                    }
                    if (!string.IsNullOrWhiteSpace(itemImg))
                    {
                        itemDict["ImageUrl"] = ResolveAbsoluteUrl(baseUrl, itemImg);
                    }
                    if (!string.IsNullOrWhiteSpace(itemLink))
                    {
                        itemDict["ActionUrl"] = itemLink.StartsWith("#") ? itemLink : ResolveAbsoluteUrl(baseUrl, itemLink);
                    }

                    sectionLists.Add(itemDict);
                }
            }

            if (sectionLists.Any())
            {
                data["SectionLists"] = sectionLists;
            }

            // 7. Organization Defaults
            data["Organization"] = new Dictionary<string, string>
            {
                ["Name"] = string.IsNullOrWhiteSpace(brandName) ? "Enterprise Workspace" : brandName,
                ["Phone"] = "+0 (000) 000-0000",
                ["Email"] = "info@company.com",
                ["Address"] = "100 Enterprise Way, Suite 400",
                ["WorkingHour"] = "Mon - Fri: 9:00 AM - 6:00 PM"
            };

            try
            {
                return System.Text.Json.JsonSerializer.Serialize(data, new System.Text.Json.JsonSerializerOptions
                {
                    WriteIndented = true,
                    Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping
                });
            }
            catch
            {
                return "{}";
            }
        }

        private static string CleanSampleText(string text, string brandName)
        {
            if (string.IsNullOrWhiteSpace(text)) return string.Empty;
            var clean = Regex.Replace(text, @"\s+", " ").Trim();
            if (!string.IsNullOrWhiteSpace(brandName) && brandName.Length >= 3)
            {
                clean = Regex.Replace(clean, Regex.Escape(brandName), "Enterprise Workspace", RegexOptions.IgnoreCase);
            }
            return clean;
        }

        /// <summary>
        /// Extracts external script libraries from the DOM document and maps them into
        /// high-availability CDN code injection tags for standalone preview hydration and tenant embedding.
        /// </summary>
        /// <param name="document">The parsed HTML5 DOM document.</param>
        /// <param name="baseUrl">Optional target website base URL.</param>
        /// <returns>A list of importable tag DTOs.</returns>
        private static List<ImportableTagDto> ExtractCodeInjections(IHtmlDocument document, string? baseUrl)
        {
            var tags = new List<ImportableTagDto>();
            var scripts = document.QuerySelectorAll("script[src]");
            var seenUrls = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            int order = 10;

            foreach (var script in scripts)
            {
                var src = script.GetAttribute("src");
                if (string.IsNullOrWhiteSpace(src)) continue;

                var cleanSrc = SanitizeBrowserSavedAssetPath(src);
                var fileName = Path.GetFileName(cleanSrc.Split('?')[0]);
                if (string.IsNullOrWhiteSpace(fileName)) fileName = "script.js";

                if (VendorJsCdnMap.TryGetValue(fileName, out var cdnUrl))
                {
                    if (seenUrls.Add(cdnUrl))
                    {
                        tags.Add(new ImportableTagDto
                        {
                            Name = fileName,
                            Zone = "body_bottom",
                            TagType = "script",
                            Content = $"<script src=\"{cdnUrl}\" crossorigin=\"anonymous\" referrerpolicy=\"no-referrer\"></script>",
                            SortOrder = order
                        });
                        order += 10;
                    }
                }
                else if (src.Contains("cdnjs") || src.Contains("jsdelivr") || src.Contains("unpkg") || src.Contains("bootstrap") || src.Contains("swiper") || src.Contains("fontawesome"))
                {
                    if (seenUrls.Add(src))
                    {
                        tags.Add(new ImportableTagDto
                        {
                            Name = fileName,
                            Zone = "body_bottom",
                            TagType = "script",
                            Content = script.OuterHtml,
                            SortOrder = order
                        });
                        order += 10;
                    }
                }
            }

            return tags;
        }

        /// <summary>
        /// Sanitizes a raw asset path or filename extracted from browser-saved HTML archives
        /// (e.g. Chrome, Edge, or Firefox "Webpage, Complete" saves).
        /// Strips trailing ".download" extensions and removes local folder prefixes such as "Page Title_files/".
        /// </summary>
        /// <param name="rawPath">The raw href or src path string.</param>
        /// <returns>A cleaned relative path or filename.</returns>
        private static string SanitizeBrowserSavedAssetPath(string? rawPath)
        {
            if (string.IsNullOrWhiteSpace(rawPath)) return string.Empty;

            var sanitized = rawPath.Trim();

            // 1. Strip trailing .download extension often added by Chromium / Firefox during page-save
            sanitized = Regex.Replace(sanitized, @"\.download$", "", RegexOptions.IgnoreCase);

            // 2. Strip browser-saved local folder wrappers (e.g. "Orisa - Creative Agency..._files/path/file.js")
            sanitized = Regex.Replace(sanitized, @"^.*?[_ -]files[\\/]", "", RegexOptions.IgnoreCase);

            return sanitized.Trim();
        }

        /// <summary>
        /// Normalizes and cleans all DOM elements across the parsed document to remove browser-saved
        /// "_files/" folder prefixes and ".download" extensions from image src, script src, and stylesheet href attributes.
        /// </summary>
        /// <param name="document">The parsed HTML5 DOM document.</param>
        /// <param name="cleanBaseUrl">Optional remote website base URL for resolving relative image and asset references.</param>
        private static void SanitizeBrowserSavedDom(IHtmlDocument document, string? cleanBaseUrl)
        {
            if (document == null) return;

            // 1. Sanitize image elements and picture sources
            var mediaElements = document.QuerySelectorAll("img[src], source[srcset]");
            foreach (var el in mediaElements)
            {
                var src = el.GetAttribute("src");
                if (!string.IsNullOrWhiteSpace(src) && (src.Contains("_files") || src.EndsWith(".download", StringComparison.OrdinalIgnoreCase)))
                {
                    var cleanPath = SanitizeBrowserSavedAssetPath(src);
                    var resolved = ResolveAbsoluteUrl(cleanBaseUrl, cleanPath);
                    el.SetAttribute("src", resolved);
                }

                var srcset = el.GetAttribute("srcset");
                if (!string.IsNullOrWhiteSpace(srcset) && (srcset.Contains("_files") || srcset.Contains(".download")))
                {
                    var cleanSrcset = Regex.Replace(srcset, @"^.*?[_ -]files[\\/]", "", RegexOptions.IgnoreCase);
                    cleanSrcset = Regex.Replace(cleanSrcset, @"\.download", "", RegexOptions.IgnoreCase);
                    el.SetAttribute("srcset", cleanSrcset);
                }
            }

            // 2. Sanitize script src attributes
            var scriptElements = document.QuerySelectorAll("script[src]");
            foreach (var script in scriptElements)
            {
                var src = script.GetAttribute("src");
                if (!string.IsNullOrWhiteSpace(src))
                {
                    var clean = SanitizeBrowserSavedAssetPath(src);
                    script.SetAttribute("src", clean);
                }
            }

            // 3. Sanitize link href attributes (stylesheets / preloads)
            var linkElements = document.QuerySelectorAll("link[href]");
            foreach (var link in linkElements)
            {
                var href = link.GetAttribute("href");
                if (!string.IsNullOrWhiteSpace(href))
                {
                    var clean = SanitizeBrowserSavedAssetPath(href);
                    link.SetAttribute("href", clean);
                }
            }
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
