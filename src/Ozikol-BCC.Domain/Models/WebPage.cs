using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Represents a single navigable page on the website (e.g. Home "/", "/about", "/services", "/contact", "/pricing").
    /// Serves as the primary URL route and root container for ordered layout PageSections.
    /// </summary>
    [Table("WebPages")]
    public class WebPage
    {
        /// <summary>
        /// Unique primary key identifier for the webpage.
        /// </summary>
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        /// <summary>
        /// The display title of the webpage (e.g., "Home", "About Us", "Enterprise Logistics").
        /// </summary>
        [Required]
        [MaxLength(200)]
        [Display(Name = "Page Title")]
        public string Title { get; set; } = string.Empty;

        /// <summary>
        /// Indicates whether this page is the root landing page (e.g., "/" or "/home").
        /// </summary>
        [Display(Name = "Is Home Page")]
        public bool IsHomePage { get; set; } = false;

        /// <summary>
        /// The custom routing URL slug (e.g., "/", "about-us", "services/enterprise", "https://portal.client.com").
        /// </summary>
        [MaxLength(500)]
        [Display(Name = "Direct Url")]
        public string? DirectUrl { get; set; }

        /// <summary>
        /// When true, clicking this menu or page item directly navigates to the DirectUrl (internal or external)
        /// bypassing the internal section-rendering pipeline.
        /// </summary>
        [Display(Name = "Enable Direct Url")]
        public bool EnableDirectUrl { get; set; } = false;

        /// <summary>
        /// Explicit positioning of this page within the navigation layout (First/Left, Middle/Center, Last/Right, or Top Utility Bar).
        /// Navigation items are grouped first by MenuPosition, then sorted by SortOrder within that group.
        /// </summary>
        [Display(Name = "Menu Zone Position")]
        public MenuPosition MenuPosition { get; set; } = MenuPosition.First;

        /// <summary>
        /// Sorting order for the page within its menu position zone and lists.
        /// </summary>
        [Display(Name = "Menu Sort Order")]
        public int SortOrder { get; set; } = 0;

        /// <summary>
        /// Toggle visibility to publish or unpublish this page.
        /// </summary>
        public bool Publish { get; set; } = true;

        /// <summary>
        /// Flags if the page requires member/staff authentication to view (Security/Protected Page).
        /// </summary>
        [Display(Name = "Security Protected Page")]
        public bool SecurityPage { get; set; } = false;

        /// <summary>
        /// Optional foreign key linking to a PageCategory for menu dropdown grouping.
        /// If null, page appears as a standalone top-level menu link.
        /// </summary>
        public Guid? PageCategoryId { get; set; }

        /// <summary>
        /// Navigation property to the parent PageCategory.
        /// </summary>
        [ForeignKey("PageCategoryId")]
        public PageCategory? PageCategory { get; set; }

        /// <summary>
        /// Optional banner or hero image URL for this page.
        /// </summary>
        [MaxLength(1000)]
        public string? ImageUrl { get; set; }

        /// <summary>
        /// Storage key for the banner image.
        /// </summary>
        [MaxLength(250)]
        public string? ImageKey { get; set; }

        /// <summary>
        /// Toggle visibility in the website top utility bar (e.g. beside contact info / social icons).
        /// </summary>
        [Display(Name = "Show In Top Bar")]
        public bool ShowInTopBar { get; set; } = false;

        /// <summary>
        /// Explicit sorting position within the website top utility bar.
        /// </summary>
        [Display(Name = "Top Bar Sort Order")]
        public int TopBarSortOrder { get; set; } = 0;

        /// <summary>
        /// Toggle visibility in the primary navigation header menu as a standalone item.
        /// </summary>
        [Display(Name = "Show In Main Menu")]
        public bool ShowInMainMenu { get; set; } = true;

        /// <summary>
        /// Explicit sorting position within the primary navigation header menu.
        /// Defaults to SortOrder when 0.
        /// </summary>
        [Display(Name = "Main Menu Sort Order")]
        public int MainMenuSortOrder { get; set; } = 0;

        /// <summary>
        /// Toggle visibility inside category dropdown menus.
        /// Applicable when PageCategoryId is assigned.
        /// </summary>
        [Display(Name = "Show In Menu Dropdown")]
        public bool ShowInMenuDropDown { get; set; } = true;

        /// <summary>
        /// Explicit sorting position within the category dropdown menu.
        /// </summary>
        [Display(Name = "Dropdown Sort Order")]
        public int DropdownSortOrder { get; set; } = 0;

        /// <summary>
        /// Toggle visibility as a link item in the website footer columns (under its Category or Tagged group).
        /// </summary>
        [Display(Name = "Show In Footer")]
        public bool ShowInFooter { get; set; } = true;

        /// <summary>
        /// Explicit sorting position within its footer column.
        /// </summary>
        [Display(Name = "Footer Sort Order")]
        public int FooterSortOrder { get; set; } = 0;

        /// <summary>
        /// Toggle visibility in the bottom compliance / legal bar row beside copyright.
        /// Completely independent from category or column placement.
        /// </summary>
        [Display(Name = "Show In Footer Bottom")]
        public bool ShowInFooterBottom { get; set; } = false;

        /// <summary>
        /// Explicit sorting position in the bottom compliance / footer bottom bar row.
        /// </summary>
        [Display(Name = "Footer Bottom Sort Order")]
        public int FooterBottomSortOrder { get; set; } = 0;

        /// <summary>
        /// Flags this page as an official legal compliance document (e.g., Privacy Policy, Terms &amp; Conditions, Cookie Policy).
        /// Retained for backward compatibility with {{#each LegalPages}} tokens.
        /// </summary>
        [Display(Name = "Is Legal Document")]
        public bool IsLegal { get; set; } = false;

        /// <summary>
        /// Flags this page as an official Call-to-Action button in website navigation menus (navbars).
        /// When true, surfaced to {{#each MenuCtaButtons}} in menu templates.
        /// </summary>
        [Display(Name = "Is Menu CTA Button")]
        public bool IsMenuCTA { get; set; } = false;

        /// <summary>
        /// Custom display text for the Menu CTA button (e.g., "Get Started", "Donate Now", "Client Portal").
        /// </summary>
        [MaxLength(100)]
        [Display(Name = "Menu CTA Button Text")]
        public string? MenuCtaText { get; set; }

        /// <summary>
        /// Target URL destination for the Menu CTA button.
        /// </summary>
        [MaxLength(500)]
        [Display(Name = "Menu CTA URL")]
        public string? MenuCtaUrl { get; set; }

        /// <summary>
        /// Visual style class for the Menu CTA button: "primary", "outline", "accent", "gradient".
        /// </summary>
        [MaxLength(50)]
        [Display(Name = "Menu CTA Style")]
        public string? MenuCtaStyle { get; set; } = "primary";

        /// <summary>
        /// Comma-separated list of free-form tags used for arbitrary page grouping (e.g., "quick-links,solutions,popular").
        /// Enables custom groupings in templates via {{#each TaggedPages "tag-name"}} (e.g. custom footer link columns).
        /// </summary>
        [MaxLength(500)]
        [Display(Name = "Tags")]
        public string? Tags { get; set; }

        /// <summary>
        /// Optional custom CSS class string applied to this page's menu links, dropdown items, and navigation buttons (e.g. "nav-highlight", "text-gradient", "badge-pill").
        /// Injected into templates via {{ CustomClass }}.
        /// </summary>
        [MaxLength(200)]
        [Display(Name = "Custom CSS Class")]
        public string? CustomClass { get; set; }

        // ── Breaking News Ribbon Ticker ──

        /// <summary>
        /// Controls whether this web page is featured in the live Breaking News Ribbon Ticker.
        /// </summary>
        [Display(Name = "Add To Ribbon")]
        public bool AddToRibon { get; set; } = false;

        /// <summary>
        /// Optional custom display headline overriding the standard page title in the marquee ticker.
        /// </summary>
        [MaxLength(250)]
        [Display(Name = "Ribbon Custom Headline")]
        public string? RibonCustomDisplayTitle { get; set; }

        /// <summary>
        /// Numerical sort index ordering this page within the ticker marquee stream.
        /// </summary>
        [Display(Name = "Ribbon Sort Order")]
        public int RibonSortOrder { get; set; } = 0;

        /// <summary>
        /// Used for sub-page hierarchy; linking this page as a child of a main page.
        /// </summary>
        [Display(Name = "Main Parent Page")]
        public Guid? MainPageId { get; set; }

        /// <summary>
        /// Custom SEO page title for Google &amp; browser tab.
        /// </summary>
        [MaxLength(250)]
        [Display(Name = "Meta Title")]
        public string? MetaTitle { get; set; }

        /// <summary>
        /// SEO meta description for search engine snippets &amp; social sharing cards.
        /// </summary>
        [MaxLength(500)]
        [Display(Name = "Meta Description")]
        public string? MetaDescription { get; set; }

        /// <summary>
        /// Target SEO search keywords.
        /// </summary>
        [MaxLength(500)]
        [Display(Name = "Meta Keywords")]
        public string? MetaKeywords { get; set; }

        /// <summary>
        /// When false (default), AI automatically synthesizes and updates page SEO metadata (Meta Title, Description, Keywords)
        /// upon page creation or section content updates. When true, AI auto-updates are disabled to preserve manual SEO copy.
        /// </summary>
        [Display(Name = "Disable AI Auto-Fill")]
        public bool DisableAiAutoFill { get; set; } = false;

        /// <summary>
        /// Live page visit counter powering analytics &amp; most visited metrics.
        /// </summary>
        public long ViewCount { get; set; } = 0;

        /// <summary>
        /// Page creation timestamp in UTC.
        /// </summary>
        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Last updated timestamp in UTC.
        /// </summary>
        public DateTime? UpdatedAtUtc { get; set; }

        /// <summary>
        /// Navigation collection of ordered layout blocks/sections on this page.
        /// </summary>
        public ICollection<PageSection> PageSections { get; set; } = new List<PageSection>();

        /// <summary>
        /// Navigation collection of secondary shared sections linked to this page via WebPageSectionLink.
        /// </summary>
        public ICollection<WebPageSectionLink> SectionLinks { get; set; } = new List<WebPageSectionLink>();

        /// <summary>
        /// Total number of layout sections attached to this web page. Computed / non-persisted property.
        /// </summary>
        [NotMapped]
        public int SectionCount { get; set; }
    }
}
