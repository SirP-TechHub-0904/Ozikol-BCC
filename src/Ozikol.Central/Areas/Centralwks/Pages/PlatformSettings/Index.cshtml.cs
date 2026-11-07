using System;
using System.ComponentModel.DataAnnotations;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Ozikol.Central.Services;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Areas.Centralwks.Pages.PlatformSettings
{
    /// <summary>
    /// Page model for managing global platform settings, onboarding free trial parameters,
    /// administrative email routing pools, and ticketing automation thresholds in Centralwks.
    /// </summary>
    public class IndexModel : PageModel
    {
        private readonly MasterCatalogDbContext _context;
        private readonly ICurrencyService _currencyService;
        private readonly ILogger<IndexModel> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="IndexModel"/> class.
        /// </summary>
        /// <param name="context">Master catalog database context.</param>
        /// <param name="currencyService">Currency and pricing service.</param>
        /// <param name="logger">Structured logging service.</param>
        public IndexModel(MasterCatalogDbContext context, ICurrencyService currencyService, ILogger<IndexModel> logger)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _currencyService = currencyService ?? throw new ArgumentNullException(nameof(currencyService));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>
        /// Gets or sets the settings input form model.
        /// </summary>
        [BindProperty]
        public SettingsInputModel Input { get; set; } = new SettingsInputModel();

        /// <summary>
        /// Gets or sets the last updated timestamp in UTC.
        /// </summary>
        public DateTime LastUpdatedUtc { get; set; }

        /// <summary>
        /// Gets or sets the status feedback notification message.
        /// </summary>
        [TempData]
        public string? StatusMessage { get; set; }

        /// <summary>
        /// Active currencies loaded from MasterCurrencyRates for the Default System Currency selector.
        /// </summary>
        public System.Collections.Generic.List<MasterCurrencyRate> AvailableCurrencies { get; set; } = new();

        /// <summary>
        /// Form input model for global platform settings.
        /// </summary>
        public class SettingsInputModel
        {
            /// <summary>Gets or sets platform brand name.</summary>
            [Required(ErrorMessage = "Platform brand name is required.")]
            [MaxLength(100)]
            public string PlatformName { get; set; } = "Ozikol";

            /// <summary>Gets or sets public support contact email.</summary>
            [EmailAddress]
            [MaxLength(150)]
            public string? SupportContactEmail { get; set; } = "support@ozikol.com";

            /// <summary>Gets or sets outgoing default from email.</summary>
            [EmailAddress]
            [MaxLength(150)]
            public string? DefaultFromEmail { get; set; } = "noreply@ozikol.com";

            /// <summary>Gets or sets whether admin email alerts are enabled.</summary>
            public bool EnableAdminNotifications { get; set; } = true;

            /// <summary>Gets or sets support ticketing admin notification email pool.</summary>
            public string? SupportAdminEmails { get; set; }

            /// <summary>Gets or sets affiliate partner application notification email pool.</summary>
            public string? PartnerAdminEmails { get; set; }

            /// <summary>Gets or sets creator application notification email pool.</summary>
            public string? CreatorAdminEmails { get; set; }

            /// <summary>Gets or sets careers applicant notification email pool.</summary>
            public string? CareersAdminEmails { get; set; }

            /// <summary>Gets or sets certification exam booking notification email pool.</summary>
            public string? CertificationAdminEmails { get; set; }

            /// <summary>Gets or sets inactivity ticket auto-close hours.</summary>
            [Range(1, 720, ErrorMessage = "Ticket auto-close must be between 1 and 720 hours.")]
            public int TicketAutoCloseHours { get; set; } = 24;

            /// <summary>Gets or sets whether ticket auto-close is active.</summary>
            public bool EnableTicketAutoClose { get; set; } = true;

            /// <summary>Gets or sets default free trial period in days for newly registered workspaces.</summary>
            [Required(ErrorMessage = "Default trial days is required.")]
            [Range(1, 365, ErrorMessage = "Trial period must be between 1 and 365 days.")]
            public int DefaultTrialDays { get; set; } = 14;

            /// <summary>Gets or sets comma-separated support category list.</summary>
            public string SupportCategories { get; set; } = "Support, Sales, Billing, Partnership, Enterprise, General";

            /// <summary>Gets or sets MongoDB connection string dedicated strictly for central system logs.</summary>
            [MaxLength(1000)]
            public string? MongoLogsConnectionString { get; set; }

            /// <summary>Gets or sets MongoDB database name for central telemetry.</summary>
            [MaxLength(100)]
            public string MongoLogsDatabaseName { get; set; } = "OzikolLogsDb";

            /// <summary>Gets or sets MongoDB collection name for central system logs.</summary>
            [MaxLength(100)]
            public string MongoLogsCollectionName { get; set; } = "central_system_logs";

            /// <summary>Gets or sets Sentry DSN for client crash reporting.</summary>
            [MaxLength(500)]
            public string? SentryDsn { get; set; }

            /// <summary>Gets or sets OneSignal App ID for mobile and desktop push notifications.</summary>
            [MaxLength(255)]
            public string? OneSignalAppId { get; set; }

            /// <summary>Gets or sets Cloudflare Turnstile public site key for bot verification.</summary>
            [MaxLength(255)]
            public string? CloudflareTurnstileSiteKey { get; set; }

            /// <summary>Gets or sets Google reCAPTCHA v2 Checkbox ("I'm not a robot") Site Key.</summary>
            [MaxLength(255)]
            public string? GoogleReCaptchaSiteKey { get; set; }

            /// <summary>Gets or sets Google reCAPTCHA v2 Checkbox Secret Key.</summary>
            [MaxLength(255)]
            public string? GoogleReCaptchaSecretKey { get; set; }

            /// <summary>Gets or sets Transactional Email Provider (e.g. "Postmark", "Mailcow", "SMTP").</summary>
            [MaxLength(50)]
            public string EmailProvider { get; set; } = "Postmark";

            /// <summary>Gets or sets Postmark Server API Token.</summary>
            [MaxLength(255)]
            public string? PostmarkServerToken { get; set; }

            /// <summary>Gets or sets default sender email for Postmark dispatches.</summary>
            [MaxLength(150)]
            public string? PostmarkDefaultFrom { get; set; }

            /// <summary>Gets or sets default sender display name for transactional emails.</summary>
            [MaxLength(150)]
            public string EmailFromName { get; set; } = "Ozikol Cloud Security";

            /// <summary>Gets or sets OneSignal REST API Key for server push notifications.</summary>
            [MaxLength(255)]
            public string? OneSignalRestApiKey { get; set; }

            /// <summary>Gets or sets base URL for AI Gateway microservice.</summary>
            [MaxLength(500)]
            public string? AiGatewayUrl { get; set; }

            /// <summary>Gets or sets base URL for HTML Sections Extractor engine.</summary>
            [MaxLength(500)]
            public string? HtmlExtractorApiUrl { get; set; }

            /// <summary>Gets or sets Master platform Cloudinary Cloud Name.</summary>
            [MaxLength(255)]
            public string? CloudinaryCloudName { get; set; }

            /// <summary>Gets or sets Master platform Cloudinary API Key.</summary>
            [MaxLength(255)]
            public string? CloudinaryApiKey { get; set; }

            /// <summary>Gets or sets Master platform Cloudinary API Secret.</summary>
            [MaxLength(255)]
            public string? CloudinaryApiSecret { get; set; }

            /// <summary>Gets or sets Cloudflare Account ID for R2 Object Storage.</summary>
            [MaxLength(255)]
            public string? CloudflareR2AccountId { get; set; }

            /// <summary>Gets or sets Cloudflare R2 Access Key ID.</summary>
            [MaxLength(255)]
            public string? CloudflareR2AccessKeyId { get; set; }

            /// <summary>Gets or sets Cloudflare R2 Secret Access Key.</summary>
            [MaxLength(255)]
            public string? CloudflareR2SecretAccessKey { get; set; }

            /// <summary>Gets or sets Cloudflare R2 Bucket Name.</summary>
            [MaxLength(255)]
            public string CloudflareR2BucketName { get; set; } = "ozikol-assets";

            /// <summary>Gets or sets Cloudflare R2 Public CDN URL.</summary>
            [MaxLength(500)]
            public string? CloudflareR2PublicCdnUrl { get; set; }

            /// <summary>Gets or sets whether Central Paystack checkout is enabled for workspace capability subscriptions &amp; renewals.</summary>
            public bool EnablePaystack { get; set; } = true;

            /// <summary>Gets or sets Central Paystack Public Key (pk_live_... or pk_test_...).</summary>
            [MaxLength(255)]
            public string? PaystackPublicKey { get; set; }

            /// <summary>Gets or sets Central Paystack Secret Key (sk_live_... or sk_test_...).</summary>
            [MaxLength(255)]
            public string? PaystackSecretKey { get; set; }

            /// <summary>Gets or sets Central Paystack Webhook Secret for HMAC-SHA512 signature validation.</summary>
            [MaxLength(255)]
            public string? PaystackWebhookSecret { get; set; }

            /// <summary>Gets or sets whether Central Flutterwave checkout is enabled for workspace capability subscriptions &amp; renewals.</summary>
            public bool EnableFlutterwave { get; set; } = false;

            /// <summary>Gets or sets Central Flutterwave Public Key (FLWPUBK_LIVE-... or FLWPUBK_TEST-...).</summary>
            [MaxLength(255)]
            public string? FlutterwavePublicKey { get; set; }

            /// <summary>Gets or sets Central Flutterwave Secret Key (FLWSECK_LIVE-... or FLWSECK_TEST-...).</summary>
            [MaxLength(255)]
            public string? FlutterwaveSecretKey { get; set; }

            /// <summary>Gets or sets Central Flutterwave Webhook Secret Hash.</summary>
            [MaxLength(255)]
            public string? FlutterwaveWebhookSecret { get; set; }

            /// <summary>Gets or sets whether Central Stripe checkout is enabled for workspace capability subscriptions &amp; renewals.</summary>
            public bool EnableStripe { get; set; } = false;

            /// <summary>Gets or sets Central Stripe Publishable Key (pk_live_... or pk_test_...).</summary>
            [MaxLength(255)]
            public string? StripePublishableKey { get; set; }

            /// <summary>Gets or sets Central Stripe Secret Key (sk_live_... or sk_test_...).</summary>
            [MaxLength(255)]
            public string? StripeSecretKey { get; set; }

            /// <summary>Gets or sets Central Stripe Webhook Signing Secret (whsec_...).</summary>
            [MaxLength(255)]
            public string? StripeWebhookSecret { get; set; }

            /// <summary>Gets or sets whether Direct Bank Deposit / Wire Transfer is enabled on Central invoices.</summary>
            public bool EnableBankDeposit { get; set; } = true;

            /// <summary>Gets or sets the beneficiary bank institution name for Direct Bank Deposit.</summary>
            [MaxLength(150)]
            public string? BankDepositBankName { get; set; }

            /// <summary>Gets or sets the beneficiary corporate account name for Direct Bank Deposit.</summary>
            [MaxLength(150)]
            public string? BankDepositAccountName { get; set; }

            /// <summary>Gets or sets the beneficiary account number or IBAN for Direct Bank Deposit.</summary>
            [MaxLength(100)]
            public string? BankDepositAccountNumber { get; set; }

            /// <summary>Gets or sets the optional routing number, sort code, or SWIFT/BIC code for Direct Bank Deposit.</summary>
            [MaxLength(100)]
            public string? BankDepositSortCodeOrSwift { get; set; }

            /// <summary>Gets or sets custom payment narration or verification instructions for Direct Bank Deposit.</summary>
            [MaxLength(500)]
            public string? BankDepositInstructions { get; set; }

            /// <summary>Gets or sets whether platform-wide maintenance mode is engaged.</summary>
            public bool IsMaintenanceMode { get; set; } = false;

            /// <summary>Gets or sets the public maintenance notification banner message.</summary>
            [MaxLength(500)]
            public string? MaintenanceMessage { get; set; }

            /// <summary>Gets or sets the minimum required client version (e.g. 1.0.0).</summary>
            [Required(ErrorMessage = "Minimum app version is required.")]
            [MaxLength(50)]
            public string MinimumAppVersion { get; set; } = "1.0.0";
        }

        /// <summary>
        /// Handles HTTP GET request to load current global platform settings.
        /// </summary>
        public async Task OnGetAsync()
        {
            var settings = await _context.MasterPlatformSettings.FirstOrDefaultAsync(s => s.Id == 1);
            if (settings == null)
            {
                settings = new MasterPlatformSetting
                {
                    Id = 1,
                    PlatformName = "Ozikol",
                    SupportContactEmail = "support@ozikol.com",
                    DefaultFromEmail = "noreply@ozikol.com",
                    EnableAdminNotifications = true,
                    SupportAdminEmails = "support-admin@ozikol.com",
                    PartnerAdminEmails = "partners-admin@ozikol.com",
                    CreatorAdminEmails = "creators-admin@ozikol.com",
                    CareersAdminEmails = "careers-admin@ozikol.com",
                    CertificationAdminEmails = "certifications-admin@ozikol.com",
                    TicketAutoCloseHours = 24,
                    EnableTicketAutoClose = true,
                    DefaultTrialDays = 14,
                    DefaultCurrencyCode = "USD",
                    SupportCategories = "Support, Sales, Billing, Partnership, Enterprise, General",
                    MinimumAppVersion = "1.0.0",
                    MongoLogsDatabaseName = "OzikolLogsDb",
                    MongoLogsCollectionName = "central_system_logs",
                    UpdatedUtc = DateTime.UtcNow
                };

                _context.MasterPlatformSettings.Add(settings);
                await _context.SaveChangesAsync();
            }

            LastUpdatedUtc = settings.UpdatedUtc;
            Input = new SettingsInputModel
            {
                PlatformName = settings.PlatformName,
                SupportContactEmail = settings.SupportContactEmail,
                DefaultFromEmail = settings.DefaultFromEmail,
                EnableAdminNotifications = settings.EnableAdminNotifications,
                SupportAdminEmails = settings.SupportAdminEmails,
                PartnerAdminEmails = settings.PartnerAdminEmails,
                CreatorAdminEmails = settings.CreatorAdminEmails,
                CareersAdminEmails = settings.CareersAdminEmails,
                CertificationAdminEmails = settings.CertificationAdminEmails,
                TicketAutoCloseHours = settings.TicketAutoCloseHours,
                EnableTicketAutoClose = settings.EnableTicketAutoClose,
                DefaultTrialDays = settings.DefaultTrialDays > 0 ? settings.DefaultTrialDays : 14,
                SupportCategories = settings.SupportCategories,
                MongoLogsConnectionString = settings.MongoLogsConnectionString,
                MongoLogsDatabaseName = !string.IsNullOrWhiteSpace(settings.MongoLogsDatabaseName) ? settings.MongoLogsDatabaseName : "OzikolLogsDb",
                MongoLogsCollectionName = !string.IsNullOrWhiteSpace(settings.MongoLogsCollectionName) ? settings.MongoLogsCollectionName : "central_system_logs",
                SentryDsn = settings.SentryDsn,
                OneSignalAppId = settings.OneSignalAppId,
                CloudflareTurnstileSiteKey = settings.CloudflareTurnstileSiteKey,
                GoogleReCaptchaSiteKey = settings.GoogleReCaptchaSiteKey,
                GoogleReCaptchaSecretKey = settings.GoogleReCaptchaSecretKey,
                EmailProvider = !string.IsNullOrWhiteSpace(settings.EmailProvider) ? settings.EmailProvider : "Postmark",
                PostmarkServerToken = settings.PostmarkServerToken,
                PostmarkDefaultFrom = settings.PostmarkDefaultFrom,
                EmailFromName = !string.IsNullOrWhiteSpace(settings.EmailFromName) ? settings.EmailFromName : "Ozikol Cloud Security",
                OneSignalRestApiKey = settings.OneSignalRestApiKey,
                AiGatewayUrl = settings.AiGatewayUrl,
                HtmlExtractorApiUrl = settings.HtmlExtractorApiUrl,
                CloudinaryCloudName = settings.CloudinaryCloudName,
                CloudinaryApiKey = settings.CloudinaryApiKey,
                CloudinaryApiSecret = settings.CloudinaryApiSecret,
                CloudflareR2AccountId = settings.CloudflareR2AccountId,
                CloudflareR2AccessKeyId = settings.CloudflareR2AccessKeyId,
                CloudflareR2SecretAccessKey = settings.CloudflareR2SecretAccessKey,
                CloudflareR2BucketName = !string.IsNullOrWhiteSpace(settings.CloudflareR2BucketName) ? settings.CloudflareR2BucketName : "ozikol-assets",
                CloudflareR2PublicCdnUrl = settings.CloudflareR2PublicCdnUrl,
                EnablePaystack = settings.EnablePaystack,
                PaystackPublicKey = settings.PaystackPublicKey,
                PaystackSecretKey = settings.PaystackSecretKey,
                PaystackWebhookSecret = settings.PaystackWebhookSecret,
                EnableFlutterwave = settings.EnableFlutterwave,
                FlutterwavePublicKey = settings.FlutterwavePublicKey,
                FlutterwaveSecretKey = settings.FlutterwaveSecretKey,
                FlutterwaveWebhookSecret = settings.FlutterwaveWebhookSecret,
                EnableStripe = settings.EnableStripe,
                StripePublishableKey = settings.StripePublishableKey,
                StripeSecretKey = settings.StripeSecretKey,
                StripeWebhookSecret = settings.StripeWebhookSecret,
                EnableBankDeposit = settings.EnableBankDeposit,
                BankDepositBankName = settings.BankDepositBankName,
                BankDepositAccountName = settings.BankDepositAccountName,
                BankDepositAccountNumber = settings.BankDepositAccountNumber,
                BankDepositSortCodeOrSwift = settings.BankDepositSortCodeOrSwift,
                BankDepositInstructions = settings.BankDepositInstructions,
                IsMaintenanceMode = settings.IsMaintenanceMode,
                MaintenanceMessage = settings.MaintenanceMessage,
                MinimumAppVersion = !string.IsNullOrWhiteSpace(settings.MinimumAppVersion) ? settings.MinimumAppVersion : "1.0.0"
            };
        }

        /// <summary>
        /// Handles HTTP POST request to save updated platform settings.
        /// </summary>
        /// <returns>Redirect back to settings page on success.</returns>
        public async Task<IActionResult> OnPostAsync()
        {
            if (!ModelState.IsValid)
            {
                return Page();
            }

            var settings = await _context.MasterPlatformSettings.FirstOrDefaultAsync(s => s.Id == 1);
            if (settings == null)
            {
                settings = new MasterPlatformSetting { Id = 1 };
                _context.MasterPlatformSettings.Add(settings);
            }

            settings.PlatformName = Input.PlatformName.Trim();
            settings.SupportContactEmail = Input.SupportContactEmail?.Trim();
            settings.DefaultFromEmail = Input.DefaultFromEmail?.Trim();
            settings.EnableAdminNotifications = Input.EnableAdminNotifications;
            settings.SupportAdminEmails = Input.SupportAdminEmails?.Trim();
            settings.PartnerAdminEmails = Input.PartnerAdminEmails?.Trim();
            settings.CreatorAdminEmails = Input.CreatorAdminEmails?.Trim();
            settings.CareersAdminEmails = Input.CareersAdminEmails?.Trim();
            settings.CertificationAdminEmails = Input.CertificationAdminEmails?.Trim();
            settings.TicketAutoCloseHours = Input.TicketAutoCloseHours;
            settings.EnableTicketAutoClose = Input.EnableTicketAutoClose;
            settings.DefaultTrialDays = Input.DefaultTrialDays;
            settings.SupportCategories = Input.SupportCategories.Trim();

            // Guard against accidental secret wipeouts when re-submitting settings
            if (!string.IsNullOrWhiteSpace(Input.MongoLogsConnectionString))
            {
                settings.MongoLogsConnectionString = Input.MongoLogsConnectionString.Trim();
            }

            settings.MongoLogsDatabaseName = string.IsNullOrWhiteSpace(Input.MongoLogsDatabaseName) ? "OzikolLogsDb" : Input.MongoLogsDatabaseName.Trim();
            settings.MongoLogsCollectionName = string.IsNullOrWhiteSpace(Input.MongoLogsCollectionName) ? "central_system_logs" : Input.MongoLogsCollectionName.Trim();
            settings.SentryDsn = Input.SentryDsn?.Trim();
            settings.OneSignalAppId = Input.OneSignalAppId?.Trim();
            settings.CloudflareTurnstileSiteKey = Input.CloudflareTurnstileSiteKey?.Trim();
            settings.GoogleReCaptchaSiteKey = Input.GoogleReCaptchaSiteKey?.Trim();
            if (!string.IsNullOrWhiteSpace(Input.GoogleReCaptchaSecretKey))
            {
                settings.GoogleReCaptchaSecretKey = Input.GoogleReCaptchaSecretKey.Trim();
            }

            settings.EmailProvider = string.IsNullOrWhiteSpace(Input.EmailProvider) ? "Postmark" : Input.EmailProvider.Trim();
            if (!string.IsNullOrWhiteSpace(Input.PostmarkServerToken))
            {
                settings.PostmarkServerToken = Input.PostmarkServerToken.Trim();
            }
            settings.PostmarkDefaultFrom = Input.PostmarkDefaultFrom?.Trim();
            settings.EmailFromName = string.IsNullOrWhiteSpace(Input.EmailFromName) ? "Ozikol Cloud Security" : Input.EmailFromName.Trim();

            if (!string.IsNullOrWhiteSpace(Input.OneSignalRestApiKey))
            {
                settings.OneSignalRestApiKey = Input.OneSignalRestApiKey.Trim();
            }

            settings.AiGatewayUrl = Input.AiGatewayUrl?.Trim();
            settings.HtmlExtractorApiUrl = Input.HtmlExtractorApiUrl?.Trim();
            settings.CloudinaryCloudName = Input.CloudinaryCloudName?.Trim();
            settings.CloudinaryApiKey = Input.CloudinaryApiKey?.Trim();

            if (!string.IsNullOrWhiteSpace(Input.CloudinaryApiSecret))
            {
                settings.CloudinaryApiSecret = Input.CloudinaryApiSecret.Trim();
            }

            settings.CloudflareR2AccountId = Input.CloudflareR2AccountId?.Trim();
            settings.CloudflareR2AccessKeyId = Input.CloudflareR2AccessKeyId?.Trim();
            if (!string.IsNullOrWhiteSpace(Input.CloudflareR2SecretAccessKey))
            {
                settings.CloudflareR2SecretAccessKey = Input.CloudflareR2SecretAccessKey.Trim();
            }
            settings.CloudflareR2BucketName = string.IsNullOrWhiteSpace(Input.CloudflareR2BucketName) ? "ozikol-assets" : Input.CloudflareR2BucketName.Trim();
            settings.CloudflareR2PublicCdnUrl = Input.CloudflareR2PublicCdnUrl?.Trim();

            settings.EnablePaystack = Input.EnablePaystack;
            settings.PaystackPublicKey = Input.PaystackPublicKey?.Trim();
            if (!string.IsNullOrWhiteSpace(Input.PaystackSecretKey))
            {
                settings.PaystackSecretKey = Input.PaystackSecretKey.Trim();
            }
            if (!string.IsNullOrWhiteSpace(Input.PaystackWebhookSecret))
            {
                settings.PaystackWebhookSecret = Input.PaystackWebhookSecret.Trim();
            }

            settings.EnableFlutterwave = Input.EnableFlutterwave;
            settings.FlutterwavePublicKey = Input.FlutterwavePublicKey?.Trim();
            if (!string.IsNullOrWhiteSpace(Input.FlutterwaveSecretKey))
            {
                settings.FlutterwaveSecretKey = Input.FlutterwaveSecretKey.Trim();
            }
            if (!string.IsNullOrWhiteSpace(Input.FlutterwaveWebhookSecret))
            {
                settings.FlutterwaveWebhookSecret = Input.FlutterwaveWebhookSecret.Trim();
            }

            settings.EnableStripe = Input.EnableStripe;
            settings.StripePublishableKey = Input.StripePublishableKey?.Trim();
            if (!string.IsNullOrWhiteSpace(Input.StripeSecretKey))
            {
                settings.StripeSecretKey = Input.StripeSecretKey.Trim();
            }
            if (!string.IsNullOrWhiteSpace(Input.StripeWebhookSecret))
            {
                settings.StripeWebhookSecret = Input.StripeWebhookSecret.Trim();
            }

            settings.EnableBankDeposit = Input.EnableBankDeposit;
            settings.BankDepositBankName = Input.BankDepositBankName?.Trim();
            settings.BankDepositAccountName = Input.BankDepositAccountName?.Trim();
            settings.BankDepositAccountNumber = Input.BankDepositAccountNumber?.Trim();
            settings.BankDepositSortCodeOrSwift = Input.BankDepositSortCodeOrSwift?.Trim();
            settings.BankDepositInstructions = Input.BankDepositInstructions?.Trim();

            settings.IsMaintenanceMode = Input.IsMaintenanceMode;
            settings.MaintenanceMessage = Input.MaintenanceMessage?.Trim();
            settings.MinimumAppVersion = string.IsNullOrWhiteSpace(Input.MinimumAppVersion) ? "1.0.0" : Input.MinimumAppVersion.Trim();
            settings.UpdatedUtc = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // Immediately flush cache so public registration and pricing pages reflect changes instantly
            _currencyService.InvalidatePricingCache();

            _logger.LogInformation("Central operator updated MasterPlatformSettings at {UpdatedUtc}", settings.UpdatedUtc);
            StatusMessage = "Global platform settings saved successfully.";

            return RedirectToPage();
        }

        /// <summary>
        /// Handles AJAX POST request to test the Central Paystack Secret Key live against Paystack's API.
        /// </summary>
        public async Task<IActionResult> OnPostTestPaystackConnectionAsync([FromForm] string? secretKey)
        {
            var targetSecret = secretKey?.Trim();
            if (string.IsNullOrWhiteSpace(targetSecret))
            {
                var settings = await _context.MasterPlatformSettings.AsNoTracking().FirstOrDefaultAsync(s => s.Id == 1);
                targetSecret = settings?.PaystackSecretKey?.Trim();
            }

            if (string.IsNullOrWhiteSpace(targetSecret))
            {
                return new JsonResult(new { success = false, message = "No Paystack Secret Key provided or saved in Central Settings." });
            }

            try
            {
                using var http = new System.Net.Http.HttpClient { Timeout = TimeSpan.FromSeconds(10) };
                using var req = new System.Net.Http.HttpRequestMessage(System.Net.Http.HttpMethod.Post, "https://api.paystack.co/transaction/initialize");
                req.Headers.Add("Authorization", $"Bearer {targetSecret}");
                var probePayload = System.Text.Json.JsonSerializer.Serialize(new
                {
                    email = "billing@company.com",
                    amount = 10000,
                    currency = "NGN"
                });
                req.Content = new System.Net.Http.StringContent(probePayload, System.Text.Encoding.UTF8, "application/json");

                var resp = await http.SendAsync(req);
                var body = await resp.Content.ReadAsStringAsync();
                if (resp.IsSuccessStatusCode)
                {
                    var keyMode = targetSecret.StartsWith("sk_live_", StringComparison.OrdinalIgnoreCase) ? "LIVE Mode" : "TEST Mode";
                    return new JsonResult(new { success = true, message = $"Paystack key verified ({keyMode})! Ready for payments." });
                }

                string paystackMsg = $"HTTP {(int)resp.StatusCode}";
                try
                {
                    using var doc = System.Text.Json.JsonDocument.Parse(body);
                    if (doc.RootElement.TryGetProperty("message", out var msgProp) && !string.IsNullOrWhiteSpace(msgProp.GetString()))
                    {
                        paystackMsg = msgProp.GetString()!;
                    }
                }
                catch { }

                return new JsonResult(new { success = false, message = $"Paystack rejected key: {paystackMsg}" });
            }
            catch (Exception ex)
            {
                return new JsonResult(new { success = false, message = $"Paystack connection error: {ex.Message}" });
            }
        }

        /// <summary>
        /// Handles AJAX POST request to test a MongoDB connection string in real-time.
        /// </summary>
        public async Task<IActionResult> OnPostTestMongoConnectionAsync([FromForm] string? connectionString)
        {
            var targetConn = connectionString?.Trim();
            if (string.IsNullOrWhiteSpace(targetConn))
            {
                var settings = await _context.MasterPlatformSettings.FirstOrDefaultAsync(s => s.Id == 1);
                targetConn = settings?.MongoLogsConnectionString;
            }

            if (string.IsNullOrWhiteSpace(targetConn))
            {
                return new JsonResult(new { success = false, message = "No MongoDB connection string provided or configured." });
            }

            try
            {
                var clientSettings = MongoDB.Driver.MongoClientSettings.FromConnectionString(targetConn);
                clientSettings.ServerSelectionTimeout = TimeSpan.FromSeconds(6);
                var client = new MongoDB.Driver.MongoClient(clientSettings);
                var db = client.GetDatabase("OzikolLogsDb");
                await db.RunCommandAsync((MongoDB.Driver.Command<MongoDB.Bson.BsonDocument>)"{ping:1}");
                return new JsonResult(new { success = true, message = "Successfully connected to MongoDB Atlas! Cluster ping: ok." });
            }
            catch (Exception ex)
            {
                return new JsonResult(new { success = false, message = $"Connection failed: {ex.Message}" });
            }
        }
    
        /// <summary>
        /// Tests connectivity and credentials for Cloudflare R2 Object Storage.
        /// </summary>
        public async Task<IActionResult> OnPostTestCloudflareR2ConnectionAsync(
            [FromForm] string? accountId,
            [FromForm] string? accessKeyId,
            [FromForm] string? secretAccessKey,
            [FromForm] string? bucketName,
            [FromForm] string? publicCdnUrl)
        {
            var targetAccount = accountId?.Trim();
            var targetAccessKey = accessKeyId?.Trim();
            var targetSecret = secretAccessKey?.Trim();
            var targetBucket = string.IsNullOrWhiteSpace(bucketName) ? "ozikol-assets" : bucketName.Trim();
            var targetCdnUrl = publicCdnUrl?.Trim();

            // Fallback to saved database settings if fields left blank
            if (string.IsNullOrWhiteSpace(targetAccount) || string.IsNullOrWhiteSpace(targetAccessKey) || string.IsNullOrWhiteSpace(targetSecret))
            {
                var existing = await _context.MasterPlatformSettings.AsNoTracking().FirstOrDefaultAsync(s => s.Id == 1);
                if (existing != null)
                {
                    targetAccount ??= existing.CloudflareR2AccountId;
                    targetAccessKey ??= existing.CloudflareR2AccessKeyId;
                    targetSecret ??= existing.CloudflareR2SecretAccessKey;
                    if (string.IsNullOrWhiteSpace(targetBucket)) targetBucket = existing.CloudflareR2BucketName ?? "ozikol-assets";
                    if (string.IsNullOrWhiteSpace(targetCdnUrl)) targetCdnUrl = existing.CloudflareR2PublicCdnUrl;
                }
            }

            if (string.IsNullOrWhiteSpace(targetAccount) || string.IsNullOrWhiteSpace(targetAccessKey) || string.IsNullOrWhiteSpace(targetSecret))
            {
                return new JsonResult(new { success = false, message = "Please provide Cloudflare Account ID, Access Key ID, and Secret Access Key." });
            }

            try
            {
                var serviceUrl = $"https://{targetAccount}.r2.cloudflarestorage.com";
                var s3Config = new Amazon.S3.AmazonS3Config
                {
                    ServiceURL = serviceUrl,
                    ForcePathStyle = true,
                    Timeout = TimeSpan.FromSeconds(10)
                };
                var credentials = new Amazon.Runtime.BasicAWSCredentials(targetAccessKey, targetSecret);
                using var client = new Amazon.S3.AmazonS3Client(credentials, s3Config);

                var response = await client.ListObjectsV2Async(new Amazon.S3.Model.ListObjectsV2Request
                {
                    BucketName = targetBucket,
                    MaxKeys = 1
                });

                return new JsonResult(new
                {
                    success = true,
                    message = $"Successfully connected to Cloudflare R2 bucket '{targetBucket}'! Object count inspected: {response.KeyCount}.",
                    bucket = targetBucket,
                    cdnUrl = targetCdnUrl
                });
            }
            catch (Exception ex)
            {
                return new JsonResult(new { success = false, message = $"Cloudflare R2 connection test failed: {ex.Message}" });
            }
        }
    }
}
