using System;
using System.ComponentModel.DataAnnotations;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Areas.Admin.Pages.Currencies
{
    /// <summary>
    /// PageModel for registering a new supported currency and exchange multiplier into the Master Catalog DB.
    /// Handles unique validation, base currency reassignment, and regional country associations.
    /// </summary>
    public class CreateModel : PageModel
    {
        private readonly MasterCatalogDbContext _dbContext;

        /// <summary>
        /// Initializes a new instance of the <see cref="CreateModel"/> class.
        /// </summary>
        /// <param name="dbContext">Master catalog database context.</param>
        public CreateModel(MasterCatalogDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        /// <summary>
        /// Form input model for adding a currency.
        /// </summary>
        [BindProperty]
        public CurrencyInputModel Input { get; set; } = new();

        /// <summary>
        /// Handles HTTP GET requests to initialize the form.
        /// </summary>
        public IActionResult OnGet()
        {
            return Page();
        }

        /// <summary>
        /// Handles HTTP POST requests to validate and save a new currency rate record.
        /// </summary>
        public async Task<IActionResult> OnPostAsync()
        {
            if (!ModelState.IsValid)
            {
                return Page();
            }

            var cleanCode = Input.CurrencyCode.Trim().ToUpperInvariant();

            // Verify unique currency code
            var exists = await _dbContext.MasterCurrencyRates
                .AnyAsync(c => c.CurrencyCode.ToUpper() == cleanCode);

            if (exists)
            {
                ModelState.AddModelError("Input.CurrencyCode", $"Currency code '{cleanCode}' is already configured.");
                return Page();
            }

            // If this is set as base currency, unmark other currencies
            if (Input.IsBaseCurrency)
            {
                var existingBases = await _dbContext.MasterCurrencyRates
                    .Where(c => c.IsBaseCurrency)
                    .ToListAsync();

                foreach (var b in existingBases)
                {
                    b.IsBaseCurrency = false;
                    b.UpdatedAtUtc = DateTime.UtcNow;
                }

                // Base currency always has RateFromUsd = 1.0
                Input.RateFromUsd = 1.0m;
            }

            var currency = new MasterCurrencyRate
            {
                CurrencyCode = cleanCode,
                CurrencySymbol = Input.CurrencySymbol.Trim(),
                DisplayName = Input.DisplayName.Trim(),
                CultureName = Input.CultureName.Trim(),
                PillLabel = string.IsNullOrWhiteSpace(Input.PillLabel) 
                    ? $"{cleanCode} ({Input.CurrencySymbol.Trim()})" 
                    : Input.PillLabel.Trim(),
                RateFromUsd = Input.RateFromUsd,
                IsBaseCurrency = Input.IsBaseCurrency,
                IsActive = Input.IsActive,
                SortOrder = Input.SortOrder,
                AssociatedCountryCodes = string.IsNullOrWhiteSpace(Input.AssociatedCountryCodes) 
                    ? null 
                    : Input.AssociatedCountryCodes.Trim().ToUpperInvariant(),
                CreatedAtUtc = DateTime.UtcNow,
                UpdatedAtUtc = DateTime.UtcNow
            };

            _dbContext.MasterCurrencyRates.Add(currency);
            await _dbContext.SaveChangesAsync();

            TempData["StatusMessage"] = $"Currency {currency.CurrencyCode} ({currency.DisplayName}) added successfully.";
            return RedirectToPage("./Index");
        }

        /// <summary>
        /// Input model capturing currency details and FX rate metadata.
        /// </summary>
        public class CurrencyInputModel
        {
            /// <summary>
            /// ISO 4217 3-letter currency code (e.g., USD, EUR, NGN).
            /// </summary>
            [Required(ErrorMessage = "Currency code is required.")]
            [StringLength(10, MinimumLength = 2, ErrorMessage = "Currency code must be between 2 and 10 characters.")]
            [Display(Name = "Currency Code (ISO)")]
            public string CurrencyCode { get; set; } = string.Empty;

            /// <summary>
            /// Visual currency symbol (e.g., $, €, ₦, £).
            /// </summary>
            [Required(ErrorMessage = "Currency symbol is required.")]
            [MaxLength(10)]
            [Display(Name = "Currency Symbol")]
            public string CurrencySymbol { get; set; } = "$";

            /// <summary>
            /// User-friendly localized display name (e.g., US Dollar, Nigerian Naira).
            /// </summary>
            [Required(ErrorMessage = "Display name is required.")]
            [MaxLength(100)]
            [Display(Name = "Display Name")]
            public string DisplayName { get; set; } = string.Empty;

            /// <summary>
            /// .NET CultureInfo string (e.g., en-US, en-NG, fr-FR).
            /// </summary>
            [Required(ErrorMessage = "Culture name is required.")]
            [MaxLength(20)]
            [Display(Name = ".NET Culture Name")]
            public string CultureName { get; set; } = "en-US";

            /// <summary>
            /// Compact label for UI selector pills (e.g., USD ($), NGN (₦)).
            /// </summary>
            [MaxLength(30)]
            [Display(Name = "Selector Pill Label")]
            public string? PillLabel { get; set; }

            /// <summary>
            /// Exchange rate multiplier from 1.0 USD base.
            /// </summary>
            [Required(ErrorMessage = "Exchange rate multiplier is required.")]
            [Range(0.000001, 10000000.0, ErrorMessage = "Rate must be greater than zero.")]
            [Display(Name = "Exchange Rate from USD")]
            public decimal RateFromUsd { get; set; } = 1.0m;

            /// <summary>
            /// Indicates whether this currency is the global base pricing reference.
            /// </summary>
            [Display(Name = "Global Base Currency")]
            public bool IsBaseCurrency { get; set; }

            /// <summary>
            /// Indicates whether this currency is active for customer checkout and auto-detection.
            /// </summary>
            [Display(Name = "Active for Checkout")]
            public bool IsActive { get; set; } = true;

            /// <summary>
            /// Display ordering index in lists and dropdowns.
            /// </summary>
            [Display(Name = "Display Sort Order")]
            public int SortOrder { get; set; } = 10;

            /// <summary>
            /// Comma-separated ISO 3166-1 alpha-2 country codes mapped to this currency (e.g. US,CA).
            /// </summary>
            [MaxLength(255)]
            [Display(Name = "Mapped Country Codes")]
            public string? AssociatedCountryCodes { get; set; }
        }
    }
}
