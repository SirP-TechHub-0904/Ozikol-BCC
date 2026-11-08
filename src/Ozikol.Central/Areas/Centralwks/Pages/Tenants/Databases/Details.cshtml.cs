using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Diagnostics;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Ozikol.Central.Services;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;
using Ozikol_BCC.Infrastructure.Caching;

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
        private readonly IAiKeyPoolManagerService _aiKeyPoolService;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<DetailsModel> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="DetailsModel"/> class.
        /// </summary>
        public DetailsModel(
            ICentralMigrationService migrationService,
            MasterCatalogDbContext dbContext,
            IAiKeyPoolManagerService aiKeyPoolService,
            IHttpClientFactory httpClientFactory,
            ILogger<DetailsModel> logger)
        {
            _migrationService = migrationService;
            _dbContext = dbContext;
            _aiKeyPoolService = aiKeyPoolService;
            _httpClientFactory = httpClientFactory;
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
        /// Current resolved database server host/IP.
        /// </summary>
        public string CurrentDataSource { get; set; } = string.Empty;

        /// <summary>
        /// Current physical database name.
        /// </summary>
        public string CurrentInitialCatalog { get; set; } = string.Empty;

        /// <summary>
        /// Current database user ID (if SQL Authentication).
        /// </summary>
        public string CurrentUserId { get; set; } = string.Empty;

        /// <summary>
        /// Indicates whether the connection uses Windows Integrated Security.
        /// </summary>
        public bool CurrentIntegratedSecurity { get; set; }

        /// <summary>
        /// Indicates whether TrustServerCertificate is enabled.
        /// </summary>
        public bool CurrentTrustServerCertificate { get; set; } = true;

        /// <summary>
        /// Indicates whether MultipleActiveResultSets is enabled.
        /// </summary>
        public bool CurrentMultipleActiveResultSets { get; set; } = true;

        /// <summary>
        /// Masked raw connection string for display/audit.
        /// </summary>
        public string MaskedConnectionString { get; set; } = string.Empty;

        /// <summary>
        /// Raw decrypted connection string for editing in the modal.
        /// </summary>
        public string DecryptedConnectionString { get; set; } = string.Empty;

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

            // Parse connection string details for display and editing modal
            try
            {
                var connBuilder = new SqlConnectionStringBuilder(tenant.ConnectionString);
                CurrentDataSource = connBuilder.DataSource;
                CurrentInitialCatalog = !string.IsNullOrWhiteSpace(connBuilder.InitialCatalog) ? connBuilder.InitialCatalog : tenant.DatabaseName;
                CurrentUserId = connBuilder.UserID;
                CurrentIntegratedSecurity = connBuilder.IntegratedSecurity;
                CurrentTrustServerCertificate = connBuilder.TrustServerCertificate;
                CurrentMultipleActiveResultSets = connBuilder.MultipleActiveResultSets;
                DecryptedConnectionString = tenant.ConnectionString;

                var maskedBuilder = new SqlConnectionStringBuilder(tenant.ConnectionString);
                if (!string.IsNullOrEmpty(maskedBuilder.Password))
                {
                    maskedBuilder.Password = "••••••••••••";
                }
                MaskedConnectionString = maskedBuilder.ConnectionString;
            }
            catch
            {
                CurrentDataSource = "MSSQL Host";
                CurrentInitialCatalog = tenant.DatabaseName;
                DecryptedConnectionString = tenant.ConnectionString ?? string.Empty;
                MaskedConnectionString = tenant.ConnectionString ?? string.Empty;
            }

            // Extract sanitized server host
            try
            {
                var builder = new SqlConnectionStringBuilder(harmonizedConnStr);
                ServerHost = builder.DataSource;
            }
            catch
            {
                ServerHost = !string.IsNullOrWhiteSpace(CurrentDataSource) ? CurrentDataSource : "MSSQL Host";
            }

            // Load deep dive metrics with resilient fallback if DB is offline
            var deepDive = await _migrationService.GetTenantDeepDiveAsync(tenant.TenantKey);
            DeepDive = deepDive ?? new TenantDatabaseDeepDive
            {
                IsReachable = false,
                ErrorMessage = "Unable to inspect physical database instance. Check server host, port 1433, and credentials.",
                Tenant = new TenantMigrationSummary
                {
                    Id = tenant.Id,
                    TenantKey = tenant.TenantKey,
                    OrganizationName = tenant.OrganizationName,
                    PrimaryDomain = tenant.PrimaryDomain,
                    CustomDomain = tenant.CustomDomain,
                    DatabaseName = tenant.DatabaseName,
                    ConnectionString = tenant.ConnectionString,
                    IsActive = tenant.IsActive,
                    CreatedUtc = tenant.CreatedUtc
                }
            };

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
        /// Handles HTTP POST requests to purge activity logs older than 90 days and apply PAGE data compression
        /// to <c>[dbo].[BcpActivityLogs]</c> immediately on this tenant's dedicated database.
        /// </summary>
        public async Task<IActionResult> OnPostOptimizeActivityLogsAsync(string tenantKey)
        {
            var tenant = await _dbContext.MasterTenantCatalogs.FirstOrDefaultAsync(t => t.TenantKey == tenantKey);
            if (tenant == null)
            {
                TempData["Error"] = "Tenant database record not found.";
                return RedirectToPage(new { tenantKey });
            }

            var adminUser = User.Identity?.Name ?? "SuperAdmin";
            var masterConnStr = _dbContext.Database.GetConnectionString() ?? string.Empty;
            string harmonizedConnStr = TenantConnectionHarmonizer.Harmonize(masterConnStr, tenant.ConnectionString, tenant.DatabaseName);

            var sw = Stopwatch.StartNew();
            int totalPurged = 0;

            try
            {
                await using var conn = new SqlConnection(harmonizedConnStr);
                await conn.OpenAsync();

                // 1. Purge in safe batches (>90 days old)
                int loop = 0;
                while (loop < 20)
                {
                    loop++;
                    await using var purgeCmd = conn.CreateCommand();
                    purgeCmd.CommandText = @"
                        DELETE TOP (5000) 
                        FROM [dbo].[BcpActivityLogs] 
                        WHERE [Date] < DATEADD(DAY, -90, GETUTCDATE());
                        SELECT @@ROWCOUNT;";
                    purgeCmd.CommandTimeout = 90;
                    var rows = Convert.ToInt32(await purgeCmd.ExecuteScalarAsync());
                    totalPurged += rows;
                    if (rows == 0) break;
                }

                // 2. Apply PAGE compression
                await using var compCmd = conn.CreateCommand();
                compCmd.CommandText = "ALTER TABLE [dbo].[BcpActivityLogs] REBUILD WITH (DATA_COMPRESSION = PAGE);";
                compCmd.CommandTimeout = 180;
                await compCmd.ExecuteNonQueryAsync();

                sw.Stop();

                _dbContext.MasterAuditLogs.Add(new MasterAuditLog
                {
                    UserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value,
                    UserName = adminUser,
                    Action = "Database.TableOptimized",
                    EntityType = "Database",
                    EntityId = tenant.TenantKey,
                    Summary = $"Admin {adminUser} optimized [dbo].[BcpActivityLogs] on '{tenant.DatabaseName}': purged {totalPurged:N0} logs (>90d old) and applied PAGE data compression ({sw.ElapsedMilliseconds}ms).",
                    IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                    UserAgent = Request.Headers.UserAgent.ToString(),
                    CreatedUtc = DateTime.UtcNow
                });
                await _dbContext.SaveChangesAsync();

                TempData["Success"] = $"Optimization complete in {sw.ElapsedMilliseconds} ms: Purged {totalPurged:N0} records older than 90 days and applied SQL Server PAGE data compression.";
            }
            catch (Exception ex)
            {
                sw.Stop();
                _logger.LogError(ex, "Failed to optimize [dbo].[BcpActivityLogs] on tenant {TenantKey}", tenant.TenantKey);
                TempData["Error"] = $"Optimization failed: {ex.Message}";
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

                // Split script by 'GO' batch separators (case-insensitive, on their own line)
                var rawBatches = Regex.Split(trimmedSql, @"^\s*GO\s*$", RegexOptions.Multiline | RegexOptions.IgnoreCase);
                var batches = rawBatches
                    .Select(b => b.Trim())
                    .Where(b => !string.IsNullOrWhiteSpace(b))
                    .ToList();

                if (!batches.Any())
                {
                    return new JsonResult(new { success = false, message = "SQL query cannot be empty or contain only GO separators." });
                }

                var columns = new List<string>();
                var rows = new List<List<string?>>();
                int totalRowsAffected = 0;
                bool hasResultSet = false;

                foreach (var batch in batches)
                {
                    // If the batch is just a USE [db] statement, skip it since the connection is already targeting this database
                    if (Regex.IsMatch(batch, @"^\s*USE\s+\[?[a-zA-Z0-9_]+\]?\s*;?\s*$", RegexOptions.IgnoreCase))
                    {
                        continue;
                    }

                    using var cmd = conn.CreateCommand();
                    cmd.CommandText = batch;
                    cmd.CommandTimeout = 120;

                    using var reader = await cmd.ExecuteReaderAsync();
                    if (reader.FieldCount > 0 && !hasResultSet)
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

                    if (reader.RecordsAffected > 0)
                    {
                        totalRowsAffected += reader.RecordsAffected;
                    }
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
                    rowsAffected = totalRowsAffected >= 0 ? totalRowsAffected : 0,
                    hasResultSet,
                    columns,
                    rows,
                    totalReturned = rows.Count,
                    message = hasResultSet 
                        ? $"Query returned {rows.Count} rows in {sw.ElapsedMilliseconds} ms."
                        : $"Command executed successfully in {sw.ElapsedMilliseconds} ms. {(batches.Count > 1 ? $"({batches.Count} batches executed)" : $"Rows affected: {totalRowsAffected}")}"
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

        /// <summary>
        /// Request model for AI Database Doctor diagnosis.
        /// </summary>
        public class AiDoctorRequest
        {
            /// <summary>
            /// Target tenant key identifier.
            /// </summary>
            public string TenantKey { get; set; } = string.Empty;

            /// <summary>
            /// Optional error message to analyze.
            /// </summary>
            public string? ErrorMessage { get; set; }

            /// <summary>
            /// Optional custom notes or user query.
            /// </summary>
            public string? UserNotes { get; set; }
        }

        /// <summary>
        /// Output DTO returned by Gemini AI Database Doctor.
        /// </summary>
        public class DatabaseAiDiagnosisResult
        {
            /// <summary>
            /// Plain-English explanation of why the error or discrepancy occurred.
            /// </summary>
            public string Diagnosis { get; set; } = string.Empty;

            /// <summary>
            /// Exact T-SQL repair script to execute against the tenant's database.
            /// </summary>
            public string RecommendedSql { get; set; } = string.Empty;

            /// <summary>
            /// Why this specific SQL script resolves the problem.
            /// </summary>
            public string Explanation { get; set; } = string.Empty;
        }

        /// <summary>
        /// Handles AJAX POST requests to diagnose database schema collisions and generate repair SQL via Google Gemini 2.5 Flash.
        /// </summary>
        /// <param name="request">Request parameters containing the tenant key and error context.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>JSON result with diagnosis, recommended SQL, and metadata.</returns>
        public async Task<IActionResult> OnPostAiDiagnoseAsync([FromBody] AiDoctorRequest request, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(request?.TenantKey))
            {
                return new JsonResult(new { success = false, message = "Tenant key is required." });
            }

            var tenant = await _dbContext.MasterTenantCatalogs.FirstOrDefaultAsync(t => t.TenantKey == request.TenantKey, cancellationToken);
            if (tenant == null)
            {
                return new JsonResult(new { success = false, message = "Tenant database record not found." });
            }

            var deepDive = await _migrationService.GetTenantDeepDiveAsync(tenant.TenantKey, cancellationToken);
            var errorContext = !string.IsNullOrWhiteSpace(request.ErrorMessage)
                ? request.ErrorMessage
                : (deepDive?.ErrorMessage ?? deepDive?.Tenant?.Status?.ErrorMessage ?? "Database has pending migrations awaiting execution.");

            var sw = Stopwatch.StartNew();
            MasterAiApiKey? activeKey = null;

            try
            {
                var systemPrompt = @"You are the Chief Database Administrator and SQL Diagnostics Specialist for Ozikol Business Command Center.
You specialize in Microsoft SQL Server, Entity Framework Core migrations, table collision handling, and schema recovery.
When given an error message, database name, and migration details, you must:
1. Provide a concise, clear diagnosis explaining exactly WHY the error occurred in plain English.
2. Provide the exact Microsoft SQL Server repair script (T-SQL) to safely fix the issue so EF Core migrations can complete.
3. Provide a brief explanation of how this SQL resolves the problem without unintended data loss.

CRITICAL T-SQL FORMAT RULES:
- Output clean, semicolon-terminated T-SQL statements (e.g. DROP TABLE IF EXISTS [dbo].[TableName];).
- NEVER output 'GO' batch separators (they cause ADO.NET execution syntax errors).
- NEVER output 'USE [database_name]' statements (the execution connection is already established directly on the target tenant database).

STRICT JSON OUTPUT FORMAT ONLY:
You must respond with ONLY a valid, parseable JSON object matching this schema with no markdown outside the JSON:
{
  ""diagnosis"": ""Concise explanation of the error..."",
  ""recommendedSql"": ""-- T-SQL script to run\nDROP TABLE IF EXISTS ..."",
  ""explanation"": ""Why this script fixes the issue...""
}";

            var existingTablesSnippet = deepDive?.Tables?.Any() == true
                ? string.Join(", ", deepDive.Tables.Select(t => t.FullName))
                : "None";

            var userPrompt = $@"
DATABASE CONTEXT:
- Dedicated Tenant Database: {tenant.DatabaseName}
- Tenant Key: {tenant.TenantKey}
- Organization: {tenant.OrganizationName}
- Pending Migrations: {(deepDive?.PendingMigrations?.Any() == true ? string.Join(", ", deepDive.PendingMigrations) : "None")}
- Latest Applied Migration: {(deepDive?.AppliedMigrations?.Any() == true ? deepDive.AppliedMigrations.LastOrDefault() : "None")}
- Error Message / Symptom: {errorContext}
- Tables Introduced in Pending Migration: BcpWorkstationActivityLogs, BcpCommitteeForms, BcpCommitteeSettings, BcpCommittees, BcpCommitteeMembers, BcpCommitteeRoles, BcpCommitteeMeetings, BcpCommitteeAgendas, BcpCommitteeMinutes, BcpCommitteeDocuments
- Complete List of Existing Database Tables: {existingTablesSnippet}
- Administrator Notes / Query: {request.UserNotes ?? "None"}

CRITICAL DIAGNOSIS TASK:
1. Inspect the 'Tables Introduced in Pending Migration' against 'Complete List of Existing Database Tables'.
2. Identify all tables that ALREADY exist in the database (e.g. BcpWorkstationActivityLogs, BcpCommittees, etc.).
3. Generate the exact 'DROP TABLE IF EXISTS [dbo].[TableName];' statement for EVERY colliding table so EF Core can run the migration cleanly.
4. Output clean T-SQL without 'GO' or 'USE' statements.";

            const int maxKeyAttempts = 4;
            string jsonResponseText = string.Empty;
            string selectedModel = "gemini-3.5-flash";
            string lastError = string.Empty;
            var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(30);

            for (int attempt = 1; attempt <= maxKeyAttempts; attempt++)
            {
                var key = await _aiKeyPoolService.GetNextAvailableKeyAsync("Gemini", cancellationToken);
                if (key == null)
                {
                    key = await _aiKeyPoolService.GetNextAvailableKeyAsync("DeepSeek", cancellationToken);
                }

                if (key == null)
                {
                    break;
                }

                try
                {
                    selectedModel = await _aiKeyPoolService.ResolveSupportedModelAsync(key, cancellationToken);
                    var geminiUrl = await _aiKeyPoolService.GetGenerateContentEndpointAsync(key, cancellationToken);

                    var payload = new
                    {
                        contents = new[]
                        {
                            new
                            {
                                role = "user",
                                parts = new[] { new { text = $"{systemPrompt}\n\n{userPrompt}" } }
                            }
                        },
                        generationConfig = new
                        {
                            temperature = 0.1,
                            responseMimeType = "application/json"
                        }
                    };

                    using var res = await client.PostAsJsonAsync(geminiUrl, payload, cancellationToken);
                    if (res.IsSuccessStatusCode)
                    {
                        activeKey = key;
                        jsonResponseText = await res.Content.ReadAsStringAsync(cancellationToken);
                        await _aiKeyPoolService.LogUsageAsync(key.Id, "DatabaseAiDoctor", (int)sw.ElapsedMilliseconds, 200, cancellationToken: cancellationToken);
                        break;
                    }

                    var errBody = await res.Content.ReadAsStringAsync(cancellationToken);
                    lastError = errBody;

                    // Automatically cool down depleted (402), rate-limited (429), or busy (503) keys and rotate to next key
                    if ((int)res.StatusCode == 429 || (int)res.StatusCode == 402 || (int)res.StatusCode == 401 || (int)res.StatusCode == 403 || (int)res.StatusCode == 503 || (int)res.StatusCode == 404)
                    {
                        var cooldown = (int)res.StatusCode == 402 ? 86400 : 300;
                        await _aiKeyPoolService.MarkRateLimitedAsync(key.Id, cooldown, cancellationToken);
                        await _aiKeyPoolService.LogUsageAsync(key.Id, "DatabaseAiDoctor", (int)sw.ElapsedMilliseconds, (int)res.StatusCode, errorMessage: errBody, cancellationToken: cancellationToken);
                    }
                }
                catch (Exception ex)
                {
                    lastError = ex.Message;
                    await _aiKeyPoolService.MarkRateLimitedAsync(key.Id, 120, cancellationToken);
                }
            }

            sw.Stop();

            if (string.IsNullOrWhiteSpace(jsonResponseText))
            {
                return new JsonResult(new
                {
                    success = false,
                    message = $"AI Database Doctor could not generate diagnosis: {lastError}"
                });
            }

                // Parse candidate text from Gemini
                var doc = JsonDocument.Parse(jsonResponseText);
                var candidates = doc.RootElement.GetProperty("candidates");
                if (candidates.GetArrayLength() == 0)
                {
                    throw new InvalidOperationException("Gemini returned no candidates.");
                }

                var textContent = candidates[0]
                    .GetProperty("content")
                    .GetProperty("parts")[0]
                    .GetProperty("text")
                    .GetString() ?? "{}";

                var cleanJson = CleanJsonFences(textContent);
                var diagnosisResult = JsonSerializer.Deserialize<DatabaseAiDiagnosisResult>(cleanJson, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                if (diagnosisResult == null)
                {
                    throw new InvalidOperationException("Failed to deserialize AI doctor prescription.");
                }

                if (activeKey != null)
                {
                    await _aiKeyPoolService.LogUsageAsync(
                        activeKey.Id,
                        "DatabaseAiDoctor",
                        (int)sw.ElapsedMilliseconds,
                        200,
                        cancellationToken: cancellationToken);
                }

                return new JsonResult(new
                {
                    success = true,
                    diagnosis = diagnosisResult.Diagnosis,
                    recommendedSql = diagnosisResult.RecommendedSql,
                    explanation = diagnosisResult.Explanation,
                    keyAliasUsed = $"{activeKey?.KeyAlias ?? "AI"} [{selectedModel}]",
                    latencyMs = sw.ElapsedMilliseconds
                });
            }
            catch (Exception ex)
            {
                sw.Stop();
                _logger.LogError(ex, "Gemini AI Database Doctor failed on key '{KeyAlias}' for tenant {TenantKey}", activeKey?.KeyAlias ?? "Unknown", tenant.TenantKey);

                if (activeKey != null)
                {
                    await _aiKeyPoolService.LogUsageAsync(
                        activeKey.Id,
                        "DatabaseAiDoctor",
                        (int)sw.ElapsedMilliseconds,
                        500,
                        errorMessage: ex.Message,
                        cancellationToken: cancellationToken);
                }

                return new JsonResult(new
                {
                    success = false,
                    message = $"AI Database Doctor encountered an error: {ex.Message}",
                    latencyMs = sw.ElapsedMilliseconds
                });
            }
        }

        private static string CleanJsonFences(string text)
        {
            if (string.IsNullOrWhiteSpace(text)) return "{}";
            var trimmed = text.Trim();
            if (trimmed.StartsWith("```json", StringComparison.OrdinalIgnoreCase))
            {
                trimmed = trimmed.Substring(7);
            }
            else if (trimmed.StartsWith("```", StringComparison.OrdinalIgnoreCase))
            {
                trimmed = trimmed.Substring(3);
            }
            if (trimmed.EndsWith("```", StringComparison.OrdinalIgnoreCase))
            {
                trimmed = trimmed.Substring(0, trimmed.Length - 3);
            }
            return trimmed.Trim();
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

        /// <summary>
        /// Handles HTTP POST requests to test candidate connection string parameters before saving.
        /// </summary>
        /// <param name="request">The candidate connection parameters.</param>
        /// <returns>JSON result with latency, version, and connectivity status.</returns>
        public async Task<IActionResult> OnPostTestConnectionStringAsync([FromBody] TestConnectionRequest request)
        {
            if (request == null)
            {
                return new JsonResult(new { success = false, message = "Invalid connection test request payload." });
            }

            string testConnStr;
            try
            {
                testConnStr = await BuildCandidateConnectionStringAsync(
                    request.TenantKey, request.Mode, request.Server, request.DatabaseName,
                    request.AuthType, request.UserId, request.Password,
                    request.TrustServerCertificate, request.MultipleActiveResultSets,
                    request.RawConnectionString);
            }
            catch (Exception ex)
            {
                return new JsonResult(new { success = false, message = $"Configuration error: {ex.Message}" });
            }

            var sw = Stopwatch.StartNew();
            try
            {
                using var conn = new SqlConnection(testConnStr);
                using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(7));
                await conn.OpenAsync(cts.Token);

                using var cmd = conn.CreateCommand();
                cmd.CommandText = "SELECT @@VERSION;";
                var versionObj = await cmd.ExecuteScalarAsync(cts.Token);
                sw.Stop();

                var fullVersion = versionObj?.ToString() ?? "SQL Server";
                var firstLine = fullVersion.Split('\n')[0].Trim();

                return new JsonResult(new
                {
                    success = true,
                    latencyMs = sw.ElapsedMilliseconds,
                    serverVersion = firstLine,
                    databaseName = conn.Database,
                    dataSource = conn.DataSource,
                    message = $"Connection verified in {sw.ElapsedMilliseconds}ms! Connected to {conn.DataSource} [{conn.Database}]."
                });
            }
            catch (SqlException ex)
            {
                sw.Stop();
                string hint = ex.Number switch
                {
                    18456 => "Login failed for user. Please check your SQL Username and Password.",
                    4060 => $"Database '{request.DatabaseName}' cannot be opened or does not exist on this SQL instance.",
                    53 => "Network path not found. Please verify the Server host IP/name and ensure port 1433 is open.",
                    _ when ex.Message.Contains("actively refused it") => "Port 1433 actively refused. Verify that SQL Server is running, TCP/IP is enabled in SQL Configuration Manager, and VPS firewall allows port 1433.",
                    _ => ex.Message
                };

                return new JsonResult(new
                {
                    success = false,
                    latencyMs = sw.ElapsedMilliseconds,
                    errorCode = ex.Number,
                    message = hint
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
        /// Handles HTTP POST requests to update and encrypt a tenant's database connection string.
        /// </summary>
        /// <param name="input">The validated connection input model.</param>
        /// <returns>Redirect back to database details page with success or error notification.</returns>
        public async Task<IActionResult> OnPostUpdateConnectionStringAsync([FromForm] UpdateConnectionStringInputModel input)
        {
            if (input == null || string.IsNullOrWhiteSpace(input.TenantKey))
            {
                TempData["Error"] = "Tenant key is required to update connection settings.";
                return RedirectToPage(new { tenantKey = input?.TenantKey });
            }

            var tenant = await _dbContext.MasterTenantCatalogs.FirstOrDefaultAsync(t => t.TenantKey == input.TenantKey);
            if (tenant == null)
            {
                TempData["Error"] = "Tenant organization not found.";
                return RedirectToPage("/Tenants/Databases/Index");
            }

            string newConnStr;
            try
            {
                newConnStr = await BuildCandidateConnectionStringAsync(
                    input.TenantKey, input.Mode, input.Server, input.DatabaseName,
                    input.AuthType, input.UserId, input.Password,
                    input.TrustServerCertificate, input.MultipleActiveResultSets,
                    input.RawConnectionString);
            }
            catch (Exception ex)
            {
                TempData["Error"] = $"Invalid connection string format: {ex.Message}";
                return RedirectToPage(new { tenantKey = input.TenantKey });
            }

            // Optional pre-save connectivity verification
            if (input.TestBeforeSaving)
            {
                try
                {
                    using var testConn = new SqlConnection(newConnStr);
                    using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(7));
                    await testConn.OpenAsync(cts.Token);
                }
                catch (Exception ex)
                {
                    TempData["Error"] = $"Cannot save unreachable connection string: {ex.Message}. Uncheck 'Test connection before saving' if you want to force save while offline.";
                    return RedirectToPage(new { tenantKey = input.TenantKey });
                }
            }

            // Synchronize database name if altered
            try
            {
                var builder = new SqlConnectionStringBuilder(newConnStr);
                if (!string.IsNullOrWhiteSpace(builder.InitialCatalog))
                {
                    tenant.DatabaseName = builder.InitialCatalog;
                }
            }
            catch
            {
                // Preserve current database name on parse discrepancy
            }

            // Assign new connection string (MasterCatalogDbContext transparently re-encrypts with AES-256-GCM upon SaveChanges)
            tenant.ConnectionString = newConnStr;
            tenant.UpdatedUtc = DateTime.UtcNow;

            await _dbContext.SaveChangesAsync();

            // Evict cache across cluster so API picks up the new connection immediately
            var cacheInvalidator = HttpContext.RequestServices.GetService<ITenantCacheInvalidator>();
            if (cacheInvalidator != null)
            {
                await cacheInvalidator.InvalidateTenantCatalogAsync(tenant.TenantKey);
            }

            _logger.LogInformation("Central Admin successfully updated database connection for tenant {TenantKey} -> {Host}", tenant.TenantKey, tenant.DatabaseName);

            TempData["Success"] = $"Database connection for '{tenant.OrganizationName}' ({tenant.TenantKey}) updated and encrypted with AES-256-GCM successfully.";
            return RedirectToPage(new { tenantKey = input.TenantKey });
        }

        private async Task<string> BuildCandidateConnectionStringAsync(
            string? tenantKey, string mode, string? server, string? databaseName,
            string authType, string? userId, string? password,
            bool trustServerCert, bool mars, string? rawConnStr)
        {
            if (string.Equals(mode, "Raw", StringComparison.OrdinalIgnoreCase))
            {
                if (string.IsNullOrWhiteSpace(rawConnStr))
                {
                    throw new InvalidOperationException("Raw connection string cannot be empty.");
                }
                var rawBuilder = new SqlConnectionStringBuilder(rawConnStr.Trim());
                return rawBuilder.ConnectionString;
            }

            if (string.IsNullOrWhiteSpace(server))
            {
                throw new InvalidOperationException("Server host or IP address is required.");
            }

            if (string.IsNullOrWhiteSpace(databaseName))
            {
                throw new InvalidOperationException("Database name is required.");
            }

            // Retrieve existing tenant to preserve current password if not provided
            string existingPassword = string.Empty;
            if (!string.IsNullOrWhiteSpace(tenantKey))
            {
                var currentTenant = await _dbContext.MasterTenantCatalogs.AsNoTracking().FirstOrDefaultAsync(t => t.TenantKey == tenantKey);
                if (currentTenant != null && !string.IsNullOrWhiteSpace(currentTenant.ConnectionString))
                {
                    try
                    {
                        var currBuilder = new SqlConnectionStringBuilder(currentTenant.ConnectionString);
                        existingPassword = currBuilder.Password;
                    }
                    catch { }
                }
            }

            var builder = new SqlConnectionStringBuilder
            {
                DataSource = server.Trim(),
                InitialCatalog = databaseName.Trim(),
                TrustServerCertificate = trustServerCert,
                MultipleActiveResultSets = mars,
                PersistSecurityInfo = true
            };

            if (string.Equals(authType, "Windows", StringComparison.OrdinalIgnoreCase))
            {
                builder.IntegratedSecurity = true;
            }
            else
            {
                if (string.IsNullOrWhiteSpace(userId))
                {
                    throw new InvalidOperationException("SQL Username is required for SQL Server Authentication.");
                }
                builder.UserID = userId.Trim();
                builder.Password = !string.IsNullOrEmpty(password) ? password : existingPassword;
            }

            return builder.ConnectionString;
        }
    }

    /// <summary>
    /// Input model for updating a tenant's database connection string.
    /// </summary>
    public class UpdateConnectionStringInputModel
    {
        /// <summary>
        /// Target tenant key.
        /// </summary>
        [Required]
        public string TenantKey { get; set; } = string.Empty;

        /// <summary>
        /// Configuration mode: 'Structured' or 'Raw'.
        /// </summary>
        public string Mode { get; set; } = "Structured";

        /// <summary>
        /// SQL Server host or IP and port (e.g. '2.24.162.42,1433' or 'localhost\\SQLEXPRESS').
        /// </summary>
        public string? Server { get; set; }

        /// <summary>
        /// Database name (e.g. 'Ozikol_Tenant_xxx').
        /// </summary>
        public string? DatabaseName { get; set; }

        /// <summary>
        /// Authentication type: 'Sql' or 'Windows'.
        /// </summary>
        public string AuthType { get; set; } = "Sql";

        /// <summary>
        /// SQL Server User ID / Login name.
        /// </summary>
        public string? UserId { get; set; }

        /// <summary>
        /// SQL Server Password. If left blank, existing password is preserved.
        /// </summary>
        public string? Password { get; set; }

        /// <summary>
        /// Whether to trust server certificate (recommended true for cloud/VPS TLS).
        /// </summary>
        public bool TrustServerCertificate { get; set; } = true;

        /// <summary>
        /// Whether to enable Multiple Active Result Sets.
        /// </summary>
        public bool MultipleActiveResultSets { get; set; } = true;

        /// <summary>
        /// Raw connection string when Mode is 'Raw'.
        /// </summary>
        public string? RawConnectionString { get; set; }

        /// <summary>
        /// Whether to test connectivity before applying the update.
        /// </summary>
        public bool TestBeforeSaving { get; set; } = true;
    }

    /// <summary>
    /// Request model for testing candidate connection strings via AJAX.
    /// </summary>
    public class TestConnectionRequest
    {
        /// <summary>
        /// Target tenant key.
        /// </summary>
        public string? TenantKey { get; set; }

        /// <summary>
        /// Configuration mode: 'Structured' or 'Raw'.
        /// </summary>
        public string Mode { get; set; } = "Structured";

        /// <summary>
        /// SQL Server host or IP and port.
        /// </summary>
        public string? Server { get; set; }

        /// <summary>
        /// Target database name.
        /// </summary>
        public string? DatabaseName { get; set; }

        /// <summary>
        /// Authentication type: 'Sql' or 'Windows'.
        /// </summary>
        public string AuthType { get; set; } = "Sql";

        /// <summary>
        /// SQL Server User ID.
        /// </summary>
        public string? UserId { get; set; }

        /// <summary>
        /// SQL Server Password.
        /// </summary>
        public string? Password { get; set; }

        /// <summary>
        /// Whether to trust server certificate.
        /// </summary>
        public bool TrustServerCertificate { get; set; } = true;

        /// <summary>
        /// Whether to enable Multiple Active Result Sets.
        /// </summary>
        public bool MultipleActiveResultSets { get; set; } = true;

        /// <summary>
        /// Raw connection string when Mode is 'Raw'.
        /// </summary>
        public string? RawConnectionString { get; set; }
    }
}
