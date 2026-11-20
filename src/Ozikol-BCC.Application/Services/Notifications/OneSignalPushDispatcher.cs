using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Ozikol.MasterDomain.Security;
using Ozikol.MasterPersistence.EF.MasterSQL;
using Ozikol_BCC.Application.Interfaces.Services;

namespace Ozikol_BCC.Application.Services.Notifications
{
    /// <summary>
    /// Dispatches real-time native push notifications across Web, Mobile (Android/iOS), and Desktop via OneSignal REST API v1.
    /// Dynamically resolves API credentials from the Central Master Catalog database (<c>MasterPlatformSettings</c>).
    /// </summary>
    public class OneSignalPushDispatcher : IOneSignalPushDispatcher
    {
        private readonly HttpClient _httpClient;
        private readonly MasterCatalogDbContext? _masterContext;
        private readonly IConfiguration _configuration;
        private readonly ILogger<OneSignalPushDispatcher> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="OneSignalPushDispatcher"/> class.
        /// </summary>
        /// <param name="httpClient">HTTP client instance.</param>
        /// <param name="configuration">Application configuration.</param>
        /// <param name="logger">Structured logger instance.</param>
        /// <param name="masterContext">Optional Master Catalog DB context for dynamic key resolution.</param>
        public OneSignalPushDispatcher(
            HttpClient httpClient,
            IConfiguration configuration,
            ILogger<OneSignalPushDispatcher> logger,
            MasterCatalogDbContext? masterContext = null)
        {
            _httpClient = httpClient ?? throw new ArgumentNullException(nameof(httpClient));
            _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
            _masterContext = masterContext;
        }

        /// <inheritdoc />
        public async Task<(bool Success, string? ErrorMessage, string? OneSignalNotificationId)> SendPushNotificationAsync(
            string title,
            string message,
            string? launchUrl = null,
            IList<string>? targetUserIds = null,
            string? tenantKey = null,
            IDictionary<string, string>? customData = null,
            CancellationToken cancellationToken = default)
        {
            var (appId, restApiKey) = await ResolveCredentialsAsync(cancellationToken);

            if (string.IsNullOrWhiteSpace(appId) || string.IsNullOrWhiteSpace(restApiKey))
            {
                var err = "OneSignal Push credentials (AppId / RestApiKey) are not configured in Central Master Catalog settings.";
                _logger.LogWarning("⚠️ [OneSignalPushDispatcher] {Message}", err);
                return (false, err, null);
            }

            try
            {
                var payload = new Dictionary<string, object>
                {
                    ["app_id"] = appId,
                    ["headings"] = new Dictionary<string, string> { ["en"] = title },
                    ["contents"] = new Dictionary<string, string> { ["en"] = message }
                };

                if (!string.IsNullOrWhiteSpace(launchUrl))
                {
                    payload["url"] = launchUrl;
                }

                if (customData != null && customData.Count > 0)
                {
                    payload["data"] = customData;
                }

                // Targeting Strategy
                if (targetUserIds != null && targetUserIds.Count > 0)
                {
                    var cleanIds = targetUserIds.Where(id => !string.IsNullOrWhiteSpace(id)).Distinct().ToArray();
                    if (cleanIds.Length > 0)
                    {
                        payload["target_channel"] = "push";
                        payload["include_aliases"] = new Dictionary<string, string[]>
                        {
                            ["external_id"] = cleanIds
                        };
                        payload["include_external_user_ids"] = cleanIds;
                    }
                    else
                    {
                        payload["included_segments"] = new[] { "Subscribed Users" };
                    }
                }
                else if (!string.IsNullOrWhiteSpace(tenantKey))
                {
                    payload["filters"] = new object[]
                    {
                        new Dictionary<string, string>
                        {
                            ["field"] = "tag",
                            ["key"] = "tenant_key",
                            ["relation"] = "=",
                            ["value"] = tenantKey.Trim().ToLowerInvariant()
                        }
                    };
                }
                else
                {
                    payload["included_segments"] = new[] { "Subscribed Users" };
                }

                var jsonPayload = JsonSerializer.Serialize(payload);
                using var request = new HttpRequestMessage(HttpMethod.Post, "https://onesignal.com/api/v1/notifications")
                {
                    Content = new StringContent(jsonPayload, Encoding.UTF8, "application/json")
                };

                // OneSignal REST API accepts "Key <api_key>" or "Basic <api_key>"
                request.Headers.Authorization = new AuthenticationHeaderValue("Key", restApiKey);

                _logger.LogInformation("📲 [OneSignalPushDispatcher] Sending push notification: '{Title}' (Target: {Target})...",
                    title, targetUserIds?.Count > 0 ? $"{targetUserIds.Count} user(s)" : (tenantKey ?? "All"));

                using var response = await _httpClient.SendAsync(request, cancellationToken);
                var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

                if (response.IsSuccessStatusCode)
                {
                    string? notifId = null;
                    try
                    {
                        using var doc = JsonDocument.Parse(responseBody);
                        if (doc.RootElement.TryGetProperty("id", out var idProp))
                        {
                            notifId = idProp.GetString();
                        }
                    }
                    catch { }

                    _logger.LogInformation("✅ [OneSignalPushDispatcher] Push notification accepted by OneSignal. NotificationId: {Id}", notifId);
                    return (true, null, notifId);
                }

                _logger.LogWarning("⚠️ [OneSignalPushDispatcher] OneSignal API responded with {StatusCode}: {Response}",
                    response.StatusCode, responseBody);
                return (false, $"OneSignal HTTP {(int)response.StatusCode}: {responseBody}", null);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ [OneSignalPushDispatcher] Exception while dispatching push to OneSignal: {Message}", ex.Message);
                return (false, $"Dispatch exception: {ex.Message}", null);
            }
        }

        private async Task<(string? AppId, string? RestApiKey)> ResolveCredentialsAsync(CancellationToken cancellationToken)
        {
            string? appId = null;
            string? restApiKey = null;

            if (_masterContext != null)
            {
                try
                {
                    var settings = await _masterContext.MasterPlatformSettings
                        .AsNoTracking()
                        .FirstOrDefaultAsync(cancellationToken);

                    if (settings != null)
                    {
                        appId = settings.OneSignalAppId;
                        restApiKey = settings.OneSignalRestApiKey;

                        if (!string.IsNullOrWhiteSpace(restApiKey))
                        {
                            restApiKey = OzikolDataCipher.DecryptIfNeeded(restApiKey)?.Trim();
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "[OneSignalPushDispatcher] Could not resolve credentials from MasterPlatformSettings: {Msg}", ex.Message);
                }
            }

            if (string.IsNullOrWhiteSpace(appId))
            {
                appId = _configuration["ONESIGNAL_APP_ID"]
                     ?? _configuration["OneSignal:AppId"]
                     ?? _configuration["OneSignal__AppId"]
                     ?? Environment.GetEnvironmentVariable("ONESIGNAL_APP_ID");
            }

            if (string.IsNullOrWhiteSpace(restApiKey))
            {
                restApiKey = _configuration["ONESIGNAL_REST_API_KEY"]
                          ?? _configuration["OneSignal:RestApiKey"]
                          ?? _configuration["OneSignal__RestApiKey"]
                          ?? Environment.GetEnvironmentVariable("ONESIGNAL_REST_API_KEY");
            }

            return (appId?.Trim(), restApiKey?.Trim());
        }
    }
}
