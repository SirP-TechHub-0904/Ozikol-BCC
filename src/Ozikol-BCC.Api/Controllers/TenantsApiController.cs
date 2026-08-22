using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Ozikol_BCC.Api.Models;
using Ozikol_BCC.Infrastructure.TenantSupport;

namespace Ozikol_BCC.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [AllowAnonymous]
    [Tags("0. Multi-Tenant Provisioning & Management")]
    public class TenantsApiController : ControllerBase
    {
        private readonly ITenantProvisioningService _provisioningService;

        public TenantsApiController(ITenantProvisioningService provisioningService)
        {
            _provisioningService = provisioningService;
        }

        /// <summary>
        /// Provision a new tenant database dynamically online.
        /// Automatically creates the SQL Server database on the VPS, applies EF Core migrations,
        /// seeds the tenant admin user, and registers the master catalog entry with primary/custom domain URLs.
        /// </summary>
        /// <response code="200">Tenant successfully provisioned and ready.</response>
        /// <response code="400">Provisioning failed due to validation or database error.</response>
        [HttpPost("provision")]
        [ProducesResponseType(typeof(ApiResponse<ProvisionTenantResult>), 200)]
        [ProducesResponseType(typeof(ApiResponse<object>), 400)]
        public async Task<IActionResult> ProvisionTenant([FromBody] ProvisionTenantRequest request, CancellationToken cancellationToken)
        {
            var result = await _provisioningService.ProvisionTenantAsync(request, cancellationToken);
            if (!result.Success)
            {
                return BadRequest(ApiResponse<object>.FailureResponse(result.Message));
            }

            return Ok(ApiResponse<ProvisionTenantResult>.SuccessResponse(result, result.Message));
        }

        /// <summary>
        /// Get all registered tenants from the Master Catalog Database.
        /// </summary>
        /// <response code="200">List of registered tenant catalogs.</response>
        [HttpGet]
        [ProducesResponseType(typeof(ApiResponse<List<TenantCatalogDto>>), 200)]
        public async Task<IActionResult> GetAllTenants(CancellationToken cancellationToken)
        {
            var tenants = await _provisioningService.GetAllTenantsAsync(cancellationToken);
            return Ok(ApiResponse<List<TenantCatalogDto>>.SuccessResponse(tenants, "Registered tenants retrieved successfully."));
        }

        /// <summary>
        /// Activate or deactivate a tenant database.
        /// </summary>
        [HttpPatch("{tenantKey}/status")]
        [ProducesResponseType(typeof(ApiResponse<bool>), 200)]
        [ProducesResponseType(typeof(ApiResponse<object>), 404)]
        public async Task<IActionResult> ToggleTenantStatus(string tenantKey, [FromQuery] bool isActive, CancellationToken cancellationToken)
        {
            var success = await _provisioningService.ToggleTenantStatusAsync(tenantKey, isActive, cancellationToken);
            if (!success)
            {
                return NotFound(ApiResponse<object>.FailureResponse($"Tenant '{tenantKey}' was not found."));
            }

            string statusMsg = isActive ? "activated" : "deactivated";
            return Ok(ApiResponse<bool>.SuccessResponse(true, $"Tenant '{tenantKey}' has been {statusMsg}."));
        }

        /// <summary>
        /// Bind or update a custom domain for a tenant (e.g. "www.acmecorp.com").
        /// Primary platform domain remains active as failover backup.
        /// </summary>
        [HttpPatch("{tenantKey}/custom-domain")]
        [ProducesResponseType(typeof(ApiResponse<bool>), 200)]
        [ProducesResponseType(typeof(ApiResponse<object>), 404)]
        public async Task<IActionResult> UpdateCustomDomain(string tenantKey, [FromQuery] string? customDomain, CancellationToken cancellationToken)
        {
            var success = await _provisioningService.UpdateCustomDomainAsync(tenantKey, customDomain, cancellationToken);
            if (!success)
            {
                return NotFound(ApiResponse<object>.FailureResponse($"Tenant '{tenantKey}' was not found."));
            }

            return Ok(ApiResponse<bool>.SuccessResponse(true, $"Custom domain for tenant '{tenantKey}' updated successfully."));
        }
    }
}
