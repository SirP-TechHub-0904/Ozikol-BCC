using System;
using System.IO;
using System.Threading.Tasks;
using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Ozikol.Central.Services.Storage;

/// <summary>
/// Cloudinary-backed implementation of <see cref="IFileStorageService"/> providing cloud asset
/// uploads for resumes and identification documents with safe local directory fallback.
/// </summary>
public class CloudinaryFileStorageService : IFileStorageService
{
    private readonly Cloudinary? _cloudinary;
    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<CloudinaryFileStorageService> _logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="CloudinaryFileStorageService"/> class.
    /// Resolves Cloudinary credentials from configuration or environment variables.
    /// </summary>
    /// <param name="configuration">Application configuration.</param>
    /// <param name="environment">Hosting environment.</param>
    /// <param name="logger">Logger provider.</param>
    public CloudinaryFileStorageService(
        IConfiguration configuration,
        IWebHostEnvironment environment,
        ILogger<CloudinaryFileStorageService> logger)
    {
        _environment = environment ?? throw new ArgumentNullException(nameof(environment));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));

        // 1. Check for CLOUDINARY_URL format (e.g. cloudinary://apiKey:apiSecret@cloudName)
        var cloudinaryUrl = configuration["CLOUDINARY_URL"] ?? Environment.GetEnvironmentVariable("CLOUDINARY_URL");
        if (!string.IsNullOrWhiteSpace(cloudinaryUrl))
        {
            try
            {
                _cloudinary = new Cloudinary(cloudinaryUrl);
                _cloudinary.Api.Secure = true;
                _logger.LogInformation("Cloudinary initialized via CLOUDINARY_URL.");
                return;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to initialize Cloudinary from CLOUDINARY_URL.");
            }
        }

        // 2. Check for explicit CloudinarySettings credentials
        var cloudName = configuration["CloudinarySettings:CloudName"] 
                     ?? configuration["CLOUDINARY_CLOUD_NAME"] 
                     ?? Environment.GetEnvironmentVariable("CLOUDINARY_CLOUD_NAME");
        var apiKey = configuration["CloudinarySettings:ApiKey"] 
                  ?? configuration["CLOUDINARY_API_KEY"] 
                  ?? Environment.GetEnvironmentVariable("CLOUDINARY_API_KEY");
        var apiSecret = configuration["CloudinarySettings:ApiSecret"] 
                     ?? configuration["CLOUDINARY_API_SECRET"] 
                     ?? Environment.GetEnvironmentVariable("CLOUDINARY_API_SECRET");

        if (!string.IsNullOrWhiteSpace(cloudName) && !string.IsNullOrWhiteSpace(apiKey) && !string.IsNullOrWhiteSpace(apiSecret))
        {
            var account = new Account(cloudName, apiKey, apiSecret);
            _cloudinary = new Cloudinary(account);
            _cloudinary.Api.Secure = true;
            _logger.LogInformation("Cloudinary initialized successfully for cloud storage.");
        }
        else
        {
            _logger.LogWarning("Cloudinary credentials not configured. Local fallback storage will be utilized for uploaded attachments.");
        }
    }

    /// <inheritdoc />
    public async Task<FileUploadResult> UploadDocumentAsync(IFormFile file, string category = "careers/cv")
    {
        if (file == null || file.Length == 0)
        {
            throw new ArgumentException("The specified file is null or empty.", nameof(file));
        }

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        var safeOriginalName = Path.GetFileName(file.FileName);

        // If Cloudinary is configured, upload as a raw asset
        if (_cloudinary != null)
        {
            try
            {
                using var stream = file.OpenReadStream();
                var uploadParams = new RawUploadParams
                {
                    File = new FileDescription(safeOriginalName, stream),
                    Folder = $"ozikol/{category}",
                    UseFilename = true,
                    UniqueFilename = true,
                    Overwrite = false
                };

                var result = await _cloudinary.UploadAsync(uploadParams);
                if (result.Error != null)
                {
                    _logger.LogWarning("Cloudinary raw upload error: {Message}. Falling back to local storage.", result.Error.Message);
                }
                else
                {
                    return new FileUploadResult
                    {
                        OriginalFileName = safeOriginalName,
                        SecureUrl = result.SecureUrl.ToString(),
                        FileSizeBytes = file.Length,
                        ContentType = file.ContentType,
                        PublicId = result.PublicId
                    };
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Cloudinary document upload failed. Resorting to local secure storage fallback.");
            }
        }

        // Local fallback storage
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

        // If Cloudinary is configured, upload accordingly
        if (_cloudinary != null)
        {
            try
            {
                using var stream = file.OpenReadStream();
                if (isImage)
                {
                    var uploadParams = new ImageUploadParams
                    {
                        File = new FileDescription(safeOriginalName, stream),
                        Folder = $"ozikol/{category}",
                        UseFilename = true,
                        UniqueFilename = true,
                        Overwrite = false
                    };

                    var result = await _cloudinary.UploadAsync(uploadParams);
                    if (result.Error == null)
                    {
                        return new FileUploadResult
                        {
                            OriginalFileName = safeOriginalName,
                            SecureUrl = result.SecureUrl.ToString(),
                            FileSizeBytes = file.Length,
                            ContentType = file.ContentType,
                            PublicId = result.PublicId
                        };
                    }
                }
                else
                {
                    var uploadParams = new RawUploadParams
                    {
                        File = new FileDescription(safeOriginalName, stream),
                        Folder = $"ozikol/{category}",
                        UseFilename = true,
                        UniqueFilename = true,
                        Overwrite = false
                    };

                    var result = await _cloudinary.UploadAsync(uploadParams);
                    if (result.Error == null)
                    {
                        return new FileUploadResult
                        {
                            OriginalFileName = safeOriginalName,
                            SecureUrl = result.SecureUrl.ToString(),
                            FileSizeBytes = file.Length,
                            ContentType = file.ContentType,
                            PublicId = result.PublicId
                        };
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Cloudinary identification upload failed. Resorting to local fallback.");
            }
        }

        // Local fallback storage
        return await SaveToLocalStorageAsync(file, category, safeOriginalName);
    }

    /// <summary>
    /// Fallback storage mechanism saving uploaded files into safe local wwwroot directory.
    /// </summary>
    private async Task<FileUploadResult> SaveToLocalStorageAsync(IFormFile file, string category, string originalName)
    {
        var relativeDir = Path.Combine("uploads", category.Replace('/', Path.DirectorySeparatorChar));
        var absoluteDir = Path.Combine(_environment.WebRootPath, relativeDir);

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
