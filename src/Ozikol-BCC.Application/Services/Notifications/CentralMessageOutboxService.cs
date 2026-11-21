using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Ozikol.MasterDomain.Models;
using Ozikol_BCC.Application.Interfaces.Services;

namespace Ozikol_BCC.Application.Services.Notifications;

/// <summary>
/// Autonomous outbox service that saves outbound communications directly into MasterCatalogDbContext.MasterMessagePools.
/// Decouples workers from individual tenant databases, allowing high-throughput delivery with zero tenant database connections.
/// </summary>
public class CentralMessageOutboxService : ICentralMessageOutboxService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<CentralMessageOutboxService> _logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="CentralMessageOutboxService"/> class.
    /// </summary>
    /// <param name="scopeFactory">Service scope factory for resolving the MasterCatalogDbContext.</param>
    /// <param name="logger">Structured logger instance.</param>
    public CentralMessageOutboxService(
        IServiceScopeFactory scopeFactory,
        ILogger<CentralMessageOutboxService> logger)
    {
        _scopeFactory = scopeFactory ?? throw new ArgumentNullException(nameof(scopeFactory));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <inheritdoc />
    public async Task EnqueueOutboundMessageAsync(
        string tenantKey,
        string? organizationName,
        string channel,
        string provider,
        string recipientAddress,
        string? recipientName,
        string? subject,
        string content,
        string? plainTextFallback = null,
        string? actionUrl = null,
        string category = "General",
        string severity = "Update",
        string priority = "Normal",
        string? senderOrTemplateName = null,
        string? metadataJson = null,
        DateTime? scheduledAt = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(recipientAddress))
        {
            _logger.LogWarning("[CentralMessageOutboxService] Recipient address is empty. Skipping outbox enqueue.");
            return;
        }

        try
        {
            using var scope = _scopeFactory.CreateScope();

            var dbContextType = AppDomain.CurrentDomain.GetAssemblies()
                .SelectMany(a => a.GetTypes())
                .FirstOrDefault(t => t.Name == "MasterCatalogDbContext");

            if (dbContextType == null)
            {
                _logger.LogWarning("[CentralMessageOutboxService] MasterCatalogDbContext type was not found in loaded assemblies.");
                return;
            }

            var masterDbContext = scope.ServiceProvider.GetService(dbContextType) as DbContext;
            if (masterDbContext == null)
            {
                _logger.LogWarning("[CentralMessageOutboxService] MasterCatalogDbContext service is not registered in this host.");
                return;
            }

            var poolItem = new MasterMessagePool
            {
                Id = Guid.CreateVersion7(),
                TenantKey = string.IsNullOrWhiteSpace(tenantKey) ? "platform" : tenantKey.Trim().ToLowerInvariant(),
                OrganizationName = organizationName,
                Channel = channel,
                Provider = provider,
                RecipientAddress = recipientAddress.Trim(),
                RecipientName = recipientName?.Trim(),
                Subject = subject?.Trim(),
                Content = content,
                PlainTextFallback = plainTextFallback,
                ActionUrl = actionUrl,
                Category = category,
                Severity = severity,
                Priority = priority,
                Status = "Queued",
                Retries = 0,
                MaxRetries = 5,
                SenderOrTemplateName = senderOrTemplateName,
                MetadataJson = metadataJson,
                ScheduledAt = scheduledAt,
                CreatedAt = DateTime.UtcNow
            };

            var dbSet = masterDbContext.Set<MasterMessagePool>();
            dbSet.Add(poolItem);
            await masterDbContext.SaveChangesAsync(cancellationToken);

            _logger.LogInformation(
                "🚀 [CentralMessageOutbox] Enqueued {Channel} via {Provider} for {Recipient} (Tenant: {TenantKey}, Id: {Id})",
                channel, provider, recipientAddress, tenantKey, poolItem.Id);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ [CentralMessageOutbox] Failed to enqueue outbound message for {Recipient}: {Msg}", recipientAddress, ex.Message);
        }
    }
}
