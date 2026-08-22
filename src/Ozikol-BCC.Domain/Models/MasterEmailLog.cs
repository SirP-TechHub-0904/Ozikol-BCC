namespace Ozikol_BCC.Domain.Models;

/// <summary>
/// Audit and delivery log for all transactional emails sent by the central system.
/// </summary>
public class MasterEmailLog
{
    public long Id { get; set; }
    public string RecipientEmail { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string BodyHtml { get; set; } = string.Empty;
    public string Provider { get; set; } = "Postmark";
    public string Status { get; set; } = "Sent"; // Sent, Failed, Queued
    public DateTime SentAtUtc { get; set; } = DateTime.UtcNow;
    public string? ErrorMessage { get; set; }
    public string? MetadataJson { get; set; }
}
