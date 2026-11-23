using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Interfaces.Services
{
    /// <summary>
    /// Service contract for dispatching real-time native browser, mobile, and desktop push notifications via OneSignal REST API.
    /// Dynamically resolves credentials from Central Master Catalog DB or environment configuration.
    /// </summary>
    public interface IOneSignalPushDispatcher
    {
        /// <summary>
        /// Sends a push notification to specific user IDs, a tenant audience, or a global broadcast.
        /// </summary>
        /// <param name="title">Lock-screen headline title (under 50 chars).</param>
        /// <param name="message">Push body content (under 140 chars).</param>
        /// <param name="launchUrl">Optional deep link URL when the notification is clicked.</param>
        /// <param name="targetUserIds">Optional list of specific user IDs mapped to OneSignal external_id.</param>
        /// <param name="tenantKey">Optional tenant key for audience scoping.</param>
        /// <param name="customData">Optional key-value metadata payload for deep-linking.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>A tuple indicating success, an optional error message, and the OneSignal delivery ID.</returns>
        Task<(bool Success, string? ErrorMessage, string? OneSignalNotificationId)> SendPushNotificationAsync(
            string title,
            string message,
            string? launchUrl = null,
            IList<string>? targetUserIds = null,
            string? tenantKey = null,
            IDictionary<string, string>? customData = null,
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Registers or updates a user and their Web Push / Email subscription directly in OneSignal via the OneSignal REST API.
        /// Bypasses browser single-origin (restrict_origin) blocks on custom tenant domains so all tenant users appear in OneSignal Audience.
        /// </summary>
        /// <param name="externalUserId">The authenticated Ozikol user profile ID.</param>
        /// <param name="tenantKey">The tenant workspace key for audience tagging.</param>
        /// <param name="email">Optional user email address.</param>
        /// <param name="fullName">Optional user full name.</param>
        /// <param name="pushEndpoint">Optional Web Push subscription endpoint URL from the browser ServiceWorker.</param>
        /// <param name="p256dh">Optional Web Push p256dh public key.</param>
        /// <param name="auth">Optional Web Push auth secret.</param>
        /// <param name="userAgent">Optional browser User-Agent string.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>A tuple indicating success, an optional error message, and the OneSignal subscription/player ID.</returns>
        Task<(bool Success, string? ErrorMessage, string? SubscriptionId)> RegisterUserSubscriptionAsync(
            string externalUserId,
            string? tenantKey = null,
            string? email = null,
            string? fullName = null,
            string? pushEndpoint = null,
            string? p256dh = null,
            string? auth = null,
            string? userAgent = null,
            CancellationToken cancellationToken = default);
    }
}
