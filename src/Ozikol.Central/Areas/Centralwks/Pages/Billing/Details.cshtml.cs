using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Areas.Centralwks.Pages.Billing
{
    /// <summary>
    /// PageModel displaying the deep financial audit view and printable invoice for a specific transaction.
    /// Provides invoice line items, tenant context, gateway reference audit, and status adjustment actions.
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
        /// The loaded billing transaction entity with tenant and subscription navigation data.
        /// </summary>
        public MasterBillingTransaction Transaction { get; set; } = default!;

        /// <summary>
        /// Status or alert message displayed to the admin.
        /// </summary>
        [TempData]
        public string? StatusMessage { get; set; }

        /// <summary>
        /// Handles HTTP GET requests to load and display the full transaction details and invoice.
        /// </summary>
        /// <param name="id">The unique identifier of the billing transaction.</param>
        /// <returns>Page result or NotFound if the transaction does not exist.</returns>
        public async Task<IActionResult> OnGetAsync(Guid id)
        {
            var txn = await _dbContext.MasterBillingTransactions
                .Include(t => t.Tenant)
                .Include(t => t.FeatureSubscription)
                    .ThenInclude(s => s!.MasterFeatureCatalog)
                .FirstOrDefaultAsync(t => t.Id == id);

            if (txn == null)
            {
                return NotFound($"Transaction with ID {id} was not found.");
            }

            Transaction = txn;
            return Page();
        }

        /// <summary>
        /// Updates the settlement status of the transaction (e.g., to Completed, Refunded, Failed).
        /// </summary>
        /// <param name="id">Transaction identifier.</param>
        /// <param name="newStatus">Target status string.</param>
        /// <returns>Redirects back to Details page.</returns>
        public async Task<IActionResult> OnPostUpdateStatusAsync(Guid id, string newStatus)
        {
            var txn = await _dbContext.MasterBillingTransactions.FindAsync(id);
            if (txn == null)
            {
                return NotFound();
            }

            var previousStatus = txn.Status;
            txn.Status = newStatus;
            txn.UpdatedUtc = DateTime.UtcNow;

            await _dbContext.SaveChangesAsync();

            StatusMessage = $"Transaction status updated from '{previousStatus}' to '{newStatus}'.";
            return RedirectToPage(new { id });
        }
    }
}
