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

namespace Ozikol.Central.Areas.Affiliate.Pages.Earnings
{
    /// <summary>
    /// Page model for the Affiliate Earnings &amp; Payouts Ledger, providing transparent accounting
    /// of earned commissions, disbursement records, and wallet balances.
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
        /// Gets or sets paid commission payouts history.
        /// </summary>
        public IList<MasterAffiliateReferral> PaidDisbursements { get; set; } = new List<MasterAffiliateReferral>();

        /// <summary>
        /// Gets or sets pending commission referrals.
        /// </summary>
        public IList<MasterAffiliateReferral> PendingReferrals { get; set; } = new List<MasterAffiliateReferral>();

        /// <summary>
        /// Gets or sets status notification message.
        /// </summary>
        [TempData]
        public string? StatusMessage { get; set; }

        /// <summary>
        /// Handles HTTP GET request to load earnings ledger and payout records.
        /// </summary>
        public async Task<IActionResult> OnGetAsync()
        {
            var user = await _userManager.GetUserAsync(User);
            MasterAffiliatePartner? partner = null;

            if (user?.AffiliatePartnerId.HasValue == true)
            {
                partner = await _context.MasterAffiliatePartners
                    .Include(p => p.Referrals)
                    .FirstOrDefaultAsync(p => p.Id == user.AffiliatePartnerId.Value);
            }

            if (partner == null && user?.Email != null)
            {
                partner = await _context.MasterAffiliatePartners
                    .Include(p => p.Referrals)
                    .FirstOrDefaultAsync(p => p.Email == user.Email);
            }

            if (partner == null)
            {
                partner = await _context.MasterAffiliatePartners
                    .Include(p => p.Referrals)
                    .OrderByDescending(p => p.CreatedUtc)
                    .FirstOrDefaultAsync();
            }

            if (partner == null)
            {
                return RedirectToPage("/Dashboard/Index");
            }

            Partner = partner;

            PaidDisbursements = partner.Referrals
                .Where(r => r.CommissionStatus == "Paid")
                .OrderByDescending(r => r.PaidUtc ?? r.CreatedUtc)
                .ToList();

            PendingReferrals = partner.Referrals
                .Where(r => r.CommissionStatus == "Pending" || r.CommissionStatus == "Approved")
                .OrderByDescending(r => r.CreatedUtc)
                .ToList();

            return Page();
        }
    }
}
