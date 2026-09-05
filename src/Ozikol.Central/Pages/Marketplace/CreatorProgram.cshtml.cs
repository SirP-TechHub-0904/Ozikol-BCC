using System;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Localization;
using Ozikol.Central.Pages.Features;
using Ozikol.Central.Services;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Pages.Marketplace;

/// <summary>
/// Page model handling the Creator Partner Program explanation, application submission,
/// Google reCAPTCHA validation, and persistence into MasterCatalogDbContext.
/// </summary>
public class CreatorProgramModel : FeatureDetailPageModel
{
    private readonly MasterCatalogDbContext _dbContext;
    private readonly IRecaptchaService _recaptchaService;
    private readonly IStringLocalizer<SharedResource> _localizer;

    /// <summary>
    /// Initializes a new instance of the <see cref="CreatorProgramModel"/> class.
    /// </summary>
    /// <param name="dbContext">Central Master Catalog database context.</param>
    /// <param name="recaptchaService">Google reCAPTCHA verification provider.</param>
    /// <param name="localizer">Shared localization provider.</param>
    public CreatorProgramModel(
        MasterCatalogDbContext dbContext,
        IRecaptchaService recaptchaService,
        IStringLocalizer<SharedResource> localizer)
    {
        _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
        _recaptchaService = recaptchaService ?? throw new ArgumentNullException(nameof(recaptchaService));
        _localizer = localizer ?? throw new ArgumentNullException(nameof(localizer));
    }

    /// <summary>
    /// Gets or sets the creator application input model.
    /// </summary>
    [BindProperty]
    public CreatorApplicationInput Input { get; set; } = new();

    /// <summary>
    /// Gets a value indicating whether the application was successfully submitted.
    /// </summary>
    public bool IsSubmitted { get; set; }

    /// <summary>
    /// Gets the assigned unique creator reference tracking code.
    /// </summary>
    public string AssignedCreatorCode { get; set; } = string.Empty;

    /// <summary>
    /// Gets the public Google reCAPTCHA site key for widget rendering.
    /// </summary>
    public string RecaptchaSiteKey => _recaptchaService.SiteKey;

    /// <summary>
    /// Handles GET requests to render the creator partner program landing view.
    /// </summary>
    public override void OnGet()
    {
        base.OnGet();
    }

    /// <summary>
    /// Handles POST requests to validate and persist a new creator application with reCAPTCHA verification.
    /// </summary>
    /// <returns>Page result rendering confirmation screen or validation errors.</returns>
    public async Task<IActionResult> OnPostAsync()
    {
        base.OnGet();

        // 1. Verify Google reCAPTCHA token
        var recaptchaResponse = Request.Form["g-recaptcha-response"].ToString();
        var clientIp = HttpContext.Connection.RemoteIpAddress?.ToString();

        var isCaptchaValid = await _recaptchaService.ValidateTokenAsync(recaptchaResponse, clientIp);
        if (!isCaptchaValid)
        {
            ModelState.AddModelError(string.Empty, "Security verification failed. Please complete the reCAPTCHA challenge and try again.");
            return Page();
        }

        // 2. Validate Terms acceptance
        if (!Input.AgreeTerms)
        {
            ModelState.AddModelError("Input.AgreeTerms", _localizer["Creator_Err_TermsRequired"].Value ?? "You must accept the Creator Program Terms & Conditions to proceed.");
            return Page();
        }

        if (!ModelState.IsValid)
        {
            return Page();
        }

        // 3. Prevent duplicate active creator applications by email
        var normalizedEmail = Input.Email.Trim().ToLowerInvariant();
        var existing = await _dbContext.MasterCreatorApplications
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Email.ToLower() == normalizedEmail && p.Status == "UnderReview");

        if (existing != null)
        {
            ModelState.AddModelError("Input.Email", _localizer["Creator_Err_EmailExists"].Value ?? "An application with this email address is already under review.");
            return Page();
        }

        // 4. Generate unique Creator tracking code
        var candidateCode = $"CR-{Guid.NewGuid().ToString("N")[..6].ToUpperInvariant()}";
        while (await _dbContext.MasterCreatorApplications.AnyAsync(p => p.CreatorCode == candidateCode) ||
               await _dbContext.MasterAffiliatePartners.AnyAsync(p => p.PartnerCode == candidateCode))
        {
            candidateCode = $"CR-{Guid.NewGuid().ToString("N")[..6].ToUpperInvariant()}";
        }

        // 5. Persist dedicated creator application entity
        var application = new MasterCreatorApplication
        {
            Id = Guid.NewGuid(),
            CreatorCode = candidateCode,
            FullName = Input.FullName.Trim(),
            StudioOrBrandName = Input.StudioName?.Trim(),
            Email = normalizedEmail,
            PhoneNumber = Input.Phone?.Trim(),
            PortfolioUrl = Input.PortfolioUrl.Trim(),
            Specialization = Input.Specialization.Trim(),
            ProposalPitch = Input.ProposalPitch.Trim(),
            Status = "UnderReview",
            TermsAgreed = true,
            CreatedUtc = DateTime.UtcNow
        };

        _dbContext.MasterCreatorApplications.Add(application);

        // Also register in MasterAffiliatePartners track for cross-portal partner telemetry
        var partner = new MasterAffiliatePartner
        {
            Id = Guid.NewGuid(),
            PartnerCode = candidateCode,
            FullName = Input.FullName.Trim(),
            Email = normalizedEmail,
            PhoneNumber = Input.Phone?.Trim(),
            WebsiteOrChannel = Input.PortfolioUrl?.Trim(),
            Status = "UnderReview",
            CommissionRatePercentage = 0m,
            PayoutDetailsJson = JsonSerializer.Serialize(new
            {
                Track = "Creator",
                StudioOrBrand = Input.StudioName?.Trim() ?? string.Empty,
                Specialization = Input.Specialization.Trim()
            }),
            CreatedUtc = DateTime.UtcNow
        };

        _dbContext.MasterAffiliatePartners.Add(partner);
        await _dbContext.SaveChangesAsync();

        IsSubmitted = true;
        AssignedCreatorCode = candidateCode;
        return Page();
    }

    /// <summary>
    /// Input binding model for creator partner applications.
    /// </summary>
    public class CreatorApplicationInput
    {
        /// <summary>
        /// Gets or sets the applicant full name.
        /// </summary>
        [Required(ErrorMessage = "Full legal name is required.")]
        [MaxLength(100)]
        public string FullName { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the studio, agency, or brand name.
        /// </summary>
        [MaxLength(120)]
        public string? StudioName { get; set; }

        /// <summary>
        /// Gets or sets the business email address.
        /// </summary>
        [Required(ErrorMessage = "Business email address is required.")]
        [EmailAddress(ErrorMessage = "Please enter a valid email address.")]
        [MaxLength(150)]
        public string Email { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the optional phone number.
        /// </summary>
        [MaxLength(30)]
        public string? Phone { get; set; }

        /// <summary>
        /// Gets or sets the portfolio, GitHub, or Figma URL.
        /// </summary>
        [Required(ErrorMessage = "Portfolio or Figma profile URL is required.")]
        [Url(ErrorMessage = "Please enter a valid website or portfolio URL.")]
        [MaxLength(300)]
        public string PortfolioUrl { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the primary design specialization.
        /// </summary>
        [Required(ErrorMessage = "Please select your primary design specialization.")]
        [MaxLength(100)]
        public string Specialization { get; set; } = "Landing Suites & Heros";

        /// <summary>
        /// Gets or sets the template proposal pitch.
        /// </summary>
        [Required(ErrorMessage = "Please briefly outline your template proposal.")]
        [MaxLength(1500)]
        public string ProposalPitch { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets a value indicating whether the applicant agreed to the creator program terms.
        /// </summary>
        public bool AgreeTerms { get; set; }
    }
}
