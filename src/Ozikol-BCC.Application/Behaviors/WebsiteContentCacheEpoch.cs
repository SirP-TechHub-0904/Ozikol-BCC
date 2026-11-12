using Microsoft.Extensions.Caching.Distributed;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Behaviors
{
    /// <summary>
    /// Manages a per-tenant monotonic cache epoch stored in <see cref="IDistributedCache"/>
    /// so public website queries cached by <see cref="CachingBehavior{TRequest, TResponse}"/>
    /// can be invalidated instantaneously across single-node and Redis-backed deployments
    /// whenever website content is modified.
    /// </summary>
    public static class WebsiteContentCacheEpoch
    {
        private static readonly DistributedCacheEntryOptions EpochEntryOptions = new()
        {
            AbsoluteExpirationRelativeToNow = TimeSpan.FromDays(30)
        };

        /// <summary>
        /// Sanitizes a tenant identifier into a cache-key safe segment.
        /// </summary>
        /// <param name="tenant">The raw tenant key or domain identifier.</param>
        /// <returns>Sanitized lowercase tenant segment, or <c>"system"</c> when empty.</returns>
        public static string NormalizeTenantSegment(string? tenant)
        {
            if (string.IsNullOrWhiteSpace(tenant))
            {
                return "system";
            }

            return tenant
                .Replace(":", "_", StringComparison.Ordinal)
                .Replace("/", "_", StringComparison.Ordinal)
                .Replace("\\", "_", StringComparison.Ordinal)
                .Trim()
                .ToLowerInvariant();
        }

        /// <summary>
        /// Retrieves the active cache epoch token for the specified tenant.
        /// Defaults to <c>"0"</c> if no invalidation epoch has been recorded yet.
        /// </summary>
        /// <param name="cache">The distributed cache instance.</param>
        /// <param name="tenant">The tenant key or identifier.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>The current cache epoch string.</returns>
        public static async Task<string> GetEpochAsync(
            IDistributedCache cache,
            string? tenant,
            CancellationToken cancellationToken = default)
        {
            var safeTenant = NormalizeTenantSegment(tenant);
            var epochKey = $"tenant-{safeTenant}:content-epoch";

            try
            {
                var epoch = await cache.GetStringAsync(epochKey, cancellationToken);
                return string.IsNullOrWhiteSpace(epoch) ? "0" : epoch;
            }
            catch
            {
                return "0";
            }
        }

        /// <summary>
        /// Advances the cache epoch for the specified tenant so subsequent cached query lookups
        /// bypass stale entries and fetch updated database state immediately.
        /// </summary>
        /// <param name="cache">The distributed cache instance.</param>
        /// <param name="tenant">The tenant key or identifier.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>The newly recorded epoch string.</returns>
        public static async Task<string> BumpEpochAsync(
            IDistributedCache cache,
            string? tenant,
            CancellationToken cancellationToken = default)
        {
            var safeTenant = NormalizeTenantSegment(tenant);
            var epochKey = $"tenant-{safeTenant}:content-epoch";
            var newEpoch = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds().ToString();

            try
            {
                await cache.SetStringAsync(epochKey, newEpoch, EpochEntryOptions, cancellationToken);
            }
            catch
            {
                // Ignore transient distributed cache write errors so content saves never fail.
            }

            return newEpoch;
        }
    }
}

