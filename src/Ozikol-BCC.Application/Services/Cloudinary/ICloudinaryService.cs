using Microsoft.AspNetCore.Http;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Services.Cloudinary
{
    /// <summary>
    /// Image storage abstraction for Cloudinary-backed uploads and deletes.
    /// Supports platform master credentials by default, with optional per-tenant custom credentials.
    /// </summary>
    public interface ICloudinaryService
    {
        /// <summary>
        /// Uploads an image to the requested Cloudinary folder and returns the secure URL.
        /// </summary>
        Task<string> UploadImageAsync(IFormFile file, string folderName = "templates", string? customCloudName = null, string? customApiKey = null, string? customApiSecret = null);

        /// <summary>
        /// Uploads an image and returns both the secure URL and public ID for future modifications or deletions.
        /// </summary>
        Task<(string Url, string PublicId)> UploadImageWithPublicIdAsync(IFormFile file, string folderName = "templates", string? customCloudName = null, string? customApiKey = null, string? customApiSecret = null);

        /// <summary>
        /// Deletes an image by public ID.
        /// </summary>
        Task<bool> DeleteImageAsync(string publicId, string? customCloudName = null, string? customApiKey = null, string? customApiSecret = null);

        /// <summary>
        /// Validates whether a set of Cloudinary credentials (cloud name, API key, API secret) are active and authentic.
        /// </summary>
        Task<bool> ValidateCredentialsAsync(string cloudName, string apiKey, string apiSecret);
    }
}
