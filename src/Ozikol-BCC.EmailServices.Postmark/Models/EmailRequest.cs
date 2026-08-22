namespace Ozikol_BCC.EmailServices.Postmark.Models;

/// <summary>
/// Provider-neutral email request shape used by the Postmark adapter.
/// Callers can override From, but the service falls back to configured SenderEmail.
/// </summary>
public class EmailRequest
{
    public string To { get; set; } = string.Empty;
    public string From { get; set; } = string.Empty; // Optional: Override default sender
    public string Cc { get; set; } = string.Empty;
    public string Bcc { get; set; } = string.Empty;
    
    public string Subject { get; set; } = string.Empty;
    public string HtmlBody { get; set; } = string.Empty;
    public string TextBody { get; set; } = string.Empty;
    public string MessageStream { get; set; } = "outbound";
    
    public bool TrackOpens { get; set; } = true;

    /// <summary>
    /// Must match a Postmark LinkTrackingOptions value, such as None, HtmlOnly,
    /// TextOnly, or HtmlAndText.
    /// </summary>
    public string TrackLinks { get; set; } = "HtmlAndText";
    
    // For Template emails
    public long? TemplateId { get; set; }
    public string? TemplateAlias { get; set; }
    public Dictionary<string, object>? TemplateModel { get; set; }
}
