using System;
using System.Collections.Generic;

namespace Ozikol.MasterDomain.Models.Careers;

/// <summary>
/// Presentation model representing a career opportunity and job opening in the Master Domain.
/// </summary>
public class JobOpeningModel
{
    /// <summary>
    /// Gets or sets the primary key identifier.
    /// </summary>
    public Guid Id { get; set; }

    /// <summary>
    /// Gets or sets the URL permalink slug.
    /// </summary>
    public string Slug { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the position title.
    /// </summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the organizational department.
    /// </summary>
    public string Department { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the work location (e.g. Remote, London, Paris, Milan).
    /// </summary>
    public string Location { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the employment type (e.g. Full-time, Contract).
    /// </summary>
    public string EmploymentType { get; set; } = "Full-time";

    /// <summary>
    /// Gets or sets the experience level.
    /// </summary>
    public string ExperienceLevel { get; set; } = "Mid-Level";

    /// <summary>
    /// Gets or sets the required language proficiencies.
    /// </summary>
    public string LanguageRequirements { get; set; } = "English";

    /// <summary>
    /// Gets or sets the card overview summary.
    /// </summary>
    public string Summary { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the full rich HTML description.
    /// </summary>
    public string DescriptionHtml { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the list of core responsibilities.
    /// </summary>
    public List<string> Responsibilities { get; set; } = new();

    /// <summary>
    /// Gets or sets the list of required skills and qualifications.
    /// </summary>
    public List<string> Qualifications { get; set; } = new();

    /// <summary>
    /// Gets or sets the list of role benefits and perks.
    /// </summary>
    public List<string> Benefits { get; set; } = new();

    /// <summary>
    /// Gets or sets the creation timestamp in UTC.
    /// </summary>
    public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;
}
