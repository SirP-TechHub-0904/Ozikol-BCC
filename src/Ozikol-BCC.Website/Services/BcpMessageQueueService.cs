using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Website.Services
{
    /// <summary>
    /// Implements the unified message queue service. Routes events to the correct
    /// channels (in-app notification, email queue, SMS queue) based on an internal
    /// routing map. All messages are written to database tables for later processing.
    /// </summary>
    public class BcpMessageQueueService : IBcpMessageQueueService
    {
        private readonly DashboardDbContext _db;
        private readonly UserManager<Profile> _userManager;

        public BcpMessageQueueService(DashboardDbContext db, UserManager<Profile> userManager)
        {
            _db = db;
            _userManager = userManager;
        }

        // ── Channel routing map ──────────────────────────────────────────────
        // Each event type maps to which channels it should be sent through.
        // true = queue to that channel, false = skip.
        private static readonly Dictionary<BcpEventType, (bool InApp, bool Email, bool Sms, BcpMessageCategory Category, BcpMessagePriority Priority, string Icon)> RouteMap = new()
        {
            // Security events
            [BcpEventType.PasswordChanged]          = (true,  true,  false, BcpMessageCategory.Security, BcpMessagePriority.High,   "lock_reset"),
            [BcpEventType.NewDeviceSignedIn]         = (true,  true,  false, BcpMessageCategory.Security, BcpMessagePriority.High,   "devices"),
            [BcpEventType.SessionRevokedByUser]      = (true,  false, false, BcpMessageCategory.Security, BcpMessagePriority.Normal, "logout"),
            [BcpEventType.SessionRevokedByAdmin]     = (true,  true,  false, BcpMessageCategory.Security, BcpMessagePriority.High,   "admin_panel_settings"),
            [BcpEventType.TwoFactorEnabled]          = (true,  true,  false, BcpMessageCategory.Security, BcpMessagePriority.High,   "verified_user"),
            [BcpEventType.TwoFactorDisabled]         = (true,  true,  false, BcpMessageCategory.Security, BcpMessagePriority.High,   "gpp_maybe"),
            [BcpEventType.RecoveryCodesRegenerated]  = (true,  true,  false, BcpMessageCategory.Security, BcpMessagePriority.High,   "key"),
            [BcpEventType.AccountLocked]             = (true,  true,  true,  BcpMessageCategory.Security, BcpMessagePriority.Urgent, "lock"),
            [BcpEventType.AccountUnlocked]           = (true,  true,  false, BcpMessageCategory.Security, BcpMessagePriority.High,   "lock_open"),
            [BcpEventType.LoginOtp]                  = (false, false, true,  BcpMessageCategory.Security, BcpMessagePriority.Urgent, "pin"),
            [BcpEventType.PasswordReset]             = (true,  true,  false, BcpMessageCategory.Security, BcpMessagePriority.High,   "lock_reset"),

            // User Management events
            [BcpEventType.RoleAssigned]              = (true,  true,  false, BcpMessageCategory.UserManagement, BcpMessagePriority.Normal, "shield_person"),
            [BcpEventType.RoleRemoved]               = (true,  true,  false, BcpMessageCategory.UserManagement, BcpMessagePriority.Normal, "person_remove"),
            [BcpEventType.FeatureAccessGranted]      = (true,  true,  false, BcpMessageCategory.UserManagement, BcpMessagePriority.Normal, "verified_user"),
            [BcpEventType.FeatureAccessRevoked]      = (true,  true,  false, BcpMessageCategory.UserManagement, BcpMessagePriority.Normal, "block"),
            [BcpEventType.CategoryChanged]           = (true,  false, false, BcpMessageCategory.UserManagement, BcpMessagePriority.Low,    "category"),
            [BcpEventType.PerformanceScoreRecorded]  = (true,  false, false, BcpMessageCategory.Performance,    BcpMessagePriority.Low,    "monitoring"),
            [BcpEventType.NoteAdded]                 = (true,  false, false, BcpMessageCategory.UserManagement, BcpMessagePriority.Low,    "sticky_note_2"),
            [BcpEventType.UserStatusChanged]         = (true,  true,  true,  BcpMessageCategory.UserManagement, BcpMessagePriority.High,   "person"),
            [BcpEventType.UserInvitationSent]        = (false, true,  false, BcpMessageCategory.UserManagement, BcpMessagePriority.Normal, "mail"),
            [BcpEventType.ProfileUpdated]            = (true,  false, false, BcpMessageCategory.Account,        BcpMessagePriority.Low,    "edit"),

            // System events
            [BcpEventType.MaintenanceModeEnabled]    = (true,  false, false, BcpMessageCategory.System, BcpMessagePriority.Urgent, "construction"),
            [BcpEventType.MaintenanceModeDisabled]   = (true,  false, false, BcpMessageCategory.System, BcpMessagePriority.High,   "check_circle"),
            [BcpEventType.SystemAnnouncement]        = (true,  true,  false, BcpMessageCategory.System, BcpMessagePriority.Normal, "campaign"),
            [BcpEventType.WelcomeOnboarding]         = (true,  true,  false, BcpMessageCategory.System, BcpMessagePriority.Normal, "waving_hand"),
        };

        public async Task EnqueueAsync(
            BcpEventType eventType,
            string? userId,
            string title,
            string body,
            string? actionUrl = null,
            string? icon = null,
            Dictionary<string, string>? extraData = null)
        {
            var (inApp, email, sms, category, priority, iconVal) = RouteMap.GetValueOrDefault(eventType, (true, false, false, BcpMessageCategory.General, BcpMessagePriority.Normal, "notifications"));
            var resolvedIcon = icon ?? iconVal;

            // Resolve user details for email/SMS routing
            Profile? user = null;
            if (!string.IsNullOrWhiteSpace(userId))
            {
                user = await _userManager.FindByIdAsync(userId);
            }

            // 1) In-App Notification
            if (inApp)
            {
                _db.BcpNotifications.Add(new BcpNotification
                {
                    UserId = userId,
                    Title = title,
                    Message = body,
                    ActionUrl = actionUrl,
                    Icon = resolvedIcon,
                    Module = category.ToString(),
                    Category = category,
                    Priority = priority,
                    EventType = eventType,
                    IsBroadcast = false,
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow
                });
            }

            // 2) Email Queue
            if (email && user?.Email != null)
            {
                _db.BcpEmailQueue.Add(new BcpEmailQueue
                {
                    RelatedUserId = userId,
                    RecipientEmail = user.Email,
                    RecipientName = user.FullName,
                    Subject = title,
                    HtmlBody = BuildEmailHtml(title, body, actionUrl),
                    PlainBody = body,
                    Category = category,
                    Priority = priority,
                    EventType = eventType,
                    Status = BcpQueueStatus.Queued,
                    CreatedAt = DateTime.UtcNow
                });
            }

            // 3) SMS Queue
            if (sms && !string.IsNullOrWhiteSpace(user?.PhoneNumber))
            {
                _db.BcpSmsQueue.Add(new BcpSmsQueue
                {
                    RelatedUserId = userId,
                    RecipientPhone = user.PhoneNumber,
                    Message = $"{title}: {body}",
                    Category = category,
                    Priority = priority,
                    EventType = eventType,
                    Status = BcpQueueStatus.Queued,
                    CreatedAt = DateTime.UtcNow
                });
            }

            await _db.SaveChangesAsync();
        }

        public async Task EnqueueEmailAsync(
            string recipientEmail,
            string? recipientName,
            string subject,
            string htmlBody,
            BcpMessageCategory category = BcpMessageCategory.General,
            BcpMessagePriority priority = BcpMessagePriority.Normal,
            string? relatedUserId = null,
            BcpEventType? eventType = null)
        {
            _db.BcpEmailQueue.Add(new BcpEmailQueue
            {
                RelatedUserId = relatedUserId,
                RecipientEmail = recipientEmail,
                RecipientName = recipientName,
                Subject = subject,
                HtmlBody = htmlBody,
                PlainBody = null,
                Category = category,
                Priority = priority,
                EventType = eventType,
                Status = BcpQueueStatus.Queued,
                CreatedAt = DateTime.UtcNow
            });
            await _db.SaveChangesAsync();
        }

        public async Task EnqueueSmsAsync(
            string recipientPhone,
            string message,
            BcpMessageCategory category = BcpMessageCategory.General,
            BcpMessagePriority priority = BcpMessagePriority.Normal,
            string? relatedUserId = null,
            BcpEventType? eventType = null)
        {
            _db.BcpSmsQueue.Add(new BcpSmsQueue
            {
                RelatedUserId = relatedUserId,
                RecipientPhone = recipientPhone,
                Message = message,
                Category = category,
                Priority = priority,
                EventType = eventType,
                Status = BcpQueueStatus.Queued,
                CreatedAt = DateTime.UtcNow
            });
            await _db.SaveChangesAsync();
        }

        public async Task EnqueueBroadcastAsync(
            BcpEventType eventType,
            string title,
            string body,
            string? actionUrl = null,
            string? icon = null)
        {
            var (_, _, _, category, priority, iconVal) = RouteMap.GetValueOrDefault(eventType, (true, false, false, BcpMessageCategory.System, BcpMessagePriority.Normal, "campaign"));

            _db.BcpNotifications.Add(new BcpNotification
            {
                UserId = null,
                Title = title,
                Message = body,
                ActionUrl = actionUrl,
                Icon = icon ?? iconVal,
                Module = category.ToString(),
                Category = category,
                Priority = priority,
                EventType = eventType,
                IsBroadcast = true,
                IsRead = false,
                CreatedAt = DateTime.UtcNow
            });
            await _db.SaveChangesAsync();
        }

        /// <summary>
        /// Builds a simple, clean HTML email body. When a proper email template
        /// system is configured later, this method will be replaced.
        /// </summary>
        private static string BuildEmailHtml(string title, string body, string? actionUrl)
        {
            var actionBtn = string.IsNullOrWhiteSpace(actionUrl)
                ? ""
                : $"<p style=\"margin-top:20px;\"><a href=\"{actionUrl}\" style=\"display:inline-block;padding:10px 24px;background:#4f46e5;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;\">View Details</a></p>";

            return $@"
<div style=""max-width:600px;margin:0 auto;font-family:'Segoe UI',Arial,sans-serif;color:#1e293b;padding:32px;"">
    <h2 style=""margin:0 0 16px 0;font-size:20px;color:#0f172a;"">{title}</h2>
    <p style=""margin:0;font-size:15px;line-height:1.6;color:#475569;"">{body}</p>
    {actionBtn}
    <hr style=""margin:32px 0 16px 0;border:none;border-top:1px solid #e2e8f0;""/>
    <p style=""font-size:12px;color:#94a3b8;margin:0;"">This is an automated notification from BCP. Please do not reply to this email.</p>
</div>";
        }
    }
}
