using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Areas.Affiliate.Pages.Assets
{
    /// <summary>
    /// Page model for the Partner Promotional Assets &amp; Marketing Kit repository in the Affiliate Portal,
    /// generating embeddable HTML banners and branded graphics injected with the partner's tracking code.
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
        /// Gets or sets the affiliate partner code.
        /// </summary>
        public string PartnerCode { get; set; } = "PARTNER";

        /// <summary>
        /// Gets or sets platform base hostname.
        /// </summary>
        public string BaseHost { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the resolved partner.
        /// </summary>
        public MasterAffiliatePartner Partner { get; set; } = null!;

        /// <summary>
        /// Handles HTTP GET request to load marketing media kit.
        /// </summary>
        public async Task<IActionResult> OnGetAsync()
        {
            BaseHost = $"{Request.Scheme}://{Request.Host}";
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

            if (partner == null)
            {
                return RedirectToPage("/Dashboard/Index");
            }

            Partner = partner;
            PartnerCode = partner.PartnerCode;

            return Page();
        }
    }
}
