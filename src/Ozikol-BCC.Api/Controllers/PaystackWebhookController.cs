using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Api.Controllers
{
    /// <summary>
    /// Public Paystack webhook receiver endpoint.
    /// Webhooks allow anonymous access because Paystack calls this URL server-to-server,
    /// outside any authenticated browser user session. Security is maintained through HMAC-SHA512
    /// signature validation, local reference verification, and idempotent ledger updates.
    /// </summary>
    [ApiController]
    [Route("api/paystack-webhook")]
    [Tags("8. Payment Gateways & Paystack In-Form")]
    [Microsoft.AspNetCore.Authorization.AllowAnonymous]
    public class PaystackWebhookController : ControllerBase
    {
        private readonly DashboardDbContext _context;
        private readonly IConfiguration _configuration;

        /// <summary>
        /// Initializes a new instance of the <see cref="PaystackWebhookController"/> class.
        /// </summary>
        /// <param name="context">The scoped tenant database context.</param>
        /// <param name="configuration">Application configuration for fallback secrets.</param>
        public PaystackWebhookController(DashboardDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        /// <summary>
        /// Handles incoming asynchronous Paystack webhook events (e.g., charge.success).
        /// </summary>
        /// <returns>An HTTP 200 OK acknowledging receipt, or 400/401 on malformed or untrusted payloads.</returns>
        [HttpPost]
        public async Task<IActionResult> HandleWebhook()
        {
            try
            {
                // Read the raw request body before JSON parsing. Paystack signatures are computed
                // against the exact raw payload, so middleware or re-serialization must not alter it.
                using var reader = new StreamReader(Request.Body);
                var rawBody = await reader.ReadToEndAsync();

                var signature = Request.Headers["x-paystack-signature"].ToString();
                bool signatureValid = false;
                bool secretsConfigured = false;

                var managementSettings = await _context.MisConfigurationSettings.FirstOrDefaultAsync();
                
                // Prefer the tenant-configured webhook secret. The appsetting secret is only a fallback
                // for development or transitional deployments where BCP settings have not been saved yet.
                if (managementSettings != null && !string.IsNullOrWhiteSpace(managementSettings.PaystackWebhookSecret))
                {
                    secretsConfigured = true;
                    signatureValid = VerifySignature(rawBody, managementSettings.PaystackWebhookSecret, signature);
                }

                var devSecret = _configuration["Paystack:SecretKey"];
                if (!signatureValid && !string.IsNullOrWhiteSpace(devSecret))
                {
                    secretsConfigured = true;
                    signatureValid = VerifySignature(rawBody, devSecret, signature);
                }

                if (secretsConfigured && !signatureValid)
                {
                    return Unauthorized(new { message = "Invalid signature." });
                }

                // Parse the event payload
                using var doc = JsonDocument.Parse(rawBody);
                var root = doc.RootElement;

                string? eventType = null;
                if (root.TryGetProperty("event", out var eventEl))
                    eventType = eventEl.GetString();

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

                // References determine the local payment lane (SMS credits, newsletter plans, or general finance).
                if (reference.StartsWith("SMS-"))
                {
                    return await HandleSmsWebhook(reference, status, managementSettings);
                }
                
                if (reference.StartsWith("NEWS-"))
                {
                    return await HandleNewsletterWebhook(reference, status, managementSettings);
                }

                var tx = await _context.BcpFinanceTransactions
                    .FirstOrDefaultAsync(t => t.TransactionReference == reference);

                if (tx == null)
                    return Ok(new { message = "Reference not found ignored." });

                // Idempotency rule: provider webhooks may be retried, so only transition records that
                // have not already reached a terminal success/failure state.
                if (status == "success")
                {
                    if (tx.Status != PaymentStatus.Success)
                    {
                        tx.Status = PaymentStatus.Success;
                        tx.PaidAt = DateTime.UtcNow;
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

                return Ok(new { message = "Webhook processed." });
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

            // Credit balance changes must happen only once. The Success guard prevents double-credit
            // when Paystack retries the same webhook event.
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

            // Newsletter quota can be global or per-user wallet quota. Keep this logic idempotent
            // because payment providers can deliver duplicate webhook notifications.
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
            // Paystack signs webhook payloads with HMAC-SHA512.
            using var hmac = new HMACSHA512(Encoding.UTF8.GetBytes(secret));
            var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
            var computed = BitConverter.ToString(hash).Replace("-", "").ToLowerInvariant();
            return computed == signature?.ToLowerInvariant();
        }
    }
}
