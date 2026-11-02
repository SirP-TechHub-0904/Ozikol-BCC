using System.Collections.Generic;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Ozikol_BCC.Api.Models;
using Ozikol_BCC.Application.Common.Errors;

namespace Ozikol_BCC.Api.Controllers;

/// <summary>
/// Provides the standardized Error Code reference catalog ("ERR-XXXX") and user-friendly meanings
/// for the Client Admin Error Codes page under Audit Logs. Never exposes internal RealError logs.
/// </summary>
[ApiController]
[Route("api/error-codes")]
[Authorize]
public sealed class ErrorCodesController : ControllerBase
{
    /// <summary>
    /// Returns the complete list of standardized error codes, categories, custom messages, and plain-language meanings.
    /// </summary>
    /// <returns>Standardized API response containing all catalog error definitions.</returns>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<StandardErrorDefinition>>), 200)]
    public IActionResult GetErrorCodesCatalog()
    {
        var catalog = StandardErrorCodes.GetAll();
        return Ok(ApiResponse<IReadOnlyList<StandardErrorDefinition>>.SuccessResponse(
            catalog,
            "Standard error code catalog retrieved."));
    }
}

