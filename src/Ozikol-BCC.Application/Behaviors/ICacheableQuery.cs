using System;

namespace Ozikol_BCC.Application.Behaviors
{
    /// <summary>
    /// Interface to mark a MediatR query as cacheable.
    /// The CachingBehavior pipeline will intercept this and check the Redis/Memory cache.
    /// </summary>
    public interface ICacheableQuery
    {
        /// <summary>
        /// The unique key used to store this query's result in the cache.
        /// </summary>
        string CacheKey { get; }

        /// <summary>
        /// Optional: How long the item should stay in the cache before expiring.
        /// If null, a default expiration is used.
        /// </summary>
        TimeSpan? Expiration { get; }
    }
}
