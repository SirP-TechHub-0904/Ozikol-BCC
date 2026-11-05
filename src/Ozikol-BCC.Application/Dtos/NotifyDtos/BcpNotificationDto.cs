using System;
using Ozikol_BCC.Domain.Models;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Application.Dtos.NotifyDtos
{
    /// <summary>
    /// Data transfer object representing a standardized cross-platform notification item
    /// rendered across Angular web client, Flutter mobile &amp; desktop apps, and SignalR live feeds.
    /// </summary>
    public class BcpNotificationDto
    {
        /// <summary>
        /// Unique notification identifier.
        /// </summary>
        public Guid Id { get; set; }

        /// <summary>
        /// Recipient user profile identifier (null for broadcast announcements).
        /// </summary>
        public string? UserId { get; set; }

        /// <summary>
        /// Brief headline or title of the notification.
        /// </summary>
        public string Title { get; set; } = string.Empty;

        /// <summary>
        /// Detailed message body or descriptive content.
        /// </summary>
        public string Message { get; set; } = string.Empty;

        /// <summary>
        /// Optional deep link or route path for user redirection upon clicking.
        /// </summary>
        public string? ActionUrl { get; set; }

        /// <summary>
        /// Whether the recipient has marked this notification as read.
        /// </summary>
        public bool IsRead { get; set; }

        /// <summary>
        /// Module or feature key originating the notification (e.g., Security, Billing, Members).
        /// </summary>
        public string? Module { get; set; }

        /// <summary>
        /// Material Symbols icon name for UI rendering.
        /// </summary>
        public string? Icon { get; set; }

        /// <summary>
        /// Message category for grouping (General, Security, Account, etc.).
        /// </summary>
        public string Category { get; set; } = "General";

        /// <summary>
        /// Message priority (Low, Normal, High, Urgent).
        /// </summary>
        public string Priority { get; set; } = "Normal";

        /// <summary>
        /// Canonical 6-tier severity name (Error, Failed, Success, NewFeature, Update, Maintenance).
        /// </summary>
        public string Severity { get; set; } = "Update";

        /// <summary>
        /// Numeric severity code (1 to 6).
        /// </summary>
        public int SeverityCode { get; set; } = 5;

        /// <summary>
        /// Hex color token corresponding to the severity tier for consistent UI styling.
        /// </summary>
        public string SeverityColor { get; set; } = "#1F6BFF";

        /// <summary>
        /// Canonical icon identifier for the severity tier.
        /// </summary>
        public string SeverityIcon { get; set; } = "info_outline";

        /// <summary>
        /// Optional JSON payload containing deep linking parameters, IDs, or action payload.
        /// </summary>
        public string? MetadataJson { get; set; }

        /// <summary>
        /// Whether this notification is a workspace-wide broadcast announcement.
        /// </summary>
        public bool IsBroadcast { get; set; }

        /// <summary>
        /// UTC timestamp when the notification was created.
        /// </summary>
        public DateTime CreatedAt { get; set; }

        /// <summary>
        /// Factory method to map a domain BcpNotification entity to its DTO representation.
        /// </summary>
        /// <param name="entity">Source domain entity.</param>
        /// <returns>Formatted notification DTO with canonical severity color tokens.</returns>
        public static BcpNotificationDto FromEntity(BcpNotification entity)
        {
            var severity = entity.Severity;
            return new BcpNotificationDto
            {
                Id = entity.Id,
                UserId = entity.UserId,
                Title = entity.Title ?? string.Empty,
                Message = entity.Message ?? string.Empty,
                ActionUrl = entity.ActionUrl,
                IsRead = entity.IsRead,
                Module = entity.Module ?? "General",
                Icon = entity.Icon ?? GetDefaultIconForSeverity(severity),
                Category = entity.Category.ToString(),
                Priority = entity.Priority.ToString(),
                Severity = severity.ToString(),
                SeverityCode = (int)severity,
                SeverityColor = GetColorForSeverity(severity),
                SeverityIcon = GetDefaultIconForSeverity(severity),
                MetadataJson = entity.MetadataJson,
                IsBroadcast = entity.IsBroadcast,
                CreatedAt = entity.CreatedAt
            };
        }

        /// <summary>
        /// Resolves the canonical hex color token for a given notification severity.
        /// </summary>
        /// <param name="severity">The notification severity.</param>
        /// <returns>Hex color code string.</returns>
        public static string GetColorForSeverity(NotificationSeverity severity)
        {
            return severity switch
            {
                NotificationSeverity.Error => "#F06548",       // Crimson
                NotificationSeverity.Failed => "#F7B84B",      // Amber
                NotificationSeverity.Success => "#0AB39C",     // Teal
                NotificationSeverity.NewFeature => "#38BDF8",  // Sky Cyan
                NotificationSeverity.Update => "#1F6BFF",      // Royal Blue
                NotificationSeverity.Maintenance => "#9333EA", // Purple
                _ => "#1F6BFF"
            };
        }

        /// <summary>
        /// Resolves the canonical Material Symbols icon name for a given notification severity.
        /// </summary>
        /// <param name="severity">The notification severity.</param>
        /// <returns>Icon name string.</returns>
        public static string GetDefaultIconForSeverity(NotificationSeverity severity)
        {
            return severity switch
            {
                NotificationSeverity.Error => "error_outline",
                NotificationSeverity.Failed => "warning_amber",
                NotificationSeverity.Success => "check_circle",
                NotificationSeverity.NewFeature => "auto_awesome",
                NotificationSeverity.Update => "info_outline",
                NotificationSeverity.Maintenance => "build_circle",
                _ => "notifications"
            };
        }
    }
}
