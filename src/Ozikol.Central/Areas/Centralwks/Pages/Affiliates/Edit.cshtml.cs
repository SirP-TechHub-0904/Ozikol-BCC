using System;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Areas.Centralwks.Pages.Affiliates
{
    /// <summary>
    /// PageModel for modifying an existing affiliate partner's commission tier, promo code,
    /// account verification status, and settlement instructions.
    /// </summary>
    public class EditModel : PageModel
    {
        private readonly MasterCatalogDbContext _dbContext;

        /// <summary>
        /// Initializes a new instance of the <see cref="EditModel"/> class.
        /// </summary>
        /// <param name="dbContext">Master catalog database context.</param>
        public EditModel(MasterCatalogDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        /// <summary>
        /// Unique primary key identifier of the partner being edited.
        /// </summary>
        [FromRoute]
        public Guid Id { get; set; }

        /// <summary>
        /// Input model carrying partner modifications.
        /// </summary>
        [BindProperty]
        public PartnerEditInputModel Input { get; set; } = new();

        /// <summary>
        /// Handles HTTP GET requests to load partner information into the form.
        /// </summary>
        public async Task<IActionResult> OnGetAsync(Guid id)
        {
            var partner = await _dbContext.MasterAffiliatePartners.FindAsync(id);
            if (partner == null)
            {
                return NotFound($"Partner with ID {id} was not found.");
            }

            Id = partner.Id;
            Input = new PartnerEditInputModel
            {
                PartnerCode = partner.PartnerCode,
                FullName = partner.FullName,
                Email = partner.Email,
                PhoneNumber = partner.PhoneNumber,
                WebsiteOrChannel = partner.WebsiteOrChannel,
                CommissionRatePercentage = partner.CommissionRatePercentage,
                Status = partner.Status,
                PayoutDetailsJson = partner.PayoutDetailsJson
            };

            return Page();
        }

        /// <summary>
        /// Handles HTTP POST requests to validate and commit partner updates.
        /// </summary>
        public async Task<IActionResult> OnPostAsync(Guid id)
        {
            if (!ModelState.IsValid)
            {
                return Page();
            }

            var partner = await _dbContext.MasterAffiliatePartners.FindAsync(id);
            if (partner == null)
            {
                return NotFound();
            }

            var cleanCode = Input.PartnerCode.Trim().ToUpperInvariant();
            var cleanEmail = Input.Email.Trim().ToLowerInvariant();

            // Verify unique partner code
            var duplicateCode = await _dbContext.MasterAffiliatePartners
                .AnyAsync(p => p.Id != id && p.PartnerCode.ToUpper() == cleanCode);

            if (duplicateCode)
            {
                ModelState.AddModelError("Input.PartnerCode", $"Partner code '{cleanCode}' is already registered to another account.");
                return Page();
            }

            // Verify unique email
            var duplicateEmail = await _dbContext.MasterAffiliatePartners
                .AnyAsync(p => p.Id != id && p.Email.ToLower() == cleanEmail);

            if (duplicateEmail)
            {
                ModelState.AddModelError("Input.Email", $"Email '{cleanEmail}' is already registered to another partner.");
                return Page();
            }

            partner.PartnerCode = cleanCode;
            partner.FullName = Input.FullName.Trim();
            partner.Email = cleanEmail;
            partner.PhoneNumber = Input.PhoneNumber?.Trim();
            partner.WebsiteOrChannel = Input.WebsiteOrChannel?.Trim();
            partner.CommissionRatePercentage = Input.CommissionRatePercentage;
            partner.PayoutDetailsJson = Input.PayoutDetailsJson?.Trim();

            if (Input.Status == "Active" && partner.Status != "Active" && partner.ApprovedUtc == null)
            {
                partner.ApprovedUtc = DateTime.UtcNow;
            }
            partner.Status = Input.Status;

            await _dbContext.SaveChangesAsync();

            TempData["StatusMessage"] = $"Partner '{partner.FullName}' was updated successfully.";
            return RedirectToPage("./Details", new { id = partner.Id });
        }

        /// <summary>
        /// Input model carrying partner modification values.
        /// </summary>
        public class PartnerEditInputModel
        {
            /// <summary>
            /// Unique promo code.
            /// </summary>
            [Required(ErrorMessage = "Partner referral code is required.")]
            [StringLength(50, MinimumLength = 3)]
            [Display(Name = "Referral / Promo Code")]
            public string PartnerCode { get; set; } = string.Empty;

            /// <summary>
            /// Legal full name.
            /// </summary>
            [Required(ErrorMessage = "Full name is required.")]
            [MaxLength(150)]
            [Display(Name = "Partner Full Name")]
            public string FullName { get; set; } = string.Empty;

            /// <summary>
            /// Contact email address.
            /// </summary>
            [Required(ErrorMessage = "Email address is required.")]
            [EmailAddress]
            [MaxLength(256)]
            [Display(Name = "Contact Email")]
            public string Email { get; set; } = string.Empty;

            /// <summary>
            /// Phone number.
            /// </summary>
            [MaxLength(50)]
            [Display(Name = "Phone Number")]
            public string? PhoneNumber { get; set; }

            /// <summary>
            /// Promotional channel.
            /// </summary>
            [MaxLength(255)]
            [Display(Name = "Website or Channel")]
            public string? WebsiteOrChannel { get; set; }

            /// <summary>
            /// Commission rate percentage.
            /// </summary>
            [Required]
            [Range(1.0, 100.0)]
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
            /// Settlement instructions.
            /// </summary>
            [Display(Name = "Payout Settlement Instructions")]
            public string? PayoutDetailsJson { get; set; }
        }
    }
}
