using System;
using System.Collections.Generic;

namespace Ozikol_BCC.Infrastructure.Services.Domain;

/// <summary>
/// Diagnostic report representing live DNS resolution and propagation verification for a custom domain.
/// </summary>
public sealed class DomainDnsProbeResult
{
    /// <summary>
    /// Gets the sanitized domain queried.
    /// </summary>
    public string Domain { get; set; } = string.Empty;

    /// <summary>
    /// Gets the expected target IP or CNAME alias (e.g. "2.24.162.42" or "nightpress.ozikol.cloud").
    /// </summary>
    public string ExpectedTarget { get; set; } = string.Empty;

    /// <summary>
    /// Gets the actual detected target or IP address string.
    /// </summary>
    public string DetectedTarget { get; set; } = string.Empty;

    /// <summary>
    /// Gets all detected public IPv4 and IPv6 addresses resolved by DNS.
    /// </summary>
    public List<string> DetectedIps { get; set; } = new();

    /// <summary>
    /// Gets a value indicating whether an A record resolved to the platform IPv4 address.
    /// </summary>
    public bool IsIpMatch { get; set; }

    /// <summary>
    /// Gets a value indicating whether the domain resolved to Cloudflare CDN edge proxy IPs.
    /// </summary>
    public bool IsCloudflareEdgeMatch { get; set; }

    /// <summary>
    /// Gets a value indicating whether DNS has successfully propagated and points to the platform.
    /// </summary>
    public bool IsDnsPointed { get; set; }

    /// <summary>
    /// Gets a value indicating whether public DNS reported NXDOMAIN (domain does not exist or has no DNS records).
    /// </summary>
    public bool IsNxDomain { get; set; }

    /// <summary>
    /// Gets a value indicating whether the domain is ready for SSL issuance and web routing.
    /// </summary>
    public bool IsRoutingReady => IsDnsPointed;

    /// <summary>
    /// Gets human-readable diagnostic advice explaining current DNS status and required next steps.
    /// </summary>
    public string GuidanceMessage { get; set; } = string.Empty;
}

