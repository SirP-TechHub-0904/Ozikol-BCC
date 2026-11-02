using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Application.Interfaces.Services
{
    /// <summary>
    /// Delivery audience target type for notification dispatching.
    /// </summary>
    public enum NotificationDispatchTarget
    {
        /// <summary>
        /// A single specific user identified by TargetUserId.
        /// </summary>
        SingleUser = 0,

        /// <summary>
        /// All members belonging to a user category identified by TargetCategoryId.
        /// </summary>
        Category = 1,

        /// <summary>
        /// All active members across the current tenant workspace.
        /// </summary>
        BroadcastAll = 2
    }

    /// <summary>
    /// Comprehensive payload for dispatching notifications across multiple channels
    /// (In-App, Push, Email, SMS, WhatsApp) with canonical 6-tier severities.
    /// </summary>
    public class NotificationDispatchPayload
    {
        /// <summary>
        /// The intended recipient audience type (SingleUser, Category, or BroadcastAll).
        /// </summary>
        public NotificationDispatchTarget TargetType { get; set; } = NotificationDispatchTarget.SingleUser;

        /// <summary>
        /// Target user ID (required when TargetType is SingleUser, unless RecipientEmail is provided).
        /// </summary>
        public string? TargetUserId { get; set; }

        /// <summary>
        /// Optional direct recipient email address for transactional dispatches when TargetUserId is not yet established.
        /// </summary>
        public string? RecipientEmail { get; set; }

        /// <summary>
        /// Optional direct recipient full name for transactional email salutations.
        /// </summary>
        public string? RecipientName { get; set; }

        /// <summary>
        /// Target category ID (required when TargetType is Category).
        /// </summary>
        public Guid? TargetCategoryId { get; set; }

        /// <summary>
        /// Optional workspace tenant key or identifier for multi-tenant routing.
        /// </summary>
        public string? TenantKey { get; set; }

        /// <summary>
        /// Brief headline or title of the notification.
        /// </summary>
        public string Title { get; set; } = string.Empty;

        /// <summary>
        /// Detailed body or markdown message of the notification.
        /// </summary>
        public string Message { get; set; } = string.Empty;

        /// <summary>
        /// Standard 6-tier severity (Error, Failed, Success, NewFeature, Update, Maintenance).
        /// </summary>
        public NotificationSeverity Severity { get; set; } = NotificationSeverity.Update;

        /// <summary>
        /// Multi-channel destination mask (e.g. InApp | Push | Email).
        /// Defaults to InApp feed.
        /// </summary>
        public NotificationChannels Channels { get; set; } = NotificationChannels.InApp;

        /// <summary>
        /// Optional deep link or route path for web and app navigation.
        /// </summary>
        public string? ActionUrl { get; set; }

        /// <summary>
        /// Feature module originating the notification (e.g. "Security", "Billing", "System").
        /// </summary>
        public string? Module { get; set; } = "General";

        /// <summary>
        /// Material Symbols icon identifier for UI rendering.
        /// </summary>
        public string? Icon { get; set; }

        /// <summary>
        /// Message category for grouping (General, Security, Account, etc.).
        /// </summary>
        public BcpMessageCategory Category { get; set; } = BcpMessageCategory.General;

        /// <summary>
        /// Delivery priority level (Low, Normal, High, Urgent).
        /// </summary>
        public BcpMessagePriority Priority { get; set; } = BcpMessagePriority.Normal;

        /// <summary>
        /// Optional structured metadata JSON payload for deep linking or action handlers.
        /// </summary>
        public string? MetadataJson { get; set; }

        /// <summary>
        /// If true, forces a high-fidelity transactional email copy to be dispatched.
        /// </summary>
        public bool SendEmailCopy { get; set; }

        /// <summary>
        /// Optional system event type to load registered channel templates from IMessageTemplateService.
        /// </summary>
        public BcpEventType? EventType { get; set; }

        /// <summary>
        /// Dynamic placeholder dictionary (e.g. {{FullName}}, {{WorkspaceName}}, {{ActionUrl}}) for template rendering.
        /// </summary>
        public Dictionary<string, string>? Placeholders { get; set; }

        /// <summary>
        /// In-App channel specific title override. Defaults to Title if not specified.
        /// </summary>
        public string? InAppTitle { get; set; }

        /// <summary>
        /// In-App channel specific body override. Defaults to Message if not specified.
        /// </summary>
        public string? InAppBody { get; set; }

        /// <summary>
        /// Push notification title override, optimized for mobile/desktop lock screens (max 40-50 chars).
        /// </summary>
        public string? PushTitle { get; set; }

        /// <summary>
        /// Push notification body override, formatted for mobile/desktop lock screens (max 120-140 chars).
        /// </summary>
        public string? PushBody { get; set; }

        /// <summary>
        /// Push notification custom data dictionary for mobile/desktop deep linking and background handlers.
        /// </summary>
        public Dictionary<string, string>? PushData { get; set; }

        /// <summary>
        /// Email subject line override (must comply with anti-spam standards; no ALL CAPS, no spam keywords).
        /// </summary>
        public string? EmailSubject { get; set; }

        /// <summary>
        /// Custom rich HTML email body override. If null, the dispatcher automatically renders a responsive
        /// severity-branded HTML layout using the canonical color token.
        /// </summary>
        public string? EmailHtmlBody { get; set; }

        /// <summary>
        /// Plain-text email fallback body for legacy or text-only mail clients.
        /// </summary>
        public string? EmailPlainText { get; set; }

        /// <summary>
        /// SMS text message override, strictly formatted for single 160-character GSM 7-bit segment delivery.
        /// </summary>
        public string? SmsMessage { get; set; }

        /// <summary>
        /// Optional custom SMS sender ID (e.g. "OZIKOL").
        /// </summary>
        public string? SmsSenderId { get; set; }

        /// <summary>
        /// WhatsApp message override, formatted with WhatsApp markdown (*bold*, _italic_, bullet points).
        /// </summary>
        public string? WhatsAppMessage { get; set; }

        /// <summary>
        /// Optional WhatsApp Business approved HSM template name for Meta Cloud API dispatch.
        /// </summary>
        public string? WhatsAppTemplateName { get; set; }

        /// <summary>
        /// Positional template parameter values ({{1}}, {{2}}, etc.) for Meta WhatsApp Business approved HSM templates.
        /// </summary>
        public List<string>? WhatsAppTemplateParameters { get; set; }
    }

    /// <summary>
    /// Result metrics reported after dispatching across all requested delivery channels.
    /// </summary>
    public class NotificationDispatchResult
    {
        /// <summary>
        /// Overall success flag. True if at least one requested channel completed without fatal failure.
        /// </summary>
        public bool Success { get; set; }

        /// <summary>
        /// Number of in-app notification records persisted and streamed via SignalR.
        /// </summary>
        public int DispatchedInAppCount { get; set; }

        /// <summary>
        /// Number of push notification messages queued/sent.
        /// </summary>
        public int DispatchedPushCount { get; set; }

        /// <summary>
        /// Number of transactional emails successfully sent via Postmark.
        /// </summary>
        public int DispatchedEmailCount { get; set; }

        /// <summary>
        /// Number of SMS text messages queued/sent via carrier gateway.
        /// </summary>
        public int DispatchedSmsCount { get; set; }

        /// <summary>
        /// Number of WhatsApp messages dispatched/queued.
        /// </summary>
        public int DispatchedWhatsAppCount { get; set; }

        /// <summary>
        /// Non-fatal channel-specific warnings or diagnostic errors.
        /// </summary>
        public List<string> Errors { get; set; } = new();
    }

    /// <summary>
    /// Centralized multi-channel notification and messaging dispatcher.
    /// Orchestrates delivery across In-App feeds, SignalR live sockets, push notifications,
    /// Postmark transactional emails, carrier SMS, and WhatsApp messages with 6-tier severities.
    /// </summary>
    public interface ICentralNotificationDispatcher
    {
        /// <summary>
        /// Dispatches a notification across the requested delivery channels.
        /// </summary>
        /// <param name="payload">The detailed notification payload.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>Execution metrics detailing delivery counts and diagnostics across all channels.</returns>
        Task<NotificationDispatchResult> DispatchAsync(NotificationDispatchPayload payload, CancellationToken cancellationToken = default);
    }
}
