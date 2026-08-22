using System;
using System.ComponentModel.DataAnnotations;

namespace Ozikol_BCC.Domain.Models.Settings
{
    public enum CaptchaType
    {
        None = 0,
        GoogleRecaptchaV2 = 1,
        CloudflareTurnstile = 2
    }

    public enum BcpAiProvider
    {
        Gemini = 0,
        OpenAI = 1,
        Claude = 2
    }

    /// <summary>
    /// Security policy, Captcha bot protection, AI provider keys, and MFA enforcement rules.
    /// Authority: Tenant Admin / Tenant SuperAdmin.
    /// </summary>
    public class BcpTenantSecuritySetting
    {
        public Guid Id { get; set; } = Guid.CreateVersion7();

        // ── Bot Protection & Captcha ──
        public CaptchaType ActiveCaptcha { get; set; } = CaptchaType.None;

        [StringLength(255)]
        public string? GoogleRecaptchaSiteKey { get; set; }

        [StringLength(255)]
        public string? GoogleRecaptchaSecretKey { get; set; }

        // ── AI Engine & API Keys ──
        public BcpAiProvider ActiveAiProvider { get; set; } = BcpAiProvider.Gemini;

        [StringLength(255)]
        public string? GeminiApiKey { get; set; }

        [StringLength(255)]
        public string? OpenAIApiKey { get; set; }

        [StringLength(255)]
        public string? AnthropicApiKey { get; set; }

        // ── Password Policy ──
        public int PasswordMinLength { get; set; } = 8;
        public bool PasswordRequireDigit { get; set; } = true;
        public bool PasswordRequireLowercase { get; set; } = true;
        public bool PasswordRequireUppercase { get; set; } = true;
        public bool PasswordRequireNonAlphanumeric { get; set; } = true;
        public int PasswordExpirationDays { get; set; } = 90;

        // ── Lockout Policy ──
        public int MaxFailedAccessAttempts { get; set; } = 5;
        public int LockoutDurationMinutes { get; set; } = 15;

        // ── MFA & Device Restrictions ──
        public bool MfaRequiredGlobally { get; set; }
        public bool MfaRequiredForAdmins { get; set; }
        public bool ActivateOnlyAuthorizedDevice { get; set; }
        public bool RedirectTohttps { get; set; } = true;
        public bool RedirectTohttpswww { get; set; }
    }
}
