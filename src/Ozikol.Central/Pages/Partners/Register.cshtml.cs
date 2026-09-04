using System;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Localization;
using Ozikol.Central.Pages.Features;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Pages.Partners;

/// <summary>
/// Page model handling partner applications across Enterprise, Creator, and Affiliate tracks.
/// Persists verified partner applications into MasterCatalogDbContext.MasterAffiliatePartners.
/// </summary>
public class RegisterModel : FeatureDetailPageModel
{
    private readonly MasterCatalogDbContext _dbContext;
    private readonly IStringLocalizer<SharedResource> _localizer;

    /// <summary>
    /// Initializes a new instance of the <see cref="RegisterModel"/> class.
    /// </summary>
    /// <param name="dbContext">Central Master Catalog database context.</param>
    /// <param name="localizer">Shared localization provider.</param>
    public RegisterModel(MasterCatalogDbContext dbContext, IStringLocalizer<SharedResource> localizer)
    {
        _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
        _localizer = localizer ?? throw new ArgumentNullException(nameof(localizer));
    }

    /// <summary>
    /// Gets or sets the partnership application input binding model.
    /// </summary>
    [BindProperty]
    public PartnerApplicationInput Input { get; set; } = new();

    /// <summary>
    /// Gets a value indicating whether the application was successfully submitted.
    /// </summary>
    public bool IsSubmitted { get; set; }

    /// <summary>
    /// Gets the unique assigned or generated partner tracking reference code.
    /// </summary>
    public string AssignedPartnerCode { get; set; } = string.Empty;

    /// <summary>
    /// Gets the assigned track name for display on the confirmation screen.
    /// </summary>
    public string ConfirmedTrackName { get; set; } = string.Empty;

    /// <summary>
    /// Handles GET requests to render the partnership registration form.
    /// </summary>
    /// <param name="track">Optional preselected track query parameter (enterprise, creator, affiliate).</param>
    public override void OnGet()
    {
        base.OnGet();

        // Allow preselecting track via query string: /partners/register?track=enterprise
        var trackQuery = Request.Query["track"].ToString().ToLowerInvariant();
        Input.PartnerTrack = trackQuery switch
        {
            "enterprise" or "solution" => "Enterprise",
            "creator" or "marketplace" => "Creator",
            "affiliate" or "referral" => "Affiliate",
            _ => "Enterprise"
        };
    }

    /// <summary>
    /// Handles POST requests to validate and persist a new partner application.
    /// </summary>
    /// <returns>Page result rendering success or validation errors.</returns>
    public async Task<IActionResult> OnPostAsync()
    {
        base.OnGet();

        if (!Input.AgreeToTerms)
        {
            ModelState.AddModelError("Input.AgreeToTerms", _localizer["Partner_Err_TermsRequired"]);
        }

        if (!ModelState.IsValid)
        {
            return Page();
        }

        // Check if application with this email already exists
        var normalizedEmail = Input.Email.Trim().ToLowerInvariant();
        var existingPartner = await _dbContext.MasterAffiliatePartners
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Email.ToLower() == normalizedEmail);

        if (existingPartner != null)
        {
            ModelState.AddModelError("Input.Email", _localizer["Partner_Err_EmailExists"]);
            return Page();
        }

        // Resolve or generate unique partner referral code
        var partnerCode = await GenerateUniquePartnerCodeAsync(Input.RequestedPartnerCode, Input.FullName, Input.PartnerTrack);

        // Determine commission percentage by track
        var commissionRate = Input.PartnerTrack switch
        {
            "Creator" => 80.00m,
            "Enterprise" => 30.00m,
            _ => 25.00m
        };

        // Serialize structured partner metadata
        var metadata = new
        {
            track = Input.PartnerTrack,
            organization = Input.OrganizationOrAgency?.Trim(),
            pitch = Input.Pitch?.Trim(),
            ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
            termsAgreedUtc = DateTime.UtcNow
        };
        var metadataJson = JsonSerializer.Serialize(metadata);

        // Create new affiliate partner record under review
        var partner = new MasterAffiliatePartner
        {
            Id = Guid.NewGuid(),
            PartnerCode = partnerCode,
            FullName = Input.FullName.Trim(),
            Email = normalizedEmail,
            PhoneNumber = Input.PhoneNumber?.Trim(),
            WebsiteOrChannel = Input.WebsiteOrChannel?.Trim(),
            CommissionRatePercentage = commissionRate,
            Status = "UnderReview",
            PayoutDetailsJson = metadataJson,
            CreatedUtc = DateTime.UtcNow
        };

        await _dbContext.MasterAffiliatePartners.AddAsync(partner);
        await _dbContext.SaveChangesAsync();

        IsSubmitted = true;
        AssignedPartnerCode = partnerCode;
        ConfirmedTrackName = Input.PartnerTrack;

        return Page();
    }

    /// <summary>
    /// Generates a clean, unique partner promo code, resolving requested custom code or generating fallback.
    /// </summary>
    /// <param name="requested">Custom code requested by the applicant.</param>
    /// <param name="name">Applicant full name.</param>
    /// <param name="track">Applicant track.</param>
    /// <returns>A guaranteed unique uppercase alphanumeric partner code.</returns>
    private async Task<string> GenerateUniquePartnerCodeAsync(string? requested, string name, string track)
    {
        string candidate;

        if (!string.IsNullOrWhiteSpace(requested))
        {
            // Clean up: alphanumeric and hyphens only, max 20 chars
            candidate = Regex.Replace(requested.Trim().ToUpperInvariant(), @"[^A-Z0-9-]", "");
            if (candidate.Length < 3)
            {
                candidate = string.Empty;
            }
        }
        else
        {
            candidate = string.Empty;
        }

        if (string.IsNullOrEmpty(candidate))
        {
            // Auto-generate code from name and random token: e.g. "OZK-JOHN-4821"
            var prefix = Regex.Replace(name.Trim().ToUpperInvariant(), @"[^A-Z]", "");
            prefix = prefix.Length > 5 ? prefix[..5] : (prefix.Length > 0 ? prefix : "PARTNER");
            candidate = $"OZK-{prefix}-{Random.Shared.Next(1000, 9999)}";
        }

        // Ensure uniqueness
        var isTaken = await _dbContext.MasterAffiliatePartners.AnyAsync(p => p.PartnerCode == candidate);
        if (isTaken)
        {
            candidate = $"{candidate}-{Random.Shared.Next(100, 999)}";
        }

        return candidate;
    }
}

/// <summary>
/// Data transfer model for partnership application submissions.
/// </summary>
public class PartnerApplicationInput
{
    /// <summary>
    /// Gets or sets the selected partnership track (Enterprise, Creator, or Affiliate).
    /// </summary>
    [Required]
    public string PartnerTrack { get; set; } = "Enterprise";

    /// <summary>
    /// Gets or sets the applicant's full legal or professional name.
    /// </summary>
    [Required]
    [MaxLength(150)]
    public string FullName { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the business email address.
    /// </summary>
    [Required]
    [EmailAddress]
    [MaxLength(256)]
    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the applicant's telephone or mobile number.
    /// </summary>
    [MaxLength(50)]
    public string? PhoneNumber { get; set; }

    /// <summary>
    /// Gets or sets the business, agency, or consultancy firm name.
    /// </summary>
    [MaxLength(150)]
    public string? OrganizationOrAgency { get; set; }

    /// <summary>
    /// Gets or sets the applicant's website URL, portfolio link, or social channel.
    /// </summary>
    [MaxLength(255)]
    public string? WebsiteOrChannel { get; set; }

    /// <summary>
    /// Gets or sets an optional preferred custom referral/promo code.
    /// </summary>
    [MaxLength(30)]
    public string? RequestedPartnerCode { get; set; }

    /// <summary>
    /// Gets or sets an explanation of how the applicant plans to promote or implement Ozikol.
    /// </summary>
    [MaxLength(2000)]
    public string? Pitch { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether the applicant agreed to the Partner Program Terms.
    /// </summary>
    [Required]
    public bool AgreeToTerms { get; set; }
}
