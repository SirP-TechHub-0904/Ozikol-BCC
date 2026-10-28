using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;
using Ozikol_BCC.Api.Models;
using Ozikol_BCC.Api.Services;
using Ozikol_BCC.Infrastructure.TenantSupport;

namespace Ozikol_BCC.Api.Controllers
{
    /// <summary>
    /// Tenant-facing feature billing endpoints. Subscriptions are managed centrally; this controller exposes the
    /// tenant's own posture (included features, subscribed add-ons, marketplace), lets administrators subscribe or
    /// toggle auto-renew, and lists invoices. Every mutation is pushed to the tenant's sockets immediately.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Route("api/billing")]
    [Authorize(Roles = "SuperAdmin,Admin")]
    [Tags("9. Billing & Feature Subscriptions")]
    public class BillingApiController : ControllerBase
    {
        private readonly MasterCatalogDbContext _master;
        private readonly IBillingSnapshotService _snapshots;
        private readonly ITenantProvider? _tenantProvider;

        /// <summary>
        /// Initializes a new instance of <see cref="BillingApiController"/>.
        /// </summary>
        /// <param name="master">Master catalog database context.</param>
        /// <param name="snapshots">Snapshot builder and real-time publisher.</param>
        /// <param name="tenantProvider">Current tenant resolver.</param>
        public BillingApiController(MasterCatalogDbContext master, IBillingSnapshotService snapshots, ITenantProvider? tenantProvider = null)
        {
            _master = master;
            _snapshots = snapshots;
            _tenantProvider = tenantProvider;
        }

        /// <summary>
        /// Resolves the current tenant key from the tenant provider, the X-Tenant-Key header, or the host subdomain.
        /// </summary>
        /// <returns>Lower-cased tenant key, or null when it cannot be determined.</returns>
        private string? ResolveTenantKey()
        {
            var candidate = _tenantProvider?.CurrentTenant;
            if (!string.IsNullOrWhiteSpace(candidate)) return candidate.Trim().ToLowerInvariant();

            var header = HttpContext.Request.Headers["X-Tenant-Key"].ToString()?.Trim();
            if (!string.IsNullOrWhiteSpace(header)) return header.ToLowerInvariant();

            var parts = HttpContext.Request.Host.Host.ToLowerInvariant().Split('.');
            if (parts.Length > 1 && !new[] { "localhost", "127", "www", "api", "central", "admin" }.Contains(parts[0]))
                return parts[0];
            return null;
        }

        /// <summary>
        /// Returns the tenant's complete feature billing snapshot.
        /// </summary>
        [HttpGet("features")]
        [ProducesResponseType(typeof(ApiResponse<BillingFeaturesSnapshotDto>), 200)]
        [ProducesResponseType(typeof(ApiResponse<object>), 404)]
        public async Task<IActionResult> GetFeatures(CancellationToken cancellationToken)
        {
            var key = ResolveTenantKey();
            if (key == null) return BadRequest(ApiResponse<object>.FailureResponse("Workspace could not be determined."));

            var snapshot = await _snapshots.BuildAsync(key, cancellationToken);
            if (snapshot == null) return NotFound(ApiResponse<object>.FailureResponse("Workspace could not be found."));

            return Ok(ApiResponse<BillingFeaturesSnapshotDto>.SuccessResponse(snapshot, "Billing features retrieved."));
        }

        /// <summary>
        /// Subscribes the workspace to an optional add-on (or renews a lapsed one).
        /// Zero-cost features activate immediately; paid features create a pending invoice and stay inactive until settled.
        /// </summary>
        /// <param name="request">Feature and cadence.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        [HttpPost("features/subscribe")]
        [ProducesResponseType(typeof(ApiResponse<SubscribeFeatureResultDto>), 200)]
        [ProducesResponseType(typeof(ApiResponse<object>), 400)]
        public async Task<IActionResult> Subscribe([FromBody] SubscribeFeatureRequest request, CancellationToken cancellationToken)
        {
            var key = ResolveTenantKey();
            if (key == null) return BadRequest(ApiResponse<object>.FailureResponse("Workspace could not be determined."));

            if (!Enum.TryParse<SubscriptionBillingDuration>(request.Cadence, true, out var cadence))
                return BadRequest(ApiResponse<object>.FailureResponse("Billing cadence must be Monthly, Quarterly, or Yearly."));

            var tenant = await _master.MasterTenantCatalogs
                .Include(t => t.FeatureSubscriptions)
                .FirstOrDefaultAsync(t => t.TenantKey.ToLower() == key, cancellationToken);
            if (tenant == null) return NotFound(ApiResponse<object>.FailureResponse("Workspace could not be found."));

            var feature = await _master.MasterFeatureCatalogs
                .FirstOrDefaultAsync(f => f.Id == request.FeatureId && f.IsActive, cancellationToken);
            if (feature == null) return BadRequest(ApiResponse<object>.FailureResponse("Feature is not available."));
            if (feature.IsCompulsory) return BadRequest(ApiResponse<object>.FailureResponse("This feature is already included."));

            var now = DateTime.UtcNow;
            var existing = tenant.FeatureSubscriptions.FirstOrDefault(s => s.MasterFeatureCatalogId == feature.Id);
            if (existing != null && existing.IsActive && existing.Status == "Active" && existing.ExpiresAtUtc > now)
                return BadRequest(ApiResponse<object>.FailureResponse("This feature is already active."));

            // Catalog price per cadence, falling back to the standard discounts used at onboarding
            var price = cadence switch
            {
                SubscriptionBillingDuration.Yearly => feature.YearlyPrice > 0 ? feature.YearlyPrice : feature.MonthlyPrice * 10m,
                SubscriptionBillingDuration.Quarterly => feature.QuarterlyPrice > 0 ? feature.QuarterlyPrice : Math.Round(feature.MonthlyPrice * 3m * 0.9m, 2),
                _ => feature.MonthlyPrice
            };
            var expiry = cadence switch
            {
                SubscriptionBillingDuration.Yearly => now.AddYears(1),
                SubscriptionBillingDuration.Quarterly => now.AddMonths(3),
                _ => now.AddMonths(1)
            };
            var free = price <= 0m;

            var sub = existing ?? new MasterTenantFeatureSubscription
            {
                MasterTenantCatalogId = tenant.Id,
                MasterFeatureCatalogId = feature.Id,
                CreatedUtc = now
            };
            sub.DurationType = cadence;
            sub.RecurringPrice = price;
            sub.StartsAtUtc = now;
            sub.ExpiresAtUtc = expiry;
            sub.AutoRenew = true;
            sub.IsActive = free;
            sub.Status = free ? "Active" : "Pending";
            if (existing == null) _master.MasterTenantFeatureSubscriptions.Add(sub);

            var result = new SubscribeFeatureResultDto { Activated = free, RequiresPayment = !free, AmountDue = price };

            if (!free)
            {
                var invoice = new MasterBillingTransaction
                {
                    MasterTenantCatalogId = tenant.Id,
                    MasterTenantFeatureSubscriptionId = sub.Id,
                    InvoiceNumber = await NextInvoiceNumberAsync(now, cancellationToken),
                    Amount = price,
                    Currency = "USD",
                    Status = "Pending",
                    Notes = $"{feature.Name} — {cadence} subscription",
                    CreatedUtc = now
                };
                _master.MasterBillingTransactions.Add(invoice);
                result.InvoiceId = invoice.Id;
                result.InvoiceNumber = invoice.InvoiceNumber;
            }

            await _master.SaveChangesAsync(cancellationToken);
            await _snapshots.PublishAsync(key, cancellationToken);

            return Ok(ApiResponse<SubscribeFeatureResultDto>.SuccessResponse(result,
                free ? $"{feature.Name} is now active." : $"Invoice {result.InvoiceNumber} created for {feature.Name}."));
        }

        /// <summary>
        /// Toggles automatic renewal for a subscribed add-on.
        /// </summary>
        /// <param name="subscriptionId">Subscription identifier.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        [HttpPost("features/{subscriptionId:guid}/auto-renew")]
        [ProducesResponseType(typeof(ApiResponse<bool>), 200)]
        [ProducesResponseType(typeof(ApiResponse<object>), 404)]
        public async Task<IActionResult> ToggleAutoRenew(Guid subscriptionId, CancellationToken cancellationToken)
        {
            var key = ResolveTenantKey();
            if (key == null) return BadRequest(ApiResponse<object>.FailureResponse("Workspace could not be determined."));

            // Scoping by tenant key guarantees a workspace can only touch its own subscriptions
            var sub = await _master.MasterTenantFeatureSubscriptions
                .Include(s => s.MasterFeatureCatalog)
                .FirstOrDefaultAsync(s => s.Id == subscriptionId && s.MasterTenantCatalog.TenantKey.ToLower() == key, cancellationToken);
            if (sub == null) return NotFound(ApiResponse<object>.FailureResponse("Subscription not found."));

            sub.AutoRenew = !sub.AutoRenew;
            await _master.SaveChangesAsync(cancellationToken);
            await _snapshots.PublishAsync(key, cancellationToken);

            return Ok(ApiResponse<bool>.SuccessResponse(sub.AutoRenew,
                $"Auto-renew for {sub.MasterFeatureCatalog?.Name} is now {(sub.AutoRenew ? "on" : "off")}."));
        }

        /// <summary>
        /// Lists the workspace's billing invoices, newest first.
        /// </summary>
        /// <param name="cancellationToken">Cancellation token.</param>
        [HttpGet("invoices")]
        [ProducesResponseType(typeof(ApiResponse<List<BillingInvoiceDto>>), 200)]
        public async Task<IActionResult> GetInvoices(CancellationToken cancellationToken)
        {
            var key = ResolveTenantKey();
            if (key == null) return BadRequest(ApiResponse<object>.FailureResponse("Workspace could not be determined."));

            var invoices = await _master.MasterBillingTransactions
                .AsNoTracking()
                .Where(t => t.Tenant!.TenantKey.ToLower() == key)
                .OrderByDescending(t => t.CreatedUtc)
                .Take(200)
                .Select(t => new BillingInvoiceDto
                {
                    Id = t.Id,
                    InvoiceNumber = t.InvoiceNumber,
                    Description = t.FeatureSubscription != null
                        ? t.FeatureSubscription.MasterFeatureCatalog.Name
                        : (t.Notes ?? "Account charge"),
                    Amount = t.Amount,
                    Currency = t.Currency,
                    Status = t.Status,
                    PaymentProvider = t.PaymentProvider,
                    Reference = t.TransactionRef,
                    CreatedUtc = t.CreatedUtc
                })
                .ToListAsync(cancellationToken);

            return Ok(ApiResponse<List<BillingInvoiceDto>>.SuccessResponse(invoices, "Invoices retrieved."));
        }

        /// <summary>
        /// Generates the next sequential invoice number (INV-YYYYMM-NNNNN) for the given month.
        /// </summary>
        /// <param name="now">Reference timestamp.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        private async Task<string> NextInvoiceNumberAsync(DateTime now, CancellationToken cancellationToken)
        {
            var prefix = $"INV-{now:yyyyMM}-";
            var count = await _master.MasterBillingTransactions
                .CountAsync(t => t.InvoiceNumber != null && t.InvoiceNumber.StartsWith(prefix), cancellationToken);
            return $"{prefix}{count + 1:D5}";
        }
    }
}
