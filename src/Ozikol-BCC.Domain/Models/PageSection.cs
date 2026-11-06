using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Represents an individual modular UI slice or layout section belonging to a WebPage.
    /// Connects to a template blueprint (via TemplateKey or raw HtmlTemplate/CssStyles/JsScript),
    /// houses child repeatable items (PageSectionList), and can embed dynamic interactive forms (PageForm).
    /// </summary>
    [Table("PageSections")]
    public class PageSection
    {
        /// <summary>
        /// Unique primary key identifier for the page section.
        /// </summary>
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        /// <summary>
        /// Foreign key to the parent WebPage that contains this section.
        /// </summary>
        public Guid? WebPageId { get; set; }

        /// <summary>
        /// Navigation property to the parent WebPage.
        /// </summary>
        [ForeignKey("WebPageId")]
        public WebPage? WebPage { get; set; }

        /// <summary>
        /// Key matching an installed marketplace template (e.g. "Hero_CorporateSplit", "Body_FeatureGrid3", "Contact_SplitDetails").
        /// </summary>
        [MaxLength(100)]
        public string? TemplateKey { get; set; }

        /// <summary>
        /// Reference to original MasterMarketplaceTemplate.Id in MasterCatalogDbContext for update sync.
        /// </summary>
        public Guid? MasterTemplateId { get; set; }

        /// <summary>
        /// The main heading or title of this section.
        /// Injected into templates via {{ Title }}.
        /// </summary>
        [MaxLength(300)]
        [Display(Name = "Title")]
        public string? Title { get; set; }

        /// <summary>
        /// The sub-heading or kicker badge text of this section.
        /// Injected into templates via {{ MiniTitle }}.
        /// </summary>
        [MaxLength(200)]
        [Display(Name = "Mini Title")]
        public string? MiniTitle { get; set; }

        /// <summary>
        /// Blockquote, highlight banner, or callout text within the section.
        /// Injected into templates via {{ Qoute }}.
        /// </summary>
        [MaxLength(1000)]
        [Display(Name = "Quote / Highlight")]
        public string? Qoute { get; set; }

        /// <summary>
        /// Short excerpt, subtitle, or summary text content.
        /// Injected into templates via {{ Description }}.
        /// </summary>
        [MaxLength(2000)]
        [Display(Name = "Description")]
        public string? Description { get; set; }

        /// <summary>
        /// Extended rich HTML body content for the section.
        /// Injected into templates via {{ FullDescription }}.
        /// </summary>
        [Display(Name = "Full Description")]
        public string? FullDescription { get; set; }

        /// <summary>
        /// Primary image URL for the section (hero image, split showcase graphic, background).
        /// Injected into templates via {{ ImageUrl }}.
        /// </summary>
        [MaxLength(1000)]
        public string? ImageUrl { get; set; }

        /// <summary>
        /// Cloudinary/storage key for the primary image.
        /// </summary>
        [MaxLength(250)]
        public string? ImageKey { get; set; }

        /// <summary>
        /// Secondary image URL for multi-image layouts (e.g. overlapping cards, team collage).
        /// Injected into templates via {{ SecondImageUrl }}.
        /// </summary>
        [MaxLength(1000)]
        public string? SecondImageUrl { get; set; }

        /// <summary>
        /// Cloudinary/storage key for the secondary image.
        /// </summary>
        [MaxLength(250)]
        public string? SecondImageKey { get; set; }

        /// <summary>
        /// Video URL for video hero sections or background players.
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
        /// External YouTube/Vimeo embed URL.
        /// Injected into templates via {{ YoutubeUrlLink }}.
        /// </summary>
        [MaxLength(1000)]
        [Display(Name = "YouTube Video URL")]
        public string? YoutubeUrlLink { get; set; }

        /// <summary>
        /// FontAwesome or Bootstrap icon class string (e.g. 'tji-phone', 'fa-solid fa-rocket', 'bi bi-star').
        /// Injected into templates via {{ IconText }}.
        /// </summary>
        [MaxLength(100)]
        [Display(Name = "Icon Class / Text")]
        public string? IconText { get; set; }

        /// <summary>
        /// Action button display text.
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
        /// Secondary action button display text for dual-CTA sections.
        /// Injected into templates via {{ SecondButtonText }}.
        /// </summary>
        [MaxLength(100)]
        [Display(Name = "Second Button Text")]
        public string? SecondButtonText { get; set; }

        /// <summary>
        /// Secondary action button destination URL for dual-CTA sections.
        /// Injected into templates via {{ SecondButtonLink }}.
        /// </summary>
        [MaxLength(500)]
        [Display(Name = "Second Button Link")]
        public string? SecondButtonLink { get; set; }

        /// <summary>
        /// Optional direct routing string if this section anchors or links out.
        /// </summary>
        [MaxLength(500)]
        [Display(Name = "Direct Url")]
        public string? DirectUrl { get; set; }

        /// <summary>
        /// Toggle to hide the CTA button inside the section.
        /// </summary>
        [Display(Name = "Disable Button")]
        public bool DisableButton { get; set; } = false;

        /// <summary>
        /// Toggle to disable and hide this section completely from visitor view.
        /// </summary>
        public bool Disable { get; set; } = false;

        /// <summary>
        /// Render rule to pin this section at the bottom of the page (pre-footer/fixed bar).
        /// </summary>
        [Display(Name = "Fixed After Footer")]
        public bool FixedAfterFooter { get; set; } = false;

        /// <summary>
        /// Order in which this section appears on its parent WebPage (ascending: 1, 2, 3...).
        /// </summary>
        [Display(Name = "Page Sort Order")]
        public int PageSortOrder { get; set; } = 0;

        /// <summary>
        /// Local editable copy of the HTML template markup containing {{ Mustache }} placeholders.
        /// </summary>
        public string? HtmlTemplate { get; set; }

        /// <summary>
        /// Local editable copy of scoped CSS styles for this section.
        /// </summary>
        public string? CssStyles { get; set; }

        /// <summary>
        /// Optional sandboxed JavaScript for this section (e.g. Swiper sliders, counters, tabs).
        /// </summary>
        public string? JsScript { get; set; }

        /// <summary>
        /// Custom CSS class string injected into this section's root container.
        /// </summary>
        [MaxLength(150)]
        public string? CustomClass { get; set; }

        /// <summary>
        /// Optional background color or theme token override (e.g. '#ffffff', '#f8fafc', 'dark', 'primary').
        /// </summary>
        [MaxLength(50)]
        public string? BackgroundColor { get; set; }

        /// <summary>
        /// Flag set to true if local HTML/CSS has been customized for this specific section.
        /// </summary>
        public bool IsCustomized { get; set; } = false;

        /// <summary>
        /// Indicates whether this is an out-of-the-box factory default starter section.
        /// </summary>
        public bool IsDefault { get; set; } = false;

        /// <summary>
        /// Toggle to push this section's title to the breaking news ribbon ticker.
        /// </summary>
        [Display(Name = "Add To Ribbon")]
        public bool AddToRibon { get; set; } = false;

        /// <summary>
        /// Override display title for the news ribbon (defaults to Title if null).
        /// </summary>
        [MaxLength(300)]
        [Display(Name = "Ribbon Custom Display Title")]
        public string? RibonCustomDisplayTitle { get; set; }

        /// <summary>
        /// Sorting order inside the news ribbon ticker.
        /// </summary>
        [Display(Name = "Ribbon Sort Order")]
        public int RibonSortOrder { get; set; } = 0;

        /// <summary>
        /// Optional attached dynamic PageForm identifier.
        /// Injected into the section template via {{ PageFormHtml }} or {{ Form: "form-key" }}.
        /// </summary>
        public Guid? PageFormId { get; set; }

        /// <summary>
        /// Navigation property to the embedded dynamic PageForm.
        /// </summary>
        [ForeignKey("PageFormId")]
        public PageForm? PageForm { get; set; }

        /// <summary>
        /// Programmatic form key shortcut (e.g. "contact-us", "service-request", "newsletter").
        /// </summary>
        [MaxLength(100)]
        public string? FormKey { get; set; }

        /// <summary>
        /// Navigation collection of repeatable child items (slides, feature cards, pricing tiers, office locations).
        /// Injected into templates via {{#each PageSectionLists}} loops.
        /// </summary>
        public ICollection<PageSectionList> PageSectionLists { get; set; } = new List<PageSectionList>();

        /// <summary>
        /// Total number of repeatable child items (cards, lists) attached to this section. Computed / non-persisted property.
        /// </summary>
        [NotMapped]
        public int ListCount { get; set; }
    }
}
