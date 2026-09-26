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
}
