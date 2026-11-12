using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace Ozikol_BCC.Infrastructure.Services.Email;

/// <summary>
/// Automates Cloudflare DNS record creation/updates (MX, SPF, DKIM, DMARC) for tenant email domains
/// using encrypted credentials stored in Central MasterPlatformSettings.
/// </summary>
public sealed class CloudflareDnsService : ICloudflareDnsService
{
    private const string CloudflareApiBase = "https://api.cloudflare.com/client/v4";

    private readonly HttpClient _httpClient;
    private readonly ILogger<CloudflareDnsService> _logger;
    private readonly IMailInfrastructureCredentialProvider? _credentialProvider;

    /// <summary>
    /// Initializes a new instance of the <see cref="CloudflareDnsService"/> class.
    /// </summary>
    /// <param name="httpClient">HTTP client for Cloudflare v4 REST calls.</param>
    /// <param name="logger">Logger instance.</param>
    /// <param name="credentialProvider">Central Master DB credential provider.</param>
    public CloudflareDnsService(
        HttpClient httpClient,
        ILogger<CloudflareDnsService> logger,
        IMailInfrastructureCredentialProvider? credentialProvider = null)
    {
        _httpClient = httpClient ?? throw new ArgumentNullException(nameof(httpClient));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _credentialProvider = credentialProvider;
    }

    /// <inheritdoc />
    public async Task<CloudflareEmailDnsResult> EnsureTenantEmailDnsAsync(
        string domain,
        string? dkimTxtValue,
        CancellationToken cancellationToken = default)
    {
        var cleanDomain = (domain ?? string.Empty).Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(cleanDomain))
        {
            return new CloudflareEmailDnsResult(false, "Tenant mail domain cannot be empty.");
        }

        var creds = _credentialProvider?.GetCredentials();
        var zoneId = creds?.CloudflareZoneId?.Trim();
        var apiToken = creds?.CloudflareDnsApiToken?.Trim();
        var mailHost = string.IsNullOrWhiteSpace(creds?.MailcowSmtpHost)
            ? "mail.ozikol.cloud"
            : creds.MailcowSmtpHost.Trim().ToLowerInvariant();

        if (string.IsNullOrWhiteSpace(zoneId) || string.IsNullOrWhiteSpace(apiToken))
        {
            return new CloudflareEmailDnsResult(
                false,
                "Cloudflare Zone ID or DNS API Token is not configured in Central Works Platform Settings.");
        }

        if (string.IsNullOrWhiteSpace(dkimTxtValue))
        {
            return new CloudflareEmailDnsResult(
                false,
                $"Mailcow did not return a DKIM public key for '{cleanDomain}'. Cannot complete DNS authentication.");
        }

        try
        {
            // 0. Ensure mail.ozikol.cloud has an IPv6 AAAA record so outbound IPv6 SMTP passes SPF/rDNS alignment
            if (string.Equals(mailHost, "mail.ozikol.cloud", StringComparison.OrdinalIgnoreCase))
            {
                var aaaaOk = await UpsertDnsRecordAsync(
                    zoneId,
                    apiToken,
                    type: "AAAA",
                    name: mailHost,
                    content: "2a02:4780:c:3a02::1",
                    priority: null,
                    matchPredicate: null,
                    cancellationToken);

                if (!aaaaOk.Success)
                {
                    return aaaaOk;
                }
            }

            // 0b. Ensure <tenant>.ozikol.cloud has its own A record matching *.ozikol.cloud
            // (In DNS, adding MX/TXT on a subdomain stops the *.ozikol.cloud wildcard from matching it.)
            var (webOriginIp, webProxied) = await ResolveWebOriginARecordAsync(zoneId, apiToken, cancellationToken);
            if (!string.IsNullOrWhiteSpace(webOriginIp))
            {
                var webAOk = await UpsertDnsRecordAsync(
                    zoneId,
                    apiToken,
                    type: "A",
                    name: cleanDomain,
                    content: webOriginIp,
                    priority: null,
                    matchPredicate: null,
                    cancellationToken,
                    proxied: webProxied);

                if (!webAOk.Success)
                {
                    return webAOk;
                }
            }

            // 1. MX record routing incoming/bounce mail for <tenant>.ozikol.cloud to mail.ozikol.cloud
            var mxOk = await UpsertDnsRecordAsync(
                zoneId,
                apiToken,
                type: "MX",
                name: cleanDomain,
                content: mailHost,
                priority: 10,
                matchPredicate: null,
                cancellationToken);

            if (!mxOk.Success)
            {
                return mxOk;
            }

            // 2. SPF TXT record authorizing mail.ozikol.cloud (IPv4 A/MX + IPv6 outbound interface)
            var spfContent = string.Equals(mailHost, "mail.ozikol.cloud", StringComparison.OrdinalIgnoreCase)
                ? $"v=spf1 mx a:{mailHost} ip6:2a02:4780:c:3a02::1 ~all"
                : $"v=spf1 mx a:{mailHost} ~all";
            var spfOk = await UpsertDnsRecordAsync(
                zoneId,
                apiToken,
                type: "TXT",
                name: cleanDomain,
                content: spfContent,
                priority: null,
                matchPredicate: existing => existing.StartsWith("v=spf1", StringComparison.OrdinalIgnoreCase),
                cancellationToken);

            if (!spfOk.Success)
            {
                return spfOk;
            }

            // 3. DKIM TXT record at dkim._domainkey.<tenant>.ozikol.cloud
            var dkimOk = await UpsertDnsRecordAsync(
                zoneId,
                apiToken,
                type: "TXT",
                name: $"dkim._domainkey.{cleanDomain}",
                content: dkimTxtValue.Trim(),
                priority: null,
                matchPredicate: existing => existing.Contains("DKIM1", StringComparison.OrdinalIgnoreCase),
                cancellationToken);

            if (!dkimOk.Success)
            {
                return dkimOk;
            }

            // 4. DMARC TXT record at _dmarc.<tenant>.ozikol.cloud
            var dmarcContent = "v=DMARC1; p=quarantine; rua=mailto:alerts@ozikol.cloud; ruf=mailto:alerts@ozikol.cloud; sp=quarantine; aspf=r; adkim=r;";
            var dmarcOk = await UpsertDnsRecordAsync(
                zoneId,
                apiToken,
                type: "TXT",
                name: $"_dmarc.{cleanDomain}",
                content: dmarcContent,
                priority: null,
                matchPredicate: existing => existing.StartsWith("v=DMARC1", StringComparison.OrdinalIgnoreCase),
                cancellationToken);

            if (!dmarcOk.Success)
            {
                return dmarcOk;
            }

            _logger.LogInformation("✅ [CloudflareDNS] Ensured MX, SPF, DKIM, and DMARC records for '{Domain}'.", cleanDomain);
            return new CloudflareEmailDnsResult(true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ [CloudflareDNS] Exception while provisioning DNS records for '{Domain}'.", cleanDomain);
            return new CloudflareEmailDnsResult(false, $"Cloudflare DNS API error: {ex.Message}");
        }
    }

    private async Task<(string? IpAddress, bool Proxied)> ResolveWebOriginARecordAsync(
        string zoneId,
        string apiToken,
        CancellationToken cancellationToken)
    {
        foreach (var candidateName in new[] { "*.ozikol.cloud", "ozikol.cloud" })
        {
            var url = $"{CloudflareApiBase}/zones/{Uri.EscapeDataString(zoneId)}/dns_records?type=A&name={Uri.EscapeDataString(candidateName)}";
            using var req = new HttpRequestMessage(HttpMethod.Get, url);
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiToken);
            using var resp = await _httpClient.SendAsync(req, cancellationToken);
            if (!resp.IsSuccessStatusCode)
            {
                continue;
            }

            var body = await resp.Content.ReadAsStringAsync(cancellationToken);
            using var doc = JsonDocument.Parse(body);
            if (doc.RootElement.TryGetProperty("result", out var resultArr) && resultArr.ValueKind == JsonValueKind.Array)
            {
                foreach (var item in resultArr.EnumerateArray())
                {
                    var ip = item.TryGetProperty("content", out var cProp) ? cProp.GetString() : null;
                    if (!string.IsNullOrWhiteSpace(ip))
                    {
                        var proxied = item.TryGetProperty("proxied", out var pProp) && pProp.ValueKind == JsonValueKind.True;
                        return (ip.Trim(), proxied);
                    }
                }
            }
        }

        return ("2.24.162.42", true);
    }

    private async Task<CloudflareEmailDnsResult> UpsertDnsRecordAsync(
        string zoneId,
        string apiToken,
        string type,
        string name,
        string content,
        int? priority,
        Func<string, bool>? matchPredicate,
        CancellationToken cancellationToken,
        bool proxied = false)
    {
        var listUrl = $"{CloudflareApiBase}/zones/{Uri.EscapeDataString(zoneId)}/dns_records?type={Uri.EscapeDataString(type)}&name={Uri.EscapeDataString(name)}";
        using var listReq = new HttpRequestMessage(HttpMethod.Get, listUrl);
        listReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiToken);

        using var listResp = await _httpClient.SendAsync(listReq, cancellationToken);
        var listBody = await listResp.Content.ReadAsStringAsync(cancellationToken);
        if (!listResp.IsSuccessStatusCode)
        {
            return new CloudflareEmailDnsResult(false, $"Cloudflare DNS lookup failed for {type} {name}: {listResp.StatusCode} - {listBody}");
        }

        string? existingId = null;
        string? existingContent = null;
        bool existingProxied = false;
        using (var doc = JsonDocument.Parse(listBody))
        {
            if (doc.RootElement.TryGetProperty("result", out var resultArr) && resultArr.ValueKind == JsonValueKind.Array)
            {
                foreach (var item in resultArr.EnumerateArray())
                {
                    var itemContent = item.TryGetProperty("content", out var cProp) ? cProp.GetString() ?? string.Empty : string.Empty;
                    if (matchPredicate == null || matchPredicate(itemContent))
                    {
                        existingId = item.TryGetProperty("id", out var idProp) ? idProp.GetString() : null;
                        existingContent = itemContent;
                        existingProxied = item.TryGetProperty("proxied", out var pProp) && pProp.ValueKind == JsonValueKind.True;
                        break;
                    }
                }
            }
        }

        // Skip update if exact record and proxy status already match
        if (!string.IsNullOrWhiteSpace(existingId) &&
            string.Equals(existingContent?.Trim('"'), content.Trim('"'), StringComparison.Ordinal) &&
            existingProxied == proxied)
        {
            return new CloudflareEmailDnsResult(true);
        }

        var payload = new Dictionary<string, object?>
        {
            ["type"] = type,
            ["name"] = name,
            ["content"] = content,
            ["ttl"] = proxied ? 1 : 300,
            ["proxied"] = proxied
        };
        if (priority.HasValue)
        {
            payload["priority"] = priority.Value;
        }

        var json = JsonSerializer.Serialize(payload);
        var method = string.IsNullOrWhiteSpace(existingId) ? HttpMethod.Post : HttpMethod.Put;
        var upsertUrl = string.IsNullOrWhiteSpace(existingId)
            ? $"{CloudflareApiBase}/zones/{Uri.EscapeDataString(zoneId)}/dns_records"
            : $"{CloudflareApiBase}/zones/{Uri.EscapeDataString(zoneId)}/dns_records/{Uri.EscapeDataString(existingId)}";

        using var upsertReq = new HttpRequestMessage(method, upsertUrl);
        upsertReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiToken);
        upsertReq.Content = new StringContent(json, Encoding.UTF8, "application/json");

        using var upsertResp = await _httpClient.SendAsync(upsertReq, cancellationToken);
        var upsertBody = await upsertResp.Content.ReadAsStringAsync(cancellationToken);
        if (!upsertResp.IsSuccessStatusCode)
        {
            return new CloudflareEmailDnsResult(false, $"Cloudflare DNS upsert failed for {type} {name}: {upsertResp.StatusCode} - {upsertBody}");
        }

        return new CloudflareEmailDnsResult(true);
    }
}

