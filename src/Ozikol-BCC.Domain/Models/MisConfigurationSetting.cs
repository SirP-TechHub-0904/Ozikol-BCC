using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Represents the tenant-level backend configuration, third-party gateway integrations,
    /// payment API keys, SMS credentials, email suite settings, cloud storage (BYOS),
    /// security policies, member ID format parameters, and administrative operational aliases.
    /// </summary>
    [Table("MisConfigurationSettings")]
    public class MisConfigurationSetting
    {
        /// <summary>
        /// Unique primary key identifier for the configuration settings record.
        /// </summary>
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        // ── Currency & Commerce Defaults ──

        /// <summary>
        /// Global 3-letter currency code (e.g., "USD", "NGN", "EUR", "GBP").
        /// </summary>
        [MaxLength(10)]
        [Display(Name = "Currency Code")]
        public string CurrencyCode { get; set; } = "USD";

        /// <summary>
        /// Standard visual currency symbol (e.g., "$", "₦", "€", "£").
        /// </summary>
        [MaxLength(10)]
        [Display(Name = "Currency Symbol")]
        public string CurrencySymbol { get; set; } = "$";

        // ── Payment Gateways (Paystack, Flutterwave, Stripe, PayPal, PixelPay) ──

        /// <summary>
        /// Toggle to enable Paystack checkout processing.
        /// </summary>
        [Display(Name = "Enable Paystack")]
        public bool EnablePaystack { get; set; } = false;

        /// <summary>
        /// Paystack public API key used by client-side checkout scripts.
        /// </summary>
        [MaxLength(250)]
        [Display(Name = "Paystack Public Key")]
        public string? PaystackPublicKey { get; set; }

        /// <summary>
        /// Paystack secret API key used for server-side verification and split payments.
        /// </summary>
        [MaxLength(250)]
        [Display(Name = "Paystack Secret Key")]
        public string? PaystackSecretKey { get; set; }

        /// <summary>
        /// Paystack webhook signing secret used to verify raw webhook payloads.
        /// </summary>
        [MaxLength(250)]
        [Display(Name = "Paystack Webhook Secret")]
        public string? PaystackWebhookSecret { get; set; }

        /// <summary>
        /// Toggle to enable Flutterwave payment integration.
        /// </summary>
        [Display(Name = "Enable Flutterwave")]
        public bool EnableFlutterwave { get; set; } = false;

        /// <summary>
        /// Flutterwave public API key.
        /// </summary>
        [MaxLength(250)]
        public string? FlutterwavePublicKey { get; set; }

        /// <summary>
        /// Flutterwave secret API key.
        /// </summary>
        [MaxLength(250)]
        public string? FlutterwaveSecretKey { get; set; }

        /// <summary>
        /// Flutterwave webhook encryption key.
        /// </summary>
        [MaxLength(250)]
        public string? FlutterwaveEncryptionKey { get; set; }

        /// <summary>
        /// Toggle to enable Stripe payments.
        /// </summary>
        [Display(Name = "Enable Stripe")]
        public bool EnableStripe { get; set; } = false;

        /// <summary>
        /// Stripe publishable API key (pk_live_...).
        /// </summary>
        [MaxLength(250)]
        public string? StripePublishableKey { get; set; }

        /// <summary>
        /// Stripe secret API key (sk_live_...).
        /// </summary>
        [MaxLength(250)]
        public string? StripeSecretKey { get; set; }

        /// <summary>
        /// Stripe webhook endpoint signing secret (whsec_...).
        /// </summary>
        [MaxLength(250)]
        public string? StripeWebhookSecret { get; set; }

        /// <summary>
        /// Toggle to enable PayPal transactions.
        /// </summary>
        [Display(Name = "Enable PayPal")]
        public bool EnablePayPal { get; set; } = false;

        /// <summary>
        /// PayPal REST API Client ID.
        /// </summary>
        [MaxLength(250)]
        public string? PayPalClientId { get; set; }

        /// <summary>
        /// PayPal REST API Client Secret.
        /// </summary>
        [MaxLength(250)]
        public string? PayPalClientSecret { get; set; }

        /// <summary>
        /// PayPal webhook listener ID.
        /// </summary>
        [MaxLength(250)]
        public string? PayPalWebhookId { get; set; }

        // ── PixelPay Gateway ──

        /// <summary>
        /// Toggle to enable PixelPay processing.
        /// </summary>
        [Display(Name = "Enable PixelPay")]
        public bool EnablePixelPay { get; set; } = false;

        /// <summary>
        /// PixelPay base API URL endpoint.
        /// </summary>
        [MaxLength(250)]
        public string? PixelPayBaseUrl { get; set; }

        /// <summary>
        /// PixelPay Key ID / System ID.
        /// </summary>
        [MaxLength(250)]
        public string? PixelPayKeyId { get; set; }

        /// <summary>
        /// PixelPay Secret Token / API Key.
        /// </summary>
        [MaxLength(250)]
        public string? PixelPaySecretKey { get; set; }

        /// <summary>
        /// PixelPay Default Processing Currency (e.g. NGN, USD).
        /// </summary>
        [MaxLength(10)]
        public string? PixelPayCurrency { get; set; } = "NGN";

        /// <summary>
        /// PixelPay API Key alias.
        /// </summary>
        [MaxLength(250)]
        public string? PixelPayApiKey { get; set; }

        /// <summary>
        /// PixelPay Merchant identification code.
        /// </summary>
        [MaxLength(250)]
        public string? PixelPayMerchantCode { get; set; }

        /// <summary>
        /// PixelPay Salt Key.
        /// </summary>
        [MaxLength(250)]
        public string? PixelPaySaltKey { get; set; }

        /// <summary>
        /// PixelPay Webhook Secret.
        /// </summary>
        [MaxLength(250)]
        public string? PixelPayWebhookSecret { get; set; }

        // ── SMS & Telephony Integrations ──

        /// <summary>
        /// Master switch to enable or disable outgoing SMS dispatch.
        /// </summary>
        [Display(Name = "Enable Outgoing SMS")]
        public bool EnableSms { get; set; } = true;

        /// <summary>
        /// Active SMS provider selection ("Termii", "Twilio", "KudiSMS").
        /// </summary>
        [MaxLength(50)]
        public string SmsProvider { get; set; } = "Termii";

        /// <summary>
        /// Termii API key for transactional and promotional OTP/SMS delivery.
        /// </summary>
        [MaxLength(250)]
        public string? TermiiApiKey { get; set; }

        /// <summary>
        /// Verified registered alphanumeric SMS sender ID (e.g. "OZIKOL", "COMPANY").
        /// </summary>
        [MaxLength(50)]
        public string? TermiiSenderId { get; set; }

        /// <summary>
        /// Twilio Account SID.
        /// </summary>
        [MaxLength(250)]
        public string? TwilioAccountSid { get; set; }

        /// <summary>
        /// Twilio Auth Token.
        /// </summary>
        [MaxLength(250)]
        public string? TwilioAuthToken { get; set; }

        /// <summary>
        /// Twilio dedicated phone number or sender ID.
        /// </summary>
        [MaxLength(50)]
        public string? TwilioPhoneNumber { get; set; }

        /// <summary>
        /// Current prepaid SMS credit balance for bulk dispatches.
        /// </summary>
        public decimal SmsCreditBalance { get; set; } = 0;

        // ── Email Suite & Delivery Providers ──

        /// <summary>
        /// Active transactional email delivery provider ("Postmark", "ZeptoMail", "Smtp").
        /// </summary>
        [MaxLength(50)]
        public string EmailProvider { get; set; } = "Postmark";

        /// <summary>
        /// Postmark Server API Token.
        /// </summary>
        [MaxLength(250)]
        public string? PostmarkServerToken { get; set; }

        /// <summary>
        /// Postmark From Email address.
        /// </summary>
        [MaxLength(150)]
        public string? PostmarkFromEmail { get; set; }

        /// <summary>
        /// Postmark Message Stream (e.g. "outbound", "broadcast").
        /// </summary>
        [MaxLength(100)]
        public string? PostmarkMessageStream { get; set; } = "outbound";

        /// <summary>
        /// Default authenticated sender email address for transactional dispatches.
        /// </summary>
        [MaxLength(150)]
        public string? SenderEmail { get; set; }

        /// <summary>
        /// Default display sender name (e.g. "Acme Notifications").
        /// </summary>
        [MaxLength(100)]
        public string? SenderName { get; set; }

        /// <summary>
        /// Custom SMTP server hostname if EmailProvider is set to "Smtp".
        /// </summary>
        [MaxLength(200)]
        public string? SmtpHost { get; set; }

        /// <summary>
        /// Custom SMTP server port (e.g. 587, 465, 25).
        /// </summary>
        public int SmtpPort { get; set; } = 587;

        /// <summary>
        /// SMTP username.
        /// </summary>
        [MaxLength(150)]
        public string? SmtpUsername { get; set; }

        /// <summary>
        /// SMTP password.
        /// </summary>
        [MaxLength(250)]
        public string? SmtpPassword { get; set; }

        /// <summary>
        /// Flag indicating whether SSL/TLS encryption is enforced for SMTP.
        /// </summary>
        public bool SmtpEnableSsl { get; set; } = true;

        /// <summary>
        /// ZeptoMail API authorization key.
        /// </summary>
        [MaxLength(250)]
        public string? ZeptoMailApiKey { get; set; }

        /// <summary>
        /// ZeptoMail Send Mail Token.
        /// </summary>
        [MaxLength(250)]
        public string? ZeptoMailSendMailToken { get; set; }

        /// <summary>
        /// ZeptoMail sender email address.
        /// </summary>
        [MaxLength(150)]
        public string? ZeptoMailSenderEmail { get; set; }

        /// <summary>
        /// ZeptoMail sender name.
        /// </summary>
        [MaxLength(100)]
        public string? ZeptoMailSenderName { get; set; }

        /// <summary>
        /// Maximum retry attempts for failed queued emails.
        /// </summary>
        public int EmailMaxRetries { get; set; } = 5;

        /// <summary>
        /// Total global newsletter email dispatch credits remaining for tenant.
        /// </summary>
        public int GlobalNewsletterQuota { get; set; } = 0;

        /// <summary>
        /// Expiration timestamp for the global newsletter dispatch quota.
        /// </summary>
        public DateTime? GlobalNewsletterQuotaExpiry { get; set; }

        // ── Custom Cloud Media Storage (BYOS - Bring Your Own Storage) ──

        /// <summary>
        /// When true, tenant media uploads are sent to the tenant's own Cloudinary/S3 bucket rather than platform defaults.
        /// </summary>
        [Display(Name = "Use Custom Cloud Storage")]
        public bool UseCustomStorage { get; set; } = false;

        /// <summary>
        /// Custom Cloudinary cloud name.
        /// </summary>
        [MaxLength(150)]
        public string? CustomCloudinaryCloudName { get; set; }

        /// <summary>
        /// Custom Cloudinary API key.
        /// </summary>
        [MaxLength(150)]
        public string? CustomCloudinaryApiKey { get; set; }

        /// <summary>
        /// Custom Cloudinary API secret.
        /// </summary>
        [MaxLength(250)]
        public string? CustomCloudinaryApiSecret { get; set; }

        /// <summary>
        /// Custom AWS S3 or compatible storage bucket name.
        /// </summary>
        [MaxLength(150)]
        public string? CustomS3BucketName { get; set; }

        /// <summary>
        /// Custom AWS S3 access key ID.
        /// </summary>
        [MaxLength(150)]
        public string? CustomS3AccessKey { get; set; }

        /// <summary>
        /// Custom AWS S3 secret access key.
        /// </summary>
        [MaxLength(250)]
        public string? CustomS3SecretKey { get; set; }

        /// <summary>
        /// Custom AWS S3 region (e.g., "us-east-1", "eu-central-1").
        /// </summary>
        [MaxLength(50)]
        public string? CustomS3Region { get; set; }

        // ── Security, Access Control & Quotas ──

        /// <summary>
        /// Minimum password length required for user registrations and resets.
        /// </summary>
        public int PasswordMinLength { get; set; } = 6;

        /// <summary>
        /// Requires at least one numeric digit in passwords.
        /// </summary>
        public bool PasswordRequireDigit { get; set; } = true;

        /// <summary>
        /// Requires at least one uppercase letter in passwords.
        /// </summary>
        public bool PasswordRequireUppercase { get; set; } = true;

        /// <summary>
        /// Requires at least one lowercase letter in passwords.
        /// </summary>
        public bool PasswordRequireLowercase { get; set; } = true;

        /// <summary>
        /// Requires at least one special character in passwords.
        /// </summary>
        public bool PasswordRequireNonAlphanumeric { get; set; } = false;

        /// <summary>
        /// Maximum number of consecutive failed login attempts before lockout.
        /// </summary>
        public int MaxFailedAccessAttempts { get; set; } = 5;

        /// <summary>
        /// Lockout duration in minutes after exceeding max failed attempts.
        /// </summary>
        public int LockoutDurationMinutes { get; set; } = 15;

        /// <summary>
        /// Enforce Multi-Factor Authentication for all users in the tenant workspace.
        /// </summary>
        public bool MfaRequiredGlobally { get; set; } = false;

        /// <summary>
        /// Enforce Multi-Factor Authentication specifically for workspace administrators.
        /// </summary>
        public bool MfaRequiredForAdmins { get; set; } = false;

        /// <summary>
        /// Requires users to confirm their email before being allowed to sign in.
        /// </summary>
        public bool RequireConfirmedEmailToLogin { get; set; } = false;

        /// <summary>
        /// Restricts login access strictly to authorized/recognized devices.
        /// </summary>
        [Display(Name = "Activate Only Authorized Devices")]
        public bool EnableOnlyAuthorizedDevices { get; set; } = false;

        /// <summary>
        /// Enforces Mandatory Two-Factor Authentication across all administrator accounts.
        /// </summary>
        [Display(Name = "Enforce 2FA")]
        public bool EnableTwoFactorAuth { get; set; } = false;

        /// <summary>
        /// Policy toggle permitting or prohibiting permanent deletion of user accounts.
        /// </summary>
        [Display(Name = "Allow User Deletion")]
        public bool EnableUserDeletion { get; set; } = false;

        /// <summary>
        /// Allows staff to export/download administrative data grids to Excel/CSV.
        /// </summary>
        [Display(Name = "Enable Table List Downloads")]
        public bool EnableListDownload { get; set; } = true;

        /// <summary>
        /// Maximum allowable staff accounts under this tenant organization.
        /// </summary>
        [Display(Name = "Maximum Staff Quota")]
        public int MaximumUsers { get; set; } = 1000;

        /// <summary>
        /// Inactivity duration (in minutes) before an authenticated session expires.
        /// </summary>
        [Display(Name = "Session Timeout (Minutes)")]
        public int SessionTimeoutMinutes { get; set; } = 120;

        // ── Administrative Terminology Aliases ──

        /// <summary>
        /// Custom organizational display label for 'Category' (e.g. 'Department', 'Ministry', 'Sector').
        /// </summary>
        [MaxLength(100)]
        public string? CategoryAlias { get; set; }

        /// <summary>
        /// Custom organizational display label for 'Sub-Category' (e.g. 'Unit', 'Sub-Unit', 'Division').
        /// </summary>
        [MaxLength(100)]
        public string? SubCategoryAlias { get; set; }

        /// <summary>
        /// Custom organizational display label for 'Group' (e.g. 'Committee', 'Working Group', 'Chapter').
        /// </summary>
        [MaxLength(100)]
        public string? GroupAlias { get; set; }

        /// <summary>
        /// Custom organizational display label for 'Alumni' (e.g. 'Past Executive', 'Fellow', 'Honorary Member').
        /// </summary>
        [MaxLength(100)]
        public string? AlumniAlias { get; set; }

        // ── Member ID Generation Rules ──

        /// <summary>
        /// Formatting template for member ID generation ("PrefixYearMonthRandom", "Sequential", etc.).
        /// </summary>
        [MaxLength(100)]
        public string? MemberIdFormat { get; set; } = "PrefixYearMonthRandom";

        /// <summary>
        /// Custom prefix for generated member/staff ID codes (e.g. "AG-", "BCP-").
        /// </summary>
        [MaxLength(20)]
        public string? MemberIdPrefix { get; set; } = "ID-";

        /// <summary>
        /// Next sequence counter for member ID generation.
        /// </summary>
        public int MemberIdNextNumber { get; set; } = 1;

        /// <summary>
        /// Zero-padding width for numeric part of generated IDs.
        /// </summary>
        public int MemberIdPadding { get; set; } = 4;

        /// <summary>
        /// Delimiter character used in generated member IDs (e.g. "-", "/").
        /// </summary>
        [MaxLength(10)]
        public string? MemberIdDelimiter { get; set; } = "-";

        // ── Timestamps ──

        /// <summary>
        /// Timestamp in UTC when the configuration settings record was created.
        /// </summary>
        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Timestamp in UTC when the configuration settings record was last modified.
        /// </summary>
        public DateTime? UpdatedAtUtc { get; set; }
    }
}
