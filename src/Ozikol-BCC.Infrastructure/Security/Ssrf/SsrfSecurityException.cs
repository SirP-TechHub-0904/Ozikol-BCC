using System;

namespace Ozikol_BCC.Infrastructure.Security.Ssrf;

/// <summary>
/// Exception thrown when a Server-Side Request Forgery (SSRF) attempt, prohibited network scheme,
/// unauthorized port, loopback address, cloud metadata endpoint, or DNS rebinding attempt is detected.
/// </summary>
public class SsrfSecurityException : Exception
{
    /// <summary>
    /// Gets the blocked target URL or IP address.
    /// </summary>
    public string? TargetUrl { get; }

    /// <summary>
    /// Gets the specific SSRF violation category (e.g., 'CloudMetadata', 'Loopback', 'PrivateNetwork', 'ProhibitedPort').
    /// </summary>
    public string ViolationCategory { get; }

    /// <summary>
    /// Initializes a new instance of the <see cref="SsrfSecurityException"/> class.
    /// </summary>
    /// <param name="message">Descriptive reason explaining why the outbound request was blocked.</param>
    /// <param name="violationCategory">The specific security violation taxonomy category.</param>
    /// <param name="targetUrl">The target URL or network address that triggered the block.</param>
    public SsrfSecurityException(string message, string violationCategory, string? targetUrl = null)
        : base(message)
    {
        ViolationCategory = violationCategory;
        TargetUrl = targetUrl;
    }

    /// <summary>
    /// Initializes a new instance of the <see cref="SsrfSecurityException"/> class with an inner exception.
    /// </summary>
    /// <param name="message">Descriptive reason explaining why the outbound request was blocked.</param>
    /// <param name="violationCategory">The specific security violation taxonomy category.</param>
    /// <param name="targetUrl">The target URL or network address that triggered the block.</param>
    /// <param name="innerException">The underlying network or resolution exception.</param>
    public SsrfSecurityException(string message, string violationCategory, string? targetUrl, Exception innerException)
        : base(message, innerException)
    {
        ViolationCategory = violationCategory;
        TargetUrl = targetUrl;
    }
}
