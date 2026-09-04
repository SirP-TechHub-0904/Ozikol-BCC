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
/// Configuration options governing global base pricing and fallback currency settings.
/// </summary>
public class PricingSettings
{
    /// <summary>
    /// The global annual base subscription price in US Dollars ($).
    /// Defaults to $25.00 USD / year.
    /// </summary>
    public decimal BasePriceUsd { get; set; } = 25.00m;

    /// <summary>
    /// The default fallback currency code when country detection yields no specific regional match.
    /// </summary>
    public string DefaultCurrencyCode { get; set; } = "USD";
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
}

/// <summary>
/// Production implementation of ICurrencyService backed by MasterCatalogDbContext,
/// memory caching, USD-base dynamic formula, and offline MaxMind GeoIP resolution.
/// </summary>
public class CurrencyService : ICurrencyService
{
    private const string CacheKey = "Ozikol_MasterCurrencyRates_V1";
    private static readonly TimeSpan CacheDuration = TimeSpan.FromHours(1);

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
        new MasterCurrencyRate { Id = 2, CurrencyCode = "NGN", CurrencySymbol = "\u20A6", DisplayName = "Nigerian Naira", CultureName = "en-NG", PillLabel = "NGN (\u20A6)", RateFromUsd = 1600.0m, IsBaseCurrency = false, IsActive = true, SortOrder = 2, AssociatedCountryCodes = "NG" },
        new MasterCurrencyRate { Id = 3, CurrencyCode = "GBP", CurrencySymbol = "\u00A3", DisplayName = "British Pound", CultureName = "en-GB", PillLabel = "GBP (\u00A3)", RateFromUsd = 0.80m, IsBaseCurrency = false, IsActive = true, SortOrder = 3, AssociatedCountryCodes = "GB" },
        new MasterCurrencyRate { Id = 4, CurrencyCode = "EUR", CurrencySymbol = "\u20AC", DisplayName = "Euro", CultureName = "de-DE", PillLabel = "EUR (\u20AC)", RateFromUsd = 0.92m, IsBaseCurrency = false, IsActive = true, SortOrder = 4, AssociatedCountryCodes = "DE,FR,ES,IT,NL,BE,IE,PT,AT,FI,GR" },
        new MasterCurrencyRate { Id = 5, CurrencyCode = "GHS", CurrencySymbol = "GH\u20B5", DisplayName = "Ghanaian Cedi", CultureName = "en-GH", PillLabel = "GHS (GH\u20B5)", RateFromUsd = 14.0m, IsBaseCurrency = false, IsActive = true, SortOrder = 5, AssociatedCountryCodes = "GH" },
        new MasterCurrencyRate { Id = 6, CurrencyCode = "KES", CurrencySymbol = "KSh", DisplayName = "Kenyan Shilling", CultureName = "sw-KE", PillLabel = "KES (KSh)", RateFromUsd = 130.0m, IsBaseCurrency = false, IsActive = true, SortOrder = 6, AssociatedCountryCodes = "KE" },
        new MasterCurrencyRate { Id = 7, CurrencyCode = "ZAR", CurrencySymbol = "R", DisplayName = "South African Rand", CultureName = "en-ZA", PillLabel = "ZAR (R)", RateFromUsd = 18.0m, IsBaseCurrency = false, IsActive = true, SortOrder = 7, AssociatedCountryCodes = "ZA" },
        new MasterCurrencyRate { Id = 8, CurrencyCode = "CAD", CurrencySymbol = "CA$", DisplayName = "Canadian Dollar", CultureName = "en-CA", PillLabel = "CAD (CA$)", RateFromUsd = 1.36m, IsBaseCurrency = false, IsActive = true, SortOrder = 8, AssociatedCountryCodes = "CA" },
        new MasterCurrencyRate { Id = 9, CurrencyCode = "AED", CurrencySymbol = "AED", DisplayName = "UAE Dirham", CultureName = "ar-AE", PillLabel = "AED", RateFromUsd = 3.67m, IsBaseCurrency = false, IsActive = true, SortOrder = 9, AssociatedCountryCodes = "AE" },
        new MasterCurrencyRate { Id = 10, CurrencyCode = "INR", CurrencySymbol = "\u20B9", DisplayName = "Indian Rupee", CultureName = "en-IN", PillLabel = "INR (\u20B9)", RateFromUsd = 84.0m, IsBaseCurrency = false, IsActive = true, SortOrder = 10, AssociatedCountryCodes = "IN" }
    };

    /// <inheritdoc />
    public decimal BasePriceUsd => _pricingSettings.BasePriceUsd;

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

        if (string.IsNullOrWhiteSpace(code))
        {
            var defaultMatch = supported.FirstOrDefault(c => c.Code.Equals(_pricingSettings.DefaultCurrencyCode, StringComparison.OrdinalIgnoreCase));
            return defaultMatch ?? supported[0];
        }

        var normalized = code.Trim().ToUpperInvariant();
        var match = supported.FirstOrDefault(c => c.Code.Equals(normalized, StringComparison.OrdinalIgnoreCase));
        return match ?? supported.FirstOrDefault(c => c.Code.Equals(_pricingSettings.DefaultCurrencyCode, StringComparison.OrdinalIgnoreCase)) ?? supported[0];
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

        // 3. Cloudflare GeoIP header (CF-IPCountry)
        string? countryIso = context.Request.Headers["CF-IPCountry"].FirstOrDefault();

        // 4. Offline MaxMind GeoLite2 lookup via client Remote IP address
        if (string.IsNullOrWhiteSpace(countryIso) && context.Connection.RemoteIpAddress != null)
        {
            countryIso = _geoLocationService.ResolveCountryCode(context.Connection.RemoteIpAddress);
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

        // 7. Global default fallback
        return _pricingSettings.DefaultCurrencyCode;
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
}
