using Ozikol_BCC.Persistence.EF.SQL;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.IO;
using System.Text.Json;
using System.Threading.Tasks;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Api.Controllers
{
    /// <summary>
    /// Public PixelPay webhook receiver endpoint.
    /// Webhooks allow anonymous access because PixelPay calls it server-to-server,
    /// outside any authenticated browser user session. Security is maintained by matching
    /// to an existing local transaction reference and validating provider event status.
    /// </summary>
    [ApiController]
    [Route("api/pixelpay-webhook")]
    [Tags("8. Payment Gateways & Paystack In-Form")]
    [Microsoft.AspNetCore.Authorization.AllowAnonymous]
    public class PixelPayWebhookController : ControllerBase
    {
        private readonly DashboardDbContext _context;

        /// <summary>
        /// Initializes a new instance of the <see cref="PixelPayWebhookController"/> class.
        /// </summary>
        /// <param name="context">The scoped tenant database context.</param>
        public PixelPayWebhookController(DashboardDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Handles incoming asynchronous PixelPay webhook events (e.g. charge.success, charge.failed).
        /// </summary>
        /// <returns>An HTTP 200 OK acknowledging receipt, or 400 on malformed payloads.</returns>
        [HttpPost]
        public async Task<IActionResult> HandleWebhook()
        {
            try
            {
                // Read the raw body
                using var reader = new StreamReader(Request.Body);
                var rawBody = await reader.ReadToEndAsync();

                using var doc = JsonDocument.Parse(rawBody);
                var root = doc.RootElement;

                // Extract only the values needed for local reconciliation.
                string? reference = null;
                string? status = null;
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
