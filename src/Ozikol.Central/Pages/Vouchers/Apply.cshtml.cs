using System;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Ozikol.Central.Services;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Pages.Vouchers
{
    /// <summary>
    /// PageModel for the public 1-Year Free Promotional Voucher application page.
    /// Handles eligibility verification, community engagement submissions, and receipt generation.
    /// </summary>
    public class ApplyModel : PageModel
    {
        private readonly MasterCatalogDbContext _masterDbContext;
        private readonly ICentralEmailService _emailService;
        private readonly IConfiguration _configuration;
        private readonly ILogger<ApplyModel> _logger;

        public ApplyModel(
            MasterCatalogDbContext masterDbContext,
            ICentralEmailService emailService,
            IConfiguration configuration,
            ILogger<ApplyModel> logger)
        {
            _masterDbContext = masterDbContext;
            _emailService = emailService;
            _configuration = configuration;
            _logger = logger;
        }

        [BindProperty]
        public VoucherApplicationInputModel Input { get; set; } = new();

        /// <summary>
        /// Social media links and handles configured in appsettings.json.
        /// </summary>
        public CommunityLinksViewModel CommunityLinks { get; set; } = new();

        /// <summary>
        /// Reference number returned after successful submission.
        /// </summary>
        public string? SubmittedReferenceNumber { get; set; }

        /// <summary>
        /// Flag indicating application was just submitted successfully.
        /// </summary>
        public bool IsSuccess { get; set; }

        public void OnGet()
        {
            LoadCommunityLinks();
        }

        public async Task<IActionResult> OnPostAsync()
        {
            LoadCommunityLinks();

            if (!ModelState.IsValid)
            {
                return Page();
            }

            // Ensure at least two social verification proofs are supplied
            var proofCount = 0;
            if (!string.IsNullOrWhiteSpace(Input.TwitterHandle)) proofCount++;
            if (!string.IsNullOrWhiteSpace(Input.LinkedInProfile)) proofCount++;
            if (!string.IsNullOrWhiteSpace(Input.YouTubeHandle)) proofCount++;
            if (!string.IsNullOrWhiteSpace(Input.FacebookProfile)) proofCount++;
            if (!string.IsNullOrWhiteSpace(Input.InstagramHandle)) proofCount++;
            if (!string.IsNullOrWhiteSpace(Input.SnapchatHandle)) proofCount++;

            if (proofCount < 2)
            {
                ModelState.AddModelError(string.Empty, "Please provide at least 2 social media handles/links where you have followed our official accounts to verify eligibility.");
                return Page();
            }

            // Generate unique human-readable reference number (e.g. VCH-2026-9812)
            var randomSuffix = Random.Shared.Next(1000, 9999);
            var referenceNumber = $"VCH-{DateTime.UtcNow.Year}-{randomSuffix}";

            // Ensure uniqueness
            while (await _masterDbContext.MasterVoucherApplications.AnyAsync(a => a.ReferenceNumber == referenceNumber))
            {
                randomSuffix = Random.Shared.Next(1000, 9999);
                referenceNumber = $"VCH-{DateTime.UtcNow.Year}-{randomSuffix}";
            }

            var application = new MasterVoucherApplication
            {
                ReferenceNumber = referenceNumber,
                FullName = Input.FullName.Trim(),
                WorkEmail = Input.WorkEmail.Trim().ToLowerInvariant(),
                PhoneNumber = Input.PhoneNumber?.Trim(),
                OrganizationName = Input.OrganizationName.Trim(),
                WorkspaceSlug = Input.WorkspaceSlug?.Trim().ToLowerInvariant(),
                TwitterHandle = Input.TwitterHandle?.Trim(),
                LinkedInProfile = Input.LinkedInProfile?.Trim(),
                YouTubeHandle = Input.YouTubeHandle?.Trim(),
                FacebookProfile = Input.FacebookProfile?.Trim(),
                InstagramHandle = Input.InstagramHandle?.Trim(),
                SnapchatHandle = Input.SnapchatHandle?.Trim(),
                IsNewsletterSubscribed = Input.IsNewsletterSubscribed,
                Remarks = Input.Remarks?.Trim(),
                Status = "Pending",
                GrantedDurationDays = 365,
                CreatedAtUtc = DateTime.UtcNow
            };

            _masterDbContext.MasterVoucherApplications.Add(application);
            await _masterDbContext.SaveChangesAsync();

            _logger.LogInformation("Voucher application [{Ref}] received for organization [{Org}] from [{Email}].",
                referenceNumber, application.OrganizationName, application.WorkEmail);

            // Dispatch dual email receipts
            try
            {
                await _emailService.SendVoucherApplicationDualAsync(application);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to dispatch voucher application email notification for {Ref}", referenceNumber);
            }

            SubmittedReferenceNumber = referenceNumber;
            IsSuccess = true;

            return Page();
        }

        private void LoadCommunityLinks()
        {
            CommunityLinks = new CommunityLinksViewModel
            {
                TwitterUrl = _configuration["CommunityLinks:TwitterUrl"] ?? "https://x.com/OzikolCloud",
                TwitterHandle = _configuration["CommunityLinks:TwitterHandle"] ?? "@OzikolCloud",
                LinkedInUrl = _configuration["CommunityLinks:LinkedInUrl"] ?? "https://linkedin.com/company/ozikol",
                LinkedInName = _configuration["CommunityLinks:LinkedInName"] ?? "Ozikol Cloud",
                YouTubeUrl = _configuration["CommunityLinks:YouTubeUrl"] ?? "https://youtube.com/@ozikol",
                YouTubeName = _configuration["CommunityLinks:YouTubeName"] ?? "@ozikol",
                FacebookUrl = _configuration["CommunityLinks:FacebookUrl"] ?? "https://facebook.com/ozikol",
                FacebookName = _configuration["CommunityLinks:FacebookName"] ?? "Ozikol Cloud",
                InstagramUrl = _configuration["CommunityLinks:InstagramUrl"] ?? "https://instagram.com/ozikol",
                InstagramName = _configuration["CommunityLinks:InstagramName"] ?? "@ozikol",
                SnapchatUrl = _configuration["CommunityLinks:SnapchatUrl"] ?? "https://snapchat.com/add/ozikol",
                SnapchatName = _configuration["CommunityLinks:SnapchatName"] ?? "ozikol"
            };
        }
    }

    /// <summary>
    /// Input view model for voucher application submissions.
    /// </summary>
    public class VoucherApplicationInputModel
    {
        [Required(ErrorMessage = "Full Name is required.")]
        [Display(Name = "Full Name")]
        [MaxLength(150)]
        public string FullName { get; set; } = string.Empty;

        [Required(ErrorMessage = "Work Email is required.")]
        [EmailAddress(ErrorMessage = "Please enter a valid work email address.")]
        [Display(Name = "Work Email Address")]
        [MaxLength(200)]
        public string WorkEmail { get; set; } = string.Empty;

        [Display(Name = "Phone Number")]
        [MaxLength(50)]
        public string? PhoneNumber { get; set; }

        [Required(ErrorMessage = "Organization Name is required.")]
        [Display(Name = "Organization / Company Name")]
        [MaxLength(200)]
        public string OrganizationName { get; set; } = string.Empty;

        [Display(Name = "Preferred Workspace Subdomain (e.g. acme)")]
        [MaxLength(100)]
        [RegularExpression("^[a-z0-9\\-]*$", ErrorMessage = "Subdomain can only contain lowercase letters, numbers, and hyphens.")]
        public string? WorkspaceSlug { get; set; }

        [Display(Name = "X / Twitter Handle")]
        [MaxLength(100)]
        public string? TwitterHandle { get; set; }

        [Display(Name = "LinkedIn Profile URL")]
        [MaxLength(300)]
        public string? LinkedInProfile { get; set; }

        [Display(Name = "YouTube Handle / Username")]
        [MaxLength(150)]
        public string? YouTubeHandle { get; set; }

        [Display(Name = "Facebook Profile / Name")]
        [MaxLength(200)]
        public string? FacebookProfile { get; set; }

        [Display(Name = "Instagram Handle")]
        [MaxLength(100)]
        public string? InstagramHandle { get; set; }

        [Display(Name = "Snapchat Username")]
        [MaxLength(100)]
        public string? SnapchatHandle { get; set; }

        [Display(Name = "Subscribe to technical briefings & platform updates")]
        public bool IsNewsletterSubscribed { get; set; } = true;

        [Display(Name = "Additional Notes or Organization Goals")]
        [MaxLength(1000)]
        public string? Remarks { get; set; }
    }

    /// <summary>
    /// View model holding external community social links.
    /// </summary>
    public class CommunityLinksViewModel
    {
        public string TwitterUrl { get; set; } = string.Empty;
        public string TwitterHandle { get; set; } = string.Empty;
        public string LinkedInUrl { get; set; } = string.Empty;
        public string LinkedInName { get; set; } = string.Empty;
        public string YouTubeUrl { get; set; } = string.Empty;
        public string YouTubeName { get; set; } = string.Empty;
        public string FacebookUrl { get; set; } = string.Empty;
        public string FacebookName { get; set; } = string.Empty;
        public string InstagramUrl { get; set; } = string.Empty;
        public string InstagramName { get; set; } = string.Empty;
        public string SnapchatUrl { get; set; } = string.Empty;
        public string SnapchatName { get; set; } = string.Empty;
    }
}
