using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol_BCC.Domain.Models
{
    /// <summary>
    /// Represents an ordered code injection item targeting one of the three critical browser document zones:
    /// 1. "head" - Inside &lt;head&gt; (stylesheets, Google Fonts, meta tags, head analytics, inline styles).
    /// 2. "body_open" - Immediately after the opening &lt;body&gt; tag (GTM noscript, Facebook Pixel noscript, page loaders, SVG sprites).
    /// 3. "footer" - Before the closing &lt;/body&gt; tag (vendor JS bundles, deferred scripts, inline init scripts, chat widgets).
    /// </summary>
    [Table("SiteCodeInjectionTags")]
    public class SiteCodeInjectionTag
    {
        /// <summary>
        /// Unique identifier for this code injection tag.
        /// </summary>
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        /// <summary>
        /// Human-readable label or description (e.g. "Google Tag Manager Head", "Bootstrap 5.3 CDN", "GTM Noscript").
        /// </summary>
        [Required]
        [MaxLength(150)]
        public string Name { get; set; } = null!;

        /// <summary>
        /// Target document zone: "head", "body_open", or "footer".
        /// </summary>
        [Required]
        [MaxLength(20)]
        public string Zone { get; set; } = "head";

        /// <summary>
        /// Specific tag categorization powering editor templates (e.g. "link_stylesheet", "inline_css", "script_url", "inline_script", "meta_tag", "gtm_noscript", "pixel_noscript", "google_fonts", "raw_html").
        /// </summary>
        [Required]
        [MaxLength(50)]
        public string TagType { get; set; } = "raw_html";

        /// <summary>
        /// Raw code content or external URL to be injected into the DOM.
        /// </summary>
        [Required]
        public string Content { get; set; } = null!;

        /// <summary>
        /// Explicit execution / loading order within the target zone (ascending).
        /// Lower numbers execute first.
        /// </summary>
        public int SortOrder { get; set; } = 0;

        /// <summary>
        /// Toggle to enable or disable injection without deleting the record.
        /// </summary>
        public bool IsActive { get; set; } = true;

        /// <summary>
        /// Creation timestamp in UTC.
        /// </summary>
        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Last updated timestamp in UTC.
        /// </summary>
        public DateTime? UpdatedAtUtc { get; set; }
    }
}
