using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol.MasterDomain.Models;

/// <summary>
/// Domain model for central transactional email audit logging in MasterCatalogDbContext.
/// </summary>
[Table("MasterEmailLogs")]
public class MasterEmailLog
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(256)]
    public string RecipientEmail { get; set; } = null!;

    [Required]
    [MaxLength(250)]
    public string Subject { get; set; } = null!;

    public string BodyHtml { get; set; } = null!;

    [MaxLength(50)]
    public string? Provider { get; set; }

    [MaxLength(50)]
    public string Status { get; set; } = "NotSent"; // NotSent, Sent, Failed

    public string? ErrorMessage { get; set; }

    public DateTime SentAtUtc { get; set; } = DateTime.UtcNow;
}
