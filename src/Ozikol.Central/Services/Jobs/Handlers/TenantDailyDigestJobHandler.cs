using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Services.Jobs.Handlers
{
    /// <summary>
    /// Tenant Project Background Job Handler that compiles daily operational summaries,
    /// active user counts, and system metrics for tenants.
    /// </summary>
    public class TenantDailyDigestJobHandler : IBackgroundJobHandler
    {
        private readonly MasterCatalogDbContext _masterCatalogDbContext;
        private readonly ILogger<TenantDailyDigestJobHandler> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="TenantDailyDigestJobHandler"/> class.
        /// </summary>
        /// <param name="masterCatalogDbContext">Master Catalog database context.</param>
        /// <param name="logger">Structured logger instance.</param>
        public TenantDailyDigestJobHandler(
            MasterCatalogDbContext masterCatalogDbContext,
            ILogger<TenantDailyDigestJobHandler> logger)
        {
            _masterCatalogDbContext = masterCatalogDbContext;
            _logger = logger;
        }

        /// <inheritdoc />
        public string JobKey => "tenant.daily-digest";

        /// <inheritdoc />
        public string DisplayName => "Tenant Daily Operations & Activity Digest";

        /// <inheritdoc />
        public string Category => "Tenant Operations";

        /// <inheritdoc />
        public BackgroundJobScope Scope => BackgroundJobScope.Tenant;

        /// <inheritdoc />
        public string Description => "Aggregates daily active subscriptions, user engagements, and operational health summaries per tenant organization.";

        /// <inheritdoc />
        public int DefaultIntervalSeconds => 86400; // Run once daily

        /// <inheritdoc />
        public async Task<JobExecutionResult> ExecuteAsync(JobExecutionContext context, CancellationToken cancellationToken = default)
        {
            var logs = new List<string>();
            var now = DateTime.UtcNow;

            IQueryable<MasterTenantCatalog> query = _masterCatalogDbContext.MasterTenantCatalogs
                .Include(t => t.FeatureSubscriptions)
                .Where(t => t.IsActive);

            if (context.TargetTenantCatalogId.HasValue)
            {
                query = query.Where(t => t.Id == context.TargetTenantCatalogId.Value);
                logs.Add($"[{now:yyyy-MM-dd HH:mm:ss} UTC] 🎯 Running Daily Digest for Tenant ID: {context.TargetTenantCatalogId.Value}");
            }
            else
            {
                logs.Add($"[{now:yyyy-MM-dd HH:mm:ss} UTC] 🌐 Running Daily Digest across all active tenants...");
            }

            var tenants = await query.ToListAsync(cancellationToken);

            if (tenants.Count == 0)
            {
                logs.Add($"[{DateTime.UtcNow:HH:mm:ss}] ℹ️ No active tenants to process.");
                return JobExecutionResult.Succeeded(0, "No active tenants found.", logs);
            }

            int processedCount = 0;
            foreach (var tenant in tenants)
            {
                var activeSubs = tenant.FeatureSubscriptions.Count(s => s.IsActive && s.Status == "Active");
                var totalSubs = tenant.FeatureSubscriptions.Count;
                var lastAccessed = tenant.LastAccessedUtc.HasValue ? $"{tenant.LastAccessedUtc.Value:MMM dd HH:mm} UTC" : "Never";

                logs.Add($"   ├── Tenant [{tenant.TenantKey}] '{tenant.OrganizationName}': {activeSubs}/{totalSubs} active capabilities | Last Accessed: {lastAccessed}");
                processedCount++;
            }

            var summary = $"Daily digest compiled successfully for {processedCount} tenant organization(s).";
            logs.Add($"[{DateTime.UtcNow:HH:mm:ss}] ✅ {summary}");

            return JobExecutionResult.Succeeded(processedCount, summary, logs);
        }
    }
}
