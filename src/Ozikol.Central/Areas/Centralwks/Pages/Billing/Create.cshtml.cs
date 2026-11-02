using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Areas.Centralwks.Pages.Billing
{
    /// <summary>
    /// PageModel for manually recording or issuing a financial transaction / invoice in the master ledger.
    /// Supports linking to specific tenant databases and optional feature subscription plans.
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
        /// Input model capturing invoice and transaction details.
        /// </summary>
        [BindProperty]
        public TransactionInputModel Input { get; set; } = new();

        /// <summary>
        /// Selectable list of active tenant organizations.
        /// </summary>
        public List<SelectListItem> TenantOptions { get; set; } = new();

        /// <summary>
        /// Selectable list of feature subscriptions across tenants for optional linking.
        /// </summary>
        public List<SelectListItem> SubscriptionOptions { get; set; } = new();

        /// <summary>
        /// Feedback or validation alert message.
        /// </summary>
        [TempData]
        public string? StatusMessage { get; set; }

        /// <summary>
        /// Handles HTTP GET requests to populate dropdown options and prepare a fresh transaction form.
        /// </summary>
        /// <param name="tenantId">Optional pre-selected tenant identifier.</param>
        /// <param name="subscriptionId">Optional pre-selected subscription identifier.</param>
        /// <returns>Page result rendering the form.</returns>
        public async Task<IActionResult> OnGetAsync(int? tenantId = null, Guid? subscriptionId = null)
        {
            await PopulateDropdownsAsync();

            if (tenantId.HasValue)
            {
                Input.TenantId = tenantId.Value;
            }

            if (subscriptionId.HasValue)
            {
                Input.SubscriptionId = subscriptionId.Value;
            }

            return Page();
        }

        /// <summary>
        /// Handles HTTP POST requests to validate and record a financial transaction into the master ledger.
        /// </summary>
        /// <returns>Redirects to the transaction details page upon success, or re-renders on validation error.</returns>
        public async Task<IActionResult> OnPostAsync()
        {
            if (!ModelState.IsValid)
            {
                await PopulateDropdownsAsync();
                return Page();
            }

            // Verify the tenant exists
            var tenantExists = await _dbContext.MasterTenantCatalogs.AnyAsync(t => t.Id == Input.TenantId);
            if (!tenantExists)
            {
                ModelState.AddModelError("Input.TenantId", "The selected tenant was not found in the master catalog.");
                await PopulateDropdownsAsync();
                return Page();
            }

            // Generate next sequential invoice number format: INV-YYYYMM-XXXXX
            var currentMonthPrefix = $"INV-{DateTime.UtcNow:yyyyMM}-";
            var monthlyCount = await _dbContext.MasterBillingTransactions
                .CountAsync(t => t.InvoiceNumber != null && t.InvoiceNumber.StartsWith(currentMonthPrefix));

            var invoiceNumber = $"{currentMonthPrefix}{(monthlyCount + 1):D5}";

            var transaction = new MasterBillingTransaction
            {
                Id = Guid.NewGuid(),
                MasterTenantCatalogId = Input.TenantId,
                MasterTenantFeatureSubscriptionId = Input.SubscriptionId,
                InvoiceNumber = invoiceNumber,
                Amount = Input.Amount,
                Currency = Input.Currency.Trim().ToUpperInvariant(),
                PaymentProvider = Input.PaymentProvider,
                TransactionRef = string.IsNullOrWhiteSpace(Input.TransactionRef) ? $"TXN-{Guid.NewGuid():N}".Substring(0, 16).ToUpperInvariant() : Input.TransactionRef.Trim(),
                Status = Input.Status,
                Notes = Input.Notes,
                CreatedUtc = DateTime.UtcNow,
                UpdatedUtc = DateTime.UtcNow
            };

            _dbContext.MasterBillingTransactions.Add(transaction);
            await _dbContext.SaveChangesAsync();

            StatusMessage = $"Transaction {invoiceNumber} for {transaction.Currency} {transaction.Amount:N2} recorded successfully.";
            return RedirectToPage("./Details", new { id = transaction.Id });
        }

        private async Task PopulateDropdownsAsync()
        {
            // Populate active tenants
            var tenants = await _dbContext.MasterTenantCatalogs
                .OrderBy(t => t.OrganizationName)
                .Select(t => new { t.Id, t.OrganizationName, t.TenantKey, t.PrimaryDomain })
                .ToListAsync();

            TenantOptions = tenants.Select(t => new SelectListItem
            {
                Value = t.Id.ToString(),
                Text = $"{t.OrganizationName} ({t.TenantKey} - {t.PrimaryDomain})"
            }).ToList();

            // Populate active subscriptions
            var subscriptions = await _dbContext.MasterTenantFeatureSubscriptions
                .Include(s => s.MasterFeatureCatalog)
                .Include(s => s.MasterTenantCatalog)
                .OrderByDescending(s => s.CreatedUtc)
                .Take(50)
                .ToListAsync();

            SubscriptionOptions = subscriptions.Select(s => new SelectListItem
            {
                Value = s.Id.ToString(),
                Text = $"{s.MasterTenantCatalog?.OrganizationName ?? "Tenant"} — {s.MasterFeatureCatalog?.Name ?? "Feature"} ({s.DurationType})"
            }).ToList();
        }

        /// <summary>
        /// Input model capturing form data for recording a billing transaction.
        /// </summary>
        public class TransactionInputModel
        {
            /// <summary>
            /// Identifier of the tenant organization.
            /// </summary>
            [Required(ErrorMessage = "Please select a tenant organization.")]
            [Display(Name = "Tenant Organization")]
            public int TenantId { get; set; }

            /// <summary>
            /// Optional linked feature subscription ID.
            /// </summary>
            [Display(Name = "Linked Subscription (Optional)")]
            public Guid? SubscriptionId { get; set; }

            /// <summary>
            /// Transaction monetary amount. Positive for payments/credits, negative for refunds.
            /// </summary>
            [Required(ErrorMessage = "Transaction amount is required.")]
            [Range(-999999.99, 999999.99, ErrorMessage = "Amount must be within valid limits.")]
            [Display(Name = "Amount")]
            public decimal Amount { get; set; } = 0.00m;

            /// <summary>
            /// ISO 4217 currency code (e.g., USD, EUR, NGN, GBP).
            /// </summary>
            [Required(ErrorMessage = "Currency is required.")]
            [MaxLength(10)]
            [Display(Name = "Currency Code")]
            public string Currency { get; set; } = "USD";

            /// <summary>
            /// Payment gateway or settlement channel.
            /// </summary>
            [Required(ErrorMessage = "Payment provider is required.")]
            [MaxLength(50)]
            [Display(Name = "Payment Provider / Method")]
            public string PaymentProvider { get; set; } = "Stripe";

            /// <summary>
            /// External gateway transaction ID or bank reference code.
            /// </summary>
            [MaxLength(250)]
            [Display(Name = "External Reference ID")]
            public string? TransactionRef { get; set; }

            /// <summary>
            /// Transaction status.
            /// </summary>
            [Required]
            [MaxLength(30)]
            [Display(Name = "Settlement Status")]
            public string Status { get; set; } = "Completed";

            /// <summary>
            /// Internal audit notes, memo, or invoice description.
            /// </summary>
            [MaxLength(500)]
            [Display(Name = "Audit Memo / Notes")]
            public string? Notes { get; set; }
        }
    }
}
