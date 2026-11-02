using System.Threading;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Interfaces.Services
{
    /// <summary>
    /// Service responsible for downloading, validating, optimizing, and uploading template images to Cloudinary.
    /// Ensures all images are converted to lightweight WebP format (max 300KB) and provides royalty-free
    /// fallback stock image resolution when source images are missing, forbidden (403), or broken.
    /// Supports both Master platform Cloudinary storage and autonomous tenant custom Cloudinary accounts.
    /// </summary>
    public interface ITemplateImageOptimizationService
    {
        /// <summary>
        /// Downloads an image from a relative or absolute URL, compresses/transforms it to lightweight WebP format (max 300KB),
        /// uploads it to Cloudinary, and returns the public CDN URL.
        /// If the source image is unreachable or fails to download, automatically resolves a curated royalty-free stock image.
        /// </summary>
        /// <param name="imageUrl">The relative or absolute source image URL.</param>
        /// <param name="baseDomainUrl">Optional base domain URL to resolve relative image paths.</param>
        /// <param name="categoryOrContext">Optional context hint (e.g. "hero", "avatar", "team", "feature", "blog", "product") for royalty-free fallback selection.</param>
        /// <param name="targetFolder">Target Cloudinary folder (defaults to "templates/images").</param>
        /// <param name="customCloudName">Optional custom tenant Cloud Name.</param>
        /// <param name="customApiKey">Optional custom tenant API Key.</param>
        /// <param name="customApiSecret">Optional custom tenant API Secret.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>The secure Cloudinary WebP CDN URL.</returns>
        Task<string> OptimizeAndUploadImageAsync(
            string imageUrl,
            string? baseDomainUrl = null,
            string? categoryOrContext = null,
            string targetFolder = "templates/images",
            string? customCloudName = null,
            string? customApiKey = null,
            string? customApiSecret = null,
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Scans an HTML markup string for all image sources (&lt;img src&gt;, data-src, srcset, inline background-image),
        /// concurrently downloads and optimizes them to lightweight WebP (&lt;= 300KB) in Cloudinary,
        /// and returns the updated HTML with all image URLs replaced with permanent Cloudinary CDN links.
        /// </summary>
        /// <param name="htmlMarkup">The raw HTML markup to process.</param>
        /// <param name="baseDomainUrl">Optional base domain URL to resolve relative paths.</param>
        /// <param name="categoryOrContext">Optional section category hint.</param>
        /// <param name="targetFolder">Target Cloudinary folder.</param>
        /// <param name="customCloudName">Optional custom tenant Cloud Name.</param>
        /// <param name="customApiKey">Optional custom tenant API Key.</param>
        /// <param name="customApiSecret">Optional custom tenant API Secret.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>The HTML markup with all image references updated to Cloudinary WebP URLs.</returns>
        Task<string> ProcessAndReplaceImagesInHtmlAsync(
            string htmlMarkup,
            string? baseDomainUrl = null,
            string? categoryOrContext = null,
            string targetFolder = "templates/images",
            string? customCloudName = null,
            string? customApiKey = null,
            string? customApiSecret = null,
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Scans a CSS stylesheet string for all image references inside url(...),
        /// optimizes and uploads them to Cloudinary as lightweight WebP,
        /// and returns the updated CSS with replaced Cloudinary URLs.
        /// </summary>
        /// <param name="cssMarkup">The raw CSS stylesheet content.</param>
        /// <param name="baseDomainUrl">Optional base domain URL to resolve relative paths.</param>
        /// <param name="targetFolder">Target Cloudinary folder.</param>
        /// <param name="customCloudName">Optional custom tenant Cloud Name.</param>
        /// <param name="customApiKey">Optional custom tenant API Key.</param>
        /// <param name="customApiSecret">Optional custom tenant API Secret.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>The CSS content with all image references updated to Cloudinary WebP URLs.</returns>
        Task<string> ProcessAndReplaceImagesInCssAsync(
            string cssMarkup,
            string? baseDomainUrl = null,
            string targetFolder = "templates/images",
            string? customCloudName = null,
            string? customApiKey = null,
            string? customApiSecret = null,
            CancellationToken cancellationToken = default);
    }
}
