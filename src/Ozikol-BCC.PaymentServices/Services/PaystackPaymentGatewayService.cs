using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Ozikol_BCC.Application.Interfaces.Services;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;

namespace Ozikol_BCC.PaymentServices.Services
{
    public class PaystackPaymentGatewayService : IPaymentGatewayService
    {
        private readonly HttpClient _httpClient;
        private readonly DashboardDbContext _dbContext;
        private readonly IConfiguration _configuration;

        public PaystackPaymentGatewayService(HttpClient httpClient, DashboardDbContext dbContext, IConfiguration configuration)
        {
            _httpClient = httpClient;
            _dbContext = dbContext;
            _configuration = configuration;
        }

        private async Task<string> GetSecretKeyAsync(CancellationToken cancellationToken)
        {
            var paymentSetting = await _dbContext.MisConfigurationSettings.FirstOrDefaultAsync(cancellationToken);
            return paymentSetting?.PaystackSecretKey ?? _configuration["Paystack:SecretKey"] ?? string.Empty;
        }

        public async Task<PaymentInitResponseDto> InitializeInlinePaymentAsync(PaymentInitRequestDto request, CancellationToken cancellationToken = default)
        {
            var secretKey = await GetSecretKeyAsync(cancellationToken);
            if (string.IsNullOrEmpty(secretKey))
            {
                return new PaymentInitResponseDto { IsSuccess = false, ErrorMessage = "Paystack Secret Key is not configured." };
            }

            try
            {
                using var httpRequest = new HttpRequestMessage(HttpMethod.Post, "https://api.paystack.co/transaction/initialize");
                httpRequest.Headers.Add("Authorization", $"Bearer {secretKey}");

                var payload = new
                {
                    email = request.Email,
                    amount = (long)(request.Amount * 100), // Convert to kobo
                    currency = request.Currency,
                    reference = string.IsNullOrEmpty(request.Reference) ? Guid.NewGuid().ToString() : request.Reference,
                    callback_url = request.CallbackUrl,
                    metadata = request.Metadata
                };

                httpRequest.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
                var response = await _httpClient.SendAsync(httpRequest, cancellationToken);

                if (!response.IsSuccessStatusCode)
                {
                    return new PaymentInitResponseDto { IsSuccess = false, ErrorMessage = "Failed to initialize Paystack transaction." };
                }

                using var doc = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync(cancellationToken), cancellationToken: cancellationToken);
                var data = doc.RootElement.GetProperty("data");

                return new PaymentInitResponseDto
                {
                    IsSuccess = true,
                    AccessCode = data.GetProperty("access_code").GetString() ?? string.Empty,
                    Reference = data.GetProperty("reference").GetString() ?? string.Empty,
                    AuthorizationUrl = data.GetProperty("authorization_url").GetString() ?? string.Empty
                };
            }
            catch (Exception ex)
            {
                return new PaymentInitResponseDto { IsSuccess = false, ErrorMessage = $"Paystack error: {ex.Message}" };
            }
        }

        public async Task<PaymentVerificationResponseDto> VerifyPaymentAsync(string transactionReference, CancellationToken cancellationToken = default)
        {
            var secretKey = await GetSecretKeyAsync(cancellationToken);
            if (string.IsNullOrEmpty(secretKey))
            {
                return new PaymentVerificationResponseDto { IsSuccess = false, ErrorMessage = "Paystack Secret Key is not configured." };
            }

            try
            {
                using var httpRequest = new HttpRequestMessage(HttpMethod.Get, $"https://api.paystack.co/transaction/verify/{transactionReference}");
                httpRequest.Headers.Add("Authorization", $"Bearer {secretKey}");

                var response = await _httpClient.SendAsync(httpRequest, cancellationToken);
                if (!response.IsSuccessStatusCode)
                {
                    return new PaymentVerificationResponseDto { IsSuccess = false, ErrorMessage = "Paystack transaction verification failed." };
                }

                using var doc = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync(cancellationToken), cancellationToken: cancellationToken);
                var data = doc.RootElement.GetProperty("data");
                var status = data.GetProperty("status").GetString() ?? "failed";
                var amountInKobo = data.GetProperty("amount").GetInt64();

                return new PaymentVerificationResponseDto
                {
                    IsSuccess = status.Equals("success", StringComparison.OrdinalIgnoreCase),
                    Status = status,
                    TransactionReference = transactionReference,
                    AmountPaid = (decimal)amountInKobo / 100,
                    Currency = data.GetProperty("currency").GetString() ?? "NGN",
                    Channel = data.GetProperty("channel").GetString() ?? "card",
                    PaidAt = DateTime.UtcNow
                };
            }
            catch (Exception ex)
            {
                return new PaymentVerificationResponseDto { IsSuccess = false, ErrorMessage = $"Paystack verification error: {ex.Message}" };
            }
        }

        public Task<bool> ValidateWebhookSignatureAsync(string payload, string signatureHeader, string secretKey)
        {
            if (string.IsNullOrEmpty(signatureHeader) || string.IsNullOrEmpty(secretKey))
                return Task.FromResult(false);

            using var hmac = new HMACSHA512(Encoding.UTF8.GetBytes(secretKey));
            var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
            var computedSignature = Convert.ToHexString(hash).ToLower();

            return Task.FromResult(computedSignature.Equals(signatureHeader.ToLower(), StringComparison.OrdinalIgnoreCase));
        }
    }
}
