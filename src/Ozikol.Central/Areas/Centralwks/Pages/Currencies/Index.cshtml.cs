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
    /// PageModel displaying supported platform currencies, exchange rate multipliers relative to USD base,
    /// GeoIP country mappings, and localized formatting configurations.
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
        /// The current global base currency code (usually USD).
        /// </summary>
        public string BaseCurrencyCode { get; set; } = "USD";

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

            var baseCurr = await query.FirstOrDefaultAsync(c => c.IsBaseCurrency);
            if (baseCurr != null)
            {
                BaseCurrencyCode = baseCurr.CurrencyCode;
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
                .OrderBy(c => c.SortOrder)
                .ThenBy(c => c.CurrencyCode)
                .ToListAsync();
        }

        /// <summary>
        /// Toggles the active status of a currency. Base currency cannot be deactivated.
        /// </summary>
        /// <param name="id">Currency primary key ID.</param>
        public async Task<IActionResult> OnPostToggleActiveAsync(int id)
        {
            var currency = await _dbContext.MasterCurrencyRates.FindAsync(id);
            if (currency == null)
            {
                return NotFound();
            }

            if (currency.IsBaseCurrency && currency.IsActive)
            {
                StatusMessage = "Cannot deactivate the global base currency (USD). Set another currency as base first.";
                return RedirectToPage();
            }

            currency.IsActive = !currency.IsActive;
            currency.UpdatedAtUtc = DateTime.UtcNow;
            await _dbContext.SaveChangesAsync();

            StatusMessage = $"Currency {currency.CurrencyCode} has been {(currency.IsActive ? "activated" : "deactivated")}.";
            return RedirectToPage();
        }

        /// <summary>
        /// Deletes a currency record. Base currency cannot be deleted.
        /// </summary>
        /// <param name="id">Currency identifier.</param>
        public async Task<IActionResult> OnPostDeleteAsync(int id)
        {
            var currency = await _dbContext.MasterCurrencyRates.FindAsync(id);
            if (currency == null)
            {
                return NotFound();
            }

            if (currency.IsBaseCurrency)
            {
                StatusMessage = "Cannot delete the global base currency.";
                return RedirectToPage();
            }

            _dbContext.MasterCurrencyRates.Remove(currency);
            await _dbContext.SaveChangesAsync();

            StatusMessage = $"Currency {currency.CurrencyCode} ({currency.DisplayName}) was successfully removed.";
            return RedirectToPage();
        }
    }
}
