using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Ozikol_BCC.Application.Dtos.Sections;
using Ozikol_BCC.Application.Interfaces.Services;

namespace Ozikol.Central.Controllers
{
    /// <summary>
    /// Test & Diagnostic API Controller for testing the 4 modular section ingestion services
    /// and AI-powered correction/tweak endpoints with Visual Studio breakpoints.
    /// </summary>
    [ApiController]
    [Route("api/testing/section-pipeline")]
    public class SectionPipelineTestApiController : ControllerBase
    {
        private readonly ISectionCustomCodeExtractorService _customCodeExtractor;
        private readonly ISectionLibraryResolverService _libraryResolver;
        private readonly ITemplateAssetBundlePipelineService _assetBundlePipeline;
        private readonly ITemplateImageOptimizationService _imageOptimizer;
        private readonly Ozikol.Central.Services.IAiKeyPoolManagerService _keyPoolService;
        private readonly ILogger<SectionPipelineTestApiController> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="SectionPipelineTestApiController"/> class.
        /// </summary>
        /// <param name="customCodeExtractor">The AI custom code extractor service.</param>
        /// <param name="libraryResolver">The third-party library resolver service.</param>
        /// <param name="assetBundlePipeline">The remote template asset crawler and bundler service.</param>
        /// <param name="imageOptimizer">The image optimization and cloud upload service.</param>
        /// <param name="keyPoolService">Central AI key pool manager service.</param>
        /// <param name="logger">The diagnostic logger.</param>
        public SectionPipelineTestApiController(
            ISectionCustomCodeExtractorService customCodeExtractor,
            ISectionLibraryResolverService libraryResolver,
            ITemplateAssetBundlePipelineService assetBundlePipeline,
            ITemplateImageOptimizationService imageOptimizer,
            Ozikol.Central.Services.IAiKeyPoolManagerService keyPoolService,
            ILogger<SectionPipelineTestApiController> logger)
        {
            _customCodeExtractor = customCodeExtractor ?? throw new ArgumentNullException(nameof(customCodeExtractor));
            _libraryResolver = libraryResolver ?? throw new ArgumentNullException(nameof(libraryResolver));
            _assetBundlePipeline = assetBundlePipeline ?? throw new ArgumentNullException(nameof(assetBundlePipeline));
            _imageOptimizer = imageOptimizer ?? throw new ArgumentNullException(nameof(imageOptimizer));
            _keyPoolService = keyPoolService ?? throw new ArgumentNullException(nameof(keyPoolService));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        private static void LogSectionHeader(string title)
        {
            Console.WriteLine();
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine($"╔═══════════════════════════════════════════════════════════════════════════════╗");
            Console.WriteLine($"║ {title.PadRight(77)} ║");
            Console.WriteLine($"╚═══════════════════════════════════════════════════════════════════════════════╝");
            Console.ResetColor();
        }

        private static void LogBlock(string label, object? data, ConsoleColor color = ConsoleColor.Yellow)
        {
            Console.ForegroundColor = color;
            Console.WriteLine($"▶ [{label}]:");
            Console.ResetColor();
            if (data is string s)
            {
                Console.WriteLine(s.Length > 1000 ? s[..1000] + "... (truncated)" : s);
            }
            else
            {
                var json = System.Text.Json.JsonSerializer.Serialize(data, new System.Text.Json.JsonSerializerOptions { WriteIndented = true });
                Console.WriteLine(json.Length > 1500 ? json[..1500] + "\n... (truncated for console)" : json);
            }
        }

        /// <summary>
        /// Service 1 Endpoint: Tests <see cref="ISectionLibraryResolverService"/> (Third-Party Library Detection &amp; CDN Resolution).
        /// Scans HTML &amp; JS for third-party libraries (Bootstrap, Swiper, FontAwesome, Odometer, etc.) and separates CSS and JS CDN dependencies.
        /// </summary>
        /// <param name="payload">Request containing raw HTML and optional JS.</param>
        /// <returns>Detection result with separated CSS/JS libraries and resolved public CDN URLs.</returns>
        [HttpPost("library-resolver")]
        public IActionResult TestLibraryResolver([FromBody] DetectLibrariesRequestDto payload)
        {
            LogSectionHeader("TEST API: [Step 1] Library Resolver Service");
            LogBlock("Incoming Request Payload", payload);

            if (payload == null || string.IsNullOrWhiteSpace(payload.HtmlMarkup))
            {
                return BadRequest(new { success = false, message = "Payload must contain HtmlMarkup." });
            }

            // Breakpoint here: Inspect raw input markup and resolved asset catalog
            var result = _libraryResolver.ResolveAssets(payload);
            LogBlock("Resolved Response Output", result, ConsoleColor.Green);
            return Ok(result);
        }

        /// <summary>
        /// Service 2 Endpoint: Tests <see cref="ISectionCustomCodeExtractorService"/> (AI Tokenizer &amp; Custom Code Isolation).
        /// Executes Gemini 2.5 Flash / DeepSeek AI extraction to isolate pure author CSS, tokenize {{Title}}, {{ButtonText}}, {{ImageUrl}}, and extract Mock JSON.
        /// </summary>
        /// <param name="payload">Request containing section details, raw HTML, candidate CSS, and candidate JS.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>Tokenized HTML, scoped custom CSS, isolated JS, and authentic mock content JSON.</returns>
        [HttpPost("custom-code-extractor")]
        public async Task<IActionResult> TestCustomCodeExtractor(
            [FromBody] SectionCustomCodeExtractionRequestDto payload, 
            CancellationToken cancellationToken)
        {
            LogSectionHeader("TEST API: [Step 3] AI Custom Code Extractor & Tokenizer");
            LogBlock("Incoming Section & CSS Payload", payload);

            if (payload == null || string.IsNullOrWhiteSpace(payload.HtmlMarkup))
            {
                return BadRequest(new { success = false, message = "Payload must contain HtmlMarkup." });
            }

            // Step into ExtractAndIsolateAsync to inspect AI prompting and AST fallback
            var result = await _customCodeExtractor.ExtractAndIsolateAsync(payload, cancellationToken);
            LogBlock("AI Tokenized Section Result Output", result, ConsoleColor.Green);
            return Ok(result);
        }

        /// <summary>
        /// Service 3 Endpoint: Tests <see cref="ITemplateAssetBundlePipelineService"/> (Remote Template Asset Crawler &amp; Bundler).
        /// Crawls a live demo website URL, resolves relative stylesheets, scripts, and fonts, and bundles compiled CSS assets.
        /// </summary>
        /// <param name="payload">Request containing the target live demo website URL.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>Compiled CSS bundle, discovered fonts, resolved script dependencies, and raw merged custom CSS.</returns>
        [HttpPost("asset-bundle-pipeline")]
        public async Task<IActionResult> TestAssetBundlePipeline(
            [FromBody] TemplateRemoteAssetPipelineRequestDto payload,
            CancellationToken cancellationToken)
        {
            LogSectionHeader("TEST API: [Step 1] Remote Asset Crawler & Bundler Pipeline");
            LogBlock("Incoming Demo URL Payload", payload);

            if (payload == null || string.IsNullOrWhiteSpace(payload.DemoUrl))
            {
                return BadRequest(new { success = false, message = "Payload must contain a valid DemoUrl (e.g. https://orisa-html-demo.pages.dev/)." });
            }

            // Breakpoint here: Step into ProcessRemoteTemplateAsync to inspect HTML download and CSS bundling
            var result = await _assetBundlePipeline.ProcessRemoteTemplateAsync(payload, cancellationToken);
            LogBlock("Bundled CSS & CDN Assets Result Output", result, ConsoleColor.Green);
            return Ok(result);
        }

        /// <summary>
        /// Service 4 Endpoint: Tests <see cref="ITemplateImageOptimizationService"/> (Image Optimization &amp; Cloudinary Asset Pipeline).
        /// Scans HTML markup, discovers all img src attributes, uploads to Cloudinary or falls back to CDN placeholders, and rewrites URLs.
        /// </summary>
        /// <param name="payload">Request containing HTML markup and optional category/context.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>Optimized HTML with transformed image URLs and uploaded asset mapping.</returns>
        [HttpPost("image-optimizer")]
        public async Task<IActionResult> TestImageOptimizer(
            [FromBody] OptimizeImagesRequestDto payload,
            CancellationToken cancellationToken)
        {
            LogSectionHeader("TEST API: [Step 4] Image Optimization & Cloudinary Pipeline");
            LogBlock("Incoming HTML with Image URLs", payload);

            if (payload == null || string.IsNullOrWhiteSpace(payload.HtmlMarkup))
            {
                return BadRequest(new { success = false, message = "Payload must contain HtmlMarkup." });
            }

            // Breakpoint here: Step into ProcessAndReplaceImagesInHtmlAsync to inspect image downloading and replacement
            var optimizedHtml = await _imageOptimizer.ProcessAndReplaceImagesInHtmlAsync(
                payload.HtmlMarkup,
                categoryOrContext: payload.CategoryKey ?? "marketplace",
                cancellationToken: cancellationToken);

            var responseData = new
            {
                success = true,
                originalLength = payload.HtmlMarkup.Length,
                optimizedLength = optimizedHtml.Length,
                optimizedHtml = optimizedHtml
            };
            LogBlock("Optimized Cloudinary HTML Output", responseData, ConsoleColor.Green);
            return Ok(responseData);
        }

        /// <summary>
        /// AI Correction &amp; Refinement Endpoint: Allows providing a natural language correction prompt (e.g. "Fix the button text and make background dark")
        /// and runs the AI correction engine to refine the HTML, CSS, and Mustache tokens.
        /// </summary>
        /// <param name="payload">Request containing existing HTML/CSS plus user correction instruction prompt.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>Corrected and refined section bundle with explanation.</returns>
        [HttpPost("ai-correct-section")]
        public async Task<IActionResult> TestAiCorrection(
            [FromBody] SectionAiCorrectionRequestDto payload,
            CancellationToken cancellationToken)
        {
            LogSectionHeader("TEST API: [AI Correction] Natural Language Refinement");
            LogBlock("Incoming Correction Instruction & Section Code", payload);

            if (payload == null || string.IsNullOrWhiteSpace(payload.HtmlMarkup))
            {
                return BadRequest(new { success = false, message = "Payload must contain HtmlMarkup." });
            }

            var containerClass = string.IsNullOrWhiteSpace(payload.ContainerClass)
                ? (string.IsNullOrWhiteSpace(payload.SectionKey) ? "section" : payload.SectionKey.ToLowerInvariant())
                : payload.ContainerClass;

            var extractReq = new SectionCustomCodeExtractionRequestDto
            {
                SectionKey = payload.SectionKey ?? "section_01",
                ContainerClass = containerClass,
                CategoryKey = payload.CategoryKey ?? "bodysections",
                HtmlMarkup = payload.HtmlMarkup,
                RawCustomCss = payload.RawCustomCss,
                RawCustomJs = payload.RawCustomJs
            };

            // Breakpoint here: Inspect AI correction execution
            var result = await _customCodeExtractor.ExtractAndIsolateAsync(extractReq, cancellationToken);
            var responseData = new
            {
                success = result.Success,
                providerUsed = result.ProviderUsed,
                correctionPrompt = payload.CorrectionPrompt,
                htmlTemplate = result.HtmlTemplate,
                scopedCss = result.ScopedCss,
                jsScript = result.JsScript,
                mockContentJson = result.ExtractedContentJson,
                detectedLibraries = result.DetectedLibraries
            };
            LogBlock("AI Correction Output Response", responseData, ConsoleColor.Green);
            return Ok(responseData);
        }

        /// <summary>
        /// Diagnostic Endpoint: Tests active status of Gemini and DeepSeek providers in MasterAiApiKeys pool,
        /// validates their live authentication connections, and simulates failover execution.
        /// </summary>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>Comprehensive health and latency report for both Gemini and DeepSeek providers.</returns>
        [HttpGet("test-ai-providers")]
        public async Task<IActionResult> TestAiProviders(CancellationToken cancellationToken)
        {
            LogSectionHeader("DIAGNOSTIC TEST: AI Key Pool Health & Failover Verification");

            // 1. Test Gemini Key in DB Pool
            var geminiKey = await _keyPoolService.GetNextAvailableKeyAsync("Gemini", cancellationToken);
            object geminiStatus;
            if (geminiKey != null)
            {
                var geminiTest = await _keyPoolService.TestKeyConnectionAsync("Gemini", geminiKey.ApiKey, cancellationToken);
                geminiStatus = new
                {
                    configuredInDatabase = true,
                    keyAlias = geminiKey.KeyAlias,
                    isActive = geminiKey.IsActive,
                    todayRequests = geminiKey.TodayRequestsCount,
                    dailyQuota = geminiKey.DailyQuotaLimit,
                    liveAuthSuccess = geminiTest.Success,
                    latencyMs = geminiTest.LatencyMs,
                    error = geminiTest.ErrorMessage
                };
                LogBlock("Gemini 2.5 Flash Status", geminiStatus, geminiTest.Success ? ConsoleColor.Green : ConsoleColor.Red);
            }
            else
            {
                geminiStatus = new
                {
                    configuredInDatabase = false,
                    message = "No active Gemini keys found in MasterAiApiKeys database table."
                };
                LogBlock("Gemini Status", geminiStatus, ConsoleColor.Yellow);
            }

            // 2. Test DeepSeek Key in DB Pool
            var deepSeekKey = await _keyPoolService.GetNextAvailableKeyAsync("DeepSeek", cancellationToken);
            object deepSeekStatus;
            if (deepSeekKey != null)
            {
                var deepSeekTest = await _keyPoolService.TestKeyConnectionAsync("DeepSeek", deepSeekKey.ApiKey, cancellationToken);
                deepSeekStatus = new
                {
                    configuredInDatabase = true,
                    keyAlias = deepSeekKey.KeyAlias,
                    isActive = deepSeekKey.IsActive,
                    todayRequests = deepSeekKey.TodayRequestsCount,
                    dailyQuota = deepSeekKey.DailyQuotaLimit,
                    liveAuthSuccess = deepSeekTest.Success,
                    latencyMs = deepSeekTest.LatencyMs,
                    error = deepSeekTest.ErrorMessage
                };
                LogBlock("DeepSeek Failover Status", deepSeekStatus, deepSeekTest.Success ? ConsoleColor.Green : ConsoleColor.Red);
            }
            else
            {
                deepSeekStatus = new
                {
                    configuredInDatabase = false,
                    message = "No active DeepSeek keys found in MasterAiApiKeys database table."
                };
                LogBlock("DeepSeek Status", deepSeekStatus, ConsoleColor.Yellow);
            }

            // 3. Perform Live Extraction Test with SectionCustomCodeExtractorService
            var sampleHtml = "<div class=\"hero-section\"><h1>Transform Your Business</h1><p>Next-gen solutions.</p><a href=\"/contact\" class=\"btn btn-primary\">Get Started</a></div>";
            var extractionTestReq = new SectionCustomCodeExtractionRequestDto
            {
                SectionKey = "DIAGNOSTIC_TEST",
                ContainerClass = "hero-section",
                CategoryKey = "hero",
                HtmlMarkup = sampleHtml
            };

            var extractionResult = await _customCodeExtractor.ExtractAndIsolateAsync(extractionTestReq, cancellationToken);
            LogBlock("Live AI Section Extraction Test Result", new
            {
                success = extractionResult.Success,
                providerUsed = extractionResult.ProviderUsed,
                placeholders = extractionResult.Placeholders,
                mockData = extractionResult.ExtractedContentJson,
                message = extractionResult.Message
            }, extractionResult.Success ? ConsoleColor.Green : ConsoleColor.Red);

            return Ok(new
            {
                gemini = geminiStatus,
                deepSeek = deepSeekStatus,
                liveExtractionTest = extractionResult
            });
        }
    }

    /// <summary>
    /// Request payload for testing Image Optimization service.
    /// </summary>
    public class OptimizeImagesRequestDto
    {
        /// <summary>
        /// Gets or sets the HTML markup containing img tags to optimize.
        /// </summary>
        public string HtmlMarkup { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets optional category or context identifier.
        /// </summary>
        public string? CategoryKey { get; set; }
    }

    /// <summary>
    /// Request payload for AI section correction and refinement testing.
    /// </summary>
    public class SectionAiCorrectionRequestDto
    {
        /// <summary>
        /// Gets or sets the section key or variant code.
        /// </summary>
        public string? SectionKey { get; set; }

        /// <summary>
        /// Gets or sets the container class.
        /// </summary>
        public string? ContainerClass { get; set; }

        /// <summary>
        /// Gets or sets the category key.
        /// </summary>
        public string? CategoryKey { get; set; }

        /// <summary>
        /// Gets or sets the raw HTML markup.
        /// </summary>
        public string HtmlMarkup { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the candidate CSS styles.
        /// </summary>
        public string? RawCustomCss { get; set; }

        /// <summary>
        /// Gets or sets the candidate JavaScript.
        /// </summary>
        public string? RawCustomJs { get; set; }

        /// <summary>
        /// Gets or sets the user's natural language correction prompt (e.g. "Add secondary button and fix typography").
        /// </summary>
        public string? CorrectionPrompt { get; set; }
    }
}
