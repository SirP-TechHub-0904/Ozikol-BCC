using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;
using Ozikol_BCC.Domain;
using Ozikol_BCC.Infrastructure.TenantSupport;
using Ozikol_BCC.Persistence.EF.SQL;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.Data.SqlClient;
using static Ozikol_BCC.Infrastructure.TenantSupport.TenantConfigurationOptions;

namespace Ozikol_BCC.Persistence.EF.DbMigrator;

public class DbMigratorHostedService : IHostedService
{
    private readonly ILogger<DbMigratorHostedService> _logger;
    private readonly IServiceProvider _serviceProvider;
    private readonly ITenantProvider _tenantProvider;
    private readonly IOptions<TenantConfigurationOptions> _tenantConfigurationOptions;
    private readonly IHostApplicationLifetime _hostApplicationLifetime;
    private readonly IConfiguration _configuration;

    public DbMigratorHostedService(
        ILogger<DbMigratorHostedService> logger, 
        IServiceProvider serviceProvider, 
        ITenantProvider tenantProvider,
        IOptions<TenantConfigurationOptions> tenantConfigurationOptions, 
        IHostApplicationLifetime hostApplicationLifetime, 
        IConfiguration configuration)
    {
        _logger = logger;
        _serviceProvider = serviceProvider;
        _tenantProvider = tenantProvider;
        _tenantConfigurationOptions = tenantConfigurationOptions;
        _hostApplicationLifetime = hostApplicationLifetime;
        _configuration = configuration;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("================================================================");
        _logger.LogInformation("🚀 STARTING MULTI-TENANT DATABASE MIGRATOR");
        _logger.LogInformation("================================================================");

        try
        {
            await MigrateAsync();
        }
        catch (Exception ex)
        {
            _logger.LogCritical(ex, "🔥 CRITICAL ERROR: Unhandled exception in Database Migrator.");
        }
       
        _hostApplicationLifetime.StopApplication();
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    private async Task MigrateAsync()
    {
        var supportedTenants = new List<string>();
        supportedTenants.AddRange(_tenantConfigurationOptions.Value.Tenants.Select(t => t.Name));

        try
        {
            using var scope = _serviceProvider.CreateScope();
            var masterDb = scope.ServiceProvider.GetService<MasterCatalogDbContext>();
            if (masterDb != null)
            {
                var dynamicTenants = await masterDb.MasterTenantCatalogs
                    .Where(t => t.IsActive)
                    .Select(t => t.TenantKey)
                    .ToListAsync();

                foreach (var dynamicKey in dynamicTenants)
                {
                    if (!supportedTenants.Contains(dynamicKey, StringComparer.OrdinalIgnoreCase))
                    {
                        supportedTenants.Add(dynamicKey);
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning("Notice: Could not load dynamic tenants from MasterCatalogDbContext: {Message}", ex.Message);
        }

        int successCount = 0;
        int failCount = 0;

        foreach (var tenant in supportedTenants)
        {
            using var loggerScope = _logger.BeginScope("tenant={tenant}", tenant);

            try
            {
                using var scope = _serviceProvider.CreateScope();
                using var tenantContext = _tenantProvider.BeginScope(tenant);
                var dbContext = scope.ServiceProvider.GetRequiredService<DashboardDbContext>();

                var connString = dbContext.Database.GetConnectionString() ?? string.Empty;
                var (serverName, dbName) = ParseConnectionString(connString);

                _logger.LogInformation("----------------------------------------------------------------");
                _logger.LogInformation("⏳ MIGRATING TENANT: [{TenantName}]", tenant);
                _logger.LogInformation("   ├── Server:   {ServerName}", serverName);
                _logger.LogInformation("   ├── Database: {DatabaseName}", dbName);
                _logger.LogInformation("   └── ConnectionString: {ConnectionString}", MaskConnectionString(connString));

                await dbContext.Database.MigrateAsync();

                _logger.LogInformation("✅ SUCCESS: Migration completed for tenant [{TenantName}] on DB [{DatabaseName}]", tenant, dbName);
                successCount++;
            }
            catch (SqlException sqlEx)
            {
                failCount++;
                _logger.LogError("----------------------------------------------------------------");
                _logger.LogError("❌ SQL MIGRATION FAILURE for tenant [{TenantName}]", tenant);
                _logger.LogError("   ├── Error Code:    {ErrorCode} (Class {ErrorClass}, State {State})", sqlEx.Number, sqlEx.Class, sqlEx.State);
                _logger.LogError("   ├── SQL Error Msg: {ErrorMessage}", sqlEx.Message);

                if (sqlEx.Number == 2714) // Object already exists
                {
                    _logger.LogWarning("💡 DIAGNOSIS: A database table already exists, but EF Core migration history table (__EFMigrationsHistory) is missing or out of sync.");
                    _logger.LogWarning("💡 RESOLUTION 1 (Local Dev Reset): Drop/delete the database and re-run DbMigrator for a clean reset.");
                    _logger.LogWarning("💡 RESOLUTION 2 (Keep DB Data): Execute: INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion]) VALUES ('20260809193400_init', '9.0.0');");
                }
                else if (sqlEx.Number == 4060 || sqlEx.Number == 18456)
                {
                    _logger.LogWarning("💡 DIAGNOSIS: Cannot open or authenticate to database. Check SQL Server credentials in .env file.");
                }
            }
            catch (Exception ex)
            {
                failCount++;
                _logger.LogError(ex, "❌ UNEXPECTED ERROR during migration for tenant [{TenantName}]", tenant);
            }
        }

        _logger.LogInformation("================================================================");
        _logger.LogInformation("🏁 MIGRATION PROCESS COMPLETED: {SuccessCount} Passed, {FailCount} Failed.", successCount, failCount);
        _logger.LogInformation("================================================================");
    }

    private static (string Server, string Database) ParseConnectionString(string connString)
    {
        if (string.IsNullOrWhiteSpace(connString)) return ("Unknown", "Unknown");
        try
        {
            var builder = new SqlConnectionStringBuilder(connString);
            return (builder.DataSource, builder.InitialCatalog);
        }
        catch
        {
            return ("Unknown", "Unknown");
        }
    }

    private static string MaskConnectionString(string connString)
    {
        if (string.IsNullOrWhiteSpace(connString)) return string.Empty;
        try
        {
            var builder = new SqlConnectionStringBuilder(connString);
            if (!string.IsNullOrEmpty(builder.Password)) builder.Password = "*****";
            return builder.ConnectionString;
        }
        catch
        {
            return connString;
        }
    }
}
