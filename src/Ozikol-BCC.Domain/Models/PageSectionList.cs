using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Represents a repeating sub-item or child card inside a PageSection (e.g. a slide, service card, feature item, pricing tier, testimonial, or office branch location).
    /// Injected into section templates via {{#each PageSectionLists}} loops.
    /// </summary>
    [Table("PageSectionLists")]
    public class PageSectionList
    {
        /// <summary>
        /// Unique primary key identifier for the section list item.
        /// </summary>
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        /// <summary>
        /// Foreign key to the parent PageSection.
        /// </summary>
        public Guid? PageSectionId { get; set; }

        /// <summary>
        /// Navigation property to the parent PageSection.
        /// </summary>
        [ForeignKey("PageSectionId")]
        public PageSection? PageSection { get; set; }

        /// <summary>
        /// Main heading or title of the list item.
        /// Injected into templates via {{ Title }}.
        /// </summary>
        [MaxLength(300)]
        [Display(Name = "Title")]
        public string? Title { get; set; }

        /// <summary>
        /// Sub-heading, kicker, or initials badge for the list item.
        /// Injected into templates via {{ MiniTitle }}.
        /// </summary>
        [MaxLength(200)]
        [Display(Name = "Mini Title")]
        public string? MiniTitle { get; set; }

        /// <summary>
        /// Short text content, excerpt, or bio description.
        /// Injected into templates via {{ Description }}.
        /// </summary>
        [MaxLength(2000)]
        [Display(Name = "Description")]
        public string? Description { get; set; }

        /// <summary>
        /// Extended text content, job title, or role note.
        /// Injected into templates via {{ MoreDescription }}.
        /// </summary>
        [MaxLength(2000)]
        [Display(Name = "More Description")]
        public string? MoreDescription { get; set; }

        /// <summary>
        /// Image URL for the item (e.g. card graphic, user avatar, location photo).
        /// Injected into templates via {{ ImageUrl }}.
        /// </summary>
        [MaxLength(1000)]
        public string? ImageUrl { get; set; }

        /// <summary>
        /// Storage key for the image asset.
        /// </summary>
        [MaxLength(250)]
        public string? ImageKey { get; set; }

        /// <summary>
        /// Video URL for the list item (if the block supports video cards).
        /// Injected into templates via {{ VideoUrl }}.
        /// </summary>
        [MaxLength(1000)]
        public string? VideoUrl { get; set; }

        /// <summary>
        /// Storage key for the video asset.
        /// </summary>
        [MaxLength(250)]
        public string? VideoKey { get; set; }

        /// <summary>
        /// FontAwesome or Bootstrap icon class string (e.g., 'fa-solid fa-shield-halved', 'bi bi-star').
        /// Injected into templates via {{ IconText }}.
        /// </summary>
        [MaxLength(100)]
        public string? IconText { get; set; }

        /// <summary>
        /// Action button text for this specific item.
        /// Injected into templates via {{ ButtonText }}.
        /// </summary>
        [MaxLength(100)]
        [Display(Name = "Button Text")]
        public string? ButtonText { get; set; }

        /// <summary>
        /// Action button destination URL.
        /// Injected into templates via {{ ButtonLink }}.
        /// </summary>
        [MaxLength(500)]
        [Display(Name = "Button Link")]
        public string? ButtonLink { get; set; }

        /// <summary>
        /// Custom direct routing string.
        /// Injected into templates via {{ DirectUrl }}.
        /// </summary>
        [MaxLength(500)]
        [Display(Name = "Direct Url")]
        public string? DirectUrl { get; set; }

        /// <summary>
        /// Order in which this item appears within the section loop (ascending: 1, 2, 3...).
        /// </summary>
        public int SortOrder { get; set; } = 0;

        /// <summary>
        /// Toggle to hide this individual item without deleting it.
        /// </summary>
        public bool Disable { get; set; } = false;

        /// <summary>
        /// Toggle to push this item to the breaking news ribbon ticker.
        /// </summary>
        [Display(Name = "Add To Ribbon")]
        public bool AddToRibon { get; set; } = false;

        /// <summary>
        /// Override title for the ribbon ticker (defaults to Title if null).
        /// </summary>
        [MaxLength(300)]
        [Display(Name = "Ribbon Custom Display Title")]
        public string? RibonCustomDisplayTitle { get; set; }

        /// <summary>
        /// Ribbon ticker sorting order.
        /// </summary>
        [Display(Name = "Ribbon Sort Order")]
        public int RibonSortOrder { get; set; } = 0;
    }
}
