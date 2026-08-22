using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;

namespace Ozikol.Central.Pages;

public class AffiliateModel : PageModel
{
    private readonly MasterCatalogDbContext _masterCatalogDbContext;
    private readonly ILogger<AffiliateModel> _logger;

    [BindProperty]
    public InputModel Input { get; set; } = new();

    public string? SuccessMessage { get; set; }
    public string? ErrorMessage { get; set; }
    public string? GeneratedPartnerCode { get; set; }

    public class InputModel
    {
        [Required(ErrorMessage = "Full Name is required")]
        [StringLength(100, MinimumLength = 2)]
        public string FullName { get; set; } = string.Empty;

        [Required(ErrorMessage = "Email Address is required")]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required(ErrorMessage = "Desired Partner Code is required")]
        [RegularExpression(@"^[a-zA-Z0-9\-]+$", ErrorMessage = "Partner code must only contain letters, numbers, and hyphens.")]
        [StringLength(30, MinimumLength = 3, ErrorMessage = "Partner code must be between 3 and 30 characters")]
        public string DesiredPartnerCode { get; set; } = string.Empty;

        [Phone]
        public string? PhoneNumber { get; set; }

        public string? WebsiteOrChannel { get; set; }

        public string? PayoutDetails { get; set; }
    }

    public AffiliateModel(MasterCatalogDbContext masterCatalogDbContext, ILogger<AffiliateModel> logger)
    {
        _masterCatalogDbContext = masterCatalogDbContext;
        _logger = logger;
    }

    public void OnGet()
    {
    }

    public async Task<IActionResult> OnPostAsync()
    {
        if (!ModelState.IsValid)
        {
            return Page();
        }

        try
        {
            var cleanEmail = Input.Email.Trim().ToLowerInvariant();
            var cleanPartnerCode = Input.DesiredPartnerCode.Trim().ToUpperInvariant().Replace(" ", "-");

            // 1. Check if Partner Code is already taken
            bool codeTaken = await _masterCatalogDbContext.MasterAffiliatePartners
                .AnyAsync(p => p.PartnerCode == cleanPartnerCode);

            if (codeTaken)
            {
                ErrorMessage = $"The partner code '{cleanPartnerCode}' is already taken. Please choose a different code.";
                return Page();
            }

            // 2. Check if Email is already registered
            var existingByEmail = await _masterCatalogDbContext.MasterAffiliatePartners
                .FirstOrDefaultAsync(p => p.Email == cleanEmail);

            if (existingByEmail != null)
            {
                SuccessMessage = $"Welcome back! Your registered affiliate partner code is: {existingByEmail.PartnerCode}";
                GeneratedPartnerCode = existingByEmail.PartnerCode;
                return Page();
            }

            var partner = new MasterAffiliatePartner
            {
                PartnerCode = cleanPartnerCode,
                FullName = Input.FullName.Trim(),
                Email = cleanEmail,
                PhoneNumber = Input.PhoneNumber,
                WebsiteOrChannel = Input.WebsiteOrChannel,
                CommissionRatePercentage = 20.0m,
                Status = "Active",
                CreatedUtc = DateTime.UtcNow,
                ApprovedUtc = DateTime.UtcNow,
                PayoutDetailsJson = Input.PayoutDetails
            };

            _masterCatalogDbContext.MasterAffiliatePartners.Add(partner);
            await _masterCatalogDbContext.SaveChangesAsync();

            _logger.LogInformation("New Affiliate Partner registered: {Email} with custom code {PartnerCode}", cleanEmail, cleanPartnerCode);

            SuccessMessage = "Congratulations! Your affiliate partner account has been activated.";
            GeneratedPartnerCode = cleanPartnerCode;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to register affiliate partner");
            ErrorMessage = $"Registration failed: {ex.Message}";
        }

        return Page();
    }
}
