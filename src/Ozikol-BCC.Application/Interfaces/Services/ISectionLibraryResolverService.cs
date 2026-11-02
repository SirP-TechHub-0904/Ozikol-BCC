using System.Collections.Generic;
using Ozikol_BCC.Application.Dtos.Sections;

namespace Ozikol_BCC.Application.Interfaces.Services
{
    /// <summary>
    /// Contract for scanning HTML/JS markup to detect third-party library dependencies (Bootstrap, Swiper, AOS, etc.)
    /// and generating deduplicated CDN stylesheet and script tags for section previews, website previews, and live tenant websites.
    /// </summary>
    public interface ISectionLibraryResolverService
    {
        /// <summary>
        /// Scans the provided HTML markup and optional JavaScript code to detect required third-party libraries.
        /// </summary>
        /// <param name="htmlContent">The HTML markup to inspect for class signatures and attributes.</param>
        /// <param name="rawJs">Optional JavaScript code to inspect for programmatic constructor calls.</param>
        /// <returns>A list of recognized canonical library keys (e.g. "bootstrap", "swiper", "aos").</returns>
        List<string> DetectLibraries(string htmlContent, string? rawJs = null);

        /// <summary>
        /// Resolves the complete CDN assets and tags for a given detection request synchronously.
        /// </summary>
        /// <param name="request">Detection request with HTML and optional JS.</param>
        /// <returns>Response with detected libraries, CDN links, and pre-rendered head/footer HTML.</returns>
        DetectLibrariesResponseDto ResolveAssets(DetectLibrariesRequestDto request);

        /// <summary>
        /// Resolves complete CDN assets using hybrid Static Catalog + AI Discovery (Gemini 2.5 Flash primary with DeepSeek failover).
        /// Discovers rare or custom plugins (e.g. MeanMenu, NiceSelect, Animate.css, Slick, Magnific Popup, GSAP) and automatically pulls their CDN assets.
        /// </summary>
        /// <param name="request">Detection request with HTML and optional JS.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>Response with detected libraries, resolved CDN links, and pre-rendered head/footer HTML.</returns>
        System.Threading.Tasks.Task<DetectLibrariesResponseDto> ResolveAssetsAsync(DetectLibrariesRequestDto request, System.Threading.CancellationToken cancellationToken = default);

        /// <summary>
        /// Uses AI (Gemini 2.5 Flash with DeepSeek failover) to analyze code and discover third-party libraries and their CDN links.
        /// </summary>
        /// <param name="htmlContent">The HTML markup to inspect.</param>
        /// <param name="rawJs">Optional JavaScript code to inspect.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>List of discovered library asset definitions with CDN URLs.</returns>
        System.Threading.Tasks.Task<List<LibraryAssetDefinition>> DetectLibrariesWithAiAsync(string htmlContent, string? rawJs = null, System.Threading.CancellationToken cancellationToken = default);

        /// <summary>
        /// Generates deduplicated &lt;link rel="stylesheet"&gt; tags and scoped &lt;style&gt; blocks for insertion into &lt;head&gt;.
        /// </summary>
        /// <param name="sections">Collection of active sections on the page or preview.</param>
        /// <returns>HTML markup string containing stylesheet tags and scoped section CSS.</returns>
        string GenerateHeadHtml(IEnumerable<SectionAssetPayloadDto> sections);

        /// <summary>
        /// Generates deduplicated vendor &lt;script&gt; tags, library auto-initializers, and isolated section JavaScript IIFEs for insertion before &lt;/body&gt;.
        /// </summary>
        /// <param name="sections">Collection of active sections on the page or preview.</param>
        /// <returns>HTML markup string containing script tags, initializers, and isolated section JS blocks.</returns>
        string GenerateFooterHtml(IEnumerable<SectionAssetPayloadDto> sections);
    }
}
