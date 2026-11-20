using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Ozikol.Central.Services;
using Ozikol.MasterDomain.Security;
using Ozikol.MasterPersistence.EF.MasterSQL;
using Ozikol_BCC.Infrastructure.TenantSupport;
using Ozikol_BCC.Persistence.EF.SQL;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol.Central.Areas.Centralwks.Pages.MessagePool
{
    /// <summary>
    /// Administrative tool for inspecting message pool queue ages and safely purging
    /// outbox delivery records across all tenants or individual tenants by date range or all-time.
    /// </summary>
    public class CleanupModel : PageModel
    {
        private readonly MasterCatalogDbContext _masterDb;
        private readonly ILogger<CleanupModel> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="CleanupModel"/> class.
        /// </summary>
        /// <param name="masterDb">Master catalog database context.</param>
        /// <param name="logger">Structured logger instance.</param>
        public CleanupModel(MasterCatalogDbContext masterDb, ILogger<CleanupModel> logger)
        {
            _masterDb = masterDb ?? throw new ArgumentNullException(nameof(masterDb));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>Available active tenant options for filtering.</summary>
        public List<TenantOption> Tenants { get; set; } = new();

        /// <summary>Aggregated queue age and volume statistics per tenant.</summary>
        public List<TenantQueueStat> TenantStats { get; set; } = new();

        /// <summary>Filtered tenant key, or "All" for platform-wide view.</summary>
        [BindProperty(SupportsGet = true)]
        public string? TenantFilter { get; set; }

        /// <summary>Grand total messages across inspected tenants.</summary>
        public int TotalMessageCount { get; set; }

        /// <summary>Grand total queued messages.</summary>
        public int TotalQueuedCount { get; set; }

        /// <summary>Grand total sent messages.</summary>
        public int TotalSentCount { get; set; }

        /// <summary>Grand total failed messages.</summary>
        public int TotalFailedCount { get; set; }

        /// <summary>Grand total processing messages.</summary>
        public int TotalProcessingCount { get; set; }

        /// <summary>Earliest recorded message creation date across inspected tenants.</summary>
        public DateTime? PlatformEarliestDate { get; set; }

        /// <summary>Latest recorded message creation date across inspected tenants.</summary>
        public DateTime? PlatformLatestDate { get; set; }

        [TempData]
        public string? StatusMessage { get; set; }

        /// <summary>
        /// Queries and aggregates message pool volume and timestamps across tenants.
        /// </summary>
        public async Task OnGetAsync()
        {
            var activeTenants = await LoadActiveTenantsAsync();
            Tenants = activeTenants
                .Select(t => new TenantOption(t.TenantKey, t.OrganizationName))
                .OrderBy(t => t.OrganizationName)
                .ToList();

            var targets = string.IsNullOrWhiteSpace(TenantFilter) || TenantFilter.Equals("All", StringComparison.OrdinalIgnoreCase)
                ? activeTenants
                : activeTenants.Where(t => t.TenantKey.Equals(TenantFilter, StringComparison.OrdinalIgnoreCase)).ToList();

            foreach (var tenant in targets)
            {
                try
                {
                    using var db = CreateTenantDbContext(tenant.TenantKey, tenant.ConnectionString);

                    var count = await db.BcpMessagePools.CountAsync();
                    if (count == 0)
                    {
                        TenantStats.Add(new TenantQueueStat
                        {
                            TenantKey = tenant.TenantKey,
                            OrganizationName = tenant.OrganizationName,
                            TotalCount = 0,
                            QueuedCount = 0,
                            SentCount = 0,
                            FailedCount = 0,
                            ProcessingCount = 0,
                            OldestMessageDate = null,
                            NewestMessageDate = null
                        });
                        continue;
                    }

                    var counts = await db.BcpMessagePools
                        .AsNoTracking()
                        .GroupBy(m => m.Status)
                        .Select(g => new { Status = g.Key, Count = g.Count() })
                        .ToListAsync();

                    int queued = counts.FirstOrDefault(c => c.Status == BcpQueueStatus.Queued)?.Count ?? 0;
                    int processing = counts.FirstOrDefault(c => c.Status == BcpQueueStatus.Processing)?.Count ?? 0;
                    int sent = counts.FirstOrDefault(c => c.Status == BcpQueueStatus.Sent)?.Count ?? 0;
                    int failed = counts.FirstOrDefault(c => c.Status == BcpQueueStatus.Failed)?.Count ?? 0;

                    var oldest = await db.BcpMessagePools.AsNoTracking().MinAsync(m => (DateTime?)m.CreatedAt);
                    var newest = await db.BcpMessagePools.AsNoTracking().MaxAsync(m => (DateTime?)m.CreatedAt);

                    TenantStats.Add(new TenantQueueStat
                    {
                        TenantKey = tenant.TenantKey,
                        OrganizationName = tenant.OrganizationName,
                        TotalCount = count,
                        QueuedCount = queued,
                        ProcessingCount = processing,
                        SentCount = sent,
                        FailedCount = failed,
                        OldestMessageDate = oldest,
                        NewestMessageDate = newest
                    });

                    TotalMessageCount += count;
                    TotalQueuedCount += queued;
                    TotalProcessingCount += processing;
                    TotalSentCount += sent;
                    TotalFailedCount += failed;

                    if (oldest.HasValue && (!PlatformEarliestDate.HasValue || oldest.Value < PlatformEarliestDate.Value))
                    {
                        PlatformEarliestDate = oldest.Value;
                    }

                    if (newest.HasValue && (!PlatformLatestDate.HasValue || newest.Value > PlatformLatestDate.Value))
                    {
                        PlatformLatestDate = newest.Value;
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to query queue metrics for tenant '{TenantKey}': {Msg}", tenant.TenantKey, ex.Message);
                }
            }
        }

        /// <summary>
        /// Executes a safe deletion against <c>BcpMessagePools</c> either for All Time or across a specific Date Range.
        /// </summary>
        /// <param name="targetTenantKey">Target tenant key or "All" for all active tenants.</param>
        /// <param name="purgeMode">"all" for all-time purge or "range" for date range.</param>
        /// <param name="fromDate">Start date for date range purge.</param>
        /// <param name="toDate">End date for date range purge.</param>
        /// <param name="clearScope">"sent_failed", "sent", "failed", or "all".</param>
        public async Task<IActionResult> OnPostClearAsync(
            string targetTenantKey,
            string purgeMode,
            DateTime? fromDate,
            DateTime? toDate,
            string clearScope)
        {
            var activeTenants = await LoadActiveTenantsAsync();
            var targets = string.IsNullOrWhiteSpace(targetTenantKey) || targetTenantKey.Equals("All", StringComparison.OrdinalIgnoreCase)
                ? activeTenants
                : activeTenants.Where(t => t.TenantKey.Equals(targetTenantKey, StringComparison.OrdinalIgnoreCase)).ToList();

            int totalDeleted = 0;

            foreach (var tenant in targets)
            {
                try
                {
                    using var db = CreateTenantDbContext(tenant.TenantKey, tenant.ConnectionString);
                    var query = db.BcpMessagePools.AsQueryable();

                    // Apply status scope
                    switch (clearScope?.ToLowerInvariant())
                    {
                        case "sent":
                            query = query.Where(m => m.Status == BcpQueueStatus.Sent);
                            break;
                        case "failed":
                            query = query.Where(m => m.Status == BcpQueueStatus.Failed);
                            break;
                        case "sent_failed":
                            query = query.Where(m => m.Status == BcpQueueStatus.Sent || m.Status == BcpQueueStatus.Failed);
                            break;
                        case "all":
                            // No status filter
                            break;
                        default:
                            query = query.Where(m => m.Status == BcpQueueStatus.Sent || m.Status == BcpQueueStatus.Failed);
                            break;
                    }

                    // Apply date range filter if in range mode
                    if (string.Equals(purgeMode, "range", StringComparison.OrdinalIgnoreCase))
                    {
                        if (fromDate.HasValue)
                        {
                            var utcFrom = DateTime.SpecifyKind(fromDate.Value.Date, DateTimeKind.Utc);
                            query = query.Where(m => m.CreatedAt >= utcFrom);
                        }

                        if (toDate.HasValue)
                        {
                            var utcTo = DateTime.SpecifyKind(toDate.Value.Date.AddDays(1).AddTicks(-1), DateTimeKind.Utc);
                            query = query.Where(m => m.CreatedAt <= utcTo);
                        }
                    }

                    var recordsToDelete = await query.ToListAsync();
                    if (recordsToDelete.Count > 0)
                    {
                        db.BcpMessagePools.RemoveRange(recordsToDelete);
                        await db.SaveChangesAsync();
                        totalDeleted += recordsToDelete.Count;
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to purge message pool for tenant '{TenantKey}': {Msg}", tenant.TenantKey, ex.Message);
                }
            }

            var rangeText = string.Equals(purgeMode, "range", StringComparison.OrdinalIgnoreCase)
                ? $" within range ({fromDate:yyyy-MM-dd} to {toDate:yyyy-MM-dd})"
                : " across all-time history";

            StatusMessage = totalDeleted > 0
                ? $"Successfully deleted {totalDeleted} message pool record(s){rangeText}."
                : $"No matching messages found to delete{rangeText}.";

            return RedirectToPage(new { TenantFilter });
        }

        private async Task<List<(string TenantKey, string OrganizationName, string ConnectionString)>> LoadActiveTenantsAsync()
        {
            var masterConnStr = _masterDb.Database.GetConnectionString() ?? string.Empty;

            var raw = await _masterDb.MasterTenantCatalogs
                .AsNoTracking()
                .Where(t => t.IsActive && !t.IsDeleted)
                .Select(t => new { t.TenantKey, t.OrganizationName, t.ConnectionString, t.DatabaseName })
                .ToListAsync();

            var list = new List<(string, string, string)>();
            foreach (var item in raw)
            {
                var decrypted = OzikolDataCipher.DecryptIfNeeded(item.ConnectionString)?.Trim();
                var harmonized = TenantConnectionHarmonizer.Harmonize(masterConnStr, decrypted, item.DatabaseName);
                if (!string.IsNullOrWhiteSpace(harmonized))
                {
                    list.Add((item.TenantKey, item.OrganizationName, harmonized));
                }
            }

            return list;
        }

        private static DashboardDbContext CreateTenantDbContext(string tenantKey, string decryptedConnectionString)
        {
            var optionsBuilder = new DbContextOptionsBuilder<DashboardDbContext>();
            optionsBuilder.UseSqlServer(decryptedConnectionString, sql => sql.CommandTimeout(20));
            return new DashboardDbContext(optionsBuilder.Options, new StaticTenantProvider(tenantKey, decryptedConnectionString));
        }

        /// <summary>Tenant option representation.</summary>
        public sealed record TenantOption(string TenantKey, string OrganizationName);

        /// <summary>Tenant queue metrics and age summary.</summary>
        public sealed class TenantQueueStat
        {
            public string TenantKey { get; set; } = string.Empty;
            public string OrganizationName { get; set; } = string.Empty;
            public int TotalCount { get; set; }
            public int QueuedCount { get; set; }
            public int ProcessingCount { get; set; }
            public int SentCount { get; set; }
            public int FailedCount { get; set; }
            public DateTime? OldestMessageDate { get; set; }
            public DateTime? NewestMessageDate { get; set; }
        }

        private sealed class StaticTenantProvider : ITenantProvider
        {
            public StaticTenantProvider(string tenantKey, string connectionString)
            {
                CurrentTenant = tenantKey;
                ConnectionString = connectionString;
            }

            public string? CurrentTenant { get; }
            public string ConnectionString { get; }
            public IDisposable BeginScope(string tenant) => NoopDisposable.Instance;

            private sealed class NoopDisposable : IDisposable
            {
                public static readonly NoopDisposable Instance = new();
                public void Dispose() { }
            }
        }
    }
}
