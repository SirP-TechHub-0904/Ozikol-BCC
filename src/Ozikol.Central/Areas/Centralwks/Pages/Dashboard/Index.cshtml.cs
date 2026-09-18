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

        private readonly ILogger<IndexModel> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="IndexModel"/> class.
        /// </summary>
        /// <param name="dbContext">Master catalog database context for platform queries.</param>
        /// <param name="logger">Diagnostic logging service.</param>
        public IndexModel(MasterCatalogDbContext dbContext, ILogger<IndexModel> logger)
        {
            _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>
        /// Total number of provisioned tenant databases in the platform fleet.
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
        /// Handles HTTP GET requests to calculate and populate dashboard statistics with fault tolerance.
        /// </summary>
        public async Task OnGetAsync()
        {
            try
            {
                TotalTenants = await _dbContext.MasterTenantCatalogs.CountAsync();
                ActiveTenants = await _dbContext.MasterTenantCatalogs.CountAsync(t => t.IsActive);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to query MasterTenantCatalogs metric for dashboard.");
            }

            try
            {
                ActiveSubscriptions = await _dbContext.MasterTenantFeatureSubscriptions.CountAsync(s => s.IsActive);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to query MasterTenantFeatureSubscriptions metric for dashboard.");
            }

            try
            {
                var startOfMonth = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);
                MonthlyRevenue = await _dbContext.MasterBillingTransactions
                    .Where(t => t.CreatedUtc >= startOfMonth && t.Status == "Completed")
                    .SumAsync(t => (decimal?)t.Amount) ?? 0m;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to query MasterBillingTransactions metric for dashboard.");
            }

            try
            {
                OpenTickets = await _dbContext.MasterSupportInquiries
                    .CountAsync(t => t.Status == "Pending" || t.Status == "InReview");
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to query MasterSupportInquiries metric for dashboard.");
            }

            try
            {
                TotalAffiliates = await _dbContext.MasterAffiliatePartners.CountAsync();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to query MasterAffiliatePartners metric for dashboard.");
            }

            try
            {
                TotalCreators = await _dbContext.MasterCreatorApplications.CountAsync(c => c.Status == "Approved");
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to query MasterCreatorApplications metric for dashboard.");
            }

            try
            {
                RecentTenants = await _dbContext.MasterTenantCatalogs
                    .OrderByDescending(t => t.CreatedUtc)
                    .Take(5)
                    .ToListAsync();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to query RecentTenants list for dashboard.");
            }

            try
            {
                RecentAuditLogs = await _dbContext.MasterAuditLogs
                    .OrderByDescending(a => a.CreatedUtc)
                    .Take(8)
                    .ToListAsync();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to query RecentAuditLogs list for dashboard.");
            }
        }
    }
}
