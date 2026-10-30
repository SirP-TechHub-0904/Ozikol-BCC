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
    [Authorize(Roles = "SuperAdmin,Admin")]
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

            int catalogTrialDays = feature.FreeTrialDays > 0 ? feature.FreeTrialDays : 0;
            bool hasCustomTrialOverride = existing?.CustomFreeTrialDaysOverride != null;
            int effectiveFreeTrialDays = ((tenant.UseCustomPricing || tenant.UseCustomAvailability || hasCustomTrialOverride) && hasCustomTrialOverride)
                ? Math.Max(0, existing!.CustomFreeTrialDaysOverride!.Value)
                : catalogTrialDays;
            bool hasUsedFreeTrial = existing?.HasUsedFreeTrial ?? false;
            bool startFirstTimeTrial = targetActive && !feature.IsCompulsory && effectiveFreeTrialDays > 0 && !hasUsedFreeTrial;

            // Safeguard: If activating a paid capability when no first-time free trial applies,
            // only allow re-enabling if the tenant already holds an unexpired paid subscription that is currently suspended.
            // Renewals or expired/post-trial paid activations MUST go through Paystack Inline Checkout (/api/billing/features/paystack/initialize).
            bool hasUnexpiredPaidTerm = existing != null
                && !existing.IsTrialPeriod
                && !string.Equals(existing.Status, "Trial", StringComparison.OrdinalIgnoreCase)
                && existing.ExpiresAtUtc > now
                && !currentlyActive;

            if (targetActive && !feature.IsCompulsory && effectiveUsdPrice > 0m && !startFirstTimeTrial && !hasUnexpiredPaidTerm)
            {
                return BadRequest(ApiResponse<object>.FailureResponse(
                    $"Payment is required to activate or renew '{feature.Name}'. Please complete payment via Paystack Inline Checkout."));
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
                    else
                    {
                        existing.IsTrialPeriod = false;
                        existing.Status = "Active";
                        if (feature.IsCompulsory || effectiveUsdPrice <= 0m)
                        {
                            existing.StartsAtUtc = now;
                            existing.ExpiresAtUtc = now.AddYears(10);
                        }
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
                    ExpiresAtUtc = startFirstTimeTrial
                        ? now.AddDays(effectiveFreeTrialDays)
                        : now.AddYears(10),
                    AutoRenew = true,
                    IsActive = targetActive,
                    Status = targetActive ? (startFirstTimeTrial ? "Trial" : "Active") : "Suspended",
                    HasUsedFreeTrial = startFirstTimeTrial,
                    IsTrialPeriod = startFirstTimeTrial,
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
                return NotFound(ApiResponse<object>.FailureResponse("Workspace could not be found in Central Catalog."));

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

            // Resolve tenant's running currency and exchange rate from MasterCurrencyRates
            string currCode = !string.IsNullOrWhiteSpace(tenant.DefaultCurrencyCode)
                ? tenant.DefaultCurrencyCode.Trim().ToUpperInvariant()
                : "NGN";
            string currSymbol = currCode == "NGN" ? "₦" : "$";
            decimal currRate = 1.0m;

            try
            {
                var rateObj = await _master.MasterCurrencyRates
                    .AsNoTracking()
                    .FirstOrDefaultAsync(r => r.IsActive && r.CurrencyCode.ToLower() == currCode.ToLower(), cancellationToken);
                if (rateObj != null)
                {
                    currSymbol = rateObj.CurrencySymbol;
                    currRate = rateObj.RateFromUsd > 0 ? rateObj.RateFromUsd : 1.0m;
                }
            }
            catch { }

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

            var now = DateTime.UtcNow;
            var reference = $"PSK-CENTRAL-{now:yyyyMMddHHmmss}-{Guid.NewGuid().ToString("N")[..8].ToUpperInvariant()}";
            var invoiceNumber = await NextInvoiceNumberAsync(now, cancellationToken);
            var payerEmail = User.FindFirstValue(ClaimTypes.Email)
                ?? User.FindFirst("email")?.Value
                ?? (!string.IsNullOrWhiteSpace(tenant.AdminEmail) ? tenant.AdminEmail : "billing@company.com");

            var descriptionNote = featureNames.Count == 1
                ? $"{featureNames[0]} — {cadence} Subscription Renewal"
                : $"{featureNames.Count} Capabilities ({string.Join(", ", featureNames)}) — {cadence} Renewal";

            if (descriptionNote.Length > 490)
                descriptionNote = descriptionNote[..490];

            var invoice = new MasterBillingTransaction
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
                    ["invoice_number"] = invoiceNumber,
                    ["feature_codes"] = string.Join(",", resolvedCodes),
                    ["cadence"] = cadence.ToString()
                }
            }, cancellationToken);

            if (!initResult.IsSuccess)
            {
                invoice.Status = "Failed";
                invoice.UpdatedUtc = DateTime.UtcNow;
                await _master.SaveChangesAsync(cancellationToken);
                return BadRequest(ApiResponse<object>.FailureResponse(initResult.ErrorMessage));
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
                InvoiceNumber = invoiceNumber,
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
                return NotFound(ApiResponse<object>.FailureResponse("Billing transaction reference was not found in Central Catalog."));

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
                        ? "Payment could not be verified with Paystack."
                        : verification.ErrorMessage));
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
        /// </summary>
        private async Task FulfillCentralFeatureInvoiceAsync(
            MasterBillingTransaction invoice,
            MasterTenantCatalog tenant,
            CancellationToken cancellationToken)
        {
            var now = DateTime.UtcNow;
            invoice.Status = "Completed";
            invoice.PaymentProvider = "Paystack";
            invoice.UpdatedUtc = now;

            if (!Enum.TryParse<SubscriptionBillingDuration>(invoice.BillingCadence, true, out var cadence))
                cadence = SubscriptionBillingDuration.Monthly;

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
                decimal effectiveUsdPrice = (tenant.UseCustomPricing && sub?.CustomPriceOverride != null)
                    ? sub.CustomPriceOverride.Value
                    : feature.MonthlyPrice;

                if (sub != null)
                {
                    // If renewing an active paid subscription before expiry, extend from current ExpiresAtUtc so no paid days are lost;
                    // if upgrading from a free trial or renewing after expiration, extend from now.
                    var baseStart = (!sub.IsTrialPeriod && sub.ExpiresAtUtc > now) ? sub.ExpiresAtUtc : now;
                    sub.StartsAtUtc = now;
                    sub.ExpiresAtUtc = cadence switch
                    {
                        SubscriptionBillingDuration.Yearly => baseStart.AddYears(1),
                        SubscriptionBillingDuration.Quarterly => baseStart.AddMonths(3),
                        _ => baseStart.AddMonths(1)
                    };
                    sub.DurationType = cadence;
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
                        DurationType = cadence,
                        RecurringPrice = effectiveUsdPrice,
                        StartsAtUtc = now,
                        ExpiresAtUtc = cadence switch
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
                Summary = $"Tenant '{tenant.OrganizationName}' ({tenant.TenantKey}) paid {invoice.Currency} {invoice.Amount:N2} via Paystack ({invoice.InvoiceNumber}, Ref: {invoice.TransactionRef}) for {invoice.Notes}",
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
