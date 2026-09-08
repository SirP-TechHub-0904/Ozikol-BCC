using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Areas.Admin.Pages.Currencies
{
    /// <summary>
    /// PageModel displaying in-depth currency inspection, live FX conversion preview from USD base,
    /// culture formatting simulation, and GeoIP country routing rules.
    /// </summary>
    public class DetailsModel : PageModel
    {
        private readonly MasterCatalogDbContext _dbContext;

        /// <summary>
        /// Initializes a new instance of the <see cref="DetailsModel"/> class.
        /// </summary>
        /// <param name="dbContext">Master catalog database context.</param>
        public DetailsModel(MasterCatalogDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        /// <summary>
        /// The loaded currency entity.
        /// </summary>
        public MasterCurrencyRate Currency { get; set; } = default!;

        /// <summary>
        /// List of mapped country codes parsed from comma-separated string.
        /// </summary>
        public List<string> CountryCodes { get; set; } = new();

        /// <summary>
        /// Sample price calculations for platform tiers.
        /// </summary>
        public List<SamplePricingItem> SampleCalculations { get; set; } = new();

        /// <summary>
        /// Handles HTTP GET requests to load currency data and compute preview conversions.
        /// </summary>
        /// <param name="id">Currency identifier.</param>
        public async Task<IActionResult> OnGetAsync(int id)
        {
            var currency = await _dbContext.MasterCurrencyRates.FindAsync(id);
            if (currency == null)
            {
                return NotFound($"Currency with ID {id} was not found.");
            }

            Currency = currency;

            if (!string.IsNullOrWhiteSpace(currency.AssociatedCountryCodes))
            {
                CountryCodes = currency.AssociatedCountryCodes
                    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                    .ToList();
            }

            // Generate sample pricing simulation
            var baseUsdValues = new[]
            {
                (Name: "Sovereign Starter Annual", Usd: 25.00m),
                (Name: "Growth Expansion Add-on", Usd: 50.00m),
                (Name: "Professional Sovereign Bundle", Usd: 120.00m),
                (Name: "Autonomous Enterprise Core", Usd: 499.00m)
            };

            CultureInfo? culture = null;
            try
            {
                culture = new CultureInfo(currency.CultureName);
            }
            catch
            {
                culture = CultureInfo.InvariantCulture;
            }

            SampleCalculations = baseUsdValues.Select(v =>
            {
                var converted = v.Usd * currency.RateFromUsd;
                var formatted = string.Format(culture, "{0} {1:N2}", currency.CurrencySymbol, converted);

                return new SamplePricingItem
                {
                    TierName = v.Name,
                    BaseUsdPrice = v.Usd,
                    CalculatedLocalPrice = converted,
                    FormattedDisplay = formatted
                };
            }).ToList();

            return Page();
        }

        /// <summary>
        /// Sample pricing calculation row for live FX preview.
        /// </summary>
        public class SamplePricingItem
        {
            /// <summary>
            /// Tier or service label.
            /// </summary>
            public string TierName { get; set; } = string.Empty;

            /// <summary>
            /// Base price in USD.
            /// </summary>
            public decimal BaseUsdPrice { get; set; }

            /// <summary>
            /// Converted local amount.
            /// </summary>
            public decimal CalculatedLocalPrice { get; set; }

            /// <summary>
            /// Localized formatted output string.
            /// </summary>
            public string FormattedDisplay { get; set; } = string.Empty;
        }
    }
}
