using System;
using System.ComponentModel.DataAnnotations;
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
    /// Page model for managing partner account details, contact info, and promotional channel URLs in the Affiliate Portal.
    /// </summary>
    public class IndexModel : PageModel
    {
        private readonly MasterCatalogDbContext _context;
        private readonly UserManager<CentralUser> _userManager;
        private readonly ILogger<IndexModel> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="IndexModel"/> class.
        /// </summary>
        /// <param name="context">Master catalog database context.</param>
        /// <param name="userManager">Identity user manager for CentralUser.</param>
        /// <param name="logger">Structured logging service.</param>
        public IndexModel(
            MasterCatalogDbContext context,
            UserManager<CentralUser> userManager,
            ILogger<IndexModel> logger)
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
        /// Gets or sets partner profile edit input model.
        /// </summary>
        [BindProperty]
        public ProfileInputModel Input { get; set; } = new ProfileInputModel();

        /// <summary>
        /// Gets or sets notification message.
        /// </summary>
        [TempData]
        public string? StatusMessage { get; set; }

        /// <summary>
        /// Form input model for partner profile modifications.
        /// </summary>
        public class ProfileInputModel
        {
            /// <summary>Gets or sets partner full contact name.</summary>
            [Required(ErrorMessage = "Full name is required.")]
            [MaxLength(150)]
            public string FullName { get; set; } = string.Empty;

            /// <summary>Gets or sets contact phone number.</summary>
            [MaxLength(50)]
            public string? PhoneNumber { get; set; }

            /// <summary>Gets or sets primary marketing website, channel, or newsletter URL.</summary>
            [MaxLength(255)]
            [Url(ErrorMessage = "Please provide a valid URL (https://...).")]
            public string? WebsiteOrChannel { get; set; }
        }

        /// <summary>
        /// Handles HTTP GET request to load partner profile.
        /// </summary>
        public async Task<IActionResult> OnGetAsync()
        {
            var partner = await ResolvePartnerAsync();
            if (partner == null)
            {
                return RedirectToPage("/Dashboard/Index");
            }

            Partner = partner;
            Input = new ProfileInputModel
            {
                FullName = partner.FullName,
                PhoneNumber = partner.PhoneNumber,
                WebsiteOrChannel = partner.WebsiteOrChannel
            };

            return Page();
        }

        /// <summary>
        /// Handles HTTP POST request to save profile edits.
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

            partner.FullName = Input.FullName.Trim();
            partner.PhoneNumber = Input.PhoneNumber?.Trim();
            partner.WebsiteOrChannel = Input.WebsiteOrChannel?.Trim();

            await _context.SaveChangesAsync();

            _logger.LogInformation("Partner {PartnerCode} updated their profile info", partner.PartnerCode);
            StatusMessage = "Partner profile updated successfully.";

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
