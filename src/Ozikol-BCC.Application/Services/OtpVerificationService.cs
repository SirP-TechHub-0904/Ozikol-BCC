using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;
using System;
using System.Security.Cryptography;
using System.Threading.Tasks;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Application.Services
{
    /// <summary>
    /// Hardened implementation of 6-digit cryptographic OTP generation, email/SMS dispatch, and verification.
    /// Features 10-minute expiry, 3-attempt brute-force protection, and 60-second resend cooldown.
    /// </summary>
    public class OtpVerificationService : IOtpVerificationService
    {
        private readonly UserManager<Profile> _userManager;
        private readonly DashboardDbContext _db;
        private readonly IMemoryCache _cache;
        private readonly IMessageTemplateService _templateService;
        private readonly ILogger<OtpVerificationService> _logger;

        private const int OTP_EXPIRATION_MINUTES = 10;
        private const int MAX_VERIFICATION_ATTEMPTS = 3;
        private const int RESEND_COOLDOWN_SECONDS = 60;

        public OtpVerificationService(
            UserManager<Profile> userManager,
            DashboardDbContext db,
            IMemoryCache cache,
            IMessageTemplateService templateService,
            ILogger<OtpVerificationService> logger)
        {
            _userManager = userManager;
            _db = db;
            _cache = cache;
            _templateService = templateService;
            _logger = logger;
        }

        public async Task<(bool Success, string Message, int RetryAfterSeconds)> SendEmailOtpAsync(string userId, string email)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null || string.IsNullOrWhiteSpace(email)) 
                return (false, "User account not found or email address is invalid.", 0);

            var cooldownKey = $"EmailOTP_Cooldown_{userId}";
            if (_cache.TryGetValue(cooldownKey, out DateTime nextAllowedUtc))
            {
                var remainingSeconds = (int)Math.Max(0, (nextAllowedUtc - DateTime.UtcNow).TotalSeconds);
                if (remainingSeconds > 0)
                {
                    return (false, $"Please wait {remainingSeconds} seconds before requesting a new verification code.", remainingSeconds);
                }
            }

            var otp = Generate6DigitCode();
            var cacheKey = $"EmailOTP_{userId}";
            var attemptsKey = $"EmailOTP_Attempts_{userId}";

            _cache.Set(cacheKey, otp, new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(OTP_EXPIRATION_MINUTES),
                Size = 1
            });

            _cache.Set(cooldownKey, DateTime.UtcNow.AddSeconds(RESEND_COOLDOWN_SECONDS), new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(RESEND_COOLDOWN_SECONDS),
                Size = 1
            });

            _cache.Set(attemptsKey, 0, new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(OTP_EXPIRATION_MINUTES),
                Size = 1
            });

            // Resolve tenant brand name dynamically from MisWebsiteSettings
            var tenantSite = await _db.MisWebsiteSettings.AsNoTracking().FirstOrDefaultAsync();
            var orgName = !string.IsNullOrWhiteSpace(tenantSite?.BrandName) 
                ? tenantSite.BrandName.Trim() 
                : (!string.IsNullOrWhiteSpace(tenantSite?.CompanyName) ? tenantSite.CompanyName.Trim() : "Workspace");

            // Render message from Template Service
            var placeholders = new System.Collections.Generic.Dictionary<string, string>
            {
                { "FullName", user.FullName },
                { "FirstName", user.FirstName ?? "Member" },
                { "LastName", user.LastName ?? "" },
                { "Email", email.Trim() },
                { "OtpCode", otp },
                { "OrganizationName", orgName }
            };

            var (subject, body) = await _templateService.RenderMessageAsync(
                BcpEventType.LoginOtp,
                BcpMessageChannel.Email,
                placeholders);

            // Queue Email Notification in BcpEmailQueue
            _db.BcpEmailQueue.Add(new BcpEmailQueue
            {
                Id = Guid.NewGuid(),
                RelatedUserId = userId,
                RecipientEmail = email.Trim(),
                RecipientName = user.FullName,
                Subject = subject,
                HtmlBody = body,
                Category = BcpMessageCategory.Security,
                Priority = BcpMessagePriority.Urgent,
                EventType = BcpEventType.LoginOtp,
                Status = BcpQueueStatus.Queued,
                CreatedAt = DateTime.UtcNow
            });

            await _db.SaveChangesAsync();
            _logger.LogInformation("Generated Email OTP for user {UserId} ({Email})", userId, email);
            return (true, "A 6-digit verification code has been dispatched to your email.", RESEND_COOLDOWN_SECONDS);
        }

        public async Task<(bool Success, string Message)> VerifyEmailOtpAsync(string userId, string otpCode)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null) return (false, "User account not found.");

            var cacheKey = $"EmailOTP_{userId}";
            var attemptsKey = $"EmailOTP_Attempts_{userId}";

            if (!_cache.TryGetValue(cacheKey, out string? cachedOtp))
            {
                return (false, "Verification code has expired or was not requested. Please request a new code.");
            }

            int attempts = _cache.TryGetValue(attemptsKey, out int currentAttempts) ? currentAttempts : 0;
            attempts++;
            _cache.Set(attemptsKey, attempts, new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(OTP_EXPIRATION_MINUTES),
                Size = 1
            });

            if (cachedOtp != otpCode?.Trim())
            {
                if (attempts >= MAX_VERIFICATION_ATTEMPTS)
                {
                    _cache.Remove(cacheKey);
                    _cache.Remove(attemptsKey);
                    return (false, "Maximum verification attempts (3) exceeded. This code is now invalid. Please request a fresh code.");
                }

                int remaining = MAX_VERIFICATION_ATTEMPTS - attempts;
                return (false, $"Invalid verification code. {remaining} attempt(s) remaining.");
            }

            // Success!
            user.EmailConfirmed = true;
            await _userManager.UpdateAsync(user);

            _cache.Remove(cacheKey);
            _cache.Remove(attemptsKey);
            _cache.Remove($"EmailOTP_Cooldown_{userId}");

            _logger.LogInformation("Email verified successfully for user {UserId}", userId);
            return (true, "Email address has been successfully verified!");
        }

        public async Task<(bool Success, string Message, int RetryAfterSeconds)> SendPhoneOtpAsync(string userId, string phoneNumber)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null || string.IsNullOrWhiteSpace(phoneNumber)) 
                return (false, "User account not found or phone number is invalid.", 0);

            var cooldownKey = $"PhoneOTP_Cooldown_{userId}";
            if (_cache.TryGetValue(cooldownKey, out DateTime nextAllowedUtc))
            {
                var remainingSeconds = (int)Math.Max(0, (nextAllowedUtc - DateTime.UtcNow).TotalSeconds);
                if (remainingSeconds > 0)
                {
                    return (false, $"Please wait {remainingSeconds} seconds before requesting a new SMS OTP.", remainingSeconds);
                }
            }

            var otp = Generate6DigitCode();
            var cacheKey = $"PhoneOTP_{userId}";
            var attemptsKey = $"PhoneOTP_Attempts_{userId}";

            _cache.Set(cacheKey, otp, new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(OTP_EXPIRATION_MINUTES),
                Size = 1
            });

            _cache.Set(cooldownKey, DateTime.UtcNow.AddSeconds(RESEND_COOLDOWN_SECONDS), new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(RESEND_COOLDOWN_SECONDS),
                Size = 1
            });

            _cache.Set(attemptsKey, 0, new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(OTP_EXPIRATION_MINUTES),
                Size = 1
            });

            // Resolve tenant brand name dynamically from MisWebsiteSettings
            var tenantSiteSms = await _db.MisWebsiteSettings.AsNoTracking().FirstOrDefaultAsync();
            var orgNameSms = !string.IsNullOrWhiteSpace(tenantSiteSms?.BrandName) 
                ? tenantSiteSms.BrandName.Trim() 
                : (!string.IsNullOrWhiteSpace(tenantSiteSms?.CompanyName) ? tenantSiteSms.CompanyName.Trim() : "Workspace");

            // Render SMS message from Template Service
            var placeholders = new System.Collections.Generic.Dictionary<string, string>
            {
                { "FullName", user.FullName },
                { "FirstName", user.FirstName ?? "Member" },
                { "PhoneNumber", phoneNumber.Trim() },
                { "OtpCode", otp },
                { "OrganizationName", orgNameSms }
            };

            var (_, smsBody) = await _templateService.RenderMessageAsync(
                BcpEventType.LoginOtp,
                BcpMessageChannel.Sms,
                placeholders);

            // Queue SMS Message in BcpSmsQueue
            _db.BcpSmsQueue.Add(new BcpSmsQueue
            {
                Id = Guid.NewGuid(),
                RelatedUserId = userId,
                RecipientPhone = phoneNumber.Trim(),
                Message = smsBody,
                Status = BcpQueueStatus.Queued,
                CreatedAt = DateTime.UtcNow
            });

            await _db.SaveChangesAsync();
            _logger.LogInformation("Generated Phone OTP for user {UserId} ({Phone})", userId, phoneNumber);
            return (true, "A 6-digit verification code has been dispatched to your phone via SMS.", RESEND_COOLDOWN_SECONDS);
        }

        public async Task<(bool Success, string Message)> VerifyPhoneOtpAsync(string userId, string otpCode)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null) return (false, "User account not found.");

            var cacheKey = $"PhoneOTP_{userId}";
            var attemptsKey = $"PhoneOTP_Attempts_{userId}";

            if (!_cache.TryGetValue(cacheKey, out string? cachedOtp))
            {
                return (false, "Verification code has expired or was not requested. Please request a new code.");
            }

            int attempts = _cache.TryGetValue(attemptsKey, out int currentAttempts) ? currentAttempts : 0;
            attempts++;
            _cache.Set(attemptsKey, attempts, new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(OTP_EXPIRATION_MINUTES),
                Size = 1
            });

            if (cachedOtp != otpCode?.Trim())
            {
                if (attempts >= MAX_VERIFICATION_ATTEMPTS)
                {
                    _cache.Remove(cacheKey);
                    _cache.Remove(attemptsKey);
                    return (false, "Maximum verification attempts (3) exceeded. This code is now invalid. Please request a fresh code.");
                }

                int remaining = MAX_VERIFICATION_ATTEMPTS - attempts;
                return (false, $"Invalid verification code. {remaining} attempt(s) remaining.");
            }

            // Success!
            user.PhoneNumberConfirmed = true;
            await _userManager.UpdateAsync(user);

            _cache.Remove(cacheKey);
            _cache.Remove(attemptsKey);
            _cache.Remove($"PhoneOTP_Cooldown_{userId}");

            _logger.LogInformation("Phone verified successfully for user {UserId}", userId);
            return (true, "Phone number has been successfully verified!");
        }

        private static string Generate6DigitCode()
        {
            var randomNumber = RandomNumberGenerator.GetInt32(100000, 999999);
            return randomNumber.ToString();
        }
    }
}
