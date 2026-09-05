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
            // Seed the central security governance roles and initial SuperAdmin account
            await SeedRolesAndSuperAdminAsync(dbContext, roleManager, userManager, cancellationToken);

            // Seed the 10 global & African regional platform currency exchange rates
            await SeedCurrenciesAsync(dbContext, cancellationToken);

            // Seed default baseline platform settings record via EF Core
            await SeedPlatformSettingsAsync(dbContext, cancellationToken);
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

        /// <summary>
        /// Programmatically seeds the 10 core global and African regional platform currencies
        /// with exchange rates relative to the USD $25.00 baseline.
        /// Avoids migration drift by verifying presence in the database prior to insertion.
        /// </summary>
        /// <param name="dbContext">The master catalog database context instance.</param>
        /// <param name="ct">Cancellation token for async operations.</param>
        /// <returns>A task representing the asynchronous currency seeding operation.</returns>
        public static async Task SeedCurrenciesAsync(MasterCatalogDbContext dbContext, CancellationToken ct = default)
        {
            if (await dbContext.MasterCurrencyRates.AnyAsync(ct))
            {
                return; // Already initialized
            }

            var defaultCurrencies = new[]
            {
                new MasterCurrencyRate
                {
                    CurrencyCode = "USD",
                    CurrencySymbol = "$",
                    DisplayName = "US Dollar",
                    CultureName = "en-US",
                    PillLabel = "USD ($)",
                    RateFromUsd = 1.0m,
                    IsBaseCurrency = true,
                    IsActive = true,
                    SortOrder = 1,
                    AssociatedCountryCodes = "US",
                    CreatedAtUtc = DateTime.UtcNow
                },
                new MasterCurrencyRate
                {
                    CurrencyCode = "NGN",
                    CurrencySymbol = "\u20A6",
                    DisplayName = "Nigerian Naira",
                    CultureName = "en-NG",
                    PillLabel = "NGN (\u20A6)",
                    RateFromUsd = 1600.0m,
                    IsBaseCurrency = false,
                    IsActive = true,
                    SortOrder = 2,
                    AssociatedCountryCodes = "NG",
                    CreatedAtUtc = DateTime.UtcNow
                },
                new MasterCurrencyRate
                {
                    CurrencyCode = "GBP",
                    CurrencySymbol = "\u00A3",
                    DisplayName = "British Pound",
                    CultureName = "en-GB",
                    PillLabel = "GBP (\u00A3)",
                    RateFromUsd = 0.80m,
                    IsBaseCurrency = false,
                    IsActive = true,
                    SortOrder = 3,
                    AssociatedCountryCodes = "GB",
                    CreatedAtUtc = DateTime.UtcNow
                },
                new MasterCurrencyRate
                {
                    CurrencyCode = "EUR",
                    CurrencySymbol = "\u20AC",
                    DisplayName = "Euro",
                    CultureName = "de-DE",
                    PillLabel = "EUR (\u20AC)",
                    RateFromUsd = 0.92m,
                    IsBaseCurrency = false,
                    IsActive = true,
                    SortOrder = 4,
                    AssociatedCountryCodes = "DE,FR,ES,IT,NL,BE,IE,PT,AT,FI,GR",
                    CreatedAtUtc = DateTime.UtcNow
                },
                new MasterCurrencyRate
                {
                    CurrencyCode = "GHS",
                    CurrencySymbol = "GH\u20B5",
                    DisplayName = "Ghanaian Cedi",
                    CultureName = "en-GH",
                    PillLabel = "GHS (GH\u20B5)",
                    RateFromUsd = 14.0m,
                    IsBaseCurrency = false,
                    IsActive = true,
                    SortOrder = 5,
                    AssociatedCountryCodes = "GH",
                    CreatedAtUtc = DateTime.UtcNow
                },
                new MasterCurrencyRate
                {
                    CurrencyCode = "KES",
                    CurrencySymbol = "KSh",
                    DisplayName = "Kenyan Shilling",
                    CultureName = "sw-KE",
                    PillLabel = "KES (KSh)",
                    RateFromUsd = 130.0m,
                    IsBaseCurrency = false,
                    IsActive = true,
                    SortOrder = 6,
                    AssociatedCountryCodes = "KE",
                    CreatedAtUtc = DateTime.UtcNow
                },
                new MasterCurrencyRate
                {
                    CurrencyCode = "ZAR",
                    CurrencySymbol = "R",
                    DisplayName = "South African Rand",
                    CultureName = "en-ZA",
                    PillLabel = "ZAR (R)",
                    RateFromUsd = 18.0m,
                    IsBaseCurrency = false,
                    IsActive = true,
                    SortOrder = 7,
                    AssociatedCountryCodes = "ZA",
                    CreatedAtUtc = DateTime.UtcNow
                },
                new MasterCurrencyRate
                {
                    CurrencyCode = "CAD",
                    CurrencySymbol = "CA$",
                    DisplayName = "Canadian Dollar",
                    CultureName = "en-CA",
                    PillLabel = "CAD (CA$)",
                    RateFromUsd = 1.36m,
                    IsBaseCurrency = false,
                    IsActive = true,
                    SortOrder = 8,
                    AssociatedCountryCodes = "CA",
                    CreatedAtUtc = DateTime.UtcNow
                },
                new MasterCurrencyRate
                {
                    CurrencyCode = "AED",
                    CurrencySymbol = "AED",
                    DisplayName = "UAE Dirham",
                    CultureName = "ar-AE",
                    PillLabel = "AED",
                    RateFromUsd = 3.67m,
                    IsBaseCurrency = false,
                    IsActive = true,
                    SortOrder = 9,
                    AssociatedCountryCodes = "AE",
                    CreatedAtUtc = DateTime.UtcNow
                },
                new MasterCurrencyRate
                {
                    CurrencyCode = "INR",
                    CurrencySymbol = "\u20B9",
                    DisplayName = "Indian Rupee",
                    CultureName = "en-IN",
                    PillLabel = "INR (\u20B9)",
                    RateFromUsd = 84.0m,
                    IsBaseCurrency = false,
                    IsActive = true,
                    SortOrder = 10,
                    AssociatedCountryCodes = "IN",
                    CreatedAtUtc = DateTime.UtcNow
                }
            };

            await dbContext.MasterCurrencyRates.AddRangeAsync(defaultCurrencies, ct);
            await dbContext.SaveChangesAsync(ct);
        }

        /// <summary>
        /// Seeds the baseline platform settings record (<c>Id = 1</c>) using standard EF Core entity persistence.
        /// Strictly relies on official EF Core migrations for database schema management.
        /// </summary>
        /// <param name="dbContext">The master catalog database context instance.</param>
        /// <param name="ct">Cancellation token for async operations.</param>
        /// <returns>A task representing the asynchronous settings initialization.</returns>
        public static async Task SeedPlatformSettingsAsync(MasterCatalogDbContext dbContext, CancellationToken ct = default)
        {
            var existingSetting = await dbContext.MasterPlatformSettings.FirstOrDefaultAsync(s => s.Id == 1, ct);
            if (existingSetting == null)
            {
                var defaultSetting = new MasterPlatformSetting
                {
                    Id = 1,
                    PlatformName = "Ozikol",
                    EnableAdminNotifications = true,
                    SupportAdminEmails = null,
                    PartnerAdminEmails = null,
                    CreatorAdminEmails = null,
                    CareersAdminEmails = null,
                    CertificationAdminEmails = null,
                    TicketAutoCloseHours = 24,
                    EnableTicketAutoClose = true,
                    UpdatedUtc = DateTime.UtcNow
                };

                dbContext.MasterPlatformSettings.Add(defaultSetting);
                await dbContext.SaveChangesAsync(ct);
            }
        }
    }
}
