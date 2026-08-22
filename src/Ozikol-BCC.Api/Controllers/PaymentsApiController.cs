using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Ozikol_BCC.Api.Models;
using Ozikol_BCC.Application.Commands.PaymentCommands;
using Ozikol_BCC.Application.Interfaces.Services;

namespace Ozikol_BCC.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Tags("8. Payment Gateways & Paystack In-Form")]
    public class PaymentsApiController : ControllerBase
    {
        private readonly IMediator _mediator;

        public PaymentsApiController(IMediator mediator)
        {
            _mediator = mediator;
        }

        /// <summary>
        /// Initializes a Paystack inline payment transaction and generates authorization code/URL.
        /// </summary>
        [HttpPost("initialize")]
        [Authorize]
        [ProducesResponseType(typeof(ApiResponse<PaymentInitResponseDto>), 200)]
        [ProducesResponseType(typeof(ApiResponse<object>), 400)]
        public async Task<IActionResult> InitializePayment([FromBody] InitializePaymentCommand command)
        {
            var result = await _mediator.Send(command);
            if (!result.IsSuccess) return BadRequest(ApiResponse<object>.FailureResponse(result.ErrorMessage ?? "Payment initialization failed."));
            return Ok(ApiResponse<PaymentInitResponseDto>.SuccessResponse(result, "Payment transaction initialized."));
        }

        /// <summary>
        /// Verifies a Paystack payment transaction status by reference.
        /// </summary>
        [HttpGet("verify/{reference}")]
        [Authorize]
        [ProducesResponseType(typeof(ApiResponse<PaymentVerificationResponseDto>), 200)]
        [ProducesResponseType(typeof(ApiResponse<object>), 400)]
        public async Task<IActionResult> VerifyPayment(string reference)
        {
            var result = await _mediator.Send(new VerifyPaymentCommand(reference));
            if (!result.IsSuccess) return BadRequest(ApiResponse<object>.FailureResponse(result.ErrorMessage ?? "Payment verification failed."));
            return Ok(ApiResponse<PaymentVerificationResponseDto>.SuccessResponse(result, "Payment verified successfully."));
        }
    }
}
