using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Ozikol_BCC.Api.Models;
using Ozikol_BCC.Application.Commands.SetupCommands;
using Ozikol_BCC.Application.Queries.SetupQueries;

namespace Ozikol_BCC.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Route("api/Setup")]
    [AllowAnonymous]
    [Tags("1. Setup & Platform Initialization")]
    public class SetupApiController : ControllerBase
    {
        private readonly IMediator _mediator;

        public SetupApiController(IMediator mediator)
        {
            _mediator = mediator;
        }

        /// <summary>
        /// Gets current tenant setup status (Checks if initial setup has been performed).
        /// </summary>
        /// <response code="200">Returns current setup status object.</response>
        [HttpGet("status")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(ApiResponse<SetupStatusDto>), 200)]
        public async Task<IActionResult> GetStatus()
        {
            var status = await _mediator.Send(new GetSetupStatusQuery());
            return Ok(ApiResponse<SetupStatusDto>.SuccessResponse(status, "Tenant setup status retrieved."));
        }

        /// <summary>
        /// Gets dynamic client application configuration and third-party integration keys.
        /// Distributed to Angular Web, Flutter Desktop, and Flutter Mobile clients during initial startup.
        /// </summary>
        /// <response code="200">Returns dynamic public client configuration parameters.</response>
        [HttpGet("client-config")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(ApiResponse<ClientAppConfigDto>), 200)]
        public async Task<IActionResult> GetClientConfig()
        {
            var config = await _mediator.Send(new GetClientAppConfigQuery());
            return Ok(ApiResponse<ClientAppConfigDto>.SuccessResponse(config, "Client application configuration retrieved successfully."));
        }
    }
}
