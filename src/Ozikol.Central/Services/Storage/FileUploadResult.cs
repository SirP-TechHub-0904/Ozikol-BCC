using System;

namespace Ozikol.Central.Services.Storage;

/// <summary>
/// Encapsulates metadata and secure access URL for an uploaded candidate document or file.
/// </summary>
public class FileUploadResult
{
    /// <summary>
    /// Gets or sets the original filename as supplied by the client.
    /// </summary>
    public string OriginalFileName { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the secure public CDN URL to access the uploaded file.
    /// </summary>
    public string SecureUrl { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the file size in bytes.
    /// </summary>
    public long FileSizeBytes { get; set; }

    /// <summary>
    /// Gets or sets the detected content MIME type.
    /// </summary>
    public string ContentType { get; set; } = "application/octet-stream";

    /// <summary>
    /// Gets or sets the cloud storage provider asset public identifier if applicable.
    /// </summary>
    public string? PublicId { get; set; }
}
