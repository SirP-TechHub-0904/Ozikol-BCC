using System;
using System.Collections.Generic;

namespace Ozikol_BCC.EmailServices.Postmark.Models;

/// <summary>
/// Universal provider-neutral outbound email delivery request shape.
/// Supports plain text, rich HTML, custom streams, tags, key-value metadata, and binary file attachments.
/// </summary>
public class EmailRequest
{
    /// <summary>
    /// Gets or sets the primary recipient email address (single or comma-separated).
    /// </summary>
    public string To { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets an optional sender email address. Falls back to configured PostmarkOptions.SenderEmail.
    /// </summary>
    public string? From { get; set; }

    /// <summary>
    /// Gets or sets optional CC recipient address(es).
    /// </summary>
    public string? Cc { get; set; }

    /// <summary>
    /// Gets or sets optional BCC recipient address(es).
    /// </summary>
    public string? Bcc { get; set; }

    /// <summary>
    /// Gets or sets optional Reply-To email address.
    /// </summary>
    public string? ReplyTo { get; set; }

    /// <summary>
    /// Gets or sets the email subject line.
    /// </summary>
    public string Subject { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the rich HTML body content.
    /// </summary>
    public string? HtmlBody { get; set; }

    /// <summary>
    /// Gets or sets the plain text fallback body content.
    /// </summary>
    public string? TextBody { get; set; }

    /// <summary>
    /// Gets or sets the Postmark message stream (e.g. "outbound" for transactional, "broadcast" for announcements).
    /// Defaults to "outbound".
    /// </summary>
    public string MessageStream { get; set; } = "outbound";

    /// <summary>
    /// Gets or sets a value indicating whether open tracking pixel is embedded.
    /// </summary>
    public bool TrackOpens { get; set; } = true;

    /// <summary>
    /// Gets or sets the link tracking mode: "None", "HtmlOnly", "TextOnly", or "HtmlAndText".
    /// </summary>
    public string TrackLinks { get; set; } = "HtmlAndText";

    /// <summary>
    /// Gets or sets an optional organizational or feature tag (e.g. "auth-2fa", "crash-alert", "invoice").
    /// </summary>
    public string? Tag { get; set; }

    /// <summary>
    /// Gets or sets key-value metadata pairs attached to the delivery event for auditing and webhooks.
    /// </summary>
    public Dictionary<string, string>? Metadata { get; set; }

    /// <summary>
    /// Gets or sets optional file attachments.
    /// </summary>
    public List<EmailAttachment>? Attachments { get; set; }

    // Template properties for optional template fallback
    public long? TemplateId { get; set; }
    public string? TemplateAlias { get; set; }
    public Dictionary<string, object>? TemplateModel { get; set; }
}
