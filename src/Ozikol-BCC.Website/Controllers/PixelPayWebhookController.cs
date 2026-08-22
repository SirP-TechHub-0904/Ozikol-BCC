using Ozikol_BCC.Persistence.EF.SQL;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.IO;
using System.Text.Json;
using System.Threading.Tasks;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Website.Controllers
{
    /// <summary>
    /// PixelPay webhook controller.
    /// This endpoint allows anonymous access because PixelPay calls it server-to-server,
    /// outside any browser login session. Treat every payload as untrusted until it is validated
    /// against provider signatures/secrets and matched to an existing local transaction reference.
    /// Register this URL in your PixelPay dashboard: ManagementSettings → Webhooks
    /// Endpoint: POST https://yourdomain.com/api/pixelpay-webhook
    ///
    /// PixelPay will POST to this endpoint whenever a payment event occurs.
    /// Event types: charge.success, charge.failed, refund.processed, transfer.success
    ///
    /// Payload contains: { "status": "PAID", "reference": "TX-...", "amount": 5000, ... }
    /// </summary>
    [ApiController]
    [Route("api/pixelpay-webhook")]
    [Microsoft.AspNetCore.Authorization.AllowAnonymous] // PixelPay servers POST here — must be publicly accessible
    public class PixelPayWebhookController : ControllerBase
    {
        private readonly DashboardDbContext _context;

        public PixelPayWebhookController(DashboardDbContext context)
        {
            _context = context;
        }

        [HttpPost]
        [Microsoft.AspNetCore.Authorization.AllowAnonymous]
        public async Task<IActionResult> HandleWebhook()
        {
            try
            {
                // Read the raw body first so future signature validation can use the exact provider payload.
                using var reader = new StreamReader(Request.Body);
                var rawBody = await reader.ReadToEndAsync();

                using var doc = JsonDocument.Parse(rawBody);
                var root = doc.RootElement;

                // Extract only the values needed for local reconciliation.
                // Do not trust amount/status alone without matching a local reference.
                string reference = null;
                string status = null;
                decimal amount = 0;

                if (root.TryGetProperty("reference", out var refEl)) reference = refEl.GetString();
                if (root.TryGetProperty("status", out var statusEl)) status = statusEl.GetString()?.ToUpperInvariant();
                if (root.TryGetProperty("amount", out var amountEl)) amountEl.TryGetDecimal(out amount);

                if (string.IsNullOrEmpty(reference))
                    return BadRequest(new { message = "No reference in payload." });

                // Find our local transaction. Unknown references are ignored with 200 OK so provider
                // retries do not keep hammering the endpoint for transactions we do not own.
                var tx = await _context.BcpFinanceTransactions
                    .FirstOrDefaultAsync(t => t.TransactionReference == reference);

                if (tx == null)
                    return Ok(new { message = "Reference not found — ignored." });

                // Idempotency rule: webhook deliveries may repeat, so do not rewrite successful records.
                if (status == "PAID" || status == "SUCCESS" || status == "00")
                {
                    if (tx.Status != PaymentStatus.Success)
                    {
                        tx.Status = PaymentStatus.Success;
                        tx.PaidAt = DateTime.UtcNow;
                        await _context.SaveChangesAsync();
                    }
                }
                else if (status == "FAILED" || status == "DECLINED" || status == "05")
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
    }
}

