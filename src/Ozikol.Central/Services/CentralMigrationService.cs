using System.Data;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterDomain.Security;
using Ozikol.MasterPersistence.EF.MasterSQL;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Infrastructure.Caching;
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
    public Guid Id { get; set; }
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
    public long TotalStorageKb { get; set; }
    public DatabaseMigrationStatus Status { get; set; } = new();

    public string FormattedTotalRecords => TotalRecordsCount switch
    {
        1 => "1 record",
        _ => $"{TotalRecordsCount:N0} records"
    };

    public string FormattedTotalStorage
    {
        get
        {
            if (TotalStorageKb <= 0) return "0 KB";
            if (TotalStorageKb < 1024) return $"{TotalStorageKb:N0} KB";
            var mb = TotalStorageKb / 1024.0;
            if (mb < 1024) return $"{mb:F1} MB";
            var gb = mb / 1024.0;
            return $"{gb:F2} GB";
        }
    }
}

/// <summary>
/// Model representing single day of the week record activity.
/// </summary>
public class DayActivityItem
{
    /// <summary>
    /// Name of the day (e.g., "Monday", "Tuesday", etc.).
    /// </summary>
    public string DayName { get; set; } = string.Empty;

    /// <summary>
    /// Short 3-letter abbreviation (e.g., "Mon", "Tue").
    /// </summary>
    public string ShortName => DayName.Length >= 3 ? DayName.Substring(0, 3) : DayName;

    /// <summary>
    /// Total records inserted on this day of the week.
    /// </summary>
    public long RecordCount { get; set; }

    /// <summary>
    /// Relative percentage of total weekly volume.
    /// </summary>
    public double Percentage { get; set; }

    /// <summary>
    /// True if this day is the peak activity day of the week.
    /// </summary>
    public bool IsPeak { get; set; }
}

/// <summary>
/// Model representing single hour of the day record ingestion.
/// </summary>
public class HourActivityItem
{
    /// <summary>
    /// 24-hour index (0 to 23).
    /// </summary>
    public int Hour { get; set; }

    /// <summary>
    /// Formatted time label (e.g., "00:00", "09:00", "14:00").
    /// </summary>
    public string Label => $"{Hour:D2}:00";

    /// <summary>
    /// Formatted display string in 12-hour clock (e.g. "9 AM", "2 PM").
    /// </summary>
    public string DisplayLabel
    {
        get
        {
            if (Hour == 0) return "12 AM";
            if (Hour < 12) return $"{Hour} AM";
            if (Hour == 12) return "12 PM";
            return $"{Hour - 12} PM";
        }
    }

    /// <summary>
    /// Total records inserted during this hour window.
    /// </summary>
    public long RecordCount { get; set; }

    /// <summary>
    /// Relative percentage of hourly peak.
    /// </summary>
    public double Percentage { get; set; }

    /// <summary>
    /// True if this hour is the single peak hour.
    /// </summary>
    public bool IsPeak { get; set; }
}

/// <summary>
/// Diagnostic distribution analyzing tenant record creation by day of week and hour of day.
/// </summary>
public class TenantActivityDistribution
{
    /// <summary>
    /// 7-day breakdown (Monday to Sunday).
    /// </summary>
    public List<DayActivityItem> WeeklyDistribution { get; set; } = new();

    /// <summary>
    /// 24-hour curve (00:00 to 23:00).
    /// </summary>
    public List<HourActivityItem> HourlyDistribution { get; set; } = new();

    /// <summary>
    /// The busiest weekday name (e.g. "Wednesday").
    /// </summary>
    public string PeakDay { get; set; } = "N/A";

    /// <summary>
    /// The peak 2-hour window (e.g. "2:00 PM – 4:00 PM UTC").
    /// </summary>
    public string PeakHourWindow { get; set; } = "N/A";

    /// <summary>
    /// Total records analyzed across timestamped tables.
    /// </summary>
    public long TotalAnalyzedRecords { get; set; }

    /// <summary>
    /// Number of tables with timestamp telemetry detected.
    /// </summary>
    public int TrackedTablesCount { get; set; }

    /// <summary>
    /// Indicates whether timestamp telemetry is present.
    /// </summary>
    public bool HasData => TotalAnalyzedRecords > 0;
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
    public TenantActivityDistribution ActivityDistribution { get; set; } = new();

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
    /// <summary>
    /// Total count of platform and tenant records monitored.
    /// </summary>
    public long TotalPlatformRecordsCount { get; set; }
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

public class ConnectionStringsEncryptionStatus
{
    public int TotalDatabases { get; set; }
    public int EncryptedCount { get; set; }
    public int UnencryptedCount { get; set; }
    public bool IsFullyEncrypted => UnencryptedCount == 0 && TotalDatabases > 0;
    public string EncryptionAlgorithm { get; set; } = "AES-256-GCM (Authenticated 256-bit)";
}

public class ConnectionStringsEncryptionResult
{
    public bool Success { get; set; }
    public int TotalScanned { get; set; }
    public int NewlyEncryptedCount { get; set; }
    public int AlreadyEncryptedCount { get; set; }
    public string Message { get; set; } = string.Empty;
    public List<string> EncryptedDatabases { get; set; } = new();
}

public interface ICentralMigrationService
{
    Task<MasterMigrationSummary> GetMasterMigrationStatusAsync(CancellationToken cancellationToken = default);
    Task<List<TenantMigrationSummary>> GetAllTenantMigrationStatusesAsync(CancellationToken cancellationToken = default);
    Task<TenantDatabaseDeepDive?> GetTenantDeepDiveAsync(string tenantKey, CancellationToken cancellationToken = default);
    Task<MigrationExecutionResult> MigrateMasterDatabaseAsync(CancellationToken cancellationToken = default);
    Task<MigrationExecutionResult> MigrateTenantDatabaseAsync(string tenantKey, CancellationToken cancellationToken = default);
    Task<BatchMigrationExecutionResult> MigrateAllTenantsBatchAsync(CancellationToken cancellationToken = default);
    Task<ConnectionStringsEncryptionStatus> GetConnectionStringsEncryptionStatusAsync(CancellationToken cancellationToken = default);
    Task<ConnectionStringsEncryptionResult> EncryptAllUnencryptedConnectionStringsAsync(CancellationToken cancellationToken = default);
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
        status.DatabaseName = string.IsNullOrWhiteSpace(builder.InitialCatalog) ? "CatalogDb" : builder.InitialCatalog;
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

            string tenantConnStr = TenantConnectionHarmonizer.Harmonize(masterConnStr, tenant.ConnectionString, tenant.DatabaseName);

            var dbStatus = new DatabaseMigrationStatus
            {
                DatabaseName = tenant.DatabaseName,
                ContextName = nameof(DashboardDbContext)
            };

            try
            {
                var optionsBuilder = new DbContextOptionsBuilder<DashboardDbContext>();
                optionsBuilder.UseSqlServer(tenantConnStr, sql => sql.MigrationsAssembly(typeof(DashboardDbContext).Assembly.FullName))
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
                        tenantSummary.TotalStorageKb = stats.Sum(s => s.UsedSpaceKb);
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

        string tenantConnStr = TenantConnectionHarmonizer.Harmonize(masterConnStr, tenant.ConnectionString, tenant.DatabaseName);

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
            optionsBuilder.UseSqlServer(tenantConnStr, sql => sql.MigrationsAssembly(typeof(DashboardDbContext).Assembly.FullName))
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

                    // Fetch live record creation activity & peak time telemetry
                    var activity = await GetTenantActivityDistributionAsync(tenantConnStr, cancellationToken);
                    deepDive.ActivityDistribution = activity;
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

        string tenantConnStr = TenantConnectionHarmonizer.Harmonize(masterConnStr, tenant.ConnectionString, tenant.DatabaseName);

        var result = new MigrationExecutionResult
        {
            TargetName = $"{tenant.OrganizationName} ({tenant.TenantKey})",
            DatabaseName = tenant.DatabaseName
        };

        try
        {
            var optionsBuilder = new DbContextOptionsBuilder<DashboardDbContext>();
            optionsBuilder.UseSqlServer(tenantConnStr, sql => sql.MigrationsAssembly(typeof(DashboardDbContext).Assembly.FullName))
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
                SUM(p.row_count) AS TotalRows,
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

    private static async Task<TenantActivityDistribution> GetTenantActivityDistributionAsync(string connectionString, CancellationToken cancellationToken)
    {
        var distribution = new TenantActivityDistribution();

        // Initialize 7 days of the week starting from Monday
        var days = new[] { "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday" };
        var dayMap = new Dictionary<string, DayActivityItem>();
        foreach (var d in days)
        {
            var item = new DayActivityItem { DayName = d };
            distribution.WeeklyDistribution.Add(item);
            dayMap[d] = item;
        }

        // Initialize 24 hours of the day (00:00 - 23:00)
        var hourMap = new Dictionary<int, HourActivityItem>();
        for (int h = 0; h < 24; h++)
        {
            var item = new HourActivityItem { Hour = h };
            distribution.HourlyDistribution.Add(item);
            hourMap[h] = item;
        }

        try
        {
            using var connection = new SqlConnection(connectionString);
            await connection.OpenAsync(cancellationToken);

            // Step 1: Discover tables with standard created datetime columns
            const string colDiscoverySql = @"
                SELECT 
                    TABLE_SCHEMA,
                    TABLE_NAME,
                    COLUMN_NAME
                FROM INFORMATION_SCHEMA.COLUMNS
                WHERE COLUMN_NAME IN ('CreatedUtc', 'CreatedAt', 'CreatedDate', 'DateCreated', 'Timestamp', 'CreatedOn', 'Created')
                  AND DATA_TYPE IN ('datetime', 'datetime2', 'datetimeoffset', 'smalldatetime')
                  AND TABLE_NAME NOT LIKE '__EF%'
                  AND TABLE_NAME NOT LIKE 'sys%'
            ";

            var targetColumns = new List<(string Schema, string Table, string Column)>();
            using (var colCmd = new SqlCommand(colDiscoverySql, connection))
            using (var colReader = await colCmd.ExecuteReaderAsync(cancellationToken))
            {
                while (await colReader.ReadAsync(cancellationToken))
                {
                    targetColumns.Add((colReader.GetString(0), colReader.GetString(1), colReader.GetString(2)));
                }
            }

            distribution.TrackedTablesCount = targetColumns.Count;
            if (targetColumns.Count == 0)
            {
                return distribution;
            }

            // Step 2: Build dynamic non-blocking UNION ALL aggregation
            var unionQueries = new List<string>();
            foreach (var (schema, table, column) in targetColumns)
            {
                unionQueries.Add($@"
                    SELECT 
                        DATEPART(weekday, [{column}]) AS Dw,
                        DATEPART(hour, [{column}]) AS Hr,
                        COUNT(1) AS Cnt
                    FROM [{schema}].[{table}] WITH (NOLOCK)
                    WHERE [{column}] IS NOT NULL
                    GROUP BY DATEPART(weekday, [{column}]), DATEPART(hour, [{column}])
                ");
            }

            var aggSql = $@"
                SELECT Dw, Hr, SUM(Cnt) AS TotalRecords
                FROM ({string.Join(" UNION ALL ", unionQueries)}) src
                GROUP BY Dw, Hr;
            ";

            using (var aggCmd = new SqlCommand(aggSql, connection))
            using (var aggReader = await aggCmd.ExecuteReaderAsync(cancellationToken))
            {
                while (await aggReader.ReadAsync(cancellationToken))
                {
                    int dw = Convert.ToInt32(aggReader.GetValue(0)); // SQL Server DATEPART(weekday): 1=Sunday, 2=Monday, ..., 7=Saturday
                    int hr = Convert.ToInt32(aggReader.GetValue(1));
                    long count = Convert.ToInt64(aggReader.GetValue(2));

                    string dayName = dw switch
                    {
                        1 => "Sunday",
                        2 => "Monday",
                        3 => "Tuesday",
                        4 => "Wednesday",
                        5 => "Thursday",
                        6 => "Friday",
                        7 => "Saturday",
                        _ => "Monday"
                    };

                    if (dayMap.TryGetValue(dayName, out var dayItem))
                    {
                        dayItem.RecordCount += count;
                    }

                    if (hourMap.TryGetValue(hr, out var hrItem))
                    {
                        hrItem.RecordCount += count;
                    }

                    distribution.TotalAnalyzedRecords += count;
                }
            }

            // Step 3: Compute relative percentages and peak points
            if (distribution.TotalAnalyzedRecords > 0)
            {
                long maxDayRecords = distribution.WeeklyDistribution.Max(d => d.RecordCount);
                if (maxDayRecords > 0)
                {
                    foreach (var d in distribution.WeeklyDistribution)
                    {
                        d.Percentage = (d.RecordCount / (double)maxDayRecords) * 100.0;
                        if (d.RecordCount == maxDayRecords && maxDayRecords > 0)
                        {
                            d.IsPeak = true;
                            distribution.PeakDay = d.DayName;
                        }
                    }
                }

                long maxHourRecords = distribution.HourlyDistribution.Max(h => h.RecordCount);
                if (maxHourRecords > 0)
                {
                    foreach (var h in distribution.HourlyDistribution)
                    {
                        h.Percentage = (h.RecordCount / (double)maxHourRecords) * 100.0;
                        if (h.RecordCount == maxHourRecords && maxHourRecords > 0)
                        {
                            h.IsPeak = true;
                            int nextHour = (h.Hour + 2) % 24;
                            var nextItem = hourMap.TryGetValue(nextHour, out var nh) ? nh : h;
                            distribution.PeakHourWindow = $"{h.DisplayLabel} – {nextItem.DisplayLabel} UTC";
                        }
                    }
                }
            }
        }
        catch
        {
            // Non-blocking telemetry fallback
        }

        return distribution;
    }

    /// <summary>
    /// Computes the encryption status of tenant database connection strings across the platform fleet.
    /// Inspects stored raw SQL values to detect whether they have been upgraded to AES-256-GCM ciphertext (`enc:v1:...`).
    /// </summary>
    public async Task<ConnectionStringsEncryptionStatus> GetConnectionStringsEncryptionStatusAsync(CancellationToken cancellationToken = default)
    {
        var status = new ConnectionStringsEncryptionStatus();
        try
        {
            var conn = _masterCatalogDbContext.Database.GetDbConnection();
            var wasClosed = conn.State != ConnectionState.Open;
            if (wasClosed) await conn.OpenAsync(cancellationToken);

            try
            {
                using var cmd = conn.CreateCommand();
                cmd.CommandText = @"
                    SELECT 
                        COUNT(1) AS TotalCount,
                        SUM(CASE WHEN ConnectionString LIKE 'enc:v1:%' THEN 1 ELSE 0 END) AS EncryptedCount,
                        SUM(CASE WHEN ConnectionString NOT LIKE 'enc:v1:%' AND ConnectionString IS NOT NULL AND LEN(ConnectionString) > 0 THEN 1 ELSE 0 END) AS UnencryptedCount
                    FROM [dbo].[MasterTenantCatalogs]
                    WHERE [IsDeleted] = 0;";

                using var reader = await cmd.ExecuteReaderAsync(cancellationToken);
                if (await reader.ReadAsync(cancellationToken))
                {
                    status.TotalDatabases = reader.IsDBNull(0) ? 0 : Convert.ToInt32(reader[0]);
                    status.EncryptedCount = reader.IsDBNull(1) ? 0 : Convert.ToInt32(reader[1]);
                    status.UnencryptedCount = reader.IsDBNull(2) ? 0 : Convert.ToInt32(reader[2]);
                }
            }
            finally
            {
                if (wasClosed) await conn.CloseAsync();
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to compute connection string encryption metrics.");
        }
        return status;
    }

    /// <summary>
    /// Scans all tenant database connection strings in the Master Catalog Database and converts
    /// any unencrypted plaintext values into authenticated AES-256-GCM ciphertext (`enc:v1:...`) in-place.
    /// Operates directly via parameterized SQL to bypass EF Core change-tracking omissions and updates the cache.
    /// </summary>
    public async Task<ConnectionStringsEncryptionResult> EncryptAllUnencryptedConnectionStringsAsync(CancellationToken cancellationToken = default)
    {
        var result = new ConnectionStringsEncryptionResult();
        try
        {
            var conn = _masterCatalogDbContext.Database.GetDbConnection();
            var wasClosed = conn.State != ConnectionState.Open;
            if (wasClosed) await conn.OpenAsync(cancellationToken);

            try
            {
                // 1. Fetch unencrypted rows directly using raw ADO.NET so EF Core ValueConverter does not interfere
                var unencryptedRows = new List<(Guid Id, string DatabaseName, string RawConnectionString)>();
                using (var selectCmd = conn.CreateCommand())
                {
                    selectCmd.CommandText = @"
                        SELECT [Id], [DatabaseName], [ConnectionString]
                        FROM [dbo].[MasterTenantCatalogs]
                        WHERE [ConnectionString] IS NOT NULL 
                          AND LEN([ConnectionString]) > 0
                          AND [ConnectionString] NOT LIKE 'enc:v1:%';";

                    using var reader = await selectCmd.ExecuteReaderAsync(cancellationToken);
                    while (await reader.ReadAsync(cancellationToken))
                    {
                        unencryptedRows.Add((
                            reader.GetGuid(0),
                            reader.IsDBNull(1) ? string.Empty : reader.GetString(1),
                            reader.GetString(2)
                        ));
                    }
                }

                result.TotalScanned = unencryptedRows.Count;

                // 2. Encrypt each row using OzikolDataCipher.EncryptIfNeeded
                foreach (var row in unencryptedRows)
                {
                    if (string.IsNullOrWhiteSpace(row.RawConnectionString) || row.RawConnectionString.StartsWith(OzikolDataCipher.CipherPrefix, StringComparison.Ordinal))
                    {
                        result.AlreadyEncryptedCount++;
                        continue;
                    }

                    string encrypted = OzikolDataCipher.EncryptIfNeeded(row.RawConnectionString) ?? row.RawConnectionString;

                    using var updateCmd = conn.CreateCommand();
                    updateCmd.CommandText = @"
                        UPDATE [dbo].[MasterTenantCatalogs]
                        SET [ConnectionString] = @enc
                        WHERE [Id] = @id;";

                    var pEnc = updateCmd.CreateParameter();
                    pEnc.ParameterName = "@enc";
                    pEnc.Value = encrypted;
                    updateCmd.Parameters.Add(pEnc);

                    var pId = updateCmd.CreateParameter();
                    pId.ParameterName = "@id";
                    pId.Value = row.Id;
                    updateCmd.Parameters.Add(pId);

                    await updateCmd.ExecuteNonQueryAsync(cancellationToken);

                    result.NewlyEncryptedCount++;
                    result.EncryptedDatabases.Add(row.DatabaseName);
                }

                // 3. Invalidate distributed cache so tenants immediately use refreshed credentials
                var cacheInvalidator = _serviceProvider.GetService<ITenantCacheInvalidator>();
                if (cacheInvalidator != null)
                {
                    await cacheInvalidator.InvalidateTenantCatalogAsync(null);
                }

                result.Success = true;
                result.Message = result.NewlyEncryptedCount > 0
                    ? $"Successfully encrypted {result.NewlyEncryptedCount} tenant database connection strings using authenticated AES-256-GCM."
                    : "All tenant database connection strings are already encrypted.";
            }
            finally
            {
                if (wasClosed) await conn.CloseAsync();
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to encrypt tenant database connection strings.");
            result.Success = false;
            result.Message = $"Encryption failed: {ex.Message}";
        }

        return result;
    }

    private static string BuildTenantConnectionString(string masterConnStr, string targetDbName)
    {
        return TenantConnectionHarmonizer.Harmonize(masterConnStr, null, targetDbName);
    }
}
