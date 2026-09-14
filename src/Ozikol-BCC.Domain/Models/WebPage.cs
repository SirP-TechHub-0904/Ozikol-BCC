using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Represents a single navigable page on the website.
    /// </summary>
    public class WebPage
    {
        /// <summary>
        /// Primary Key.
        /// </summary>
        public Guid Id { get; set; }

        /// <summary>
        /// The display title of the webpage.
        /// </summary>
        public string? Title { get; set; }

        /// <summary>
        /// Navigation property to all layout blocks/sections on this page.
        /// </summary>
        public ICollection<PageSection>? PageSections { get; set; }

        /// <summary>
        /// Sorting position for the page.
        /// </summary>
        public int SortOrder { get; set; }

        /// <summary>
        /// Boolean toggle to show/hide the page.
        /// </summary>
        public bool Publish { get; set; }

        /// <summary>
        /// Flags if the page requires authentication to view.
        /// </summary>
        public bool SecurityPage { get; set; }

        /// <summary>
        /// Foreign key linking to PageCategory for menu grouping.
        /// </summary>
        public Guid? PageCategoryId { get; set; }

        /// <summary>
        /// Navigation property to the parent PageCategory.
        /// </summary>
        public PageCategory? PageCategory { get; set; }

        /// <summary>
        /// Banner/Header image URL for the page.
        /// </summary>
        public string? ImageUrl { get; set; }

        /// <summary>
        /// Cloudinary key for the banner image.
        /// </summary>
        public string? ImageKey { get; set; }

        /// <summary>
        /// Toggle visibility for the top navigation bar.
        /// </summary>
        [Display(Name = "Show In Main Top")]
        public bool ShowInMainTop { get; set; }

        /// <summary>
        /// Toggle visibility inside dropdown menus.
        /// </summary>
        [Display(Name = "Show In Menu DropDown")]
        public bool ShowInMenuDropDown { get; set; }

        /// <summary>
        /// Toggle visibility in the main menu.
        /// </summary>
        [Display(Name = "Show In Main Menu")]
        public bool ShowInMainMenu { get; set; }

        /// <summary>
        /// Toggle visibility in the footer area.
        /// </summary>
        [Display(Name = "Show In Footer")]
        public bool ShowInFooter { get; set; }

        /// <summary>
        /// Flags this page as an official legal compliance document (e.g., Privacy Policy, Terms &amp; Conditions, Cookie Policy).
        /// Legal documents are surfaced to {{#each LegalPages}} and legal tokens in footer bottom bars.
        /// </summary>
        [Display(Name = "Is Legal Document")]
        public bool IsLegal { get; set; } = false;

        /// <summary>
        /// Flags this page as an official Call-to-Action button in website navigation menus (navbars).
        /// Multiple pages can have this enabled. When true, surfaced to {{#each MenuCtaButtons}} in menu templates.
        /// </summary>
        [Display(Name = "Is Menu CTA Button")]
        public bool IsMenuCTA { get; set; } = false;

        /// <summary>
        /// Toggle to use a custom URL route instead of the default ID-based route.
        /// </summary>
        [Display(Name = "Enable Direct Url")]
        public bool EnableDirectUrl { get; set; }

        /// <summary>
        /// The custom routing URL string (e.g., 'about-us').
        /// </summary>
        [Display(Name = "Direct Url")]
        public string? DirectUrl { get; set; }

        /// <summary>
        /// Enum mapping for sorting origin.
        /// </summary>
        [Display(Name = "Home Sort From")]
        public HomeSortFrom HomeSortFrom { get; set; }

        /// <summary>
        /// Used for sub-page hierarchy; linking this page as a child of a main page.
        /// </summary>
        [Display(Name = "Main Page")]
        public Guid? MainPageId { get; set; }

        /// <summary>
        /// Custom SEO page title for Google & browser tab.
        /// </summary>
        [Display(Name = "Meta Title")]
        public string? MetaTitle { get; set; }

        /// <summary>
        /// SEO meta description for search engine snippets & social sharing cards.
        /// </summary>
        [Display(Name = "Meta Description")]
        public string? MetaDescription { get; set; }

        /// <summary>
        /// Target SEO search keywords.
        /// </summary>
        [Display(Name = "Meta Keywords")]
        public string? MetaKeywords { get; set; }

        /// <summary>
        /// Live page visit counter powering analytics & most visited metrics.
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
    }
}


