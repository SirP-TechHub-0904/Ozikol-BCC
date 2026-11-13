using System.Threading;
using System.Threading.Tasks;

namespace Ozikol_BCC.Infrastructure.Services.Email;

/// <summary>
/// Service contract for automated domain registration, mailbox provisioning, and DKIM retrieval via Mailcow REST API.
/// </summary>
public interface IMailcowProvisioningService
{
    /// <summary>
    /// Registers a domain in Mailcow and automatically generates a 2048-bit DKIM keypair.
    /// </summary>
    /// <param name="domain">The target domain name (e.g. "ozikol.cloud" or "tenant.com").</param>
    /// <param name="description">Friendly description for the domain record.</param>
    /// <param name="cancellationToken">Cancellation token for async operations.</param>
    /// <returns>True if the domain was created or already exists; false otherwise.</returns>
    Task<bool> EnsureDomainExistsAsync(string domain, string description = "Ozikol Workspace Domain", CancellationToken cancellationToken = default);

    /// <summary>
    /// Creates or updates an active mailbox on Mailcow.
    /// </summary>
    /// <param name="domain">The domain name.</param>
    /// <param name="localPart">The local mailbox part (e.g. "noreply" or "support").</param>
    /// <param name="password">The plaintext password for the mailbox (hashed automatically by Mailcow/Dovecot).</param>
    /// <param name="displayName">Human-readable display name for the mailbox.</param>
    /// <param name="quotaMb">Mailbox storage quota in megabytes.</param>
    /// <param name="cancellationToken">Cancellation token for async operations.</param>
    /// <returns>True if created or updated; false otherwise.</returns>
    Task<bool> EnsureMailboxExistsAsync(string domain, string localPart, string password, string displayName, int quotaMb = 2048, CancellationToken cancellationToken = default);

    /// <summary>
    /// Retrieves the generated DKIM TXT record string for a domain from Mailcow.
    /// </summary>
    /// <param name="domain">The target domain name.</param>
    /// <param name="cancellationToken">Cancellation token for async operations.</param>
    /// <returns>The DKIM TXT record content, or null if not available.</returns>
    Task<string?> GetDkimRecordAsync(string domain, CancellationToken cancellationToken = default);

    /// <summary>
    /// Retrieves all registered mailboxes under the specified domain from Mailcow.
    /// </summary>
    /// <param name="domain">The target domain name.</param>
    /// <param name="cancellationToken">Cancellation token for async operations.</param>
    /// <returns>List of active mailboxes on this domain.</returns>
    Task<System.Collections.Generic.List<DomainMailboxDto>> GetDomainMailboxesAsync(string domain, CancellationToken cancellationToken = default);

    /// <summary>
    /// Deletes a mailbox from Mailcow permanently.
    /// </summary>
    /// <param name="domain">The domain name.</param>
    /// <param name="localPart">The local mailbox part (e.g. "support").</param>
    /// <param name="cancellationToken">Cancellation token for async operations.</param>
    /// <returns>True if deletion succeeded; false otherwise.</returns>
    Task<bool> DeleteMailboxAsync(string domain, string localPart, CancellationToken cancellationToken = default);
}

