using System;

namespace Ozikol_BCC.Infrastructure.Services.Email;

/// <summary>
/// Represents an active or configured mailbox for a tenant custom domain.
/// </summary>
public sealed class DomainMailboxDto
{
    /// <summary>
    /// Gets or sets the full email address (e.g. "support@nightpresssecurity.co.uk").
    /// </summary>
    public string EmailAddress { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the username / local part of the email address (e.g. "support").
    /// </summary>
    public string LocalPart { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the domain name for this mailbox.
    /// </summary>
    public string Domain { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the human-readable display name (e.g. "Nightpress Customer Support").
    /// </summary>
    public string DisplayName { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets a value indicating whether this is the platform automated system mailbox (e.g. "noreply").
    /// System mailboxes cannot be deleted by tenants.
    /// </summary>
    public bool IsSystemMailbox { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether the mailbox is enabled and accepting mail.
    /// </summary>
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Gets or sets the storage quota allocated to this mailbox in megabytes.
    /// </summary>
    public int QuotaMb { get; set; } = 2048;

    /// <summary>
    /// Gets or sets the UTC creation timestamp if recorded.
    /// </summary>
    public DateTime? CreatedUtc { get; set; }
}
