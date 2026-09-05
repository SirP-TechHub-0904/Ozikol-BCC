using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol.MasterDomain.Models;

/// <summary>
/// Candidate job application record storing applicant details, resume and passport attachments,
/// and review tracking in the Master Catalog database.
/// </summary>
[Table("MasterJobApplications")]
public class MasterJobApplication
{
    /// <summary>
    /// Gets or sets the primary key identifier.
    /// </summary>
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// Gets or sets the foreign key identifier of the applied job opening.
    /// </summary>
    [Required]
    [ForeignKey(nameof(JobOpening))]
    public Guid MasterJobOpeningId { get; set; }

    /// <summary>
    /// Navigation property to the target job opening.
    /// </summary>
    public MasterJobOpening JobOpening { get; set; } = null!;

    /// <summary>
    /// Gets or sets the unique public reference code for application tracking (e.g. APP-7A39B1).
    /// </summary>
    [Required]
    [MaxLength(30)]
    public string ApplicationReference { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the candidate full legal name.
    /// </summary>
    [Required]
    [MaxLength(150)]
    public string FullName { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the candidate email address.
    /// </summary>
    [Required]
    [MaxLength(150)]
    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the candidate phone number.
    /// </summary>
    [Required]
    [MaxLength(30)]
    public string PhoneNumber { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the candidate city of residence.
    /// </summary>
    [Required]
    [MaxLength(100)]
    public string City { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the candidate country of residence.
    /// </summary>
    [Required]
    [MaxLength(100)]
    public string Country { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the candidate LinkedIn profile or portfolio URL.
    /// </summary>
    [MaxLength(300)]
    public string? LinkedInOrPortfolioUrl { get; set; }

    /// <summary>
    /// Gets or sets the candidate cover letter or application introduction pitch.
    /// </summary>
    [Required]
    [Column(TypeName = "nvarchar(max)")]
    public string CoverLetter { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the original uploaded CV/resume filename.
    /// </summary>
    [Required]
    [MaxLength(255)]
    public string CvFileName { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the secure public URL for the stored CV/resume document.
    /// </summary>
    [Required]
    [MaxLength(1000)]
    public string CvUrl { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the file size of the CV document in bytes.
    /// </summary>
    public long CvFileSizeBytes { get; set; }

    /// <summary>
    /// Gets or sets the original uploaded passport or photo identification filename.
    /// </summary>
    [Required]
    [MaxLength(255)]
    public string PassportFileName { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the secure public URL for the stored passport or photo identification file.
    /// </summary>
    [Required]
    [MaxLength(1000)]
    public string PassportUrl { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the file size of the passport document in bytes.
    /// </summary>
    public long PassportFileSizeBytes { get; set; }

    /// <summary>
    /// Gets or sets the application review status (Submitted, UnderReview, InterviewScheduled, Rejected, Hired).
    /// </summary>
    [Required]
    [MaxLength(50)]
    public string Status { get; set; } = "Submitted";

    /// <summary>
    /// Gets or sets internal recruiter review notes.
    /// </summary>
    [MaxLength(2000)]
    public string? ReviewNotes { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether the applicant agreed to the recruitment privacy policy and terms.
    /// </summary>
    public bool TermsAgreed { get; set; }

    /// <summary>
    /// Gets or sets the client IP address from which the application was submitted.
    /// </summary>
    [MaxLength(50)]
    public string? ClientIp { get; set; }

    /// <summary>
    /// Gets or sets the submission timestamp in UTC.
    /// </summary>
    public DateTime SubmittedUtc { get; set; } = DateTime.UtcNow;
}
