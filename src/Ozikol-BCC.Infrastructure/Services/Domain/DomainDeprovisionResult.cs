using System;

namespace Ozikol_BCC.Infrastructure.Services.Domain;

/// <summary>
/// Result of removing a custom domain's routing configuration and restoring default platform routing.
/// </summary>
public sealed class DomainDeprovisionResult
{
    /// <summary>
    /// Gets a value indicating whether deprovisioning succeeded.
    /// </summary>
    public bool Succeeded { get; set; }

    /// <summary>
    /// Gets the domain that was unlinked and deprovisioned.
    /// </summary>
    public string Domain { get; set; } = string.Empty;

    /// <summary>
    /// Gets the tenant workspace identifier.
    /// </summary>
    public string TenantKey { get; set; } = string.Empty;

    /// <summary>
    /// Gets summary message of the deprovisioning operation.
    /// </summary>
    public string Message { get; set; } = string.Empty;
}
