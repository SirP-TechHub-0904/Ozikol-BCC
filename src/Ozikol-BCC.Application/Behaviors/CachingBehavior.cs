using MediatR;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;
using Ozikol_BCC.Infrastructure.TenantSupport;
using System;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Behaviors
{
    /// <summary>
    /// MediatR Pipeline Behavior that intercepts requests implementing ICacheableQuery.
    /// It checks the IDistributedCache (Redis or Memory) for existing data to bypass the database.
    /// </summary>
    public class CachingBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse> 
        where TRequest : IRequest<TResponse>
    {
        private readonly IDistributedCache _cache;
        private readonly ILogger<CachingBehavior<TRequest, TResponse>> _logger;
        private readonly ITenantProvider _tenantProvider;

        public CachingBehavior(
            IDistributedCache cache,
            ILogger<CachingBehavior<TRequest, TResponse>> logger,
            ITenantProvider tenantProvider)
        {
            _cache = cache;
            _logger = logger;
            _tenantProvider = tenantProvider;
        }

        public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken cancellationToken)
        {
            if (request is ICacheableQuery cacheableQuery)
            {
                var cacheKey = BuildTenantCacheKey(cacheableQuery.CacheKey);
                try
                {
                    var cachedData = await _cache.GetStringAsync(cacheKey, cancellationToken);

                    if (!string.IsNullOrEmpty(cachedData))
                    {
                        var cachedResponse = JsonSerializer.Deserialize<TResponse>(cachedData);
                        if (cachedResponse is not null)
                        {
                            _logger.LogInformation("[Cache Hit] Returning data for key: {CacheKey}", cacheKey);
                            return cachedResponse;
                        }
                    }
                }
                catch (Exception ex)
                {
                    // Cache failures should not break page rendering. Fall through to the database query.
                    _logger.LogWarning(ex, "Cache read failed for key: {CacheKey}", cacheKey);
                }

                _logger.LogInformation("[Cache Miss] Executing database query for key: {CacheKey}", cacheKey);
                var response = await next();

                var options = new DistributedCacheEntryOptions();
                if (cacheableQuery.Expiration.HasValue)
                {
                    options.SetAbsoluteExpiration(cacheableQuery.Expiration.Value);
                }
                else
                {
                    // Default expiration of 1 hour if not specified
                    options.SetAbsoluteExpiration(TimeSpan.FromHours(1));
                }

                var serializedData = JsonSerializer.Serialize(response);
                try
                {
                    await _cache.SetStringAsync(cacheKey, serializedData, options, cancellationToken);
                }
                catch (Exception ex)
                {
                    // Redis/memory cache write failures should not fail the request after data has loaded.
                    _logger.LogWarning(ex, "Cache write failed for key: {CacheKey}", cacheKey);
                }

                return response;
            }

            // If the request is not cacheable, just continue down the pipeline normally
            return await next();
        }

        private string BuildTenantCacheKey(string queryCacheKey)
        {
            var tenant = string.IsNullOrWhiteSpace(_tenantProvider.CurrentTenant)
                ? "system"
                : _tenantProvider.CurrentTenant;

            var safeTenant = tenant
                .Replace(":", "_", StringComparison.Ordinal)
                .Replace("/", "_", StringComparison.Ordinal)
                .Replace("\\", "_", StringComparison.Ordinal)
                .Trim();

            return $"tenant-{safeTenant}:{queryCacheKey}";
        }
    }
}
