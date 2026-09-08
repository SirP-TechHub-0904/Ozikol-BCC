using System;
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
    /// PageModel displaying the full profile, commission ledger, referred tenant registrations,
    /// and payout settlement actions for a specific affiliate partner.
    /// </summary>
    public class DetailsModel : PageModel
    {
        private readonly MasterCatalogDbContext _dbContext;

        /// <summary>
        /// Initializes a new instance of the <see cref="DetailsModel"/> class.
        /// </summary>
        /// <param name="dbContext">Master catalog database context.</param>
        public DetailsModel(MasterCatalogDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        /// <summary>
        /// The loaded affiliate partner entity.
        /// </summary>
        public MasterAffiliatePartner Partner { get; set; } = default!;

        /// <summary>
        /// Aggregate total referral tenant signups.
        /// </summary>
        public int ReferralCount { get; set; }

        /// <summary>
        /// Aggregate total subscription gross volume referred by this partner.
        /// </summary>
        public decimal TotalReferredVolume { get; set; }

        /// <summary>
        /// Status message.
        /// </summary>
        [TempData]
        public string? StatusMessage { get; set; }

        /// <summary>
        /// Handles HTTP GET requests to load the partner profile and referred tenant history.
        /// </summary>
        /// <param name="id">Partner identifier.</param>
        public async Task<IActionResult> OnGetAsync(Guid id)
        {
            var partner = await _dbContext.MasterAffiliatePartners
                .Include(p => p.Referrals)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (partner == null)
            {
                return NotFound($"Affiliate partner with ID {id} was not found.");
            }

            Partner = partner;
            ReferralCount = partner.Referrals.Count;
            TotalReferredVolume = partner.Referrals.Sum(r => r.SubscriptionAmount);

            return Page();
        }

        /// <summary>
        /// Approves a pending commission record and increments the partner's pending payout balance.
        /// </summary>
        /// <param name="id">Partner identifier.</param>
        /// <param name="referralId">Referral record identifier.</param>
        public async Task<IActionResult> OnPostApproveCommissionAsync(Guid id, Guid referralId)
        {
            var referral = await _dbContext.MasterAffiliateReferrals
                .Include(r => r.AffiliatePartner)
                .FirstOrDefaultAsync(r => r.Id == referralId && r.AffiliatePartnerId == id);

            if (referral == null)
            {
                return NotFound();
            }

            if (referral.CommissionStatus == "Pending")
            {
                referral.CommissionStatus = "Approved";
                referral.AffiliatePartner.PendingBalance += referral.CommissionEarned;
                referral.AffiliatePartner.TotalEarned += referral.CommissionEarned;

                await _dbContext.SaveChangesAsync();
                StatusMessage = $"Commission of ${referral.CommissionEarned:N2} approved for {referral.ReferredOrganizationName}.";
            }

            return RedirectToPage(new { id });
        }

        /// <summary>
        /// Settles and pays out the partner's pending balance, moving it to paid balance and flagging referrals as Paid.
        /// </summary>
        /// <param name="id">Partner identifier.</param>
        public async Task<IActionResult> OnPostSettlePayoutAsync(Guid id)
        {
            var partner = await _dbContext.MasterAffiliatePartners
                .Include(p => p.Referrals)
                .FirstOrDefaultAsync(p => p.Id == id);

            if (partner == null)
            {
                return NotFound();
            }

            if (partner.PendingBalance <= 0)
            {
                StatusMessage = "No pending commission balance available to disburse.";
                return RedirectToPage(new { id });
            }

            var disbursedAmount = partner.PendingBalance;
            partner.PaidBalance += disbursedAmount;
            partner.PendingBalance = 0m;

            // Mark approved referrals as Paid
            var approvedReferrals = partner.Referrals.Where(r => r.CommissionStatus == "Approved").ToList();
            foreach (var r in approvedReferrals)
            {
                r.CommissionStatus = "Paid";
                r.PaidUtc = DateTime.UtcNow;
            }

            await _dbContext.SaveChangesAsync();

            StatusMessage = $"Payout of ${disbursedAmount:N2} successfully marked as settled and paid.";
            return RedirectToPage(new { id });
        }
    }
}
