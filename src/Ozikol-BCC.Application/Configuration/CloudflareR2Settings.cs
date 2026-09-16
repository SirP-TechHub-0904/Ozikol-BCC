namespace Ozikol_BCC.Application.Configuration
{
    /// <summary>
    /// Configuration options for Cloudflare R2 Object Storage and Cloudflare CDN integration.
    /// Cloudflare R2 provides zero-egress, S3-compatible cloud object storage mapped to a global edge CDN.
    /// </summary>
    public class CloudflareR2Settings
    {
        /// <summary>
        /// Gets or sets the Cloudflare Account ID (32-character hexadecimal identifier).
        /// Used to construct the S3-compatible endpoint: https://{AccountId}.r2.cloudflarestorage.com.
        /// </summary>
        public string AccountId { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the Cloudflare R2 API Token Access Key ID.
        /// </summary>
        public string AccessKeyId { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the Cloudflare R2 API Token Secret Access Key.
        /// </summary>
        public string SecretAccessKey { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the default target bucket name in Cloudflare R2 (e.g. "ozikol-assets" or "tenant-assets").
        /// </summary>
        public string BucketName { get; set; } = "ozikol-assets";

        /// <summary>
        /// Gets or sets the public CDN base URL mapped to this R2 bucket or Cloudflare Custom Domain (e.g. "https://cdn.ozikol.com" or "https://pub-*.r2.dev").
        /// Static assets will be served globally via this CDN endpoint.
        /// </summary>
        public string PublicCdnUrl { get; set; } = string.Empty;
    }
}
