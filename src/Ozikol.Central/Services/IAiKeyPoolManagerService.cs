using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Ozikol.MasterDomain.Models;

namespace Ozikol.Central.Services
{
    /// <summary>
    /// Service interface for managing the AI provider API key pool, dynamic key selection,
    /// quota tracking, cooldown failovers, and telemetry usage logging.
    /// </summary>
    public interface IAiKeyPoolManagerService
    {
        /// <summary>
        /// Retrieves the next healthy, available API key for the specified provider using least-used round-robin distribution.
        /// </summary>
        /// <param name="provider">The AI provider name (e.g. "Gemini", "DeepSeek", "Groq", "OpenAI").</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>The active <see cref="MasterAiApiKey"/>, or null if no keys are currently configured or active.</returns>
        Task<MasterAiApiKey?> GetNextAvailableKeyAsync(string provider = "Gemini", CancellationToken cancellationToken = default);

        /// <summary>
        /// Marks a key as temporarily cooling down following an HTTP 429 rate limit error.
        /// </summary>
        /// <param name="keyId">The primary key ID of the rate-limited key.</param>
        /// <param name="cooldownSeconds">Cooldown duration in seconds (defaults to 60s).</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        Task MarkRateLimitedAsync(Guid keyId, int cooldownSeconds = 60, CancellationToken cancellationToken = default);

        /// <summary>
        /// Asynchronously logs a request execution event with latency and status code telemetry.
        /// </summary>
        /// <param name="keyId">The primary key ID used for the request.</param>
        /// <param name="actionName">The capability invoked (e.g. "CleanScopedCss", "ImageToSection").</param>
        /// <param name="responseTimeMs">Latency in milliseconds.</param>
        /// <param name="statusCode">HTTP status code (200, 429, 500).</param>
        /// <param name="promptTokens">Count of input tokens.</param>
        /// <param name="completionTokens">Count of output tokens generated.</param>
        /// <param name="errorMessage">Error details if the request failed.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        Task LogUsageAsync(
            Guid keyId,
            string actionName,
            int responseTimeMs,
            int statusCode,
            int? promptTokens = null,
            int? completionTokens = null,
            string? errorMessage = null,
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Performs a lightweight dry-run authentication test against the specified provider using the provided API key.
        /// </summary>
        /// <param name="provider">The AI provider name.</param>
        /// <param name="apiKey">The API key string to validate.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>A tuple indicating success status, latency in milliseconds, and error message if any.</returns>
        Task<(bool Success, int LatencyMs, string? ErrorMessage)> TestKeyConnectionAsync(string provider, string apiKey, CancellationToken cancellationToken = default);

        /// <summary>
        /// Dynamically resolves the best active, supported generation model name (e.g. "gemini-2.0-flash", "gemini-1.5-flash")
        /// for the specified key by probing Google's ModelService, caching the result in-memory so there is zero latency on subsequent calls.
        /// </summary>
        /// <param name="key">The MasterAiApiKey instance.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>Resolved model name string.</returns>
        Task<string> ResolveSupportedModelAsync(MasterAiApiKey key, CancellationToken cancellationToken = default);

        /// <summary>
        /// Constructs the canonical generation endpoint URL for the key (e.g. https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}).
        /// </summary>
        /// <param name="key">The MasterAiApiKey instance.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>Full API endpoint URL.</returns>
        Task<string> GetGenerateContentEndpointAsync(MasterAiApiKey key, CancellationToken cancellationToken = default);

        /// <summary>
        /// Retrieves aggregated KPI statistics for all registered keys across providers.
        /// </summary>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>Aggregated dashboard metrics.</returns>
        Task<AiKeyPoolSummaryDto> GetPoolSummaryAsync(CancellationToken cancellationToken = default);
    }

    /// <summary>
    /// Data transfer object representing aggregated key pool health and quota metrics.
    /// </summary>
    public class AiKeyPoolSummaryDto
    {
        public int TotalKeys { get; set; }
        public int ActiveKeys { get; set; }
        public int CoolingDownKeys { get; set; }
        public int QuotaExhaustedKeys { get; set; }
        public int TotalRequestsToday { get; set; }
        public int TotalDailyCapacity { get; set; }
        public long TotalLifetimeRequests { get; set; }
        public double AverageLatencyMs { get; set; }
        public List<MasterAiApiKey> Keys { get; set; } = new List<MasterAiApiKey>();
    }
}
