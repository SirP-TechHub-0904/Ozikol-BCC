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
    private readonly IMailInfrastructureCredentialProvider? _credentialProvider;

    /// <summary>
    /// Initializes a new instance of the <see cref="MailcowProvisioningService"/> class.
    /// </summary>
    /// <param name="httpClient">HTTP client configured for Mailcow API.</param>
    /// <param name="configuration">Application configuration provider.</param>
    /// <param name="logger">Structured logger instance.</param>
    /// <param name="credentialProvider">Optional Central Master DB credential provider.</param>
    public MailcowProvisioningService(
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<MailcowProvisioningService> logger,
        IMailInfrastructureCredentialProvider? credentialProvider = null)
    {
        _httpClient = httpClient ?? throw new ArgumentNullException(nameof(httpClient));
        _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _credentialProvider = credentialProvider;

        ConfigureHttpClient();
    }

    private void ConfigureHttpClient()
    {
        var dbCreds = _credentialProvider?.GetCredentials();

        var rawUrl = !string.IsNullOrWhiteSpace(dbCreds?.MailcowApiUrl)
            ? dbCreds.MailcowApiUrl.Trim()
            : _configuration["Mailcow:ApiUrl"]
                ?? _configuration["MAILCOW_API_URL"]
                ?? Environment.GetEnvironmentVariable("Mailcow__ApiUrl")
                ?? Environment.GetEnvironmentVariable("MAILCOW_API_URL")
                ?? "https://mail.ozikol.cloud";

        // When running locally on Windows connected to the online Master DB, a VPS-local loopback URL
        // (e.g. https://127.0.0.1:8443) stored in MasterPlatformSettings must resolve to https://mail.ozikol.cloud
        if (OperatingSystem.IsWindows() &&
            (rawUrl.Contains("127.0.0.1", StringComparison.OrdinalIgnoreCase) ||
             rawUrl.Contains("localhost", StringComparison.OrdinalIgnoreCase)))
        {
            rawUrl = "https://mail.ozikol.cloud";
        }

        var apiKey = !string.IsNullOrWhiteSpace(dbCreds?.MailcowApiKey)
            ? dbCreds.MailcowApiKey.Trim()
            : _configuration["Mailcow:ApiKey"]
                ?? _configuration["MAILCOW_API_KEY"]
                ?? Environment.GetEnvironmentVariable("Mailcow__ApiKey")
                ?? Environment.GetEnvironmentVariable("MAILCOW_API_KEY")
                ?? string.Empty;

        var targetBaseUri = new Uri(rawUrl.TrimEnd('/') + "/");
        if (_httpClient.BaseAddress == null || _httpClient.BaseAddress != targetBaseUri)
        {
            _httpClient.BaseAddress = targetBaseUri;
        }

        _httpClient.DefaultRequestHeaders.Remove("X-API-Key");
        if (!string.IsNullOrWhiteSpace(apiKey))
        {
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

        ConfigureHttpClient();
        if (!_httpClient.DefaultRequestHeaders.Contains("X-API-Key"))
        {
            _logger.LogWarning("⚠️ [Mailcow] Mailcow API Key is not configured in Central Works Platform Settings.");
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

            // If it already exists, Mailcow returns a message indicating domain exists
            if (responseBody.Contains("domain_exists", StringComparison.OrdinalIgnoreCase) ||
                responseBody.Contains("already exists", StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogInformation("ℹ️ [Mailcow] Domain '{Domain}' already registered in Mailcow.", domain);
                return true;
            }

            if (response.IsSuccessStatusCode && !responseBody.Contains("\"type\":\"danger\"", StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogInformation("✅ [Mailcow] Domain '{Domain}' ensured successfully in Mailcow: {Response}", domain, responseBody);
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

        ConfigureHttpClient();
        if (!_httpClient.DefaultRequestHeaders.Contains("X-API-Key"))
        {
            _logger.LogWarning("⚠️ [Mailcow] Mailcow API Key is not configured in Central Works Platform Settings.");
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

            // If already exists (Mailcow returns "object_is_not_empty", "mailbox_exists", or "already exists"),
            // or if add/mailbox did not add a new row, update the existing mailbox password via api/v1/edit/mailbox
            var editPayload = new
            {
                items = new[] { $"{cleanLocal}@{cleanDomain}" },
                attr = new
                {
                    name = displayName,
                    password = password,
                    password2 = password,
                    active = 1
                }
            };

            var editContent = new StringContent(JsonSerializer.Serialize(editPayload), Encoding.UTF8, "application/json");
            var editResponse = await _httpClient.PostAsync("api/v1/edit/mailbox", editContent, cancellationToken);
            var editResponseBody = await editResponse.Content.ReadAsStringAsync(cancellationToken);
            if (editResponse.IsSuccessStatusCode &&
                !editResponseBody.Contains("\"type\":\"danger\"", StringComparison.OrdinalIgnoreCase) &&
                !editResponseBody.Contains("\"type\":\"error\"", StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogInformation("✅ [Mailcow] Mailbox '{LocalPart}@{Domain}' password synced via edit/mailbox.", cleanLocal, cleanDomain);
                return true;
            }

            _logger.LogWarning("⚠️ [Mailcow] Add/Edit mailbox returned non-success for '{LocalPart}@{Domain}'. Add: {AddBody} | Edit: {EditBody}",
                cleanLocal, cleanDomain, responseBody, editResponseBody);
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

        ConfigureHttpClient();
        if (!_httpClient.DefaultRequestHeaders.Contains("X-API-Key"))
        {
            return null;
        }

        try
        {
            var cleanDomain = domain.Trim().ToLowerInvariant();
            var response = await _httpClient.GetAsync($"api/v1/get/dkim/{cleanDomain}", cancellationToken);

            if (response.IsSuccessStatusCode)
            {
                var json = await response.Content.ReadAsStringAsync(cancellationToken);
                using var doc = JsonDocument.Parse(json);
                if (doc.RootElement.TryGetProperty("dkim_txt", out var dkimTxt))
                {
                    var recordStr = dkimTxt.GetString();
                    if (!string.IsNullOrWhiteSpace(recordStr))
                    {
                        return recordStr.Trim();
                    }
                }
            }

            // Proactively generate a 2048-bit DKIM keypair via Mailcow REST API if not yet generated
            _logger.LogInformation("ℹ️ [Mailcow] Generating 2048-bit DKIM keypair for '{Domain}'...", cleanDomain);
            var dkimPayload = new
            {
                domains = cleanDomain,
                dkim_selector = "dkim",
                key_size = 2048
            };
            var genContent = new StringContent(JsonSerializer.Serialize(dkimPayload), Encoding.UTF8, "application/json");
            var genRes = await _httpClient.PostAsync("api/v1/add/dkim", genContent, cancellationToken);

            if (genRes.IsSuccessStatusCode)
            {
                var retryResponse = await _httpClient.GetAsync($"api/v1/get/dkim/{cleanDomain}", cancellationToken);
                if (retryResponse.IsSuccessStatusCode)
                {
                    var retryJson = await retryResponse.Content.ReadAsStringAsync(cancellationToken);
                    using var retryDoc = JsonDocument.Parse(retryJson);
                    if (retryDoc.RootElement.TryGetProperty("dkim_txt", out var newDkimTxt))
                    {
                        var newRecordStr = newDkimTxt.GetString();
                        if (!string.IsNullOrWhiteSpace(newRecordStr))
                        {
                            _logger.LogInformation("✅ [Mailcow] 2048-bit DKIM key successfully generated for '{Domain}'.", cleanDomain);
                            return newRecordStr.Trim();
                        }
                    }
                }
            }

            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ [Mailcow] Exception while fetching or generating DKIM record for '{Domain}'.", domain);
            return null;
        }
    }

    /// <inheritdoc />
    public async Task<List<DomainMailboxDto>> GetDomainMailboxesAsync(string domain, CancellationToken cancellationToken = default)
    {
        var list = new List<DomainMailboxDto>();
        if (string.IsNullOrWhiteSpace(domain)) return list;

        ConfigureHttpClient();
        if (!_httpClient.DefaultRequestHeaders.Contains("X-API-Key"))
        {
            return list;
        }

        try
        {
            var cleanDomain = domain.Trim().ToLowerInvariant();
            var response = await _httpClient.GetAsync($"api/v1/get/mailbox/all/{cleanDomain}", cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                return list;
            }

            var json = await response.Content.ReadAsStringAsync(cancellationToken);
            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.ValueKind == JsonValueKind.Array)
            {
                foreach (var el in doc.RootElement.EnumerateArray())
                {
                    var username = el.TryGetProperty("username", out var u) ? u.GetString() ?? string.Empty : string.Empty;
                    var name = el.TryGetProperty("name", out var n) ? n.GetString() ?? string.Empty : string.Empty;
                    var active = el.TryGetProperty("active", out var a) && a.GetInt32() == 1;
                    var quota = el.TryGetProperty("quota", out var q) ? q.GetInt64() : 0;

                    if (!string.IsNullOrWhiteSpace(username))
                    {
                        var parts = username.Split('@');
                        var local = parts[0];
                        list.Add(new DomainMailboxDto
                        {
                            EmailAddress = username,
                            LocalPart = local,
                            Domain = cleanDomain,
                            DisplayName = name,
                            IsSystemMailbox = local.Equals("noreply", StringComparison.OrdinalIgnoreCase),
                            IsActive = active,
                            QuotaMb = (int)(quota / (1024 * 1024))
                        });
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to retrieve mailboxes for domain '{Domain}' from Mailcow.", domain);
        }

        return list;
    }

    /// <inheritdoc />
    public async Task<bool> DeleteMailboxAsync(string domain, string localPart, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(domain) || string.IsNullOrWhiteSpace(localPart)) return false;

        ConfigureHttpClient();
        if (!_httpClient.DefaultRequestHeaders.Contains("X-API-Key")) return false;

        try
        {
            var cleanDomain = domain.Trim().ToLowerInvariant();
            var cleanLocal = localPart.Trim().ToLowerInvariant();
            var email = $"{cleanLocal}@{cleanDomain}";

            var payload = new[] { email };
            var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync("api/v1/delete/mailbox", content, cancellationToken);
            var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

            if (response.IsSuccessStatusCode && !responseBody.Contains("\"type\":\"danger\"", StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogInformation("Deleted mailbox '{Email}' on Mailcow.", email);
                return true;
            }

            _logger.LogWarning("Mailcow delete mailbox failed for '{Email}': {Response}", email, responseBody);
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete mailbox '{LocalPart}@{Domain}' on Mailcow.", localPart, domain);
            return false;
        }
    }
}

