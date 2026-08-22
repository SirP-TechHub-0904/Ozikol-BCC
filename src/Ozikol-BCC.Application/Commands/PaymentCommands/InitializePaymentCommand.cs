using MediatR;
using Ozikol_BCC.Application.Interfaces.Services;

namespace Ozikol_BCC.Application.Commands.PaymentCommands
{
    public class InitializePaymentCommand : IRequest<PaymentInitResponseDto>
    {
        public string Email { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public string Currency { get; set; } = "NGN";
        public string Reference { get; set; } = string.Empty;
        public string CallbackUrl { get; set; } = string.Empty;
        public Dictionary<string, string> Metadata { get; set; } = new();
    }

    public class InitializePaymentCommandHandler : IRequestHandler<InitializePaymentCommand, PaymentInitResponseDto>
    {
        private readonly IPaymentGatewayService _paymentService;

        public InitializePaymentCommandHandler(IPaymentGatewayService paymentService)
        {
            _paymentService = paymentService;
        }

        public async Task<PaymentInitResponseDto> Handle(InitializePaymentCommand request, CancellationToken cancellationToken)
        {
            return await _paymentService.InitializeInlinePaymentAsync(new PaymentInitRequestDto
            {
                Email = request.Email,
                Amount = request.Amount,
                Currency = request.Currency,
                Reference = request.Reference,
                CallbackUrl = request.CallbackUrl,
                Metadata = request.Metadata
            }, cancellationToken);
        }
    }

    public class VerifyPaymentCommand : IRequest<PaymentVerificationResponseDto>
    {
        public string Reference { get; set; }

        public VerifyPaymentCommand(string reference)
        {
            Reference = reference;
        }
    }

    public class VerifyPaymentCommandHandler : IRequestHandler<VerifyPaymentCommand, PaymentVerificationResponseDto>
    {
        private readonly IPaymentGatewayService _paymentService;

        public VerifyPaymentCommandHandler(IPaymentGatewayService paymentService)
        {
            _paymentService = paymentService;
        }

        public async Task<PaymentVerificationResponseDto> Handle(VerifyPaymentCommand request, CancellationToken cancellationToken)
        {
            return await _paymentService.VerifyPaymentAsync(request.Reference, cancellationToken);
        }
    }
}
