using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace Ozikol.Central.Services.Notifications
{
    /// <summary>
    /// Service contract for dispatching real-time browser and mobile push notifications via OneSignal REST API.
    /// </summary>
    public interface IOneSignalPushService
    {
        /// <summary>
        /// Sends a push notification to specific external user IDs or audience segments.
        /// </summary>
        /// <param name="title">Notification title headline.</param>
        /// <param name="message">Notification body message.</param>
        /// <param name="launchUrl">Optional deep link URL when the notification is clicked.</param>
        /// <param name="externalUserIds">Optional list of specific operator/user IDs.</param>
        /// <param name="includedSegments">Optional OneSignal segments (e.g. "Total Subscriptions", "Admins").</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>True if accepted by OneSignal API; false otherwise.</returns>
        Task<bool> SendPushNotificationAsync(
            string title,
            string message,
            string? launchUrl = null,
            IList<string>? externalUserIds = null,
            IList<string>? includedSegments = null,
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Sends an individual push notification to a specific operator.
        /// </summary>
        /// <param name="userId">The operator user ID.</param>
        /// <param name="title">Headline title.</param>
        /// <param name="message">Body message.</param>
        /// <param name="launchUrl">Optional deep link route.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>True if sent; false otherwise.</returns>
        Task<bool> SendPushToUserAsync(
            string userId,
            string title,
            string message,
            string? launchUrl = null,
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Broadcasts a global push notification to all subscribed operators.
        /// </summary>
        /// <param name="title">Headline title.</param>
        /// <param name="message">Body message.</param>
        /// <param name="launchUrl">Optional deep link route.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>True if sent; false otherwise.</returns>
        Task<bool> SendPushToAllAsync(
            string title,
            string message,
            string? launchUrl = null,
            CancellationToken cancellationToken = default);
    }
}
