using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;
using Ozikol_BCC.Api.Models;
using Ozikol_BCC.Api.Services;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Infrastructure.TenantSupport;
using Ozikol_BCC.Persistence.EF.SQL;

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
        private readonly DashboardDbContext? _tenantDb;

        /// <summary>
        /// Initializes a new instance of <see cref="BillingApiController"/>.
        /// </summary>
        /// <param name="master">Master catalog database context.</param>
        /// <param name="snapshots">Snapshot builder and real-time publisher.</param>
        /// <param name="tenantProvider">Current tenant resolver.</param>
        /// <param name="tenantDb">Tenant workspace database context for activity audit logging.</param>
        public BillingApiController(
            MasterCatalogDbContext master,
            IBillingSnapshotService snapshots,
            ITenantProvider? tenantProvider = null,
            DashboardDbContext? tenantDb = null)
        {
            _master = master;
            _snapshots = snapshots;
            _tenantProvider = tenantProvider;
            _tenantDb = tenantDb;
        }

        /// <summary>
        /// Resolves the current tenant key from the tenant provider, JWT claims, X-Tenant-Key header, or Origin/Referer/Host subdomain.
        /// </summary>
        /// <returns>Lower-cased tenant key, or null when it cannot be determined.</returns>
        private string? ResolveTenantKey()
        {
            var candidate = _tenantProvider?.CurrentTenant;
            if (!string.IsNullOrWhiteSpace(candidate) && !candidate.Equals("default", StringComparison.OrdinalIgnoreCase))
                return candidate.Trim().ToLowerInvariant();

            var claim = User.FindFirst("tenant_key")?.Value ?? User.FindFirst("tenant")?.Value;
            if (!string.IsNullOrWhiteSpace(claim)) return claim.Trim().ToLowerInvariant();

            var header = HttpContext.Request.Headers["X-Tenant-Key"].ToString()?.Trim();
            if (!string.IsNullOrWhiteSpace(header)) return header.ToLowerInvariant();

            string? TryExtractSubdomain(string? rawHostOrUrl)
            {
                if (string.IsNullOrWhiteSpace(rawHostOrUrl)) return null;
                var clean = rawHostOrUrl.Trim().ToLowerInvariant()
                    .Replace("https://", "")
                    .Replace("http://", "")
                    .Split('/')[0]
                    .Split(':')[0];
                var parts = clean.Split('.');
                if (parts.Length > 1 && !new[] { "localhost", "127", "www", "api", "central", "admin" }.Contains(parts[0]))
                    return parts[0];
                return null;
            }

            var fromDomainHeader = TryExtractSubdomain(HttpContext.Request.Headers["X-Tenant-Domain"].ToString());
            if (!string.IsNullOrWhiteSpace(fromDomainHeader)) return fromDomainHeader;

            var fromOrigin = TryExtractSubdomain(HttpContext.Request.Headers["Origin"].ToString());
            if (!string.IsNullOrWhiteSpace(fromOrigin)) return fromOrigin;

            var fromReferer = TryExtractSubdomain(HttpContext.Request.Headers["Referer"].ToString());
            if (!string.IsNullOrWhiteSpace(fromReferer)) return fromReferer;

            return TryExtractSubdomain(HttpContext.Request.Host.Host);
        }

        /// <summary>
        /// Returns the tenant's complete feature billing snapshot.
        /// </summary>
        [HttpGet("features")]
        [ProducesResponseType(typeof(ApiResponse<BillingFeaturesSnapshotDto>), 200)]
        [ProducesResponseType(typeof(ApiResponse<object>), 404)]
        public async Task<IActionResult> GetFeatures(CancellationToken cancellationToken)
        {
            var key = ResolveTenantKey() ?? "workspace";

            var snapshot = await _snapshots.BuildAsync(key, cancellationToken);
            if (snapshot == null) return NotFound(ApiResponse<object>.FailureResponse("Workspace could not be found."));

            return Ok(ApiResponse<BillingFeaturesSnapshotDto>.SuccessResponse(snapshot, "Billing features retrieved."));
        }

        /// <summary>
        /// Installs/activates or deactivates/uninstalls a modular capability for the current tenant workspace.
        /// Synchronizes immediately with Central MasterCatalogDbContext and broadcasts BillingUpdated over SignalR.
        /// </summary>
        /// <param name="request">Feature identifier/code and desired active state.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        [HttpPost("features/toggle-active")]
        [ProducesResponseType(typeof(ApiResponse<BillingFeaturesSnapshotDto>), 200)]
        [ProducesResponseType(typeof(ApiResponse<object>), 400)]
        public async Task<IActionResult> ToggleFeatureActive([FromBody] ToggleFeatureActiveRequest request, CancellationToken cancellationToken)
        {
            var key = ResolveTenantKey();
            if (string.IsNullOrWhiteSpace(key))
                return BadRequest(ApiResponse<object>.FailureResponse("Workspace could not be determined."));

            var tenant = await _master.MasterTenantCatalogs
                .Include(t => t.FeatureSubscriptions)
                .FirstOrDefaultAsync(t =>
                    t.TenantKey.ToLower() == key ||
                    (t.PrimaryDomain != null && t.PrimaryDomain.ToLower().StartsWith(key + ".")) ||
                    (t.CustomDomain != null && t.CustomDomain.ToLower() == key),
                    cancellationToken);

            if (tenant == null)
                return NotFound(ApiResponse<object>.FailureResponse("Workspace could not be found in Central Catalog."));

            MasterFeatureCatalog? feature = null;
            if (request.FeatureId.HasValue && request.FeatureId.Value != Guid.Empty)
            {
                feature = await _master.MasterFeatureCatalogs
                    .FirstOrDefaultAsync(f => f.Id == request.FeatureId.Value && f.IsActive, cancellationToken);
            }
            if (feature == null && !string.IsNullOrWhiteSpace(request.FeatureCode))
            {
                var cleanCode = request.FeatureCode.Trim().ToLowerInvariant();
                feature = await _master.MasterFeatureCatalogs
                    .FirstOrDefaultAsync(f => f.FeatureCode.ToLower() == cleanCode && f.IsActive, cancellationToken);
            }

            if (feature == null)
                return BadRequest(ApiResponse<object>.FailureResponse("Capability was not found in the Master Catalog."));

            var existing = tenant.FeatureSubscriptions.FirstOrDefault(s => s.MasterFeatureCatalogId == feature.Id);

            // Check whether this feature is available for use for this tenant (respecting Central Custom Availability)
            bool masterAvail = feature.IsAvailableForUse;
            bool effectiveAvail = tenant.UseCustomAvailability
                ? (existing?.IsAvailableForUseOverride ?? ((existing?.CustomPriceOverride != null || (existing != null && existing.IsActive && !feature.IsCompulsory)) ? true : masterAvail))
                : masterAvail;

            bool currentlyActive = existing != null
                && existing.IsActive
                && !string.Equals(existing.Status, "Suspended", StringComparison.OrdinalIgnoreCase)
                && !string.Equals(existing.Status, "Cancelled", StringComparison.OrdinalIgnoreCase);

            bool targetActive = request.SetActive ?? !currentlyActive;

            if (targetActive && !effectiveAvail)
            {
                return BadRequest(ApiResponse<object>.FailureResponse($"'{feature.Name}' is Coming Soon and not yet available for installation."));
            }

            if (!Enum.TryParse<SubscriptionBillingDuration>(request.Cadence, true, out var cadence))
            {
                cadence = SubscriptionBillingDuration.Monthly;
            }

            var now = DateTime.UtcNow;
            decimal effectiveUsdPrice = (tenant.UseCustomPricing && existing?.CustomPriceOverride != null)
                ? existing.CustomPriceOverride.Value
                : feature.MonthlyPrice;

            if (existing != null)
            {
                existing.IsActive = targetActive;
                existing.Status = targetActive ? "Active" : "Suspended";
                if (targetActive)
                {
                    if (existing.ExpiresAtUtc <= now)
                    {
                        existing.ExpiresAtUtc = cadence switch
                        {
                            SubscriptionBillingDuration.Yearly => now.AddYears(1),
                            SubscriptionBillingDuration.Quarterly => now.AddMonths(3),
                            _ => now.AddYears(1)
                        };
                    }
                    if (tenant.UseCustomAvailability)
                    {
                        existing.IsAvailableForUseOverride = true;
                    }
                }
            }
            else
            {
                var newSub = new MasterTenantFeatureSubscription
                {
                    Id = Guid.NewGuid(),
                    MasterTenantCatalogId = tenant.Id,
                    MasterFeatureCatalogId = feature.Id,
                    DurationType = cadence,
                    RecurringPrice = effectiveUsdPrice,
                    StartsAtUtc = now,
                    ExpiresAtUtc = now.AddYears(1),
                    AutoRenew = true,
                    IsActive = targetActive,
                    Status = targetActive ? "Active" : "Suspended",
                    IsAvailableForUseOverride = tenant.UseCustomAvailability && targetActive ? true : null,
                    CreatedUtc = now
                };
                _master.MasterTenantFeatureSubscriptions.Add(newSub);
            }

            _master.MasterAuditLogs.Add(new MasterAuditLog
            {
                UserId = User.Identity?.Name ?? tenant.AdminEmail,
                UserName = User.Identity?.Name ?? tenant.AdminEmail,
                Action = targetActive ? "TenantInstallFeature" : "TenantDeactivateFeature",
                EntityType = "FeatureSubscription",
                EntityId = feature.Id.ToString(),
                Summary = $"Tenant '{tenant.OrganizationName}' ({tenant.TenantKey}) {(targetActive ? "installed & activated" : "deactivated")} '{feature.Name}' ({feature.FeatureCode})",
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers["User-Agent"].ToString(),
                CreatedUtc = now
            });

            await _master.SaveChangesAsync(cancellationToken);

            // Also record the feature installation or deactivation in the tenant's own BcpActivityLogs
            await LogTenantFeatureActivityAsync(
                targetActive ? "Feature Installed" : "Feature Deactivated",
                targetActive
                    ? $"Installed and activated capability '{feature.Name}' ({feature.FeatureCode})."
                    : $"Deactivated capability '{feature.Name}' ({feature.FeatureCode}).",
                cancellationToken);

            await _snapshots.PublishAsync(tenant.TenantKey, cancellationToken);

            var updatedSnapshot = await _snapshots.BuildAsync(tenant.TenantKey, cancellationToken);
            return Ok(ApiResponse<BillingFeaturesSnapshotDto>.SuccessResponse(
                updatedSnapshot!,
                targetActive
                    ? $"'{feature.Name}' has been installed and activated. It is now available in your workspace menu."
                    : $"'{feature.Name}' has been deactivated and removed from your workspace menu."));
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

            await LogTenantFeatureActivityAsync(
                free ? "Feature Installed" : "Feature Subscription Initiated",
                free
                    ? $"Installed and activated capability '{feature.Name}' ({feature.FeatureCode})."
                    : $"Initiated {cadence} subscription for capability '{feature.Name}' (Invoice {result.InvoiceNumber}).",
                cancellationToken);

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

        /// <summary>
        /// Records a workspace feature installation, deactivation, or subscription event into the tenant's BcpActivityLogs.
        /// </summary>
        private async Task LogTenantFeatureActivityAsync(string actionType, string description, CancellationToken cancellationToken)
        {
            if (_tenantDb == null) return;
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                var userEmail = User.FindFirstValue(ClaimTypes.Email)
                    ?? User.FindFirst("email")?.Value
                    ?? (User.Identity?.Name?.Contains('@') == true ? User.Identity.Name : null);
                var fullName = User.FindFirst("full_name")?.Value
                    ?? User.FindFirst(ClaimTypes.GivenName)?.Value
                    ?? User.Identity?.Name
                    ?? userEmail
                    ?? "Administrator";
                var ipAddress = HttpContext.Request.Headers["X-Forwarded-For"].FirstOrDefault()
                    ?? HttpContext.Connection.RemoteIpAddress?.ToString()
                    ?? "127.0.0.1";
                var userAgent = HttpContext.Request.Headers["User-Agent"].ToString();

                _tenantDb.BcpActivityLogs.Add(new BcpActivityLog
                {
                    Id = Guid.CreateVersion7(),
                    ActionType = actionType,
                    Description = description,
                    Module = "Billing & Capabilities",
                    PerformedByProfileId = userId,
                    PerformedByFullName = fullName,
                    PerformedByUserEmail = userEmail,
                    IpAddress = ipAddress,
                    UserAgent = userAgent,
                    Date = DateTime.UtcNow
                });
                await _tenantDb.SaveChangesAsync(cancellationToken);
            }
            catch
            {
                // Non-blocking audit log safeguard
            }
        }
    }
}
