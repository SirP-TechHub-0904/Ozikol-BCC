using System;
using System.ComponentModel.DataAnnotations;
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
    /// PageModel for modifying an existing currency's FX exchange multiplier, culture formatting,
    /// GeoIP country associations, and active status.
    /// </summary>
    public class EditModel : PageModel
    {
        private readonly MasterCatalogDbContext _dbContext;

        /// <summary>
        /// Initializes a new instance of the <see cref="EditModel"/> class.
        /// </summary>
        /// <param name="dbContext">Master catalog database context.</param>
        public EditModel(MasterCatalogDbContext dbContext)
        {
            _dbContext = dbContext;
        }

        /// <summary>
        /// Primary key identifier of the currency being edited.
        /// </summary>
        [FromRoute]
        public int Id { get; set; }

        /// <summary>
        /// Input model carrying edited currency values.
        /// </summary>
        [BindProperty]
        public CurrencyEditInputModel Input { get; set; } = new();

        /// <summary>
        /// Whether this currency is currently the global base currency.
        /// </summary>
        public bool IsCurrentBaseCurrency { get; set; }

        /// <summary>
        /// Handles HTTP GET requests to load currency data into the edit form.
        /// </summary>
        public async Task<IActionResult> OnGetAsync(int id)
        {
            var currency = await _dbContext.MasterCurrencyRates.FindAsync(id);
            if (currency == null)
            {
                return NotFound($"Currency with ID {id} was not found.");
            }

            Id = currency.Id;
            IsCurrentBaseCurrency = currency.IsBaseCurrency;

            Input = new CurrencyEditInputModel
            {
                CurrencyCode = currency.CurrencyCode,
                CurrencySymbol = currency.CurrencySymbol,
                DisplayName = currency.DisplayName,
                CultureName = currency.CultureName,
                PillLabel = currency.PillLabel,
                RateFromUsd = currency.RateFromUsd,
                IsBaseCurrency = currency.IsBaseCurrency,
                IsActive = currency.IsActive,
                SortOrder = currency.SortOrder,
                AssociatedCountryCodes = currency.AssociatedCountryCodes
            };

            return Page();
        }

        /// <summary>
        /// Handles HTTP POST requests to validate and commit currency modifications.
        /// </summary>
        public async Task<IActionResult> OnPostAsync(int id)
        {
            if (!ModelState.IsValid)
            {
                return Page();
            }

            var currency = await _dbContext.MasterCurrencyRates.FindAsync(id);
            if (currency == null)
            {
                return NotFound();
            }

            var cleanCode = Input.CurrencyCode.Trim().ToUpperInvariant();

            // Check if code was changed and already exists on another record
            var duplicateCode = await _dbContext.MasterCurrencyRates
                .AnyAsync(c => c.Id != id && c.CurrencyCode.ToUpper() == cleanCode);

            if (duplicateCode)
            {
                ModelState.AddModelError("Input.CurrencyCode", $"Currency code '{cleanCode}' is already in use by another currency.");
                return Page();
            }

            // Cannot deactivate the base currency
            if (currency.IsBaseCurrency && !Input.IsActive)
            {
                ModelState.AddModelError("Input.IsActive", "The global base currency cannot be deactivated.");
                return Page();
            }

            // If promoting to base currency, demote existing bases
            if (Input.IsBaseCurrency && !currency.IsBaseCurrency)
            {
                var existingBases = await _dbContext.MasterCurrencyRates
                    .Where(c => c.IsBaseCurrency && c.Id != id)
                    .ToListAsync();

                foreach (var b in existingBases)
                {
                    b.IsBaseCurrency = false;
                    b.UpdatedAtUtc = DateTime.UtcNow;
                }

                Input.RateFromUsd = 1.0m;
            }

            currency.CurrencyCode = cleanCode;
            currency.CurrencySymbol = Input.CurrencySymbol.Trim();
            currency.DisplayName = Input.DisplayName.Trim();
            currency.CultureName = Input.CultureName.Trim();
            currency.PillLabel = string.IsNullOrWhiteSpace(Input.PillLabel) 
                ? $"{cleanCode} ({Input.CurrencySymbol.Trim()})" 
                : Input.PillLabel.Trim();
            currency.RateFromUsd = Input.IsBaseCurrency ? 1.0m : Input.RateFromUsd;
            currency.IsBaseCurrency = Input.IsBaseCurrency;
            currency.IsActive = Input.IsActive;
            currency.SortOrder = Input.SortOrder;
            currency.AssociatedCountryCodes = string.IsNullOrWhiteSpace(Input.AssociatedCountryCodes) 
                ? null 
                : Input.AssociatedCountryCodes.Trim().ToUpperInvariant();
            currency.UpdatedAtUtc = DateTime.UtcNow;

            await _dbContext.SaveChangesAsync();

            TempData["StatusMessage"] = $"Currency {currency.CurrencyCode} ({currency.DisplayName}) updated successfully.";
            return RedirectToPage("./Index");
        }

        /// <summary>
        /// Input model carrying edited currency values.
        /// </summary>
        public class CurrencyEditInputModel
        {
            /// <summary>
            /// ISO 4217 currency code.
            /// </summary>
            [Required(ErrorMessage = "Currency code is required.")]
            [StringLength(10, MinimumLength = 2)]
            [Display(Name = "Currency Code (ISO)")]
            public string CurrencyCode { get; set; } = string.Empty;

            /// <summary>
            /// Visual currency symbol.
            /// </summary>
            [Required(ErrorMessage = "Currency symbol is required.")]
            [MaxLength(10)]
            [Display(Name = "Currency Symbol")]
            public string CurrencySymbol { get; set; } = "$";

            /// <summary>
            /// User-friendly localized display name.
            /// </summary>
            [Required(ErrorMessage = "Display name is required.")]
            [MaxLength(100)]
            [Display(Name = "Display Name")]
            public string DisplayName { get; set; } = string.Empty;

            /// <summary>
            /// .NET CultureInfo string.
            /// </summary>
            [Required(ErrorMessage = "Culture name is required.")]
            [MaxLength(20)]
            [Display(Name = ".NET Culture Name")]
            public string CultureName { get; set; } = "en-US";

            /// <summary>
            /// Selector pill label.
            /// </summary>
            [MaxLength(30)]
            [Display(Name = "Selector Pill Label")]
            public string? PillLabel { get; set; }

            /// <summary>
            /// Exchange rate multiplier from 1.0 USD base.
            /// </summary>
            [Required(ErrorMessage = "Exchange rate multiplier is required.")]
            [Range(0.000001, 10000000.0)]
            [Display(Name = "Exchange Rate from USD")]
            public decimal RateFromUsd { get; set; } = 1.0m;

            /// <summary>
            /// Indicates whether this currency is the global base pricing reference.
            /// </summary>
            [Display(Name = "Global Base Currency")]
            public bool IsBaseCurrency { get; set; }

            /// <summary>
            /// Indicates whether this currency is active for customer checkout.
            /// </summary>
            [Display(Name = "Active for Checkout")]
            public bool IsActive { get; set; } = true;

            /// <summary>
            /// Display ordering index in lists and dropdowns.
            /// </summary>
            [Display(Name = "Display Sort Order")]
            public int SortOrder { get; set; } = 10;

            /// <summary>
            /// Comma-separated ISO country codes mapped to this currency.
            /// </summary>
            [MaxLength(255)]
            [Display(Name = "Mapped Country Codes")]
            public string? AssociatedCountryCodes { get; set; }
        }
    }
}
