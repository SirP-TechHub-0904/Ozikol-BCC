using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.AspNetCore.Identity;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Infrastructure.TenantSupport;

namespace Ozikol_BCC.Persistence.EF.SQL;

/// <summary>
/// Service responsible for online tenant provisioning.
/// Creates target MSSQL databases dynamically on the VPS instance, applies EF Core migrations,
/// seeds initial admin users/roles, and registers connection details, primary domains, custom domains, and API URLs in MasterCatalogDbContext.
/// </summary>
public class TenantProvisioningService : ITenantProvisioningService
{
    private readonly MasterCatalogDbContext _masterCatalogDbContext;
    private readonly IOptions<TenantConfigurationOptions> _tenantOptions;
    private readonly IServiceProvider _serviceProvider;
    private readonly IMemoryCache? _memoryCache;
    private readonly ILogger<TenantProvisioningService> _logger;

    public TenantProvisioningService(
        MasterCatalogDbContext masterCatalogDbContext,
        IOptions<TenantConfigurationOptions> tenantOptions,
        IServiceProvider serviceProvider,
        ILogger<TenantProvisioningService> logger,
        IMemoryCache? memoryCache = null)
    {
        _masterCatalogDbContext = masterCatalogDbContext;
        _tenantOptions = tenantOptions;
        _serviceProvider = serviceProvider;
        _logger = logger;
        _memoryCache = memoryCache;
    }

    public async Task<ProvisionTenantResult> ProvisionTenantAsync(ProvisionTenantRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.TenantKey))
        {
            return new ProvisionTenantResult { Success = false, Message = "TenantKey is required." };
        }

        string cleanTenantKey = request.TenantKey.Trim().ToLowerInvariant().Replace(" ", "-");
        string cleanPrimaryDomain = (request.PrimaryDomain ?? $"{cleanTenantKey}.localhost").Trim().ToLowerInvariant();
        string? cleanCustomDomain = string.IsNullOrWhiteSpace(request.CustomDomain) ? null : request.CustomDomain.Trim().ToLowerInvariant();
        string? cleanApiUrl = string.IsNullOrWhiteSpace(request.ApiUrl) 
            ? null 
            : request.ApiUrl.Trim().ToLowerInvariant().Replace("https://", "").Replace("http://", "").Split('/')[0];

        // 1. Check if tenant key, primary domain, custom domain, or apiUrl already exists
        bool exists = await _masterCatalogDbContext.MasterTenantCatalogs
            .AnyAsync(t => t.TenantKey == cleanTenantKey || 
                           t.PrimaryDomain == cleanPrimaryDomain || 
                           (!string.IsNullOrEmpty(cleanCustomDomain) && t.CustomDomain == cleanCustomDomain) ||
                           (!string.IsNullOrEmpty(cleanApiUrl) && t.ApiUrl != null && t.ApiUrl.Contains(cleanApiUrl)), cancellationToken);

        if (exists)
        {
            return new ProvisionTenantResult { Success = false, Message = $"Tenant with key '{cleanTenantKey}', primary domain '{cleanPrimaryDomain}', custom domain '{cleanCustomDomain}', or apiUrl '{cleanApiUrl}' already exists." };
        }

        string masterConnStr = _masterCatalogDbContext.Database.GetConnectionString() 
            ?? _tenantOptions.Value.ConnectionString 
            ?? string.Empty;

        if (string.IsNullOrWhiteSpace(masterConnStr))
        {
            return new ProvisionTenantResult { Success = false, Message = "Master connection string is missing from configuration." };
        }

        string targetDbName = $"Ozikol_BCC_Tenant_{cleanTenantKey.Replace("-", "_")}";

        try
        {
            _logger.LogInformation("================================================================");
            _logger.LogInformation("🚀 PROVISIONING NEW TENANT DATABASE: [{TenantKey}]", cleanTenantKey);
            _logger.LogInformation("   ├── Target DB Name:     {DatabaseName}", targetDbName);
            _logger.LogInformation("   ├── Primary Domain:     {PrimaryDomain}", cleanPrimaryDomain);
            _logger.LogInformation("   ├── Custom Domain:      {CustomDomain}", cleanCustomDomain ?? "None");
            _logger.LogInformation("   ├── API URL:            {ApiUrl}", request.ApiUrl ?? "Default");
            _logger.LogInformation("   └── Website URL:        {WebsiteUrl}", request.WebsiteUrl ?? "Default");

            // 2. Execute CREATE DATABASE on SQL Server instance via master DB connection
            await CreateDatabaseOnSqlServerAsync(masterConnStr, targetDbName, cancellationToken);

            // 3. Build target tenant connection string
            string tenantConnStr = BuildTenantConnectionString(masterConnStr, targetDbName);

            // 4. Apply EF Core Migrations on the new tenant database
            await ApplyEfCoreMigrationsAsync(tenantConnStr, cancellationToken);

            // 5. Seed initial Admin User & Roles in the new tenant database
            await SeedTenantInitialDataAsync(tenantConnStr, request, cancellationToken);

            // 6. Register tenant entry in MasterCatalogDbContext
            var catalogEntry = new MasterTenantCatalog
            {
                TenantKey = cleanTenantKey,
                OrganizationName = request.OrganizationName,
                PrimaryDomain = cleanPrimaryDomain,
                CustomDomain = cleanCustomDomain,
                ApiUrl = request.ApiUrl,
                WebsiteUrl = request.WebsiteUrl,
                DatabaseName = targetDbName,
                ConnectionString = tenantConnStr,
                AdminEmail = request.AdminEmail,
                IsActive = true,
                CreatedUtc = DateTime.UtcNow
            };

            _masterCatalogDbContext.MasterTenantCatalogs.Add(catalogEntry);
            await _masterCatalogDbContext.SaveChangesAsync(cancellationToken);

            // 7. Update in-memory cache for instant zero-latency routing
            if (_memoryCache != null)
            {
                var cacheOptions = new MemoryCacheEntryOptions
                {
                    Size = 1,
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(30)
                };
                _memoryCache.Set($"tenant_conn_{cleanTenantKey}", tenantConnStr, cacheOptions);
                _memoryCache.Set($"tenant_conn_{cleanPrimaryDomain}", tenantConnStr, cacheOptions);
                if (!string.IsNullOrEmpty(cleanCustomDomain))
                {
                    _memoryCache.Set($"tenant_conn_{cleanCustomDomain}", tenantConnStr, cacheOptions);
                }
                if (!string.IsNullOrEmpty(cleanApiUrl))
                {
                    _memoryCache.Set($"tenant_conn_{cleanApiUrl}", tenantConnStr, cacheOptions);
                }
            }

            _logger.LogInformation("✅ SUCCESS: Tenant [{TenantKey}] provisioned and live at [{PrimaryDomain}]", cleanTenantKey, cleanPrimaryDomain);
            _logger.LogInformation("================================================================");

            return new ProvisionTenantResult
            {
                Success = true,
                TenantKey = cleanTenantKey,
                PrimaryDomain = cleanPrimaryDomain,
                CustomDomain = cleanCustomDomain,
                ApiUrl = request.ApiUrl,
                WebsiteUrl = request.WebsiteUrl,
                DatabaseName = targetDbName,
                Message = $"Tenant '{request.OrganizationName}' successfully provisioned and ready for access."
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "🔥 ERROR: Provisioning failed for tenant [{TenantKey}]", cleanTenantKey);
            return new ProvisionTenantResult
            {
                Success = false,
                TenantKey = cleanTenantKey,
                PrimaryDomain = cleanPrimaryDomain,
                CustomDomain = cleanCustomDomain,
                DatabaseName = targetDbName,
                Message = $"Provisioning failed: {ex.Message}",
                Exception = ex
            };
        }
    }

    public async Task<List<TenantCatalogDto>> GetAllTenantsAsync(CancellationToken cancellationToken = default)
    {
        return await _masterCatalogDbContext.MasterTenantCatalogs
            .AsNoTracking()
            .OrderByDescending(t => t.CreatedUtc)
            .Select(t => new TenantCatalogDto
            {
                Id = t.Id,
                TenantKey = t.TenantKey,
                OrganizationName = t.OrganizationName,
                PrimaryDomain = t.PrimaryDomain,
                CustomDomain = t.CustomDomain,
                ApiUrl = t.ApiUrl,
                WebsiteUrl = t.WebsiteUrl,
                DatabaseName = t.DatabaseName,
                AdminEmail = t.AdminEmail,
                IsActive = t.IsActive,
                CreatedUtc = t.CreatedUtc
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<bool> ToggleTenantStatusAsync(string tenantKey, bool isActive, CancellationToken cancellationToken = default)
    {
        var tenant = await _masterCatalogDbContext.MasterTenantCatalogs
            .FirstOrDefaultAsync(t => t.TenantKey == tenantKey.ToLower(), cancellationToken);

        if (tenant == null) return false;

        tenant.IsActive = isActive;
        tenant.UpdatedUtc = DateTime.UtcNow;
        await _masterCatalogDbContext.SaveChangesAsync(cancellationToken);

        if (_memoryCache != null)
        {
            _memoryCache.Remove($"tenant_conn_{tenant.TenantKey.ToLower()}");
            _memoryCache.Remove($"tenant_conn_{tenant.PrimaryDomain.ToLower()}");
            if (!string.IsNullOrEmpty(tenant.CustomDomain))
            {
                _memoryCache.Remove($"tenant_conn_{tenant.CustomDomain.ToLower()}");
            }
        }

        return true;
    }

    public async Task<bool> UpdateCustomDomainAsync(string tenantKey, string? customDomain, CancellationToken cancellationToken = default)
    {
        var tenant = await _masterCatalogDbContext.MasterTenantCatalogs
            .FirstOrDefaultAsync(t => t.TenantKey == tenantKey.ToLower(), cancellationToken);

        if (tenant == null) return false;

        string? oldCustomDomain = tenant.CustomDomain;
        tenant.CustomDomain = string.IsNullOrWhiteSpace(customDomain) ? null : customDomain.Trim().ToLowerInvariant();
        tenant.UpdatedUtc = DateTime.UtcNow;

        await _masterCatalogDbContext.SaveChangesAsync(cancellationToken);

        if (_memoryCache != null)
        {
            if (!string.IsNullOrEmpty(oldCustomDomain))
            {
                _memoryCache.Remove($"tenant_conn_{oldCustomDomain.ToLower()}");
            }
            if (!string.IsNullOrEmpty(tenant.CustomDomain))
            {
                _memoryCache.Set($"tenant_conn_{tenant.CustomDomain.ToLower()}", tenant.ConnectionString, new MemoryCacheEntryOptions
                {
                    Size = 1,
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(30)
                });
            }
        }

        return true;
    }

    private static async Task CreateDatabaseOnSqlServerAsync(string masterConnStr, string targetDbName, CancellationToken cancellationToken)
    {
        var masterBuilder = new SqlConnectionStringBuilder(masterConnStr)
        {
            InitialCatalog = "master"
        };

        using var connection = new SqlConnection(masterBuilder.ConnectionString);
        await connection.OpenAsync(cancellationToken);

        string sql = $@"
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'{targetDbName}')
BEGIN
    CREATE DATABASE [{targetDbName}];
END";

        using var command = new SqlCommand(sql, connection);
        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private static string BuildTenantConnectionString(string masterConnStr, string targetDbName)
    {
        var builder = new SqlConnectionStringBuilder(masterConnStr)
        {
            InitialCatalog = targetDbName
        };
        return builder.ConnectionString;
    }

    private async Task ApplyEfCoreMigrationsAsync(string tenantConnStr, CancellationToken cancellationToken)
    {
        var optionsBuilder = new DbContextOptionsBuilder<DashboardDbContext>();
        optionsBuilder.UseSqlServer(tenantConnStr)
            .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning));

        using var scope = _serviceProvider.CreateScope();
        var tenantProvider = scope.ServiceProvider.GetRequiredService<ITenantProvider>();

        using (tenantProvider.BeginScope(tenantConnStr))
        {
            var dbContext = new DashboardDbContext(optionsBuilder.Options, tenantProvider, null);
            await dbContext.Database.MigrateAsync(cancellationToken);
        }
    }

    private async Task SeedTenantInitialDataAsync(string tenantConnStr, ProvisionTenantRequest request, CancellationToken cancellationToken)
    {
        var optionsBuilder = new DbContextOptionsBuilder<DashboardDbContext>();
        optionsBuilder.UseSqlServer(tenantConnStr)
            .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning));

        using var scope = _serviceProvider.CreateScope();
        var tenantProvider = scope.ServiceProvider.GetRequiredService<ITenantProvider>();

        using (tenantProvider.BeginScope(tenantConnStr))
        {
            var dbContext = new DashboardDbContext(optionsBuilder.Options, tenantProvider, null);

            // 1. Seed Roles
            var roleNames = new[] { "Admin", "Member", "SuperAdmin" };
            foreach (var roleName in roleNames)
            {
                if (!await dbContext.Roles.AnyAsync(r => r.Name == roleName, cancellationToken))
                {
                    dbContext.Roles.Add(new AppRole
                    {
                        Id = Guid.NewGuid().ToString(),
                        Name = roleName,
                        NormalizedName = roleName.ToUpperInvariant()
                    });
                }
            }

            // 2. Seed Default Admin User
            var existingUser = await dbContext.Users.FirstOrDefaultAsync(u => u.Email == request.AdminEmail, cancellationToken);
            if (existingUser == null)
            {
                var hasher = new PasswordHasher<Profile>();
                var adminUser = new Profile
                {
                    Id = Guid.NewGuid().ToString(),
                    UserName = request.AdminEmail,
                    NormalizedUserName = request.AdminEmail.ToUpperInvariant(),
                    Email = request.AdminEmail,
                    NormalizedEmail = request.AdminEmail.ToUpperInvariant(),
                    EmailConfirmed = true,
                    FirstName = request.AdminFirstName ?? "Administrator",
                    LastName = request.AdminLastName ?? "Admin",
                    SecurityStamp = Guid.NewGuid().ToString()
                };
                adminUser.PasswordHash = hasher.HashPassword(adminUser, request.AdminPassword);
                dbContext.Users.Add(adminUser);

                // Assign Admin & SuperAdmin roles to the first user
                var adminRole = await dbContext.Roles.FirstOrDefaultAsync(r => r.Name == "SuperAdmin", cancellationToken);
                if (adminRole != null)
                {
                    dbContext.UserRoles.Add(new IdentityUserRole<string>
                    {
                        UserId = adminUser.Id,
                        RoleId = adminRole.Id
                    });
                }
            }

            // 3. Seed ConfigSetting (Website Title, Company Name)
            if (!await dbContext.ConfigSettings.AnyAsync(cancellationToken))
            {
                dbContext.ConfigSettings.Add(new ConfigSetting
                {
                    Id = Guid.NewGuid(),
                    CompanyName = request.OrganizationName,
                    CompanyIconUrl = "/favicon.ico",
                    WebsiteTitle = request.OrganizationName,
                    DashboardTitle = $"{request.OrganizationName} Command Center",
                    TemplateLayoutKey = "standard",
                    ProductTitle = "Online Store",
                    ShowProductsInMenu = true,
                    ShowProductsInFooter = true,
                    ActivateProductsInHome = false,
                    CurrencyCode = "USD",
                    CurrencySymbol = "$"
                });
            }

            // 4. Seed BcpSetting
            if (!await dbContext.BcpSettings.AnyAsync(cancellationToken))
            {
                dbContext.BcpSettings.Add(new BcpSetting
                {
                    Id = Guid.NewGuid(),
                    CurrencyCode = "USD",
                    CurrencySymbol = "$"
                });
            }

            // 5. Seed Default Web Pages (Home, About, Contact, Services)
            if (!await dbContext.WebPages.AnyAsync(cancellationToken))
            {
                var homePage = new WebPage
                {
                    Id = Guid.NewGuid(),
                    Title = "Home",
                    DirectUrl = "home",
                    ShowInMainMenu = true,
                    ShowInFooter = true,
                    EnableDirectUrl = true,
                    Publish = true,
                    SortOrder = 1
                };

                var aboutPage = new WebPage
                {
                    Id = Guid.NewGuid(),
                    Title = "About Us",
                    DirectUrl = "about",
                    ShowInMainMenu = true,
                    ShowInFooter = true,
                    EnableDirectUrl = true,
                    Publish = true,
                    SortOrder = 2
                };

                var contactPage = new WebPage
                {
                    Id = Guid.NewGuid(),
                    Title = "Contact Us",
                    DirectUrl = "contact",
                    ShowInMainMenu = true,
                    ShowInFooter = true,
                    EnableDirectUrl = true,
                    Publish = true,
                    SortOrder = 3
                };

                dbContext.WebPages.AddRange(homePage, aboutPage, contactPage);
            }

            // 6. Seed Default Hero Slider
            if (!await dbContext.Sliders.AnyAsync(cancellationToken))
            {
                dbContext.Sliders.Add(new Slider
                {
                    Id = Guid.NewGuid(),
                    Title = $"Welcome to {request.OrganizationName}",
                    Text = "Modern workspace management, member governance, and dynamic digital experience.",
                    ButtonText = "Get Started",
                    ButtonLink = "/auth/login",
                    Show = true,
                    SortOrder = 1
                });
            }

            // 7. Seed Default Page Sections
            if (!await dbContext.PageSections.AnyAsync(cancellationToken))
            {
                dbContext.PageSections.AddRange(
                    new PageSection
                    {
                        Id = Guid.NewGuid(),
                        Title = $"About {request.OrganizationName}",
                        MiniTitle = "Who We Are",
                        Description = $"{request.OrganizationName} provides modern community and organizational management.",
                        ShowInHome = true,
                        HomePageSortOrder = 1,
                        TemplateKey = "_About"
                    },
                    new PageSection
                    {
                        Id = Guid.NewGuid(),
                        Title = "Our Services & Features",
                        MiniTitle = "What We Do",
                        Description = "Explore the full suite of services and modules available on our platform.",
                        ShowInHome = true,
                        HomePageSortOrder = 2,
                        TemplateKey = "_Service"
                    }
                );
            }

            await dbContext.SaveChangesAsync(cancellationToken);
        }
    }
}
