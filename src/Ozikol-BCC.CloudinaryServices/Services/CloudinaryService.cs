using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;
using Ozikol_BCC.Application.Configuration;
using Ozikol_BCC.Application.Services.Cloudinary;
using System;
using System.IO;
using System.Threading.Tasks;

namespace Ozikol_BCC.CloudinaryServices.Services
{
    /// <summary>
    /// Cloudinary-backed media and asset management service.
    /// Manages direct Cloudinary API operations for images and raw documents across Central and Tenant platforms.
    /// </summary>
    public class CloudinaryService : ICloudinaryService
    {
        private readonly Cloudinary? _cloudinary;

        /// <summary>
        /// Initializes a new instance of the <see cref="CloudinaryService"/> class.
        /// Resolves Cloudinary credentials from configuration or environment variables.
        /// </summary>
        public CloudinaryService(IOptions<CloudinarySettings> settings, IConfiguration? configuration = null)
        {
            // 1. Check for CLOUDINARY_URL format (e.g. cloudinary://apiKey:apiSecret@cloudName)
            var cloudinaryUrl = configuration?["CLOUDINARY_URL"] ?? Environment.GetEnvironmentVariable("CLOUDINARY_URL");
            if (!string.IsNullOrWhiteSpace(cloudinaryUrl))
            {
                try
                {
                    _cloudinary = new Cloudinary(cloudinaryUrl) { Api = { Secure = true } };
                    return;
                }
                catch
                {
                    // Fall back to discrete settings
                }
            }

            // 2. Resolve credentials from settings or environment variables
            var cloudName = !string.IsNullOrWhiteSpace(settings.Value.CloudName) 
                ? settings.Value.CloudName 
                : (configuration?["CLOUDINARY_CLOUD_NAME"] ?? Environment.GetEnvironmentVariable("CLOUDINARY_CLOUD_NAME"));

            var apiKey = !string.IsNullOrWhiteSpace(settings.Value.ApiKey) 
                ? settings.Value.ApiKey 
                : (configuration?["CLOUDINARY_API_KEY"] ?? Environment.GetEnvironmentVariable("CLOUDINARY_API_KEY"));

            var apiSecret = !string.IsNullOrWhiteSpace(settings.Value.ApiSecret) 
                ? settings.Value.ApiSecret 
                : (configuration?["CLOUDINARY_API_SECRET"] ?? Environment.GetEnvironmentVariable("CLOUDINARY_API_SECRET"));

            if (!string.IsNullOrWhiteSpace(cloudName) && !string.IsNullOrWhiteSpace(apiKey) && !string.IsNullOrWhiteSpace(apiSecret))
            {
                var account = new Account(cloudName.Trim(), apiKey.Trim(), apiSecret.Trim());
                _cloudinary = new Cloudinary(account) { Api = { Secure = true } };
            }
        }

        /// <summary>
        /// Resolves either a tenant's custom Cloudinary client or the platform master client.
        /// </summary>
        private Cloudinary GetClient(string? customCloudName, string? customApiKey, string? customApiSecret)
        {
            if (!string.IsNullOrWhiteSpace(customCloudName) &&
                !string.IsNullOrWhiteSpace(customApiKey) &&
                !string.IsNullOrWhiteSpace(customApiSecret))
            {
                return new Cloudinary(new Account(customCloudName.Trim(), customApiKey.Trim(), customApiSecret.Trim())) { Api = { Secure = true } };
            }

            if (_cloudinary == null)
            {
                throw new InvalidOperationException("Cloudinary credentials are not configured on the server. Please provide CLOUDINARY_URL or CloudinarySettings.");
            }

            return _cloudinary;
        }

        /// <inheritdoc />
        public async Task<string> UploadImageAsync(IFormFile file, string folderName = "templates", string? customCloudName = null, string? customApiKey = null, string? customApiSecret = null)
        {
            var (url, _) = await UploadImageWithPublicIdAsync(file, folderName, customCloudName, customApiKey, customApiSecret);
            return url;
        }

        /// <inheritdoc />
        public async Task<(string Url, string PublicId)> UploadImageWithPublicIdAsync(IFormFile file, string folderName = "templates", string? customCloudName = null, string? customApiKey = null, string? customApiSecret = null)
        {
            if (file == null || file.Length == 0)
                return (string.Empty, string.Empty);

            var client = GetClient(customCloudName, customApiKey, customApiSecret);

            using var stream = file.OpenReadStream();
            var uploadParams = new ImageUploadParams
            {
                File = new FileDescription(file.FileName, stream),
                Folder = $"ozikol/{folderName}",
                UseFilename = true,
                UniqueFilename = true,
                Overwrite = false
            };

            var uploadResult = await client.UploadAsync(uploadParams);

            if (uploadResult.Error != null)
            {
                throw new Exception($"Cloudinary image upload failed: {uploadResult.Error.Message}");
            }

            return (uploadResult.SecureUrl.ToString(), uploadResult.PublicId);
        }

        /// <inheritdoc />
        public async Task<string> UploadRawDocumentAsync(IFormFile file, string folderName = "documents", string? customCloudName = null, string? customApiKey = null, string? customApiSecret = null)
        {
            var (url, _) = await UploadRawDocumentWithPublicIdAsync(file, folderName, customCloudName, customApiKey, customApiSecret);
            return url;
        }

        /// <inheritdoc />
        public async Task<(string Url, string PublicId)> UploadRawDocumentWithPublicIdAsync(IFormFile file, string folderName = "documents", string? customCloudName = null, string? customApiKey = null, string? customApiSecret = null)
        {
            if (file == null || file.Length == 0)
                return (string.Empty, string.Empty);

            var client = GetClient(customCloudName, customApiKey, customApiSecret);

            using var stream = file.OpenReadStream();
            var uploadParams = new RawUploadParams
            {
                File = new FileDescription(file.FileName, stream),
                Folder = $"ozikol/{folderName}",
                UseFilename = true,
                UniqueFilename = true,
                Overwrite = false
            };

            var uploadResult = await client.UploadAsync(uploadParams);

            if (uploadResult.Error != null)
            {
                throw new Exception($"Cloudinary document upload failed: {uploadResult.Error.Message}");
            }

            return (uploadResult.SecureUrl.ToString(), uploadResult.PublicId);
        }

        /// <inheritdoc />
        public async Task<bool> DeleteImageAsync(string publicId, string? customCloudName = null, string? customApiKey = null, string? customApiSecret = null)
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

                // 1x1 transparent PNG pixel in Base64
                byte[] pixelBytes = Convert.FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAA=");
                using var memoryStream = new MemoryStream(pixelBytes);
                var uploadParams = new ImageUploadParams
                {
                    File = new FileDescription("ping_test.png", memoryStream),
                    Folder = "ozikol/ping-verification",
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
