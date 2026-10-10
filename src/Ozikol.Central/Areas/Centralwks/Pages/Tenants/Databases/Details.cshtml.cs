using System;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Ozikol.Central.Services;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Areas.Centralwks.Pages.Tenants.Databases
{
    /// <summary>
    /// PageModel providing physical database deep-dive inspection, real-time connectivity testing,
    /// schema migration timeline management, and per-table record/storage footprint analysis for a tenant database.
    /// </summary>
    public class DetailsModel : PageModel
    {
        private readonly ICentralMigrationService _migrationService;
        private readonly MasterCatalogDbContext _dbContext;
        private readonly ILogger<DetailsModel> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="DetailsModel"/> class.
        /// </summary>
        public DetailsModel(
            ICentralMigrationService migrationService,
            MasterCatalogDbContext dbContext,
            ILogger<DetailsModel> logger)
        {
            _migrationService = migrationService;
            _dbContext = dbContext;
            _logger = logger;
        }

        /// <summary>
        /// Tenant Key passed via query string.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? TenantKey { get; set; }

        /// <summary>
        /// Tenant Catalog ID passed via query string as alternative.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public int? Id { get; set; }

        /// <summary>
        /// Master Catalog tenant entity.
        /// </summary>
        public MasterTenantCatalog Tenant { get; set; } = null!;

        /// <summary>
        /// Physical database metrics, tables list, and migration state.
        /// </summary>
        public TenantDatabaseDeepDive DeepDive { get; set; } = null!;

        /// <summary>
        /// Measured roundtrip ping latency to the tenant database in milliseconds.
        /// </summary>
        public long? PingLatencyMs { get; set; }

        /// <summary>
        /// Sanitized connection host / server name.
        /// </summary>
        public string ServerHost { get; set; } = string.Empty;

        /// <summary>
        /// Handles HTTP GET requests to load physical database inspection data.
        /// </summary>
        public async Task<IActionResult> OnGetAsync()
        {
            MasterTenantCatalog? tenant = null;

            if (Id.HasValue && Id.Value > 0)
            {
                tenant = await _dbContext.MasterTenantCatalogs.FindAsync(Id.Value);
            }
            else if (!string.IsNullOrWhiteSpace(TenantKey))
            {
                tenant = await _dbContext.MasterTenantCatalogs.FirstOrDefaultAsync(t => t.TenantKey == TenantKey);
            }

            if (tenant == null)
            {
                TempData["Error"] = "Tenant database record not found.";
                return RedirectToPage("/Tenants/Databases/Index");
            }

            Tenant = tenant;
            TenantKey = tenant.TenantKey;

            var masterConnStr = _dbContext.Database.GetConnectionString() ?? string.Empty;
            string harmonizedConnStr = TenantConnectionHarmonizer.Harmonize(masterConnStr, tenant.ConnectionString, tenant.DatabaseName);

            // Extract sanitized server host
            try
            {
                var builder = new SqlConnectionStringBuilder(harmonizedConnStr);
                ServerHost = builder.DataSource;
            }
            catch
            {
                ServerHost = "MSSQL Host";
            }

            // Load deep dive metrics
            var deepDive = await _migrationService.GetTenantDeepDiveAsync(tenant.TenantKey);
            if (deepDive == null)
            {
                TempData["Error"] = "Unable to inspect physical database instance.";
                return RedirectToPage("/Tenants/Databases/Index");
            }

            DeepDive = deepDive;

            // Test Ping Latency
            await MeasurePingLatencyAsync(harmonizedConnStr);

            return Page();
        }

        /// <summary>
        /// Handles HTTP POST requests to test live database ping latency.
        /// </summary>
        public async Task<IActionResult> OnPostPingAsync(string tenantKey)
        {
            var tenant = await _dbContext.MasterTenantCatalogs.FirstOrDefaultAsync(t => t.TenantKey == tenantKey);
            if (tenant == null)
            {
                return new JsonResult(new { success = false, message = "Tenant not found." });
            }

            var masterConnStr = _dbContext.Database.GetConnectionString() ?? string.Empty;
            string harmonizedConnStr = TenantConnectionHarmonizer.Harmonize(masterConnStr, tenant.ConnectionString, tenant.DatabaseName);

            var sw = Stopwatch.StartNew();
            try
            {
                using var conn = new SqlConnection(harmonizedConnStr);
                await conn.OpenAsync();
                var cmd = conn.CreateCommand();
                cmd.CommandText = "SELECT 1;";
                await cmd.ExecuteScalarAsync();
                sw.Stop();

                return new JsonResult(new
                {
                    success = true,
                    latencyMs = sw.ElapsedMilliseconds,
                    message = $"Connection verified in {sw.ElapsedMilliseconds} ms."
                });
            }
            catch (Exception ex)
            {
                sw.Stop();
                return new JsonResult(new
                {
                    success = false,
                    latencyMs = sw.ElapsedMilliseconds,
                    message = ex.Message
                });
            }
        }

        /// <summary>
        /// Handles HTTP POST requests to apply pending migrations to this tenant database.
        /// </summary>
        public async Task<IActionResult> OnPostMigrateAsync(string tenantKey)
        {
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
                TempData["Success"] = $"Migration executed successfully: {result.Message}";
            }
            else
            {
                TempData["Error"] = $"Migration failed: {result.Message}";
            }

            return RedirectToPage(new { tenantKey });
        }

        private async Task MeasurePingLatencyAsync(string connectionString)
        {
            var sw = Stopwatch.StartNew();
            try
            {
                using var conn = new SqlConnection(connectionString);
                await conn.OpenAsync();
                var cmd = conn.CreateCommand();
                cmd.CommandText = "SELECT 1;";
                await cmd.ExecuteScalarAsync();
                sw.Stop();
                PingLatencyMs = sw.ElapsedMilliseconds;
            }
            catch
            {
                sw.Stop();
                PingLatencyMs = null;
            }
        }
    }
}
