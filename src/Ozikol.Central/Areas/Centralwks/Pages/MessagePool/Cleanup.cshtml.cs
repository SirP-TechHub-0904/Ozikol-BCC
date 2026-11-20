using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Areas.Centralwks.Pages.MessagePool
{
    /// <summary>
    /// Administrative tool for inspecting message pool queue volume and safely purging
    /// outbox delivery records across all tenants or individual tenants in the central Master Catalog DB.
    /// Operates entirely against MasterCatalogDbContext with ZERO tenant database connection dependencies.
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
        /// Queries and aggregates message pool volume and timestamps from MasterMessagePools.
        /// </summary>
        public async Task OnGetAsync()
        {
            var rawTenants = await _masterDb.MasterTenantCatalogs
                .AsNoTracking()
                .Where(t => t.IsActive && !t.IsDeleted)
                .Select(t => new TenantOption(t.TenantKey, t.OrganizationName))
                .OrderBy(t => t.OrganizationName)
                .ToListAsync();

            Tenants = rawTenants;

            try
            {
                var query = _masterDb.MasterMessagePools.AsNoTracking().AsQueryable();

                if (!string.IsNullOrWhiteSpace(TenantFilter) && !TenantFilter.Equals("All", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(m => m.TenantKey == TenantFilter);
                }

                var grouped = await query
                    .GroupBy(m => new { m.TenantKey, m.OrganizationName })
                    .Select(g => new
                    {
                        g.Key.TenantKey,
                        OrganizationName = g.Key.OrganizationName ?? g.Key.TenantKey,
                        TotalCount = g.Count(),
                        QueuedCount = g.Count(m => m.Status == "Queued"),
                        ProcessingCount = g.Count(m => m.Status == "Processing"),
                        SentCount = g.Count(m => m.Status == "Sent"),
                        FailedCount = g.Count(m => m.Status == "Failed"),
                        OldestDate = g.Min(m => (DateTime?)m.CreatedAt),
                        NewestDate = g.Max(m => (DateTime?)m.CreatedAt)
                    })
                    .ToListAsync();

                foreach (var g in grouped)
                {
                    TenantStats.Add(new TenantQueueStat
                    {
                        TenantKey = g.TenantKey,
                        OrganizationName = g.OrganizationName,
                        TotalCount = g.TotalCount,
                        QueuedCount = g.QueuedCount,
                        ProcessingCount = g.ProcessingCount,
                        SentCount = g.SentCount,
                        FailedCount = g.FailedCount,
                        OldestMessageDate = g.OldestDate,
                        NewestMessageDate = g.NewestDate
                    });

                    TotalMessageCount += g.TotalCount;
                    TotalQueuedCount += g.QueuedCount;
                    TotalProcessingCount += g.ProcessingCount;
                    TotalSentCount += g.SentCount;
                    TotalFailedCount += g.FailedCount;

                    if (g.OldestDate.HasValue && (!PlatformEarliestDate.HasValue || g.OldestDate.Value < PlatformEarliestDate.Value))
                    {
                        PlatformEarliestDate = g.OldestDate.Value;
                    }

                    if (g.NewestDate.HasValue && (!PlatformLatestDate.HasValue || g.NewestDate.Value > PlatformLatestDate.Value))
                    {
                        PlatformLatestDate = g.NewestDate.Value;
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[Cleanup] Error querying MasterMessagePools: {Msg}", ex.Message);
            }
        }

        /// <summary>
        /// Executes a safe deletion against <c>MasterMessagePools</c> either for All Time or across a specific Date Range.
        /// </summary>
        public async Task<IActionResult> OnPostClearAsync(
            string targetTenantKey,
            string purgeMode,
            DateTime? fromDate,
            DateTime? toDate,
            string clearScope)
        {
            try
            {
                var query = _masterDb.MasterMessagePools.AsQueryable();

                if (!string.IsNullOrWhiteSpace(targetTenantKey) && !targetTenantKey.Equals("All", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(m => m.TenantKey == targetTenantKey);
                }

                switch (clearScope?.ToLowerInvariant())
                {
                    case "sent":
                        query = query.Where(m => m.Status == "Sent");
                        break;
                    case "failed":
                        query = query.Where(m => m.Status == "Failed");
                        break;
                    case "sent_failed":
                        query = query.Where(m => m.Status == "Sent" || m.Status == "Failed");
                        break;
                    case "all":
                        break;
                    default:
                        query = query.Where(m => m.Status == "Sent");
                        break;
                }

                if (purgeMode == "range")
                {
                    if (fromDate.HasValue)
                    {
                        var fromUtc = DateTime.SpecifyKind(fromDate.Value.Date, DateTimeKind.Utc);
                        query = query.Where(m => m.CreatedAt >= fromUtc);
                    }
                    if (toDate.HasValue)
                    {
                        var toUtc = DateTime.SpecifyKind(toDate.Value.Date.AddDays(1).AddTicks(-1), DateTimeKind.Utc);
                        query = query.Where(m => m.CreatedAt <= toUtc);
                    }
                }

                var itemsToDelete = await query.ToListAsync();
                if (itemsToDelete.Count > 0)
                {
                    _masterDb.MasterMessagePools.RemoveRange(itemsToDelete);
                    await _masterDb.SaveChangesAsync();
                }

                StatusMessage = $"Successfully purged {itemsToDelete.Count} message(s) from the Central Master Pool.";
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to purge messages: {Msg}", ex.Message);
                StatusMessage = $"Error purging messages: {ex.Message}";
            }

            return RedirectToPage(new { TenantFilter });
        }

        /// <summary>Tenant dropdown option.</summary>
        public sealed record TenantOption(string TenantKey, string OrganizationName);

        /// <summary>Per-tenant queue statistics.</summary>
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
    }
}
