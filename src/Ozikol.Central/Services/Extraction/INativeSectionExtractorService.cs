using System.Threading;
using System.Threading.Tasks;

namespace Ozikol.Central.Services.Extraction
{
    /// <summary>
    /// Contract for the high-performance in-process .NET 9 HTML section decomposition,
    /// class-based CSS scoping, and Mustache template tokenization service.
    /// </summary>
    public interface INativeSectionExtractorService
    {
        /// <summary>
        /// Slices raw HTML page source into categorized modular sections, computes class-isolated scoped CSS,
        /// and substitutes hardcoded brand assets with Mustache template tokens.
        /// </summary>
        /// <param name="htmlSource">Raw HTML source code.</param>
        /// <param name="baseUrl">Optional base URL for resolving relative stylesheets and assets.</param>
        /// <param name="suiteName">Theme family or suite display name.</param>
        /// <param name="brandName">Brand name to dynamically debrand.</param>
        /// <param name="customCss">Optional user-provided raw CSS to include.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>A structured extraction response containing all modular sections and metadata.</returns>
        Task<SectionsBuilderResponseDto> ExtractSectionsFromSourceAsync(
            string htmlSource,
            string? baseUrl = null,
            string? suiteName = null,
            string? brandName = null,
            string? customCss = null,
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Inspects raw HTML page source to discover external stylesheets, inline styles, scripts, and fonts
        /// for the Step 2 Workbench without slicing sections.
        /// </summary>
        /// <param name="request">The raw asset inspection request payload.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>Structured inspection response listing all CSS and JS assets with file sizes.</returns>
        Task<RawAssetsInspectResponseDto> InspectRawAssetsAsync(
            RawAssetsInspectRequestDto request,
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Slices confirmed or user-edited HTML and CSS stylesheets from Step 2 into modular sections with scoped CSS.
        /// </summary>
        /// <param name="request">The slice and scope request payload.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>A complete extraction result package ready for sandbox preview and marketplace publishing.</returns>
        Task<SectionsBuilderResponseDto> SliceAndScopeAsync(
            SliceAndScopeRequestDto request,
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Discovers internal navigation links from a target website URL or HTML markup.
        /// </summary>
        /// <param name="targetUrl">Target website URL to inspect.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>List of discovered navigation menu pages.</returns>
        Task<DiscoverPagesResponseDto> DiscoverPagesAsync(
            string targetUrl,
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Generates a standalone, fully self-contained HTML document sandbox for live previewing
        /// an individual section or composite page within an iframe.
        /// </summary>
        /// <param name="section">The extracted section to render.</param>
        /// <param name="suiteName">Suite title for context.</param>
        /// <param name="baseUrl">Base URL for assets.</param>
        /// <returns>Self-contained standalone HTML sandbox markup.</returns>
        string BuildStandaloneSectionPreviewHtml(
            ExtractedSectionDto section,
            string? suiteName = null,
            string? baseUrl = null);
    }
}
