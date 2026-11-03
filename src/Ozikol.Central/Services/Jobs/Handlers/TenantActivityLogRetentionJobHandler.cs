using System;
using System.Collections.Generic;
using System.Diagnostics;
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
    /// Background job handler that runs weekly across tenant databases to purge activity logs
    /// older than 90 days and ensure PAGE data compression is applied to <c>[dbo].[BcpActivityLogs]</c>
    /// to reclaim storage footprint and prevent runaway database growth.
    /// </summary>
    public class TenantActivityLogRetentionJobHandler : IBackgroundJobHandler
    {
        private readonly MasterCatalogDbContext _masterCatalogDbContext;
        private readonly ILogger<TenantActivityLogRetentionJobHandler> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="TenantActivityLogRetentionJobHandler"/> class.
        /// </summary>
        /// <param name="masterCatalogDbContext">Master Catalog database context.</param>
        /// <param name="logger">Structured logger instance.</param>
        public TenantActivityLogRetentionJobHandler(
            MasterCatalogDbContext masterCatalogDbContext,
            ILogger<TenantActivityLogRetentionJobHandler> logger)
        {
            _masterCatalogDbContext = masterCatalogDbContext;
            _logger = logger;
        }

        /// <inheritdoc />
        public string JobKey => "tenant.activity-logs-retention";

        /// <inheritdoc />
        public string DisplayName => "Tenant Activity Logs 90-Day Retention & Compression Purge";

        /// <inheritdoc />
        public string Category => "Maintenance & Storage";

        /// <inheritdoc />
        public BackgroundJobScope Scope => BackgroundJobScope.Tenant;

        /// <inheritdoc />
        public string Description => "Purges historical activity logs older than 90 days in safe batches and ensures Microsoft SQL Server PAGE compression is active on [dbo].[BcpActivityLogs].";

        /// <inheritdoc />
        public int DefaultIntervalSeconds => 604800; // Run once every 7 days (weekly)

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
                logs.Add($"[{now:yyyy-MM-dd HH:mm:ss} UTC] 🧹 Beginning weekly 90-day activity log retention and compression scan across active tenants...");
            }

            var tenants = await query.ToListAsync(cancellationToken);

            if (tenants.Count == 0)
            {
                logs.Add($"[{DateTime.UtcNow:HH:mm:ss}] ℹ️ No active tenant records found.");
                return JobExecutionResult.Succeeded(0, "No active tenants to maintain.", logs);
            }

            var masterConnStr = _masterCatalogDbContext.Database.GetConnectionString() ?? string.Empty;
            int totalTenantsProcessed = 0;
            int totalRowsPurged = 0;
            int compressionAppliedCount = 0;
            int failureCount = 0;

            foreach (var tenant in tenants)
            {
                string tenantConnStr = TenantConnectionHarmonizer.Harmonize(masterConnStr, tenant.ConnectionString, tenant.DatabaseName);
                if (string.IsNullOrWhiteSpace(tenantConnStr))
                {
                    logs.Add($"   ├── ⚠️ Tenant [{tenant.TenantKey}] '{tenant.OrganizationName}': Missing connection string.");
                    failureCount++;
                    continue;
                }

                var sw = Stopwatch.StartNew();
                try
                {
                    await using var conn = new SqlConnection(tenantConnStr);
                    await conn.OpenAsync(cancellationToken);

                    // 1. Check if table exists
                    await using var checkCmd = conn.CreateCommand();
                    checkCmd.CommandText = "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'BcpActivityLogs';";
                    var tableCount = Convert.ToInt32(await checkCmd.ExecuteScalarAsync(cancellationToken));

                    if (tableCount == 0)
                    {
                        logs.Add($"   ├── ℹ️ Tenant [{tenant.TenantKey}] '{tenant.OrganizationName}': [BcpActivityLogs] table not found. Skipping.");
                        continue;
                    }

                    // 2. Safe batched deletion of rows older than 90 days
                    int tenantPurgedRows = 0;
                    int batchLoop = 0;
                    const int maxBatches = 20; // safety ceiling: up to 100,000 rows per weekly run per tenant

                    while (batchLoop < maxBatches)
                    {
                        batchLoop++;
                        await using var purgeCmd = conn.CreateCommand();
                        purgeCmd.CommandText = @"
                            DELETE TOP (5000) 
                            FROM [dbo].[BcpActivityLogs] 
                            WHERE [Date] < DATEADD(DAY, -90, GETUTCDATE());
                            SELECT @@ROWCOUNT;";
                        purgeCmd.CommandTimeout = 90;

                        var affected = Convert.ToInt32(await purgeCmd.ExecuteScalarAsync(cancellationToken));
                        tenantPurgedRows += affected;

                        if (affected == 0)
                        {
                            break;
                        }
                    }

                    // 3. Inspect and apply PAGE compression if not yet compressed
                    bool appliedCompression = false;
                    await using var compCheckCmd = conn.CreateCommand();
                    compCheckCmd.CommandText = @"
                        SELECT TOP 1 p.data_compression_desc 
                        FROM sys.partitions p 
                        JOIN sys.tables t ON p.object_id = t.object_id 
                        WHERE t.name = 'BcpActivityLogs' AND p.index_id IN (0, 1);";
                    var currentCompression = (await compCheckCmd.ExecuteScalarAsync(cancellationToken))?.ToString();

                    if (!string.Equals(currentCompression, "PAGE", StringComparison.OrdinalIgnoreCase))
                    {
                        await using var compRebuildCmd = conn.CreateCommand();
                        compRebuildCmd.CommandText = "ALTER TABLE [dbo].[BcpActivityLogs] REBUILD WITH (DATA_COMPRESSION = PAGE);";
                        compRebuildCmd.CommandTimeout = 180;
                        await compRebuildCmd.ExecuteNonQueryAsync(cancellationToken);
                        appliedCompression = true;
                        compressionAppliedCount++;
                    }

                    sw.Stop();
                    totalRowsPurged += tenantPurgedRows;
                    totalTenantsProcessed++;

                    var compStatus = appliedCompression ? " [PAGE compression enabled]" : " [Already PAGE compressed]";
                    logs.Add($"   ├── 🟢 Tenant [{tenant.TenantKey}] '{tenant.OrganizationName}': Purged {tenantPurgedRows:N0} logs older than 90 days.{compStatus} ({sw.ElapsedMilliseconds}ms)");
                }
                catch (Exception ex)
                {
                    sw.Stop();
                    failureCount++;
                    _logger.LogError(ex, "Failed to run activity log maintenance on tenant [{TenantKey}]", tenant.TenantKey);
                    logs.Add($"   ├── 🔴 Tenant [{tenant.TenantKey}] '{tenant.OrganizationName}': Maintenance failed — {ex.Message}");
                }
            }

            var summary = $"Processed {totalTenantsProcessed} tenant(s). Purged {totalRowsPurged:N0} records (>90 days old). PAGE compression applied on {compressionAppliedCount} database(s). Errors: {failureCount}.";
            logs.Add($"[{DateTime.UtcNow:HH:mm:ss}] ✅ Maintenance finished. {summary}");

            return failureCount == 0
                ? JobExecutionResult.Succeeded(totalTenantsProcessed, summary, logs)
                : JobExecutionResult.Failed(summary, summary, logs);
        }
    }
}
