using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Ozikol.Central.Services;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Areas.Centralwks.Pages.Tenants.Databases
{
    /// <summary>
    /// PageModel displaying and governing the dedicated Database Suite for all platform tenants.
    /// Integrates with <see cref="ICentralMigrationService"/> to monitor real-time database reachability,
    /// EF Core schema migration versions, table and record volumes, and trigger single or batch migrations safely.
    /// </summary>
    public class IndexModel : PageModel
    {
        private readonly ICentralMigrationService _migrationService;
        private readonly MasterCatalogDbContext _dbContext;
        private readonly ILogger<IndexModel> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="IndexModel"/> class.
        /// </summary>
        public IndexModel(
            ICentralMigrationService migrationService,
            MasterCatalogDbContext dbContext,
            ILogger<IndexModel> logger)
        {
            _migrationService = migrationService;
            _dbContext = dbContext;
            _logger = logger;
        }

        /// <summary>
        /// Search keyword to filter by database name or organization.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? Search { get; set; }

        /// <summary>
        /// Filter by health / migration status: "all", "healthy", "pending", "unreachable".
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? Status { get; set; } = "all";

        /// <summary>
        /// Current pagination page number (1-based).
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public int PageNumber { get; set; } = 1;

        /// <summary>
        /// Configurable page size (10, 25, 50, 100).
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public int PageSize { get; set; } = 10;

        /// <summary>
        /// Total pages available.
        /// </summary>
        public int TotalPages { get; set; }

        /// <summary>
        /// Total matching databases for current filter.
        /// </summary>
        public int TotalFilteredCount { get; set; }

        /// <summary>
        /// Mini-Dashboard: Total dedicated databases in the suite.
        /// </summary>
        public int TotalDatabasesCount { get; set; }

        /// <summary>
        /// Mini-Dashboard: Total reachable/online databases.
        /// </summary>
        public int HealthyDatabasesCount { get; set; }

        /// <summary>
        /// Mini-Dashboard: Databases with pending schema migrations.
        /// </summary>
        public int PendingMigrationsCount { get; set; }

        /// <summary>
        /// Mini-Dashboard: Unreachable / offline databases.
        /// </summary>
        public int UnreachableDatabasesCount { get; set; }

        /// <summary>
        /// Summary of the Master Catalog Database migration state.
        /// </summary>
        public MasterMigrationSummary MasterSummary { get; set; } = new();

        /// <summary>
        /// AES-256-GCM encryption at rest status across tenant database credentials.
        /// </summary>
        public ConnectionStringsEncryptionStatus EncryptionStatus { get; set; } = new();

        /// <summary>
        /// List of tenant database summaries for the current paginated view.
        /// </summary>
        public List<TenantMigrationSummary> Databases { get; set; } = new();

        /// <summary>
        /// Handles HTTP GET requests to load fleet database diagnostics and metrics.
        /// </summary>
        public async Task OnGetAsync()
        {
            if (PageSize <= 0) PageSize = 10;
            if (PageNumber <= 0) PageNumber = 1;

            try
            {
                MasterSummary = await _migrationService.GetMasterMigrationStatusAsync();
                EncryptionStatus = await _migrationService.GetConnectionStringsEncryptionStatusAsync();
                var allSummaries = await _migrationService.GetAllTenantMigrationStatusesAsync();

                // Compute Mini-Dashboard Metrics
                TotalDatabasesCount = allSummaries.Count;
                HealthyDatabasesCount = allSummaries.Count(d => d.Status.IsReachable && !d.Status.HasPendingMigrations);
                PendingMigrationsCount = allSummaries.Count(d => d.Status.HasPendingMigrations);
                UnreachableDatabasesCount = allSummaries.Count(d => !d.Status.IsReachable);

                var query = allSummaries.AsQueryable();

                // Search filter
                if (!string.IsNullOrWhiteSpace(Search))
                {
                    var term = Search.Trim().ToLowerInvariant();
                    query = query.Where(d => d.DatabaseName.ToLowerInvariant().Contains(term)
                                          || d.OrganizationName.ToLowerInvariant().Contains(term)
                                          || d.TenantKey.ToLowerInvariant().Contains(term)
                                          || d.PrimaryDomain.ToLowerInvariant().Contains(term));
                }

                // Health & migration filter
                if (!string.IsNullOrWhiteSpace(Status) && !Status.Equals("all", StringComparison.OrdinalIgnoreCase))
                {
                    if (Status.Equals("healthy", StringComparison.OrdinalIgnoreCase))
                    {
                        query = query.Where(d => d.Status.IsReachable && !d.Status.HasPendingMigrations);
                    }
                    else if (Status.Equals("pending", StringComparison.OrdinalIgnoreCase))
                    {
                        query = query.Where(d => d.Status.HasPendingMigrations);
                    }
                    else if (Status.Equals("unreachable", StringComparison.OrdinalIgnoreCase))
                    {
                        query = query.Where(d => !d.Status.IsReachable);
                    }
                }

                TotalFilteredCount = query.Count();
                TotalPages = (int)Math.Ceiling(TotalFilteredCount / (double)PageSize);
                if (TotalPages == 0) TotalPages = 1;
                if (PageNumber > TotalPages) PageNumber = TotalPages;

                Databases = query
                    .Skip((PageNumber - 1) * PageSize)
                    .Take(PageSize)
                    .ToList();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to load database suite status.");
                TempData["Error"] = "Unable to inspect database fleet health.";
            }
        }

        /// <summary>
        /// Handles HTTP POST requests to execute pending migrations on a single tenant database.
        /// </summary>
        public async Task<IActionResult> OnPostMigrateTenantAsync(string tenantKey)
        {
            if (string.IsNullOrWhiteSpace(tenantKey))
            {
                TempData["Error"] = "Tenant key is required.";
                return RedirectToPage();
            }

            var adminUser = User.Identity?.Name ?? "SuperAdmin";
            var now = DateTime.UtcNow;

            var result = await _migrationService.MigrateTenantDatabaseAsync(tenantKey);

            _dbContext.MasterAuditLogs.Add(new MasterAuditLog
            {
                UserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value,
                UserName = adminUser,
                Action = "Database.MigrationExecuted",
                EntityType = "Database",
                EntityId = tenantKey,
                Summary = $"Admin {adminUser} executed migrations on database for tenant '{tenantKey}'. Success: {result.Success}. Details: {result.Message}",
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers.UserAgent.ToString(),
                CreatedUtc = now
            });

            await _dbContext.SaveChangesAsync();

            if (result.Success)
            {
                TempData["Success"] = $"Database migration applied successfully for tenant '{tenantKey}'.";
            }
            else
            {
                TempData["Error"] = $"Migration failed for tenant '{tenantKey}': {result.Message}";
            }

            return RedirectToPage(new { Search, Status, PageNumber, PageSize });
        }

        /// <summary>
        /// Handles HTTP POST requests to batch migrate all pending tenant databases across the fleet.
        /// </summary>
        public async Task<IActionResult> OnPostMigrateAllBatchAsync()
        {
            var adminUser = User.Identity?.Name ?? "SuperAdmin";
            var now = DateTime.UtcNow;

            var batchResult = await _migrationService.MigrateAllTenantsBatchAsync();

            _dbContext.MasterAuditLogs.Add(new MasterAuditLog
            {
                UserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value,
                UserName = adminUser,
                Action = "Database.BatchMigrationExecuted",
                EntityType = "DatabaseSuite",
                Summary = $"Admin {adminUser} triggered batch migration. Processed: {batchResult.TotalProcessed}, Succeeded: {batchResult.SucceededCount}, Failed: {batchResult.FailedCount}",
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers.UserAgent.ToString(),
                CreatedUtc = now
            });

            await _dbContext.SaveChangesAsync();

            if (batchResult.AllSucceeded)
            {
                TempData["Success"] = $"Batch migration completed successfully: {batchResult.SucceededCount} databases updated.";
            }
            else
            {
                TempData["Warning"] = $"Batch migration completed with errors: {batchResult.SucceededCount} succeeded, {batchResult.FailedCount} failed.";
            }

            return RedirectToPage(new { Search, Status, PageNumber, PageSize });
        }

        /// <summary>
        /// Handles HTTP POST requests to encrypt all unencrypted tenant connection strings in-place using authenticated AES-256-GCM.
        /// </summary>
        public async Task<IActionResult> OnPostEncryptConnectionStringsAsync()
        {
            var adminUser = User.Identity?.Name ?? "SuperAdmin";
            var now = DateTime.UtcNow;

            var result = await _migrationService.EncryptAllUnencryptedConnectionStringsAsync();

            _dbContext.MasterAuditLogs.Add(new MasterAuditLog
            {
                UserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value,
                UserName = adminUser,
                Action = "Security.ConnectionStringsEncrypted",
                EntityType = "DatabaseSuite",
                Summary = $"Admin {adminUser} triggered in-place AES-256-GCM encryption of tenant database connection strings. Result: {result.Message} (Newly encrypted: {result.NewlyEncryptedCount})",
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers.UserAgent.ToString(),
                CreatedUtc = now
            });

            await _dbContext.SaveChangesAsync();

            if (result.Success)
            {
                TempData["Success"] = result.Message;
            }
            else
            {
                TempData["Error"] = result.Message;
            }

            return RedirectToPage(new { Search, Status, PageNumber, PageSize });
        }
    }
}
