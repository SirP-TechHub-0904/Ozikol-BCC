using System;
using System.Net;
using System.Threading;
using System.Threading.Tasks;

namespace Ozikol_BCC.Infrastructure.Security.Ssrf;

/// <summary>
/// Contract for auditing remote URLs, domain hosts, and resolved IP endpoints to prevent Server-Side Request Forgery (SSRF),
/// cloud metadata exfiltration, loopback exploitation, and internal network reconnaissance.
/// </summary>
public interface ISsrfProtectionValidator
{
    /// <summary>
    /// Audits a raw URL string against scheme allowlists, port restrictions, and multi-record DNS IP resolution safety rules.
    /// </summary>
    /// <param name="url">The remote URL string to validate.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>A structured <see cref="SsrfValidationResult"/> indicating whether the destination is safe for outbound fetching.</returns>
    Task<SsrfValidationResult> ValidateUrlAsync(string url, CancellationToken cancellationToken = default);

    /// <summary>
    /// Audits an absolute <see cref="Uri"/> instance against scheme allowlists, port restrictions, and multi-record DNS IP resolution safety rules.
    /// </summary>
    /// <param name="uri">The absolute destination URI to validate.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>A structured <see cref="SsrfValidationResult"/> indicating whether the destination is safe for outbound fetching.</returns>
    Task<SsrfValidationResult> ValidateUriAsync(Uri uri, CancellationToken cancellationToken = default);

    /// <summary>
    /// Verifies whether an individual IP address (IPv4 or IPv6) is a valid, globally routable public address,
    /// rejecting loopback, cloud metadata, private RFC 1918, link-local, and broadcast addresses.
    /// </summary>
    /// <param name="ip">The IP address to audit.</param>
    /// <returns>True if the IP address is verified as safe public infrastructure; otherwise, false.</returns>
    bool IsAllowedIp(IPAddress ip);

    /// <summary>
    /// Verifies whether the specified destination TCP port is permitted for outbound external communication.
    /// Strictly limits connections to standard HTTP/HTTPS egress ports (80 and 443).
    /// </summary>
    /// <param name="port">The destination port number.</param>
    /// <returns>True if the port is permitted; otherwise, false.</returns>
    bool IsAllowedPort(int port);

    /// <summary>
    /// Verifies whether the destination scheme is an approved web protocol (strictly http or https).
    /// </summary>
    /// <param name="scheme">The URL scheme identifier.</param>
    /// <returns>True if the scheme is permitted; otherwise, false.</returns>
    bool IsAllowedScheme(string scheme);
}
