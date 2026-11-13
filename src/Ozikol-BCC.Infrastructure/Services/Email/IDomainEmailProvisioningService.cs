using System.Threading;
using System.Threading.Tasks;

namespace Ozikol_BCC.Infrastructure.Services.Email;

/// <summary>
/// Service contract for managing domain email configuration, automated mailbox provisioning,
/// quota enforcement (1 free custom mailbox), email DNS verification, and test email delivery.
/// </summary>
public interface IDomainEmailProvisioningService
{
    /// <summary>
    /// Ensures the custom domain is registered in Mailcow, the automated "noreply" system mailbox exists,
    /// retrieves the DKIM public key, and loads current mailbox status and DNS records.
    /// </summary>
    /// <param name="domain">The custom domain name (e.g. "nightpresssecurity.co.uk").</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Comprehensive configuration and DNS report.</returns>
    Task<DomainEmailConfigDto> GetDomainEmailConfigAsync(string domain, CancellationToken cancellationToken = default);

    /// <summary>
    /// Provisions one free custom mailbox (e.g. "support@domain.com" or "info@domain.com") for the tenant workspace.
    /// Strictly enforces a maximum of 1 free custom mailbox per domain.
    /// </summary>
    /// <param name="tenantKey">The tenant workspace identifier.</param>
    /// <param name="domain">The custom domain name.</param>
    /// <param name="localPart">The desired username prefix (e.g. "support", "info").</param>
    /// <param name="password">The mailbox password.</param>
    /// <param name="displayName">Display name for the mailbox.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Creation result with details or error message.</returns>
    Task<(bool Success, string Message, DomainMailboxDto? Mailbox)> CreateCustomMailboxAsync(
        string tenantKey,
        string domain,
        string localPart,
        string password,
        string displayName,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Deletes a custom mailbox for a tenant domain so they can create a different free mailbox.
    /// System mailboxes ("noreply") cannot be deleted.
    /// </summary>
    /// <param name="domain">The custom domain name.</param>
    /// <param name="localPart">The mailbox username prefix to delete.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>True if deleted; false otherwise.</returns>
    Task<(bool Success, string Message)> DeleteCustomMailboxAsync(
        string domain,
        string localPart,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Dispatches an end-to-end test email from "noreply@{domain}" to verify deliverability,
    /// DKIM signature, and SPF compliance.
    /// </summary>
    /// <param name="domain">The custom domain name.</param>
    /// <param name="recipientEmail">Destination email address.</param>
    /// <param name="tenantName">Friendly workspace name.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Delivery result.</returns>
    Task<(bool Success, string Message)> SendTestEmailAsync(
        string domain,
        string recipientEmail,
        string? tenantName = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Probes public DNS to verify whether a specific email DNS record (MX, SPF, DKIM, or DMARC) is active.
    /// </summary>
    /// <param name="domain">The custom domain name.</param>
    /// <param name="subType">The record subtype ("MX", "SPF", "DKIM", "DMARC").</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Diagnostic verification result.</returns>
    Task<EmailDnsVerificationResult> VerifyDnsRecordAsync(
        string domain,
        string subType,
        CancellationToken cancellationToken = default);
}
