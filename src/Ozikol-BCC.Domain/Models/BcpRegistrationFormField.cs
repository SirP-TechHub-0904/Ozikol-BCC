using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Represents a dynamic onboarding or registration form field configured by an organization
    /// to collect business-specific data during user self-registration ("Get Started") or admin provisioning.
    /// Unlike CMS lead-generation forms, fields defined here extend the user's permanent profile record.
    /// </summary>
    [Table("BcpRegistrationFormFields")]
    public class BcpRegistrationFormField
    {
        /// <summary>
        /// Unique primary key identifier for the registration form field.
        /// </summary>
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        /// <summary>
        /// Unique programmatic alphanumeric key representing the attribute (e.g. "student_id", "department", "company_size").
        /// Stored as the JSON key in Profile.CustomAttributesJson.
        /// </summary>
        [Required]
        [MaxLength(100)]
        [Display(Name = "Field Key")]
        public string FieldKey { get; set; } = string.Empty;

        /// <summary>
        /// Human-readable display label rendered on the registration and profile forms.
        /// </summary>
        [Required]
        [MaxLength(200)]
        [Display(Name = "Field Label")]
        public string Label { get; set; } = string.Empty;

        /// <summary>
        /// Standard professional placeholder text demonstrating the expected input format (e.g. "e.g. STU-2026-0042").
        /// </summary>
        [MaxLength(200)]
        [Display(Name = "Placeholder Text")]
        public string? Placeholder { get; set; }

        /// <summary>
        /// The HTML input control type: "text", "number", "select", "date", "textarea", "checkbox", or "file".
        /// </summary>
        [Required]
        [MaxLength(50)]
        [Display(Name = "Field Type")]
        public string FieldType { get; set; } = "text";

        /// <summary>
        /// Serialized JSON array of selectable option strings for "select" or "radio" controls (e.g. ["Computer Science", "Engineering", "Law"]).
        /// </summary>
        [Display(Name = "Dropdown Options (JSON)")]
        public string? OptionsJson { get; set; }

        /// <summary>
        /// When true, the user or administrator must populate this field to complete registration.
        /// </summary>
        [Display(Name = "Is Required")]
        public bool IsRequired { get; set; } = false;

        /// <summary>
        /// Ascending numerical index controlling the layout sequence of the field on registration forms.
        /// </summary>
        [Display(Name = "Sort Order")]
        public int SortOrder { get; set; } = 0;

        /// <summary>
        /// Master visibility toggle enabling or disabling this field on active registration and onboarding forms.
        /// </summary>
        [Display(Name = "Is Active")]
        public bool IsActive { get; set; } = true;

        /// <summary>
        /// Optional foreign key to a specific BcpUserCategory.
        /// If set, this question is only rendered when the registrant selects this specific category tier.
        /// If null, the field is globally presented to all registrants.
        /// </summary>
        [Display(Name = "User Category Tier")]
        public Guid? BcpUserCategoryId { get; set; }

        /// <summary>
        /// Navigation property to the target user category tier.
        /// </summary>
        [ForeignKey("BcpUserCategoryId")]
        public virtual BcpUserCategory? BcpUserCategory { get; set; }

        /// <summary>
        /// Optional contextual helper instructions or privacy guidance displayed below the input field.
        /// </summary>
        [MaxLength(500)]
        [Display(Name = "Helper Text")]
        public string? HelpText { get; set; }

        /// <summary>
        /// Whether this field should also be presented and editable by the member inside their self-service workspace profile.
        /// </summary>
        [Display(Name = "Show in Workspace Profile")]
        public bool ShowInWorkspaceProfile { get; set; } = true;

        /// <summary>
        /// Exact timestamp in UTC when the field definition was created.
        /// </summary>
        [Display(Name = "Created At (UTC)")]
        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Timestamp in UTC when the field definition was last modified.
        /// </summary>
        [Display(Name = "Updated At (UTC)")]
        public DateTime? UpdatedAtUtc { get; set; }
    }
}
