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
using Ozikol_BCC.Application.Interfaces.Services;
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
    [Authorize]
    [Tags("9. Billing & Feature Subscriptions")]
    public class BillingApiController : ControllerBase
    {
        private readonly MasterCatalogDbContext _master;
        private readonly IBillingSnapshotService _snapshots;
        private readonly IPaymentGatewayService? _paymentGateway;
        private readonly ITenantProvider? _tenantProvider;
        private readonly DashboardDbContext? _tenantDb;

        /// <summary>
        /// Initializes a new instance of <see cref="BillingApiController"/>.
        /// </summary>
        /// <param name="master">Master catalog database context.</param>
        /// <param name="snapshots">Snapshot builder and real-time publisher.</param>
        /// <param name="paymentGateway">Unified Paystack payment gateway service.</param>
        /// <param name="tenantProvider">Current tenant resolver.</param>
        /// <param name="tenantDb">Tenant workspace database context for activity audit logging.</param>
        public BillingApiController(
            MasterCatalogDbContext master,
            IBillingSnapshotService snapshots,
            IPaymentGatewayService? paymentGateway = null,
            ITenantProvider? tenantProvider = null,
            DashboardDbContext? tenantDb = null)
        {
            _master = master;
            _snapshots = snapshots;
            _paymentGateway = paymentGateway;
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
        [Authorize(Roles = "SuperAdmin,Admin")]
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
                return NotFound(ApiResponse<object>.FailureResponse("Workspace could not be found."));

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
                return BadRequest(ApiResponse<object>.FailureResponse("Capability was not found."));

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

            // Enforce "no price, don't publish": both Monthly and Yearly amounts are compulsory (> 0)
            bool hasCatalogPrice = feature.IsCompulsory || (feature.MonthlyPrice > 0m && feature.YearlyPrice > 0m);

            if (!feature.IsPublished || !hasCatalogPrice)
            {
                return BadRequest(ApiResponse<object>.FailureResponse(
                    $"'{feature.Name}' does not have compulsory Monthly and Yearly pricing configured and cannot be activated."));
            }

            if (targetActive && !effectiveAvail)
            {
                return BadRequest(ApiResponse<object>.FailureResponse($"'{feature.Name}' is Coming Soon and not yet available for installation."));
            }

            if (!Enum.TryParse<SubscriptionBillingDuration>(request.Cadence, true, out var cadence))
            {
                cadence = SubscriptionBillingDuration.Monthly;
            }

            var now = DateTime.UtcNow;
            decimal catalogPrice = cadence switch
            {
                SubscriptionBillingDuration.Yearly => (feature.YearlyPrice > 0m ? feature.YearlyPrice : (feature.MonthlyPrice > 0m ? feature.MonthlyPrice * 12m : 0m)),
                SubscriptionBillingDuration.Quarterly => (feature.QuarterlyPrice > 0m ? feature.QuarterlyPrice : (feature.MonthlyPrice > 0m ? feature.MonthlyPrice * 3m : 0m)),
                _ => (feature.MonthlyPrice > 0m ? feature.MonthlyPrice : (feature.YearlyPrice > 0m ? feature.YearlyPrice : 0m))
            };

            decimal effectiveUsdPrice = (tenant.UseCustomPricing && existing?.CustomPriceOverride != null)
                ? existing.CustomPriceOverride.Value
                : catalogPrice;

            int catalogTrialDays = Math.Max(0, feature.FreeTrialDays);
            bool hasCustomTrialOverride = existing?.CustomFreeTrialDaysOverride != null;
            int effectiveFreeTrialDays = ((tenant.UseCustomPricing || tenant.UseCustomAvailability || hasCustomTrialOverride) && hasCustomTrialOverride)
                ? Math.Max(0, existing!.CustomFreeTrialDaysOverride!.Value)
                : catalogTrialDays;

            bool hasUsedFreeTrial = existing?.HasUsedFreeTrial ?? false;
            // Free trial can ONLY start if the tenant has not already used it AND effectiveFreeTrialDays > 0!
            bool startFirstTimeTrial = targetActive && !hasUsedFreeTrial && effectiveFreeTrialDays > 0;

            // Safeguard: If activating a capability when no first-time free trial applies,
            // only allow re-enabling if the tenant already holds an unexpired paid subscription that is currently suspended.
            // If it is 0 days free trial, tenant MUST pay via Paystack to activate!
            bool hasUnexpiredPaidTerm = existing != null
                && !existing.IsTrialPeriod
                && !string.Equals(existing.Status, "Trial", StringComparison.OrdinalIgnoreCase)
                && existing.ExpiresAtUtc > now
                && !currentlyActive;

            if (targetActive && effectiveUsdPrice > 0m && !startFirstTimeTrial && !hasUnexpiredPaidTerm)
            {
                return BadRequest(ApiResponse<object>.FailureResponse(
                    effectiveFreeTrialDays == 0
                        ? $"Payment is required to activate '{feature.Name}'. This capability has 0 days free trial — please complete payment via Paystack to activate."
                        : $"Payment is required to activate or renew '{feature.Name}'. Please complete payment via Paystack Inline Checkout."));
            }

            if (existing != null)
            {
                existing.IsActive = targetActive;
                if (targetActive)
                {
                    if (startFirstTimeTrial)
                    {
                        existing.StartsAtUtc = now;
                        existing.ExpiresAtUtc = now.AddDays(effectiveFreeTrialDays);
                        existing.HasUsedFreeTrial = true;
                        existing.IsTrialPeriod = true;
                        existing.Status = "Trial";
                    }
                    else if (effectiveUsdPrice <= 0m || feature.IsCompulsory)
                    {
                        existing.StartsAtUtc = now;
                        existing.ExpiresAtUtc = DateTime.MaxValue;
                        existing.HasUsedFreeTrial = true;
                        existing.IsTrialPeriod = false;
                        existing.Status = "Active";
                    }
                    else
                    {
                        existing.IsTrialPeriod = false;
                        existing.Status = "Active";
                    }

                    if (tenant.UseCustomAvailability)
                    {
                        existing.IsAvailableForUseOverride = true;
                    }
                }
                else
                {
                    if (existing.IsTrialPeriod || string.Equals(existing.Status, "Trial", StringComparison.OrdinalIgnoreCase))
                    {
                        existing.IsTrialPeriod = false;
                        existing.ExpiresAtUtc = now;
                    }
                    existing.Status = "Suspended";
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
                    ExpiresAtUtc = feature.IsCompulsory ? DateTime.MaxValue : now.AddDays(effectiveFreeTrialDays),
                    AutoRenew = true,
                    IsActive = targetActive,
                    Status = targetActive ? (feature.IsCompulsory ? "Active" : "Trial") : "Suspended",
                    HasUsedFreeTrial = true,
                    IsTrialPeriod = !feature.IsCompulsory,
                    IsAvailableForUseOverride = tenant.UseCustomAvailability && targetActive ? true : null,
                    CreatedUtc = now
                };
                _master.MasterTenantFeatureSubscriptions.Add(newSub);
            }

            _master.MasterAuditLogs.Add(new MasterAuditLog
            {
                UserId = User.Identity?.Name ?? tenant.AdminEmail,
                UserName = User.Identity?.Name ?? tenant.AdminEmail,
                Action = targetActive ? (startFirstTimeTrial ? "TenantStartFeatureTrial" : "TenantInstallFeature") : "TenantDeactivateFeature",
                EntityType = "FeatureSubscription",
                EntityId = feature.Id.ToString(),
                Summary = startFirstTimeTrial
                    ? $"Tenant '{tenant.OrganizationName}' ({tenant.TenantKey}) started {effectiveFreeTrialDays}-day first-time free trial on '{feature.Name}' ({feature.FeatureCode})"
                    : $"Tenant '{tenant.OrganizationName}' ({tenant.TenantKey}) {(targetActive ? "installed & activated" : "deactivated")} '{feature.Name}' ({feature.FeatureCode})",
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers["User-Agent"].ToString(),
                CreatedUtc = now
            });

            await _master.SaveChangesAsync(cancellationToken);

            // Also record the feature installation or deactivation in the tenant's own BcpActivityLogs
            await LogTenantFeatureActivityAsync(
                targetActive ? (startFirstTimeTrial ? "Feature Free Trial Started" : "Feature Installed") : "Feature Deactivated",
                targetActive
                    ? (startFirstTimeTrial
                        ? $"Started {effectiveFreeTrialDays}-day first-time free trial and activated capability '{feature.Name}' ({feature.FeatureCode})."
                        : $"Installed and activated capability '{feature.Name}' ({feature.FeatureCode}).")
                    : $"Deactivated capability '{feature.Name}' ({feature.FeatureCode}).",
                cancellationToken);

            await _snapshots.PublishAsync(tenant.TenantKey, cancellationToken);

            var updatedSnapshot = await _snapshots.BuildAsync(tenant.TenantKey, cancellationToken);
            return Ok(ApiResponse<BillingFeaturesSnapshotDto>.SuccessResponse(
                updatedSnapshot!,
                targetActive
                    ? (startFirstTimeTrial
                        ? $"'{feature.Name}' is now active on your {effectiveFreeTrialDays}-Day Free Trial! Test all capabilities before payment is required."
                        : $"'{feature.Name}' has been installed and activated. It is now available in your workspace menu.")
                    : $"'{feature.Name}' has been deactivated and removed from your workspace menu."));
        }

        /// <summary>
        /// Initializes a Central Paystack Inline payment transaction for one or more workspace capabilities
        /// (supports single "Pay &amp; Renew" and consolidated multi-feature renewal).
        /// Resolves Central Paystack credentials and exact feature pricing strictly from MasterCatalogDbContext.
        /// </summary>
        [HttpPost("features/paystack/initialize")]
        [Authorize(Roles = "SuperAdmin,Admin")]
        [ProducesResponseType(typeof(ApiResponse<InitializeFeaturePaymentResponseDto>), 200)]
        [ProducesResponseType(typeof(ApiResponse<object>), 400)]
        public async Task<IActionResult> InitializeFeaturePayment(
            [FromBody] InitializeFeaturePaymentRequest request,
            CancellationToken cancellationToken)
        {
            if (_paymentGateway == null)
                return BadRequest(ApiResponse<object>.FailureResponse("Paystack payment gateway service is not registered."));

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
                return NotFound(ApiResponse<object>.FailureResponse("Workspace could not be found."));

            if (!Enum.TryParse<SubscriptionBillingDuration>(request.Cadence, true, out var cadence))
                cadence = SubscriptionBillingDuration.Monthly;

            // Collect target feature codes or single feature ID
            var targetCodes = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            if (request.FeatureCodes != null)
            {
                foreach (var c in request.FeatureCodes)
                {
                    if (!string.IsNullOrWhiteSpace(c)) targetCodes.Add(c.Trim().ToLowerInvariant());
                }
            }
            if (!string.IsNullOrWhiteSpace(request.FeatureCode))
            {
                targetCodes.Add(request.FeatureCode.Trim().ToLowerInvariant());
            }

            var allCatalogFeatures = await _master.MasterFeatureCatalogs
                .AsNoTracking()
                .Where(f => f.IsActive)
                .ToListAsync(cancellationToken);

            var selectedFeatures = new List<MasterFeatureCatalog>();
            if (targetCodes.Count > 0)
            {
                selectedFeatures.AddRange(allCatalogFeatures.Where(f => targetCodes.Contains(f.FeatureCode.ToLowerInvariant())));
            }
            else if (request.FeatureId.HasValue && request.FeatureId.Value != Guid.Empty)
            {
                var byId = allCatalogFeatures.FirstOrDefault(f => f.Id == request.FeatureId.Value);
                if (byId != null) selectedFeatures.Add(byId);
            }

            if (selectedFeatures.Count == 0)
                return BadRequest(ApiResponse<object>.FailureResponse("No valid capability was specified for payment."));

            // Resolve tenant's running currency, exchange rate, and VAT percentage from MasterCurrencyRates
            var (currCode, currSymbol, currRate, vatPercentage) = await ResolveTenantCurrencyContextAsync(tenant, cancellationToken);

            decimal totalAmountInTenantCurrency = 0m;
            var featureNames = new List<string>();
            var resolvedCodes = new List<string>();
            Guid? primarySubId = null;

            foreach (var feat in selectedFeatures)
            {
                if (feat.IsCompulsory) continue;

                var sub = tenant.FeatureSubscriptions.FirstOrDefault(s => s.MasterFeatureCatalogId == feat.Id);
                if (sub != null && primarySubId == null)
                {
                    primarySubId = sub.Id;
                }

                bool hasCustomPrice = tenant.UseCustomPricing && sub?.CustomPriceOverride != null;
                decimal baseMonthlyUsd = hasCustomPrice
                    ? sub!.CustomPriceOverride!.Value
                    : (sub != null && sub.RecurringPrice > 0 ? sub.RecurringPrice : feat.MonthlyPrice);

                decimal cadenceUsd = cadence switch
                {
                    SubscriptionBillingDuration.Yearly => hasCustomPrice
                        ? Math.Round(baseMonthlyUsd * 10m, 2)
                        : (feat.YearlyPrice > 0 ? feat.YearlyPrice : Math.Round(baseMonthlyUsd * 10m, 2)),
                    SubscriptionBillingDuration.Quarterly => hasCustomPrice
                        ? Math.Round(baseMonthlyUsd * 3m * 0.9m, 2)
                        : (feat.QuarterlyPrice > 0 ? feat.QuarterlyPrice : Math.Round(baseMonthlyUsd * 3m * 0.9m, 2)),
                    _ => baseMonthlyUsd
                };

                decimal featureAmount = Math.Round(cadenceUsd * currRate, 2);
                if (featureAmount > 0m)
                {
                    totalAmountInTenantCurrency += featureAmount;
                    featureNames.Add(feat.Name);
                    resolvedCodes.Add(feat.FeatureCode);
                }
            }

            totalAmountInTenantCurrency = Math.Round(totalAmountInTenantCurrency, 2);
            if (totalAmountInTenantCurrency <= 0m)
                return BadRequest(ApiResponse<object>.FailureResponse("The selected capability has no payable charge."));

            if (vatPercentage > 0m)
            {
                var vatAmt = Math.Round(totalAmountInTenantCurrency * (vatPercentage / 100m), 2);
                totalAmountInTenantCurrency = Math.Round(totalAmountInTenantCurrency + vatAmt, 2);
            }

            var now = DateTime.UtcNow;
            var reference = $"PSK-CENTRAL-{now:yyyyMMddHHmmss}-{Guid.NewGuid().ToString("N")[..8].ToUpperInvariant()}";
            var payerEmail = User.FindFirstValue(ClaimTypes.Email)
                ?? User.FindFirst("email")?.Value
                ?? (!string.IsNullOrWhiteSpace(tenant.AdminEmail) ? tenant.AdminEmail : "billing@company.com");

            var descriptionNote = featureNames.Count == 1
                ? $"{featureNames[0]} — {cadence} Subscription Renewal"
                : $"{featureNames.Count} Capabilities ({string.Join(", ", featureNames)}) — {cadence} Renewal";

            if (descriptionNote.Length > 490)
                descriptionNote = descriptionNote[..490];

            var normalizedCsv = string.Join(",", resolvedCodes.Select(c => c.ToLowerInvariant()).OrderBy(c => c));
            var existingUnpaid = await _master.MasterBillingTransactions
                .Where(t => t.MasterTenantCatalogId == tenant.Id && t.Status != "Completed" && t.Status != "Refunded" && t.Status != "Cancelled")
                .OrderBy(t => t.CreatedUtc)
                .ToListAsync(cancellationToken);

            var matchingInvoices = existingUnpaid.Where(t =>
                string.Join(",", (t.FeatureCodesCsv ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).Select(c => c.ToLowerInvariant()).OrderBy(c => c)) == normalizedCsv ||
                (selectedFeatures.Count == 1 && primarySubId.HasValue && t.MasterTenantFeatureSubscriptionId == primarySubId.Value && string.IsNullOrWhiteSpace(t.FeatureCodesCsv)) ||
                (selectedFeatures.Count == 1 && string.IsNullOrWhiteSpace(t.FeatureCodesCsv) && (t.Notes ?? "").StartsWith(featureNames[0], StringComparison.OrdinalIgnoreCase))
            ).ToList();

            MasterBillingTransaction invoice;
            if (matchingInvoices.Count > 0)
            {
                invoice = matchingInvoices[0];
                if (matchingInvoices.Count > 1)
                {
                    _master.MasterBillingTransactions.RemoveRange(matchingInvoices.Skip(1));
                }
                invoice.Amount = totalAmountInTenantCurrency;
                invoice.Currency = currCode;
                invoice.PaymentProvider = "Paystack";
                invoice.TransactionRef = reference;
                invoice.Status = "Pending";
                invoice.Notes = descriptionNote;
                invoice.FeatureCodesCsv = string.Join(",", resolvedCodes);
                invoice.BillingCadence = cadence.ToString();
                invoice.UpdatedUtc = now;
            }
            else
            {
                var invoiceNumber = await NextInvoiceNumberAsync(now, cancellationToken);
                invoice = new MasterBillingTransaction
                {
                    Id = Guid.NewGuid(),
                    MasterTenantCatalogId = tenant.Id,
                    MasterTenantFeatureSubscriptionId = selectedFeatures.Count == 1 ? primarySubId : null,
                    InvoiceNumber = invoiceNumber,
                    Amount = totalAmountInTenantCurrency,
                    Currency = currCode,
                    PaymentProvider = "Paystack",
                    TransactionRef = reference,
                    Status = "Pending",
                    Notes = descriptionNote,
                    FeatureCodesCsv = string.Join(",", resolvedCodes),
                    BillingCadence = cadence.ToString(),
                    CreatedUtc = now
                };
                _master.MasterBillingTransactions.Add(invoice);
            }

            await _master.SaveChangesAsync(cancellationToken);

            var initResult = await _paymentGateway.InitializeInlinePaymentAsync(new PaymentInitRequestDto
            {
                Scope = PaystackPaymentScope.CentralPlatform,
                Email = payerEmail,
                Amount = totalAmountInTenantCurrency,
                Currency = currCode,
                Reference = reference,
                Metadata = new Dictionary<string, string>
                {
                    ["scope"] = "central_platform",
                    ["tenant_key"] = tenant.TenantKey,
                    ["invoice_number"] = invoice.InvoiceNumber ?? string.Empty,
                    ["feature_codes"] = string.Join(",", resolvedCodes),
                    ["cadence"] = cadence.ToString()
                }
            }, cancellationToken);

            if (!initResult.IsSuccess)
            {
                // Keep the invoice Status as "Pending" (never mark the invoice itself as Failed just because a gateway attempt failed)
                // so the user can retry or switch payment methods on the same invoice without creating duplicate invoices.
                return BadRequest(ApiResponse<object>.FailureResponse(
                    initResult.ErrorMessage,
                    errorCode: initResult.ErrorCode,
                    realError: initResult.RealError));
            }

            return Ok(ApiResponse<InitializeFeaturePaymentResponseDto>.SuccessResponse(new InitializeFeaturePaymentResponseDto
            {
                PublicKey = initResult.PublicKey,
                AccessCode = initResult.AccessCode,
                Reference = initResult.Reference,
                AuthorizationUrl = initResult.AuthorizationUrl,
                Amount = totalAmountInTenantCurrency,
                Currency = currCode,
                CurrencySymbol = currSymbol,
                Email = payerEmail,
                InvoiceNumber = invoice.InvoiceNumber ?? string.Empty,
                Cadence = cadence.ToString(),
                FeatureNames = featureNames
            }, "Paystack inline checkout initialized."));
        }

        /// <summary>
        /// Verifies a completed Central Paystack Inline payment reference against Paystack's API,
        /// marks the Central invoice as Completed, activates/extends the covered capability subscriptions,
        /// and broadcasts the updated snapshot over SignalR.
        /// </summary>
        [HttpPost("features/paystack/verify")]
        [Authorize(Roles = "SuperAdmin,Admin")]
        [ProducesResponseType(typeof(ApiResponse<BillingFeaturesSnapshotDto>), 200)]
        [ProducesResponseType(typeof(ApiResponse<object>), 400)]
        public async Task<IActionResult> VerifyFeaturePayment(
            [FromBody] VerifyFeaturePaymentRequest request,
            CancellationToken cancellationToken)
        {
            if (_paymentGateway == null)
                return BadRequest(ApiResponse<object>.FailureResponse("Paystack payment gateway service is not registered."));

            if (string.IsNullOrWhiteSpace(request.Reference))
                return BadRequest(ApiResponse<object>.FailureResponse("Payment reference is required."));

            var cleanRef = request.Reference.Trim();
            var invoice = await _master.MasterBillingTransactions
                .Include(t => t.Tenant)
                    .ThenInclude(tn => tn!.FeatureSubscriptions)
                .FirstOrDefaultAsync(t => t.TransactionRef == cleanRef, cancellationToken);

            if (invoice == null || invoice.Tenant == null)
                return NotFound(ApiResponse<object>.FailureResponse("Payment reference was not found."));

            var tenant = invoice.Tenant;

            // Idempotency: if webhook already completed this invoice, return the fresh snapshot immediately
            if (string.Equals(invoice.Status, "Completed", StringComparison.OrdinalIgnoreCase))
            {
                var existingSnap = await _snapshots.BuildAsync(tenant.TenantKey, cancellationToken);
                return Ok(ApiResponse<BillingFeaturesSnapshotDto>.SuccessResponse(
                    existingSnap!,
                    $"Payment verified (Invoice {invoice.InvoiceNumber}). Your subscription is active and renewed!"));
            }

            var verification = await _paymentGateway.VerifyPaymentAsync(cleanRef, PaystackPaymentScope.CentralPlatform, cancellationToken);
            if (!verification.IsSuccess)
            {
                return BadRequest(ApiResponse<object>.FailureResponse(
                    string.IsNullOrWhiteSpace(verification.ErrorMessage)
                        ? "Payment verification failed."
                        : verification.ErrorMessage,
                    errorCode: verification.ErrorCode,
                    realError: verification.RealError));
            }

            // Anti-tampering check: verify paid amount matches invoice amount
            if (verification.AmountPaid + 0.05m < invoice.Amount)
            {
                return BadRequest(ApiResponse<object>.FailureResponse(
                    $"Verified payment amount ({verification.AmountPaid:N2}) is less than the invoice total ({invoice.Amount:N2})."));
            }

            await FulfillCentralFeatureInvoiceAsync(invoice, tenant, cancellationToken);

            await LogTenantFeatureActivityAsync(
                "Capability Subscription Paid & Renewed",
                $"Completed Paystack payment ({invoice.Currency} {invoice.Amount:N2}, Ref: {cleanRef}, Invoice: {invoice.InvoiceNumber}) for {invoice.Notes}.",
                cancellationToken);

            await _snapshots.PublishAsync(tenant.TenantKey, cancellationToken);
            var updatedSnapshot = await _snapshots.BuildAsync(tenant.TenantKey, cancellationToken);

            return Ok(ApiResponse<BillingFeaturesSnapshotDto>.SuccessResponse(
                updatedSnapshot!,
                $"Payment verified ({invoice.InvoiceNumber})! Your capability subscription has been renewed and activated."));
        }

        /// <summary>
        /// Marks a Central <see cref="MasterBillingTransaction"/> as Completed and activates/extends all covered
        /// <see cref="MasterTenantFeatureSubscription"/> records. Shared idempotently with Central webhook processing.
        /// Respects per-item durations stored in <see cref="MasterBillingTransaction.LineItemsJson"/>.
        /// </summary>
        private async Task FulfillCentralFeatureInvoiceAsync(
            MasterBillingTransaction invoice,
            MasterTenantCatalog tenant,
            CancellationToken cancellationToken)
        {
            var now = DateTime.UtcNow;
            invoice.Status = "Completed";
            if (string.IsNullOrWhiteSpace(invoice.PaymentProvider))
            {
                invoice.PaymentProvider = "Paystack";
            }
            invoice.UpdatedUtc = now;

            if (!Enum.TryParse<SubscriptionBillingDuration>(invoice.BillingCadence, true, out var fallbackCadence))
                fallbackCadence = SubscriptionBillingDuration.Monthly;

            // Parse per-feature cadence map from LineItemsJson if present
            var perFeatureCadence = new Dictionary<string, SubscriptionBillingDuration>(StringComparer.OrdinalIgnoreCase);
            if (!string.IsNullOrWhiteSpace(invoice.LineItemsJson))
            {
                try
                {
                    var parsedItems = System.Text.Json.JsonSerializer.Deserialize<List<BillingInvoiceLineItemDto>>(invoice.LineItemsJson);
                    if (parsedItems != null)
                    {
                        foreach (var li in parsedItems)
                        {
                            if (!string.IsNullOrWhiteSpace(li.FeatureCode) &&
                                Enum.TryParse<SubscriptionBillingDuration>(li.SelectedCadence, true, out var parsedCad))
                            {
                                perFeatureCadence[li.FeatureCode.Trim()] = parsedCad;
                            }
                        }
                    }
                }
                catch { }
            }

            var codes = (invoice.FeatureCodesCsv ?? string.Empty)
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .Select(c => c.ToLowerInvariant())
                .ToHashSet();

            var featuresToRenew = new List<MasterFeatureCatalog>();
            if (codes.Count > 0)
            {
                featuresToRenew = await _master.MasterFeatureCatalogs
                    .Where(f => codes.Contains(f.FeatureCode.ToLower()))
                    .ToListAsync(cancellationToken);
            }
            else if (invoice.MasterTenantFeatureSubscriptionId.HasValue)
            {
                var subMatch = tenant.FeatureSubscriptions.FirstOrDefault(s => s.Id == invoice.MasterTenantFeatureSubscriptionId.Value);
                if (subMatch != null)
                {
                    var feat = await _master.MasterFeatureCatalogs.FirstOrDefaultAsync(f => f.Id == subMatch.MasterFeatureCatalogId, cancellationToken);
                    if (feat != null) featuresToRenew.Add(feat);
                }
            }

            foreach (var feature in featuresToRenew)
            {
                var sub = tenant.FeatureSubscriptions.FirstOrDefault(s => s.MasterFeatureCatalogId == feature.Id);
                bool hasCustomMonthly = tenant.UseCustomPricing && sub?.CustomPriceOverride != null;
                bool hasCustomYearly = tenant.UseCustomPricing && sub?.CustomYearlyPriceOverride != null;

                decimal effectiveMonthlyUsd = hasCustomMonthly
                    ? sub!.CustomPriceOverride!.Value
                    : feature.MonthlyPrice;
                decimal effectiveYearlyUsd = hasCustomYearly
                    ? sub!.CustomYearlyPriceOverride!.Value
                    : (feature.YearlyPrice > 0 ? feature.YearlyPrice : effectiveMonthlyUsd * 10m);

                var itemCadence = perFeatureCadence.TryGetValue(feature.FeatureCode, out var matchedCad)
                    ? matchedCad
                    : (effectiveMonthlyUsd <= 0m && effectiveYearlyUsd > 0m ? SubscriptionBillingDuration.Yearly : fallbackCadence);

                decimal effectiveUsdPrice = itemCadence == SubscriptionBillingDuration.Yearly
                    ? effectiveYearlyUsd
                    : effectiveMonthlyUsd;

                if (sub != null)
                {
                    // If renewing an active paid subscription before expiry, extend from current ExpiresAtUtc so no paid days are lost;
                    // if upgrading from a free trial or renewing after expiration, extend from now.
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
                    _master.MasterTenantFeatureSubscriptions.Add(new MasterTenantFeatureSubscription
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

            _master.MasterAuditLogs.Add(new MasterAuditLog
            {
                UserId = User.Identity?.Name ?? tenant.AdminEmail,
                UserName = User.Identity?.Name ?? tenant.AdminEmail,
                Action = "TenantPayAndRenewFeature",
                EntityType = "MasterBillingTransaction",
                EntityId = invoice.Id.ToString(),
                Summary = $"Tenant '{tenant.OrganizationName}' ({tenant.TenantKey}) paid {invoice.Currency} {invoice.Amount:N2} via {invoice.PaymentProvider} ({invoice.InvoiceNumber}, Ref: {invoice.TransactionRef}) for {invoice.Notes}",
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers["User-Agent"].ToString(),
                CreatedUtc = now
            });

            await _master.SaveChangesAsync(cancellationToken);
        }

        /// <summary>
        /// Subscribes the workspace to an optional add-on (or renews a lapsed one).
        /// Zero-cost features activate immediately; paid features create a pending invoice and stay inactive until settled.
        /// </summary>
        /// <param name="request">Feature and cadence.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        [HttpPost("features/subscribe")]
        [Authorize(Roles = "SuperAdmin,Admin")]
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
        [Authorize(Roles = "SuperAdmin,Admin")]
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
        /// Automatically consolidates any redundant unpaid duplicate invoices for the same capability set.
        /// </summary>
        /// <param name="cancellationToken">Cancellation token.</param>
        [HttpGet("invoices")]
        [Authorize(Roles = "SuperAdmin,Admin")]
        [ProducesResponseType(typeof(ApiResponse<List<BillingInvoiceDto>>), 200)]
        public async Task<IActionResult> GetInvoices(CancellationToken cancellationToken)
        {
            var key = ResolveTenantKey();
            if (key == null) return BadRequest(ApiResponse<object>.FailureResponse("Workspace could not be determined."));

            var tenant = await _master.MasterTenantCatalogs
                .AsNoTracking()
                .FirstOrDefaultAsync(t =>
                    t.TenantKey.ToLower() == key ||
                    (t.PrimaryDomain != null && t.PrimaryDomain.ToLower().StartsWith(key + ".")) ||
                    (t.CustomDomain != null && t.CustomDomain.ToLower() == key),
                    cancellationToken);

            if (tenant == null)
                return Ok(ApiResponse<List<BillingInvoiceDto>>.SuccessResponse(new List<BillingInvoiceDto>(), "Invoices retrieved."));

            await DeduplicateUnpaidTenantInvoicesAsync(tenant.Id, cancellationToken);

            var invoices = await _master.MasterBillingTransactions
                .AsNoTracking()
                .Where(t => t.MasterTenantCatalogId == tenant.Id)
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
        /// Automatically deduplicates any redundant unpaid (<c>Pending</c> / <c>Failed</c>) invoices for the same capability set
        /// so a workspace never has multiple unpaid invoices for the same single feature or bundle.
        /// </summary>
        private async Task DeduplicateUnpaidTenantInvoicesAsync(Guid tenantId, CancellationToken cancellationToken)
        {
            var unpaid = await _master.MasterBillingTransactions
                .Where(t => t.MasterTenantCatalogId == tenantId &&
                            t.Status != "Completed" &&
                            t.Status != "Refunded" &&
                            t.Status != "Cancelled")
                .OrderBy(t => t.CreatedUtc)
                .ToListAsync(cancellationToken);

            if (unpaid.Count <= 1) return;

            var groups = unpaid.GroupBy(t =>
            {
                if (!string.IsNullOrWhiteSpace(t.FeatureCodesCsv))
                {
                    return "CODES:" + string.Join(",", t.FeatureCodesCsv
                        .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                        .Select(c => c.ToLowerInvariant())
                        .OrderBy(c => c));
                }
                if (t.MasterTenantFeatureSubscriptionId.HasValue)
                {
                    return "SUB:" + t.MasterTenantFeatureSubscriptionId.Value.ToString("N");
                }
                return "NOTE:" + (t.Notes ?? string.Empty).Split('—')[0].Trim().ToLowerInvariant();
            });

            bool modified = false;
            foreach (var grp in groups)
            {
                var list = grp.ToList();
                var primary = list[0];
                if (string.Equals(primary.Status, "Failed", StringComparison.OrdinalIgnoreCase))
                {
                    primary.Status = "Pending";
                    modified = true;
                }

                // Normalize legacy "INV-YYYYMM-NNNNN" format to pure numeric "YYYYMMNNNNN" (e.g., 20261000001)
                if (!string.IsNullOrWhiteSpace(primary.InvoiceNumber) && !primary.InvoiceNumber.All(char.IsDigit))
                {
                    var digitsOnly = new string(primary.InvoiceNumber.Where(char.IsDigit).ToArray());
                    if (!string.IsNullOrWhiteSpace(digitsOnly))
                    {
                        primary.InvoiceNumber = digitsOnly;
                        modified = true;
                    }
                }

                if (list.Count > 1)
                {
                    var newest = list[^1];
                    if (!string.IsNullOrWhiteSpace(newest.FeatureCodesCsv))
                        primary.FeatureCodesCsv = newest.FeatureCodesCsv;
                    if (!string.IsNullOrWhiteSpace(newest.LineItemsJson))
                        primary.LineItemsJson = newest.LineItemsJson;
                    if (!string.IsNullOrWhiteSpace(newest.BillingCadence))
                        primary.BillingCadence = newest.BillingCadence;
                    primary.Amount = newest.Amount;
                    primary.Currency = newest.Currency;
                    primary.Notes = newest.Notes;
                    primary.Status = string.Equals(newest.Status, "AwaitingVerification", StringComparison.OrdinalIgnoreCase)
                        ? "AwaitingVerification"
                        : "Pending";
                    primary.UpdatedUtc = DateTime.UtcNow;

                    _master.MasterBillingTransactions.RemoveRange(list.Skip(1));
                    modified = true;
                }
            }

            if (modified)
            {
                await _master.SaveChangesAsync(cancellationToken);
            }
        }

        /// <summary>
        /// Automatically prepares (or loads and reuses an existing unpaid invoice matching the exact feature set)
        /// an itemized invoice for either a single capability ("Pay &amp; Renew") or all expiring capabilities ("Renew All Expiring Features")
        /// and returns its Invoice ID so the client navigates to <c>/billing/invoices/:id</c> without ever duplicating invoices.
        /// </summary>
        [HttpPost("invoices/prepare")]
        [Authorize(Roles = "SuperAdmin,Admin")]
        [ProducesResponseType(typeof(ApiResponse<PrepareBillingInvoiceResponseDto>), 200)]
        [ProducesResponseType(typeof(ApiResponse<object>), 400)]
        public async Task<IActionResult> PrepareInvoice(
            [FromBody] PrepareBillingInvoiceRequest request,
            CancellationToken cancellationToken)
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
                return NotFound(ApiResponse<object>.FailureResponse("Workspace could not be found."));

            var targetCodes = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            if (request.FeatureCodes != null)
            {
                foreach (var c in request.FeatureCodes)
                {
                    if (!string.IsNullOrWhiteSpace(c)) targetCodes.Add(c.Trim().ToLowerInvariant());
                }
            }
            if (!string.IsNullOrWhiteSpace(request.FeatureCode))
            {
                targetCodes.Add(request.FeatureCode.Trim().ToLowerInvariant());
            }

            if (targetCodes.Count == 0)
                return BadRequest(ApiResponse<object>.FailureResponse("Please select at least one capability to prepare an invoice."));

            var allCatalogFeatures = await _master.MasterFeatureCatalogs
                .AsNoTracking()
                .Where(f => f.IsActive)
                .OrderBy(f => f.SortOrder)
                .ThenBy(f => f.Name)
                .ToListAsync(cancellationToken);

            var selectedFeatures = allCatalogFeatures
                .Where(f => !f.IsCompulsory && targetCodes.Contains(f.FeatureCode.ToLowerInvariant()))
                .ToList();

            if (selectedFeatures.Count == 0)
                return BadRequest(ApiResponse<object>.FailureResponse("No payable capability matched the requested selection."));

            var (currCode, currSymbol, currRate, vatPercentage) = await ResolveTenantCurrencyContextAsync(tenant, cancellationToken);

            Guid? primarySubId = null;
            foreach (var feat in selectedFeatures)
            {
                var sub = tenant.FeatureSubscriptions.FirstOrDefault(s => s.MasterFeatureCatalogId == feat.Id);
                if (sub != null && primarySubId == null) primarySubId = sub.Id;
            }

            var normalizedCsv = string.Join(",", selectedFeatures.Select(x => x.FeatureCode.ToLowerInvariant()).OrderBy(x => x));

            // Check for any existing unpaid invoice (Pending, Failed, or AwaitingVerification) for this exact capability set
            var existingUnpaid = await _master.MasterBillingTransactions
                .Where(t => t.MasterTenantCatalogId == tenant.Id &&
                            t.Status != "Completed" &&
                            t.Status != "Refunded" &&
                            t.Status != "Cancelled")
                .OrderBy(t => t.CreatedUtc)
                .ToListAsync(cancellationToken);

            var matchedList = existingUnpaid.Where(t =>
                string.Join(",", (t.FeatureCodesCsv ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).Select(c => c.ToLowerInvariant()).OrderBy(c => c)) == normalizedCsv ||
                (selectedFeatures.Count == 1 && primarySubId.HasValue && t.MasterTenantFeatureSubscriptionId == primarySubId.Value && string.IsNullOrWhiteSpace(t.FeatureCodesCsv)) ||
                (selectedFeatures.Count == 1 && string.IsNullOrWhiteSpace(t.FeatureCodesCsv) && (t.Notes ?? "").StartsWith(selectedFeatures[0].Name, StringComparison.OrdinalIgnoreCase))
            ).ToList();

            // Extract previously saved per-feature cadence from the existing invoice if the user already adjusted duration on it
            var savedCadenceByCode = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            if (matchedList.Count > 0 && string.IsNullOrWhiteSpace(request.Cadence))
            {
                var latestMatched = matchedList[^1];
                if (!string.IsNullOrWhiteSpace(latestMatched.LineItemsJson))
                {
                    try
                    {
                        var parsed = System.Text.Json.JsonSerializer.Deserialize<List<BillingInvoiceLineItemDto>>(latestMatched.LineItemsJson);
                        if (parsed != null)
                        {
                            foreach (var p in parsed)
                            {
                                if (!string.IsNullOrWhiteSpace(p.FeatureCode) && !string.IsNullOrWhiteSpace(p.SelectedCadence))
                                    savedCadenceByCode[p.FeatureCode] = p.SelectedCadence;
                            }
                        }
                    }
                    catch { }
                }
            }

            var lineItems = new List<BillingInvoiceLineItemDto>();
            foreach (var feat in selectedFeatures)
            {
                var sub = tenant.FeatureSubscriptions.FirstOrDefault(s => s.MasterFeatureCatalogId == feat.Id);
                var preferredCad = !string.IsNullOrWhiteSpace(request.Cadence)
                    ? request.Cadence
                    : (savedCadenceByCode.TryGetValue(feat.FeatureCode, out var savedCad)
                        ? savedCad
                        : (sub != null ? sub.DurationType.ToString() : "Monthly"));

                var li = BuildInvoiceLineItem(feat, sub, tenant.UseCustomPricing, currRate, preferredCad);
                if (li.LineTotal > 0m)
                {
                    lineItems.Add(li);
                }
            }

            if (lineItems.Count == 0)
                return BadRequest(ApiResponse<object>.FailureResponse("The selected capability has no payable charge."));

            var subtotalAmount = Math.Round(lineItems.Sum(x => x.LineTotal), 2);
            var vatAmount = vatPercentage > 0m ? Math.Round(subtotalAmount * (vatPercentage / 100m), 2) : 0m;
            var totalAmount = Math.Round(subtotalAmount + vatAmount, 2);
            var lineItemsJson = System.Text.Json.JsonSerializer.Serialize(lineItems);
            var now = DateTime.UtcNow;

            var descriptionNote = lineItems.Count == 1
                ? $"{lineItems[0].FeatureName} — {FormatCadenceDisplay(lineItems[0].SelectedCadence)} Subscription Renewal"
                : $"{lineItems.Count} Capabilities ({string.Join(", ", lineItems.Select(x => x.FeatureName))}) — Subscription Renewal";
            if (descriptionNote.Length > 490) descriptionNote = descriptionNote[..490];

            if (matchedList.Count > 0)
            {
                var matchedPending = matchedList[0];
                if (matchedList.Count > 1)
                {
                    _master.MasterBillingTransactions.RemoveRange(matchedList.Skip(1));
                }

                if (!string.IsNullOrWhiteSpace(matchedPending.InvoiceNumber) && !matchedPending.InvoiceNumber.All(char.IsDigit))
                {
                    var digitsOnly = new string(matchedPending.InvoiceNumber.Where(char.IsDigit).ToArray());
                    if (!string.IsNullOrWhiteSpace(digitsOnly))
                    {
                        matchedPending.InvoiceNumber = digitsOnly;
                    }
                }
                else if (string.IsNullOrWhiteSpace(matchedPending.InvoiceNumber))
                {
                    matchedPending.InvoiceNumber = await NextInvoiceNumberAsync(now, cancellationToken);
                }

                matchedPending.MasterTenantFeatureSubscriptionId = lineItems.Count == 1 ? primarySubId : null;
                matchedPending.Amount = totalAmount;
                matchedPending.Currency = currCode;
                if (string.Equals(matchedPending.Status, "Failed", StringComparison.OrdinalIgnoreCase))
                {
                    matchedPending.Status = "Pending";
                }
                matchedPending.Notes = descriptionNote;
                matchedPending.FeatureCodesCsv = string.Join(",", lineItems.Select(x => x.FeatureCode));
                matchedPending.BillingCadence = lineItems.Count == 1 ? lineItems[0].SelectedCadence : "Mixed";
                matchedPending.LineItemsJson = lineItemsJson;
                matchedPending.UpdatedUtc = now;
                await _master.SaveChangesAsync(cancellationToken);

                return Ok(ApiResponse<PrepareBillingInvoiceResponseDto>.SuccessResponse(new PrepareBillingInvoiceResponseDto
                {
                    InvoiceId = matchedPending.Id,
                    InvoiceNumber = matchedPending.InvoiceNumber ?? matchedPending.Id.ToString()
                }, "Existing invoice loaded."));
            }

            var invoiceNumber = await NextInvoiceNumberAsync(now, cancellationToken);
            var invoice = new MasterBillingTransaction
            {
                Id = Guid.NewGuid(),
                MasterTenantCatalogId = tenant.Id,
                MasterTenantFeatureSubscriptionId = lineItems.Count == 1 ? primarySubId : null,
                InvoiceNumber = invoiceNumber,
                Amount = totalAmount,
                Currency = currCode,
                Status = "Pending",
                Notes = descriptionNote,
                FeatureCodesCsv = string.Join(",", lineItems.Select(x => x.FeatureCode)),
                BillingCadence = lineItems.Count == 1 ? lineItems[0].SelectedCadence : "Mixed",
                LineItemsJson = lineItemsJson,
                CreatedUtc = now
            };

            _master.MasterBillingTransactions.Add(invoice);
            await _master.SaveChangesAsync(cancellationToken);

            return Ok(ApiResponse<PrepareBillingInvoiceResponseDto>.SuccessResponse(new PrepareBillingInvoiceResponseDto
            {
                InvoiceId = invoice.Id,
                InvoiceNumber = invoiceNumber
            }, "Invoice generated."));
        }

        /// <summary>
        /// Retrieves the complete detail payload for the dedicated Invoice &amp; Multi-Gateway Checkout Page (<c>/billing/invoices/:id</c>),
        /// including itemized capabilities, dynamic duration options, discount savings, and Central payment methods availability.
        /// </summary>
        [HttpGet("invoices/{id:guid}")]
        [Authorize(Roles = "SuperAdmin,Admin")]
        [ProducesResponseType(typeof(ApiResponse<BillingInvoiceDetailDto>), 200)]
        [ProducesResponseType(typeof(ApiResponse<object>), 404)]
        public async Task<IActionResult> GetInvoiceDetail(Guid id, CancellationToken cancellationToken)
        {
            var key = ResolveTenantKey();
            if (string.IsNullOrWhiteSpace(key))
                return BadRequest(ApiResponse<object>.FailureResponse("Workspace could not be determined."));

            var invoice = await _master.MasterBillingTransactions
                .Include(t => t.Tenant)
                    .ThenInclude(tn => tn!.FeatureSubscriptions)
                .Include(t => t.FeatureSubscription)
                    .ThenInclude(fs => fs!.MasterFeatureCatalog)
                .FirstOrDefaultAsync(t => t.Id == id && t.Tenant != null && (
                    t.Tenant.TenantKey.ToLower() == key ||
                    (t.Tenant.PrimaryDomain != null && t.Tenant.PrimaryDomain.ToLower().StartsWith(key + ".")) ||
                    (t.Tenant.CustomDomain != null && t.Tenant.CustomDomain.ToLower() == key)
                ), cancellationToken);

            if (invoice == null || invoice.Tenant == null)
                return NotFound(ApiResponse<object>.FailureResponse("Invoice was not found for this workspace."));

            var detail = await BuildFullInvoiceDetailDtoAsync(invoice, invoice.Tenant, cancellationToken);
            return Ok(ApiResponse<BillingInvoiceDetailDto>.SuccessResponse(detail, "Invoice detail retrieved."));
        }

        /// <summary>
        /// Dynamically updates the billing duration (<c>Monthly</c> = 1 Month, <c>Quarterly</c> = 3 Months, <c>Yearly</c> = 1 Year)
        /// for a specific capability (or all capabilities) on a Pending invoice, recalculating discounts and totals automatically.
        /// </summary>
        [HttpPost("invoices/{id:guid}/cadence")]
        [Authorize(Roles = "SuperAdmin,Admin")]
        [ProducesResponseType(typeof(ApiResponse<BillingInvoiceDetailDto>), 200)]
        [ProducesResponseType(typeof(ApiResponse<object>), 400)]
        public async Task<IActionResult> UpdateInvoiceCadence(
            Guid id,
            [FromBody] UpdateInvoiceLineCadenceRequest request,
            CancellationToken cancellationToken)
        {
            var key = ResolveTenantKey();
            if (string.IsNullOrWhiteSpace(key))
                return BadRequest(ApiResponse<object>.FailureResponse("Workspace could not be determined."));

            var invoice = await _master.MasterBillingTransactions
                .Include(t => t.Tenant)
                    .ThenInclude(tn => tn!.FeatureSubscriptions)
                .Include(t => t.FeatureSubscription)
                    .ThenInclude(fs => fs!.MasterFeatureCatalog)
                .FirstOrDefaultAsync(t => t.Id == id && t.Tenant != null && (
                    t.Tenant.TenantKey.ToLower() == key ||
                    (t.Tenant.PrimaryDomain != null && t.Tenant.PrimaryDomain.ToLower().StartsWith(key + ".")) ||
                    (t.Tenant.CustomDomain != null && t.Tenant.CustomDomain.ToLower() == key)
                ), cancellationToken);

            if (invoice == null || invoice.Tenant == null)
                return NotFound(ApiResponse<object>.FailureResponse("Invoice was not found."));

            if (string.Equals(invoice.Status, "Completed", StringComparison.OrdinalIgnoreCase))
                return BadRequest(ApiResponse<object>.FailureResponse("Duration cannot be modified on a paid invoice."));

            var tenant = invoice.Tenant;
            var (currCode, _, currRate, vatPercentage) = await ResolveTenantCurrencyContextAsync(tenant, cancellationToken);

            var currentDetail = await BuildFullInvoiceDetailDtoAsync(invoice, tenant, cancellationToken);
            var catalogFeatures = await _master.MasterFeatureCatalogs
                .AsNoTracking()
                .Where(f => f.IsActive)
                .ToListAsync(cancellationToken);

            var updatedLines = new List<BillingInvoiceLineItemDto>();
            foreach (var existingLine in currentDetail.LineItems)
            {
                var feat = catalogFeatures.FirstOrDefault(f =>
                    f.Id == existingLine.FeatureId ||
                    f.FeatureCode.Equals(existingLine.FeatureCode, StringComparison.OrdinalIgnoreCase));
                if (feat == null)
                {
                    updatedLines.Add(existingLine);
                    continue;
                }

                var sub = tenant.FeatureSubscriptions.FirstOrDefault(s => s.MasterFeatureCatalogId == feat.Id);
                bool matchesTarget = string.IsNullOrWhiteSpace(request.FeatureCode) ||
                                     feat.FeatureCode.Equals(request.FeatureCode.Trim(), StringComparison.OrdinalIgnoreCase);

                var desiredCadence = matchesTarget ? request.Cadence : existingLine.SelectedCadence;
                var rebuilt = BuildInvoiceLineItem(feat, sub, tenant.UseCustomPricing, currRate, desiredCadence);
                updatedLines.Add(rebuilt);
            }

            if (updatedLines.Count > 0)
            {
                var subTotal = Math.Round(updatedLines.Sum(x => x.LineTotal), 2);
                var vatAmt = vatPercentage > 0m ? Math.Round(subTotal * (vatPercentage / 100m), 2) : 0m;
                invoice.Amount = Math.Round(subTotal + vatAmt, 2);
                invoice.Currency = currCode;
                if (string.Equals(invoice.Status, "Failed", StringComparison.OrdinalIgnoreCase))
                {
                    invoice.Status = "Pending";
                }
                invoice.BillingCadence = updatedLines.Count == 1 ? updatedLines[0].SelectedCadence : "Mixed";
                invoice.Notes = updatedLines.Count == 1
                    ? $"{updatedLines[0].FeatureName} — {FormatCadenceDisplay(updatedLines[0].SelectedCadence)} Subscription Renewal"
                    : $"{updatedLines.Count} Capabilities ({string.Join(", ", updatedLines.Select(x => x.FeatureName))}) — Subscription Renewal";
                if (invoice.Notes.Length > 490) invoice.Notes = invoice.Notes[..490];
                invoice.LineItemsJson = System.Text.Json.JsonSerializer.Serialize(updatedLines);
                invoice.UpdatedUtc = DateTime.UtcNow;
                await _master.SaveChangesAsync(cancellationToken);
            }

            var updatedDetail = await BuildFullInvoiceDetailDtoAsync(invoice, tenant, cancellationToken);
            return Ok(ApiResponse<BillingInvoiceDetailDto>.SuccessResponse(updatedDetail, "Invoice duration and discount recalculated."));
        }

        /// <summary>
        /// Initializes Paystack Inline / Redirect Checkout for an existing Pending invoice on <c>/billing/invoices/:id</c>.
        /// Resolves Central Paystack credentials strictly from <see cref="MasterCatalogDbContext.MasterPlatformSettings"/>.
        /// </summary>
        [HttpPost("invoices/{id:guid}/pay/paystack")]
        [Authorize(Roles = "SuperAdmin,Admin")]
        [ProducesResponseType(typeof(ApiResponse<InitializeFeaturePaymentResponseDto>), 200)]
        [ProducesResponseType(typeof(ApiResponse<object>), 400)]
        public async Task<IActionResult> PayInvoiceWithPaystack(Guid id, CancellationToken cancellationToken)
        {
            if (_paymentGateway == null)
                return BadRequest(ApiResponse<object>.FailureResponse("Paystack payment gateway service is not registered."));

            var key = ResolveTenantKey();
            if (string.IsNullOrWhiteSpace(key))
                return BadRequest(ApiResponse<object>.FailureResponse("Workspace could not be determined."));

            var invoice = await _master.MasterBillingTransactions
                .Include(t => t.Tenant)
                .FirstOrDefaultAsync(t => t.Id == id && t.Tenant != null && (
                    t.Tenant.TenantKey.ToLower() == key ||
                    (t.Tenant.PrimaryDomain != null && t.Tenant.PrimaryDomain.ToLower().StartsWith(key + ".")) ||
                    (t.Tenant.CustomDomain != null && t.Tenant.CustomDomain.ToLower() == key)
                ), cancellationToken);

            if (invoice == null || invoice.Tenant == null)
                return NotFound(ApiResponse<object>.FailureResponse("Invoice was not found."));

            if (string.Equals(invoice.Status, "Completed", StringComparison.OrdinalIgnoreCase))
                return BadRequest(ApiResponse<object>.FailureResponse("This invoice has already been paid."));

            var tenant = invoice.Tenant;
            var (currCode, currSymbol, _, _) = await ResolveTenantCurrencyContextAsync(tenant, cancellationToken);
            var refreshedDetail = await BuildFullInvoiceDetailDtoAsync(invoice, tenant, cancellationToken);
            if (refreshedDetail.TotalAmount > 0m && invoice.Amount != refreshedDetail.TotalAmount)
            {
                invoice.Amount = refreshedDetail.TotalAmount;
            }

            var now = DateTime.UtcNow;
            var reference = $"PSK-CENTRAL-{now:yyyyMMddHHmmss}-{Guid.NewGuid().ToString("N")[..8].ToUpperInvariant()}";
            var payerEmail = User.FindFirstValue(ClaimTypes.Email)
                ?? User.FindFirst("email")?.Value
                ?? (!string.IsNullOrWhiteSpace(tenant.AdminEmail) ? tenant.AdminEmail : "billing@company.com");

            invoice.PaymentProvider = "Paystack";
            invoice.TransactionRef = reference;
            if (string.Equals(invoice.Status, "Failed", StringComparison.OrdinalIgnoreCase))
            {
                invoice.Status = "Pending";
            }
            invoice.UpdatedUtc = now;
            await _master.SaveChangesAsync(cancellationToken);

            var initResult = await _paymentGateway.InitializeInlinePaymentAsync(new PaymentInitRequestDto
            {
                Scope = PaystackPaymentScope.CentralPlatform,
                Email = payerEmail,
                Amount = invoice.Amount,
                Currency = invoice.Currency ?? currCode,
                Reference = reference,
                Metadata = new Dictionary<string, string>
                {
                    ["scope"] = "central_platform",
                    ["tenant_key"] = tenant.TenantKey,
                    ["invoice_id"] = invoice.Id.ToString(),
                    ["invoice_number"] = invoice.InvoiceNumber ?? string.Empty,
                    ["feature_codes"] = invoice.FeatureCodesCsv ?? string.Empty,
                    ["cadence"] = invoice.BillingCadence ?? "Monthly"
                }
            }, cancellationToken);

            if (!initResult.IsSuccess)
            {
                return BadRequest(ApiResponse<object>.FailureResponse(
                    initResult.ErrorMessage,
                    errorCode: initResult.ErrorCode,
                    realError: initResult.RealError));
            }

            return Ok(ApiResponse<InitializeFeaturePaymentResponseDto>.SuccessResponse(new InitializeFeaturePaymentResponseDto
            {
                PublicKey = initResult.PublicKey,
                AccessCode = initResult.AccessCode,
                Reference = initResult.Reference,
                AuthorizationUrl = initResult.AuthorizationUrl,
                Amount = invoice.Amount,
                Currency = invoice.Currency ?? currCode,
                CurrencySymbol = currSymbol,
                Email = payerEmail,
                InvoiceNumber = invoice.InvoiceNumber ?? string.Empty,
                Cadence = invoice.BillingCadence ?? "Monthly",
                FeatureNames = new List<string> { invoice.Notes ?? "Capability Subscription" }
            }, "Paystack inline checkout initialized for invoice."));
        }

        /// <summary>
        /// Submits a Direct Bank Deposit transfer reference / payment proof for an invoice on <c>/billing/invoices/:id</c>.
        /// </summary>
        [HttpPost("invoices/{id:guid}/pay/bank-deposit")]
        [Authorize(Roles = "SuperAdmin,Admin")]
        [ProducesResponseType(typeof(ApiResponse<BillingInvoiceDetailDto>), 200)]
        [ProducesResponseType(typeof(ApiResponse<object>), 400)]
        public async Task<IActionResult> SubmitInvoiceBankDeposit(
            Guid id,
            [FromBody] SubmitBankDepositProofRequest request,
            CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(request.TransferReference))
                return BadRequest(ApiResponse<object>.FailureResponse("Please enter your bank transfer reference or narration."));

            var key = ResolveTenantKey();
            if (string.IsNullOrWhiteSpace(key))
                return BadRequest(ApiResponse<object>.FailureResponse("Workspace could not be determined."));

            var invoice = await _master.MasterBillingTransactions
                .Include(t => t.Tenant)
                    .ThenInclude(tn => tn!.FeatureSubscriptions)
                .FirstOrDefaultAsync(t => t.Id == id && t.Tenant != null && (
                    t.Tenant.TenantKey.ToLower() == key ||
                    (t.Tenant.PrimaryDomain != null && t.Tenant.PrimaryDomain.ToLower().StartsWith(key + ".")) ||
                    (t.Tenant.CustomDomain != null && t.Tenant.CustomDomain.ToLower() == key)
                ), cancellationToken);

            if (invoice == null || invoice.Tenant == null)
                return NotFound(ApiResponse<object>.FailureResponse("Invoice was not found."));

            var now = DateTime.UtcNow;
            var cleanProof = request.TransferReference.Trim();
            invoice.PaymentProvider = "BankDeposit";
            invoice.PaymentProofRef = cleanProof;
            invoice.TransactionRef = $"BNK-{now:yyyyMMdd}-{cleanProof}";
            invoice.Status = "AwaitingVerification";
            invoice.UpdatedUtc = now;

            _master.MasterAuditLogs.Add(new MasterAuditLog
            {
                UserId = User.Identity?.Name ?? invoice.Tenant.AdminEmail,
                UserName = User.Identity?.Name ?? invoice.Tenant.AdminEmail,
                Action = "SubmitBankDepositProof",
                EntityType = "MasterBillingTransaction",
                EntityId = invoice.Id.ToString(),
                Summary = $"Tenant '{invoice.Tenant.OrganizationName}' submitted Direct Bank Deposit proof '{cleanProof}' for Invoice {invoice.InvoiceNumber} ({invoice.Currency} {invoice.Amount:N2})",
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers["User-Agent"].ToString(),
                CreatedUtc = now
            });

            _master.MasterNotifications.Add(new MasterNotification
            {
                Id = Guid.NewGuid(),
                Category = "Billing",
                Severity = "Warning",
                Icon = "account_balance",
                Title = $"Bank Deposit Proof — Invoice {invoice.InvoiceNumber}",
                Message = $"{invoice.Tenant.OrganizationName} submitted transfer ref '{cleanProof}' for {invoice.Currency} {invoice.Amount:N2}. Click to verify and activate capabilities.",
                ActionUrl = $"/centralwks/billing/details/{invoice.Id}",
                EntityId = invoice.Id.ToString(),
                DispatchedChannels = "InApp",
                CreatedUtc = now
            });

            await _master.SaveChangesAsync(cancellationToken);

            await LogTenantFeatureActivityAsync(
                "Bank Deposit Proof Submitted",
                $"Submitted Direct Bank Deposit reference '{cleanProof}' for Invoice {invoice.InvoiceNumber} ({invoice.Currency} {invoice.Amount:N2}).",
                cancellationToken);

            var detail = await BuildFullInvoiceDetailDtoAsync(invoice, invoice.Tenant, cancellationToken);
            return Ok(ApiResponse<BillingInvoiceDetailDto>.SuccessResponse(
                detail,
                $"Bank deposit reference '{cleanProof}' recorded for Invoice {invoice.InvoiceNumber}. Awaiting confirmation."));
        }

        private static string FormatCadenceDisplay(string? cadence) =>
            (cadence ?? "Monthly").Trim().ToLowerInvariant() switch
            {
                "yearly" => "1 Year (Annual)",
                "quarterly" => "3 Months (Quarterly)",
                _ => "1 Month (Monthly)"
            };

        private async Task<(string CurrCode, string CurrSymbol, decimal CurrRate, decimal VatPercentage)> ResolveTenantCurrencyContextAsync(
            MasterTenantCatalog tenant,
            CancellationToken cancellationToken)
        {
            string currCode = !string.IsNullOrWhiteSpace(tenant.DefaultCurrencyCode)
                ? tenant.DefaultCurrencyCode.Trim().ToUpperInvariant()
                : "NGN";
            string currSymbol = currCode == "NGN" ? "₦" : "$";
            decimal currRate = 1.0m;
            decimal vatPercentage = 0m;

            try
            {
                var rateObj = await _master.MasterCurrencyRates
                    .AsNoTracking()
                    .FirstOrDefaultAsync(r => r.IsActive && r.CurrencyCode.ToLower() == currCode.ToLower(), cancellationToken);
                if (rateObj != null)
                {
                    currSymbol = rateObj.CurrencySymbol;
                    currRate = rateObj.RateFromUsd > 0 ? rateObj.RateFromUsd : 1.0m;
                    vatPercentage = rateObj.VatPercentage > 0m ? Math.Round(rateObj.VatPercentage, 2) : 0m;
                }
            }
            catch { }

            return (currCode, currSymbol, currRate, vatPercentage);
        }

        private static BillingInvoiceLineItemDto BuildInvoiceLineItem(
            MasterFeatureCatalog feat,
            MasterTenantFeatureSubscription? sub,
            bool useCustomPricing,
            decimal currRate,
            string? requestedCadence)
        {
            bool hasCustomMonthly = useCustomPricing && sub?.CustomPriceOverride != null;
            bool hasCustomYearly = useCustomPricing && sub?.CustomYearlyPriceOverride != null;

            decimal monthlyUsd = hasCustomMonthly
                ? sub!.CustomPriceOverride!.Value
                : feat.MonthlyPrice;

            decimal yearlyUsd = hasCustomYearly
                ? sub!.CustomYearlyPriceOverride!.Value
                : (hasCustomMonthly
                    ? Math.Round(monthlyUsd * 10m, 2)
                    : (feat.YearlyPrice > 0 ? feat.YearlyPrice : Math.Round(monthlyUsd * 10m, 2)));

            decimal quarterlyUsd = hasCustomMonthly
                ? Math.Round(monthlyUsd * 3m * 0.9m, 2)
                : (feat.QuarterlyPrice > 0 ? feat.QuarterlyPrice : Math.Round(monthlyUsd * 3m * 0.9m, 2));

            decimal monthlyAmt = Math.Round(monthlyUsd * currRate, 2);
            decimal quarterlyAmt = Math.Round(quarterlyUsd * currRate, 2);
            decimal yearlyAmt = Math.Round(yearlyUsd * currRate, 2);

            bool isYearlyOnly = monthlyAmt <= 0m && yearlyAmt > 0m;
            bool isMonthlyOnly = monthlyAmt > 0m && yearlyAmt <= 0m;

            var supported = new List<string>();
            if (isYearlyOnly)
            {
                supported.Add("Yearly");
            }
            else if (isMonthlyOnly)
            {
                supported.Add("Monthly");
            }
            else
            {
                supported.Add("Monthly");
                if (quarterlyAmt > 0m) supported.Add("Quarterly");
                supported.Add("Yearly");
            }

            string selected = (requestedCadence ?? "Monthly").Trim();
            if (!supported.Any(s => s.Equals(selected, StringComparison.OrdinalIgnoreCase)))
            {
                selected = supported[0];
            }
            else
            {
                selected = supported.First(s => s.Equals(selected, StringComparison.OrdinalIgnoreCase));
            }

            // Calculate automatic discounts compared to 1-Month baseline
            decimal yearlySavings = 0m;
            int yearlyDiscountPct = 0;
            if (monthlyAmt > 0m && yearlyAmt > 0m && yearlyAmt < monthlyAmt * 12m)
            {
                yearlySavings = Math.Round((monthlyAmt * 12m) - yearlyAmt, 2);
                yearlyDiscountPct = (int)Math.Round((yearlySavings / (monthlyAmt * 12m)) * 100m);
            }

            decimal quarterlySavings = 0m;
            int quarterlyDiscountPct = 0;
            if (monthlyAmt > 0m && quarterlyAmt > 0m && quarterlyAmt < monthlyAmt * 3m)
            {
                quarterlySavings = Math.Round((monthlyAmt * 3m) - quarterlyAmt, 2);
                quarterlyDiscountPct = (int)Math.Round((quarterlySavings / (monthlyAmt * 3m)) * 100m);
            }

            decimal lineTotal = selected switch
            {
                "Yearly" => yearlyAmt,
                "Quarterly" => quarterlyAmt,
                _ => monthlyAmt
            };

            decimal appliedSavings = selected switch
            {
                "Yearly" => yearlySavings,
                "Quarterly" => quarterlySavings,
                _ => 0m
            };

            int appliedPct = selected switch
            {
                "Yearly" => yearlyDiscountPct,
                "Quarterly" => quarterlyDiscountPct,
                _ => 0
            };

            int months = selected switch
            {
                "Yearly" => 12,
                "Quarterly" => 3,
                _ => 1
            };

            return new BillingInvoiceLineItemDto
            {
                FeatureId = feat.Id,
                FeatureCode = feat.FeatureCode,
                FeatureName = feat.Name,
                Category = feat.Category,
                Icon = string.IsNullOrWhiteSpace(feat.Icon) ? "extension" : feat.Icon,
                SelectedCadence = selected,
                Months = months,
                IsYearlyOnly = isYearlyOnly,
                IsMonthlyOnly = isMonthlyOnly,
                SupportedCadences = supported,
                MonthlyPrice = monthlyAmt,
                QuarterlyPrice = quarterlyAmt,
                YearlyPrice = yearlyAmt,
                YearlyDiscountPercent = yearlyDiscountPct,
                YearlySavingsAmount = yearlySavings,
                QuarterlyDiscountPercent = quarterlyDiscountPct,
                QuarterlySavingsAmount = quarterlySavings,
                LineTotal = lineTotal,
                AppliedSavingsAmount = appliedSavings,
                AppliedDiscountPercent = appliedPct
            };
        }

        private async Task<BillingInvoiceDetailDto> BuildFullInvoiceDetailDtoAsync(
            MasterBillingTransaction invoice,
            MasterTenantCatalog tenant,
            CancellationToken cancellationToken)
        {
            var (currCode, currSymbol, currRate, vatPercentage) = await ResolveTenantCurrencyContextAsync(tenant, cancellationToken);
            if (!string.IsNullOrWhiteSpace(invoice.Currency))
            {
                currCode = invoice.Currency.ToUpperInvariant();
                try
                {
                    var matchedRate = await _master.MasterCurrencyRates
                        .AsNoTracking()
                        .FirstOrDefaultAsync(r => r.CurrencyCode.ToLower() == currCode.ToLower(), cancellationToken);
                    if (matchedRate != null)
                    {
                        currSymbol = matchedRate.CurrencySymbol;
                        currRate = matchedRate.RateFromUsd > 0 ? matchedRate.RateFromUsd : currRate;
                        vatPercentage = matchedRate.VatPercentage > 0m ? Math.Round(matchedRate.VatPercentage, 2) : 0m;
                    }
                }
                catch { }
            }

            List<BillingInvoiceLineItemDto>? lineItems = null;
            if (!string.IsNullOrWhiteSpace(invoice.LineItemsJson))
            {
                try
                {
                    lineItems = System.Text.Json.JsonSerializer.Deserialize<List<BillingInvoiceLineItemDto>>(invoice.LineItemsJson);
                }
                catch { }
            }

            if (lineItems == null || lineItems.Count == 0)
            {
                lineItems = new List<BillingInvoiceLineItemDto>();
                var codes = (invoice.FeatureCodesCsv ?? string.Empty)
                    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                    .Select(c => c.ToLowerInvariant())
                    .ToHashSet();

                var allFeatures = await _master.MasterFeatureCatalogs
                    .AsNoTracking()
                    .Where(f => f.IsActive)
                    .ToListAsync(cancellationToken);

                var matchedFeatures = new List<MasterFeatureCatalog>();
                if (codes.Count > 0)
                {
                    matchedFeatures.AddRange(allFeatures.Where(f => codes.Contains(f.FeatureCode.ToLowerInvariant())));
                }
                else if (invoice.FeatureSubscription?.MasterFeatureCatalog != null)
                {
                    matchedFeatures.Add(invoice.FeatureSubscription.MasterFeatureCatalog);
                }

                foreach (var feat in matchedFeatures)
                {
                    var sub = tenant.FeatureSubscriptions.FirstOrDefault(s => s.MasterFeatureCatalogId == feat.Id);
                    lineItems.Add(BuildInvoiceLineItem(feat, sub, tenant.UseCustomPricing, currRate, invoice.BillingCadence));
                }

                if (lineItems.Count == 0)
                {
                    lineItems.Add(new BillingInvoiceLineItemDto
                    {
                        FeatureId = Guid.Empty,
                        FeatureCode = "workspace-subscription",
                        FeatureName = invoice.Notes ?? "Workspace Subscription Charge",
                        Category = "Workspace",
                        Icon = "receipt_long",
                        SelectedCadence = invoice.BillingCadence ?? "Monthly",
                        Months = 1,
                        SupportedCadences = new List<string> { invoice.BillingCadence ?? "Monthly" },
                        MonthlyPrice = invoice.Amount,
                        YearlyPrice = invoice.Amount,
                        LineTotal = invoice.Amount
                    });
                }
            }

            // Resolve Central Platform Payment Gateways from MasterPlatformSettings
            MasterPlatformSetting? settings = null;
            try
            {
                settings = await _master.MasterPlatformSettings.AsNoTracking().FirstOrDefaultAsync(s => s.Id == 1, cancellationToken);
            }
            catch { }

            var paymentMethods = new List<BillingPaymentMethodOptionDto>();

            // 1. Paystack
            bool enablePaystack = settings?.EnablePaystack ?? true;
            if (enablePaystack)
            {
                bool paystackConfigured = !string.IsNullOrWhiteSpace(settings?.PaystackPublicKey) &&
                                          !string.IsNullOrWhiteSpace(settings?.PaystackSecretKey);
                paymentMethods.Add(new BillingPaymentMethodOptionDto
                {
                    ProviderCode = "Paystack",
                    Name = "Paystack",
                    Description = "Card, Bank Transfer, USSD, or Mobile Money",
                    Icon = "credit_card",
                    IsEnabled = true,
                    IsConfigured = paystackConfigured,
                    StatusBadge = paystackConfigured ? "Available" : "Not Available — Gateway Keys Not Configured",
                    PublicKey = paystackConfigured ? settings!.PaystackPublicKey : null
                });
            }

            // 2. Flutterwave
            bool enableFlutterwave = settings?.EnableFlutterwave ?? false;
            if (enableFlutterwave)
            {
                bool flwConfigured = !string.IsNullOrWhiteSpace(settings?.FlutterwavePublicKey) &&
                                     !string.IsNullOrWhiteSpace(settings?.FlutterwaveSecretKey);
                paymentMethods.Add(new BillingPaymentMethodOptionDto
                {
                    ProviderCode = "Flutterwave",
                    Name = "Flutterwave",
                    Description = "Multi-Currency Cards, Bank Account, M-Pesa, or Mobile Money",
                    Icon = "payments",
                    IsEnabled = true,
                    IsConfigured = flwConfigured,
                    StatusBadge = flwConfigured ? "Available" : "Not Available — Gateway Keys Not Configured",
                    PublicKey = flwConfigured ? settings!.FlutterwavePublicKey : null
                });
            }

            // 3. Stripe
            bool enableStripe = settings?.EnableStripe ?? false;
            if (enableStripe)
            {
                bool stripeConfigured = !string.IsNullOrWhiteSpace(settings?.StripePublishableKey) &&
                                        !string.IsNullOrWhiteSpace(settings?.StripeSecretKey);
                paymentMethods.Add(new BillingPaymentMethodOptionDto
                {
                    ProviderCode = "Stripe",
                    Name = "Stripe",
                    Description = "International Visa, Mastercard, Amex, Apple Pay & Google Pay",
                    Icon = "language",
                    IsEnabled = true,
                    IsConfigured = stripeConfigured,
                    StatusBadge = stripeConfigured ? "Available" : "Not Available — Gateway Keys Not Configured",
                    PublicKey = stripeConfigured ? settings!.StripePublishableKey : null
                });
            }

            // 4. Direct Bank Deposit
            bool enableBank = settings?.EnableBankDeposit ?? true;
            if (enableBank)
            {
                bool bankConfigured = !string.IsNullOrWhiteSpace(settings?.BankDepositBankName) &&
                                      !string.IsNullOrWhiteSpace(settings?.BankDepositAccountNumber);
                paymentMethods.Add(new BillingPaymentMethodOptionDto
                {
                    ProviderCode = "BankDeposit",
                    Name = "Direct Bank Deposit",
                    Description = "Transfer directly to corporate bank account and submit reference",
                    Icon = "account_balance",
                    IsEnabled = true,
                    IsConfigured = bankConfigured,
                    StatusBadge = bankConfigured ? "Available" : "Not Available — Bank Account Not Configured",
                    BankName = settings?.BankDepositBankName,
                    AccountName = settings?.BankDepositAccountName,
                    AccountNumber = settings?.BankDepositAccountNumber,
                    SortCodeOrSwift = settings?.BankDepositSortCodeOrSwift,
                    Instructions = settings?.BankDepositInstructions
                });
            }

            decimal totalSavings = Math.Round(lineItems.Sum(x => x.AppliedSavingsAmount), 2);
            decimal subtotalAmount = Math.Round(lineItems.Sum(x => x.LineTotal), 2);
            if (subtotalAmount <= 0m) subtotalAmount = invoice.Amount;

            decimal effectiveVatPct = vatPercentage > 0m ? Math.Round(vatPercentage, 2) : 0m;
            decimal vatAmount = effectiveVatPct > 0m ? Math.Round(subtotalAmount * (effectiveVatPct / 100m), 2) : 0m;
            decimal totalAmount = Math.Round(subtotalAmount + vatAmount, 2);

            if (!string.Equals(invoice.Status, "Completed", StringComparison.OrdinalIgnoreCase) &&
                totalAmount > 0m &&
                invoice.Amount != totalAmount)
            {
                try
                {
                    invoice.Amount = totalAmount;
                    await _master.SaveChangesAsync(cancellationToken);
                }
                catch { }
            }

            return new BillingInvoiceDetailDto
            {
                Id = invoice.Id,
                InvoiceNumber = invoice.InvoiceNumber ?? invoice.Id.ToString(),
                Status = invoice.Status,
                OrganizationName = tenant.OrganizationName,
                TenantKey = tenant.TenantKey,
                BillingEmail = !string.IsNullOrWhiteSpace(tenant.AdminEmail) ? tenant.AdminEmail : "billing@company.com",
                Currency = currCode,
                CurrencySymbol = currSymbol,
                SubtotalBeforeDiscount = Math.Round(subtotalAmount + totalSavings, 2),
                TotalSavingsAmount = totalSavings,
                SubtotalAmount = subtotalAmount,
                VatPercentage = effectiveVatPct,
                VatAmount = vatAmount,
                TotalAmount = totalAmount,
                PaymentProvider = invoice.PaymentProvider,
                Reference = invoice.TransactionRef,
                PaymentProofRef = invoice.PaymentProofRef,
                Notes = invoice.Notes,
                CreatedUtc = invoice.CreatedUtc,
                UpdatedUtc = invoice.UpdatedUtc,
                LineItems = lineItems,
                PaymentMethods = paymentMethods
            };
        }

        /// <summary>
        /// Generates the next sequential pure numeric invoice number (<c>YYYYMMNNNNN</c>, e.g. <c>20261000001</c>) for the given month.
        /// Parses the highest existing sequence number (MAX + 1) across both numeric and legacy <c>INV-</c> rows so numbers never collide.
        /// </summary>
        /// <param name="now">Reference timestamp.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        private async Task<string> NextInvoiceNumberAsync(DateTime now, CancellationToken cancellationToken)
        {
            var ym = $"{now:yyyyMM}";
            var legacyPrefix = $"INV-{ym}-";
            var existingNumbers = await _master.MasterBillingTransactions
                .AsNoTracking()
                .Where(t => t.InvoiceNumber != null &&
                            (t.InvoiceNumber.StartsWith(ym) || t.InvoiceNumber.StartsWith(legacyPrefix)))
                .Select(t => t.InvoiceNumber!)
                .ToListAsync(cancellationToken);

            int maxSeq = 0;
            foreach (var raw in existingNumbers)
            {
                var digits = new string(raw.Where(char.IsDigit).ToArray());
                if (digits.StartsWith(ym) && digits.Length > ym.Length)
                {
                    var seqPart = digits[ym.Length..];
                    if (int.TryParse(seqPart, out int parsed) && parsed > maxSeq)
                    {
                        maxSeq = parsed;
                    }
                }
            }

            return $"{ym}{maxSeq + 1:D5}";
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
