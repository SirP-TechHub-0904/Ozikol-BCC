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

            /// <summary>Gets or sets the global fallback currency code.</summary>
            [Required(ErrorMessage = "Default currency code is required.")]
            [MaxLength(10)]
            public string DefaultCurrencyCode { get; set; } = "USD";

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

            /// <summary>Gets or sets Master platform Cloudinary Cloud Name.</summary>
            [MaxLength(255)]
            public string? CloudinaryCloudName { get; set; }

            /// <summary>Gets or sets Master platform Cloudinary API Key.</summary>
            [MaxLength(255)]
            public string? CloudinaryApiKey { get; set; }

            /// <summary>Gets or sets Master platform Cloudinary API Secret.</summary>
            [MaxLength(255)]
            public string? CloudinaryApiSecret { get; set; }

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
                DefaultCurrencyCode = !string.IsNullOrWhiteSpace(settings.DefaultCurrencyCode) ? settings.DefaultCurrencyCode : "USD",
                SupportCategories = settings.SupportCategories,
                MongoLogsConnectionString = settings.MongoLogsConnectionString,
                MongoLogsDatabaseName = !string.IsNullOrWhiteSpace(settings.MongoLogsDatabaseName) ? settings.MongoLogsDatabaseName : "OzikolLogsDb",
                MongoLogsCollectionName = !string.IsNullOrWhiteSpace(settings.MongoLogsCollectionName) ? settings.MongoLogsCollectionName : "central_system_logs",
                SentryDsn = settings.SentryDsn,
                OneSignalAppId = settings.OneSignalAppId,
                CloudflareTurnstileSiteKey = settings.CloudflareTurnstileSiteKey,
                CloudinaryCloudName = settings.CloudinaryCloudName,
                CloudinaryApiKey = settings.CloudinaryApiKey,
                CloudinaryApiSecret = settings.CloudinaryApiSecret,
                IsMaintenanceMode = settings.IsMaintenanceMode,
                MaintenanceMessage = settings.MaintenanceMessage,
                MinimumAppVersion = !string.IsNullOrWhiteSpace(settings.MinimumAppVersion) ? settings.MinimumAppVersion : "1.0.0"
            };

            try
            {
                AvailableCurrencies = await _context.MasterCurrencyRates
                    .AsNoTracking()
                    .Where(c => c.IsActive)
                    .OrderByDescending(c => c.IsBaseCurrency)
                    .ThenBy(c => c.SortOrder)
                    .ThenBy(c => c.CurrencyCode)
                    .ToListAsync();
            }
            catch
            {
                AvailableCurrencies = new System.Collections.Generic.List<MasterCurrencyRate>();
            }
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
            settings.DefaultCurrencyCode = Input.DefaultCurrencyCode?.Trim().ToUpperInvariant() ?? "USD";
            TempData["SwitchCentralCurrencyCode"] = settings.DefaultCurrencyCode;
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
            settings.CloudinaryCloudName = Input.CloudinaryCloudName?.Trim();
            settings.CloudinaryApiKey = Input.CloudinaryApiKey?.Trim();

            if (!string.IsNullOrWhiteSpace(Input.CloudinaryApiSecret))
            {
                settings.CloudinaryApiSecret = Input.CloudinaryApiSecret.Trim();
            }

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
    }
}
