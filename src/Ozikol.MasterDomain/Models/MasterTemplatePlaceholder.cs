using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol.MasterDomain.Models
{
    /// <summary>
    /// Describes the placeholder parameters and schema for a MasterMarketplaceTemplate.
    /// Informs the UI editor and renderer about expected fields (text, rich-html, image, video, list items).
    /// </summary>
    [Table("MasterTemplatePlaceholders")]
    public class MasterTemplatePlaceholder
    {
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        [ForeignKey("MasterMarketplaceTemplate")]
        public Guid MasterMarketplaceTemplateId { get; set; }
        public MasterMarketplaceTemplate MasterMarketplaceTemplate { get; set; } = null!;

        /// <summary>
        /// Exact placeholder variable key (e.g. "Title", "MiniTitle", "ImageUrl", "ButtonText", "PageSectionLists").
        /// </summary>
        [Required]
        [MaxLength(60)]
        public string FieldKey { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string Label { get; set; } = string.Empty;

        /// <summary>
        /// Field data type: "Text", "RichHtml", "ImageUrl", "VideoUrl", "Link", "Icon", "Color", "SectionList"
        /// </summary>
        [Required]
        [MaxLength(40)]
        public string FieldType { get; set; } = "Text";

        public string? DefaultValue { get; set; }

        public string? HelperText { get; set; }

        [MaxLength(60)]
        public string? RecommendedDimensions { get; set; } // e.g., "1920x1080 (16:9)", "800x800 (1:1)"

        public bool IsRequired { get; set; } = false;
        public int SortOrder { get; set; } = 0;
    }
}
