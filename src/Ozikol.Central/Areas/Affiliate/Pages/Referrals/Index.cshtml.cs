using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Areas.Affiliate.Pages.Referrals
{
    /// <summary>
    /// Page model for inspecting referred tenant accounts, subscription amounts,
    /// conversion dates, and commission approval statuses.
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
        /// Gets or sets referred tenant signups.
        /// </summary>
        public IList<MasterAffiliateReferral> Referrals { get; set; } = new List<MasterAffiliateReferral>();

        /// <summary>
        /// Gets or sets total commission earned across all referrals.
        /// </summary>
        public decimal TotalCommissionEarned { get; set; }

        /// <summary>
        /// Gets or sets approved commission balance.
        /// </summary>
        public decimal ApprovedCommission { get; set; }

        /// <summary>
        /// Gets or sets pending commission balance.
        /// </summary>
        public decimal PendingCommission { get; set; }

        /// <summary>
        /// Gets or sets search query.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? Search { get; set; }

        /// <summary>
        /// Gets or sets status filter (All, Pending, Approved, Paid).
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? StatusFilter { get; set; }

        /// <summary>
        /// Handles HTTP GET request to list partner referrals.
        /// </summary>
        public async Task<IActionResult> OnGetAsync()
        {
            var user = await _userManager.GetUserAsync(User);
            MasterAffiliatePartner? partner = null;

            if (user?.AffiliatePartnerId.HasValue == true)
            {
                partner = await _context.MasterAffiliatePartners
                    .FirstOrDefaultAsync(p => p.Id == user.AffiliatePartnerId.Value);
            }

            if (partner == null && user?.Email != null)
            {
                partner = await _context.MasterAffiliatePartners
                    .FirstOrDefaultAsync(p => p.Email == user.Email);
            }

            if (partner == null)
            {
                partner = await _context.MasterAffiliatePartners
                    .OrderByDescending(p => p.CreatedUtc)
                    .FirstOrDefaultAsync();
            }

            if (partner == null)
            {
                return RedirectToPage("/Dashboard/Index");
            }

            Partner = partner;

            var query = _context.MasterAffiliateReferrals
                .Where(r => r.AffiliatePartnerId == partner.Id)
                .AsNoTracking()
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(Search))
            {
                var term = Search.Trim().ToLowerInvariant();
                query = query.Where(r => r.ReferredOrganizationName.ToLower().Contains(term)
                                      || r.ReferredTenantKey.ToLower().Contains(term));
            }

            if (!string.IsNullOrWhiteSpace(StatusFilter) && StatusFilter != "All")
            {
                query = query.Where(r => r.CommissionStatus == StatusFilter);
            }

            Referrals = await query
                .OrderByDescending(r => r.CreatedUtc)
                .ToListAsync();

            TotalCommissionEarned = Referrals.Sum(r => r.CommissionEarned);
            ApprovedCommission = Referrals.Where(r => r.CommissionStatus == "Approved").Sum(r => r.CommissionEarned);
            PendingCommission = Referrals.Where(r => r.CommissionStatus == "Pending").Sum(r => r.CommissionEarned);

            return Page();
        }
    }
}
