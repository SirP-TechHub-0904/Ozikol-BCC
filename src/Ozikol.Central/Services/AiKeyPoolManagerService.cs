using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Services
{
    /// <summary>
    /// Thread-safe enterprise implementation of <see cref="IAiKeyPoolManagerService"/>.
    /// Handles dynamic round-robin key selection, automatic 429 rate limit cooldowns,
    /// dry-run testing, and granular request telemetry.
    /// </summary>
    public class AiKeyPoolManagerService : IAiKeyPoolManagerService
    {
        private readonly MasterCatalogDbContext _dbContext;
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<AiKeyPoolManagerService> _logger;
        private static readonly SemaphoreSlim _keySelectLock = new(1, 1);
        private static readonly System.Collections.Concurrent.ConcurrentDictionary<Guid, string> _resolvedModelCache = new();

        /// <summary>
        /// Initializes a new instance of the <see cref="AiKeyPoolManagerService"/> class.
        /// </summary>
        public AiKeyPoolManagerService(
            MasterCatalogDbContext dbContext,
            IHttpClientFactory httpClientFactory,
            ILogger<AiKeyPoolManagerService> logger)
        {
            _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
            _httpClientFactory = httpClientFactory ?? throw new ArgumentNullException(nameof(httpClientFactory));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <inheritdoc />
        public async Task<MasterAiApiKey?> GetNextAvailableKeyAsync(string provider = "Gemini", CancellationToken cancellationToken = default)
        {
            await _keySelectLock.WaitAsync(cancellationToken);
            try
            {
                var nowUtc = DateTime.UtcNow;

                // 1. Fetch active keys for provider that are not in cooldown
                var candidateKeys = await _dbContext.MasterAiApiKeys
                    .Where(k => k.Provider == provider && k.IsActive)
                    .ToListAsync(cancellationToken);

                if (!candidateKeys.Any())
                {
                    _logger.LogWarning("No active AI API keys found for provider {Provider}", provider);
                    return null;
                }

                // 2. Reset daily counter if day rolled over
                foreach (var k in candidateKeys)
                {
                    if (k.LastUsedAtUtc.HasValue && k.LastUsedAtUtc.Value.Date < nowUtc.Date)
                    {
                        k.TodayRequestsCount = 0;
                        if (k.Status == "QuotaExhausted")
                        {
                            k.Status = "Active";
                        }
                    }

                    // Clear cooldown if expired
                    if (k.RateLimitCooldownUntilUtc.HasValue && k.RateLimitCooldownUntilUtc.Value <= nowUtc)
                    {
                        k.RateLimitCooldownUntilUtc = null;
                        if (k.Status == "CoolingDown")
                        {
                            k.Status = "Active";
                        }
                    }
                }

                // 3. Filter healthy available keys
                var availableKeys = candidateKeys
                    .Where(k => (!k.RateLimitCooldownUntilUtc.HasValue || k.RateLimitCooldownUntilUtc.Value <= nowUtc)
                             && k.TodayRequestsCount < k.DailyQuotaLimit)
                    .OrderBy(k => k.TodayRequestsCount) // Least-used first for optimal load distribution
                    .ThenBy(k => k.LastUsedAtUtc ?? DateTime.MinValue)
                    .ToList();

                if (!availableKeys.Any())
                {
                    _logger.LogWarning("All active AI API keys for {Provider} are either cooling down or quota exhausted", provider);
                    return null;
                }

                var selectedKey = availableKeys.First();
                selectedKey.TodayRequestsCount++;
                selectedKey.TotalRequestsCount++;
                selectedKey.LastUsedAtUtc = nowUtc;
                selectedKey.UpdatedAtUtc = nowUtc;

                if (selectedKey.TodayRequestsCount >= selectedKey.DailyQuotaLimit)
                {
                    selectedKey.Status = "QuotaExhausted";
                }

                await _dbContext.SaveChangesAsync(cancellationToken);
                return selectedKey;
            }
            finally
            {
                _keySelectLock.Release();
            }
        }

        /// <inheritdoc />
        public async Task MarkRateLimitedAsync(Guid keyId, int cooldownSeconds = 60, CancellationToken cancellationToken = default)
        {
            var key = await _dbContext.MasterAiApiKeys.FindAsync(new object[] { keyId }, cancellationToken);
            if (key != null)
            {
                key.RateLimitCooldownUntilUtc = DateTime.UtcNow.AddSeconds(cooldownSeconds);
                key.Status = "CoolingDown";
                key.UpdatedAtUtc = DateTime.UtcNow;
                await _dbContext.SaveChangesAsync(cancellationToken);
                _logger.LogWarning("AI API Key {KeyAlias} (ID: {KeyId}) marked as CoolingDown for {Cooldown}s", key.KeyAlias, key.Id, cooldownSeconds);
            }
        }

        /// <inheritdoc />
        public async Task LogUsageAsync(
            Guid keyId,
            string actionName,
            int responseTimeMs,
            int statusCode,
            int? promptTokens = null,
            int? completionTokens = null,
            string? errorMessage = null,
            CancellationToken cancellationToken = default)
        {
            try
            {
                var log = new MasterAiApiKeyUsageLog
                {
                    MasterAiApiKeyId = keyId,
                    ActionName = actionName,
                    RequestTimestampUtc = DateTime.UtcNow,
                    ResponseTimeMs = responseTimeMs,
                    StatusCode = statusCode,
                    PromptTokens = promptTokens,
                    CompletionTokens = completionTokens,
                    ErrorMessage = errorMessage
                };

                _dbContext.MasterAiApiKeyUsageLogs.Add(log);
                await _dbContext.SaveChangesAsync(cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to log AI API key usage telemetry for KeyId {KeyId}", keyId);
            }
        }

        /// <inheritdoc />
        public async Task<(bool Success, int LatencyMs, string? ErrorMessage)> TestKeyConnectionAsync(string provider, string apiKey, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(apiKey))
            {
                return (false, 0, "API key cannot be empty.");
            }

            var sw = Stopwatch.StartNew();
            try
            {
                var client = _httpClientFactory.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(15);

                if (provider.Equals("Gemini", StringComparison.OrdinalIgnoreCase))
                {
                    // Official Google Gemini ModelService lightweight authentication verification probe
                    var geminiUrl = $"https://generativelanguage.googleapis.com/v1beta/models?key={apiKey}";
                    var response = await client.GetAsync(geminiUrl, cancellationToken);
                    sw.Stop();

                    if (response.IsSuccessStatusCode)
                    {
                        return (true, (int)sw.ElapsedMilliseconds, null);
                    }

                    var errBody = await response.Content.ReadAsStringAsync(cancellationToken);
                    return (false, (int)sw.ElapsedMilliseconds, $"Gemini API returned {response.StatusCode}: {errBody}");
                }
                else if (provider.Equals("DeepSeek", StringComparison.OrdinalIgnoreCase))
                {
                    var deepseekUrl = "https://api.deepseek.com/v1/chat/completions";
                    var request = new HttpRequestMessage(HttpMethod.Post, deepseekUrl);
                    request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", apiKey);
                    request.Content = JsonContent.Create(new
                    {
                        model = "deepseek-chat",
                        messages = new[] { new { role = "user", content = "Ping. Reply with 'Pong'." } },
                        max_tokens = 5
                    });

                    var response = await client.SendAsync(request, cancellationToken);
                    sw.Stop();

                    if (response.IsSuccessStatusCode)
                    {
                        return (true, (int)sw.ElapsedMilliseconds, null);
                    }

                    var errBody = await response.Content.ReadAsStringAsync(cancellationToken);
                    return (false, (int)sw.ElapsedMilliseconds, $"DeepSeek API returned {response.StatusCode}: {errBody}");
                }
                else
                {
                    // Generic validation
                    sw.Stop();
                    return (true, (int)sw.ElapsedMilliseconds, null);
                }
            }
            catch (Exception ex)
            {
                sw.Stop();
                return (false, (int)sw.ElapsedMilliseconds, $"Connection test failed: {ex.Message}");
            }
        }

        /// <inheritdoc />
        public async Task<AiKeyPoolSummaryDto> GetPoolSummaryAsync(CancellationToken cancellationToken = default)
        {
            var nowUtc = DateTime.UtcNow;
            var keys = await _dbContext.MasterAiApiKeys
                .Include(k => k.UsageLogs)
                .OrderBy(k => k.Provider)
                .ThenBy(k => k.KeyAlias)
                .ToListAsync(cancellationToken);

            var totalKeys = keys.Count;
            var activeKeys = keys.Count(k => k.IsActive && (!k.RateLimitCooldownUntilUtc.HasValue || k.RateLimitCooldownUntilUtc.Value <= nowUtc));
            var coolingDownKeys = keys.Count(k => k.IsActive && k.RateLimitCooldownUntilUtc.HasValue && k.RateLimitCooldownUntilUtc.Value > nowUtc);
            var quotaExhaustedKeys = keys.Count(k => k.TodayRequestsCount >= k.DailyQuotaLimit);

            var totalRequestsToday = keys.Sum(k => k.TodayRequestsCount);
            var totalDailyCapacity = keys.Where(k => k.IsActive).Sum(k => k.DailyQuotaLimit);
            var totalLifetimeRequests = keys.Sum(k => k.TotalRequestsCount);

            // Compute 7-day average latency
            var recentLogs = await _dbContext.MasterAiApiKeyUsageLogs
                .Where(l => l.RequestTimestampUtc >= nowUtc.AddDays(-7))
                .Select(l => l.ResponseTimeMs)
                .ToListAsync(cancellationToken);

            var avgLatency = recentLogs.Any() ? recentLogs.Average() : 0;

            return new AiKeyPoolSummaryDto
            {
                TotalKeys = totalKeys,
                ActiveKeys = activeKeys,
                CoolingDownKeys = coolingDownKeys,
                QuotaExhaustedKeys = quotaExhaustedKeys,
                TotalRequestsToday = totalRequestsToday,
                TotalDailyCapacity = totalDailyCapacity,
                TotalLifetimeRequests = totalLifetimeRequests,
                AverageLatencyMs = Math.Round(avgLatency, 1),
                Keys = keys
            };
        }

        /// <inheritdoc />
        public async Task<string> ResolveSupportedModelAsync(MasterAiApiKey key, CancellationToken cancellationToken = default)
        {
            if (key == null) throw new ArgumentNullException(nameof(key));

            if (!string.Equals(key.Provider, "Gemini", StringComparison.OrdinalIgnoreCase))
            {
                return key.Provider;
            }

            if (_resolvedModelCache.TryGetValue(key.Id, out var cachedModel) && !string.IsNullOrWhiteSpace(cachedModel))
            {
                return cachedModel;
            }

            string selectedModel = "gemini-2.0-flash";
            try
            {
                var client = _httpClientFactory.CreateClient();
                client.Timeout = TimeSpan.FromSeconds(10);

                var listModelsUrl = $"https://generativelanguage.googleapis.com/v1beta/models?key={key.ApiKey}";
                using var response = await client.GetAsync(listModelsUrl, cancellationToken);
                if (response.IsSuccessStatusCode)
                {
                    var json = await response.Content.ReadAsStringAsync(cancellationToken);
                    using var doc = JsonDocument.Parse(json);
                    if (doc.RootElement.TryGetProperty("models", out var modelsElem))
                    {
                        var validModels = new List<string>();
                        foreach (var m in modelsElem.EnumerateArray())
                        {
                            var mName = m.GetProperty("name").GetString() ?? string.Empty;
                            var cleanName = mName.StartsWith("models/") ? mName.Substring(7) : mName;
                            var methods = m.TryGetProperty("supportedGenerationMethods", out var methodsElem)
                                ? methodsElem.ToString()
                                : string.Empty;

                            if (methods.Contains("generateContent", StringComparison.OrdinalIgnoreCase))
                            {
                                validModels.Add(cleanName);
                            }
                        }

                        // Priority order for lowest latency, highest fidelity Flash models:
                        var preferred = validModels.FirstOrDefault(m => string.Equals(m, "gemini-2.0-flash", StringComparison.OrdinalIgnoreCase))
                            ?? validModels.FirstOrDefault(m => m.Contains("2.0-flash", StringComparison.OrdinalIgnoreCase))
                            ?? validModels.FirstOrDefault(m => m.Contains("flash", StringComparison.OrdinalIgnoreCase) && !m.Contains("thinking", StringComparison.OrdinalIgnoreCase))
                            ?? validModels.FirstOrDefault(m => m.Contains("gemini", StringComparison.OrdinalIgnoreCase))
                            ?? validModels.FirstOrDefault();

                        if (!string.IsNullOrWhiteSpace(preferred))
                        {
                            selectedModel = preferred;
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not dynamically probe Gemini ModelService for Key '{Alias}', falling back to {Model}", key.KeyAlias, selectedModel);
            }

            _resolvedModelCache[key.Id] = selectedModel;
            _logger.LogInformation("🎯 [AI Key Pool] Dynamically resolved Gemini model for Key '{Alias}': {Model}", key.KeyAlias, selectedModel);
            return selectedModel;
        }

        /// <inheritdoc />
        public async Task<string> GetGenerateContentEndpointAsync(MasterAiApiKey key, CancellationToken cancellationToken = default)
        {
            if (key == null) throw new ArgumentNullException(nameof(key));

            if (string.Equals(key.Provider, "Gemini", StringComparison.OrdinalIgnoreCase))
            {
                var model = await ResolveSupportedModelAsync(key, cancellationToken);
                return $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key.ApiKey}";
            }

            if (string.Equals(key.Provider, "DeepSeek", StringComparison.OrdinalIgnoreCase))
            {
                return "https://api.deepseek.com/v1/chat/completions";
            }

            return key.ApiKey;
        }
    }
}
