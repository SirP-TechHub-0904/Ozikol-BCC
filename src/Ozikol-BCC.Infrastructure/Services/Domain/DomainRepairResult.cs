using System;
using System.Collections.Generic;

namespace Ozikol_BCC.Infrastructure.Services.Domain;

/// <summary>
/// Execution report of the automated SSL re-issuance and Nginx routing repair pipeline.
/// </summary>
public sealed class DomainRepairResult
{
    /// <summary>
    /// Gets or sets a value indicating whether the repair pipeline finished successfully.
    /// </summary>
    public bool Succeeded { get; set; }

    /// <summary>
    /// Gets or sets the custom domain that was repaired.
    /// </summary>
    public string Domain { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the tenant workspace identifier.
    /// </summary>
    public string TenantKey { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the primary summary message of the repair outcome.
    /// </summary>
    public string Message { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets a value indicating whether Certbot was invoked for certificate generation/expansion.
    /// </summary>
    public bool CertbotExecuted { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether Certbot exited with code 0 (success).
    /// </summary>
    public bool CertbotSuccess { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether the Nginx reverse proxy configuration was re-written.
    /// </summary>
    public bool NginxConfigured { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether Nginx was tested and reloaded.
    /// </summary>
    public bool NginxReloaded { get; set; }

    /// <summary>
    /// Gets or sets the updated live probe outcome after repair execution.
    /// </summary>
    public DomainLiveProbeResult? LiveProbe { get; set; }

    /// <summary>
    /// Gets or sets diagnostic step-by-step logs from the repair run.
    /// </summary>
    public List<string> ExecutionLogs { get; set; } = new();
}
