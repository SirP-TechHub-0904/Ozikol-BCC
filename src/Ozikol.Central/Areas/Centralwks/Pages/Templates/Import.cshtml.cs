using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Ozikol.Central.Services;
using Ozikol.Central.Services.Extraction;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;
using Ozikol_BCC.Application.Dtos.Sections;
using Ozikol_BCC.Application.Interfaces.Services;

namespace Ozikol.Central.Areas.Centralwks.Pages.Templates
{
    /// <summary>
    /// Unified Page Model for the 3-Tab Template &amp; Modular Section Ingestion Studio.
    /// Orchestrates ingestion via File (.html) / Paste, Live Website URL crawler, and Vision Screenshot Mockup,
    /// directly leveraging <see cref="ISectionCustomCodeExtractorService"/>, <see cref="ITemplateAssetBundlePipelineService"/>,
    /// <see cref="ISectionLibraryResolverService"/>, and <see cref="ITemplateImageOptimizationService"/>.
    /// Automatically persists extracted sections to <see cref="MasterMarketplaceDraftSection"/> for multi-turn AI refinements.
    /// </summary>
    public class ImportModel : PageModel
    {
        private readonly ISectionCustomCodeExtractorService _customCodeExtractor;
        private readonly ITemplateAssetBundlePipelineService _assetBundlePipeline;
        private readonly ISectionLibraryResolverService _libraryResolver;
        private readonly ITemplateImageOptimizationService _imageOptimizer;
        private readonly INativeSectionExtractorService _nativeExtractor;
        private readonly ISectionAiStudioService _aiStudioService;
        private readonly MasterCatalogDbContext _masterDb;
        private readonly ILogger<ImportModel> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="ImportModel"/> class.
        /// </summary>
        public ImportModel(
            ISectionCustomCodeExtractorService customCodeExtractor,
            ITemplateAssetBundlePipelineService assetBundlePipeline,
            ISectionLibraryResolverService libraryResolver,
            ITemplateImageOptimizationService imageOptimizer,
            INativeSectionExtractorService nativeExtractor,
            ISectionAiStudioService aiStudioService,
            MasterCatalogDbContext masterDb,
            ILogger<ImportModel> logger)
        {
            _customCodeExtractor = customCodeExtractor ?? throw new ArgumentNullException(nameof(customCodeExtractor));
            _assetBundlePipeline = assetBundlePipeline ?? throw new ArgumentNullException(nameof(assetBundlePipeline));
            _libraryResolver = libraryResolver ?? throw new ArgumentNullException(nameof(libraryResolver));
            _imageOptimizer = imageOptimizer ?? throw new ArgumentNullException(nameof(imageOptimizer));
            _nativeExtractor = nativeExtractor ?? throw new ArgumentNullException(nameof(nativeExtractor));
            _aiStudioService = aiStudioService ?? throw new ArgumentNullException(nameof(aiStudioService));
            _masterDb = masterDb ?? throw new ArgumentNullException(nameof(masterDb));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        #region View State Properties

        /// <summary>
        /// Gets or sets the target suite or theme family name being created/imported.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string SuiteName { get; set; } = "Pasted Suite";

        /// <summary>
        /// Gets or sets the target brand name for debranding and canonical tokenization.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string BrandName { get; set; } = "Enterprise Workspace";

        /// <summary>
        /// Gets or sets the active studio step (1: Input Channels, 2: Section Workbench, 3: Live Preview &amp; Publish).
        /// </summary>
        public int CurrentStep { get; set; } = 1;

        /// <summary>
        /// Gets or sets the serialized extraction result package JSON for client-side rendering.
        /// </summary>
        public string? ExtractionResultJson { get; set; }

        /// <summary>
        /// Gets or sets the list of active categories available in the marketplace.
        /// </summary>
        public List<MasterMarketplaceCategory> AvailableCategories { get; set; } = new();

        /// <summary>
        /// Gets or sets the list of current draft staging sections.
        /// </summary>
        public List<MasterMarketplaceDraftSection> StagedDraftSections { get; set; } = new();

        /// <summary>
        /// Gets or sets the error message if ingestion fails.
        /// </summary>
        public string? ErrorMessage { get; set; }

        /// <summary>
        /// Gets or sets the success notification message.
        /// </summary>
        public string? SuccessMessage { get; set; }

        #endregion

        /// <summary>
        /// Handles HTTP GET requests to initialize the Template Ingestion Studio.
        /// </summary>
        /// <param name="suiteName">Optional initial suite name.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>The Razor Page result.</returns>
        public async Task<IActionResult> OnGetAsync(string? suiteName = null, CancellationToken cancellationToken = default)
        {
            if (!string.IsNullOrWhiteSpace(suiteName))
            {
                SuiteName = suiteName.Trim();
            }

            try
            {
                AvailableCategories = await _masterDb.MasterMarketplaceCategories
                    .Where(c => c.IsActive)
                    .OrderBy(c => c.SortOrder)
                    .ToListAsync(cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to load marketplace categories.");
                AvailableCategories = new List<MasterMarketplaceCategory>();
            }

            try
            {
                StagedDraftSections = await _masterDb.MasterMarketplaceDraftSections
                    .Where(d => d.Status != "Published")
                    .OrderByDescending(d => d.CreatedUtc)
                    .Take(50)
                    .ToListAsync(cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to load staged draft sections from MasterMarketplaceDraftSections.");
                StagedDraftSections = new List<MasterMarketplaceDraftSection>();
            }

            return Page();
        }

        #region Tab 1: Upload / Paste HTML Handler

        /// <summary>
        /// Ingests raw HTML markup via uploaded .html file or pasted textarea content, decomposes into modular sections,
        /// and applies <see cref="ISectionCustomCodeExtractorService"/> for canonical tokenization and scoped CSS.
        /// Persists extracted components to <see cref="MasterMarketplaceDraftSection"/> database staging table.
        /// </summary>
        /// <param name="htmlFile">Optional uploaded HTML file.</param>
        /// <param name="pastedHtml">Optional pasted HTML string.</param>
        /// <param name="customCss">Optional custom author CSS.</param>
        /// <param name="suiteName">Theme suite display name.</param>
        /// <param name="brandName">Brand name for debranding.</param>
        /// <param name="baseUrl">Optional base URL for resolving relative assets and stylesheets.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>JSON result or re-rendered page with extracted sections.</returns>
        public async Task<IActionResult> OnPostUploadHtmlAsync(
            IFormFile? htmlFile,
            string? pastedHtml,
            string? customCss,
            string? suiteName,
            string? brandName,
            string? baseUrl,
            CancellationToken cancellationToken = default)
        {
            try
            {
                string rawHtml = string.Empty;

                if (htmlFile != null && htmlFile.Length > 0)
                {
                    using var reader = new StreamReader(htmlFile.OpenReadStream());
                    rawHtml = await reader.ReadToEndAsync(cancellationToken);
                }
                else if (!string.IsNullOrWhiteSpace(pastedHtml))
                {
                    rawHtml = pastedHtml.Trim();
                }

                if (string.IsNullOrWhiteSpace(rawHtml))
                {
                    return new JsonResult(new { success = false, message = "Please provide an HTML file or paste raw HTML markup." });
                }

                var cleanSuite = string.IsNullOrWhiteSpace(suiteName) ? "Imported Suite" : suiteName.Trim();
                var cleanBrand = string.IsNullOrWhiteSpace(brandName) ? "Enterprise Workspace" : brandName.Trim();
                var cleanBaseUrl = string.IsNullOrWhiteSpace(baseUrl) ? null : baseUrl.Trim();

                Console.WriteLine();
                var totalSw = Stopwatch.StartNew();
                var stepSw = Stopwatch.StartNew();

                Console.ForegroundColor = ConsoleColor.Cyan;
                Console.WriteLine($"\n[{DateTime.Now:HH:mm:ss.fff}] ╔═══════════════════════════════════════════════════════════════════════════════╗");
                Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] ║ [TEMPLATE INGESTION STUDIO] Ingesting HTML for Suite: '{cleanSuite}'".PadRight(79) + "║");
                Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] ║ Base URL: {cleanBaseUrl ?? "(none)"} | Brand: {cleanBrand} | Size: {rawHtml.Length} chars".PadRight(79) + "║");
                Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] ╚═══════════════════════════════════════════════════════════════════════════════╝");
                Console.ResetColor();

                _logger.LogInformation("Processing HTML Ingestion for Suite: '{Suite}' ({Length} chars, BaseUrl: '{BaseUrl}')...", cleanSuite, rawHtml.Length, cleanBaseUrl ?? "none");

                // 1. Slice sections with native extractor
                Console.ForegroundColor = ConsoleColor.Yellow;
                Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] ⏱️ Step 1 & 2: Slicing DOM sections with INativeSectionExtractorService...");
                Console.ResetColor();

                stepSw.Restart();
                var extraction = await _nativeExtractor.ExtractSectionsFromSourceAsync(
                    rawHtml,
                    baseUrl: cleanBaseUrl,
                    suiteName: cleanSuite,
                    brandName: cleanBrand,
                    customCss: customCss,
                    cancellationToken: cancellationToken);
                stepSw.Stop();

                if (extraction == null || extraction.Sections.Count == 0)
                {
                    Console.ForegroundColor = ConsoleColor.Red;
                    Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] ❌ Ingestion Error: No valid modular sections detected ({stepSw.ElapsedMilliseconds}ms).");
                    Console.ResetColor();
                    return new JsonResult(new { success = false, message = "No valid modular sections could be detected in the provided HTML markup." });
                }

                Console.ForegroundColor = ConsoleColor.Green;
                Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] ✔ Slicing Completed in {stepSw.ElapsedMilliseconds}ms: {extraction.Sections.Count} sections discovered:");
                foreach (var sec in extraction.Sections)
                {
                    Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}]    • [{sec.CategoryKey}] '{sec.Name}' (Variant: {sec.VariantCode})");
                }
                Console.ResetColor();

                // 2. Detect global vendor CDN requirements
                stepSw.Restart();
                var detectedLibs = _libraryResolver.DetectLibraries(rawHtml);
                stepSw.Stop();
                Console.ForegroundColor = ConsoleColor.Yellow;
                Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] ▶ Detected Vendor CDN Libraries ({detectedLibs.Count}) in {stepSw.ElapsedMilliseconds}ms: {string.Join(", ", detectedLibs)}");
                Console.ResetColor();

                // 3. For each extracted section, execute canonical tokenization and image optimization
                Console.ForegroundColor = ConsoleColor.Yellow;
                Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] ▶ Step 3 & 4: Cleaning custom code, Mustache tokenizing, and migrating images for {extraction.Sections.Count} sections...");
                Console.ResetColor();

                int sectionIndex = 1;
                foreach (var section in extraction.Sections)
                {
                    var secTimer = Stopwatch.StartNew();
                    try
                    {
                        Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] ⏱️ Processing Section [{sectionIndex}/{extraction.Sections.Count}] '{section.VariantCode}' ({section.CategoryKey})...");

                        var imgSw = Stopwatch.StartNew();
                        var optHtml = await _imageOptimizer.ProcessAndReplaceImagesInHtmlAsync(
                            section.HtmlTemplate, 
                            baseDomainUrl: cleanBaseUrl, 
                            categoryOrContext: section.CategoryKey, 
                            cancellationToken: cancellationToken);
                        imgSw.Stop();
                        section.HtmlTemplate = optHtml;

                        Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}]    • Images optimized / migrated in {imgSw.ElapsedMilliseconds}ms");

                        var containerClass = ResolveAuthenticContainerClass(section.HtmlTemplate);

                        var tokenReq = new SectionCustomCodeExtractionRequestDto
                        {
                            SectionKey = section.VariantCode,
                            ContainerClass = containerClass,
                            CategoryKey = section.CategoryKey,
                            HtmlMarkup = section.HtmlTemplate,
                            RawCustomCss = string.IsNullOrWhiteSpace(section.ScopedCss) ? customCss : section.ScopedCss,
                            RawCustomJs = section.JsScript
                        };

                        var codeResult = await _customCodeExtractor.ExtractAndIsolateAsync(tokenReq, cancellationToken);
                        secTimer.Stop();

                        if (codeResult != null && codeResult.Success)
                        {
                            section.HtmlTemplate = codeResult.HtmlTemplate;
                            section.ScopedCss = codeResult.ScopedCss;
                            section.JsScript = codeResult.JsScript;
                            section.SampleContentJson = !string.IsNullOrWhiteSpace(codeResult.ExtractedContentJson) && codeResult.ExtractedContentJson.Trim() != "{}"
                                ? codeResult.ExtractedContentJson
                                : (!string.IsNullOrWhiteSpace(section.SampleContentJson) && section.SampleContentJson.Trim() != "{}" ? section.SampleContentJson : "{}");

                            Console.ForegroundColor = ConsoleColor.Green;
                            Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}]    ✔ [{section.VariantCode}] Processed in {secTimer.ElapsedMilliseconds}ms | Mock Data: {section.SampleContentJson?.Length ?? 0} chars | Scoped CSS: {codeResult.ScopedCss?.Length ?? 0} chars");
                            Console.ResetColor();
                        }
                    }
                    catch (Exception secEx)
                    {
                        secTimer.Stop();
                        Console.ForegroundColor = ConsoleColor.Red;
                        Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}]    ⚠ Warning for section [{section.VariantCode}] after {secTimer.ElapsedMilliseconds}ms: {secEx.Message}");
                        Console.ResetColor();
                        _logger.LogWarning(secEx, "Custom code extraction warning for section {Code}", section.VariantCode);
                    }
                    sectionIndex++;
                }

                // 4. Persist to MasterMarketplaceDraftSections database staging table
                Console.ForegroundColor = ConsoleColor.Yellow;
                Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] ▶ Step 5: Staging {extraction.Sections.Count} sections into MasterMarketplaceDraftSections database table...");
                Console.ResetColor();

                stepSw.Restart();
                await PersistDraftSectionsAsync(extraction, cleanSuite, "HtmlFile", detectedLibs, cancellationToken);
                stepSw.Stop();
                totalSw.Stop();

                Console.ForegroundColor = ConsoleColor.Green;
                Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] ✔ Staging Complete in {stepSw.ElapsedMilliseconds}ms! {extraction.Sections.Count} sections ready in Workbench.");
                Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] 🏁 Total Ingestion Pipeline Duration: {totalSw.ElapsedMilliseconds / 1000.0:F2}s");
                Console.WriteLine("═══════════════════════════════════════════════════════════════════════════════\n");
                Console.ResetColor();

                return new JsonResult(new
                {
                    success = true,
                    data = extraction,
                    libraries = detectedLibs,
                    message = $"Successfully extracted and staged {extraction.Sections.Count} modular sections in the database."
                });
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"❌ Ingestion Error: {ex.Message}");
                Console.ResetColor();
                _logger.LogError(ex, "Error processing HTML ingestion in Template Studio.");
                var errorMsg = ex.InnerException != null ? $"{ex.Message} -> {ex.InnerException.Message}" : ex.Message;
                return new JsonResult(new { success = false, message = $"HTML Ingestion failed: {errorMsg}" });
            }
        }

        #endregion

        #region Tab 2: Live Website URL Crawler Handler

        /// <summary>
        /// Crawls a live demo website URL, resolves relative CSS and JS assets, bundles styles,
        /// detects vendor dependencies, and performs canonical section extraction using the 4 core services.
        /// Persists extracted components to <see cref="MasterMarketplaceDraftSection"/> database staging table.
        /// </summary>
        /// <param name="targetUrl">Live website URL to crawl.</param>
        /// <param name="suiteName">Theme suite display name.</param>
        /// <param name="brandName">Brand name for debranding.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>JSON result containing extracted modular sections and resolved CDN assets.</returns>
        public async Task<IActionResult> OnPostCrawlUrlAsync(
            string targetUrl,
            string? suiteName,
            string? brandName,
            CancellationToken cancellationToken = default)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(targetUrl) || !Uri.TryCreate(targetUrl.Trim(), UriKind.Absolute, out var validatedUri))
                {
                    return new JsonResult(new { success = false, message = "Please enter a valid absolute website URL (e.g. https://agency.com)." });
                }

                var cleanSuite = string.IsNullOrWhiteSpace(suiteName) ? validatedUri.Host.Replace(".", " ") : suiteName.Trim();
                var cleanBrand = string.IsNullOrWhiteSpace(brandName) ? "Enterprise Workspace" : brandName.Trim();

                Console.WriteLine();
                Console.ForegroundColor = ConsoleColor.Cyan;
                Console.WriteLine("╔═══════════════════════════════════════════════════════════════════════════════╗");
                Console.WriteLine($"║ [TEMPLATE INGESTION STUDIO] Crawling Live Demo URL: '{validatedUri}'".PadRight(79) + "║");
                Console.WriteLine($"║ Suite: '{cleanSuite}' | Brand: '{cleanBrand}'".PadRight(79) + "║");
                Console.WriteLine("╚═══════════════════════════════════════════════════════════════════════════════╝");
                Console.ResetColor();

                _logger.LogInformation("Starting Remote Website Crawl for URL: {Url} (Suite: '{Suite}')", validatedUri, cleanSuite);

                // 1. Ingest via Template Asset Bundle Pipeline
                Console.ForegroundColor = ConsoleColor.Yellow;
                Console.WriteLine("▶ Step 1: Executing TemplateAssetBundlePipelineService to download HTML, resolve CSS/JS, and map CDNs...");
                Console.ResetColor();

                var pipelineReq = new TemplateRemoteAssetPipelineRequestDto
                {
                    DemoUrl = validatedUri.ToString(),
                    AutoSliceSections = true
                };

                var pipelineResp = await _assetBundlePipeline.ProcessRemoteTemplateAsync(pipelineReq, cancellationToken);
                if (!pipelineResp.Success)
                {
                    Console.ForegroundColor = ConsoleColor.Red;
                    Console.WriteLine($"❌ Pipeline Error: {pipelineResp.Message}");
                    Console.ResetColor();
                    return new JsonResult(new { success = false, message = pipelineResp.Message ?? "Failed to crawl target URL." });
                }

                Console.ForegroundColor = ConsoleColor.Green;
                Console.WriteLine($"✔ Asset Bundle Complete! Merged CSS: {pipelineResp.RawMergedCustomCss?.Length ?? 0} chars | Merged JS: {pipelineResp.RawMergedCustomJs?.Length ?? 0} chars");
                Console.ResetColor();

                // 2. Perform native section extraction with resolved CSS bundle
                Console.ForegroundColor = ConsoleColor.Yellow;
                Console.WriteLine("▶ Step 2: Slicing modular sections from crawled HTML...");
                Console.ResetColor();

                var extraction = await _nativeExtractor.ExtractSectionsFromSourceAsync(
                    pipelineResp.RawMergedCustomCss,
                    baseUrl: validatedUri.ToString(),
                    suiteName: cleanSuite,
                    brandName: cleanBrand,
                    customCss: pipelineResp.RawMergedCustomCss,
                    cancellationToken: cancellationToken);

                Console.ForegroundColor = ConsoleColor.Green;
                Console.WriteLine($"✔ Discovered {extraction.Sections.Count} sections from live page.");
                Console.ResetColor();

                // 3. Run SectionCustomCodeExtractorService on each section
                Console.ForegroundColor = ConsoleColor.Yellow;
                Console.WriteLine("▶ Step 3 & 4: Isolating custom styles and tokenizing Mustache placeholders...");
                Console.ResetColor();

                foreach (var section in extraction.Sections)
                {
                    try
                    {
                        var optHtml = await _imageOptimizer.ProcessAndReplaceImagesInHtmlAsync(
                            section.HtmlTemplate, 
                            baseDomainUrl: validatedUri.ToString(), 
                            categoryOrContext: section.CategoryKey, 
                            cancellationToken: cancellationToken);
                        section.HtmlTemplate = optHtml;

                        var containerClass = ResolveAuthenticContainerClass(section.HtmlTemplate);

                        var tokenReq = new SectionCustomCodeExtractionRequestDto
                        {
                            SectionKey = section.VariantCode,
                            ContainerClass = containerClass,
                            CategoryKey = section.CategoryKey,
                            HtmlMarkup = section.HtmlTemplate,
                            RawCustomCss = string.IsNullOrWhiteSpace(section.ScopedCss) ? pipelineResp.RawMergedCustomCss : section.ScopedCss,
                            CustomCssUrl = pipelineResp.CompiledCustomCssUrl,
                            RawCustomJs = section.JsScript
                        };

                        var codeResult = await _customCodeExtractor.ExtractAndIsolateAsync(tokenReq, cancellationToken);
                        if (codeResult != null && codeResult.Success)
                        {
                            section.HtmlTemplate = codeResult.HtmlTemplate;
                            section.ScopedCss = codeResult.ScopedCss;
                            section.JsScript = codeResult.JsScript;
                            section.SampleContentJson = !string.IsNullOrWhiteSpace(codeResult.ExtractedContentJson) && codeResult.ExtractedContentJson.Trim() != "{}"
                                ? codeResult.ExtractedContentJson
                                : (!string.IsNullOrWhiteSpace(section.SampleContentJson) && section.SampleContentJson.Trim() != "{}" ? section.SampleContentJson : "{}");

                            Console.ForegroundColor = ConsoleColor.Green;
                            Console.WriteLine($"   ✔ [{section.VariantCode}] Processed | Mock Data: {section.SampleContentJson?.Length ?? 0} chars | Scoped CSS: {codeResult.ScopedCss?.Length ?? 0} chars");
                            Console.ResetColor();
                        }
                    }
                    catch (Exception secEx)
                    {
                        Console.ForegroundColor = ConsoleColor.Red;
                        Console.WriteLine($"   ⚠ Warning for section [{section.VariantCode}]: {secEx.Message}");
                        Console.ResetColor();
                        _logger.LogWarning(secEx, "Warning tokenizing live URL section {Code}", section.VariantCode);
                    }
                }

                // 4. Persist to MasterMarketplaceDraftSections database staging table
                Console.ForegroundColor = ConsoleColor.Yellow;
                Console.WriteLine("▶ Step 5: Staging live URL sections into MasterMarketplaceDraftSections database table...");
                Console.ResetColor();

                var detectedLibs = _libraryResolver.DetectLibraries(pipelineResp.RawMergedCustomCss);
                await PersistDraftSectionsAsync(extraction, cleanSuite, "LiveUrl", detectedLibs, cancellationToken);

                Console.ForegroundColor = ConsoleColor.Green;
                Console.WriteLine($"✔ Staging Complete! {extraction.Sections.Count} sections ready in Workbench.");
                Console.WriteLine("═══════════════════════════════════════════════════════════════════════════════\n");
                Console.ResetColor();

                return new JsonResult(new
                {
                    success = true,
                    data = extraction,
                    pipeline = pipelineResp,
                    message = $"Successfully crawled {validatedUri.Host}, extracted {extraction.Sections.Count} sections, and staged in database."
                });
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"❌ Live URL Ingestion Error: {ex.Message}");
                Console.ResetColor();
                _logger.LogError(ex, "Error crawling live URL in Template Studio.");
                return new JsonResult(new { success = false, message = $"Live URL crawl failed: {ex.Message}" });
            }
        }

        #endregion

        #region Tab 3: UI Screenshot Mockup (Vision AI) Handler

        /// <summary>
        /// Analyzes an uploaded UI screenshot or Figma mockup image using Multimodal Vision AI,
        /// generates semantic HTML and scoped CSS, and tokenizes canonical placeholders using <see cref="ISectionCustomCodeExtractorService"/>.
        /// Persists extracted components to <see cref="MasterMarketplaceDraftSection"/> database staging table.
        /// </summary>
        /// <param name="screenshotFile">The uploaded mockup image.</param>
        /// <param name="suiteName">Theme suite display name.</param>
        /// <param name="brandName">Brand name for debranding.</param>
        /// <param name="provider">AI provider (defaults to "Gemini").</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>JSON result containing the AI-generated modular sections.</returns>
        public async Task<IActionResult> OnPostVisionScreenshotAsync(
            IFormFile? screenshotFile,
            string? suiteName,
            string? brandName,
            string provider = "Gemini",
            CancellationToken cancellationToken = default)
        {
            try
            {
                if (screenshotFile == null || screenshotFile.Length == 0)
                {
                    return new JsonResult(new { success = false, message = "Please select a UI screenshot image file (PNG, JPG, WebP)." });
                }

                var cleanSuite = string.IsNullOrWhiteSpace(suiteName) ? "Visual Mockup Suite" : suiteName.Trim();
                var cleanBrand = string.IsNullOrWhiteSpace(brandName) ? "Enterprise Workspace" : brandName.Trim();

                using var ms = new MemoryStream();
                await screenshotFile.CopyToAsync(ms, cancellationToken);
                var imageBytes = ms.ToArray();
                var mimeType = screenshotFile.ContentType;

                _logger.LogInformation("Executing Multimodal Vision AI decomposition for suite: '{Suite}'...", cleanSuite);

                // 1. Decompose screenshot into modular sections
                var extraction = await _aiStudioService.DecomposeImageToSectionsAsync(
                    screenshotFile,
                    suiteName: cleanSuite,
                    brandName: cleanBrand,
                    provider: provider,
                    cancellationToken: cancellationToken);

                if (extraction == null || extraction.Sections.Count == 0)
                {
                    return new JsonResult(new { success = false, message = "Vision AI was unable to generate sections from this screenshot." });
                }

                // 2. Refine each section with SectionCustomCodeExtractorService
                foreach (var section in extraction.Sections)
                {
                    try
                    {
                        var containerClass = ResolveAuthenticContainerClass(section.HtmlTemplate);

                        var tokenReq = new SectionCustomCodeExtractionRequestDto
                        {
                            SectionKey = section.VariantCode,
                            ContainerClass = containerClass,
                            CategoryKey = section.CategoryKey,
                            HtmlMarkup = section.HtmlTemplate,
                            RawCustomCss = section.ScopedCss,
                            RawCustomJs = section.JsScript
                        };

                        var codeResult = await _customCodeExtractor.ExtractAndIsolateAsync(tokenReq, cancellationToken);
                        if (codeResult != null && codeResult.Success)
                        {
                            section.HtmlTemplate = codeResult.HtmlTemplate;
                            section.ScopedCss = codeResult.ScopedCss;
                            section.JsScript = codeResult.JsScript;
                            section.SampleContentJson = !string.IsNullOrWhiteSpace(codeResult.ExtractedContentJson) && codeResult.ExtractedContentJson.Trim() != "{}"
                                ? codeResult.ExtractedContentJson
                                : (!string.IsNullOrWhiteSpace(section.SampleContentJson) && section.SampleContentJson.Trim() != "{}" ? section.SampleContentJson : "{}");
                        }
                    }
                    catch (Exception secEx)
                    {
                        _logger.LogWarning(secEx, "Warning tokenizing vision section {Code}", section.VariantCode);
                    }
                }

                // 3. Persist to MasterMarketplaceDraftSections database staging table
                await PersistDraftSectionsAsync(extraction, cleanSuite, "VisionAi", new List<string> { "bootstrap", "fontawesome" }, cancellationToken);

                return new JsonResult(new
                {
                    success = true,
                    data = extraction,
                    message = $"Vision AI successfully synthesized {extraction.Sections.Count} modular sections and staged in database."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing UI screenshot in Template Studio.");
                return new JsonResult(new { success = false, message = $"Screenshot processing failed: {ex.Message}" });
            }
        }

        #endregion

        #region Single Section AI Clean / Refine Handler

        /// <summary>
        /// Executes a full 4-pillar clean or natural-language prompt refinement on a staging draft section using AI.
        /// Directly updates the persisted row in <see cref="MasterMarketplaceDraftSection"/>.
        /// </summary>
        /// <param name="request">The clean request payload.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>Cleaned section DTO with database ID.</returns>
        public async Task<IActionResult> OnPostCleanSectionWithAiAsync(
            [FromBody] SectionAiFullCleanRequestDto request,
            CancellationToken cancellationToken = default)
        {
            try
            {
                if (request == null || string.IsNullOrWhiteSpace(request.HtmlTemplate))
                {
                    return new JsonResult(new { success = false, message = "Section HTML markup is required." });
                }

                MasterMarketplaceDraftSection? draft = null;
                if (Guid.TryParse(request.Id, out var draftGuid) && draftGuid != Guid.Empty)
                {
                    draft = await _masterDb.MasterMarketplaceDraftSections
                        .FirstOrDefaultAsync(d => d.Id == draftGuid, cancellationToken);
                }

                var containerClass = string.IsNullOrWhiteSpace(request.ContainerClass)
                    ? ResolveAuthenticContainerClass(request.HtmlTemplate)
                    : request.ContainerClass.TrimStart('.');

                string finalHtml = request.HtmlTemplate;
                string finalCss = request.RawCss ?? string.Empty;
                string? finalJs = request.RawJs;
                string? finalTokens = draft?.SampleContentJson;
                string explanation = "Section refined and persisted to staging database.";

                // 1. If user provided a conversational refinement prompt, execute AI Tweak first
                if (!string.IsNullOrWhiteSpace(request.UserPrompt))
                {
                    var tweakReq = new SectionAiTweakRequestDto
                    {
                        HtmlTemplate = request.HtmlTemplate,
                        ScopedCss = request.RawCss,
                        UserPrompt = request.UserPrompt,
                        Provider = request.Provider ?? "Gemini"
                    };

                    var tweakResult = await _aiStudioService.TweakSectionAsync(tweakReq, cancellationToken);
                    if (tweakResult != null && tweakResult.Success)
                    {
                        finalHtml = tweakResult.HtmlTemplate;
                        finalCss = tweakResult.ScopedCss;
                        explanation = tweakResult.Explanation ?? "Refined section based on user prompt.";
                    }
                }

                // 2. Extract and standardize tokens with custom code extractor
                var extractReq = new SectionCustomCodeExtractionRequestDto
                {
                    SectionKey = request.Title ?? draft?.VariantCode ?? "section",
                    ContainerClass = containerClass,
                    CategoryKey = request.CategoryKey ?? draft?.CategoryKey ?? "bodysections",
                    HtmlMarkup = finalHtml,
                    RawCustomCss = finalCss,
                    RawCustomJs = finalJs ?? draft?.JsScript
                };

                var result = await _customCodeExtractor.ExtractAndIsolateAsync(extractReq, cancellationToken);

                if (result != null && result.Success)
                {
                    finalHtml = result.HtmlTemplate;
                    finalCss = result.ScopedCss;
                    finalJs = result.JsScript;
                    finalTokens = result.ExtractedContentJson;
                }
                else if (string.IsNullOrWhiteSpace(request.UserPrompt))
                {
                    var studioResult = await _aiStudioService.CleanAndIsolateFullSectionWithAiAsync(request, cancellationToken);
                    if (studioResult != null && studioResult.Success)
                    {
                        finalHtml = studioResult.HtmlTemplate;
                        finalCss = studioResult.ScopedCss;
                        finalJs = studioResult.JsScript;
                        finalTokens = studioResult.SampleContentJson;
                        explanation = studioResult.Explanation ?? explanation;
                    }
                }

                // Update database staging record
                if (draft != null)
                {
                    draft.HtmlTemplate = finalHtml;
                    draft.ScopedCss = finalCss;
                    draft.JsScript = finalJs;
                    draft.SampleContentJson = finalTokens;
                    draft.Status = "RefinedByAi";
                    draft.UpdatedUtc = DateTime.UtcNow;
                    await _masterDb.SaveChangesAsync(cancellationToken);
                }

                return new JsonResult(new
                {
                    success = true,
                    id = draft?.Id.ToString() ?? request.Id,
                    html_template = finalHtml,
                    scoped_css = finalCss,
                    js_script = finalJs,
                    sample_content_json = finalTokens,
                    status = draft?.Status ?? "RefinedByAi",
                    explanation = "Section refined and persisted to staging database."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error cleaning section with AI.");
                return new JsonResult(new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Updates an existing draft staging section directly in the database.
        /// </summary>
        /// <param name="request">Update draft payload.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>Result containing updated draft.</returns>
        public async Task<IActionResult> OnPostUpdateDraftSectionAsync(
            [FromBody] UpdateDraftSectionRequestDto request,
            CancellationToken cancellationToken = default)
        {
            try
            {
                if (request == null || request.Id == Guid.Empty)
                {
                    return new JsonResult(new { success = false, message = "Draft Section ID is required." });
                }

                var draft = await _masterDb.MasterMarketplaceDraftSections
                    .FirstOrDefaultAsync(d => d.Id == request.Id, cancellationToken);

                if (draft == null)
                {
                    return new JsonResult(new { success = false, message = "Draft section not found in database." });
                }

                if (!string.IsNullOrWhiteSpace(request.Name)) draft.Name = request.Name;
                if (!string.IsNullOrWhiteSpace(request.CategoryKey)) draft.CategoryKey = request.CategoryKey;
                if (!string.IsNullOrWhiteSpace(request.HtmlTemplate)) draft.HtmlTemplate = request.HtmlTemplate;
                if (request.ScopedCss != null) draft.ScopedCss = request.ScopedCss;
                if (request.JsScript != null) draft.JsScript = request.JsScript;
                if (request.SampleContentJson != null) draft.SampleContentJson = request.SampleContentJson;
                if (request.RequiredLibrariesJson != null) draft.RequiredLibrariesJson = request.RequiredLibrariesJson;
                if (request.RequiredCssLibrariesJson != null) draft.RequiredCssLibrariesJson = request.RequiredCssLibrariesJson;
                if (request.RequiredJsLibrariesJson != null) draft.RequiredJsLibrariesJson = request.RequiredJsLibrariesJson;
                if (request.Description != null) draft.Description = request.Description;

                draft.UpdatedUtc = DateTime.UtcNow;
                await _masterDb.SaveChangesAsync(cancellationToken);

                return new JsonResult(new
                {
                    success = true,
                    data = draft,
                    message = $"Draft '{draft.Name}' updated successfully in staging database."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating draft section in database.");
                return new JsonResult(new { success = false, message = ex.Message });
            }
        }

        #endregion

        #region Marketplace Publishing Handlers

        /// <summary>
        /// Publishes an individual modular section directly from the staging table to the Master Marketplace Catalog.
        /// </summary>
        /// <param name="request">The section publishing payload.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>Result of the publishing operation.</returns>
        public async Task<IActionResult> OnPostPublishSectionAsync(
            [FromBody] PublishSectionRequestDto request,
            CancellationToken cancellationToken = default)
        {
            try
            {
                if (request == null || string.IsNullOrWhiteSpace(request.HtmlTemplate))
                {
                    return new JsonResult(new { success = false, message = "Section HTML template cannot be empty." });
                }

                // Find or resolve category
                var category = await _masterDb.MasterMarketplaceCategories
                    .FirstOrDefaultAsync(c => c.CategoryKey.ToLower() == request.CategoryKey.ToLower(), cancellationToken);

                if (category == null)
                {
                    category = await _masterDb.MasterMarketplaceCategories.FirstOrDefaultAsync(cancellationToken);
                    if (category == null)
                    {
                        return new JsonResult(new { success = false, message = "No marketplace category found in database." });
                    }
                }

                var cleanVariantCode = string.IsNullOrWhiteSpace(request.VariantCode)
                    ? $"sec_{DateTime.UtcNow.Ticks}"
                    : request.VariantCode.Trim();

                // Check for existing template with this variant code
                var existing = await _masterDb.MasterMarketplaceTemplates
                    .FirstOrDefaultAsync(t => t.VariantCode == cleanVariantCode, cancellationToken);

                if (existing != null)
                {
                    existing.Name = request.Name ?? existing.Name;
                    existing.HtmlTemplate = request.HtmlTemplate;
                    existing.CssStyles = request.CssStyles ?? string.Empty;
                    existing.JsScript = request.JsScript;
                    existing.DefaultSectionListsJson = request.DefaultSectionListsJson;
                    existing.Description = request.Description;
                    existing.Badge = request.Badge;
                    existing.UpdatedUtc = DateTime.UtcNow;
                }
                else
                {
                    var newTemplate = new MasterMarketplaceTemplate
                    {
                        Id = Guid.NewGuid(),
                        CategoryId = category.Id,
                        CategoryKey = category.CategoryKey,
                        Name = request.Name ?? "Modular Section",
                        VariantCode = cleanVariantCode,
                        Tag = request.Tag ?? "modern",
                        Badge = request.Badge ?? "New",
                        Description = request.Description ?? "Ingested modular section",
                        HtmlTemplate = request.HtmlTemplate,
                        CssStyles = request.CssStyles ?? string.Empty,
                        JsScript = request.JsScript,
                        DefaultSectionListsJson = request.DefaultSectionListsJson,
                        IsActive = true,
                        CreatedUtc = DateTime.UtcNow
                    };

                    _masterDb.MasterMarketplaceTemplates.Add(newTemplate);
                }

                // Mark draft record as Published if available
                if (request.DraftId.HasValue)
                {
                    var draft = await _masterDb.MasterMarketplaceDraftSections
                        .FirstOrDefaultAsync(d => d.Id == request.DraftId.Value, cancellationToken);
                    if (draft != null)
                    {
                        draft.Status = "Published";
                        draft.UpdatedUtc = DateTime.UtcNow;
                    }
                }

                await _masterDb.SaveChangesAsync(cancellationToken);

                return new JsonResult(new
                {
                    success = true,
                    variantCode = cleanVariantCode,
                    message = $"Section '{request.Name}' successfully published to Marketplace!"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error publishing section to Master Marketplace.");
                return new JsonResult(new { success = false, message = $"Publishing failed: {ex.Message}" });
            }
        }

        /// <summary>
        /// Publishes all extracted sections in a theme suite to the Master Marketplace Catalog in a single batch.
        /// </summary>
        /// <param name="request">The batch suite publishing payload.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>Result of the batch publishing operation.</returns>
        public async Task<IActionResult> OnPostPublishAllSuiteSectionsAsync(
            [FromBody] PublishSuiteRequestDto request,
            CancellationToken cancellationToken = default)
        {
            try
            {
                if (request == null || request.Sections == null || request.Sections.Count == 0)
                {
                    return new JsonResult(new { success = false, message = "No sections provided for suite publishing." });
                }

                var categories = await _masterDb.MasterMarketplaceCategories.ToListAsync(cancellationToken);
                var defaultCat = categories.FirstOrDefault();

                int createdCount = 0;
                int updatedCount = 0;

                foreach (var sec in request.Sections)
                {
                    if (string.IsNullOrWhiteSpace(sec.HtmlTemplate)) continue;

                    var cat = categories.FirstOrDefault(c => string.Equals(c.CategoryKey, sec.CategoryKey, StringComparison.OrdinalIgnoreCase)) ?? defaultCat;
                    if (cat == null) continue;

                    var cleanVariant = string.IsNullOrWhiteSpace(sec.VariantCode) ? $"sec_{DateTime.UtcNow.Ticks}_{createdCount}" : sec.VariantCode.Trim();

                    var existing = await _masterDb.MasterMarketplaceTemplates
                        .FirstOrDefaultAsync(t => t.VariantCode == cleanVariant, cancellationToken);

                    if (existing != null)
                    {
                        existing.Name = sec.Name ?? existing.Name;
                        existing.HtmlTemplate = sec.HtmlTemplate;
                        existing.CssStyles = sec.CssStyles ?? string.Empty;
                        existing.JsScript = sec.JsScript;
                        existing.DefaultSectionListsJson = sec.DefaultSectionListsJson;
                        existing.Description = sec.Description;
                        existing.UpdatedUtc = DateTime.UtcNow;
                        updatedCount++;
                    }
                    else
                    {
                        var newTemplate = new MasterMarketplaceTemplate
                        {
                            Id = Guid.NewGuid(),
                            CategoryId = cat.Id,
                            CategoryKey = cat.CategoryKey,
                            Name = sec.Name ?? $"{request.SuiteName} Section",
                            VariantCode = cleanVariant,
                            Tag = "modern",
                            Badge = "New",
                            Description = sec.Description ?? $"Part of {request.SuiteName} suite",
                            HtmlTemplate = sec.HtmlTemplate,
                            CssStyles = sec.CssStyles ?? string.Empty,
                            JsScript = sec.JsScript,
                            DefaultSectionListsJson = sec.DefaultSectionListsJson,
                            IsActive = true,
                            CreatedUtc = DateTime.UtcNow
                        };

                        _masterDb.MasterMarketplaceTemplates.Add(newTemplate);
                        createdCount++;
                    }

                    if (sec.DraftId.HasValue)
                    {
                        var draft = await _masterDb.MasterMarketplaceDraftSections
                            .FirstOrDefaultAsync(d => d.Id == sec.DraftId.Value, cancellationToken);
                        if (draft != null)
                        {
                            draft.Status = "Published";
                            draft.UpdatedUtc = DateTime.UtcNow;
                        }
                    }
                }

                await _masterDb.SaveChangesAsync(cancellationToken);

                return new JsonResult(new
                {
                    success = true,
                    createdCount,
                    updatedCount,
                    message = $"Successfully published suite '{request.SuiteName}' ({createdCount} created, {updatedCount} updated) to Marketplace!"
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error publishing entire suite to Master Marketplace.");
                return new JsonResult(new { success = false, message = $"Suite publishing failed: {ex.Message}" });
            }
        }

        #endregion

        #region Private Staging Persistence Helpers

        /// <summary>
        /// Persists extracted modular sections to the <see cref="MasterMarketplaceDraftSection"/> staging table.
        /// </summary>
        private async Task PersistDraftSectionsAsync(
            SectionsBuilderResponseDto extraction,
            string suiteName,
            string sourceChannel,
            List<string>? detectedLibs,
            CancellationToken cancellationToken)
        {
            if (extraction == null || extraction.Sections == null || extraction.Sections.Count == 0) return;

            var suiteGuid = Guid.NewGuid();
            var libsJson = JsonSerializer.Serialize(detectedLibs ?? new List<string>());

            for (int i = 0; i < extraction.Sections.Count; i++)
            {
                var sec = extraction.Sections[i];
                var secLibs = sec.RequiredLibraries != null && sec.RequiredLibraries.Count > 0 ? sec.RequiredLibraries : (detectedLibs ?? new List<string>());
                var secCssLibs = sec.RequiredCssLibraries ?? new List<string>();
                var secJsLibs = sec.RequiredJsLibraries ?? new List<string>();

                var finalSampleJson = sec.SampleContentJson;
                if (string.IsNullOrWhiteSpace(finalSampleJson) || finalSampleJson.Trim() == "{}" || finalSampleJson.Trim() == "null" || finalSampleJson.Trim() == "[]")
                {
                    var isMenuSec = string.Equals(sec.CategoryKey, "menu", StringComparison.OrdinalIgnoreCase)
                        || (!string.IsNullOrWhiteSpace(sec.HtmlTemplate) && (sec.HtmlTemplate.Contains("<header", StringComparison.OrdinalIgnoreCase) || sec.HtmlTemplate.Contains("<nav", StringComparison.OrdinalIgnoreCase)));

                    if (isMenuSec)
                    {
                        finalSampleJson = JsonSerializer.Serialize(new
                        {
                            CompanyName = "Enterprise Workspace",
                            Brand = new
                            {
                                Name = "Enterprise Workspace",
                                LogoUrl = "https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=300",
                                WhiteLogoUrl = "https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=300",
                                FaviconUrl = "/favicon.ico",
                                WebsiteUrl = "/",
                                LoginButtonText = "Sign In"
                            },
                            ButtonText = "Let’s Talk",
                            ButtonLink = "/contact",
                            PageCategories = new object[]
                            {
                                new { Title = "Home", DirectUrl = "/", HasChildren = false, Pages = Array.Empty<object>() },
                                new { 
                                    Title = "Services", 
                                    DirectUrl = "/services", 
                                    HasChildren = true, 
                                    Pages = new object[]
                                    {
                                        new { PageTitle = "Web Solutions", PageUrl = "/services/web", PageDescription = "Custom high-performance web development." },
                                        new { PageTitle = "Cloud Infrastructure", PageUrl = "/services/cloud", PageDescription = "Scalable enterprise cloud architecture." }
                                    },
                                    Children = new object[]
                                    {
                                        new { 
                                            Title = "Digital Capabilities", 
                                            DirectUrl = "/services", 
                                            Pages = new object[]
                                            {
                                                new { PageTitle = "AI Automation", PageUrl = "/services/ai" },
                                                new { PageTitle = "Cyber Security", PageUrl = "/services/security" }
                                            } 
                                        }
                                    }
                                },
                                new { Title = "About Us", DirectUrl = "/about", HasChildren = false, Pages = Array.Empty<object>() },
                                new { Title = "Contact", DirectUrl = "/contact", HasChildren = false, Pages = Array.Empty<object>() }
                            }
                        }, new JsonSerializerOptions { WriteIndented = true });
                    }
                    else
                    {
                        finalSampleJson = JsonSerializer.Serialize(new Dictionary<string, object>(StringComparer.OrdinalIgnoreCase)
                        {
                            ["Title"] = "Dynamic Section Heading",
                            ["MiniTitle"] = "Featured Capability",
                            ["Description"] = "Empowering modern organizations with scalable digital solutions and seamless user experience.",
                            ["FullDescription"] = "<p>Empowering modern organizations with scalable digital solutions and seamless user experience.</p>",
                            ["ButtonText"] = "Get Started",
                            ["ButtonLink"] = "#",
                            ["SecondButtonText"] = "View Demo",
                            ["SecondButtonLink"] = "#",
                            ["ImageUrl"] = "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600",
                            ["IconText"] = "fa-solid fa-arrow-right",
                            ["SectionLists"] = new object[]
                            {
                                new { Title = "Innovative Strategy", MiniTitle = "01", Description = "End-to-end digital transformation.", ButtonText = "Learn More", ButtonLink = "#", ImageUrl = "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600", IconText = "fa-solid fa-star" },
                                new { Title = "Cloud Architecture", MiniTitle = "02", Description = "Scalable infrastructure and security.", ButtonText = "Learn More", ButtonLink = "#", ImageUrl = "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600", IconText = "fa-solid fa-cloud" },
                                new { Title = "AI Intelligence", MiniTitle = "03", Description = "Automated workflows and analytics.", ButtonText = "Learn More", ButtonLink = "#", ImageUrl = "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600", IconText = "fa-solid fa-brain" }
                            }
                        }, new JsonSerializerOptions { WriteIndented = true });
                    }
                    sec.SampleContentJson = finalSampleJson;
                }

                var draft = new MasterMarketplaceDraftSection
                {
                    Id = Guid.NewGuid(),
                    DraftSuiteId = suiteGuid,
                    SuiteName = TruncateString(string.IsNullOrWhiteSpace(suiteName) ? "Imported Suite" : suiteName, 150),
                    Name = TruncateString(string.IsNullOrWhiteSpace(sec.Name) ? $"{suiteName} Section {i + 1}" : sec.Name, 150),
                    VariantCode = TruncateString(string.IsNullOrWhiteSpace(sec.VariantCode) ? $"sec_{i + 1}" : sec.VariantCode, 100),
                    CategoryKey = TruncateString(string.IsNullOrWhiteSpace(sec.CategoryKey) ? "bodysections" : sec.CategoryKey, 50),
                    Description = TruncateString(sec.Description, 500),
                    HtmlTemplate = sec.HtmlTemplate ?? string.Empty,
                    ScopedCss = sec.ScopedCss ?? string.Empty,
                    JsScript = sec.JsScript,
                    SampleContentJson = finalSampleJson,
                    RequiredLibrariesJson = JsonSerializer.Serialize(secLibs),
                    RequiredCssLibrariesJson = JsonSerializer.Serialize(secCssLibs),
                    RequiredJsLibrariesJson = JsonSerializer.Serialize(secJsLibs),
                    SourceChannel = TruncateString(sourceChannel, 50),
                    Status = "Draft",
                    SortOrder = i,
                    CreatedUtc = DateTime.UtcNow
                };

                _masterDb.MasterMarketplaceDraftSections.Add(draft);
                sec.Id = draft.Id.ToString();
            }

            try
            {
                await _masterDb.SaveChangesAsync(cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to persist staged draft sections to database. Continuing with in-memory sections.");
            }
        }

        private static string ResolveAuthenticContainerClass(string htmlMarkup, string fallback = "")
        {
            if (string.IsNullOrWhiteSpace(htmlMarkup)) return fallback;
            var match = Regex.Match(htmlMarkup, @"<(?:header|section|footer|nav|div|article)\b[^>]*\bclass=[""']([^""']+)[""']", RegexOptions.IgnoreCase);
            if (match.Success)
            {
                var classes = match.Groups[1].Value.Split(new[] { ' ', '\t', '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries);
                var primaryClass = classes.FirstOrDefault(c => !NativeSectionExtractorService.IsVendorUtilityClass(c));
                if (!string.IsNullOrWhiteSpace(primaryClass)) return primaryClass;
                if (classes.Length > 0) return classes[0];
            }
            var idMatch = Regex.Match(htmlMarkup, @"<(?:header|section|footer|nav|div|article)\b[^>]*\bid=[""']([^""']+)[""']", RegexOptions.IgnoreCase);
            if (idMatch.Success) return idMatch.Groups[1].Value.Trim();
            return fallback;
        }

        private static string TruncateString(string? value, int maxLength)
        {
            if (string.IsNullOrEmpty(value)) return string.Empty;
            return value.Length <= maxLength ? value : value[..maxLength];
        }

        #endregion
    }

    #region DTOs for Publishing and Staging Updates

    /// <summary>
    /// Payload for publishing a single section.
    /// </summary>
    public class PublishSectionRequestDto
    {
        public Guid? DraftId { get; set; }
        public string? Name { get; set; }
        public string? VariantCode { get; set; }
        public string CategoryKey { get; set; } = "bodysections";
        public string HtmlTemplate { get; set; } = string.Empty;
        public string? CssStyles { get; set; }
        public string? JsScript { get; set; }
        public string? DefaultSectionListsJson { get; set; }
        public string? Description { get; set; }
        public string? Tag { get; set; }
        public string? Badge { get; set; }
    }

    /// <summary>
    /// Payload for batch publishing an entire theme suite.
    /// </summary>
    public class PublishSuiteRequestDto
    {
        public string SuiteName { get; set; } = "Theme Suite";
        public List<PublishSectionRequestDto> Sections { get; set; } = new();
    }

    /// <summary>
    /// Payload for updating a draft section in the staging database.
    /// </summary>
    public class UpdateDraftSectionRequestDto
    {
        public Guid Id { get; set; }
        public string? Name { get; set; }
        public string? CategoryKey { get; set; }
        public string? Description { get; set; }
        public string? HtmlTemplate { get; set; }
        public string? ScopedCss { get; set; }
        public string? JsScript { get; set; }
        public string? SampleContentJson { get; set; }
        public string? RequiredLibrariesJson { get; set; }
        public string? RequiredCssLibrariesJson { get; set; }
        public string? RequiredJsLibrariesJson { get; set; }
    }

    #endregion
}
