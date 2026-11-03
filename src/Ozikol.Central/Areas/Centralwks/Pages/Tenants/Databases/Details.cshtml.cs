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
        public Guid? Id { get; set; }

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

            if (Id.HasValue && Id.Value != Guid.Empty)
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

        /// <summary>
        /// Request model for executing raw SQL queries in the emergency repair room.
        /// </summary>
        public class ExecuteQueryRequest
        {
            /// <summary>
            /// Tenant key identifier whose database is targeted.
            /// </summary>
            public string TenantKey { get; set; } = string.Empty;

            /// <summary>
            /// Raw SQL query statement to execute.
            /// </summary>
            public string SqlQuery { get; set; } = string.Empty;
        }

        /// <summary>
        /// Handles AJAX POST requests to safely execute SQL queries and schema repair commands against the tenant's database.
        /// </summary>
        /// <param name="request">Query execution parameters containing the SQL query.</param>
        /// <returns>JSON result with tabular rows or execution metadata.</returns>
        public async Task<IActionResult> OnPostExecuteQueryAsync([FromBody] ExecuteQueryRequest request)
        {
            if (string.IsNullOrWhiteSpace(request?.TenantKey) || string.IsNullOrWhiteSpace(request?.SqlQuery))
            {
                return new JsonResult(new { success = false, message = "SQL query statement and tenant key are required." });
            }

            var tenant = await _dbContext.MasterTenantCatalogs.FirstOrDefaultAsync(t => t.TenantKey == request.TenantKey);
            if (tenant == null)
            {
                return new JsonResult(new { success = false, message = "Tenant database record not found." });
            }

            var adminUser = User.Identity?.Name ?? "SuperAdmin";
            var masterConnStr = _dbContext.Database.GetConnectionString() ?? string.Empty;
            string harmonizedConnStr = TenantConnectionHarmonizer.Harmonize(masterConnStr, tenant.ConnectionString, tenant.DatabaseName);

            var sw = Stopwatch.StartNew();
            var trimmedSql = request.SqlQuery.Trim();

            try
            {
                using var conn = new SqlConnection(harmonizedConnStr);
                await conn.OpenAsync();

                using var cmd = conn.CreateCommand();
                cmd.CommandText = trimmedSql;
                cmd.CommandTimeout = 60;

                var columns = new List<string>();
                var rows = new List<List<string?>>();
                int rowsAffected = 0;
                bool hasResultSet = false;

                using (var reader = await cmd.ExecuteReaderAsync())
                {
                    if (reader.FieldCount > 0)
                    {
                        hasResultSet = true;
                        for (int i = 0; i < reader.FieldCount; i++)
                        {
                            columns.Add(reader.GetName(i));
                        }

                        int count = 0;
                        while (await reader.ReadAsync() && count < 100)
                        {
                            var row = new List<string?>();
                            for (int i = 0; i < reader.FieldCount; i++)
                            {
                                var val = reader.IsDBNull(i) ? "NULL" : reader.GetValue(i)?.ToString();
                                row.Add(val);
                            }
                            rows.Add(row);
                            count++;
                        }
                    }
                    rowsAffected = reader.RecordsAffected;
                }

                sw.Stop();

                // Audit log for platform compliance
                _dbContext.MasterAuditLogs.Add(new MasterAuditLog
                {
                    UserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value,
                    UserName = adminUser,
                    Action = "Database.EmergencyQueryExecuted",
                    EntityType = "Database",
                    EntityId = tenant.TenantKey,
                    Summary = $"Admin {adminUser} executed SQL on '{tenant.DatabaseName}' ({sw.ElapsedMilliseconds}ms): {(trimmedSql.Length > 200 ? trimmedSql[..200] + "..." : trimmedSql)}",
                    IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                    UserAgent = Request.Headers.UserAgent.ToString(),
                    CreatedUtc = DateTime.UtcNow
                });
                await _dbContext.SaveChangesAsync();

                return new JsonResult(new
                {
                    success = true,
                    executionTimeMs = sw.ElapsedMilliseconds,
                    rowsAffected = rowsAffected >= 0 ? rowsAffected : 0,
                    hasResultSet,
                    columns,
                    rows,
                    totalReturned = rows.Count,
                    message = hasResultSet 
                        ? $"Query returned {rows.Count} rows in {sw.ElapsedMilliseconds} ms."
                        : $"Command executed successfully in {sw.ElapsedMilliseconds} ms. Rows affected: {(rowsAffected >= 0 ? rowsAffected : 0)}"
                });
            }
            catch (Exception ex)
            {
                sw.Stop();
                _logger.LogError(ex, "Emergency SQL execution error on tenant {TenantKey}: {Sql}", tenant.TenantKey, trimmedSql);

                return new JsonResult(new
                {
                    success = false,
                    executionTimeMs = sw.ElapsedMilliseconds,
                    message = ex.Message
                });
            }
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
