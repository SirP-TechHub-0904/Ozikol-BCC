using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol.MasterDomain.Models
{
    /// <summary>
    /// Staging draft entity holding extracted modular sections, tokenized HTML, media-query-aware scoped CSS,
    /// sandboxed JS, token schema, and required library CDN dependencies prior to marketplace publication.
    /// Used by the Multi-Channel Ingestion Studio for multi-turn AI refinements and persistent staging.
    /// Stored strictly in the central Master Catalog database (MasterCatalogDbContext).
    /// </summary>
    [Table("MasterMarketplaceDraftSections")]
    public class MasterMarketplaceDraftSection
    {
        /// <summary>
        /// Unique primary key identifier for the staging section draft.
        /// </summary>
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        /// <summary>
        /// Optional identifier grouping drafts from the same theme suite or extraction batch.
        /// </summary>
        public Guid? DraftSuiteId { get; set; }

        /// <summary>
        /// Display name of the parent theme suite or family (e.g., "Orisa Creative Agency").
        /// </summary>
        [Required]
        [MaxLength(150)]
        public string SuiteName { get; set; } = "Imported Suite";

        /// <summary>
        /// Descriptive title of the modular section (e.g., "Menu Section 1", "Hero Showcase").
        /// </summary>
        [Required]
        [MaxLength(150)]
        public string Name { get; set; } = null!;

        /// <summary>
        /// Unique canonical variant code identifier (e.g., "MENU_01", "BODY_02", "FOOTER_06").
        /// </summary>
        [Required]
        [MaxLength(100)]
        public string VariantCode { get; set; } = null!;

        /// <summary>
        /// Category key (e.g., "menu", "hero", "bodysections", "blog", "contact", "footer").
        /// </summary>
        [Required]
        [MaxLength(50)]
        public string CategoryKey { get; set; } = "bodysections";

        /// <summary>
        /// Optional description summarizing component functionality and layout structure.
        /// </summary>
        [MaxLength(500)]
        public string? Description { get; set; }

        /// <summary>
        /// Pure semantic HTML markup with canonical {{ Mustache }} placeholders.
        /// </summary>
        [Required]
        public string HtmlTemplate { get; set; } = string.Empty;

        /// <summary>
        /// Media-query-aware scoped CSS stylesheet guaranteeing zero style collisions with host themes.
        /// </summary>
        [Required]
        public string ScopedCss { get; set; } = string.Empty;

        /// <summary>
        /// Optional sandboxed component JavaScript execution script (e.g., slider init, mobile nav toggle).
        /// </summary>
        public string? JsScript { get; set; }

        /// <summary>
        /// JSON dictionary containing sample mock data for all token placeholders.
        /// </summary>
        public string? SampleContentJson { get; set; }

        /// <summary>
        /// JSON array of detected third-party CSS/JS CDN library identifiers (e.g., ["swiper", "bootstrap", "fontawesome"]).
        /// </summary>
        public string? RequiredLibrariesJson { get; set; }

        /// <summary>
        /// JSON array of detected third-party CSS library CDN dependencies (e.g., ["bootstrap", "fontawesome", "swiper"]).
        /// </summary>
        public string? RequiredCssLibrariesJson { get; set; }

        /// <summary>
        /// JSON array of detected third-party JS library CDN dependencies (e.g., ["bootstrap", "swiper", "aos"]).
        /// </summary>
        public string? RequiredJsLibrariesJson { get; set; }

        /// <summary>
        /// JSON array of detected Google Font family names.
        /// </summary>
        public string? DetectedFontsJson { get; set; }

        /// <summary>
        /// Ingestion source channel ("HtmlFile", "PastedHtml", "LiveUrl", "VisionAi").
        /// </summary>
        [MaxLength(50)]
        public string SourceChannel { get; set; } = "HtmlFile";

        /// <summary>
        /// Current lifecycle status ("Draft", "RefiningWithAi", "ReadyToPublish", "Published").
        /// </summary>
        [Required]
        [MaxLength(50)]
        public string Status { get; set; } = "Draft";

        /// <summary>
        /// Relative order of the section within the parent suite layout.
        /// </summary>
        public int SortOrder { get; set; } = 0;

        /// <summary>
        /// Timestamp when the draft record was created in UTC.
        /// </summary>
        public DateTime CreatedUtc { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Timestamp when the draft record was last modified in UTC.
        /// </summary>
        public DateTime? UpdatedUtc { get; set; }
    }
}
