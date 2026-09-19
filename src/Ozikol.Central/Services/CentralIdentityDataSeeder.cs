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

                // NOTE: All platform baseline data (Roles, SuperAdmin, Currencies, PlatformSettings, LegalDocuments,
                // Coupons, and MasterFeatureCatalogs) are strictly seeded via EF Core Migrations.
                // Runtime startup seeding is disabled to guarantee zero database mutation or drift on application boot.
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[CentralIdentityDataSeeder Exception]: {ex.Message}");
            }
        }
    }
}
