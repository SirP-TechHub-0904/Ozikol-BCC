using Microsoft.AspNetCore.Identity;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Infrastructure.TenantSupport;
using Ozikol_BCC.Persistence.EF.SQL;
using Microsoft.Extensions.Configuration;

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
    private readonly IConfiguration _configuration;

    /// <summary>
    /// Initializes a new instance of the <see cref="TenantOnboardingService"/> class.
    /// </summary>
    /// <param name="masterCatalogDbContext">The central master catalog database context.</param>
    /// <param name="tenantOptions">Tenant configuration options containing default connection strings.</param>
    /// <param name="serviceProvider">Dependency injection service provider.</param>
    /// <param name="logger">Application logging facility.</param>
    /// <param name="configuration">Application configuration for environment-driven settings.</param>
    public TenantOnboardingService(
        MasterCatalogDbContext masterCatalogDbContext,
        IOptions<TenantConfigurationOptions> tenantOptions,
        IServiceProvider serviceProvider,
        ILogger<TenantOnboardingService> logger,
        IConfiguration configuration)
    {
        _masterCatalogDbContext = masterCatalogDbContext;
        _tenantOptions = tenantOptions;
        _serviceProvider = serviceProvider;
        _logger = logger;
        // IConfiguration is required to resolve TenantSettings__BaseDomain from .env / environment variables.
        // This drives the generated tenant URL (e.g. https://klothcity.ozikol.cloud vs localhost:4200).
        _configuration = configuration;
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

        // Resolve the base domain from environment configuration.
        // On production VPS: set TenantSettings__BaseDomain=ozikol.cloud in .env
        // On local dev: falls back to localhost:4200 so existing dev workflow is unchanged.
        var baseDomain = _configuration["TenantSettings__BaseDomain"]
                      ?? _configuration["TenantSettings:BaseDomain"]
                      ?? "localhost:4200";

        // Production generates: klothcity.ozikol.cloud
        // Local dev generates:  klothcity.localhost:4200
        var primaryDomain = $"{cleanKey}.{baseDomain}";
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
                    CompanyIconUrl = null,
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

            // 5b. Seed Default Web Pages
            // Top-Level Direct Menu Pages (Home, Blog, Contact)
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

            var blogPage = await dbContext.WebPages.FirstOrDefaultAsync(p => p.DirectUrl == "blog", cancellationToken);
            if (blogPage == null)
            {
                blogPage = new WebPage
                {
                    Id = Guid.NewGuid(),
                    Title = "Blog",
                    DirectUrl = "blog",
                    ShowInMainMenu = true,
                    ShowInFooter = true,
                    EnableDirectUrl = true,
                    Publish = true,
                    SortOrder = 2
                };
                dbContext.WebPages.Add(blogPage);
            }

            var contactPage = await dbContext.WebPages.FirstOrDefaultAsync(p => p.DirectUrl == "contact", cancellationToken);
            if (contactPage == null)
            {
                contactPage = new WebPage
                {
                    Id = Guid.NewGuid(),
                    Title = "Contact",
                    DirectUrl = "contact",
                    ShowInMainMenu = true,
                    ShowInFooter = true,
                    EnableDirectUrl = true,
                    Publish = true,
                    SortOrder = 3
                };
                dbContext.WebPages.Add(contactPage);
            }

            // Standalone Services Overview Page (referenced in footer)
            var servicesPage = await dbContext.WebPages.FirstOrDefaultAsync(p => p.DirectUrl == "services", cancellationToken);
            if (servicesPage == null)
            {
                servicesPage = new WebPage
                {
                    Id = Guid.NewGuid(),
                    Title = "Services",
                    DirectUrl = "services",
                    ShowInMainMenu = false,
                    ShowInFooter = true,
                    EnableDirectUrl = true,
                    Publish = true,
                    SortOrder = 9
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
                    ShowInMainMenu = false,
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
                    ShowInMainMenu = false,
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
                    ShowInMainMenu = false,
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
                    ShowInMainMenu = false,
                    ShowInFooter = true,
                    EnableDirectUrl = true,
                    Publish = true,
                    SortOrder = 13
                };
                dbContext.WebPages.Add(service4);
            }

            // Seed 3 Child Pages under the Company Category for Dropdown Menu & Footer Column
            var aboutPage = await dbContext.WebPages.FirstOrDefaultAsync(p => p.DirectUrl == "about", cancellationToken);
            if (aboutPage == null)
            {
                aboutPage = new WebPage
                {
                    Id = Guid.NewGuid(),
                    Title = "About Us",
                    DirectUrl = "about",
                    PageCategoryId = companyCategory.Id,
                    ShowInMenuDropDown = true,
                    ShowInMainMenu = false,
                    ShowInFooter = true,
                    EnableDirectUrl = true,
                    Publish = true,
                    SortOrder = 20
                };
                dbContext.WebPages.Add(aboutPage);
            }

            var historyPage = await dbContext.WebPages.FirstOrDefaultAsync(p => p.DirectUrl == "history", cancellationToken);
            if (historyPage == null)
            {
                historyPage = new WebPage
                {
                    Id = Guid.NewGuid(),
                    Title = "Our History",
                    DirectUrl = "history",
                    PageCategoryId = companyCategory.Id,
                    ShowInMenuDropDown = true,
                    ShowInMainMenu = false,
                    ShowInFooter = true,
                    EnableDirectUrl = true,
                    Publish = true,
                    SortOrder = 21
                };
                dbContext.WebPages.Add(historyPage);
            }

            var teamPage = await dbContext.WebPages.FirstOrDefaultAsync(p => p.DirectUrl == "team", cancellationToken);
            if (teamPage == null)
            {
                teamPage = new WebPage
                {
                    Id = Guid.NewGuid(),
                    Title = "Leadership Team",
                    DirectUrl = "team",
                    PageCategoryId = companyCategory.Id,
                    ShowInMenuDropDown = true,
                    ShowInMainMenu = false,
                    ShowInFooter = true,
                    EnableDirectUrl = true,
                    Publish = true,
                    SortOrder = 22
                };
                dbContext.WebPages.Add(teamPage);
            }

            // Standalone Dedicated Page: Request a Service with IsMenuCTA enabled
            var requestServicePage = await dbContext.WebPages.FirstOrDefaultAsync(p => p.DirectUrl == "request-service", cancellationToken);
            if (requestServicePage == null)
            {
                requestServicePage = new WebPage
                {
                    Id = Guid.NewGuid(),
                    Title = "Request a Service",
                    DirectUrl = "request-service",
                    PageCategoryId = null,
                    ShowInMainMenu = false,
                    ShowInMenuDropDown = false,
                    ShowInFooter = true,
                    EnableDirectUrl = true,
                    Publish = true,
                    SortOrder = 30,
                    IsMenuCTA = true
                };
                dbContext.WebPages.Add(requestServicePage);
            }

            // Seed 3 Turnkey Legal Compliance WebPages (Privacy Policy, Terms & Conditions, Cookie Policy)
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
                    SortOrder = 40
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
                    SortOrder = 41
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
                    SortOrder = 42
                };
                dbContext.WebPages.Add(cookiePage);
            }
            await dbContext.SaveChangesAsync(cancellationToken);

            // 5c. Seed Standard CMS Dynamic Forms (Contact Us, Newsletter, Service Request & Intake)
            await SeedDefaultPageFormsAsync(dbContext, cancellationToken);
            await dbContext.SaveChangesAsync(cancellationToken);

            // 5d. Seed Turnkey Blog Category & Articles
            await SeedDefaultBlogsAsync(dbContext, cancellationToken);
            await dbContext.SaveChangesAsync(cancellationToken);

            // 5e. Seed Structured Page Sections & Repeatable Child Lists
            await SeedDefaultPageSectionsAsync(dbContext, request, sectorDefaults, abbreviation, homePage, aboutPage, historyPage, teamPage, servicesPage, requestServicePage, contactPage, cancellationToken);

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
    /// Seeds foundational blog categories and turnkey news articles into the tenant database,
    /// enabling an out-of-the-box newsroom with realistic editorial copy and Unsplash corporate imagery.
    /// </summary>
    /// <param name="dbContext">The tenant's dedicated DashboardDbContext instance.</param>
    /// <param name="cancellationToken">Cancellation token for async operations.</param>
    /// <returns>A Task representing the asynchronous operation.</returns>
    private static async Task SeedDefaultBlogsAsync(DashboardDbContext dbContext, CancellationToken cancellationToken)
    {
        if (await dbContext.Blogs.AnyAsync(cancellationToken))
        {
            return;
        }

        var defaultCategory = await dbContext.BlogCategories.FirstOrDefaultAsync(c => c.Title == "Enterprise Insights & Strategy", cancellationToken);
        if (defaultCategory == null)
        {
            defaultCategory = new BlogCategory
            {
                Id = Guid.NewGuid(),
                Title = "Enterprise Insights & Strategy",
                Publish = true
            };
            dbContext.BlogCategories.Add(defaultCategory);
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        var blog1 = new Blog
        {
            Id = Guid.NewGuid(),
            Title = "Architecting Resilient Cloud Ecosystems for the Modern Enterprise",
            Date = DateTime.UtcNow.AddDays(-3),
            Publish = true,
            SortOrder = 1,
            AddToRibon = true,
            BlogCategoryId = defaultCategory.Id,
            ImageUrl = "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&auto=format&fit=crop&q=80",
            Description = "A strategic blueprint for achieving high availability, fault tolerance, and multi-region data sovereignty across enterprise workloads.",
            FullDescription = @"<p class=""lead fs-5 text-secondary"">As organizations accelerate digital transformation, engineering resilient architectures capable of withstanding distributed outages is no longer optional—it is a core operational mandate.</p>
<h3 class=""fw-bold text-dark mt-4 mb-3"">1. Decentralized Fault Domains and Redundancy</h3>
<p>Modern architectures require decoupled service boundaries where state and execution logic operate independently. By isolating workloads into discrete tenant partitions, systemic blast radiuses are mitigated, preventing localized failures from cascading across the entire ecosystem.</p>
<blockquote class=""border-start border-primary border-4 ps-3 py-2 my-4 bg-light rounded"">
<p class=""fst-italic text-dark mb-0"">""True resilience is designed from inception through immutable infrastructure, automated health verification, and continuous failover testing.""</p>
</blockquote>
<h3 class=""fw-bold text-dark mt-4 mb-3"">2. Continuous Observability and Automated Recovery</h3>
<p>Proactive monitoring paired with synthetic transaction testing guarantees that performance degradations are identified and resolved before affecting mission-critical business transactions.</p>"
        };

        var blog2 = new Blog
        {
            Id = Guid.NewGuid(),
            Title = "The Paradigm Shift to Zero-Downtime Migration Pipelines",
            Date = DateTime.UtcNow.AddDays(-7),
            Publish = true,
            SortOrder = 2,
            AddToRibon = true,
            BlogCategoryId = defaultCategory.Id,
            ImageUrl = "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&auto=format&fit=crop&q=80",
            Description = "How progressive engineering organizations execute mission-critical database cutovers and schema upgrades without interrupting active user sessions.",
            FullDescription = @"<p class=""lead fs-5 text-secondary"">Performing live database migrations under heavy operational throughput requires disciplined schema versioning, dual-write pipelines, and backward-compatible data contracts.</p>
<h3 class=""fw-bold text-dark mt-4 mb-3"">1. Phased Schema Evolution and Non-Breaking Contracts</h3>
<p>The expand-and-contract methodology decouples code deployment from data migration. By introducing new columns and tables in advance of application logic updates, existing operational workloads maintain complete continuity.</p>
<h3 class=""fw-bold text-dark mt-4 mb-3"">2. Automated Validation and Verification Gates</h3>
<p>Real-time data reconciliation scripts ensure that transactional synchronization remains at 100% fidelity before traffic cutover, virtually eliminating rollback risks.</p>"
        };

        var blog3 = new Blog
        {
            Id = Guid.NewGuid(),
            Title = "Next-Gen Identity Governance & Role-Based Access Control",
            Date = DateTime.UtcNow.AddDays(-12),
            Publish = true,
            SortOrder = 3,
            AddToRibon = true,
            BlogCategoryId = defaultCategory.Id,
            ImageUrl = "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=1200&auto=format&fit=crop&q=80",
            Description = "Balancing administrative agility with rigorous zero-trust security postures across sovereign multi-tenant workspaces.",
            FullDescription = @"<p class=""lead fs-5 text-secondary"">Safeguarding enterprise assets demands granular authorization matrices, cryptographic session binding, and comprehensive audit trail logging across all administrative endpoints.</p>
<h3 class=""fw-bold text-dark mt-4 mb-3"">1. Least Privilege Access Models</h3>
<p>Dynamic permission assignment ensures staff members and collaborators receive strictly the access required to fulfill their duties, minimizing organizational attack surfaces.</p>
<h3 class=""fw-bold text-dark mt-4 mb-3"">2. Immutable Audit Trails</h3>
<p>Every administrative event, configuration change, and permission elevation is permanently logged in tamper-evident audit records to facilitate regulatory compliance and forensic oversight.</p>"
        };

        dbContext.Blogs.AddRange(blog1, blog2, blog3);
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
      <a class=""navbar-brand d-flex align-items-center gap-2"" href=""/"">
        {{ BrandIdentity }}
      </a>
      <button class=""navbar-toggler border-0 shadow-none"" type=""button"" onclick=""this.closest('nav').querySelector('.collapse').classList.toggle('show')"">
        <span class=""navbar-toggler-icon""></span>
      </button>
      <div class=""collapse navbar-collapse"" id=""ozNavMain"">
        <ul class=""navbar-nav mx-auto mb-2 mb-lg-0 gap-lg-3"">
          {{#each MainMenuItems}}
            <li class=""nav-item""><a class=""nav-link fw-semibold text-secondary"" href=""{{ Url }}"">{{ Title }}</a></li>
          {{/each}}
          {{#each MenuDropdowns}}
            <li class=""nav-item dropdown"">
              <a class=""nav-link dropdown-toggle fw-semibold text-secondary"" href=""#"" role=""button"" data-bs-toggle=""dropdown"">{{ Title }}</a>
              <ul class=""dropdown-menu border-0 shadow-sm rounded-3 py-2"">
                {{#each Pages}}
                  <li><a class=""dropdown-item small py-2 px-3 fw-medium"" href=""{{ Url }}"">{{ Title }}</a></li>
                {{/each}}
              </ul>
            </li>
          {{/each}}
        </ul>
        <div class=""d-flex align-items-center gap-2"">
          {{#each MenuCtaButtons}}
            <a href=""{{ Url }}"" class=""btn btn-primary rounded-pill px-3 py-2 fw-semibold shadow-sm"">
              {{ Title }}
            </a>
          {{/each}}
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
                DefaultContentJson = System.Text.Json.JsonSerializer.Serialize(new
                {
                    miniTitle = "Enterprise Solutions",
                    title = "Empowering Modern Enterprises to Scale with Confidence.",
                    description = "Delivering innovative solutions, strategic consulting, and operational excellence to help your business achieve sustainable success.",
                    buttonText = "Explore Services",
                    buttonLink = "#services",
                    secondaryButtonText = "Schedule Consultation",
                    secondaryButtonLink = "#contact",
                    imageUrl = "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1200&q=80"
                }),
                HtmlTemplate = @"
<section class=""py-5 bg-light border-bottom"">
  <div class=""container py-lg-4"">
    <div class=""row align-items-center g-5"">
      <div class=""col-lg-6"">
        <div class=""d-inline-flex align-items-center gap-2 px-3 py-1 rounded-pill bg-primary-subtle text-primary border border-primary-subtle mb-3"">
          <span class=""small fw-bold text-uppercase"">{{ MiniTitle }}</span>
        </div>
        <h1 class=""display-5 fw-bolder text-dark mb-3 lh-sm"">{{ Title }}</h1>
        <p class=""lead text-muted mb-4 fs-6"">{{ Description }}</p>
        <div class=""d-flex flex-wrap gap-3"">
          <a href=""{{ ButtonLink }}"" class=""btn btn-primary btn-lg rounded-pill px-4 py-2 fw-bold shadow-sm d-inline-flex align-items-center gap-2"">
            <span>{{ ButtonText }}</span>
            <span style=""font-size: 16px;"">→</span>
          </a>
          {{#if SecondaryButtonText}}
          <a href=""{{ SecondaryButtonLink }}"" class=""btn btn-outline-secondary btn-lg rounded-pill px-4 py-2 fw-semibold bg-white"">
            {{ SecondaryButtonText }}
          </a>
          {{/if}}
        </div>
      </div>
      <div class=""col-lg-6"">
        <div class=""rounded-4 overflow-hidden shadow-lg border border-light-subtle"">
          <img src=""{{ ImageUrl }}"" 
               alt=""{{ Title }}"" class=""img-fluid w-100 object-fit-cover"" style=""max-height: 420px;"" />
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
                DefaultContentJson = System.Text.Json.JsonSerializer.Serialize(new
                {
                    title = "Engineered for Maximum Impact",
                    miniTitle = "Core Capabilities",
                    description = "Essential infrastructure designed for seamless organizational execution and rapid growth.",
                    items = new[]
                    {
                        new { title = "Data Security & Privacy", description = "Enterprise-grade encryption, role-based access management, and proactive compliance protection.", iconText = "fa-solid fa-shield-halved" },
                        new { title = "Collaboration Hub", description = "Unified communication channels, real-time dispatches, and organizational announcements.", iconText = "fa-solid fa-comments" },
                        new { title = "Operational Efficiency", description = "Modern automated workflows engineered to eliminate administrative bottlenecks and elevate team productivity.", iconText = "fa-solid fa-bolt" }
                    }
                }),
                HtmlTemplate = @"
<section class=""py-5 bg-white border-bottom"" id=""features"">
  <div class=""container py-4"">
    <div class=""text-center max-w-700 mx-auto mb-5"">
      <span class=""badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-1 rounded-pill text-uppercase fw-bold"">{{ MiniTitle }}</span>
      <h2 class=""fw-bold text-dark mt-2 mb-3"">{{ Title }}</h2>
      <p class=""text-muted"">{{ Description }}</p>
    </div>
    <div class=""row g-4"">
      {{#each PageSectionLists}}
        <div class=""col-md-4"">
          <div class=""card h-100 p-4 border border-light-subtle rounded-4 shadow-sm"">
            {{#if IconText}}
              <div class=""rounded-3 bg-primary-subtle text-primary d-inline-flex align-items-center justify-content-center mb-3"" style=""width: 50px; height: 50px;"">
                <i class=""{{ IconText }} fs-4""></i>
              </div>
            {{/if}}
            <h5 class=""fw-bold text-dark"">{{ Title }}</h5>
            <p class=""text-muted small mb-0"">{{ Description }}</p>
          </div>
        </div>
      {{/each}}
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
                DefaultContentJson = System.Text.Json.JsonSerializer.Serialize(new
                {
                    title = "Built for Organizational Excellence & Long-Term Trust",
                    miniTitle = "Our Mission & Standards",
                    description = "We partner with forward-thinking enterprises, growing organizations, and industry leaders to streamline operations, enhance client service, and drive sustainable growth.",
                    imageUrl = "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1000&q=80",
                    buttonText = "Learn More About Our Firm →",
                    buttonLink = "#contact",
                    items = new[]
                    {
                        new { title = "Strategic Planning & Execution", description = "Data-backed strategies, transparent execution, and dedicated accountability for every business milestone.", iconText = "fa-solid fa-check" },
                        new { title = "Enterprise Data Protection", description = "Industry-standard encryption, secure cloud infrastructure, and strict client confidentiality standards.", iconText = "fa-solid fa-check" }
                    }
                }),
                HtmlTemplate = @"
<section class=""py-5 bg-white border-bottom"" id=""about"">
  <div class=""container py-4"">
    <div class=""row align-items-center g-5"">
      <div class=""col-lg-6"">
        <div class=""rounded-4 overflow-hidden shadow border border-light-subtle"">
          <img src=""{{ ImageUrl }}"" 
               alt=""{{ Title }}"" class=""img-fluid w-100 object-fit-cover"" style=""max-height: 380px;"" />
        </div>
      </div>
      <div class=""col-lg-6"">
        <span class=""badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-1 rounded-pill text-uppercase fw-bold mb-3"">{{ MiniTitle }}</span>
        <h2 class=""fw-bolder text-dark mb-3"">{{ Title }}</h2>
        <p class=""text-muted mb-4"">{{ Description }}</p>
        <div class=""d-flex flex-column gap-3 mb-4"">
          {{#each PageSectionLists}}
            <div class=""d-flex align-items-start gap-3"">
              <span class=""badge rounded-circle bg-primary-subtle text-primary p-2 mt-1""><i class=""{{ IconText }}""></i></span>
              <div>
                <h6 class=""fw-bold text-dark mb-1"">{{ Title }}</h6>
                <p class=""text-muted small mb-0"">{{ Description }}</p>
              </div>
            </div>
          {{/each}}
        </div>
        <a href=""{{ ButtonLink }}"" class=""btn btn-outline-primary rounded-pill px-4 py-2 fw-semibold"">
          {{ ButtonText }}
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
                DefaultContentJson = System.Text.Json.JsonSerializer.Serialize(new
                {
                    title = "Enterprise Reliability & Impact",
                    miniTitle = "Key Metrics",
                    description = "Demonstrable results and verified performance statistics across our platform ecosystem.",
                    items = new[]
                    {
                        new { title = "12,500+", description = "Verified Members", iconText = "fa-solid fa-users text-primary" },
                        new { title = "99.98%", description = "System Reliability", iconText = "fa-solid fa-server text-success" },
                        new { title = "45+", description = "Global Chapters", iconText = "fa-solid fa-earth-americas text-info" },
                        new { title = "24/7", description = "Priority Support", iconText = "fa-solid fa-headset text-warning" }
                    }
                }),
                HtmlTemplate = @"
<section class=""py-5 bg-white border-bottom"">
  <div class=""container py-3"">
    <div class=""row g-4 text-center"">
      {{#each PageSectionLists}}
        <div class=""col-6 col-md-3"">
          <div class=""p-3"">
            <i class=""{{ IconText }} fs-2 mb-2""></i>
            <div class=""display-6 fw-bold text-dark"">{{ Title }}</div>
            <div class=""small text-muted fw-semibold text-uppercase"">{{ Description }}</div>
          </div>
        </div>
      {{/each}}
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
                DefaultContentJson = System.Text.Json.JsonSerializer.Serialize(new
                {
                    title = "Trusted by Clients & Industry Leaders",
                    miniTitle = "Client Testimonials",
                    description = "Hear directly from businesses and partners who rely on our services for sustainable growth.",
                    items = new[]
                    {
                        new { title = "Sarah Adams", miniTitle = "SA", description = "Working with our partners transformed our operational efficiency. Their team provided clear strategic direction and delivered outstanding results from day one.", moreDescription = "Chief Operating Officer", imageUrl = "" },
                        new { title = "Marcus Kim", miniTitle = "MK", description = "Their professionalism, deep industry expertise, and responsive support have made them an indispensable partner in scaling our business.", moreDescription = "Managing Director", imageUrl = "" },
                        new { title = "Elena Rostova", miniTitle = "EL", description = "The quality of execution and attention to detail exceeded our expectations. They consistently deliver on time and above benchmark.", moreDescription = "VP of Business Development", imageUrl = "" }
                    }
                }),
                HtmlTemplate = @"
<section class=""py-5 bg-light border-bottom"">
  <div class=""container py-4"">
    <div class=""text-center max-w-700 mx-auto mb-5"">
      <span class=""badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-1 rounded-pill text-uppercase fw-bold"">{{ MiniTitle }}</span>
      <h2 class=""fw-bold text-dark mt-2 mb-3"">{{ Title }}</h2>
      <p class=""text-muted"">{{ Description }}</p>
    </div>
    <div class=""row g-4"">
      {{#each PageSectionLists}}
        <div class=""col-md-4"">
          <div class=""card h-100 p-4 border border-light-subtle rounded-4 shadow-sm bg-white"">
            <div class=""text-warning mb-3"">
              <i class=""fa-solid fa-star""></i><i class=""fa-solid fa-star""></i><i class=""fa-solid fa-star""></i><i class=""fa-solid fa-star""></i><i class=""fa-solid fa-star""></i>
            </div>
            <p class=""text-secondary mb-4 fst-italic"">""{{ Description }}""</p>
            <div class=""d-flex align-items-center gap-3 mt-auto"">
              {{#if ImageUrl}}
                <img src=""{{ ImageUrl }}"" alt=""{{ Title }}"" class=""rounded-circle object-fit-cover"" style=""width:42px; height:42px;"" />
              {{else}}
                <div class=""rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center fw-bold"" style=""width:42px; height:42px;"">{{ MiniTitle }}</div>
              {{/if}}
              <div>
                <div class=""fw-bold text-dark small"">{{ Title }}</div>
                <div class=""text-muted small"">{{ MoreDescription }}</div>
              </div>
            </div>
          </div>
        </div>
      {{/each}}
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
                DefaultContentJson = System.Text.Json.JsonSerializer.Serialize(new
                {
                    title = "Frequently Asked Questions",
                    miniTitle = "Questions & Answers",
                    description = "Helpful answers regarding our services, client engagements, and delivery process.",
                    items = new[]
                    {
                        new { title = "How does our organization tailor its services to your business needs?", description = "We begin with an in-depth discovery consultation to assess your unique goals, timelines, and operational requirements, then design a customized solution that aligns precisely with your business priorities." },
                        new { title = "What kind of ongoing support and collaboration can you expect?", description = "Every client is paired with a dedicated account lead and receives regular milestone reviews, transparent progress reporting, and responsive technical and strategic support throughout our partnership." },
                        new { title = "What are your standard compliance and data security standards?", description = "We enforce enterprise-grade AES-256 encryption, strict role-based authorization protocols, and SOC2-compliant handling across all platform transactions and customer records." }
                    }
                }),
                HtmlTemplate = @"
<section class=""py-5 bg-white border-bottom"">
  <div class=""container py-4"">
    <div class=""text-center max-w-700 mx-auto mb-5"">
      <span class=""badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-1 rounded-pill text-uppercase fw-bold"">{{ MiniTitle }}</span>
      <h2 class=""fw-bold text-dark mt-2 mb-3"">{{ Title }}</h2>
      <p class=""text-muted"">{{ Description }}</p>
    </div>
    <div class=""max-w-800 mx-auto"">
      <div class=""accordion"" id=""ozFaqAccordion"">
        {{#each PageSectionLists}}
          <div class=""accordion-item border rounded-3 mb-3 overflow-hidden shadow-sm"">
            <h2 class=""accordion-header"">
              <button class=""accordion-button {{#unless @first}}collapsed{{/unless}} fw-bold text-dark bg-light"" type=""button"" onclick=""this.closest('.accordion-item').querySelector('.accordion-collapse').classList.toggle('show')"">
                <i class=""fa-solid fa-circle-question text-primary me-2""></i> {{ Title }}
              </button>
            </h2>
            <div class=""accordion-collapse collapse {{#if @first}}show{{/if}}"">
              <div class=""accordion-body text-secondary small"">
                {{ Description }}
              </div>
            </div>
          </div>
        {{/each}}
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
                DefaultContentJson = System.Text.Json.JsonSerializer.Serialize(new
                {
                    title = "Ready to Elevate Your Business?",
                    description = "Partner with our team to accelerate your operations, modernize systems, and achieve sustainable long-term growth.",
                    buttonText = "Request a Consultation",
                    buttonLink = "#request-service",
                    secondaryButtonText = "Contact Our Team",
                    secondaryButtonLink = "#contact"
                }),
                HtmlTemplate = @"
<section class=""py-5 bg-light border-bottom"">
  <div class=""container py-3"">
    <div class=""card border-0 rounded-4 p-5 text-center text-white shadow"" style=""background: linear-gradient(135deg, #1d4ed8 0%, #0284c7 100%);"">
      <h2 class=""display-6 fw-bold mb-3"">{{ Title }}</h2>
      <p class=""lead opacity-90 max-w-600 mx-auto mb-4 fs-6"">{{ Description }}</p>
      <div class=""d-flex justify-content-center gap-3 flex-wrap"">
        <a href=""{{ ButtonLink }}"" class=""btn btn-light btn-lg rounded-pill px-4 py-2 fw-bold text-primary shadow"">
          <i class=""fa-solid fa-arrow-right me-1""></i> {{ ButtonText }}
        </a>
        <a href=""{{ SecondaryButtonLink }}"" class=""btn btn-outline-light btn-lg rounded-pill px-4 py-2 fw-semibold"">
          <i class=""fa-solid fa-envelope me-1""></i> {{ SecondaryButtonText }}
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
                DefaultContentJson = System.Text.Json.JsonSerializer.Serialize(new
                {
                    title = "Subscribe to Executive Insights",
                    description = "Receive weekly briefings, technology advisories, and organization updates directly in your inbox."
                }),
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
                DefaultContentJson = System.Text.Json.JsonSerializer.Serialize(new
                {
                    title = "Send Us a Direct Message",
                    miniTitle = "Official Inquiries",
                    description = "Have questions regarding our services, partnerships, or operational support? Send us a message and our team will get back to you promptly.",
                    items = new[]
                    {
                        new { title = "Corporate Office", description = "Administrative Headquarters, 742 Evergreen Terrace, Suite 500", iconText = "fa-solid fa-location-dot" },
                        new { title = "Official Inquiry Desk", description = "Direct corporate correspondence and information", iconText = "fa-solid fa-envelope" },
                        new { title = "Business Hours", description = "Monday – Friday: 8:30 AM – 5:30 PM (LST)", iconText = "fa-solid fa-clock" }
                    }
                }),
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
          {{#each PageSectionLists}}
            <div class=""card border-0 shadow-sm rounded-4 p-3 bg-white d-flex flex-row align-items-center gap-3"">
              {{#if IconText}}
                <div class=""rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center flex-shrink-0"" style=""width:44px; height:44px; font-size:18px;"">
                  <i class=""{{ IconText }}""></i>
                </div>
              {{/if}}
              <div>
                <strong class=""text-dark small d-block"">{{ Title }}</strong>
                <span class=""text-muted small"">{{ Description }}</span>
              </div>
            </div>
          {{/each}}
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
                DefaultContentJson = System.Text.Json.JsonSerializer.Serialize(new
                {
                    title = "Request a Tailored Enterprise Service",
                    miniTitle = "Service Consultation",
                    description = "Tell us about your organization's goals, operational challenges, or project timeline. Our advisory team will review your specifications and schedule a dedicated strategic consultation.",
                    items = new[]
                    {
                        new { title = "Dedicated Solutions Lead", description = "Direct engagement with an enterprise systems architect.", iconText = "fa-solid fa-check" },
                        new { title = "Feasibility & Scope Assessment", description = "Actionable roadmap, architectural fit, and resource modeling.", iconText = "fa-solid fa-check" },
                        new { title = "Client Confidentiality & NDA", description = "Strict confidentiality agreements and secure communication channels guaranteed.", iconText = "fa-solid fa-check" }
                    }
                }),
                HtmlTemplate = @"
<section class=""py-5 bg-light border-bottom"" id=""request-service"">
  <div class=""container py-4"">
    <div class=""row g-5"">
      <!-- Left Column: Executive Consultation Scope -->
      <div class=""col-lg-5"">
        <span class=""badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-1 rounded-pill text-uppercase fw-bold mb-2"">{{ MiniTitle }}</span>
        <h2 class=""fw-bold text-dark mb-3"">{{ Title }}</h2>
        <p class=""text-muted mb-4 fs-6"">{{ Description }}</p>

        <div class=""card border-0 shadow-sm rounded-4 p-4 bg-white mb-4"">
          <h6 class=""fw-bold text-dark text-uppercase small mb-3 tracking-wider text-primary"">Engagement Standards</h6>
          <div class=""d-flex flex-column gap-3"">
            {{#each PageSectionLists}}
              <div class=""d-flex align-items-start gap-3"">
                <div class=""rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center flex-shrink-0"" style=""width:32px; height:32px;"">
                  <i class=""{{ IconText }}""></i>
                </div>
                <div>
                  <strong class=""text-dark small d-block"">{{ Title }}</strong>
                  <span class=""text-muted small"">{{ Description }}</span>
                </div>
              </div>
            {{/each}}
          </div>
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
        <span class=""badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-1 rounded-pill text-uppercase fw-bold mb-2"">{{ MiniTitle }}</span>
        <h2 class=""fw-bold text-dark mb-0"">{{ Title }}</h2>
      </div>
      <div>
        <a href=""{{ ButtonLink }}"" class=""btn btn-outline-primary rounded-pill px-4 py-2 fw-semibold small"">
          <span>{{ ButtonText }}</span>
          <span class=""ms-1"">→</span>
        </a>
      </div>
    </div>
    <div class=""row g-4"">
      {{#each Articles}}
        <div class=""col-md-4"">
          <div class=""card border-0 rounded-4 overflow-hidden shadow-sm bg-white h-100 d-flex flex-column"">
            <div class=""position-relative"">
              <img src=""{{ CoverImageUrl }}"" alt=""{{ Title }}"" class=""card-img-top object-fit-cover"" style=""height: 220px;"" />
              <span class=""badge bg-white text-dark shadow-sm position-absolute top-0 start-0 m-3 px-3 py-1 rounded-pill small fw-bold"">{{ Category }}</span>
            </div>
            <div class=""card-body p-4 d-flex flex-column flex-grow-1"">
              <span class=""text-muted small mb-2 d-block""><i class=""fa-regular fa-calendar me-1""></i>{{ PublishedDate }}</span>
              <h5 class=""fw-bold text-dark mb-2 line-clamp-2"">{{ Title }}</h5>
              <p class=""text-muted small mb-4 line-clamp-3"">{{ Excerpt }}</p>
              <div class=""mt-auto"">
                <a href=""{{ Url }}"" class=""text-primary fw-bold small text-decoration-none d-inline-flex align-items-center gap-1"">
                  <span>Read Article</span>
                  <span>→</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      {{/each}}
    </div>
  </div>
</section>",
                CssStyles = @""
            },

            // 12b. Single Article Blog Detail with Sticky Sidebar
            new()
            {
                Id = Guid.NewGuid(),
                TemplateKey = "Blog_ArticleDetail",
                CategoryKey = "blog",
                Name = "Single Article with Sticky Sidebar & Widgets",
                VariantCode = "Blog_ArticleDetail",
                InstalledVersion = "1.0.0",
                IsActive = true,
                InstalledUtc = DateTime.UtcNow,
                HtmlTemplate = @"
<article class=""py-5 bg-white"" id=""blog-detail"">
  <div class=""container py-3"">
    <!-- Breadcrumb Header -->
    <nav class=""mb-4"" aria-label=""breadcrumb"">
      <ol class=""breadcrumb small"">
        <li class=""breadcrumb-item""><a href=""/"" class=""text-decoration-none"">Home</a></li>
        <li class=""breadcrumb-item""><a href=""/blog"" class=""text-decoration-none"">News &amp; Insights</a></li>
        <li class=""breadcrumb-item active text-truncate"" style=""max-width: 320px;"">{{ Article.Title }}</li>
      </ol>
    </nav>

    <div class=""row g-5"">
      <!-- Left Column (8 cols): Main Article Content -->
      <div class=""col-lg-8"">
        <div class=""mb-3"">
          <span class=""badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-1 rounded-pill fw-bold text-uppercase"">{{ Article.Category }}</span>
          <span class=""text-muted small ms-2""><i class=""fa-regular fa-calendar me-1""></i>{{ Article.PublishedDate }}</span>
          <span class=""text-muted small ms-3""><i class=""fa-regular fa-clock me-1""></i>{{ Article.ReadTime }}</span>
        </div>

        <h1 class=""fw-bold text-dark display-5 mb-4"">{{ Article.Title }}</h1>

        <!-- Featured Image -->
        <div class=""rounded-4 overflow-hidden shadow-sm mb-4"">
          <img src=""{{ Article.CoverImageUrl }}"" alt=""{{ Article.Title }}"" class=""img-fluid w-100 object-fit-cover"" style=""max-height: 460px;"" />
        </div>

        <!-- Article Rich-Text Content Body -->
        <div class=""article-body-content fs-5 text-secondary lh-lg mb-5"">
          {{ Article.Body }}
        </div>

        <!-- Article Tags & Social Share Strip -->
        <div class=""border-top border-bottom py-3 d-flex justify-content-between align-items-center flex-wrap gap-3 mb-5"">
          <div class=""d-flex align-items-center gap-2"">
            <span class=""fw-bold text-dark small"">Tagged:</span>
            {{#each Article.Tags}}
              <span class=""badge bg-light text-dark border"">{{ this }}</span>
            {{/each}}
          </div>
          {{ PostShareStrip }}
        </div>

        <!-- Author Bio Card -->
        <div class=""card border-0 bg-light rounded-4 p-4 d-flex flex-row gap-3 align-items-center"">
          <img src=""{{ Article.AuthorAvatarUrl }}"" alt=""{{ Article.AuthorName }}"" class=""rounded-circle object-fit-cover"" style=""width: 64px; height: 64px;"" />
          <div>
            <h6 class=""fw-bold text-dark mb-1"">Written by {{ Article.AuthorName }}</h6>
            <p class=""text-muted small mb-0"">{{ Article.AuthorBio }}</p>
          </div>
        </div>
      </div>

      <!-- Right Column (4 cols): Sticky Sidebar -->
      <div class=""col-lg-4"">
        <div class=""d-flex flex-column gap-4 sticky-top"" style=""top: 100px;"">
          <!-- Widget 1: Search Form (submits GET request to /blog?q=...) -->
          <div class=""card border border-light-subtle rounded-4 p-4 shadow-sm bg-white"">
            <h6 class=""fw-bold text-dark mb-3"">Search Insights</h6>
            <form action=""/blog"" method=""get"">
              <div class=""input-group"">
                <input type=""text"" name=""q"" class=""form-control bg-light border-0"" placeholder=""Search keywords..."" required />
                <button type=""submit"" class=""btn btn-primary"" title=""Search""><i class=""fa-solid fa-magnifying-glass""></i></button>
              </div>
            </form>
          </div>

          <!-- Widget 2: Recent Articles Loop -->
          <div class=""card border border-light-subtle rounded-4 p-4 shadow-sm bg-white"">
            <h6 class=""fw-bold text-dark mb-3"">Recent Dispatches</h6>
            <div class=""d-flex flex-column gap-3"">
              {{#each RecentArticles}}
                <div class=""d-flex gap-3 align-items-center"">
                  <img src=""{{ CoverImageUrl }}"" alt=""{{ Title }}"" class=""rounded-3 object-fit-cover flex-shrink-0"" style=""width: 60px; height: 60px;"" />
                  <div>
                    <small class=""text-muted d-block"" style=""font-size: 11px;"">{{ PublishedDate }}</small>
                    <a href=""{{ Url }}"" class=""fw-bold text-dark small text-decoration-none line-clamp-2"">{{ Title }}</a>
                  </div>
                </div>
              {{/each}}
            </div>
          </div>

          <!-- Widget 3: Categories with Live Article Count -->
          <div class=""card border border-light-subtle rounded-4 p-4 shadow-sm bg-white"">
            <h6 class=""fw-bold text-dark mb-3"">Topics &amp; Categories</h6>
            <ul class=""list-unstyled mb-0 d-flex flex-column gap-2 small"">
              {{#each BlogCategories}}
                <li class=""d-flex justify-content-between align-items-center"">
                  <a href=""{{ Url }}"" class=""text-decoration-none text-secondary"">{{ Name }}</a>
                  <span class=""badge bg-light text-muted border"">{{ PostCount }}</span>
                </li>
              {{/each}}
            </ul>
          </div>

          <!-- Widget 4: Newsletter Box -->
          <div class=""card border-0 rounded-4 p-4 text-center text-white shadow-sm"" style=""background: linear-gradient(135deg, #0050e5, #002b80);"">
            <i class=""fa-solid fa-envelope-open-text fs-2 mb-2""></i>
            <h6 class=""fw-bold mb-1"">Stay In The Loop</h6>
            <p class=""small text-white-50 mb-3"">Receive weekly editorial briefs and executive announcements.</p>
            {{ Form ""Newsletter_Subscribe"" }}
          </div>
        </div>
      </div>
    </div>
  </div>
</article>",
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
                DefaultContentJson = System.Text.Json.JsonSerializer.Serialize(new
                {
                    title = "Enterprise Solutions & Insights",
                    description = "Discover how leading organizations accelerate growth through reliable, secure cloud architectures.",
                    backgroundImageUrl = "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1600&q=80",
                    trailItems = new[]
                    {
                        new { label = "Home", url = "/", isActive = false },
                        new { label = "Capabilities", url = "/capabilities", isActive = false },
                        new { label = "Enterprise Solutions", url = "/capabilities/enterprise", isActive = true }
                    }
                }),
                HtmlTemplate = @"
<section class=""oz-breadcrumb-hero py-5 text-center position-relative overflow-hidden"" style=""background-image: url('{{ BackgroundImageUrl }}');"">
  <div class=""oz-breadcrumb-overlay position-absolute top-0 start-0 w-100 h-100""></div>
  <div class=""container position-relative py-lg-4"" style=""z-index: 2;"">
    <nav aria-label=""breadcrumb"" class=""d-flex justify-content-center mb-2"">
      {{ BreadcrumbTrail }}
    </nav>
    <h1 class=""display-5 fw-bold text-white mb-2"">{{ Title }}</h1>
    <p class=""text-white text-opacity-75 lead fs-6 mx-auto mb-0"" style=""max-width: 650px;"">{{ Description }}</p>
  </div>
</section>",
                CssStyles = @"
.oz-breadcrumb-hero {
  background-position: center center;
  background-size: cover;
  background-repeat: no-repeat;
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
                DefaultContentJson = @"{""title"":""Clean Light Corporate Footer"",""description"":""Empowering enterprises and modern organizations with strategic advisory, integrated solutions, and high-performance operations."",""email"":""contact@organization.com"",""phone"":""+1 (555) 019-2834"",""categories"":[{""name"":""Services"",""displayTitle"":""Solutions"",""pages"":[{""title"":""Strategic Consulting"",""url"":""/strategic-advisory""},{""title"":""Systems Modernization"",""url"":""/systems-modernization""},{""title"":""Performance & Scale"",""url"":""/performance-scale""},{""title"":""Enterprise Advisory"",""url"":""/enterprise-governance""}]},{""name"":""Company"",""displayTitle"":""Company"",""pages"":[{""title"":""About Us"",""url"":""/about""},{""title"":""Our History"",""url"":""/history""},{""title"":""Leadership Team"",""url"":""/team""}]}],""legalPages"":[{""title"":""Privacy Policy"",""url"":""/privacy-policy""},{""title"":""Terms & Conditions"",""url"":""/terms-and-conditions""},{""title"":""Cookie Policy"",""url"":""/cookie-policy""}]}"
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
    /// Seeds structured PageSection and PageSectionList entities across Home, Services, About Us, History, Team, Request Service, and Contact Us web pages.
    /// </summary>
    private static async Task SeedDefaultPageSectionsAsync(
        DashboardDbContext dbContext,
        TenantOnboardingRequest request,
        (string Slogan, string Description, string Service1Title, string Service1Desc, string Service2Title, string Service2Desc, string Service3Title, string Service3Desc) sectorDefaults,
        string abbreviation,
        WebPage homePage,
        WebPage aboutPage,
        WebPage historyPage,
        WebPage teamPage,
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
            Title = "Empowering Modern Organizations to Scale with Confidence.",
            MiniTitle = $"OFFICIAL PORTAL \u2022 {abbreviation}",
            Description = "Delivering innovative solutions, strategic consulting, and operational excellence to help your organization achieve sustainable, high-impact success.",
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
            Title = "Strategic Capabilities & High-Performance Solutions",
            MiniTitle = "WHAT WE DELIVER",
            Description = "Comprehensive, reliable frameworks engineered to streamline workflows, accelerate delivery, and unlock sustainable value.",
            ButtonText = "Explore Services",
            ButtonLink = "/services",
            DirectUrl = "home-features",
            ShowInHome = true,
            HomePageSortOrder = 2,
            PageSortOrder = 2,
            PageSectionLists = new List<PageSectionList>
            {
                new() { Id = Guid.NewGuid(), Title = "Strategic Consulting & Advisory", Description = "Objective diagnosis, governance structuring, and actionable roadmaps aligned with long-term strategic targets.", IconText = "fa-solid fa-chart-pie", SortOrder = 1 },
                new() { Id = Guid.NewGuid(), Title = "Systems Modernization & Integration", Description = "Transforming legacy processes into resilient, interoperable digital architectures built for agility and scale.", IconText = "fa-solid fa-network-wired", SortOrder = 2 },
                new() { Id = Guid.NewGuid(), Title = "Operations & Performance Scaling", Description = "Disciplined execution frameworks, quality assurance benchmarks, and continuous operational optimization.", IconText = "fa-solid fa-sliders", SortOrder = 3 }
            }
        };
        sections.Add(homeFeatures);

        var homeStats = new PageSection
        {
            Id = Guid.NewGuid(),
            WebPageId = homePage.Id,
            TemplateKey = "Body_StatsCounters",
            Title = "Institutional Standards & Measurable Impact",
            MiniTitle = "PROVEN RELIABILITY",
            Description = "Empowering organizations with verifiable uptime, rigorous compliance, and transparent operational oversight.",
            DirectUrl = "home-stats",
            ShowInHome = true,
            HomePageSortOrder = 3,
            PageSortOrder = 3,
            PageSectionLists = new List<PageSectionList>
            {
                new() { Id = Guid.NewGuid(), Title = "99.9%", MiniTitle = "Service Availability", Description = "Continuous uptime and resilient high-availability infrastructure", IconText = "fa-solid fa-gauge-high", SortOrder = 1 },
                new() { Id = Guid.NewGuid(), Title = "24/7", MiniTitle = "Dedicated Support", Description = "Expert response team standing by around the clock", IconText = "fa-solid fa-headset", SortOrder = 2 },
                new() { Id = Guid.NewGuid(), Title = "100%", MiniTitle = "Data Privacy", Description = "Enterprise-grade encryption and end-to-end audit compliance", IconText = "fa-solid fa-lock", SortOrder = 3 },
                new() { Id = Guid.NewGuid(), Title = "Multi-Region", MiniTitle = "Global Sync", Description = "Real-time synchronization across operations and departments", IconText = "fa-solid fa-arrows-rotate", SortOrder = 4 }
            }
        };
        sections.Add(homeStats);

        var homeProcess = new PageSection
        {
            Id = Guid.NewGuid(),
            WebPageId = homePage.Id,
            TemplateKey = "Body_ProcessSteps",
            Title = "Our Four-Stage Delivery Methodology",
            MiniTitle = "HOW WE ENGAGE",
            Description = "From exploratory consultation to continuous support, our standardized methodology guarantees predictability and measurable outcomes.",
            DirectUrl = "home-process",
            ShowInHome = true,
            HomePageSortOrder = 4,
            PageSortOrder = 4,
            PageSectionLists = new List<PageSectionList>
            {
                new() { Id = Guid.NewGuid(), Title = "1. Discovery & Diagnosis", MiniTitle = "Stage 01", Description = "In-depth analysis of operational parameters, requirements, and organizational objectives.", IconText = "fa-solid fa-magnifying-glass", SortOrder = 1 },
                new() { Id = Guid.NewGuid(), Title = "2. Solution Architecture", MiniTitle = "Stage 02", Description = "Formulating customized blueprints, milestone roadmaps, and stakeholder alignment.", IconText = "fa-solid fa-compass-drafting", SortOrder = 2 },
                new() { Id = Guid.NewGuid(), Title = "3. Disciplined Deployment", MiniTitle = "Stage 03", Description = "Precision execution with rigorous quality assurance, milestone gating, and verification.", IconText = "fa-solid fa-rocket", SortOrder = 3 },
                new() { Id = Guid.NewGuid(), Title = "4. Continuous Support", MiniTitle = "Stage 04", Description = "Proactive monitoring, maintenance governance, and ongoing optimization support.", IconText = "fa-solid fa-arrows-spin", SortOrder = 4 }
            }
        };
        sections.Add(homeProcess);

        var homeCta = new PageSection
        {
            Id = Guid.NewGuid(),
            WebPageId = homePage.Id,
            TemplateKey = "Body_CtaSplit",
            Title = $"Partner with {request.OrganizationName} Today",
            MiniTitle = "READY TO COLLABORATE?",
            Description = "Connect with our experienced specialists to explore tailored solutions engineered for your goals and timeline.",
            ButtonText = "Request a Service",
            ButtonLink = "/request-service",
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
            Description = "Delivering strategic clarity, technical excellence, and sustainable results across complex enterprise domains.",
            ButtonText = "Request a Consultation",
            ButtonLink = "/request-service",
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
                new() { Id = Guid.NewGuid(), Title = "Strategic Consulting & Advisory", Description = "Comprehensive organizational diagnosis, policy formulation, and growth governance.", IconText = "fa-solid fa-chart-pie", SortOrder = 1 },
                new() { Id = Guid.NewGuid(), Title = "Systems Modernization & Integration", Description = "High-availability cloud migrations, microservice restructuring, and workflow automation.", IconText = "fa-solid fa-network-wired", SortOrder = 2 },
                new() { Id = Guid.NewGuid(), Title = "Performance & Scale Engineering", Description = "Targeted throughput optimization, SLA safeguarding, and operational resilience.", IconText = "fa-solid fa-sliders", SortOrder = 3 },
                new() { Id = Guid.NewGuid(), Title = "Enterprise Advisory & Governance", Description = "Statutory compliance frameworks, risk management, and administrative transparency.", IconText = "fa-solid fa-shield-halved", SortOrder = 4 }
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
                new() { Id = Guid.NewGuid(), Title = "Phase 1: Needs Assessment", MiniTitle = "Step 01", Description = "In-depth review of specific goals, resource requirements, and deliverables.", IconText = "fa-solid fa-magnifying-glass", SortOrder = 1 },
                new() { Id = Guid.NewGuid(), Title = "Phase 2: Solution Design", MiniTitle = "Step 02", Description = "Detailed scoping, milestone scheduling, and architecture blueprints.", IconText = "fa-solid fa-compass-drafting", SortOrder = 2 },
                new() { Id = Guid.NewGuid(), Title = "Phase 3: Agile Execution", MiniTitle = "Step 03", Description = "Iterative delivery with clear stakeholder check-ins and quality tests.", IconText = "fa-solid fa-rocket", SortOrder = 3 },
                new() { Id = Guid.NewGuid(), Title = "Phase 4: Ongoing Review", MiniTitle = "Step 04", Description = "Continuous performance monitoring and proactive client advisory.", IconText = "fa-solid fa-arrows-spin", SortOrder = 4 }
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
            Title = "Committed to Integrity, Excellence, and Lasting Value",
            MiniTitle = $"ABOUT {abbreviation}",
            Description = $"{request.OrganizationName} was established to deliver outstanding standards of service, innovative solutions, and reliable operational value to forward-thinking organizations.",
            ButtonText = "View Our Capabilities",
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
            Title = "Our Core Principles & Standards",
            MiniTitle = "GUIDING ETHICS",
            Description = "The bedrock principles that inform our decisions, guide our teamwork, and cultivate lasting trust.",
            DirectUrl = "about-values",
            ShowInHome = false,
            PageSortOrder = 2,
            PageSectionLists = new List<PageSectionList>
            {
                new() { Id = Guid.NewGuid(), Title = "Integrity & Transparency", Description = "Upholding uncompromising ethical standards, honest communication, and accountability in all relationships.", IconText = "fa-solid fa-scale-balanced", SortOrder = 1 },
                new() { Id = Guid.NewGuid(), Title = "Operational Excellence", Description = "Constantly refining methodologies, embracing best practices, and delivering dependable, benchmark quality.", IconText = "fa-solid fa-award", SortOrder = 2 },
                new() { Id = Guid.NewGuid(), Title = "Collaborative Partnership", Description = "Prioritizing partner priorities, anticipating challenges, and building durable long-term trust.", IconText = "fa-solid fa-handshake", SortOrder = 3 }
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
                new() { Id = Guid.NewGuid(), Title = "100%", MiniTitle = "Partner Commitment", Description = "Dedicated to partner objectives", IconText = "fa-solid fa-circle-check", SortOrder = 1 },
                new() { Id = Guid.NewGuid(), Title = "Zero", MiniTitle = "Compromise", Description = "Strict quality and safety standards", IconText = "fa-solid fa-shield-halved", SortOrder = 2 },
                new() { Id = Guid.NewGuid(), Title = "Multi-Year", MiniTitle = "Proven Record", Description = "Trusted track record of delivery", IconText = "fa-solid fa-calendar-check", SortOrder = 3 },
                new() { Id = Guid.NewGuid(), Title = "Continuous", MiniTitle = "Innovation", Description = "Evolving with modern standards", IconText = "fa-solid fa-lightbulb", SortOrder = 4 }
            }
        };
        sections.Add(aboutStats);

        var aboutCta = new PageSection
        {
            Id = Guid.NewGuid(),
            WebPageId = aboutPage.Id,
            TemplateKey = "Body_CtaSplit",
            Title = $"Connect with the {request.OrganizationName} Leadership Team",
            MiniTitle = "BUILDING MEANINGFUL PARTNERSHIPS",
            Description = "We welcome the opportunity to discuss your goals and demonstrate how our expertise can assist.",
            ButtonText = "Reach Out Today",
            ButtonLink = "/contact",
            DirectUrl = "about-cta",
            ShowInHome = false,
            PageSortOrder = 4
        };
        sections.Add(aboutCta);

        // 4. OUR HISTORY PAGE SECTIONS
        var historyHero = new PageSection
        {
            Id = Guid.NewGuid(),
            WebPageId = historyPage.Id,
            TemplateKey = "Hero_CorporateSplit",
            Title = "A Legacy of Discipline, Growth, and Innovation",
            MiniTitle = "OUR HERITAGE",
            Description = "From humble beginnings to a multi-disciplinary organization, explore the milestones that defined our trajectory.",
            ButtonText = "Explore Milestones",
            ButtonLink = "#history-milestones",
            DirectUrl = "history-hero",
            ShowInHome = false,
            PageSortOrder = 1
        };
        sections.Add(historyHero);

        var historyMilestones = new PageSection
        {
            Id = Guid.NewGuid(),
            WebPageId = historyPage.Id,
            TemplateKey = "Body_ProcessSteps",
            Title = "Key Milestones in Our Institutional Journey",
            MiniTitle = "THE JOURNEY",
            Description = "A timeline of strategic evolution, capability expansion, and lasting partnerships.",
            DirectUrl = "history-milestones",
            ShowInHome = false,
            PageSortOrder = 2,
            PageSectionLists = new List<PageSectionList>
            {
                new() { Id = Guid.NewGuid(), Title = "1. Foundation & Core Vision", MiniTitle = "Milestone 01", Description = "Established with a commitment to bring rigorous standards and integrity to enterprise services.", IconText = "fa-solid fa-flag", SortOrder = 1 },
                new() { Id = Guid.NewGuid(), Title = "2. Expanding Capabilities", MiniTitle = "Milestone 02", Description = "Broadened our service spectrum to include systems modernization and governance advisory.", IconText = "fa-solid fa-layer-group", SortOrder = 2 },
                new() { Id = Guid.NewGuid(), Title = "3. Regional Scale & Recognition", MiniTitle = "Milestone 03", Description = "Surpassed key organizational benchmarks, serving clients across diverse sectors.", IconText = "fa-solid fa-trophy", SortOrder = 3 },
                new() { Id = Guid.NewGuid(), Title = "4. Next-Gen Digital Platform", MiniTitle = "Milestone 04", Description = "Pioneered sovereign digital infrastructure, powering real-time client collaboration.", IconText = "fa-solid fa-microchip", SortOrder = 4 }
            }
        };
        sections.Add(historyMilestones);

        var historyCta = new PageSection
        {
            Id = Guid.NewGuid(),
            WebPageId = historyPage.Id,
            TemplateKey = "Body_CtaSplit",
            Title = "Be Part of Our Next Chapter",
            MiniTitle = "LOOKING FORWARD",
            Description = "Discover how our historical discipline and future-facing capabilities can support your enterprise.",
            ButtonText = "Request a Service",
            ButtonLink = "/request-service",
            DirectUrl = "history-cta",
            ShowInHome = false,
            PageSortOrder = 3
        };
        sections.Add(historyCta);

        // 5. LEADERSHIP TEAM PAGE SECTIONS
        var teamHero = new PageSection
        {
            Id = Guid.NewGuid(),
            WebPageId = teamPage.Id,
            TemplateKey = "Hero_CorporateSplit",
            Title = "Guided by Experienced Industry Stewards",
            MiniTitle = "GOVERNANCE & LEADERSHIP",
            Description = "Our leadership brings decades of collective domain expertise, operational discipline, and visionary direction.",
            ButtonText = "Connect with Our Team",
            ButtonLink = "/contact",
            DirectUrl = "team-hero",
            ShowInHome = false,
            PageSortOrder = 1
        };
        sections.Add(teamHero);

        var teamGrid = new PageSection
        {
            Id = Guid.NewGuid(),
            WebPageId = teamPage.Id,
            TemplateKey = "Body_FeatureGrid3",
            Title = "Executive Leadership & Advisory Leads",
            MiniTitle = "OUR STEWARDS",
            Description = "Cross-functional leaders committed to operational integrity, client satisfaction, and sustainable excellence.",
            DirectUrl = "team-grid",
            ShowInHome = false,
            PageSortOrder = 2,
            PageSectionLists = new List<PageSectionList>
            {
                new() { Id = Guid.NewGuid(), Title = "Executive Advisory & Strategy", Description = "Seasoned practitioners providing strategic oversight, corporate governance, and growth guidance.", IconText = "fa-solid fa-user-tie", SortOrder = 1 },
                new() { Id = Guid.NewGuid(), Title = "Operations & Solutions Delivery", Description = "Disciplined managers ensuring project precision, resource alignment, and timely milestones.", IconText = "fa-solid fa-user-gear", SortOrder = 2 },
                new() { Id = Guid.NewGuid(), Title = "Compliance & Quality Assurance", Description = "Dedicated specialists safeguarding institutional integrity, regulatory compliance, and security.", IconText = "fa-solid fa-user-shield", SortOrder = 3 }
            }
        };
        sections.Add(teamGrid);

        var teamCta = new PageSection
        {
            Id = Guid.NewGuid(),
            WebPageId = teamPage.Id,
            TemplateKey = "Body_CtaSplit",
            Title = "Inquire About Advisory Engagements",
            MiniTitle = "DIRECT ACCESS",
            Description = "Connect directly with our leadership team for executive consultation and strategic guidance.",
            ButtonText = "Schedule Consultation",
            ButtonLink = "/contact",
            DirectUrl = "team-cta",
            ShowInHome = false,
            PageSortOrder = 3
        };
        sections.Add(teamCta);

        // 6. CONTACT US PAGE SECTIONS
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
            PageSortOrder = 2,
            PageFormId = contactForm?.Id,
            FormKey = "contact-us",
            PageSectionLists = new List<PageSectionList>
            {
                new() { Id = Guid.NewGuid(), Title = "Corporate Headquarters", Description = "Administrative & Executive Offices", IconText = "fa-solid fa-location-dot", SortOrder = 1 },
                new() { Id = Guid.NewGuid(), Title = "Direct Correspondence", Description = $"Official communications desk: {request.AdminEmail}", IconText = "fa-solid fa-envelope", SortOrder = 2 },
                new() { Id = Guid.NewGuid(), Title = "Operating Hours", Description = "Monday through Friday: 8:30 AM to 5:30 PM (Local Standard Time)", IconText = "fa-solid fa-clock", SortOrder = 3 }
            }
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
            PageSortOrder = 3
        };
        sections.Add(contactCta);

        // 7. REQUEST A SERVICE PAGE SECTIONS
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

        // 8. PRE-FOOTER NEWSLETTER DISPATCH
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
