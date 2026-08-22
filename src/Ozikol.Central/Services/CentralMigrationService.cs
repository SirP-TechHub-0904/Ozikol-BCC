using System.Data;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Infrastructure.TenantSupport;
using Ozikol_BCC.Persistence.EF.SQL;

namespace Ozikol.Central.Services;

public class DatabaseMigrationStatus
{
    public string DatabaseName { get; set; } = string.Empty;
    public string ContextName { get; set; } = string.Empty;
    public bool IsReachable { get; set; }
    public List<string> AppliedMigrations { get; set; } = new();
    public List<string> PendingMigrations { get; set; } = new();
    public bool HasPendingMigrations => PendingMigrations.Count > 0;
    public string? ErrorMessage { get; set; }
}

public class TenantTableStat
{
    public string SchemaName { get; set; } = "dbo";
    public string TableName { get; set; } = string.Empty;
    public string FullName => $"{SchemaName}.{TableName}";
    public long TotalRows { get; set; }
    public long UsedSpaceKb { get; set; }

    public string FormattedRows => TotalRows switch
    {
        1 => "1 record",
        _ => $"{TotalRows:N0} records"
    };

    public string FormattedStorage
    {
        get
        {
            if (UsedSpaceKb < 1024)
                return $"{UsedSpaceKb} KB";
            double mb = UsedSpaceKb / 1024.0;
            return $"{mb:F1} MB";
        }
    }
}

public class TenantMigrationSummary
{
    public int Id { get; set; }
    public string TenantKey { get; set; } = string.Empty;
    public string OrganizationName { get; set; } = string.Empty;
    public string PrimaryDomain { get; set; } = string.Empty;
    public string? CustomDomain { get; set; }
    public string DatabaseName { get; set; } = string.Empty;
    public string ConnectionString { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public DateTime CreatedUtc { get; set; }
    public int TotalTablesCount { get; set; }
    public long TotalRecordsCount { get; set; }
    public DatabaseMigrationStatus Status { get; set; } = new();

    public string FormattedTotalRecords => TotalRecordsCount switch
    {
        1 => "1 record",
        _ => $"{TotalRecordsCount:N0} records"
    };
}

public class TenantDatabaseDeepDive
{
    public TenantMigrationSummary Tenant { get; set; } = new();
    public int TotalTablesCount { get; set; }
    public long TotalRecordsCount { get; set; }
    public long TotalStorageKb { get; set; }
    public List<TenantTableStat> Tables { get; set; } = new();
    public List<string> AppliedMigrations { get; set; } = new();
    public List<string> PendingMigrations { get; set; } = new();
    public bool HasPendingMigrations => PendingMigrations.Count > 0;
    public bool IsReachable { get; set; }
    public string? ErrorMessage { get; set; }

    public string FormattedTotalRecords => TotalRecordsCount switch
    {
        1 => "1 record",
        _ => $"{TotalRecordsCount:N0} records"
    };

    public string FormattedTotalStorage
    {
        get
        {
            if (TotalStorageKb < 1024)
                return $"{TotalStorageKb} KB";
            double mb = TotalStorageKb / 1024.0;
            if (mb >= 1024)
                return $"{mb / 1024.0:F2} GB";
            return $"{mb:F1} MB";
        }
    }
}

public class MasterMigrationSummary
{
    public string DatabaseName { get; set; } = "Ozikol_MasterCatalogDb";
    public DatabaseMigrationStatus Status { get; set; } = new();
    public int TotalTenantsCount { get; set; }
    public int SyncedTenantsCount { get; set; }
    public int PendingTenantsCount { get; set; }
    public int ErrorTenantsCount { get; set; }
    public long TotalFleetRecordsCount { get; set; }
}

public class MigrationExecutionResult
{
    public bool Success { get; set; }
    public string TargetName { get; set; } = string.Empty;
    public string DatabaseName { get; set; } = string.Empty;
    public List<string> MigrationsApplied { get; set; } = new();
    public string Message { get; set; } = string.Empty;
    public string? ErrorDetail { get; set; }
}

public class BatchMigrationExecutionResult
{
    public bool AllSucceeded { get; set; }
    public int TotalProcessed { get; set; }
    public int SucceededCount { get; set; }
    public int FailedCount { get; set; }
    public List<MigrationExecutionResult> Details { get; set; } = new();
}

public interface ICentralMigrationService
{
    Task<MasterMigrationSummary> GetMasterMigrationStatusAsync(CancellationToken cancellationToken = default);
    Task<List<TenantMigrationSummary>> GetAllTenantMigrationStatusesAsync(CancellationToken cancellationToken = default);
    Task<TenantDatabaseDeepDive?> GetTenantDeepDiveAsync(string tenantKey, CancellationToken cancellationToken = default);
    Task<MigrationExecutionResult> MigrateMasterDatabaseAsync(CancellationToken cancellationToken = default);
    Task<MigrationExecutionResult> MigrateTenantDatabaseAsync(string tenantKey, CancellationToken cancellationToken = default);
    Task<BatchMigrationExecutionResult> MigrateAllTenantsBatchAsync(CancellationToken cancellationToken = default);
}

public class CentralMigrationService : ICentralMigrationService
{
    private readonly MasterCatalogDbContext _masterCatalogDbContext;
    private readonly IOptions<TenantConfigurationOptions> _tenantOptions;
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<CentralMigrationService> _logger;

    public CentralMigrationService(
        MasterCatalogDbContext masterCatalogDbContext,
        IOptions<TenantConfigurationOptions> tenantOptions,
        IServiceProvider serviceProvider,
        ILogger<CentralMigrationService> logger)
    {
        _masterCatalogDbContext = masterCatalogDbContext;
        _tenantOptions = tenantOptions;
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    public async Task<MasterMigrationSummary> GetMasterMigrationStatusAsync(CancellationToken cancellationToken = default)
    {
        var summary = new MasterMigrationSummary();
        var status = new DatabaseMigrationStatus
        {
            ContextName = nameof(MasterCatalogDbContext)
        };

        var masterConnStr = _masterCatalogDbContext.Database.GetConnectionString() 
            ?? _tenantOptions.Value.ConnectionString 
            ?? string.Empty;

        var builder = new SqlConnectionStringBuilder(masterConnStr);
        status.DatabaseName = string.IsNullOrWhiteSpace(builder.InitialCatalog) ? "Ozikol_MasterCatalogDb" : builder.InitialCatalog;
        summary.DatabaseName = status.DatabaseName;

        try
        {
            var canConnect = await _masterCatalogDbContext.Database.CanConnectAsync(cancellationToken);
            status.IsReachable = canConnect;

            if (canConnect)
            {
                var applied = await _masterCatalogDbContext.Database.GetAppliedMigrationsAsync(cancellationToken);
                var pending = await _masterCatalogDbContext.Database.GetPendingMigrationsAsync(cancellationToken);

                status.AppliedMigrations = applied.ToList();
                status.PendingMigrations = pending.ToList();

                var tenants = await _masterCatalogDbContext.MasterTenantCatalogs
                    .AsNoTracking()
                    .ToListAsync(cancellationToken);

                summary.TotalTenantsCount = tenants.Count;
            }
            else
            {
                status.ErrorMessage = "Cannot connect to Master Catalog SQL Server database.";
            }
        }
        catch (Exception ex)
        {
            status.IsReachable = false;
            status.ErrorMessage = ex.Message;
            _logger.LogError(ex, "Error checking Master DB status");
        }

        summary.Status = status;
        return summary;
    }

    public async Task<List<TenantMigrationSummary>> GetAllTenantMigrationStatusesAsync(CancellationToken cancellationToken = default)
    {
        var results = new List<TenantMigrationSummary>();

        List<MasterTenantCatalog> tenants;
        try
        {
            tenants = await _masterCatalogDbContext.MasterTenantCatalogs
                .AsNoTracking()
                .OrderBy(t => t.TenantKey)
                .ToListAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load tenants list from MasterCatalogDbContext");
            return results;
        }

        var masterConnStr = _masterCatalogDbContext.Database.GetConnectionString()
            ?? _tenantOptions.Value.ConnectionString
            ?? string.Empty;

        foreach (var tenant in tenants)
        {
            var tenantSummary = new TenantMigrationSummary
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
            };

            string tenantConnStr = !string.IsNullOrWhiteSpace(tenant.ConnectionString)
                ? tenant.ConnectionString
                : BuildTenantConnectionString(masterConnStr, tenant.DatabaseName);

            var dbStatus = new DatabaseMigrationStatus
            {
                DatabaseName = tenant.DatabaseName,
                ContextName = nameof(DashboardDbContext)
            };

            try
            {
                var optionsBuilder = new DbContextOptionsBuilder<DashboardDbContext>();
                optionsBuilder.UseSqlServer(tenantConnStr)
                    .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning));

                using var scope = _serviceProvider.CreateScope();
                var tenantProvider = scope.ServiceProvider.GetRequiredService<ITenantProvider>();

                using (tenantProvider.BeginScope(tenantConnStr))
                {
                    var dbContext = new DashboardDbContext(optionsBuilder.Options, tenantProvider, null);
                    var canConnect = await dbContext.Database.CanConnectAsync(cancellationToken);
                    dbStatus.IsReachable = canConnect;

                    if (canConnect)
                    {
                        var applied = await dbContext.Database.GetAppliedMigrationsAsync(cancellationToken);
                        var pending = await dbContext.Database.GetPendingMigrationsAsync(cancellationToken);

                        dbStatus.AppliedMigrations = applied.ToList();
                        dbStatus.PendingMigrations = pending.ToList();

                        // Fast DMV table and row counts
                        var stats = await GetTableStatsFromConnectionAsync(tenantConnStr, cancellationToken);
                        tenantSummary.TotalTablesCount = stats.Count;
                        tenantSummary.TotalRecordsCount = stats.Sum(s => s.TotalRows);
                    }
                    else
                    {
                        dbStatus.ErrorMessage = "Tenant database is unreachable or does not exist.";
                    }
                }
            }
            catch (Exception ex)
            {
                dbStatus.IsReachable = false;
                dbStatus.ErrorMessage = ex.Message;
            }

            tenantSummary.Status = dbStatus;
            results.Add(tenantSummary);
        }

        return results;
    }

    public async Task<TenantDatabaseDeepDive?> GetTenantDeepDiveAsync(string tenantKey, CancellationToken cancellationToken = default)
    {
        var cleanKey = tenantKey.Trim().ToLowerInvariant();
        var tenant = await _masterCatalogDbContext.MasterTenantCatalogs
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.TenantKey == cleanKey, cancellationToken);

        if (tenant == null)
            return null;

        var masterConnStr = _masterCatalogDbContext.Database.GetConnectionString()
            ?? _tenantOptions.Value.ConnectionString
            ?? string.Empty;

        string tenantConnStr = !string.IsNullOrWhiteSpace(tenant.ConnectionString)
            ? tenant.ConnectionString
            : BuildTenantConnectionString(masterConnStr, tenant.DatabaseName);

        var deepDive = new TenantDatabaseDeepDive
        {
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

        try
        {
            var optionsBuilder = new DbContextOptionsBuilder<DashboardDbContext>();
            optionsBuilder.UseSqlServer(tenantConnStr)
                .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning));

            using var scope = _serviceProvider.CreateScope();
            var tenantProvider = scope.ServiceProvider.GetRequiredService<ITenantProvider>();

            using (tenantProvider.BeginScope(tenantConnStr))
            {
                var dbContext = new DashboardDbContext(optionsBuilder.Options, tenantProvider, null);
                var canConnect = await dbContext.Database.CanConnectAsync(cancellationToken);
                deepDive.IsReachable = canConnect;
                deepDive.Tenant.Status.IsReachable = canConnect;

                if (canConnect)
                {
                    var applied = await dbContext.Database.GetAppliedMigrationsAsync(cancellationToken);
                    var pending = await dbContext.Database.GetPendingMigrationsAsync(cancellationToken);

                    deepDive.AppliedMigrations = applied.ToList();
                    deepDive.PendingMigrations = pending.ToList();
                    deepDive.Tenant.Status.AppliedMigrations = deepDive.AppliedMigrations;
                    deepDive.Tenant.Status.PendingMigrations = deepDive.PendingMigrations;

                    // Fetch complete table breakdown
                    var stats = await GetTableStatsFromConnectionAsync(tenantConnStr, cancellationToken);
                    deepDive.Tables = stats;
                    deepDive.TotalTablesCount = stats.Count;
                    deepDive.TotalRecordsCount = stats.Sum(s => s.TotalRows);
                    deepDive.TotalStorageKb = stats.Sum(s => s.UsedSpaceKb);

                    deepDive.Tenant.TotalTablesCount = deepDive.TotalTablesCount;
                    deepDive.Tenant.TotalRecordsCount = deepDive.TotalRecordsCount;
                }
                else
                {
                    deepDive.ErrorMessage = "Tenant database is unreachable or offline.";
                }
            }
        }
        catch (Exception ex)
        {
            deepDive.IsReachable = false;
            deepDive.ErrorMessage = ex.Message;
            _logger.LogError(ex, "Failed to get deep dive for tenant [{TenantKey}]", cleanKey);
        }

        return deepDive;
    }

    public async Task<MigrationExecutionResult> MigrateMasterDatabaseAsync(CancellationToken cancellationToken = default)
    {
        var result = new MigrationExecutionResult
        {
            TargetName = "Master Catalog Database",
            DatabaseName = "Ozikol_MasterCatalogDb"
        };

        try
        {
            var pending = (await _masterCatalogDbContext.Database.GetPendingMigrationsAsync(cancellationToken)).ToList();
            if (pending.Count == 0)
            {
                result.Success = true;
                result.Message = "Master Database is already up to date. No pending migrations.";
                return result;
            }

            await _masterCatalogDbContext.Database.MigrateAsync(cancellationToken);
            result.Success = true;
            result.MigrationsApplied = pending;
            result.Message = $"Successfully applied {pending.Count} migration(s) to Master Database.";
        }
        catch (Exception ex)
        {
            result.Success = false;
            result.Message = $"Migration failed for Master Database: {ex.Message}";
            result.ErrorDetail = ex.ToString();
            _logger.LogError(ex, "Failed to migrate Master Catalog Database");
        }

        return result;
    }

    public async Task<MigrationExecutionResult> MigrateTenantDatabaseAsync(string tenantKey, CancellationToken cancellationToken = default)
    {
        var cleanKey = tenantKey.Trim().ToLowerInvariant();
        var tenant = await _masterCatalogDbContext.MasterTenantCatalogs
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.TenantKey == cleanKey, cancellationToken);

        if (tenant == null)
        {
            return new MigrationExecutionResult
            {
                Success = false,
                TargetName = cleanKey,
                Message = $"Tenant '{cleanKey}' not found in Master Catalog."
            };
        }

        var masterConnStr = _masterCatalogDbContext.Database.GetConnectionString()
            ?? _tenantOptions.Value.ConnectionString
            ?? string.Empty;

        string tenantConnStr = !string.IsNullOrWhiteSpace(tenant.ConnectionString)
            ? tenant.ConnectionString
            : BuildTenantConnectionString(masterConnStr, tenant.DatabaseName);

        var result = new MigrationExecutionResult
        {
            TargetName = $"{tenant.OrganizationName} ({tenant.TenantKey})",
            DatabaseName = tenant.DatabaseName
        };

        try
        {
            var optionsBuilder = new DbContextOptionsBuilder<DashboardDbContext>();
            optionsBuilder.UseSqlServer(tenantConnStr)
                .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning));

            using var scope = _serviceProvider.CreateScope();
            var tenantProvider = scope.ServiceProvider.GetRequiredService<ITenantProvider>();

            using (tenantProvider.BeginScope(tenantConnStr))
            {
                var dbContext = new DashboardDbContext(optionsBuilder.Options, tenantProvider, null);
                var pending = (await dbContext.Database.GetPendingMigrationsAsync(cancellationToken)).ToList();

                if (pending.Count == 0)
                {
                    result.Success = true;
                    result.Message = "Tenant database is already fully synced. No pending migrations.";
                    return result;
                }

                await dbContext.Database.MigrateAsync(cancellationToken);
                result.Success = true;
                result.MigrationsApplied = pending;
                result.Message = $"Successfully applied {pending.Count} migration(s) to tenant database [{tenant.DatabaseName}].";
            }
        }
        catch (Exception ex)
        {
            result.Success = false;
            result.Message = $"Migration failed for tenant [{tenant.TenantKey}]: {ex.Message}";
            result.ErrorDetail = ex.ToString();
            _logger.LogError(ex, "Failed to migrate tenant [{TenantKey}]", tenant.TenantKey);
        }

        return result;
    }

    public async Task<BatchMigrationExecutionResult> MigrateAllTenantsBatchAsync(CancellationToken cancellationToken = default)
    {
        var batchResult = new BatchMigrationExecutionResult();

        var tenants = await _masterCatalogDbContext.MasterTenantCatalogs
            .AsNoTracking()
            .Where(t => t.IsActive)
            .OrderBy(t => t.TenantKey)
            .ToListAsync(cancellationToken);

        batchResult.TotalProcessed = tenants.Count;

        foreach (var tenant in tenants)
        {
            var result = await MigrateTenantDatabaseAsync(tenant.TenantKey, cancellationToken);
            batchResult.Details.Add(result);
            if (result.Success)
            {
                batchResult.SucceededCount++;
            }
            else
            {
                batchResult.FailedCount++;
            }
        }

        batchResult.AllSucceeded = batchResult.FailedCount == 0;
        return batchResult;
    }

    private static async Task<List<TenantTableStat>> GetTableStatsFromConnectionAsync(string connectionString, CancellationToken cancellationToken)
    {
        var list = new List<TenantTableStat>();

        const string sql = @"
            SELECT 
                t.name AS TableName,
                s.name AS SchemaName,
                SUM(p.record_count) AS TotalRows,
                SUM(p.used_page_count) * 8 AS UsedSpaceKB
            FROM sys.tables t
            INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
            INNER JOIN sys.dm_db_partition_stats p ON t.object_id = p.object_id
            WHERE p.index_id IN (0, 1) AND t.is_ms_shipped = 0
            GROUP BY t.name, s.name
            ORDER BY TotalRows DESC, t.name ASC;
        ";

        using var connection = new SqlConnection(connectionString);
        await connection.OpenAsync(cancellationToken);

        using var command = new SqlCommand(sql, connection);
        using var reader = await command.ExecuteReaderAsync(CommandBehavior.CloseConnection, cancellationToken);

        while (await reader.ReadAsync(cancellationToken))
        {
            list.Add(new TenantTableStat
            {
                TableName = reader.GetString(0),
                SchemaName = reader.GetString(1),
                TotalRows = reader.IsDBNull(2) ? 0 : reader.GetInt64(2),
                UsedSpaceKb = reader.IsDBNull(3) ? 0 : reader.GetInt64(3)
            });
        }

        return list;
    }

    private static string BuildTenantConnectionString(string masterConnStr, string targetDbName)
    {
        var builder = new SqlConnectionStringBuilder(masterConnStr)
        {
            InitialCatalog = targetDbName
        };
        return builder.ConnectionString;
    }
}
