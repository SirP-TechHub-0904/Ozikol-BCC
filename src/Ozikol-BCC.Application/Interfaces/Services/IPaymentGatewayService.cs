using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Interfaces.Services
{
    /// <summary>
    /// Defines which database credential store and transaction ledger the Paystack gateway should use.
    /// Resolved strictly server-side from the database (never accepted from client query strings or request bodies).
    /// </summary>
    public enum PaystackPaymentScope
    {
        /// <summary>
        /// Tenant Workspace scope: resolves the tenant's own Paystack API keys from the tenant's
        /// <c>DashboardDbContext.MisConfigurationSettings</c> and records transactions in <c>BcpFinanceTransactions</c>.
        /// </summary>
        TenantWorkspace = 0,

        /// <summary>
        /// Central Platform scope: resolves Ozikol Central's Paystack API keys from
        /// <c>MasterCatalogDbContext.MasterPlatformSettings</c> and records transactions in <c>MasterBillingTransactions</c>.
        /// </summary>
        CentralPlatform = 1
    }

    /// <summary>
    /// Server-side Paystack initialization request DTO.
    /// Credentials are resolved internally by <see cref="IPaymentGatewayService"/> based on <see cref="Scope"/>.
    /// </summary>
    public class PaymentInitRequestDto
    {
        /// <summary>Gets or sets the execution scope (TenantWorkspace vs CentralPlatform).</summary>
        public PaystackPaymentScope Scope { get; set; } = PaystackPaymentScope.TenantWorkspace;

        /// <summary>Gets or sets the payer's email address required by Paystack.</summary>
        public string Email { get; set; } = string.Empty;

        /// <summary>Gets or sets the amount in major currency units (e.g., NGN 5,386.50, converted to kobo/cents internally).</summary>
        public decimal Amount { get; set; }

        /// <summary>Gets or sets the ISO 4217 currency code (e.g., "NGN", "USD", "GHS", "ZAR", "KES").</summary>
        public string Currency { get; set; } = "NGN";

        /// <summary>Gets or sets the unique transaction reference.</summary>
        public string Reference { get; set; } = string.Empty;

        /// <summary>Gets or sets the optional redirect callback URL.</summary>
        public string CallbackUrl { get; set; } = string.Empty;

        /// <summary>Gets or sets custom metadata attached to the Paystack transaction.</summary>
        public Dictionary<string, string> Metadata { get; set; } = new();
    }

    /// <summary>
    /// Response returned after initializing a Paystack inline or redirect payment transaction.
    /// </summary>
    public class PaymentInitResponseDto
    {
        /// <summary>Gets or sets whether initialization succeeded.</summary>
        public bool IsSuccess { get; set; }

        /// <summary>Gets or sets the non-secret Paystack Public Key (<c>pk_test_...</c> or <c>pk_live_...</c>) required by Paystack Inline Popup.</summary>
        public string PublicKey { get; set; } = string.Empty;

        /// <summary>Gets or sets the Paystack <c>access_code</c> for Paystack Inline Popup.</summary>
        public string AccessCode { get; set; } = string.Empty;

        /// <summary>Gets or sets the unique transaction reference.</summary>
        public string Reference { get; set; } = string.Empty;

        /// <summary>Gets or sets the hosted checkout authorization URL.</summary>
        public string AuthorizationUrl { get; set; } = string.Empty;

        /// <summary>Gets or sets the standardized error code (e.g., "ERR-3001").</summary>
        public string ErrorCode { get; set; } = string.Empty;

        /// <summary>Gets or sets the sanitized custom error message if initialization failed.</summary>
        public string ErrorMessage { get; set; } = string.Empty;

        /// <summary>Gets or sets the internal real error detail for Central logging only.</summary>
        [JsonIgnore]
        public string? RealError { get; set; }
    }

    /// <summary>
    /// Response returned after verifying a Paystack transaction reference against the Paystack API.
    /// </summary>
    public class PaymentVerificationResponseDto
    {
        /// <summary>Gets or sets whether the transaction was verified as successful.</summary>
        public bool IsSuccess { get; set; }

        /// <summary>Gets or sets the verified transaction reference.</summary>
        public string TransactionReference { get; set; } = string.Empty;

        /// <summary>Gets or sets the gateway status string ("success", "failed", "abandoned", "pending").</summary>
        public string Status { get; set; } = string.Empty;

        /// <summary>Gets or sets the verified amount paid in major currency units.</summary>
        public decimal AmountPaid { get; set; }

        /// <summary>Gets or sets the verified 3-letter ISO currency code.</summary>
        public string Currency { get; set; } = string.Empty;

        /// <summary>Gets or sets the payment channel used ("card", "bank", "ussd", "transfer").</summary>
        public string Channel { get; set; } = string.Empty;

        /// <summary>Gets or sets the UTC timestamp when payment was completed.</summary>
        public DateTime PaidAt { get; set; }

        /// <summary>Gets or sets the standardized error code (e.g., "ERR-3004").</summary>
        public string ErrorCode { get; set; } = string.Empty;

        /// <summary>Gets or sets the sanitized custom error message if verification failed.</summary>
        public string ErrorMessage { get; set; } = string.Empty;

        /// <summary>Gets or sets the internal real error detail for Central logging only.</summary>
        [JsonIgnore]
        public string? RealError { get; set; }
    }

    /// <summary>
    /// Unified Paystack payment gateway contract supporting both Central Platform billing
    /// (<see cref="PaystackPaymentScope.CentralPlatform"/>) and Tenant Workspace collections
    /// (<see cref="PaystackPaymentScope.TenantWorkspace"/>) with internal database credential resolution.
    /// </summary>
    public interface IPaymentGatewayService
    {
        /// <summary>
        /// Initializes a Paystack transaction for Inline Popup or Redirect checkout using database-resolved credentials for the specified scope.
        /// </summary>
        /// <param name="request">Initialization parameters including <see cref="PaystackPaymentScope"/>.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>Initialization result with <c>PublicKey</c>, <c>AccessCode</c>, and <c>Reference</c>.</returns>
        Task<PaymentInitResponseDto> InitializeInlinePaymentAsync(PaymentInitRequestDto request, CancellationToken cancellationToken = default);

        /// <summary>
        /// Verifies a Paystack transaction reference against the Paystack API using database-resolved credentials for the specified scope.
        /// </summary>
        /// <param name="transactionReference">Paystack transaction reference to verify.</param>
        /// <param name="scope">Execution scope (<see cref="PaystackPaymentScope.TenantWorkspace"/> or <see cref="PaystackPaymentScope.CentralPlatform"/>).</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>Verification details including exact amount paid, currency, and status.</returns>
        Task<PaymentVerificationResponseDto> VerifyPaymentAsync(
            string transactionReference,
            PaystackPaymentScope scope = PaystackPaymentScope.TenantWorkspace,
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Validates a Paystack webhook <c>x-paystack-signature</c> header using HMAC-SHA512.
        /// </summary>
        /// <param name="payload">Raw JSON request body.</param>
        /// <param name="signatureHeader">Value of the <c>x-paystack-signature</c> header.</param>
        /// <param name="secretKey">Webhook secret or Paystack secret key resolved from the database.</param>
        /// <returns>True when the signature is authentic.</returns>
        Task<bool> ValidateWebhookSignatureAsync(string payload, string signatureHeader, string secretKey);
    }
}
