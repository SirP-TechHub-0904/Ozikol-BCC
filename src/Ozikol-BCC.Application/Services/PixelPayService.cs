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
    /// PixelPay implementation of the shared BCP payment contract.
    /// It creates external payment links and verifies final status by transaction reference.
    /// Local transaction mutation should happen in webhook/callback handlers after reference validation.
    /// </summary>
    public class PixelPayService : IPaymentService
    {
        private readonly HttpClient _httpClient;
        private readonly DashboardDbContext _context;

        public PixelPayService(HttpClient httpClient, DashboardDbContext context)
        {
            _httpClient = httpClient;
            _context = context;
        }

        // ──────────────────────────────────────────────────────────────
        // CREATE PAYMENT LINK
        // ──────────────────────────────────────────────────────────────
        public async Task<PaymentInitResult> InitializePaymentAsync(
            string transactionReference,
            decimal amount,
            string currency,
            string callbackUrl,
            int expiryHours = 24)
        {
            var settings = await _context.BcpSettings.FirstOrDefaultAsync();

            // PixelPay credentials and default currency are tenant-controlled through BCP Settings.
            // Configuration problems are returned in PaymentInitResult so checkout pages can show guidance.
            if (settings == null
                || string.IsNullOrWhiteSpace(settings.PixelPayBaseUrl)
                || string.IsNullOrWhiteSpace(settings.PixelPayKeyId)
                || string.IsNullOrWhiteSpace(settings.PixelPaySecretKey))
            {
                return new PaymentInitResult
                {
                    Success = false,
                    ErrorMessage = "PixelPay is not fully configured. Please set the Base URL, Client ID, and Secret Key in BCP Settings."
                };
            }

            var baseUrl = settings.PixelPayBaseUrl.TrimEnd('/');

            var resolvedCurrency = string.IsNullOrWhiteSpace(settings.PixelPayCurrency)
                ? (string.IsNullOrWhiteSpace(currency) ? "NGN" : currency)
                : settings.PixelPayCurrency;

            var payload = new
            {
                amount,
                currency = resolvedCurrency,
                reference = transactionReference,
                hours = expiryHours,
                redirecturl = callbackUrl
            };

            var json = JsonSerializer.Serialize(payload);
            var content = new StringContent(json, Encoding.UTF8, "application/json");

            var request = new HttpRequestMessage(HttpMethod.Post,
                $"{baseUrl}/api/pixelpay/paymentlinks/external-generate");

            request.Headers.Add("token", settings.PixelPaySecretKey);
            request.Headers.Add("systemid", settings.PixelPayKeyId);
            request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("*/*"));
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
                        ErrorMessage = $"PixelPay API error {(int)response.StatusCode}: {responseBody}"
                    };
                }

                using var doc = JsonDocument.Parse(responseBody);
                var root = doc.RootElement;

                string paymentUrl = null;
                // PixelPay deployments may return the hosted URL under different property names.
                foreach (var field in new[] { "link", "paymentLink", "payment_link", "url", "checkoutUrl", "data" })
                {
                    if (root.TryGetProperty(field, out var el) && el.ValueKind == JsonValueKind.String)
                    {
                        paymentUrl = el.GetString();
                        break;
                    }
                }

                if (string.IsNullOrEmpty(paymentUrl))
                {
                    return new PaymentInitResult
                    {
                        Success = false,
                        ErrorMessage = $"PixelPay responded OK but no payment URL found. Response: {responseBody}"
                    };
                }

                return new PaymentInitResult { Success = true, PaymentUrl = paymentUrl };
            }
            catch (Exception ex)
            {
                return new PaymentInitResult
                {
                    Success = false,
                    ErrorMessage = $"Network error calling PixelPay: {ex.Message}"
                };
            }
        }

        // ──────────────────────────────────────────────────────────────
        // VERIFY PAYMENT (webhook / callback fallback)
        // ──────────────────────────────────────────────────────────────
        public async Task<bool> VerifyPaymentAsync(string transactionReference)
        {
            var settings = await _context.BcpSettings.FirstOrDefaultAsync();

            // Verification does not mutate local transaction state; webhook/callback handlers own that decision.
            // Use this as a fallback check when a browser callback arrives before the provider webhook.
            if (settings == null
                || string.IsNullOrWhiteSpace(settings.PixelPayBaseUrl)
                || string.IsNullOrWhiteSpace(settings.PixelPaySecretKey))
                return false;

            var baseUrl = settings.PixelPayBaseUrl.TrimEnd('/');

            var request = new HttpRequestMessage(HttpMethod.Get,
                $"{baseUrl}/api/pixelpay/paymentlinks/{transactionReference}/status");

            request.Headers.Add("token", settings.PixelPaySecretKey);
            request.Headers.Add("systemid", settings.PixelPayKeyId);

            try
            {
                var response = await _httpClient.SendAsync(request);
                if (!response.IsSuccessStatusCode) return false;

                var body = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(body);
                var root = doc.RootElement;

                if (root.TryGetProperty("status", out var statusEl))
                {
                    var status = statusEl.GetString()?.ToUpperInvariant();
                    return status == "PAID" || status == "SUCCESS" || status == "00";
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

