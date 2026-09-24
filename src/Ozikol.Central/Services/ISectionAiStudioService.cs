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
