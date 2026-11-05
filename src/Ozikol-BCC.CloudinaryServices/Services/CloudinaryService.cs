using System;
using System.IO;
using System.Threading.Tasks;
using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;
using Ozikol_BCC.Application.Configuration;
using Ozikol_BCC.Application.Services.Cloudinary;

namespace Ozikol_BCC.CloudinaryServices.Services
{
    /// <summary>
    /// Cloudinary-backed media, template, and asset management service.
    /// Supports dynamic multi-tenant credential resolution: routes uploads to autonomous tenant Cloudinary accounts
    /// when custom credentials are provided, or defaults to the Master platform account with organized folder scoping.
    /// </summary>
    public class CloudinaryService : ICloudinaryService
    {
        private readonly Cloudinary? _masterCloudinary;

        /// <summary>
        /// Initializes a new instance of the <see cref="CloudinaryService"/> class.
        /// Resolves platform Master credentials from configuration, environment variables, or database fallbacks.
        /// </summary>
        /// <param name="settings">Strongly typed Cloudinary configuration options.</param>
        /// <param name="configuration">Optional configuration provider.</param>
        public CloudinaryService(IOptions<CloudinarySettings> settings, IConfiguration? configuration = null)
        {
            // 1. Check for CLOUDINARY_URL format (e.g. cloudinary://apiKey:apiSecret@cloudName)
            var cloudinaryUrl = FirstNonEmpty(
                configuration?["CLOUDINARY_URL"],
                Environment.GetEnvironmentVariable("CLOUDINARY_URL")
            );

            if (!string.IsNullOrWhiteSpace(cloudinaryUrl))
            {
                try
                {
                    _masterCloudinary = new Cloudinary(cloudinaryUrl) { Api = { Secure = true } };
                    return;
                }
                catch
                {
                    // Fall back to discrete settings
                }
            }

            // 2. Resolve credentials strictly from settings, configuration, or environment variables (zero hardcoded secrets)
            var cloudName = FirstNonEmpty(
                settings?.Value?.CloudName,
                configuration?["CloudinarySettings:CloudName"],
                configuration?["CloudinarySettings__CloudName"],
                configuration?["CLOUDINARY_CLOUD_NAME"],
                Environment.GetEnvironmentVariable("CloudinarySettings__CloudName"),
                Environment.GetEnvironmentVariable("CLOUDINARY_CLOUD_NAME")
            );

            var apiKey = FirstNonEmpty(
                settings?.Value?.ApiKey,
                configuration?["CloudinarySettings:ApiKey"],
                configuration?["CloudinarySettings__ApiKey"],
                configuration?["CLOUDINARY_API_KEY"],
                Environment.GetEnvironmentVariable("CloudinarySettings__ApiKey"),
                Environment.GetEnvironmentVariable("CLOUDINARY_API_KEY")
            );

            var apiSecret = FirstNonEmpty(
                settings?.Value?.ApiSecret,
                configuration?["CloudinarySettings:ApiSecret"],
                configuration?["CloudinarySettings__ApiSecret"],
                configuration?["CLOUDINARY_API_SECRET"],
                Environment.GetEnvironmentVariable("CloudinarySettings__ApiSecret"),
                Environment.GetEnvironmentVariable("CLOUDINARY_API_SECRET")
            );

            if (!string.IsNullOrWhiteSpace(cloudName) && !string.IsNullOrWhiteSpace(apiKey) && !string.IsNullOrWhiteSpace(apiSecret))
            {
                var account = new Account(cloudName, apiKey, apiSecret);
                _masterCloudinary = new Cloudinary(account) { Api = { Secure = true } };
            }
        }

        private static string FirstNonEmpty(params string?[] candidates)
        {
            foreach (var c in candidates)
            {
                if (!string.IsNullOrWhiteSpace(c))
                {
                    return c.Trim();
                }
            }
            return string.Empty;
        }

        /// <summary>
        /// Resolves either a tenant's custom autonomous Cloudinary client or the platform master client.
        /// </summary>
        /// <param name="customCloudName">Optional tenant custom Cloud Name.</param>
        /// <param name="customApiKey">Optional tenant custom API Key.</param>
        /// <param name="customApiSecret">Optional tenant custom API Secret.</param>
        /// <returns>A configured <see cref="Cloudinary"/> instance.</returns>
        private Cloudinary GetClient(string? customCloudName, string? customApiKey, string? customApiSecret)
        {
            if (!string.IsNullOrWhiteSpace(customCloudName) &&
                !string.IsNullOrWhiteSpace(customApiKey) &&
                !string.IsNullOrWhiteSpace(customApiSecret))
            {
                var customAccount = new Account(customCloudName.Trim(), customApiKey.Trim(), customApiSecret.Trim());
                return new Cloudinary(customAccount) { Api = { Secure = true } };
            }

            if (_masterCloudinary == null)
            {
                throw new InvalidOperationException(
                    "Platform Master Cloudinary credentials are not configured. " +
                    "Please configure Cloudinary credentials in Central Platform Settings or environment variables.");
            }

            return _masterCloudinary;
        }

        /// <summary>
        /// Resolves the destination folder path in Cloudinary based on whether the upload is targeted
        /// at a custom autonomous tenant account (white-labeled) or the shared platform master account.
        /// </summary>
        /// <param name="folderName">The relative folder path requested.</param>
        /// <param name="isCustomTenant">Whether the upload is executing against a custom tenant account.</param>
        /// <returns>The normalized destination folder string.</returns>
        private static string ResolveTargetFolder(string folderName, bool isCustomTenant)
        {
            var cleaned = folderName.Trim().TrimStart('/');
            if (isCustomTenant)
            {
                // Autonomous tenant account: clean white-labeled folder directly in their bucket
                return cleaned;
            }

            // Shared platform master account: namespace with ozikol/
            return cleaned.StartsWith("ozikol/", StringComparison.OrdinalIgnoreCase)
                ? cleaned
                : $"ozikol/{cleaned}";
        }

        /// <inheritdoc />
        public async Task<string> UploadImageAsync(
            IFormFile file,
            string folderName = "templates",
            string? customCloudName = null,
            string? customApiKey = null,
            string? customApiSecret = null)
        {
            var (url, _) = await UploadImageWithPublicIdAsync(file, folderName, customCloudName, customApiKey, customApiSecret);
            return url;
        }

        /// <inheritdoc />
        public async Task<(string Url, string PublicId)> UploadImageWithPublicIdAsync(
            IFormFile file,
            string folderName = "templates",
            string? customCloudName = null,
            string? customApiKey = null,
            string? customApiSecret = null)
        {
            if (file == null || file.Length == 0)
                return (string.Empty, string.Empty);

            var isCustomTenant = !string.IsNullOrWhiteSpace(customCloudName);
            var client = GetClient(customCloudName, customApiKey, customApiSecret);
            var targetFolder = ResolveTargetFolder(folderName, isCustomTenant);

            using var stream = file.OpenReadStream();
            var uploadParams = new ImageUploadParams
            {
                File = new FileDescription(file.FileName, stream),
                Folder = targetFolder,
                UseFilename = true,
                UniqueFilename = true,
                Overwrite = false
            };

            var uploadResult = await client.UploadAsync(uploadParams);

            if (uploadResult.Error != null)
            {
                throw new InvalidOperationException($"Cloudinary image upload failed: {uploadResult.Error.Message}");
            }

            return (uploadResult.SecureUrl.ToString(), uploadResult.PublicId);
        }

        /// <inheritdoc />
        public async Task<string> UploadRawDocumentAsync(
            IFormFile file,
            string folderName = "documents",
            string? customCloudName = null,
            string? customApiKey = null,
            string? customApiSecret = null)
        {
            var (url, _) = await UploadRawDocumentWithPublicIdAsync(file, folderName, customCloudName, customApiKey, customApiSecret);
            return url;
        }

        /// <inheritdoc />
        public async Task<(string Url, string PublicId)> UploadRawDocumentWithPublicIdAsync(
            IFormFile file,
            string folderName = "documents",
            string? customCloudName = null,
            string? customApiKey = null,
            string? customApiSecret = null)
        {
            if (file == null || file.Length == 0)
                return (string.Empty, string.Empty);

            var isCustomTenant = !string.IsNullOrWhiteSpace(customCloudName);
            var client = GetClient(customCloudName, customApiKey, customApiSecret);
            var targetFolder = ResolveTargetFolder(folderName, isCustomTenant);

            using var stream = file.OpenReadStream();
            var uploadParams = new RawUploadParams
            {
                File = new FileDescription(file.FileName, stream),
                Folder = targetFolder,
                UseFilename = true,
                UniqueFilename = true,
                Overwrite = false
            };

            var uploadResult = await client.UploadAsync(uploadParams);

            if (uploadResult.Error != null)
            {
                throw new InvalidOperationException($"Cloudinary document upload failed: {uploadResult.Error.Message}");
            }

            return (uploadResult.SecureUrl.ToString(), uploadResult.PublicId);
        }

        /// <inheritdoc />
        public async Task<bool> DeleteImageAsync(
            string publicId,
            string? customCloudName = null,
            string? customApiKey = null,
            string? customApiSecret = null)
        {
            if (string.IsNullOrEmpty(publicId))
                return false;

            var client = GetClient(customCloudName, customApiKey, customApiSecret);
            var deleteParams = new DeletionParams(publicId);
            var result = await client.DestroyAsync(deleteParams);

            return result.Result == "ok";
        }

        /// <inheritdoc />
        public async Task<bool> ValidateCredentialsAsync(string cloudName, string apiKey, string apiSecret)
        {
            if (string.IsNullOrWhiteSpace(cloudName) || string.IsNullOrWhiteSpace(apiKey) || string.IsNullOrWhiteSpace(apiSecret))
                return false;

            try
            {
                var client = new Cloudinary(new Account(cloudName.Trim(), apiKey.Trim(), apiSecret.Trim())) { Api = { Secure = true } };

                // 1x1 transparent PNG pixel in Base64 for validation ping
                byte[] pixelBytes = Convert.FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAA=");
                using var memoryStream = new MemoryStream(pixelBytes);
                var uploadParams = new ImageUploadParams
                {
                    File = new FileDescription("ping_test.png", memoryStream),
                    Folder = "ping-verification",
                    PublicId = $"test_{Guid.NewGuid():N}"
                };

                var result = await client.UploadAsync(uploadParams);
                if (result.Error != null)
                {
                    return false;
                }

                // Cleanup verification asset immediately
                if (!string.IsNullOrEmpty(result.PublicId))
                {
                    await client.DestroyAsync(new DeletionParams(result.PublicId));
                }

                return true;
            }
            catch
            {
                return false;
            }
        }
    }
}
