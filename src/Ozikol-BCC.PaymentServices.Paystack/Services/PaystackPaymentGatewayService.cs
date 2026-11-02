using System;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Ozikol.MasterPersistence.EF.MasterSQL;
using Ozikol_BCC.Application.Interfaces.Services;
using Ozikol_BCC.Persistence.EF.SQL;

namespace Ozikol_BCC.PaymentServices.Paystack.Services
{
    /// <summary>
    /// Paystack payment gateway engine (<c>Ozikol-BCC.PaymentServices.Paystack</c>).
    /// Supports both Central Platform subscription/capability billing (<see cref="PaystackPaymentScope.CentralPlatform"/>)
    /// and Tenant Workspace payment collections (<see cref="PaystackPaymentScope.TenantWorkspace"/>).
    /// Credentials are resolved strictly inside the server from the respective database context and are never accepted from client requests.
    /// </summary>
    public class PaystackPaymentGatewayService : IPaymentGatewayService
    {
        private readonly HttpClient _httpClient;
        private readonly DashboardDbContext? _tenantDbContext;
        private readonly MasterCatalogDbContext? _masterDbContext;
        private readonly IConfiguration _configuration;

        /// <summary>
        /// Initializes a new instance of <see cref="PaystackPaymentGatewayService"/>.
        /// </summary>
        /// <param name="httpClient">HTTP client for communicating with <c>https://api.paystack.co</c>.</param>
        /// <param name="configuration">Application configuration for environment fallbacks.</param>
        /// <param name="tenantDbContext">Optional scoped tenant database context for <see cref="PaystackPaymentScope.TenantWorkspace"/>.</param>
        /// <param name="masterDbContext">Optional master catalog database context for <see cref="PaystackPaymentScope.CentralPlatform"/>.</param>
        public PaystackPaymentGatewayService(
            HttpClient httpClient,
            IConfiguration configuration,
            DashboardDbContext? tenantDbContext = null,
            MasterCatalogDbContext? masterDbContext = null)
        {
            _httpClient = httpClient;
            _configuration = configuration;
            _tenantDbContext = tenantDbContext;
            _masterDbContext = masterDbContext;
        }

        /// <summary>
        /// Internal server-only credential tuple resolved from the database for a given execution scope.
        /// </summary>
        private sealed record ResolvedPaystackCredentials(
            bool IsEnabled,
            string PublicKey,
            string SecretKey,
            string ScopeLabel);

        /// <summary>
        /// Resolves the Paystack Public Key and Secret Key strictly from the internal database corresponding to <paramref name="scope"/>.
        /// Never reads keys from HTTP query strings, headers, or request bodies.
        /// </summary>
        private async Task<ResolvedPaystackCredentials> ResolveCredentialsFromDatabaseAsync(
            PaystackPaymentScope scope,
            CancellationToken cancellationToken)
        {
            if (scope == PaystackPaymentScope.CentralPlatform)
            {
                bool enabled = true;
                string? dbPublic = null;
                string? dbSecret = null;

                if (_masterDbContext != null)
                {
                    try
                    {
                        var masterSettings = await _masterDbContext.MasterPlatformSettings
                            .AsNoTracking()
                            .FirstOrDefaultAsync(s => s.Id == 1, cancellationToken);

                        if (masterSettings != null)
                        {
                            enabled = masterSettings.EnablePaystack;
                            dbPublic = masterSettings.PaystackPublicKey?.Trim();
                            dbSecret = masterSettings.PaystackSecretKey?.Trim();
                        }
                    }
                    catch
                    {
                        // Graceful fallback if the MasterPlatformSettings Paystack columns migration has not yet been applied
                    }
                }

                var finalSecret = !string.IsNullOrWhiteSpace(dbSecret)
                    ? dbSecret
                    : (_configuration["Paystack:SecretKey"]?.Trim() ?? string.Empty);

                var finalPublic = !string.IsNullOrWhiteSpace(dbPublic)
                    ? dbPublic
                    : (_configuration["Paystack:PublicKey"]?.Trim() ?? string.Empty);

                // Guard against unconfigured placeholder strings in .env
                if (finalSecret.Contains("xxxxxxxxxxxxxxxx", StringComparison.OrdinalIgnoreCase))
                    finalSecret = string.Empty;
                if (finalPublic.Contains("xxxxxxxxxxxxxxxx", StringComparison.OrdinalIgnoreCase))
                    finalPublic = string.Empty;

                return new ResolvedPaystackCredentials(enabled, finalPublic, finalSecret, "Central Platform (/centralwks/platform-settings)");
            }
            else
            {
                bool enabled = true;
                string? tenantPublic = null;
                string? tenantSecret = null;

                if (_tenantDbContext != null)
                {
                    try
                    {
                        var paymentSetting = await _tenantDbContext.MisConfigurationSettings
                            .AsNoTracking()
                            .FirstOrDefaultAsync(cancellationToken);

                        if (paymentSetting != null)
                        {
                            enabled = paymentSetting.EnablePaystack;
                            tenantPublic = paymentSetting.PaystackPublicKey?.Trim();
                            tenantSecret = paymentSetting.PaystackSecretKey?.Trim();
                        }
                    }
                    catch
                    {
                        // Fallback if tenant table is unavailable
                    }
                }

                var finalSecret = !string.IsNullOrWhiteSpace(tenantSecret)
                    ? tenantSecret
                    : (_configuration["Paystack:SecretKey"]?.Trim() ?? string.Empty);

                var finalPublic = !string.IsNullOrWhiteSpace(tenantPublic)
                    ? tenantPublic
                    : (_configuration["Paystack:PublicKey"]?.Trim() ?? string.Empty);

                if (finalSecret.Contains("xxxxxxxxxxxxxxxx", StringComparison.OrdinalIgnoreCase))
                    finalSecret = string.Empty;
                if (finalPublic.Contains("xxxxxxxxxxxxxxxx", StringComparison.OrdinalIgnoreCase))
                    finalPublic = string.Empty;

                return new ResolvedPaystackCredentials(enabled, finalPublic, finalSecret, "Workspace Payment Settings");
            }
        }

        /// <inheritdoc />
        public async Task<PaymentInitResponseDto> InitializeInlinePaymentAsync(
            PaymentInitRequestDto request,
            CancellationToken cancellationToken = default)
        {
            var creds = await ResolveCredentialsFromDatabaseAsync(request.Scope, cancellationToken);
            if (!creds.IsEnabled)
            {
                return new PaymentInitResponseDto
                {
                    IsSuccess = false,
                    ErrorCode = "ERR-3006",
                    ErrorMessage = "Paystack not enabled.",
                    RealError = $"Paystack integration is disabled in {creds.ScopeLabel}."
                };
            }

            if (string.IsNullOrWhiteSpace(creds.SecretKey))
            {
                return new PaymentInitResponseDto
                {
                    IsSuccess = false,
                    ErrorCode = "ERR-3006",
                    ErrorMessage = "Paystack not enabled.",
                    RealError = $"Paystack Secret Key is not configured in {creds.ScopeLabel}."
                };
            }

            try
            {
                using var httpRequest = new HttpRequestMessage(HttpMethod.Post, "https://api.paystack.co/transaction/initialize");
                httpRequest.Headers.Add("Authorization", $"Bearer {creds.SecretKey}");

                var reference = string.IsNullOrWhiteSpace(request.Reference)
                    ? $"PSK-{(request.Scope == PaystackPaymentScope.CentralPlatform ? "CENTRAL" : "TENANT")}-{Guid.NewGuid():N}"
                    : request.Reference.Trim();

                // Paystack expects amount in the smallest currency subunit (kobo/cents = amount * 100)
                var amountInSubunit = (long)Math.Round(request.Amount * 100m, 0, MidpointRounding.AwayFromZero);

                var payload = new
                {
                    email = string.IsNullOrWhiteSpace(request.Email) ? "billing@company.com" : request.Email.Trim(),
                    amount = amountInSubunit,
                    currency = string.IsNullOrWhiteSpace(request.Currency) ? "NGN" : request.Currency.Trim().ToUpperInvariant(),
                    reference,
                    callback_url = string.IsNullOrWhiteSpace(request.CallbackUrl) ? null : request.CallbackUrl,
                    metadata = request.Metadata
                };

                httpRequest.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
                var response = await _httpClient.SendAsync(httpRequest, cancellationToken);
                var bodyText = await response.Content.ReadAsStringAsync(cancellationToken);

                if (!response.IsSuccessStatusCode)
                {
                    string gatewayDetail = $"Paystack HTTP {(int)response.StatusCode}: {bodyText}";
                    try
                    {
                        using var errDoc = JsonDocument.Parse(bodyText);
                        if (errDoc.RootElement.TryGetProperty("message", out var msgEl) && !string.IsNullOrWhiteSpace(msgEl.GetString()))
                        {
                            gatewayDetail = $"Paystack HTTP {(int)response.StatusCode}: {msgEl.GetString()}";
                        }
                    }
                    catch { }

                    return new PaymentInitResponseDto
                    {
                        IsSuccess = false,
                        ErrorCode = "ERR-3001",
                        ErrorMessage = "Paystack unavailable.",
                        RealError = gatewayDetail
                    };
                }

                using var doc = JsonDocument.Parse(bodyText);
                var data = doc.RootElement.GetProperty("data");

                return new PaymentInitResponseDto
                {
                    IsSuccess = true,
                    PublicKey = creds.PublicKey,
                    AccessCode = data.TryGetProperty("access_code", out var ac) ? (ac.GetString() ?? string.Empty) : string.Empty,
                    Reference = data.TryGetProperty("reference", out var rf) ? (rf.GetString() ?? reference) : reference,
                    AuthorizationUrl = data.TryGetProperty("authorization_url", out var au) ? (au.GetString() ?? string.Empty) : string.Empty
                };
            }
            catch (Exception ex)
            {
                return new PaymentInitResponseDto
                {
                    IsSuccess = false,
                    ErrorCode = "ERR-3001",
                    ErrorMessage = "Paystack unavailable.",
                    RealError = $"Paystack initialization exception: {ex.Message}"
                };
            }
        }

        /// <inheritdoc />
        public async Task<PaymentVerificationResponseDto> VerifyPaymentAsync(
            string transactionReference,
            PaystackPaymentScope scope = PaystackPaymentScope.TenantWorkspace,
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(transactionReference))
            {
                return new PaymentVerificationResponseDto
                {
                    IsSuccess = false,
                    ErrorCode = "ERR-2002",
                    ErrorMessage = "Transaction reference is required.",
                    RealError = "VerifyPaymentAsync called with empty transactionReference."
                };
            }

            // Auto-detect CentralPlatform scope if reference starts with PSK-CENTRAL-
            var effectiveScope = transactionReference.StartsWith("PSK-CENTRAL-", StringComparison.OrdinalIgnoreCase)
                ? PaystackPaymentScope.CentralPlatform
                : scope;

            var creds = await ResolveCredentialsFromDatabaseAsync(effectiveScope, cancellationToken);
            if (string.IsNullOrWhiteSpace(creds.SecretKey))
            {
                return new PaymentVerificationResponseDto
                {
                    IsSuccess = false,
                    ErrorCode = "ERR-3006",
                    ErrorMessage = "Paystack not enabled.",
                    RealError = $"Paystack Secret Key is not configured in {creds.ScopeLabel}."
                };
            }

            try
            {
                using var httpRequest = new HttpRequestMessage(
                    HttpMethod.Get,
                    $"https://api.paystack.co/transaction/verify/{Uri.EscapeDataString(transactionReference.Trim())}");
                httpRequest.Headers.Add("Authorization", $"Bearer {creds.SecretKey}");

                var response = await _httpClient.SendAsync(httpRequest, cancellationToken);
                var bodyText = await response.Content.ReadAsStringAsync(cancellationToken);

                if (!response.IsSuccessStatusCode)
                {
                    string gatewayMsg = $"Paystack HTTP {(int)response.StatusCode}: {bodyText}";
                    try
                    {
                        using var errDoc = JsonDocument.Parse(bodyText);
                        if (errDoc.RootElement.TryGetProperty("message", out var msgEl) && !string.IsNullOrWhiteSpace(msgEl.GetString()))
                        {
                            gatewayMsg = $"Paystack HTTP {(int)response.StatusCode}: {msgEl.GetString()}";
                        }
                    }
                    catch { }

                    return new PaymentVerificationResponseDto
                    {
                        IsSuccess = false,
                        ErrorCode = "ERR-3004",
                        ErrorMessage = "Payment verification failed.",
                        RealError = gatewayMsg
                    };
                }

                using var doc = JsonDocument.Parse(bodyText);
                var data = doc.RootElement.GetProperty("data");
                var status = data.TryGetProperty("status", out var st) ? (st.GetString() ?? "failed") : "failed";
                var amountInSubunit = data.TryGetProperty("amount", out var am) ? am.GetInt64() : 0L;
                var isOk = status.Equals("success", StringComparison.OrdinalIgnoreCase);

                return new PaymentVerificationResponseDto
                {
                    IsSuccess = isOk,
                    Status = status,
                    TransactionReference = transactionReference.Trim(),
                    AmountPaid = (decimal)amountInSubunit / 100m,
                    Currency = data.TryGetProperty("currency", out var cu) ? (cu.GetString() ?? "NGN") : "NGN",
                    Channel = data.TryGetProperty("channel", out var ch) ? (ch.GetString() ?? "card") : "card",
                    PaidAt = DateTime.UtcNow,
                    ErrorCode = isOk ? string.Empty : "ERR-3004",
                    ErrorMessage = isOk ? string.Empty : "Payment verification failed.",
                    RealError = isOk ? null : $"Paystack verification returned status '{status}' for reference '{transactionReference}'."
                };
            }
            catch (Exception ex)
            {
                return new PaymentVerificationResponseDto
                {
                    IsSuccess = false,
                    ErrorCode = "ERR-3004",
                    ErrorMessage = "Payment verification failed.",
                    RealError = $"Paystack verification exception: {ex.Message}"
                };
            }
        }

        /// <inheritdoc />
        public Task<bool> ValidateWebhookSignatureAsync(string payload, string signatureHeader, string secretKey)
        {
            if (string.IsNullOrEmpty(signatureHeader) || string.IsNullOrEmpty(secretKey))
                return Task.FromResult(false);

            using var hmac = new HMACSHA512(Encoding.UTF8.GetBytes(secretKey.Trim()));
            var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
            var computedSignature = Convert.ToHexString(hash).ToLowerInvariant();

            return Task.FromResult(computedSignature.Equals(signatureHeader.Trim().ToLowerInvariant(), StringComparison.OrdinalIgnoreCase));
        }
    }
}
