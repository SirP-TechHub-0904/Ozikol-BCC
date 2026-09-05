using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol.MasterDomain.Models;

/// <summary>
/// Official career role and employment opening entity for the Ozikol global platform.
/// Stored in the Master Catalog database.
/// </summary>
[Table("MasterJobOpenings")]
public class MasterJobOpening
{
    /// <summary>
    /// Gets or sets the primary key identifier.
    /// </summary>
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// Gets or sets the unique URL permalink slug (e.g. regional-administrator-europe).
    /// </summary>
    [Required]
    [MaxLength(150)]
    public string Slug { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the official position title.
    /// </summary>
    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the functional organizational department.
    /// </summary>
    [Required]
    [MaxLength(100)]
    public string Department { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the work location or remote working arrangement.
    /// </summary>
    [Required]
    [MaxLength(150)]
    public string Location { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the employment type (e.g. Full-time, Contract).
    /// </summary>
    [Required]
    [MaxLength(50)]
    public string EmploymentType { get; set; } = "Full-time";

    /// <summary>
    /// Gets or sets the experience level (e.g. Mid-Level, Senior, Lead).
    /// </summary>
    [Required]
    [MaxLength(50)]
    public string ExperienceLevel { get; set; } = "Mid-Level";

    /// <summary>
    /// Gets or sets language proficiency requirements (e.g. English, French & English, Italian & English).
    /// </summary>
    [Required]
    [MaxLength(150)]
    public string LanguageRequirements { get; set; } = "English";

    /// <summary>
    /// Gets or sets a concise summary displayed on job directory cards.
    /// </summary>
    [MaxLength(1000)]
    public string Summary { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the comprehensive rich HTML job role description.
    /// </summary>
    [Column(TypeName = "nvarchar(max)")]
    public string DescriptionHtml { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the serialized JSON array of core responsibilities.
    /// </summary>
    [Column(TypeName = "nvarchar(max)")]
    public string ResponsibilitiesJson { get; set; } = "[]";

    /// <summary>
    /// Gets or sets the serialized JSON array of qualifications and prerequisites.
    /// </summary>
    [Column(TypeName = "nvarchar(max)")]
    public string QualificationsJson { get; set; } = "[]";

    /// <summary>
    /// Gets or sets the serialized JSON array of role benefits and compensation perks.
    /// </summary>
    [Column(TypeName = "nvarchar(max)")]
    public string BenefitsJson { get; set; } = "[]";

    /// <summary>
    /// Gets or sets a value indicating whether the job opening is actively accepting applications.
    /// </summary>
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Gets or sets the display sort order for directory presentation.
    /// </summary>
    public int SortOrder { get; set; } = 1;

    /// <summary>
    /// Gets or sets the record creation timestamp in UTC.
    /// </summary>
    public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Navigation property for all submitted candidate applications for this role.
    /// </summary>
    public ICollection<MasterJobApplication> Applications { get; set; } = new List<MasterJobApplication>();
}
