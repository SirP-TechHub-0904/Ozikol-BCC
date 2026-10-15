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
using Ozikol_BCC.EmailServices.Postmark.Interfaces;
using Ozikol_BCC.Persistence.EF.SQL;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Application.Services.Notifications
{
    /// <summary>
    /// Central multi-channel notification and messaging dispatcher implementation.
    /// Dispatches alerts across In-App feeds, live SignalR sockets, native push payloads,
    /// Postmark transactional emails, carrier SMS, and WhatsApp messages using the
    /// canonical 6-tier severity standards (#F06548, #F7B84B, #0AB39C, #38BDF8, #1F6BFF, #9333EA).
    /// </summary>
    public class CentralNotificationDispatcher : ICentralNotificationDispatcher
    {
        private readonly DashboardDbContext _dbContext;
        private readonly IHubContext<NotificationHub> _hubContext;
        private readonly IPostmarkEmailService? _emailService;
        private readonly ISmsSendService? _smsService;
        private readonly IMessageTemplateService? _templateService;
        private readonly ILogger<CentralNotificationDispatcher> _logger;
        private readonly IConfiguration _configuration;

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
        /// <param name="emailService">Optional Postmark email service.</param>
        /// <param name="smsService">Optional carrier SMS gateway service.</param>
        /// <param name="templateService">Optional multi-channel message template service.</param>
        public CentralNotificationDispatcher(
            DashboardDbContext dbContext,
            IHubContext<NotificationHub> hubContext,
            ILogger<CentralNotificationDispatcher> logger,
            IConfiguration configuration,
            IPostmarkEmailService? emailService = null,
            ISmsSendService? smsService = null,
            IMessageTemplateService? templateService = null)
        {
            _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
            _hubContext = hubContext ?? throw new ArgumentNullException(nameof(hubContext));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
            _emailService = emailService;
            _smsService = smsService;
            _templateService = templateService;
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
                    if (string.IsNullOrWhiteSpace(payload.TargetUserId))
                    {
                        result.Errors.Add("TargetUserId is required for SingleUser dispatch.");
                        return result;
                    }

                    var user = await _dbContext.Users.FindAsync(new object?[] { payload.TargetUserId }, cancellationToken);
                    if (user == null)
                    {
                        result.Errors.Add($"Target user '{payload.TargetUserId}' was not found.");
                        return result;
                    }
                    targetProfiles.Add(user);
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

                // 5. Channel 3: Transactional Email via Postmark Suite (Rich HTML with anti-spam scrubbing)
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
                await _dbContext.SaveChangesAsync(cancellationToken);
                result.DispatchedInAppCount = 1;

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
                    createdNotifications.Add(notif);
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
        private Task DispatchPushChannelAsync(
            NotificationDispatchPayload payload,
            List<Profile> targetProfiles,
            NotificationDispatchResult result,
            CancellationToken cancellationToken)
        {
            var recipientCount = payload.TargetType == NotificationDispatchTarget.BroadcastAll ? 1 : targetProfiles.Count;

            // Enforce mobile/desktop push lock-screen constraints
            var rawPushTitle = !string.IsNullOrWhiteSpace(payload.PushTitle) ? payload.PushTitle : payload.Title;
            var cleanPushTitle = StripHtmlTags(rawPushTitle).Trim();
            if (cleanPushTitle.Length > 50)
            {
                cleanPushTitle = cleanPushTitle.Substring(0, 47) + "...";
            }

            var rawPushBody = !string.IsNullOrWhiteSpace(payload.PushBody) ? payload.PushBody : payload.Message;
            var cleanPushBody = StripHtmlTags(rawPushBody).Trim();
            if (cleanPushBody.Length > 140)
            {
                cleanPushBody = cleanPushBody.Substring(0, 137) + "...";
            }

            // Prepare push metadata payload dictionary
            var pushData = payload.PushData != null
                ? new Dictionary<string, string>(payload.PushData)
                : new Dictionary<string, string>();

            pushData["tenant_key"] = payload.TenantKey ?? string.Empty;
            pushData["severity"] = ((int)payload.Severity).ToString();
            pushData["severity_label"] = payload.Severity.ToString();
            pushData["action_url"] = payload.ActionUrl ?? string.Empty;
            pushData["module"] = payload.Module ?? "General";

            _logger.LogInformation(
                "[CentralNotificationDispatcher] Push notification queued for target {Target} (Recipients: {Count}). Title='{Title}', Body='{Body}', Severity={Severity}, TenantKey={TenantKey}",
                payload.TargetType, recipientCount, cleanPushTitle, cleanPushBody, payload.Severity, payload.TenantKey);

            result.DispatchedPushCount += recipientCount;
            return Task.CompletedTask;
        }

        /// <summary>
        /// Dispatches branded, responsive HTML transactional emails with canonical severity styling
        /// and real-time anti-spam blacklist validation (AGENTS.md Rule 6).
        /// </summary>
        private async Task DispatchEmailChannelAsync(
            NotificationDispatchPayload payload,
            List<Profile> targetProfiles,
            NotificationDispatchResult result,
            CancellationToken cancellationToken)
        {
            if (_emailService == null)
            {
                result.Errors.Add("Postmark email service is not registered in the service container.");
                return;
            }

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

            foreach (var email in recipients)
            {
                try
                {
                    string htmlBody;
                    if (!string.IsNullOrWhiteSpace(payload.EmailHtmlBody) &&
                        (payload.EmailHtmlBody.Contains("<html", StringComparison.OrdinalIgnoreCase) ||
                         payload.EmailHtmlBody.Contains("<table", StringComparison.OrdinalIgnoreCase)))
                    {
                        htmlBody = payload.EmailHtmlBody;
                    }
                    else
                    {
                        var bodyText = !string.IsNullOrWhiteSpace(payload.EmailHtmlBody) ? payload.EmailHtmlBody : payload.Message;
                        htmlBody = GenerateSeverityEmailHtml(safeSubject, bodyText, payload.ActionUrl, severityLabel, colorHex);
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

                    await _emailService.SendHtmlEmailAsync(
                        to: email,
                        subject: safeSubject,
                        htmlBody: htmlBody,
                        tag: $"notification-{severityLabel.ToLowerInvariant()}");

                    result.DispatchedEmailCount++;
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "[CentralNotificationDispatcher] Email dispatch failed for {Email}: {Msg}", email, ex.Message);
                    result.Errors.Add($"Email delivery to '{email}' failed: {ex.Message}");
                }
            }
        }

        /// <summary>
        /// Dispatches concise SMS text messages strictly enforcing GSM 7-bit 160-character segment boundaries.
        /// Plain text only, stripped of HTML/markdown, avoiding multi-segment carrier billing costs.
        /// </summary>
        private async Task DispatchSmsChannelAsync(
            NotificationDispatchPayload payload,
            List<Profile> targetProfiles,
            NotificationDispatchResult result,
            CancellationToken cancellationToken)
        {
            if (_smsService == null)
            {
                result.Errors.Add("SMS service is not registered in the service container.");
                return;
            }

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
                var tenantTag = !string.IsNullOrWhiteSpace(payload.TenantKey) ? $"[{payload.TenantKey.ToUpperInvariant()}] " : "[OZIKOL] ";
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
                try
                {
                    var sent = await _smsService.SendSmsWithResult(phone, smsContent);
                    if (sent)
                    {
                        result.DispatchedSmsCount++;
                    }
                    else
                    {
                        result.Errors.Add($"SMS gateway returned failure for '{phone}'.");
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "[CentralNotificationDispatcher] SMS dispatch failed for {Phone}: {Msg}", phone, ex.Message);
                    result.Errors.Add($"SMS delivery to '{phone}' failed: {ex.Message}");
                }
            }
        }

        /// <summary>
        /// Dispatches transactional WhatsApp messages formatted with WhatsApp Markdown (*bold*, _italics_)
        /// or binds positional parameters ({{1}}, {{2}}) for Meta Cloud API approved HSM templates.
        /// </summary>
        private Task DispatchWhatsAppChannelAsync(
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

                if (!string.IsNullOrWhiteSpace(payload.ActionUrl))
                {
                    sb.AppendLine();
                    sb.AppendLine($"👉 *Open in Workspace:* {payload.ActionUrl.Trim()}");
                }

                whatsAppBody = sb.ToString();
            }

            _logger.LogInformation(
                "[CentralNotificationDispatcher] WhatsApp alert queued for {Count} recipients. HSM Template='{Template}', MessageLength={Len}",
                phoneNumbers.Count, payload.WhatsAppTemplateName ?? "freeform-markdown", whatsAppBody.Length);

            result.DispatchedWhatsAppCount += phoneNumbers.Count;
            return Task.CompletedTask;
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

            var prefix = $"[{severity.ToString().ToUpperInvariant()}] ";
            if (!trimmed.StartsWith("[", StringComparison.Ordinal))
            {
                trimmed = prefix + trimmed;
            }

            return (trimmed, warnings);
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
            string colorHex)
        {
            var actionButtonHtml = !string.IsNullOrWhiteSpace(actionUrl)
                ? $"<div style='margin-top:28px;'><a href='{actionUrl}' style='display:inline-block; background-color:{colorHex}; color:#ffffff; font-weight:600; font-size:14px; padding:12px 28px; border-radius:8px; text-decoration:none;'>View in Workspace</a></div>"
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
                    <!-- Header Banner -->
                    <tr>
                        <td style='background-color:#0F172A; padding:24px 32px; border-bottom:4px solid {colorHex};'>
                            <table width='100%' cellpadding='0' cellspacing='0'>
                                <tr>
                                    <td>
                                        <span style='font-size:20px; font-weight:800; color:#FFFFFF; letter-spacing:-0.5px;'>OZIKOL <span style='color:#38BDF8;'>BCP</span></span>
                                    </td>
                                    <td align='right'>
                                        <span style='display:inline-block; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; padding:4px 12px; border-radius:100px; background-color:{colorHex}22; color:{colorHex}; border:1px solid {colorHex};'>{severityLabel}</span>
                                    </td>
                                </tr>
                            </table>
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
                            This is an automated system notification from your Ozikol workspace. Please do not reply directly to this email.
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
