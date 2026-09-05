using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Ozikol.Central.Services;

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
    /// Defaults to the standard Google test key if unconfigured.
    /// </summary>
    public string SiteKey
    {
        get
        {
            var key = _configuration["GoogleRecaptcha:SiteKey"]
                ?? _configuration["RECAPTCHA_SITE_KEY"];

            return !string.IsNullOrWhiteSpace(key) ? key : StandardTestSiteKey;
        }
    }

    /// <summary>
    /// Gets the private Google reCAPTCHA secret key for backend verification.
    /// </summary>
    private string SecretKey
    {
        get
        {
            var secret = _configuration["GoogleRecaptcha:SecretKey"]
                ?? _configuration["RECAPTCHA_SECRET_KEY"];

            return !string.IsNullOrWhiteSpace(secret) ? secret : StandardTestSecretKey;
        }
    }

    /// <summary>
    /// Validates the token returned by the Google reCAPTCHA widget by calling the Google verification endpoint.
    /// </summary>
    /// <param name="recaptchaResponse">The response token string from the g-recaptcha-response form parameter.</param>
    /// <param name="remoteIp">Optional client remote IP address.</param>
    /// <returns>True if verification succeeds or passes development mock; otherwise false.</returns>
    public async Task<bool> ValidateTokenAsync(string? recaptchaResponse, string? remoteIp = null)
    {
        // 1. If response is completely missing and not running with test keys, reject immediately
        if (string.IsNullOrWhiteSpace(recaptchaResponse))
        {
            // Allow dev bypass if running purely locally with test key and response omitted
            if (SecretKey == StandardTestSecretKey)
            {
                _logger.LogInformation("reCAPTCHA response omitted in development environment; allowing test pass.");
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

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("reCAPTCHA endpoint returned non-success status: {StatusCode}", response.StatusCode);
                return SecretKey == StandardTestSecretKey;
            }

            var json = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(json);

            if (doc.RootElement.TryGetProperty("success", out var successEl) && successEl.GetBoolean())
            {
                return true;
            }

            _logger.LogWarning("reCAPTCHA verification failed. Response: {ResponseJson}", json);
            return SecretKey == StandardTestSecretKey;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error while verifying Google reCAPTCHA token.");
            return SecretKey == StandardTestSecretKey;
        }
    }
}
