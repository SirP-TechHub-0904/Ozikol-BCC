using System.Threading;
using System.Threading.Tasks;

namespace Ozikol_BCC.Infrastructure.Services.Email;

/// <summary>
/// Service contract for dispatching transactional and operational emails via Mailcow SMTP
/// with automated security footers and multi-tenant white-label sender resolution.
/// </summary>
public interface ISmtpEmailDispatcher
{
    /// <summary>
    /// Dispatches an email message via SMTP.
    /// </summary>
    /// <param name="toEmail">The destination recipient address.</param>
    /// <param name="subject">The email subject line.</param>
    /// <param name="htmlBody">The HTML content of the email.</param>
    /// <param name="fromEmail">Optional custom from address (defaults to platform noreply@ozikol.cloud).</param>
    /// <param name="fromName">Optional custom display name (defaults to "Ozikol Business Command Center").</param>
    /// <param name="replyTo">Optional reply-to address.</param>
    /// <param name="isCentralPlatformEmail">True if this is an official Central security/billing email; false for tenant workspace alerts.</param>
    /// <param name="tenantName">Friendly name of the tenant workspace (used for white-label footers).</param>
    /// <param name="tenantAdminEmail">Tenant support or admin email to display in the footer.</param>
    /// <param name="cancellationToken">Cancellation token for async operations.</param>
    /// <returns>True if delivered to the SMTP server successfully; false otherwise.</returns>
    Task<bool> SendEmailAsync(
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
        bool strictDeliveryCheck = false);
}

