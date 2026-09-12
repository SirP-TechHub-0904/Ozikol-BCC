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

            // 7. Seed Default Global Code Injections (Bootstrap 5.3 CSS/JS & Font Awesome 6)
            await SeedDefaultCodeInjectionsAsync(dbContext, cancellationToken);

            // 8. Seed Complete Turnkey Theme Suite (All 9 Categories, 6 Body Sections, Font Awesome Icons, Bootstrap 5)
            await SeedDefaultInstalledTemplatesAsync(dbContext, request.OrganizationName, cancellationToken);

            await dbContext.SaveChangesAsync(cancellationToken);
        }
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
<header class=""oz-nav-header shadow-sm"">
  <nav class=""navbar navbar-expand-lg navbar-light bg-white border-bottom py-3"">
    <div class=""container"">
      <a class=""navbar-brand d-flex align-items-center gap-2"" href=""#"">
        <span class=""badge bg-primary rounded-3 p-2 text-white""><i class=""fa-solid fa-cube fs-5""></i></span>
        <span class=""fw-bold text-dark fs-5 tracking-tight"">{{ BrandName }}</span>
      </a>
      <button class=""navbar-toggler border-0 shadow-none"" type=""button"" onclick=""this.closest('nav').querySelector('.collapse').classList.toggle('show')"">
        <span class=""navbar-toggler-icon""></span>
      </button>
      <div class=""collapse navbar-collapse"" id=""ozNavMain"">
        <ul class=""navbar-nav mx-auto mb-2 mb-lg-0 gap-lg-3"">
          <li class=""nav-item""><a class=""nav-link fw-semibold text-secondary active"" href=""#home""><i class=""fa-solid fa-house me-1 text-primary""></i> Home</a></li>
          <li class=""nav-item""><a class=""nav-link fw-semibold text-secondary"" href=""#shop""><i class=""fa-solid fa-bag-shopping me-1 text-primary""></i> Shop</a></li>
          <li class=""nav-item""><a class=""nav-link fw-semibold text-secondary"" href=""#about""><i class=""fa-solid fa-circle-info me-1 text-primary""></i> About</a></li>
          <li class=""nav-item""><a class=""nav-link fw-semibold text-secondary"" href=""#blog""><i class=""fa-solid fa-newspaper me-1 text-primary""></i> Blog</a></li>
          <li class=""nav-item""><a class=""nav-link fw-semibold text-secondary"" href=""#contact""><i class=""fa-solid fa-envelope me-1 text-primary""></i> Contact</a></li>
        </ul>
        <div class=""d-flex align-items-center gap-3"">
          <a href=""#shop"" class=""btn btn-light position-relative border rounded-pill px-3 py-2 text-secondary"">
            <i class=""fa-solid fa-cart-shopping""></i>
            <span class=""position-absolute top-0 start-100 translate-middle badge rounded-pill bg-primary"">0</span>
          </a>
          <a href=""/auth/login"" class=""btn btn-primary rounded-pill px-4 py-2 fw-bold shadow-sm"">
            <i class=""fa-solid fa-arrow-right-to-bracket me-1""></i> Get Started
          </a>
        </div>
      </div>
    </div>
  </nav>
</header>",
                CssStyles = @".oz-nav-header .nav-link:hover { color: #2563eb !important; }"
            },

            // 2. Hero Unit
            new()
            {
                Id = Guid.NewGuid(),
                TemplateKey = "Hero_SplitProduct",
                CategoryKey = "hero",
                Name = "Modern Light Split Hero",
                VariantCode = "Hero_SplitProduct",
                InstalledVersion = "1.0.0",
                IsActive = true,
                InstalledUtc = DateTime.UtcNow,
                HtmlTemplate = @"
<section class=""py-5 bg-light border-bottom"">
  <div class=""container py-lg-4"">
    <div class=""row align-items-center g-5"">
      <div class=""col-lg-6"">
        <div class=""d-inline-flex align-items-center gap-2 px-3 py-1 rounded-pill bg-primary-subtle text-primary border border-primary-subtle mb-3"">
          <i class=""fa-solid fa-bolt""></i>
          <span class=""small fw-bold text-uppercase"">Enterprise Suite v2.5</span>
        </div>
        <h1 class=""display-5 fw-bolder text-dark mb-3 lh-sm"">Streamline your entire organizational workflow.</h1>
        <p class=""lead text-muted mb-4 fs-6"">Manage members, execute secure e-voting, track real-time analytics, and automate transactions in one sovereign platform.</p>
        <div class=""d-flex flex-wrap gap-3"">
          <a href=""#shop"" class=""btn btn-primary btn-lg rounded-pill px-4 py-2 fw-bold shadow-sm"">
            <i class=""fa-solid fa-rocket me-2""></i> Explore Storefront
          </a>
          <a href=""#about"" class=""btn btn-outline-secondary btn-lg rounded-pill px-4 py-2 fw-semibold bg-white"">
            <i class=""fa-solid fa-play me-2 text-primary""></i> Watch Demo
          </a>
        </div>
      </div>
      <div class=""col-lg-6"">
        <div class=""card border border-light-subtle shadow rounded-4 overflow-hidden p-3 bg-white"">
          <div class=""d-flex align-items-center justify-content-between pb-3 border-bottom mb-3"">
            <div class=""d-flex gap-2"">
              <span class=""badge bg-danger rounded-circle p-1""></span>
              <span class=""badge bg-warning rounded-circle p-1""></span>
              <span class=""badge bg-success rounded-circle p-1""></span>
            </div>
            <span class=""small text-muted fw-bold""><i class=""fa-solid fa-chart-pie me-1 text-primary""></i> Live Telemetry</span>
          </div>
          <div class=""row g-2 text-center"">
            <div class=""col-6""><div class=""p-3 rounded-3 bg-light border""><div class=""h4 fw-bold text-dark mb-0"">24.5k</div><small class=""text-muted"">Active Members</small></div></div>
            <div class=""col-6""><div class=""p-3 rounded-3 bg-light border""><div class=""h4 fw-bold text-success mb-0"">99.9%</div><small class=""text-muted"">Uptime SLA</small></div></div>
          </div>
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
          <h5 class=""fw-bold text-dark"">Identity & Access</h5>
          <p class=""text-muted small mb-0"">Granular role-based security matrix, session controls, and multi-factor authorization safeguards.</p>
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
            <i class=""fa-solid fa-check-to-slot fs-4""></i>
          </div>
          <h5 class=""fw-bold text-dark"">E-Voting & Polls</h5>
          <p class=""text-muted small mb-0"">Tamper-proof real-time electoral polling with instant ballot auditing and verified participation.</p>
        </div>
      </div>
    </div>
  </div>
</section>",
                CssStyles = @""
            },

            // 4. Body Section 2 - Featured Product / Deal Spotlight
            new()
            {
                Id = Guid.NewGuid(),
                TemplateKey = "Body_ProductShowcase",
                CategoryKey = "body",
                Name = "Product Spotlight & Deal Banner",
                VariantCode = "Body_ProductShowcase",
                InstalledVersion = "1.0.0",
                IsActive = true,
                InstalledUtc = DateTime.UtcNow,
                HtmlTemplate = @"
<section class=""py-5 bg-light border-bottom"">
  <div class=""container py-4"">
    <div class=""card border border-light-subtle shadow-sm rounded-4 overflow-hidden p-4 p-lg-5 bg-white"">
      <div class=""row align-items-center g-4"">
        <div class=""col-lg-6"">
          <span class=""badge bg-danger rounded-pill px-3 py-1 mb-3""><i class=""fa-solid fa-fire me-1""></i> Featured Spotlight</span>
          <h3 class=""fw-bolder text-dark mb-2"">Executive Signature Folio & Smart Badge</h3>
          <p class=""text-muted mb-4"">Handcrafted vegan leather document suite paired with contactless NFC credentials for seamless campus admission.</p>
          <div class=""d-flex align-items-baseline gap-3 mb-4"">
            <span class=""h3 fw-bold text-primary mb-0"">$89.00</span>
            <span class=""text-muted text-decoration-line-through"">$120.00</span>
            <span class=""badge bg-success-subtle text-success border border-success-subtle rounded-pill"">Save 25%</span>
          </div>
          <div class=""d-flex gap-3"">
            <a href=""#shop"" class=""btn btn-primary rounded-pill px-4 py-2 fw-bold""><i class=""fa-solid fa-cart-plus me-1""></i> Order Now</a>
            <a href=""#shop"" class=""btn btn-outline-secondary rounded-pill px-4 py-2""><i class=""fa-solid fa-eye me-1""></i> Details</a>
          </div>
        </div>
        <div class=""col-lg-6 text-center"">
          <div class=""p-4 rounded-4 bg-light d-inline-flex flex-column align-items-center justify-content-center w-100"" style=""min-height: 240px;"">
            <i class=""fa-solid fa-box-open text-primary display-2 mb-3 opacity-75""></i>
            <span class=""fw-semibold text-dark"">Official Merchandise Collection</span>
          </div>
        </div>
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
      <span class=""badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-1 rounded-pill text-uppercase fw-bold"">Member Testimonials</span>
      <h2 class=""fw-bold text-dark mt-2 mb-3"">Trusted by Organizations Worldwide</h2>
      <p class=""text-muted"">Hear directly from leaders who rely on our portal for everyday operational governance.</p>
    </div>
    <div class=""row g-4"">
      <div class=""col-md-4"">
        <div class=""card h-100 p-4 border border-light-subtle rounded-4 shadow-sm bg-white"">
          <div class=""text-warning mb-3"">
            <i class=""fa-solid fa-star""></i><i class=""fa-solid fa-star""></i><i class=""fa-solid fa-star""></i><i class=""fa-solid fa-star""></i><i class=""fa-solid fa-star""></i>
          </div>
          <p class=""text-secondary mb-4 fst-italic"">""The e-voting and committee management modules saved our annual general meeting over 40 hours of manual reconciliation.""</p>
          <div class=""d-flex align-items-center gap-3 mt-auto"">
            <div class=""rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center fw-bold"" style=""width:42px; height:42px;"">SA</div>
            <div>
              <div class=""fw-bold text-dark small"">Dr. Sarah Adams</div>
              <div class=""text-muted small"">Executive Secretary</div>
            </div>
          </div>
        </div>
      </div>
      <div class=""col-md-4"">
        <div class=""card h-100 p-4 border border-light-subtle rounded-4 shadow-sm bg-white"">
          <div class=""text-warning mb-3"">
            <i class=""fa-solid fa-star""></i><i class=""fa-solid fa-star""></i><i class=""fa-solid fa-star""></i><i class=""fa-solid fa-star""></i><i class=""fa-solid fa-star""></i>
          </div>
          <p class=""text-secondary mb-4 fst-italic"">""The sovereign multi-tenant architecture gives our compliance officers absolute peace of mind regarding member data sovereignty.""</p>
          <div class=""d-flex align-items-center gap-3 mt-auto"">
            <div class=""rounded-circle bg-success-subtle text-success d-flex align-items-center justify-content-center fw-bold"" style=""width:42px; height:42px;"">MK</div>
            <div>
              <div class=""fw-bold text-dark small"">Marcus Kim</div>
              <div class=""text-muted small"">Director of Governance</div>
            </div>
          </div>
        </div>
      </div>
      <div class=""col-md-4"">
        <div class=""card h-100 p-4 border border-light-subtle rounded-4 shadow-sm bg-white"">
          <div class=""text-warning mb-3"">
            <i class=""fa-solid fa-star""></i><i class=""fa-solid fa-star""></i><i class=""fa-solid fa-star""></i><i class=""fa-solid fa-star""></i><i class=""fa-solid fa-star""></i>
          </div>
          <p class=""text-secondary mb-4 fst-italic"">""Our integrated merchandise storefront paid for our entire portal subscription within the first 60 days of launch.""</p>
          <div class=""d-flex align-items-center gap-3 mt-auto"">
            <div class=""rounded-circle bg-info-subtle text-info d-flex align-items-center justify-content-center fw-bold"" style=""width:42px; height:42px;"">EL</div>
            <div>
              <div class=""fw-bold text-dark small"">Elena Rostova</div>
              <div class=""text-muted small"">Treasurer & Finance Chair</div>
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
      <p class=""text-muted"">Common answers regarding tenant membership, data security, and portal operations.</p>
    </div>
    <div class=""max-w-800 mx-auto"">
      <div class=""accordion"" id=""ozFaqAccordion"">
        <div class=""accordion-item border rounded-3 mb-3 overflow-hidden shadow-sm"">
          <h2 class=""accordion-header"">
            <button class=""accordion-button fw-bold text-dark bg-light"" type=""button"" onclick=""this.closest('.accordion-item').querySelector('.accordion-collapse').classList.toggle('show')"">
              <i class=""fa-solid fa-circle-question text-primary me-2""></i> How is member voter privacy protected during e-voting?
            </button>
          </h2>
          <div class=""accordion-collapse collapse show"">
            <div class=""accordion-body text-secondary small"">
              All ballot votes are cryptographically blinded using modern cryptographic hashes, guaranteeing voter anonymity while ensuring mathematical proof of legitimate eligibility.
            </div>
          </div>
        </div>
        <div class=""accordion-item border rounded-3 mb-3 overflow-hidden shadow-sm"">
          <h2 class=""accordion-header"">
            <button class=""accordion-button collapsed fw-bold text-dark bg-light"" type=""button"" onclick=""this.closest('.accordion-item').querySelector('.accordion-collapse').classList.toggle('show')"">
              <i class=""fa-solid fa-circle-question text-primary me-2""></i> Can our organization add custom domain names?
            </button>
          </h2>
          <div class=""accordion-collapse collapse"">
            <div class=""accordion-body text-secondary small"">
              Yes, organizations can easily bind custom domains with automated SSL provisioning from the Administrative Settings console.
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
      <h2 class=""display-6 fw-bold mb-3"">Ready to Transform Your Organization?</h2>
      <p class=""lead opacity-90 max-w-600 mx-auto mb-4 fs-6"">Join thousands of members enjoying seamless digital governance, online storefronts, and automated records.</p>
      <div class=""d-flex justify-content-center gap-3 flex-wrap"">
        <a href=""/auth/login"" class=""btn btn-light btn-lg rounded-pill px-4 py-2 fw-bold text-primary shadow"">
          <i class=""fa-solid fa-user-plus me-1""></i> Join Workspace
        </a>
        <a href=""#contact"" class=""btn btn-outline-light btn-lg rounded-pill px-4 py-2 fw-semibold"">
          <i class=""fa-solid fa-headset me-1""></i> Talk to Support
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
                CategoryKey = "newsletter",
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
      <h3 class=""fw-bold text-dark mb-2"">Stay Informed with Weekly Dispatches</h3>
      <p class=""text-muted small mb-4 max-w-500 mx-auto"">Subscribe to receive vital organizational announcements, governance updates, and community highlights directly in your inbox.</p>
      <form class=""d-flex flex-column flex-sm-row gap-2 max-w-500 mx-auto w-100"">
        <input type=""email"" class=""form-control rounded-pill px-3 py-2 border-secondary-subtle"" placeholder=""Enter your email address..."" required />
        <button type=""button"" class=""btn btn-primary rounded-pill px-4 py-2 fw-bold text-nowrap"">
          <i class=""fa-solid fa-paper-plane me-1""></i> Subscribe
        </button>
      </form>
      <small class=""text-muted mt-3 d-block""><i class=""fa-solid fa-lock me-1""></i> Zero spam. Unsubscribe at any time.</small>
    </div>
  </div>
</section>",
                CssStyles = @""
            },

            // 11. Contact Section
            new()
            {
                Id = Guid.NewGuid(),
                TemplateKey = "Contact_SplitDetails",
                CategoryKey = "contact",
                Name = "Split Contact Inquiries & Form",
                VariantCode = "Contact_SplitDetails",
                InstalledVersion = "1.0.0",
                IsActive = true,
                InstalledUtc = DateTime.UtcNow,
                HtmlTemplate = @"
<section class=""py-5 bg-white border-bottom"" id=""contact"">
  <div class=""container py-4"">
    <div class=""row g-5 align-items-center"">
      <div class=""col-lg-5"">
        <span class=""badge bg-primary-subtle text-primary border border-primary-subtle px-3 py-1 rounded-pill text-uppercase fw-bold"">Contact Us</span>
        <h2 class=""fw-bold text-dark mt-2 mb-3"">We are here to assist you.</h2>
        <p class=""text-muted mb-4"">Have questions regarding your membership, billing, or platform integration? Reach out to our operational team.</p>
        <div class=""d-flex flex-column gap-3"">
          <div class=""d-flex align-items-center gap-3"">
            <div class=""rounded-3 bg-primary-subtle text-primary d-flex align-items-center justify-content-center"" style=""width:44px; height:44px;""><i class=""fa-solid fa-location-dot""></i></div>
            <div><div class=""fw-bold text-dark small"">Headquarters</div><div class=""text-muted small"">100 Enterprise Way, Global Suite 400</div></div>
          </div>
          <div class=""d-flex align-items-center gap-3"">
            <div class=""rounded-3 bg-success-subtle text-success d-flex align-items-center justify-content-center"" style=""width:44px; height:44px;""><i class=""fa-solid fa-phone""></i></div>
            <div><div class=""fw-bold text-dark small"">Telephone</div><div class=""text-muted small"">+1 (800) 555-0199</div></div>
          </div>
          <div class=""d-flex align-items-center gap-3"">
            <div class=""rounded-3 bg-info-subtle text-info d-flex align-items-center justify-content-center"" style=""width:44px; height:44px;""><i class=""fa-solid fa-envelope""></i></div>
            <div><div class=""fw-bold text-dark small"">Support Desk</div><div class=""text-muted small"">support@ozikol.com</div></div>
          </div>
        </div>
      </div>
      <div class=""col-lg-7"">
        <div class=""card border border-light-subtle rounded-4 p-4 p-lg-5 shadow-sm bg-light"">
          <h5 class=""fw-bold text-dark mb-3"">Send Us a Direct Message</h5>
          <form class=""row g-3"">
            <div class=""col-md-6""><input type=""text"" class=""form-control bg-white rounded-3"" placeholder=""Your Name"" /></div>
            <div class=""col-md-6""><input type=""email"" class=""form-control bg-white rounded-3"" placeholder=""Your Email"" /></div>
            <div class=""col-12""><input type=""text"" class=""form-control bg-white rounded-3"" placeholder=""Subject"" /></div>
            <div class=""col-12""><textarea class=""form-control bg-white rounded-3"" rows=""4"" placeholder=""How can we assist your organization?""></textarea></div>
            <div class=""col-12""><button type=""button"" class=""btn btn-primary rounded-pill px-4 py-2 fw-bold""><i class=""fa-solid fa-paper-plane me-1""></i> Submit Message</button></div>
          </form>
        </div>
      </div>
    </div>
  </div>
</section>",
                CssStyles = @""
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
      <a href=""#blog"" class=""btn btn-outline-primary rounded-pill px-4 py-2 fw-semibold""><i class=""fa-solid fa-arrow-right me-1""></i> View All Articles</a>
    </div>
    <div class=""row g-4"">
      <div class=""col-md-4"">
        <div class=""card h-100 border border-light-subtle rounded-4 overflow-hidden shadow-sm bg-white"">
          <div class=""p-4 bg-primary-subtle text-center text-primary""><i class=""fa-solid fa-landmark display-4""></i></div>
          <div class=""card-body"">
            <span class=""badge bg-light text-secondary border mb-2"">Governance</span>
            <h5 class=""fw-bold text-dark"">Modernizing Annual General Meetings with E-Voting</h5>
            <p class=""text-muted small"">How sovereign distributed voting algorithms safeguard quorums and record keeping.</p>
            <div class=""small text-muted""><i class=""fa-solid fa-calendar me-1""></i> Sep 10, 2026 • 4 min read</div>
          </div>
        </div>
      </div>
      <div class=""col-md-4"">
        <div class=""card h-100 border border-light-subtle rounded-4 overflow-hidden shadow-sm bg-white"">
          <div class=""p-4 bg-success-subtle text-center text-success""><i class=""fa-solid fa-shield-halved display-4""></i></div>
          <div class=""card-body"">
            <span class=""badge bg-light text-secondary border mb-2"">Security</span>
            <h5 class=""fw-bold text-dark"">Sovereign Data Retention and Multi-Tenancy</h5>
            <p class=""text-muted small"">Why dedicated database isolation provides superior regulatory compliance.</p>
            <div class=""small text-muted""><i class=""fa-solid fa-calendar me-1""></i> Sep 04, 2026 • 5 min read</div>
          </div>
        </div>
      </div>
      <div class=""col-md-4"">
        <div class=""card h-100 border border-light-subtle rounded-4 overflow-hidden shadow-sm bg-white"">
          <div class=""p-4 bg-info-subtle text-center text-info""><i class=""fa-solid fa-store display-4""></i></div>
          <div class=""card-body"">
            <span class=""badge bg-light text-secondary border mb-2"">Storefront</span>
            <h5 class=""fw-bold text-dark"">Generating Sustainable Non-Dues Revenue</h5>
            <p class=""text-muted small"">Leveraging embedded member storefronts for official merchandise and training courses.</p>
            <div class=""small text-muted""><i class=""fa-solid fa-calendar me-1""></i> Aug 28, 2026 • 3 min read</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>",
                CssStyles = @""
            },

            // 13. Breadcrumbs & Page Headers
            new()
            {
                Id = Guid.NewGuid(),
                TemplateKey = "Breadcrumb_PageHeader",
                CategoryKey = "breadcrumb",
                Name = "Clean Light Breadcrumb Header Banner",
                VariantCode = "Breadcrumb_PageHeader",
                InstalledVersion = "1.0.0",
                IsActive = true,
                InstalledUtc = DateTime.UtcNow,
                HtmlTemplate = @"
<section class=""py-4 bg-light border-bottom"">
  <div class=""container"">
    <nav aria-label=""breadcrumb"">
      <ol class=""breadcrumb mb-2 small"">
        <li class=""breadcrumb-item""><a href=""#home"" class=""text-decoration-none text-muted""><i class=""fa-solid fa-house me-1""></i> Home</a></li>
        <li class=""breadcrumb-item active text-primary fw-semibold"" aria-current=""page"">{{ Title }}</li>
      </ol>
    </nav>
    <div class=""d-flex justify-content-between align-items-center flex-wrap gap-2"">
      <div>
        <h1 class=""h3 fw-bold text-dark mb-1"">{{ Title }}</h1>
        <p class=""text-muted small mb-0"">{{ Description }}</p>
      </div>
      <span class=""badge bg-white text-secondary border px-3 py-2 rounded-pill small shadow-sm"">
        <i class=""fa-solid fa-circle-check text-success me-1""></i> Verified Page
      </span>
    </div>
  </div>
</section>",
                CssStyles = @""
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
          <span class=""badge bg-primary rounded-3 p-2 text-white""><i class=""fa-solid fa-cube""></i></span>
          <span class=""fw-bold text-dark fs-5"">{{ BrandName }}</span>
        </div>
        <p class=""small text-muted max-w-300"">The sovereign digital platform engineered for organizational governance, member collaboration, and integrated commerce.</p>
        <div class=""d-flex gap-2 text-secondary"">
          <a href=""#"" class=""btn btn-sm btn-white border rounded-circle text-secondary""><i class=""fa-brands fa-linkedin-in""></i></a>
          <a href=""#"" class=""btn btn-sm btn-white border rounded-circle text-secondary""><i class=""fa-brands fa-x-twitter""></i></a>
          <a href=""#"" class=""btn btn-sm btn-white border rounded-circle text-secondary""><i class=""fa-brands fa-facebook-f""></i></a>
        </div>
      </div>
      <div class=""col-6 col-lg-2"">
        <h6 class=""fw-bold text-dark text-uppercase small mb-3"">Platform</h6>
        <ul class=""list-unstyled small d-flex flex-column gap-2"">
          <li><a href=""#shop"" class=""text-decoration-none text-muted"">Online Store</a></li>
          <li><a href=""#about"" class=""text-decoration-none text-muted"">Governance</a></li>
          <li><a href=""#about"" class=""text-decoration-none text-muted"">E-Voting</a></li>
          <li><a href=""#about"" class=""text-decoration-none text-muted"">Member IDs</a></li>
        </ul>
      </div>
      <div class=""col-6 col-lg-2"">
        <h6 class=""fw-bold text-dark text-uppercase small mb-3"">Organization</h6>
        <ul class=""list-unstyled small d-flex flex-column gap-2"">
          <li><a href=""#about"" class=""text-decoration-none text-muted"">About Us</a></li>
          <li><a href=""#blog"" class=""text-decoration-none text-muted"">Leadership</a></li>
          <li><a href=""#blog"" class=""text-decoration-none text-muted"">Security</a></li>
          <li><a href=""#contact"" class=""text-decoration-none text-muted"">Help Desk</a></li>
        </ul>
      </div>
      <div class=""col-lg-4"">
        <h6 class=""fw-bold text-dark text-uppercase small mb-3"">Stay Connected</h6>
        <p class=""small text-muted"">Subscribe to our weekly dispatch for community updates and announcements.</p>
        <div class=""input-group input-group-sm"">
          <input type=""email"" class=""form-control bg-white rounded-start-pill px-3"" placeholder=""Your email address..."" />
          <button class=""btn btn-primary rounded-end-pill px-3 fw-bold"" type=""button"">Join</button>
        </div>
      </div>
    </div>
    <div class=""border-top pt-4 d-flex justify-content-between align-items-center flex-wrap gap-2 small text-muted"">
      <div>&copy; {{ Year }} {{ BrandName }}. All rights reserved.</div>
      <div>Powered by <a href=""https://ozikol.com"" class=""text-primary fw-bold text-decoration-none"">Ozikol Sovereignty Suite</a></div>
    </div>
  </div>
</footer>",
                CssStyles = @""
            }
        };

        dbContext.TenantInstalledTemplates.AddRange(templates);
    }
}
