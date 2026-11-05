using System;
using System.IO;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;

namespace Ozikol_BCC.EmailServices.Postmark.Models.Inbound;

/// <summary>
/// Represents a binary or document file attached to an inbound email payload delivered via Postmark.
/// Provides high-performance decoding helpers for streaming and cloud storage persistence.
/// </summary>
public class PostmarkInboundAttachment
{
    /// <summary>
    /// Gets or sets the original filename of the attachment (e.g. "invoice.pdf", "error_log.png").
    /// </summary>
    [JsonPropertyName("Name")]
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the Base64-encoded binary payload of the file content.
    /// </summary>
    [JsonPropertyName("Content")]
    public string Content { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the MIME content type (e.g. "application/pdf", "image/png").
    /// </summary>
    [JsonPropertyName("ContentType")]
    public string ContentType { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the raw byte length of the file as declared in the email headers.
    /// </summary>
    [JsonPropertyName("ContentLength")]
    public long ContentLength { get; set; }

    /// <summary>
    /// Gets or sets the optional Content-ID header for inline embedded images.
    /// </summary>
    [JsonPropertyName("ContentID")]
    public string? ContentID { get; set; }

    /// <summary>
    /// Decodes the Base64 payload and returns the raw binary byte array.
    /// </summary>
    /// <returns>A byte array containing the decoded file data, or empty array if Content is blank.</returns>
    public byte[] GetBytes()
    {
        if (string.IsNullOrWhiteSpace(Content))
        {
            return Array.Empty<byte>();
        }

        return Convert.FromBase64String(Content);
    }

    /// <summary>
    /// Opens a memory stream containing the decoded binary data, ready for piping to cloud storage providers (S3, Cloudinary).
    /// </summary>
    /// <returns>A seekable <see cref="MemoryStream"/> of the file bytes.</returns>
    public Stream OpenReadStream()
    {
        var bytes = GetBytes();
        return new MemoryStream(bytes, writable: false);
    }

    /// <summary>
    /// Writes the decoded attachment bytes directly to a destination disk path.
    /// </summary>
    /// <param name="destinationPath">The full target file path.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    public async Task SaveToFileAsync(string destinationPath, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(destinationPath))
        {
            throw new ArgumentNullException(nameof(destinationPath));
        }

        var directory = Path.GetDirectoryName(destinationPath);
        if (!string.IsNullOrEmpty(directory) && !Directory.Exists(directory))
        {
            Directory.CreateDirectory(directory);
        }

        var bytes = GetBytes();
        await File.WriteAllBytesAsync(destinationPath, bytes, cancellationToken);
    }
}
