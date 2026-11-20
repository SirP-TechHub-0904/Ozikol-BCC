using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Ozikol.MasterDomain.Security;
using Ozikol.MasterPersistence.EF.MasterSQL;
using Ozikol_BCC.Infrastructure.TenantSupport;
using Ozikol_BCC.Persistence.EF.SQL;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol.Central.Areas.Centralwks.Pages.MessagePool
{
    /// <summary>
    /// Central Works cross-tenant monitor for inspecting, auditing, and retrying
    /// <c>BcpMessagePools</c> outbox messages across all active tenant organizations.
    /// </summary>
    public class IndexModel : PageModel
    {
        private readonly MasterCatalogDbContext _masterDb;
        private readonly ILogger<IndexModel> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="IndexModel"/> class.
        /// </summary>
        /// <param name="masterDb">Master catalog database context.</param>
        /// <param name="logger">Structured logger instance.</param>
        public IndexModel(MasterCatalogDbContext masterDb, ILogger<IndexModel> logger)
        {
            _masterDb = masterDb ?? throw new ArgumentNullException(nameof(masterDb));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>Available active tenants for the filter dropdown.</summary>
        public List<TenantOption> Tenants { get; set; } = new();

        /// <summary>Aggregated message pool items matching filters for the current page.</summary>
        public List<CrossTenantMessageRow> Messages { get; set; } = new();

        /// <summary>Any tenant keys whose database could not be queried.</summary>
        public List<string> UnreachableTenants { get; set; } = new();

        [BindProperty(SupportsGet = true)]
        public string? TenantFilter { get; set; }

        [BindProperty(SupportsGet = true)]
        public string? ChannelFilter { get; set; }

        [BindProperty(SupportsGet = true)]
        public string? StatusFilter { get; set; }

        [BindProperty(SupportsGet = true)]
        public string? Search { get; set; }

        [BindProperty(SupportsGet = true)]
        public int PageIndex { get; set; } = 1;

        [BindProperty(SupportsGet = true)]
        public int PageSize { get; set; } = 25;

        public int QueuedCount { get; set; }
        public int ProcessingCount { get; set; }
        public int SentCount { get; set; }
        public int FailedCount { get; set; }
        public int TotalFilteredItems { get; set; }
        public int TotalPages => Math.Max(1, (int)Math.Ceiling((double)TotalFilteredItems / Math.Max(1, PageSize)));

        [TempData]
        public string? StatusMessage { get; set; }

        /// <summary>
        /// Loads cross-tenant outbox metrics and paginated message pool records.
        /// </summary>
        public async Task OnGetAsync()
        {
            var activeTenants = await LoadActiveTenantsAsync();
            Tenants = activeTenants
                .Select(t => new TenantOption(t.TenantKey, t.OrganizationName))
                .OrderBy(t => t.OrganizationName)
                .ToList();

            var targetTenants = string.IsNullOrWhiteSpace(TenantFilter) || TenantFilter.Equals("All", StringComparison.OrdinalIgnoreCase)
                ? activeTenants
                : activeTenants.Where(t => t.TenantKey.Equals(TenantFilter, StringComparison.OrdinalIgnoreCase)).ToList();

            var allRows = new List<CrossTenantMessageRow>();

            BcpMessageChannel? parsedChannel = null;
            if (!string.IsNullOrWhiteSpace(ChannelFilter) && Enum.TryParse<BcpMessageChannel>(ChannelFilter, true, out var ch))
            {
                parsedChannel = ch;
            }

            BcpQueueStatus? parsedStatus = null;
            if (!string.IsNullOrWhiteSpace(StatusFilter) && Enum.TryParse<BcpQueueStatus>(StatusFilter, true, out var st))
            {
                parsedStatus = st;
            }

            var searchTerm = Search?.Trim();

            foreach (var tenant in targetTenants)
            {
                try
                {
                    using var db = CreateTenantDbContext(tenant.TenantKey, tenant.ConnectionString);

                    // Aggregate status counts per tenant
                    var counts = await db.BcpMessagePools
                        .AsNoTracking()
                        .GroupBy(m => m.Status)
                        .Select(g => new { Status = g.Key, Count = g.Count() })
                        .ToListAsync();

                    foreach (var c in counts)
                    {
                        switch (c.Status)
                        {
                            case BcpQueueStatus.Queued: QueuedCount += c.Count; break;
                            case BcpQueueStatus.Processing: ProcessingCount += c.Count; break;
                            case BcpQueueStatus.Sent: SentCount += c.Count; break;
                            case BcpQueueStatus.Failed: FailedCount += c.Count; break;
                        }
                    }

                    var query = db.BcpMessagePools.AsNoTracking().AsQueryable();

                    if (parsedChannel.HasValue)
                    {
                        query = query.Where(m => m.Channel == parsedChannel.Value);
                    }

                    if (parsedStatus.HasValue)
                    {
                        query = query.Where(m => m.Status == parsedStatus.Value);
                    }

                    if (!string.IsNullOrWhiteSpace(searchTerm))
                    {
                        query = query.Where(m =>
                            m.RecipientAddress.Contains(searchTerm) ||
                            (m.RecipientName != null && m.RecipientName.Contains(searchTerm)) ||
                            (m.Subject != null && m.Subject.Contains(searchTerm)) ||
                            (m.LastError != null && m.LastError.Contains(searchTerm)));
                    }

                    // Cap per-tenant read so cross-tenant aggregation remains responsive
                    var perTenantLimit = targetTenants.Count == 1 ? 300 : 80;
                    var rows = await query
                        .OrderByDescending(m => m.CreatedAt)
                        .Take(perTenantLimit)
                        .Select(m => new CrossTenantMessageRow
                        {
                            Id = m.Id,
                            TenantKey = tenant.TenantKey,
                            OrganizationName = tenant.OrganizationName,
                            Channel = m.Channel,
                            RecipientAddress = m.RecipientAddress,
                            RecipientName = m.RecipientName,
                            Subject = m.Subject,
                            Content = m.Content,
                            PlainTextFallback = m.PlainTextFallback,
                            ActionUrl = m.ActionUrl,
                            SenderOrTemplateName = m.SenderOrTemplateName,
                            MetadataJson = m.MetadataJson,
                            Category = m.Category,
                            Severity = m.Severity,
                            Priority = m.Priority,
                            Status = m.Status,
                            Retries = m.Retries,
                            MaxRetries = m.MaxRetries,
                            LastError = m.LastError,
                            ProviderMessageId = m.ProviderMessageId,
                            ScheduledAt = m.ScheduledAt,
                            SentAt = m.SentAt,
                            CreatedAt = m.CreatedAt
                        })
                        .ToListAsync();

                    allRows.AddRange(rows);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Unable to query BcpMessagePools for tenant '{TenantKey}'.", tenant.TenantKey);
                    UnreachableTenants.Add(tenant.TenantKey);
                }
            }

            var ordered = allRows
                .OrderByDescending(r => r.CreatedAt)
                .ToList();

            TotalFilteredItems = ordered.Count;
            if (PageIndex < 1) PageIndex = 1;
            if (PageIndex > TotalPages) PageIndex = TotalPages;

            Messages = ordered
                .Skip((PageIndex - 1) * PageSize)
                .Take(PageSize)
                .ToList();
        }

        /// <summary>
        /// Resets a single failed or stuck message back to Queued so the Worker Service re-attempts delivery.
        /// </summary>
        public async Task<IActionResult> OnPostRetryAsync(string tenantKey, Guid messageId)
        {
            if (string.IsNullOrWhiteSpace(tenantKey))
            {
                StatusMessage = "Error: Tenant key is required.";
                return RedirectToPage();
            }

            var tenant = await ResolveTenantAsync(tenantKey);
            if (tenant == null)
            {
                StatusMessage = $"Error: Tenant '{tenantKey}' was not found.";
                return RedirectToPage();
            }

            try
            {
                using var db = CreateTenantDbContext(tenant.Value.TenantKey, tenant.Value.ConnectionString);
                var msg = await db.BcpMessagePools.FirstOrDefaultAsync(m => m.Id == messageId);
                if (msg == null)
                {
                    StatusMessage = "Error: Message record not found.";
                    return RedirectToPage(new { TenantFilter, ChannelFilter, StatusFilter, Search, PageIndex });
                }

                msg.Status = BcpQueueStatus.Queued;
                msg.Retries = 0;
                msg.LastError = null;
                await db.SaveChangesAsync();

                StatusMessage = $"Message '{msg.Subject ?? msg.Id.ToString()}' for {tenant.Value.OrganizationName} re-queued for delivery.";
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to re-queue message {MessageId} for tenant {TenantKey}.", messageId, tenantKey);
                StatusMessage = $"Error: Unable to re-queue message ({ex.Message}).";
            }

            return RedirectToPage(new { TenantFilter, ChannelFilter, StatusFilter, Search, PageIndex });
        }

        /// <summary>
        /// Re-queues all Failed and stuck Processing messages across the selected tenant (or all active tenants).
        /// </summary>
        public async Task<IActionResult> OnPostRetryAllFailedAsync(string? tenantKey)
        {
            var activeTenants = await LoadActiveTenantsAsync();
            var targets = string.IsNullOrWhiteSpace(tenantKey) || tenantKey.Equals("All", StringComparison.OrdinalIgnoreCase)
                ? activeTenants
                : activeTenants.Where(t => t.TenantKey.Equals(tenantKey, StringComparison.OrdinalIgnoreCase)).ToList();

            int totalRequeued = 0;
            foreach (var tenant in targets)
            {
                try
                {
                    using var db = CreateTenantDbContext(tenant.TenantKey, tenant.ConnectionString);
                    var failedOrStuck = await db.BcpMessagePools
                        .Where(m => m.Status == BcpQueueStatus.Failed || m.Status == BcpQueueStatus.Processing)
                        .ToListAsync();

                    if (failedOrStuck.Count == 0) continue;

                    foreach (var item in failedOrStuck)
                    {
                        item.Status = BcpQueueStatus.Queued;
                        item.Retries = 0;
                        item.LastError = null;
                    }

                    await db.SaveChangesAsync();
                    totalRequeued += failedOrStuck.Count;
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to re-queue failed or stuck messages for tenant '{TenantKey}'.", tenant.TenantKey);
                }
            }

            StatusMessage = totalRequeued > 0
                ? $"Re-queued {totalRequeued} message(s) for Worker delivery."
                : "No failed or stuck processing messages found to re-queue.";

            return RedirectToPage(new { TenantFilter, ChannelFilter, StatusFilter, Search, PageIndex });
        }

        private async Task<List<(string TenantKey, string OrganizationName, string ConnectionString)>> LoadActiveTenantsAsync()
        {
            var raw = await _masterDb.MasterTenantCatalogs
                .AsNoTracking()
                .Where(t => t.IsActive && !t.IsDeleted && !string.IsNullOrWhiteSpace(t.ConnectionString))
                .Select(t => new { t.TenantKey, t.OrganizationName, t.ConnectionString })
                .ToListAsync();

            var list = new List<(string, string, string)>();
            foreach (var item in raw)
            {
                var decrypted = OzikolDataCipher.DecryptIfNeeded(item.ConnectionString)?.Trim();
                if (!string.IsNullOrWhiteSpace(decrypted))
                {
                    list.Add((item.TenantKey, item.OrganizationName, decrypted));
                }
            }
            return list;
        }

        private async Task<(string TenantKey, string OrganizationName, string ConnectionString)?> ResolveTenantAsync(string tenantKey)
        {
            var item = await _masterDb.MasterTenantCatalogs
                .AsNoTracking()
                .Where(t => t.TenantKey == tenantKey && !t.IsDeleted)
                .Select(t => new { t.TenantKey, t.OrganizationName, t.ConnectionString })
                .FirstOrDefaultAsync();

            if (item == null) return null;
            var decrypted = OzikolDataCipher.DecryptIfNeeded(item.ConnectionString)?.Trim();
            if (string.IsNullOrWhiteSpace(decrypted)) return null;
            return (item.TenantKey, item.OrganizationName, decrypted);
        }

        private static DashboardDbContext CreateTenantDbContext(string tenantKey, string decryptedConnectionString)
        {
            var optionsBuilder = new DbContextOptionsBuilder<DashboardDbContext>();
            optionsBuilder.UseSqlServer(decryptedConnectionString, sql => sql.CommandTimeout(20));
            return new DashboardDbContext(optionsBuilder.Options, new StaticTenantProvider(tenantKey, decryptedConnectionString));
        }

        /// <summary>Tenant dropdown option.</summary>
        public sealed record TenantOption(string TenantKey, string OrganizationName);

        /// <summary>Cross-tenant message pool projection.</summary>
        public sealed class CrossTenantMessageRow
        {
            public Guid Id { get; set; }
            public string TenantKey { get; set; } = string.Empty;
            public string OrganizationName { get; set; } = string.Empty;
            public BcpMessageChannel Channel { get; set; }
            public string RecipientAddress { get; set; } = string.Empty;
            public string? RecipientName { get; set; }
            public string? Subject { get; set; }
            public string Content { get; set; } = string.Empty;
            public string? PlainTextFallback { get; set; }
            public string? ActionUrl { get; set; }
            public string? SenderOrTemplateName { get; set; }
            public string? MetadataJson { get; set; }
            public BcpMessageCategory Category { get; set; }
            public NotificationSeverity Severity { get; set; }
            public BcpMessagePriority Priority { get; set; }
            public BcpQueueStatus Status { get; set; }
            public int Retries { get; set; }
            public int MaxRetries { get; set; }
            public string? LastError { get; set; }
            public string? ProviderMessageId { get; set; }
            public DateTime? ScheduledAt { get; set; }
            public DateTime? SentAt { get; set; }
            public DateTime CreatedAt { get; set; }
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
