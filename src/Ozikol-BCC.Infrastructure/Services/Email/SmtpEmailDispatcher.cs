using System;
using System.Net;
using System.Net.Mail;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Ozikol.MasterDomain.Security;

namespace Ozikol_BCC.Infrastructure.Services.Email;

/// <summary>
/// Implements transactional email delivery over Mailcow SMTP with STARTTLS on port 587,
/// encrypted password resolution via <see cref="OzikolDataCipher"/>, and responsive compliance footers.
/// Automatically handles development environments gracefully with detailed console telemetry.
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
                ?? (centralCreds?.MailcowSmtpPort > 0 ? centralCreds.MailcowSmtpPort.ToString() : "587");

            int.TryParse(rawPort, out var smtpPort);
            if (smtpPort <= 0)
            {
                smtpPort = 587;
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
                ?? "Ozikol Business Command Center";

            var resolvedFromEmail = !string.IsNullOrWhiteSpace(fromEmail) ? fromEmail : defaultFromEmail;
            var resolvedFromName = !string.IsNullOrWhiteSpace(fromName) ? fromName : defaultFromName;

            // Append compliance & security footer
            var bodyWithFooter = AppendComplianceFooter(htmlBody, isCentralPlatformEmail, tenantName, tenantAdminEmail);

            // If valid SMTP credentials exist, attempt real STARTTLS transmission over port 587
            if (!string.IsNullOrWhiteSpace(smtpPassword))
            {
                // Set From and Sender to the resolved domain email address to ensure strict SPF/DKIM/DMARC domain alignment
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

            // In local development, if SMTP credentials are not yet provisioned and strict verification is off, simulate delivery
            if (isDev && !strictDeliveryCheck)
            {
                _logger.LogWarning(
                    "⚠️ [SmtpEmailDispatcher] [DEVELOPMENT] SMTP password is not configured for {Host}:{Port}. Simulating delivery of '{Subject}' to [{To}] from '{From}'.",
                    smtpHost, smtpPort, subject, toEmail, resolvedFromEmail);
                return true;
            }

            _logger.LogError("❌ [SmtpEmailDispatcher] Outbound delivery aborted: No SMTP credentials configured for {Host}:{Port}.", smtpHost, smtpPort);
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
            return false;
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
            var brandName = !string.IsNullOrWhiteSpace(tenantName) ? tenantName : "Your Workspace Organization";
            var contactEmail = !string.IsNullOrWhiteSpace(tenantAdminEmail) ? tenantAdminEmail : "your workspace administrator";

            sb.Append($@"
<div style=""margin-top: 36px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;"">
  <p style=""margin: 0 0 6px 0;"">
    You received this notification from <strong>{WebUtility.HtmlEncode(brandName)}</strong> via Ozikol Business Command Center.
  </p>
  <p style=""margin: 0;"">
    If you did not expect or request this notification, please contact your workspace team at 
    <a href=""mailto:{WebUtility.HtmlEncode(contactEmail)}"" style=""color: #0050E5; text-decoration: underline;"">{WebUtility.HtmlEncode(contactEmail)}</a> 
    or report unauthorized usage to <a href=""mailto:abuse@ozikol.cloud"" style=""color: #0050E5; text-decoration: underline;"">abuse@ozikol.cloud</a>.
  </p>
</div>");
        }

        return sb.ToString();
    }
}
