using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Services
{
    /// <summary>
    /// Shared payment-provider contract used by BCP checkout flows.
    /// Providers initialize a hosted checkout URL and verify final payment state by transaction reference.
    /// Implementations should not mutate local orders/invoices directly; webhook or callback handlers
    /// own final reconciliation so payment updates stay idempotent.
    /// </summary>
    public interface IPaymentService
    {
        /// <summary>
        /// Creates a PixelPay hosted payment link and returns the URL to redirect the user to.
        /// Uses POST /api/pixelpay/paymentlinks/external-generate
        /// </summary>
        /// <param name="transactionReference">Our unique transaction reference (stored in DB)</param>
        /// <param name="amount">Amount in the smallest currency unit (e.g. Kobo for NGN)</param>
        /// <param name="currency">Currency code e.g. NGN, USD</param>
        /// <param name="callbackUrl">Where PixelPay should redirect the user after payment</param>
        /// <param name="expiryHours">How many hours until the payment link expires</param>
        Task<PaymentInitResult> InitializePaymentAsync(
            string transactionReference,
            decimal amount,
            string currency,
            string callbackUrl,
            int expiryHours = 24);

        /// <summary>
        /// Verifies a payment by reference. Call this in the webhook handler or callback route.
        /// </summary>
        Task<bool> VerifyPaymentAsync(string transactionReference);
    }

    public class PaymentInitResult
    {
        /// <summary>
        /// True when the provider created a usable checkout URL.
        /// </summary>
        public bool Success { get; set; }

        /// <summary>
        /// Hosted provider checkout URL. Only valid when Success is true.
        /// </summary>
        public string PaymentUrl { get; set; }

        /// <summary>
        /// User/support-facing provider or configuration error when initialization fails.
        /// </summary>
        public string ErrorMessage { get; set; }
    }
}

