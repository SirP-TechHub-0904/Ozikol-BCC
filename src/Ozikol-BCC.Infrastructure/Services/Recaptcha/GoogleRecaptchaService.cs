using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Ozikol_BCC.Infrastructure.Services.Recaptcha;

/// <summary>
/// Production implementation of Google reCAPTCHA v2 / v3 verification service.
/// Queries the Google siteverify API endpoint with resilient fallback for local development environments.
/// </summary>
public class GoogleRecaptchaService : IRecaptchaService
{
    private const string GoogleVerifyEndpoint = "https://www.google.com/recaptcha/api/siteverify";
    private const string StandardTestSiteKey = "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI";
    private const string StandardTestSecretKey = "6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe";

    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<GoogleRecaptchaService> _logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="GoogleRecaptchaService"/> class.
    /// </summary>
    /// <param name="httpClient">Shared HTTP client instance for remote API calls.</param>
    /// <param name="configuration">Application configuration provider.</param>
    /// <param name="logger">Logger provider.</param>
    public GoogleRecaptchaService(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<GoogleRecaptchaService> logger)
    {
        _httpClient = httpClient ?? throw new ArgumentNullException(nameof(httpClient));
        _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Gets the public Google reCAPTCHA site key for client widget rendering.
    /// Resolves from .env, appsettings, and system environment variables, defaulting to standard test keys if not configured.
    /// </summary>
    public string SiteKey
    {
        get
        {
            var key = _configuration["GoogleReCaptcha:SiteKey"]
                ?? _configuration["GoogleRecaptcha:SiteKey"]
                ?? _configuration["GoogleReCaptcha__SiteKey"]
                ?? _configuration["RECAPTCHA_SITE_KEY"]
                ?? Environment.GetEnvironmentVariable("GoogleReCaptcha__SiteKey")
                ?? Environment.GetEnvironmentVariable("RECAPTCHA_SITE_KEY");

            var resolved = !string.IsNullOrWhiteSpace(key) ? key.Trim() : StandardTestSiteKey;
            _logger.LogInformation("Google reCAPTCHA resolved SiteKey: {SiteKeyPrefix}...", resolved.Length >= 8 ? resolved.Substring(0, 8) : resolved);
            return resolved;
        }
    }

    /// <summary>
    /// Gets the private Google reCAPTCHA secret key for backend verification.
    /// Resolves from .env, appsettings, and system environment variables, defaulting to standard test keys if not configured.
    /// </summary>
    private string SecretKey
    {
        get
        {
            var secret = _configuration["GoogleReCaptcha:SecretKey"]
                ?? _configuration["GoogleRecaptcha:SecretKey"]
                ?? _configuration["GoogleReCaptcha__SecretKey"]
                ?? _configuration["RECAPTCHA_SECRET_KEY"]
                ?? Environment.GetEnvironmentVariable("GoogleReCaptcha__SecretKey")
                ?? Environment.GetEnvironmentVariable("RECAPTCHA_SECRET_KEY");

            return !string.IsNullOrWhiteSpace(secret) ? secret.Trim() : StandardTestSecretKey;
        }
    }

    /// <summary>
    /// Validates the token returned by the Google reCAPTCHA widget by calling the Google verification endpoint.
    /// Logs detailed diagnostics to aid troubleshooting in development and production environments.
    /// </summary>
    /// <param name="recaptchaResponse">The response token string from the g-recaptcha-response form parameter.</param>
    /// <param name="remoteIp">Optional client remote IP address.</param>
    /// <returns>True if verification succeeds or passes development mock; otherwise false.</returns>
    public async Task<bool> ValidateTokenAsync(string? recaptchaResponse, string? remoteIp = null)
    {
        _logger.LogInformation("reCAPTCHA validation initiated for client IP: {RemoteIp}. Token length: {TokenLength}", remoteIp ?? "unknown", recaptchaResponse?.Length ?? 0);

        // 1. If response is completely missing and not running with test keys, reject immediately
        if (string.IsNullOrWhiteSpace(recaptchaResponse))
        {
            _logger.LogWarning("reCAPTCHA response token is empty or null from IP: {RemoteIp}.", remoteIp ?? "unknown");

            // Allow dev bypass if running purely locally with test key and response omitted
            if (SecretKey == StandardTestSecretKey)
            {
                _logger.LogInformation("Running with standard test secret key; allowing bypass for empty token in development.");
                return true;
            }

            return false;
        }

        try
        {
            var parameters = new List<KeyValuePair<string, string>>
            {
                new("secret", SecretKey),
                new("response", recaptchaResponse)
            };

            if (!string.IsNullOrWhiteSpace(remoteIp))
            {
                parameters.Add(new("remoteip", remoteIp));
            }

            var requestContent = new FormUrlEncodedContent(parameters);
            var response = await _httpClient.PostAsync(GoogleVerifyEndpoint, requestContent);

            var json = await response.Content.ReadAsStringAsync();
            _logger.LogInformation("Google reCAPTCHA API responded with HTTP {StatusCode}: {ResponseJson}", response.StatusCode, json);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("reCAPTCHA endpoint returned non-success HTTP status {StatusCode}.", response.StatusCode);
                return SecretKey == StandardTestSecretKey;
            }

            using var doc = JsonDocument.Parse(json);

            if (doc.RootElement.TryGetProperty("success", out var successEl) && successEl.GetBoolean())
            {
                _logger.LogInformation("reCAPTCHA verification SUCCEEDED for client IP: {RemoteIp}.", remoteIp ?? "unknown");
                return true;
            }

            _logger.LogWarning("reCAPTCHA verification FAILED. Response: {ResponseJson}", json);
            return SecretKey == StandardTestSecretKey;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception encountered while verifying Google reCAPTCHA token.");
            return SecretKey == StandardTestSecretKey;
        }
    }
}
