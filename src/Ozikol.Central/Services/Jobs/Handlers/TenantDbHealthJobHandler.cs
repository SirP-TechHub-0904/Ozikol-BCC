using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Services.Jobs.Handlers
{
    /// <summary>
    /// Tenant Project Background Job Handler that inspects database connectivity and health metrics
    /// for all active tenant organizations or a specific targeted tenant.
    /// </summary>
    public class TenantDbHealthJobHandler : IBackgroundJobHandler
    {
        private readonly MasterCatalogDbContext _masterCatalogDbContext;
        private readonly ILogger<TenantDbHealthJobHandler> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="TenantDbHealthJobHandler"/> class.
        /// </summary>
        /// <param name="masterCatalogDbContext">Master Catalog database context.</param>
        /// <param name="logger">Structured logger instance.</param>
        public TenantDbHealthJobHandler(
            MasterCatalogDbContext masterCatalogDbContext,
            ILogger<TenantDbHealthJobHandler> logger)
        {
            _masterCatalogDbContext = masterCatalogDbContext;
            _logger = logger;
        }

        /// <inheritdoc />
        public string JobKey => "tenant.db-health";

        /// <inheritdoc />
        public string DisplayName => "Tenant Database Health & Connectivity Monitor";

        /// <inheritdoc />
        public string Category => "Tenant Operations";

        /// <inheritdoc />
        public BackgroundJobScope Scope => BackgroundJobScope.Tenant;

        /// <inheritdoc />
        public string Description => "Pings isolated tenant databases, measures response latency, and validates database connectivity across tenant organizations.";

        /// <inheritdoc />
        public int DefaultIntervalSeconds => 1800; // Run every 30 minutes

        /// <inheritdoc />
        public async Task<JobExecutionResult> ExecuteAsync(JobExecutionContext context, CancellationToken cancellationToken = default)
        {
            var logs = new List<string>();
            var now = DateTime.UtcNow;

            IQueryable<MasterTenantCatalog> query = _masterCatalogDbContext.MasterTenantCatalogs.Where(t => t.IsActive);

            if (context.TargetTenantCatalogId.HasValue)
            {
                query = query.Where(t => t.Id == context.TargetTenantCatalogId.Value);
                logs.Add($"[{now:yyyy-MM-dd HH:mm:ss} UTC] 🎯 Targeting specific Tenant ID: {context.TargetTenantCatalogId.Value}");
            }
            else
            {
                logs.Add($"[{now:yyyy-MM-dd HH:mm:ss} UTC] 🌐 Scanning all active tenant databases...");
            }

            var tenants = await query.ToListAsync(cancellationToken);

            if (tenants.Count == 0)
            {
                logs.Add($"[{DateTime.UtcNow:HH:mm:ss}] ℹ️ No matching active tenant records found.");
                return JobExecutionResult.Succeeded(0, "No active tenants to inspect.", logs);
            }

            int healthyCount = 0;
            int warningCount = 0;

            foreach (var tenant in tenants)
            {
                if (string.IsNullOrWhiteSpace(tenant.ConnectionString))
                {
                    logs.Add($"   ├── ⚠️ Tenant [{tenant.TenantKey}] '{tenant.OrganizationName}': Missing connection string!");
                    warningCount++;
                    continue;
                }

                var sw = System.Diagnostics.Stopwatch.StartNew();
                try
                {
                    await using var conn = new SqlConnection(tenant.ConnectionString);
                    await conn.OpenAsync(cancellationToken);
                    await using var cmd = conn.CreateCommand();
                    cmd.CommandText = "SELECT 1;";
                    await cmd.ExecuteScalarAsync(cancellationToken);
                    sw.Stop();

                    logs.Add($"   ├── 🟢 Tenant [{tenant.TenantKey}] '{tenant.OrganizationName}': Online ({sw.ElapsedMilliseconds}ms latency)");
                    healthyCount++;
                }
                catch (Exception ex)
                {
                    sw.Stop();
                    logs.Add($"   ├── 🔴 Tenant [{tenant.TenantKey}] '{tenant.OrganizationName}': Connection Failed ({sw.ElapsedMilliseconds}ms) — {ex.Message}");
                    warningCount++;
                    _logger.LogWarning(ex, "Tenant {TenantKey} DB ping failed", tenant.TenantKey);
                }
            }

            var summary = $"Inspected {tenants.Count} tenant database(s): {healthyCount} Healthy, {warningCount} Failed/Degraded.";
            logs.Add($"[{DateTime.UtcNow:HH:mm:ss}] ✅ Execution finished. {summary}");

            return warningCount == 0
                ? JobExecutionResult.Succeeded(tenants.Count, summary, logs)
                : JobExecutionResult.Failed(summary, summary, logs);
        }
    }
}
