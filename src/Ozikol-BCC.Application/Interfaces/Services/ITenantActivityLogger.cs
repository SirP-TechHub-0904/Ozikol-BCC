using System.Threading;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Interfaces.Services;

/// <summary>
/// Service contract for recording workspace-scoped audit and business activity logs
/// directly into the active tenant's relational database table [dbo].[BcpActivityLogs].
/// </summary>
public interface ITenantActivityLogger
{
    /// <summary>
    /// Records a business action, user change, or administrative event in the active tenant's relational audit trail.
    /// </summary>
    /// <param name="actionType">The category/type of action (e.g. "USER_UPDATE", "ROLE_ASSIGNED", "SETTINGS_CHANGED").</param>
    /// <param name="description">Human-readable description of what was performed.</param>
    /// <param name="module">Optional module or feature name (e.g. "UserManagement", "Settings", "Commerce").</param>
    /// <param name="targetProfileId">Optional profile ID of the member being modified or affected.</param>
    /// <param name="targetFullName">Optional full name of the member being modified or affected.</param>
    /// <param name="metadata">Optional contextual metadata serialized into JSON.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    Task LogAsync(
        string actionType,
        string description,
        string? module = null,
        string? targetProfileId = null,
        string? targetFullName = null,
        object? metadata = null,
        CancellationToken cancellationToken = default);
}
