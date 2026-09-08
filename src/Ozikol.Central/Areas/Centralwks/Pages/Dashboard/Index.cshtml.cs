using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Areas.Centralwks.Pages.Dashboard
{
    /// <summary>
    /// PageModel powering the primary Central Administration Overview Dashboard within the Admin Area.
    /// Aggregates real-time platform metrics across tenant fleets, revenue, active subscriptions, and audit events.
    /// </summary>
    public class IndexModel : PageModel
    {
        private readonly MasterCatalogDbContext _dbContext;

        /// <summary>
        /// Initializes a new instance of the <see cref="IndexModel"/> class.
        /// </summary>
        /// <param name="dbContext">Master catalog database context for platform queries.</param>
        public IndexModel(MasterCatalogDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        /// <summary>
        /// Total number of provisioned sovereign tenant databases in the platform fleet.
        /// </summary>
        public int TotalTenants { get; set; }

        /// <summary>
        /// Total number of currently active tenants accepting customer traffic.
        /// </summary>
        public int ActiveTenants { get; set; }

        /// <summary>
        /// Total count of activated modular feature subscriptions across all tenants.
        /// </summary>
        public int ActiveSubscriptions { get; set; }

        /// <summary>
        /// Total platform revenue recorded in the current calendar month in USD.
        /// </summary>
        public decimal MonthlyRevenue { get; set; }

        /// <summary>
        /// Count of customer support inquiries awaiting operator response.
        /// </summary>
        public int OpenTickets { get; set; }

        /// <summary>
        /// Total count of registered affiliate partners.
        /// </summary>
        public int TotalAffiliates { get; set; }

        /// <summary>
        /// Total count of template creator studio partners.
        /// </summary>
        public int TotalCreators { get; set; }

        /// <summary>
        /// Most recently registered tenant organizations.
        /// </summary>
        public List<MasterTenantCatalog> RecentTenants { get; set; } = new();

        /// <summary>
        /// Most recent platform administrative audit log entries.
        /// </summary>
        public List<MasterAuditLog> RecentAuditLogs { get; set; } = new();

        /// <summary>
        /// Handles HTTP GET requests to calculate and populate dashboard statistics.
        /// </summary>
        public async Task OnGetAsync()
        {
            TotalTenants = await _dbContext.MasterTenantCatalogs.CountAsync();
            ActiveTenants = await _dbContext.MasterTenantCatalogs.CountAsync(t => t.IsActive);
            ActiveSubscriptions = await _dbContext.MasterTenantFeatureSubscriptions.CountAsync(s => s.IsActive);

            var startOfMonth = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);
            MonthlyRevenue = await _dbContext.MasterBillingTransactions
                .Where(t => t.CreatedUtc >= startOfMonth && t.Status == "Completed")
                .SumAsync(t => (decimal?)t.Amount) ?? 0m;

            OpenTickets = await _dbContext.MasterSupportInquiries
                .CountAsync(t => t.Status == "Pending" || t.Status == "InReview");

            TotalAffiliates = await _dbContext.MasterAffiliatePartners.CountAsync();
            TotalCreators = await _dbContext.MasterCreatorApplications.CountAsync(c => c.Status == "Approved");

            RecentTenants = await _dbContext.MasterTenantCatalogs
                .OrderByDescending(t => t.CreatedUtc)
                .Take(5)
                .ToListAsync();

            RecentAuditLogs = await _dbContext.MasterAuditLogs
                .OrderByDescending(a => a.CreatedUtc)
                .Take(8)
                .ToListAsync();
        }
    }
}
