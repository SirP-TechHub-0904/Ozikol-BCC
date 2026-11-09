using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;
using Ozikol_BCC.Application.Interfaces.Services;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;

namespace Ozikol_BCC.AiServices.Services
{
    /// <summary>
    /// Enterprise AI completion engine supporting dynamic multi-model Gemini discovery per key,
    /// intra-key model rotation when a specific model is busy, resilient multi-key pool rotation,
    /// and automated DeepSeek secondary failover.
    /// </summary>
    public class AiSmartAssistService : IAiSmartAssistService
    {
        private readonly HttpClient _httpClient;
        private readonly DashboardDbContext _dbContext;
        private readonly MasterCatalogDbContext _masterDbContext;
        private readonly IConfiguration _configuration;
        private readonly ILogger<AiSmartAssistService> _logger;

        // In-memory cache for dynamically discovered models per key with 1-hour sliding TTL
        private static readonly ConcurrentDictionary<Guid, (List<string> Models, DateTime CachedAtUtc)> _geminiModelsCache = new();

        /// <summary>
        /// Initializes a new instance of the <see cref="AiSmartAssistService"/> class.
        /// </summary>
        public AiSmartAssistService(
            HttpClient httpClient,
            DashboardDbContext dbContext,
            MasterCatalogDbContext masterDbContext,
            IConfiguration configuration,
            ILogger<AiSmartAssistService> logger)
        {
            _httpClient = httpClient ?? throw new ArgumentNullException(nameof(httpClient));
            _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
            _masterDbContext = masterDbContext ?? throw new ArgumentNullException(nameof(masterDbContext));
            _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <inheritdoc />
        public async Task<AiCompletionResult> GenerateCompletionAsync(AiCompletionRequest request, CancellationToken cancellationToken = default)
        {
            var requestedProvider = request.ProviderOverride ?? "Gemini";

            // If DeepSeek was explicitly requested, try DeepSeek directly
            if (string.Equals(requestedProvider, "DeepSeek", StringComparison.OrdinalIgnoreCase))
            {
                return await ExecuteDeepSeekCompletionAsync(request, cancellationToken);
            }

            // Primary Provider: Google Gemini with Multi-Model & Multi-Key Exhaust Rotation
            var geminiResult = await ExecuteGeminiMultiKeyLoopAsync(request, cancellationToken);
            if (geminiResult.IsSuccess)
            {
                return geminiResult;
            }

            _logger.LogWarning("All Gemini keys and models in the pool were exhausted or rate-limited. Activating DeepSeek secondary failover...");

            // Secondary Failover: DeepSeek Chat
            var deepSeekResult = await ExecuteDeepSeekCompletionAsync(request, cancellationToken);
            if (deepSeekResult.IsSuccess)
            {
                return deepSeekResult;
            }

            return new AiCompletionResult
            {
                IsSuccess = false,
                ErrorMessage = $"All AI providers in the pool failed. Gemini: {geminiResult.ErrorMessage} | DeepSeek: {deepSeekResult.ErrorMessage}"
            };
        }

        /// <inheritdoc />
        public async Task<string> SummarizeChatHistoryAsync(List<string> messageList, CancellationToken cancellationToken = default)
        {
            if (messageList == null || messageList.Count == 0) return "No messages to summarize.";

            var concatenated = string.Join("\n", messageList);
            var req = new AiCompletionRequest
            {
                SystemInstruction = "Summarize the following group chat conversation into key discussion points and action items concisely.",
                Prompt = concatenated
            };

            var res = await GenerateCompletionAsync(req, cancellationToken);
            return res.IsSuccess ? res.Content : "Failed to generate summary.";
        }

        /// <summary>
        /// Loops through all active Google Gemini keys in least-used round-robin order.
        /// For each key, if Model A is busy or rate-limited, it automatically switches to the NEXT free model on the SAME key!
        /// Only when all free models on a key are busy does it rotate to the next Gemini key in the pool.
        /// </summary>
        private async Task<AiCompletionResult> ExecuteGeminiMultiKeyLoopAsync(AiCompletionRequest request, CancellationToken cancellationToken)
        {
            var nowUtc = DateTime.UtcNow;

            // 1. Fetch all active Gemini keys
            var candidateKeys = await _masterDbContext.MasterAiApiKeys
                .Where(k => k.Provider == "Gemini" && k.IsActive)
                .ToListAsync(cancellationToken);

            if (!candidateKeys.Any())
            {
                return new AiCompletionResult
                {
                    IsSuccess = false,
                    ErrorMessage = "No active Gemini API keys are registered in the Central key pool."
                };
            }

            // 2. Reset daily counter if day rolled over & clear expired cooldowns
            foreach (var k in candidateKeys)
            {
                if (k.LastUsedAtUtc.HasValue && k.LastUsedAtUtc.Value.Date < nowUtc.Date)
                {
                    k.TodayRequestsCount = 0;
                    if (k.Status == "QuotaExhausted") k.Status = "Active";
                }

                if (k.RateLimitCooldownUntilUtc.HasValue && k.RateLimitCooldownUntilUtc.Value <= nowUtc)
                {
                    k.RateLimitCooldownUntilUtc = null;
                    if (k.Status == "CoolingDown") k.Status = "Active";
                }
            }

            // 3. Filter and order by least-used first
            var availableKeys = candidateKeys
                .Where(k => (!k.RateLimitCooldownUntilUtc.HasValue || k.RateLimitCooldownUntilUtc.Value <= nowUtc)
                         && k.TodayRequestsCount < k.DailyQuotaLimit)
                .OrderBy(k => k.TodayRequestsCount)
                .ThenBy(k => k.LastUsedAtUtc ?? DateTime.MinValue)
                .ToList();

            if (!availableKeys.Any())
            {
                return new AiCompletionResult
                {
                    IsSuccess = false,
                    ErrorMessage = "All registered Gemini keys are currently cooling down or have reached daily quota limits."
                };
            }

            // 4. Exhaust all available Gemini keys sequentially
            string lastGeminiError = string.Empty;
            foreach (var key in availableKeys)
            {
                // Dynamically resolve all working models for this key
                var candidateModels = await ResolveSupportedGeminiModelsAsync(key.ApiKey, key.Id, cancellationToken);
                bool keySucceeded = false;

                // INTRA-KEY MODEL ROTATION: Try each model on the SAME key before rotating keys!
                foreach (var modelName in candidateModels)
                {
                    var stopwatch = Stopwatch.StartNew();
                    try
                    {
                        var endpoint = $"https://generativelanguage.googleapis.com/v1beta/models/{modelName}:generateContent?key={key.ApiKey}";

                        var geminiPayload = new
                        {
                            contents = new[]
                            {
                                new
                                {
                                    parts = new[]
                                    {
                                        new { text = $"{request.SystemInstruction}\n\n{request.Prompt}" }
                                    }
                                }
                            },
                            generationConfig = new
                            {
                                temperature = request.Temperature,
                                maxOutputTokens = request.MaxTokens > 0 ? request.MaxTokens : 2048
                            }
                        };

                        using var httpReq = new HttpRequestMessage(HttpMethod.Post, endpoint);
                        httpReq.Content = new StringContent(JsonSerializer.Serialize(geminiPayload), Encoding.UTF8, "application/json");

                        var response = await _httpClient.SendAsync(httpReq, cancellationToken);
                        stopwatch.Stop();
                        var latency = (int)stopwatch.ElapsedMilliseconds;

                        if (response.IsSuccessStatusCode)
                        {
                            using var doc = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync(cancellationToken), cancellationToken: cancellationToken);
                            var content = string.Empty;

                            if (doc.RootElement.TryGetProperty("candidates", out var candidates) &&
                                candidates.GetArrayLength() > 0 &&
                                candidates[0].TryGetProperty("content", out var contentElem) &&
                                contentElem.TryGetProperty("parts", out var parts) &&
                                parts.GetArrayLength() > 0)
                            {
                                content = parts[0].GetProperty("text").GetString() ?? string.Empty;
                            }

                            int? promptTokens = null;
                            int? completionTokens = null;
                            if (doc.RootElement.TryGetProperty("usageMetadata", out var usage))
                            {
                                if (usage.TryGetProperty("promptTokenCount", out var pt)) promptTokens = pt.GetInt32();
                                if (usage.TryGetProperty("candidatesTokenCount", out var ct)) completionTokens = ct.GetInt32();
                            }

                            // Update key metrics
                            key.TodayRequestsCount++;
                            key.TotalRequestsCount++;
                            key.LastUsedAtUtc = DateTime.UtcNow;
                            key.UpdatedAtUtc = DateTime.UtcNow;

                            await LogTelemetryAsync(key.Id, $"GenerateCompletion-{modelName}", latency, (int)response.StatusCode, promptTokens, completionTokens, null, cancellationToken);

                            return new AiCompletionResult
                            {
                                IsSuccess = true,
                                Content = content,
                                ProviderUsed = $"Gemini ({modelName} - Key: {key.KeyAlias})"
                            };
                        }

                        // If this model is busy (429 or 503)
                        var errBody = await response.Content.ReadAsStringAsync(cancellationToken);
                        lastGeminiError = $"Key '{key.KeyAlias}' (Model: {modelName}) returned HTTP {(int)response.StatusCode}: {errBody}";

                        if (response.StatusCode == System.Net.HttpStatusCode.TooManyRequests || (int)response.StatusCode == 503)
                        {
                            _logger.LogWarning("Gemini Model '{Model}' on Key '{Alias}' was busy/rate-limited (HTTP {Code}). Trying NEXT free model on the SAME key...", modelName, key.KeyAlias, (int)response.StatusCode);
                            await LogTelemetryAsync(key.Id, $"GenerateCompletion-{modelName}", latency, (int)response.StatusCode, null, null, lastGeminiError, cancellationToken);
                            continue; // Try next model on this SAME key!
                        }

                        // Other HTTP error
                        await LogTelemetryAsync(key.Id, $"GenerateCompletion-{modelName}", latency, (int)response.StatusCode, null, null, lastGeminiError, cancellationToken);
                    }
                    catch (Exception ex)
                    {
                        stopwatch.Stop();
                        lastGeminiError = $"Exception on Model '{modelName}' (Key '{key.KeyAlias}'): {ex.Message}";
                        _logger.LogWarning(ex, "Model '{Model}' on Key '{Alias}' failed. Trying next model...", modelName, key.KeyAlias);
                        await LogTelemetryAsync(key.Id, $"GenerateCompletion-{modelName}", (int)stopwatch.ElapsedMilliseconds, 500, null, null, lastGeminiError, cancellationToken);
                    }
                }

                // If ALL models on this key were busy or failed, mark key in cooldown and move to next key!
                key.RateLimitCooldownUntilUtc = DateTime.UtcNow.AddSeconds(300);
                key.Status = "CoolingDown";
                key.UpdatedAtUtc = DateTime.UtcNow;
                _logger.LogWarning("All candidate models on Gemini Key '{Alias}' were busy or exhausted. Cooldown set for 300s. Rotating to next Gemini key...", key.KeyAlias);
            }

            return new AiCompletionResult
            {
                IsSuccess = false,
                ErrorMessage = $"All available Gemini keys and models failed. Last error: {lastGeminiError}"
            };
        }

        /// <summary>
        /// Executes completion using DeepSeek Chat API.
        /// </summary>
        private async Task<AiCompletionResult> ExecuteDeepSeekCompletionAsync(AiCompletionRequest request, CancellationToken cancellationToken)
        {
            var deepSeekKey = await _masterDbContext.MasterAiApiKeys
                .Where(k => k.Provider == "DeepSeek" && k.IsActive && (!k.RateLimitCooldownUntilUtc.HasValue || k.RateLimitCooldownUntilUtc.Value <= DateTime.UtcNow))
                .OrderBy(k => k.TodayRequestsCount)
                .FirstOrDefaultAsync(cancellationToken);

            var apiKey = deepSeekKey?.ApiKey ?? _configuration["Ai:DeepSeekApiKey"] ?? string.Empty;
            if (string.IsNullOrWhiteSpace(apiKey))
            {
                return new AiCompletionResult
                {
                    IsSuccess = false,
                    ErrorMessage = "No active DeepSeek API key is configured for failover."
                };
            }

            var stopwatch = Stopwatch.StartNew();
            try
            {
                using var httpRequest = new HttpRequestMessage(HttpMethod.Post, "https://api.deepseek.com/chat/completions");
                httpRequest.Headers.Add("Authorization", $"Bearer {apiKey}");

                var payload = new
                {
                    model = "deepseek-chat",
                    messages = new[]
                    {
                        new { role = "system", content = request.SystemInstruction },
                        new { role = "user", content = request.Prompt }
                    },
                    temperature = request.Temperature,
                    max_tokens = request.MaxTokens > 0 ? request.MaxTokens : 2048
                };

                httpRequest.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
                var response = await _httpClient.SendAsync(httpRequest, cancellationToken);
                stopwatch.Stop();
                var latency = (int)stopwatch.ElapsedMilliseconds;

                if (!response.IsSuccessStatusCode)
                {
                    var errBody = await response.Content.ReadAsStringAsync(cancellationToken);
                    if (deepSeekKey != null)
                    {
                        await LogTelemetryAsync(deepSeekKey.Id, "GenerateCompletionDeepSeek", latency, (int)response.StatusCode, null, null, errBody, cancellationToken);
                    }
                    return new AiCompletionResult
                    {
                        IsSuccess = false,
                        ErrorMessage = $"DeepSeek API returned HTTP {response.StatusCode}: {errBody}"
                    };
                }

                using var doc = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync(cancellationToken), cancellationToken: cancellationToken);
                var content = doc.RootElement.GetProperty("choices")[0].GetProperty("message").GetProperty("content").GetString() ?? string.Empty;

                if (deepSeekKey != null)
                {
                    deepSeekKey.TodayRequestsCount++;
                    deepSeekKey.TotalRequestsCount++;
                    deepSeekKey.LastUsedAtUtc = DateTime.UtcNow;
                    deepSeekKey.UpdatedAtUtc = DateTime.UtcNow;
                    await LogTelemetryAsync(deepSeekKey.Id, "GenerateCompletionDeepSeek", latency, (int)response.StatusCode, null, null, null, cancellationToken);
                }

                return new AiCompletionResult
                {
                    IsSuccess = true,
                    Content = content,
                    ProviderUsed = "DeepSeek (deepseek-chat)"
                };
            }
            catch (Exception ex)
            {
                stopwatch.Stop();
                return new AiCompletionResult
                {
                    IsSuccess = false,
                    ErrorMessage = $"DeepSeek completion exception: {ex.Message}"
                };
            }
        }

        /// <summary>
        /// Dynamically discovers all active, supported Google Gemini models for the specified key
        /// by querying Google's ModelService (GET https://generativelanguage.googleapis.com/v1beta/models).
        /// Returns an ordered list of prioritized free models (e.g. gemini-2.5-flash, gemini-2.0-flash, gemini-1.5-flash).
        /// Caches the models in memory for 1 hour per key. Zero hardcoding!
        /// </summary>
        private async Task<List<string>> ResolveSupportedGeminiModelsAsync(string apiKey, Guid keyId, CancellationToken cancellationToken)
        {
            if (_geminiModelsCache.TryGetValue(keyId, out var cached) && (DateTime.UtcNow - cached.CachedAtUtc).TotalHours < 1 && cached.Models.Any())
            {
                return cached.Models;
            }

            var discoveredModels = new List<string>();
            try
            {
                var listModelsUrl = $"https://generativelanguage.googleapis.com/v1beta/models?key={apiKey}";
                using var response = await _httpClient.GetAsync(listModelsUrl, cancellationToken);

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
                                // Filter out non-text/specialized models
                                if (cleanName.Contains("tts", StringComparison.OrdinalIgnoreCase) ||
                                    cleanName.Contains("image", StringComparison.OrdinalIgnoreCase) ||
                                    cleanName.Contains("transcribe", StringComparison.OrdinalIgnoreCase) ||
                                    cleanName.Contains("embedding", StringComparison.OrdinalIgnoreCase) ||
                                    cleanName.Contains("realtime", StringComparison.OrdinalIgnoreCase))
                                {
                                    continue;
                                }
                                validModels.Add(cleanName);
                            }
                        }

                        // Order candidate models by version / capability:
                        // Prioritizes 2.5-flash, 2.0-flash, 1.5-flash, etc.
                        void TryAdd(string name)
                        {
                            var match = validModels.FirstOrDefault(m => string.Equals(m, name, StringComparison.OrdinalIgnoreCase));
                            if (!string.IsNullOrWhiteSpace(match) && !discoveredModels.Contains(match))
                            {
                                discoveredModels.Add(match);
                            }
                        }

                        TryAdd("gemini-3.8-flash");
                        TryAdd("gemini-3.5-flash");
                        TryAdd("gemini-3.7-flash");
                        TryAdd("gemini-flash-latest");
                        TryAdd("gemini-2.5-flash");
                        TryAdd("gemini-2.0-flash");
                        TryAdd("gemini-2.0-flash-lite");
                        TryAdd("gemini-1.5-flash");
                        TryAdd("gemini-1.5-flash-8b");

                        // Add any other active flash models
                        foreach (var m in validModels.Where(m => m.Contains("flash", StringComparison.OrdinalIgnoreCase)))
                        {
                            if (!discoveredModels.Contains(m)) discoveredModels.Add(m);
                        }

                        // Add remaining text generation models
                        foreach (var m in validModels)
                        {
                            if (!discoveredModels.Contains(m)) discoveredModels.Add(m);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not dynamically discover Gemini models via API for key {KeyId}", keyId);
            }

            if (!discoveredModels.Any())
            {
                discoveredModels.Add("gemini-3.8-flash");
                discoveredModels.Add("gemini-3.5-flash");
                discoveredModels.Add("gemini-flash-latest");
                discoveredModels.Add("gemini-2.5-flash");
                discoveredModels.Add("gemini-2.0-flash");
                discoveredModels.Add("gemini-1.5-flash");
            }

            _geminiModelsCache[keyId] = (discoveredModels, DateTime.UtcNow);
            return discoveredModels;
        }

        /// <summary>
        /// Asynchronously logs a request execution event with latency and status code telemetry into MasterAiApiKeyUsageLogs.
        /// </summary>
        private async Task LogTelemetryAsync(
            Guid keyId,
            string actionName,
            int latencyMs,
            int statusCode,
            int? promptTokens,
            int? completionTokens,
            string? errorMessage,
            CancellationToken cancellationToken)
        {
            try
            {
                var log = new MasterAiApiKeyUsageLog
                {
                    MasterAiApiKeyId = keyId,
                    ActionName = actionName,
                    RequestTimestampUtc = DateTime.UtcNow,
                    ResponseTimeMs = latencyMs,
                    StatusCode = statusCode,
                    PromptTokens = promptTokens,
                    CompletionTokens = completionTokens,
                    ErrorMessage = errorMessage
                };

                _masterDbContext.MasterAiApiKeyUsageLogs.Add(log);
                await _masterDbContext.SaveChangesAsync(cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to persist AI usage telemetry log for Key ID {KeyId}", keyId);
            }
        }
    }
}
