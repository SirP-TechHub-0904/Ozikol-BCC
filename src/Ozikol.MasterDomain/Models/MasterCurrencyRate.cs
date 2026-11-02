using System;

namespace Ozikol.MasterDomain.Models;

/// <summary>
/// Represents a supported platform currency, its exchange rate multiplier from the USD base,
/// culture formatting metadata, and associated geographic country codes.
/// Managed strictly within the central Master Catalog database layer.
/// </summary>
public class MasterCurrencyRate
{
    /// <summary>
    /// Unique database primary key identifier.
    /// </summary>
    public int Id { get; set; }

    /// <summary>
    /// The standard 3-letter ISO 4217 currency code (e.g. USD, NGN, GBP, EUR, GHS).
    /// </summary>
    public string CurrencyCode { get; set; } = string.Empty;

    /// <summary>
    /// The visual currency symbol (e.g. $, ₦, £, €, GH₵).
    /// </summary>
    public string CurrencySymbol { get; set; } = string.Empty;

    /// <summary>
    /// User-friendly localized display name of the currency (e.g. "Nigerian Naira").
    /// </summary>
    public string DisplayName { get; set; } = string.Empty;

    /// <summary>
    /// The .NET CultureInfo name used for localized currency string formatting (e.g. "en-NG", "en-GB").
    /// </summary>
    public string CultureName { get; set; } = string.Empty;

    /// <summary>
    /// Short label rendered on currency selection pills (e.g. "NGN (₦)").
    /// </summary>
    public string PillLabel { get; set; } = string.Empty;

    /// <summary>
    /// The exchange rate multiplier relative to 1.0 USD (Base currency).
    /// Used in the formula: CalculatedPrice = BasePriceUsd * RateFromUsd.
    /// </summary>
    public decimal RateFromUsd { get; set; }

    /// <summary>
    /// Optional Value Added Tax (VAT) percentage applied to billing invoices in this currency (e.g. 7.5 for 7.5%).
    /// When 0 or less, VAT is omitted from invoices. When greater than 0, VAT is automatically calculated and added.
    /// </summary>
    public decimal VatPercentage { get; set; } = 0m;

    /// <summary>
    /// Indicates whether this currency serves as the global pricing baseline (USD = true).
    /// </summary>
    public bool IsBaseCurrency { get; set; }

    /// <summary>
    /// Indicates whether the currency is active and eligible for checkout and display.
    /// </summary>
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Presentation ordering index for front-end selectors and tables.
    /// </summary>
    public int SortOrder { get; set; }

    /// <summary>
    /// Comma-separated 2-letter ISO 3166-1 alpha-2 country codes automatically mapped to this currency
    /// by the GeoIP detection engine (e.g. "NG" for Naira, "GB" for Pound, "DE,FR,ES,IT" for Euro).
    /// </summary>
    public string? AssociatedCountryCodes { get; set; }

    /// <summary>
    /// UTC timestamp when the currency record was initially created.
    /// </summary>
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// UTC timestamp when the rate or metadata was last modified.
    /// </summary>
    public DateTime? UpdatedAtUtc { get; set; }
}
