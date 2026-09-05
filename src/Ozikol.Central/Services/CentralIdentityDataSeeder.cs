using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;
using Ozikol.MasterPersistence.EF.MasterSQL.Seeding;

namespace Ozikol.Central.Services
{
    public static class CentralIdentityDataSeeder
    {
        public static async Task SeedCentralRolesAndSuperAdminAsync(IServiceProvider serviceProvider)
        {
            using var scope = serviceProvider.CreateScope();
            var roleManager = scope.ServiceProvider.GetService<RoleManager<CentralRole>>();
            var userManager = scope.ServiceProvider.GetService<UserManager<CentralUser>>();
            var dbContext = scope.ServiceProvider.GetRequiredService<MasterCatalogDbContext>();

            try
            {
                if (!await dbContext.Database.CanConnectAsync())
                {
                    return;
                }

                // Seed Central Operator Roles, Default SuperAdmin, and the 10 platform currency rates
                await MasterCatalogDataSeeder.SeedRolesAndSuperAdminAsync(dbContext, roleManager, userManager);
                await MasterCatalogDataSeeder.SeedCurrenciesAsync(dbContext);
                await MasterCatalogDataSeeder.SeedPlatformSettingsAsync(dbContext);
                await MasterCatalogDataSeeder.SeedLegalDocumentsAsync(dbContext);
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[CentralIdentityDataSeeder Exception]: {ex.Message}");
            }
        }
    }
}
