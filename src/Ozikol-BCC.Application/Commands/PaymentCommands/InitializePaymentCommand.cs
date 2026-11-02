using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Ozikol_BCC.Application.Interfaces.Services;

namespace Ozikol_BCC.Application.Commands.PaymentCommands
{
    /// <summary>
    /// MediatR command to initialize a tenant-scoped Paystack inline payment transaction.
    /// Credentials are resolved strictly server-side from the tenant's database settings.
    /// </summary>
    public class InitializePaymentCommand : IRequest<PaymentInitResponseDto>
    {
        /// <summary>Gets or sets the payer's email address.</summary>
        public string Email { get; set; } = string.Empty;

        /// <summary>Gets or sets the transaction amount in major currency units.</summary>
        public decimal Amount { get; set; }

        /// <summary>Gets or sets the ISO 4217 currency code (default "NGN").</summary>
        public string Currency { get; set; } = "NGN";

        /// <summary>Gets or sets the optional client-supplied reference.</summary>
        public string Reference { get; set; } = string.Empty;

        /// <summary>Gets or sets the optional redirect callback URL.</summary>
        public string CallbackUrl { get; set; } = string.Empty;

        /// <summary>Gets or sets custom transaction metadata.</summary>
        public Dictionary<string, string> Metadata { get; set; } = new();
    }

    /// <summary>
    /// Handler for <see cref="InitializePaymentCommand"/>.
    /// </summary>
    public class InitializePaymentCommandHandler : IRequestHandler<InitializePaymentCommand, PaymentInitResponseDto>
    {
        private readonly IPaymentGatewayService _paymentService;

        /// <summary>
        /// Initializes a new instance of <see cref="InitializePaymentCommandHandler"/>.
        /// </summary>
        /// <param name="paymentService">Paystack payment gateway service.</param>
        public InitializePaymentCommandHandler(IPaymentGatewayService paymentService)
        {
            _paymentService = paymentService;
        }

        /// <inheritdoc />
        public async Task<PaymentInitResponseDto> Handle(InitializePaymentCommand request, CancellationToken cancellationToken)
        {
            return await _paymentService.InitializeInlinePaymentAsync(new PaymentInitRequestDto
            {
                Scope = PaystackPaymentScope.TenantWorkspace,
                Email = request.Email,
                Amount = request.Amount,
                Currency = request.Currency,
                Reference = request.Reference,
                CallbackUrl = request.CallbackUrl,
                Metadata = request.Metadata
            }, cancellationToken);
        }
    }

    /// <summary>
    /// MediatR command to verify a tenant-scoped Paystack transaction reference.
    /// </summary>
    public class VerifyPaymentCommand : IRequest<PaymentVerificationResponseDto>
    {
        /// <summary>Gets or sets the Paystack transaction reference.</summary>
        public string Reference { get; set; }

        /// <summary>
        /// Initializes a new instance of <see cref="VerifyPaymentCommand"/>.
        /// </summary>
        /// <param name="reference">Transaction reference to verify.</param>
        public VerifyPaymentCommand(string reference)
        {
            Reference = reference;
        }
    }

    /// <summary>
    /// Handler for <see cref="VerifyPaymentCommand"/>.
    /// </summary>
    public class VerifyPaymentCommandHandler : IRequestHandler<VerifyPaymentCommand, PaymentVerificationResponseDto>
    {
        private readonly IPaymentGatewayService _paymentService;

        /// <summary>
        /// Initializes a new instance of <see cref="VerifyPaymentCommandHandler"/>.
        /// </summary>
        /// <param name="paymentService">Paystack payment gateway service.</param>
        public VerifyPaymentCommandHandler(IPaymentGatewayService paymentService)
        {
            _paymentService = paymentService;
        }

        /// <inheritdoc />
        public async Task<PaymentVerificationResponseDto> Handle(VerifyPaymentCommand request, CancellationToken cancellationToken)
        {
            return await _paymentService.VerifyPaymentAsync(request.Reference, PaystackPaymentScope.TenantWorkspace, cancellationToken);
        }
    }
}
