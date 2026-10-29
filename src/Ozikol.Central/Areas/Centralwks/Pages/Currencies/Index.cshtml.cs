using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Areas.Centralwks.Pages.Currencies
{
    /// <summary>
    /// PageModel displaying supported platform currencies, exchange rate multipliers relative to 1.00 USD ($),
    /// quick inline exchange rate updates, default/base currency selection, and quick currency creation.
    /// </summary>
    public class IndexModel : PageModel
    {
        private readonly MasterCatalogDbContext _dbContext;

        /// <summary>
        /// Initializes a new instance of the <see cref="IndexModel"/> class.
        /// </summary>
        /// <param name="dbContext">Master catalog database context.</param>
        public IndexModel(MasterCatalogDbContext dbContext)
        {
            _dbContext = dbContext;
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
        /// The current global base/default currency code (usually USD).
        /// </summary>
        public string BaseCurrencyCode { get; set; } = "USD";

        /// <summary>
        /// The current global base currency symbol (usually $).
        /// </summary>
        public string BaseCurrencySymbol { get; set; } = "$";

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

            var newCurr = new MasterCurrencyRate
            {
                CurrencyCode = cleanCode,
                CurrencySymbol = currencySymbol.Trim(),
                DisplayName = displayName.Trim(),
                CultureName = string.IsNullOrWhiteSpace(cultureName) ? "en-US" : cultureName.Trim(),
                PillLabel = $"{cleanCode} ({currencySymbol.Trim()})",
                RateFromUsd = Math.Max(0.0001m, rateFromUsd),
                IsBaseCurrency = isBaseCurrency,
                IsActive = true,
                SortOrder = isBaseCurrency ? 1 : 10,
                AssociatedCountryCodes = string.IsNullOrWhiteSpace(countryCodes) ? null : countryCodes.Trim().ToUpperInvariant(),
                CreatedAtUtc = DateTime.UtcNow,
                UpdatedAtUtc = DateTime.UtcNow
            };

            _dbContext.MasterCurrencyRates.Add(newCurr);
            await _dbContext.SaveChangesAsync();

            TempData["Success"] = $"Currency {cleanCode} ({newCurr.CurrencySymbol}) created with exchange rate 1 USD = {newCurr.RateFromUsd:N4} {cleanCode}.";
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
                TempData["Info"] = $"{currency.CurrencyCode} is the Default Base Currency (locked at 1.0000).";
                return RedirectToPage();
            }

            currency.RateFromUsd = Math.Max(0.0001m, rateFromUsd);
            currency.UpdatedAtUtc = DateTime.UtcNow;
            await _dbContext.SaveChangesAsync();

            TempData["Success"] = $"Exchange rate for {currency.CurrencyCode} ({currency.CurrencySymbol}) updated: 1 USD ($) = {currency.CurrencySymbol}{currency.RateFromUsd:N4} {currency.CurrencyCode}.";
            return RedirectToPage();
        }

        /// <summary>
        /// Sets the specified currency as the Default / Base Currency.
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
            TempData["Success"] = $"{target.CurrencyCode} ({target.CurrencySymbol}) is now set as the Default Base Currency.";
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
