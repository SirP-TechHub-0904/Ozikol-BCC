using System;
using System.Text.Json.Serialization;

namespace Ozikol_BCC.EmailServices.Postmark.Models.Webhooks;

/// <summary>
/// Strongly-typed payload model for Postmark Delivery Confirmation Webhooks.
/// Dispatched when an outbound email is successfully accepted by the destination mail server.
/// </summary>
public class PostmarkDeliveryWebhook
{
    /// <summary>
    /// Gets or sets the unique Postmark Message ID (GUID) that was delivered.
    /// </summary>
    [JsonPropertyName("MessageID")]
    public string MessageID { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the recipient email address.
    /// </summary>
    [JsonPropertyName("Recipient")]
    public string Recipient { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the organizational tag if provided during dispatch.
    /// </summary>
    [JsonPropertyName("Tag")]
    public string? Tag { get; set; }

    /// <summary>
    /// Gets or sets the timestamp when delivery was confirmed.
    /// </summary>
    [JsonPropertyName("DeliveredAt")]
    public DateTime DeliveredAt { get; set; }

    /// <summary>
    /// Gets or sets the raw SMTP response line returned by the recipient server (e.g. "250 2.0.0 OK ...").
    /// </summary>
    [JsonPropertyName("Details")]
    public string? Details { get; set; }
}
