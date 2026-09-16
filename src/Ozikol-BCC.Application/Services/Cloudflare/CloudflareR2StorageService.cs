using System;
using System.IO;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;
using Amazon.S3.Transfer;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Ozikol_BCC.Application.Configuration;

namespace Ozikol_BCC.Application.Services.Cloudflare
{
    /// <summary>
    /// Service implementation for managing and delivering static assets via Cloudflare R2 Object Storage
    /// and Cloudflare CDN. Cloudflare R2 is 100% S3-compatible with $0 egress bandwidth costs.
    /// </summary>
    public class CloudflareR2StorageService : ICloudflareR2StorageService
    {
        private readonly CloudflareR2Settings _settings;
        private readonly ILogger<CloudflareR2StorageService> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="CloudflareR2StorageService"/> class.
        /// </summary>
        /// <param name="settingsOptions">Options wrapper containing Cloudflare R2 configuration.</param>
        /// <param name="logger">Logger instance for operational and diagnostic telemetry.</param>
        public CloudflareR2StorageService(
            IOptions<CloudflareR2Settings> settingsOptions,
            ILogger<CloudflareR2StorageService> logger)
        {
            _settings = settingsOptions?.Value ?? new CloudflareR2Settings();
            _logger = logger;
        }

        /// <summary>
        /// Checks whether valid Cloudflare R2 credentials are fully configured.
        /// </summary>
        /// <returns><c>true</c> if AccountId, AccessKeyId, SecretAccessKey, and BucketName are populated; otherwise, <c>false</c>.</returns>
        public bool IsConfigured()
        {
            return !string.IsNullOrWhiteSpace(_settings.AccountId) &&
                   !string.IsNullOrWhiteSpace(_settings.AccessKeyId) &&
                   !string.IsNullOrWhiteSpace(_settings.SecretAccessKey) &&
                   !string.IsNullOrWhiteSpace(_settings.BucketName) &&
                   !_settings.AccountId.StartsWith("xxx", StringComparison.OrdinalIgnoreCase);
        }

        /// <summary>
        /// Uploads a generic asset stream to Cloudflare R2 and returns its public CDN URL.
        /// </summary>
        /// <param name="contentStream">The readable stream containing asset data.</param>
        /// <param name="fileName">The original file name including extension.</param>
        /// <param name="contentType">The MIME content type.</param>
        /// <param name="folder">Optional target folder path within the bucket.</param>
        /// <returns>A <see cref="CloudflareR2UploadResult"/> with status and public URL.</returns>
        public async Task<CloudflareR2UploadResult> UploadAssetAsync(
            Stream contentStream, 
            string fileName, 
            string contentType, 
            string? folder = null)
        {
            if (!IsConfigured())
            {
                _logger.LogWarning("Cloudflare R2 is not fully configured. Please populate CloudflareR2 settings in .env or appsettings.json.");
                return new CloudflareR2UploadResult
                {
                    Success = false,
                    Message = "Cloudflare R2 storage credentials are not configured. Please define CloudflareR2:AccountId, AccessKeyId, SecretAccessKey, and BucketName in your environment."
                };
            }

            try
            {
                // Generate a sanitized unique filename to avoid collision and ensure safe URLs
                var rawBaseName = Path.GetFileNameWithoutExtension(fileName).Replace(" ", "-").ToLowerInvariant();
                var safeBaseName = Regex.Replace(rawBaseName, @"[^a-z0-9\-_]", "");
                if (string.IsNullOrWhiteSpace(safeBaseName)) safeBaseName = "asset";

                var extension = Path.GetExtension(fileName).ToLowerInvariant();
                var uniqueFileName = $"{safeBaseName}-{Guid.NewGuid().ToString("N")[..8]}{extension}";

                // Build bucket object key with optional folder prefix
                var cleanFolder = string.IsNullOrWhiteSpace(folder) ? "" : folder.Trim().Trim('/') + "/";
                var objectKey = $"{cleanFolder}{uniqueFileName}";

                // Cloudflare R2 S3-compatible client initialization
                // Cloudflare R2 S3-compatible client initialization
                // Note: Cloudflare R2 does not implement STREAMING-AWS4-HMAC-SHA256-PAYLOAD,
                // so UseChunkEncoding must be set to false and DisablePayloadSigning to true.
                var credentials = new BasicAWSCredentials(_settings.AccessKeyId, _settings.SecretAccessKey);
                var s3Config = new AmazonS3Config
                {
                    // R2 endpoint format: https://<account_id>.r2.cloudflarestorage.com
                    ServiceURL = $"https://{_settings.AccountId.Trim()}.r2.cloudflarestorage.com",
                    AuthenticationRegion = "auto",
                    ForcePathStyle = true
                };

                using var s3Client = new AmazonS3Client(credentials, s3Config);

                // Use PutObjectRequest with DisablePayloadSigning = true to ensure standard S3 payload hashing
                var putRequest = new PutObjectRequest
                {
                    InputStream = contentStream,
                    Key = objectKey,
                    BucketName = _settings.BucketName,
                    ContentType = contentType,
                    CannedACL = S3CannedACL.NoACL,
                    DisablePayloadSigning = true,
                    UseChunkEncoding = false
                };

                // Enable 1-year immutable edge caching for hashed static assets on Cloudflare CDN
                putRequest.Headers.CacheControl = "public, max-age=31536000, immutable";

                await s3Client.PutObjectAsync(putRequest);

                var cdnUrl = GetPublicCdnUrl(objectKey);

                _logger.LogInformation("Successfully uploaded static asset {Key} to Cloudflare R2. Public CDN: {Url}", objectKey, cdnUrl);

                return new CloudflareR2UploadResult
                {
                    Success = true,
                    Url = cdnUrl,
                    Key = objectKey,
                    BucketName = _settings.BucketName,
                    OriginalFileName = fileName,
                    SafeFileName = uniqueFileName,
                    FileSizeBytes = contentStream.Length,
                    Message = "Asset uploaded successfully to Cloudflare R2 and distributed via Cloudflare CDN."
                };
            }
            catch (AmazonS3Exception s3Ex)
            {
                _logger.LogError(s3Ex, "Cloudflare R2 S3 error occurred while uploading asset {FileName}", fileName);
                return new CloudflareR2UploadResult
                {
                    Success = false,
                    Message = $"Cloudflare R2 S3 error ({s3Ex.StatusCode}): {s3Ex.Message}"
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error occurred while uploading asset {FileName} to Cloudflare R2", fileName);
                return new CloudflareR2UploadResult
                {
                    Success = false,
                    Message = $"Failed to upload asset to Cloudflare R2: {ex.Message}"
                };
            }
        }

        /// <summary>
        /// Uploads a CSS stylesheet file to Cloudflare R2 under a tenant-specific folder, applies immutable edge caching headers,
        /// and returns the public Cloudflare CDN URL.
        /// </summary>
        /// <param name="contentStream">The readable stream containing the CSS stylesheet.</param>
        /// <param name="fileName">The CSS file name (must end in .css).</param>
        /// <param name="tenantSlug">Optional tenant slug or identifier for multi-tenant asset isolation.</param>
        /// <returns>A <see cref="CloudflareR2UploadResult"/> containing the public CDN URL and raw CSS content.</returns>
        public async Task<CloudflareR2UploadResult> UploadCssAsync(
            Stream contentStream, 
            string fileName, 
            string? tenantSlug = null)
        {
            // Read CSS content to support inline fallback / preview in frontend
            string cssContent;
            using (var reader = new StreamReader(contentStream, Encoding.UTF8, detectEncodingFromByteOrderMarks: true, bufferSize: 4096, leaveOpen: true))
            {
                cssContent = await reader.ReadToEndAsync();
                contentStream.Position = 0; // Rewind for S3 upload
            }

            // Namespace the asset by tenant to prevent cross-tenant collisions
            var targetFolder = string.IsNullOrWhiteSpace(tenantSlug) 
                ? "css" 
                : $"tenants/{tenantSlug.Trim().ToLowerInvariant()}/css";

            var result = await UploadAssetAsync(contentStream, fileName, "text/css", targetFolder);
            result.ContentPreview = cssContent;
            return result;
        }

        /// <summary>
        /// Deletes an asset from the Cloudflare R2 bucket by its object key.
        /// </summary>
        /// <param name="key">The unique object key inside the bucket.</param>
        /// <returns><c>true</c> if successfully deleted; otherwise, <c>false</c>.</returns>
        public async Task<bool> DeleteAssetAsync(string key)
        {
            if (!IsConfigured() || string.IsNullOrWhiteSpace(key)) return false;

            try
            {
                var credentials = new BasicAWSCredentials(_settings.AccessKeyId, _settings.SecretAccessKey);
                var s3Config = new AmazonS3Config
                {
                    ServiceURL = $"https://{_settings.AccountId.Trim()}.r2.cloudflarestorage.com",
                    AuthenticationRegion = "auto",
                    ForcePathStyle = true
                };

                using var s3Client = new AmazonS3Client(credentials, s3Config);
                var deleteRequest = new DeleteObjectRequest
                {
                    BucketName = _settings.BucketName,
                    Key = key
                };

                await s3Client.DeleteObjectAsync(deleteRequest);
                _logger.LogInformation("Deleted asset {Key} from Cloudflare R2 bucket {Bucket}", key, _settings.BucketName);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to delete asset {Key} from Cloudflare R2", key);
                return false;
            }
        }

        /// <summary>
        /// Computes the public Cloudflare CDN URL for an object key.
        /// Uses the configured custom domain or pub-*.r2.dev edge domain.
        /// </summary>
        /// <param name="key">The unique object key inside the bucket.</param>
        /// <returns>The fully qualified public CDN URL.</returns>
        public string GetPublicCdnUrl(string key)
        {
            var cleanKey = key.TrimStart('/');
            if (!string.IsNullOrWhiteSpace(_settings.PublicCdnUrl))
            {
                return $"{_settings.PublicCdnUrl.TrimEnd('/')}/{cleanKey}";
            }

            // Fallback to standard Cloudflare R2 dev URL pattern if PublicCdnUrl is not yet set
            return $"https://pub-{_settings.AccountId}.r2.dev/{cleanKey}";
        }
    }
}
