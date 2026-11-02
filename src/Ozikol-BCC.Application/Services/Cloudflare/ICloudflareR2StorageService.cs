using System.IO;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Services.Cloudflare
{
    /// <summary>
    /// Service abstraction for uploading, managing, and distributing static assets via Cloudflare R2 Object Storage
    /// coupled with Cloudflare's global edge Content Delivery Network (CDN).
    /// </summary>
    public interface ICloudflareR2StorageService
    {
        /// <summary>
        /// Checks whether valid Cloudflare R2 credentials (AccountId, AccessKeyId, SecretAccessKey, BucketName) are configured.
        /// </summary>
        /// <returns><c>true</c> if fully configured; otherwise, <c>false</c>.</returns>
        bool IsConfigured();

        /// <summary>
        /// Uploads a generic binary or text asset stream to Cloudflare R2 and returns its public CDN URL.
        /// </summary>
        /// <param name="contentStream">The readable stream containing asset data.</param>
        /// <param name="fileName">The original file name including extension.</param>
        /// <param name="contentType">The MIME content type (e.g. text/css, application/javascript, image/png).</param>
        /// <param name="folder">Optional target folder path within the bucket (e.g. "css" or "assets").</param>
        /// <returns>A <see cref="CloudflareR2UploadResult"/> containing the CDN URL and upload metadata.</returns>
        Task<CloudflareR2UploadResult> UploadAssetAsync(Stream contentStream, string fileName, string contentType, string? folder = null);

        /// <summary>
        /// Uploads a CSS stylesheet file to Cloudflare R2 under a tenant-specific folder, applies immutable edge caching headers,
        /// and returns the public Cloudflare CDN URL.
        /// </summary>
        /// <param name="contentStream">The readable stream containing the CSS stylesheet.</param>
        /// <param name="fileName">The CSS file name (must end in .css).</param>
        /// <param name="tenantSlug">Optional tenant slug or identifier for multi-tenant asset isolation.</param>
        /// <returns>A <see cref="CloudflareR2UploadResult"/> containing the public CDN URL and raw CSS content.</returns>
        Task<CloudflareR2UploadResult> UploadCssAsync(Stream contentStream, string fileName, string? tenantSlug = null);

        /// <summary>
        /// Deletes an asset from the Cloudflare R2 bucket by its key.
        /// </summary>
        /// <param name="key">The unique object key inside the bucket.</param>
        /// <returns><c>true</c> if successfully deleted; otherwise, <c>false</c>.</returns>
        Task<bool> DeleteAssetAsync(string key);

        /// <summary>
        /// Retrieves the raw text content of an asset from Cloudflare R2 given its object key or CDN URL.
        /// </summary>
        /// <param name="keyOrUrl">The object key or public CDN URL of the asset.</param>
        /// <returns>The raw text content, or <c>null</c> if not found or unreadable.</returns>
        Task<string?> GetAssetTextAsync(string keyOrUrl);

        /// <summary>
        /// Saves updated raw text content to Cloudflare R2, overwriting or creating the object key with appropriate cache headers.
        /// </summary>
        /// <param name="keyOrUrl">The object key or public CDN URL of the asset to overwrite/update.</param>
        /// <param name="textContent">The updated raw text content (CSS, JS, SVG, etc.).</param>
        /// <param name="contentType">The MIME content type (e.g., text/css, application/javascript).</param>
        /// <returns>A <see cref="CloudflareR2UploadResult"/> containing the updated CDN URL and metadata.</returns>
        Task<CloudflareR2UploadResult> SaveAssetTextAsync(string keyOrUrl, string textContent, string contentType);

        /// <summary>
        /// Computes the public Cloudflare CDN URL for a given object key based on configured CDN domain.
        /// </summary>
        /// <param name="key">The unique object key inside the bucket.</param>
        /// <returns>The fully qualified public CDN URL.</returns>
        string GetPublicCdnUrl(string key);
    }
}
