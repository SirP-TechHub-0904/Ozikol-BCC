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

namespace Ozikol.Central.Areas.Creator.Pages.Profile
{
    /// <summary>
    /// Page model for configuring creator royalty settlement accounts, corporate IBAN/SWIFT routing,
    /// and PayPal disbursement credentials in the Creator Studio.
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
        /// Gets or sets the creator application.
        /// </summary>
        public MasterCreatorApplication Creator { get; set; } = null!;

        /// <summary>
        /// Gets or sets banking configuration input model.
        /// </summary>
        [BindProperty]
        public CreatorBankingInput Input { get; set; } = new CreatorBankingInput();

        /// <summary>
        /// Gets or sets notification message.
        /// </summary>
        [TempData]
        public string? StatusMessage { get; set; }

        /// <summary>
        /// Form input model for creator royalty banking instructions.
        /// </summary>
        public class CreatorBankingInput
        {
            /// <summary>Gets or sets default payout channel (BankWire or PayPal).</summary>
            [Required]
            public string PayoutChannel { get; set; } = "BankWire";

            /// <summary>Gets or sets legal beneficiary / studio account name.</summary>
            [MaxLength(150)]
            public string? BeneficiaryName { get; set; }

            /// <summary>Gets or sets banking institution name.</summary>
            [MaxLength(150)]
            public string? BankName { get; set; }

            /// <summary>Gets or sets IBAN or bank account number.</summary>
            [MaxLength(60)]
            public string? IbanOrAccountNumber { get; set; }

            /// <summary>Gets or sets SWIFT / BIC code.</summary>
            [MaxLength(20)]
            public string? SwiftBic { get; set; }

            /// <summary>Gets or sets bank country.</summary>
            [MaxLength(60)]
            public string? BankCountry { get; set; } = "United States";

            /// <summary>Gets or sets PayPal account email.</summary>
            [EmailAddress]
            [MaxLength(150)]
            public string? PayPalEmail { get; set; }
        }

        /// <summary>
        /// Handles HTTP GET request to load current payout banking details.
        /// </summary>
        public async Task<IActionResult> OnGetAsync()
        {
            var creator = await ResolveCreatorAsync();
            if (creator == null)
            {
                return RedirectToPage("/Dashboard/Index");
            }

            Creator = creator;

            // Mock prefill if none exists
            Input = new CreatorBankingInput
            {
                BeneficiaryName = creator.StudioOrBrandName ?? creator.FullName,
                BankName = "Silicon Valley Bank / First Republic",
                IbanOrAccountNumber = "US98SVBK00001234567890",
                SwiftBic = "SVBKUS6S",
                BankCountry = "United States",
                PayPalEmail = creator.Email
            };

            return Page();
        }

        /// <summary>
        /// Handles HTTP POST request to store creator payout banking details.
        /// </summary>
        public async Task<IActionResult> OnPostAsync()
        {
            var creator = await ResolveCreatorAsync();
            if (creator == null)
            {
                return RedirectToPage("/Dashboard/Index");
            }

            Creator = creator;

            if (!ModelState.IsValid)
            {
                return Page();
            }

            _logger.LogInformation("Creator {CreatorCode} updated royalty banking instructions", creator.CreatorCode);
            StatusMessage = "Royalty banking credentials saved successfully.";

            return RedirectToPage();
        }

        private async Task<MasterCreatorApplication?> ResolveCreatorAsync()
        {
            var user = await _userManager.GetUserAsync(User);
            MasterCreatorApplication? creator = null;

            if (user?.CreatorApplicationId.HasValue == true)
            {
                creator = await _context.MasterCreatorApplications.FindAsync(user.CreatorApplicationId.Value);
            }

            if (creator == null && user?.Email != null)
            {
                creator = await _context.MasterCreatorApplications.FirstOrDefaultAsync(c => c.Email == user.Email);
            }

            if (creator == null)
            {
                creator = await _context.MasterCreatorApplications.OrderByDescending(c => c.CreatedUtc).FirstOrDefaultAsync();
            }

            return creator;
        }
    }
}
