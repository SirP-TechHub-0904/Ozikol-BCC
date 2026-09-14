using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Represents a dynamic website form entity managed in Content CMS Studio.
    /// Injected into website page sections (e.g. Contact Us, Newsletter, Service Request &amp; Intake).
    /// </summary>
    [Table("PageForms")]
    public class PageForm
    {
        /// <summary>
        /// Primary Key.
        /// </summary>
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        /// <summary>
        /// Display title of the form (e.g. "Service Request &amp; Project Intake", "Contact Us", "Newsletter").
        /// </summary>
        [Required]
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;

        /// <summary>
        /// Unique URL slug and code injection identifier (e.g. "service-request", "contact-us", "newsletter").
        /// </summary>
        [Required]
        [MaxLength(100)]
        public string FormKey { get; set; } = string.Empty;

        /// <summary>
        /// Optional descriptive subtitle or instructions displayed above or inside the form.
        /// </summary>
        [MaxLength(1000)]
        public string? Description { get; set; }

        /// <summary>
        /// Button text for form submission (e.g. "Submit Service Request", "Send Message", "Subscribe").
        /// </summary>
        [Required]
        [MaxLength(100)]
        public string SubmitButtonText { get; set; } = "Submit";

        /// <summary>
        /// Success message displayed to the visitor upon successful submission.
        /// </summary>
        [Required]
        [MaxLength(1000)]
        public string SuccessMessage { get; set; } = "Thank you! Your request has been submitted successfully.";

        /// <summary>
        /// Optional email address to receive instant notifications when a visitor submits this form.
        /// If null, defaults to the primary tenant admin email.
        /// </summary>
        [MaxLength(256)]
        public string? NotificationEmail { get; set; }

        /// <summary>
        /// Whether the form is published and actively accepting submissions.
        /// </summary>
        public bool IsActive { get; set; } = true;

        /// <summary>
        /// Timestamp when the form was created in UTC.
        /// </summary>
        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Timestamp when the form was last updated in UTC.
        /// </summary>
        public DateTime? UpdatedAtUtc { get; set; }

        /// <summary>
        /// Navigation collection of ordered interactive questions, inputs, pills, and dropdowns.
        /// </summary>
        public ICollection<PageFormField> Fields { get; set; } = new List<PageFormField>();

        /// <summary>
        /// Navigation collection of submitted visitor responses for this form.
        /// </summary>
        public ICollection<PageFormSubmission> Submissions { get; set; } = new List<PageFormSubmission>();
    }
}
