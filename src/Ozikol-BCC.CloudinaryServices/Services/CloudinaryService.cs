using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Options;
using Ozikol_BCC.Application.Configuration;
using Ozikol_BCC.Application.Services.Cloudinary;
using System;
using System.Threading.Tasks;

namespace Ozikol_BCC.CloudinaryServices.Services
{
    /// <summary>
    /// Cloudinary-backed media service. This project owns direct Cloudinary API calls;
    /// application code should depend on ICloudinaryService instead of provider classes.
    /// </summary>
    public class CloudinaryService : ICloudinaryService
    {
        private readonly Cloudinary _cloudinary;

        /// <summary>
        /// Expects CloudinarySettings to provide CloudName, ApiKey, and ApiSecret.
        /// Missing or invalid credentials will surface when Cloudinary operations run.
        /// </summary>
        public CloudinaryService(IOptions<CloudinarySettings> settings)
        {
            var account = new Account(
                settings.Value.CloudName,
                settings.Value.ApiKey,
                settings.Value.ApiSecret
            );

            _cloudinary = new Cloudinary(account);
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
                return new Cloudinary(new Account(customCloudName.Trim(), customApiKey.Trim(), customApiSecret.Trim()));
            }

            return _cloudinary;
        }

        /// <summary>
        /// Uploads an image to the requested Cloudinary folder and returns the secure URL.
        /// Null/empty files are treated as no-op input. Provider upload failures throw
        /// so calling workflows can stop and show a meaningful error.
        /// </summary>
        public async Task<string> UploadImageAsync(IFormFile file, string folderName = "templates", string? customCloudName = null, string? customApiKey = null, string? customApiSecret = null)
        {
            var (url, _) = await UploadImageWithPublicIdAsync(file, folderName, customCloudName, customApiKey, customApiSecret);
            return url;
        }

        /// <summary>
        /// Uploads an image with support for optional custom tenant credentials, returning the secure URL and public ID.
        /// </summary>
        public async Task<(string Url, string PublicId)> UploadImageWithPublicIdAsync(IFormFile file, string folderName = "templates", string? customCloudName = null, string? customApiKey = null, string? customApiSecret = null)
        {
            if (file == null || file.Length == 0)
                return (null!, null!);

            var client = GetClient(customCloudName, customApiKey, customApiSecret);

            using var stream = file.OpenReadStream();
            var uploadParams = new ImageUploadParams
            {
                File = new FileDescription(file.FileName, stream),
                Folder = folderName,
                // Keep the original file name for readability, but let Cloudinary make it unique.
                UseFilename = true,
                UniqueFilename = true,
                Overwrite = false
            };

            var uploadResult = await client.UploadAsync(uploadParams);

            if (uploadResult.Error != null)
            {
                throw new Exception($"Cloudinary upload failed: {uploadResult.Error.Message}");
            }

            return (uploadResult.SecureUrl.ToString(), uploadResult.PublicId);
        }

        /// <summary>
        /// Deletes an image by Cloudinary public ID, utilizing either custom tenant or platform master client.
        /// </summary>
        public async Task<bool> DeleteImageAsync(string publicId, string? customCloudName = null, string? customApiKey = null, string? customApiSecret = null)
        {
            if (string.IsNullOrEmpty(publicId))
                return false;

            var client = GetClient(customCloudName, customApiKey, customApiSecret);
            var deleteParams = new DeletionParams(publicId);
            var result = await client.DestroyAsync(deleteParams);

            return result.Result == "ok";
        }

        /// <summary>
        /// Validates tenant credentials by performing a micro test-upload and instant deletion.
        /// </summary>
        public async Task<bool> ValidateCredentialsAsync(string cloudName, string apiKey, string apiSecret)
        {
            if (string.IsNullOrWhiteSpace(cloudName) || string.IsNullOrWhiteSpace(apiKey) || string.IsNullOrWhiteSpace(apiSecret))
                return false;

            try
            {
                var client = new Cloudinary(new Account(cloudName.Trim(), apiKey.Trim(), apiSecret.Trim()));

                // 1x1 transparent PNG pixel in Base64
                byte[] pixelBytes = Convert.FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAA=");
                using var memoryStream = new System.IO.MemoryStream(pixelBytes);
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
