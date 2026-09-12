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

        // 1. Validate Uniqueness
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

            // 3. Seed ConfigSettings
            if (!await dbContext.ConfigSettings.AnyAsync(cancellationToken))
            {
                dbContext.ConfigSettings.Add(new ConfigSetting
                {
                    Id = Guid.NewGuid(),
                    CompanyName = request.OrganizationName,
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

            // 5. Seed Default Web Pages
            if (!await dbContext.WebPages.AnyAsync(cancellationToken))
            {
                dbContext.WebPages.AddRange(
                    new WebPage
                    {
                        Id = Guid.NewGuid(),
                        Title = "Home",
                        DirectUrl = "home",
                        ShowInMainMenu = true,
                        ShowInFooter = true,
                        EnableDirectUrl = true,
                        Publish = true,
                        SortOrder = 1
                    },
                    new WebPage
                    {
                        Id = Guid.NewGuid(),
                        Title = "About Us",
                        DirectUrl = "about",
                        ShowInMainMenu = true,
                        ShowInFooter = true,
                        EnableDirectUrl = true,
                        Publish = true,
                        SortOrder = 2
                    },
                    new WebPage
                    {
                        Id = Guid.NewGuid(),
                        Title = "Contact Us",
                        DirectUrl = "contact",
                        ShowInMainMenu = true,
                        ShowInFooter = true,
                        EnableDirectUrl = true,
                        Publish = true,
                        SortOrder = 3
                    }
                );
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

            await dbContext.SaveChangesAsync(cancellationToken);
        }
    }
}
