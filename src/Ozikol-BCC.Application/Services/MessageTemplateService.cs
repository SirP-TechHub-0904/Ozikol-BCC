using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Application.Services
{
    /// <summary>
    /// Multi-channel template engine supporting Email (rich HTML), SMS (concise text),
    /// and In-App Notifications with dynamic placeholder interpolation.
    /// </summary>
    public class MessageTemplateService : IMessageTemplateService
    {
        private readonly DashboardDbContext _db;
        private readonly ILogger<MessageTemplateService> _logger;

        public MessageTemplateService(
            DashboardDbContext db,
            ILogger<MessageTemplateService> logger)
        {
            _db = db;
            _logger = logger;
        }

        public async Task<(string Subject, string Body)> RenderMessageAsync(
            BcpEventType eventType,
            BcpMessageChannel channel,
            Dictionary<string, string> placeholders,
            string? fallbackSubject = null,
            string? fallbackBody = null)
        {
            var template = await _db.BcpMessageTemplates
                .AsNoTracking()
                .FirstOrDefaultAsync(t => t.EventType == eventType && t.Channel == channel && t.IsActive);

            string rawSubject = template?.SubjectTemplate ?? fallbackSubject ?? GetDefaultSubject(eventType, channel);
            string rawBody = template?.BodyTemplate ?? fallbackBody ?? GetDefaultBody(eventType, channel);

            // Interpolate standard placeholders
            string finalSubject = InterpolatePlaceholders(rawSubject, placeholders);
            string finalBody = InterpolatePlaceholders(rawBody, placeholders);

            return (finalSubject, finalBody);
        }

        public async Task<List<BcpMessageTemplate>> GetAllTemplatesAsync()
        {
            await SeedDefaultTemplatesAsync();
            return await _db.BcpMessageTemplates
                .AsNoTracking()
                .OrderBy(t => t.Channel)
                .ThenBy(t => t.EventType)
                .ToListAsync();
        }

        public async Task<BcpMessageTemplate?> GetTemplateAsync(BcpEventType eventType, BcpMessageChannel channel)
        {
            var template = await _db.BcpMessageTemplates
                .FirstOrDefaultAsync(t => t.EventType == eventType && t.Channel == channel);

            if (template == null)
            {
                await SeedDefaultTemplatesAsync();
                template = await _db.BcpMessageTemplates
                    .FirstOrDefaultAsync(t => t.EventType == eventType && t.Channel == channel);
            }

            return template;
        }

        public async Task<BcpMessageTemplate> SaveTemplateAsync(
            BcpEventType eventType,
            BcpMessageChannel channel,
            string name,
            string? subject,
            string body,
            bool isActive,
            string? updatedBy = null)
        {
            var template = await _db.BcpMessageTemplates
                .FirstOrDefaultAsync(t => t.EventType == eventType && t.Channel == channel);

            if (template == null)
            {
                template = new BcpMessageTemplate
                {
                    Id = Guid.NewGuid(),
                    EventType = eventType,
                    Channel = channel,
                    Name = name,
                    SubjectTemplate = subject,
                    BodyTemplate = body,
                    AvailablePlaceholders = GetPlaceholdersForEvent(eventType),
                    IsActive = isActive,
                    UpdatedAt = DateTime.UtcNow,
                    UpdatedBy = updatedBy
                };
                _db.BcpMessageTemplates.Add(template);
            }
            else
            {
                template.Name = name;
                template.SubjectTemplate = subject;
                template.BodyTemplate = body;
                template.IsActive = isActive;
                template.UpdatedAt = DateTime.UtcNow;
                template.UpdatedBy = updatedBy;
            }

            await _db.SaveChangesAsync();
            _logger.LogInformation("Saved message template for event {EventType}, channel {Channel}", eventType, channel);
            return template;
        }

        public async Task<BcpMessageTemplate?> ResetToDefaultAsync(BcpEventType eventType, BcpMessageChannel channel)
        {
            var template = await _db.BcpMessageTemplates
                .FirstOrDefaultAsync(t => t.EventType == eventType && t.Channel == channel);

            var defaultName = GetDefaultName(eventType, channel);
            var defaultSubject = GetDefaultSubject(eventType, channel);
            var defaultBody = GetDefaultBody(eventType, channel);

            if (template == null)
            {
                template = new BcpMessageTemplate
                {
                    Id = Guid.NewGuid(),
                    EventType = eventType,
                    Channel = channel,
                    Name = defaultName,
                    SubjectTemplate = defaultSubject,
                    BodyTemplate = defaultBody,
                    AvailablePlaceholders = GetPlaceholdersForEvent(eventType),
                    IsActive = true,
                    UpdatedAt = DateTime.UtcNow
                };
                _db.BcpMessageTemplates.Add(template);
            }
            else
            {
                template.Name = defaultName;
                template.SubjectTemplate = defaultSubject;
                template.BodyTemplate = defaultBody;
                template.IsActive = true;
                template.UpdatedAt = DateTime.UtcNow;
            }

            await _db.SaveChangesAsync();
            return template;
        }

        public async Task SeedDefaultTemplatesAsync()
        {
            var events = new[]
            {
                BcpEventType.WelcomeOnboarding,
                BcpEventType.LoginOtp,
                BcpEventType.PasswordReset,
                BcpEventType.UserStatusChanged,
                BcpEventType.PerformanceScoreRecorded,
                BcpEventType.SystemAnnouncement
            };

            var channels = new[] { BcpMessageChannel.Email, BcpMessageChannel.Sms, BcpMessageChannel.InAppNotification };

            var existing = await _db.BcpMessageTemplates
                .Select(t => new { t.EventType, t.Channel })
                .ToListAsync();

            var existingSet = new HashSet<string>(existing.Select(e => $"{(int)e.EventType}_{(int)e.Channel}"));

            bool anyAdded = false;
            foreach (var evt in events)
            {
                foreach (var ch in channels)
                {
                    var key = $"{(int)evt}_{(int)ch}";
                    if (!existingSet.Contains(key))
                    {
                        _db.BcpMessageTemplates.Add(new BcpMessageTemplate
                        {
                            Id = Guid.NewGuid(),
                            EventType = evt,
                            Channel = ch,
                            Name = GetDefaultName(evt, ch),
                            SubjectTemplate = GetDefaultSubject(evt, ch),
                            BodyTemplate = GetDefaultBody(evt, ch),
                            AvailablePlaceholders = GetPlaceholdersForEvent(evt),
                            IsActive = true,
                            UpdatedAt = DateTime.UtcNow
                        });
                        anyAdded = true;
                    }
                }
            }

            if (anyAdded)
            {
                await _db.SaveChangesAsync();
                _logger.LogInformation("Seeded default BcpMessageTemplates across all channels.");
            }
        }

        private static string InterpolatePlaceholders(string template, Dictionary<string, string> placeholders)
        {
            if (string.IsNullOrEmpty(template) || placeholders == null) return template ?? string.Empty;

            var result = template;
            foreach (var kvp in placeholders)
            {
                var pattern = @"\{\{\s*" + Regex.Escape(kvp.Key) + @"\s*\}\}";
                result = Regex.Replace(result, pattern, kvp.Value ?? string.Empty, RegexOptions.IgnoreCase);
            }

            // Always provide current year fallback
            result = Regex.Replace(result, @"\{\{\s*CurrentYear\s*\}\}", DateTime.UtcNow.Year.ToString(), RegexOptions.IgnoreCase);

            return result;
        }

        private static string GetPlaceholdersForEvent(BcpEventType eventType)
        {
            return eventType switch
            {
                BcpEventType.WelcomeOnboarding => "{{FullName}}, {{FirstName}}, {{LastName}}, {{Email}}, {{PhoneNumber}}, {{MemberId}}, {{TemporaryPassword}}, {{PortalUrl}}, {{OrganizationName}}, {{Designation}}, {{CategoryName}}",
                BcpEventType.LoginOtp => "{{FullName}}, {{FirstName}}, {{OtpCode}}, {{Email}}, {{PhoneNumber}}, {{OrganizationName}}",
                BcpEventType.PasswordReset => "{{FullName}}, {{FirstName}}, {{TemporaryPassword}}, {{PortalUrl}}, {{OrganizationName}}",
                BcpEventType.UserStatusChanged => "{{FullName}}, {{FirstName}}, {{Status}}, {{Reason}}, {{OrganizationName}}",
                BcpEventType.PerformanceScoreRecorded => "{{FullName}}, {{FirstName}}, {{IndicatorTitle}}, {{Score}}, {{Period}}, {{OrganizationName}}",
                _ => "{{FullName}}, {{FirstName}}, {{Email}}, {{OrganizationName}}, {{PortalUrl}}"
            };
        }

        private static string GetDefaultName(BcpEventType eventType, BcpMessageChannel channel)
        {
            var channelName = channel switch
            {
                BcpMessageChannel.Email => "Email",
                BcpMessageChannel.Sms => "SMS",
                BcpMessageChannel.InAppNotification => "In-App",
                _ => "Notification"
            };

            var eventName = eventType switch
            {
                BcpEventType.WelcomeOnboarding => "Welcome & New Account Credentials",
                BcpEventType.LoginOtp => "6-Digit Verification Code (OTP)",
                BcpEventType.PasswordReset => "Temporary Password Reset Instructions",
                BcpEventType.UserStatusChanged => "Account Status Change Alert",
                BcpEventType.PerformanceScoreRecorded => "KPI Performance Evaluation",
                BcpEventType.SystemAnnouncement => "System Broadcast Announcement",
                _ => eventType.ToString()
            };

            return $"{eventName} ({channelName})";
        }

        private static string GetDefaultSubject(BcpEventType eventType, BcpMessageChannel channel)
        {
            if (channel == BcpMessageChannel.Sms) return "";

            return eventType switch
            {
                BcpEventType.WelcomeOnboarding => "Welcome to {{OrganizationName}} - Your Account Credentials",
                BcpEventType.LoginOtp => "Your 6-Digit Verification Code: {{OtpCode}}",
                BcpEventType.PasswordReset => "Temporary Login Credentials & Password Setup",
                BcpEventType.UserStatusChanged => "Security Alert: Account Access Status Updated",
                BcpEventType.PerformanceScoreRecorded => "Performance Evaluation Score Recorded: {{IndicatorTitle}}",
                BcpEventType.SystemAnnouncement => "Announcement from {{OrganizationName}}",
                _ => "Notification from {{OrganizationName}}"
            };
        }

        private static string GetDefaultBody(BcpEventType eventType, BcpMessageChannel channel)
        {
            if (channel == BcpMessageChannel.Sms)
            {
                return eventType switch
                {
                    BcpEventType.WelcomeOnboarding => "Welcome to {{OrganizationName}}! Your Member ID is {{MemberId}} and temp password is {{TemporaryPassword}}. Sign in at {{PortalUrl}}",
                    BcpEventType.LoginOtp => "{{OtpCode}} is your verification code for {{OrganizationName}}. Valid for 10 minutes. Do not share.",
                    BcpEventType.PasswordReset => "Your temporary password for {{OrganizationName}} is {{TemporaryPassword}}. Please sign in and set your new password at {{PortalUrl}}",
                    BcpEventType.UserStatusChanged => "Your {{OrganizationName}} account access status has been updated to {{Status}}.",
                    BcpEventType.PerformanceScoreRecorded => "New KPI performance evaluation recorded for {{IndicatorTitle}}: Score {{Score}}.",
                    _ => "Notification from {{OrganizationName}}: Please check your portal for details."
                };
            }

            if (channel == BcpMessageChannel.InAppNotification)
            {
                return eventType switch
                {
                    BcpEventType.WelcomeOnboarding => "Welcome to {{OrganizationName}}! Your Member ID is {{MemberId}}. Complete your profile setup.",
                    BcpEventType.LoginOtp => "A verification OTP was requested for your account.",
                    BcpEventType.PasswordReset => "Your temporary password was set by an administrator. Please update your password.",
                    BcpEventType.UserStatusChanged => "Your account status has been updated to {{Status}}.",
                    BcpEventType.PerformanceScoreRecorded => "You have a new performance rating recorded for {{IndicatorTitle}}: {{Score}} points.",
                    _ => "You have a new notification from the workspace."
                };
            }

            // HTML Email Default Templates
            return eventType switch
            {
                BcpEventType.WelcomeOnboarding => @"
<div style='font-family:-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif; max-width:560px; margin:0 auto; padding:32px 24px; background:#ffffff; border:1px solid #e2e8f0; border-radius:12px;'>
    <div style='text-align:center; margin-bottom:20px;'>
        <h2 style='color:#0f172a; margin:0 0 6px; font-size:22px; font-weight:800;'>Welcome to {{OrganizationName}}</h2>
        <p style='color:#64748b; font-size:14px; margin:0;'>Your member account has been registered successfully.</p>
    </div>
    <p style='color:#334155; font-size:14px;'>Hello <strong>{{FullName}}</strong>,</p>
    <div style='background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:16px; margin:18px 0;'>
        <div style='margin-bottom:8px;'><span style='font-size:12px; color:#64748b;'>Member ID:</span> <strong style='color:#0f172a;'>{{MemberId}}</strong></div>
        <div style='margin-bottom:8px;'><span style='font-size:12px; color:#64748b;'>Email:</span> <strong style='color:#0f172a;'>{{Email}}</strong></div>
        <div><span style='font-size:12px; color:#64748b;'>Temporary Password:</span> <strong style='color:#0050e5; font-family:monospace; font-size:16px;'>{{TemporaryPassword}}</strong></div>
    </div>
    <div style='background:#eff6ff; border-left:4px solid #0050e5; padding:12px 16px; border-radius:0 8px 8px 0; margin-bottom:20px;'>
        <span style='font-size:12.5px; color:#1e40af;'>Upon your first sign-in, you will be prompted to set your personal permanent password.</span>
    </div>
    <div style='text-align:center; margin:24px 0;'>
        <a href='{{PortalUrl}}' style='display:inline-block; background:#0050e5; color:#ffffff; font-size:14px; font-weight:700; padding:12px 28px; text-decoration:none; border-radius:8px;'>Sign In to Your Account</a>
    </div>
</div>",

                BcpEventType.LoginOtp => @"
<div style='font-family:-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif; max-width:540px; margin:0 auto; padding:32px 24px; background:#ffffff; border:1px solid #e2e8f0; border-radius:12px;'>
    <div style='text-align:center; margin-bottom:24px;'>
        <h2 style='color:#0f172a; margin:0 0 8px; font-size:22px; font-weight:800;'>Verification Code</h2>
        <p style='color:#64748b; margin:0; font-size:14px;'>Use the 6-digit one-time passcode below to verify your account.</p>
    </div>
    <div style='background:#f8fafc; border:2px dashed #93c5fd; border-radius:12px; padding:24px; text-align:center; margin:24px 0;'>
        <span style='font-family:monospace; font-size:36px; font-weight:800; letter-spacing:10px; color:#0050e5; display:inline-block;'>{{OtpCode}}</span>
    </div>
    <p style='color:#64748b; font-size:12.5px; text-align:center; margin:0;'>This verification code expires in <strong>10 minutes</strong>. Do not share this code with anyone.</p>
</div>",

                BcpEventType.PasswordReset => @"
<div style='font-family:-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif; max-width:560px; margin:0 auto; padding:32px 24px; background:#ffffff; border:1px solid #e2e8f0; border-radius:12px;'>
    <h2 style='color:#0f172a; margin:0 0 12px; font-size:20px; font-weight:800;'>Temporary Login Password Set</h2>
    <p style='color:#334155; font-size:14px;'>Hello <strong>{{FullName}}</strong>,</p>
    <p style='color:#334155; font-size:14px;'>An administrator has assigned a new temporary password for your account:</p>
    <div style='background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:16px; margin:18px 0; text-align:center;'>
        <span style='font-size:12px; color:#64748b; text-transform:uppercase; font-weight:700; display:block; margin-bottom:4px;'>Temporary Password</span>
        <span style='font-family:monospace; font-size:22px; font-weight:800; color:#0050e5; letter-spacing:2px;'>{{TemporaryPassword}}</span>
    </div>
    <div style='background:#eff6ff; border-left:4px solid #0050e5; padding:12px 16px; border-radius:0 8px 8px 0; margin-bottom:20px;'>
        <span style='font-size:12.5px; color:#1e40af;'>This is a temporary password. When you sign in, you will be prompted to set your new permanent password immediately.</span>
    </div>
    <div style='text-align:center; margin:24px 0 16px;'>
        <a href='{{PortalUrl}}' style='display:inline-block; background:#0050e5; color:#ffffff; font-size:14px; font-weight:700; padding:12px 28px; text-decoration:none; border-radius:8px;'>Sign In to Your Account</a>
    </div>
</div>",

                _ => @"
<div style='font-family:-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif; max-width:560px; margin:0 auto; padding:32px 24px; background:#ffffff; border:1px solid #e2e8f0; border-radius:12px;'>
    <h2 style='color:#0f172a; margin:0 0 12px; font-size:20px; font-weight:800;'>Notification from {{OrganizationName}}</h2>
    <p style='color:#334155; font-size:14px;'>Hello <strong>{{FullName}}</strong>,</p>
    <p style='color:#334155; font-size:14px;'>You have a new update in your workspace. Please sign in to view details.</p>
    <div style='text-align:center; margin:24px 0 16px;'>
        <a href='{{PortalUrl}}' style='display:inline-block; background:#0050e5; color:#ffffff; font-size:14px; font-weight:700; padding:12px 28px; text-decoration:none; border-radius:8px;'>View Workspace</a>
    </div>
</div>"
            };
        }
    }
}
