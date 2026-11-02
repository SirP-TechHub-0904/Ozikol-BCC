using System.Text.Json.Serialization;

namespace Ozikol_BCC.EmailServices.Postmark.Models.Inbound;

/// <summary>
/// Represents full contact identity metadata (name, email address, and optional mailbox hash)
/// captured in a Postmark inbound email payload.
/// </summary>
public class PostmarkInboundContact
{
    /// <summary>
    /// Gets or sets the clean email address (e.g. "customer@example.com").
    /// </summary>
    [JsonPropertyName("Email")]
    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the display name associated with the contact (e.g. "Jane Doe").
    /// </summary>
    [JsonPropertyName("Name")]
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the mailbox hash tag if recipient address contained a '+' sub-addressing delimiter
    /// (e.g. "ticket-4082" for "support+ticket-4082@inbound.ozikol.cloud").
    /// </summary>
    [JsonPropertyName("MailboxHash")]
    public string? MailboxHash { get; set; }

    /// <summary>
    /// Returns a formatted representation of the contact name and email.
    /// </summary>
    public override string ToString()
    {
        return string.IsNullOrWhiteSpace(Name) ? Email : $"{Name} <{Email}>";
    }
}
