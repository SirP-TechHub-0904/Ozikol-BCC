using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Ozikol_BCC.Api.Models;
using Ozikol_BCC.Infrastructure.TenantSupport;

namespace Ozikol_BCC.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Route("api/Tenants")]
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
        /// Resolves a single organization workspace by access code, tenant key, or custom domain URL.
        /// </summary>
        /// <param name="identifier">Access code, subdomain, or custom web address.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>Matching workspace catalog details if found; otherwise 404.</returns>
        [HttpGet("resolve")]
        [ProducesResponseType(typeof(ApiResponse<TenantCatalogDto>), 200)]
        [ProducesResponseType(typeof(ApiResponse<object>), 404)]
        public async Task<IActionResult> ResolveTenant([FromQuery] string? identifier, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(identifier))
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Please enter a valid organization access code or web domain."));
            }

            var clean = identifier.Trim().ToLowerInvariant()
                .Replace("https://", "")
                .Replace("http://", "")
                .Replace("www.", "")
                .Split('/')[0];

            var hostWithoutPort = clean.Split(':')[0];
            string? subdomain = null;
            if (hostWithoutPort.Contains('.'))
            {
                var parts = hostWithoutPort.Split('.');
                if (parts.Length >= 2 &&
                    !parts[0].Equals("localhost", StringComparison.OrdinalIgnoreCase) &&
                    !parts[0].Equals("127", StringComparison.OrdinalIgnoreCase) &&
                    !parts[0].Equals("www", StringComparison.OrdinalIgnoreCase) &&
                    !parts[0].Equals("api", StringComparison.OrdinalIgnoreCase) &&
                    !parts[0].Equals("admin", StringComparison.OrdinalIgnoreCase) &&
                    !parts[0].Equals("central", StringComparison.OrdinalIgnoreCase))
                {
                    subdomain = parts[0];
                }
            }

            var tenants = await _provisioningService.GetAllTenantsAsync(cancellationToken);
            var match = tenants.FirstOrDefault(t => t.IsActive && (
                t.TenantKey.Equals(clean, StringComparison.OrdinalIgnoreCase) ||
                t.TenantKey.Equals(hostWithoutPort, StringComparison.OrdinalIgnoreCase) ||
                (!string.IsNullOrEmpty(subdomain) && t.TenantKey.Equals(subdomain, StringComparison.OrdinalIgnoreCase)) ||
                t.PrimaryDomain.Equals(clean, StringComparison.OrdinalIgnoreCase) ||
                t.PrimaryDomain.Split(':')[0].Equals(hostWithoutPort, StringComparison.OrdinalIgnoreCase) ||
                (!string.IsNullOrEmpty(subdomain) && t.PrimaryDomain.Split(':')[0].StartsWith(subdomain + ".", StringComparison.OrdinalIgnoreCase)) ||
                (!string.IsNullOrEmpty(t.CustomDomain) && (
                    t.CustomDomain.Equals(clean, StringComparison.OrdinalIgnoreCase) ||
                    t.CustomDomain.Split(':')[0].Equals(hostWithoutPort, StringComparison.OrdinalIgnoreCase)
                )) ||
                (!string.IsNullOrEmpty(t.WebsiteUrl) && t.WebsiteUrl.ToLowerInvariant().Contains(hostWithoutPort))
            ));

            if (match == null)
            {
                return NotFound(ApiResponse<object>.FailureResponse("Workspace could not be found."));
            }

            return Ok(ApiResponse<TenantCatalogDto>.SuccessResponse(match, "Workspace resolved successfully."));
        }

        /// <summary>
        /// Get all registered tenants from the catalog.
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
