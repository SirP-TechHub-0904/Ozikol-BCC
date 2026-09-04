using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Ozikol.MasterDomain.Models;

namespace Ozikol.MasterPersistence.EF.MasterSQL.Seeding
{
    /// <summary>
    /// Programmatic data seeder for the Master Catalog Database (<c>Ozikol_MasterCatalogDb</c>).
    /// Responsible for initializing central governance roles and the root SuperAdmin identity account.
    /// Avoids dynamic runtime data seeding inside EF Core's OnModelCreating to ensure zero migration drift.
    /// </summary>
    public static class MasterCatalogDataSeeder
    {
        /// <summary>
        /// Global seeder entry point. Invokes central identity role and SuperAdmin user initialization.
        /// </summary>
        /// <param name="dbContext">The master catalog database context instance.</param>
        /// <param name="roleManager">Optional ASP.NET Core Identity RoleManager for web runtime environments.</param>
        /// <param name="userManager">Optional ASP.NET Core Identity UserManager for web runtime environments.</param>
        /// <param name="cancellationToken">Cancellation token for async operations.</param>
        /// <returns>A task representing the asynchronous seeding operation.</returns>
        public static async Task SeedAllAsync(
            MasterCatalogDbContext dbContext,
            RoleManager<CentralRole>? roleManager = null,
            UserManager<CentralUser>? userManager = null,
            CancellationToken cancellationToken = default)
        {
            // Seed only the central security governance roles and initial SuperAdmin account
            await SeedRolesAndSuperAdminAsync(dbContext, roleManager, userManager, cancellationToken);
        }

        /// <summary>
        /// Seeds the 7 central system roles and provisions the initial default SuperAdmin user account.
        /// Designed with dual-execution capability: supports both ASP.NET Identity managers and direct EF Core DbSet fallbacks.
        /// </summary>
        /// <param name="dbContext">The master catalog database context instance.</param>
        /// <param name="roleManager">Optional ASP.NET Core Identity RoleManager.</param>
        /// <param name="userManager">Optional ASP.NET Core Identity UserManager.</param>
        /// <param name="ct">Cancellation token for async operations.</param>
        /// <returns>A task representing the asynchronous role and user seeding.</returns>
        public static async Task SeedRolesAndSuperAdminAsync(
            MasterCatalogDbContext dbContext,
            RoleManager<CentralRole>? roleManager,
            UserManager<CentralUser>? userManager,
            CancellationToken ct = default)
        {
            // Define the 7 core central platform governance roles
            var centralRoles = new[]
            {
                new CentralRole("SuperAdmin", "Full system governance, database fleet migrations, operator access"),
                new CentralRole("Admin", "Tenant workspace governance, subscription status, support"),
                new CentralRole("TemplateManager", "Marketplace templates, layout blueprints, review moderations"),
                new CentralRole("ReferralManager", "Affiliate partner network, commission tiers, payout tracking"),
                new CentralRole("Operator", "Platform operational staff and monitoring"),
                new CentralRole("BillingAdmin", "Subscription billing, invoices, and payment gateway configuration"),
                new CentralRole("SupportAgent", "Customer tickets, live chat assistance, and workspace diagnostics")
            };

            // Ensure all central roles exist in the database
            foreach (var role in centralRoles)
            {
                if (roleManager != null)
                {
                    if (!await roleManager.RoleExistsAsync(role.Name!))
                    {
                        await roleManager.CreateAsync(role);
                    }
                }
                else
                {
                    // Fallback when executed via standalone migration tools where RoleManager is unavailable
                    if (!await dbContext.Roles.AnyAsync(r => r.NormalizedName == role.Name!.ToUpperInvariant(), ct))
                    {
                        role.NormalizedName = role.Name!.ToUpperInvariant();
                        dbContext.Roles.Add(role);
                        await dbContext.SaveChangesAsync(ct);
                    }
                }
            }

            // Seed SuperAdmin User
            const string superAdminEmail = "superadmin@ozikol.cloud";
            if (userManager != null)
            {
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
            else
            {
                // Fallback direct creation when executed in headless migrator contexts
                if (!await dbContext.Users.AnyAsync(u => u.NormalizedEmail == superAdminEmail.ToUpperInvariant(), ct))
                {
                    var hasher = new PasswordHasher<CentralUser>();
                    var superAdmin = new CentralUser
                    {
                        Id = Guid.NewGuid().ToString(),
                        UserName = superAdminEmail,
                        NormalizedUserName = superAdminEmail.ToUpperInvariant(),
                        Email = superAdminEmail,
                        NormalizedEmail = superAdminEmail.ToUpperInvariant(),
                        EmailConfirmed = true,
                        FirstName = "Ozikol",
                        LastName = "SuperAdmin",
                        Department = "Global DevOps & Architecture",
                        IsActive = true,
                        SecurityStamp = Guid.NewGuid().ToString(),
                        ConcurrencyStamp = Guid.NewGuid().ToString(),
                        CreatedUtc = DateTime.UtcNow
                    };
                    superAdmin.PasswordHash = hasher.HashPassword(superAdmin, "[REDACTED_BOOTSTRAP_PASSWORD]");

                    dbContext.Users.Add(superAdmin);
                    await dbContext.SaveChangesAsync(ct);

                    var superAdminRole = await dbContext.Roles.FirstOrDefaultAsync(r => r.NormalizedName == "SUPERADMIN", ct);
                    if (superAdminRole != null)
                    {
                        dbContext.UserRoles.Add(new IdentityUserRole<string>
                        {
                            UserId = superAdmin.Id,
                            RoleId = superAdminRole.Id
                        });
                        await dbContext.SaveChangesAsync(ct);
                    }
                }
            }
        }
    }
}
