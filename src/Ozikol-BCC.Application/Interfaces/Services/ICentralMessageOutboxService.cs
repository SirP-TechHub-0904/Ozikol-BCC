using System;
using System.Threading;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Interfaces.Services;

/// <summary>
/// Enterprise communication outbox service that routes outbound emails, SMS, WhatsApp, and push notifications
/// directly into the central Master Catalog Database (<c>MasterMessagePools</c>).
/// Decouples all autonomous delivery workers from individual tenant databases.
/// </summary>
public interface ICentralMessageOutboxService
{
    /// <summary>
    /// Enqueues an outbound communication payload into the central Master Message Pool for background dispatch.
    /// </summary>
    /// <param name="tenantKey">The source tenant organization key.</param>
    /// <param name="organizationName">The display name of the tenant organization.</param>
    /// <param name="channel">The communication channel (Email, Sms, Push, WhatsApp).</param>
    /// <param name="provider">The delivery carrier provider (Mailcow, Postmark, KudiSms, Twilio, MetaWhatsApp).</param>
    /// <param name="recipientAddress">The destination email address, phone number, or push token.</param>
    /// <param name="recipientName">The full name of the recipient.</param>
    /// <param name="subject">The message subject line or push headline.</param>
    /// <param name="content">The primary body content (HTML or plain text).</param>
    /// <param name="plainTextFallback">Optional plain-text fallback.</param>
    /// <param name="actionUrl">Optional deep link or action URL.</param>
    /// <param name="category">The message category.</param>
    /// <param name="severity">The alert severity level.</param>
    /// <param name="priority">The delivery priority.</param>
    /// <param name="senderOrTemplateName">The sender email address or template identifier.</param>
    /// <param name="metadataJson">Structured JSON metadata for audit logging.</param>
    /// <param name="scheduledAt">Optional scheduled delivery time in UTC.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>A task representing the asynchronous outbox enqueue operation.</returns>
    Task EnqueueOutboundMessageAsync(
        string tenantKey,
        string? organizationName,
        string channel,
        string provider,
        string recipientAddress,
        string? recipientName,
        string? subject,
        string content,
        string? plainTextFallback = null,
        string? actionUrl = null,
        string category = "General",
        string severity = "Update",
        string priority = "Normal",
        string? senderOrTemplateName = null,
        string? metadataJson = null,
        DateTime? scheduledAt = null,
        CancellationToken cancellationToken = default);
}
