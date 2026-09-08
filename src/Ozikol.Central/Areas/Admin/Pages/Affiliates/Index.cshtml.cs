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
    /// PageModel displaying registered affiliate partners, commission structures,
    /// wallet balances, and overall referral program performance metrics.
    /// </summary>
    public class IndexModel : PageModel
    {
        private readonly MasterCatalogDbContext _dbContext;

        /// <summary>
        /// Initializes a new instance of the <see cref="IndexModel"/> class.
        /// </summary>
        /// <param name="dbContext">Master catalog database context.</param>
        public IndexModel(MasterCatalogDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        /// <summary>
        /// Search keyword filter for partner code, name, or email.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? Search { get; set; }

        /// <summary>
        /// Status filter (Active, UnderReview, Suspended, All).
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? Status { get; set; }

        /// <summary>
        /// 1-based page number.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public int PageNumber { get; set; } = 1;

        /// <summary>
        /// Retrieved list of partners with referral counts.
        /// </summary>
        public List<MasterAffiliatePartner> Partners { get; set; } = new();

        /// <summary>
        /// Total partners count.
        /// </summary>
        public int TotalCount { get; set; }

        /// <summary>
        /// Active partners count.
        /// </summary>
        public int ActiveCount { get; set; }

        /// <summary>
        /// Total commission earned across all partners.
        /// </summary>
        public decimal TotalGrossCommissions { get; set; }

        /// <summary>
        /// Total pending payout balance waiting to be disbursed.
        /// </summary>
        public decimal TotalPendingBalance { get; set; }

        /// <summary>
        /// Total settled and paid commissions.
        /// </summary>
        public decimal TotalPaidOut { get; set; }

        /// <summary>
        /// Total pagination pages.
        /// </summary>
        public int TotalPages { get; set; }

        /// <summary>
        /// Page size for pagination.
        /// </summary>
        public const int PageSize = 15;

        /// <summary>
        /// Feedback status message.
        /// </summary>
        [TempData]
        public string? StatusMessage { get; set; }

        /// <summary>
        /// Handles HTTP GET requests to query and aggregate partner accounts.
        /// </summary>
        public async Task OnGetAsync()
        {
            var baseQuery = _dbContext.MasterAffiliatePartners.AsNoTracking();

            TotalCount = await baseQuery.CountAsync();
            ActiveCount = await baseQuery.CountAsync(p => p.Status == "Active");
            TotalGrossCommissions = await baseQuery.SumAsync(p => (decimal?)p.TotalEarned) ?? 0m;
            TotalPendingBalance = await baseQuery.SumAsync(p => (decimal?)p.PendingBalance) ?? 0m;
            TotalPaidOut = await baseQuery.SumAsync(p => (decimal?)p.PaidBalance) ?? 0m;

            var query = _dbContext.MasterAffiliatePartners
                .Include(p => p.Referrals)
                .AsNoTracking()
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(Search))
            {
                var term = Search.Trim().ToLower();
                query = query.Where(p =>
                    p.PartnerCode.ToLower().Contains(term) ||
                    p.FullName.ToLower().Contains(term) ||
                    p.Email.ToLower().Contains(term) ||
                    (p.WebsiteOrChannel != null && p.WebsiteOrChannel.ToLower().Contains(term)));
            }

            if (!string.IsNullOrWhiteSpace(Status))
            {
                query = query.Where(p => p.Status.ToLower() == Status.ToLower());
            }

            TotalPages = (int)Math.Ceiling(await query.CountAsync() / (double)PageSize);
            if (PageNumber < 1) PageNumber = 1;

            Partners = await query
                .OrderByDescending(p => p.TotalEarned)
                .ThenBy(p => p.FullName)
                .Skip((PageNumber - 1) * PageSize)
                .Take(PageSize)
                .ToListAsync();
        }

        /// <summary>
        /// Toggles partner status between Active and Suspended.
        /// </summary>
        /// <param name="id">Partner unique identifier.</param>
        public async Task<IActionResult> OnPostToggleStatusAsync(Guid id)
        {
            var partner = await _dbContext.MasterAffiliatePartners.FindAsync(id);
            if (partner == null)
            {
                return NotFound();
            }

            partner.Status = partner.Status == "Active" ? "Suspended" : "Active";
            await _dbContext.SaveChangesAsync();

            StatusMessage = $"Partner '{partner.FullName}' ({partner.PartnerCode}) status changed to {partner.Status}.";
            return RedirectToPage();
        }
    }
}
