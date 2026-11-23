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

                    // Attach tenant logo to OneSignal Web & Mobile push payload so the notification displays the tenant's brand logo
                    if (customData.TryGetValue("tenant_logo_url", out var logoUrl) && !string.IsNullOrWhiteSpace(logoUrl))
                    {
                        payload["chrome_web_icon"] = logoUrl;
                        payload["firefox_icon"] = logoUrl;
                        payload["large_icon"] = logoUrl;
                    }
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

                // Determine whether push targets failed purely due to missing OneSignal player subscription
                if (targetUserIds != null && targetUserIds.Count > 0)
                {
                    foreach (var uid in targetUserIds.Where(id => !string.IsNullOrWhiteSpace(id)).Distinct())
                    {
                        try
                        {
                            await RegisterUserSubscriptionAsync(uid, tenantKey, cancellationToken: cancellationToken);
                        }
                        catch { }
                    }
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
                    var oneSignalErrors = new List<string>();
                    try
                    {
                        using var doc = JsonDocument.Parse(responseBody);
                        if (doc.RootElement.TryGetProperty("id", out var idProp))
                        {
                            notifId = idProp.GetString();
                        }

                        if (doc.RootElement.TryGetProperty("errors", out var errorsProp))
                        {
                            if (errorsProp.ValueKind == JsonValueKind.Array)
                            {
                                foreach (var errItem in errorsProp.EnumerateArray())
                                {
                                    if (errItem.ValueKind == JsonValueKind.String)
                                    {
                                        var str = errItem.GetString();
                                        if (!string.IsNullOrWhiteSpace(str))
                                        {
                                            oneSignalErrors.Add(str);
                                        }
                                    }
                                }
                            }
                            else if (errorsProp.ValueKind == JsonValueKind.Object)
                            {
                                oneSignalErrors.Add(errorsProp.GetRawText());
                            }
                        }
                    }
                    catch { }

                    // OneSignal returns HTTP 200 with {"id":"","errors":["All included players are not subscribed"]}
                    // when zero devices match the target external_id. Treat empty id / errors as undelivered.
                    if (string.IsNullOrWhiteSpace(notifId) || oneSignalErrors.Count > 0)
                    {
                        var reason = oneSignalErrors.Count > 0
                            ? string.Join("; ", oneSignalErrors)
                            : "No active push subscriptions matched target user(s) in OneSignal.";
                        _logger.LogWarning("⚠️ [OneSignalPushDispatcher] OneSignal returned HTTP 200 with 0 delivered subscriptions: {Reason}", reason);
                        return (false, $"OneSignal: {reason}", null);
                    }

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

        /// <inheritdoc />
        public async Task<(bool Success, string? ErrorMessage, string? SubscriptionId)> RegisterUserSubscriptionAsync(
            string externalUserId,
            string? tenantKey = null,
            string? email = null,
            string? fullName = null,
            string? pushEndpoint = null,
            string? p256dh = null,
            string? auth = null,
            string? userAgent = null,
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(externalUserId))
            {
                return (false, "External user ID is required.", null);
            }

            var (appId, restApiKey) = await ResolveCredentialsAsync(cancellationToken);
            if (string.IsNullOrWhiteSpace(appId) || string.IsNullOrWhiteSpace(restApiKey))
            {
                return (false, "OneSignal Push credentials are not configured in Central Master Catalog.", null);
            }

            try
            {
                var tags = new Dictionary<string, string>
                {
                    ["platform"] = "ozikol-bcc"
                };
                if (!string.IsNullOrWhiteSpace(tenantKey))
                {
                    tags["tenant_key"] = tenantKey.Trim().ToLowerInvariant();
                }
                if (!string.IsNullOrWhiteSpace(fullName))
                {
                    tags["full_name"] = fullName.Trim();
                }

                // Determine device_type for OneSignal Players API:
                // 5 = Chrome Web Push, 7 = Safari Web Push, 8 = Firefox Web Push
                int deviceType = 5;
                if (!string.IsNullOrWhiteSpace(userAgent))
                {
                    if (userAgent.Contains("Firefox", StringComparison.OrdinalIgnoreCase))
                    {
                        deviceType = 8;
                    }
                    else if (userAgent.Contains("Safari", StringComparison.OrdinalIgnoreCase) &&
                             !userAgent.Contains("Chrome", StringComparison.OrdinalIgnoreCase))
                    {
                        deviceType = 7;
                    }
                }

                var playerPayload = new Dictionary<string, object>
                {
                    ["app_id"] = appId,
                    ["device_type"] = deviceType,
                    ["external_user_id"] = externalUserId.Trim(),
                    ["tags"] = tags
                };

                if (!string.IsNullOrWhiteSpace(pushEndpoint))
                {
                    playerPayload["identifier"] = pushEndpoint.Trim();
                    playerPayload["notification_types"] = 1; // 1 = Subscribed
                }

                if (!string.IsNullOrWhiteSpace(p256dh))
                {
                    playerPayload["web_p256"] = p256dh.Trim();
                }

                if (!string.IsNullOrWhiteSpace(auth))
                {
                    playerPayload["web_auth"] = auth.Trim();
                }

                using var request = new HttpRequestMessage(HttpMethod.Post, "https://onesignal.com/api/v1/players")
                {
                    Content = new StringContent(JsonSerializer.Serialize(playerPayload), Encoding.UTF8, "application/json")
                };
                request.Headers.Authorization = new AuthenticationHeaderValue("Key", restApiKey);

                using var response = await _httpClient.SendAsync(request, cancellationToken);
                var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

                string? playerId = null;
                if (response.IsSuccessStatusCode)
                {
                    try
                    {
                        using var doc = JsonDocument.Parse(responseBody);
                        if (doc.RootElement.TryGetProperty("id", out var idProp))
                        {
                            playerId = idProp.GetString();
                        }
                    }
                    catch { }
                }

                // Also register/sync email identity in OneSignal Users API so the user appears in OneSignal Audience even before/without Web Push keys
                if (!string.IsNullOrWhiteSpace(email))
                {
                    try
                    {
                        var emailPlayerPayload = new Dictionary<string, object>
                        {
                            ["app_id"] = appId,
                            ["device_type"] = 11, // 11 = Email subscription in OneSignal
                            ["identifier"] = email.Trim(),
                            ["external_user_id"] = externalUserId.Trim(),
                            ["tags"] = tags
                        };
                        using var emailReq = new HttpRequestMessage(HttpMethod.Post, "https://onesignal.com/api/v1/players")
                        {
                            Content = new StringContent(JsonSerializer.Serialize(emailPlayerPayload), Encoding.UTF8, "application/json")
                        };
                        emailReq.Headers.Authorization = new AuthenticationHeaderValue("Key", restApiKey);
                        await _httpClient.SendAsync(emailReq, cancellationToken);
                    }
                    catch { }
                }

                if (!string.IsNullOrWhiteSpace(playerId))
                {
                    _logger.LogInformation("✅ [OneSignalPushDispatcher] Registered OneSignal player '{PlayerId}' for user '{UserId}' (Tenant: {Tenant}).",
                        playerId, externalUserId, tenantKey);
                    return (true, null, playerId);
                }

                _logger.LogWarning("⚠️ [OneSignalPushDispatcher] OneSignal player registration returned {Status}: {Body}",
                    response.StatusCode, responseBody);
                return (response.IsSuccessStatusCode, responseBody, playerId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ [OneSignalPushDispatcher] Failed to register OneSignal subscription for user '{UserId}'.", externalUserId);
                return (false, ex.Message, null);
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
