using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Ozikol_BCC.Application.Dtos.Sections;
using Ozikol_BCC.Application.Interfaces.Services;
using Ozikol_BCC.Application.Services.Cloudinary;

namespace Ozikol_BCC.Application.Services.Sections
{
    /// <summary>
    /// Service responsible for remote template ingestion, asset discovery, vendor vs. custom separation,
    /// custom CSS/JS compilation with relative path rewriting, Cloudinary bundling, and modular section slicing.
    /// Resiliently leverages Gemini 2.5 Flash as primary AI with automatic failover to DeepSeek.
    /// </summary>
    public class TemplateAssetBundlePipelineService : ITemplateAssetBundlePipelineService
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ISectionLibraryResolverService _libraryResolver;
        private readonly ICloudinaryService? _cloudinaryService;
        private readonly IConfiguration _configuration;
        private readonly ILogger<TemplateAssetBundlePipelineService> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="TemplateAssetBundlePipelineService"/> class.
        /// </summary>
        public TemplateAssetBundlePipelineService(
            IHttpClientFactory httpClientFactory,
            ISectionLibraryResolverService libraryResolver,
            IConfiguration configuration,
            ILogger<TemplateAssetBundlePipelineService> logger,
            ICloudinaryService? cloudinaryService = null)
        {
            _httpClientFactory = httpClientFactory ?? throw new ArgumentNullException(nameof(httpClientFactory));
            _libraryResolver = libraryResolver ?? throw new ArgumentNullException(nameof(libraryResolver));
            _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _cloudinaryService = cloudinaryService;
        }

        /// <inheritdoc />
        public async Task<TemplateRemoteAssetPipelineResponseDto> ProcessRemoteTemplateAsync(
            TemplateRemoteAssetPipelineRequestDto request,
            CancellationToken cancellationToken = default)
        {
            if (request == null) throw new ArgumentNullException(nameof(request));

            var response = new TemplateRemoteAssetPipelineResponseDto();
            var detectedCdnKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var customCssUrls = new List<string>();
            var customJsUrls = new List<string>();

            // -------------------------------------------------------------
            // STEP 1: Ingest HTML (Remote Crawl or Pre-Fetched)
            // -------------------------------------------------------------
            string htmlContent;
            Uri? baseUri = null;

            if (!string.IsNullOrWhiteSpace(request.DemoUrl))
            {
                if (Uri.TryCreate(request.DemoUrl.Trim(), UriKind.Absolute, out var parsedUri))
                {
                    baseUri = parsedUri;
                }
            }

            if (!string.IsNullOrWhiteSpace(request.PreFetchedHtml))
            {
                htmlContent = request.PreFetchedHtml;
                _logger.LogInformation("Processing pre-fetched HTML markup ({Length} characters).", htmlContent.Length);
            }
            else if (baseUri != null)
            {
                _logger.LogInformation("Crawling live demo URL: {Url}", baseUri);
                try
                {
                    htmlContent = await DownloadStringAsync(baseUri.ToString(), cancellationToken);
                }
                catch (Exception fetchEx)
                {
                    _logger.LogError(fetchEx, "Failed to download remote HTML from {Url}", baseUri);
                    response.Success = false;
                    response.Message = $"Unable to crawl remote demo URL: {fetchEx.Message}";
                    return response;
                }
            }
            else
            {
                response.Success = false;
                response.Message = "Neither DemoUrl nor PreFetchedHtml was provided.";
                return response;
            }

            // -------------------------------------------------------------
            // STEP 2: Extract Link and Script Tags from HTML
            // -------------------------------------------------------------
            var rawCssLinks = ExtractCssHrefs(htmlContent);
            var rawJsScripts = ExtractScriptSources(htmlContent);

            _logger.LogInformation("Extracted {CssCount} CSS links and {JsCount} JS scripts from markup.", rawCssLinks.Count, rawJsScripts.Count);

            // -------------------------------------------------------------
            // STEP 3: Classify Vendor Assets vs. Author Custom Assets
            // -------------------------------------------------------------
            // A. Run static/AI signature detection on the HTML markup
            var htmlDetectedLibs = _libraryResolver.DetectLibraries(htmlContent);
            foreach (var lib in htmlDetectedLibs)
            {
                detectedCdnKeys.Add(lib);
            }

            // B. Classify extracted CSS links
            foreach (var rawHref in rawCssLinks)
            {
                var absoluteUrl = ResolveAbsoluteUrl(baseUri, rawHref);
                var matchedVendor = ClassifyVendorLibrary(absoluteUrl);

                if (!string.IsNullOrEmpty(matchedVendor))
                {
                    detectedCdnKeys.Add(matchedVendor);
                }
                else if (IsKnownCdnDomain(absoluteUrl))
                {
                    // Generic external CDN or web font (e.g. Google Fonts)
                    // We preserve it as a third-party asset
                }
                else
                {
                    // Author custom stylesheet (e.g. main.css, style.css, spacing.css, responsive.css, icons.css)
                    customCssUrls.Add(absoluteUrl);
                }
            }

            // C. Classify extracted JS scripts
            foreach (var rawSrc in rawJsScripts)
            {
                var absoluteUrl = ResolveAbsoluteUrl(baseUri, rawSrc);
                var matchedVendor = ClassifyVendorLibrary(absoluteUrl);

                if (!string.IsNullOrEmpty(matchedVendor))
                {
                    detectedCdnKeys.Add(matchedVendor);
                }
                else if (IsKnownCdnDomain(absoluteUrl))
                {
                    // Generic external CDN
                }
                else
                {
                    // Author custom JavaScript (e.g. main.js, theme.js, custom.js, script.js)
                    customJsUrls.Add(absoluteUrl);
                }
            }

            // D. Populate DetectedLibraries and DetectedCdnTitles from catalog
            foreach (var key in detectedCdnKeys)
            {
                if (SectionLibraryResolverService.Catalog.TryGetValue(key, out var def))
                {
                    response.DetectedLibraries.Add(def);
                    response.DetectedCdnTitles.Add(def.DisplayName);
                }
                else
                {
                    response.DetectedCdnTitles.Add(key);
                }
            }

            // -------------------------------------------------------------
            // STEP 4: Download & Merge Author Custom CSS with Path Rewriting
            // -------------------------------------------------------------
            var mergedCssBuilder = new StringBuilder();
            mergedCssBuilder.AppendLine("/* ========================================================================= */");
            mergedCssBuilder.AppendLine($"/* Ozikol Auto-Compiled Custom Stylesheet Bundle ({DateTime.UtcNow:u}) */");
            mergedCssBuilder.AppendLine("/* ========================================================================= */");
            mergedCssBuilder.AppendLine();

            foreach (var cssUrl in customCssUrls.Distinct(StringComparer.OrdinalIgnoreCase))
            {
                try
                {
                    _logger.LogInformation("Downloading custom CSS file: {Url}", cssUrl);
                    var rawCss = await DownloadStringAsync(cssUrl, cancellationToken);
                    
                    // Rewrite relative url(...) declarations so images and fonts do not break
                    var resolvedCss = RewriteCssRelativeUrls(rawCss, cssUrl);

                    var fileName = Path.GetFileName(new Uri(cssUrl).AbsolutePath);
                    mergedCssBuilder.AppendLine($"/* --- Begin File: {fileName} ({cssUrl}) --- */");
                    mergedCssBuilder.AppendLine(resolvedCss);
                    mergedCssBuilder.AppendLine($"/* --- End File: {fileName} --- */");
                    mergedCssBuilder.AppendLine();
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to download custom CSS file from {Url}", cssUrl);
                    mergedCssBuilder.AppendLine($"/* WARNING: Failed to download custom CSS from {cssUrl}: {ex.Message} */");
                }
            }

            response.RawMergedCustomCss = mergedCssBuilder.ToString();

            // -------------------------------------------------------------
            // STEP 5: Download & Merge Author Custom JS
            // -------------------------------------------------------------
            var mergedJsBuilder = new StringBuilder();
            mergedJsBuilder.AppendLine("/* ========================================================================= */");
            mergedJsBuilder.AppendLine($"/* Ozikol Auto-Compiled Custom Script Bundle ({DateTime.UtcNow:u}) */");
            mergedJsBuilder.AppendLine("/* ========================================================================= */");
            mergedJsBuilder.AppendLine();

            foreach (var jsUrl in customJsUrls.Distinct(StringComparer.OrdinalIgnoreCase))
            {
                try
                {
                    _logger.LogInformation("Downloading custom JS file: {Url}", jsUrl);
                    var rawJs = await DownloadStringAsync(jsUrl, cancellationToken);
                    var fileName = Path.GetFileName(new Uri(jsUrl).AbsolutePath);

                    mergedJsBuilder.AppendLine($"/* --- Begin File: {fileName} ({jsUrl}) --- */");
                    mergedJsBuilder.AppendLine(rawJs);
                    mergedJsBuilder.AppendLine($"/* --- End File: {fileName} --- */");
                    mergedJsBuilder.AppendLine();
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to download custom JS file from {Url}", jsUrl);
                    mergedJsBuilder.AppendLine($"/* WARNING: Failed to download custom JS from {jsUrl}: {ex.Message} */");
                }
            }

            response.RawMergedCustomJs = mergedJsBuilder.ToString();

            // -------------------------------------------------------------
            // STEP 6: Upload Merged Bundles to Cloudinary
            // -------------------------------------------------------------
            var variantSlug = !string.IsNullOrWhiteSpace(request.VariantPrefix)
                ? Regex.Replace(request.VariantPrefix.Trim().ToLowerInvariant(), @"[^a-z0-9_-]", "_")
                : "template_bundle";

            if (request.UploadToCloudinary && _cloudinaryService != null)
            {
                try
                {
                    // Upload CSS Bundle
                    if (!string.IsNullOrWhiteSpace(response.RawMergedCustomCss))
                    {
                        var cssFileName = $"{variantSlug}_{DateTime.UtcNow:yyyyMMddHHmmss}.css";
                        var cssFile = CreateFormFileFromString(response.RawMergedCustomCss, cssFileName, "text/css");
                        var (cssUrl, _) = await _cloudinaryService.UploadRawDocumentWithPublicIdAsync(cssFile, request.CloudinaryFolder);
                        response.CompiledCustomCssUrl = cssUrl;
                        _logger.LogInformation("Successfully uploaded compiled custom CSS to Cloudinary: {Url}", cssUrl);
                    }

                    // Upload JS Bundle
                    if (!string.IsNullOrWhiteSpace(response.RawMergedCustomJs))
                    {
                        var jsFileName = $"{variantSlug}_{DateTime.UtcNow:yyyyMMddHHmmss}.js";
                        var jsFile = CreateFormFileFromString(response.RawMergedCustomJs, jsFileName, "application/javascript");
                        var (jsUrl, _) = await _cloudinaryService.UploadRawDocumentWithPublicIdAsync(jsFile, request.CloudinaryFolder);
                        response.CompiledCustomJsUrl = jsUrl;
                        _logger.LogInformation("Successfully uploaded compiled custom JS to Cloudinary: {Url}", jsUrl);
                    }
                }
                catch (Exception uploadEx)
                {
                    _logger.LogError(uploadEx, "Failed to upload compiled bundles to Cloudinary. Continuing with inline bundle markup.");
                }
            }

            // -------------------------------------------------------------
            // STEP 7: Pre-Render Head and Footer HTML
            // -------------------------------------------------------------
            response.HeadHtml = ComposeHeadHtml(response.DetectedLibraries, response.CompiledCustomCssUrl);
            response.FooterHtml = ComposeFooterHtml(response.DetectedLibraries, response.CompiledCustomJsUrl);

            // -------------------------------------------------------------
            // STEP 8: Modular Section Slicing (AI + Heuristic Fallback)
            // -------------------------------------------------------------
            if (request.AutoSliceSections)
            {
                response.SlicedSections = await SliceSectionsAsync(
                    htmlContent, 
                    variantSlug, 
                    cancellationToken);
            }

            response.Success = true;
            response.ProviderUsed = !string.IsNullOrEmpty(response.ProviderUsed) ? response.ProviderUsed : "Deterministic Asset Engine";
            response.Message = $"Pipeline completed. Detected {response.DetectedCdnTitles.Count} vendor CDNs, compiled {customCssUrls.Count} CSS and {customJsUrls.Count} JS files, and sliced {response.SlicedSections.Count} sections.";

            return response;
        }

        #region URL & Asset Extraction Helpers

        /// <summary>
        /// Extracts all stylesheet href attributes from HTML link tags.
        /// </summary>
        private static List<string> ExtractCssHrefs(string html)
        {
            var results = new List<string>();
            var linkMatches = Regex.Matches(html, @"<link\b(?=[^>]*\brel=[""']stylesheet[""'])[^>]*\bhref=[""']([^""']+)[""']", RegexOptions.IgnoreCase);
            foreach (Match match in linkMatches)
            {
                if (match.Groups.Count > 1 && !string.IsNullOrWhiteSpace(match.Groups[1].Value))
                {
                    results.Add(match.Groups[1].Value.Trim());
                }
            }
            return results;
        }

        /// <summary>
        /// Extracts all script src attributes from HTML script tags.
        /// </summary>
        private static List<string> ExtractScriptSources(string html)
        {
            var results = new List<string>();
            var scriptMatches = Regex.Matches(html, @"<script\b[^>]*\bsrc=[""']([^""']+)[""']", RegexOptions.IgnoreCase);
            foreach (Match match in scriptMatches)
            {
                if (match.Groups.Count > 1 && !string.IsNullOrWhiteSpace(match.Groups[1].Value))
                {
                    results.Add(match.Groups[1].Value.Trim());
                }
            }
            return results;
        }

        /// <summary>
        /// Resolves a relative or protocol-relative URL against the base template URL.
        /// </summary>
        private static string ResolveAbsoluteUrl(Uri? baseUri, string relativeOrAbsoluteUrl)
        {
            if (string.IsNullOrWhiteSpace(relativeOrAbsoluteUrl)) return string.Empty;

            var trimmed = relativeOrAbsoluteUrl.Trim();
            if (trimmed.StartsWith("//", StringComparison.Ordinal))
            {
                return "https:" + trimmed;
            }

            if (Uri.TryCreate(trimmed, UriKind.Absolute, out var absUri))
            {
                return absUri.ToString();
            }

            if (baseUri != null && Uri.TryCreate(baseUri, trimmed, out var resolvedUri))
            {
                return resolvedUri.ToString();
            }

            return trimmed;
        }

        /// <summary>
        /// Identifies if a given stylesheet/script URL belongs to a known vendor library.
        /// </summary>
        private static string? ClassifyVendorLibrary(string url)
        {
            var lower = url.ToLowerInvariant();

            if (lower.Contains("bootstrap")) return "bootstrap";
            if (lower.Contains("swiper")) return "swiper";
            if (lower.Contains("aos") || lower.Contains("aos.css") || lower.Contains("aos.js")) return "aos";
            if (lower.Contains("glightbox")) return "glightbox";
            if (lower.Contains("fontawesome") || lower.Contains("font-awesome") || lower.Contains("all.min.css")) return "fontawesome";
            if (lower.Contains("bootstrap-icons")) return "bootstrap-icons";
            if (lower.Contains("material-symbols")) return "material-symbols";
            if (lower.Contains("purecounter")) return "purecounter";
            if (lower.Contains("typed") && (lower.Contains(".js") || lower.Contains("typed.min.js"))) return "typed";
            if (lower.Contains("isotope")) return "isotope";
            if (lower.Contains("odometer")) return "odometer";
            if (lower.Contains("meanmenu")) return "meanmenu";
            if (lower.Contains("nice-select")) return "nice-select";
            if (lower.Contains("animate.min.css") || lower.Contains("animate.css")) return "animate";
            if (lower.Contains("magnific-popup")) return "magnific-popup";
            if (lower.Contains("slick") && (lower.Contains("slick.css") || lower.Contains("slick.min.js"))) return "slick";
            if (lower.Contains("wow.min.js") || lower.Contains("wow.js")) return "wow";
            if (lower.Contains("gsap")) return "gsap";
            if (lower.Contains("venobox")) return "venobox";
            if (lower.Contains("jquery") && !lower.Contains("jquery.meanmenu") && !lower.Contains("jquery.nice-select")) return "jquery";

            return null;
        }

        /// <summary>
        /// Checks if a URL points to a public CDN domain.
        /// </summary>
        private static bool IsKnownCdnDomain(string url)
        {
            var lower = url.ToLowerInvariant();
            return lower.Contains("cdnjs.cloudflare.com") ||
                   lower.Contains("cdn.jsdelivr.net") ||
                   lower.Contains("unpkg.com") ||
                   lower.Contains("fonts.googleapis.com") ||
                   lower.Contains("fonts.gstatic.com") ||
                   lower.Contains("use.fontawesome.com") ||
                   lower.Contains("ajax.googleapis.com") ||
                   lower.Contains("code.jquery.com");
        }

        /// <summary>
        /// Rewrites all relative url('...') and url(&quot;...&quot;) occurrences in a CSS file to absolute URLs.
        /// </summary>
        private static string RewriteCssRelativeUrls(string cssContent, string cssFileUrl)
        {
            if (string.IsNullOrWhiteSpace(cssContent) || !Uri.TryCreate(cssFileUrl, UriKind.Absolute, out var cssUri))
            {
                return cssContent;
            }

            // Regex matches url(...) with relative paths (not data:, http://, https://, or //)
            var regex = new Regex(@"url\(\s*['""]?(?!data:|http:\/\/|https:\/\/|\/\/)([^'"")]+)['""]?\s*\)", RegexOptions.IgnoreCase);

            return regex.Replace(cssContent, match =>
            {
                var relativePath = match.Groups[1].Value.Trim();
                if (string.IsNullOrEmpty(relativePath)) return match.Value;

                try
                {
                    var resolvedUri = new Uri(cssUri, relativePath);
                    return $"url('{resolvedUri}')";
                }
                catch
                {
                    return match.Value;
                }
            });
        }

        /// <summary>
        /// Downloads string content from a remote URL using standard browser User-Agent headers.
        /// </summary>
        private async Task<string> DownloadStringAsync(string url, CancellationToken cancellationToken)
        {
            var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(30);

            using var request = new HttpRequestMessage(HttpMethod.Get, url);
            request.Headers.UserAgent.ParseAdd("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36");

            using var response = await client.SendAsync(request, cancellationToken);
            response.EnsureSuccessStatusCode();

            return await response.Content.ReadAsStringAsync(cancellationToken);
        }

        /// <summary>
        /// Creates an in-memory <see cref="IFormFile"/> from a UTF-8 string payload.
        /// </summary>
        private static IFormFile CreateFormFileFromString(string content, string fileName, string contentType)
        {
            var bytes = Encoding.UTF8.GetBytes(content);
            var stream = new MemoryStream(bytes);
            return new FormFile(stream, 0, bytes.Length, "file", fileName)
            {
                Headers = new HeaderDictionary(),
                ContentType = contentType
            };
        }

        #endregion

        #region Head and Footer Composition

        /// <summary>
        /// Generates the &lt;head&gt; injection HTML with deduplicated vendor CDNs and the compiled Cloudinary CSS link.
        /// </summary>
        private static string ComposeHeadHtml(List<LibraryAssetDefinition> libraries, string? compiledCssUrl)
        {
            var sb = new StringBuilder();
            var seenCss = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            foreach (var lib in libraries)
            {
                foreach (var css in lib.CssUrls)
                {
                    if (seenCss.Add(css))
                    {
                        sb.AppendLine($"<link rel=\"stylesheet\" href=\"{css}\" />");
                    }
                }
            }

            if (!string.IsNullOrWhiteSpace(compiledCssUrl))
            {
                sb.AppendLine($"<!-- Ozikol Compiled Author Custom CSS -->");
                sb.AppendLine($"<link rel=\"stylesheet\" href=\"{compiledCssUrl}\" />");
            }

            return sb.ToString().TrimEnd();
        }

        /// <summary>
        /// Generates the &lt;body&gt; footer injection HTML with deduplicated vendor script CDNs, auto-inits, and the compiled JS link.
        /// </summary>
        private static string ComposeFooterHtml(List<LibraryAssetDefinition> libraries, string? compiledJsUrl)
        {
            var sb = new StringBuilder();
            var seenJs = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var autoInits = new List<string>();

            // 1. Scripts in library dependency order
            foreach (var lib in libraries)
            {
                foreach (var js in lib.JsUrls)
                {
                    if (seenJs.Add(js))
                    {
                        sb.AppendLine($"<script src=\"{js}\"></script>");
                    }
                }

                if (!string.IsNullOrWhiteSpace(lib.AutoInitJs))
                {
                    autoInits.Add(lib.AutoInitJs.Trim());
                }
            }

            // 2. Compiled author custom scripts
            if (!string.IsNullOrWhiteSpace(compiledJsUrl))
            {
                sb.AppendLine($"<!-- Ozikol Compiled Author Custom Scripts -->");
                sb.AppendLine($"<script src=\"{compiledJsUrl}\"></script>");
            }

            // 3. Auto-initialization blocks
            if (autoInits.Count > 0)
            {
                sb.AppendLine("<script>");
                sb.AppendLine("document.addEventListener('DOMContentLoaded', function() {");
                foreach (var init in autoInits)
                {
                    sb.AppendLine($"  {init}");
                }
                sb.AppendLine("});");
                sb.AppendLine("</script>");
            }

            return sb.ToString().TrimEnd();
        }

        #endregion

        #region Modular Section Slicing Engine

        /// <summary>
        /// Slices the HTML page into distinct modular sections using Gemini 2.5 Flash, failing over to DeepSeek and deterministic regex AST heuristics.
        /// </summary>
        private async Task<List<SlicedSectionDto>> SliceSectionsAsync(
            string htmlContent, 
            string variantSlug, 
            CancellationToken cancellationToken)
        {
            // First, extract body content to eliminate document wrappers
            var bodyMatch = Regex.Match(htmlContent, @"<body\b[^>]*>([\s\S]*?)<\/body>", RegexOptions.IgnoreCase);
            var bodyHtml = bodyMatch.Success ? bodyMatch.Groups[1].Value : htmlContent;

            // Extract candidate section blocks via structural regex
            var candidateBlocks = ExtractCandidateSectionBlocks(bodyHtml);
            if (candidateBlocks.Count == 0)
            {
                _logger.LogInformation("Structural regex found no section blocks. Treating entire body as primary section.");
                candidateBlocks.Add(bodyHtml);
            }

            // Attempt AI Classification on the candidate blocks
            var geminiApiKey = ResolveApiKey("GEMINI_API_KEY", "GeminiApiKey", "AiSettings:GeminiApiKey");
            if (!string.IsNullOrWhiteSpace(geminiApiKey))
            {
                try
                {
                    _logger.LogInformation("Attempting AI Section Slicing with Gemini 2.5 Flash for {Count} candidate blocks...", candidateBlocks.Count);
                    var aiResult = await SliceWithGeminiAsync(geminiApiKey, candidateBlocks, variantSlug, cancellationToken);
                    if (aiResult != null && aiResult.Count > 0)
                    {
                        return aiResult;
                    }
                }
                catch (Exception geminiEx)
                {
                    _logger.LogWarning(geminiEx, "Gemini AI Section Slicing failed. Initiating failover to DeepSeek...");
                }
            }

            var deepSeekApiKey = ResolveApiKey("DEEPSEEK_API_KEY", "DeepSeekApiKey", "AiSettings:DeepSeekApiKey");
            if (!string.IsNullOrWhiteSpace(deepSeekApiKey))
            {
                try
                {
                    _logger.LogInformation("Attempting AI Section Slicing with DeepSeek for {Count} candidate blocks...", candidateBlocks.Count);
                    var deepSeekResult = await SliceWithDeepSeekAsync(deepSeekApiKey, candidateBlocks, variantSlug, cancellationToken);
                    if (deepSeekResult != null && deepSeekResult.Count > 0)
                    {
                        return deepSeekResult;
                    }
                }
                catch (Exception deepSeekEx)
                {
                    _logger.LogError(deepSeekEx, "DeepSeek Section Slicing failover also failed.");
                }
            }

            // Deterministic structural fallback
            _logger.LogInformation("Using deterministic structural fallback for section slicing.");
            return BuildDeterministicSections(candidateBlocks, variantSlug);
        }

        /// <summary>
        /// Extracts top-level structural HTML elements (<header>, <nav>, <section>, <footer>, or major container <div>s).
        /// </summary>
        private static List<string> ExtractCandidateSectionBlocks(string bodyHtml)
        {
            var blocks = new List<string>();

            // Match top-level <header>, <section>, <footer>, <nav> blocks
            var pattern = @"<(header|section|footer|nav)\b[^>]*>[\s\S]*?<\/\1>";
            var matches = Regex.Matches(bodyHtml, pattern, RegexOptions.IgnoreCase);

            if (matches.Count > 0)
            {
                foreach (Match match in matches)
                {
                    var block = match.Value.Trim();
                    if (block.Length > 80) // filter trivial empty tags
                    {
                        blocks.Add(block);
                    }
                }
            }
            else
            {
                // Fall back to matching major container <div> elements with descriptive section/area classes
                var divPattern = @"<div\b(?=[^>]*\bclass=[""'][^""']*(?:area|section|wrapper|banner|hero|service|pricing|team|blog|contact|footer|header)[^""']*[""'])[^>]*>[\s\S]*?<\/div>";
                var divMatches = Regex.Matches(bodyHtml, divPattern, RegexOptions.IgnoreCase);
                foreach (Match match in divMatches)
                {
                    var block = match.Value.Trim();
                    if (block.Length > 100)
                    {
                        blocks.Add(block);
                    }
                }
            }

            return blocks;
        }

        /// <summary>
        /// Calls Gemini 2.5 Flash to classify and structure sliced section blocks.
        /// </summary>
        private async Task<List<SlicedSectionDto>> SliceWithGeminiAsync(
            string apiKey, 
            List<string> candidateBlocks, 
            string variantSlug, 
            CancellationToken cancellationToken)
        {
            var client = _httpClientFactory.CreateClient();
            var endpoint = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={apiKey}";

            var systemPrompt = @"You are an expert HTML UI Section Classifier and Template Slicer.
Given an array of raw HTML section candidate snippets from a web template, classify each section block into structured metadata:
- section_key: unique slug formatted as {variantSlug}_{category}_{order} (e.g. bexon_hero_01, bexon_services_02, bexon_pricing_03, bexon_footer_01)
- category_key: strictly one of ['menu', 'hero', 'bodysections', 'blogs', 'marquee', 'contactus', 'footer']
- section_sub_type: descriptive type (e.g. 'Header', 'Hero', 'Services', 'Pricing', 'Testimonials', 'Team', 'About', 'FAQ', 'Contact', 'Footer')
- title: human-readable title (e.g. 'Hero Banner Slider', 'Core Services Grid', 'Pricing Tables')
- container_class: root class of the section container
- sort_order: sequential integer (1, 2, 3...)

Respond strictly in valid JSON array format matching:
[
  {
    ""section_key"": ""..."",
    ""category_key"": ""..."",
    ""section_sub_type"": ""..."",
    ""title"": ""..."",
    ""container_class"": ""..."",
    ""sort_order"": 1
  }
]";

            var userPromptBuilder = new StringBuilder();
            userPromptBuilder.AppendLine($"Variant Slug: {variantSlug}");
            userPromptBuilder.AppendLine($"Candidate Sections Count: {candidateBlocks.Count}");
            userPromptBuilder.AppendLine();

            for (int i = 0; i < candidateBlocks.Count; i++)
            {
                var preview = candidateBlocks[i].Length > 600 ? candidateBlocks[i].Substring(0, 600) + "..." : candidateBlocks[i];
                userPromptBuilder.AppendLine($"--- Candidate Block #{i + 1} ---");
                userPromptBuilder.AppendLine(preview);
                userPromptBuilder.AppendLine();
            }

            var requestBody = new
            {
                system_instruction = new { parts = new[] { new { text = systemPrompt } } },
                contents = new[]
                {
                    new { role = "user", parts = new[] { new { text = userPromptBuilder.ToString() } } }
                },
                generationConfig = new
                {
                    response_mime_type = "application/json",
                    temperature = 0.1
                }
            };

            using var response = await client.PostAsJsonAsync(endpoint, requestBody, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogWarning("Gemini section slicing returned error status {Status}: {Error}", response.StatusCode, error);
                return new List<SlicedSectionDto>();
            }

            var jsonResponse = await response.Content.ReadAsStringAsync(cancellationToken);
            return ParseAiSectionClassificationResponse(jsonResponse, candidateBlocks, variantSlug);
        }

        /// <summary>
        /// Calls DeepSeek as failover to classify and structure sliced section blocks.
        /// </summary>
        private async Task<List<SlicedSectionDto>> SliceWithDeepSeekAsync(
            string apiKey, 
            List<string> candidateBlocks, 
            string variantSlug, 
            CancellationToken cancellationToken)
        {
            var client = _httpClientFactory.CreateClient();
            var endpoint = "https://api.deepseek.com/chat/completions";

            var systemPrompt = @"You are an expert HTML UI Section Classifier and Template Slicer.
Given an array of raw HTML section candidate snippets from a web template, classify each section block into structured metadata:
- section_key: unique slug formatted as {variantSlug}_{category}_{order} (e.g. bexon_hero_01, bexon_services_02, bexon_pricing_03, bexon_footer_01)
- category_key: strictly one of ['menu', 'hero', 'bodysections', 'blogs', 'marquee', 'contactus', 'footer']
- section_sub_type: descriptive type (e.g. 'Header', 'Hero', 'Services', 'Pricing', 'Testimonials', 'Team', 'About', 'FAQ', 'Contact', 'Footer')
- title: human-readable title
- container_class: root class of the section container
- sort_order: sequential integer (1, 2, 3...)

Respond strictly in valid JSON array format.";

            var userPromptBuilder = new StringBuilder();
            userPromptBuilder.AppendLine($"Variant Slug: {variantSlug}");
            for (int i = 0; i < candidateBlocks.Count; i++)
            {
                var preview = candidateBlocks[i].Length > 600 ? candidateBlocks[i].Substring(0, 600) + "..." : candidateBlocks[i];
                userPromptBuilder.AppendLine($"--- Candidate Block #{i + 1} ---");
                userPromptBuilder.AppendLine(preview);
                userPromptBuilder.AppendLine();
            }

            var requestBody = new
            {
                model = "deepseek-chat",
                messages = new object[]
                {
                    new { role = "system", content = systemPrompt },
                    new { role = "user", content = userPromptBuilder.ToString() }
                },
                response_format = new { type = "json_object" },
                temperature = 0.1
            };

            using var httpRequest = new HttpRequestMessage(HttpMethod.Post, endpoint);
            httpRequest.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", apiKey);
            httpRequest.Content = JsonContent.Create(requestBody);

            using var response = await client.SendAsync(httpRequest, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogWarning("DeepSeek section slicing returned error {Status}: {Error}", response.StatusCode, error);
                return new List<SlicedSectionDto>();
            }

            var jsonResponse = await response.Content.ReadAsStringAsync(cancellationToken);
            return ParseAiSectionClassificationResponse(jsonResponse, candidateBlocks, variantSlug);
        }

        /// <summary>
        /// Parses AI classification output and merges it with the corresponding candidate HTML markup.
        /// </summary>
        private List<SlicedSectionDto> ParseAiSectionClassificationResponse(
            string rawAiResponse, 
            List<string> candidateBlocks, 
            string variantSlug)
        {
            var results = new List<SlicedSectionDto>();

            try
            {
                using var doc = JsonDocument.Parse(rawAiResponse);
                string contentJson = string.Empty;

                // Handle Gemini structure
                if (doc.RootElement.TryGetProperty("candidates", out var candidates) && candidates.GetArrayLength() > 0)
                {
                    var contentObj = candidates[0].GetProperty("content").GetProperty("parts")[0].GetProperty("text").GetString();
                    contentJson = contentObj ?? string.Empty;
                }
                // Handle DeepSeek / OpenAI structure
                else if (doc.RootElement.TryGetProperty("choices", out var choices) && choices.GetArrayLength() > 0)
                {
                    var contentObj = choices[0].GetProperty("message").GetProperty("content").GetString();
                    contentJson = contentObj ?? string.Empty;
                }
                else
                {
                    contentJson = rawAiResponse;
                }

                // Strip markdown code fences if present
                contentJson = Regex.Replace(contentJson, @"^```(?:json)?\s*", string.Empty, RegexOptions.Multiline);
                contentJson = Regex.Replace(contentJson, @"\s*```$", string.Empty, RegexOptions.Multiline).Trim();

                using var classifiedDoc = JsonDocument.Parse(contentJson);
                JsonElement arrayElem;

                if (classifiedDoc.RootElement.ValueKind == JsonValueKind.Array)
                {
                    arrayElem = classifiedDoc.RootElement;
                }
                else if (classifiedDoc.RootElement.TryGetProperty("sections", out var sectionsProp) && sectionsProp.ValueKind == JsonValueKind.Array)
                {
                    arrayElem = sectionsProp;
                }
                else
                {
                    return BuildDeterministicSections(candidateBlocks, variantSlug);
                }

                int index = 0;
                foreach (var item in arrayElem.EnumerateArray())
                {
                    if (index >= candidateBlocks.Count) break;

                    var section = new SlicedSectionDto
                    {
                        SectionKey = item.TryGetProperty("section_key", out var sk) ? sk.GetString() ?? $"{variantSlug}_sec_{index + 1}" : $"{variantSlug}_sec_{index + 1}",
                        CategoryKey = item.TryGetProperty("category_key", out var ck) ? ck.GetString() ?? "bodysections" : "bodysections",
                        SectionSubType = item.TryGetProperty("section_sub_type", out var sst) ? sst.GetString() ?? "Services" : "Services",
                        Title = item.TryGetProperty("title", out var title) ? title.GetString() ?? $"Section {index + 1}" : $"Section {index + 1}",
                        ContainerClass = item.TryGetProperty("container_class", out var cc) ? cc.GetString() ?? string.Empty : string.Empty,
                        HtmlMarkup = candidateBlocks[index],
                        SortOrder = index + 1
                    };

                    results.Add(section);
                    index++;
                }

                // Append any remaining candidate blocks
                while (index < candidateBlocks.Count)
                {
                    results.Add(new SlicedSectionDto
                    {
                        SectionKey = $"{variantSlug}_sec_{index + 1}",
                        CategoryKey = "bodysections",
                        SectionSubType = "Services",
                        Title = $"Section {index + 1}",
                        HtmlMarkup = candidateBlocks[index],
                        SortOrder = index + 1
                    });
                    index++;
                }

                return results;
            }
            catch (Exception parseEx)
            {
                _logger.LogWarning(parseEx, "Failed to parse AI section classification JSON. Falling back to deterministic slicing.");
                return BuildDeterministicSections(candidateBlocks, variantSlug);
            }
        }

        /// <summary>
        /// Deterministic regex/AST heuristic to classify candidate sections when AI is unreachable.
        /// </summary>
        private static List<SlicedSectionDto> BuildDeterministicSections(List<string> candidateBlocks, string variantSlug)
        {
            var sections = new List<SlicedSectionDto>();

            for (int i = 0; i < candidateBlocks.Count; i++)
            {
                var block = candidateBlocks[i];
                var classMatch = Regex.Match(block, @"\bclass=[""']([^""']+)[""']", RegexOptions.IgnoreCase);
                var containerClass = classMatch.Success ? classMatch.Groups[1].Value.Split(' ')[0] : string.Empty;

                var lowerBlock = block.ToLowerInvariant();
                string categoryKey = "bodysections";
                string subType = "Services";
                string title = $"Section {i + 1}";

                if (lowerBlock.StartsWith("<header") || lowerBlock.Contains("header-area") || lowerBlock.Contains("main-menu") || lowerBlock.Contains("navbar"))
                {
                    categoryKey = "menu";
                    subType = "Header";
                    title = "Header Navigation";
                }
                else if (lowerBlock.Contains("hero") || lowerBlock.Contains("slider") || lowerBlock.Contains("banner"))
                {
                    categoryKey = "hero";
                    subType = "Hero";
                    title = "Hero Banner";
                }
                else if (lowerBlock.Contains("blog") || lowerBlock.Contains("news") || lowerBlock.Contains("post"))
                {
                    categoryKey = "blogs";
                    subType = "Blog";
                    title = "Latest Blogs";
                }
                else if (lowerBlock.Contains("marquee") || lowerBlock.Contains("ticker") || lowerBlock.Contains("brand-slider"))
                {
                    categoryKey = "marquee";
                    subType = "Marquee";
                    title = "Brand Marquee";
                }
                else if (lowerBlock.Contains("contact") || lowerBlock.Contains("touch") || lowerBlock.Contains("get-in-touch"))
                {
                    categoryKey = "contactus";
                    subType = "Contact";
                    title = "Contact Us";
                }
                else if (lowerBlock.StartsWith("<footer") || lowerBlock.Contains("footer-area") || lowerBlock.Contains("copyright"))
                {
                    categoryKey = "footer";
                    subType = "Footer";
                    title = "Site Footer";
                }
                else if (lowerBlock.Contains("pricing") || lowerBlock.Contains("plan"))
                {
                    categoryKey = "bodysections";
                    subType = "Pricing";
                    title = "Pricing Plans";
                }
                else if (lowerBlock.Contains("team") || lowerBlock.Contains("member"))
                {
                    categoryKey = "bodysections";
                    subType = "Team";
                    title = "Our Team";
                }
                else if (lowerBlock.Contains("testimonial") || lowerBlock.Contains("review") || lowerBlock.Contains("feedback"))
                {
                    categoryKey = "bodysections";
                    subType = "Testimonials";
                    title = "Client Testimonials";
                }
                else if (lowerBlock.Contains("faq") || lowerBlock.Contains("accordion"))
                {
                    categoryKey = "bodysections";
                    subType = "FAQ";
                    title = "Frequently Asked Questions";
                }
                else if (lowerBlock.Contains("about") || lowerBlock.Contains("history") || lowerBlock.Contains("who-we-are"))
                {
                    categoryKey = "bodysections";
                    subType = "About";
                    title = "About Us";
                }

                sections.Add(new SlicedSectionDto
                {
                    SectionKey = $"{variantSlug}_{subType.ToLowerInvariant()}_{i + 1:D2}",
                    CategoryKey = categoryKey,
                    SectionSubType = subType,
                    Title = title,
                    ContainerClass = containerClass,
                    HtmlMarkup = block,
                    SortOrder = i + 1
                });
            }

            return sections;
        }

        /// <summary>
        /// Resolves an API key checking configuration sections and OS environment variables.
        /// </summary>
        private string? ResolveApiKey(string envKey, params string[] configKeys)
        {
            var envVal = Environment.GetEnvironmentVariable(envKey);
            if (!string.IsNullOrWhiteSpace(envVal)) return envVal.Trim();

            foreach (var key in configKeys)
            {
                var confVal = _configuration[key];
                if (!string.IsNullOrWhiteSpace(confVal)) return confVal.Trim();
            }

            return null;
        }

        #endregion
    }
}
