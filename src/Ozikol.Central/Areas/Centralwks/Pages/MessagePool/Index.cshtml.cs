using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Ozikol.Central.Services;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterDomain.Security;
using Ozikol.MasterPersistence.EF.MasterSQL;
using Ozikol_BCC.Infrastructure.TenantSupport;
using Ozikol_BCC.Persistence.EF.SQL;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol.Central.Areas.Centralwks.Pages.MessagePool
{
    /// <summary>
    /// Central Works cross-tenant monitor for inspecting, auditing, and retrying
    /// central <c>MasterMessagePools</c> outbox messages across all active tenant organizations.
    /// Operates entirely against the Master Catalog Database with ZERO tenant database connection dependencies.
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

        /// <summary>Any tenant keys whose database could not be queried during legacy sync.</summary>
        public List<string> UnreachableTenants { get; set; } = new();

        [BindProperty(SupportsGet = true)]
        public string? TenantFilter { get; set; }

        [BindProperty(SupportsGet = true)]
        public string? ChannelFilter { get; set; }

        [BindProperty(SupportsGet = true)]
        public string? ProviderFilter { get; set; }

        [BindProperty(SupportsGet = true)]
        public string? StatusFilter { get; set; }

        [BindProperty(SupportsGet = true)]
        public string? Search { get; set; }

        [BindProperty(SupportsGet = true)]
        public int PageIndex { get; set; } = 1;

        [BindProperty(SupportsGet = true)]
        public string PageSizeOption { get; set; } = "15";

        public int PageSize { get; set; } = 15;

        public int QueuedCount { get; set; }
        public int ProcessingCount { get; set; }
        public int SentCount { get; set; }
        public int FailedCount { get; set; }
        public int TotalFilteredItems { get; set; }
        public int TotalPages => (PageSize == int.MaxValue || TotalFilteredItems == 0)
            ? 1
            : Math.Max(1, (int)Math.Ceiling((double)TotalFilteredItems / PageSize));

        public int FirstItemIndex => TotalFilteredItems == 0 ? 0 : (PageSize == int.MaxValue ? 1 : (PageIndex - 1) * PageSize + 1);
        public int LastItemIndex => TotalFilteredItems == 0 ? 0 : (PageSize == int.MaxValue ? TotalFilteredItems : Math.Min(PageIndex * PageSize, TotalFilteredItems));

        [TempData]
        public string? StatusMessage { get; set; }

        /// <summary>
        /// Loads cross-tenant outbox metrics and paginated message pool records from Central Master DB.
        /// </summary>
        public async Task OnGetAsync()
        {
            var activeTenants = await LoadActiveTenantsAsync();
            Tenants = activeTenants
                .Select(t => new TenantOption(t.TenantKey, t.OrganizationName))
                .OrderBy(t => t.OrganizationName)
                .ToList();

            // 1. One-time legacy outbox sync: If MasterMessagePools is empty, import historical records from tenant DBs
            try
            {
                if (!await _masterDb.MasterMessagePools.AnyAsync())
                {
                    await SyncLegacyTenantMessagesAsync(activeTenants);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[MessagePool] MasterMessagePool table check or sync skipped: {Msg}", ex.Message);
            }

            // 2. Aggregate KPI counts from central MasterMessagePools table
            try
            {
                QueuedCount = await _masterDb.MasterMessagePools.CountAsync(m => m.Status == "Queued");
                ProcessingCount = await _masterDb.MasterMessagePools.CountAsync(m => m.Status == "Processing");
                SentCount = await _masterDb.MasterMessagePools.CountAsync(m => m.Status == "Sent");
                FailedCount = await _masterDb.MasterMessagePools.CountAsync(m => m.Status == "Failed");
            }
            catch
            {
                // Graceful fallback if migration not yet applied
            }

            PageSize = PageSizeOption?.ToLowerInvariant() switch
            {
                "10" => 10,
                "15" => 15,
                "50" => 50,
                "all" => int.MaxValue,
                _ => int.TryParse(PageSizeOption, out var parsedSize) ? Math.Max(1, parsedSize) : 15
            };

            var searchTerm = Search?.Trim();

            try
            {
                var query = _masterDb.MasterMessagePools.AsNoTracking().AsQueryable();

                if (!string.IsNullOrWhiteSpace(TenantFilter) && !TenantFilter.Equals("All", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(m => m.TenantKey == TenantFilter);
                }

                if (!string.IsNullOrWhiteSpace(ChannelFilter) && !ChannelFilter.Equals("All", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(m => m.Channel == ChannelFilter);
                }

                if (!string.IsNullOrWhiteSpace(ProviderFilter) && !ProviderFilter.Equals("All", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(m => m.Provider == ProviderFilter);
                }

                if (!string.IsNullOrWhiteSpace(StatusFilter) && !StatusFilter.Equals("All", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(m => m.Status == StatusFilter);
                }

                if (!string.IsNullOrWhiteSpace(searchTerm))
                {
                    query = query.Where(m =>
                        m.RecipientAddress.Contains(searchTerm) ||
                        (m.RecipientName != null && m.RecipientName.Contains(searchTerm)) ||
                        (m.Subject != null && m.Subject.Contains(searchTerm)) ||
                        (m.LastError != null && m.LastError.Contains(searchTerm)));
                }

                TotalFilteredItems = await query.CountAsync();
                if (PageIndex < 1) PageIndex = 1;
                if (PageIndex > TotalPages) PageIndex = TotalPages;

                var items = await query
                    .OrderByDescending(m => m.CreatedAt)
                    .Skip(PageSize == int.MaxValue ? 0 : (PageIndex - 1) * PageSize)
                    .Take(PageSize == int.MaxValue ? 500 : PageSize)
                    .ToListAsync();

                Messages = items.Select(m => new CrossTenantMessageRow
                {
                    Id = m.Id,
                    TenantKey = m.TenantKey,
                    OrganizationName = m.OrganizationName ?? m.TenantKey,
                    Channel = Enum.TryParse<BcpMessageChannel>(m.Channel, true, out var ch) ? ch : BcpMessageChannel.Email,
                    Provider = Enum.TryParse<BcpMessageProvider>(m.Provider, true, out var prov) ? prov : BcpMessageProvider.Mailcow,
                    RecipientAddress = m.RecipientAddress,
                    RecipientName = m.RecipientName,
                    Subject = m.Subject,
                    Content = m.Content,
                    PlainTextFallback = m.PlainTextFallback,
                    ActionUrl = m.ActionUrl,
                    SenderOrTemplateName = m.SenderOrTemplateName,
                    MetadataJson = m.MetadataJson,
                    Category = Enum.TryParse<BcpMessageCategory>(m.Category, true, out var cat) ? cat : BcpMessageCategory.General,
                    Severity = Enum.TryParse<NotificationSeverity>(m.Severity, true, out var sev) ? sev : NotificationSeverity.Update,
                    Priority = Enum.TryParse<BcpMessagePriority>(m.Priority, true, out var prio) ? prio : BcpMessagePriority.Normal,
                    Status = Enum.TryParse<BcpQueueStatus>(m.Status, true, out var st) ? st : BcpQueueStatus.Queued,
                    Retries = m.Retries,
                    MaxRetries = m.MaxRetries,
                    LastError = m.LastError,
                    ProviderMessageId = m.ProviderMessageId,
                    ScheduledAt = m.ScheduledAt,
                    SentAt = m.SentAt,
                    CreatedAt = m.CreatedAt
                }).ToList();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[MessagePool] Querying MasterMessagePools encountered exception: {Msg}", ex.Message);
            }
        }

        /// <summary>
        /// One-time legacy migration that imports historical outbox records from accessible tenant databases into MasterMessagePools.
        /// </summary>
        private async Task SyncLegacyTenantMessagesAsync(List<(string TenantKey, string OrganizationName, string ConnectionString)> tenants)
        {
            foreach (var tenant in tenants)
            {
                try
                {
                    using var db = CreateTenantDbContext(tenant.TenantKey, tenant.ConnectionString);
                    var legacyItems = await db.BcpMessagePools.AsNoTracking().Take(100).ToListAsync();
                    if (legacyItems.Count == 0) continue;

                    foreach (var leg in legacyItems)
                    {
                        _masterDb.MasterMessagePools.Add(new MasterMessagePool
                        {
                            Id = leg.Id,
                            TenantKey = tenant.TenantKey,
                            OrganizationName = tenant.OrganizationName,
                            Channel = leg.Channel.ToString(),
                            Provider = leg.Provider.ToString(),
                            RecipientAddress = leg.RecipientAddress,
                            RecipientName = leg.RecipientName,
                            Subject = leg.Subject,
                            Content = leg.Content,
                            PlainTextFallback = leg.PlainTextFallback,
                            ActionUrl = leg.ActionUrl,
                            Category = leg.Category.ToString(),
                            Severity = leg.Severity.ToString(),
                            Priority = leg.Priority.ToString(),
                            Status = leg.Status.ToString(),
                            Retries = leg.Retries,
                            MaxRetries = leg.MaxRetries,
                            LastError = leg.LastError,
                            ProviderMessageId = leg.ProviderMessageId,
                            SenderOrTemplateName = leg.SenderOrTemplateName,
                            MetadataJson = leg.MetadataJson,
                            ScheduledAt = leg.ScheduledAt,
                            SentAt = leg.SentAt,
                            CreatedAt = leg.CreatedAt
                        });
                    }

                    await _masterDb.SaveChangesAsync();
                    _logger.LogInformation("✅ [MessagePool] Imported {Count} legacy outbox messages from tenant '{TenantKey}' into MasterMessagePools.",
                        legacyItems.Count, tenant.TenantKey);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "[MessagePool] Could not sync legacy messages from tenant '{TenantKey}': {Msg}", tenant.TenantKey, ex.Message);
                }
            }
        }

        /// <summary>
        /// Re-queues a failed or stuck message in the central Master Message Pool.
        /// </summary>
        public async Task<IActionResult> OnPostRetryAsync(Guid messageId)
        {
            try
            {
                var item = await _masterDb.MasterMessagePools.FindAsync(messageId);
                if (item != null)
                {
                    item.Status = "Queued";
                    item.Retries = 0;
                    item.LastError = null;
                    await _masterDb.SaveChangesAsync();
                    StatusMessage = $"Message successfully re-queued for delivery.";
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to re-queue message {MessageId}.", messageId);
                StatusMessage = $"Error: Unable to re-queue message ({ex.Message}).";
            }

            return RedirectToPage(new { TenantFilter, ChannelFilter, StatusFilter, Search, PageIndex });
        }

        /// <summary>
        /// Re-queues all Failed and stuck Processing messages across the selected tenant (or platform-wide).
        /// </summary>
        public async Task<IActionResult> OnPostRetryAllFailedAsync(string? tenantKey)
        {
            try
            {
                var query = _masterDb.MasterMessagePools.Where(m => m.Status == "Failed" || m.Status == "Processing");
                if (!string.IsNullOrWhiteSpace(tenantKey) && !tenantKey.Equals("All", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(m => m.TenantKey == tenantKey);
                }

                var failedOrStuck = await query.ToListAsync();
                foreach (var item in failedOrStuck)
                {
                    item.Status = "Queued";
                    item.Retries = 0;
                    item.LastError = null;
                }

                await _masterDb.SaveChangesAsync();
                StatusMessage = failedOrStuck.Count > 0
                    ? $"Re-queued {failedOrStuck.Count} message(s) for Worker delivery."
                    : "No failed or stuck processing messages found to re-queue.";
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to re-queue messages: {Msg}", ex.Message);
                StatusMessage = $"Error re-queuing messages: {ex.Message}";
            }

            return RedirectToPage(new { TenantFilter, ChannelFilter, StatusFilter, Search, PageIndex });
        }

        /// <summary>
        /// Clears outbox records from <c>MasterMessagePools</c> based on selected scope and target tenant.
        /// </summary>
        public async Task<IActionResult> OnPostClearPoolAsync(string? targetTenant, string clearScope, bool includeInAppNotifications)
        {
            try
            {
                var query = _masterDb.MasterMessagePools.AsQueryable();

                if (!string.IsNullOrWhiteSpace(targetTenant) && !targetTenant.Equals("All", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(m => m.TenantKey == targetTenant);
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

                var itemsToDelete = await query.ToListAsync();
                if (itemsToDelete.Count > 0)
                {
                    _masterDb.MasterMessagePools.RemoveRange(itemsToDelete);
                    await _masterDb.SaveChangesAsync();
                }

                StatusMessage = $"Cleared {itemsToDelete.Count} outbox message(s) from the Central Master Pool.";
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to clear pool: {Msg}", ex.Message);
                StatusMessage = $"Error clearing pool: {ex.Message}";
            }

            return RedirectToPage(new { TenantFilter, ChannelFilter, StatusFilter, Search, PageIndex });
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

        /// <summary>Tenant dropdown option.</summary>
        public sealed record TenantOption(string TenantKey, string OrganizationName);

        /// <summary>Cross-tenant message pool projection.</summary>
        public sealed class CrossTenantMessageRow
        {
            public Guid Id { get; set; }
            public string TenantKey { get; set; } = string.Empty;
            public string OrganizationName { get; set; } = string.Empty;
            public BcpMessageChannel Channel { get; set; }
            public BcpMessageProvider Provider { get; set; }
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
