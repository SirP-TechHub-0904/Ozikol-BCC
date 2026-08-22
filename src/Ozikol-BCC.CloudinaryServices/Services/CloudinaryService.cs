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
        /// Uploads an image to the requested Cloudinary folder and returns the secure URL.
        /// Null/empty files are treated as no-op input. Provider upload failures throw
        /// so calling workflows can stop and show a meaningful error.
        /// </summary>
        public async Task<string> UploadImageAsync(IFormFile file, string folderName = "templates")
        {
            var (url, _) = await UploadImageWithPublicIdAsync(file, folderName);
            return url;
        }

        public async Task<(string Url, string PublicId)> UploadImageWithPublicIdAsync(IFormFile file, string folderName = "templates")
        {
            if (file == null || file.Length == 0)
                return (null!, null!);

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

            var uploadResult = await _cloudinary.UploadAsync(uploadParams);

            if (uploadResult.Error != null)
            {
                throw new Exception($"Cloudinary upload failed: {uploadResult.Error.Message}");
            }

            return (uploadResult.SecureUrl.ToString(), uploadResult.PublicId);
        }

        /// <summary>
        /// Deletes an image by Cloudinary public ID. The caller must store the public ID
        /// separately from the secure URL if delete/replace behavior is required.
        /// </summary>
        public async Task<bool> DeleteImageAsync(string publicId)
        {
            if (string.IsNullOrEmpty(publicId))
                return false;

            var deleteParams = new DeletionParams(publicId);
            var result = await _cloudinary.DestroyAsync(deleteParams);

            return result.Result == "ok";
        }
    }
}
