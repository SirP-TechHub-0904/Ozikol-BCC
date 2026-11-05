using System;
using System.Threading.Tasks;

namespace Ozikol_BCC.Infrastructure.Caching;

/// <summary>
/// Provides cross-server cache invalidation for the Master Tenant Catalog and tenant entitlements
/// across multiple load-balanced Ozikol BCC API and Central instances using Redis Pub/Sub and distributed cache.
/// </summary>
public interface ITenantCacheInvalidator
{
    /// <summary>
    /// Evicts the cached Master Tenant Catalog from local memory, Redis distributed cache,
    /// and broadcasts a Pub/Sub invalidation signal so all other server nodes refresh immediately.
    /// </summary>
    /// <param name="tenantKey">Optional specific tenant key that triggered the change.</param>
    Task InvalidateTenantCatalogAsync(string? tenantKey = null);

    /// <summary>
    /// Synchronous wrapper for evicting the Master Tenant Catalog across local and Redis caches.
    /// </summary>
    /// <param name="tenantKey">Optional specific tenant key that triggered the change.</param>
    void InvalidateTenantCatalog(string? tenantKey = null);
}

