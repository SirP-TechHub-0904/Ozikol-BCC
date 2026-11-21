using System;
using System.IO;
using System.Net;
using System.Net.Mail;
using System.Net.Security;
using System.Net.Sockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Ozikol.MasterDomain.Security;

namespace Ozikol_BCC.Infrastructure.Services.Email;

/// <summary>
/// Implements transactional email delivery over Mailcow SMTP with dual-channel support:
/// SMTPS direct SSL on port 465 (RFC 8314) and STARTTLS on port 587 (RFC 5321),
/// encrypted password resolution via <see cref="OzikolDataCipher"/>, and responsive compliance footers.
/// Automatically handles development environments gracefully and auto-recovers from port 587 network blocks.
/// </summary>
public sealed class SmtpEmailDispatcher : ISmtpEmailDispatcher
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<SmtpEmailDispatcher> _logger;
    private readonly IHostEnvironment? _environment;
    private readonly IMailInfrastructureCredentialProvider? _credentialProvider;

    /// <summary>
    /// Initializes a new instance of the <see cref="SmtpEmailDispatcher"/> class.
    /// </summary>
    /// <param name="configuration">Application configuration provider.</param>
    /// <param name="logger">Structured logger instance.</param>
    /// <param name="environment">Optional host environment provider for local developer bypass.</param>
    /// <param name="credentialProvider">Optional credential provider resolving credentials from Central Master DB.</param>
    public SmtpEmailDispatcher(
        IConfiguration configuration,
        ILogger<SmtpEmailDispatcher> logger,
        IHostEnvironment? environment = null,
        IMailInfrastructureCredentialProvider? credentialProvider = null)
    {
        _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _environment = environment;
        _credentialProvider = credentialProvider;
    }

    /// <inheritdoc />
    public async Task<bool> SendEmailAsync(
        string toEmail,
        string subject,
        string htmlBody,
        string? fromEmail = null,
        string? fromName = null,
        string? replyTo = null,
        bool isCentralPlatformEmail = false,
        string? tenantName = null,
        string? tenantAdminEmail = null,
        CancellationToken cancellationToken = default,
        string? smtpUsernameOverride = null,
        string? smtpPasswordOverride = null,
        bool strictDeliveryCheck = false)
    {
        if (string.IsNullOrWhiteSpace(toEmail) || string.IsNullOrWhiteSpace(subject))
        {
            _logger.LogWarning("⚠️ [SmtpEmailDispatcher] Cannot dispatch email: recipient or subject is empty.");
            return false;
        }

        var isDev = _environment?.IsDevelopment() == true ||
                    string.Equals(Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT"), "Development", StringComparison.OrdinalIgnoreCase);

        try
        {
            // Resolve credentials dynamically from Central Master DB (or fall back to configuration / .env)
            var centralCreds = _credentialProvider?.GetCredentials();

            var smtpHost = !string.IsNullOrWhiteSpace(centralCreds?.MailcowSmtpHost)
                ? centralCreds.MailcowSmtpHost.Trim()
                : (_configuration["EmailSettings:SmtpHost"]
                    ?? _configuration["SMTP_HOST"]
                    ?? Environment.GetEnvironmentVariable("EmailSettings__SmtpHost")
                    ?? Environment.GetEnvironmentVariable("SMTP_HOST")
                    ?? "mail.ozikol.cloud");

            var rawPort = _configuration["EmailSettings:SmtpPort"]
                ?? _configuration["SMTP_PORT"]
                ?? Environment.GetEnvironmentVariable("EmailSettings__SmtpPort")
                ?? Environment.GetEnvironmentVariable("SMTP_PORT")
                ?? (centralCreds?.MailcowSmtpPort > 0 ? centralCreds.MailcowSmtpPort.ToString() : "465");

            int.TryParse(rawPort, out var smtpPort);
            if (smtpPort <= 0)
            {
                smtpPort = 465;
            }

            var smtpUser = !string.IsNullOrWhiteSpace(smtpUsernameOverride)
                ? smtpUsernameOverride.Trim()
                : (!string.IsNullOrWhiteSpace(centralCreds?.MailcowSmtpUser)
                    ? centralCreds.MailcowSmtpUser.Trim()
                    : (_configuration["EmailSettings:SmtpUser"]
                        ?? _configuration["SMTP_USER"]
                        ?? Environment.GetEnvironmentVariable("EmailSettings__SmtpUser")
                        ?? Environment.GetEnvironmentVariable("SMTP_USER")
                        ?? "noreply@ozikol.cloud"));

            var rawPassword = !string.IsNullOrWhiteSpace(smtpPasswordOverride)
                ? smtpPasswordOverride.Trim()
                : (!string.IsNullOrWhiteSpace(centralCreds?.MailcowSmtpPassword)
                    ? centralCreds.MailcowSmtpPassword.Trim()
                    : (_configuration["EmailSettings:SmtpPassword"]
                        ?? _configuration["SMTP_PASSWORD"]
                        ?? Environment.GetEnvironmentVariable("EmailSettings__SmtpPassword")
                        ?? Environment.GetEnvironmentVariable("SMTP_PASSWORD")
                        ?? string.Empty));

            // Decrypt password at rest using OzikolDataCipher (AES-256-GCM) if stored encrypted
            var smtpPassword = OzikolDataCipher.DecryptIfNeeded(rawPassword) ?? rawPassword;

            var defaultFromEmail = _configuration["EmailSettings:FromEmail"]
                ?? Environment.GetEnvironmentVariable("EmailSettings__FromEmail")
                ?? "noreply@ozikol.cloud";

            var defaultFromName = _configuration["EmailSettings:FromName"]
                ?? Environment.GetEnvironmentVariable("EmailSettings__FromName")
                ?? (isCentralPlatformEmail ? "Central Platform" : (tenantName ?? "Support Team"));

            var resolvedFromEmail = !string.IsNullOrWhiteSpace(fromEmail) ? fromEmail : defaultFromEmail;
            var resolvedFromName = !string.IsNullOrWhiteSpace(fromName) ? fromName : (!string.IsNullOrWhiteSpace(tenantName) ? tenantName : defaultFromName);

            // Append compliance & security footer
            var bodyWithFooter = AppendComplianceFooter(htmlBody, isCentralPlatformEmail, tenantName, tenantAdminEmail);

            // If valid SMTP credentials exist, attempt real transmission over port 465 (SMTPS) or port 587 (STARTTLS)
            if (!string.IsNullOrWhiteSpace(smtpPassword))
            {
                // Priority 1: Port 465 Direct SSL (SMTPS, RFC 8314) - resilient to residential ISP port blocks
                if (smtpPort == 465)
                {
                    _logger.LogInformation(
                        "📧 [SmtpEmailDispatcher] Dispatching '{Subject}' from '{From}' to [{To}] via Mailcow SMTPS Direct SSL ({Host}:465)...",
                        subject, resolvedFromEmail, toEmail, smtpHost);

                    try
                    {
                        var delivered = await SendSmtpDirectSslAsync(
                            smtpHost,
                            465,
                            smtpUser.Trim(),
                            smtpPassword.Trim(),
                            resolvedFromEmail,
                            resolvedFromName,
                            toEmail,
                            subject,
                            bodyWithFooter,
                            replyTo,
                            cancellationToken);

                        if (delivered)
                        {
                            _logger.LogInformation("✅ [SmtpEmailDispatcher] Successfully delivered '{Subject}' to [{To}] over SMTPS (port 465).", subject, toEmail);
                            return true;
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "❌ [SmtpEmailDispatcher] Port 465 SMTPS transmission failed: {Msg}", ex.Message);
                        if (strictDeliveryCheck) throw;
                        return false;
                    }
                }

                // Priority 2: Port 587 STARTTLS (RFC 5321) with automatic, seamless fallback to Port 465 on network/timeout errors
                using var mailMessage = new MailMessage
                {
                    From = new MailAddress(resolvedFromEmail, resolvedFromName, Encoding.UTF8),
                    Sender = new MailAddress(resolvedFromEmail, resolvedFromName, Encoding.UTF8),
                    Subject = subject,
                    Body = bodyWithFooter,
                    IsBodyHtml = true,
                    BodyEncoding = Encoding.UTF8,
                    SubjectEncoding = Encoding.UTF8
                };

                mailMessage.To.Add(toEmail.Trim());

                if (!string.IsNullOrWhiteSpace(replyTo))
                {
                    mailMessage.ReplyToList.Add(new MailAddress(replyTo.Trim()));
                }

                try
                {
                    using var smtpClient = new SmtpClient(smtpHost, smtpPort)
                    {
                        EnableSsl = true, // Engages STARTTLS on port 587
                        DeliveryMethod = SmtpDeliveryMethod.Network,
                        UseDefaultCredentials = false,
                        Timeout = 8000 // 8s timeout to avoid blocking requests
                    };

                    smtpClient.Credentials = new NetworkCredential(smtpUser.Trim(), smtpPassword.Trim());

                    _logger.LogInformation(
                        "📧 [SmtpEmailDispatcher] Dispatching '{Subject}' from '{From}' to [{To}] via Mailcow ({Host}:{Port})...",
                        subject, resolvedFromEmail, toEmail, smtpHost, smtpPort);

                    await smtpClient.SendMailAsync(mailMessage, cancellationToken);

                    _logger.LogInformation("✅ [SmtpEmailDispatcher] Successfully delivered '{Subject}' to [{To}].", subject, toEmail);
                    return true;
                }
                catch (Exception ex) when (smtpPort != 465 && (ex is SocketException || ex is TimeoutException || ex.InnerException is SocketException))
                {
                    _logger.LogWarning(
                        ex,
                        "⚠️ [SmtpEmailDispatcher] STARTTLS on port {Port} timed out or failed connection ({Message}). Seamlessly falling back to SMTPS Direct SSL on port 465...",
                        smtpPort, ex.Message);

                    var delivered = await SendSmtpDirectSslAsync(
                        smtpHost,
                        465,
                        smtpUser.Trim(),
                        smtpPassword.Trim(),
                        resolvedFromEmail,
                        resolvedFromName,
                        toEmail,
                        subject,
                        bodyWithFooter,
                        replyTo,
                        cancellationToken);

                    if (delivered)
                    {
                        _logger.LogInformation("✅ [SmtpEmailDispatcher] Successfully delivered '{Subject}' to [{To}] via Port 465 fallback.", subject, toEmail);
                        return true;
                    }
                }
            }

            // In local development, if SMTP credentials are not yet provisioned and strict verification is off, simulate delivery
            if (isDev && !strictDeliveryCheck)
            {
                _logger.LogWarning(
                    "⚠️ [SmtpEmailDispatcher] [DEVELOPMENT] SMTP password is not configured for {Host}:{Port}. Simulating delivery of '{Subject}' to [{To}] from '{From}'.",
                    smtpHost, smtpPort, subject, toEmail, resolvedFromEmail);
                return true;
            }

            _logger.LogError("❌ [SmtpEmailDispatcher] Outbound delivery aborted: No SMTP credentials configured for {Host}:{Port}.", smtpHost, smtpPort);
            if (strictDeliveryCheck)
            {
                throw new InvalidOperationException($"Outbound delivery aborted: No SMTP credentials configured for {smtpHost}:{smtpPort} in MasterPlatformSettings or environment.");
            }
            return false;
        }
        catch (Exception ex)
        {
            if (isDev && !strictDeliveryCheck && string.IsNullOrWhiteSpace(smtpPasswordOverride))
            {
                _logger.LogWarning(
                    ex,
                    "⚠️ [SmtpEmailDispatcher] [DEVELOPMENT] Live SMTP delivery encountered exception ({Message}). Simulating successful delivery for local development.",
                    ex.Message);
                return true;
            }

            _logger.LogError(ex, "❌ [SmtpEmailDispatcher] Failed delivering '{Subject}' to [{To}].", subject, toEmail);
            if (strictDeliveryCheck) throw;
            return false;
        }
    }

    /// <summary>
    /// Direct SMTPS (Implicit TLS on port 465) transmission using <see cref="TcpClient"/> and <see cref="SslStream"/>.
    /// Implements RFC 8314 implicit TLS with AUTH LOGIN and base64-encoded UTF-8 body.
    /// Resilient to firewall and ISP port 587 blockages.
    /// </summary>
    private static async Task<bool> SendSmtpDirectSslAsync(
        string host,
        int port,
        string username,
        string password,
        string fromEmail,
        string fromName,
        string toEmail,
        string subject,
        string htmlBody,
        string? replyTo,
        CancellationToken ct)
    {
        using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        timeoutCts.CancelAfter(TimeSpan.FromSeconds(20)); // 20s overall transmission timeout
        var token = timeoutCts.Token;

        using var client = new TcpClient();
        await client.ConnectAsync(host, port, token);

        using var sslStream = new SslStream(client.GetStream(), false);
        await sslStream.AuthenticateAsClientAsync(new SslClientAuthenticationOptions
        {
            TargetHost = host
        }, token);

        using var reader = new StreamReader(sslStream, Encoding.UTF8);
        using var writer = new StreamWriter(sslStream, new UTF8Encoding(false)) { AutoFlush = true, NewLine = "\r\n" };

        // 1. Read 220 banner
        var banner = await ReadSmtpResponseAsync(reader, token);
        if (!banner.StartsWith("220", StringComparison.Ordinal))
        {
            throw new InvalidOperationException($"SMTP banner rejected by {host}:{port} -> {banner}");
        }

        // 2. Send EHLO
        await writer.WriteLineAsync("EHLO ozikol.cloud".AsMemory(), token);
        var ehloResp = await ReadSmtpResponseAsync(reader, token);
        if (!ehloResp.StartsWith("250", StringComparison.Ordinal))
        {
            throw new InvalidOperationException($"SMTP EHLO rejected by {host}:{port} -> {ehloResp}");
        }

        // 3. AUTH LOGIN
        await writer.WriteLineAsync("AUTH LOGIN".AsMemory(), token);
        var authResp = await ReadSmtpResponseAsync(reader, token);
        if (!authResp.StartsWith("334", StringComparison.Ordinal))
        {
            throw new InvalidOperationException($"SMTP AUTH LOGIN initiation rejected -> {authResp}");
        }

        // 4. Send base64 username
        var userB64 = Convert.ToBase64String(Encoding.UTF8.GetBytes(username));
        await writer.WriteLineAsync(userB64.AsMemory(), token);
        var userResp = await ReadSmtpResponseAsync(reader, token);
        if (!userResp.StartsWith("334", StringComparison.Ordinal))
        {
            throw new InvalidOperationException($"SMTP username rejected -> {userResp}");
        }

        // 5. Send base64 password
        var passB64 = Convert.ToBase64String(Encoding.UTF8.GetBytes(password));
        await writer.WriteLineAsync(passB64.AsMemory(), token);
        var passResp = await ReadSmtpResponseAsync(reader, token);
        if (!passResp.StartsWith("235", StringComparison.Ordinal))
        {
            throw new InvalidOperationException($"SMTP authentication failed for user '{username}' -> {passResp}");
        }

        // 6. MAIL FROM
        await writer.WriteLineAsync($"MAIL FROM:<{fromEmail}>".AsMemory(), token);
        var fromResp = await ReadSmtpResponseAsync(reader, token);
        if (!fromResp.StartsWith("250", StringComparison.Ordinal))
        {
            throw new InvalidOperationException($"SMTP MAIL FROM rejected for <{fromEmail}> -> {fromResp}");
        }

        // 7. RCPT TO
        await writer.WriteLineAsync($"RCPT TO:<{toEmail}>".AsMemory(), token);
        var rcptResp = await ReadSmtpResponseAsync(reader, token);
        if (!rcptResp.StartsWith("250", StringComparison.Ordinal))
        {
            throw new InvalidOperationException($"SMTP RCPT TO rejected for <{toEmail}> -> {rcptResp}");
        }

        // 8. DATA
        await writer.WriteLineAsync("DATA".AsMemory(), token);
        var dataResp = await ReadSmtpResponseAsync(reader, token);
        if (!dataResp.StartsWith("354", StringComparison.Ordinal))
        {
            throw new InvalidOperationException($"SMTP DATA initiation rejected -> {dataResp}");
        }

        // 9. Write MIME email headers & base64 body (RFC 2045 & RFC 5322)
        var messageId = $"<{Guid.NewGuid():N}@{host}>";
        var dateHeader = DateTime.UtcNow.ToString("r");
        var encodedSubject = $"=?UTF-8?B?{Convert.ToBase64String(Encoding.UTF8.GetBytes(subject))}?=";
        var encodedFromName = $"=?UTF-8?B?{Convert.ToBase64String(Encoding.UTF8.GetBytes(fromName))}?=";

        await writer.WriteLineAsync($"From: {encodedFromName} <{fromEmail}>".AsMemory(), token);
        await writer.WriteLineAsync($"To: <{toEmail}>".AsMemory(), token);
        await writer.WriteLineAsync($"Subject: {encodedSubject}".AsMemory(), token);
        await writer.WriteLineAsync($"Date: {dateHeader}".AsMemory(), token);
        await writer.WriteLineAsync($"Message-ID: {messageId}".AsMemory(), token);
        await writer.WriteLineAsync("MIME-Version: 1.0".AsMemory(), token);
        await writer.WriteLineAsync("Content-Type: text/html; charset=UTF-8".AsMemory(), token);
        await writer.WriteLineAsync("Content-Transfer-Encoding: base64".AsMemory(), token);
        if (!string.IsNullOrWhiteSpace(replyTo))
        {
            await writer.WriteLineAsync($"Reply-To: <{replyTo}>".AsMemory(), token);
        }
        await writer.WriteLineAsync(string.Empty.AsMemory(), token); // Blank line separates MIME header from body

        // Write Base64 body chunks of 76 characters per RFC 2045
        var bodyB64 = Convert.ToBase64String(Encoding.UTF8.GetBytes(htmlBody ?? string.Empty));
        for (int i = 0; i < bodyB64.Length; i += 76)
        {
            var chunk = bodyB64.Substring(i, Math.Min(76, bodyB64.Length - i));
            await writer.WriteLineAsync(chunk.AsMemory(), token);
        }

        // 10. End of DATA indicator
        await writer.WriteLineAsync(".".AsMemory(), token);
        var endResp = await ReadSmtpResponseAsync(reader, token);
        if (!endResp.StartsWith("250", StringComparison.Ordinal))
        {
            throw new InvalidOperationException($"SMTP body rejected by {host} -> {endResp}");
        }

        // 11. QUIT
        try
        {
            await writer.WriteLineAsync("QUIT".AsMemory(), token);
        }
        catch
        {
            // Best effort connection termination
        }

        return true;
    }

    /// <summary>
    /// Reads single-line or multi-line responses from an active SMTP stream according to RFC 5321.
    /// </summary>
    private static async Task<string> ReadSmtpResponseAsync(StreamReader reader, CancellationToken ct)
    {
        var lastLine = string.Empty;
        while (true)
        {
            var line = await reader.ReadLineAsync(ct);
            if (line == null)
            {
                return lastLine;
            }

            lastLine = line;

            // RFC 5321: A reply code is 3 digits followed by a space ' ' for the final line,
            // or a hyphen '-' for intermediate multiline continuations (e.g. 250-PIPELINING)
            if (line.Length >= 4 && line[3] == ' ')
            {
                return line;
            }
            if (line.Length == 3)
            {
                return line;
            }
        }
    }

    private static string AppendComplianceFooter(string htmlBody, bool isCentral, string? tenantName, string? tenantAdminEmail)
    {
        var sb = new StringBuilder(htmlBody ?? string.Empty);

        if (isCentral)
        {
            sb.Append(@"
<div style=""margin-top: 36px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;"">
  <p style=""margin: 0 0 6px 0;"">
    🛡️ <strong>Security Notice:</strong> You received this email regarding your Ozikol Business Command Center account.
  </p>
  <p style=""margin: 0;"">
    If you did not request this email or believe this was sent in error, please report this immediately to our security response team at 
    <a href=""mailto:security@ozikol.cloud"" style=""color: #0050E5; text-decoration: underline;"">security@ozikol.cloud</a>.
  </p>
</div>");
        }
        else
        {
            var brandName = !string.IsNullOrWhiteSpace(tenantName) ? tenantName : "Your Organization";
            var contactInfo = !string.IsNullOrWhiteSpace(tenantAdminEmail)
                ? $@" at <a href=""mailto:{WebUtility.HtmlEncode(tenantAdminEmail)}"" style=""color: #0050E5; text-decoration: underline;"">{WebUtility.HtmlEncode(tenantAdminEmail)}</a>"
                : string.Empty;

            sb.Append($@"
<div style=""margin-top: 36px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;"">
  <p style=""margin: 0 0 6px 0;"">
    You received this notification from <strong>{WebUtility.HtmlEncode(brandName)}</strong>.
  </p>
  <p style=""margin: 0;"">
    If you did not expect or request this notification, please contact your organization team{contactInfo}.
  </p>
</div>");
        }

        return sb.ToString();
    }
}
