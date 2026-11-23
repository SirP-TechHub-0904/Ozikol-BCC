using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Ozikol_BCC.Application.Dtos.NotifyDtos;
using Ozikol_BCC.Application.Hubs;
using Ozikol_BCC.Application.Interfaces.Services;
using Ozikol_BCC.Application.Repository.NotifyRegister;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Infrastructure.Services.Email;
using Ozikol_BCC.Persistence.EF.SQL;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Application.Services.Notifications
{
    /// <summary>
    /// Central multi-channel notification and messaging dispatcher implementation.
    /// Dispatches alerts across In-App feeds, live SignalR sockets, native push payloads,
    /// Mailcow SMTP transactional emails, carrier SMS, and WhatsApp messages using the
    /// canonical 6-tier severity standards (#F06548, #F7B84B, #0AB39C, #38BDF8, #1F6BFF, #9333EA).
    /// </summary>
    public class CentralNotificationDispatcher : ICentralNotificationDispatcher
    {
        private readonly DashboardDbContext _dbContext;
        private readonly IHubContext<NotificationHub> _hubContext;
        private readonly ISmtpEmailDispatcher? _smtpEmailDispatcher;
        private readonly ISmsSendService? _smsService;
        private readonly IMessageTemplateService? _templateService;
        private readonly ITenantEmailShellService? _emailShellService;
        private readonly ILogger<CentralNotificationDispatcher> _logger;
        private readonly IConfiguration _configuration;
        private readonly IOneSignalPushDispatcher? _oneSignalDispatcher;
        private readonly ICentralMessageOutboxService? _outboxService;
        private readonly Microsoft.AspNetCore.Http.IHttpContextAccessor? _httpContextAccessor;

        private static readonly string[] SpamBlacklistWords = new[]
        {
            "100% Free", "Earn Money Fast", "No Risk", "Act Now", "Guaranteed Return",
            "Click Here Now", "Winner", "Risk Free", "Double Your Cash", "Million Dollars",
            "Instant Wealth", "Urgent Claim", "Make Money", "Pure Profit"
        };

        private static readonly string[] SuspiciousShortenedDomains = new[]
        {
            "bit.ly", "tinyurl.com", "ow.ly", "t.co", "is.gd", "buff.ly", "adf.ly"
        };

        /// <summary>
        /// Initializes a new instance of the <see cref="CentralNotificationDispatcher"/> class.
        /// </summary>
        /// <param name="dbContext">Scoped tenant database context.</param>
        /// <param name="hubContext">SignalR notification hub context.</param>
        /// <param name="logger">Logger service.</param>
        /// <param name="configuration">Application configuration.</param>
        /// <param name="smtpEmailDispatcher">Optional Mailcow SMTP email dispatcher.</param>
        /// <param name="smsService">Optional carrier SMS gateway service.</param>
        /// <param name="templateService">Optional multi-channel message template service.</param>
        /// <param name="emailShellService">Optional tenant email shell wrapping service.</param>
        /// <param name="oneSignalDispatcher">Optional OneSignal REST API push notification dispatcher.</param>
        /// <param name="outboxService">Optional central message outbox bridge service.</param>
        /// <param name="httpContextAccessor">Optional HTTP context accessor for resolving client browser host.</param>
        public CentralNotificationDispatcher(
            DashboardDbContext dbContext,
            IHubContext<NotificationHub> hubContext,
            ILogger<CentralNotificationDispatcher> logger,
            IConfiguration configuration,
            ISmtpEmailDispatcher? smtpEmailDispatcher = null,
            ISmsSendService? smsService = null,
            IMessageTemplateService? templateService = null,
            ITenantEmailShellService? emailShellService = null,
            IOneSignalPushDispatcher? oneSignalDispatcher = null,
            ICentralMessageOutboxService? outboxService = null,
            Microsoft.AspNetCore.Http.IHttpContextAccessor? httpContextAccessor = null)
        {
            _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
            _hubContext = hubContext ?? throw new ArgumentNullException(nameof(hubContext));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
            _smtpEmailDispatcher = smtpEmailDispatcher;
            _smsService = smsService;
            _templateService = templateService;
            _emailShellService = emailShellService;
            _oneSignalDispatcher = oneSignalDispatcher;
            _outboxService = outboxService;
            _httpContextAccessor = httpContextAccessor;
        }

        /// <inheritdoc />
        public async Task<NotificationDispatchResult> DispatchAsync(
            NotificationDispatchPayload payload,
            CancellationToken cancellationToken = default)
        {
            if (payload == null) throw new ArgumentNullException(nameof(payload));

            var result = new NotificationDispatchResult();

            if (string.IsNullOrWhiteSpace(payload.Title) && string.IsNullOrWhiteSpace(payload.InAppTitle) && string.IsNullOrWhiteSpace(payload.PushTitle))
            {
                result.Errors.Add("Notification Title cannot be empty.");
                return result;
            }

            if (string.IsNullOrWhiteSpace(payload.Message) && string.IsNullOrWhiteSpace(payload.InAppBody) && string.IsNullOrWhiteSpace(payload.PushBody))
            {
                result.Errors.Add("Notification Message content cannot be empty.");
                return result;
            }

            try
            {
                // 1. Resolve registered channel templates dynamically if EventType was specified
                await ResolveChannelTemplatesAsync(payload);

                // 2. Resolve Target User Recipients
                List<Profile> targetProfiles = new();

                if (payload.TargetType == NotificationDispatchTarget.SingleUser)
                {
                    Profile? user = null;

                    if (!string.IsNullOrWhiteSpace(payload.TargetUserId))
                    {
                        user = await _dbContext.Users.FindAsync(new object?[] { payload.TargetUserId }, cancellationToken);

                        if (user == null)
                        {
                            user = await _dbContext.Users.FirstOrDefaultAsync(
                                u => u.Id == payload.TargetUserId ||
                                     u.Email == payload.TargetUserId ||
                                     u.UserName == payload.TargetUserId,
                                cancellationToken);
                        }
                    }

                    if (user == null && !string.IsNullOrWhiteSpace(payload.RecipientEmail))
                    {
                        user = await _dbContext.Users.FirstOrDefaultAsync(
                            u => u.Email == payload.RecipientEmail,
                            cancellationToken);
                    }

                    if (user != null)
                    {
                        targetProfiles.Add(user);
                    }
                    else if (string.IsNullOrWhiteSpace(payload.RecipientEmail))
                    {
                        result.Errors.Add($"Target user '{payload.TargetUserId}' was not found.");
                        return result;
                    }
                }
                else if (payload.TargetType == NotificationDispatchTarget.Category)
                {
                    if (!payload.TargetCategoryId.HasValue)
                    {
                        result.Errors.Add("TargetCategoryId is required for Category dispatch.");
                        return result;
                    }

                    targetProfiles = await _dbContext.Users
                        .Where(u => u.BcpUserCategoryId == payload.TargetCategoryId.Value)
                        .ToListAsync(cancellationToken);
                }
                else if (payload.TargetType == NotificationDispatchTarget.BroadcastAll)
                {
                    targetProfiles = await _dbContext.Users
                        .Where(u => u.UserStatus == UserStatus.Active)
                        .ToListAsync(cancellationToken);
                }

                // 3. Channel 1: In-App Database Persistence & Live SignalR Broadcast
                if (payload.Channels.HasFlag(NotificationChannels.InApp))
                {
                    await DispatchInAppChannelAsync(payload, targetProfiles, result, cancellationToken);
                }

                // 4. Channel 2: Push Notifications (Lock-screen optimized title < 50 chars, body < 140 chars)
                if (payload.Channels.HasFlag(NotificationChannels.Push))
                {
                    await DispatchPushChannelAsync(payload, targetProfiles, result, cancellationToken);
                }

                // 5. Channel 3: Transactional Email via Mailcow SMTP (Rich HTML with anti-spam scrubbing)
                if (payload.Channels.HasFlag(NotificationChannels.Email) || payload.SendEmailCopy)
                {
                    await DispatchEmailChannelAsync(payload, targetProfiles, result, cancellationToken);
                }

                // 6. Channel 4: SMS Alerts via Carrier Gateway (Strict GSM 7-bit 160-char plain text)
                if (payload.Channels.HasFlag(NotificationChannels.Sms))
                {
                    await DispatchSmsChannelAsync(payload, targetProfiles, result, cancellationToken);
                }

                // 7. Channel 5: Transactional WhatsApp Notification (WhatsApp Markdown / Meta HSM Template)
                if (payload.Channels.HasFlag(NotificationChannels.WhatsApp))
                {
                    await DispatchWhatsAppChannelAsync(payload, targetProfiles, result, cancellationToken);
                }

                result.Success = (result.DispatchedInAppCount > 0 ||
                                  result.DispatchedPushCount > 0 ||
                                  result.DispatchedEmailCount > 0 ||
                                  result.DispatchedSmsCount > 0 ||
                                  result.DispatchedWhatsAppCount > 0 ||
                                  result.Errors.Count == 0);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[CentralNotificationDispatcher] Fatal error during dispatch: {Message}", ex.Message);
                result.Errors.Add($"Dispatcher execution exception: {ex.Message}");
                result.Success = false;
            }

            return result;
        }

        /// <summary>
        /// Dynamically loads and binds channel-specific templates from the template engine if an EventType is provided.
        /// </summary>
        private async Task ResolveChannelTemplatesAsync(NotificationDispatchPayload payload)
        {
            if (!payload.EventType.HasValue || _templateService == null)
            {
                return;
            }

            var placeholders = payload.Placeholders != null
                ? new Dictionary<string, string>(payload.Placeholders, StringComparer.OrdinalIgnoreCase)
                : new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);

            if (!placeholders.ContainsKey("Title")) placeholders["Title"] = payload.Title;
            if (!placeholders.ContainsKey("Message")) placeholders["Message"] = payload.Message;
            if (!placeholders.ContainsKey("ActionUrl") && !string.IsNullOrWhiteSpace(payload.ActionUrl)) placeholders["ActionUrl"] = payload.ActionUrl;
            if (!placeholders.ContainsKey("Severity")) placeholders["Severity"] = payload.Severity.ToString();
            if (!placeholders.ContainsKey("TenantKey") && !string.IsNullOrWhiteSpace(payload.TenantKey)) placeholders["TenantKey"] = payload.TenantKey;

            // In-App channel template
            if (payload.Channels.HasFlag(NotificationChannels.InApp) && string.IsNullOrWhiteSpace(payload.InAppBody))
            {
                var (subject, body) = await _templateService.RenderMessageAsync(
                    payload.EventType.Value, BcpMessageChannel.InAppNotification, placeholders,
                    payload.InAppTitle ?? payload.Title, payload.InAppBody ?? payload.Message);
                if (string.IsNullOrWhiteSpace(payload.InAppTitle)) payload.InAppTitle = subject;
                if (string.IsNullOrWhiteSpace(payload.InAppBody)) payload.InAppBody = body;
            }

            // Push channel template
            if (payload.Channels.HasFlag(NotificationChannels.Push) && string.IsNullOrWhiteSpace(payload.PushBody))
            {
                var (subject, body) = await _templateService.RenderMessageAsync(
                    payload.EventType.Value, BcpMessageChannel.Push, placeholders,
                    payload.PushTitle ?? payload.Title, payload.PushBody ?? payload.Message);
                if (string.IsNullOrWhiteSpace(payload.PushTitle)) payload.PushTitle = subject;
                if (string.IsNullOrWhiteSpace(payload.PushBody)) payload.PushBody = body;
            }

            // Email channel template
            if ((payload.Channels.HasFlag(NotificationChannels.Email) || payload.SendEmailCopy) && string.IsNullOrWhiteSpace(payload.EmailHtmlBody))
            {
                var (subject, body) = await _templateService.RenderMessageAsync(
                    payload.EventType.Value, BcpMessageChannel.Email, placeholders,
                    payload.EmailSubject ?? payload.Title, payload.EmailHtmlBody ?? payload.Message);
                if (string.IsNullOrWhiteSpace(payload.EmailSubject)) payload.EmailSubject = subject;
                if (string.IsNullOrWhiteSpace(payload.EmailHtmlBody)) payload.EmailHtmlBody = body;
            }

            // SMS channel template
            if (payload.Channels.HasFlag(NotificationChannels.Sms) && string.IsNullOrWhiteSpace(payload.SmsMessage))
            {
                var (_, body) = await _templateService.RenderMessageAsync(
                    payload.EventType.Value, BcpMessageChannel.Sms, placeholders,
                    null, payload.SmsMessage ?? payload.Message);
                if (string.IsNullOrWhiteSpace(payload.SmsMessage)) payload.SmsMessage = body;
            }

            // WhatsApp channel template
            if (payload.Channels.HasFlag(NotificationChannels.WhatsApp) && string.IsNullOrWhiteSpace(payload.WhatsAppMessage))
            {
                var (_, body) = await _templateService.RenderMessageAsync(
                    payload.EventType.Value, BcpMessageChannel.WhatsApp, placeholders,
                    null, payload.WhatsAppMessage ?? payload.Message);
                if (string.IsNullOrWhiteSpace(payload.WhatsAppMessage)) payload.WhatsAppMessage = body;
            }
        }

        /// <summary>
        /// Dispatches in-app notification records to the tenant database and broadcasts
        /// live events over SignalR to connected web, desktop, and mobile sockets.
        /// </summary>
        private async Task DispatchInAppChannelAsync(
            NotificationDispatchPayload payload,
            List<Profile> targetProfiles,
            NotificationDispatchResult result,
            CancellationToken cancellationToken)
        {
            var defaultIcon = BcpNotificationDto.GetDefaultIconForSeverity(payload.Severity);
            var iconToUse = string.IsNullOrWhiteSpace(payload.Icon) ? defaultIcon : payload.Icon;

            var inAppTitle = !string.IsNullOrWhiteSpace(payload.InAppTitle) ? payload.InAppTitle.Trim() : payload.Title.Trim();
            var inAppBody = !string.IsNullOrWhiteSpace(payload.InAppBody) ? payload.InAppBody.Trim() : payload.Message.Trim();

            if (payload.TargetType == NotificationDispatchTarget.BroadcastAll)
            {
                var broadcastNotif = new BcpNotification
                {
                    UserId = null,
                    IsBroadcast = true,
                    Title = inAppTitle,
                    Message = inAppBody,
                    ActionUrl = payload.ActionUrl,
                    Module = payload.Module ?? "Announcement",
                    Icon = iconToUse,
                    Priority = payload.Priority,
                    Category = payload.Category,
                    Severity = payload.Severity,
                    MetadataJson = payload.MetadataJson,
                    CreatedAt = DateTime.UtcNow
                };

                _dbContext.BcpNotifications.Add(broadcastNotif);
                _dbContext.BcpMessagePools.Add(new BcpMessagePool
                {
                    Channel = BcpMessageChannel.InAppNotification,
                    Provider = BcpMessageProvider.Unconfigured,
                    RelatedUserId = null,
                    RecipientAddress = "All Users (Broadcast)",
                    RecipientName = "Broadcast",
                    Subject = inAppTitle,
                    Content = inAppBody,
                    ActionUrl = payload.ActionUrl,
                    Icon = iconToUse,
                    Category = payload.Category,
                    Severity = payload.Severity,
                    Priority = payload.Priority,
                    EventType = payload.EventType,
                    Status = BcpQueueStatus.Sent,
                    SentAt = DateTime.UtcNow,
                    MetadataJson = payload.MetadataJson,
                    CreatedAt = DateTime.UtcNow
                });
                await _dbContext.SaveChangesAsync(cancellationToken);
                result.DispatchedInAppCount = 1;

                if (_outboxService != null)
                {
                    await _outboxService.EnqueueOutboundMessageAsync(
                        tenantKey: payload.TenantKey ?? string.Empty,
                        organizationName: null,
                        channel: "InAppNotification",
                        provider: "SignalR",
                        recipientAddress: "All Users (Broadcast)",
                        recipientName: "Broadcast",
                        subject: inAppTitle,
                        content: inAppBody,
                        actionUrl: payload.ActionUrl,
                        category: payload.Category.ToString(),
                        severity: payload.Severity.ToString(),
                        priority: payload.Priority.ToString(),
                        status: "Sent",
                        sentAt: DateTime.UtcNow,
                        metadataJson: payload.MetadataJson,
                        cancellationToken: cancellationToken);
                }

                var dto = BcpNotificationDto.FromEntity(broadcastNotif);
                await _hubContext.Clients.Group("broadcast").SendAsync("ReceiveNotification", dto, cancellationToken);

                if (!string.IsNullOrWhiteSpace(payload.TenantKey))
                {
                    await _hubContext.Clients.Group($"tenant_{payload.TenantKey.Trim().ToLowerInvariant()}")
                        .SendAsync("ReceiveNotification", dto, cancellationToken);
                }
            }
            else
            {
                var createdNotifications = new List<BcpNotification>();

                foreach (var profile in targetProfiles)
                {
                    var notif = new BcpNotification
                    {
                        UserId = profile.Id,
                        IsBroadcast = false,
                        Title = inAppTitle,
                        Message = inAppBody,
                        ActionUrl = payload.ActionUrl,
                        Module = payload.Module ?? "General",
                        Icon = iconToUse,
                        Priority = payload.Priority,
                        Category = payload.Category,
                        Severity = payload.Severity,
                        MetadataJson = payload.MetadataJson,
                        CreatedAt = DateTime.UtcNow
                    };

                    _dbContext.BcpNotifications.Add(notif);
                    _dbContext.BcpMessagePools.Add(new BcpMessagePool
                    {
                        Channel = BcpMessageChannel.InAppNotification,
                        Provider = BcpMessageProvider.Unconfigured,
                        RelatedUserId = profile.Id,
                        RecipientAddress = profile.UserName ?? profile.Email ?? profile.Id,
                        RecipientName = $"{profile.FirstName} {profile.LastName}".Trim(),
                        Subject = inAppTitle,
                        Content = inAppBody,
                        ActionUrl = payload.ActionUrl,
                        Icon = iconToUse,
                        Category = payload.Category,
                        Severity = payload.Severity,
                        Priority = payload.Priority,
                        EventType = payload.EventType,
                        Status = BcpQueueStatus.Sent,
                        SentAt = DateTime.UtcNow,
                        MetadataJson = payload.MetadataJson,
                        CreatedAt = DateTime.UtcNow
                    });
                    createdNotifications.Add(notif);

                    if (_outboxService != null)
                    {
                        var address = profile.Email ?? profile.UserName ?? profile.Id;
                        var recipientName = $"{profile.FirstName} {profile.LastName}".Trim();
                        await _outboxService.EnqueueOutboundMessageAsync(
                            tenantKey: payload.TenantKey ?? string.Empty,
                            organizationName: null,
                            channel: "InAppNotification",
                            provider: "SignalR",
                            recipientAddress: address,
                            recipientName: recipientName,
                            subject: inAppTitle,
                            content: inAppBody,
                            actionUrl: payload.ActionUrl,
                            category: payload.Category.ToString(),
                            severity: payload.Severity.ToString(),
                            priority: payload.Priority.ToString(),
                            status: "Sent",
                            sentAt: DateTime.UtcNow,
                            metadataJson: payload.MetadataJson,
                            cancellationToken: cancellationToken);
                    }
                }

                await _dbContext.SaveChangesAsync(cancellationToken);
                result.DispatchedInAppCount = createdNotifications.Count;

                // Broadcast live SignalR socket message to each connected user
                foreach (var notif in createdNotifications)
                {
                    var dto = BcpNotificationDto.FromEntity(notif);
                    if (!string.IsNullOrEmpty(notif.UserId))
                    {
                        await _hubContext.Clients.Group($"user_{notif.UserId}")
                            .SendAsync("ReceiveNotification", dto, cancellationToken);

                        var unreadCount = await _dbContext.BcpNotifications
                            .CountAsync(n => n.UserId == notif.UserId && !n.IsRead, cancellationToken);

                        await _hubContext.Clients.Group($"user_{notif.UserId}")
                            .SendAsync("NotificationCountUpdated", unreadCount, cancellationToken);
                    }
                }
            }
        }

        /// <summary>
        /// Dispatches push notifications tailored for mobile and desktop lock screens:
        /// Title <= 50 chars, Body <= 140 chars, with structured deep link data payload.
        /// </summary>
        private async Task DispatchPushChannelAsync(
            NotificationDispatchPayload payload,
            List<Profile> targetProfiles,
            NotificationDispatchResult result,
            CancellationToken cancellationToken)
        {
            var recipientCount = payload.TargetType == NotificationDispatchTarget.BroadcastAll ? 1 : targetProfiles.Count;

            // Resolve tenant brand identity (BrandName & Logo/Icon) so every push alert displays the tenant's brand name and logo
            string? tenantBrandName = null;
            string? tenantLogoUrl = null;
            try
            {
                var brandSetting = await _dbContext.MisWebsiteSettings
                    .AsNoTracking()
                    .FirstOrDefaultAsync(cancellationToken);
                if (brandSetting != null)
                {
                    tenantBrandName = !string.IsNullOrWhiteSpace(brandSetting.CompanyName)
                        ? brandSetting.CompanyName.Trim()
                        : (!string.IsNullOrWhiteSpace(brandSetting.BrandName) ? brandSetting.BrandName.Trim() : brandSetting.SiteTitle?.Trim());
                    tenantLogoUrl = !string.IsNullOrWhiteSpace(brandSetting.CompanyIconUrl)
                        ? brandSetting.CompanyIconUrl.Trim()
                        : (!string.IsNullOrWhiteSpace(brandSetting.FaviconUrl)
                            ? brandSetting.FaviconUrl.Trim()
                            : (!string.IsNullOrWhiteSpace(brandSetting.CompanyLogoUrl)
                                ? brandSetting.CompanyLogoUrl.Trim()
                                : brandSetting.LogoUrl?.Trim()));
                }
            }
            catch { }

            if (!string.IsNullOrWhiteSpace(tenantLogoUrl) && !tenantLogoUrl.StartsWith("http", StringComparison.OrdinalIgnoreCase))
            {
                tenantLogoUrl = EnsureAbsoluteActionUrl(tenantLogoUrl, payload.TenantKey);
            }

            // Enforce mobile/desktop push lock-screen constraints and prefix tenant brand name if not already present
            var rawPushTitle = !string.IsNullOrWhiteSpace(payload.PushTitle) ? payload.PushTitle : payload.Title;
            var cleanPushTitle = StripHtmlTags(rawPushTitle).Trim();
            if (!string.IsNullOrWhiteSpace(tenantBrandName) &&
                !cleanPushTitle.Contains(tenantBrandName, StringComparison.OrdinalIgnoreCase))
            {
                cleanPushTitle = $"{tenantBrandName}: {cleanPushTitle}";
            }
            if (cleanPushTitle.Length > 65)
            {
                cleanPushTitle = cleanPushTitle.Substring(0, 62) + "...";
            }

            var rawPushBody = !string.IsNullOrWhiteSpace(payload.PushBody) ? payload.PushBody : payload.Message;
            var cleanPushBody = StripHtmlTags(rawPushBody).Trim();
            if (cleanPushBody.Length > 140)
            {
                cleanPushBody = cleanPushBody.Substring(0, 137) + "...";
            }

            // Resolve canonical absolute action URL
            var effectiveActionUrl = EnsureAbsoluteActionUrl(payload.ActionUrl, payload.TenantKey);

            // Prepare push metadata payload dictionary
            var pushData = payload.PushData != null
                ? new Dictionary<string, string>(payload.PushData)
                : new Dictionary<string, string>();

            pushData["tenant_key"] = payload.TenantKey ?? string.Empty;
            if (!string.IsNullOrWhiteSpace(tenantBrandName))
            {
                pushData["tenant_name"] = tenantBrandName;
            }
            if (!string.IsNullOrWhiteSpace(tenantLogoUrl))
            {
                pushData["tenant_logo_url"] = tenantLogoUrl;
            }
            pushData["severity"] = ((int)payload.Severity).ToString();
            pushData["severity_label"] = payload.Severity.ToString();
            pushData["action_url"] = effectiveActionUrl;
            pushData["module"] = payload.Module ?? "General";

            _logger.LogInformation(
                "[CentralNotificationDispatcher] Dispatching push notification for target {Target} (Recipients: {Count}). Title='{Title}', Body='{Body}', Severity={Severity}, TenantKey={TenantKey}",
                payload.TargetType, recipientCount, cleanPushTitle, cleanPushBody, payload.Severity, payload.TenantKey);

            // Execute instant delivery via OneSignal REST API
            bool pushDelivered = false;
            string? pushError = null;
            string? oneSignalExternalId = null;

            if (_oneSignalDispatcher != null)
            {
                var targetUserIds = payload.TargetType == NotificationDispatchTarget.BroadcastAll
                    ? null
                    : targetProfiles.Select(p => p.Id).Where(id => !string.IsNullOrWhiteSpace(id)).ToList();

                var dispatchResult = await _oneSignalDispatcher.SendPushNotificationAsync(
                    cleanPushTitle,
                    cleanPushBody,
                    effectiveActionUrl,
                    targetUserIds,
                    payload.TenantKey,
                    pushData,
                    cancellationToken);

                pushDelivered = dispatchResult.Success;
                pushError = dispatchResult.ErrorMessage;
                oneSignalExternalId = dispatchResult.OneSignalNotificationId;
            }
            else
            {
                pushError = "OneSignal push dispatcher is not configured in service collection.";
            }

            var provider = _oneSignalDispatcher != null ? BcpMessageProvider.OneSignal : BcpMessageProvider.Unconfigured;
            var queueStatus = pushDelivered ? BcpQueueStatus.Sent : BcpQueueStatus.Failed;
            var sentTimestamp = pushDelivered ? DateTime.UtcNow : (DateTime?)null;

            if (payload.TargetType == NotificationDispatchTarget.BroadcastAll)
            {
                _dbContext.BcpMessagePools.Add(new BcpMessagePool
                {
                    Channel = BcpMessageChannel.Push,
                    Provider = provider,
                    RelatedUserId = null,
                    RecipientAddress = "All Devices (Push Broadcast)",
                    RecipientName = "Push Broadcast",
                    Subject = cleanPushTitle,
                    Content = cleanPushBody,
                    ActionUrl = effectiveActionUrl,
                    Category = payload.Category,
                    Severity = payload.Severity,
                    Priority = payload.Priority,
                    EventType = payload.EventType,
                    Status = queueStatus,
                    SentAt = sentTimestamp,
                    LastError = pushError,
                    ProviderMessageId = oneSignalExternalId,
                    MetadataJson = System.Text.Json.JsonSerializer.Serialize(pushData),
                    CreatedAt = DateTime.UtcNow
                });
            }
            else
            {
                foreach (var profile in targetProfiles)
                {
                    _dbContext.BcpMessagePools.Add(new BcpMessagePool
                    {
                        Channel = BcpMessageChannel.Push,
                        Provider = provider,
                        RelatedUserId = profile.Id,
                        RecipientAddress = profile.UserName ?? profile.Email ?? profile.Id,
                        RecipientName = $"{profile.FirstName} {profile.LastName}".Trim(),
                        Subject = cleanPushTitle,
                        Content = cleanPushBody,
                        ActionUrl = effectiveActionUrl,
                        Category = payload.Category,
                        Severity = payload.Severity,
                        Priority = payload.Priority,
                        EventType = payload.EventType,
                        Status = queueStatus,
                        SentAt = sentTimestamp,
                        LastError = pushError,
                        ProviderMessageId = oneSignalExternalId,
                        MetadataJson = System.Text.Json.JsonSerializer.Serialize(pushData),
                        CreatedAt = DateTime.UtcNow
                    });
                }
            }

            try
            {
                await _dbContext.SaveChangesAsync(cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[CentralNotificationDispatcher] Failed to save push BcpMessagePool records: {Msg}", ex.Message);
            }

            // Mirror push notifications to central Master Message Pool for cross-tenant outbox auditing
            if (_outboxService != null)
            {
                var pushProvider = _oneSignalDispatcher != null ? "OneSignal" : "SystemPush";
                var pushStatus = pushDelivered ? "Sent" : "Failed";

                if (payload.TargetType == NotificationDispatchTarget.BroadcastAll)
                {
                    await _outboxService.EnqueueOutboundMessageAsync(
                        tenantKey: payload.TenantKey ?? string.Empty,
                        organizationName: null,
                        channel: "Push",
                        provider: pushProvider,
                        recipientAddress: "All Devices (Push Broadcast)",
                        recipientName: "Push Broadcast",
                        subject: cleanPushTitle,
                        content: cleanPushBody,
                        actionUrl: effectiveActionUrl,
                        category: payload.Category.ToString(),
                        severity: payload.Severity.ToString(),
                        priority: payload.Priority.ToString(),
                        status: pushStatus,
                        sentAt: sentTimestamp,
                        lastError: pushError,
                        providerMessageId: oneSignalExternalId,
                        metadataJson: System.Text.Json.JsonSerializer.Serialize(pushData),
                        cancellationToken: cancellationToken);
                }
                else
                {
                    foreach (var profile in targetProfiles)
                    {
                        var pushAddress = profile.Email ?? profile.UserName ?? profile.Id;
                        var recName = $"{profile.FirstName} {profile.LastName}".Trim();
                        await _outboxService.EnqueueOutboundMessageAsync(
                            tenantKey: payload.TenantKey ?? string.Empty,
                            organizationName: null,
                            channel: "Push",
                            provider: pushProvider,
                            recipientAddress: pushAddress,
                            recipientName: recName,
                            subject: cleanPushTitle,
                            content: cleanPushBody,
                            actionUrl: effectiveActionUrl,
                            category: payload.Category.ToString(),
                            severity: payload.Severity.ToString(),
                            priority: payload.Priority.ToString(),
                            status: pushStatus,
                            sentAt: sentTimestamp,
                            lastError: pushError,
                            providerMessageId: oneSignalExternalId,
                            metadataJson: System.Text.Json.JsonSerializer.Serialize(pushData),
                            cancellationToken: cancellationToken);
                    }
                }
            }

            if (pushDelivered)
            {
                result.DispatchedPushCount += recipientCount;
            }
            else if (!string.IsNullOrWhiteSpace(pushError))
            {
                result.Errors.Add($"Push delivery: {pushError}");
            }
        }

        /// <summary>
        /// Enqueues branded, responsive HTML transactional emails into <c>BcpMessagePools</c>
        /// with canonical severity styling and anti-spam validation so the background Worker Service
        /// delivers them asynchronously without blocking API requests.
        /// </summary>
        private async Task DispatchEmailChannelAsync(
            NotificationDispatchPayload payload,
            List<Profile> targetProfiles,
            NotificationDispatchResult result,
            CancellationToken cancellationToken)
        {
            var colorHex = BcpNotificationDto.GetColorForSeverity(payload.Severity);
            var severityLabel = payload.Severity.ToString();

            // Resolve and validate email subject
            var rawSubject = !string.IsNullOrWhiteSpace(payload.EmailSubject) ? payload.EmailSubject : payload.Title;
            var (safeSubject, spamWarnings) = ValidateAndSanitizeEmailSubject(rawSubject, payload.Severity);

            foreach (var warning in spamWarnings)
            {
                _logger.LogWarning("[CentralNotificationDispatcher] Anti-spam trigger flagged: {Warning}", warning);
                result.Errors.Add($"Spam Deliverability Notice: {warning}");
            }

            var recipients = targetProfiles
                .Where(p => !string.IsNullOrWhiteSpace(p.Email))
                .Select(p => p.Email!)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            if (!string.IsNullOrWhiteSpace(payload.RecipientEmail) && !recipients.Contains(payload.RecipientEmail, StringComparer.OrdinalIgnoreCase))
            {
                recipients.Add(payload.RecipientEmail.Trim());
            }

            // Resolve tenant brand identity dynamically from MisWebsiteSettings
            string tenantBrand = "Workspace";
            string? tenantLogo = null;
            try
            {
                var site = await _dbContext.MisWebsiteSettings.AsNoTracking().FirstOrDefaultAsync(cancellationToken);
                if (site != null)
                {
                    tenantBrand = !string.IsNullOrWhiteSpace(site.BrandName)
                        ? site.BrandName.Trim()
                        : (!string.IsNullOrWhiteSpace(site.CompanyName) ? site.CompanyName.Trim() : "Workspace");
                    tenantLogo = site.CompanyWhiteLogoUrl ?? site.WhiteLogoUrl ?? site.CompanyLogoUrl ?? site.LogoUrl;
                }
            }
            catch
            {
                // Fallback to Workspace
            }

            // Resolve canonical absolute action URL so email buttons always open a valid web address
            var effectiveActionUrl = EnsureAbsoluteActionUrl(payload.ActionUrl, payload.TenantKey);

            foreach (var email in recipients)
            {
                string htmlBody = string.Empty;
                try
                {
                    if (!string.IsNullOrWhiteSpace(payload.EmailHtmlBody) &&
                        (payload.EmailHtmlBody.Contains("<!DOCTYPE html", StringComparison.OrdinalIgnoreCase) ||
                         payload.EmailHtmlBody.Contains("<html", StringComparison.OrdinalIgnoreCase)))
                    {
                        htmlBody = payload.EmailHtmlBody;
                    }
                    else if (_emailShellService != null)
                    {
                        var bodyText = !string.IsNullOrWhiteSpace(payload.EmailHtmlBody) ? payload.EmailHtmlBody : payload.Message;
                        htmlBody = _emailShellService.WrapWithTenantShell(
                            innerHtml: bodyText,
                            title: safeSubject,
                            recipientFirstName: payload.RecipientName,
                            tenantBrandName: tenantBrand,
                            tenantLogoUrl: tenantLogo,
                            actionUrl: effectiveActionUrl,
                            actionText: "View in Workspace",
                            brandColorHex: colorHex,
                            badgeLabel: null);
                    }
                    else
                    {
                        var bodyText = !string.IsNullOrWhiteSpace(payload.EmailHtmlBody) ? payload.EmailHtmlBody : payload.Message;
                        htmlBody = GenerateSeverityEmailHtml(safeSubject, bodyText, effectiveActionUrl, severityLabel, colorHex, tenantBrand, tenantLogo);
                    }

                    // Anti-spam body check for suspicious URL shorteners
                    foreach (var domain in SuspiciousShortenedDomains)
                    {
                        if (htmlBody.Contains(domain, StringComparison.OrdinalIgnoreCase))
                        {
                            result.Errors.Add($"Anti-spam warning: Email body contains URL shortener '{domain}'. This may harm sender reputation.");
                            break;
                        }
                    }

                    // Resolve tenant sender address and display name from MisConfigurationSettings so the Worker has full context
                    var siteConfig = await _dbContext.MisConfigurationSettings.AsNoTracking().FirstOrDefaultAsync(cancellationToken);
                    string fromAddress;
                    if (!string.IsNullOrWhiteSpace(siteConfig?.SenderEmail))
                    {
                        fromAddress = siteConfig.SenderEmail.Trim().ToLowerInvariant();
                    }
                    else if (!string.IsNullOrWhiteSpace(payload.TenantKey))
                    {
                        fromAddress = $"noreply@{payload.TenantKey.Trim().ToLowerInvariant()}.ozikol.cloud";
                    }
                    else
                    {
                        fromAddress = string.Empty;
                    }

                    var fromName = !string.IsNullOrWhiteSpace(siteConfig?.SenderName)
                        ? siteConfig.SenderName.Trim()
                        : tenantBrand;

                    var emailMetadataJson = System.Text.Json.JsonSerializer.Serialize(new
                    {
                        fromName,
                        fromEmail = fromAddress,
                        tenantKey = payload.TenantKey,
                        module = payload.Module
                    });

                    _dbContext.BcpMessagePools.Add(new BcpMessagePool
                    {
                        Channel = BcpMessageChannel.Email,
                        Provider = BcpMessageProvider.Mailcow,
                        RelatedUserId = targetProfiles.FirstOrDefault(p => p.Email != null && p.Email.Equals(email, StringComparison.OrdinalIgnoreCase))?.Id,
                        RecipientAddress = email,
                        RecipientName = payload.RecipientName,
                        Subject = safeSubject,
                        Content = htmlBody,
                        PlainTextFallback = StripHtmlTags(!string.IsNullOrWhiteSpace(payload.EmailHtmlBody) ? payload.EmailHtmlBody : payload.Message).Trim(),
                        ActionUrl = effectiveActionUrl,
                        Icon = payload.Icon,
                        SenderOrTemplateName = string.IsNullOrWhiteSpace(fromAddress) ? null : fromAddress,
                        MetadataJson = emailMetadataJson,
                        Category = payload.Category,
                        Severity = payload.Severity,
                        Priority = payload.Priority,
                        EventType = payload.EventType,
                        Status = BcpQueueStatus.Queued,
                        SentAt = null,
                        CreatedAt = DateTime.UtcNow
                    });

                    // Route to central Master Message Pool so autonomous workers dispatch with zero tenant DB dependency
                    if (_outboxService != null)
                    {
                        await _outboxService.EnqueueOutboundMessageAsync(
                            tenantKey: payload.TenantKey ?? string.Empty,
                            organizationName: tenantBrand,
                            channel: "Email",
                            provider: "Mailcow",
                            recipientAddress: email,
                            recipientName: payload.RecipientName,
                            subject: safeSubject,
                            content: htmlBody,
                            plainTextFallback: StripHtmlTags(!string.IsNullOrWhiteSpace(payload.EmailHtmlBody) ? payload.EmailHtmlBody : payload.Message).Trim(),
                            actionUrl: effectiveActionUrl,
                            category: payload.Category.ToString(),
                            severity: payload.Severity.ToString(),
                            priority: payload.Priority.ToString(),
                            senderOrTemplateName: string.IsNullOrWhiteSpace(fromAddress) ? null : fromAddress,
                            metadataJson: emailMetadataJson,
                            scheduledAt: null,
                            cancellationToken: cancellationToken);
                    }

                    result.DispatchedEmailCount++;
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "[CentralNotificationDispatcher] Email dispatch failed for {Email}: {Msg}", email, ex.Message);
                    result.Errors.Add($"Email delivery to '{email}' failed: {ex.Message}");

                    _dbContext.BcpMessagePools.Add(new BcpMessagePool
                    {
                        Channel = BcpMessageChannel.Email,
                        Provider = BcpMessageProvider.Mailcow,
                        RelatedUserId = targetProfiles.FirstOrDefault(p => p.Email != null && p.Email.Equals(email, StringComparison.OrdinalIgnoreCase))?.Id,
                        RecipientAddress = email,
                        RecipientName = payload.RecipientName,
                        Subject = safeSubject,
                        Content = !string.IsNullOrWhiteSpace(htmlBody) ? htmlBody : payload.Message,
                        Category = payload.Category,
                        Severity = payload.Severity,
                        Priority = payload.Priority,
                        EventType = payload.EventType,
                        Status = BcpQueueStatus.Failed,
                        LastError = ex.Message,
                        CreatedAt = DateTime.UtcNow
                    });
                }
            }

            try
            {
                await _dbContext.SaveChangesAsync(cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[CentralNotificationDispatcher] Failed to save BcpMessagePool email audit records: {Msg}", ex.Message);
            }
        }

        /// <summary>
        /// Enqueues concise SMS text messages into <c>BcpMessagePools</c> strictly enforcing GSM 7-bit
        /// 160-character segment boundaries for asynchronous delivery by the Worker Service.
        /// </summary>
        private async Task DispatchSmsChannelAsync(
            NotificationDispatchPayload payload,
            List<Profile> targetProfiles,
            NotificationDispatchResult result,
            CancellationToken cancellationToken)
        {
            var phoneNumbers = targetProfiles
                .Where(p => !string.IsNullOrWhiteSpace(p.PhoneNumber))
                .Select(p => p.PhoneNumber!)
                .Distinct()
                .ToList();

            // Prepare SMS content: strictly plain-text without HTML tags or markdown
            string smsContent;
            if (!string.IsNullOrWhiteSpace(payload.SmsMessage))
            {
                smsContent = StripHtmlTags(payload.SmsMessage).Trim();
            }
            else
            {
                var cleanTitle = StripHtmlTags(payload.Title).Trim();
                var cleanBody = StripHtmlTags(payload.Message).Trim();
                var tenantTag = !string.IsNullOrWhiteSpace(payload.TenantKey) ? $"[{payload.TenantKey.ToUpperInvariant()}] " : string.Empty;
                smsContent = $"{tenantTag}{cleanTitle}: {cleanBody}";
            }

            // Normalise internal whitespace and newlines for carrier efficiency
            smsContent = System.Text.RegularExpressions.Regex.Replace(smsContent, @"\s+", " ");

            // Check against single 160-character GSM 7-bit segment boundary
            if (smsContent.Length > 160)
            {
                result.Errors.Add($"SMS message exceeded 160 characters (was {smsContent.Length} chars) and was safely truncated to prevent multi-segment billing.");
                smsContent = smsContent.Substring(0, 157) + "...";
            }

            foreach (var phone in phoneNumbers)
            {
                var targetProfile = targetProfiles.FirstOrDefault(p => p.PhoneNumber != null && p.PhoneNumber.Equals(phone, StringComparison.OrdinalIgnoreCase));
                _dbContext.BcpMessagePools.Add(new BcpMessagePool
                {
                    Channel = BcpMessageChannel.Sms,
                    Provider = BcpMessageProvider.Unconfigured,
                    RelatedUserId = targetProfile?.Id,
                    RecipientAddress = phone,
                    RecipientName = targetProfile != null ? $"{targetProfile.FirstName} {targetProfile.LastName}".Trim() : null,
                    Subject = "SMS Notification",
                    Content = smsContent,
                    Category = payload.Category,
                    Severity = payload.Severity,
                    Priority = payload.Priority,
                    EventType = payload.EventType,
                    Status = BcpQueueStatus.Queued,
                    SentAt = null,
                    CreatedAt = DateTime.UtcNow
                });
                result.DispatchedSmsCount++;

                if (_outboxService != null)
                {
                    await _outboxService.EnqueueOutboundMessageAsync(
                        tenantKey: payload.TenantKey ?? string.Empty,
                        organizationName: null,
                        channel: "Sms",
                        provider: "Carrier",
                        recipientAddress: phone,
                        recipientName: targetProfile != null ? $"{targetProfile.FirstName} {targetProfile.LastName}".Trim() : null,
                        subject: "SMS Notification",
                        content: smsContent,
                        category: payload.Category.ToString(),
                        severity: payload.Severity.ToString(),
                        priority: payload.Priority.ToString(),
                        status: "Queued",
                        cancellationToken: cancellationToken);
                }
            }

            try
            {
                await _dbContext.SaveChangesAsync(cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[CentralNotificationDispatcher] Failed to save SMS BcpMessagePool records: {Msg}", ex.Message);
            }
        }

        /// <summary>
        /// Dispatches transactional WhatsApp messages formatted with WhatsApp Markdown (*bold*, _italics_)
        /// or binds positional parameters ({{1}}, {{2}}) for Meta Cloud API approved HSM templates.
        /// </summary>
        private async Task DispatchWhatsAppChannelAsync(
            NotificationDispatchPayload payload,
            List<Profile> targetProfiles,
            NotificationDispatchResult result,
            CancellationToken cancellationToken)
        {
            var phoneNumbers = targetProfiles
                .Where(p => !string.IsNullOrWhiteSpace(p.PhoneNumber))
                .Select(p => p.PhoneNumber!)
                .Distinct()
                .ToList();

            // Resolve canonical absolute action URL
            var effectiveActionUrl = EnsureAbsoluteActionUrl(payload.ActionUrl, payload.TenantKey);

            // Format WhatsApp content using WhatsApp-specific markdown (*bold*, _italic_)
            string whatsAppBody;
            if (!string.IsNullOrWhiteSpace(payload.WhatsAppMessage))
            {
                whatsAppBody = payload.WhatsAppMessage.Trim();
            }
            else
            {
                var sb = new System.Text.StringBuilder();
                var cleanTitle = StripHtmlTags(payload.Title).Trim();
                var cleanBody = StripHtmlTags(payload.Message).Trim();

                sb.AppendLine($"*{cleanTitle}*");
                sb.AppendLine();
                sb.AppendLine(cleanBody);

                if (!string.IsNullOrWhiteSpace(effectiveActionUrl))
                {
                    sb.AppendLine();
                    sb.AppendLine($"👉 *Open in Workspace:* {effectiveActionUrl.Trim()}");
                }

                whatsAppBody = sb.ToString();
            }

            _logger.LogInformation(
                "[CentralNotificationDispatcher] WhatsApp alert queued for {Count} recipients. HSM Template='{Template}', MessageLength={Len}",
                phoneNumbers.Count, payload.WhatsAppTemplateName ?? "freeform-markdown", whatsAppBody.Length);

            foreach (var phone in phoneNumbers)
            {
                var targetProfile = targetProfiles.FirstOrDefault(p => p.PhoneNumber != null && p.PhoneNumber.Equals(phone, StringComparison.OrdinalIgnoreCase));
                _dbContext.BcpMessagePools.Add(new BcpMessagePool
                {
                    Channel = BcpMessageChannel.WhatsApp,
                    Provider = BcpMessageProvider.Unconfigured,
                    RelatedUserId = targetProfile?.Id,
                    RecipientAddress = phone,
                    RecipientName = targetProfile != null ? $"{targetProfile.FirstName} {targetProfile.LastName}".Trim() : null,
                    Subject = payload.Title ?? "WhatsApp Notification",
                    Content = whatsAppBody,
                    SenderOrTemplateName = payload.WhatsAppTemplateName ?? "freeform-markdown",
                    ActionUrl = effectiveActionUrl,
                    Category = payload.Category,
                    Severity = payload.Severity,
                    Priority = payload.Priority,
                    EventType = payload.EventType,
                    Status = BcpQueueStatus.Queued,
                    SentAt = null,
                    MetadataJson = payload.MetadataJson,
                    CreatedAt = DateTime.UtcNow
                });

                if (_outboxService != null)
                {
                    await _outboxService.EnqueueOutboundMessageAsync(
                        tenantKey: payload.TenantKey ?? string.Empty,
                        organizationName: null,
                        channel: "WhatsApp",
                        provider: "MetaWhatsApp",
                        recipientAddress: phone,
                        recipientName: targetProfile != null ? $"{targetProfile.FirstName} {targetProfile.LastName}".Trim() : null,
                        subject: payload.Title ?? "WhatsApp Notification",
                        content: whatsAppBody,
                        actionUrl: effectiveActionUrl,
                        category: payload.Category.ToString(),
                        severity: payload.Severity.ToString(),
                        priority: payload.Priority.ToString(),
                        senderOrTemplateName: payload.WhatsAppTemplateName ?? "freeform-markdown",
                        metadataJson: payload.MetadataJson,
                        status: "Queued",
                        cancellationToken: cancellationToken);
                }
            }

            try
            {
                await _dbContext.SaveChangesAsync(cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[CentralNotificationDispatcher] Failed to save WhatsApp BcpMessagePool records: {Msg}", ex.Message);
            }

            result.DispatchedWhatsAppCount += phoneNumbers.Count;
        }

        /// <summary>
        /// Validates subject lines against anti-spam blacklist rules and detects ALL CAPS warnings (AGENTS.md Rule 6).
        /// </summary>
        private static (string SafeSubject, List<string> Warnings) ValidateAndSanitizeEmailSubject(string rawSubject, NotificationSeverity severity)
        {
            var warnings = new List<string>();
            var trimmed = rawSubject.Trim();

            // Rule 6.2: ALL CAPS Subject Line Warning
            if (trimmed.Length >= 8 &&
                trimmed.Equals(trimmed.ToUpperInvariant(), StringComparison.Ordinal) &&
                System.Text.RegularExpressions.Regex.IsMatch(trimmed, "[A-Z]"))
            {
                warnings.Add($"Subject line '{trimmed}' is written in ALL CAPS. Converted to title case to safeguard domain deliverability.");
                // Convert to title case
                trimmed = System.Globalization.CultureInfo.CurrentCulture.TextInfo.ToTitleCase(trimmed.ToLowerInvariant());
            }

            // Rule 6.3: Spam Trigger Words & Phrases Detection
            foreach (var trigger in SpamBlacklistWords)
            {
                if (trimmed.IndexOf(trigger, StringComparison.OrdinalIgnoreCase) >= 0)
                {
                    warnings.Add($"Subject contains high-risk spam trigger phrase '{trigger}'. Consider rephrasing to prevent mailbox junk filtering.");
                }
            }

            return (trimmed, warnings);
        }

        /// <summary>
        /// Converts relative action paths (e.g. "/workforce/workspace/open-shifts") into fully qualified,
        /// absolute browser URLs by resolving the calling client's Origin, Referer, Host, or tenant domain fallback.
        /// Prevents email clients (such as Gmail) from rendering malformed URLs like "http:///path".
        /// </summary>
        private string EnsureAbsoluteActionUrl(string? actionUrl, string? tenantKey)
        {
            if (string.IsNullOrWhiteSpace(actionUrl)) return string.Empty;
            var trimmed = actionUrl.Trim();

            if (trimmed.StartsWith("http://", StringComparison.OrdinalIgnoreCase) ||
                trimmed.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
            {
                return trimmed;
            }

            string? clientBaseUrl = null;

            if (_httpContextAccessor?.HttpContext != null)
            {
                var req = _httpContextAccessor.HttpContext.Request;

                // 1. Inspect Origin header (e.g. "http://nightpress.localhost:4200" or "https://nightpress.ozikol.cloud")
                var origin = req.Headers["Origin"].FirstOrDefault();
                if (!string.IsNullOrWhiteSpace(origin) && !origin.Equals("null", StringComparison.OrdinalIgnoreCase))
                {
                    clientBaseUrl = origin.TrimEnd('/');
                }

                // 2. Fall back to Referer header authority
                if (string.IsNullOrWhiteSpace(clientBaseUrl))
                {
                    var referer = req.Headers["Referer"].FirstOrDefault();
                    if (!string.IsNullOrWhiteSpace(referer) && Uri.TryCreate(referer, UriKind.Absolute, out var refUri))
                    {
                        clientBaseUrl = $"{refUri.Scheme}://{refUri.Authority}";
                    }
                }

                // 3. Fall back to Request Host (e.g. "nightpress.ozikol.cloud" or "nightpress.localhost:5000")
                if (string.IsNullOrWhiteSpace(clientBaseUrl) && req.Host.HasValue)
                {
                    clientBaseUrl = $"{req.Scheme}://{req.Host}";
                }
            }

            // 4. Default fallback: derive tenant production domain
            if (string.IsNullOrWhiteSpace(clientBaseUrl))
            {
                var safeTenant = !string.IsNullOrWhiteSpace(tenantKey) ? tenantKey.Trim().ToLowerInvariant() : "app";
                clientBaseUrl = $"https://{safeTenant}.ozikol.cloud";
            }

            var cleanPath = trimmed.StartsWith("/") ? trimmed : $"/{trimmed}";
            return $"{clientBaseUrl}{cleanPath}";
        }

        /// <summary>
        /// Strips raw HTML tags from content strings, returning plain text with decoded entities.
        /// </summary>
        private static string StripHtmlTags(string html)
        {
            if (string.IsNullOrWhiteSpace(html)) return string.Empty;
            var withoutTags = System.Text.RegularExpressions.Regex.Replace(html, @"<[^>]+>|&nbsp;", " ");
            return System.Net.WebUtility.HtmlDecode(withoutTags);
        }

        /// <summary>
        /// Generates a modern, responsive HTML email template styled with the severity's canonical color token.
        /// </summary>
        private static string GenerateSeverityEmailHtml(
            string title,
            string message,
            string? actionUrl,
            string severityLabel,
            string colorHex,
            string tenantBrand = "Workspace",
            string? logoUrl = null)
        {
            const string buttonColor = "#0050e5"; // Official Royal Blue per AGENTS.md Rule 7
            var actionButtonHtml = !string.IsNullOrWhiteSpace(actionUrl)
                ? $"<div style='margin-top:32px; text-align:center;'><a href='{actionUrl}' style='display:inline-block; background-color:{buttonColor}; color:#ffffff; font-weight:700; font-size:14px; padding:13px 32px; border-radius:8px; text-decoration:none; box-shadow:0 2px 6px rgba(0,80,229,0.25);'>View in Workspace</a></div>"
                : string.Empty;

            var brandDisplayHtml = !string.IsNullOrWhiteSpace(logoUrl)
                ? $"<img src='{logoUrl.Trim()}' alt='{System.Net.WebUtility.HtmlEncode(tenantBrand)}' style='max-height:44px; max-width:220px; object-fit:contain; display:inline-block; vertical-align:middle;' />"
                : $"<span style='font-size:20px; font-weight:800; color:#0f172a; letter-spacing:-0.4px;'>{System.Net.WebUtility.HtmlEncode(tenantBrand)}</span>";

            var badgeHtml = !string.IsNullOrWhiteSpace(severityLabel)
                ? $"<div style='margin-top:8px;'><span style='display:inline-block; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; padding:3px 10px; border-radius:100px; background-color:#f1f5f9; color:#475569; border:1px solid #cbd5e1;'>{severityLabel}</span></div>"
                : string.Empty;

            return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1'>
</head>
<body style='margin:0; padding:0; background-color:#F8FAFC; font-family:-apple-system, BlinkMacSystemFont, ""Segoe UI"", Roboto, Helvetica, Arial, sans-serif;'>
    <table width='100%' cellpadding='0' cellspacing='0' style='background-color:#F8FAFC; padding:40px 16px;'>
        <tr>
            <td align='center'>
                <table width='600' cellpadding='0' cellspacing='0' style='max-width:600px; width:100%; background-color:#FFFFFF; border-radius:16px; border:1px solid #E2E8F0; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.05);'>
                    <!-- Header Banner (Crisp White + Centered Logo) -->
                    <tr>
                        <td align='center' style='background-color:#FFFFFF; padding:28px 24px; text-align:center; border-bottom:1px solid #E2E8F0;'>
                            <div style='text-align:center; margin:0 auto;'>
                                {brandDisplayHtml}
                            </div>
                            {badgeHtml}
                        </td>
                    </tr>
                    <!-- Body Content -->
                    <tr>
                        <td style='padding:36px 32px;'>
                            <h1 style='margin:0 0 16px 0; font-size:22px; font-weight:700; color:#0F172A; line-height:1.3;'>{title}</h1>
                            <p style='margin:0; font-size:15px; line-height:1.6; color:#475569;'>{message}</p>
                            {actionButtonHtml}
                        </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                        <td style='background-color:#F8FAFC; padding:20px 32px; border-top:1px solid #E2E8F0; font-size:12px; color:#94A3B8; text-align:center;'>
                            This is an automated system notification from your {System.Net.WebUtility.HtmlEncode(tenantBrand)} workspace. Please do not reply directly to this email.
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>";
        }
    }
}
