using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Ozikol_BCC.Application.Services.Cloudinary;

namespace Ozikol.Central.Services.Storage;

/// <summary>
/// Implementation of <see cref="IFileStorageService"/> delegating to the dedicated <see cref="ICloudinaryService"/>
/// with local safe fallback storage for offline development.
/// </summary>
public class CloudinaryFileStorageService : IFileStorageService
{
    private readonly ICloudinaryService _cloudinaryService;
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<CloudinaryFileStorageService> _logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="CloudinaryFileStorageService"/> class.
    /// </summary>
    public CloudinaryFileStorageService(
        ICloudinaryService cloudinaryService,
        IWebHostEnvironment environment,
        ILogger<CloudinaryFileStorageService> logger)
    {
        _cloudinaryService = cloudinaryService ?? throw new ArgumentNullException(nameof(cloudinaryService));
        _environment = environment ?? throw new ArgumentNullException(nameof(environment));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <inheritdoc />
    public async Task<FileUploadResult> UploadDocumentAsync(IFormFile file, string category = "careers/cv")
    {
        if (file == null || file.Length == 0)
        {
            throw new ArgumentException("The specified file is null or empty.", nameof(file));
        }

        var safeOriginalName = Path.GetFileName(file.FileName);

        try
        {
            var (url, publicId) = await _cloudinaryService.UploadRawDocumentWithPublicIdAsync(file, category);
            if (!string.IsNullOrEmpty(url))
            {
                return new FileUploadResult
                {
                    OriginalFileName = safeOriginalName,
                    SecureUrl = url,
                    FileSizeBytes = file.Length,
                    ContentType = file.ContentType,
                    PublicId = publicId
                };
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Cloudinary document upload failed. Falling back to local secure storage.");
        }

        return await SaveToLocalStorageAsync(file, category, safeOriginalName);
    }

    /// <inheritdoc />
    public async Task<FileUploadResult> UploadIdentificationAsync(IFormFile file, string category = "careers/passports")
    {
        if (file == null || file.Length == 0)
        {
            throw new ArgumentException("The specified file is null or empty.", nameof(file));
        }

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        var safeOriginalName = Path.GetFileName(file.FileName);
        var isImage = ext is ".jpg" or ".jpeg" or ".png" or ".webp";

        try
        {
            var (url, publicId) = isImage
                ? await _cloudinaryService.UploadImageWithPublicIdAsync(file, category)
                : await _cloudinaryService.UploadRawDocumentWithPublicIdAsync(file, category);

            if (!string.IsNullOrEmpty(url))
            {
                return new FileUploadResult
                {
                    OriginalFileName = safeOriginalName,
                    SecureUrl = url,
                    FileSizeBytes = file.Length,
                    ContentType = file.ContentType,
                    PublicId = publicId
                };
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Cloudinary identification upload failed. Falling back to local storage.");
        }

        return await SaveToLocalStorageAsync(file, category, safeOriginalName);
    }

    private async Task<FileUploadResult> SaveToLocalStorageAsync(IFormFile file, string category, string originalName)
    {
        var relativeDir = Path.Combine("uploads", category.Replace('/', Path.DirectorySeparatorChar));
        var absoluteDir = Path.Combine(_environment.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"), relativeDir);

        if (!Directory.Exists(absoluteDir))
        {
            Directory.CreateDirectory(absoluteDir);
        }

        var uniqueFileName = $"{Guid.NewGuid():N}_{originalName}";
        var absoluteFilePath = Path.Combine(absoluteDir, uniqueFileName);

        using (var outputStream = new FileStream(absoluteFilePath, FileMode.Create))
        {
            await file.CopyToAsync(outputStream);
        }

        var publicUrl = $"/{relativeDir.Replace(Path.DirectorySeparatorChar, '/')}/{uniqueFileName}";

        return new FileUploadResult
        {
            OriginalFileName = originalName,
            SecureUrl = publicUrl,
            FileSizeBytes = file.Length,
            ContentType = file.ContentType,
            PublicId = uniqueFileName
        };
    }
}
