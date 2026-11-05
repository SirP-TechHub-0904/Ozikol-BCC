using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Linq;

namespace Ozikol.MasterDomain.Models
{
    /// <summary>
    /// Represents global platform settings and system automation parameters for the central portal.
    /// Contains configurable administrator notification pools, support ticketing automation thresholds, and general platform parameters.
    /// </summary>
    [Table("MasterPlatformSettings")]
    public class MasterPlatformSetting
    {
        /// <summary>
        /// Gets or sets the primary key identifier. Typically singleton record with Id = 1.
        /// </summary>
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.None)]
        public int Id { get; set; } = 1;

        /// <summary>
        /// Gets or sets the platform brand display name (e.g. "Ozikol").
        /// </summary>
        [Required]
        [MaxLength(100)]
        public string PlatformName { get; set; } = "Ozikol";

        /// <summary>
        /// Gets or sets the general support contact email address displayed on public pages.
        /// </summary>
        [MaxLength(150)]
        public string? SupportContactEmail { get; set; }

        /// <summary>
        /// Gets or sets the default sender email address for outgoing system communications.
        /// </summary>
        [MaxLength(150)]
        public string? DefaultFromEmail { get; set; }

        /// <summary>
        /// Gets or sets a value indicating whether administrator notification emails are enabled across all departments.
        /// When false, outgoing administrator notification emails are suppressed while customer confirmation receipts remain active.
        /// </summary>
        public bool EnableAdminNotifications { get; set; } = true;

        /// <summary>
        /// Gets or sets the pool of administrator email addresses for support tickets and inquiry notifications.
        /// Accepts one or more email addresses separated by commas, semicolons, or whitespace.
        /// </summary>
        public string? SupportAdminEmails { get; set; }

        /// <summary>
        /// Gets or sets the pool of administrator email addresses for affiliate partner application notifications.
        /// Accepts one or more email addresses separated by commas, semicolons, or whitespace.
        /// </summary>
        public string? PartnerAdminEmails { get; set; }

        /// <summary>
        /// Gets or sets the pool of administrator email addresses for creator program application notifications.
        /// Accepts one or more email addresses separated by commas, semicolons, or whitespace.
        /// </summary>
        public string? CreatorAdminEmails { get; set; }

        /// <summary>
        /// Gets or sets the pool of administrator email addresses for job candidate application notifications.
        /// Accepts one or more email addresses separated by commas, semicolons, or whitespace.
        /// </summary>
        public string? CareersAdminEmails { get; set; }

        /// <summary>
        /// Gets or sets the pool of administrator email addresses for certification exam booking notifications.
        /// Accepts one or more email addresses separated by commas, semicolons, or whitespace.
        /// </summary>
        public string? CertificationAdminEmails { get; set; }

        /// <summary>
        /// Gets or sets the inactivity threshold in hours after which an inactive ticket is automatically closed.
        /// Defaults to 24 hours.
        /// </summary>
        public int TicketAutoCloseHours { get; set; } = 24;

        /// <summary>
        /// Gets or sets a value indicating whether the 24-hour inactivity ticket auto-close process is active.
        /// </summary>
        public bool EnableTicketAutoClose { get; set; } = true;

        /// <summary>
        /// Gets or sets the default number of free trial days granted to new organization workspaces (e.g. 14, 15, 30, 40, 60, 90).
        /// Defaults to 14 days.
        /// </summary>
        public int DefaultTrialDays { get; set; } = 14;

        /// <summary>
        /// Gets or sets the global default system display 3-letter currency code (e.g. "USD", "NGN", "GBP")
        /// shown across all amount places on the Central website and used as the fallback currency.
        /// </summary>
        [MaxLength(10)]
        public string DefaultCurrencyCode { get; set; } = "USD";

        /// <summary>
        /// Gets or sets the 3-letter ISO currency code used as the Default Exchange Rate Base (1.0000).
        /// Defaults to "USD" (US Dollar). All other currencies store their exchange rate relative to 1.00 of this currency.
        /// </summary>
        [MaxLength(10)]
        public string DefaultExchangeRateCurrencyCode { get; set; } = "USD";

        /// <summary>
        /// Gets or sets the comma-separated list of support inquiry categories available on the public contact form and enterprise inquiries.
        /// Defaults to "Support, Sales, Billing, Partnership, Enterprise, General".
        /// </summary>
        public string SupportCategories { get; set; } = "Support, Sales, Billing, Partnership, Enterprise, General";

        /// <summary>
        /// Helper property returning the support categories as a clean parsed list of strings.
        /// Not mapped to the database.
        /// </summary>
        [NotMapped]
        public List<string> SupportCategoryList
        {
            get
            {
                if (string.IsNullOrWhiteSpace(SupportCategories))
                {
                    return new List<string> { "Support", "Sales", "Billing", "Partnership", "Enterprise", "General" };
                }

                return SupportCategories.Split(new[] { ',', ';', '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                                        .Distinct(StringComparer.OrdinalIgnoreCase)
                                        .ToList();
            }
        }

        /// <summary>
        /// Gets or sets the Master platform Cloudinary Cloud Name used as the global default for media, assets, and templates.
        /// </summary>
        [MaxLength(255)]
        public string? CloudinaryCloudName { get; set; }

        /// <summary>
        /// Gets or sets the Master platform Cloudinary API Key.
        /// </summary>
        [MaxLength(255)]
        public string? CloudinaryApiKey { get; set; }

        /// <summary>
        /// Gets or sets the Master platform Cloudinary API Secret.
        /// </summary>
        [MaxLength(255)]
        public string? CloudinaryApiSecret { get; set; }

        /// <summary>
        /// Gets or sets the OneSignal App ID used for mobile and desktop push notifications.
        /// </summary>
        [MaxLength(255)]
        public string? OneSignalAppId { get; set; }

        /// <summary>
        /// Gets or sets the Sentry DSN used for client crash reporting on web, mobile, and desktop.
        /// </summary>
        [MaxLength(500)]
        public string? SentryDsn { get; set; }

        /// <summary>
        /// Gets or sets the Cloudflare Turnstile public Site Key for client-side bot verification.
        /// </summary>
        [MaxLength(255)]
        public string? CloudflareTurnstileSiteKey { get; set; }

        /// <summary>
        /// Gets or sets the Google reCAPTCHA v2 Checkbox ("I'm not a robot") public Site Key.
        /// </summary>
        [MaxLength(255)]
        public string? GoogleReCaptchaSiteKey { get; set; }

        /// <summary>
        /// Gets or sets the Google reCAPTCHA v2 Checkbox Secret Key.
        /// Stored encrypted transparently at rest via AES-256-GCM.
        /// </summary>
        [MaxLength(255)]
        public string? GoogleReCaptchaSecretKey { get; set; }

        /// <summary>
        /// Gets or sets the transactional email service provider name (e.g. "Postmark", "Mailcow", "SMTP").
        /// Defaults to "Postmark".
        /// </summary>
        [MaxLength(50)]
        public string EmailProvider { get; set; } = "Postmark";

        /// <summary>
        /// Gets or sets the Postmark Server API Token used for transactional system emails.
        /// Stored encrypted transparently at rest via AES-256-GCM.
        /// </summary>
        [MaxLength(255)]
        public string? PostmarkServerToken { get; set; }

        /// <summary>
        /// Gets or sets the verified default sender email address for Postmark dispatches (e.g. "notifications@ozikol.cloud").
        /// </summary>
        [MaxLength(150)]
        public string? PostmarkDefaultFrom { get; set; }

        /// <summary>
        /// Gets or sets the default sender display name for transactional emails (e.g. "Ozikol Cloud Security").
        /// </summary>
        [MaxLength(150)]
        public string EmailFromName { get; set; } = "Ozikol Cloud Security";

        /// <summary>
        /// Gets or sets the OneSignal REST API Key used for server-side push notifications.
        /// Stored encrypted transparently at rest via AES-256-GCM.
        /// </summary>
        [MaxLength(255)]
        public string? OneSignalRestApiKey { get; set; }

        /// <summary>
        /// Gets or sets the base URL for the Ozi AI Gateway and intelligence microservice.
        /// </summary>
        [MaxLength(500)]
        public string? AiGatewayUrl { get; set; }

        /// <summary>
        /// Gets or sets the base URL for the HTML sections extractor engine.
        /// </summary>
        [MaxLength(500)]
        public string? HtmlExtractorApiUrl { get; set; }

        /// <summary>
        /// Gets or sets a value indicating whether global platform maintenance mode is engaged.
        /// </summary>
        public bool IsMaintenanceMode { get; set; } = false;

        /// <summary>
        /// Gets or sets the maintenance message displayed to users when maintenance mode is active.
        /// </summary>
        [MaxLength(500)]
        public string? MaintenanceMessage { get; set; }

        /// <summary>
        /// Gets or sets the minimum supported mobile and desktop client application version (e.g. "1.0.0").
        /// </summary>
        [MaxLength(50)]
        public string MinimumAppVersion { get; set; } = "1.0.0";

        /// <summary>
        /// Gets or sets the MongoDB connection string used strictly for central system logs and telemetry.
        /// Resolved dynamically from the Master Catalog database so no secrets are stored on client apps.
        /// </summary>
        [MaxLength(1000)]
        public string? MongoLogsConnectionString { get; set; }

        /// <summary>
        /// Gets or sets the MongoDB database name dedicated to central logs (e.g., "OzikolLogsDb").
        /// </summary>
        [MaxLength(100)]
        public string MongoLogsDatabaseName { get; set; } = "OzikolLogsDb";

        /// <summary>
        /// Gets or sets the primary MongoDB collection name for central system events (e.g., "central_system_logs").
        /// </summary>
        [MaxLength(100)]
        public string MongoLogsCollectionName { get; set; } = "central_system_logs";

        /// <summary>
        /// Gets or sets a value indicating whether the Central platform Paystack payment gateway is enabled
        /// for tenant workspace subscriptions, capability renewals, and add-on checkouts.
        /// </summary>
        public bool EnablePaystack { get; set; } = true;

        /// <summary>
        /// Gets or sets the Central platform Paystack Public Key (e.g., "pk_live_..." or "pk_test_...")
        /// used by Paystack Inline Checkout when tenants pay Ozikol Central for subscriptions and renewals.
        /// </summary>
        [MaxLength(255)]
        public string? PaystackPublicKey { get; set; }

        /// <summary>
        /// Gets or sets the Central platform Paystack Secret Key (e.g., "sk_live_..." or "sk_test_...")
        /// resolved strictly server-side from MasterCatalogDbContext and never exposed to client payloads.
        /// </summary>
        [MaxLength(255)]
        public string? PaystackSecretKey { get; set; }

        /// <summary>
        /// Gets or sets the Central platform Paystack Webhook Secret used to validate HMAC-SHA512 signatures
        /// on incoming central webhook events (/api/paystack-webhook/central). Falls back to PaystackSecretKey when blank.
        /// </summary>
        [MaxLength(255)]
        public string? PaystackWebhookSecret { get; set; }

        /// <summary>
        /// Gets or sets a value indicating whether the Central platform Flutterwave payment gateway is enabled
        /// for tenant workspace subscriptions, capability renewals, and add-on checkouts.
        /// </summary>
        public bool EnableFlutterwave { get; set; } = false;

        /// <summary>
        /// Gets or sets the Central platform Flutterwave Public Key (e.g., "FLWPUBK_LIVE-..." or "FLWPUBK_TEST-...").
        /// </summary>
        [MaxLength(255)]
        public string? FlutterwavePublicKey { get; set; }

        /// <summary>
        /// Gets or sets the Central platform Flutterwave Secret Key (e.g., "FLWSECK_LIVE-..." or "FLWSECK_TEST-...")
        /// resolved strictly server-side from MasterCatalogDbContext.
        /// </summary>
        [MaxLength(255)]
        public string? FlutterwaveSecretKey { get; set; }

        /// <summary>
        /// Gets or sets the Central platform Flutterwave Webhook Secret Hash used to validate incoming webhook callbacks.
        /// </summary>
        [MaxLength(255)]
        public string? FlutterwaveWebhookSecret { get; set; }

        /// <summary>
        /// Gets or sets a value indicating whether the Central platform Stripe payment gateway is enabled
        /// for international card and wallet settlements on tenant invoices.
        /// </summary>
        public bool EnableStripe { get; set; } = false;

        /// <summary>
        /// Gets or sets the Central platform Stripe Publishable Key (e.g., "pk_live_..." or "pk_test_...").
        /// </summary>
        [MaxLength(255)]
        public string? StripePublishableKey { get; set; }

        /// <summary>
        /// Gets or sets the Central platform Stripe Secret Key (e.g., "sk_live_..." or "sk_test_...")
        /// resolved strictly server-side from MasterCatalogDbContext.
        /// </summary>
        [MaxLength(255)]
        public string? StripeSecretKey { get; set; }

        /// <summary>
        /// Gets or sets the Central platform Stripe Webhook Signing Secret (e.g., "whsec_...").
        /// </summary>
        [MaxLength(255)]
        public string? StripeWebhookSecret { get; set; }

        /// <summary>
        /// Gets or sets a value indicating whether Direct Bank Deposit / Wire Transfer is enabled on Central invoices.
        /// </summary>
        public bool EnableBankDeposit { get; set; } = true;

        /// <summary>
        /// Gets or sets the beneficiary bank institution name for Direct Bank Deposit settlements.
        /// </summary>
        [MaxLength(150)]
        public string? BankDepositBankName { get; set; }

        /// <summary>
        /// Gets or sets the beneficiary corporate account name for Direct Bank Deposit settlements.
        /// </summary>
        [MaxLength(150)]
        public string? BankDepositAccountName { get; set; }

        /// <summary>
        /// Gets or sets the beneficiary bank account number or IBAN for Direct Bank Deposit settlements.
        /// </summary>
        [MaxLength(100)]
        public string? BankDepositAccountNumber { get; set; }

        /// <summary>
        /// Gets or sets the optional routing number, sort code, or SWIFT/BIC code for Direct Bank Deposit settlements.
        /// </summary>
        [MaxLength(100)]
        public string? BankDepositSortCodeOrSwift { get; set; }

        /// <summary>
        /// Gets or sets custom payment narration or verification instructions displayed to tenants when paying via Direct Bank Deposit.
        /// </summary>
        [MaxLength(500)]
        public string? BankDepositInstructions { get; set; }

        /// <summary>
        /// Gets or sets the UTC timestamp when these settings were last modified.
        /// </summary>
        public DateTime UpdatedUtc { get; set; } = DateTime.UtcNow;
    }
}
