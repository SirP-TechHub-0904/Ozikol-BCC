using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Ozikol_BCC.Application.Dtos.Sections
{
    /// <summary>
    /// Definition of a recognized third-party library asset bundle including CDN stylesheet URLs,
    /// script URLs, and optional global auto-initialization commands.
    /// </summary>
    public class LibraryAssetDefinition
    {
        /// <summary>
        /// Unique canonical identifier for the library (e.g. "bootstrap", "swiper", "aos").
        /// </summary>
        public string Key { get; set; } = string.Empty;

        /// <summary>
        /// Human-readable display label.
        /// </summary>
        public string DisplayName { get; set; } = string.Empty;

        /// <summary>
        /// External CDN stylesheet links required for this library.
        /// </summary>
        public string[] CssUrls { get; set; } = Array.Empty<string>();

        /// <summary>
        /// External CDN script links required for this library in dependency order.
        /// </summary>
        public string[] JsUrls { get; set; } = Array.Empty<string>();

        /// <summary>
        /// Optional global initialization script to run once DOM and libraries are ready (e.g. AOS.init()).
        /// </summary>
        public string? AutoInitJs { get; set; }
    }

    /// <summary>
    /// Section asset payload describing the scoped CSS, isolated JS, and required libraries for a specific section.
    /// </summary>
    public class SectionAssetPayloadDto
    {
        /// <summary>
        /// Unique variant code or identifier (e.g. "hero_split_01").
        /// </summary>
        public string VariantCode { get; set; } = string.Empty;

        /// <summary>
        /// Scoped custom author CSS styles for this section.
        /// </summary>
        public string? ScopedCss { get; set; }

        /// <summary>
        /// Isolated component JavaScript logic for this section.
        /// </summary>
        public string? JsScript { get; set; }

        /// <summary>
        /// List of detected or assigned library keys (e.g. ["bootstrap", "swiper"]).
        /// </summary>
        public List<string>? RequiredLibraries { get; set; }
    }

    /// <summary>
    /// Request DTO for library detection and CDN allocation.
    /// </summary>
    public class DetectLibrariesRequestDto
    {
        /// <summary>
        /// Raw or tokenized HTML markup to inspect for library signatures.
        /// </summary>
        public string HtmlMarkup { get; set; } = string.Empty;

        /// <summary>
        /// Optional JavaScript code to check for programmatic calls (e.g. new Swiper, AOS.init).
        /// </summary>
        public string? JsScript { get; set; }
    }

    /// <summary>
    /// Response DTO containing detected libraries and generated CDN asset tags.
    /// </summary>
    public class DetectLibrariesResponseDto
    {
        /// <summary>
        /// List of detected library keys.
        /// </summary>
        public List<string> DetectedLibraries { get; set; } = new();

        /// <summary>
        /// Deduplicated list of external stylesheet CDN URLs.
        /// </summary>
        public List<string> CssUrls { get; set; } = new();

        /// <summary>
        /// Deduplicated list of external script CDN URLs.
        /// </summary>
        public List<string> JsUrls { get; set; } = new();

        /// <summary>
        /// List of auto-initialization JavaScript commands.
        /// </summary>
        public List<string> AutoInitScripts { get; set; } = new();

        /// <summary>
        /// Pre-rendered HTML markup for the &lt;head&gt; tag containing all &lt;link&gt; tags.
        /// </summary>
        public string HeadHtml { get; set; } = string.Empty;

        /// <summary>
        /// Pre-rendered HTML markup for the end of &lt;body&gt; containing all &lt;script&gt; tags and auto-inits.
        /// </summary>
        public string FooterHtml { get; set; } = string.Empty;
    }

    /// <summary>
    /// Request DTO for AI custom code extraction, scoping, and Ozikol placeholder tokenization.
    /// </summary>
    public class SectionCustomCodeExtractionRequestDto
    {
        /// <summary>
        /// Unique section key or variant name (e.g. "hero_split_01").
        /// </summary>
        public string SectionKey { get; set; } = string.Empty;

        /// <summary>
        /// Container scoping CSS class to isolate styles and scripts (e.g. "sec-variant-hero_split_01").
        /// </summary>
        public string ContainerClass { get; set; } = string.Empty;

        /// <summary>
        /// Category key for contextual token hints (e.g. "hero", "menu", "features", "pricing", "testimonials", "contact", "footer").
        /// </summary>
        public string CategoryKey { get; set; } = string.Empty;

        /// <summary>
        /// The raw sliced HTML markup containing real text, images, and links.
        /// </summary>
        public string HtmlMarkup { get; set; } = string.Empty;

        /// <summary>
        /// The template author's custom stylesheet(s) to extract specific rules from.
        /// </summary>
        public string? RawCustomCss { get; set; }

        /// <summary>
        /// The template author's custom JavaScript script(s) to extract handlers from.
        /// </summary>
        public string? RawCustomJs { get; set; }
    }

    /// <summary>
    /// Response DTO containing the isolated section code, tokenized markup, and extracted real data JSON.
    /// </summary>
    public class SectionCustomCodeExtractionResponseDto
    {
        /// <summary>
        /// Indicates whether the extraction and isolation operation succeeded.
        /// </summary>
        public bool Success { get; set; }

        /// <summary>
        /// Name of the AI provider or engine that performed the extraction (e.g. "Gemini 2.5 Flash", "DeepSeek", "Deterministic AST Fallback").
        /// </summary>
        public string ProviderUsed { get; set; } = string.Empty;

        /// <summary>
        /// The HTML markup with hardcoded text and lists replaced with canonical Ozikol tokens.
        /// </summary>
        [JsonPropertyName("html_template")]
        public string HtmlTemplate { get; set; } = string.Empty;

        /// <summary>
        /// The extracted author CSS rules scoped strictly to the container class.
        /// </summary>
        [JsonPropertyName("scoped_css")]
        public string ScopedCss { get; set; } = string.Empty;

        /// <summary>
        /// The extracted author JavaScript handlers isolated to query elements inside the container.
        /// </summary>
        [JsonPropertyName("js_script")]
        public string JsScript { get; set; } = string.Empty;

        /// <summary>
        /// Structured JSON string containing the real extracted values from the HTML mapped to the tokens.
        /// </summary>
        [JsonPropertyName("sample_content_json")]
        public string ExtractedContentJson { get; set; } = string.Empty;

        /// <summary>
        /// List of placeholder token names present in the template (e.g. ["Title", "Description", "ButtonText", "ButtonLink", "SectionLists"]).
        /// </summary>
        [JsonPropertyName("placeholders")]
        public List<string> Placeholders { get; set; } = new();

        /// <summary>
        /// Automatically detected third-party library dependencies from the HTML markup.
        /// </summary>
        public List<string> DetectedLibraries { get; set; } = new();

        /// <summary>
        /// Diagnostic summary or error details.
        /// </summary>
        public string? Message { get; set; }
    }

    /// <summary>
    /// Request DTO for crawling a live template demo URL, separating vendor CDNs vs. custom author code,
    /// compiling and uploading merged custom stylesheets/scripts to Cloudinary, and optionally slicing sections.
    /// </summary>
    public class TemplateRemoteAssetPipelineRequestDto
    {
        /// <summary>
        /// The public live demo URL to crawl and ingest (e.g. "https://themejunction.net/html/bexon/demo/index.html").
        /// </summary>
        public string DemoUrl { get; set; } = string.Empty;

        /// <summary>
        /// Optional pre-fetched HTML markup. If provided, crawling the demo URL for HTML is bypassed.
        /// </summary>
        public string? PreFetchedHtml { get; set; }

        /// <summary>
        /// Folder name in Cloudinary where compiled assets will be stored (default: "templates/assets").
        /// </summary>
        public string CloudinaryFolder { get; set; } = "templates/assets";

        /// <summary>
        /// When true, uploads the compiled custom CSS and JS bundles to Cloudinary and returns CDN URLs.
        /// </summary>
        public bool UploadToCloudinary { get; set; } = true;

        /// <summary>
        /// When true, automatically slices the page HTML into distinct modular section blocks (header, hero, services, pricing, etc.).
        /// </summary>
        public bool AutoSliceSections { get; set; } = true;

        /// <summary>
        /// Custom prefix or variant slug for section keys (e.g. "bexon_demo").
        /// </summary>
        public string? VariantPrefix { get; set; }
    }

    /// <summary>
    /// Response DTO from the remote asset pipeline containing CDN titles, Cloudinary URLs, merged code, and sliced sections.
    /// </summary>
    public class TemplateRemoteAssetPipelineResponseDto
    {
        /// <summary>
        /// Indicates whether the pipeline execution succeeded.
        /// </summary>
        public bool Success { get; set; }

        /// <summary>
        /// AI provider used during asset classification and section slicing (e.g. "Gemini 2.5 Flash", "DeepSeek", "Deterministic Parser").
        /// </summary>
        public string ProviderUsed { get; set; } = string.Empty;

        /// <summary>
        /// Titles of all third-party vendor libraries recognized on the page (e.g. ["Bootstrap 5.3", "MeanMenu", "NiceSelect", "Animate.css", "Swiper.js v11"]).
        /// </summary>
        public List<string> DetectedCdnTitles { get; set; } = new();

        /// <summary>
        /// Detailed list of detected third-party library definitions with public CDN URLs and auto-initializers.
        /// </summary>
        public List<LibraryAssetDefinition> DetectedLibraries { get; set; } = new();

        /// <summary>
        /// Public Cloudinary CDN URL hosting the unified, compiled author custom CSS bundle.
        /// </summary>
        public string? CompiledCustomCssUrl { get; set; }

        /// <summary>
        /// Public Cloudinary CDN URL hosting the unified, compiled author custom JS bundle.
        /// </summary>
        public string? CompiledCustomJsUrl { get; set; }

        /// <summary>
        /// Raw concatenated and path-resolved string of all author custom stylesheets.
        /// Ready to be fed into SectionCustomCodeExtractorService for per-section rule scoping.
        /// </summary>
        public string RawMergedCustomCss { get; set; } = string.Empty;

        /// <summary>
        /// Raw concatenated string of all author custom JavaScript files.
        /// </summary>
        public string RawMergedCustomJs { get; set; } = string.Empty;

        /// <summary>
        /// Pre-generated &lt;head&gt; HTML containing external vendor CDN links and the compiled Cloudinary CSS link.
        /// </summary>
        public string HeadHtml { get; set; } = string.Empty;

        /// <summary>
        /// Pre-generated &lt;body&gt; footer HTML containing external vendor CDN scripts, auto-initializers, and the compiled Cloudinary JS link.
        /// </summary>
        public string FooterHtml { get; set; } = string.Empty;

        /// <summary>
        /// Distinct modular sections automatically discovered and sliced from the page.
        /// </summary>
        public List<SlicedSectionDto> SlicedSections { get; set; } = new();

        /// <summary>
        /// Informational or error diagnostic message.
        /// </summary>
        public string? Message { get; set; }
    }

    /// <summary>
    /// Represents an individual modular section sliced from the template page HTML.
    /// </summary>
    public class SlicedSectionDto
    {
        /// <summary>
        /// Canonical unique key for the section (e.g. "header_main_01", "hero_slider_01", "pricing_tier_03").
        /// </summary>
        public string SectionKey { get; set; } = string.Empty;

        /// <summary>
        /// Marketplace category key: "menu", "hero", "bodysections", "blogs", "marquee", "contactus", "footer".
        /// </summary>
        public string CategoryKey { get; set; } = "bodysections";

        /// <summary>
        /// Sub-type classification (e.g. "Header", "Hero", "Services", "Pricing", "Testimonials", "Team", "FAQ", "Footer").
        /// </summary>
        public string SectionSubType { get; set; } = "Services";

        /// <summary>
        /// Human-readable title of the section.
        /// </summary>
        public string Title { get; set; } = string.Empty;

        /// <summary>
        /// Primary root container CSS class (e.g. "header-area", "hero-section", "tj-services-area").
        /// </summary>
        public string ContainerClass { get; set; } = string.Empty;

        /// <summary>
        /// Raw sliced HTML markup of this specific section.
        /// </summary>
        public string HtmlMarkup { get; set; } = string.Empty;

        /// <summary>
        /// Relative order of the section on the template page (1, 2, 3...).
        /// </summary>
        public int SortOrder { get; set; } = 1;
    }
}
