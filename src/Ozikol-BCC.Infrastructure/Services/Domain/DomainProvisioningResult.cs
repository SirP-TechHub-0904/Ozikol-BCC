using System;
using System.Collections.Generic;

namespace Ozikol_BCC.Infrastructure.Services.Domain;

/// <summary>
/// Execution report of the automated web server routing configuration and SSL certificate provisioning pipeline.
/// </summary>
public sealed class DomainProvisioningResult
{
    /// <summary>
    /// Gets a value indicating whether the overall automated provisioning succeeded.
    /// </summary>
    public bool Succeeded { get; set; }

    /// <summary>
    /// Gets the custom domain that was provisioned.
    /// </summary>
    public string Domain { get; set; } = string.Empty;

    /// <summary>
    /// Gets the tenant workspace identifier.
    /// </summary>
    public string TenantKey { get; set; } = string.Empty;

    /// <summary>
    /// Gets a value indicating whether DNS propagation was verified before provisioning.
    /// </summary>
    public bool DnsVerified { get; set; }

    /// <summary>
    /// Gets a value indicating whether the Nginx reverse proxy configuration file was created or updated.
    /// </summary>
    public bool NginxConfigured { get; set; }

    /// <summary>
    /// Gets a value indicating whether the Nginx configuration passed syntax tests and was reloaded.
    /// </summary>
    public bool NginxReloaded { get; set; }

    /// <summary>
    /// Gets a value indicating whether an automated SSL certificate (Let's Encrypt or Edge TLS) is active.
    /// </summary>
    public bool SslActive { get; set; }

    /// <summary>
    /// Gets the path to the generated Nginx configuration file on the server.
    /// </summary>
    public string? ConfigFilePath { get; set; }

    /// <summary>
    /// Gets primary summary message of the provisioning run.
    /// </summary>
    public string Message { get; set; } = string.Empty;

    /// <summary>
    /// Gets diagnostic log entries capturing step-by-step pipeline execution for administrative audit.
    /// </summary>
    public List<string> ExecutionLogs { get; set; } = new();

    /// <summary>
    /// Gets the detailed DNS probe results gathered during provisioning.
    /// </summary>
    public DomainDnsProbeResult? DnsProbe { get; set; }
}

