using System;
using System.ComponentModel.DataAnnotations;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Areas.Centralwks.Pages.Affiliates
{
    /// <summary>
    /// PageModel for onboarding and registering a new affiliate partner into the master catalog.
    /// Sets up unique promo referral codes, commission percentages, and payout settlement details.
    /// </summary>
    public class CreateModel : PageModel
    {
        private readonly MasterCatalogDbContext _dbContext;

        /// <summary>
        /// Initializes a new instance of the <see cref="CreateModel"/> class.
        /// </summary>
        /// <param name="dbContext">Master catalog database context.</param>
        public CreateModel(MasterCatalogDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        /// <summary>
        /// Form input model carrying new partner registration details.
        /// </summary>
        [BindProperty]
        public PartnerInputModel Input { get; set; } = new();

        /// <summary>
        /// Handles HTTP GET requests to prepare a fresh partner registration form.
        /// </summary>
        public IActionResult OnGet()
        {
            // Suggest default partner code format
            Input.PartnerCode = $"OZK-{Guid.NewGuid().ToString("N").Substring(0, 6).ToUpperInvariant()}";
            return Page();
        }

        /// <summary>
        /// Handles HTTP POST requests to validate and save the new affiliate partner.
        /// </summary>
        public async Task<IActionResult> OnPostAsync()
        {
            if (!ModelState.IsValid)
            {
                return Page();
            }

            var cleanCode = Input.PartnerCode.Trim().ToUpperInvariant();

            // Verify unique partner code
            var codeExists = await _dbContext.MasterAffiliatePartners
                .AnyAsync(p => p.PartnerCode.ToUpper() == cleanCode);

            if (codeExists)
            {
                ModelState.AddModelError("Input.PartnerCode", $"Partner referral code '{cleanCode}' is already registered.");
                return Page();
            }

            // Verify unique email
            var emailExists = await _dbContext.MasterAffiliatePartners
                .AnyAsync(p => p.Email.ToLower() == Input.Email.Trim().ToLower());

            if (emailExists)
            {
                ModelState.AddModelError("Input.Email", $"An affiliate partner with email '{Input.Email.Trim()}' already exists.");
                return Page();
            }

            var partner = new MasterAffiliatePartner
            {
                Id = Guid.NewGuid(),
                PartnerCode = cleanCode,
                FullName = Input.FullName.Trim(),
                Email = Input.Email.Trim().ToLowerInvariant(),
                PhoneNumber = Input.PhoneNumber?.Trim(),
                WebsiteOrChannel = Input.WebsiteOrChannel?.Trim(),
                CommissionRatePercentage = Input.CommissionRatePercentage,
                TotalEarned = 0m,
                PendingBalance = 0m,
                PaidBalance = 0m,
                Status = Input.Status,
                PayoutDetailsJson = Input.PayoutDetailsJson?.Trim(),
                CreatedUtc = DateTime.UtcNow,
                ApprovedUtc = Input.Status == "Active" ? DateTime.UtcNow : null
            };

            _dbContext.MasterAffiliatePartners.Add(partner);
            await _dbContext.SaveChangesAsync();

            TempData["StatusMessage"] = $"Partner '{partner.FullName}' registered successfully with code {partner.PartnerCode}.";
            return RedirectToPage("./Details", new { id = partner.Id });
        }

        /// <summary>
        /// Input model capturing partner registration parameters.
        /// </summary>
        public class PartnerInputModel
        {
            /// <summary>
            /// Unique promo referral code used during tenant checkout and registration.
            /// </summary>
            [Required(ErrorMessage = "Partner referral code is required.")]
            [StringLength(50, MinimumLength = 3, ErrorMessage = "Code must be between 3 and 50 characters.")]
            [Display(Name = "Referral / Promo Code")]
            public string PartnerCode { get; set; } = string.Empty;

            /// <summary>
            /// Legal full name or corporate organization name.
            /// </summary>
            [Required(ErrorMessage = "Full name is required.")]
            [MaxLength(150)]
            [Display(Name = "Partner Full Name")]
            public string FullName { get; set; } = string.Empty;

            /// <summary>
            /// Primary contact email address.
            /// </summary>
            [Required(ErrorMessage = "Email address is required.")]
            [EmailAddress(ErrorMessage = "Invalid email address format.")]
            [MaxLength(256)]
            [Display(Name = "Contact Email")]
            public string Email { get; set; } = string.Empty;

            /// <summary>
            /// Phone number with international dialing code.
            /// </summary>
            [MaxLength(50)]
            [Display(Name = "Phone Number (Optional)")]
            public string? PhoneNumber { get; set; }

            /// <summary>
            /// Promotion channel, audience blog, YouTube channel, or agency website.
            /// </summary>
            [MaxLength(255)]
            [Display(Name = "Website, Channel, or Social Reach")]
            public string? WebsiteOrChannel { get; set; }

            /// <summary>
            /// Agreed commission rate percentage on referred tenant subscriptions.
            /// </summary>
            [Required(ErrorMessage = "Commission rate is required.")]
            [Range(1.0, 100.0, ErrorMessage = "Commission percentage must be between 1% and 100%.")]
            [Display(Name = "Commission Rate (%)")]
            public decimal CommissionRatePercentage { get; set; } = 20.00m;

            /// <summary>
            /// Account status.
            /// </summary>
            [Required]
            [MaxLength(50)]
            [Display(Name = "Partner Status")]
            public string Status { get; set; } = "Active";

            /// <summary>
            /// Bank wire, PayPal email, or settlement destination instructions.
            /// </summary>
            [Display(Name = "Payout Settlement Instructions (Bank / PayPal / Crypto)")]
            public string? PayoutDetailsJson { get; set; }
        }
    }
}
