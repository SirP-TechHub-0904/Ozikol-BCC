using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Ozikol.MasterDomain.Models;

namespace Ozikol.Central.Services.Notifications
{
    /// <summary>
    /// Core Central Platform Notification Engine contract for publishing multi-channel alerts,
    /// managing read states, deep-link routing, and querying notifications for operators.
    /// </summary>
    public interface ICentralNotificationService
    {
        /// <summary>
        /// Publishes a new notification across in-app, OneSignal push, and email channels.
        /// </summary>
        /// <param name="category">Category label (e.g. Tenants, Billing, Jobs, Security, Support).</param>
        /// <param name="title">Headline title.</param>
        /// <param name="message">Detailed message body.</param>
        /// <param name="severity">Severity level: "Info", "Success", "Warning", "Danger".</param>
        /// <param name="icon">Material symbol icon name.</param>
        /// <param name="actionUrl">Deep link jump route.</param>
        /// <param name="entityId">Associated primary key entity identifier.</param>
        /// <param name="recipientUserId">Specific target operator ID (or null for role/global).</param>
        /// <param name="targetRole">Target security role (or null for all).</param>
        /// <param name="targetAudience">Target audience group (or null).</param>
        /// <param name="sendPush">Whether to dispatch via OneSignal web/device push.</param>
        /// <param name="sendEmail">Whether to dispatch via Postmark email.</param>
        /// <param name="createdByUserId">Operator ID who created the notification (if manual).</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>The persisted notification record.</returns>
        Task<MasterNotification> PublishNotificationAsync(
            string category,
            string title,
            string message,
            string severity = "Info",
            string? icon = null,
            string? actionUrl = null,
            string? entityId = null,
            string? recipientUserId = null,
            string? targetRole = null,
            string? targetAudience = null,
            bool sendPush = true,
            bool sendEmail = false,
            string? createdByUserId = null,
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Calculates total unread notifications count for a specific user and their security roles.
        /// </summary>
        Task<int> GetUnreadCountAsync(string? userId, IList<string>? roles, CancellationToken cancellationToken = default);

        /// <summary>
        /// Retrieves the most recent notifications for top-bar drawer and flyout popover.
        /// </summary>
        Task<IList<MasterNotification>> GetRecentNotificationsAsync(string? userId, IList<string>? roles, int count = 5, CancellationToken cancellationToken = default);

        /// <summary>
        /// Marks a single notification as read.
        /// </summary>
        Task<bool> MarkAsReadAsync(Guid notificationId, CancellationToken cancellationToken = default);

        /// <summary>
        /// Marks all matching notifications as read.
        /// </summary>
        Task<bool> MarkAllAsReadAsync(string? userId, IList<string>? roles, string? category = null, CancellationToken cancellationToken = default);

        /// <summary>
        /// Permanently deletes a single notification.
        /// </summary>
        Task<bool> DeleteNotificationAsync(Guid notificationId, CancellationToken cancellationToken = default);

        /// <summary>
        /// Clears/purges all read notifications.
        /// </summary>
        Task<bool> ClearAllReadAsync(string? userId, IList<string>? roles, string? category = null, CancellationToken cancellationToken = default);
    }
}
