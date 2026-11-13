using System.Threading;
using System.Threading.Tasks;

namespace Ozikol_BCC.Infrastructure.Services.Email;

/// <summary>
/// Result of provisioning MX, SPF, DKIM, and DMARC records for a tenant mail domain in Cloudflare.
/// </summary>
/// <param name="Success">True if all required DNS records were verified or created.</param>
/// <param name="ErrorMessage">Detailed error message if any DNS operation failed.</param>
public sealed record CloudflareEmailDnsResult(bool Success, string? ErrorMessage = null);

/// <summary>
/// Service contract for automating Cloudflare DNS records (MX, SPF, DKIM, DMARC) for tenant email subdomains.
/// </summary>
public interface ICloudflareDnsService
{
    /// <summary>
    /// Ensures MX, SPF, DKIM, and DMARC records exist in Cloudflare for the specified tenant mail domain.
    /// </summary>
    /// <param name="domain">The tenant mail domain (e.g. nightpress.ozikol.cloud).</param>
    /// <param name="dkimTxtValue">The Mailcow DKIM public TXT record value (e.g. v=DKIM1; k=rsa; t=s; s=email; p=...).</param>
    /// <param name="cancellationToken">Cancellation token for async operations.</param>
    /// <returns>A <see cref="CloudflareEmailDnsResult"/> indicating success or detailed failure.</returns>
    Task<CloudflareEmailDnsResult> EnsureTenantEmailDnsAsync(
        string domain,
        string? dkimTxtValue,
        CancellationToken cancellationToken = default);
}

