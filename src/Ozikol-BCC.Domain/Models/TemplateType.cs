using System;
namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Represents a specific layout block variation inside a Master Theme (e.g., 'Hero Slider Style 3').
    /// </summary>
    public class TemplateType
    {
        /// <summary>
        /// Primary Key.
        /// </summary>
        public Guid Id { get; set; }

        /// <summary>
        /// Name of the layout variation.
        /// </summary>
        public string? Name { get; set; }

        /// <summary>
        /// Path to an image preview showing what this layout looks like.
        /// </summary>
        public string? Url { get; set; }

        /// <summary>
        /// The unique string that maps perfectly to PageSection.TemplateKey.
        /// </summary>
        public string? Key { get; set; }

        /// <summary>
        /// Used for tracking internal UI assignments.
        /// </summary>
        public string? TrackKey { get; set; }

        /// <summary>
        /// Foreign key to the parent TemplateCategory (Master Theme).
        /// </summary>
        public Guid? TemplateCategoryId { get; set; }

        /// <summary>
        /// Navigation property to the parent TemplateCategory.
        /// </summary>
        public TemplateCategory? TemplateCategory { get; set; }
    }
}


