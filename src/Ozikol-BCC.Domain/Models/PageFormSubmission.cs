using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Represents an individual lead, inquiry, or response submitted by a website visitor through a PageForm.
    /// </summary>
    [Table("PageFormSubmissions")]
    public class PageFormSubmission
    {
        /// <summary>
        /// Primary Key.
        /// </summary>
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        /// <summary>
        /// Foreign key to the parent PageForm.
        /// </summary>
        [Required]
        public Guid PageFormId { get; set; }

        /// <summary>
        /// Navigation property to the parent PageForm.
        /// </summary>
        [ForeignKey("PageFormId")]
        public PageForm? PageForm { get; set; }

        /// <summary>
        /// Exact timestamp when the submission occurred in UTC.
        /// </summary>
        public DateTime SubmittedAtUtc { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Serialized JSON dictionary of all field answers provided by the visitor.
        /// Key = FieldKey, Value = visitor input.
        /// </summary>
        [Required]
        public string DataJson { get; set; } = "{}";

        /// <summary>
        /// The webpage URL where the visitor filled and submitted the form (e.g. "/services", "/contact", "/").
        /// </summary>
        [MaxLength(500)]
        public string? SourcePageUrl { get; set; }

        /// <summary>
        /// Processing status of the lead/inquiry: "New", "Contacted", "In Progress", "Closed".
        /// </summary>
        [MaxLength(50)]
        public string Status { get; set; } = "New";

        /// <summary>
        /// Internal notes recorded by team administrators during follow-up.
        /// </summary>
        [MaxLength(2000)]
        public string? AdminNotes { get; set; }

        /// <summary>
        /// IP address of the submitting visitor for security and rate limiting.
        /// </summary>
        [MaxLength(100)]
        public string? IpAddress { get; set; }

        /// <summary>
        /// Browser User-Agent header of the submitting client.
        /// </summary>
        [MaxLength(500)]
        public string? UserAgent { get; set; }
    }
}
