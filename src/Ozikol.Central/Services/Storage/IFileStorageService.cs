using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;

namespace Ozikol.Central.Services.Storage;

/// <summary>
/// Defines vendor-agnostic file and document storage capabilities for candidate resumes,
/// identification records, and attachments.
/// </summary>
public interface IFileStorageService
{
    /// <summary>
    /// Uploads a candidate curriculum vitae / resume document (.pdf, .docx, .doc) to cloud storage.
    /// </summary>
    /// <param name="file">The uploaded file payload.</param>
    /// <param name="category">The organizational folder or category prefix.</param>
    /// <returns>Metadata describing the uploaded file including secure public URL.</returns>
    Task<FileUploadResult> UploadDocumentAsync(IFormFile file, string category = "careers/cv");

    /// <summary>
    /// Uploads a candidate passport or photo identification file (.pdf, .jpg, .jpeg, .png) to cloud storage.
    /// </summary>
    /// <param name="file">The uploaded file payload.</param>
    /// <param name="category">The organizational folder or category prefix.</param>
    /// <returns>Metadata describing the uploaded file including secure public URL.</returns>
    Task<FileUploadResult> UploadIdentificationAsync(IFormFile file, string category = "careers/passports");
}
