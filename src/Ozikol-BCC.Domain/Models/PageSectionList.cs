using System;
using System.ComponentModel.DataAnnotations;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Represents a repeating sub-item inside a PageSection (e.g., a single "Core Value", a single "Service").
    /// </summary>
    public class PageSectionList
    {
        /// <summary>
        /// Primary Key.
        /// </summary>
        public Guid Id { get; set; }

        /// <summary>
        /// Video URL for the list item (if the design block supports videos).
        /// </summary>
        public string? VideoUrl { get; set; }

        /// <summary>
        /// Cloudinary key for the video.
        /// </summary>
        public string? VideoKey { get; set; }

        /// <summary>
        /// Image URL for the list item.
        /// </summary>
        public string? ImageUrl { get; set; }

        /// <summary>
        /// Cloudinary key for the image.
        /// </summary>
        public string? ImageKey { get; set; }

        /// <summary>
        /// FontAwesome or Bootstrap icon class string (e.g., 'fa fa-user').
        /// </summary>
        public string? IconText { get; set; }

        /// <summary>
        /// Order in which this item appears in the loop.
        /// </summary>
        public int SortOrder { get; set; }

        /// <summary>
        /// Heading for the list item.
        /// </summary>
        [Display(Name = "Title")]
        public string? Title { get; set; }

        /// <summary>
        /// Sub-heading for the list item.
        /// </summary>
        [Display(Name = "Mini Title")]
        public string? MiniTitle { get; set; }

        /// <summary>
        /// Short text content.
        /// </summary>
        [Display(Name = "Description")]
        public string? Description { get; set; }

        /// <summary>
        /// Extended text content.
        /// </summary>
        [Display(Name = "More Description")]
        public string? MoreDescription { get; set; }

        /// <summary>
        /// Action button text for this specific item.
        /// </summary>
        [Display(Name = "Button Text")]
        public string? ButtonText { get; set; }

        /// <summary>
        /// Action button URL.
        /// </summary>
        [Display(Name = "Button Link")]
        public string? ButtonLink { get; set; }

        /// <summary>
        /// Custom routing string.
        /// </summary>
        [Display(Name = "Direct Url")]
        public string? DirectUrl { get; set; }

        /// <summary>
        /// Toggle to hide this list item.
        /// </summary>
        public bool Disable { get; set; }

        /// <summary>
        /// Foreign key to the parent PageSection.
        /// </summary>
        public Guid? PageSectionId { get; set; }

        /// <summary>
        /// Navigation property to the parent PageSection.
        /// </summary>
        public PageSection? PageSection { get; set; }

        /// <summary>
        /// Toggle to push this item to the breaking news ribbon.
        /// </summary>
        [Display(Name = "Add To Ribon")]
        public bool AddToRibon { get; set; }

        /// <summary>
        /// Override title for the ribbon.
        /// </summary>
        [Display(Name = "Ribon Custom Display Title")]
        public string? RibonCustomDisplayTitle { get; set; }

        /// <summary>
        /// Ribbon sorting order.
        /// </summary>
        [Display(Name = "Ribon Sort Order")]
        public int RibonSortOrder { get; set; }
    }
}


