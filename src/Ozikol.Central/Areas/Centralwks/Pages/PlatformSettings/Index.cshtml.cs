using System;
using System.ComponentModel.DataAnnotations;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Areas.Centralwks.Pages.PlatformSettings
{
    /// <summary>
    /// Page model for managing global platform settings, administrative email routing pools,
    /// and ticketing automation thresholds in Centralwks.
    /// </summary>
    public class IndexModel : PageModel
    {
        private readonly MasterCatalogDbContext _context;
        private readonly ILogger<IndexModel> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="IndexModel"/> class.
        /// </summary>
        /// <param name="context">Master catalog database context.</param>
        /// <param name="logger">Structured logging service.</param>
        public IndexModel(MasterCatalogDbContext context, ILogger<IndexModel> logger)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
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

            /// <summary>Gets or sets comma-separated support category list.</summary>
            public string SupportCategories { get; set; } = "Support, Sales, Billing, Partnership, Enterprise, General";
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
                    SupportCategories = "Support, Sales, Billing, Partnership, Enterprise, General",
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
                SupportCategories = settings.SupportCategories
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
            settings.SupportCategories = Input.SupportCategories.Trim();
            settings.UpdatedUtc = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Central operator updated MasterPlatformSettings at {UpdatedUtc}", settings.UpdatedUtc);
            StatusMessage = "Global platform settings saved successfully.";

            return RedirectToPage();
        }
    }
}
