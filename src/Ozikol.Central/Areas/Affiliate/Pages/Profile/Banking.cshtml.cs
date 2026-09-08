using System;
using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Areas.Affiliate.Pages.Profile
{
    /// <summary>
    /// Page model for configuring beneficiary bank accounts, international wire routing,
    /// and PayPal disbursement credentials in the Affiliate Portal.
    /// </summary>
    public class BankingModel : PageModel
    {
        private readonly MasterCatalogDbContext _context;
        private readonly UserManager<CentralUser> _userManager;
        private readonly ILogger<BankingModel> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="BankingModel"/> class.
        /// </summary>
        /// <param name="context">Master catalog database context.</param>
        /// <param name="userManager">Identity user manager for CentralUser.</param>
        /// <param name="logger">Structured logging service.</param>
        public BankingModel(
            MasterCatalogDbContext context,
            UserManager<CentralUser> userManager,
            ILogger<BankingModel> logger)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _userManager = userManager ?? throw new ArgumentNullException(nameof(userManager));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>
        /// Gets or sets the affiliate partner.
        /// </summary>
        public MasterAffiliatePartner Partner { get; set; } = null!;

        /// <summary>
        /// Gets or sets banking configuration input model.
        /// </summary>
        [BindProperty]
        public BankingInputModel Input { get; set; } = new BankingInputModel();

        /// <summary>
        /// Gets or sets status notification message.
        /// </summary>
        [TempData]
        public string? StatusMessage { get; set; }

        /// <summary>
        /// Form input model for partner payout banking instructions.
        /// </summary>
        public class BankingInputModel
        {
            /// <summary>Gets or sets default payout channel (BankWire or PayPal).</summary>
            [Required]
            public string PayoutChannel { get; set; } = "BankWire";

            /// <summary>Gets or sets legal beneficiary / account holder name.</summary>
            [MaxLength(150)]
            public string? BeneficiaryName { get; set; }

            /// <summary>Gets or sets bank institution name.</summary>
            [MaxLength(150)]
            public string? BankName { get; set; }

            /// <summary>Gets or sets IBAN or bank account number.</summary>
            [MaxLength(60)]
            public string? IbanOrAccountNumber { get; set; }

            /// <summary>Gets or sets SWIFT / BIC code.</summary>
            [MaxLength(20)]
            public string? SwiftBic { get; set; }

            /// <summary>Gets or sets bank country code.</summary>
            [MaxLength(60)]
            public string? BankCountry { get; set; } = "United States";

            /// <summary>Gets or sets PayPal account email.</summary>
            [EmailAddress]
            [MaxLength(150)]
            public string? PayPalEmail { get; set; }
        }

        /// <summary>
        /// Handles HTTP GET request to prefill payout banking details.
        /// </summary>
        public async Task<IActionResult> OnGetAsync()
        {
            var partner = await ResolvePartnerAsync();
            if (partner == null)
            {
                return RedirectToPage("/Dashboard/Index");
            }

            Partner = partner;

            if (!string.IsNullOrWhiteSpace(partner.PayoutDetailsJson))
            {
                try
                {
                    var saved = JsonSerializer.Deserialize<BankingInputModel>(partner.PayoutDetailsJson);
                    if (saved != null)
                    {
                        Input = saved;
                    }
                }
                catch (JsonException ex)
                {
                    _logger.LogWarning(ex, "Failed to deserialize payout details JSON for partner {PartnerCode}", partner.PartnerCode);
                }
            }

            return Page();
        }

        /// <summary>
        /// Handles HTTP POST request to store payout banking details securely.
        /// </summary>
        public async Task<IActionResult> OnPostAsync()
        {
            var partner = await ResolvePartnerAsync();
            if (partner == null)
            {
                return RedirectToPage("/Dashboard/Index");
            }

            Partner = partner;

            if (!ModelState.IsValid)
            {
                return Page();
            }

            var json = JsonSerializer.Serialize(Input, new JsonSerializerOptions { WriteIndented = true });
            partner.PayoutDetailsJson = json;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Partner {PartnerCode} updated payout banking details", partner.PartnerCode);
            StatusMessage = "Payout banking credentials saved successfully.";

            return RedirectToPage();
        }

        private async Task<MasterAffiliatePartner?> ResolvePartnerAsync()
        {
            var user = await _userManager.GetUserAsync(User);
            MasterAffiliatePartner? partner = null;

            if (user?.AffiliatePartnerId.HasValue == true)
            {
                partner = await _context.MasterAffiliatePartners.FindAsync(user.AffiliatePartnerId.Value);
            }

            if (partner == null && user?.Email != null)
            {
                partner = await _context.MasterAffiliatePartners.FirstOrDefaultAsync(p => p.Email == user.Email);
            }

            if (partner == null)
            {
                partner = await _context.MasterAffiliatePartners.OrderByDescending(p => p.CreatedUtc).FirstOrDefaultAsync();
            }

            return partner;
        }
    }
}
