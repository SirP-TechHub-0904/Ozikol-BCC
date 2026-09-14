using Microsoft.AspNetCore.Identity;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Infrastructure.TenantSupport;
using Ozikol_BCC.Persistence.EF.SQL;

namespace Ozikol.Central.Services;

public class TenantOnboardingRequest
{
    public string OrganizationName { get; set; } = string.Empty;
    public string TenantKey { get; set; } = string.Empty;
    public string AdminFirstName { get; set; } = string.Empty;
    public string AdminLastName { get; set; } = string.Empty;
    public string AdminEmail { get; set; } = string.Empty;
    public string AdminPassword { get; set; } = string.Empty;
    public string? PhoneNumber { get; set; }
    public string? CustomDomain { get; set; }
    public string? ReferredBy { get; set; }
    public string? Sector { get; set; }
}

public class TenantOnboardingResult
{
    public bool Success { get; set; }
    public string TenantKey { get; set; } = string.Empty;
    public string OrganizationName { get; set; } = string.Empty;
    public string PrimaryDomain { get; set; } = string.Empty;
    public string DatabaseName { get; set; } = string.Empty;
    public string RedirectUrl { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? ErrorDetail { get; set; }
}

/// <summary>
/// Service contract for sovereign organization workspace onboarding, provisioning, and lookup operations.
/// </summary>
public interface ITenantOnboardingService
{
    /// <summary>
    /// Provisions a new sovereign organization workspace environment with dedicated storage, default configuration, and administrator credentials.
    /// </summary>
    /// <param name="request">The onboarding request containing organization details and administrator credentials.</param>
    /// <param name="cancellationToken">Cancellation token for async operations.</param>
    /// <returns>The onboarding result including domain and redirect information.</returns>
    Task<TenantOnboardingResult> OnboardNewTenantAsync(TenantOnboardingRequest request, CancellationToken cancellationToken = default);

    /// <summary>
    /// Checks whether a proposed workspace key/subdomain is available for registration.
    /// </summary>
    /// <param name="tenantKey">The workspace key or slug to check.</param>
    /// <param name="cancellationToken">Cancellation token for async operations.</param>
    /// <returns>True if available; false if already registered.</returns>
    Task<bool> IsTenantKeyAvailableAsync(string tenantKey, CancellationToken cancellationToken = default);

    /// <summary>
    /// Validates an affiliate partner referral code.
    /// </summary>
    /// <param name="referralCode">The partner referral code.</param>
    /// <param name="cancellationToken">Cancellation token for async operations.</param>
    /// <returns>True if valid and active; false otherwise.</returns>
    Task<bool> IsReferralCodeValidAsync(string referralCode, CancellationToken cancellationToken = default);

    /// <summary>
    /// Finds all active organization workspaces associated with the specified administrator email.
    /// </summary>
    /// <param name="email">The administrator or contact email.</param>
    /// <param name="cancellationToken">Cancellation token for async operations.</param>
    /// <returns>List of matching sovereign workspace catalogs.</returns>
    Task<List<MasterTenantCatalog>> FindWorkspacesByEmailAsync(string email, CancellationToken cancellationToken = default);

    /// <summary>
    /// Finds an active organization workspace by its unique key, domain, or subdomain.
    /// </summary>
    /// <param name="workspaceKey">The workspace slug or host identifier.</param>
    /// <param name="cancellationToken">Cancellation token for async operations.</param>
    /// <returns>The matching sovereign workspace catalog, or null if not found.</returns>
    Task<MasterTenantCatalog?> FindWorkspaceByKeyAsync(string workspaceKey, CancellationToken cancellationToken = default);
}

/// <summary>
/// Enterprise service implementation for sovereign organization workspace provisioning, automated environment configuration, and catalog lookups.
/// </summary>
public class TenantOnboardingService : ITenantOnboardingService
{
    private readonly MasterCatalogDbContext _masterCatalogDbContext;
    private readonly IOptions<TenantConfigurationOptions> _tenantOptions;
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<TenantOnboardingService> _logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="TenantOnboardingService"/> class.
    /// </summary>
    /// <param name="masterCatalogDbContext">The central master catalog database context.</param>
    /// <param name="tenantOptions">Tenant configuration options containing default connection strings.</param>
    /// <param name="serviceProvider">Dependency injection service provider.</param>
    /// <param name="logger">Application logging facility.</param>
    public TenantOnboardingService(
        MasterCatalogDbContext masterCatalogDbContext,
        IOptions<TenantConfigurationOptions> tenantOptions,
        IServiceProvider serviceProvider,
        ILogger<TenantOnboardingService> logger)
    {
        _masterCatalogDbContext = masterCatalogDbContext;
        _tenantOptions = tenantOptions;
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    /// <summary>
    /// Checks whether a proposed workspace key/subdomain is available for registration.
    /// </summary>
    /// <param name="tenantKey">The proposed workspace identifier.</param>
    /// <param name="cancellationToken">Cancellation token for async operations.</param>
    /// <returns>True if available; false if already taken.</returns>
    public async Task<bool> IsTenantKeyAvailableAsync(string tenantKey, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(tenantKey)) return false;
        var cleanKey = tenantKey.Trim().ToLowerInvariant();

        // Reject system reserved keywords (portal, admin, superadmin, api, etc.)
        if (ReservedWorkspaceNames.IsReserved(cleanKey))
        {
            return false;
        }

        return !await _masterCatalogDbContext.MasterTenantCatalogs
            .AnyAsync(t => t.TenantKey == cleanKey, cancellationToken);
    }

    /// <summary>
    /// Validates an affiliate partner referral code.
    /// </summary>
    /// <param name="referralCode">The partner referral code.</param>
    /// <param name="cancellationToken">Cancellation token for async operations.</param>
    /// <returns>True if valid and active; false otherwise.</returns>
    public async Task<bool> IsReferralCodeValidAsync(string referralCode, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(referralCode)) return false;
        var cleanCode = referralCode.Trim().ToUpperInvariant();
        return await _masterCatalogDbContext.MasterAffiliatePartners
            .AnyAsync(p => p.PartnerCode == cleanCode && p.Status == "Active", cancellationToken);
    }

    /// <summary>
    /// Finds all active organization workspaces associated with the specified administrator email.
    /// </summary>
    /// <param name="email">The administrator or contact email.</param>
    /// <param name="cancellationToken">Cancellation token for async operations.</param>
    /// <returns>List of matching sovereign workspace catalogs.</returns>
    public async Task<List<MasterTenantCatalog>> FindWorkspacesByEmailAsync(string email, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(email)) return new List<MasterTenantCatalog>();
        var cleanEmail = email.Trim().ToLowerInvariant();
        return await _masterCatalogDbContext.MasterTenantCatalogs
            .AsNoTracking()
            .Where(t => t.IsActive && t.AdminEmail != null && t.AdminEmail.ToLower() == cleanEmail)
            .ToListAsync(cancellationToken);
    }

    /// <summary>
    /// Finds an active organization workspace by its unique key, domain, or subdomain.
    /// </summary>
    /// <param name="workspaceKey">The workspace slug or host identifier.</param>
    /// <param name="cancellationToken">Cancellation token for async operations.</param>
    /// <returns>The matching sovereign workspace catalog, or null if not found.</returns>
    public async Task<MasterTenantCatalog?> FindWorkspaceByKeyAsync(string workspaceKey, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(workspaceKey)) return null;
        var cleanKey = workspaceKey.Trim().ToLowerInvariant()
            .Replace("http://", "")
            .Replace("https://", "")
            .Split('.')[0]
            .Split('/')[0];

        return await _masterCatalogDbContext.MasterTenantCatalogs
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.IsActive && (t.TenantKey == cleanKey || t.PrimaryDomain.StartsWith(cleanKey) || (t.CustomDomain != null && t.CustomDomain.Contains(cleanKey))), cancellationToken);
    }

    /// <summary>
    /// Provisions a new sovereign organization workspace environment with dedicated storage, default configuration, and administrator credentials.
    /// </summary>
    /// <param name="request">The onboarding request containing organization details and administrator credentials.</param>
    /// <param name="cancellationToken">Cancellation token for async operations.</param>
    /// <returns>The onboarding result including domain and redirect information.</returns>
    public async Task<TenantOnboardingResult> OnboardNewTenantAsync(TenantOnboardingRequest request, CancellationToken cancellationToken = default)
    {
        var cleanKey = request.TenantKey.Trim().ToLowerInvariant().Replace(" ", "-");
        var primaryDomain = $"{cleanKey}.localhost:4200";
        var cleanReferralCode = string.IsNullOrWhiteSpace(request.ReferredBy) ? null : request.ReferredBy.Trim().ToUpperInvariant();

        // 1. Validate Not Reserved
        if (ReservedWorkspaceNames.IsReserved(cleanKey))
        {
            return new TenantOnboardingResult
            {
                Success = false,
                Message = $"Workspace address '{cleanKey}' is reserved by the platform and cannot be registered. Please select another workspace name."
            };
        }

        // 2. Validate Uniqueness
        bool keyTaken = await _masterCatalogDbContext.MasterTenantCatalogs
            .AnyAsync(t => t.TenantKey == cleanKey || t.PrimaryDomain == primaryDomain, cancellationToken);

        if (keyTaken)
        {
            return new TenantOnboardingResult
            {
                Success = false,
                Message = $"Workspace address '{cleanKey}' is already registered. Please choose another workspace name."
            };
        }

        var masterConnStr = _masterCatalogDbContext.Database.GetConnectionString()
            ?? _tenantOptions.Value.ConnectionString
            ?? string.Empty;

        var serverBuilder = new SqlConnectionStringBuilder(masterConnStr);
        string serverHost = serverBuilder.DataSource;

        // 2. Generate Randomized Database Name & Dedicated SQL Credentials
        string dbName = TenantSecurityGenerator.GenerateDatabaseName(cleanKey);
        string sqlUsername = TenantSecurityGenerator.GenerateSqlUsername(cleanKey);
        string sqlPassword = TenantSecurityGenerator.GenerateStrongPassword(32);

        // 3. Build Dedicated Workspace Connection String with environment-adaptive security
        var tenantConnBuilder = new SqlConnectionStringBuilder
        {
            DataSource = serverHost,
            InitialCatalog = dbName,
            TrustServerCertificate = true,
            PersistSecurityInfo = true
        };

        if (serverBuilder.IntegratedSecurity)
        {
            // Retain Windows Authentication when running on local integrated security instances
            tenantConnBuilder.IntegratedSecurity = true;
        }
        else
        {
            // Use dedicated isolated SQL login credentials in mixed-mode/production environments
            tenantConnBuilder.UserID = sqlUsername;
            tenantConnBuilder.Password = sqlPassword;
        }

        string dedicatedTenantConnStr = tenantConnBuilder.ConnectionString;

        try
        {
            _logger.LogInformation("================================================================");
            _logger.LogInformation("🚀 PROVISIONING ISOLATED TENANT: [{TenantKey}] - {OrgName}", cleanKey, request.OrganizationName);
            _logger.LogInformation("   ├── Database Name: {DatabaseName}", dbName);
            _logger.LogInformation("   ├── SQL Username:  {SqlUser}", sqlUsername);
            _logger.LogInformation("   ├── Primary Domain: {PrimaryDomain}", primaryDomain);
            if (!string.IsNullOrEmpty(cleanReferralCode))
            {
                _logger.LogInformation("   └── Referred By Partner: {PartnerCode}", cleanReferralCode);
            }

            // Step A: Execute SQL DDL via Master DB Connection (Create Login, DB, User)
            await CreateDatabaseAndSqlLoginAsync(masterConnStr, dbName, sqlUsername, sqlPassword, cancellationToken);

            // Step B: Apply EF Core Migrations using DashboardDbContext
            await ApplyTenantMigrationsAsync(dedicatedTenantConnStr, cancellationToken);

            // Step C: Seed Initial Admin User & Configuration
            await SeedInitialTenantDataAsync(dedicatedTenantConnStr, request, cancellationToken);

            // Step D: Register in Master Catalog
            var catalogEntry = new MasterTenantCatalog
            {
                TenantKey = cleanKey,
                OrganizationName = request.OrganizationName,
                PrimaryDomain = primaryDomain,
                WebsiteUrl = $"https://{primaryDomain}",
                CustomDomain = string.IsNullOrWhiteSpace(request.CustomDomain) ? null : request.CustomDomain.Trim().ToLowerInvariant(),
                DatabaseName = dbName,
                ConnectionString = dedicatedTenantConnStr,
                AdminEmail = request.AdminEmail,
                ReferredByPartnerCode = cleanReferralCode,
                IsActive = true,
                CreatedUtc = DateTime.UtcNow
            };

            _masterCatalogDbContext.MasterTenantCatalogs.Add(catalogEntry);

            // Step E: Attribution for Affiliate Partner if referred
            if (!string.IsNullOrEmpty(cleanReferralCode))
            {
                var affiliatePartner = await _masterCatalogDbContext.MasterAffiliatePartners
                    .FirstOrDefaultAsync(p => p.PartnerCode == cleanReferralCode, cancellationToken);

                if (affiliatePartner != null)
                {
                    const decimal basePlanAmount = 199.00m; // Base plan
                    var commissionEarned = (basePlanAmount * affiliatePartner.CommissionRatePercentage) / 100m;

                    var referralRecord = new MasterAffiliateReferral
                    {
                        AffiliatePartnerId = affiliatePartner.Id,
                        ReferredTenantKey = cleanKey,
                        ReferredOrganizationName = request.OrganizationName,
                        SubscriptionAmount = basePlanAmount,
                        CommissionEarned = commissionEarned,
                        CommissionStatus = "Pending",
                        CreatedUtc = DateTime.UtcNow
                    };

                    _masterCatalogDbContext.MasterAffiliateReferrals.Add(referralRecord);
                    affiliatePartner.PendingBalance += commissionEarned;
                    affiliatePartner.TotalEarned += commissionEarned;
                }
            }

            await _masterCatalogDbContext.SaveChangesAsync(cancellationToken);

            // Step F: Automatically Provision Compulsory Core Feature Subscriptions ($0 / Base Tier)
            var compulsoryFeatures = await _masterCatalogDbContext.MasterFeatureCatalogs
                .AsNoTracking()
                .Where(f => f.IsCompulsory && f.IsActive)
                .ToListAsync(cancellationToken);

            foreach (var coreFeature in compulsoryFeatures)
            {
                _masterCatalogDbContext.MasterTenantFeatureSubscriptions.Add(new MasterTenantFeatureSubscription
                {
                    Id = Guid.NewGuid(),
                    MasterTenantCatalogId = catalogEntry.Id,
                    MasterFeatureCatalogId = coreFeature.Id,
                    DurationType = SubscriptionBillingDuration.Yearly,
                    RecurringPrice = 0.00m,
                    StartsAtUtc = DateTime.UtcNow,
                    ExpiresAtUtc = DateTime.UtcNow.AddYears(10), // Core features stay active
                    AutoRenew = true,
                    IsActive = true,
                    Status = "Active",
                    CreatedUtc = DateTime.UtcNow
                });
            }

            if (compulsoryFeatures.Count > 0)
            {
                await _masterCatalogDbContext.SaveChangesAsync(cancellationToken);
            }

            _logger.LogInformation("✅ TENANT [{TenantKey}] ONBOARDED SUCCESSFULLY!", cleanKey);
            _logger.LogInformation("================================================================");

            return new TenantOnboardingResult
            {
                Success = true,
                TenantKey = cleanKey,
                OrganizationName = request.OrganizationName,
                PrimaryDomain = primaryDomain,
                DatabaseName = dbName,
                RedirectUrl = $"https://{primaryDomain}/auth/login",
                Message = $"Workspace '{request.OrganizationName}' created successfully!"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "🔥 Failed to onboard tenant [{TenantKey}]", cleanKey);
            return new TenantOnboardingResult
            {
                Success = false,
                TenantKey = cleanKey,
                OrganizationName = request.OrganizationName,
                Message = $"Onboarding failed: {ex.Message}",
                ErrorDetail = ex.ToString()
            };
        }
    }

    private async Task CreateDatabaseAndSqlLoginAsync(string masterConnStr, string dbName, string sqlUsername, string sqlPassword, CancellationToken cancellationToken)
    {
        var masterBuilder = new SqlConnectionStringBuilder(masterConnStr)
        {
            InitialCatalog = "master"
        };

        using var connection = new SqlConnection(masterBuilder.ConnectionString);
        await connection.OpenAsync(cancellationToken);

        // 1. Create Server-Level SQL Login if SQL Auth is enabled on the instance
        if (!masterBuilder.IntegratedSecurity)
        {
            try
            {
                string createLoginSql = $@"
                    IF NOT EXISTS (SELECT name FROM sys.server_principals WHERE name = '{sqlUsername}')
                    BEGIN
                        CREATE LOGIN [{sqlUsername}] WITH PASSWORD = N'{sqlPassword.Replace("'", "''")}', CHECK_POLICY = OFF;
                    END;
                ";
                using var cmdLogin = new SqlCommand(createLoginSql, connection);
                await cmdLogin.ExecuteNonQueryAsync(cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Note: SQL login creation bypassed or managed via Windows Authentication for {SqlUsername}", sqlUsername);
            }
        }

        // 2. Create Database
        string createDbSql = $@"
            IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = '{dbName}')
            BEGIN
                CREATE DATABASE [{dbName}];
            END;
        ";
        using var cmdDb = new SqlCommand(createDbSql, connection);
        await cmdDb.ExecuteNonQueryAsync(cancellationToken);

        // 3. Map Login to Database User with db_owner role if SQL login was created
        if (!masterBuilder.IntegratedSecurity)
        {
            try
            {
                string mapUserSql = $@"
                    USE [{dbName}];
                    IF NOT EXISTS (SELECT name FROM sys.database_principals WHERE name = '{sqlUsername}')
                    BEGIN
                        CREATE USER [{sqlUsername}] FOR LOGIN [{sqlUsername}];
                        ALTER ROLE [db_owner] ADD MEMBER [{sqlUsername}];
                    END;
                ";
                using var cmdUser = new SqlCommand(mapUserSql, connection);
                await cmdUser.ExecuteNonQueryAsync(cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Note: Database user mapping bypassed for {SqlUsername}", sqlUsername);
            }
        }
    }

    private async Task ApplyTenantMigrationsAsync(string tenantConnStr, CancellationToken cancellationToken)
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

    private async Task SeedInitialTenantDataAsync(string tenantConnStr, TenantOnboardingRequest request, CancellationToken cancellationToken)
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
            var rolesToSeed = new[] { "SuperAdmin", "Admin", "Manager", "Member", "User" };
            foreach (var roleName in rolesToSeed)
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
            await dbContext.SaveChangesAsync(cancellationToken);

            // 2. Seed Admin User
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
                    FirstName = request.AdminFirstName,
                    LastName = request.AdminLastName,
                    PhoneNumber = request.PhoneNumber,
                    SecurityStamp = Guid.NewGuid().ToString()
                };
                adminUser.PasswordHash = hasher.HashPassword(adminUser, request.AdminPassword);
                dbContext.Users.Add(adminUser);
                await dbContext.SaveChangesAsync(cancellationToken);

                var superAdminRole = await dbContext.Roles.FirstOrDefaultAsync(r => r.Name == "SuperAdmin", cancellationToken);
                if (superAdminRole != null)
                {
                    dbContext.UserRoles.Add(new IdentityUserRole<string>
                    {
                        UserId = adminUser.Id,
                        RoleId = superAdminRole.Id
                    });
                    await dbContext.SaveChangesAsync(cancellationToken);
                }
            }

            var sectorDefaults = GetSectorDefaults(request.Sector, request.OrganizationName);
            var abbreviation = ComputeAbbreviation(request.OrganizationName);

            // 3. Seed ConfigSettings
            if (!await dbContext.ConfigSettings.AnyAsync(cancellationToken))
            {
                dbContext.ConfigSettings.Add(new ConfigSetting
                {
                    Id = Guid.NewGuid(),
                    CompanyName = request.OrganizationName,
                    CompanyNameAbbreviation = abbreviation,
                    CompanyDescription = sectorDefaults.Description,
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

            // 4. Seed BcpSettings
            if (!await dbContext.BcpSettings.AnyAsync(cancellationToken))
            {
                dbContext.BcpSettings.Add(new BcpSetting
                {
                    Id = Guid.NewGuid(),
                    CurrencyCode = "USD",
                    CurrencySymbol = "$"
                });
            }

            // 5a. Seed Categories for Dropdown Menus and Footer Columns
            var servicesCategory = await dbContext.PageCategories.FirstOrDefaultAsync(c => c.Title == "Services", cancellationToken);
            if (servicesCategory == null)
            {
                servicesCategory = new PageCategory
                {
                    Id = Guid.NewGuid(),
                    Title = "Services",
                    FooterDisplayTitle = "Solutions",
                    MenuSortOrder = 3,
                    ShowInFooter = true,
                    Publish = true
                };
                dbContext.PageCategories.Add(servicesCategory);
            }

            var companyCategory = await dbContext.PageCategories.FirstOrDefaultAsync(c => c.Title == "Company", cancellationToken);
            if (companyCategory == null)
            {
                companyCategory = new PageCategory
                {
                    Id = Guid.NewGuid(),
                    Title = "Company",
                    FooterDisplayTitle = "Company",
                    MenuSortOrder = 4,
                    ShowInFooter = true,
                    Publish = true
                };
                dbContext.PageCategories.Add(companyCategory);
            }
            await dbContext.SaveChangesAsync(cancellationToken);

            // 5b. Seed Default Web Pages (Home, About Us, Services, Request a Service, Contact Us)
            var homePage = await dbContext.WebPages.FirstOrDefaultAsync(p => p.DirectUrl == "home", cancellationToken);
            if (homePage == null)
            {
                homePage = new WebPage
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
                dbContext.WebPages.Add(homePage);
            }

            var aboutPage = await dbContext.WebPages.FirstOrDefaultAsync(p => p.DirectUrl == "about", cancellationToken);
            if (aboutPage == null)
            {
                aboutPage = new WebPage
                {
                    Id = Guid.NewGuid(),
                    Title = "About Us",
                    DirectUrl = "about",
                    PageCategoryId = companyCategory.Id,
                    ShowInMainMenu = true,
                    ShowInFooter = true,
                    EnableDirectUrl = true,
                    Publish = true,
                    SortOrder = 2
                };
                dbContext.WebPages.Add(aboutPage);
            }

            var servicesPage = await dbContext.WebPages.FirstOrDefaultAsync(p => p.DirectUrl == "services", cancellationToken);
            if (servicesPage == null)
            {
                servicesPage = new WebPage
                {
                    Id = Guid.NewGuid(),
                    Title = "Services",
                    DirectUrl = "services",
                    PageCategoryId = servicesCategory.Id,
                    ShowInMainMenu = true,
                    ShowInFooter = true,
                    EnableDirectUrl = true,
                    Publish = true,
                    SortOrder = 3
                };
                dbContext.WebPages.Add(servicesPage);
            }

            // Seed 4 Child Services under the Services Category for Dropdown Menu & Footer Column
            var service1 = await dbContext.WebPages.FirstOrDefaultAsync(p => p.DirectUrl == "strategic-advisory", cancellationToken);
            if (service1 == null)
            {
                service1 = new WebPage
                {
                    Id = Guid.NewGuid(),
                    Title = "Strategic Consulting",
                    DirectUrl = "strategic-advisory",
                    PageCategoryId = servicesCategory.Id,
                    ShowInMenuDropDown = true,
                    ShowInFooter = true,
                    EnableDirectUrl = true,
                    Publish = true,
                    SortOrder = 10
                };
                dbContext.WebPages.Add(service1);
            }

            var service2 = await dbContext.WebPages.FirstOrDefaultAsync(p => p.DirectUrl == "systems-modernization", cancellationToken);
            if (service2 == null)
            {
                service2 = new WebPage
                {
                    Id = Guid.NewGuid(),
                    Title = "Systems Modernization",
                    DirectUrl = "systems-modernization",
                    PageCategoryId = servicesCategory.Id,
                    ShowInMenuDropDown = true,
                    ShowInFooter = true,
                    EnableDirectUrl = true,
                    Publish = true,
                    SortOrder = 11
                };
                dbContext.WebPages.Add(service2);
            }

            var service3 = await dbContext.WebPages.FirstOrDefaultAsync(p => p.DirectUrl == "performance-scale", cancellationToken);
            if (service3 == null)
            {
                service3 = new WebPage
                {
                    Id = Guid.NewGuid(),
                    Title = "Performance & Scale",
                    DirectUrl = "performance-scale",
                    PageCategoryId = servicesCategory.Id,
                    ShowInMenuDropDown = true,
                    ShowInFooter = true,
                    EnableDirectUrl = true,
                    Publish = true,
                    SortOrder = 12
                };
                dbContext.WebPages.Add(service3);
            }

            var service4 = await dbContext.WebPages.FirstOrDefaultAsync(p => p.DirectUrl == "enterprise-governance", cancellationToken);
            if (service4 == null)
            {
                service4 = new WebPage
                {
                    Id = Guid.NewGuid(),
                    Title = "Enterprise Advisory",
                    DirectUrl = "enterprise-governance",
                    PageCategoryId = servicesCategory.Id,
                    ShowInMenuDropDown = true,
                    ShowInFooter = true,
                    EnableDirectUrl = true,
                    Publish = true,
                    SortOrder = 13
                };
                dbContext.WebPages.Add(service4);
            }

            var requestServicePage = await dbContext.WebPages.FirstOrDefaultAsync(p => p.DirectUrl == "request-service", cancellationToken);
            if (requestServicePage == null)
            {
                requestServicePage = new WebPage
                {
                    Id = Guid.NewGuid(),
                    Title = "Request a Service",
                    DirectUrl = "request-service",
                    PageCategoryId = companyCategory.Id,
                    ShowInMainMenu = true,
                    ShowInFooter = true,
                    EnableDirectUrl = true,
                    Publish = true,
                    SortOrder = 4
                };
                dbContext.WebPages.Add(requestServicePage);
            }

            var contactPage = await dbContext.WebPages.FirstOrDefaultAsync(p => p.DirectUrl == "contact", cancellationToken);
            if (contactPage == null)
            {
                contactPage = new WebPage
                {
                    Id = Guid.NewGuid(),
                    Title = "Contact Us",
                    DirectUrl = "contact",
                    PageCategoryId = companyCategory.Id,
                    ShowInMainMenu = true,
                    ShowInFooter = true,
                    EnableDirectUrl = true,
                    Publish = true,
                    SortOrder = 5
                };
                dbContext.WebPages.Add(contactPage);
            }

            // 5c. Seed 3 Turnkey Legal Compliance WebPages (Privacy Policy, Terms & Conditions, Cookie Policy)
            var privacyPage = await dbContext.WebPages.FirstOrDefaultAsync(p => p.DirectUrl == "privacy-policy", cancellationToken);
            if (privacyPage == null)
            {
                privacyPage = new WebPage
                {
                    Id = Guid.NewGuid(),
                    Title = "Privacy Policy",
                    DirectUrl = "privacy-policy",
                    IsLegal = true,
                    ShowInMainMenu = false,
                    ShowInFooter = true,
                    EnableDirectUrl = true,
                    Publish = true,
                    SortOrder = 20
                };
                dbContext.WebPages.Add(privacyPage);
            }

            var termsPage = await dbContext.WebPages.FirstOrDefaultAsync(p => p.DirectUrl == "terms-and-conditions", cancellationToken);
            if (termsPage == null)
            {
                termsPage = new WebPage
                {
                    Id = Guid.NewGuid(),
                    Title = "Terms & Conditions",
                    DirectUrl = "terms-and-conditions",
                    IsLegal = true,
                    ShowInMainMenu = false,
                    ShowInFooter = true,
                    EnableDirectUrl = true,
                    Publish = true,
                    SortOrder = 21
                };
                dbContext.WebPages.Add(termsPage);
            }

            var cookiePage = await dbContext.WebPages.FirstOrDefaultAsync(p => p.DirectUrl == "cookie-policy", cancellationToken);
            if (cookiePage == null)
            {
                cookiePage = new WebPage
                {
                    Id = Guid.NewGuid(),
                    Title = "Cookie Policy",
                    DirectUrl = "cookie-policy",
                    IsLegal = true,
                    ShowInMainMenu = false,
                    ShowInFooter = true,
                    EnableDirectUrl = true,
                    Publish = true,
                    SortOrder = 22
                };
                dbContext.WebPages.Add(cookiePage);
            }
            await dbContext.SaveChangesAsync(cancellationToken);

            // 5b. Seed Standard CMS Dynamic Forms (Contact Us, Newsletter, Service Request & Intake)
            await SeedDefaultPageFormsAsync(dbContext, cancellationToken);
            await dbContext.SaveChangesAsync(cancellationToken);

            // 5c. Seed Structured Page Sections & Repeatable Child Lists
            await SeedDefaultPageSectionsAsync(dbContext, request, sectorDefaults, abbreviation, homePage, aboutPage, servicesPage, requestServicePage, contactPage, cancellationToken);

            // 6. Seed Default Hero Slider
            if (!await dbContext.Sliders.AnyAsync(cancellationToken))
            {
                dbContext.Sliders.Add(new Slider
                {
                    Id = Guid.NewGuid(),
                    Title = $"Welcome to {request.OrganizationName}",
                    Text = sectorDefaults.Slogan,
                    ButtonText = "Explore Solutions",
                    ButtonLink = "/services",
                    Show = true,
                    SortOrder = 1
                });
            }

            // 7. Seed Default Global Code Injections (Bootstrap 5.3 CSS/JS & Font Awesome 6)
            await SeedDefaultCodeInjectionsAsync(dbContext, cancellationToken);

            // 8. Seed Complete Turnkey Theme Suite (All 9 Categories, 7 Body Sections, Font Awesome Icons, Bootstrap 5)
            await SeedDefaultInstalledTemplatesAsync(dbContext, request.OrganizationName, cancellationToken);

            await dbContext.SaveChangesAsync(cancellationToken);
        }
    }

    /// <summary>
    /// Seeds foundational CMS PageForms into the tenant database, including Contact Us,
    /// Newsletter Subscription, and the interactive Service Request &amp; Project Intake form.
    /// </summary>
    /// <param name="dbContext">The tenant's dedicated DashboardDbContext instance.</param>
    /// <param name="cancellationToken">Cancellation token for async operations.</param>
    /// <returns>A Task representing the asynchronous operation.</returns>
    private static async Task SeedDefaultPageFormsAsync(DashboardDbContext dbContext, CancellationToken cancellationToken)
    {
        if (await dbContext.PageForms.AnyAsync(cancellationToken))
        {
            return;
        }

        var contactForm = new PageForm
        {
            Id = Guid.NewGuid(),
            Title = "Contact Us",
            FormKey = "contact-us",
            Description = "Send our team a direct message and we will respond promptly.",
            SubmitButtonText = "Send Message",
            SuccessMessage = "Thank you! Your message has been received. Our team will get back to you shortly.",
            IsActive = true,
            CreatedAtUtc = DateTime.UtcNow,
            Fields = new List<PageFormField>
            {
                new() { Id = Guid.NewGuid(), FieldKey = "full_name", Label = "Full Name", Placeholder = "Your Full Name *", FieldType = "text", IsRequired = true, SortOrder = 1, GridWidth = "col-md-6" },
                new() { Id = Guid.NewGuid(), FieldKey = "email", Label = "Email Address", Placeholder = "name@company.com *", FieldType = "email", IsRequired = true, SortOrder = 2, GridWidth = "col-md-6" },
                new() { Id = Guid.NewGuid(), FieldKey = "phone", Label = "Phone Number", Placeholder = "+1 (555) 000-0000", FieldType = "phone", IsRequired = false, SortOrder = 3, GridWidth = "col-md-6" },
                new() { Id = Guid.NewGuid(), FieldKey = "subject", Label = "Subject", Placeholder = "How can we help?", FieldType = "text", IsRequired = false, SortOrder = 4, GridWidth = "col-md-6" },
                new() { Id = Guid.NewGuid(), FieldKey = "message", Label = "Your Message", Placeholder = "Please describe your inquiry or requirements in detail...", FieldType = "textarea", IsRequired = true, SortOrder = 5, GridWidth = "col-md-12" }
            }
        };

        var newsletterForm = new PageForm
        {
            Id = Guid.NewGuid(),
            Title = "Newsletter Subscription",
            FormKey = "newsletter",
            Description = "Subscribe to our periodic industry insights, corporate bulletins, and platform updates.",
            SubmitButtonText = "Subscribe",
            SuccessMessage = "Thank you for subscribing! You have been added to our priority announcement list.",
            IsActive = true,
            CreatedAtUtc = DateTime.UtcNow,
            Fields = new List<PageFormField>
            {
                new() { Id = Guid.NewGuid(), FieldKey = "email", Label = "Email Address", Placeholder = "Enter your official email address...", FieldType = "email", IsRequired = true, SortOrder = 1, GridWidth = "col-md-12" }
            }
        };

        var serviceRequestForm = new PageForm
        {
            Id = Guid.NewGuid(),
            Title = "Service Request & Project Intake",
            FormKey = "service-request",
            Description = "Please answer the questions below so we can pair you with the right specialist.",
            SubmitButtonText = "Submit Service Request",
            SuccessMessage = "Thank you! Your service request has been received. A dedicated specialist will contact you within 1 business day.",
            IsActive = true,
            CreatedAtUtc = DateTime.UtcNow,
            Fields = new List<PageFormField>
            {
                new()
                {
                    Id = Guid.NewGuid(),
                    FieldKey = "service_required",
                    Label = "1. What service or solution do you require?",
                    FieldType = "pill_select",
                    OptionsJson = "[\"Strategic Consulting & Advisory\", \"Digital Systems Modernization\", \"Directory & Portal Governance\", \"Custom Enterprise Integration\"]",
                    IsRequired = true,
                    SortOrder = 1,
                    GridWidth = "col-md-12"
                },
                new()
                {
                    Id = Guid.NewGuid(),
                    FieldKey = "timeline",
                    Label = "2. Estimated Timeline",
                    FieldType = "dropdown",
                    OptionsJson = "[\"Immediate (Within 30 Days)\", \"1–3 Months\", \"Next Fiscal Quarter\", \"Exploratory / Feasibility Only\"]",
                    IsRequired = true,
                    SortOrder = 2,
                    GridWidth = "col-md-6"
                },
                new()
                {
                    Id = Guid.NewGuid(),
                    FieldKey = "organization_scale",
                    Label = "3. Organization Scale",
                    FieldType = "dropdown",
                    OptionsJson = "[\"1–50 Members / Staff\", \"50–500 Enterprise Members\", \"500+ Large Institutional Body\"]",
                    IsRequired = true,
                    SortOrder = 3,
                    GridWidth = "col-md-6"
                },
                new()
                {
                    Id = Guid.NewGuid(),
                    FieldKey = "full_name",
                    Label = "Full Name",
                    Placeholder = "Your Full Name *",
                    FieldType = "text",
                    IsRequired = true,
                    SortOrder = 4,
                    GridWidth = "col-md-6"
                },
                new()
                {
                    Id = Guid.NewGuid(),
                    FieldKey = "professional_title",
                    Label = "Professional Title",
                    Placeholder = "Professional Title *",
                    FieldType = "text",
                    IsRequired = false,
                    SortOrder = 5,
                    GridWidth = "col-md-6"
                },
                new()
                {
                    Id = Guid.NewGuid(),
                    FieldKey = "organization_name",
                    Label = "Organization / Institution Name",
                    Placeholder = "Organization / Institution Name *",
                    FieldType = "text",
                    IsRequired = false,
                    SortOrder = 6,
                    GridWidth = "col-md-6"
                },
                new()
                {
                    Id = Guid.NewGuid(),
                    FieldKey = "email",
                    Label = "Official Business Email",
                    Placeholder = "Official Business Email *",
                    FieldType = "email",
                    IsRequired = true,
                    SortOrder = 7,
                    GridWidth = "col-md-6"
                },
                new()
                {
                    Id = Guid.NewGuid(),
                    FieldKey = "project_brief",
                    Label = "5. Project Brief & Key Requirements",
                    Placeholder = "Describe your primary objectives, deliverables, existing pain points, or questions...",
                    FieldType = "textarea",
                    IsRequired = false,
                    SortOrder = 8,
                    GridWidth = "col-md-12"
                }
            }
        };

        dbContext.PageForms.AddRange(contactForm, newsletterForm, serviceRequestForm);
    }

    /// <summary>
    /// Seeds foundational CDN links for Bootstrap 5.3, Font Awesome 6, and modern typography
    /// into the tenant's dedicated SiteCodeInjectionTags table.
    /// </summary>
    /// <param name="dbContext">The tenant's dedicated DashboardDbContext instance.</param>
    /// <param name="cancellationToken">Cancellation token for async operations.</param>
    /// <returns>A Task representing the asynchronous operation.</returns>
    private static async Task SeedDefaultCodeInjectionsAsync(DashboardDbContext dbContext, CancellationToken cancellationToken)
    {
        if (await dbContext.SiteCodeInjectionTags.AnyAsync(cancellationToken))
        {
            return;
        }

        var defaultTags = new List<SiteCodeInjectionTag>
        {
            new()
            {
                Id = Guid.NewGuid(),
                Name = "Bootstrap 5.3 CSS",
                Zone = "head",
                TagType = "link_stylesheet",
                Content = "<link rel=\"stylesheet\" href=\"https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css\" integrity=\"sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH\" crossorigin=\"anonymous\">",
                SortOrder = 10,
                IsActive = true
            },
            new()
            {
                Id = Guid.NewGuid(),
                Name = "Font Awesome 6 Free",
                Zone = "head",
                TagType = "link_stylesheet",
                Content = "<link rel=\"stylesheet\" href=\"https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css\" integrity=\"sha512-DTOQO9RWCH3ppGqcWaEA1BIZOC6xxalwEsw9c2QQeAIftl+Vegovlnee1c9QX4TctnWMn13TZye+giMm8e2LwA==\" crossorigin=\"anonymous\" referrerpolicy=\"no-referrer\" />",
                SortOrder = 20,
                IsActive = true
            },
            new()
            {
                Id = Guid.NewGuid(),
                Name = "Google Fonts (Inter)",
                Zone = "head",
                TagType = "google_fonts",
                Content = "<link rel=\"preconnect\" href=\"https://fonts.googleapis.com\">\n<link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin>\n<link href=\"https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap\" rel=\"stylesheet\">",
                SortOrder = 30,
                IsActive = true
            },
            new()
            {
                Id = Guid.NewGuid(),
                Name = "Primary SEO & Crawler Directives",
                Zone = "head",
                TagType = "meta_tag",
                Content = "<meta name=\"description\" content=\"{{ MetaDescription }}\" />\n<meta name=\"keywords\" content=\"{{ Keywords }}\" />\n<meta name=\"robots\" content=\"index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1\" />\n<link rel=\"canonical\" href=\"{{ CanonicalUrl }}\" />",
                SortOrder = 40,
                IsActive = true
            },
            new()
            {
                Id = Guid.NewGuid(),
                Name = "OpenGraph Social Protocol",
                Zone = "head",
                TagType = "meta_tag",
                Content = "<meta property=\"og:type\" content=\"website\" />\n<meta property=\"og:site_name\" content=\"{{ BrandName }}\" />\n<meta property=\"og:title\" content=\"{{ Title }} | {{ BrandName }}\" />\n<meta property=\"og:description\" content=\"{{ MetaDescription }}\" />\n<meta property=\"og:url\" content=\"{{ CanonicalUrl }}\" />\n<meta property=\"og:image\" content=\"{{ LogoUrl }}\" />",
                SortOrder = 50,
                IsActive = true
            },
            new()
            {
                Id = Guid.NewGuid(),
                Name = "Twitter & X Card Directives",
                Zone = "head",
                TagType = "meta_tag",
                Content = "<meta name=\"twitter:card\" content=\"summary_large_image\" />\n<meta name=\"twitter:title\" content=\"{{ Title }} | {{ BrandName }}\" />\n<meta name=\"twitter:description\" content=\"{{ MetaDescription }}\" />\n<meta name=\"twitter:image\" content=\"{{ LogoUrl }}\" />\n<meta name=\"twitter:site\" content=\"@{{ BrandName }}\" />",
                SortOrder = 60,
                IsActive = true
            },
            new()
            {
                Id = Guid.NewGuid(),
                Name = "Mobile Web App & Theme Color",
                Zone = "head",
                TagType = "meta_tag",
                Content = "<meta name=\"theme-color\" content=\"#0050e5\" />\n<meta name=\"apple-mobile-web-app-capable\" content=\"yes\" />\n<meta name=\"apple-mobile-web-app-status-bar-style\" content=\"default\" />\n<meta name=\"apple-mobile-web-app-title\" content=\"{{ BrandName }}\" />",
                SortOrder = 70,
                IsActive = true
            },
            new()
            {
                Id = Guid.NewGuid(),
                Name = "Schema.org JSON-LD Structured Data",
                Zone = "head",
                TagType = "raw_html",
                Content = "<script type=\"application/ld+json\">\n{\n  \"@context\": \"https://schema.org\",\n  \"@type\": \"Organization\",\n  \"name\": \"{{ BrandName }}\",\n  \"url\": \"{{ CanonicalUrl }}\",\n  \"logo\": \"{{ LogoUrl }}\",\n  \"description\": \"{{ MetaDescription }}\"\n}\n</script>",
                SortOrder = 80,
                IsActive = true
            },
            new()
            {
                Id = Guid.NewGuid(),
                Name = "Favicon & Web App Icons",
                Zone = "head",
                TagType = "raw_html",
                Content = "<link rel=\"shortcut icon\" href=\"{{ FaviconUrl }}\" type=\"image/x-icon\" />\n<link rel=\"icon\" type=\"image/x-icon\" href=\"{{ FaviconUrl }}\" />\n<link rel=\"apple-touch-icon\" href=\"{{ LogoUrl }}\" />",
                SortOrder = 90,
                IsActive = true
            },
            new()
            {
                Id = Guid.NewGuid(),
                Name = "Bootstrap 5.3 Bundle JS",
                Zone = "footer",
                TagType = "script_url",
                Content = "<script src=\"https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js\" integrity=\"sha384-YvpcrYf0tY3lHB60NNkmXc5s9fDVZLESaAA55NDzOxhy9GkcIdslK1eN7N6jIeHz\" crossorigin=\"anonymous\"></script>",
                SortOrder = 10,
                IsActive = true
            }
        };

        dbContext.SiteCodeInjectionTags.AddRange(defaultTags);
    }

    /// <summary>
    /// Seeds the complete turnkey light theme starter suite into TenantInstalledTemplates.
    /// Covers all 9 categories (including 6 distinct body sections) with Bootstrap 5 classes,
    /// Font Awesome 6 icons, and zero emojis.
    /// </summary>
    /// <param name="dbContext">The tenant's dedicated DashboardDbContext instance.</param>
    /// <param name="organizationName">The display organization name for placeholder branding.</param>
    /// <param name="cancellationToken">Cancellation token for async operations.</param>
    /// <returns>A Task representing the asynchronous operation.</returns>
    private static async Task SeedDefaultInstalledTemplatesAsync(DashboardDbContext dbContext, string organizationName, CancellationToken cancellationToken)
    {
        if (await dbContext.TenantInstalledTemplates.AnyAsync(cancellationToken))
        {
            return;
        }

        var templates = new List<TenantInstalledTemplate>
        {
            // 1. Navigation / Menu
            new()
            {
                Id = Guid.NewGuid(),
                TemplateKey = "Menu_Classic",
                CategoryKey = "menu",
                Name = "Classic Light Corporate Navbar",
                VariantCode = "Menu_Classic",
                InstalledVersion = "1.0.0",
                IsActive = true,
                InstalledUtc = DateTime.UtcNow,
                HtmlTemplate = @"
<header class=""oz-nav-header sticky-top bg-white border-bottom shadow-sm"">
  <nav class=""navbar navbar-expand-lg navbar-light py-3"">
    <div class=""container"">
      <a class=""navbar-brand d-flex align-items-center gap-2"" href=""#home"">
        <span class=""fw-bolder text-dark fs-4 tracking-tight"">{{ BrandName }}</span>
      </a>
      <button class=""navbar-toggler border-0 shadow-none"" type=""button"" onclick=""this.closest('nav').querySelector('.collapse').classList.toggle('show')"">
        <span class=""navbar-toggler-icon""></span>
      </button>
      <div class=""collapse navbar-collapse"" id=""ozNavMain"">
        <ul class=""navbar-nav mx-auto mb-2 mb-lg-0 gap-lg-4"">
          <li class=""nav-item""><a class=""nav-link fw-semibold text-dark active"" href=""#home"">Home</a></li>
          <li class=""nav-item""><a class=""nav-link fw-semibold text-secondary"" href=""#about"">About</a></li>
          <li class=""nav-item""><a class=""nav-link fw-semibold text-secondary"" href=""#services"">Services</a></li>
          <li class=""nav-item""><a class=""nav-link fw-semibold text-secondary"" href=""#blog"">News</a></li>
          <li class=""nav-item""><a class=""nav-link fw-semibold text-secondary"" href=""#contact"">Contact</a></li>
        </ul>
        <div class=""d-flex align-items-center gap-3"">
          <a href=""#request-service"" class=""btn btn-primary rounded-pill px-4 py-2 fw-bold shadow-sm d-inline-flex align-items-center gap-2"">
            <span>Request a Service</span>
            <span style=""font-size: 16px;"">→</span>
          </a>
        </div>
      </div>
    </div>
  </nav>
</header>",
                CssStyles = @"
.oz-nav-header { background-color: #ffffff !important; }
.oz-nav-header .navbar-brand { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; letter-spacing: -0.03em; }
.oz-nav-header .nav-link { font-size: 14.5px; font-weight: 600; color: #475569 !important; padding: 8px 4px !important; transition: color 0.15s ease; }
.oz-nav-header .nav-link:hover, .oz-nav-header .nav-link.active { color: #0050e5 !important; }
.oz-nav-header .btn-primary { background-color: #0050e5; border-color: #0050e5; font-size: 13.5px; transition: all 0.2s ease; }
.oz-nav-header .btn-primary:hover { background-color: #003bb5; border-color: #003bb5; transform: translateY(-1px); box-shadow: 0 4px 14px rgba(0, 80, 229, 0.35) !important; }"
            },

            // 2. Hero Unit
            new()
            {
                Id = Guid.NewGuid(),
                TemplateKey = "Hero_CorporateSplit",
                CategoryKey = "hero",
                Name = "Modern Corporate Split Hero",
                VariantCode = "Hero_CorporateSplit",
                InstalledVersion = "1.0.0",
                IsActive = true,
                InstalledUtc = DateTime.UtcNow,
                HtmlTemplate = @"
<section class=""py-5 bg-light border-bottom"">
  <div class=""container py-lg-4"">
    <div class=""row align-items-center g-5"">
      <div class=""col-lg-6"">
        <div class=""d-inline-flex align-items-center gap-2 px-3 py-1 rounded-pill bg-primary-subtle text-primary border border-primary-subtle mb-3"">
          <span class=""small fw-bold text-uppercase"">Enterprise Solutions</span>
        </div>
        <h1 class=""display-5 fw-bolder text-dark mb-3 lh-sm"">Empowering Modern Enterprises to Scale with Confidence.</h1>
        <p class=""lead text-muted mb-4 fs-6"">Delivering innovative solutions, strategic consulting, and operational excellence to help your business achieve sustainable success.</p>
        <div class=""d-flex flex-wrap gap-3"">
          <a href=""#services"" class=""btn btn-primary btn-lg rounded-pill px-4 py-2 fw-bold shadow-sm d-inline-flex align-items-center gap-2"">
            <span>Explore Services</span>
            <span style=""font-size: 16px;"">→</span>
          </a>
          <a href=""#contact"" class=""btn btn-outline-secondary btn-lg rounded-pill px-4 py-2 fw-semibold bg-white"">
            Schedule Consultation
          </a>
        </div>
      </div>
      <div class=""col-lg-6"">
        <div class=""rounded-4 overflow-hidden shadow-lg border border-light-subtle"">
          <img src=""https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80"" 
               alt=""Modern Corporate Architecture"" class=""img-fluid w-100 object-fit-cover"" style=""max-height: 420px;"" />
        </div>
      </div>
    </div>
  </div>
</section>",
                CssStyles = @""
            },

            // 3. Body Section 1 - 3-Column Core Capabilities Grid
            new()
            {
                Id = Guid.NewGuid(),
                TemplateKey = "Body_FeatureGrid3",
                CategoryKey = "body",
                Name = "3-Column Modern Feature Grid",
                VariantCode = "Body_FeatureGrid3",
                InstalledVersion = "1.0.0",
                IsActive = true,
                InstalledUtc = DateTime.UtcNow,
                HtmlTemplate = @"
<section class=""py-5 bg-white border-bottom"">
  <div class=""container py-4"">
    <div class=""text-center max-w-700 mx-auto mb-5"">
      <span class=""badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-1 rounded-pill text-uppercase fw-bold"">Core Capabilities</span>
      <h2 class=""fw-bold text-dark mt-2 mb-3"">Engineered for Maximum Impact</h2>
      <p class=""text-muted"">Essential infrastructure designed for seamless organizational execution and rapid growth.</p>
    </div>
    <div class=""row g-4"">
      <div class=""col-md-4"">
        <div class=""card h-100 p-4 border border-light-subtle rounded-4 shadow-sm"">
          <div class=""rounded-3 bg-primary-subtle text-primary d-inline-flex align-items-center justify-content-center mb-3"" style=""width: 50px; height: 50px;"">
            <i class=""fa-solid fa-shield-halved fs-4""></i>
          </div>
          <h5 class=""fw-bold text-dark"">Data Security & Privacy</h5>
          <p class=""text-muted small mb-0"">Enterprise-grade encryption, role-based access management, and proactive compliance protection.</p>
        </div>
      </div>
      <div class=""col-md-4"">
        <div class=""card h-100 p-4 border border-light-subtle rounded-4 shadow-sm"">
          <div class=""rounded-3 bg-success-subtle text-success d-inline-flex align-items-center justify-content-center mb-3"" style=""width: 50px; height: 50px;"">
            <i class=""fa-solid fa-comments fs-4""></i>
          </div>
          <h5 class=""fw-bold text-dark"">Collaboration Hub</h5>
          <p class=""text-muted small mb-0"">Unified communication channels, real-time dispatches, and organizational announcements.</p>
        </div>
      </div>
      <div class=""col-md-4"">
        <div class=""card h-100 p-4 border border-light-subtle rounded-4 shadow-sm"">
          <div class=""rounded-3 bg-info-subtle text-info d-inline-flex align-items-center justify-content-center mb-3"" style=""width: 50px; height: 50px;"">
            <i class=""fa-solid fa-bolt fs-4""></i>
          </div>
          <h5 class=""fw-bold text-dark"">Operational Efficiency</h5>
          <p class=""text-muted small mb-0"">Modern automated workflows engineered to eliminate administrative bottlenecks and elevate team productivity.</p>
        </div>
      </div>
    </div>
  </div>
</section>",
                CssStyles = @""
            },

            // 4. Body Section 2 - Corporate Mission & Standards
            new()
            {
                Id = Guid.NewGuid(),
                TemplateKey = "Body_MissionSplit",
                CategoryKey = "body",
                Name = "Corporate Mission & Standards Split",
                VariantCode = "Body_MissionSplit",
                InstalledVersion = "1.0.0",
                IsActive = true,
                InstalledUtc = DateTime.UtcNow,
                HtmlTemplate = @"
<section class=""py-5 bg-white border-bottom"" id=""about"">
  <div class=""container py-4"">
    <div class=""row align-items-center g-5"">
      <div class=""col-lg-6"">
        <div class=""rounded-4 overflow-hidden shadow border border-light-subtle"">
          <img src=""https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1000&q=80"" 
               alt=""Executive Collaboration Team"" class=""img-fluid w-100 object-fit-cover"" style=""max-height: 380px;"" />
        </div>
      </div>
      <div class=""col-lg-6"">
        <span class=""badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-1 rounded-pill text-uppercase fw-bold mb-3"">Our Mission & Standards</span>
        <h2 class=""fw-bolder text-dark mb-3"">Built for Organizational Excellence & Long-Term Trust</h2>
        <p class=""text-muted mb-4"">We partner with forward-thinking enterprises, growing organizations, and industry leaders to streamline operations, enhance client service, and drive sustainable growth.</p>
        <div class=""d-flex flex-column gap-3 mb-4"">
          <div class=""d-flex align-items-start gap-3"">
            <span class=""badge rounded-circle bg-primary-subtle text-primary p-2 mt-1""><i class=""fa-solid fa-check""></i></span>
            <div>
              <h6 class=""fw-bold text-dark mb-1"">Strategic Planning & Execution</h6>
              <p class=""text-muted small mb-0"">Data-backed strategies, transparent execution, and dedicated accountability for every business milestone.</p>
            </div>
          </div>
          <div class=""d-flex align-items-start gap-3"">
            <span class=""badge rounded-circle bg-primary-subtle text-primary p-2 mt-1""><i class=""fa-solid fa-check""></i></span>
            <div>
              <h6 class=""fw-bold text-dark mb-1"">Enterprise Data Protection</h6>
              <p class=""text-muted small mb-0"">Industry-standard encryption, secure cloud infrastructure, and strict client confidentiality standards.</p>
            </div>
          </div>
        </div>
        <a href=""#contact"" class=""btn btn-outline-primary rounded-pill px-4 py-2 fw-semibold"">
          Learn More About Our Firm →
        </a>
      </div>
    </div>
  </div>
</section>",
                CssStyles = @""
            },

            // 5. Body Section 3 - Metrics & Stat Counters
            new()
            {
                Id = Guid.NewGuid(),
                TemplateKey = "Body_MetricsCounter",
                CategoryKey = "body",
                Name = "4-Column Metric Counter Bar",
                VariantCode = "Body_MetricsCounter",
                InstalledVersion = "1.0.0",
                IsActive = true,
                InstalledUtc = DateTime.UtcNow,
                HtmlTemplate = @"
<section class=""py-5 bg-white border-bottom"">
  <div class=""container py-3"">
    <div class=""row g-4 text-center"">
      <div class=""col-6 col-md-3"">
        <div class=""p-3"">
          <i class=""fa-solid fa-users text-primary fs-2 mb-2""></i>
          <div class=""display-6 fw-bold text-dark"">12,500+</div>
          <div class=""small text-muted fw-semibold text-uppercase"">Verified Members</div>
        </div>
      </div>
      <div class=""col-6 col-md-3"">
        <div class=""p-3"">
          <i class=""fa-solid fa-server text-success fs-2 mb-2""></i>
          <div class=""display-6 fw-bold text-dark"">99.98%</div>
          <div class=""small text-muted fw-semibold text-uppercase"">System Reliability</div>
        </div>
      </div>
      <div class=""col-6 col-md-3"">
        <div class=""p-3"">
          <i class=""fa-solid fa-earth-americas text-info fs-2 mb-2""></i>
          <div class=""display-6 fw-bold text-dark"">45+</div>
          <div class=""small text-muted fw-semibold text-uppercase"">Global Chapters</div>
        </div>
      </div>
      <div class=""col-6 col-md-3"">
        <div class=""p-3"">
          <i class=""fa-solid fa-headset text-warning fs-2 mb-2""></i>
          <div class=""display-6 fw-bold text-dark"">24/7</div>
          <div class=""small text-muted fw-semibold text-uppercase"">Priority Support</div>
        </div>
      </div>
    </div>
  </div>
</section>",
                CssStyles = @""
            },

            // 6. Body Section 4 - Testimonials & Reviews
            new()
            {
                Id = Guid.NewGuid(),
                TemplateKey = "Body_Testimonials",
                CategoryKey = "body",
                Name = "3-Card Social Proof & Testimonials",
                VariantCode = "Body_Testimonials",
                InstalledVersion = "1.0.0",
                IsActive = true,
                InstalledUtc = DateTime.UtcNow,
                HtmlTemplate = @"
<section class=""py-5 bg-light border-bottom"">
  <div class=""container py-4"">
    <div class=""text-center max-w-700 mx-auto mb-5"">
      <span class=""badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-1 rounded-pill text-uppercase fw-bold"">Client Testimonials</span>
      <h2 class=""fw-bold text-dark mt-2 mb-3"">Trusted by Clients &amp; Industry Leaders</h2>
      <p class=""text-muted"">Hear directly from businesses and partners who rely on our services for sustainable growth.</p>
    </div>
    <div class=""row g-4"">
      <div class=""col-md-4"">
        <div class=""card h-100 p-4 border border-light-subtle rounded-4 shadow-sm bg-white"">
          <div class=""text-warning mb-3"">
            <i class=""fa-solid fa-star""></i><i class=""fa-solid fa-star""></i><i class=""fa-solid fa-star""></i><i class=""fa-solid fa-star""></i><i class=""fa-solid fa-star""></i>
          </div>
          <p class=""text-secondary mb-4 fst-italic"">""Working with {{ BrandName }} transformed our operational efficiency. Their team provided clear strategic direction and delivered outstanding results from day one.""</p>
          <div class=""d-flex align-items-center gap-3 mt-auto"">
            <div class=""rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center fw-bold"" style=""width:42px; height:42px;"">SA</div>
            <div>
              <div class=""fw-bold text-dark small"">Sarah Adams</div>
              <div class=""text-muted small"">Chief Operating Officer</div>
            </div>
          </div>
        </div>
      </div>
      <div class=""col-md-4"">
        <div class=""card h-100 p-4 border border-light-subtle rounded-4 shadow-sm bg-white"">
          <div class=""text-warning mb-3"">
            <i class=""fa-solid fa-star""></i><i class=""fa-solid fa-star""></i><i class=""fa-solid fa-star""></i><i class=""fa-solid fa-star""></i><i class=""fa-solid fa-star""></i>
          </div>
          <p class=""text-secondary mb-4 fst-italic"">""Their professionalism, deep industry expertise, and responsive support have made them an indispensable partner in scaling our business.""</p>
          <div class=""d-flex align-items-center gap-3 mt-auto"">
            <div class=""rounded-circle bg-success-subtle text-success d-flex align-items-center justify-content-center fw-bold"" style=""width:42px; height:42px;"">MK</div>
            <div>
              <div class=""fw-bold text-dark small"">Marcus Kim</div>
              <div class=""text-muted small"">Managing Director</div>
            </div>
          </div>
        </div>
      </div>
      <div class=""col-md-4"">
        <div class=""card h-100 p-4 border border-light-subtle rounded-4 shadow-sm bg-white"">
          <div class=""text-warning mb-3"">
            <i class=""fa-solid fa-star""></i><i class=""fa-solid fa-star""></i><i class=""fa-solid fa-star""></i><i class=""fa-solid fa-star""></i><i class=""fa-solid fa-star""></i>
          </div>
          <p class=""text-secondary mb-4 fst-italic"">""The quality of execution and attention to detail exceeded our expectations. They consistently deliver on time and above benchmark.""</p>
          <div class=""d-flex align-items-center gap-3 mt-auto"">
            <div class=""rounded-circle bg-info-subtle text-info d-flex align-items-center justify-content-center fw-bold"" style=""width:42px; height:42px;"">EL</div>
            <div>
              <div class=""fw-bold text-dark small"">Elena Rostova</div>
              <div class=""text-muted small"">VP of Business Development</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>",
                CssStyles = @""
            },

            // 7. Body Section 5 - Interactive FAQ Accordion
            new()
            {
                Id = Guid.NewGuid(),
                TemplateKey = "Body_FaqAccordion",
                CategoryKey = "body",
                Name = "Collapsible FAQ Accordion",
                VariantCode = "Body_FaqAccordion",
                InstalledVersion = "1.0.0",
                IsActive = true,
                InstalledUtc = DateTime.UtcNow,
                HtmlTemplate = @"
<section class=""py-5 bg-white border-bottom"">
  <div class=""container py-4"">
    <div class=""text-center max-w-700 mx-auto mb-5"">
      <span class=""badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-1 rounded-pill text-uppercase fw-bold"">Questions & Answers</span>
      <h2 class=""fw-bold text-dark mt-2 mb-3"">Frequently Asked Questions</h2>
      <p class=""text-muted"">Helpful answers regarding our services, client engagements, and delivery process.</p>
    </div>
    <div class=""max-w-800 mx-auto"">
      <div class=""accordion"" id=""ozFaqAccordion"">
        <div class=""accordion-item border rounded-3 mb-3 overflow-hidden shadow-sm"">
          <h2 class=""accordion-header"">
            <button class=""accordion-button fw-bold text-dark bg-light"" type=""button"" onclick=""this.closest('.accordion-item').querySelector('.accordion-collapse').classList.toggle('show')"">
              <i class=""fa-solid fa-circle-question text-primary me-2""></i> How does {{ BrandName }} tailor its services to our business needs?
            </button>
          </h2>
          <div class=""accordion-collapse collapse show"">
            <div class=""accordion-body text-secondary small"">
              We begin with an in-depth discovery consultation to assess your unique goals, timelines, and operational requirements, then design a customized solution that aligns precisely with your business priorities.
            </div>
          </div>
        </div>
        <div class=""accordion-item border rounded-3 mb-3 overflow-hidden shadow-sm"">
          <h2 class=""accordion-header"">
            <button class=""accordion-button collapsed fw-bold text-dark bg-light"" type=""button"" onclick=""this.closest('.accordion-item').querySelector('.accordion-collapse').classList.toggle('show')"">
              <i class=""fa-solid fa-circle-question text-primary me-2""></i> What kind of ongoing support and collaboration can we expect?
            </button>
          </h2>
          <div class=""accordion-collapse collapse"">
            <div class=""accordion-body text-secondary small"">
              Every client is paired with a dedicated account lead and receives regular milestone reviews, transparent progress reporting, and responsive technical and strategic support throughout our partnership.
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>",
                CssStyles = @""
            },

            // 8. Body Section 6 - High-Conversion CTA Banner
            new()
            {
                Id = Guid.NewGuid(),
                TemplateKey = "Body_CtaBanner",
                CategoryKey = "body",
                Name = "Gradient Action CTA Ribbon",
                VariantCode = "Body_CtaBanner",
                InstalledVersion = "1.0.0",
                IsActive = true,
                InstalledUtc = DateTime.UtcNow,
                HtmlTemplate = @"
<section class=""py-5 bg-light border-bottom"">
  <div class=""container py-3"">
    <div class=""card border-0 rounded-4 p-5 text-center text-white shadow"" style=""background: linear-gradient(135deg, #1d4ed8 0%, #0284c7 100%);"">
      <h2 class=""display-6 fw-bold mb-3"">Ready to Elevate Your Business?</h2>
      <p class=""lead opacity-90 max-w-600 mx-auto mb-4 fs-6"">Partner with our team to accelerate your operations, modernize systems, and achieve sustainable long-term growth.</p>
      <div class=""d-flex justify-content-center gap-3 flex-wrap"">
        <a href=""#request-service"" class=""btn btn-light btn-lg rounded-pill px-4 py-2 fw-bold text-primary shadow"">
          <i class=""fa-solid fa-arrow-right me-1""></i> Request a Consultation
        </a>
        <a href=""#contact"" class=""btn btn-outline-light btn-lg rounded-pill px-4 py-2 fw-semibold"">
          <i class=""fa-solid fa-envelope me-1""></i> Contact Our Team
        </a>
      </div>
    </div>
  </div>
</section>",
                CssStyles = @""
            },

            // 9. E-Commerce Storefront Grid
            new()
            {
                Id = Guid.NewGuid(),
                TemplateKey = "Ecom_ProductGrid",
                CategoryKey = "ecommerce",
                Name = "Clean Light Storefront Product Grid",
                VariantCode = "Ecom_ProductGrid",
                InstalledVersion = "1.0.0",
                IsActive = true,
                InstalledUtc = DateTime.UtcNow,
                HtmlTemplate = @"
<section class=""py-5 bg-white border-bottom"" id=""shop"">
  <div class=""container py-4"">
    <div class=""d-flex justify-content-between align-items-end mb-4 flex-wrap gap-3"">
      <div>
        <span class=""badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-1 rounded-pill text-uppercase fw-bold"">Official Store</span>
        <h2 class=""fw-bold text-dark mt-2 mb-0"">Featured Merchandise</h2>
      </div>
      <div class=""d-flex gap-2"">
        <button class=""btn btn-sm btn-primary rounded-pill px-3"">All</button>
        <button class=""btn btn-sm btn-outline-secondary rounded-pill px-3"">Apparel</button>
        <button class=""btn btn-sm btn-outline-secondary rounded-pill px-3"">Hardware</button>
        <button class=""btn btn-sm btn-outline-secondary rounded-pill px-3"">Badges</button>
      </div>
    </div>
    <div class=""row g-4"">
      <div class=""col-6 col-lg-3"">
        <div class=""card h-100 border border-light-subtle rounded-4 overflow-hidden shadow-sm"">
          <div class=""p-4 bg-light text-center""><i class=""fa-solid fa-shirt text-secondary display-4""></i></div>
          <div class=""card-body d-flex flex-column"">
            <span class=""badge bg-success-subtle text-success w-auto align-self-start mb-2"">In Stock</span>
            <h6 class=""fw-bold text-dark mb-1"">Signature Member Hoodie</h6>
            <p class=""text-muted small mb-3"">Heavyweight organic fleece with embroidered crest.</p>
            <div class=""d-flex justify-content-between align-items-center mt-auto"">
              <span class=""fw-bold text-primary fs-5"">$55.00</span>
              <button class=""btn btn-sm btn-outline-primary rounded-pill px-3""><i class=""fa-solid fa-cart-plus""></i> Add</button>
            </div>
          </div>
        </div>
      </div>
      <div class=""col-6 col-lg-3"">
        <div class=""card h-100 border border-light-subtle rounded-4 overflow-hidden shadow-sm"">
          <div class=""p-4 bg-light text-center""><i class=""fa-solid fa-id-card text-secondary display-4""></i></div>
          <div class=""card-body d-flex flex-column"">
            <span class=""badge bg-primary-subtle text-primary w-auto align-self-start mb-2"">Official</span>
            <h6 class=""fw-bold text-dark mb-1"">Smart NFC Badge Holder</h6>
            <p class=""text-muted small mb-3"">Contactless titanium credential clip with lanyard.</p>
            <div class=""d-flex justify-content-between align-items-center mt-auto"">
              <span class=""fw-bold text-primary fs-5"">$24.00</span>
              <button class=""btn btn-sm btn-outline-primary rounded-pill px-3""><i class=""fa-solid fa-cart-plus""></i> Add</button>
            </div>
          </div>
        </div>
      </div>
      <div class=""col-6 col-lg-3"">
        <div class=""card h-100 border border-light-subtle rounded-4 overflow-hidden shadow-sm"">
          <div class=""p-4 bg-light text-center""><i class=""fa-solid fa-briefcase text-secondary display-4""></i></div>
          <div class=""card-body d-flex flex-column"">
            <span class=""badge bg-warning-subtle text-warning w-auto align-self-start mb-2"">Hot</span>
            <h6 class=""fw-bold text-dark mb-1"">Executive Leather Folio</h6>
            <p class=""text-muted small mb-3"">Document portfolio with pen loop and brass zippers.</p>
            <div class=""d-flex justify-content-between align-items-center mt-auto"">
              <span class=""fw-bold text-primary fs-5"">$75.00</span>
              <button class=""btn btn-sm btn-outline-primary rounded-pill px-3""><i class=""fa-solid fa-cart-plus""></i> Add</button>
            </div>
          </div>
        </div>
      </div>
      <div class=""col-6 col-lg-3"">
        <div class=""card h-100 border border-light-subtle rounded-4 overflow-hidden shadow-sm"">
          <div class=""p-4 bg-light text-center""><i class=""fa-solid fa-mug-hot text-secondary display-4""></i></div>
          <div class=""card-body d-flex flex-column"">
            <span class=""badge bg-secondary-subtle text-secondary w-auto align-self-start mb-2"">Accessory</span>
            <h6 class=""fw-bold text-dark mb-1"">Ceramic Travel Tumbler</h6>
            <p class=""text-muted small mb-3"">Double-wall insulated 16oz thermal beverage cup.</p>
            <div class=""d-flex justify-content-between align-items-center mt-auto"">
              <span class=""fw-bold text-primary fs-5"">$18.00</span>
              <button class=""btn btn-sm btn-outline-primary rounded-pill px-3""><i class=""fa-solid fa-cart-plus""></i> Add</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>",
                CssStyles = @""
            },

            // 10. Newsletter Section
            new()
            {
                Id = Guid.NewGuid(),
                TemplateKey = "News_MinimalBar",
                CategoryKey = "body",
                Name = "Clean Light Newsletter Dispatch",
                VariantCode = "News_MinimalBar",
                InstalledVersion = "1.0.0",
                IsActive = true,
                InstalledUtc = DateTime.UtcNow,
                HtmlTemplate = @"
<section class=""py-5 bg-light border-bottom"">
  <div class=""container py-3"">
    <div class=""card border border-light-subtle rounded-4 p-4 p-lg-5 bg-white text-center shadow-sm max-w-800 mx-auto"">
      <div class=""rounded-circle bg-primary-subtle text-primary d-inline-flex align-items-center justify-content-center mx-auto mb-3"" style=""width:60px; height:60px;"">
        <i class=""fa-solid fa-envelope-open-text fs-3""></i>
      </div>
      <h3 class=""fw-bold text-dark mb-2"">{{ Title }}</h3>
      <p class=""text-muted small mb-4 max-w-500 mx-auto"">{{ Description }}</p>
      <div class=""max-w-500 mx-auto w-100"">
        {{ Form ""Newsletter_Subscribe"" }}
      </div>
      <small class=""text-muted mt-3 d-block""><i class=""fa-solid fa-lock me-1""></i> Zero spam. Unsubscribe at any time.</small>
    </div>
  </div>
</section>",
                CssStyles = @""
            },

            // 11. Clean Contact Us & Office Inquiry Form
            new()
            {
                Id = Guid.NewGuid(),
                TemplateKey = "Contact_SplitDetails",
                CategoryKey = "body",
                Name = "Clean Contact Us & Office Inquiries Form",
                VariantCode = "Contact_SplitDetails",
                InstalledVersion = "1.0.0",
                IsActive = true,
                InstalledUtc = DateTime.UtcNow,
                HtmlTemplate = @"
<section class=""py-5 bg-light border-bottom"" id=""contact"">
  <div class=""container py-4"">
    <div class=""row g-5"">
      <!-- Left Column: Official Contact Directory & Office Information -->
      <div class=""col-lg-5"">
        <span class=""badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-1 rounded-pill text-uppercase fw-bold mb-2"">{{ MiniTitle }}</span>
        <h2 class=""fw-bold text-dark mb-3"">{{ Title }}</h2>
        <p class=""text-muted mb-4 fs-6"">{{ Description }}</p>

        <div class=""d-flex flex-column gap-3 mb-4"">
          <div class=""card border-0 shadow-sm rounded-4 p-3 bg-white d-flex flex-row align-items-center gap-3"">
            <div class=""rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center flex-shrink-0"" style=""width:44px; height:44px; font-size:18px;"">
              <i class=""fa-solid fa-location-dot""></i>
            </div>
            <div>
              <strong class=""text-dark small d-block"">Corporate Office</strong>
              <span class=""text-muted small"">{{ Address }}</span>
            </div>
          </div>

          <div class=""card border-0 shadow-sm rounded-4 p-3 bg-white d-flex flex-row align-items-center gap-3"">
            <div class=""rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center flex-shrink-0"" style=""width:44px; height:44px; font-size:18px;"">
              <i class=""fa-solid fa-phone""></i>
            </div>
            <div>
              <strong class=""text-dark small d-block"">Telephone Hotline</strong>
              <span class=""text-muted small"">{{ Phone }}</span>
            </div>
          </div>

          <div class=""card border-0 shadow-sm rounded-4 p-3 bg-white d-flex flex-row align-items-center gap-3"">
            <div class=""rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center flex-shrink-0"" style=""width:44px; height:44px; font-size:18px;"">
              <i class=""fa-solid fa-envelope""></i>
            </div>
            <div>
              <strong class=""text-dark small d-block"">Official Inquiry Desk</strong>
              <span class=""text-muted small"">{{ Email }}</span>
            </div>
          </div>

          <div class=""card border-0 shadow-sm rounded-4 p-3 bg-white d-flex flex-row align-items-center gap-3"">
            <div class=""rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center flex-shrink-0"" style=""width:44px; height:44px; font-size:18px;"">
              <i class=""fa-solid fa-clock""></i>
            </div>
            <div>
              <strong class=""text-dark small d-block"">Business Hours</strong>
              <span class=""text-muted small"">Monday – Friday: 8:30 AM – 5:30 PM (LST)</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column: Dynamic Form Container -->
      <div class=""col-lg-7"">
        <div class=""card border-0 rounded-4 p-4 p-lg-5 shadow-sm bg-white"" id=""ozContactFormCard"">
          <h4 class=""fw-bold text-dark mb-1"">Send Us a Direct Message</h4>
          <p class=""text-muted small mb-4"">Please complete the form below. We typically respond promptly.</p>
          {{ Form ""Contact_Us"" }}
        </div>
      </div>
    </div>
  </div>
</section>",
                CssStyles = @""
            },

            // 11b. Dedicated Service Request & Project Intake Section
            new()
            {
                Id = Guid.NewGuid(),
                TemplateKey = "Body_RequestService",
                CategoryKey = "body",
                Name = "Dedicated Service Request & Project Intake",
                VariantCode = "Body_RequestService",
                InstalledVersion = "1.0.0",
                IsActive = true,
                InstalledUtc = DateTime.UtcNow,
                HtmlTemplate = @"
<section class=""py-5 bg-light border-bottom"" id=""request-service"">
  <div class=""container py-4"">
    <div class=""row g-5"">
      <!-- Left Column: Executive Consultation Scope & Hotline -->
      <div class=""col-lg-5"">
        <span class=""badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-1 rounded-pill text-uppercase fw-bold mb-2"">Service Consultation</span>
        <h2 class=""fw-bold text-dark mb-3"">Request a Tailored Enterprise Service</h2>
        <p class=""text-muted mb-4 fs-6"">Tell us about your organization's goals, operational challenges, or project timeline. Our advisory team will review your specifications and schedule a dedicated strategic consultation.</p>

        <div class=""card border-0 shadow-sm rounded-4 p-4 bg-white mb-4"">
          <h6 class=""fw-bold text-dark text-uppercase small mb-3 tracking-wider text-primary"">Engagement Standards</h6>
          <div class=""d-flex flex-column gap-3"">
            <div class=""d-flex align-items-start gap-3"">
              <div class=""rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center flex-shrink-0"" style=""width:32px; height:32px;""><i class=""fa-solid fa-check""></i></div>
              <div><strong class=""text-dark small d-block"">Dedicated Solutions Lead</strong><span class=""text-muted small"">Direct engagement with an enterprise systems architect.</span></div>
            </div>
            <div class=""d-flex align-items-start gap-3"">
              <div class=""rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center flex-shrink-0"" style=""width:32px; height:32px;""><i class=""fa-solid fa-check""></i></div>
              <div><strong class=""text-dark small d-block"">Feasibility &amp; Scope Assessment</strong><span class=""text-muted small"">Actionable roadmap, architectural fit, and resource modeling.</span></div>
            </div>
            <div class=""d-flex align-items-start gap-3"">
              <div class=""rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center flex-shrink-0"" style=""width:32px; height:32px;""><i class=""fa-solid fa-check""></i></div>
              <div><strong class=""text-dark small d-block"">Client Confidentiality &amp; NDA</strong><span class=""text-muted small"">Strict confidentiality agreements and secure communication channels guaranteed.</span></div>
            </div>
          </div>
        </div>

        <div class=""d-flex flex-column gap-2 text-muted small"">
          <div class=""d-flex align-items-center gap-2""><i class=""fa-solid fa-phone text-primary""></i><span>Direct Hotline: +1 (800) 555-0199</span></div>
          <div class=""d-flex align-items-center gap-2""><i class=""fa-solid fa-envelope text-primary""></i><span>Advisory Desk: advisory@{{ BrandName }}.com</span></div>
        </div>
      </div>

      <!-- Right Column: Dynamic Form Container -->
      <div class=""col-lg-7"">
        <div class=""card border-0 rounded-4 p-4 p-lg-5 shadow-sm bg-white"" id=""ozServiceFormCard"">
          <h4 class=""fw-bold text-dark mb-1"">Service Request &amp; Project Intake</h4>
          <p class=""text-muted small mb-4"">Please complete the form below so we can pair you with the right specialist.</p>
          {{ Form ""Service_Request"" }}
        </div>
      </div>
    </div>
  </div>
</section>",
                CssStyles = @"
.oz-pill-btn {
  font-size: 13px !important;
  font-weight: 600 !important;
  transition: all 0.2s ease !important;
}
.oz-pill-btn.active, .oz-pill-btn:hover {
  background-color: #0050e5 !important;
  border-color: #0050e5 !important;
  color: #ffffff !important;
}"
            },

            // 12. Blog & News Articles Grid
            new()
            {
                Id = Guid.NewGuid(),
                TemplateKey = "Blog_CardGrid3",
                CategoryKey = "blog",
                Name = "3-Column News & Articles Showcase",
                VariantCode = "Blog_CardGrid3",
                InstalledVersion = "1.0.0",
                IsActive = true,
                InstalledUtc = DateTime.UtcNow,
                HtmlTemplate = @"
<section class=""py-5 bg-light border-bottom"" id=""blog"">
  <div class=""container py-4"">
    <div class=""d-flex justify-content-between align-items-end mb-5 flex-wrap gap-3"">
      <div>
        <span class=""badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-1 rounded-pill text-uppercase fw-bold"">Newsroom</span>
        <h2 class=""fw-bold text-dark mt-2 mb-0"">Latest Insights & Announcements</h2>
      </div>
      <a href=""#blog"" class=""btn btn-outline-primary rounded-pill px-4 py-2 fw-semibold"">View All Articles →</a>
    </div>
    <div class=""row g-4"">
      <div class=""col-md-4"">
        <div class=""card h-100 border border-light-subtle rounded-4 overflow-hidden shadow-sm bg-white"">
          <img src=""https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80"" 
               alt=""Corporate Architecture & Strategy"" class=""w-100 object-fit-cover"" style=""height: 180px;"" />
          <div class=""card-body d-flex flex-column"">
            <span class=""badge bg-light text-primary border border-light-subtle w-auto align-self-start mb-2 fw-bold"">Strategy</span>
            <h5 class=""fw-bold text-dark mb-2"">Accelerating Enterprise Transformation in 2026</h5>
            <p class=""text-muted small mb-4"">How modern organizations align people, processes, and technology for sustainable long-term growth.</p>
            <div class=""small text-muted mt-auto pt-2 border-top d-flex justify-content-between"">
              <span>Sep 10, 2026</span>
              <span class=""fw-semibold text-primary"">Read Article →</span>
            </div>
          </div>
        </div>
      </div>
      <div class=""col-md-4"">
        <div class=""card h-100 border border-light-subtle rounded-4 overflow-hidden shadow-sm bg-white"">
          <img src=""https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80"" 
               alt=""Data Protection & Cyber Security"" class=""w-100 object-fit-cover"" style=""height: 180px;"" />
          <div class=""card-body d-flex flex-column"">
            <span class=""badge bg-light text-success border border-light-subtle w-auto align-self-start mb-2 fw-bold"">Security</span>
            <h5 class=""fw-bold text-dark mb-2"">Modern Data Protection &amp; Governance Standards</h5>
            <p class=""text-muted small mb-4"">Best practices for maintaining data privacy, regulatory compliance, and robust risk management.</p>
            <div class=""small text-muted mt-auto pt-2 border-top d-flex justify-content-between"">
              <span>Sep 04, 2026</span>
              <span class=""fw-semibold text-primary"">Read Article →</span>
            </div>
          </div>
        </div>
      </div>
      <div class=""col-md-4"">
        <div class=""card h-100 border border-light-subtle rounded-4 overflow-hidden shadow-sm bg-white"">
          <img src=""https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=800&q=80"" 
               alt=""Executive Meeting & Operations"" class=""w-100 object-fit-cover"" style=""height: 180px;"" />
          <div class=""card-body d-flex flex-column"">
            <span class=""badge bg-light text-info border border-light-subtle w-auto align-self-start mb-2 fw-bold"">Operations</span>
            <h5 class=""fw-bold text-dark mb-2"">Scaling Operational Efficiency Across Distributed Teams</h5>
            <p class=""text-muted small mb-4"">Proven strategies for streamlining workflows and unifying communications across business units.</p>
            <div class=""small text-muted mt-auto pt-2 border-top d-flex justify-content-between"">
              <span>Aug 28, 2026</span>
              <span class=""fw-semibold text-primary"">Read Article →</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>",
                CssStyles = @""
            },

            // 13. Centered Background Image Breadcrumbs & Page Headers
            new()
            {
                Id = Guid.NewGuid(),
                TemplateKey = "Breadcrumb_PageHeader",
                CategoryKey = "breadcrumb",
                Name = "Centered Background Image Breadcrumb Banner",
                VariantCode = "Breadcrumb_PageHeader",
                InstalledVersion = "1.0.0",
                IsActive = true,
                InstalledUtc = DateTime.UtcNow,
                HtmlTemplate = @"
<section class=""oz-breadcrumb-hero py-5 text-center position-relative overflow-hidden"">
  <div class=""oz-breadcrumb-overlay position-absolute top-0 start-0 w-100 h-100""></div>
  <div class=""container position-relative py-lg-4"" style=""z-index: 2;"">
    <nav aria-label=""breadcrumb"" class=""d-flex justify-content-center mb-2"">
      <ol class=""breadcrumb justify-content-center align-items-center mb-0 small"">
        <li class=""breadcrumb-item""><a href=""#home"" class=""text-white text-opacity-75 text-decoration-none"">Home</a></li>
        <li class=""breadcrumb-item text-white text-opacity-50"">/</li>
        <li class=""breadcrumb-item active text-white fw-bold"" aria-current=""page"">{{ Title }}</li>
      </ol>
    </nav>
    <h1 class=""display-5 fw-bold text-white mb-2"">{{ Title }}</h1>
    <p class=""text-white text-opacity-75 lead fs-6 mx-auto mb-0"" style=""max-width: 650px;"">{{ Description }}</p>
  </div>
</section>",
                CssStyles = @"
.oz-breadcrumb-hero {
  background: url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1600&q=80') center center / cover no-repeat;
  position: relative;
}
.oz-breadcrumb-overlay {
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.78) 0%, rgba(15, 23, 42, 0.88) 100%);
}
.oz-breadcrumb-hero .breadcrumb-item + .breadcrumb-item::before {
  display: none !important;
}
.oz-breadcrumb-hero .breadcrumb-item a:hover {
  color: #ffffff !important;
  text-decoration: underline !important;
}"
            },

            // 14. Corporate Footer
            new()
            {
                Id = Guid.NewGuid(),
                TemplateKey = "Footer_4ColCorporate",
                CategoryKey = "footer",
                Name = "Clean Light Corporate Footer",
                VariantCode = "Footer_4ColCorporate",
                InstalledVersion = "1.0.0",
                IsActive = true,
                InstalledUtc = DateTime.UtcNow,
                HtmlTemplate = @"
<footer class=""bg-light border-top py-5 text-secondary"">
  <div class=""container"">
    <div class=""row g-4 mb-5"">
      <div class=""col-lg-4"">
        <div class=""d-flex align-items-center gap-2 mb-3"">
          <span class=""fw-bold text-dark fs-5"">{{ BrandName }}</span>
        </div>
        <p class=""small text-muted max-w-300"">{{ Description }}</p>
        <div class=""small text-muted mb-3 d-flex flex-column gap-1"">
          <div><i class=""fa-solid fa-envelope me-2 text-primary""></i>{{ Email }}</div>
          <div><i class=""fa-solid fa-phone me-2 text-primary""></i>{{ Phone }}</div>
        </div>
        <div class=""d-flex gap-2 text-secondary"">
          <a href=""https://facebook.com"" class=""btn btn-sm btn-white border rounded-circle text-secondary"" target=""_blank"" title=""Facebook""><i class=""fa-brands fa-facebook-f""></i></a>
          <a href=""https://x.com"" class=""btn btn-sm btn-white border rounded-circle text-secondary"" target=""_blank"" title=""Twitter / X""><i class=""fa-brands fa-x-twitter""></i></a>
          <a href=""https://linkedin.com"" class=""btn btn-sm btn-white border rounded-circle text-secondary"" target=""_blank"" title=""LinkedIn""><i class=""fa-brands fa-linkedin-in""></i></a>
          <a href=""https://instagram.com"" class=""btn btn-sm btn-white border rounded-circle text-secondary"" target=""_blank"" title=""Instagram""><i class=""fa-brands fa-instagram""></i></a>
          <a href=""https://youtube.com"" class=""btn btn-sm btn-white border rounded-circle text-secondary"" target=""_blank"" title=""YouTube""><i class=""fa-brands fa-youtube""></i></a>
        </div>
      </div>
      <div class=""col-6 col-lg-2"">
        <h6 class=""fw-bold text-dark text-uppercase small mb-3"">Solutions</h6>
        <ul class=""list-unstyled small d-flex flex-column gap-2"">
          {{#each CategoryPages ""Services""}}
            <li><a href=""{{ Url }}"" class=""text-decoration-none text-muted"">{{ Title }}</a></li>
          {{/each}}
        </ul>
      </div>
      <div class=""col-6 col-lg-2"">
        <h6 class=""fw-bold text-dark text-uppercase small mb-3"">Company</h6>
        <ul class=""list-unstyled small d-flex flex-column gap-2"">
          {{#each CategoryPages ""Company""}}
            <li><a href=""{{ Url }}"" class=""text-decoration-none text-muted"">{{ Title }}</a></li>
          {{/each}}
        </ul>
      </div>
      <div class=""col-lg-4"">
        <h6 class=""fw-bold text-dark text-uppercase small mb-3"">Stay Connected</h6>
        <p class=""small text-muted"">Subscribe to our newsletter for executive insights, market updates, and announcements.</p>
        {{ Form ""Newsletter_Subscribe"" }}
      </div>
    </div>
    <div class=""border-top pt-4 d-flex justify-content-between align-items-center flex-wrap gap-3 small text-muted"">
      <div>{{ Copyright }}</div>
      <div class=""d-flex gap-3"">
        {{#each LegalPages}}
          <a href=""{{ Url }}"" class=""text-decoration-none text-muted"">{{ Title }}</a>
        {{/each}}
      </div>
      <div>{{ PoweredBy }}</div>
    </div>
  </div>
</footer>",
                CssStyles = @"",
                DefaultContentJson = @"{""title"":""Clean Light Corporate Footer"",""description"":""Empowering enterprises and modern organizations with strategic advisory, integrated solutions, and high-performance operations."",""email"":""contact@organization.com"",""phone"":""+1 (555) 019-2834"",""categories"":[{""name"":""Services"",""displayTitle"":""Solutions"",""pages"":[{""title"":""Strategic Consulting"",""url"":""/strategic-advisory""},{""title"":""Systems Modernization"",""url"":""/systems-modernization""},{""title"":""Performance & Scale"",""url"":""/performance-scale""},{""title"":""Enterprise Advisory"",""url"":""/enterprise-governance""}]},{""name"":""Company"",""displayTitle"":""Company"",""pages"":[{""title"":""About Us"",""url"":""/about""},{""title"":""Request a Service"",""url"":""/request-service""},{""title"":""Contact Us"",""url"":""/contact""}]}],""legalPages"":[{""title"":""Privacy Policy"",""url"":""/privacy-policy""},{""title"":""Terms & Conditions"",""url"":""/terms-and-conditions""},{""title"":""Cookie Policy"",""url"":""/cookie-policy""}]}"
            }
        };

        dbContext.TenantInstalledTemplates.AddRange(templates);
    }

    /// <summary>
    /// Computes the corporate abbreviation from the organization name.
    /// If multi-word, takes the initial letter of each word (e.g. "Rozzy kik" -> "RK").
    /// If single-word, takes the first 3 characters uppercase (e.g. "Rozzy" -> "ROZ").
    /// </summary>
    /// <param name="name">The organization name.</param>
    /// <returns>Computed abbreviation string.</returns>
    public static string ComputeAbbreviation(string? name)
    {
        if (string.IsNullOrWhiteSpace(name)) return "ORG";
        var words = name.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        if (words.Length == 1)
        {
            var single = words[0].Trim();
            return single.Length >= 3 ? single[..3].ToUpperInvariant() : single.ToUpperInvariant();
        }
        return string.Concat(words.Take(4).Select(w => char.ToUpperInvariant(w[0])));
    }

    /// <summary>
    /// Generates sector-aligned slogans, descriptions, and service defaults.
    /// </summary>
    /// <param name="sector">The sector chosen during onboarding.</param>
    /// <param name="orgName">The organization name.</param>
    /// <returns>Tuple containing tailored slogan, description, and service copy.</returns>
    public static (string Slogan, string Description, string Service1Title, string Service1Desc, string Service2Title, string Service2Desc, string Service3Title, string Service3Desc) GetSectorDefaults(string? sector, string orgName)
    {
        var s = (sector ?? "").Trim().ToLowerInvariant();
        if (s.Contains("health") || s.Contains("care"))
        {
            return (
                "Compassionate Care, Clinical Excellence, and Patient Well-Being",
                $"{orgName} is committed to delivering patient-centered healthcare solutions, clinical innovation, and compassionate service to elevate community wellness.",
                "Clinical Services & Patient Care", "High-standard clinical diagnosis, outpatient consultation, and specialized treatment programs.",
                "Preventive Health & Wellness", "Community health screening, preventive therapies, and proactive lifestyle wellness management.",
                "Emergency & Acute Response", "Rapid, coordinated acute medical assistance and multi-disciplinary specialty coordination."
            );
        }
        if (s.Contains("edu") || s.Contains("acad"))
        {
            return (
                "Empowering Minds, Inspiring Excellence, and Shaping the Future",
                $"{orgName} provides modern educational leadership, dynamic academic programs, and inspiring learning environments that equip future leaders.",
                "Academic Curricula & Programs", "Comprehensive academic curricula fostering intellectual curiosity, rigor, and practical knowledge.",
                "Professional Training & Skills", "Specialized executive workshops, industry certifications, and workforce skill development.",
                "Research & Mentorship", "Dedicated research programs, student mentorship, and international academic partnerships."
            );
        }
        if (s.Contains("tech") || s.Contains("soft"))
        {
            return (
                "Engineering Scalable Solutions, Modern Architecture, and Digital Transformation",
                $"{orgName} engineers resilient software architectures, scalable cloud infrastructure, and intelligent digital experiences to accelerate enterprise growth.",
                "Custom Software Engineering", "Full-stack development, cloud-native architectures, and robust API-first enterprise platforms.",
                "Cloud & Infrastructure Solutions", "Scalable cloud migrations, DevOps automation, and high-availability systems management.",
                "AI & Intelligent Automation", "Integrating practical machine learning, smart analytics, and workflow automation into core operations."
            );
        }
        if (s.Contains("non-profit") || s.Contains("found"))
        {
            return (
                "Empowering Communities, Driving Impact, and Creating Lasting Change",
                $"{orgName} is dedicated to impactful humanitarian initiatives, social empowerment, and sustainable community development.",
                "Community Outreach & Aid", "Targeted humanitarian programs, relief distribution, and essential community support services.",
                "Youth & Family Empowerment", "Educational sponsorships, family counseling, and grassroots vocational development.",
                "Civic Advocacy & Partnerships", "Collaborating with local and global stakeholders to champion civic rights and sustainability."
            );
        }
        if (s.Contains("gov") || s.Contains("pub"))
        {
            return (
                "Transparent Governance, Civic Integrity, and Trusted Public Service",
                $"{orgName} serves the public interest through accountable public administration, civic engagement platforms, and transparent operations.",
                "Civic Information & Services", "Accessible public resource portals, citizen engagement, and administrative assistance.",
                "Regulatory & Compliance Oversight", "Ensuring statutory adherence, legal compliance, and reliable operational transparency.",
                "Public Infrastructure Initiatives", "Coordinating civic development programs and cross-agency public collaboration."
            );
        }
        // Default: Business & Enterprise
        return (
            "Strategic Solutions, Operational Excellence, and Sustainable Value",
            $"{orgName} delivers tailored corporate solutions, operational excellence, and value-driven services designed to accelerate organizational success.",
            "Strategic Consulting & Advisory", "In-depth market analysis, strategic business planning, and organizational optimization.",
            "Operations & Delivery Management", "Streamlined project delivery, resource allocation, and quality-assured implementation.",
            "Client Success & Managed Services", "Dedicated account management, performance monitoring, and continuous operational support."
        );
    }

    /// <summary>
    /// Seeds structured PageSection and PageSectionList entities across Home, Services, About Us, Request Service, and Contact Us web pages.
    /// </summary>
    private static async Task SeedDefaultPageSectionsAsync(
        DashboardDbContext dbContext,
        TenantOnboardingRequest request,
        (string Slogan, string Description, string Service1Title, string Service1Desc, string Service2Title, string Service2Desc, string Service3Title, string Service3Desc) sectorDefaults,
        string abbreviation,
        WebPage homePage,
        WebPage aboutPage,
        WebPage servicesPage,
        WebPage requestServicePage,
        WebPage contactPage,
        CancellationToken cancellationToken)
    {
        if (await dbContext.PageSections.AnyAsync(cancellationToken))
        {
            return;
        }

        // Retrieve seeded dynamic PageForms
        var contactForm = await dbContext.PageForms.FirstOrDefaultAsync(f => f.FormKey == "contact-us", cancellationToken);
        var serviceRequestForm = await dbContext.PageForms.FirstOrDefaultAsync(f => f.FormKey == "service-request", cancellationToken);
        var newsletterForm = await dbContext.PageForms.FirstOrDefaultAsync(f => f.FormKey == "newsletter", cancellationToken);

        var sections = new List<PageSection>();

        // 1. HOME PAGE SECTIONS
        var homeHero = new PageSection
        {
            Id = Guid.NewGuid(),
            WebPageId = homePage.Id,
            TemplateKey = "Hero_CorporateSplit",
            Title = request.OrganizationName,
            MiniTitle = $"OFFICIAL PORTAL \u2022 {abbreviation}",
            Description = sectorDefaults.Slogan,
            FullDescription = sectorDefaults.Description,
            ButtonText = "Explore Services",
            ButtonLink = "/services",
            DirectUrl = "home-hero",
            ShowInHome = true,
            HomePageSortOrder = 1,
            PageSortOrder = 1
        };
        sections.Add(homeHero);

        var homeFeatures = new PageSection
        {
            Id = Guid.NewGuid(),
            WebPageId = homePage.Id,
            TemplateKey = "Body_FeatureGrid3",
            Title = "Strategic Capabilities & Core Solutions",
            MiniTitle = "WHAT WE OFFER",
            Description = $"Comprehensive, reliable solutions built for modern {request.OrganizationName} operations.",
            ButtonText = "View All Services",
            ButtonLink = "/services",
            DirectUrl = "home-features",
            ShowInHome = true,
            HomePageSortOrder = 2,
            PageSortOrder = 2,
            PageSectionLists = new List<PageSectionList>
            {
                new() { Id = Guid.NewGuid(), Title = sectorDefaults.Service1Title, Description = sectorDefaults.Service1Desc, IconText = "fa-solid fa-chart-line", SortOrder = 1 },
                new() { Id = Guid.NewGuid(), Title = sectorDefaults.Service2Title, Description = sectorDefaults.Service2Desc, IconText = "fa-solid fa-cubes", SortOrder = 2 },
                new() { Id = Guid.NewGuid(), Title = sectorDefaults.Service3Title, Description = sectorDefaults.Service3Desc, IconText = "fa-solid fa-shield-halved", SortOrder = 3 }
            }
        };
        sections.Add(homeFeatures);

        var homeStats = new PageSection
        {
            Id = Guid.NewGuid(),
            WebPageId = homePage.Id,
            TemplateKey = "Body_StatsCounters",
            Title = "Key Performance & Reliability Highlights",
            MiniTitle = "PROVEN TRACK RECORD",
            Description = "Empowering operations with dependable uptime, verified compliance, and end-to-end operational visibility.",
            DirectUrl = "home-stats",
            ShowInHome = true,
            HomePageSortOrder = 3,
            PageSortOrder = 3,
            PageSectionLists = new List<PageSectionList>
            {
                new() { Id = Guid.NewGuid(), Title = "99.9%", MiniTitle = "Uptime SLA", Description = "High-availability enterprise systems", SortOrder = 1 },
                new() { Id = Guid.NewGuid(), Title = "24/7", MiniTitle = "Continuous Support", Description = "Dedicated response team", SortOrder = 2 },
                new() { Id = Guid.NewGuid(), Title = "100%", MiniTitle = "Data Privacy", Description = "Encrypted communications & audit logs", SortOrder = 3 },
                new() { Id = Guid.NewGuid(), Title = "Multi-Region", MiniTitle = "Global Sync", Description = "Real-time synchronization across channels", SortOrder = 4 }
            }
        };
        sections.Add(homeStats);

        var homeProcess = new PageSection
        {
            Id = Guid.NewGuid(),
            WebPageId = homePage.Id,
            TemplateKey = "Body_ProcessSteps",
            Title = "Our Structured Engagement Process",
            MiniTitle = "HOW WE WORK",
            Description = "From initial consultation to seamless delivery, our structured methodology ensures precision and success.",
            DirectUrl = "home-process",
            ShowInHome = true,
            HomePageSortOrder = 4,
            PageSortOrder = 4,
            PageSectionLists = new List<PageSectionList>
            {
                new() { Id = Guid.NewGuid(), Title = "1. Consultation", MiniTitle = "Step 01", Description = "Understanding objectives, operational parameters, and key requirements.", SortOrder = 1 },
                new() { Id = Guid.NewGuid(), Title = "2. Architecture", MiniTitle = "Step 02", Description = "Formulating tailored solutions and disciplined milestone roadmaps.", SortOrder = 2 },
                new() { Id = Guid.NewGuid(), Title = "3. Deployment", MiniTitle = "Step 03", Description = "Delivering execution with rigorous quality assurance and oversight.", SortOrder = 3 },
                new() { Id = Guid.NewGuid(), Title = "4. Operations", MiniTitle = "Step 04", Description = "Providing continuous maintenance, monitoring, and ongoing optimization.", SortOrder = 4 }
            }
        };
        sections.Add(homeProcess);

        var homeCta = new PageSection
        {
            Id = Guid.NewGuid(),
            WebPageId = homePage.Id,
            TemplateKey = "Body_CtaSplit",
            Title = $"Partner with {request.OrganizationName} Today",
            MiniTitle = "ACCELERATE YOUR INITIATIVES",
            Description = "Connect with our experienced team to explore tailored solutions designed for your goals.",
            ButtonText = "Get In Touch",
            ButtonLink = "/contact",
            DirectUrl = "home-cta",
            ShowInHome = true,
            HomePageSortOrder = 5,
            PageSortOrder = 5
        };
        sections.Add(homeCta);

        // 2. SERVICES PAGE SECTIONS
        var servicesHero = new PageSection
        {
            Id = Guid.NewGuid(),
            WebPageId = servicesPage.Id,
            TemplateKey = "Hero_CorporateSplit",
            Title = "Specialized Professional Services",
            MiniTitle = $"SOLUTIONS BY {abbreviation}",
            Description = sectorDefaults.Description,
            ButtonText = "Request a Consultation",
            ButtonLink = "/contact",
            DirectUrl = "services-hero",
            ShowInHome = false,
            PageSortOrder = 1
        };
        sections.Add(servicesHero);

        var servicesGrid = new PageSection
        {
            Id = Guid.NewGuid(),
            WebPageId = servicesPage.Id,
            TemplateKey = "Body_FeatureGrid3",
            Title = "Comprehensive Service Offerings",
            MiniTitle = "OUR CORE CAPABILITIES",
            Description = "Tailored service packages structured to provide strategic clarity, technical excellence, and sustainable results.",
            ButtonText = "Contact Our Team",
            ButtonLink = "/contact",
            DirectUrl = "services-grid",
            ShowInHome = false,
            PageSortOrder = 2,
            PageSectionLists = new List<PageSectionList>
            {
                new() { Id = Guid.NewGuid(), Title = sectorDefaults.Service1Title, Description = sectorDefaults.Service1Desc, IconText = "fa-solid fa-briefcase", SortOrder = 1 },
                new() { Id = Guid.NewGuid(), Title = sectorDefaults.Service2Title, Description = sectorDefaults.Service2Desc, IconText = "fa-solid fa-gears", SortOrder = 2 },
                new() { Id = Guid.NewGuid(), Title = sectorDefaults.Service3Title, Description = sectorDefaults.Service3Desc, IconText = "fa-solid fa-headset", SortOrder = 3 }
            }
        };
        sections.Add(servicesGrid);

        var servicesProcess = new PageSection
        {
            Id = Guid.NewGuid(),
            WebPageId = servicesPage.Id,
            TemplateKey = "Body_ProcessSteps",
            Title = "Service Delivery Framework",
            MiniTitle = "STRUCTURED DELIVERY",
            Description = "We employ standardized delivery phases to guarantee transparency, timely milestones, and superior outcome quality.",
            DirectUrl = "services-process",
            ShowInHome = false,
            PageSortOrder = 3,
            PageSectionLists = new List<PageSectionList>
            {
                new() { Id = Guid.NewGuid(), Title = "Phase 1: Needs Assessment", MiniTitle = "Step 01", Description = "In-depth review of specific goals, resource requirements, and deliverables.", SortOrder = 1 },
                new() { Id = Guid.NewGuid(), Title = "Phase 2: Solution Design", MiniTitle = "Step 02", Description = "Detailed scoping, milestone scheduling, and architecture blueprints.", SortOrder = 2 },
                new() { Id = Guid.NewGuid(), Title = "Phase 3: Agile Execution", MiniTitle = "Step 03", Description = "Iterative delivery with clear stakeholder check-ins and quality tests.", SortOrder = 3 },
                new() { Id = Guid.NewGuid(), Title = "Phase 4: Ongoing Review", MiniTitle = "Step 04", Description = "Continuous performance monitoring and proactive client advisory.", SortOrder = 4 }
            }
        };
        sections.Add(servicesProcess);

        var servicesCta = new PageSection
        {
            Id = Guid.NewGuid(),
            WebPageId = servicesPage.Id,
            TemplateKey = "Body_CtaSplit",
            Title = "Ready to Discuss Your Project Requirements?",
            MiniTitle = "LET'S WORK TOGETHER",
            Description = "Contact our specialists today for an initial consultation and tailored proposal.",
            ButtonText = "Schedule Consultation",
            ButtonLink = "/contact",
            DirectUrl = "services-cta",
            ShowInHome = false,
            PageSortOrder = 4
        };
        sections.Add(servicesCta);

        // 3. ABOUT US PAGE SECTIONS
        var aboutHero = new PageSection
        {
            Id = Guid.NewGuid(),
            WebPageId = aboutPage.Id,
            TemplateKey = "Hero_CorporateSplit",
            Title = $"About {request.OrganizationName}",
            MiniTitle = "OUR MISSION & PURPOSE",
            Description = $"{request.OrganizationName} was established to deliver outstanding standards of service, innovative solutions, and reliable operational value.",
            ButtonText = "View Our Services",
            ButtonLink = "/services",
            DirectUrl = "about-hero",
            ShowInHome = false,
            PageSortOrder = 1
        };
        sections.Add(aboutHero);

        var aboutValues = new PageSection
        {
            Id = Guid.NewGuid(),
            WebPageId = aboutPage.Id,
            TemplateKey = "Body_FeatureGrid3",
            Title = "Our Core Values & Principles",
            MiniTitle = "GUIDING ETHICS",
            Description = "The bedrock principles that inform our decisions, guide our teamwork, and cultivate lasting trust.",
            DirectUrl = "about-values",
            ShowInHome = false,
            PageSortOrder = 2,
            PageSectionLists = new List<PageSectionList>
            {
                new() { Id = Guid.NewGuid(), Title = "Integrity & Accountability", Description = "Upholding uncompromising ethical standards, clear communication, and transparency in all dealings.", IconText = "fa-solid fa-scale-balanced", SortOrder = 1 },
                new() { Id = Guid.NewGuid(), Title = "Operational Excellence", Description = "Constantly refining methods, adopting industry best practices, and delivering dependable quality.", IconText = "fa-solid fa-medal", SortOrder = 2 },
                new() { Id = Guid.NewGuid(), Title = "Client-Centric Commitment", Description = "Prioritizing client priorities, anticipating needs, and building collaborative partnerships.", IconText = "fa-solid fa-users", SortOrder = 3 }
            }
        };
        sections.Add(aboutValues);

        var aboutStats = new PageSection
        {
            Id = Guid.NewGuid(),
            WebPageId = aboutPage.Id,
            TemplateKey = "Body_StatsCounters",
            Title = "Enterprise Track Record",
            MiniTitle = "MEASURABLE IMPACT",
            Description = "A consistent record of dependable execution, client satisfaction, and operational resilience.",
            DirectUrl = "about-stats",
            ShowInHome = false,
            PageSortOrder = 3,
            PageSectionLists = new List<PageSectionList>
            {
                new() { Id = Guid.NewGuid(), Title = "100%", MiniTitle = "Commitment", Description = "Dedicated to partner objectives", SortOrder = 1 },
                new() { Id = Guid.NewGuid(), Title = "Zero", MiniTitle = "Compromise", Description = "Strict quality standards", SortOrder = 2 },
                new() { Id = Guid.NewGuid(), Title = "Trusted", MiniTitle = "Reputation", Description = "Proven track record of delivery", SortOrder = 3 },
                new() { Id = Guid.NewGuid(), Title = "Continuous", MiniTitle = "Innovation", Description = "Evolving with modern standards", SortOrder = 4 }
            }
        };
        sections.Add(aboutStats);

        var aboutCta = new PageSection
        {
            Id = Guid.NewGuid(),
            WebPageId = aboutPage.Id,
            TemplateKey = "Body_CtaSplit",
            Title = $"Connect with the {request.OrganizationName} Team",
            MiniTitle = "BUILDING MEANINGFUL PARTNERSHIPS",
            Description = "We welcome the opportunity to discuss your goals and demonstrate how our expertise can assist.",
            ButtonText = "Reach Out Today",
            ButtonLink = "/contact",
            DirectUrl = "about-cta",
            ShowInHome = false,
            PageSortOrder = 4
        };
        sections.Add(aboutCta);

        // 4. CONTACT US PAGE SECTIONS
        var contactHero = new PageSection
        {
            Id = Guid.NewGuid(),
            WebPageId = contactPage.Id,
            TemplateKey = "Hero_CorporateSplit",
            Title = "Contact & Communications Hub",
            MiniTitle = "WE'RE HERE TO ASSIST",
            Description = $"Reach out to {request.OrganizationName} for inquiries, corporate collaborations, or specialized support.",
            ButtonText = "Email Our Office",
            ButtonLink = $"mailto:{request.AdminEmail}",
            DirectUrl = "contact-hero",
            ShowInHome = false,
            PageSortOrder = 1
        };
        sections.Add(contactHero);

        var contactChannels = new PageSection
        {
            Id = Guid.NewGuid(),
            WebPageId = contactPage.Id,
            TemplateKey = "Body_FeatureGrid3",
            Title = "Communication Channels",
            MiniTitle = "DIRECT ACCESS",
            Description = "Choose the most convenient communication method to connect directly with our departments.",
            DirectUrl = "contact-channels",
            ShowInHome = false,
            PageSortOrder = 2,
            PageSectionLists = new List<PageSectionList>
            {
                new() { Id = Guid.NewGuid(), Title = "General Inquiries", Description = $"Direct correspondence and corporate information: {request.AdminEmail}", IconText = "fa-solid fa-envelope", SortOrder = 1 },
                new() { Id = Guid.NewGuid(), Title = "Client Support", Description = "Dedicated customer assistance and operational inquiry resolution.", IconText = "fa-solid fa-headset", SortOrder = 2 },
                new() { Id = Guid.NewGuid(), Title = "Operating Hours", Description = "Monday through Friday: 8:30 AM to 5:30 PM (Local Standard Time).", IconText = "fa-solid fa-clock", SortOrder = 3 }
            }
        };
        sections.Add(contactChannels);

        var contactFormSection = new PageSection
        {
            Id = Guid.NewGuid(),
            WebPageId = contactPage.Id,
            TemplateKey = "Contact_SplitDetails",
            Title = "Send Us a Direct Message",
            MiniTitle = "GET IN TOUCH",
            Description = "Have questions regarding our services, partnerships, or operational support? Send us a message and our team will get back to you promptly.",
            DirectUrl = "contact-form",
            ShowInHome = false,
            PageSortOrder = 3,
            PageFormId = contactForm?.Id,
            FormKey = "contact-us"
        };
        sections.Add(contactFormSection);

        var contactCta = new PageSection
        {
            Id = Guid.NewGuid(),
            WebPageId = contactPage.Id,
            TemplateKey = "Body_CtaSplit",
            Title = "Send an Inquiry or Schedule a Meeting",
            MiniTitle = "PROMPT RESPONSE GUARANTEED",
            Description = "Our administrative team reviews all incoming inquiries promptly and will connect with you within 24 business hours.",
            ButtonText = "Compose Email",
            ButtonLink = $"mailto:{request.AdminEmail}",
            DirectUrl = "contact-cta",
            ShowInHome = false,
            PageSortOrder = 4
        };
        sections.Add(contactCta);

        // 5. REQUEST A SERVICE PAGE SECTIONS
        var requestHero = new PageSection
        {
            Id = Guid.NewGuid(),
            WebPageId = requestServicePage.Id,
            TemplateKey = "Hero_CorporateSplit",
            Title = "Initiate a Project or Service Request",
            MiniTitle = $"ENGAGE WITH {abbreviation}",
            Description = "Submit your organization's specifications, service requirements, and desired timeline for a dedicated solution assessment.",
            ButtonText = "Start Intake Below",
            ButtonLink = "#request-service",
            DirectUrl = "request-hero",
            ShowInHome = false,
            PageSortOrder = 1
        };
        sections.Add(requestHero);

        var requestIntakeSection = new PageSection
        {
            Id = Guid.NewGuid(),
            WebPageId = requestServicePage.Id,
            TemplateKey = "Body_RequestService",
            Title = "Request a Tailored Enterprise Service",
            MiniTitle = "SERVICE CONSULTATION",
            Description = "Tell us about your organization's goals, operational challenges, or project timeline. Our advisory team will review your specifications and schedule a dedicated strategic consultation.",
            DirectUrl = "request-service",
            ShowInHome = false,
            PageSortOrder = 2,
            PageFormId = serviceRequestForm?.Id,
            FormKey = "service-request"
        };
        sections.Add(requestIntakeSection);

        // 6. PRE-FOOTER NEWSLETTER DISPATCH
        var newsletterSection = new PageSection
        {
            Id = Guid.NewGuid(),
            TemplateKey = "News_MinimalBar",
            Title = "Stay Informed with Weekly Dispatches",
            MiniTitle = "NEWSLETTER",
            Description = "Subscribe to our periodic industry insights, corporate bulletins, and platform updates.",
            DirectUrl = "newsletter-bar",
            ShowInHome = true,
            FixedAfterFooter = true,
            HomePageSortOrder = 6,
            PageSortOrder = 99,
            PageFormId = newsletterForm?.Id,
            FormKey = "newsletter"
        };
        sections.Add(newsletterSection);

        dbContext.PageSections.AddRange(sections);
        await dbContext.SaveChangesAsync(cancellationToken);
    }
}
