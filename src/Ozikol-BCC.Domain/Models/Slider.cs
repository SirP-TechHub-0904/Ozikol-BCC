using System;
using System.ComponentModel.DataAnnotations;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Represents a hero slider or banner block.
    /// Note: Usually replaced by PageSection, but kept for legacy UI compatibility.
    /// </summary>
    public class Slider
    {
        /// <summary>
        /// Primary Key.
        /// </summary>
        public Guid Id { get; set; }

        /// <summary>
        /// Main background image URL.
        /// </summary>
        public string? Url { get; set; }

        /// <summary>
        /// Cloudinary key for the background image.
        /// </summary>
        public string? Key { get; set; }

        /// <summary>
        /// Secondary overlapping image URL.
        /// </summary>
        [Display(Name = "Second Image")]
        public string? SecondUrl { get; set; }

        /// <summary>
        /// Cloudinary key for the secondary image.
        /// </summary>
        public string? SecondKey { get; set; }

        /// <summary>
        /// YouTube background embed link.
        /// </summary>
        public string? YoutubeVideo { get; set; }

        /// <summary>
        /// Flags if the slide uses a video background.
        /// </summary>
        [Display(Name = "Is Video")]
        public bool IsVideo { get; set; }

        /// <summary>
        /// Sorting order for the slide.
        /// </summary>
        [Display(Name = "Sort Order")]
        public int SortOrder { get; set; }

        /// <summary>
        /// Toggle visibility for the slide.
        /// </summary>
        public bool Show { get; set; }

        /// <summary>
        /// Heading text on the slide.
        /// </summary>
        [Display(Name = "Title")]
        public string? Title { get; set; }

        /// <summary>
        /// Sub-heading text on the slide.
        /// </summary>
        [Display(Name = "Mini Title")]
        public string? MiniTitle { get; set; }

        /// <summary>
        /// Descriptive text on the slide.
        /// </summary>
        [Display(Name = "Text")]
        public string? Text { get; set; }

        /// <summary>
        /// CTA primary button text.
        /// </summary>
        [Display(Name = "Button Text")]
        public string? ButtonText { get; set; }

        /// <summary>
        /// CTA primary button link.
        /// </summary>
        [Display(Name = "Button Link")]
        public string? ButtonLink { get; set; }

        /// <summary>
        /// Toggle to hide the secondary video trigger button.
        /// </summary>
        [Display(Name = "Disable Video Button")]
        public bool DisableVideoButton { get; set; }

        /// <summary>
        /// Link for the secondary video trigger button.
        /// </summary>
        [Display(Name = "Video Link")]
        public string? VideoLink { get; set; }

        /// <summary>
        /// Text for the secondary video trigger button.
        /// </summary>
        [Display(Name = "Video Button Text")]
        public string? VideoButtonText { get; set; }

        /// <summary>
        /// Key matching an installed Hero template in TenantInstalledTemplates (e.g., "Hero_SplitProduct", "Hero_CenteredSaaS").
        /// Links this slider's content to a modular HTML/CSS Hero layout.
        /// </summary>
        [MaxLength(100)]
        [Display(Name = "Template Layout Key")]
        public string? TemplateKey { get; set; }
    }
}


