using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;

namespace Ozikol.Central.Services
{
    /// <summary>
    /// Service interface for AI-powered section generation, multimodal image decomposition,
    /// and live in-preview section tweaking with multi-provider failover.
    /// </summary>
    public interface ISectionAiStudioService
    {
        /// <summary>
        /// Tweaks an individual section's HTML structure, scoped CSS, and placeholder variables
        /// based on user conversational instructions using the active AI key pool.
        /// </summary>
        /// <param name="request">The tweak request payload containing the current code and user prompt.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>The updated section code, scoped CSS, placeholders, and AI explanation.</returns>
        Task<SectionAiTweakResponseDto> TweakSectionAsync(
            SectionAiTweakRequestDto request, 
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Precision-filters and tree-shakes CSS rules and JavaScript event handlers from raw assets
        /// to isolate ONLY what applies directly to this section's HTML markup without inventing new code.
        /// </summary>
        /// <param name="request">The precision filter request payload containing HTML, CSS, JS, and container class.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>The tree-shaken scoped CSS, filtered JS, and reduction metrics.</returns>
        Task<SectionAiPrecisionFilterResponseDto> FilterAndIsolateSectionWithAiAsync(
            SectionAiPrecisionFilterRequestDto request, 
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Executes a complete 4-pillar AI cleanup for an individual section:
        /// 1) Standardizes HTML with {{Mustache}} tokens,
        /// 2) Precision tree-shakes and scopes CSS (zero invented code),
        /// 3) Extracts real interactive JS logic,
        /// 4) Generates realistic mock content JSON.
        /// </summary>
        /// <param name="request">The full clean request payload.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>The complete cleaned and isolated section package.</returns>
        Task<SectionAiFullCleanResponseDto> CleanAndIsolateFullSectionWithAiAsync(
            SectionAiFullCleanRequestDto request, 
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Decomposes an uploaded UI screenshot or Figma mockup into one or more modular,
        /// independent marketplace sections with isolated scoped CSS and standardized placeholders.
        /// Uploads the asset to Cloudinary and analyzes it with Gemini Multimodal Vision AI.
        /// </summary>
        /// <param name="imageFile">The uploaded image file (PNG, JPG, WebP).</param>
        /// <param name="suiteName">Optional theme suite name.</param>
        /// <param name="brandName">Optional brand placeholder name.</param>
        /// <param name="provider">AI provider to use (defaults to "Gemini").</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>A full structured section package ready for live studio preview and publishing.</returns>
        Task<SectionsBuilderResponseDto> DecomposeImageToSectionsAsync(
            IFormFile imageFile, 
            string? suiteName, 
            string? brandName, 
            string provider = "Gemini", 
            CancellationToken cancellationToken = default);
    }
}
