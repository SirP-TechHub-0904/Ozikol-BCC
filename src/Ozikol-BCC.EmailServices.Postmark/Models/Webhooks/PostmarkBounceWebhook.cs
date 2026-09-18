using System;
using System.Text.Json.Serialization;

namespace Ozikol_BCC.EmailServices.Postmark.Models.Webhooks;

/// <summary>
/// Strongly-typed payload model for Postmark Bounce Webhooks.
/// Dispatched when an outbound email cannot be delivered (HardBounce, Transient/SoftBounce, SpamComplaint, etc.).
/// </summary>
public class PostmarkBounceWebhook
{
    /// <summary>
    /// Gets or sets the unique bounce record ID in Postmark.
    /// </summary>
    [JsonPropertyName("ID")]
    public long ID { get; set; }

    /// <summary>
    /// Gets or sets the Postmark numeric bounce type code.
    /// </summary>
    [JsonPropertyName("TypeCode")]
    public int TypeCode { get; set; }

    /// <summary>
    /// Gets or sets the descriptive bounce type name (e.g. "HardBounce", "SoftBounce", "SpamComplaint", "Transient").
    /// </summary>
    [JsonPropertyName("Type")]
    public string Type { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the specific technical reason provided by the recipient's mail server.
    /// </summary>
    [JsonPropertyName("Name")]
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the recipient email address that bounced.
    /// </summary>
    [JsonPropertyName("Email")]
    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the original Postmark Message ID (GUID) of the email that bounced.
    /// </summary>
    [JsonPropertyName("MessageID")]
    public string MessageID { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the server token / stream tag if provided when the email was originally sent.
    /// </summary>
    [JsonPropertyName("Tag")]
    public string? Tag { get; set; }

    /// <summary>
    /// Gets or sets the raw SMTP description or error message from the destination mail server.
    /// </summary>
    [JsonPropertyName("Description")]
    public string? Description { get; set; }

    /// <summary>
    /// Gets or sets the timestamp when the bounce was recorded.
    /// </summary>
    [JsonPropertyName("BouncedAt")]
    public DateTime BouncedAt { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether this bounce resulted in the recipient address being automatically deactivated in Postmark.
    /// </summary>
    [JsonPropertyName("Inactive")]
    public bool Inactive { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether this bounce is eligible for activation/retry.
    /// </summary>
    [JsonPropertyName("CanActivate")]
    public bool CanActivate { get; set; }

    /// <summary>
    /// Gets or sets the original subject of the bounced email.
    /// </summary>
    [JsonPropertyName("Subject")]
    public string? Subject { get; set; }

    /// <summary>
    /// Gets a value indicating whether this is a permanent hard bounce (recipient address does not exist or domain is invalid).
    /// </summary>
    [JsonIgnore]
    public bool IsHardBounce => TypeCode == 1 || string.Equals(Type, "HardBounce", StringComparison.OrdinalIgnoreCase);

    /// <summary>
    /// Gets a value indicating whether this event represents a user spam complaint.
    /// </summary>
    [JsonIgnore]
    public bool IsSpamComplaint => TypeCode == 512 || string.Equals(Type, "SpamComplaint", StringComparison.OrdinalIgnoreCase);
}
