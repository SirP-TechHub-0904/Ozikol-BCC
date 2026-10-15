using System;
using System.Security.Claims;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Ozikol_BCC.Application.Interfaces.Services;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;

namespace Ozikol_BCC.Application.Services.Logging;

/// <summary>
/// Scoped tenant activity logger that records workspace-scoped audit logs
/// directly into the active tenant's SQL Server relational database table [dbo].[BcpActivityLogs].
/// </summary>
public class TenantActivityLogger : ITenantActivityLogger
{
    private readonly DashboardDbContext _dbContext;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly ILogger<TenantActivityLogger> _logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="TenantActivityLogger"/> class.
    /// </summary>
    /// <param name="dbContext">The active tenant database context resolved for the current HTTP request.</param>
    /// <param name="httpContextAccessor">Accessor to retrieve caller identity and IP address.</param>
    /// <param name="logger">Diagnostic logger for internal operations.</param>
    public TenantActivityLogger(
        DashboardDbContext dbContext,
        IHttpContextAccessor httpContextAccessor,
        ILogger<TenantActivityLogger> logger)
    {
        _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
        _httpContextAccessor = httpContextAccessor ?? throw new ArgumentNullException(nameof(httpContextAccessor));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <inheritdoc/>
    public async Task LogAsync(
        string actionType,
        string description,
        string? module = null,
        string? targetProfileId = null,
        string? targetFullName = null,
        object? metadata = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var httpContext = _httpContextAccessor.HttpContext;
            var user = httpContext?.User;

            string? currentUserId = user?.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? user?.FindFirst("sub")?.Value;

            string? currentUserName = user?.FindFirst(ClaimTypes.Name)?.Value
                ?? user?.FindFirst("name")?.Value
                ?? user?.Identity?.Name;

            string? ipAddress = httpContext?.Connection?.RemoteIpAddress?.ToString();

            string? metadataJson = null;
            if (metadata != null)
            {
                if (metadata is string jsonString)
                {
                    metadataJson = jsonString;
                }
                else
                {
                    metadataJson = JsonSerializer.Serialize(metadata);
                }
            }

            var logEntry = new BcpActivityLog
            {
                Id = Guid.CreateVersion7(),
                ActionType = actionType,
                Description = description,
                Module = module,
                PerformedByProfileId = currentUserId,
                PerformedByFullName = currentUserName,
                TargetProfileId = targetProfileId,
                TargetFullName = targetFullName,
                Date = DateTime.UtcNow,
                IpAddress = ipAddress,
                MetadataJson = metadataJson
            };

            _dbContext.BcpActivityLogs.Add(logEntry);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            // Tenant auditing should never throw or abort the primary business transaction.
            _logger.LogError(ex, "Failed to persist tenant activity log for action '{ActionType}'.", actionType);
        }
    }
}
