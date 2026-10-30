using System;
using System.Threading.Tasks;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using StackExchange.Redis;

namespace Ozikol_BCC.Infrastructure.Caching;

/// <summary>
/// Default multi-server implementation of <see cref="ITenantCacheInvalidator"/>.
/// Synchronizes local <see cref="IMemoryCache"/> (L1) and Redis <see cref="IDistributedCache"/> (L2)
/// across all application servers via Redis Pub/Sub channel <c>ozikol:channel:tenant-catalog-invalidate</c>.
/// Falls back cleanly to local memory eviction when Redis is not configured.
/// </summary>
public sealed class RedisTenantCacheInvalidator : ITenantCacheInvalidator
{
    /// <summary>
    /// Canonical cache key used for the Master Tenant Catalog in L1 and L2 caches.
    /// </summary>
    public const string MasterTenantCatalogCacheKey = "master_catalog_all_tenants_cache";

    /// <summary>
    /// Redis Pub/Sub channel name for instant cross-server L1 cache eviction.
    /// </summary>
    public const string PubSubChannelName = "ozikol:channel:tenant-catalog-invalidate";

    private readonly IMemoryCache? _memoryCache;
    private readonly IDistributedCache? _distributedCache;
    private readonly IConnectionMultiplexer? _redisMultiplexer;

    /// <summary>
    /// Initializes a new instance of the <see cref="RedisTenantCacheInvalidator"/> class
    /// and subscribes to the cross-server Redis Pub/Sub invalidation channel if Redis is active.
    /// </summary>
    /// <param name="serviceProvider">The application service provider.</param>
    public RedisTenantCacheInvalidator(IServiceProvider serviceProvider)
    {
        _memoryCache = serviceProvider.GetService<IMemoryCache>();
        _distributedCache = serviceProvider.GetService<IDistributedCache>();
        _redisMultiplexer = serviceProvider.GetService<IConnectionMultiplexer>();

        // Subscribe to cross-server invalidation events so changes made in Ozikol.Central
        // immediately evict L1 IMemoryCache on all Ozikol-BCC.Api servers.
        if (_redisMultiplexer != null && _redisMultiplexer.IsConnected)
        {
            try
            {
                var subscriber = _redisMultiplexer.GetSubscriber();
                subscriber.Subscribe(RedisChannel.Literal(PubSubChannelName), (_, _) =>
                {
                    _memoryCache?.Remove(MasterTenantCatalogCacheKey);
                });
            }
            catch
            {
                // Non-blocking safeguard if Redis Pub/Sub is temporarily unreachable at startup
            }
        }
    }

    /// <inheritdoc />
    public async Task InvalidateTenantCatalogAsync(string? tenantKey = null)
    {
        // 1. Evict L1 local memory cache immediately
        _memoryCache?.Remove(MasterTenantCatalogCacheKey);

        // 2. Evict L2 distributed Redis cache
        if (_distributedCache != null)
        {
            try
            {
                await _distributedCache.RemoveAsync(MasterTenantCatalogCacheKey);
            }
            catch
            {
                // Ignore transient L2 cache connectivity errors
            }
        }

        // 3. Broadcast Pub/Sub invalidation to all other API / Central server instances
        if (_redisMultiplexer != null && _redisMultiplexer.IsConnected)
        {
            try
            {
                var subscriber = _redisMultiplexer.GetSubscriber();
                await subscriber.PublishAsync(
                    RedisChannel.Literal(PubSubChannelName),
                    string.IsNullOrWhiteSpace(tenantKey) ? "all" : tenantKey.Trim().ToLowerInvariant());
            }
            catch
            {
                // Non-blocking broadcast
            }
        }
    }

    /// <inheritdoc />
    public void InvalidateTenantCatalog(string? tenantKey = null)
    {
        _memoryCache?.Remove(MasterTenantCatalogCacheKey);
        _ = Task.Run(() => InvalidateTenantCatalogAsync(tenantKey));
    }
}

/// <summary>
/// Dependency injection extensions for configuring Redis / Valkey / Microsoft Garnet distributed caching
/// and multi-server synchronization with automatic fallback to in-memory cache when Redis is not configured.
/// </summary>
public static class RedisInfrastructureExtensions
{
    /// <summary>
    /// Resolves the active Redis connection string from <c>Redis:ConnectionString</c>, <c>REDIS_CONNECTION_STRING</c>,
    /// or <c>ConnectionStrings:Redis</c> when <c>Cache:Provider</c> is set to <c>Redis</c> (or when a Redis connection string is present).
    /// </summary>
    /// <param name="configuration">Application configuration.</param>
    /// <returns>The resolved Redis connection string, or null if in-memory mode is active.</returns>
    public static string? ResolveRedisConnectionString(IConfiguration configuration)
    {
        var provider = configuration["Cache:Provider"]
            ?? Environment.GetEnvironmentVariable("Cache__Provider")
            ?? string.Empty;

        var connStr = configuration["Redis:ConnectionString"]
            ?? configuration["REDIS_CONNECTION_STRING"]
            ?? configuration.GetConnectionString("Redis")
            ?? Environment.GetEnvironmentVariable("Redis__ConnectionString")
            ?? Environment.GetEnvironmentVariable("REDIS_CONNECTION_STRING");

        if (string.IsNullOrWhiteSpace(connStr))
        {
            return null;
        }

        // If Cache:Provider is explicitly set to Memory and no override is desired, allow opting out;
        // otherwise if a valid Redis:ConnectionString is provided, enable Redis automatically.
        if (provider.Equals("Disabled", StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        return connStr.Trim();
    }

    /// <summary>
    /// Registers L1 (<see cref="IMemoryCache"/>) and L2 (<see cref="IDistributedCache"/>) caching services,
    /// <see cref="IConnectionMultiplexer"/> (when Redis/Valkey/Garnet is configured), and <see cref="ITenantCacheInvalidator"/>.
    /// </summary>
    /// <param name="services">The service collection.</param>
    /// <param name="configuration">The application configuration.</param>
    /// <returns>The updated service collection.</returns>
    public static IServiceCollection AddOzikolDistributedCaching(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddMemoryCache();

        var redisConnStr = ResolveRedisConnectionString(configuration);
        var instanceName = configuration["Redis:InstanceName"]
            ?? Environment.GetEnvironmentVariable("Redis__InstanceName")
            ?? "OzikolBcc:";

        if (!string.IsNullOrWhiteSpace(redisConnStr))
        {
            try
            {
                var options = ConfigurationOptions.Parse(redisConnStr);
                options.AbortOnConnectFail = false;
                options.ConnectRetry = 3;
                options.ConnectTimeout = 3000;

                var multiplexer = ConnectionMultiplexer.Connect(options);
                services.AddSingleton<IConnectionMultiplexer>(multiplexer);

                services.AddStackExchangeRedisCache(redisOptions =>
                {
                    redisOptions.ConfigurationOptions = options;
                    redisOptions.InstanceName = instanceName;
                });

                Console.WriteLine($"[Ozikol Cache] Redis / Valkey / Garnet distributed cache enabled (Instance: {instanceName}).");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Ozikol Cache] Warning: Could not connect to Redis ({ex.Message}). Falling back to in-memory distributed cache.");
                services.AddDistributedMemoryCache();
            }
        }
        else
        {
            services.AddDistributedMemoryCache();
        }

        services.AddSingleton<ITenantCacheInvalidator, RedisTenantCacheInvalidator>();
        return services;
    }
}

