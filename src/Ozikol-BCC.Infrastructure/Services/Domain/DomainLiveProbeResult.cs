using System;
using System.Collections.Generic;

namespace Ozikol_BCC.Infrastructure.Services.Domain;

/// <summary>
/// Status and TLS certificate details captured during a live HTTPS probe of a specific endpoint.
/// </summary>
public sealed class EndpointHealthStatus
{
    /// <summary>
    /// Gets or sets the target HTTPS URL queried (e.g. "https://domain.com" or "https://www.domain.com").
    /// </summary>
    public string Url { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets a value indicating whether the endpoint completed a successful TLS handshake and responded.
    /// </summary>
    public bool IsLive { get; set; }

    /// <summary>
    /// Gets or sets the HTTP status code returned by the endpoint (e.g. 200, 301, 302).
    /// </summary>
    public int? StatusCode { get; set; }

    /// <summary>
    /// Gets or sets the Subject Common Name (CN) or distinguished name from the active TLS certificate.
    /// </summary>
    public string? CertSubject { get; set; }

    /// <summary>
    /// Gets or sets the certificate issuer authority (e.g. "Let's Encrypt", "Cloudflare Inc ECC CA-3").
    /// </summary>
    public string? CertIssuer { get; set; }

    /// <summary>
    /// Gets or sets the certificate expiration date in UTC.
    /// </summary>
    public DateTime? CertValidTo { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether the server returned a certificate belonging to a different domain or tenant.
    /// </summary>
    public bool HasCertMismatch { get; set; }

    /// <summary>
    /// Gets or sets the actual domain name detected inside the served certificate (for diagnostic display).
    /// </summary>
    public string? DetectedDomainInCert { get; set; }

    /// <summary>
    /// Gets or sets diagnostic error details if connection or TLS handshake failed.
    /// </summary>
    public string? ErrorMessage { get; set; }
}

/// <summary>
/// Diagnostic report representing live HTTPS reachability, HTTP response codes,
/// and TLS certificate verification for both Apex (@) and WWW hostnames.
/// </summary>
public sealed class DomainLiveProbeResult
{
    /// <summary>
    /// Gets or sets the sanitized domain evaluated.
    /// </summary>
    public string Domain { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets a value indicating whether all active endpoints are responding with valid, matching certificates.
    /// </summary>
    public bool OverallHealthy { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether an SSL mismatch or routing failure was detected that warrants automated repair.
    /// </summary>
    public bool NeedsRepair { get; set; }

    /// <summary>
    /// Gets or sets a human-readable reason explaining why repair is suggested.
    /// </summary>
    public string RepairReason { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the live HTTPS status of the apex root endpoint (e.g. https://domain.com).
    /// </summary>
    public EndpointHealthStatus ApexEndpoint { get; set; } = new();

    /// <summary>
    /// Gets or sets the live HTTPS status of the www subdomain endpoint (e.g. https://www.domain.com).
    /// </summary>
    public EndpointHealthStatus WwwEndpoint { get; set; } = new();

    /// <summary>
    /// Gets or sets diagnostic logs captured during the live endpoint probe.
    /// </summary>
    public List<string> ProbeLogs { get; set; } = new();
}
