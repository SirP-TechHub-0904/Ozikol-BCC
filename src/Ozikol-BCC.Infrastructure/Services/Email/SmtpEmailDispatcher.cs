using System;
using System.Net;
using System.Net.Mail;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Ozikol.MasterDomain.Security;

namespace Ozikol_BCC.Infrastructure.Services.Email;

/// <summary>
/// Implements transactional email delivery over Mailcow SMTP with STARTTLS on port 587,
/// encrypted password resolution via <see cref="OzikolDataCipher"/>, and responsive compliance footers.
/// </summary>
public sealed class SmtpEmailDispatcher : ISmtpEmailDispatcher
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<SmtpEmailDispatcher> _logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="SmtpEmailDispatcher"/> class.
    /// </summary>
    /// <param name="configuration">Application configuration provider.</param>
    /// <param name="logger">Structured logger instance.</param>
    public SmtpEmailDispatcher(
        IConfiguration configuration,
        ILogger<SmtpEmailDispatcher> logger)
    {
        _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
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
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(toEmail) || string.IsNullOrWhiteSpace(subject))
        {
            _logger.LogWarning("⚠️ [SmtpEmailDispatcher] Cannot dispatch email: recipient or subject is empty.");
            return false;
        }

        try
        {
            // Resolve SMTP connection parameters from configuration or environment
            var smtpHost = _configuration["EmailSettings:SmtpHost"]
                ?? _configuration["SMTP_HOST"]
                ?? Environment.GetEnvironmentVariable("EmailSettings__SmtpHost")
                ?? Environment.GetEnvironmentVariable("SMTP_HOST")
                ?? "mail.ozikol.cloud";

            var rawPort = _configuration["EmailSettings:SmtpPort"]
                ?? _configuration["SMTP_PORT"]
                ?? Environment.GetEnvironmentVariable("EmailSettings__SmtpPort")
                ?? Environment.GetEnvironmentVariable("SMTP_PORT")
                ?? "587";

            int.TryParse(rawPort, out var smtpPort);
            if (smtpPort <= 0)
            {
                smtpPort = 587;
            }

            var smtpUser = _configuration["EmailSettings:SmtpUser"]
                ?? _configuration["SMTP_USER"]
                ?? Environment.GetEnvironmentVariable("EmailSettings__SmtpUser")
                ?? Environment.GetEnvironmentVariable("SMTP_USER")
                ?? "noreply@ozikol.cloud";

            var rawPassword = _configuration["EmailSettings:SmtpPassword"]
                ?? _configuration["SMTP_PASSWORD"]
                ?? Environment.GetEnvironmentVariable("EmailSettings__SmtpPassword")
                ?? Environment.GetEnvironmentVariable("SMTP_PASSWORD")
                ?? string.Empty;

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

            using var mailMessage = new MailMessage
            {
                From = new MailAddress(resolvedFromEmail, resolvedFromName, Encoding.UTF8),
                Sender = new MailAddress(smtpUser, resolvedFromName, Encoding.UTF8),
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
                Timeout = 15000 // 15s timeout
            };

            if (!string.IsNullOrWhiteSpace(smtpUser) && !string.IsNullOrWhiteSpace(smtpPassword))
            {
                smtpClient.Credentials = new NetworkCredential(smtpUser.Trim(), smtpPassword.Trim());
            }

            _logger.LogInformation(
                "📧 [SmtpEmailDispatcher] Dispatching '{Subject}' from '{From}' to [{To}] via Mailcow ({Host}:{Port})...",
                subject, resolvedFromEmail, toEmail, smtpHost, smtpPort);

            await smtpClient.SendMailAsync(mailMessage, cancellationToken);

            _logger.LogInformation("✅ [SmtpEmailDispatcher] Successfully delivered '{Subject}' to [{To}].", subject, toEmail);
            return true;
        }
        catch (Exception ex)
        {
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
