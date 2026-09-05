using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol.MasterDomain.Models;

/// <summary>
/// Dedicated entity for creator partner program applications to build and monetize UI templates.
/// Stored in the Master Catalog database.
/// </summary>
[Table("MasterCreatorApplications")]
public class MasterCreatorApplication
{
    /// <summary>
    /// Gets or sets the primary key identifier.
    /// </summary>
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// Gets or sets the unique tracking creator code (e.g. CR-8F3A1D).
    /// </summary>
    [Required]
    [MaxLength(30)]
    public string CreatorCode { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the applicant full legal name.
    /// </summary>
    [Required]
    [MaxLength(100)]
    public string FullName { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the studio, agency, or brand name.
    /// </summary>
    [MaxLength(120)]
    public string? StudioOrBrandName { get; set; }

    /// <summary>
    /// Gets or sets the business email address.
    /// </summary>
    [Required]
    [MaxLength(150)]
    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the contact phone number.
    /// </summary>
    [MaxLength(30)]
    public string? PhoneNumber { get; set; }

    /// <summary>
    /// Gets or sets the portfolio, GitHub, or Figma URL.
    /// </summary>
    [Required]
    [MaxLength(300)]
    public string PortfolioUrl { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the primary design specialization.
    /// </summary>
    [Required]
    [MaxLength(100)]
    public string Specialization { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the template proposal pitch.
    /// </summary>
    [Required]
    [MaxLength(2000)]
    public string ProposalPitch { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the application review status (UnderReview, Approved, Rejected).
    /// </summary>
    [Required]
    [MaxLength(30)]
    public string Status { get; set; } = "UnderReview";

    /// <summary>
    /// Gets or sets a value indicating whether the applicant agreed to the creator program terms.
    /// </summary>
    public bool TermsAgreed { get; set; }

    /// <summary>
    /// Gets or sets the record creation timestamp in UTC.
    /// </summary>
    public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Gets or sets internal review notes.
    /// </summary>
    [MaxLength(1000)]
    public string? ReviewNotes { get; set; }
}
