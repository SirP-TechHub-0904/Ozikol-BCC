using System;
using System.Collections.Generic;

namespace Ozikol_BCC.EmailServices.Postmark.Models;

/// <summary>
/// Encapsulates parameters for rendering and delivering server-side Postmark template emails.
/// </summary>
public class TemplateEmailRequest
{
    /// <summary>
    /// Gets or sets the recipient email address (single or comma-separated).
    /// </summary>
    public string To { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets an optional custom sender email. Falls back to configured PostmarkOptions.SenderEmail.
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
    /// Gets or sets optional Reply-To address.
    /// </summary>
    public string? ReplyTo { get; set; }

    /// <summary>
    /// Gets or sets the numeric template ID created in the Postmark dashboard.
    /// Specify either TemplateId or TemplateAlias.
    /// </summary>
    public long? TemplateId { get; set; }

    /// <summary>
    /// Gets or sets the string template alias (e.g. "welcome-email", "password-reset").
    /// Specify either TemplateId or TemplateAlias.
    /// </summary>
    public string? TemplateAlias { get; set; }

    /// <summary>
    /// Gets or sets the dynamic template model object or dictionary mapping values into template placeholder tags.
    /// </summary>
    public object? TemplateModel { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether CSS should be inlined into HTML elements.
    /// </summary>
    public bool InlineCss { get; set; } = true;

    /// <summary>
    /// Gets or sets whether email open tracking is enabled.
    /// </summary>
    public bool TrackOpens { get; set; } = true;

    /// <summary>
    /// Gets or sets the link tracking mode: "None", "HtmlOnly", "TextOnly", or "HtmlAndText".
    /// </summary>
    public string TrackLinks { get; set; } = "HtmlAndText";

    /// <summary>
    /// Gets or sets the outbound message stream identifier (e.g. "outbound", "broadcast").
    /// </summary>
    public string MessageStream { get; set; } = "outbound";

    /// <summary>
    /// Gets or sets an optional campaign or category tag for analytics.
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
}
