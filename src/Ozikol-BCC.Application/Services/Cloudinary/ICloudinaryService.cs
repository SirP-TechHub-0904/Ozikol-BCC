using Microsoft.AspNetCore.Http;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Services.Cloudinary
{
    /// <summary>
    /// Image and document storage abstraction for Cloudinary-backed uploads and deletes.
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
        /// Uploads a raw document/file (e.g. PDF, DOCX, ZIP) to Cloudinary and returns the secure URL.
        /// </summary>
        Task<string> UploadRawDocumentAsync(IFormFile file, string folderName = "documents", string? customCloudName = null, string? customApiKey = null, string? customApiSecret = null);

        /// <summary>
        /// Uploads a raw document/file and returns both the secure URL and public ID.
        /// </summary>
        Task<(string Url, string PublicId)> UploadRawDocumentWithPublicIdAsync(IFormFile file, string folderName = "documents", string? customCloudName = null, string? customApiKey = null, string? customApiSecret = null);

        /// <summary>
        /// Deletes an asset by public ID.
        /// </summary>
        Task<bool> DeleteImageAsync(string publicId, string? customCloudName = null, string? customApiKey = null, string? customApiSecret = null);

        /// <summary>
        /// Validates whether a set of Cloudinary credentials (cloud name, API key, API secret) are active and authentic.
        /// </summary>
        Task<bool> ValidateCredentialsAsync(string cloudName, string apiKey, string apiSecret);
    }
}
