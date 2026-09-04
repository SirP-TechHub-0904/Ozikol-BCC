using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.MasterPersistence.EF.DbMigrator
{
    public class MasterDbMigratorHostedService : IHostedService
    {
        private readonly ILogger<MasterDbMigratorHostedService> _logger;
        private readonly IServiceProvider _serviceProvider;
        private readonly IHostApplicationLifetime _hostApplicationLifetime;

        public MasterDbMigratorHostedService(
            ILogger<MasterDbMigratorHostedService> logger,
            IServiceProvider serviceProvider,
            IHostApplicationLifetime hostApplicationLifetime)
        {
            _logger = logger;
            _serviceProvider = serviceProvider;
            _hostApplicationLifetime = hostApplicationLifetime;
        }

        public async Task StartAsync(CancellationToken cancellationToken)
        {
            _logger.LogInformation("================================================================");
            _logger.LogInformation("🚀 STARTING MASTER CATALOG DATABASE MIGRATOR");
            _logger.LogInformation("================================================================");

            try
            {
                using var scope = _serviceProvider.CreateScope();
                var masterDbContext = scope.ServiceProvider.GetRequiredService<MasterCatalogDbContext>();

                _logger.LogInformation("🔍 Checking Master Catalog Database connectivity...");
                var canConnect = await masterDbContext.Database.CanConnectAsync(cancellationToken);
                _logger.LogInformation("Connection established: {CanConnect}", canConnect);

                _logger.LogInformation("📦 Applying EF Core Pending Migrations to Master Catalog Database...");
                await masterDbContext.Database.MigrateAsync(cancellationToken);
                _logger.LogInformation("✅ Master Catalog Database migrations applied successfully.");

                // Run Master Catalog Data Seeder
                await SeedMasterDataAsync(scope.ServiceProvider, masterDbContext, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogCritical(ex, "🔥 CRITICAL ERROR: Unhandled exception in Master Database Migrator.");
            }
            finally
            {
                _logger.LogInformation("================================================================");
                _logger.LogInformation("🏁 MASTER DATABASE MIGRATOR EXECUTION COMPLETED");
                _logger.LogInformation("================================================================");
                _hostApplicationLifetime.StopApplication();
            }
        }

        public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;

        private async Task SeedMasterDataAsync(IServiceProvider sp, MasterCatalogDbContext dbContext, CancellationToken ct)
        {
            _logger.LogInformation("🌱 Running Master Catalog Comprehensive Seeders (Roles, SuperAdmin, 7 Categories, 21 Templates, 25 Features)...");

            var roleManager = sp.GetService<RoleManager<CentralRole>>();
            var userManager = sp.GetService<UserManager<CentralUser>>();

            await Ozikol.MasterPersistence.EF.MasterSQL.Seeding.MasterCatalogDataSeeder.SeedAllAsync(
                dbContext, roleManager, userManager, ct);

            _logger.LogInformation("✨ Master Catalog Seeding Successfully Finished (21 Templates & 25 Platform Features Active).");
        }
    }
}
