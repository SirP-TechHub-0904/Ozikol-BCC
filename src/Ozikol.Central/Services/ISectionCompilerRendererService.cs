using System.Collections.Generic;

namespace Ozikol.Central.Services
{
    /// <summary>
    /// Contract for the Section & Page Compiler Renderer service.
    /// Handles server-side Mustache token hydration, scoped CSS isolation, dependency bundling,
    /// and full HTML5 standalone document compilation for sections and composite pages.
    /// </summary>
    public interface ISectionCompilerRendererService
    {
        /// <summary>
        /// Hydrates dynamic Mustache tokens, hierarchical menus, repeated lists, and brand identity fields against JSON data.
        /// </summary>
        /// <param name="htmlTemplate">Raw HTML template containing Mustache placeholders.</param>
        /// <param name="sampleContentJson">Mock or tenant content JSON string.</param>
        /// <param name="brand">Optional brand identity override.</param>
        /// <returns>Hydrated HTML markup.</returns>
        string HydrateTemplate(string htmlTemplate, string? sampleContentJson, BrandIdentityRenderDto? brand = null);

        /// <summary>
        /// Compiles a single modular section into a complete, standalone HTML5 document.
        /// </summary>
        /// <param name="request">Section compilation parameters including HTML, scoped CSS, JS, and dependencies.</param>
        /// <returns>Complete standalone HTML document ready for rendering or sandboxing.</returns>
        SectionRenderResult RenderSection(SectionRenderRequest request);

        /// <summary>
        /// Assembles multiple modular sections into a unified, zero-collision Full Page HTML document.
        /// </summary>
        /// <param name="request">Full page compilation parameters including ordered sections and theme options.</param>
        /// <returns>Complete Full Page HTML document.</returns>
        PageRenderResult RenderPage(PageRenderRequest request);
    }

    /// <summary>
    /// Request model for compiling a single modular section.
    /// </summary>
    public class SectionRenderRequest
    {
        /// <summary>
        /// Name or label of the section.
        /// </summary>
        public string? Name { get; set; }

        /// <summary>
        /// Unique variant code or identifier (e.g. "hero-01", "navbar-02").
        /// </summary>
        public string? VariantCode { get; set; }

        /// <summary>
        /// Raw HTML template with Mustache tokens.
        /// </summary>
        public string? HtmlTemplate { get; set; }

        /// <summary>
        /// Component scoped CSS styles.
        /// </summary>
        public string? ScopedCss { get; set; }

        /// <summary>
        /// Component interactive JavaScript script.
        /// </summary>
        public string? JsScript { get; set; }

        /// <summary>
        /// Content JSON or mock data string for token hydration.
        /// </summary>
        public string? SampleContentJson { get; set; }

        /// <summary>
        /// List of required external third-party library keys (e.g., "bootstrap", "swiper", "aos").
        /// </summary>
        public List<string>? RequiredLibraries { get; set; }

        /// <summary>
        /// Canvas theme mode ("light" or "dark"). Defaults to "light".
        /// </summary>
        public string CanvasTheme { get; set; } = "light";

        /// <summary>
        /// Optional URL to suite-level compiled stylesheet.
        /// </summary>
        public string? SuiteCompiledCssUrl { get; set; }

        /// <summary>
        /// Optional Brand Identity overrides.
        /// </summary>
        public BrandIdentityRenderDto? Brand { get; set; }
    }

    /// <summary>
    /// Output result of compiling a modular section.
    /// </summary>
    public class SectionRenderResult
    {
        /// <summary>
        /// Indicates whether compilation succeeded.
        /// </summary>
        public bool Success { get; set; }

        /// <summary>
        /// Fully compiled, standalone HTML5 document.
        /// </summary>
        public string CompiledHtmlDocument { get; set; } = string.Empty;

        /// <summary>
        /// Hydrated section markup without outer HTML5 boilerplate.
        /// </summary>
        public string HydratedSectionHtml { get; set; } = string.Empty;

        /// <summary>
        /// List of resolved external CSS CDN links.
        /// </summary>
        public List<string> ResolvedCssUrls { get; set; } = new();

        /// <summary>
        /// List of resolved external JavaScript CDN links.
        /// </summary>
        public List<string> ResolvedJsUrls { get; set; } = new();
    }

    /// <summary>
    /// Request model for compiling a full composite page from multiple sections.
    /// </summary>
    public class PageRenderRequest
    {
        /// <summary>
        /// Page title for the HTML head.
        /// </summary>
        public string PageTitle { get; set; } = "Modular Website Preview";

        /// <summary>
        /// Canvas theme mode ("light" or "dark").
        /// </summary>
        public string CanvasTheme { get; set; } = "light";

        /// <summary>
        /// Optional URL to suite-level compiled stylesheet.
        /// </summary>
        public string? SuiteCompiledCssUrl { get; set; }

        /// <summary>
        /// Ordered collection of sections to assemble sequentially.
        /// </summary>
        public List<SectionRenderRequest> Sections { get; set; } = new();

        /// <summary>
        /// Optional Brand Identity overrides.
        /// </summary>
        public BrandIdentityRenderDto? Brand { get; set; }
    }

    /// <summary>
    /// Output result of compiling a full composite page.
    /// </summary>
    public class PageRenderResult
    {
        /// <summary>
        /// Indicates whether compilation succeeded.
        /// </summary>
        public bool Success { get; set; }

        /// <summary>
        /// Fully compiled, standalone Full Page HTML5 document.
        /// </summary>
        public string CompiledPageDocument { get; set; } = string.Empty;

        /// <summary>
        /// Total number of sections assembled.
        /// </summary>
        public int TotalSectionsCount { get; set; }
    }

    /// <summary>
    /// Brand identity metadata used for resolving brand-level tokens in templates.
    /// </summary>
    public class BrandIdentityRenderDto
    {
        /// <summary>Primary logo image URL.</summary>
        public string? LogoUrl { get; set; }

        /// <summary>White / inverted logo image URL for dark surfaces.</summary>
        public string? WhiteLogoUrl { get; set; }

        /// <summary>Favicon URL.</summary>
        public string? FaviconUrl { get; set; }

        /// <summary>Main website root URL.</summary>
        public string? WebsiteUrl { get; set; }

        /// <summary>Brand or organization display name.</summary>
        public string? Name { get; set; }

        /// <summary>Login / Sign-in button text.</summary>
        public string? LoginButtonText { get; set; }

        /// <summary>Registration / Get Started button text.</summary>
        public string? RegisterButtonText { get; set; }

        /// <summary>Contact phone number.</summary>
        public string? PhoneNumber { get; set; }

        /// <summary>Contact email address.</summary>
        public string? EmailAddress { get; set; }

        /// <summary>Physical office address.</summary>
        public string? Address { get; set; }
    }
}
