using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Represents a single respondent submission for a standalone <see cref="BcpSurveyForm"/>.
    /// </summary>
    [Table("BcpSurveySubmissions")]
    public class BcpSurveySubmission
    {
        /// <summary>
        /// Primary key.
        /// </summary>
        [Key]
        public Guid Id { get; set; } = Guid.CreateVersion7();

        /// <summary>
        /// Foreign key referencing the parent <see cref="BcpSurveyForm"/>.
        /// </summary>
        public Guid BcpSurveyFormId { get; set; }

        /// <summary>
        /// Parent survey navigation property.
        /// </summary>
        [JsonIgnore]
        [ForeignKey(nameof(BcpSurveyFormId))]
        public BcpSurveyForm? SurveyForm { get; set; }

        /// <summary>
        /// Serialized JSON object mapping question keys to respondent answers.
        /// </summary>
        [Required]
        public string DataJson { get; set; } = "{}";

        /// <summary>
        /// Authenticated user ID if submitted by a signed-in member; null for anonymous respondents.
        /// </summary>
        [MaxLength(450)]
        public string? RespondentUserId { get; set; }

        /// <summary>
        /// Review status (<c>New</c>, <c>Reviewed</c>, <c>Archived</c>).
        /// </summary>
        [MaxLength(50)]
        public string Status { get; set; } = "New";

        /// <summary>
        /// Optional administrator review notes.
        /// </summary>
        [MaxLength(2000)]
        public string? AdminNotes { get; set; }

        /// <summary>
        /// UTC submission timestamp.
        /// </summary>
        public DateTime SubmittedAtUtc { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Client IP address recorded for abuse/rate-limit auditing.
        /// </summary>
        [MaxLength(100)]
        public string? IpAddress { get; set; }
    }
}
