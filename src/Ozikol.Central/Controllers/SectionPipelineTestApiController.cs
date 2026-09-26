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
    /// Test & Diagnostic API Controller for verifying third-party library detection (Part 1)
    /// and AI-powered custom code extraction & isolation (Part 2) across Gemini 2.5 Flash and DeepSeek.
    /// </summary>
    [ApiController]
    [Route("api/testing/section-pipeline")]
    public class SectionPipelineTestApiController : ControllerBase
    {
        private readonly ISectionLibraryResolverService _libraryResolver;
        private readonly ISectionCustomCodeExtractorService _customCodeExtractor;

        public SectionPipelineTestApiController(
            ISectionLibraryResolverService libraryResolver,
            ISectionCustomCodeExtractorService customCodeExtractor)
        {
            _libraryResolver = libraryResolver ?? throw new ArgumentNullException(nameof(libraryResolver));
            _customCodeExtractor = customCodeExtractor ?? throw new ArgumentNullException(nameof(customCodeExtractor));
        }

        /// <summary>
        /// Test Endpoint for Part 1: Scans HTML & JS for third-party libraries (Bootstrap, Swiper, AOS, etc.)
        /// and returns detected keys, CDN links, and pre-rendered head/footer HTML.
        /// </summary>
        /// <param name="payload">Request containing HTML and optional JS.</param>
        /// <returns>Detection result with CDN links and injected markup.</returns>
        [HttpPost("detect-libraries")]
        public IActionResult DetectLibraries([FromBody] DetectLibrariesRequestDto payload)
        {
            if (payload == null || string.IsNullOrWhiteSpace(payload.HtmlMarkup))
            {
                return BadRequest(new { success = false, message = "Payload must contain HtmlMarkup." });
            }

            var result = _libraryResolver.ResolveAssets(payload);
            return Ok(result);
        }

        /// <summary>
        /// Test Endpoint for Part 2: Performs AI custom code extraction, scoping, and Ozikol token replacement.
        /// Tries Gemini 2.5 Flash first, automatically fails over to DeepSeek if rate limited, and falls back to deterministic AST.
        /// </summary>
        /// <param name="payload">Request containing section details, raw HTML, candidate CSS, and candidate JS.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>Clean tokenized HTML, scoped CSS, isolated JS, and real mock content JSON.</returns>
        [HttpPost("isolate-custom-code")]
        public async Task<IActionResult> IsolateCustomCode(
            [FromBody] SectionCustomCodeExtractionRequestDto payload, 
            CancellationToken cancellationToken)
        {
            if (payload == null || string.IsNullOrWhiteSpace(payload.HtmlMarkup))
            {
                return BadRequest(new { success = false, message = "Payload must contain HtmlMarkup." });
            }

            if (string.IsNullOrWhiteSpace(payload.ContainerClass))
            {
                payload.ContainerClass = "sec-variant-" + (string.IsNullOrWhiteSpace(payload.SectionKey) ? "test_sec" : payload.SectionKey.ToLowerInvariant());
            }

            var result = await _customCodeExtractor.ExtractAndIsolateAsync(payload, cancellationToken);
            return Ok(result);
        }

        /// <summary>
        /// Test Endpoint for Full Pipeline: Runs library detection (Part 1) and AI code isolation (Part 2) together,
        /// returning the unified section bundle and full page head/footer preview markup.
        /// </summary>
        /// <param name="payload">Section extraction request.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>Unified isolated section bundle with rendered head & footer injections.</returns>
        [HttpPost("full-pipeline-test")]
        public async Task<IActionResult> FullPipelineTest(
            [FromBody] SectionCustomCodeExtractionRequestDto payload, 
            CancellationToken cancellationToken)
        {
            if (payload == null || string.IsNullOrWhiteSpace(payload.HtmlMarkup))
            {
                return BadRequest(new { success = false, message = "Payload must contain HtmlMarkup." });
            }

            if (string.IsNullOrWhiteSpace(payload.ContainerClass))
            {
                payload.ContainerClass = "sec-variant-" + (string.IsNullOrWhiteSpace(payload.SectionKey) ? "test_sec" : payload.SectionKey.ToLowerInvariant());
            }

            // 1. Run AI isolation
            var isolationResult = await _customCodeExtractor.ExtractAndIsolateAsync(payload, cancellationToken);

            // 2. Resolve libraries & generate head/footer HTML
            var sectionAsset = new SectionAssetPayloadDto
            {
                VariantCode = payload.SectionKey,
                ScopedCss = isolationResult.ScopedCss,
                JsScript = isolationResult.JsScript,
                RequiredLibraries = isolationResult.DetectedLibraries
            };

            var headHtml = _libraryResolver.GenerateHeadHtml(new[] { sectionAsset });
            var footerHtml = _libraryResolver.GenerateFooterHtml(new[] { sectionAsset });

            return Ok(new
            {
                success = isolationResult.Success,
                providerUsed = isolationResult.ProviderUsed,
                detectedLibraries = isolationResult.DetectedLibraries,
                tokenizedHtml = isolationResult.HtmlTemplate,
                scopedCss = isolationResult.ScopedCss,
                isolatedJs = isolationResult.JsScript,
                extractedContentJson = isolationResult.ExtractedContentJson,
                placeholders = isolationResult.Placeholders,
                renderedHeadHtml = headHtml,
                renderedFooterHtml = footerHtml
            });
        }
    }
}
