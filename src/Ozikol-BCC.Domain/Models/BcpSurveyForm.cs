using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Represents a standalone survey or dynamic data-collection form managed under the
    /// independent <c>bcp-form-builder</c> modular feature (completely separate from Website CMS <see cref="PageForm"/>).
    /// </summary>
    [Table("BcpSurveyForms")]
    public class BcpSurveyForm
    {
        /// <summary>
        /// Primary key.
        /// </summary>
        [Key]
        public Guid Id { get; set; } = Guid.CreateVersion7();

        /// <summary>
        /// Display title of the survey or standalone form.
        /// </summary>
        [Required]
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        /// <summary>
        /// Unique URL slug used for shareable public survey links (<c>/survey/{slug}</c>).
        /// </summary>
        [Required]
        [MaxLength(120)]
        public string Slug { get; set; } = string.Empty;

        /// <summary>
        /// Optional instructions or context shown to respondents.
        /// </summary>
        [MaxLength(1000)]
        public string? Description { get; set; }

        /// <summary>
        /// Whether the survey is published and accepting responses.
        /// </summary>
        public bool IsPublished { get; set; } = true;

        /// <summary>
        /// Whether unauthenticated respondents can submit responses via the shareable link.
        /// </summary>
        public bool AllowAnonymous { get; set; } = true;

        /// <summary>
        /// When true, displays a dedicated branded success screen after submission.
        /// </summary>
        public bool ShowSuccessPage { get; set; } = true;

        /// <summary>
        /// Headline displayed on the post-submission success screen.
        /// </summary>
        [MaxLength(200)]
        public string? SuccessPageTitle { get; set; } = "Thank You for Your Response!";

        /// <summary>
        /// Confirmation note displayed after submission.
        /// </summary>
        [MaxLength(1000)]
        public string SuccessMessage { get; set; } = "Your survey response has been recorded.";

        /// <summary>
        /// Label for the button allowing another submission.
        /// </summary>
        [MaxLength(100)]
        public string? SuccessPageButtonText { get; set; } = "Submit Another Response";

        /// <summary>
        /// UTC creation timestamp.
        /// </summary>
        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// UTC last-updated timestamp.
        /// </summary>
        public DateTime? UpdatedAtUtc { get; set; }

        /// <summary>
        /// Ordered collection of survey questions/fields.
        /// </summary>
        public ICollection<BcpSurveyFormField> Fields { get; set; } = new List<BcpSurveyFormField>();

        /// <summary>
        /// Collection of submitted survey responses.
        /// </summary>
        public ICollection<BcpSurveySubmission> Submissions { get; set; } = new List<BcpSurveySubmission>();
    }
}
