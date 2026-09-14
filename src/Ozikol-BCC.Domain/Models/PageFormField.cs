using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Represents an individual field, input, question, pill-selector, or dropdown within a PageForm.
    /// </summary>
    [Table("PageFormFields")]
    public class PageFormField
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
        /// Programmatic key for the field (e.g. "service_required", "timeline", "organization_scale", "full_name").
        /// Used as the JSON key in submitted responses.
        /// </summary>
        [Required]
        [MaxLength(100)]
        public string FieldKey { get; set; } = string.Empty;

        /// <summary>
        /// Human-readable question or input label (e.g. "1. What service or solution do you require?").
        /// </summary>
        [Required]
        [MaxLength(300)]
        public string Label { get; set; } = string.Empty;

        /// <summary>
        /// Optional placeholder text for inputs/textareas (e.g. "Your Full Name *").
        /// </summary>
        [MaxLength(200)]
        public string? Placeholder { get; set; }

        /// <summary>
        /// Field type identifier.
        /// Supported types: "text", "email", "phone", "textarea", "dropdown", "pill_select", "checkbox", "radio".
        /// </summary>
        [Required]
        [MaxLength(50)]
        public string FieldType { get; set; } = "text";

        /// <summary>
        /// JSON array of selectable options for "dropdown", "pill_select", "checkbox", or "radio".
        /// Example: ["Strategic Consulting &amp; Advisory", "Digital Systems Modernization", "Custom Integration"].
        /// </summary>
        public string? OptionsJson { get; set; }

        /// <summary>
        /// Whether this field is mandatory to complete before form submission.
        /// </summary>
        public bool IsRequired { get; set; } = false;

        /// <summary>
        /// Display sequence order within the form layout.
        /// </summary>
        public int SortOrder { get; set; } = 1;

        /// <summary>
        /// Bootstrap column width layout class: "col-md-6" (half-width) or "col-md-12" (full-width).
        /// </summary>
        [MaxLength(50)]
        public string GridWidth { get; set; } = "col-md-12";

        /// <summary>
        /// Optional contextual helper text displayed below the field.
        /// </summary>
        [MaxLength(500)]
        public string? HelpText { get; set; }
    }
}
