using Ozikol_BCC.Domain.Models;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Website.Services
{
    /// <summary>
    /// Central message queue service. All BCP features call this to enqueue
    /// notifications, emails, and SMS messages into the database pool.
    /// The service routes each event to the correct channels automatically.
    /// </summary>
    public interface IBcpMessageQueueService
    {
        /// <summary>
        /// Enqueue a message into the appropriate channels (in-app, email, SMS)
        /// based on the event type routing map.
        /// </summary>
        Task EnqueueAsync(BcpEventType eventType, string? userId, string title, string body, string? actionUrl = null, string? icon = null, Dictionary<string, string>? extraData = null);

        /// <summary>
        /// Enqueue a direct email into the email pool (bypasses event routing).
        /// </summary>
        Task EnqueueEmailAsync(string recipientEmail, string? recipientName, string subject, string htmlBody, BcpMessageCategory category = BcpMessageCategory.General, BcpMessagePriority priority = BcpMessagePriority.Normal, string? relatedUserId = null, BcpEventType? eventType = null);

        /// <summary>
        /// Enqueue a direct SMS into the SMS pool (bypasses event routing).
        /// </summary>
        Task EnqueueSmsAsync(string recipientPhone, string message, BcpMessageCategory category = BcpMessageCategory.General, BcpMessagePriority priority = BcpMessagePriority.Normal, string? relatedUserId = null, BcpEventType? eventType = null);

        /// <summary>
        /// Enqueue a broadcast notification visible to all users.
        /// </summary>
        Task EnqueueBroadcastAsync(BcpEventType eventType, string title, string body, string? actionUrl = null, string? icon = null);
    }
}
