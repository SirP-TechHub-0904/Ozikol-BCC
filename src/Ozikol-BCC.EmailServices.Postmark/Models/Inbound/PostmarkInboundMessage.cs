using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json.Serialization;

namespace Ozikol_BCC.EmailServices.Postmark.Models.Inbound;

/// <summary>
/// Strongly-typed root model representing an inbound email webhook payload sent by Postmark.
/// Captures sender identity, recipients, mailbox hash tags, sanitized body text, HTML, and attachments.
/// </summary>
public class PostmarkInboundMessage
{
    /// <summary>
    /// Gets or sets the raw sender email address.
    /// </summary>
    [JsonPropertyName("From")]
    public string From { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the display name of the sender.
    /// </summary>
    [JsonPropertyName("FromName")]
    public string FromName { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets full structured sender details.
    /// </summary>
    [JsonPropertyName("FromFull")]
    public PostmarkInboundContact? FromFull { get; set; }

    /// <summary>
    /// Gets or sets the primary recipient email string.
    /// </summary>
    [JsonPropertyName("To")]
    public string To { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the collection of full structured primary recipients.
    /// </summary>
    [JsonPropertyName("ToFull")]
    public List<PostmarkInboundContact> ToFull { get; set; } = new();

    /// <summary>
    /// Gets or sets the comma-separated CC recipients string.
    /// </summary>
    [JsonPropertyName("Cc")]
    public string? Cc { get; set; }

    /// <summary>
    /// Gets or sets full structured CC recipients.
    /// </summary>
    [JsonPropertyName("CcFull")]
    public List<PostmarkInboundContact> CcFull { get; set; } = new();

    /// <summary>
    /// Gets or sets the comma-separated BCC recipients string.
    /// </summary>
    [JsonPropertyName("Bcc")]
    public string? Bcc { get; set; }

    /// <summary>
    /// Gets or sets full structured BCC recipients.
    /// </summary>
    [JsonPropertyName("BccFull")]
    public List<PostmarkInboundContact> BccFull { get; set; } = new();

    /// <summary>
    /// Gets or sets the original recipient address before forwarding (if any).
    /// </summary>
    [JsonPropertyName("OriginalRecipient")]
    public string? OriginalRecipient { get; set; }

    /// <summary>
    /// Gets or sets the subject line of the email.
    /// </summary>
    [JsonPropertyName("Subject")]
    public string Subject { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the unique Postmark Message ID (GUID).
    /// </summary>
    [JsonPropertyName("MessageID")]
    public string MessageID { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the Reply-To address specified in the email.
    /// </summary>
    [JsonPropertyName("ReplyTo")]
    public string? ReplyTo { get; set; }

    /// <summary>
    /// Gets or sets the mailbox sub-addressing hash tag (e.g. "ticket-4082" for "support+ticket-4082@inbound.ozikol.cloud").
    /// Postmark automatically extracts this tag from the recipient address.
    /// </summary>
    [JsonPropertyName("MailboxHash")]
    public string? MailboxHash { get; set; }

    /// <summary>
    /// Gets or sets the timestamp string when the email was received by Postmark.
    /// </summary>
    [JsonPropertyName("Date")]
    public string? Date { get; set; }

    /// <summary>
    /// Gets or sets the plain-text body content of the email.
    /// </summary>
    [JsonPropertyName("TextBody")]
    public string? TextBody { get; set; }

    /// <summary>
    /// Gets or sets the rich HTML body content of the email.
    /// </summary>
    [JsonPropertyName("HtmlBody")]
    public string? HtmlBody { get; set; }

    /// <summary>
    /// Gets or sets the clean, isolated new reply text stripped of previous quoted message history.
    /// Essential for cleanly capturing customer replies in support ticketing systems.
    /// </summary>
    [JsonPropertyName("StrippedTextReply")]
    public string? StrippedTextReply { get; set; }

    /// <summary>
    /// Gets or sets the tag associated with this message stream or inbound rule.
    /// </summary>
    [JsonPropertyName("Tag")]
    public string? Tag { get; set; }

    /// <summary>
    /// Gets or sets the collection of raw email headers.
    /// </summary>
    [JsonPropertyName("Headers")]
    public List<PostmarkInboundHeader> Headers { get; set; } = new();

    /// <summary>
    /// Gets or sets the collection of file attachments included in the email.
    /// </summary>
    [JsonPropertyName("Attachments")]
    public List<PostmarkInboundAttachment> Attachments { get; set; } = new();

    /// <summary>
    /// Gets a value indicating whether this inbound message contains one or more attachments.
    /// </summary>
    [JsonIgnore]
    public bool HasAttachments => Attachments != null && Attachments.Count > 0;

    /// <summary>
    /// Retrieves the value of a specific header by case-insensitive name match.
    /// </summary>
    /// <param name="headerName">The header name to find (e.g. "In-Reply-To", "Message-ID").</param>
    /// <returns>The header value if found; otherwise, null.</returns>
    public string? GetHeaderValue(string headerName)
    {
        if (string.IsNullOrWhiteSpace(headerName) || Headers == null)
        {
            return null;
        }

        return Headers.FirstOrDefault(h => string.Equals(h.Name, headerName, StringComparison.OrdinalIgnoreCase))?.Value;
    }

    /// <summary>
    /// Returns the cleanest available text representation of the message body (preferring <see cref="StrippedTextReply"/>, then <see cref="TextBody"/>).
    /// </summary>
    /// <returns>The extracted text message content.</returns>
    public string GetCleanMessageBody()
    {
        if (!string.IsNullOrWhiteSpace(StrippedTextReply))
        {
            return StrippedTextReply.Trim();
        }

        if (!string.IsNullOrWhiteSpace(TextBody))
        {
            return TextBody.Trim();
        }

        return string.Empty;
    }
}
