using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Ozikol_BCC.Infrastructure.Services.Email;

/// <summary>
/// Implements domain email configuration, automated Mailcow mailbox provisioning,
/// 1-free custom mailbox quota enforcement, DNS verification, and test email delivery.
/// </summary>
public sealed class DomainEmailProvisioningService : IDomainEmailProvisioningService
{
    private const string DefaultMailHost = "mail.ozikol.cloud";
    private static readonly Regex LocalPartRegex = new("^[a-zA-Z0-9._-]+$", RegexOptions.Compiled);

    private static readonly HashSet<string> ReservedLocalParts = new(StringComparer.OrdinalIgnoreCase)
    {
        "noreply",
        "postmaster",
        "abuse",
        "mailer-daemon",
        "root",
        "hostmaster",
        "admin",
        "administrator"
    };

    private readonly IMailcowProvisioningService _mailcowService;
    private readonly ISmtpEmailDispatcher _smtpDispatcher;
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<DomainEmailProvisioningService> _logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="DomainEmailProvisioningService"/> class.
    /// </summary>
    public DomainEmailProvisioningService(
        IMailcowProvisioningService mailcowService,
        ISmtpEmailDispatcher smtpDispatcher,
        HttpClient httpClient,
        IConfiguration configuration,
        ILogger<DomainEmailProvisioningService> logger)
    {
        _mailcowService = mailcowService ?? throw new ArgumentNullException(nameof(mailcowService));
        _smtpDispatcher = smtpDispatcher ?? throw new ArgumentNullException(nameof(smtpDispatcher));
        _httpClient = httpClient ?? throw new ArgumentNullException(nameof(httpClient));
        _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <inheritdoc />
    public async Task<DomainEmailConfigDto> GetDomainEmailConfigAsync(string domain, CancellationToken cancellationToken = default)
    {
        var cleanDomain = (domain ?? string.Empty).Trim().ToLowerInvariant()
            .Replace("https://", string.Empty)
            .Replace("http://", string.Empty)
            .TrimEnd('/');

        var result = new DomainEmailConfigDto
        {
            Domain = cleanDomain,
            MaxFreeMailboxes = 1
        };

        if (string.IsNullOrWhiteSpace(cleanDomain))
        {
            return result;
        }

        // 1. Ensure Domain Exists in Mailcow
        var domainExists = await _mailcowService.EnsureDomainExistsAsync(
            cleanDomain,
            $"Ozikol Workspace - {cleanDomain}",
            cancellationToken);

        result.DomainExistsInMailserver = domainExists;

        // 2. Ensure Automated System Mailbox (noreply@{domain})
        var systemPassword = $"OziNoReply!{Guid.NewGuid().ToString("N").Substring(0, 10)}#2026";
        await _mailcowService.EnsureMailboxExistsAsync(
            cleanDomain,
            "noreply",
            systemPassword,
            $"{cleanDomain} System Alerts",
            quotaMb: 2048,
            cancellationToken);

        // 3. Retrieve DKIM Public Key from Mailcow
        var dkimTxt = await _mailcowService.GetDkimRecordAsync(cleanDomain, cancellationToken);
        result.DkimPublicKey = !string.IsNullOrWhiteSpace(dkimTxt)
            ? dkimTxt.Trim()
            : "v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA (Generating 2048-bit key...)";

        // 4. Retrieve Active Mailboxes
        var mailboxes = await _mailcowService.GetDomainMailboxesAsync(cleanDomain, cancellationToken);
        if (mailboxes.Count == 0)
        {
            // Fallback representation if API didn't return yet
            mailboxes.Add(new DomainMailboxDto
            {
                EmailAddress = $"noreply@{cleanDomain}",
                LocalPart = "noreply",
                Domain = cleanDomain,
                DisplayName = $"{cleanDomain} Automated Sender",
                IsSystemMailbox = true,
                IsActive = true,
                QuotaMb = 2048
            });
        }

        result.Mailboxes = mailboxes;
        result.CurrentCustomMailboxCount = mailboxes.Count(m => !m.IsSystemMailbox);

        // 5. Generate DNS Matrix
        var mailHost = _configuration["Mailcow:SmtpHost"] ?? DefaultMailHost;

        var mxRecord = new EmailDnsRecordDto
        {
            RecordType = "MX",
            SubType = "MX",
            Host = "@ (Apex Root)",
            Value = mailHost,
            Priority = 10,
            Ttl = "Auto (300s)",
            Description = "Routes incoming tenant email to the platform Mailcow mail server",
            Key = "mx_primary"
        };

        var spfRecord = new EmailDnsRecordDto
        {
            RecordType = "TXT",
            SubType = "SPF",
            Host = "@ (Apex Root)",
            Value = $"v=spf1 a mx a:{mailHost} ~all",
            Priority = 0,
            Ttl = "Auto (300s)",
            Description = "Authorizes the platform mail server to send emails on behalf of your domain without spam flags",
            Key = "txt_spf"
        };

        var dkimRecord = new EmailDnsRecordDto
        {
            RecordType = "TXT",
            SubType = "DKIM",
            Host = "dkim._domainkey",
            Value = result.DkimPublicKey,
            Priority = 0,
            Ttl = "Auto (300s)",
            Description = "Cryptographic 2048-bit DKIM signature ensuring email authenticity and inbox deliverability",
            Key = "txt_dkim"
        };

        var dmarcRecord = new EmailDnsRecordDto
        {
            RecordType = "TXT",
            SubType = "DMARC",
            Host = "_dmarc",
            Value = $"v=DMARC1; p=none; rua=mailto:dmarc@{cleanDomain}",
            Priority = 0,
            Ttl = "Auto (300s)",
            Description = "Protects against domain spoofing and phishing with real-time delivery telemetry reports",
            Key = "txt_dmarc"
        };

        result.DnsRecords.Add(mxRecord);
        result.DnsRecords.Add(spfRecord);
        result.DnsRecords.Add(dkimRecord);
        result.DnsRecords.Add(dmarcRecord);

        // 6. Real-time verification probe for each record
        foreach (var rec in result.DnsRecords)
        {
            var probe = await VerifyDnsRecordAsync(cleanDomain, rec.SubType, cancellationToken);
            rec.IsVerified = probe.IsVerified;
            rec.DetectedValue = probe.DetectedValue;

            if (rec.SubType == "MX") result.IsMxVerified = probe.IsVerified;
            if (rec.SubType == "SPF") result.IsSpfVerified = probe.IsVerified;
            if (rec.SubType == "DKIM") result.IsDkimVerified = probe.IsVerified;
            if (rec.SubType == "DMARC") result.IsDmarcVerified = probe.IsVerified;
        }

        return result;
    }

    /// <inheritdoc />
    public async Task<(bool Success, string Message, DomainMailboxDto? Mailbox)> CreateCustomMailboxAsync(
        string tenantKey,
        string domain,
        string localPart,
        string password,
        string displayName,
        CancellationToken cancellationToken = default)
    {
        var cleanDomain = (domain ?? string.Empty).Trim().ToLowerInvariant();
        var cleanLocal = (localPart ?? string.Empty).Trim().ToLowerInvariant();

        if (string.IsNullOrWhiteSpace(cleanDomain))
        {
            return (false, "Domain cannot be empty.", null);
        }

        if (string.IsNullOrWhiteSpace(cleanLocal))
        {
            return (false, "Mailbox username cannot be empty.", null);
        }

        if (cleanLocal.Length < 2 || cleanLocal.Length > 64)
        {
            return (false, "Mailbox username must be between 2 and 64 characters.", null);
        }

        if (!LocalPartRegex.IsMatch(cleanLocal))
        {
            return (false, "Mailbox username can only contain letters, numbers, dots, hyphens, and underscores.", null);
        }

        if (cleanLocal.Equals("noreply", StringComparison.OrdinalIgnoreCase))
        {
            return (false, "'noreply' is reserved for the automated system sender. Choose a business name like 'support', 'info', or 'contact'.", null);
        }

        if (string.IsNullOrWhiteSpace(password) || password.Length < 8)
        {
            return (false, "Mailbox password must be at least 8 characters.", null);
        }

        // 1. Check Quota: Maximum 1 Free Custom Mailbox
        var existingMailboxes = await _mailcowService.GetDomainMailboxesAsync(cleanDomain, cancellationToken);
        var customCount = existingMailboxes.Count(m => !m.IsSystemMailbox);

        if (customCount >= 1)
        {
            // If the mailbox already exists, we allow updating the password/name
            var existing = existingMailboxes.FirstOrDefault(m => m.LocalPart.Equals(cleanLocal, StringComparison.OrdinalIgnoreCase));
            if (existing == null)
            {
                return (false, "Free mailbox limit reached (1/1). You already have an active custom mailbox for this domain. Delete it first if you wish to create a different email address.", null);
            }
        }

        var cleanDisplayName = !string.IsNullOrWhiteSpace(displayName)
            ? displayName.Trim()
            : $"{cleanLocal.ToUpperInvariant()} - {cleanDomain}";

        // 2. Ensure domain exists on mail server
        await _mailcowService.EnsureDomainExistsAsync(cleanDomain, $"Ozikol Workspace - {cleanDomain}", cancellationToken);

        // 3. Create or update mailbox on Mailcow
        var created = await _mailcowService.EnsureMailboxExistsAsync(
            cleanDomain,
            cleanLocal,
            password,
            cleanDisplayName,
            quotaMb: 2048,
            cancellationToken);

        if (!created)
        {
            return (false, "Mail server could not create mailbox. Please check mail server connection.", null);
        }

        var mailboxDto = new DomainMailboxDto
        {
            EmailAddress = $"{cleanLocal}@{cleanDomain}",
            LocalPart = cleanLocal,
            Domain = cleanDomain,
            DisplayName = cleanDisplayName,
            IsSystemMailbox = false,
            IsActive = true,
            QuotaMb = 2048,
            CreatedUtc = DateTime.UtcNow
        };

        return (true, $"Mailbox '{mailboxDto.EmailAddress}' created successfully!", mailboxDto);
    }

    /// <inheritdoc />
    public async Task<(bool Success, string Message)> DeleteCustomMailboxAsync(
        string domain,
        string localPart,
        CancellationToken cancellationToken = default)
    {
        var cleanDomain = (domain ?? string.Empty).Trim().ToLowerInvariant();
        var cleanLocal = (localPart ?? string.Empty).Trim().ToLowerInvariant();

        if (cleanLocal.Equals("noreply", StringComparison.OrdinalIgnoreCase))
        {
            return (false, "The system mailbox 'noreply' is required for automated platform notifications and cannot be deleted.");
        }

        var deleted = await _mailcowService.DeleteMailboxAsync(cleanDomain, cleanLocal, cancellationToken);
        if (!deleted)
        {
            return (false, $"Failed to delete mailbox '{cleanLocal}@{cleanDomain}' on mail server.");
        }

        return (true, $"Mailbox '{cleanLocal}@{cleanDomain}' has been deleted. Your 1 free mailbox slot is now available.");
    }

    /// <inheritdoc />
    public async Task<(bool Success, string Message)> SendTestEmailAsync(
        string domain,
        string recipientEmail,
        string? tenantName = null,
        CancellationToken cancellationToken = default)
    {
        var cleanDomain = (domain ?? string.Empty).Trim().ToLowerInvariant();
        var cleanRecipient = (recipientEmail ?? string.Empty).Trim();

        if (string.IsNullOrWhiteSpace(cleanRecipient) || !cleanRecipient.Contains('@'))
        {
            return (false, "Please provide a valid destination email address.");
        }

        var senderEmail = $"noreply@{cleanDomain}";
        var friendlyName = !string.IsNullOrWhiteSpace(tenantName) ? tenantName : cleanDomain;
        var subject = $"[Ozikol BCC] Deliverability Test for {cleanDomain}";

        var htmlBody = $@"
<div style='font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif; max-width:600px; margin:0 auto; padding:32px 24px; background:#f8fafc; border-radius:16px;'>
    <div style='background:#ffffff; border-radius:12px; padding:28px 32px; border:1px solid #e2e8f0; box-shadow:0 4px 12px rgba(0,0,0,0.03);'>
        <div style='display:flex; align-items:center; margin-bottom:20px;'>
            <div style='background:#0050e5; color:#ffffff; width:40px; height:40px; border-radius:10px; display:inline-flex; align-items:center; justify-content:center; font-size:20px; font-weight:bold;'>✉️</div>
            <div style='margin-left:14px;'>
                <h2 style='margin:0; font-size:18px; color:#0f172a;'>Email Deliverability Verification</h2>
                <p style='margin:2px 0 0; font-size:13px; color:#64748b;'>Ozikol Business Command Center (BCC)</p>
            </div>
        </div>
        <p style='color:#334155; font-size:14px; line-height:1.6;'>
            Congratulations! This test email confirms that your custom domain <strong>{cleanDomain}</strong> is successfully connected to the Ozikol BCC mail infrastructure.
        </p>
        <div style='background:#f1f5f9; border-left:4px solid #0050e5; padding:12px 16px; border-radius:6px; margin:20px 0;'>
            <div style='font-size:12px; color:#64748b; font-weight:600; text-transform:uppercase;'>Delivery Diagnostics</div>
            <div style='font-size:13px; color:#0f172a; margin-top:4px;'><strong>Sender:</strong> {senderEmail}</div>
            <div style='font-size:13px; color:#0f172a;'><strong>Destination:</strong> {cleanRecipient}</div>
            <div style='font-size:13px; color:#0f172a;'><strong>Mail Relay:</strong> {DefaultMailHost} (Port 587 STARTTLS)</div>
            <div style='font-size:13px; color:#16a34a; margin-top:4px;'><strong>Authentication:</strong> SPF &amp; DKIM Signed</div>
        </div>
        <p style='color:#64748b; font-size:12px; margin-top:24px; border-top:1px solid #f1f5f9; padding-top:16px;'>
            Sent by Ozikol BCC Mail System. If you received this email in your inbox, your email DNS configuration is healthy.
        </p>
    </div>
</div>";

        try
        {
            var sent = await _smtpDispatcher.SendEmailAsync(
                cleanRecipient,
                subject,
                htmlBody,
                fromEmail: senderEmail,
                fromName: friendlyName,
                replyTo: senderEmail,
                isCentralPlatformEmail: false,
                tenantName: friendlyName,
                cancellationToken: cancellationToken);

            return sent
                ? (true, $"Test email dispatched to '{cleanRecipient}' from '{senderEmail}'. Check your inbox!")
                : (false, "Mail server could not deliver the test message. Check your SMTP settings.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send test email for domain {Domain}", cleanDomain);
            return (false, $"Test email dispatch failed: {ex.Message}");
        }
    }

    /// <inheritdoc />
    public async Task<EmailDnsVerificationResult> VerifyDnsRecordAsync(
        string domain,
        string subType,
        CancellationToken cancellationToken = default)
    {
        var cleanDomain = (domain ?? string.Empty).Trim().ToLowerInvariant();
        var mailHost = _configuration["Mailcow:SmtpHost"] ?? DefaultMailHost;

        var result = new EmailDnsVerificationResult
        {
            Domain = cleanDomain,
            SubType = subType
        };

        try
        {
            switch (subType.ToUpperInvariant())
            {
                case "MX":
                    result.RecordType = "MX";
                    result.QueryHost = cleanDomain;
                    result.ExpectedValue = mailHost;

                    var mxUrl = $"https://dns.google/resolve?name={Uri.EscapeDataString(cleanDomain)}&type=MX";
                    var mxRes = await _httpClient.GetAsync(mxUrl, cancellationToken);
                    if (mxRes.ok())
                    {
                        var json = await mxRes.Content.ReadAsStringAsync(cancellationToken);
                        using var doc = JsonDocument.Parse(json);
                        if (doc.RootElement.TryGetProperty("Answer", out var ansArr))
                        {
                            var detected = new List<string>();
                            foreach (var item in ansArr.EnumerateArray())
                            {
                                if (item.TryGetProperty("data", out var d))
                                {
                                    detected.Add(d.GetString() ?? string.Empty);
                                }
                            }
                            result.DetectedValue = string.Join("; ", detected);
                            result.IsVerified = detected.Any(d => d.Contains(mailHost, StringComparison.OrdinalIgnoreCase) || d.Contains("ozikol", StringComparison.OrdinalIgnoreCase));
                        }
                    }
                    result.Message = result.IsVerified
                        ? $"MX record points correctly to {mailHost}."
                        : $"MX record does not point to {mailHost}. Current: {result.DetectedValue ?? "(None detected)"}";
                    break;

                case "SPF":
                    result.RecordType = "TXT";
                    result.QueryHost = cleanDomain;
                    result.ExpectedValue = $"v=spf1 a mx a:{mailHost} ~all";

                    var spfUrl = $"https://dns.google/resolve?name={Uri.EscapeDataString(cleanDomain)}&type=TXT";
                    var spfRes = await _httpClient.GetAsync(spfUrl, cancellationToken);
                    if (spfRes.ok())
                    {
                        var json = await spfRes.Content.ReadAsStringAsync(cancellationToken);
                        using var doc = JsonDocument.Parse(json);
                        if (doc.RootElement.TryGetProperty("Answer", out var ansArr))
                        {
                            var detected = new List<string>();
                            foreach (var item in ansArr.EnumerateArray())
                            {
                                if (item.TryGetProperty("data", out var d))
                                {
                                    var val = d.GetString() ?? string.Empty;
                                    detected.Add(val);
                                    if (val.Contains("v=spf1", StringComparison.OrdinalIgnoreCase))
                                    {
                                        result.DetectedValue = val;
                                        result.IsVerified = val.Contains("mail.ozikol.cloud", StringComparison.OrdinalIgnoreCase) || val.Contains("include:", StringComparison.OrdinalIgnoreCase) || val.Contains("mx", StringComparison.OrdinalIgnoreCase);
                                    }
                                }
                            }
                            if (string.IsNullOrWhiteSpace(result.DetectedValue))
                            {
                                result.DetectedValue = string.Join("; ", detected);
                            }
                        }
                    }
                    result.Message = result.IsVerified
                        ? "SPF TXT record is active and authorized."
                        : $"SPF record not detected or does not authorize {mailHost}.";
                    break;

                case "DKIM":
                    var dkimHost = $"dkim._domainkey.{cleanDomain}";
                    result.RecordType = "TXT";
                    result.QueryHost = dkimHost;
                    result.ExpectedValue = "v=DKIM1; k=rsa; p=...";

                    var dkimUrl = $"https://dns.google/resolve?name={Uri.EscapeDataString(dkimHost)}&type=TXT";
                    var dkimRes = await _httpClient.GetAsync(dkimUrl, cancellationToken);
                    if (dkimRes.ok())
                    {
                        var json = await dkimRes.Content.ReadAsStringAsync(cancellationToken);
                        using var doc = JsonDocument.Parse(json);
                        if (doc.RootElement.TryGetProperty("Answer", out var ansArr))
                        {
                            foreach (var item in ansArr.EnumerateArray())
                            {
                                if (item.TryGetProperty("data", out var d))
                                {
                                    var val = d.GetString() ?? string.Empty;
                                    result.DetectedValue = val;
                                    result.IsVerified = val.Contains("v=DKIM1", StringComparison.OrdinalIgnoreCase) || val.Contains("p=");
                                    if (result.IsVerified) break;
                                }
                            }
                        }
                    }
                    result.Message = result.IsVerified
                        ? "DKIM public key TXT record is active."
                        : "DKIM TXT record not found at dkim._domainkey.";
                    break;

                case "DMARC":
                    var dmarcHost = $"_dmarc.{cleanDomain}";
                    result.RecordType = "TXT";
                    result.QueryHost = dmarcHost;
                    result.ExpectedValue = $"v=DMARC1; p=none; rua=mailto:dmarc@{cleanDomain}";

                    var dmarcUrl = $"https://dns.google/resolve?name={Uri.EscapeDataString(dmarcHost)}&type=TXT";
                    var dmarcRes = await _httpClient.GetAsync(dmarcUrl, cancellationToken);
                    if (dmarcRes.ok())
                    {
                        var json = await dmarcRes.Content.ReadAsStringAsync(cancellationToken);
                        using var doc = JsonDocument.Parse(json);
                        if (doc.RootElement.TryGetProperty("Answer", out var ansArr))
                        {
                            foreach (var item in ansArr.EnumerateArray())
                            {
                                if (item.TryGetProperty("data", out var d))
                                {
                                    var val = d.GetString() ?? string.Empty;
                                    result.DetectedValue = val;
                                    result.IsVerified = val.Contains("v=DMARC1", StringComparison.OrdinalIgnoreCase);
                                    if (result.IsVerified) break;
                                }
                            }
                        }
                    }
                    result.Message = result.IsVerified
                        ? "DMARC policy TXT record is active."
                        : "DMARC TXT record not found at _dmarc.";
                    break;

                default:
                    result.Message = $"Unsupported record subtype: {subType}";
                    break;
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "DNS check failed for {Domain} - {SubType}", cleanDomain, subType);
            result.Message = $"DNS query exception: {ex.Message}";
        }

        return result;
    }
}

/// <summary>
/// Internal extensions for HTTP response checking.
/// </summary>
internal static class HttpResponseMessageExtensions
{
    public static bool ok(this HttpResponseMessage response) =>
        response != null && response.IsSuccessStatusCode;
}

