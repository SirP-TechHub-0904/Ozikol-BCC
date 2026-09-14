using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Represents a flexible UI block or layout section that belongs to a WebPage or Homepage.
    /// </summary>
    public class PageSection
    {
        /// <summary>
        /// Primary Key.
        /// </summary>
        public Guid Id { get; set; }

        /// <summary>
        /// URL to a video file hosted externally or on Cloudinary.
        /// </summary>
        public string? VideoUrl { get; set; }

        /// <summary>
        /// Cloudinary key for the video.
        /// </summary>
        public string? VideoKey { get; set; }

        /// <summary>
        /// Main background or foreground image for the section.
        /// </summary>
        public string? ImageUrl { get; set; }

        /// <summary>
        /// Cloudinary key for the main image.
        /// </summary>
        public string? ImageKey { get; set; }

        /// <summary>
        /// Secondary image used in complex layouts (e.g., overlapping images).
        /// </summary>
        public string? SecondImageUrl { get; set; }

        /// <summary>
        /// Cloudinary key for the secondary image.
        /// </summary>
        public string? SecondImageKey { get; set; }

        /// <summary>
        /// External YouTube embed link.
        /// </summary>
        [Display(Name = "Youtube Url Link")]
        public string? YoutubeUrlLink { get; set; }

        /// <summary>
        /// The main heading of the section.
        /// </summary>
        [Display(Name = "Title")]
        public string? Title { get; set; }

        /// <summary>
        /// The sub-heading or kicker text of the section.
        /// </summary>
        [Display(Name = "Mini Title")]
        public string? MiniTitle { get; set; }

        /// <summary>
        /// Blockquote or highlighted text within the section.
        /// </summary>
        [Display(Name = "Qoute")]
        public string? Qoute { get; set; }

        /// <summary>
        /// Short excerpt or plain text content.
        /// </summary>
        [Display(Name = "Description")]
        public string? Description { get; set; }

        /// <summary>
        /// Full HTML body content for the section.
        /// </summary>
        [Display(Name = "Full Description")]
        public string? FullDescription { get; set; }

        /// <summary>
        /// Call to action button text.
        /// </summary>
        [Display(Name = "Button Text")]
        public string? ButtonText { get; set; }

        /// <summary>
        /// Call to action button URL.
        /// </summary>
        [Display(Name = "Button Link")]
        public string? ButtonLink { get; set; }

        /// <summary>
        /// Custom routing string if this section links out.
        /// </summary>
        [Display(Name = "Direct Url")]
        public string? DirectUrl { get; set; }

        /// <summary>
        /// Toggle to explicitly render this section on the homepage.
        /// </summary>
        [Display(Name = "Show In Home")]
        public bool ShowInHome { get; set; }

        /// <summary>
        /// Toggle to hide the CTA button entirely.
        /// </summary>
        [Display(Name = "Disable Button")]
        public bool DisableButton { get; set; }

        /// <summary>
        /// Toggle to completely hide this section from the UI.
        /// </summary>
        public bool Disable { get; set; }

        /// <summary>
        /// Render rule to pin this section at the bottom of the page (pre-footer).
        /// </summary>
        [Display(Name = "Fixed After Footer")]
        public bool FixedAfterFooter { get; set; }

        /// <summary>
        /// Order in which this section appears on the homepage.
        /// </summary>
        [Display(Name = "Home Page Sort Order")]
        public int HomePageSortOrder { get; set; }

        /// <summary>
        /// Enum sorting origin for the homepage layout.
        /// </summary>
        [Display(Name = "Home Sort From")]
        public HomeSortFrom HomeSortFrom { get; set; }

        /// <summary>
        /// Order in which this section appears on its specific WebPage.
        /// </summary>
        [Display(Name = "Page Sort Order")]
        public int PageSortOrder { get; set; }

        /// <summary>
        /// Enum for positioning this section inside blog post layouts.
        /// </summary>
        [Display(Name = "Blog Section Position")]
        public BlogSectionPosition BlogSectionPosition { get; set; }

        /// <summary>
        /// Toggle to render this section globally inside blog posts.
        /// </summary>
        [Display(Name = "Show Section In Blog")]
        public bool ShowSectionInBlog { get; set; }

        /// <summary>
        /// Foreign key to the parent WebPage.
        /// </summary>
        public Guid? WebPageId { get; set; }

        /// <summary>
        /// Navigation property to the parent WebPage.
        /// </summary>
        public WebPage? WebPage { get; set; }

        /// <summary>
        /// Crucial string linking this data to a specific HTML/CSS UI design block in the Theme Engine.
        /// </summary>
        public string? TemplateKey { get; set; }

        /// <summary>
        /// Reference to original MasterMarketplaceTemplate.Id in MasterCatalogDbContext.
        /// </summary>
        public Guid? MasterTemplateId { get; set; }

        /// <summary>
        /// Installed template version (e.g., "1.0.0").
        /// </summary>
        public string? InstalledVersion { get; set; }

        /// <summary>
        /// Flag set to true if local HTML/CSS is customized for this section.
        /// </summary>
        public bool IsCustomized { get; set; } = false;

        /// <summary>
        /// Local editable copy of HTML template markup.
        /// </summary>
        public string? HtmlTemplate { get; set; }

        /// <summary>
        /// Local editable copy of scoped CSS styles.
        /// </summary>
        public string? CssStyles { get; set; }

        /// <summary>
        /// Optional sandboxed JavaScript for this section.
        /// </summary>
        public string? JsScript { get; set; }

        /// <summary>
        /// Custom CSS class injection for this specific block.
        /// </summary>
        public string? CustomClass { get; set; }

        /// <summary>
        /// Optional background color or theme token override (e.g. '#ffffff', '#f8fafc', 'dark', 'primary').
        /// </summary>
        public string? BackgroundColor { get; set; }

        /// <summary>
        /// Toggle to push this section's title to the breaking news ribbon.
        /// </summary>
        [Display(Name = "Add To Ribon")]
        public bool AddToRibon { get; set; }

        /// <summary>
        /// Override title for the ribbon (defaults to Title if null).
        /// </summary>
        [Display(Name = "Ribon Custom Display Title")]
        public string? RibonCustomDisplayTitle { get; set; }

        /// <summary>
        /// Sort order inside the news ribbon ticker.
        /// </summary>
        [Display(Name = "Ribon Sort Order")]
        public int RibonSortOrder { get; set; }

        /// <summary>
        /// Navigation property for all repeatable sub-items (e.g., list of services, core values) inside this block.
        /// </summary>
        public ICollection<PageSectionList>? PageSectionLists { get; set; }

        /// <summary>
        /// Optional attached dynamic PageForm identifier.
        /// </summary>
        public Guid? PageFormId { get; set; }

        /// <summary>
        /// Navigation property to the embedded dynamic PageForm.
        /// </summary>
        public PageForm? PageForm { get; set; }

        /// <summary>
        /// Direct programmatic fallback form key (e.g. "service-request", "contact-us", "newsletter").
        /// </summary>
        public string? FormKey { get; set; }
    }
}


