using System;
using System.ComponentModel.DataAnnotations;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Tenant-level BCP configuration record for API keys, provider switches,
    /// security integrations, operation settings, quotas, and terminology aliases.
    /// Each tenant database should have its own settings row.
    /// </summary>
    public class BcpSetting
    {
        /// <summary>
        /// Required database identifier.
        /// </summary>
        public Guid Id { get; set; }

        /// <summary>
        /// Tells the UI Contact form to render a Phone input.
        /// </summary>
        public bool WebContactEnablePhone { get; set; }

        /// <summary>
        /// Tells the UI Contact form to render a Department dropdown.
        /// </summary>
        public bool WebContactEnableCategory { get; set; }

        /// <summary>
        /// Tells the UI Contact form to render an attachment uploader.
        /// </summary>
        public bool WebContactEnableFile { get; set; }

        /// <summary>
        /// Renames 'Category' system-wide inside the BCP.
        /// </summary>
        public string? CategoryAlias { get; set; }

        /// <summary>
        /// Renames 'Sub-Category' system-wide inside the BCP.
        /// </summary>
        public string? SubCategoryAlias { get; set; }

        /// <summary>
        /// Renames 'Group' to 'Committee', 'Unit', etc.
        /// </summary>
        public string? GroupAlias { get; set; }

        /// <summary>
        /// Renames 'Alumni' to 'Past Member', etc.
        /// </summary>
        public string? AlumniAlias { get; set; }

        /// <summary>
        /// Allows/disallows staff from downloading data tables to Excel.
        /// </summary>
        public bool EnableListDownload { get; set; }

        /// <summary>
        /// Security policy flag: Controls whether administrators are permitted to delete user accounts.
        /// When false, user deletion is strictly prohibited across the portal.
        /// </summary>
        public bool EnableUserDeletion { get; set; } = false;

        /// <summary>
        /// Turns on Paystack payments.
        /// </summary>
        public bool EnablePaystack { get; set; }

        /// <summary>
        /// Used to initialize the frontend payment widget.
        /// </summary>
        public string? PaystackPublicKey { get; set; }

        /// <summary>
        /// Used securely on the backend to verify payments.
        /// </summary>
        public string? PaystackSecretKey { get; set; }

        /// <summary>
        /// Used to secure automated webhook notifications.
        /// </summary>
        public string? PaystackWebhookSecret { get; set; }

        /// <summary>
        /// Master switch to turn off all financial features.
        /// </summary>
        public bool PaymentModuleActive { get; set; }

        /// <summary>
        /// Turns on PixelPay payments.
        /// </summary>
        public bool EnablePixelPay { get; set; }

        /// <summary>
        /// The API server URL for PixelPay.
        /// </summary>
        public string? PixelPayBaseUrl { get; set; }

        /// <summary>
        /// The client ID for PixelPay.
        /// </summary>
        public string? PixelPayKeyId { get; set; }

        /// <summary>
        /// The secret token for PixelPay.
        /// </summary>
        public string? PixelPaySecretKey { get; set; }

        /// <summary>
        /// The crypto signature required by PixelPay.
        /// </summary>
        public string? PixelPaySignature { get; set; }

        /// <summary>
        /// Global Organization Default Currency Code (e.g. 'USD', 'NGN', 'GBP', 'EUR').
        /// </summary>
        public string? CurrencyCode { get; set; } = "USD";

        /// <summary>
        /// Global Organization Currency Symbol (e.g. '$', '₦', '£', '€').
        /// </summary>
        public string? CurrencySymbol { get; set; } = "$";

        /// <summary>
        /// E.g., 'NGN' for PixelPay transactions.
        /// </summary>
        public string? PixelPayCurrency { get; set; }

        /// <summary>
        /// Used to secure automated webhook notifications.
        /// </summary>
        public string? PixelPayWebhookSecret { get; set; }

        /// <summary>
        /// Title displayed on the Remita payment gateway screen.
        /// </summary>
        public string? RemitaTitle { get; set; }

        /// <summary>
        /// Instructions displayed before clicking pay via Remita.
        /// </summary>
        public string? RemitaInstruction { get; set; }

        /// <summary>
        /// Text on the actual 'Pay via Remita' button.
        /// </summary>
        public string? RemitaButton { get; set; }

        /// <summary>
        /// Stores the tenant's current SMS wallet balance.
        /// </summary>
        public decimal SmsCreditBalance { get; set; }

        /// <summary>
        /// Max emails they are allowed to send this month.
        /// </summary>
        public int GlobalNewsletterQuota { get; set; }

        /// <summary>
        /// When the email quota resets.
        /// </summary>
        public DateTime? GlobalNewsletterQuotaExpiry { get; set; }

        /// <summary>
        /// Turns on the ZeptoMail API for outgoing system emails.
        /// </summary>
        public bool EnableZeptoMail { get; set; }

        /// <summary>
        /// Authorizes email sending via ZeptoMail.
        /// </summary>
        public string? ZeptoMailApiKey { get; set; }

        /// <summary>
        /// Specific sender ID required by ZeptoMail.
        /// </summary>
        public string? ZeptoMailSendMailId { get; set; }

        /// <summary>
        /// The official address emails come from (e.g., no-reply@site.com).
        /// </summary>
        public string? ZeptoMailSenderEmail { get; set; }

        /// <summary>
        /// The official name emails come from (e.g., 'System Admin').
        /// </summary>
        public string? ZeptoMailSenderName { get; set; }

        /// <summary>
        /// How many times to re-attempt failed email sends.
        /// </summary>
        public int EmailMaxRetries { get; set; }

        /// <summary>
        /// Selects between Gemini, OpenAI, or Claude.
        /// </summary>
        public Enum.Enum.BcpAiProvider ActiveAiProvider { get; set; }

        /// <summary>
        /// Powers the BcpSmartAssist using Google AI.
        /// </summary>
        public string? GeminiApiKey { get; set; }

        /// <summary>
        /// Powers the BcpSmartAssist using ChatGPT.
        /// </summary>
        public string? OpenAIApiKey { get; set; }

        /// <summary>
        /// Powers the BcpSmartAssist using Claude.
        /// </summary>
        public string? AnthropicApiKey { get; set; }

        /// <summary>
        /// Selects the active bot-protection service.
        /// </summary>
        public Enum.Enum.CaptchaType ActiveCaptcha { get; set; }

        /// <summary>
        /// Injected into the frontend to render the Captcha.
        /// </summary>
        public string? GoogleRecaptchaSiteKey { get; set; }

        /// <summary>
        /// Used by the backend to verify the Captcha score.
        /// </summary>
        public string? GoogleRecaptchaSecretKey { get; set; }

        /// <summary>
        /// Admin notes regarding key rotation.
        /// </summary>
        public string? EncryptionNote { get; set; }

        /// <summary>
        /// External endpoint for key management (if applicable).
        /// </summary>
        public string? EncryptionUrl { get; set; }

        /// <summary>
        /// Seed used to encrypt sensitive PII in the database.
        /// </summary>
        public string? EncryptionKey { get; set; }

        /// <summary>
        /// The time staff must clock in by default.
        /// </summary>
        public DateTime? DefaultAttendanceStartTime { get; set; }

        /// <summary>
        /// The time staff can clock out by default.
        /// </summary>
        public DateTime? DefaultAttendanceCloseTime { get; set; }

        /// <summary>
        /// Threshold for calculating 'Early' attendance status.
        /// </summary>
        public int EarlyMinute { get; set; }

        /// <summary>
        /// Threshold for calculating 'On Time' status.
        /// </summary>
        public int OntimeMinute { get; set; }

        /// <summary>
        /// Threshold for calculating 'Late' status.
        /// </summary>
        public int LateMinute { get; set; }

        /// <summary>
        /// Threshold for calculating 'Very Late' status.
        /// </summary>
        public int VeryLateMinute { get; set; }

        /// <summary>
        /// Weekend clock-in rule.
        /// </summary>
        public DateTime? DefaultAttendanceStartTimeSaturday { get; set; }

        /// <summary>
        /// The deadline time for daily reports to be submitted.
        /// </summary>
        public DateTime? ReportCloseTime { get; set; }

        /// <summary>
        /// Boilerplate text appended to printed Job Cards.
        /// </summary>
        public string? JobCardNote { get; set; }

        /// <summary>
        /// The banner image used on printable Job Cards.
        /// </summary>
        public string? JobCardTitleBackgroundUrl { get; set; }

        /// <summary>
        /// Cloudinary ID for the Job Card banner.
        /// </summary>
        public string? JobCardTitleBackgroundKey { get; set; }

        #region Password & Security Policy Settings

        /// <summary>
        /// Minimum password length required by Identity password policy.
        /// </summary>
        public int PasswordMinLength { get; set; } = 8;

        /// <summary>
        /// Require at least one numeric digit in user passwords.
        /// </summary>
        public bool PasswordRequireDigit { get; set; } = true;

        /// <summary>
        /// Require at least one lowercase character in user passwords.
        /// </summary>
        public bool PasswordRequireLowercase { get; set; } = true;

        /// <summary>
        /// Require at least one uppercase character in user passwords.
        /// </summary>
        public bool PasswordRequireUppercase { get; set; } = true;

        /// <summary>
        /// Require at least one non-alphanumeric special character in user passwords.
        /// </summary>
        public bool PasswordRequireNonAlphanumeric { get; set; } = true;

        /// <summary>
        /// Days before passwords expire (0 for no expiration).
        /// </summary>
        public int PasswordExpirationDays { get; set; } = 90;

        /// <summary>
        /// Number of failed access attempts before account is locked out.
        /// </summary>
        public int MaxFailedAccessAttempts { get; set; } = 5;

        /// <summary>
        /// Lockout duration in minutes after maximum failed attempts.
        /// </summary>
        public int LockoutDurationMinutes { get; set; } = 15;

        /// <summary>
        /// Enforce Multi-Factor Authentication for all users globally.
        /// </summary>
        public bool MfaRequiredGlobally { get; set; } = false;

        /// <summary>
        /// Enforce Multi-Factor Authentication for console admin users.
        /// </summary>
        public bool MfaRequiredForAdmins { get; set; } = false;

        /// <summary>
        /// When true, members cannot log into the workspace until their email address is confirmed via OTP.
        /// </summary>
        public bool RequireConfirmedEmailToLogin { get; set; } = false;

        #endregion

        #region Member ID & Identification Formats

        /// <summary>
        /// Selected format pattern out of the 10 supported templates.
        /// Options:
        /// 1. PrefixYearMonthRandom (CC-yyMM-###)
        /// 2. PrefixSequential (CC-######)
        /// 3. PrefixFullYearSeq (CC-yyyy-####)
        /// 4. PrefixShortYearSeq (CC-yy-####)
        /// 5. NumericSequential (100001)
        /// 6. PrefixInitialsSeq (CC-PO-####)
        /// 7. PrefixFullYearMonthSeq (CC-yyyyMM-####)
        /// 8. CategoryCodeYearSeq (SW-yy-####)
        /// 9. PrefixAlphanumericToken (CC-XXXXXX)
        /// 10. InstitutionalSlash (CC/yyyy/####)
        /// </summary>
        public string? MemberIdFormat { get; set; } = "PrefixYearMonthRandom";

        /// <summary>
        /// Organization custom prefix code (e.g. 'CC', 'ORG', 'BCC', 'MEM').
        /// </summary>
        public string? MemberIdPrefix { get; set; } = "CC";

        /// <summary>
        /// Auto-incrementing sequence counter for sequential Member ID formats.
        /// </summary>
        public int MemberIdNextNumber { get; set; } = 1;

        /// <summary>
        /// Number of digits for zero-padding in sequential formats (e.g. 4 => '0001', 6 => '000001').
        /// </summary>
        public int MemberIdPadding { get; set; } = 4;

        /// <summary>
        /// Character separator delimiter (e.g. '-', '/', '.').
        /// </summary>
        public string? MemberIdDelimiter { get; set; } = "-";

        #endregion
    }
}





