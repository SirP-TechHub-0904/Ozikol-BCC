using System.Text.Json.Serialization;

namespace Ozikol_BCC.EmailServices.Postmark.Models.Inbound;

/// <summary>
/// Represents an individual RFC-822 email header key-value pair extracted by Postmark.
/// </summary>
public class PostmarkInboundHeader
{
    /// <summary>
    /// Gets or sets the header name (e.g. "Message-ID", "In-Reply-To", "References").
    /// </summary>
    [JsonPropertyName("Name")]
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the header value.
    /// </summary>
    [JsonPropertyName("Value")]
    public string Value { get; set; } = string.Empty;
}
