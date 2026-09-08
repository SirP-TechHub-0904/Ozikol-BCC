using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Areas.Admin.Pages.Affiliates
{
    /// <summary>
    /// PageModel managing partner payout disbursement queues, batch settlement of commission balances,
    /// and accounting ledger synchronization.
    /// </summary>
    public class PayoutsModel : PageModel
    {
        private readonly MasterCatalogDbContext _dbContext;

        /// <summary>
        /// Initializes a new instance of the <see cref="PayoutsModel"/> class.
        /// </summary>
        /// <param name="dbContext">Master catalog database context.</param>
        public PayoutsModel(MasterCatalogDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        /// <summary>
        /// Partners awaiting commission disbursements.
        /// </summary>
        public List<MasterAffiliatePartner> EligiblePartners { get; set; } = new();

        /// <summary>
        /// Total amount pending disbursement across all eligible partners.
        /// </summary>
        public decimal TotalPendingBalance { get; set; }

        /// <summary>
        /// Total historical paid disbursements.
        /// </summary>
        public decimal TotalHistoricalPaid { get; set; }

        /// <summary>
        /// Number of partners eligible for payout.
        /// </summary>
        public int EligiblePartnerCount { get; set; }

        /// <summary>
        /// Operation feedback message.
        /// </summary>
        [TempData]
        public string? StatusMessage { get; set; }

        /// <summary>
        /// Handles HTTP GET requests to load partners with pending commission balances.
        /// </summary>
        public async Task OnGetAsync()
        {
            TotalHistoricalPaid = await _dbContext.MasterAffiliatePartners
                .SumAsync(p => (decimal?)p.PaidBalance) ?? 0m;

            EligiblePartners = await _dbContext.MasterAffiliatePartners
                .Where(p => p.PendingBalance > 0 && p.Status == "Active")
                .OrderByDescending(p => p.PendingBalance)
                .ToListAsync();

            EligiblePartnerCount = EligiblePartners.Count;
            TotalPendingBalance = EligiblePartners.Sum(p => p.PendingBalance);
        }

        /// <summary>
        /// Settles payout for a single partner, zeroing pending balance and marking associated approved referrals as Paid.
        /// </summary>
        /// <param name="partnerId">Partner unique identifier.</param>
        public async Task<IActionResult> OnPostDisburseIndividualAsync(Guid partnerId)
        {
            var partner = await _dbContext.MasterAffiliatePartners
                .Include(p => p.Referrals)
                .FirstOrDefaultAsync(p => p.Id == partnerId);

            if (partner == null || partner.PendingBalance <= 0)
            {
                return NotFound();
            }

            var amount = partner.PendingBalance;
            partner.PaidBalance += amount;
            partner.PendingBalance = 0m;

            var approvedReferrals = partner.Referrals.Where(r => r.CommissionStatus == "Approved").ToList();
            foreach (var r in approvedReferrals)
            {
                r.CommissionStatus = "Paid";
                r.PaidUtc = DateTime.UtcNow;
            }

            await _dbContext.SaveChangesAsync();

            StatusMessage = $"Disbursed ${amount:N2} to partner '{partner.FullName}' ({partner.PartnerCode}).";
            return RedirectToPage();
        }

        /// <summary>
        /// Executes batch payout for all active partners with pending balances.
        /// </summary>
        public async Task<IActionResult> OnPostDisburseAllAsync()
        {
            var partners = await _dbContext.MasterAffiliatePartners
                .Include(p => p.Referrals)
                .Where(p => p.PendingBalance > 0 && p.Status == "Active")
                .ToListAsync();

            if (!partners.Any())
            {
                StatusMessage = "No active partners with pending balances found.";
                return RedirectToPage();
            }

            var grandTotal = 0m;
            foreach (var p in partners)
            {
                grandTotal += p.PendingBalance;
                p.PaidBalance += p.PendingBalance;
                p.PendingBalance = 0m;

                foreach (var r in p.Referrals.Where(refItem => refItem.CommissionStatus == "Approved"))
                {
                    r.CommissionStatus = "Paid";
                    r.PaidUtc = DateTime.UtcNow;
                }
            }

            await _dbContext.SaveChangesAsync();

            StatusMessage = $"Batch payout completed: ${grandTotal:N2} disbursed across {partners.Count} partners.";
            return RedirectToPage();
        }
    }
}
