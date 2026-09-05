using System;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;

namespace Ozikol.Central.Models.Careers;

/// <summary>
/// Form binding model for candidate job applications with CV and passport attachments.
/// </summary>
public class JobApplicationInput
{
    /// <summary>
    /// Gets or sets the target job opening identifier.
    /// </summary>
    [Required]
    public Guid JobOpeningId { get; set; }

    /// <summary>
    /// Gets or sets the applicant full legal name.
    /// </summary>
    [Required(ErrorMessage = "Full legal name is required.")]
    [MaxLength(150)]
    public string FullName { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the applicant email address.
    /// </summary>
    [Required(ErrorMessage = "Email address is required.")]
    [EmailAddress(ErrorMessage = "Please enter a valid email address.")]
    [MaxLength(150)]
    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the applicant phone number.
    /// </summary>
    [Required(ErrorMessage = "Contact phone number is required.")]
    [MaxLength(30)]
    public string PhoneNumber { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the applicant city of residence.
    /// </summary>
    [Required(ErrorMessage = "City is required.")]
    [MaxLength(100)]
    public string City { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the applicant country of residence.
    /// </summary>
    [Required(ErrorMessage = "Country is required.")]
    [MaxLength(100)]
    public string Country { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the optional LinkedIn profile or online portfolio URL.
    /// </summary>
    [MaxLength(300)]
    public string? LinkedInOrPortfolioUrl { get; set; }

    /// <summary>
    /// Gets or sets the applicant cover letter or introductory pitch.
    /// </summary>
    [Required(ErrorMessage = "Please introduce yourself and your background.")]
    [MaxLength(3000)]
    public string CoverLetter { get; set; } = string.Empty;

    /// <summary>
    /// Gets or sets the uploaded CV / Resume document (.pdf, .docx, .doc).
    /// </summary>
    [Required(ErrorMessage = "Please attach your CV or Resume document.")]
    public IFormFile? CvFile { get; set; }

    /// <summary>
    /// Gets or sets the uploaded Passport or Government Photo Identification document (.pdf, .jpg, .png).
    /// </summary>
    [Required(ErrorMessage = "Please attach a clear photo of your passport or government ID.")]
    public IFormFile? PassportFile { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether the applicant agreed to the recruitment privacy policy and terms.
    /// </summary>
    public bool AgreeTerms { get; set; }
}
