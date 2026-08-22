using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Persistence.EF.SQL;

namespace Ozikol_BCC.Application.Services
{
    /// <summary>
    /// Paystack hosted-checkout integration. Reads provider credentials from BCP settings
    /// and returns provider URLs/status only; transaction state changes belong in callers.
    /// Webhook handlers must still validate Paystack signatures before trusting provider payloads.
    /// </summary>
    public class PaystackService
    {
        private const string BaseUrl = "https://api.paystack.co";

        private readonly HttpClient _httpClient;
        private readonly DashboardDbContext _context;

        public PaystackService(HttpClient httpClient, DashboardDbContext context)
        {
            _httpClient = httpClient;
            _context = context;
        }

        // ──────────────────────────────────────────────────────────────
        // INITIALIZE — POST https://api.paystack.co/transaction/initialize
        // Returns authorization_url to redirect user to Paystack checkout
        // ──────────────────────────────────────────────────────────────
        public async Task<PaymentInitResult> InitializePaymentAsync(
            string transactionReference,
            decimal amount,
            string email,
            string callbackUrl)
        {
            var settings = await _context.BcpSettings.FirstOrDefaultAsync();

            // Provider availability is controlled from BCP Settings so billing can be enabled per tenant.
            // Missing credentials are treated as a configuration failure, not a thrown exception.
            if (settings == null
                || !settings.EnablePaystack
                || string.IsNullOrWhiteSpace(settings.PaystackSecretKey))
            {
                return new PaymentInitResult
                {
                    Success = false,
                    ErrorMessage = "Paystack is not configured or not enabled. Please update BCP Settings."
                };
            }

            // Paystack expects amount in kobo (smallest unit) — multiply by 100
            var amountKobo = (long)(amount * 100);

            var payload = new
            {
                email,
                amount = amountKobo,
                reference = transactionReference,
                callback_url = callbackUrl,
                currency = "NGN"
            };

            var json = JsonSerializer.Serialize(payload);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var request = new HttpRequestMessage(HttpMethod.Post, $"{BaseUrl}/transaction/initialize");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", settings.PaystackSecretKey.Trim());
            request.Content = content;

            try
            {
                var response = await _httpClient.SendAsync(request);
                var responseBody = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    return new PaymentInitResult
                    {
                        Success = false,
                        ErrorMessage = $"Paystack API error {(int)response.StatusCode}: {responseBody}"
                    };
                }

                using var doc = JsonDocument.Parse(responseBody);
                var root = doc.RootElement;

                // Paystack response: { "status": true, "data": { "authorization_url": "...", "reference": "..." } }
                if (root.TryGetProperty("data", out var data)
                    && data.TryGetProperty("authorization_url", out var urlEl))
                {
                    var url = urlEl.GetString();
                    if (!string.IsNullOrEmpty(url))
                        return new PaymentInitResult { Success = true, PaymentUrl = url };
                }

                return new PaymentInitResult
                {
                    Success = false,
                    ErrorMessage = $"Paystack responded OK but no authorization_url found. Response: {responseBody}"
                };
            }
            catch (Exception ex)
            {
                return new PaymentInitResult
                {
                    Success = false,
                    ErrorMessage = $"Network error calling Paystack: {ex.Message}"
                };
            }
        }

        // ──────────────────────────────────────────────────────────────
        // VERIFY — GET https://api.paystack.co/transaction/verify/{reference}
        // ──────────────────────────────────────────────────────────────
        public async Task<bool> VerifyPaymentAsync(string transactionReference)
        {
            var settings = await _context.BcpSettings.FirstOrDefaultAsync();

            // Verification is intentionally boolean here; callers decide how to update invoices/orders.
            // This method is safe as a callback fallback, but webhooks should still use signature validation.
            if (settings == null || string.IsNullOrWhiteSpace(settings.PaystackSecretKey))
                return false;

            var request = new HttpRequestMessage(HttpMethod.Get,
                $"{BaseUrl}/transaction/verify/{transactionReference}");
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", settings.PaystackSecretKey.Trim());

            try
            {
                var response = await _httpClient.SendAsync(request);
                if (!response.IsSuccessStatusCode) return false;

                var body = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(body);
                var root = doc.RootElement;

                // Paystack response: { "data": { "status": "success" } }
                if (root.TryGetProperty("data", out var data)
                    && data.TryGetProperty("status", out var statusEl))
                {
                    var status = statusEl.GetString()?.ToLowerInvariant();
                    return status == "success";
                }

                return false;
            }
            catch
            {
                return false;
            }
        }
    }
}

