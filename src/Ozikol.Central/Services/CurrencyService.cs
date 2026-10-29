using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Services;

/// <summary>
/// Configuration options governing global default currency and fallback trial settings.
/// </summary>
public class PricingSettings
{
    /// <summary>
    /// The default fallback currency code when country detection yields no specific regional match.
    /// </summary>
    public string DefaultCurrencyCode { get; set; } = "USD";

    /// <summary>
    /// The default free trial period in days for new workspaces when no promotional coupon override is provided.
    /// Defaults to 14 days.
    /// </summary>
    public int DefaultTrialDays { get; set; } = 14;
}

/// <summary>
/// Represents descriptive metadata and formatting rules for a supported currency in Ozikol.
/// </summary>
/// <param name="Code">The 3-letter ISO 4217 currency code (e.g. NGN, USD, GBP, GHS).</param>
/// <param name="Symbol">The visual currency symbol (e.g. ₦, $, £, GH₵).</param>
/// <param name="DisplayName">The user-facing full name of the currency.</param>
/// <param name="CultureName">The .NET CultureInfo name used for localized numeric formatting.</param>
/// <param name="PillLabel">The compact button label for selection pills (e.g. 'NGN (₦)').</param>
public record CurrencyInfo(
    string Code,
    string Symbol,
    string DisplayName,
    string CultureName,
    string PillLabel
);

/// <summary>
/// Represents the flat annual all-inclusive subscription price for a specific currency.
/// </summary>
public class CurrencyPriceBook
{
    /// <summary>
    /// The 3-letter ISO 4217 currency code.
    /// </summary>
    public string CurrencyCode { get; set; } = "USD";

    /// <summary>
    /// The calculated flat all-inclusive annual subscription fee.
    /// </summary>
    public decimal AnnualPrice { get; set; }

    /// <summary>
    /// Calculated monthly equivalent for reference display.
    /// </summary>
    public decimal MonthlyEquivalent => Math.Round(AnnualPrice / 12m, 0);
}

/// <summary>
/// Service interface governing currency resolution, localized decimal formatting, and flat regional pricing.
/// </summary>
public interface ICurrencyService
{
    /// <summary>
    /// Gets the base subscription price in USD.
    /// </summary>
    decimal BasePriceUsd { get; }

    /// <summary>
    /// Retrieves all active currencies supported by the Ozikol Central platform.
    /// </summary>
    /// <returns>A read-only collection of supported currency descriptors.</returns>
    IReadOnlyList<CurrencyInfo> GetSupportedCurrencies();

    /// <summary>
    /// Resolves currency metadata by ISO code, defaulting to USD (or configured default) if unspecified or unrecognized.
    /// </summary>
    /// <param name="code">The ISO 4217 code to resolve (case-insensitive).</param>
    /// <returns>The matching CurrencyInfo.</returns>
    CurrencyInfo ResolveCurrency(string? code);

    /// <summary>
    /// Retrieves the regional flat annual pricing calculated dynamically from the USD base.
    /// </summary>
    /// <param name="code">The ISO 4217 code.</param>
    /// <returns>The CurrencyPriceBook instance.</returns>
    CurrencyPriceBook GetPriceBook(string? code);

    /// <summary>
    /// Resolves the optimal currency ISO code for an incoming HTTP request using a 4-tier waterfall:
    /// Explicit selection &gt; Saved cookie &gt; Cloudflare header &gt; MaxMind GeoIP &gt; Browser Locale &gt; Default.
    /// </summary>
    /// <param name="context">The active HTTP context.</param>
    /// <param name="explicitCurrency">Optional explicit currency code (e.g. from query string).</param>
    /// <returns>The resolved 3-letter ISO currency code.</returns>
    string ResolveCurrencyCodeFromRequest(HttpContext context, string? explicitCurrency = null);

    /// <summary>
    /// Formats a decimal amount using the appropriate culture and currency symbol.
    /// </summary>
    /// <param name="amount">The decimal monetary value.</param>
    /// <param name="currencyCode">The target currency code.</param>
    /// <param name="compact">If true, omits fractional decimals (e.g., ₦40,000 instead of ₦40,000.00).</param>
    /// <returns>The localized formatted currency string.</returns>
    string Format(decimal amount, string? currencyCode, bool compact = true);

    /// <summary>
    /// Retrieves the exchange rate multiplier relative to USD base currency.
    /// </summary>
    /// <param name="currencyCode">Target currency code.</param>
    /// <returns>Decimal exchange rate multiplier.</returns>
    decimal GetExchangeRate(string? currencyCode);

    /// <summary>
    /// Converts a USD monetary amount into the target currency using active master rates.
    /// </summary>
    /// <param name="usdAmount">USD base amount.</param>
    /// <param name="currencyCode">Target currency code.</param>
    /// <returns>Converted decimal value.</returns>
    decimal ConvertFromUsd(decimal usdAmount, string? currencyCode);

    /// <summary>
    /// Computes the dynamic global baseline annual subscription USD price by calculating
    /// the sum of YearlyPrice across all active compulsory core features.
    /// </summary>
    /// <returns>The total USD annual cost for all active compulsory features.</returns>
    decimal GetCompulsoryFeaturesBasePriceUsd();

    /// <summary>
    /// Retrieves the total count of all active modular capabilities in the master catalog.
    /// </summary>
    /// <returns>The count of active features.</returns>
    int GetActiveFeaturesCount();

    /// <summary>
    /// Retrieves the total count of distinct active capability suites/categories in the master catalog.
    /// </summary>
    /// <returns>The count of active suites.</returns>
    int GetActiveSuitesCount();

    /// <summary>
    /// Retrieves the total count of active compulsory core features in the master catalog.
    /// </summary>
    /// <returns>The count of active compulsory features.</returns>
    int GetCompulsoryFeaturesCount();

    /// <summary>
    /// Retrieves all active capability suites and their active modular capabilities from the Master Catalog,
    /// strictly ordered by <see cref="MasterFeatureSuite.SortOrder"/> and <see cref="MasterFeatureCatalog.SortOrder"/>.
    /// </summary>
    /// <returns>Ordered read-only list of suites with their child features.</returns>
    IReadOnlyList<PublicCatalogSuiteDto> GetActiveSuitesWithFeatures();

    /// <summary>
    /// Invalidates all cached currency rates and dynamic pricing sums so administrative changes reflect immediately.
    /// </summary>
    void InvalidatePricingCache();

    /// <summary>
    /// Converts and formats a USD monetary amount into the target currency with symbol and localized commas.
    /// </summary>
    /// <param name="usdAmount">USD base amount.</param>
    /// <param name="currencyCode">Target currency code.</param>
    /// <param name="compact">If true, omits fractional cents/kobo if zero.</param>
    /// <returns>Formatted currency string.</returns>
    string FormatUsdConverted(decimal usdAmount, string? currencyCode, bool compact = false);
}

/// <summary>
/// Represents an active capability suite and its ordered child features for public website rendering.
/// </summary>
public sealed class PublicCatalogSuiteDto
{
    /// <summary>Gets or sets the unique suite ID.</summary>
    public Guid Id { get; set; }

    /// <summary>Gets or sets the canonical suite code (e.g. SUITE-A).</summary>
    public string SuiteCode { get; set; } = string.Empty;

    /// <summary>Gets or sets the full suite display name.</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>Gets or sets the concise navigation/menu title.</summary>
    public string MenuTitle { get; set; } = string.Empty;

    /// <summary>Gets or sets the suite description.</summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>Gets or sets the Material icon identifier.</summary>
    public string Icon { get; set; } = "folder_special";

    /// <summary>Gets or sets the sort order.</summary>
    public int SortOrder { get; set; }

    /// <summary>Gets or sets the HTML anchor slug (e.g. suite-people).</summary>
    public string AnchorId { get; set; } = string.Empty;

    /// <summary>Gets or sets the ordered active features belonging to this suite.</summary>
    public IReadOnlyList<PublicCatalogFeatureDto> Features { get; set; } = Array.Empty<PublicCatalogFeatureDto>();
}

/// <summary>
/// Represents an active modular capability for public website mega-menu and catalog rendering.
/// </summary>
public sealed class PublicCatalogFeatureDto
{
    /// <summary>Gets or sets the unique feature ID.</summary>
    public Guid Id { get; set; }

    /// <summary>Gets or sets the canonical feature code (e.g. bcp-community-messenger).</summary>
    public string FeatureCode { get; set; } = string.Empty;

    /// <summary>Gets or sets the full feature name.</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>Gets or sets the concise sidebar menu title.</summary>
    public string MenuTitle { get; set; } = string.Empty;

    /// <summary>Gets or sets the concise one-line summary for mega-menus.</summary>
    public string ShortSummary { get; set; } = string.Empty;

    /// <summary>Gets or sets the full marketing description.</summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>Gets or sets the 3 highlight bullet points for feature cards.</summary>
    public IReadOnlyList<string> BulletPoints { get; set; } = Array.Empty<string>();

    /// <summary>Gets or sets the public route slug under /features/{PublicSlug}.</summary>
    public string PublicSlug { get; set; } = string.Empty;

    /// <summary>Gets or sets the CSS icon color modifier class.</summary>
    public string IconColorClass { get; set; } = "oz-feat-card-icon--indigo";

    /// <summary>Gets or sets the sort order.</summary>
    public int SortOrder { get; set; }

    /// <summary>Gets or sets whether the capability is live or Coming Soon.</summary>
    public bool IsAvailableForUse { get; set; }

    /// <summary>Gets or sets whether the capability is included in Compulsory Core.</summary>
    public bool IsCompulsory { get; set; }
}

/// <summary>
/// Production implementation of ICurrencyService backed by MasterCatalogDbContext,
/// memory caching, USD-base dynamic formula, and offline MaxMind GeoIP resolution.
/// </summary>
public class CurrencyService : ICurrencyService
{
    private const string CacheKey = "Ozikol_MasterCurrencyRates_V1";
    private const string CompulsoryPriceCacheKey = "Ozikol_CompulsoryBasePriceUsd_V1";
    private static readonly TimeSpan CacheDuration = TimeSpan.FromHours(1);
    private static readonly TimeSpan CompulsoryPriceCacheDuration = TimeSpan.FromMinutes(2);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IMemoryCache _cache;
    private readonly IGeoLocationService _geoLocationService;
    private readonly PricingSettings _pricingSettings;
    private readonly ILogger<CurrencyService> _logger;

    /// <summary>
    /// Fallback static list of 10 currencies to guarantee zero runtime failures even during initial database migration windows.
    /// </summary>
    private static readonly List<MasterCurrencyRate> StaticFallbackRates = new()
    {
        new MasterCurrencyRate { Id = 1, CurrencyCode = "USD", CurrencySymbol = "$", DisplayName = "US Dollar", CultureName = "en-US", PillLabel = "USD ($)", RateFromUsd = 1.0m, IsBaseCurrency = true, IsActive = true, SortOrder = 1, AssociatedCountryCodes = "US" },
        new MasterCurrencyRate { Id = 2, CurrencyCode = "NGN", CurrencySymbol = "\u20A6", DisplayName = "Nigerian Naira", CultureName = "en-NG", PillLabel = "NGN (\u20A6)", RateFromUsd = 1350.0m, IsBaseCurrency = false, IsActive = true, SortOrder = 2, AssociatedCountryCodes = "NG" },
        new MasterCurrencyRate { Id = 3, CurrencyCode = "GBP", CurrencySymbol = "\u00A3", DisplayName = "British Pound", CultureName = "en-GB", PillLabel = "GBP (\u00A3)", RateFromUsd = 0.80m, IsBaseCurrency = false, IsActive = true, SortOrder = 3, AssociatedCountryCodes = "GB" },
        new MasterCurrencyRate { Id = 4, CurrencyCode = "EUR", CurrencySymbol = "\u20AC", DisplayName = "Euro", CultureName = "de-DE", PillLabel = "EUR (\u20AC)", RateFromUsd = 0.92m, IsBaseCurrency = false, IsActive = true, SortOrder = 4, AssociatedCountryCodes = "DE,FR,ES,IT,NL,BE,IE,PT,AT,FI,GR" },
        new MasterCurrencyRate { Id = 5, CurrencyCode = "GHS", CurrencySymbol = "GH\u20B5", DisplayName = "Ghanaian Cedi", CultureName = "en-GH", PillLabel = "GHS (GH\u20B5)", RateFromUsd = 14.0m, IsBaseCurrency = false, IsActive = true, SortOrder = 5, AssociatedCountryCodes = "GH" },
        new MasterCurrencyRate { Id = 6, CurrencyCode = "KES", CurrencySymbol = "KSh", DisplayName = "Kenyan Shilling", CultureName = "sw-KE", PillLabel = "KES (KSh)", RateFromUsd = 130.0m, IsBaseCurrency = false, IsActive = true, SortOrder = 6, AssociatedCountryCodes = "KE" },
        new MasterCurrencyRate { Id = 7, CurrencyCode = "ZAR", CurrencySymbol = "R", DisplayName = "South African Rand", CultureName = "en-ZA", PillLabel = "ZAR (R)", RateFromUsd = 18.0m, IsBaseCurrency = false, IsActive = true, SortOrder = 7, AssociatedCountryCodes = "ZA" },
        new MasterCurrencyRate { Id = 8, CurrencyCode = "CAD", CurrencySymbol = "CA$", DisplayName = "Canadian Dollar", CultureName = "en-CA", PillLabel = "CAD (CA$)", RateFromUsd = 1.36m, IsBaseCurrency = false, IsActive = true, SortOrder = 8, AssociatedCountryCodes = "CA" },
        new MasterCurrencyRate { Id = 9, CurrencyCode = "AED", CurrencySymbol = "AED", DisplayName = "UAE Dirham", CultureName = "ar-AE", PillLabel = "AED", RateFromUsd = 3.67m, IsBaseCurrency = false, IsActive = true, SortOrder = 9, AssociatedCountryCodes = "AE" },
        new MasterCurrencyRate { Id = 10, CurrencyCode = "INR", CurrencySymbol = "\u20B9", DisplayName = "Indian Rupee", CultureName = "en-IN", PillLabel = "INR (\u20B9)", RateFromUsd = 84.0m, IsBaseCurrency = false, IsActive = true, SortOrder = 10, AssociatedCountryCodes = "IN" }
    };

    private const string DefaultCurrencyCacheKey = "Ozikol_PlatformDefaultCurrency_V1";

    /// <summary>
    /// Dynamically resolves the global fallback currency code from MasterPlatformSettings table or configuration.
    /// </summary>
    public string GetPlatformDefaultCurrencyCode()
    {
        return _cache.GetOrCreate(DefaultCurrencyCacheKey, entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5);
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var dbContext = scope.ServiceProvider.GetService<MasterCatalogDbContext>();
                if (dbContext != null && dbContext.Database.CanConnect())
                {
                    var setting = dbContext.MasterPlatformSettings.AsNoTracking().FirstOrDefault(s => s.Id == 1);
                    if (!string.IsNullOrWhiteSpace(setting?.DefaultCurrencyCode))
                    {
                        return setting.DefaultCurrencyCode.Trim().ToUpperInvariant();
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Unable to query MasterPlatformSettings DefaultCurrencyCode from database.");
            }
            return _pricingSettings.DefaultCurrencyCode ?? "NGN";
        }) ?? _pricingSettings.DefaultCurrencyCode ?? "NGN";
    }

    /// <inheritdoc />
    public decimal BasePriceUsd => GetCompulsoryFeaturesBasePriceUsd();

    /// <inheritdoc />
    public decimal GetCompulsoryFeaturesBasePriceUsd()
    {
        return _cache.GetOrCreate(CompulsoryPriceCacheKey, entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = CompulsoryPriceCacheDuration;

            try
            {
                using var scope = _scopeFactory.CreateScope();
                var dbContext = scope.ServiceProvider.GetService<MasterCatalogDbContext>();
                if (dbContext != null && dbContext.Database.CanConnect())
                {
                    var sum = dbContext.MasterFeatureCatalogs
                        .AsNoTracking()
                        .Where(f => f.IsCompulsory && f.IsActive)
                        .Sum(f => f.YearlyPrice);

                    if (sum > 0)
                    {
                        return Math.Round(sum, 2);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Unable to query compulsory features sum from database. Using fallback BasePriceUsd.");
            }

            return 29.60m;
        });
    }

    private const string ActiveFeaturesCountCacheKey = "Ozikol_ActiveFeaturesCount_V1";
    private const string ActiveSuitesCountCacheKey = "Ozikol_ActiveSuitesCount_V1";
    private const string CompulsoryCountCacheKey = "Ozikol_CompulsoryCount_V1";
    private const string ActiveSuitesWithFeaturesCacheKey = "Ozikol_ActiveSuitesWithFeatures_V1";

    private static readonly string[] IconColorClasses =
    {
        "oz-feat-card-icon--crimson",
        "oz-feat-card-icon--indigo",
        "oz-feat-card-icon--emerald",
        "oz-feat-card-icon--amber",
        "oz-feat-card-icon--sky",
        "oz-feat-card-icon--violet"
    };

    /// <inheritdoc />
    public int GetActiveFeaturesCount()
    {
        return _cache.GetOrCreate(ActiveFeaturesCountCacheKey, entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = CompulsoryPriceCacheDuration;
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var dbContext = scope.ServiceProvider.GetService<MasterCatalogDbContext>();
                if (dbContext != null && dbContext.Database.CanConnect())
                {
                    return dbContext.MasterFeatureCatalogs.AsNoTracking().Count(f => f.IsActive);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Unable to query active features count from database.");
            }
            return 46;
        });
    }

    /// <inheritdoc />
    public int GetActiveSuitesCount()
    {
        return _cache.GetOrCreate(ActiveSuitesCountCacheKey, entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = CompulsoryPriceCacheDuration;
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var dbContext = scope.ServiceProvider.GetService<MasterCatalogDbContext>();
                if (dbContext != null && dbContext.Database.CanConnect())
                {
                    var suiteCount = dbContext.MasterFeatureSuites.AsNoTracking().Count(s => s.IsActive);
                    if (suiteCount > 0) return suiteCount;

                    return dbContext.MasterFeatureCatalogs
                        .AsNoTracking()
                        .Where(f => f.IsActive && !string.IsNullOrEmpty(f.Category))
                        .Select(f => f.Category)
                        .Distinct()
                        .Count();
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Unable to query active suites count from database.");
            }
            return 11;
        });
    }

    /// <inheritdoc />
    public int GetCompulsoryFeaturesCount()
    {
        return _cache.GetOrCreate(CompulsoryCountCacheKey, entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = CompulsoryPriceCacheDuration;
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var dbContext = scope.ServiceProvider.GetService<MasterCatalogDbContext>();
                if (dbContext != null && dbContext.Database.CanConnect())
                {
                    return dbContext.MasterFeatureCatalogs.AsNoTracking().Count(f => f.IsCompulsory && f.IsActive);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Unable to query compulsory features count from database.");
            }
            return 40;
        });
    }

    /// <inheritdoc />
    public IReadOnlyList<PublicCatalogSuiteDto> GetActiveSuitesWithFeatures()
    {
        return _cache.GetOrCreate(ActiveSuitesWithFeaturesCacheKey, entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = CompulsoryPriceCacheDuration;
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var dbContext = scope.ServiceProvider.GetService<MasterCatalogDbContext>();
                if (dbContext != null && dbContext.Database.CanConnect())
                {
                    var suites = dbContext.MasterFeatureSuites
                        .AsNoTracking()
                        .Where(s => s.IsActive)
                        .OrderBy(s => s.SortOrder)
                        .ThenBy(s => s.Name)
                        .ToList();

                    var features = dbContext.MasterFeatureCatalogs
                        .AsNoTracking()
                        .Where(f => f.IsActive)
                        .OrderBy(f => f.SortOrder)
                        .ThenBy(f => f.Name)
                        .ToList();

                    var result = new List<PublicCatalogSuiteDto>();
                    var assignedFeatureIds = new HashSet<Guid>();
                    int colorIndex = 0;

                    foreach (var s in suites)
                    {
                        var childFeatures = features
                            .Where(f => (f.MasterFeatureSuiteId != null && f.MasterFeatureSuiteId == s.Id)
                                     || (f.MasterFeatureSuiteId == null && string.Equals(f.Category?.Trim(), s.Name.Trim(), StringComparison.OrdinalIgnoreCase)))
                            .OrderBy(f => f.SortOrder)
                            .ThenBy(f => f.Name)
                            .ToList();

                        var mappedFeatures = new List<PublicCatalogFeatureDto>();
                        foreach (var f in childFeatures)
                        {
                            assignedFeatureIds.Add(f.Id);
                            mappedFeatures.Add(MapFeatureDto(f, colorIndex++));
                        }

                        // Only include active suites that have at least one active feature (or all active suites)
                        if (mappedFeatures.Count > 0 || s.IsActive)
                        {
                            result.Add(new PublicCatalogSuiteDto
                            {
                                Id = s.Id,
                                SuiteCode = s.SuiteCode,
                                Name = s.Name,
                                MenuTitle = !string.IsNullOrWhiteSpace(s.MenuTitle) ? s.MenuTitle : s.Name,
                                Description = !string.IsNullOrWhiteSpace(s.Description) ? s.Description : $"Modular capabilities under {s.Name}.",
                                Icon = !string.IsNullOrWhiteSpace(s.Icon) ? s.Icon : "folder_special",
                                SortOrder = s.SortOrder,
                                AnchorId = ResolveSuiteAnchorId(s.SuiteCode, s.Name),
                                Features = mappedFeatures
                            });
                        }
                    }

                    // Group any active features whose Category was not yet linked to a MasterFeatureSuite row
                    var ungrouped = features
                        .Where(f => !assignedFeatureIds.Contains(f.Id))
                        .GroupBy(f => !string.IsNullOrWhiteSpace(f.Category) ? f.Category.Trim() : "General Capabilities", StringComparer.OrdinalIgnoreCase);

                    int fallbackOrder = (suites.LastOrDefault()?.SortOrder ?? 10) + 1;
                    foreach (var grp in ungrouped)
                    {
                        var mapped = grp
                            .OrderBy(f => f.SortOrder)
                            .ThenBy(f => f.Name)
                            .Select(f => MapFeatureDto(f, colorIndex++))
                            .ToList();

                        result.Add(new PublicCatalogSuiteDto
                        {
                            Id = Guid.NewGuid(),
                            SuiteCode = $"SUITE-{fallbackOrder}",
                            Name = grp.Key,
                            MenuTitle = grp.Key,
                            Description = $"Modular capabilities under {grp.Key}.",
                            Icon = "folder_special",
                            SortOrder = fallbackOrder++,
                            AnchorId = ResolveSuiteAnchorId("", grp.Key),
                            Features = mapped
                        });
                    }

                    return (IReadOnlyList<PublicCatalogSuiteDto>)result
                        .OrderBy(s => s.SortOrder)
                        .ThenBy(s => s.Name)
                        .ToList();
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Unable to query active suites and features from database.");
            }

            return Array.Empty<PublicCatalogSuiteDto>();
        }) ?? Array.Empty<PublicCatalogSuiteDto>();
    }

    private static PublicCatalogFeatureDto MapFeatureDto(MasterFeatureCatalog f, int colorIdx)
    {
        var rawCode = (f.FeatureCode ?? string.Empty).Trim().ToLowerInvariant();
        var slug = rawCode.StartsWith("bcp-", StringComparison.OrdinalIgnoreCase)
            ? rawCode.Substring(4)
            : rawCode;

        var desc = (f.Description ?? string.Empty).Trim();
        var shortSummary = desc.Length > 105 ? desc.Substring(0, 102).TrimEnd() + "..." : desc;

        // Extract or synthesize 3 concise bullet points from the feature description
        var bullets = ExtractFeatureBulletPoints(f.Name, desc);

        return new PublicCatalogFeatureDto
        {
            Id = f.Id,
            FeatureCode = f.FeatureCode ?? string.Empty,
            Name = f.Name,
            MenuTitle = !string.IsNullOrWhiteSpace(f.MenuTitle) ? f.MenuTitle : f.Name,
            ShortSummary = shortSummary,
            Description = desc,
            BulletPoints = bullets,
            PublicSlug = slug,
            IconColorClass = IconColorClasses[colorIdx % IconColorClasses.Length],
            SortOrder = f.SortOrder,
            IsAvailableForUse = f.IsAvailableForUse,
            IsCompulsory = f.IsCompulsory
        };
    }

    private static IReadOnlyList<string> ExtractFeatureBulletPoints(string featureName, string description)
    {
        if (string.IsNullOrWhiteSpace(description))
        {
            return new[]
            {
                $"Centralized {featureName} workspace controls",
                "Role-based access permissions and real-time audit trail",
                "Seamless synchronization across web, desktop, and mobile"
            };
        }

        // Split description on commas/semicolons/periods to create 3 clean capability highlights
        var segments = description
            .Replace(" and ", ", ", StringComparison.OrdinalIgnoreCase)
            .Split(new[] { ',', ';', '.' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(s => s.Length >= 8)
            .Select(s => char.ToUpperInvariant(s[0]) + s.Substring(1))
            .Take(3)
            .ToList();

        while (segments.Count < 3)
        {
            if (segments.Count == 1)
                segments.Add("Role-based permissions & real-time telemetry");
            else
                segments.Add("Unified Web, Desktop & Mobile synchronization");
        }

        return segments;
    }

    private static string ResolveSuiteAnchorId(string? suiteCode, string suiteName)
    {
        var n = (suiteName ?? string.Empty).ToLowerInvariant();
        if (n.Contains("people")) return "suite-people";
        if (n.Contains("workforce") || n.Contains("rota")) return "suite-workforce";
        if (n.Contains("report") || n.Contains("form")) return "suite-reports";
        if (n.Contains("event") && !n.Contains("life")) return "suite-events";
        if (n.Contains("finance") || n.Contains("commercial")) return "suite-finance";
        if (n.Contains("operation") || n.Contains("workflow")) return "suite-operations";
        if (n.Contains("communication") || n.Contains("ai")) return "suite-communication";
        if (n.Contains("compliance") || n.Contains("learning")) return "suite-compliance";
        if (n.Contains("demographic") || n.Contains("census")) return "suite-demographics";
        if (n.Contains("life") || n.Contains("publication")) return "life-events-publications";
        if (n.Contains("workspace")) return "suite-workspace";

        var slug = new string(n.Select(ch => char.IsLetterOrDigit(ch) ? ch : '-').ToArray()).Trim('-');
        while (slug.Contains("--")) slug = slug.Replace("--", "-");
        return string.IsNullOrWhiteSpace(slug) ? "suite-general" : $"suite-{slug}";
    }

    /// <inheritdoc />
    public void InvalidatePricingCache()
    {
        _cache.Remove(CompulsoryPriceCacheKey);
        _cache.Remove(ActiveFeaturesCountCacheKey);
        _cache.Remove(ActiveSuitesCountCacheKey);
        _cache.Remove(CompulsoryCountCacheKey);
        _cache.Remove(ActiveSuitesWithFeaturesCacheKey);
        _cache.Remove(CacheKey);
        _cache.Remove(DefaultCurrencyCacheKey);
    }

    /// <summary>
    /// Initializes a new instance of the <see cref="CurrencyService"/> class.
    /// </summary>
    public CurrencyService(
        IServiceScopeFactory scopeFactory,
        IMemoryCache cache,
        IGeoLocationService geoLocationService,
        IOptions<PricingSettings> pricingSettings,
        ILogger<CurrencyService> logger)
    {
        _scopeFactory = scopeFactory ?? throw new ArgumentNullException(nameof(scopeFactory));
        _cache = cache ?? throw new ArgumentNullException(nameof(cache));
        _geoLocationService = geoLocationService ?? throw new ArgumentNullException(nameof(geoLocationService));
        _pricingSettings = pricingSettings?.Value ?? new PricingSettings();
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Retrieves active currency rates from memory cache or database.
    /// </summary>
    private List<MasterCurrencyRate> GetCachedRates()
    {
        return _cache.GetOrCreate(CacheKey, entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = CacheDuration;

            try
            {
                using var scope = _scopeFactory.CreateScope();
                var dbContext = scope.ServiceProvider.GetService<MasterCatalogDbContext>();
                if (dbContext != null && dbContext.Database.CanConnect())
                {
                    var rates = dbContext.MasterCurrencyRates
                        .AsNoTracking()
                        .Where(r => r.IsActive)
                        .OrderBy(r => r.SortOrder)
                        .ToList();

                    if (rates.Count > 0)
                    {
                        return rates;
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Unable to query MasterCurrencyRates from database. Using fallback currency presets.");
            }

            return StaticFallbackRates;
        }) ?? StaticFallbackRates;
    }

    /// <inheritdoc />
    public IReadOnlyList<CurrencyInfo> GetSupportedCurrencies()
    {
        var rates = GetCachedRates();
        return rates.Select(r => new CurrencyInfo(
            r.CurrencyCode,
            r.CurrencySymbol,
            r.DisplayName,
            r.CultureName,
            r.PillLabel
        )).ToList();
    }

    /// <inheritdoc />
    public CurrencyInfo ResolveCurrency(string? code)
    {
        var supported = GetSupportedCurrencies();
        var platformDefault = GetPlatformDefaultCurrencyCode();

        if (string.IsNullOrWhiteSpace(code))
        {
            var defaultMatch = supported.FirstOrDefault(c => c.Code.Equals(platformDefault, StringComparison.OrdinalIgnoreCase));
            return defaultMatch ?? supported[0];
        }

        var normalized = code.Trim().ToUpperInvariant();
        var match = supported.FirstOrDefault(c => c.Code.Equals(normalized, StringComparison.OrdinalIgnoreCase));
        return match ?? supported.FirstOrDefault(c => c.Code.Equals(platformDefault, StringComparison.OrdinalIgnoreCase)) ?? supported[0];
    }

    /// <inheritdoc />
    public CurrencyPriceBook GetPriceBook(string? code)
    {
        var resolved = ResolveCurrency(code);
        var rates = GetCachedRates();
        var rate = rates.FirstOrDefault(r => r.CurrencyCode.Equals(resolved.Code, StringComparison.OrdinalIgnoreCase))
                ?? rates.FirstOrDefault(r => r.IsBaseCurrency)
                ?? rates[0];

        // Annual price calculation: Base USD * Rate Multiplier
        decimal annualPrice = Math.Round(BasePriceUsd * rate.RateFromUsd, 0);

        return new CurrencyPriceBook
        {
            CurrencyCode = resolved.Code,
            AnnualPrice = annualPrice
        };
    }

    /// <inheritdoc />
    public string ResolveCurrencyCodeFromRequest(HttpContext context, string? explicitCurrency = null)
    {
        var supported = GetSupportedCurrencies();

        // 1. Explicit query parameter selection takes highest priority
        if (!string.IsNullOrWhiteSpace(explicitCurrency))
        {
            var match = supported.FirstOrDefault(c => c.Code.Equals(explicitCurrency.Trim(), StringComparison.OrdinalIgnoreCase));
            if (match != null)
            {
                return match.Code;
            }
        }

        // 2. Previously saved cookie selection
        if (context.Request.Cookies.TryGetValue("oz_currency", out var savedCookie) && !string.IsNullOrWhiteSpace(savedCookie))
        {
            var match = supported.FirstOrDefault(c => c.Code.Equals(savedCookie.Trim(), StringComparison.OrdinalIgnoreCase));
            if (match != null)
            {
                return match.Code;
            }
        }

        // 3. Edge CDN & Proxy Country Headers (Cloudflare, AWS CloudFront, Fastly, Nginx)
        string? countryIso = context.Request.Headers["CF-IPCountry"].FirstOrDefault()
                          ?? context.Request.Headers["CloudFront-Viewer-Country"].FirstOrDefault()
                          ?? context.Request.Headers["X-Country-Code"].FirstOrDefault()
                          ?? context.Request.Headers["X-GeoIP-Country"].FirstOrDefault();

        // 4. Offline MaxMind GeoLite2 lookup via client IP (supports CF-Connecting-IP and X-Forwarded-For)
        if (string.IsNullOrWhiteSpace(countryIso))
        {
            var ipHeader = context.Request.Headers["CF-Connecting-IP"].FirstOrDefault()
                        ?? context.Request.Headers["X-Forwarded-For"].FirstOrDefault()?.Split(',')[0].Trim();

            System.Net.IPAddress? clientIp = null;
            if (!string.IsNullOrWhiteSpace(ipHeader) && System.Net.IPAddress.TryParse(ipHeader, out var parsedIp))
            {
                clientIp = parsedIp;
            }
            else
            {
                clientIp = context.Connection.RemoteIpAddress;
            }

            if (clientIp != null)
            {
                countryIso = _geoLocationService.ResolveCountryCode(clientIp);
            }
        }

        // 5. Match detected country ISO against configured currency associations
        if (!string.IsNullOrWhiteSpace(countryIso))
        {
            var normalizedCountry = countryIso.Trim().ToUpperInvariant();
            var rates = GetCachedRates();

            foreach (var r in rates)
            {
                if (!string.IsNullOrWhiteSpace(r.AssociatedCountryCodes))
                {
                    var codes = r.AssociatedCountryCodes.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
                    if (codes.Any(c => c.Equals(normalizedCountry, StringComparison.OrdinalIgnoreCase)))
                    {
                        return r.CurrencyCode;
                    }
                }
            }
        }

        // 6. Inspect Browser Accept-Language header (e.g. "en-NG", "en-GB")
        var acceptLang = context.Request.Headers.AcceptLanguage.FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(acceptLang))
        {
            if (acceptLang.Contains("NG", StringComparison.OrdinalIgnoreCase)) return "NGN";
            if (acceptLang.Contains("GB", StringComparison.OrdinalIgnoreCase)) return "GBP";
            if (acceptLang.Contains("GH", StringComparison.OrdinalIgnoreCase)) return "GHS";
            if (acceptLang.Contains("KE", StringComparison.OrdinalIgnoreCase)) return "KES";
            if (acceptLang.Contains("ZA", StringComparison.OrdinalIgnoreCase)) return "ZAR";
        }

        // 7. Global default fallback from platform settings
        return GetPlatformDefaultCurrencyCode();
    }

    /// <inheritdoc />
    public string Format(decimal amount, string? currencyCode, bool compact = true)
    {
        var resolved = ResolveCurrency(currencyCode);

        try
        {
            var culture = CultureInfo.CreateSpecificCulture(resolved.CultureName);
            var format = compact ? "C0" : "C2";
            return amount.ToString(format, culture);
        }
        catch
        {
            return $"{resolved.Symbol}{amount:N0}";
        }
    }

    /// <inheritdoc />
    public decimal GetExchangeRate(string? currencyCode)
    {
        var resolved = ResolveCurrency(currencyCode);
        var rates = GetCachedRates();
        var rate = rates.FirstOrDefault(r => r.CurrencyCode.Equals(resolved.Code, StringComparison.OrdinalIgnoreCase))
                ?? rates.FirstOrDefault(r => r.IsBaseCurrency)
                ?? rates[0];
        return rate.RateFromUsd;
    }

    /// <inheritdoc />
    public decimal ConvertFromUsd(decimal usdAmount, string? currencyCode)
    {
        var rate = GetExchangeRate(currencyCode);
        return Math.Round(usdAmount * rate, 2);
    }

    /// <inheritdoc />
    public string FormatUsdConverted(decimal usdAmount, string? currencyCode, bool compact = false)
    {
        var converted = ConvertFromUsd(usdAmount, currencyCode);
        return Format(converted, currencyCode, compact);
    }
}
