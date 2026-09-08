using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Areas.Admin.Pages.Billing
{
    /// <summary>
    /// PageModel displaying the central financial overview, invoices, and transaction ledger across all tenants.
    /// Provides metrics on gross volume, settled payments, pending balances, and refunds.
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
        /// Invoice number or external reference search filter.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? Search { get; set; }

        /// <summary>
        /// Transaction status filter (Completed, Pending, Refunded, Failed, All).
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? Status { get; set; }

        /// <summary>
        /// Payment gateway/provider filter.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? Provider { get; set; }

        /// <summary>
        /// Optional tenant filter.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public int? TenantId { get; set; }

        /// <summary>
        /// 1-based page index.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public int PageNumber { get; set; } = 1;

        public int TotalCount { get; set; }
        public int TotalPages { get; set; }
        public decimal TotalGrossRevenue { get; set; }
        public decimal TotalPendingRevenue { get; set; }
        public decimal TotalRefunds { get; set; }

        public List<string> Providers { get; set; } = new();
        public List<MasterBillingTransaction> Transactions { get; set; } = new();

        private const int PageSize = 20;

        /// <summary>
        /// Handles HTTP GET requests to aggregate financial metrics and query transactions.
        /// </summary>
        public async Task OnGetAsync()
        {
            TotalGrossRevenue = await _dbContext.MasterBillingTransactions
                .Where(t => t.Status == "Completed")
                .SumAsync(t => (decimal?)t.Amount) ?? 0m;

            TotalPendingRevenue = await _dbContext.MasterBillingTransactions
                .Where(t => t.Status == "Pending")
                .SumAsync(t => (decimal?)t.Amount) ?? 0m;

            TotalRefunds = await _dbContext.MasterBillingTransactions
                .Where(t => t.Status == "Refunded")
                .SumAsync(t => (decimal?)t.Amount) ?? 0m;

            Providers = await _dbContext.MasterBillingTransactions
                .Where(t => t.PaymentProvider != null)
                .Select(t => t.PaymentProvider!)
                .Distinct()
                .OrderBy(p => p)
                .ToListAsync();

            var query = _dbContext.MasterBillingTransactions
                .Include(t => t.Tenant)
                .Include(t => t.FeatureSubscription)
                    .ThenInclude(s => s!.MasterFeatureCatalog)
                .AsQueryable();

            if (TenantId.HasValue)
            {
                query = query.Where(t => t.MasterTenantCatalogId == TenantId.Value);
            }

            if (!string.IsNullOrWhiteSpace(Status))
            {
                query = query.Where(t => t.Status == Status);
            }

            if (!string.IsNullOrWhiteSpace(Provider))
            {
                query = query.Where(t => t.PaymentProvider == Provider);
            }

            if (!string.IsNullOrWhiteSpace(Search))
            {
                var term = Search.Trim().ToLower();
                query = query.Where(t => (t.InvoiceNumber != null && t.InvoiceNumber.ToLower().Contains(term))
                                      || (t.TransactionRef != null && t.TransactionRef.ToLower().Contains(term))
                                      || (t.Tenant != null && t.Tenant.OrganizationName.ToLower().Contains(term))
                                      || (t.Tenant != null && t.Tenant.TenantKey.ToLower().Contains(term)));
            }

            TotalCount = await query.CountAsync();
            TotalPages = (int)Math.Ceiling(TotalCount / (double)PageSize);
            if (TotalPages < 1) TotalPages = 1;
            if (PageNumber < 1) PageNumber = 1;
            if (PageNumber > TotalPages) PageNumber = TotalPages;

            Transactions = await query
                .OrderByDescending(t => t.CreatedUtc)
                .Skip((PageNumber - 1) * PageSize)
                .Take(PageSize)
                .ToListAsync();
        }
    }
}
