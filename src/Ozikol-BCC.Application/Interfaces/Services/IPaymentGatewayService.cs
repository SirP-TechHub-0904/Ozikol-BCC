namespace Ozikol_BCC.Application.Interfaces.Services
{
    public class PaymentInitRequestDto
    {
        public string Email { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string Currency { get; set; } = "NGN";
        public string Reference { get; set; } = string.Empty;
        public string CallbackUrl { get; set; } = string.Empty;
        public Dictionary<string, string> Metadata { get; set; } = new();
    }

    public class PaymentInitResponseDto
    {
        public bool IsSuccess { get; set; }
        public string AccessCode { get; set; } = string.Empty; // For Paystack Popup / Inline
        public string Reference { get; set; } = string.Empty;
        public string AuthorizationUrl { get; set; } = string.Empty;
        public string ErrorMessage { get; set; } = string.Empty;
    }

    public class PaymentVerificationResponseDto
    {
        public bool IsSuccess { get; set; }
        public string TransactionReference { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty; // "success", "failed", "pending"
        public decimal AmountPaid { get; set; }
        public string Currency { get; set; } = string.Empty;
        public string Channel { get; set; } = string.Empty; // "card", "bank_transfer", "ussd"
        public DateTime PaidAt { get; set; }
        public string ErrorMessage { get; set; } = string.Empty;
    }

    public interface IPaymentGatewayService
    {
        Task<PaymentInitResponseDto> InitializeInlinePaymentAsync(PaymentInitRequestDto request, CancellationToken cancellationToken = default);
        Task<PaymentVerificationResponseDto> VerifyPaymentAsync(string transactionReference, CancellationToken cancellationToken = default);
        Task<bool> ValidateWebhookSignatureAsync(string payload, string signatureHeader, string secretKey);
    }
}
