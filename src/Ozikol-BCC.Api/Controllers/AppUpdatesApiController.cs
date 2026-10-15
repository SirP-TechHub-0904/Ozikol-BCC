using System.Threading.Tasks;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Ozikol_BCC.Api.Models;
using Ozikol_BCC.Application.Commands.SetupCommands;
using Ozikol_BCC.Application.Queries.SetupQueries;

namespace Ozikol_BCC.Api.Controllers
{
    /// <summary>
    /// API controller serving client application updates, OTA package distributions, and crash telemetry.
    /// Used by Angular Web, Flutter Desktop (Windows, macOS, Linux), and Flutter Mobile (Android, iOS).
    /// </summary>
    [ApiController]
    [Route("api/AppUpdates")]
    [AllowAnonymous]
    [Tags("1. Setup & Platform Initialization")]
    public class AppUpdatesApiController : ControllerBase
    {
        private readonly IMediator _mediator;

        /// <summary>
        /// Initializes a new instance of the <see cref="AppUpdatesApiController"/> class.
        /// </summary>
        /// <param name="mediator">MediatR dispatcher instance.</param>
        public AppUpdatesApiController(IMediator mediator)
        {
            _mediator = mediator;
        }

        /// <summary>
        /// Checks whether a newer release or mandatory security patch exists for the caller's platform and version.
        /// </summary>
        /// <param name="platform">Operating system platform ("windows", "macos", "linux", "android", "ios", "web").</param>
        /// <param name="version">Current running semantic version string (e.g., "1.0.0").</param>
        /// <param name="buildNumber">Current running sequential build number (e.g., 24).</param>
        /// <param name="channel">Release channel ("stable", "beta", "canary").</param>
        /// <returns>Evaluation result detailing whether an update is available or mandatory, with download URLs and checksums.</returns>
        [HttpGet("check-update")]
        [ProducesResponseType(typeof(ApiResponse<AppUpdateCheckResultDto>), 200)]
        public async Task<IActionResult> CheckUpdate(
            [FromQuery] string platform = "windows",
            [FromQuery] string version = "1.0.0",
            [FromQuery] int buildNumber = 1,
            [FromQuery] string channel = "stable")
        {
            var query = new CheckAppUpdateQuery(platform, version, buildNumber, channel);
            var result = await _mediator.Send(query);
            return Ok(ApiResponse<AppUpdateCheckResultDto>.SuccessResponse(result, "Client update status evaluated successfully."));
        }

        /// <summary>
        /// Ingests sanitized client-side crash telemetry and unhandled exceptions for administrative diagnostics.
        /// </summary>
        /// <param name="report">The sanitized crash report payload.</param>
        /// <returns>Acknowledgment of receipt.</returns>
        [HttpPost("crash-report")]
        [ProducesResponseType(typeof(ApiResponse<bool>), 200)]
        public async Task<IActionResult> SubmitCrashReport([FromBody] CrashReportDto report)
        {
            if (report == null)
            {
                return BadRequest(ApiResponse<bool>.FailureResponse("Crash report payload cannot be null."));
            }

            var success = await _mediator.Send(new SubmitCrashReportCommand(report));
            return Ok(ApiResponse<bool>.SuccessResponse(success, "Crash telemetry recorded successfully."));
        }
    }
}
