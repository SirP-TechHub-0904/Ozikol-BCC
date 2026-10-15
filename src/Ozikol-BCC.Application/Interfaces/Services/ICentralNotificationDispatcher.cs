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
        /// Target user ID (required when TargetType is SingleUser).
        /// </summary>
        public string? TargetUserId { get; set; }

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
