using System.IO;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Ozikol_BCC.EmailServices.Postmark.Models.Inbound;
using Ozikol_BCC.EmailServices.Postmark.Models.Webhooks;

namespace Ozikol_BCC.EmailServices.Postmark.Interfaces;

/// <summary>
/// Universal high-performance contract for parsing, validating, and extracting Postmark webhook payloads.
/// Supports inbound email messages, attachments, bounce notifications, and delivery events.
/// </summary>
public interface IPostmarkWebhookParser
{
    /// <summary>
    /// Parses a raw JSON string into a strongly-typed <see cref="PostmarkInboundMessage"/>.
    /// </summary>
    /// <param name="json">The raw HTTP request body string.</param>
    /// <returns>A populated <see cref="PostmarkInboundMessage"/> instance.</returns>
    PostmarkInboundMessage ParseInbound(string json);

    /// <summary>
    /// Asynchronously parses an incoming HTTP request stream into a <see cref="PostmarkInboundMessage"/>.
    /// </summary>
    /// <param name="utf8JsonStream">The UTF-8 readable request stream.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>A populated <see cref="PostmarkInboundMessage"/> instance.</returns>
    Task<PostmarkInboundMessage> ParseInboundAsync(Stream utf8JsonStream, CancellationToken cancellationToken = default);

    /// <summary>
    /// Parses a pre-deserialized <see cref="JsonElement"/> into a <see cref="PostmarkInboundMessage"/>.
    /// </summary>
    /// <param name="element">The JSON element.</param>
    /// <returns>A populated <see cref="PostmarkInboundMessage"/> instance.</returns>
    PostmarkInboundMessage ParseInbound(JsonElement element);

    /// <summary>
    /// Parses a raw JSON string into a strongly-typed <see cref="PostmarkBounceWebhook"/>.
    /// </summary>
    /// <param name="json">The raw HTTP request body string.</param>
    /// <returns>A populated <see cref="PostmarkBounceWebhook"/> instance.</returns>
    PostmarkBounceWebhook ParseBounce(string json);

    /// <summary>
    /// Parses a raw JSON string into a strongly-typed <see cref="PostmarkDeliveryWebhook"/>.
    /// </summary>
    /// <param name="json">The raw HTTP request body string.</param>
    /// <returns>A populated <see cref="PostmarkDeliveryWebhook"/> instance.</returns>
    PostmarkDeliveryWebhook ParseDelivery(string json);

    /// <summary>
    /// Performs constant-time token comparison to securely validate webhook authentication headers / query tokens.
    /// </summary>
    /// <param name="receivedToken">The token received in the HTTP request.</param>
    /// <param name="expectedSecret">The expected shared secret configured in .env or appsettings.</param>
    /// <returns>True if the token is valid; otherwise, false.</returns>
    bool VerifyWebhookSecurityToken(string? receivedToken, string? expectedSecret);
}
