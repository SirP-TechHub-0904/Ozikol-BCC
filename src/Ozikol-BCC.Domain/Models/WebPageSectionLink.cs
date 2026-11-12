using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Represents a many-to-many placement junction link connecting a shared PageSection
    /// to a secondary WebPage, allowing a single section (and its repeating child PageSectionLists)
    /// to appear across multiple web pages while maintaining an independent, page-specific sort order.
    /// </summary>
    [Table("WebPageSectionLinks")]
    public class WebPageSectionLink
    {
        /// <summary>
        /// Unique primary key identifier for the page section link record.
        /// </summary>
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        /// <summary>
        /// Foreign key to the target WebPage where this section is linked and rendered.
        /// </summary>
        [Required]
        public Guid WebPageId { get; set; }

        /// <summary>
        /// Navigation property to the linked WebPage.
        /// </summary>
        [ForeignKey(nameof(WebPageId))]
        public WebPage? WebPage { get; set; }

        /// <summary>
        /// Foreign key to the master PageSection being reused across pages.
        /// </summary>
        [Required]
        public Guid PageSectionId { get; set; }

        /// <summary>
        /// Navigation property to the shared master PageSection.
        /// </summary>
        [ForeignKey(nameof(PageSectionId))]
        public PageSection? PageSection { get; set; }

        /// <summary>
        /// Page-specific sort order / placement position of this section on the target WebPage.
        /// Allows a shared FAQ to sit at Position #5 on Home while sitting at Position #2 on Services.
        /// </summary>
        [Display(Name = "Page Sort Order")]
        public int PageSortOrder { get; set; } = 0;

        /// <summary>
        /// Visibility toggle specific to this linked page placement.
        /// </summary>
        [Display(Name = "Is Visible")]
        public bool IsVisible { get; set; } = true;

        /// <summary>
        /// Timestamp in UTC when this multi-page section link was created.
        /// </summary>
        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    }
}

