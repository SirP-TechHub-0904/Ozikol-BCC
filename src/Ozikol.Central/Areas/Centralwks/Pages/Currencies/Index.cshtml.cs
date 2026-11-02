using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol.Central.Services;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Areas.Centralwks.Pages.Currencies
{
    /// <summary>
    /// PageModel displaying supported platform currencies, exchange rate multipliers relative to 1.00 USD ($),
    /// quick inline exchange rate updates, Default System Display Currency selection, and quick currency creation.
    /// </summary>
    public class IndexModel : PageModel
    {
        private readonly MasterCatalogDbContext _dbContext;
        private readonly ICurrencyService _currencyService;

        /// <summary>
        /// Initializes a new instance of the <see cref="IndexModel"/> class.
        /// </summary>
        /// <param name="dbContext">Master catalog database context.</param>
        /// <param name="currencyService">Central currency conversion service.</param>
        public IndexModel(MasterCatalogDbContext dbContext, ICurrencyService currencyService)
        {
            _dbContext = dbContext;
            _currencyService = currencyService;
        }

        /// <summary>
        /// Search filter for currency code, symbol, or display name.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? Search { get; set; }

        /// <summary>
        /// Filter by active status (all, active, inactive).
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? Status { get; set; }

        /// <summary>
        /// List of retrieved currency rates.
        /// </summary>
        public List<MasterCurrencyRate> Currencies { get; set; } = new();

        /// <summary>
        /// Total count of configured currencies.
        /// </summary>
        public int TotalCount { get; set; }

        /// <summary>
        /// Count of currently active currencies.
        /// </summary>
        public int ActiveCount { get; set; }

        /// <summary>
        /// Count of inactive currencies.
        /// </summary>
        public int InactiveCount { get; set; }

        /// <summary>
        /// The base exchange rate reference currency code (always USD = 1.0000).
        /// </summary>
        public string BaseCurrencyCode { get; set; } = "USD";

        /// <summary>
        /// The base exchange rate reference currency symbol ($).
        /// </summary>
        public string BaseCurrencySymbol { get; set; } = "$";

        /// <summary>
        /// The Default System Currency code displayed across all amount places on the Central website (e.g. USD or NGN).
        /// </summary>
        public string DefaultDisplayCurrencyCode { get; set; } = "USD";

        /// <summary>
        /// The Default System Currency symbol displayed across all amount places on the Central website (e.g. $ or ₦).
        /// </summary>
        public string DefaultDisplayCurrencySymbol { get; set; } = "$";

        /// <summary>
        /// The exchange rate of the Default System Currency relative to 1.00 USD.
        /// </summary>
        public decimal DefaultDisplayCurrencyRate { get; set; } = 1.0000m;

        /// <summary>
        /// Status message from previous action.
        /// </summary>
        [TempData]
        public string? StatusMessage { get; set; }

        /// <summary>
        /// Handles HTTP GET requests to load currency rates with filtering and metrics.
        /// </summary>
        public async Task OnGetAsync()
        {
            var query = _dbContext.MasterCurrencyRates.AsNoTracking().AsQueryable();

            TotalCount = await query.CountAsync();
            ActiveCount = await query.CountAsync(c => c.IsActive);
            InactiveCount = TotalCount - ActiveCount;

            var baseCurr = await query.FirstOrDefaultAsync(c => c.IsBaseCurrency);
            if (baseCurr != null)
            {
                BaseCurrencyCode = baseCurr.CurrencyCode;
                BaseCurrencySymbol = baseCurr.CurrencySymbol;
            }

            var platformSetting = await _dbContext.MasterPlatformSettings.AsNoTracking().FirstOrDefaultAsync(s => s.Id == 1);
            DefaultDisplayCurrencyCode = !string.IsNullOrWhiteSpace(platformSetting?.DefaultCurrencyCode)
                ? platformSetting!.DefaultCurrencyCode.Trim().ToUpperInvariant()
                : "USD";

            var defaultDisplayCurr = await query.FirstOrDefaultAsync(c => c.CurrencyCode.ToUpper() == DefaultDisplayCurrencyCode);
            if (defaultDisplayCurr != null)
            {
                DefaultDisplayCurrencySymbol = defaultDisplayCurr.CurrencySymbol;
                DefaultDisplayCurrencyRate = defaultDisplayCurr.RateFromUsd;
            }

            if (!string.IsNullOrWhiteSpace(Search))
            {
                var term = Search.Trim().ToLower();
                query = query.Where(c =>
                    c.CurrencyCode.ToLower().Contains(term) ||
                    c.DisplayName.ToLower().Contains(term) ||
                    c.CurrencySymbol.ToLower().Contains(term) ||
                    (c.AssociatedCountryCodes != null && c.AssociatedCountryCodes.ToLower().Contains(term)));
            }

            if (!string.IsNullOrWhiteSpace(Status))
            {
                if (Status.Equals("active", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(c => c.IsActive);
                }
                else if (Status.Equals("inactive", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(c => !c.IsActive);
                }
            }

            Currencies = await query
                .OrderByDescending(c => c.IsBaseCurrency)
                .ThenBy(c => c.SortOrder)
                .ThenBy(c => c.CurrencyCode)
                .ToListAsync();
        }

        /// <summary>
        /// Quickly creates a new currency and sets its exchange rate to 1.00 USD ($).
        /// </summary>
        public async Task<IActionResult> OnPostQuickCreateAsync(
            string currencyCode,
            string currencySymbol,
            string displayName,
            decimal rateFromUsd,
            decimal? vatPercentage,
            string? cultureName,
            string? countryCodes,
            bool isBaseCurrency = false)
        {
            if (string.IsNullOrWhiteSpace(currencyCode) || string.IsNullOrWhiteSpace(currencySymbol) || string.IsNullOrWhiteSpace(displayName))
            {
                TempData["Error"] = "Currency Code, Symbol, and Display Name are required.";
                return RedirectToPage();
            }

            var cleanCode = currencyCode.Trim().ToUpperInvariant();
            var exists = await _dbContext.MasterCurrencyRates.AnyAsync(c => c.CurrencyCode.ToUpper() == cleanCode);
            if (exists)
            {
                TempData["Error"] = $"Currency '{cleanCode}' already exists. You can update its exchange rate directly in the table.";
                return RedirectToPage();
            }

            if (isBaseCurrency)
            {
                var oldBases = await _dbContext.MasterCurrencyRates.Where(c => c.IsBaseCurrency).ToListAsync();
                foreach (var b in oldBases)
                {
                    b.IsBaseCurrency = false;
                    b.UpdatedAtUtc = DateTime.UtcNow;
                }
                rateFromUsd = 1.0000m;
            }

            var cleanVat = vatPercentage.HasValue && vatPercentage.Value > 0m
                ? Math.Round(Math.Min(100m, vatPercentage.Value), 2)
                : 0m;

            var newCurr = new MasterCurrencyRate
            {
                CurrencyCode = cleanCode,
                CurrencySymbol = currencySymbol.Trim(),
                DisplayName = displayName.Trim(),
                CultureName = string.IsNullOrWhiteSpace(cultureName) ? "en-US" : cultureName.Trim(),
                PillLabel = $"{cleanCode} ({currencySymbol.Trim()})",
                RateFromUsd = Math.Max(0.0001m, rateFromUsd),
                VatPercentage = cleanVat,
                IsBaseCurrency = isBaseCurrency,
                IsActive = true,
                SortOrder = isBaseCurrency ? 1 : 10,
                AssociatedCountryCodes = string.IsNullOrWhiteSpace(countryCodes) ? null : countryCodes.Trim().ToUpperInvariant(),
                CreatedAtUtc = DateTime.UtcNow,
                UpdatedAtUtc = DateTime.UtcNow
            };

            _dbContext.MasterCurrencyRates.Add(newCurr);
            await _dbContext.SaveChangesAsync();
            _currencyService.InvalidatePricingCache();

            TempData["Success"] = $"Currency {cleanCode} ({newCurr.CurrencySymbol}) created with exchange rate 1 USD = {newCurr.RateFromUsd:N4} {cleanCode}" + (cleanVat > 0 ? $" and {cleanVat:0.##}% VAT." : " (No VAT).");
            return RedirectToPage();
        }

        /// <summary>
        /// Updates a currency's exchange rate relative to 1.00 USD ($).
        /// </summary>
        public async Task<IActionResult> OnPostUpdateRateAsync(int id, decimal rateFromUsd)
        {
            var currency = await _dbContext.MasterCurrencyRates.FindAsync(id);
            if (currency == null)
            {
                return NotFound();
            }

            if (currency.IsBaseCurrency)
            {
                currency.RateFromUsd = 1.0000m;
                TempData["Info"] = $"{currency.CurrencyCode} is the Default Exchange Rate Base (locked at 1.0000 USD).";
                return RedirectToPage();
            }

            currency.RateFromUsd = Math.Max(0.0001m, rateFromUsd);
            currency.UpdatedAtUtc = DateTime.UtcNow;
            await _dbContext.SaveChangesAsync();
            _currencyService.InvalidatePricingCache();

            TempData["Success"] = $"Exchange rate for {currency.CurrencyCode} ({currency.CurrencySymbol}) updated: 1 USD ($) = {currency.CurrencySymbol}{currency.RateFromUsd:N4} {currency.CurrencyCode}.";
            return RedirectToPage();
        }

        /// <summary>
        /// Updates a currency's VAT percentage. When empty or 0, VAT is removed (0%). When greater than 0, VAT is applied on invoices.
        /// </summary>
        public async Task<IActionResult> OnPostUpdateVatAsync(int id, decimal? vatPercentage)
        {
            var currency = await _dbContext.MasterCurrencyRates.FindAsync(id);
            if (currency == null)
            {
                return NotFound();
            }

            var cleanVat = vatPercentage.HasValue && vatPercentage.Value > 0m
                ? Math.Round(Math.Min(100m, vatPercentage.Value), 2)
                : 0m;

            currency.VatPercentage = cleanVat;
            currency.UpdatedAtUtc = DateTime.UtcNow;
            await _dbContext.SaveChangesAsync();
            _currencyService.InvalidatePricingCache();

            TempData["Success"] = cleanVat > 0m
                ? $"VAT for {currency.CurrencyCode} ({currency.CurrencySymbol}) set to {cleanVat:0.##}%."
                : $"VAT removed (0%) for {currency.CurrencyCode} ({currency.CurrencySymbol}).";
            return RedirectToPage();
        }

        /// <summary>
        /// Sets the specified currency as the Default System Display Currency across the Central website
        /// (without altering the USD = 1.0000 Base Exchange Rate).
        /// </summary>
        public async Task<IActionResult> OnPostSetDefaultCurrencyAsync(int id)
        {
            var target = await _dbContext.MasterCurrencyRates.FindAsync(id);
            if (target == null)
            {
                return NotFound();
            }

            target.IsActive = true;
            var settings = await _dbContext.MasterPlatformSettings.FirstOrDefaultAsync(s => s.Id == 1);
            if (settings == null)
            {
                settings = new MasterPlatformSetting
                {
                    Id = 1,
                    PlatformName = "Ozikol",
                    DefaultCurrencyCode = target.CurrencyCode.ToUpperInvariant(),
                    DefaultTrialDays = 14,
                    UpdatedUtc = DateTime.UtcNow
                };
                _dbContext.MasterPlatformSettings.Add(settings);
            }
            else
            {
                settings.DefaultCurrencyCode = target.CurrencyCode.ToUpperInvariant();
                settings.UpdatedUtc = DateTime.UtcNow;
            }

            await _dbContext.SaveChangesAsync();
            _currencyService.InvalidatePricingCache();

            TempData["SwitchCentralCurrencyCode"] = target.CurrencyCode.ToUpperInvariant();
            TempData["Success"] = $"{target.CurrencyCode} ({target.CurrencySymbol}) is now set as the Default System Currency. All amount places in Central will display in {target.CurrencyCode} ({target.CurrencySymbol}) using exchange rate 1 USD = {target.CurrencySymbol}{target.RateFromUsd:N2}.";
            return RedirectToPage();
        }

        /// <summary>
        /// Sets the specified currency as the Base Exchange Rate Reference (1.0000).
        /// </summary>
        public async Task<IActionResult> OnPostSetBaseCurrencyAsync(int id)
        {
            var target = await _dbContext.MasterCurrencyRates.FindAsync(id);
            if (target == null)
            {
                return NotFound();
            }

            var all = await _dbContext.MasterCurrencyRates.ToListAsync();
            foreach (var c in all)
            {
                if (c.Id == id)
                {
                    c.IsBaseCurrency = true;
                    c.IsActive = true;
                    c.RateFromUsd = 1.0000m;
                    c.UpdatedAtUtc = DateTime.UtcNow;
                }
                else if (c.IsBaseCurrency)
                {
                    c.IsBaseCurrency = false;
                    c.UpdatedAtUtc = DateTime.UtcNow;
                }
            }

            await _dbContext.SaveChangesAsync();
            _currencyService.InvalidatePricingCache();
            TempData["Success"] = $"{target.CurrencyCode} ({target.CurrencySymbol}) is now set as the Base Exchange Rate Reference (1.0000).";
            return RedirectToPage();
        }

        /// <summary>
        /// Toggles the active status of a currency. Base currency cannot be deactivated.
        /// </summary>
        public async Task<IActionResult> OnPostToggleActiveAsync(int id)
        {
            var currency = await _dbContext.MasterCurrencyRates.FindAsync(id);
            if (currency == null)
            {
                return NotFound();
            }

            if (currency.IsBaseCurrency && currency.IsActive)
            {
                TempData["Error"] = $"Cannot deactivate the default base currency ({currency.CurrencyCode}). Set another currency as default first.";
                return RedirectToPage();
            }

            currency.IsActive = !currency.IsActive;
            currency.UpdatedAtUtc = DateTime.UtcNow;
            await _dbContext.SaveChangesAsync();

            TempData["Success"] = $"Currency {currency.CurrencyCode} has been {(currency.IsActive ? "activated" : "deactivated")}.";
            return RedirectToPage();
        }

        /// <summary>
        /// Deletes a currency record. Base currency cannot be deleted.
        /// </summary>
        public async Task<IActionResult> OnPostDeleteAsync(int id)
        {
            var currency = await _dbContext.MasterCurrencyRates.FindAsync(id);
            if (currency == null)
            {
                return NotFound();
            }

            if (currency.IsBaseCurrency)
            {
                TempData["Error"] = "Cannot delete the default base currency.";
                return RedirectToPage();
            }

            _dbContext.MasterCurrencyRates.Remove(currency);
            await _dbContext.SaveChangesAsync();

            TempData["Success"] = $"Currency {currency.CurrencyCode} ({currency.DisplayName}) was removed.";
            return RedirectToPage();
        }
    }
}
