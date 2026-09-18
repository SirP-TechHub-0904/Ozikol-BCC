using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Ozikol_BCC.EmailServices.Postmark.Interfaces;
using Ozikol_BCC.EmailServices.Postmark.Models.Inbound;
using Ozikol_BCC.EmailServices.Postmark.Models.Webhooks;

namespace Ozikol_BCC.EmailServices.Postmark.Services;

/// <summary>
/// High-performance, thread-safe parser for Postmark inbound emails, bounces, and delivery webhooks.
/// </summary>
public class PostmarkWebhookParser : IPostmarkWebhookParser
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        AllowTrailingCommas = true
    };

    /// <inheritdoc/>
    public PostmarkInboundMessage ParseInbound(string json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            throw new ArgumentNullException(nameof(json), "Inbound webhook payload cannot be null or empty.");
        }

        return JsonSerializer.Deserialize<PostmarkInboundMessage>(json, JsonOptions)
               ?? throw new JsonException("Failed to deserialize JSON into PostmarkInboundMessage.");
    }

    /// <inheritdoc/>
    public async Task<PostmarkInboundMessage> ParseInboundAsync(Stream utf8JsonStream, CancellationToken cancellationToken = default)
    {
        if (utf8JsonStream == null)
        {
            throw new ArgumentNullException(nameof(utf8JsonStream), "Request stream cannot be null.");
        }

        return await JsonSerializer.DeserializeAsync<PostmarkInboundMessage>(utf8JsonStream, JsonOptions, cancellationToken)
               ?? throw new JsonException("Failed to deserialize JSON stream into PostmarkInboundMessage.");
    }

    /// <inheritdoc/>
    public PostmarkInboundMessage ParseInbound(JsonElement element)
    {
        return JsonSerializer.Deserialize<PostmarkInboundMessage>(element.GetRawText(), JsonOptions)
               ?? throw new JsonException("Failed to deserialize JsonElement into PostmarkInboundMessage.");
    }

    /// <inheritdoc/>
    public PostmarkBounceWebhook ParseBounce(string json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            throw new ArgumentNullException(nameof(json), "Bounce webhook payload cannot be null or empty.");
        }

        return JsonSerializer.Deserialize<PostmarkBounceWebhook>(json, JsonOptions)
               ?? throw new JsonException("Failed to deserialize JSON into PostmarkBounceWebhook.");
    }

    /// <inheritdoc/>
    public PostmarkDeliveryWebhook ParseDelivery(string json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            throw new ArgumentNullException(nameof(json), "Delivery webhook payload cannot be null or empty.");
        }

        return JsonSerializer.Deserialize<PostmarkDeliveryWebhook>(json, JsonOptions)
               ?? throw new JsonException("Failed to deserialize JSON into PostmarkDeliveryWebhook.");
    }

    /// <inheritdoc/>
    public bool VerifyWebhookSecurityToken(string? receivedToken, string? expectedSecret)
    {
        if (string.IsNullOrWhiteSpace(receivedToken) || string.IsNullOrWhiteSpace(expectedSecret))
        {
            return false;
        }

        var receivedBytes = Encoding.UTF8.GetBytes(receivedToken.Trim());
        var expectedBytes = Encoding.UTF8.GetBytes(expectedSecret.Trim());

        if (receivedBytes.Length != expectedBytes.Length)
        {
            return false;
        }

        return CryptographicOperations.FixedTimeEquals(receivedBytes, expectedBytes);
    }
}
