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
using Microsoft.Extensions.Logging;
using Ozikol_BCC.Application.Dtos.Sections;
using Ozikol_BCC.Application.Interfaces.Services;
using Ozikol_BCC.Application.Services.Cloudinary;

namespace Ozikol.Central.Services
{
    /// <summary>
    /// Service responsible for remote template ingestion, asset discovery, vendor vs. custom separation,
    /// custom CSS/JS compilation with relative path rewriting, Cloudinary bundling, and modular section slicing.
    /// Uses <see cref="IAiKeyPoolManagerService"/> to resolve active keys from the database key pool.
    /// </summary>
    public class TemplateAssetBundlePipelineService : ITemplateAssetBundlePipelineService
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ISectionLibraryResolverService _libraryResolver;
        private readonly IAiKeyPoolManagerService? _keyPoolService;
        private readonly ICloudinaryService? _cloudinaryService;
        private readonly ILogger<TemplateAssetBundlePipelineService> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="TemplateAssetBundlePipelineService"/> class.
        /// </summary>
        public TemplateAssetBundlePipelineService(
            IHttpClientFactory httpClientFactory,
            ISectionLibraryResolverService libraryResolver,
            ILogger<TemplateAssetBundlePipelineService> logger,
            IAiKeyPoolManagerService? keyPoolService = null,
            ICloudinaryService? cloudinaryService = null)
        {
            _httpClientFactory = httpClientFactory ?? throw new ArgumentNullException(nameof(httpClientFactory));
            _libraryResolver = libraryResolver ?? throw new ArgumentNullException(nameof(libraryResolver));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _keyPoolService = keyPoolService;
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
            // STEP 2: Extract & Classify External Stylesheets
            // -------------------------------------------------------------
            var linkMatches = Regex.Matches(htmlContent, @"<link\s+[^>]*rel=[""']stylesheet[""'][^>]*href=[""']([^""']+)[""'][^>]*>", RegexOptions.IgnoreCase);
            if (linkMatches.Count == 0)
            {
                linkMatches = Regex.Matches(htmlContent, @"<link\s+[^>]*href=[""']([^""']+)[""'][^>]*rel=[""']stylesheet[""'][^>]*>", RegexOptions.IgnoreCase);
            }

            foreach (Match match in linkMatches)
            {
                var rawHref = match.Groups[1].Value.Trim();
                if (string.IsNullOrWhiteSpace(rawHref)) continue;

                var resolvedUrl = ResolveAbsoluteUrl(baseUri, rawHref);
                var fileName = Path.GetFileName(resolvedUrl.Split('?')[0]);

                if (IsGoogleFontUrl(resolvedUrl))
                {
                    // Track font stylesheet
                }
                else if (TryMatchVendorLibrary(fileName, out var matchedLibraryKey))
                {
                    detectedCdnKeys.Add(matchedLibraryKey);
                }
                else
                {
                    customCssUrls.Add(resolvedUrl);
                }
            }

            // -------------------------------------------------------------
            // STEP 3: Extract & Classify External Scripts
            // -------------------------------------------------------------
            var scriptMatches = Regex.Matches(htmlContent, @"<script\s+[^>]*src=[""']([^""']+)[""'][^>]*>", RegexOptions.IgnoreCase);
            foreach (Match match in scriptMatches)
            {
                var rawSrc = match.Groups[1].Value.Trim();
                if (string.IsNullOrWhiteSpace(rawSrc)) continue;

                var resolvedUrl = ResolveAbsoluteUrl(baseUri, rawSrc);
                var fileName = Path.GetFileName(resolvedUrl.Split('?')[0]);

                if (TryMatchVendorLibrary(fileName, out var matchedLibraryKey))
                {
                    detectedCdnKeys.Add(matchedLibraryKey);
                }
                else
                {
                    customJsUrls.Add(resolvedUrl);
                }
            }

            // Also run AngleSharp regex library detection on the full markup
            var heuristicLibs = _libraryResolver.DetectLibraries(htmlContent);
            foreach (var lib in heuristicLibs) detectedCdnKeys.Add(lib);

            response.DetectedCdnTitles = detectedCdnKeys.ToList();

            var libraryResolution = _libraryResolver.ResolveAssets(new DetectLibrariesRequestDto { HtmlMarkup = htmlContent });
            response.DetectedLibraries = libraryResolution.DetectedLibraries
                .Where(k => SectionLibraryResolverService.Catalog.ContainsKey(k))
                .Select(k => SectionLibraryResolverService.Catalog[k])
                .ToList();
            response.HeadHtml = libraryResolution.HeadHtml;
            response.FooterHtml = libraryResolution.FooterHtml;

            // -------------------------------------------------------------
            // STEP 4: Download, Scrape & Rewrite Custom Stylesheets
            // -------------------------------------------------------------
            var compiledCustomCssBuilder = new StringBuilder();

            foreach (var cssUrl in customCssUrls)
            {
                try
                {
                    _logger.LogInformation("Downloading and rewriting custom stylesheet: {Url}", cssUrl);
                    var rawCss = await DownloadStringAsync(cssUrl, cancellationToken);
                    var rewrittenCss = RewriteCssAssetUrls(rawCss, cssUrl);

                    compiledCustomCssBuilder.AppendLine($"/* ===========================================================================");
                    compiledCustomCssBuilder.AppendLine($"   Source: {cssUrl}");
                    compiledCustomCssBuilder.AppendLine($"   =========================================================================== */");
                    compiledCustomCssBuilder.AppendLine(rewrittenCss);
                    compiledCustomCssBuilder.AppendLine();
                }
                catch (Exception cssEx)
                {
                    _logger.LogWarning(cssEx, "Failed to download custom stylesheet {Url}", cssUrl);
                }
            }

            var mergedCss = compiledCustomCssBuilder.ToString();
            response.RawMergedCustomCss = mergedCss;

            // -------------------------------------------------------------
            // STEP 5: Download & Concatenate Custom JavaScript
            // -------------------------------------------------------------
            var compiledJsBuilder = new StringBuilder();
            foreach (var jsUrl in customJsUrls)
            {
                try
                {
                    _logger.LogInformation("Downloading custom script: {Url}", jsUrl);
                    var rawJs = await DownloadStringAsync(jsUrl, cancellationToken);
                    compiledJsBuilder.AppendLine($"// Source: {jsUrl}");
                    compiledJsBuilder.AppendLine(rawJs);
                    compiledJsBuilder.AppendLine();
                }
                catch (Exception jsEx)
                {
                    _logger.LogWarning(jsEx, "Failed to download custom script {Url}", jsUrl);
                }
            }

            var mergedJs = compiledJsBuilder.ToString();
            response.RawMergedCustomJs = mergedJs;

            // -------------------------------------------------------------
            // STEP 6: Optional Cloudinary Compilation & Hosting
            // -------------------------------------------------------------
            var variantSlug = string.IsNullOrWhiteSpace(request.VariantPrefix) ? "template_bundle" : request.VariantPrefix.ToLowerInvariant().Replace(" ", "_");

            if (request.UploadToCloudinary && _cloudinaryService != null)
            {
                try
                {
                    var targetFolder = string.IsNullOrWhiteSpace(request.CloudinaryFolder) ? "templates/assets" : request.CloudinaryFolder;

                    if (!string.IsNullOrWhiteSpace(mergedCss))
                    {
                        var cssBytes = Encoding.UTF8.GetBytes(mergedCss);
                        using var cssStream = new MemoryStream(cssBytes);
                        var formFile = new FormFile(cssStream, 0, cssBytes.Length, "file", $"{variantSlug}_custom.css")
                        {
                            Headers = new HeaderDictionary(),
                            ContentType = "text/css"
                        };

                        var cssUrl = await _cloudinaryService.UploadRawDocumentAsync(formFile, targetFolder);
                        if (!string.IsNullOrWhiteSpace(cssUrl))
                        {
                            response.CompiledCustomCssUrl = cssUrl;
                            _logger.LogInformation("Uploaded compiled custom CSS to Cloudinary: {Url}", cssUrl);
                        }
                    }

                    if (!string.IsNullOrWhiteSpace(mergedJs))
                    {
                        var jsBytes = Encoding.UTF8.GetBytes(mergedJs);
                        using var jsStream = new MemoryStream(jsBytes);
                        var formFile = new FormFile(jsStream, 0, jsBytes.Length, "file", $"{variantSlug}_custom.js")
                        {
                            Headers = new HeaderDictionary(),
                            ContentType = "application/javascript"
                        };

                        var jsUrl = await _cloudinaryService.UploadRawDocumentAsync(formFile, targetFolder);
                        if (!string.IsNullOrWhiteSpace(jsUrl))
                        {
                            response.CompiledCustomJsUrl = jsUrl;
                            _logger.LogInformation("Uploaded compiled custom JS to Cloudinary: {Url}", jsUrl);
                        }
                    }
                }
                catch (Exception uploadEx)
                {
                    _logger.LogError(uploadEx, "Failed to upload compiled asset bundles to Cloudinary.");
                }
            }

            // -------------------------------------------------------------
            // STEP 7: Section Slicing & AI Semantic Classification
            // -------------------------------------------------------------
            if (request.AutoSliceSections)
            {
                response.SlicedSections = await SliceSectionsAsync(htmlContent, variantSlug, cancellationToken);
            }

            response.Success = true;
            response.Message = $"Successfully processed {customCssUrls.Count} custom stylesheets and {customJsUrls.Count} scripts. Discovered {detectedCdnKeys.Count} standard vendor libraries.";
            return response;
        }

        #region Helper Methods

        private async Task<string> DownloadStringAsync(string url, CancellationToken cancellationToken)
        {
            var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(25);

            using var request = new HttpRequestMessage(HttpMethod.Get, url);
            request.Headers.UserAgent.ParseAdd("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36");

            using var response = await client.SendAsync(request, cancellationToken);
            response.EnsureSuccessStatusCode();

            return await response.Content.ReadAsStringAsync(cancellationToken);
        }

        private static string ResolveAbsoluteUrl(Uri? baseUri, string relativeOrAbsoluteUrl)
        {
            if (Uri.TryCreate(relativeOrAbsoluteUrl, UriKind.Absolute, out var absoluteUri))
            {
                return absoluteUri.ToString();
            }

            if (baseUri != null && Uri.TryCreate(baseUri, relativeOrAbsoluteUrl, out var combinedUri))
            {
                return combinedUri.ToString();
            }

            return relativeOrAbsoluteUrl;
        }

        private static bool IsGoogleFontUrl(string url)
        {
            return url.Contains("fonts.googleapis.com", StringComparison.OrdinalIgnoreCase) ||
                   url.Contains("fonts.gstatic.com", StringComparison.OrdinalIgnoreCase);
        }

        private static bool TryMatchVendorLibrary(string fileName, out string matchedKey)
        {
            matchedKey = string.Empty;
            if (string.IsNullOrWhiteSpace(fileName)) return false;

            var lower = fileName.ToLowerInvariant();

            if (lower.Contains("bootstrap")) { matchedKey = "bootstrap"; return true; }
            if (lower.Contains("swiper")) { matchedKey = "swiper"; return true; }
            if (lower.Contains("slick")) { matchedKey = "slick"; return true; }
            if (lower.Contains("owl.carousel") || lower.Contains("owl-carousel")) { matchedKey = "owlcarousel"; return true; }
            if (lower.Contains("aos")) { matchedKey = "aos"; return true; }
            if (lower.Contains("wow")) { matchedKey = "wow"; return true; }
            if (lower.Contains("glightbox")) { matchedKey = "glightbox"; return true; }
            if (lower.Contains("magnific-popup") || lower.Contains("magnific.popup")) { matchedKey = "magnificpopup"; return true; }
            if (lower.Contains("fancybox")) { matchedKey = "fancybox"; return true; }
            if (lower.Contains("nice-select") || lower.Contains("niceselect")) { matchedKey = "niceselect"; return true; }
            if (lower.Contains("odometer")) { matchedKey = "odometer"; return true; }
            if (lower.Contains("purecounter")) { matchedKey = "purecounter"; return true; }
            if (lower.Contains("counterup")) { matchedKey = "counterup"; return true; }
            if (lower.Contains("typed")) { matchedKey = "typed"; return true; }
            if (lower.Contains("isotope")) { matchedKey = "isotope"; return true; }
            if (lower.Contains("masonry")) { matchedKey = "masonry"; return true; }
            if (lower.Contains("font-awesome") || lower.Contains("fontawesome") || lower.Contains("all.min.css")) { matchedKey = "fontawesome"; return true; }
            if (lower.Contains("bootstrap-icons")) { matchedKey = "bootstrapicons"; return true; }
            if (lower.Contains("remixicon")) { matchedKey = "remixicon"; return true; }
            if (lower.Contains("flaticon")) { matchedKey = "flaticon"; return true; }
            if (lower.Contains("meanmenu")) { matchedKey = "meanmenu"; return true; }
            if (lower.Contains("jquery") && !lower.Contains("plugin")) { matchedKey = "jquery"; return true; }

            return false;
        }

        private static string RewriteCssAssetUrls(string cssContent, string cssSourceUrl)
        {
            if (string.IsNullOrWhiteSpace(cssContent)) return string.Empty;

            if (!Uri.TryCreate(cssSourceUrl, UriKind.Absolute, out var cssUri))
            {
                return cssContent;
            }

            var urlRegex = new Regex(@"url\(\s*(['""]?)(.*?)\1\s*\)", RegexOptions.IgnoreCase);

            return urlRegex.Replace(cssContent, match =>
            {
                var quote = match.Groups[1].Value;
                var rawUrl = match.Groups[2].Value.Trim();

                if (rawUrl.StartsWith("data:", StringComparison.OrdinalIgnoreCase) ||
                    rawUrl.StartsWith("http://", StringComparison.OrdinalIgnoreCase) ||
                    rawUrl.StartsWith("https://", StringComparison.OrdinalIgnoreCase) ||
                    rawUrl.StartsWith("//", StringComparison.OrdinalIgnoreCase) ||
                    rawUrl.StartsWith("#", StringComparison.OrdinalIgnoreCase))
                {
                    return match.Value;
                }

                try
                {
                    var resolvedAssetUri = new Uri(cssUri, rawUrl);
                    return $"url({quote}{resolvedAssetUri}{quote})";
                }
                catch
                {
                    return match.Value;
                }
            });
        }

        private async Task<List<SlicedSectionDto>> SliceSectionsAsync(
            string htmlContent, 
            string variantSlug, 
            CancellationToken cancellationToken)
        {
            var bodyMatch = Regex.Match(htmlContent, @"<body\b[^>]*>([\s\S]*?)<\/body>", RegexOptions.IgnoreCase);
            var bodyHtml = bodyMatch.Success ? bodyMatch.Groups[1].Value : htmlContent;

            var candidateBlocks = ExtractCandidateSectionBlocks(bodyHtml);
            if (candidateBlocks.Count == 0)
            {
                _logger.LogInformation("Structural regex found no section blocks. Treating entire body as primary section.");
                candidateBlocks.Add(bodyHtml);
            }

            // Attempt AI Classification from DB Key Pool if available
            if (_keyPoolService != null)
            {
                var geminiKey = await _keyPoolService.GetNextAvailableKeyAsync("Gemini", cancellationToken);
                if (geminiKey != null)
                {
                    try
                    {
                        _logger.LogInformation("[AI Key Pool] Attempting AI Section Slicing with Gemini (Key: '{Alias}') for {Count} blocks...", geminiKey.KeyAlias, candidateBlocks.Count);
                        var aiResult = await SliceWithGeminiAsync(geminiKey.ApiKey, candidateBlocks, variantSlug, cancellationToken);
                        if (aiResult != null && aiResult.Count > 0)
                        {
                            return aiResult;
                        }
                    }
                    catch (Exception geminiEx)
                    {
                        _logger.LogWarning(geminiEx, "[AI Key Pool] Gemini AI Section Slicing failed. Initiating failover to DeepSeek...");
                        await _keyPoolService.MarkRateLimitedAsync(geminiKey.Id, 120, cancellationToken);
                    }
                }

                var deepSeekKey = await _keyPoolService.GetNextAvailableKeyAsync("DeepSeek", cancellationToken);
                if (deepSeekKey != null)
                {
                    try
                    {
                        _logger.LogInformation("[AI Key Pool] Attempting AI Section Slicing with DeepSeek failover (Key: '{Alias}') for {Count} blocks...", deepSeekKey.KeyAlias, candidateBlocks.Count);
                        var deepSeekResult = await SliceWithDeepSeekAsync(deepSeekKey.ApiKey, candidateBlocks, variantSlug, cancellationToken);
                        if (deepSeekResult != null && deepSeekResult.Count > 0)
                        {
                            return deepSeekResult;
                        }
                    }
                    catch (Exception deepSeekEx)
                    {
                        _logger.LogError(deepSeekEx, "[AI Key Pool] DeepSeek Section Slicing failover also failed.");
                    }
                }
            }

            _logger.LogInformation("Using deterministic structural fallback for section slicing.");
            return BuildDeterministicSections(candidateBlocks, variantSlug);
        }

        private static List<string> ExtractCandidateSectionBlocks(string bodyHtml)
        {
            var blocks = new List<string>();
            var pattern = @"<(header|section|footer|nav)\b[^>]*>[\s\S]*?<\/\1>";
            var matches = Regex.Matches(bodyHtml, pattern, RegexOptions.IgnoreCase);

            if (matches.Count > 0)
            {
                foreach (Match match in matches)
                {
                    var block = match.Value.Trim();
                    if (block.Length > 80)
                    {
                        blocks.Add(block);
                    }
                }
            }
            else
            {
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

        private async Task<List<SlicedSectionDto>> SliceWithGeminiAsync(
            string apiKey, 
            List<string> candidateBlocks, 
            string variantSlug, 
            CancellationToken cancellationToken)
        {
            var client = _httpClientFactory.CreateClient();
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

            var models = new[] { "gemini-2.0-flash", "gemini-1.5-flash", "gemini-2.5-flash", "gemini-1.5-flash-8b" };
            foreach (var model in models)
            {
                var endpoint = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}";
                try
                {
                    using var response = await client.PostAsJsonAsync(endpoint, requestBody, cancellationToken);
                    if (response.IsSuccessStatusCode)
                    {
                        var jsonResponse = await response.Content.ReadAsStringAsync(cancellationToken);
                        return ParseAiSectionClassificationResponse(jsonResponse, candidateBlocks, variantSlug);
                    }
                }
                catch
                {
                    // Try next model
                }
            }

            return new List<SlicedSectionDto>();
        }

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

            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", apiKey);

            var requestBody = new
            {
                model = "deepseek-chat",
                messages = new[]
                {
                    new { role = "system", content = systemPrompt },
                    new { role = "user", content = userPromptBuilder.ToString() }
                },
                response_format = new { type = "json_object" },
                temperature = 0.1
            };

            using var response = await client.PostAsJsonAsync(endpoint, requestBody, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                return new List<SlicedSectionDto>();
            }

            var doc = await response.Content.ReadFromJsonAsync<JsonDocument>(cancellationToken: cancellationToken);
            var content = doc?.RootElement.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString() ?? "[]";
            return ParseAiSectionClassificationResponse(content, candidateBlocks, variantSlug);
        }

        private static List<SlicedSectionDto> ParseAiSectionClassificationResponse(
            string jsonResponse, 
            List<string> candidateBlocks, 
            string variantSlug)
        {
            var sections = new List<SlicedSectionDto>();

            try
            {
                var cleanedJson = Regex.Replace(jsonResponse.Trim(), @"^```json\s*", string.Empty, RegexOptions.Multiline);
                cleanedJson = Regex.Replace(cleanedJson, @"^```\s*$", string.Empty, RegexOptions.Multiline).Trim();

                using var doc = JsonDocument.Parse(cleanedJson);
                var root = doc.RootElement;

                JsonElement arrayElement;
                if (root.ValueKind == JsonValueKind.Array)
                {
                    arrayElement = root;
                }
                else if (root.ValueKind == JsonValueKind.Object && root.TryGetProperty("sections", out var secProp) && secProp.ValueKind == JsonValueKind.Array)
                {
                    arrayElement = secProp;
                }
                else
                {
                    return BuildDeterministicSections(candidateBlocks, variantSlug);
                }

                int index = 0;
                foreach (var item in arrayElement.EnumerateArray())
                {
                    if (index >= candidateBlocks.Count) break;

                    var secKey = item.TryGetProperty("section_key", out var sk) ? sk.GetString() : $"{variantSlug}_sec_{index + 1}";
                    var catKey = item.TryGetProperty("category_key", out var ck) ? ck.GetString() : "bodysections";
                    var subType = item.TryGetProperty("section_sub_type", out var st) ? st.GetString() : "GenericSection";
                    var title = item.TryGetProperty("title", out var t) ? t.GetString() : $"Section {index + 1}";
                    var containerCls = item.TryGetProperty("container_class", out var cc) ? cc.GetString() : $"sec-{index + 1}";
                    var sortOrder = item.TryGetProperty("sort_order", out var so) && so.TryGetInt32(out var orderVal) ? orderVal : index + 1;

                    sections.Add(new SlicedSectionDto
                    {
                        SectionKey = secKey ?? $"{variantSlug}_sec_{index + 1}",
                        CategoryKey = catKey ?? "bodysections",
                        SectionSubType = subType ?? "GenericSection",
                        Title = title ?? $"Section {index + 1}",
                        ContainerClass = containerCls ?? $"sec-{index + 1}",
                        HtmlMarkup = candidateBlocks[index],
                        SortOrder = sortOrder
                    });

                    index++;
                }

                while (index < candidateBlocks.Count)
                {
                    sections.Add(new SlicedSectionDto
                    {
                        SectionKey = $"{variantSlug}_sec_{index + 1}",
                        CategoryKey = "bodysections",
                        SectionSubType = "Section",
                        Title = $"Section {index + 1}",
                        ContainerClass = $"sec-{index + 1}",
                        HtmlMarkup = candidateBlocks[index],
                        SortOrder = index + 1
                    });
                    index++;
                }
            }
            catch
            {
                return BuildDeterministicSections(candidateBlocks, variantSlug);
            }

            return sections;
        }

        private static List<SlicedSectionDto> BuildDeterministicSections(List<string> candidateBlocks, string variantSlug)
        {
            var sections = new List<SlicedSectionDto>();

            for (int i = 0; i < candidateBlocks.Count; i++)
            {
                var block = candidateBlocks[i];
                string catKey = "bodysections";
                string subType = "Section";
                string title = $"Section {i + 1}";

                if (block.Contains("<header", StringComparison.OrdinalIgnoreCase) || block.Contains("<nav", StringComparison.OrdinalIgnoreCase) || block.Contains("header-area", StringComparison.OrdinalIgnoreCase))
                {
                    catKey = "menu";
                    subType = "Header";
                    title = "Header Navigation";
                }
                else if (i == 0 || (i == 1 && sections.Any(s => s.CategoryKey == "menu")) || block.Contains("hero", StringComparison.OrdinalIgnoreCase) || block.Contains("banner", StringComparison.OrdinalIgnoreCase))
                {
                    catKey = "hero";
                    subType = "Hero";
                    title = "Hero Banner";
                }
                else if (block.Contains("<footer", StringComparison.OrdinalIgnoreCase) || block.Contains("footer-area", StringComparison.OrdinalIgnoreCase) || i == candidateBlocks.Count - 1)
                {
                    catKey = "footer";
                    subType = "Footer";
                    title = "Footer Area";
                }
                else if (block.Contains("service", StringComparison.OrdinalIgnoreCase))
                {
                    catKey = "bodysections";
                    subType = "Services";
                    title = "Services Section";
                }
                else if (block.Contains("pricing", StringComparison.OrdinalIgnoreCase))
                {
                    catKey = "bodysections";
                    subType = "Pricing";
                    title = "Pricing Section";
                }
                else if (block.Contains("contact", StringComparison.OrdinalIgnoreCase))
                {
                    catKey = "contactus";
                    subType = "Contact";
                    title = "Contact Section";
                }

                var classMatch = Regex.Match(block, @"class=[""']([^""']+)[""']");
                var containerClass = classMatch.Success ? classMatch.Groups[1].Value.Split(' ')[0] : string.Empty;

                sections.Add(new SlicedSectionDto
                {
                    SectionKey = $"{variantSlug}_{catKey}_{i + 1:D2}",
                    CategoryKey = catKey,
                    SectionSubType = subType,
                    Title = title,
                    ContainerClass = containerClass,
                    HtmlMarkup = block,
                    SortOrder = i + 1
                });
            }

            return sections;
        }

        #endregion
    }
}
