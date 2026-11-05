using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Ozikol.MasterDomain.Enums;

namespace Ozikol.MasterDomain.Models;

/// <summary>
/// Domain model for customizable central transactional email templates managed in MasterCatalogDbContext.
/// </summary>
[Table("MasterEmailTemplates")]
public class MasterEmailTemplate
{
    /// <summary>
    /// Unique identifier for the email template record.
    /// </summary>
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// The categorical template type enum (e.g., WelcomeEmailTemplate).
    /// </summary>
    [Required]
    public MasterEmailTemplateType TemplateType { get; set; }

    /// <summary>
    /// Human-readable descriptive name of the email template.
    /// </summary>
    [Required]
    [MaxLength(150)]
    public string Name { get; set; } = null!;

    /// <summary>
    /// Email subject line supporting template placeholders like {{businessname}}.
    /// </summary>
    [Required]
    [MaxLength(250)]
    public string Subject { get; set; } = null!;

    /// <summary>
    /// Rich HTML email body supporting template placeholders like {{businessname}}.
    /// </summary>
    [Required]
    public string BodyHtml { get; set; } = null!;

    /// <summary>
    /// Indicates whether this template is active for automated dispatches.
    /// </summary>
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Timestamp in UTC when this template was created.
    /// </summary>
    public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Timestamp in UTC when this template was last modified.
    /// </summary>
    public DateTime? UpdatedUtc { get; set; }
}

