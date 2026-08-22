using Microsoft.AspNetCore.Http;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Services.Cloudinary
{
    /// <summary>
    /// Image storage abstraction for Cloudinary-backed uploads and deletes.
    /// BCP UI code should depend on this contract instead of Cloudinary SDK details.
    /// </summary>
    public interface ICloudinaryService
    {
        Task<string> UploadImageAsync(IFormFile file, string folderName = "templates");
        Task<(string Url, string PublicId)> UploadImageWithPublicIdAsync(IFormFile file, string folderName = "templates");
        Task<bool> DeleteImageAsync(string publicId);
    }
}
