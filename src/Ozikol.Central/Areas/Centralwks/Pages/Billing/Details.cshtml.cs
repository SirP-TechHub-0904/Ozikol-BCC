using System;
using System.Collections.Generic;
using System.Linq;
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
        /// When marked as Completed, automatically activates and extends all capability subscriptions covered by the invoice.
        /// </summary>
        /// <param name="id">Transaction identifier.</param>
        /// <param name="newStatus">Target status string.</param>
        /// <returns>Redirects back to Details page.</returns>
        public async Task<IActionResult> OnPostUpdateStatusAsync(Guid id, string newStatus)
        {
            var txn = await _dbContext.MasterBillingTransactions
                .Include(t => t.Tenant)
                    .ThenInclude(tn => tn!.FeatureSubscriptions)
                .Include(t => t.FeatureSubscription)
                    .ThenInclude(s => s!.MasterFeatureCatalog)
                .FirstOrDefaultAsync(t => t.Id == id);
            if (txn == null)
            {
                return NotFound();
            }

            var now = DateTime.UtcNow;
            var previousStatus = txn.Status;
            txn.Status = newStatus;
            txn.UpdatedUtc = now;

            if (string.Equals(newStatus, "Completed", StringComparison.OrdinalIgnoreCase) && txn.Tenant != null)
            {
                await ActivateInvoiceSubscriptionsAsync(txn, txn.Tenant, now);
            }

            _dbContext.MasterAuditLogs.Add(new MasterAuditLog
            {
                UserId = User.Identity?.Name ?? "SuperAdmin",
                UserName = User.Identity?.Name ?? "SuperAdmin",
                Action = "CentralBilling.StatusUpdated",
                EntityType = "MasterBillingTransaction",
                EntityId = txn.Id.ToString(),
                Summary = $"Central Admin updated Invoice {txn.InvoiceNumber} ({txn.Currency} {txn.Amount:N2}) status from '{previousStatus}' to '{newStatus}'.",
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers.UserAgent.ToString(),
                CreatedUtc = now
            });

            await _dbContext.SaveChangesAsync();

            StatusMessage = string.Equals(newStatus, "Completed", StringComparison.OrdinalIgnoreCase)
                ? $"Invoice {txn.InvoiceNumber} marked as Completed and tenant capabilities activated."
                : $"Transaction status updated from '{previousStatus}' to '{newStatus}'.";
            return RedirectToPage(new { id });
        }

        private async Task ActivateInvoiceSubscriptionsAsync(
            MasterBillingTransaction invoice,
            MasterTenantCatalog tenant,
            DateTime now)
        {
            if (!Enum.TryParse<SubscriptionBillingDuration>(invoice.BillingCadence, true, out var fallbackCadence))
            {
                fallbackCadence = SubscriptionBillingDuration.Monthly;
            }

            var codes = (invoice.FeatureCodesCsv ?? string.Empty)
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(c => c.ToLowerInvariant())
                .ToHashSet();

            var featuresToRenew = new List<MasterFeatureCatalog>();
            if (codes.Count > 0)
            {
                featuresToRenew = await _dbContext.MasterFeatureCatalogs
                    .Where(f => codes.Contains(f.FeatureCode.ToLower()))
                    .ToListAsync();
            }
            else if (invoice.MasterTenantFeatureSubscriptionId.HasValue)
            {
                var subMatch = tenant.FeatureSubscriptions.FirstOrDefault(s => s.Id == invoice.MasterTenantFeatureSubscriptionId.Value);
                if (subMatch != null)
                {
                    var feat = await _dbContext.MasterFeatureCatalogs.FirstOrDefaultAsync(f => f.Id == subMatch.MasterFeatureCatalogId);
                    if (feat != null) featuresToRenew.Add(feat);
                }
            }

            foreach (var feature in featuresToRenew)
            {
                var sub = tenant.FeatureSubscriptions.FirstOrDefault(s => s.MasterFeatureCatalogId == feature.Id);
                bool hasCustomMonthly = tenant.UseCustomPricing && sub?.CustomPriceOverride != null;
                bool hasCustomYearly = tenant.UseCustomPricing && sub?.CustomYearlyPriceOverride != null;

                decimal effectiveMonthlyUsd = hasCustomMonthly ? sub!.CustomPriceOverride!.Value : feature.MonthlyPrice;
                decimal effectiveYearlyUsd = hasCustomYearly
                    ? sub!.CustomYearlyPriceOverride!.Value
                    : (feature.YearlyPrice > 0 ? feature.YearlyPrice : effectiveMonthlyUsd * 10m);

                var itemCadence = (effectiveMonthlyUsd <= 0m && effectiveYearlyUsd > 0m)
                    ? SubscriptionBillingDuration.Yearly
                    : fallbackCadence;

                decimal effectiveUsdPrice = itemCadence == SubscriptionBillingDuration.Yearly
                    ? effectiveYearlyUsd
                    : effectiveMonthlyUsd;

                if (sub != null)
                {
                    var baseStart = (!sub.IsTrialPeriod && sub.ExpiresAtUtc > now) ? sub.ExpiresAtUtc : now;
                    sub.StartsAtUtc = now;
                    sub.ExpiresAtUtc = itemCadence switch
                    {
                        SubscriptionBillingDuration.Yearly => baseStart.AddYears(1),
                        SubscriptionBillingDuration.Quarterly => baseStart.AddMonths(3),
                        _ => baseStart.AddMonths(1)
                    };
                    sub.DurationType = itemCadence;
                    sub.RecurringPrice = effectiveUsdPrice;
                    sub.IsActive = true;
                    sub.Status = "Active";
                    sub.IsTrialPeriod = false;
                    sub.HasUsedFreeTrial = true;
                }
                else
                {
                    _dbContext.MasterTenantFeatureSubscriptions.Add(new MasterTenantFeatureSubscription
                    {
                        Id = Guid.NewGuid(),
                        MasterTenantCatalogId = tenant.Id,
                        MasterFeatureCatalogId = feature.Id,
                        DurationType = itemCadence,
                        RecurringPrice = effectiveUsdPrice,
                        StartsAtUtc = now,
                        ExpiresAtUtc = itemCadence switch
                        {
                            SubscriptionBillingDuration.Yearly => now.AddYears(1),
                            SubscriptionBillingDuration.Quarterly => now.AddMonths(3),
                            _ => now.AddMonths(1)
                        },
                        AutoRenew = true,
                        IsActive = true,
                        Status = "Active",
                        HasUsedFreeTrial = true,
                        IsTrialPeriod = false,
                        CreatedUtc = now
                    });
                }
            }
        }
    }
}
