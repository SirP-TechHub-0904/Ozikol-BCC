using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Ozikol.Central.Services.Notifications
{
    /// <summary>
    /// Implementation of <see cref="IOneSignalPushService"/> utilizing the OneSignal REST API v1.
    /// Safely handles API credentials, user targeting, and deep-link payload routing.
    /// </summary>
    public class OneSignalPushService : IOneSignalPushService
    {
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;
        private readonly ILogger<OneSignalPushService> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="OneSignalPushService"/> class.
        /// </summary>
        /// <param name="httpClient">HTTP client instance.</param>
        /// <param name="configuration">Application configuration.</param>
        /// <param name="logger">Structured logger instance.</param>
        public OneSignalPushService(
            HttpClient httpClient,
            IConfiguration configuration,
            ILogger<OneSignalPushService> logger)
        {
            _httpClient = httpClient ?? throw new ArgumentNullException(nameof(httpClient));
            _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <inheritdoc />
        public async Task<bool> SendPushNotificationAsync(
            string title,
            string message,
            string? launchUrl = null,
            IList<string>? externalUserIds = null,
            IList<string>? includedSegments = null,
            CancellationToken cancellationToken = default)
        {
            var appId = _configuration["ONESIGNAL_APP_ID"]
                     ?? _configuration["OneSignal__AppId"]
                     ?? _configuration["OneSignal:AppId"]
                     ?? Environment.GetEnvironmentVariable("ONESIGNAL_APP_ID");

            var apiKey = _configuration["ONESIGNAL_REST_API_KEY"]
                      ?? _configuration["OneSignal__RestApiKey"]
                      ?? _configuration["OneSignal__ApiKey"]
                      ?? _configuration["OneSignal:ApiKey"]
                      ?? _configuration["OneSignal:RestApiKey"]
                      ?? Environment.GetEnvironmentVariable("ONESIGNAL_REST_API_KEY");

            if (string.IsNullOrWhiteSpace(appId) || string.IsNullOrWhiteSpace(apiKey))
            {
                _logger.LogWarning("⚠️ [OneSignalPushService] OneSignal AppId or RestApiKey is not configured in .env. Skipping push dispatch.");
                return false;
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

                if (externalUserIds != null && externalUserIds.Any())
                {
                    payload["include_external_user_ids"] = externalUserIds.ToArray();
                }
                else if (includedSegments != null && includedSegments.Any())
                {
                    payload["included_segments"] = includedSegments.ToArray();
                }
                else
                {
                    payload["included_segments"] = new[] { "Subscribed Users" };
                }

                var json = JsonSerializer.Serialize(payload);
                using var request = new HttpRequestMessage(HttpMethod.Post, "https://onesignal.com/api/v1/notifications")
                {
                    Content = new StringContent(json, Encoding.UTF8, "application/json")
                };

                request.Headers.Authorization = new AuthenticationHeaderValue("Basic", apiKey);

                _logger.LogInformation("📲 [OneSignalPushService] Dispatching push notification: '{Title}'...", title);
                using var response = await _httpClient.SendAsync(request, cancellationToken);

                if (response.IsSuccessStatusCode)
                {
                    _logger.LogInformation("✅ [OneSignalPushService] Push notification successfully delivered to OneSignal gateway.");
                    return true;
                }

                var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogWarning("⚠️ [OneSignalPushService] OneSignal API returned status code {StatusCode}: {Response}", response.StatusCode, responseBody);
                return false;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ [OneSignalPushService] Exception while dispatching push notification to OneSignal");
                return false;
            }
        }

        /// <inheritdoc />
        public Task<bool> SendPushToUserAsync(
            string userId,
            string title,
            string message,
            string? launchUrl = null,
            CancellationToken cancellationToken = default)
        {
            return SendPushNotificationAsync(
                title: title,
                message: message,
                launchUrl: launchUrl,
                externalUserIds: new List<string> { userId },
                includedSegments: null,
                cancellationToken: cancellationToken);
        }

        /// <inheritdoc />
        public Task<bool> SendPushToAllAsync(
            string title,
            string message,
            string? launchUrl = null,
            CancellationToken cancellationToken = default)
        {
            return SendPushNotificationAsync(
                title: title,
                message: message,
                launchUrl: launchUrl,
                externalUserIds: null,
                includedSegments: new List<string> { "Subscribed Users" },
                cancellationToken: cancellationToken);
        }
    }
}
