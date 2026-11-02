namespace Ozikol_BCC.Application.Services.Cloudflare
{
    /// <summary>
    /// Represents the outcome of an asset upload operation targeting Cloudflare R2 and Cloudflare CDN.
    /// </summary>
    public class CloudflareR2UploadResult
    {
        /// <summary>
        /// Gets or sets a value indicating whether the upload succeeded.
        /// </summary>
        public bool Success { get; set; }

        /// <summary>
        /// Gets or sets the fully qualified public Cloudflare CDN URL for accessing the uploaded asset.
        /// </summary>
        public string Url { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the unique object key/path inside the Cloudflare R2 bucket.
        /// </summary>
        public string Key { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the name of the destination Cloudflare R2 bucket.
        /// </summary>
        public string BucketName { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the original file name of the uploaded asset.
        /// </summary>
        public string OriginalFileName { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the sanitized safe file name stored in R2.
        /// </summary>
        public string SafeFileName { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the size of the uploaded asset in bytes.
        /// </summary>
        public long FileSizeBytes { get; set; }

        /// <summary>
        /// Gets or sets an informational or error message describing the upload result.
        /// </summary>
        public string Message { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the raw content of the asset (for text/CSS assets, useful for inline fallback or preview).
        /// </summary>
        public string? ContentPreview { get; set; }
    }
}
