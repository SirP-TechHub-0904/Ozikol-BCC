using System;

namespace Ozikol_BCC.EmailServices.Postmark.Models;

/// <summary>
/// Represents a binary or text file attachment for outgoing Postmark transactional emails.
/// </summary>
public class EmailAttachment
{
    /// <summary>
    /// Gets or sets the name of the attached file (e.g. "invoice-1002.pdf", "report.xlsx").
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the MIME content type of the attachment (e.g. "application/pdf", "image/png").
    /// </summary>
    public string ContentType { get; set; } = "application/octet-stream";

    /// <summary>
    /// Gets or sets the raw byte content of the attachment.
    /// </summary>
    public byte[]? ContentBytes { get; set; }

    /// <summary>
    /// Gets or sets the Base64-encoded string representation of the attachment content.
    /// If ContentBytes is populated, it will be automatically converted to Base64 upon sending.
    /// </summary>
    public string? ContentBase64 { get; set; }

    /// <summary>
    /// Gets or sets the optional Content-ID for referencing this attachment inline in HTML bodies (e.g. &lt;img src="cid:logo.png" /&gt;).
    /// </summary>
    public string? ContentId { get; set; }

    /// <summary>
    /// Creates an attachment instance from raw byte array data.
    /// </summary>
    /// <param name="name">File name.</param>
    /// <param name="content">File bytes.</param>
    /// <param name="contentType">MIME type.</param>
    /// <returns>Populated EmailAttachment.</returns>
    public static EmailAttachment FromBytes(string name, byte[] content, string contentType = "application/octet-stream")
    {
        return new EmailAttachment
        {
            Name = name,
            ContentType = contentType,
            ContentBytes = content,
            ContentBase64 = Convert.ToBase64String(content)
        };
    }
}
