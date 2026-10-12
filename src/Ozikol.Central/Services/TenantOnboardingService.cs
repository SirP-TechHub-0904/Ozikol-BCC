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

    /// <summary>
    /// Selected optional add-on feature IDs chosen by the tenant during registration.
    /// </summary>
    public List<Guid> SelectedFeatureIds { get; set; } = new();

    /// <summary>
    /// Dictionary mapping selected feature IDs to chosen billing frequency ("Monthly" or "Yearly").
    /// </summary>
    public Dictionary<Guid, string> SelectedFeatureCadences { get; set; } = new();

    /// <summary>
    /// Configurable trial days granted upon onboarding (default is 14 days).
    /// </summary>
    public int TrialDays { get; set; } = 14;

    /// <summary>
    /// Optional promotional coupon or voucher code entered during registration (e.g. "LAUNCH100").
    /// </summary>
    public string? CouponCode { get; set; }
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
    /// Validates a promotional coupon code against active expiration dates, redemption quotas, and feature scope.
    /// </summary>
    /// <param name="couponCode">The promo voucher code string.</param>
    /// <param name="featureId">Optional specific feature catalog ID to check compatibility.</param>
    /// <param name="cancellationToken">Cancellation token for async operations.</param>
    /// <returns>Validation result tuple indicating validity, coupon entity, discount percentage, and descriptive message.</returns>
    Task<(bool IsValid, MasterCoupon? Coupon, decimal DiscountPercent, string Message)> ValidateCouponAsync(string couponCode, Guid? featureId = null, CancellationToken cancellationToken = default);

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

    /// <summary>
    /// Seeds the complete turnkey default website suite (forms, blogs, pages, sections, SEO tags) into the specified tenant's database.
    /// </summary>
    /// <param name="tenantKey">The tenant identifier or slug.</param>
    /// <param name="orgName">Optional organization name for brand personalization.</param>
    /// <param name="cancellationToken">Cancellation token for async operations.</param>
    /// <returns>True if seeded successfully; false otherwise.</returns>
    Task<bool> SeedTenantDefaultWebsiteAsync(string tenantKey, string? orgName = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Sets the tenant's workspace to blank canvas mode, skipping default content generation.
    /// </summary>
    /// <param name="tenantKey">The tenant identifier or slug.</param>
    /// <param name="cancellationToken">Cancellation token for async operations.</param>
    /// <returns>True if marked successfully; false otherwise.</returns>
    Task<bool> SkipTenantDefaultWebsiteAsync(string tenantKey, CancellationToken cancellationToken = default);
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
    /// Validates a promotional coupon code against active expiration dates, redemption quotas, and feature scope.
    /// </summary>
    /// <param name="couponCode">The promo voucher code string.</param>
    /// <param name="featureId">Optional specific feature catalog ID to check compatibility.</param>
    /// <param name="cancellationToken">Cancellation token for async operations.</param>
    /// <returns>Validation result tuple indicating validity, coupon entity, discount percentage, and descriptive message.</returns>
    public async Task<(bool IsValid, MasterCoupon? Coupon, decimal DiscountPercent, string Message)> ValidateCouponAsync(
        string couponCode,
        Guid? featureId = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(couponCode))
        {
            return (false, null, 0.00m, "Please enter a coupon code.");
        }

        var cleanCode = couponCode.Trim().ToUpperInvariant();

        var coupon = await _masterCatalogDbContext.MasterCoupons
            .Include(c => c.SpecificFeature)
            .FirstOrDefaultAsync(c => c.Code == cleanCode, cancellationToken);

        if (coupon == null)
        {
            return (false, null, 0.00m, $"Promo code '{cleanCode}' was not found.");
        }

        if (!coupon.IsActive)
        {
            return (false, coupon, 0.00m, $"Promo code '{cleanCode}' is currently inactive.");
        }

        var now = DateTime.UtcNow;
        if (coupon.StartsAtUtc > now)
        {
            return (false, coupon, 0.00m, $"Promo code '{cleanCode}' is not active yet.");
        }

        if (coupon.ExpiresAtUtc.HasValue && coupon.ExpiresAtUtc.Value < now)
        {
            return (false, coupon, 0.00m, $"Promo code '{cleanCode}' has expired on {coupon.ExpiresAtUtc.Value:MMM dd, yyyy}.");
        }

        if (coupon.MaxRedemptions > 0 && coupon.TimesRedeemed >= coupon.MaxRedemptions)
        {
            return (false, coupon, 0.00m, $"Promo code '{cleanCode}' has reached its maximum redemption quota.");
        }

        if (coupon.SpecificFeatureId.HasValue)
        {
            if (featureId.HasValue && coupon.SpecificFeatureId.Value != featureId.Value)
            {
                var featName = coupon.SpecificFeature?.Name ?? "a specific module";
                return (false, coupon, 0.00m, $"Promo code '{cleanCode}' can only be applied to '{featName}'.");
            }
        }

        decimal discountPct = coupon.IsPercentage ? coupon.DiscountPercentage : 100.00m;
        var durationInfo = coupon.DurationDays >= 365 ? "1 Year" : $"{coupon.DurationDays} Days";
        var scopeInfo = string.IsNullOrWhiteSpace(coupon.GrantedFeaturesSummary) ? "all platform features" : coupon.GrantedFeaturesSummary;

        string successMsg = coupon.DiscountPercentage >= 100.00m
            ? $"100% Free promotional voucher '{cleanCode}' applied ({durationInfo} free access to {scopeInfo})!"
            : $"{coupon.DiscountPercentage:G29}% OFF promotional voucher '{cleanCode}' applied ({durationInfo} access to {scopeInfo})!";

        return (true, coupon, discountPct, successMsg);
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

            var now = DateTime.UtcNow;
            var trialDays = request.TrialDays > 0 ? request.TrialDays : 14;
            var trialOffsetDate = now.AddDays(trialDays);

            // Pre-evaluate coupon if provided
            MasterCoupon? appliedCoupon = null;
            if (!string.IsNullOrWhiteSpace(request.CouponCode))
            {
                var validation = await ValidateCouponAsync(request.CouponCode, null, cancellationToken);
                if (validation.IsValid && validation.Coupon != null)
                {
                    appliedCoupon = await _masterCatalogDbContext.MasterCoupons
                        .FirstOrDefaultAsync(c => c.Id == validation.Coupon.Id, cancellationToken);
                }
            }

            // Step F: Automatically Provision Compulsory Core Feature Subscriptions ($0 / Annual Base Plan)
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
                    StartsAtUtc = now,
                    ExpiresAtUtc = trialOffsetDate.AddYears(1), // 1-Year maximum annual renewal
                    AutoRenew = true,
                    IsActive = true,
                    Status = "Active",
                    CreatedUtc = now
                });
            }

            // Step G: Provision Optional Add-on Features Selected by Tenant with Per-Feature Cadence & Single Line-Item Pricing
            var selectedFeatureGuids = (request.SelectedFeatureIds ?? new List<Guid>())
                .Distinct()
                .Where(id => compulsoryFeatures.All(c => c.Id != id))
                .ToList();

            if (selectedFeatureGuids.Count > 0)
            {
                var selectedFeatures = await _masterCatalogDbContext.MasterFeatureCatalogs
                    .Where(f => selectedFeatureGuids.Contains(f.Id) && f.IsActive)
                    .ToListAsync(cancellationToken);

                foreach (var addon in selectedFeatures)
                {
                    // Check user-selected billing cadence for this specific feature ("Monthly" vs "Yearly")
                    bool isYearly = false;
                    if (request.SelectedFeatureCadences != null &&
                        request.SelectedFeatureCadences.TryGetValue(addon.Id, out var cadenceStr))
                    {
                        isYearly = cadenceStr.Equals("Yearly", StringComparison.OrdinalIgnoreCase);
                    }

                    var durationType = isYearly ? SubscriptionBillingDuration.Yearly : SubscriptionBillingDuration.Monthly;
                    var basePrice = isYearly
                        ? (addon.YearlyPrice > 0 ? addon.YearlyPrice : addon.MonthlyPrice * 10)
                        : addon.MonthlyPrice;

                    decimal effectivePrice = basePrice;

                    // Evaluate single line-item coupon discount if applicable
                    if (appliedCoupon != null)
                    {
                        bool couponApplies = !appliedCoupon.SpecificFeatureId.HasValue || appliedCoupon.SpecificFeatureId.Value == addon.Id;
                        if (couponApplies)
                        {
                            if (appliedCoupon.IsPercentage)
                            {
                                effectivePrice = Math.Max(0.00m, basePrice * (1m - (appliedCoupon.DiscountPercentage / 100m)));
                            }
                            else
                            {
                                effectivePrice = Math.Max(0.00m, basePrice - appliedCoupon.DiscountAmount);
                            }
                        }
                    }

                    var expiryDate = isYearly ? trialOffsetDate.AddYears(1) : trialOffsetDate.AddMonths(1);

                    _masterCatalogDbContext.MasterTenantFeatureSubscriptions.Add(new MasterTenantFeatureSubscription
                    {
                        Id = Guid.NewGuid(),
                        MasterTenantCatalogId = catalogEntry.Id,
                        MasterFeatureCatalogId = addon.Id,
                        DurationType = durationType,
                        RecurringPrice = effectivePrice,
                        StartsAtUtc = now,
                        ExpiresAtUtc = expiryDate,
                        AutoRenew = true,
                        IsActive = true,
                        Status = "Active",
                        CreatedUtc = now
                    });
                }
            }

            // Step H: Redeem Promotional Coupon if provided
            if (appliedCoupon != null)
            {
                appliedCoupon.TimesRedeemed += 1;

                const decimal assumedBasePrice = 199.00m;
                decimal discountAmount = appliedCoupon.IsPercentage
                    ? (assumedBasePrice * (appliedCoupon.DiscountPercentage / 100m))
                    : Math.Min(appliedCoupon.DiscountAmount, assumedBasePrice);

                decimal finalPrice = Math.Max(0.00m, assumedBasePrice - discountAmount);

                _masterCatalogDbContext.MasterCouponRedemptions.Add(new MasterCouponRedemption
                {
                    Id = Guid.NewGuid(),
                    MasterCouponId = appliedCoupon.Id,
                    MasterTenantCatalogId = catalogEntry.Id,
                    MasterFeatureCatalogId = appliedCoupon.SpecificFeatureId,
                    OriginalPrice = assumedBasePrice,
                    DiscountApplied = discountAmount,
                    FinalPricePaid = finalPrice,
                    RedeemedAtUtc = now
                });
                _logger.LogInformation("🎟️ Coupon [{Code}] redeemed by Tenant [{TenantKey}]. Discount: ${Discount:F2}",
                    appliedCoupon.Code, cleanKey, discountAmount);
            }

            await _masterCatalogDbContext.SaveChangesAsync(cancellationToken);

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

            // Compute simple uppercase acronym for brand abbreviation
            var abbreviation = string.Concat(
                request.OrganizationName
                    .Split(' ', StringSplitOptions.RemoveEmptyEntries)
                    .Select(w => char.ToUpperInvariant(w[0]))
            );
            if (string.IsNullOrWhiteSpace(abbreviation)) abbreviation = "ORG";

            // 3. Seed MisWebsiteSettings with clean uninitialized state
            if (!await dbContext.MisWebsiteSettings.AnyAsync(cancellationToken))
            {
                dbContext.MisWebsiteSettings.Add(new MisWebsiteSetting
                {
                    Id = Guid.NewGuid(),
                    BrandName = request.OrganizationName,
                    CompanyName = request.OrganizationName,
                    CompanyNameAbbreviation = abbreviation,
                    CompanyDescription = $"{request.OrganizationName} digital workspace and operational portal.",
                    Tagline = $"{request.OrganizationName} digital workspace and operational portal.",
                    CompanyIconUrl = null,
                    WebsiteTitle = request.OrganizationName,
                    SiteTitle = request.OrganizationName,
                    DashboardTitle = $"{request.OrganizationName} Command Center",
                    TemplateLayoutKey = "standard",
                    ProductTitle = "Online Store",
                    ShowProductsInMenu = true,
                    ShowProductsInFooter = true,
                    ActivateProductsInHome = false,
                    IsLive = true,
                    IsWorkspaceInitialized = false,
                    WorkspaceInitializedUtc = null,
                    WorkspaceInitializationMode = null
                });
            }

            // 4. Seed MisConfigurationSettings
            if (!await dbContext.MisConfigurationSettings.AnyAsync(cancellationToken))
            {
                dbContext.MisConfigurationSettings.Add(new MisConfigurationSetting
                {
                    Id = Guid.NewGuid(),
                    CurrencyCode = "USD",
                    CurrencySymbol = "$"
                });
            }

            await dbContext.SaveChangesAsync(cancellationToken);
        }
    }

    /// <summary>
    /// Seeds the complete turnkey default website suite (forms, blogs, pages, sections, SEO tags) into the specified tenant's database.
    /// </summary>
    /// <param name="tenantKey">The tenant identifier or slug.</param>
    /// <param name="orgName">Optional organization name for brand personalization.</param>
    /// <param name="cancellationToken">Cancellation token for async operations.</param>
    /// <returns>True if seeded successfully; false otherwise.</returns>
    public async Task<bool> SeedTenantDefaultWebsiteAsync(string tenantKey, string? orgName = null, CancellationToken cancellationToken = default)
    {
        var catalog = await _masterCatalogDbContext.MasterTenantCatalogs
            .FirstOrDefaultAsync(t => t.TenantKey == tenantKey.ToLowerInvariant().Trim(), cancellationToken);
        if (catalog == null) return false;

        string tenantConnStr = catalog.ConnectionString;
        var optionsBuilder = new DbContextOptionsBuilder<DashboardDbContext>();
        optionsBuilder.UseSqlServer(tenantConnStr)
            .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning));

        using var scope = _serviceProvider.CreateScope();
        var tenantProvider = scope.ServiceProvider.GetRequiredService<ITenantProvider>();
        using (tenantProvider.BeginScope(tenantConnStr))
        {
            var dbContext = new DashboardDbContext(optionsBuilder.Options, tenantProvider, null);
            await Ozikol_BCC.Persistence.EF.SQL.Infrastructure.TenantDefaultWebsiteSeeder.SeedDefaultWebsiteSuiteAsync(
                dbContext,
                orgName ?? catalog.OrganizationName,
                cancellationToken);
        }
        return true;
    }

    /// <summary>
    /// Sets the tenant's workspace to blank canvas mode, skipping default content generation.
    /// </summary>
    /// <param name="tenantKey">The tenant identifier or slug.</param>
    /// <param name="cancellationToken">Cancellation token for async operations.</param>
    /// <returns>True if marked successfully; false otherwise.</returns>
    public async Task<bool> SkipTenantDefaultWebsiteAsync(string tenantKey, CancellationToken cancellationToken = default)
    {
        var catalog = await _masterCatalogDbContext.MasterTenantCatalogs
            .FirstOrDefaultAsync(t => t.TenantKey == tenantKey.ToLowerInvariant().Trim(), cancellationToken);
        if (catalog == null) return false;

        string tenantConnStr = catalog.ConnectionString;
        var optionsBuilder = new DbContextOptionsBuilder<DashboardDbContext>();
        optionsBuilder.UseSqlServer(tenantConnStr)
            .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning));

        using var scope = _serviceProvider.CreateScope();
        var tenantProvider = scope.ServiceProvider.GetRequiredService<ITenantProvider>();
        using (tenantProvider.BeginScope(tenantConnStr))
        {
            var dbContext = new DashboardDbContext(optionsBuilder.Options, tenantProvider, null);
            await Ozikol_BCC.Persistence.EF.SQL.Infrastructure.TenantDefaultWebsiteSeeder.ResetToBlankCanvasAsync(
                dbContext,
                cancellationToken);
        }
        return true;
    }
}
