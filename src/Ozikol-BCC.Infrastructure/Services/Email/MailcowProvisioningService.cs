using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Ozikol_BCC.Infrastructure.Services.Email;

/// <summary>
/// Implements automated domain creation, mailbox provisioning, and DKIM retrieval via Mailcow REST API.
/// </summary>
public sealed class MailcowProvisioningService : IMailcowProvisioningService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<MailcowProvisioningService> _logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="MailcowProvisioningService"/> class.
    /// </summary>
    /// <param name="httpClient">HTTP client configured for Mailcow API.</param>
    /// <param name="configuration">Application configuration provider.</param>
    /// <param name="logger">Structured logger instance.</param>
    public MailcowProvisioningService(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<MailcowProvisioningService> logger)
    {
        _httpClient = httpClient ?? throw new ArgumentNullException(nameof(httpClient));
        _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));

        ConfigureHttpClient();
    }

    private void ConfigureHttpClient()
    {
        var rawUrl = _configuration["Mailcow:ApiUrl"]
            ?? _configuration["MAILCOW_API_URL"]
            ?? Environment.GetEnvironmentVariable("Mailcow__ApiUrl")
            ?? Environment.GetEnvironmentVariable("MAILCOW_API_URL")
            ?? "https://127.0.0.1:8443";

        var apiKey = _configuration["Mailcow:ApiKey"]
            ?? _configuration["MAILCOW_API_KEY"]
            ?? Environment.GetEnvironmentVariable("Mailcow__ApiKey")
            ?? Environment.GetEnvironmentVariable("MAILCOW_API_KEY")
            ?? string.Empty;

        if (_httpClient.BaseAddress == null)
        {
            _httpClient.BaseAddress = new Uri(rawUrl.TrimEnd('/') + "/");
        }

        if (!string.IsNullOrWhiteSpace(apiKey))
        {
            _httpClient.DefaultRequestHeaders.Remove("X-API-Key");
            _httpClient.DefaultRequestHeaders.Add("X-API-Key", apiKey.Trim());
        }
    }

    /// <inheritdoc />
    public async Task<bool> EnsureDomainExistsAsync(string domain, string description = "Ozikol Workspace Domain", CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(domain))
        {
            return false;
        }

        try
        {
            var payload = new
            {
                domain = domain.Trim().ToLowerInvariant(),
                description = description,
                aliases = 500,
                mailboxes = 500,
                defquota = 3072,
                maxquota = 10240,
                quota = 102400,
                active = 1
            };

            var jsonContent = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync("api/v1/add/domain", jsonContent, cancellationToken);
            var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation("✅ [Mailcow] Domain '{Domain}' ensured successfully in Mailcow: {Response}", domain, responseBody);
                return true;
            }

            // If it already exists, Mailcow returns a message indicating domain exists
            if (responseBody.Contains("domain_exists", StringComparison.OrdinalIgnoreCase) ||
                responseBody.Contains("already exists", StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogInformation("ℹ️ [Mailcow] Domain '{Domain}' already registered in Mailcow.", domain);
                return true;
            }

            _logger.LogWarning("⚠️ [Mailcow] Add domain returned non-success for '{Domain}': {Status} - {Body}", domain, response.StatusCode, responseBody);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ [Mailcow] Exception while ensuring domain '{Domain}' exists.", domain);
            return false;
        }
    }

    /// <inheritdoc />
    public async Task<bool> EnsureMailboxExistsAsync(string domain, string localPart, string password, string displayName, int quotaMb = 2048, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(domain) || string.IsNullOrWhiteSpace(localPart) || string.IsNullOrWhiteSpace(password))
        {
            return false;
        }

        try
        {
            var cleanDomain = domain.Trim().ToLowerInvariant();
            var cleanLocal = localPart.Trim().ToLowerInvariant();

            var payload = new
            {
                domain = cleanDomain,
                local_part = cleanLocal,
                name = displayName,
                password = password,
                password2 = password,
                quota = quotaMb,
                active = 1
            };

            var jsonContent = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync("api/v1/add/mailbox", jsonContent, cancellationToken);
            var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

            if (response.IsSuccessStatusCode && responseBody.Contains("mailbox_added", StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogInformation("✅ [Mailcow] Mailbox '{LocalPart}@{Domain}' created successfully.", cleanLocal, cleanDomain);
                return true;
            }

            // If already exists, update password
            if (responseBody.Contains("mailbox_exists", StringComparison.OrdinalIgnoreCase) ||
                responseBody.Contains("already exists", StringComparison.OrdinalIgnoreCase))
            {
                var editPayload = new
                {
                    items = new[] { $"{cleanLocal}@{cleanDomain}" },
                    attr = new
                    {
                        password = password,
                        password2 = password,
                        active = 1
                    }
                };

                var editContent = new StringContent(JsonSerializer.Serialize(editPayload), Encoding.UTF8, "application/json");
                var editResponse = await _httpClient.PostAsync("api/v1/edit/mailbox", editContent, cancellationToken);
                return editResponse.IsSuccessStatusCode;
            }

            _logger.LogWarning("⚠️ [Mailcow] Add mailbox returned non-success for '{LocalPart}@{Domain}': {Body}", cleanLocal, cleanDomain, responseBody);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ [Mailcow] Exception while ensuring mailbox '{LocalPart}@{Domain}' exists.", localPart, domain);
            return false;
        }
    }

    /// <inheritdoc />
    public async Task<string?> GetDkimRecordAsync(string domain, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(domain))
        {
            return null;
        }

        try
        {
            var cleanDomain = domain.Trim().ToLowerInvariant();
            var response = await _httpClient.GetAsync($"api/v1/get/dkim/{cleanDomain}", cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                return null;
            }

            var json = await response.Content.ReadAsStringAsync(cancellationToken);
            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.TryGetProperty("dkim_txt", out var dkimTxt))
            {
                return dkimTxt.GetString();
            }

            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ [Mailcow] Exception while fetching DKIM record for '{Domain}'.", domain);
            return null;
        }
    }
}

