using System.Collections.Generic;
using System.Net;

namespace Ozikol_BCC.Infrastructure.Security.Ssrf;

/// <summary>
/// Detailed evaluation snapshot produced by the SSRF security gatekeeper when auditing remote URLs and IP endpoints.
/// </summary>
public class SsrfValidationResult
{
    /// <summary>
    /// Gets or sets a value indicating whether the audited URL and its resolved IP endpoints are safe for outbound communication.
    /// </summary>
    public bool IsSafe { get; set; }

    /// <summary>
    /// Gets or sets the normalized, sanitized destination URI.
    /// </summary>
    public Uri? DestinationUri { get; set; }

    /// <summary>
    /// Gets or sets the primary resolved public IP address safely selected for socket connection pinning.
    /// </summary>
    public IPAddress? PinnedIpAddress { get; set; }

    /// <summary>
    /// Gets or sets the collection of all resolved IP addresses audited during DNS inspection.
    /// </summary>
    public List<IPAddress> ResolvedIpAddresses { get; set; } = new();

    /// <summary>
    /// Gets or sets the security violation category if the destination was deemed hazardous.
    /// </summary>
    public string? ViolationCategory { get; set; }

    /// <summary>
    /// Gets or sets the human-readable explanation of why the destination was permitted or blocked.
    /// </summary>
    public string Message { get; set; } = string.Empty;

    /// <summary>
    /// Creates a successful SSRF validation result with the pinned public IP address.
    /// </summary>
    /// <param name="uri">The validated destination URI.</param>
    /// <param name="pinnedIp">The safe public IP address pinned for the connection.</param>
    /// <param name="allIps">All resolved IP addresses audited.</param>
    /// <returns>A passing <see cref="SsrfValidationResult"/>.</returns>
    public static SsrfValidationResult Success(Uri uri, IPAddress pinnedIp, List<IPAddress> allIps)
    {
        return new SsrfValidationResult
        {
            IsSafe = true,
            DestinationUri = uri,
            PinnedIpAddress = pinnedIp,
            ResolvedIpAddresses = allIps,
            Message = "Destination URL verified safe. Host resolves to approved public IP infrastructure."
        };
    }

    /// <summary>
    /// Creates a blocked SSRF validation result indicating why the request was prohibited.
    /// </summary>
    /// <param name="category">Taxonomy classification of the detected threat.</param>
    /// <param name="message">Explanatory justification for blocking the destination.</param>
    /// <param name="uri">Optional destination URI evaluated.</param>
    /// <returns>A failing <see cref="SsrfValidationResult"/>.</returns>
    public static SsrfValidationResult Blocked(string category, string message, Uri? uri = null)
    {
        return new SsrfValidationResult
        {
            IsSafe = false,
            DestinationUri = uri,
            ViolationCategory = category,
            Message = message
        };
    }
}
