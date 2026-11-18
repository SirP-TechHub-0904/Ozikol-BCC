using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Represents a single question or input field within a standalone <see cref="BcpSurveyForm"/>.
    /// </summary>
    [Table("BcpSurveyFormFields")]
    public class BcpSurveyFormField
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
        /// Programmatic snake_case key for the question response.
        /// </summary>
        [Required]
        [MaxLength(100)]
        public string FieldKey { get; set; } = string.Empty;

        /// <summary>
        /// Question prompt or field label displayed to respondents.
        /// </summary>
        [Required]
        [MaxLength(300)]
        public string Label { get; set; } = string.Empty;

        /// <summary>
        /// Optional input placeholder text.
        /// </summary>
        [MaxLength(200)]
        public string? Placeholder { get; set; }

        /// <summary>
        /// Field type (<c>text</c>, <c>textarea</c>, <c>email</c>, <c>number</c>, <c>select</c>, <c>radio</c>, <c>checkbox</c>, <c>rating</c>, <c>date</c>).
        /// </summary>
        [Required]
        [MaxLength(50)]
        public string FieldType { get; set; } = "text";

        /// <summary>
        /// JSON array of option strings for <c>select</c>, <c>radio</c>, or <c>checkbox</c> fields.
        /// </summary>
        public string? OptionsJson { get; set; }

        /// <summary>
        /// Whether the respondent must answer this question.
        /// </summary>
        public bool IsRequired { get; set; }

        /// <summary>
        /// 1-based display order.
        /// </summary>
        public int SortOrder { get; set; }
    }
}
