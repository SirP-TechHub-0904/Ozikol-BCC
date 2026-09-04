using System.Globalization;

namespace Ozikol.Central.Services;

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
    public string CurrencyCode { get; set; } = "NGN";

    /// <summary>
    /// The flat all-inclusive annual subscription fee.
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
    /// Retrieves all currencies supported by the Ozikol Central platform.
    /// </summary>
    /// <returns>A read-only collection of supported currency descriptors.</returns>
    IReadOnlyList<CurrencyInfo> GetSupportedCurrencies();

    /// <summary>
    /// Resolves currency metadata by ISO code, defaulting to Nigerian Naira (NGN) if unspecified or unrecognized.
    /// </summary>
    /// <param name="code">The ISO 4217 code to resolve (case-insensitive).</param>
    /// <returns>The matching CurrencyInfo.</returns>
    CurrencyInfo ResolveCurrency(string? code);

    /// <summary>
    /// Retrieves the regional flat annual pricing for the requested currency code.
    /// </summary>
    /// <param name="code">The ISO 4217 code.</param>
    /// <returns>The CurrencyPriceBook instance.</returns>
    CurrencyPriceBook GetPriceBook(string? code);

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
/// Production implementation of ICurrencyService providing flat ₦40,000/year all-inclusive pricing and regional equivalents.
/// </summary>
public class CurrencyService : ICurrencyService
{
    private static readonly List<CurrencyInfo> SupportedCurrencies = new()
    {
        new CurrencyInfo("NGN", "\u20A6", "Nigerian Naira", "en-NG", "NGN (\u20A6)"),
        new CurrencyInfo("USD", "$", "US Dollar", "en-US", "USD ($)"),
        new CurrencyInfo("GBP", "\u00A3", "British Pound", "en-GB", "GBP (\u00A3)"),
        new CurrencyInfo("GHS", "GH\u20B5", "Ghanaian Cedi", "en-GH", "GHS (GH\u20B5)")
    };

    private static readonly Dictionary<string, CurrencyPriceBook> PriceBooks = new(StringComparer.OrdinalIgnoreCase)
    {
        ["NGN"] = new CurrencyPriceBook
        {
            CurrencyCode = "NGN",
            AnnualPrice = 40000m
        },
        ["USD"] = new CurrencyPriceBook
        {
            CurrencyCode = "USD",
            AnnualPrice = 25m
        },
        ["GBP"] = new CurrencyPriceBook
        {
            CurrencyCode = "GBP",
            AnnualPrice = 20m
        },
        ["GHS"] = new CurrencyPriceBook
        {
            CurrencyCode = "GHS",
            AnnualPrice = 350m
        }
    };

    /// <inheritdoc />
    public IReadOnlyList<CurrencyInfo> GetSupportedCurrencies() => SupportedCurrencies;

    /// <inheritdoc />
    public CurrencyInfo ResolveCurrency(string? code)
    {
        if (string.IsNullOrWhiteSpace(code))
        {
            return SupportedCurrencies[0]; // Default to NGN
        }

        var normalized = code.Trim().ToUpperInvariant();
        var match = SupportedCurrencies.FirstOrDefault(c => c.Code.Equals(normalized, StringComparison.OrdinalIgnoreCase));
        return match ?? SupportedCurrencies[0];
    }

    /// <inheritdoc />
    public CurrencyPriceBook GetPriceBook(string? code)
    {
        var resolved = ResolveCurrency(code);
        if (PriceBooks.TryGetValue(resolved.Code, out var book))
        {
            return book;
        }

        return PriceBooks["NGN"];
    }

    /// <inheritdoc />
    public string Format(decimal amount, string? currencyCode, bool compact = true)
    {
        var resolved = ResolveCurrency(currencyCode);
        try
        {
            var culture = CultureInfo.GetCultureInfo(resolved.CultureName);
            var format = compact ? "C0" : "C2";
            return amount.ToString(format, culture);
        }
        catch (CultureNotFoundException)
        {
            // Fallback gracefully if the underlying OS culture library is missing specific sub-cultures
            var format = compact ? "N0" : "N2";
            return $"{resolved.Symbol}{amount.ToString(format, CultureInfo.InvariantCulture)}";
        }
    }
}
