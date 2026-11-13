using System.Threading;
using System.Threading.Tasks;

namespace Ozikol_BCC.Infrastructure.Services.Domain;

/// <summary>
/// Service responsible for verifying DNS propagation, generating web server routing configurations (Nginx),
/// and provisioning automated SSL/TLS certificates (Let's Encrypt / Certbot / Cloudflare Custom Hostname)
/// for tenant custom domains.
/// </summary>
public interface ICustomDomainProvisioningService
{
    /// <summary>
    /// Validates domain name syntax according to RFC 1035 / RFC 1123 standards and checks against prohibited hostnames.
    /// </summary>
    /// <param name="domain">The raw domain or subdomain string to validate.</param>
    /// <returns>Validation result containing the sanitized domain or error details.</returns>
    DomainValidationResult ValidateDomain(string? domain);

    /// <summary>
    /// Probes public DNS to verify whether the domain resolves to the platform IPv4 address (2.24.162.42)
    /// or aliases via CNAME to the platform host.
    /// </summary>
    /// <param name="domain">The sanitized domain to verify.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Diagnostic DNS probe result containing detected IPs and matching status.</returns>
    Task<DomainDnsProbeResult> ProbeDnsAsync(string domain, CancellationToken cancellationToken = default);

    /// <summary>
    /// Provisions web server routing (Nginx vhost) and initiates SSL certificate issuance
    /// for the specified tenant custom domain, completely isolating it from Mailcow fallback.
    /// </summary>
    /// <param name="tenantKey">The tenant workspace identifier.</param>
    /// <param name="domain">The sanitized custom domain to provision.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Provisioning execution result with detailed stage outcomes.</returns>
    Task<DomainProvisioningResult> ProvisionDomainAsync(string tenantKey, string domain, CancellationToken cancellationToken = default);

    /// <summary>
    /// Deprovisions a custom domain, removing the associated Nginx vhost routing configuration.
    /// </summary>
    /// <param name="tenantKey">The tenant workspace identifier.</param>
    /// <param name="domain">The domain to deprovision.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Deprovisioning result.</returns>
    Task<DomainDeprovisionResult> DeprovisionDomainAsync(string tenantKey, string domain, CancellationToken cancellationToken = default);
}

