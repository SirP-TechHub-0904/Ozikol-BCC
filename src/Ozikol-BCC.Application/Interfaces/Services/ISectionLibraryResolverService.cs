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
        /// Resolves the complete CDN assets and tags for a given detection request.
        /// </summary>
        /// <param name="request">Detection request with HTML and optional JS.</param>
        /// <returns>Response with detected libraries, CDN links, and pre-rendered head/footer HTML.</returns>
        DetectLibrariesResponseDto ResolveAssets(DetectLibrariesRequestDto request);

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
