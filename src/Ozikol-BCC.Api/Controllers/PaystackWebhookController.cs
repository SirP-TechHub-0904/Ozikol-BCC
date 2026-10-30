using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;
using Ozikol_BCC.Api.Services;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Api.Controllers
{
    /// <summary>
    /// Dual-scope Paystack webhook receiver endpoint supporting:
    /// 1. Central Platform Webhooks (<c>POST /api/paystack-webhook/central</c>) — validates signatures against
    ///    <c>MasterPlatformSettings</c> and reconciles <c>MasterBillingTransactions</c> + <c>MasterTenantFeatureSubscriptions</c>.
    /// 2. Tenant Workspace Webhooks (<c>POST /api/paystack-webhook</c> and <c>POST /api/paystack-webhook/tenant/{tenantKey}</c>) —
    ///    validates signatures against the tenant's <c>MisConfigurationSettings</c> and reconciles <c>BcpFinanceTransactions</c>.
    /// </summary>
    [ApiController]
    [Route("api/paystack-webhook")]
    [Tags("8. Payment Gateways & Paystack In-Form")]
    [Microsoft.AspNetCore.Authorization.AllowAnonymous]
    public class PaystackWebhookController : ControllerBase
    {
        private readonly DashboardDbContext _context;
        private readonly MasterCatalogDbContext? _masterDb;
        private readonly IBillingSnapshotService? _billingSnapshots;
        private readonly IConfiguration _configuration;

        /// <summary>
        /// Initializes a new instance of the <see cref="PaystackWebhookController"/> class.
        /// </summary>
        /// <param name="context">Scoped tenant database context.</param>
        /// <param name="configuration">Application configuration for fallback secrets.</param>
        /// <param name="masterDb">Optional Master catalog database context for Central platform webhooks.</param>
        /// <param name="billingSnapshots">Optional snapshot publisher for real-time tenant UI updates.</param>
        public PaystackWebhookController(
            DashboardDbContext context,
            IConfiguration configuration,
            MasterCatalogDbContext? masterDb = null,
            IBillingSnapshotService? billingSnapshots = null)
        {
            _context = context;
            _configuration = configuration;
            _masterDb = masterDb;
            _billingSnapshots = billingSnapshots;
        }

        /// <summary>
        /// Handles incoming Paystack webhook events for Ozikol Central Platform subscriptions &amp; capability renewals.
        /// Configure this URL in the Central Paystack Dashboard: <c>https://&lt;api-domain&gt;/api/paystack-webhook/central</c>.
        /// </summary>
        [HttpPost("central")]
        public async Task<IActionResult> HandleCentralWebhook(CancellationToken cancellationToken)
        {
            using var reader = new StreamReader(Request.Body);
            var rawBody = await reader.ReadToEndAsync(cancellationToken);
            var signature = Request.Headers["x-paystack-signature"].ToString();

            return await ProcessCentralWebhookPayloadAsync(rawBody, signature, cancellationToken);
        }

        /// <summary>
        /// Handles incoming Paystack webhook events for a specific Tenant Workspace.
        /// Configure this URL in the Tenant's Paystack Dashboard: <c>https://&lt;api-domain&gt;/api/paystack-webhook/tenant/{tenantKey}</c>
        /// or <c>https://&lt;tenant-subdomain&gt;/api/paystack-webhook</c>.
        /// </summary>
        [HttpPost]
        [HttpPost("tenant/{tenantKey?}")]
        public async Task<IActionResult> HandleWebhook([FromRoute] string? tenantKey = null, CancellationToken cancellationToken = default)
        {
            try
            {
                using var reader = new StreamReader(Request.Body);
                var rawBody = await reader.ReadToEndAsync(cancellationToken);
                var signature = Request.Headers["x-paystack-signature"].ToString();

                // Peek at reference to automatically route PSK-CENTRAL-* events to Central webhook processor
                try
                {
                    using var peekDoc = JsonDocument.Parse(rawBody);
                    if (peekDoc.RootElement.TryGetProperty("data", out var peekData) &&
                        peekData.TryGetProperty("reference", out var peekRef))
                    {
                        var refStr = peekRef.GetString();
                        if (!string.IsNullOrWhiteSpace(refStr) && refStr.StartsWith("PSK-CENTRAL-", StringComparison.OrdinalIgnoreCase))
                        {
                            return await ProcessCentralWebhookPayloadAsync(rawBody, signature, cancellationToken);
                        }
                    }
                }
                catch { }

                bool signatureValid = false;
                bool secretsConfigured = false;

                var managementSettings = await _context.MisConfigurationSettings.FirstOrDefaultAsync(cancellationToken);

                // Prefer the tenant-configured webhook secret or secret key
                var tenantSecret = !string.IsNullOrWhiteSpace(managementSettings?.PaystackWebhookSecret)
                    ? managementSettings.PaystackWebhookSecret
                    : managementSettings?.PaystackSecretKey;

                if (!string.IsNullOrWhiteSpace(tenantSecret))
                {
                    secretsConfigured = true;
                    signatureValid = VerifySignature(rawBody, tenantSecret, signature);
                }

                var devSecret = _configuration["Paystack:SecretKey"];
                if (!signatureValid && !string.IsNullOrWhiteSpace(devSecret) && !devSecret.Contains("xxxxxxxxxxxxxxxx"))
                {
                    secretsConfigured = true;
                    signatureValid = VerifySignature(rawBody, devSecret, signature);
                }

                if (secretsConfigured && !signatureValid)
                {
                    return Unauthorized(new { message = "Invalid tenant Paystack webhook signature." });
                }

                using var doc = JsonDocument.Parse(rawBody);
                var root = doc.RootElement;

                string? eventType = root.TryGetProperty("event", out var eventEl) ? eventEl.GetString() : null;
                if (eventType != "charge.success")
                    return Ok(new { message = $"Event '{eventType}' ignored." });

                string? reference = null;
                string? status = null;

                if (root.TryGetProperty("data", out var data))
                {
                    if (data.TryGetProperty("reference", out var refEl)) reference = refEl.GetString();
                    if (data.TryGetProperty("status", out var statusEl)) status = statusEl.GetString()?.ToLowerInvariant();
                }

                if (string.IsNullOrEmpty(reference))
                    return BadRequest(new { message = "No reference in payload." });

                if (reference.StartsWith("SMS-"))
                {
                    return await HandleSmsWebhook(reference, status, managementSettings);
                }

                if (reference.StartsWith("NEWS-"))
                {
                    return await HandleNewsletterWebhook(reference, status, managementSettings);
                }

                var tx = await _context.BcpFinanceTransactions
                    .FirstOrDefaultAsync(t => t.TransactionReference == reference, cancellationToken);

                if (tx == null)
                    return Ok(new { message = "Reference not found ignored." });

                if (status == "success")
                {
                    if (tx.Status != PaymentStatus.Success)
                    {
                        tx.Status = PaymentStatus.Success;
                        tx.PaidAt = DateTime.UtcNow;
                        await _context.SaveChangesAsync(cancellationToken);
                    }
                }
                else if (status == "failed" || status == "abandoned")
                {
                    if (tx.Status == PaymentStatus.Pending)
                    {
                        tx.Status = PaymentStatus.Failed;
                        await _context.SaveChangesAsync(cancellationToken);
                    }
                }

                return Ok(new { message = "Tenant webhook processed." });
            }
            catch (JsonException)
            {
                return BadRequest(new { message = "Invalid JSON payload." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        /// <summary>
        /// Validates and processes a Central Platform Paystack webhook payload against <see cref="MasterCatalogDbContext"/>.
        /// </summary>
        private async Task<IActionResult> ProcessCentralWebhookPayloadAsync(
            string rawBody,
            string signature,
            CancellationToken cancellationToken)
        {
            if (_masterDb == null)
                return StatusCode(500, new { message = "Master catalog database context is not available." });

            try
            {
                bool signatureValid = false;
                bool secretsConfigured = false;

                var platformSettings = await _masterDb.MasterPlatformSettings
                    .AsNoTracking()
                    .FirstOrDefaultAsync(s => s.Id == 1, cancellationToken);

                var centralWebhookSecret = !string.IsNullOrWhiteSpace(platformSettings?.PaystackWebhookSecret)
                    ? platformSettings!.PaystackWebhookSecret!.Trim()
                    : platformSettings?.PaystackSecretKey?.Trim();

                if (!string.IsNullOrWhiteSpace(centralWebhookSecret))
                {
                    secretsConfigured = true;
                    signatureValid = VerifySignature(rawBody, centralWebhookSecret, signature);
                }

                var fallbackSecret = _configuration["Paystack:SecretKey"];
                if (!signatureValid && !string.IsNullOrWhiteSpace(fallbackSecret) && !fallbackSecret.Contains("xxxxxxxxxxxxxxxx"))
                {
                    secretsConfigured = true;
                    signatureValid = VerifySignature(rawBody, fallbackSecret, signature);
                }

                if (secretsConfigured && !signatureValid)
                {
                    return Unauthorized(new { message = "Invalid Central Paystack webhook signature." });
                }

                using var doc = JsonDocument.Parse(rawBody);
                var root = doc.RootElement;

                string? eventType = root.TryGetProperty("event", out var eventEl) ? eventEl.GetString() : null;
                if (eventType != "charge.success")
                    return Ok(new { message = $"Central event '{eventType}' ignored." });

                if (!root.TryGetProperty("data", out var data))
                    return BadRequest(new { message = "Missing data object in payload." });

                var reference = data.TryGetProperty("reference", out var refEl) ? refEl.GetString() : null;
                var status = data.TryGetProperty("status", out var statusEl) ? statusEl.GetString()?.ToLowerInvariant() : null;
                var amountInSubunit = data.TryGetProperty("amount", out var amtEl) ? amtEl.GetInt64() : 0L;
                var paidAmount = (decimal)amountInSubunit / 100m;

                if (string.IsNullOrWhiteSpace(reference))
                    return BadRequest(new { message = "No reference in payload." });

                var invoice = await _masterDb.MasterBillingTransactions
                    .Include(t => t.Tenant)
                        .ThenInclude(tn => tn!.FeatureSubscriptions)
                    .FirstOrDefaultAsync(t => t.TransactionRef == reference, cancellationToken);

                if (invoice == null || invoice.Tenant == null)
                    return Ok(new { message = "Central invoice reference not found; ignored." });

                // Idempotent completion guard
                if (string.Equals(invoice.Status, "Completed", StringComparison.OrdinalIgnoreCase))
                    return Ok(new { message = "Central invoice already completed." });

                if (status == "success" && paidAmount + 0.05m >= invoice.Amount)
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
                        featuresToRenew = await _masterDb.MasterFeatureCatalogs
                            .Where(f => codes.Contains(f.FeatureCode.ToLower()))
                            .ToListAsync(cancellationToken);
                    }
                    else if (invoice.MasterTenantFeatureSubscriptionId.HasValue)
                    {
                        var subMatch = invoice.Tenant.FeatureSubscriptions.FirstOrDefault(s => s.Id == invoice.MasterTenantFeatureSubscriptionId.Value);
                        if (subMatch != null)
                        {
                            var feat = await _masterDb.MasterFeatureCatalogs.FirstOrDefaultAsync(f => f.Id == subMatch.MasterFeatureCatalogId, cancellationToken);
                            if (feat != null) featuresToRenew.Add(feat);
                        }
                    }

                    foreach (var feature in featuresToRenew)
                    {
                        var sub = invoice.Tenant.FeatureSubscriptions.FirstOrDefault(s => s.MasterFeatureCatalogId == feature.Id);
                        decimal effectiveUsdPrice = (invoice.Tenant.UseCustomPricing && sub?.CustomPriceOverride != null)
                            ? sub.CustomPriceOverride.Value
                            : feature.MonthlyPrice;

                        if (sub != null)
                        {
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
                            _masterDb.MasterTenantFeatureSubscriptions.Add(new MasterTenantFeatureSubscription
                            {
                                Id = Guid.NewGuid(),
                                MasterTenantCatalogId = invoice.Tenant.Id,
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

                    await _masterDb.SaveChangesAsync(cancellationToken);

                    if (_billingSnapshots != null)
                    {
                        await _billingSnapshots.PublishAsync(invoice.Tenant.TenantKey, cancellationToken);
                    }
                }
                else if (status == "failed" || status == "abandoned")
                {
                    invoice.Status = "Failed";
                    invoice.UpdatedUtc = DateTime.UtcNow;
                    await _masterDb.SaveChangesAsync(cancellationToken);
                }

                return Ok(new { message = "Central Paystack webhook processed." });
            }
            catch (JsonException)
            {
                return BadRequest(new { message = "Invalid JSON payload." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        private async Task<IActionResult> HandleSmsWebhook(string reference, string? status, MisConfigurationSetting? managementSettings)
        {
            var tx = await _context.BcpSmsTransactions.FirstOrDefaultAsync(t => t.Reference == reference);
            if (tx == null)
                return Ok(new { message = "SMS Reference not found ignored." });

            if (status == "success")
            {
                if (tx.Status != PaymentStatus.Success)
                {
                    if (managementSettings == null)
                    {
                        managementSettings = new MisConfigurationSetting();
                        _context.MisConfigurationSettings.Add(managementSettings);
                    }
                    managementSettings.SmsCreditBalance += tx.Amount;
                    tx.Status = PaymentStatus.Success;
                    await _context.SaveChangesAsync();
                }
            }
            else if (status == "failed" || status == "abandoned")
            {
                if (tx.Status == PaymentStatus.Pending)
                {
                    tx.Status = PaymentStatus.Failed;
                    await _context.SaveChangesAsync();
                }
            }
            return Ok(new { message = "SMS Webhook processed." });
        }

        private async Task<IActionResult> HandleNewsletterWebhook(string reference, string? status, MisConfigurationSetting? managementSettings)
        {
            var tx = await _context.BcpNewsletterPlanTransactions.Include(x => x.BcpNewsletterPlan).FirstOrDefaultAsync(t => t.Reference == reference);
            if (tx == null)
                return Ok(new { message = "Newsletter Reference not found ignored." });

            if (status == "success")
            {
                if (tx.Status != PaymentStatus.Success)
                {
                    tx.Status = PaymentStatus.Success;
                    tx.PaidAt = DateTime.UtcNow;
                    var plan = tx.BcpNewsletterPlan;

                    if (tx.IsGlobalPurchase)
                    {
                        if (managementSettings == null)
                        {
                            managementSettings = new MisConfigurationSetting();
                            _context.MisConfigurationSettings.Add(managementSettings);
                        }
                        managementSettings.GlobalNewsletterQuota += tx.Quota;
                        var newExpiry = DateTime.UtcNow.AddMonths(plan.DurationInMonths);
                        if (managementSettings.GlobalNewsletterQuotaExpiry == null || managementSettings.GlobalNewsletterQuotaExpiry < DateTime.UtcNow)
                        {
                            managementSettings.GlobalNewsletterQuotaExpiry = newExpiry;
                        }
                        else
                        {
                            managementSettings.GlobalNewsletterQuotaExpiry = managementSettings.GlobalNewsletterQuotaExpiry.Value.AddMonths(plan.DurationInMonths);
                        }
                    }
                    else
                    {
                        var wallet = await _context.BcpNewsletterWallets.FirstOrDefaultAsync(w => w.UserId == tx.UserId);
                        if (wallet == null)
                        {
                            wallet = new BcpNewsletterWallet
                            {
                                UserId = tx.UserId,
                                EmailQuotaBalance = tx.Quota,
                                ExpiryDate = DateTime.UtcNow.AddMonths(plan.DurationInMonths)
                            };
                            _context.BcpNewsletterWallets.Add(wallet);
                        }
                        else
                        {
                            wallet.EmailQuotaBalance += tx.Quota;
                            var newExpiry = DateTime.UtcNow.AddMonths(plan.DurationInMonths);
                            if (wallet.ExpiryDate == null || wallet.ExpiryDate < DateTime.UtcNow)
                            {
                                wallet.ExpiryDate = newExpiry;
                            }
                            else
                            {
                                wallet.ExpiryDate = wallet.ExpiryDate.Value.AddMonths(plan.DurationInMonths);
                            }
                        }

                        var wTx = new BcpNewsletterWalletTransaction
                        {
                            BcpNewsletterWalletId = wallet.Id,
                            Amount = tx.Quota,
                            TransactionType = Ozikol_BCC.Domain.Enum.Enum.BcpWalletTransactionType.Credit,
                            Description = $"Purchased Plan: {plan.Name}",
                            Date = DateTime.UtcNow
                        };
                        _context.BcpNewsletterWalletTransactions.Add(wTx);
                    }

                    await _context.SaveChangesAsync();
                }
            }
            else if (status == "failed" || status == "abandoned")
            {
                if (tx.Status == PaymentStatus.Pending)
                {
                    tx.Status = PaymentStatus.Failed;
                    await _context.SaveChangesAsync();
                }
            }
            return Ok(new { message = "Newsletter Webhook processed." });
        }

        private static bool VerifySignature(string payload, string secret, string signature)
        {
            using var hmac = new HMACSHA512(Encoding.UTF8.GetBytes(secret.Trim()));
            var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
            var computed = BitConverter.ToString(hash).Replace("-", "").ToLowerInvariant();
            return computed == signature?.Trim().ToLowerInvariant();
        }
    }
}
