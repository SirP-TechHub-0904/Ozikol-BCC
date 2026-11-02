using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Ozikol.Central.Services;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Services.Notifications
{
    /// <summary>
    /// Core notification engine implementation providing persistent multi-channel alerts,
    /// OneSignal push dispatching, Postmark email delivery, and full lifecycle management.
    /// </summary>
    public class CentralNotificationService : ICentralNotificationService
    {
        private readonly MasterCatalogDbContext _dbContext;
        private readonly IOneSignalPushService _pushService;
        private readonly ICentralEmailService _emailService;
        private readonly UserManager<CentralUser> _userManager;
        private readonly ILogger<CentralNotificationService> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="CentralNotificationService"/> class.
        /// </summary>
        /// <param name="dbContext">Master catalog database context.</param>
        /// <param name="pushService">OneSignal push notification service.</param>
        /// <param name="emailService">Central Postmark email service.</param>
        /// <param name="userManager">Identity user manager for operator lookup.</param>
        /// <param name="logger">Structured logger instance.</param>
        public CentralNotificationService(
            MasterCatalogDbContext dbContext,
            IOneSignalPushService pushService,
            ICentralEmailService emailService,
            UserManager<CentralUser> userManager,
            ILogger<CentralNotificationService> logger)
        {
            _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
            _pushService = pushService ?? throw new ArgumentNullException(nameof(pushService));
            _emailService = emailService ?? throw new ArgumentNullException(nameof(emailService));
            _userManager = userManager ?? throw new ArgumentNullException(nameof(userManager));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <inheritdoc />
        public async Task<MasterNotification> PublishNotificationAsync(
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
            CancellationToken cancellationToken = default)
        {
            var dispatchedChannels = new List<string> { "InApp" };

            // 1. Persist notification record in Master catalog
            var notification = new MasterNotification
            {
                Id = Guid.NewGuid(),
                Category = string.IsNullOrWhiteSpace(category) ? "System" : category.Trim(),
                Title = title?.Trim() ?? "System Notification",
                Message = message?.Trim() ?? string.Empty,
                Severity = string.IsNullOrWhiteSpace(severity) ? "Info" : severity.Trim(),
                Icon = string.IsNullOrWhiteSpace(icon) ? "notifications" : icon.Trim(),
                ActionUrl = string.IsNullOrWhiteSpace(actionUrl) ? null : actionUrl.Trim(),
                EntityId = string.IsNullOrWhiteSpace(entityId) ? null : entityId.Trim(),
                RecipientUserId = string.IsNullOrWhiteSpace(recipientUserId) ? null : recipientUserId.Trim(),
                TargetRole = string.IsNullOrWhiteSpace(targetRole) ? null : targetRole.Trim(),
                TargetAudience = string.IsNullOrWhiteSpace(targetAudience) ? null : targetAudience.Trim(),
                CreatedByUserId = string.IsNullOrWhiteSpace(createdByUserId) ? null : createdByUserId.Trim(),
                IsRead = false,
                CreatedUtc = DateTime.UtcNow
            };

            // 2. Dispatch OneSignal Push Notification if enabled
            if (sendPush)
            {
                try
                {
                    bool pushResult = false;
                    if (!string.IsNullOrWhiteSpace(notification.RecipientUserId))
                    {
                        pushResult = await _pushService.SendPushToUserAsync(
                            notification.RecipientUserId,
                            notification.Title,
                            notification.Message,
                            notification.ActionUrl,
                            cancellationToken);
                    }
                    else
                    {
                        pushResult = await _pushService.SendPushToAllAsync(
                            notification.Title,
                            notification.Message,
                            notification.ActionUrl,
                            cancellationToken);
                    }

                    if (pushResult)
                    {
                        dispatchedChannels.Add("OneSignal");
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "❌ [CentralNotificationService] OneSignal Push dispatch failed for notification '{Title}'", notification.Title);
                }
            }

            // 3. Dispatch Postmark Email if enabled
            if (sendEmail)
            {
                try
                {
                    if (!string.IsNullOrWhiteSpace(notification.RecipientUserId))
                    {
                        var user = await _userManager.FindByIdAsync(notification.RecipientUserId);
                        if (user != null && !string.IsNullOrWhiteSpace(user.Email))
                        {
                            var htmlBody = $"<div style='font-family: Arial, sans-serif; padding: 20px;'>" +
                                           $"<h2 style='color: #4f46e5; margin-bottom: 8px;'>{notification.Title}</h2>" +
                                           $"<p style='color: #374151; font-size: 15px; line-height: 1.6;'>{notification.Message}</p>" +
                                           (string.IsNullOrWhiteSpace(notification.ActionUrl) ? "" :
                                            $"<div style='margin-top: 24px;'><a href='{notification.ActionUrl}' style='display:inline-block; padding: 12px 24px; background: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold;'>View in Central Portal &rarr;</a></div>") +
                                           $"<hr style='border: none; border-top: 1px solid #e5e7eb; margin-top: 30px;' />" +
                                           $"<p style='color: #9ca3af; font-size: 12px;'>Ozikol Central Command Notification &bull; {DateTime.UtcNow:yyyy-MM-dd HH:mm} UTC</p>" +
                                           $"</div>";

                            var emailSent = await _emailService.SendEmailAsync(
                                user.Email,
                                notification.Title,
                                htmlBody,
                                provider: null,
                                cancellationToken: cancellationToken);

                            if (emailSent)
                            {
                                dispatchedChannels.Add("Email");
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "❌ [CentralNotificationService] Email dispatch failed for notification '{Title}'", notification.Title);
                }
            }

            notification.DispatchedChannels = string.Join(",", dispatchedChannels);
            _dbContext.MasterNotifications.Add(notification);
            await _dbContext.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("🔔 [CentralNotificationService] Published notification '{Title}' [{Category}] via [{Channels}]",
                notification.Title, notification.Category, notification.DispatchedChannels);

            return notification;
        }

        /// <inheritdoc />
        public async Task<int> GetUnreadCountAsync(string? userId, IList<string>? roles, CancellationToken cancellationToken = default)
        {
            var query = _dbContext.MasterNotifications.AsNoTracking().Where(n => !n.IsRead);

            // Filter by recipient user or target role or global
            if (!string.IsNullOrWhiteSpace(userId))
            {
                var roleList = roles ?? new List<string>();
                query = query.Where(n =>
                    (n.RecipientUserId == null && n.TargetRole == null) ||
                    n.RecipientUserId == userId ||
                    (n.TargetRole != null && roleList.Contains(n.TargetRole)));
            }

            return await query.CountAsync(cancellationToken);
        }

        /// <inheritdoc />
        public async Task<IList<MasterNotification>> GetRecentNotificationsAsync(
            string? userId,
            IList<string>? roles,
            int count = 5,
            CancellationToken cancellationToken = default)
        {
            var query = _dbContext.MasterNotifications.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(userId))
            {
                var roleList = roles ?? new List<string>();
                query = query.Where(n =>
                    (n.RecipientUserId == null && n.TargetRole == null) ||
                    n.RecipientUserId == userId ||
                    (n.TargetRole != null && roleList.Contains(n.TargetRole)));
            }

            return await query
                .OrderByDescending(n => n.CreatedUtc)
                .Take(count)
                .ToListAsync(cancellationToken);
        }

        /// <inheritdoc />
        public async Task<bool> MarkAsReadAsync(Guid notificationId, CancellationToken cancellationToken = default)
        {
            var item = await _dbContext.MasterNotifications.FirstOrDefaultAsync(n => n.Id == notificationId, cancellationToken);
            if (item == null)
            {
                return false;
            }

            item.IsRead = true;
            item.ReadAtUtc = DateTime.UtcNow;
            await _dbContext.SaveChangesAsync(cancellationToken);
            return true;
        }

        /// <inheritdoc />
        public async Task<bool> MarkAllAsReadAsync(string? userId, IList<string>? roles, string? category = null, CancellationToken cancellationToken = default)
        {
            var query = _dbContext.MasterNotifications.Where(n => !n.IsRead);

            if (!string.IsNullOrWhiteSpace(category) && !category.Equals("All", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(n => n.Category == category);
            }

            if (!string.IsNullOrWhiteSpace(userId))
            {
                var roleList = roles ?? new List<string>();
                query = query.Where(n =>
                    (n.RecipientUserId == null && n.TargetRole == null) ||
                    n.RecipientUserId == userId ||
                    (n.TargetRole != null && roleList.Contains(n.TargetRole)));
            }

            var unreadItems = await query.ToListAsync(cancellationToken);
            if (!unreadItems.Any())
            {
                return true;
            }

            var now = DateTime.UtcNow;
            foreach (var item in unreadItems)
            {
                item.IsRead = true;
                item.ReadAtUtc = now;
            }

            await _dbContext.SaveChangesAsync(cancellationToken);
            return true;
        }

        /// <inheritdoc />
        public async Task<bool> DeleteNotificationAsync(Guid notificationId, CancellationToken cancellationToken = default)
        {
            var item = await _dbContext.MasterNotifications.FirstOrDefaultAsync(n => n.Id == notificationId, cancellationToken);
            if (item == null)
            {
                return false;
            }

            _dbContext.MasterNotifications.Remove(item);
            await _dbContext.SaveChangesAsync(cancellationToken);
            return true;
        }

        /// <inheritdoc />
        public async Task<bool> ClearAllReadAsync(string? userId, IList<string>? roles, string? category = null, CancellationToken cancellationToken = default)
        {
            var query = _dbContext.MasterNotifications.Where(n => n.IsRead);

            if (!string.IsNullOrWhiteSpace(category) && !category.Equals("All", StringComparison.OrdinalIgnoreCase))
            {
                query = query.Where(n => n.Category == category);
            }

            if (!string.IsNullOrWhiteSpace(userId))
            {
                var roleList = roles ?? new List<string>();
                query = query.Where(n =>
                    (n.RecipientUserId == null && n.TargetRole == null) ||
                    n.RecipientUserId == userId ||
                    (n.TargetRole != null && roleList.Contains(n.TargetRole)));
            }

            var readItems = await query.ToListAsync(cancellationToken);
            if (!readItems.Any())
            {
                return true;
            }

            _dbContext.MasterNotifications.RemoveRange(readItems);
            await _dbContext.SaveChangesAsync(cancellationToken);
            return true;
        }
    }
}
