using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;

namespace Ozikol.Central.Services;

public static class CentralIdentityDataSeeder
{
    public static async Task SeedCentralRolesAndSuperAdminAsync(IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();
        var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<CentralRole>>();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<CentralUser>>();
        var dbContext = scope.ServiceProvider.GetRequiredService<MasterCatalogDbContext>();

        // Ensure Master DB is reachable before seeding
        try
        {
            if (!await dbContext.Database.CanConnectAsync())
            {
                return;
            }
        }
        catch
        {
            return;
        }

        // 1. Seed 4-Tier Roles
        var roles = new[]
        {
            new CentralRole("SuperAdmin", "Full system governance, database fleet migrations, operator access"),
            new CentralRole("Admin", "Tenant workspace governance, subscription status, support"),
            new CentralRole("TemplateManager", "Marketplace templates, layout blueprints, review moderations"),
            new CentralRole("ReferralManager", "Affiliate partner network, commission tiers, payout tracking")
        };

        foreach (var role in roles)
        {
            if (!await roleManager.RoleExistsAsync(role.Name!))
            {
                await roleManager.CreateAsync(role);
            }
        }

        // 2. Seed Default SuperAdmin Operator
        const string superAdminEmail = "superadmin@ozikol.cloud";
        var existingUser = await userManager.FindByEmailAsync(superAdminEmail);
        if (existingUser == null)
        {
            var superAdmin = new CentralUser
            {
                UserName = superAdminEmail,
                Email = superAdminEmail,
                EmailConfirmed = true,
                FirstName = "Ozikol",
                LastName = "SuperAdmin",
                Department = "Global DevOps & Architecture",
                IsActive = true,
                CreatedUtc = DateTime.UtcNow
            };

            var createResult = await userManager.CreateAsync(superAdmin, "[REDACTED_BOOTSTRAP_PASSWORD]");
            if (createResult.Succeeded)
            {
                await userManager.AddToRoleAsync(superAdmin, "SuperAdmin");
            }
        }
    }
}
