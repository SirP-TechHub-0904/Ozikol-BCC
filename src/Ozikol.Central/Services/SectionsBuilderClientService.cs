using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Ozikol.Central.Services
{
    /// <summary>
    /// Request payload for initiating a section-based URL extraction job.
    /// </summary>
    public class SectionsBuilderRequestDto
    {
        [JsonPropertyName("url")]
        public string Url { get; set; } = string.Empty;

        [JsonPropertyName("suite_name")]
        public string? SuiteName { get; set; } = "Extracted Suite";

        [JsonPropertyName("brand_name")]
        public string? BrandName { get; set; } = "Enterprise Workspace";

        [JsonPropertyName("crawl_subpages")]
        public bool CrawlSubpages { get; set; } = true;

        [JsonPropertyName("max_subpages")]
        public int MaxSubpages { get; set; } = 5;

        [JsonPropertyName("selected_page_urls")]
        public List<string>? SelectedPageUrls { get; set; }

        [JsonPropertyName("deep_debrand")]
        public bool DeepDebrand { get; set; } = true;

        [JsonPropertyName("include_code_injections")]
        public bool IncludeCodeInjections { get; set; } = true;
    }

    /// <summary>
    /// Request payload for extracting sections directly from raw HTML page source.
    /// </summary>
    public class SectionsBuilderFromSourceRequestDto
    {
        [JsonPropertyName("html_source")]
        public string HtmlSource { get; set; } = string.Empty;

        [JsonPropertyName("base_url")]
        public string? BaseUrl { get; set; }

        [JsonPropertyName("suite_name")]
        public string? SuiteName { get; set; } = "Pasted Source Suite";

        [JsonPropertyName("brand_name")]
        public string? BrandName { get; set; } = "Enterprise Workspace";

        [JsonPropertyName("custom_css")]
        public string? CustomCss { get; set; }

        [JsonPropertyName("page_title")]
        public string? PageTitle { get; set; }

        [JsonPropertyName("page_slug")]
        public string? PageSlug { get; set; }

        [JsonPropertyName("deep_debrand")]
        public bool DeepDebrand { get; set; } = true;

        [JsonPropertyName("include_code_injections")]
        public bool IncludeCodeInjections { get; set; } = true;
    }

    /// <summary>
    /// Request payload for tweaking an individual section's layout, CSS, and placeholders using AI.
    /// </summary>
    public class SectionAiTweakRequestDto
    {
        [JsonPropertyName("section_key")]
        public string SectionKey { get; set; } = string.Empty;

        [JsonPropertyName("category_key")]
        public string CategoryKey { get; set; } = "bodysections";

        [JsonPropertyName("title")]
        public string Title { get; set; } = string.Empty;

        [JsonPropertyName("html_template")]
        public string HtmlTemplate { get; set; } = string.Empty;

        [JsonPropertyName("scoped_css")]
        public string? ScopedCss { get; set; }

        [JsonPropertyName("user_prompt")]
        public string UserPrompt { get; set; } = string.Empty;

        [JsonPropertyName("provider")]
        public string Provider { get; set; } = "Gemini";
    }

    /// <summary>
    /// Response payload from an AI section tweak operation.
    /// </summary>
    public class SectionAiTweakResponseDto
    {
        [JsonPropertyName("success")]
        public bool Success { get; set; }

        [JsonPropertyName("html_template")]
        public string HtmlTemplate { get; set; } = string.Empty;

        [JsonPropertyName("scoped_css")]
        public string ScopedCss { get; set; } = string.Empty;

        [JsonPropertyName("placeholders")]
        public List<string> Placeholders { get; set; } = new List<string>();

        [JsonPropertyName("explanation")]
        public string? Explanation { get; set; }

        [JsonPropertyName("error_message")]
        public string? ErrorMessage { get; set; }
    }

    /// <summary>
    /// Request payload for filtering and tree-shaking CSS/JS rules using AI without inventing new code.
    /// </summary>
    public class SectionAiPrecisionFilterRequestDto
    {
        [JsonPropertyName("section_key")]
        public string SectionKey { get; set; } = string.Empty;

        [JsonPropertyName("category_key")]
        public string CategoryKey { get; set; } = "body";

        [JsonPropertyName("title")]
        public string Title { get; set; } = string.Empty;

        [JsonPropertyName("html_template")]
        public string HtmlTemplate { get; set; } = string.Empty;

        [JsonPropertyName("raw_css")]
        public string RawCss { get; set; } = string.Empty;

        [JsonPropertyName("raw_js")]
        public string? RawJs { get; set; }

        [JsonPropertyName("container_class")]
        public string ContainerClass { get; set; } = string.Empty;

        [JsonPropertyName("provider")]
        public string Provider { get; set; } = "Gemini";
    }

    /// <summary>
    /// Response payload from an AI precision filter / tree-shaking operation.
    /// </summary>
    public class SectionAiPrecisionFilterResponseDto
    {
        [JsonPropertyName("success")]
        public bool Success { get; set; }

        [JsonPropertyName("scoped_css")]
        public string ScopedCss { get; set; } = string.Empty;

        [JsonPropertyName("js_script")]
        public string? JsScript { get; set; }

        [JsonPropertyName("original_lines_css")]
        public int OriginalLinesCss { get; set; }

        [JsonPropertyName("filtered_lines_css")]
        public int FilteredLinesCss { get; set; }

        [JsonPropertyName("reduction_percentage")]
        public string ReductionPercentage { get; set; } = string.Empty;

        [JsonPropertyName("explanation")]
        public string? Explanation { get; set; }

        [JsonPropertyName("error_message")]
        public string? ErrorMessage { get; set; }
    }

    /// <summary>
    /// Request payload for complete AI section cleaning: HTML tokenization, CSS tree-shaking, JS extraction, and mock JSON synthesis.
    /// </summary>
    public class SectionAiFullCleanRequestDto
    {
        /// <summary>
        /// Optional database staging draft entity ID.
        /// </summary>
        [JsonPropertyName("id")]
        public string? Id { get; set; }

        [JsonPropertyName("section_key")]
        public string SectionKey { get; set; } = string.Empty;

        [JsonPropertyName("category_key")]
        public string CategoryKey { get; set; } = "body";

        [JsonPropertyName("title")]
        public string Title { get; set; } = string.Empty;

        [JsonPropertyName("html_template")]
        public string HtmlTemplate { get; set; } = string.Empty;

        [JsonPropertyName("raw_css")]
        public string RawCss { get; set; } = string.Empty;

        [JsonPropertyName("raw_js")]
        public string? RawJs { get; set; }

        [JsonPropertyName("container_class")]
        public string ContainerClass { get; set; } = string.Empty;

        /// <summary>
        /// User's natural-language refinement instruction (e.g. "Add dark mode styling and make buttons rounded").
        /// </summary>
        [JsonPropertyName("user_prompt")]
        public string? UserPrompt { get; set; }

        [JsonPropertyName("provider")]
        public string Provider { get; set; } = "Gemini";
    }

    /// <summary>
    /// Response payload from a complete AI section cleaning operation.
    /// </summary>
    public class SectionAiFullCleanResponseDto
    {
        [JsonPropertyName("success")]
        public bool Success { get; set; }

        [JsonPropertyName("html_template")]
        public string HtmlTemplate { get; set; } = string.Empty;

        [JsonPropertyName("scoped_css")]
        public string ScopedCss { get; set; } = string.Empty;

        [JsonPropertyName("js_script")]
        public string? JsScript { get; set; }

        [JsonPropertyName("sample_content_json")]
        public string? SampleContentJson { get; set; }

        [JsonPropertyName("placeholders")]
        public List<string> Placeholders { get; set; } = new List<string>();

        [JsonPropertyName("original_lines_css")]
        public int OriginalLinesCss { get; set; }

        [JsonPropertyName("filtered_lines_css")]
        public int FilteredLinesCss { get; set; }

        [JsonPropertyName("reduction_percentage")]
        public string ReductionPercentage { get; set; } = string.Empty;

        [JsonPropertyName("explanation")]
        public string? Explanation { get; set; }

        [JsonPropertyName("error_message")]
        public string? ErrorMessage { get; set; }
    }

    /// <summary>
    /// Request payload for decomposing an uploaded UI screenshot or Figma mockup into modular sections.
    /// </summary>
    public class SectionsBuilderFromImageRequestDto
    {
        [JsonPropertyName("image_url")]
        public string ImageUrl { get; set; } = string.Empty;

        [JsonPropertyName("suite_name")]
        public string? SuiteName { get; set; } = "Visual Mockup Suite";

        [JsonPropertyName("brand_name")]
        public string? BrandName { get; set; } = "Enterprise Workspace";

        [JsonPropertyName("provider")]
        public string Provider { get; set; } = "Gemini";
    }

    /// <summary>
    /// Request payload for discovering menu pages.
    /// </summary>
    public class DiscoverPagesRequestDto
    {
        [JsonPropertyName("url")]
        public string Url { get; set; } = string.Empty;
    }

    /// <summary>
    /// Summary of a single discovered page from the navigation menu.
    /// </summary>
    public class DiscoveredPageSummaryDto
    {
        [JsonPropertyName("title")]
        public string Title { get; set; } = string.Empty;

        [JsonPropertyName("slug")]
        public string Slug { get; set; } = string.Empty;

        [JsonPropertyName("url")]
        public string Url { get; set; } = string.Empty;

        [JsonPropertyName("is_home")]
        public bool IsHome { get; set; } = false;

        [JsonPropertyName("menu_sort_order")]
        public int MenuSortOrder { get; set; } = 10;
    }

    /// <summary>
    /// Response returned from the page discovery endpoint.
    /// </summary>
    public class DiscoverPagesResponseDto
    {
        [JsonPropertyName("source_url")]
        public string SourceUrl { get; set; } = string.Empty;

        [JsonPropertyName("total_pages")]
        public int TotalPages { get; set; }

        [JsonPropertyName("pages")]
        public List<DiscoveredPageSummaryDto> Pages { get; set; } = new();

        [JsonPropertyName("message")]
        public string Message { get; set; } = string.Empty;
    }

    /// <summary>
    /// Represents an individual modular section extracted by the Python engine.
    /// </summary>
    public class ExtractedSectionDto
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("category_key")]
        public string CategoryKey { get; set; } = "body";

        [JsonPropertyName("variant_code")]
        public string VariantCode { get; set; } = string.Empty;

        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("label")]
        public string Label { get; set; } = string.Empty;

        [JsonPropertyName("description")]
        public string? Description { get; set; }

        [JsonPropertyName("dom_tag")]
        public string DomTag { get; set; } = "section";

        [JsonPropertyName("html_template")]
        public string HtmlTemplate { get; set; } = string.Empty;

        [JsonPropertyName("scoped_css")]
        public string ScopedCss { get; set; } = string.Empty;

        [JsonPropertyName("js_script")]
        public string? JsScript { get; set; }

        [JsonPropertyName("sample_content_json")]
        public string? SampleContentJson { get; set; }

        [JsonPropertyName("preview_icon")]
        public string PreviewIcon { get; set; } = "widgets";

        [JsonPropertyName("thumbnail_gradient")]
        public string ThumbnailGradient { get; set; } = "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)";

        [JsonPropertyName("parent_page_slugs")]
        public List<string> ParentPageSlugs { get; set; } = new();

        [JsonPropertyName("required_libraries")]
        public List<string> RequiredLibraries { get; set; } = new();

        [JsonPropertyName("required_css_libraries")]
        public List<string> RequiredCssLibraries { get; set; } = new();

        [JsonPropertyName("required_js_libraries")]
        public List<string> RequiredJsLibraries { get; set; } = new();

        [JsonPropertyName("required_css_urls")]
        public List<string> RequiredCssUrls { get; set; } = new();

        [JsonPropertyName("required_js_urls")]
        public List<string> RequiredJsUrls { get; set; } = new();

        [JsonPropertyName("sort_order")]
        public int SortOrder { get; set; } = 10;

        // UI state tracking
        public bool IsSelected { get; set; } = true;
        public bool IsPublished { get; set; } = false;
        public string? CustomBadge { get; set; } = "New";
    }

    /// <summary>
    /// Represents a subpage discovered in the website navigation.
    /// </summary>
    public class DiscoveredPageDto
    {
        [JsonPropertyName("title")]
        public string Title { get; set; } = string.Empty;

        [JsonPropertyName("slug")]
        public string Slug { get; set; } = string.Empty;

        [JsonPropertyName("url")]
        public string Url { get; set; } = string.Empty;

        [JsonPropertyName("is_home")]
        public bool IsHome { get; set; } = false;

        [JsonPropertyName("menu_sort_order")]
        public int MenuSortOrder { get; set; } = 10;

        [JsonPropertyName("section_ids")]
        public List<string> SectionIds { get; set; } = new();
    }

    /// <summary>
    /// Code injection tag discovered during crawl.
    /// </summary>
    public class ImportableTagDto
    {
        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("zone")]
        public string Zone { get; set; } = "head";

        [JsonPropertyName("tag_type")]
        public string TagType { get; set; } = "link_stylesheet";

        [JsonPropertyName("content")]
        public string Content { get; set; } = string.Empty;

        [JsonPropertyName("sort_order")]
        public int SortOrder { get; set; } = 10;
    }

    /// <summary>
    /// The complete response returned from the Python SectionsBuilder API.
    /// </summary>
    public class SectionsBuilderResponseDto
    {
        [JsonPropertyName("job_id")]
        public string JobId { get; set; } = string.Empty;

        [JsonPropertyName("status")]
        public string Status { get; set; } = "complete";

        [JsonPropertyName("group_code")]
        public string GroupCode { get; set; } = string.Empty;

        [JsonPropertyName("suite_name")]
        public string SuiteName { get; set; } = string.Empty;

        [JsonPropertyName("source_url")]
        public string SourceUrl { get; set; } = string.Empty;

        [JsonPropertyName("total_sections")]
        public int TotalSections { get; set; }

        [JsonPropertyName("total_pages")]
        public int TotalPages { get; set; }

        [JsonPropertyName("pages")]
        public List<DiscoveredPageDto> Pages { get; set; } = new();

        [JsonPropertyName("sections")]
        public List<ExtractedSectionDto> Sections { get; set; } = new();

        [JsonPropertyName("code_injections")]
        public List<ImportableTagDto> CodeInjections { get; set; } = new();

        [JsonPropertyName("category_breakdown")]
        public Dictionary<string, int> CategoryBreakdown { get; set; } = new();

        [JsonPropertyName("message")]
        public string Message { get; set; } = string.Empty;
    }

    /// <summary>
    /// Interface for interacting with the Python HTML Extractor and Section Builder API.
    /// </summary>
    public interface ISectionsBuilderClientService
    {
        /// <summary>
        /// Rapidly crawls the navigation menu of a website to discover all internal pages.
        /// </summary>
        Task<DiscoverPagesResponseDto?> DiscoverPagesAsync(
            string targetUrl, 
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Sends a URL extraction request to the Python microservice and returns the structured section package.
        /// </summary>
        Task<SectionsBuilderResponseDto?> ExtractSectionsFromUrlAsync(
            SectionsBuilderRequestDto request, 
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Instantly extracts, decomposes, and scopes modular sections directly from raw HTML page source.
        /// </summary>
        Task<SectionsBuilderResponseDto?> ExtractSectionsFromSourceAsync(
            SectionsBuilderFromSourceRequestDto request, 
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Step 2: Fetches and inspects all raw HTML markup, external CSS stylesheets, JS scripts, and Fonts.
        /// </summary>
        Task<RawAssetsInspectResponseDto?> InspectRawAssetsAsync(
            RawAssetsInspectRequestDto request, 
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Step 3 & 4: Slices confirmed/edited HTML source and stylesheets into modular sections with precision scoped CSS.
        /// </summary>
        Task<SectionsBuilderResponseDto?> SliceAndScopeAsync(
            SliceAndScopeRequestDto request, 
            CancellationToken cancellationToken = default);

        /// <summary>
        /// Returns the base URL of the Python HTML Extractor service.
        /// </summary>
        string GetExtractorBaseUrl();
    }

    /// <summary>
    /// Represents an individual raw asset (CSS stylesheet, JS script, or font) for the Step 2 Workbench.
    /// </summary>
    public class RawAssetItemDto
    {
        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("url")]
        public string Url { get; set; } = string.Empty;

        [JsonPropertyName("asset_type")]
        public string AssetType { get; set; } = "css";

        [JsonPropertyName("size_kb")]
        public double SizeKb { get; set; } = 0.0;

        [JsonPropertyName("content")]
        public string? Content { get; set; }
    }

    /// <summary>
    /// Request payload for Step 2 Raw Asset Inspection.
    /// </summary>
    public class RawAssetsInspectRequestDto
    {
        [JsonPropertyName("html_source")]
        public string HtmlSource { get; set; } = string.Empty;

        [JsonPropertyName("base_url")]
        public string? BaseUrl { get; set; }

        [JsonPropertyName("suite_name")]
        public string? SuiteName { get; set; } = "Pasted Source Suite";

        [JsonPropertyName("brand_name")]
        public string? BrandName { get; set; } = "Enterprise Workspace";
    }

    /// <summary>
    /// Response returned from the Step 2 Raw Asset Inspection endpoint.
    /// </summary>
    public class RawAssetsInspectResponseDto
    {
        [JsonPropertyName("job_id")]
        public string JobId { get; set; } = string.Empty;

        [JsonPropertyName("base_url")]
        public string? BaseUrl { get; set; }

        [JsonPropertyName("suite_name")]
        public string SuiteName { get; set; } = string.Empty;

        [JsonPropertyName("brand_name")]
        public string BrandName { get; set; } = string.Empty;

        [JsonPropertyName("page_title")]
        public string PageTitle { get; set; } = string.Empty;

        [JsonPropertyName("page_slug")]
        public string PageSlug { get; set; } = string.Empty;

        [JsonPropertyName("html_source")]
        public string HtmlSource { get; set; } = string.Empty;

        [JsonPropertyName("stylesheets")]
        public List<RawAssetItemDto> Stylesheets { get; set; } = new();

        [JsonPropertyName("scripts")]
        public List<RawAssetItemDto> Scripts { get; set; } = new();

        [JsonPropertyName("fonts")]
        public List<string> Fonts { get; set; } = new();

        [JsonPropertyName("total_css_kb")]
        public double TotalCssKb { get; set; }

        [JsonPropertyName("total_js_kb")]
        public double TotalJsKb { get; set; }

        [JsonPropertyName("message")]
        public string Message { get; set; } = string.Empty;
    }

    /// <summary>
    /// Request payload for Step 3 & 4 Slicing and Scoping modular sections.
    /// </summary>
    public class SliceAndScopeRequestDto
    {
        [JsonPropertyName("html_source")]
        public string HtmlSource { get; set; } = string.Empty;

        [JsonPropertyName("combined_css")]
        public string? CombinedCss { get; set; }

        [JsonPropertyName("custom_css")]
        public string? CustomCss { get; set; }

        [JsonPropertyName("stylesheets")]
        public List<RawAssetItemDto>? Stylesheets { get; set; }

        [JsonPropertyName("base_url")]
        public string? BaseUrl { get; set; }

        [JsonPropertyName("suite_name")]
        public string? SuiteName { get; set; } = "Source Suite";

        [JsonPropertyName("brand_name")]
        public string? BrandName { get; set; } = "Enterprise Workspace";

        [JsonPropertyName("page_title")]
        public string? PageTitle { get; set; } = "Custom Page";

        [JsonPropertyName("page_slug")]
        public string? PageSlug { get; set; } = "custom-page";

        [JsonPropertyName("deep_debrand")]
        public bool DeepDebrand { get; set; } = true;

        [JsonPropertyName("include_code_injections")]
        public bool IncludeCodeInjections { get; set; } = true;
    }

    /// <summary>
    /// HTTP client implementation communicating with Ozikol-Html-Extractor microservice.
    /// </summary>
    public class SectionsBuilderClientService : ISectionsBuilderClientService
    {
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;
        private readonly ILogger<SectionsBuilderClientService> _logger;

        public SectionsBuilderClientService(
            HttpClient httpClient,
            IConfiguration configuration,
            ILogger<SectionsBuilderClientService> logger)
        {
            _httpClient = httpClient;
            _configuration = configuration;
            _logger = logger;

            var baseUrl = GetExtractorBaseUrl();
            if (!string.IsNullOrWhiteSpace(baseUrl) && _httpClient.BaseAddress == null)
            {
                _httpClient.BaseAddress = new Uri(baseUrl.TrimEnd('/') + "/");
                _httpClient.Timeout = TimeSpan.FromMinutes(10);
            }
        }

        public string GetExtractorBaseUrl()
        {
            var envUrl = Environment.GetEnvironmentVariable("HTML_EXTRACTOR_API_URL");
            if (!string.IsNullOrWhiteSpace(envUrl))
                return envUrl;

            var configUrl = _configuration["HtmlExtractor:ApiUrl"];
            if (!string.IsNullOrWhiteSpace(configUrl))
                return configUrl;

            return "http://localhost:8001";
        }

        public async Task<DiscoverPagesResponseDto?> DiscoverPagesAsync(
            string targetUrl, 
            CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(targetUrl))
            {
                throw new ArgumentException("Target URL cannot be empty.", nameof(targetUrl));
            }

            try
            {
                _logger.LogInformation("Sending page discovery request to Python service for URL: {Url}", targetUrl);

                var response = await _httpClient.PostAsJsonAsync(
                    "sections-builder-from-url/discover-pages", 
                    new DiscoverPagesRequestDto { Url = targetUrl.Trim() }, 
                    cancellationToken);

                if (!response.IsSuccessStatusCode)
                {
                    var errBody = await response.Content.ReadAsStringAsync(cancellationToken);
                    _logger.LogError("DiscoverPages API returned status {StatusCode}: {Error}", response.StatusCode, errBody);
                    throw new InvalidOperationException($"Discovery failed ({response.StatusCode}): {errBody}");
                }

                var result = await response.Content.ReadFromJsonAsync<DiscoverPagesResponseDto>(
                    cancellationToken: cancellationToken);

                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to discover pages with SectionsBuilder API at {BaseUrl}", _httpClient.BaseAddress);
                throw;
            }
        }

        public async Task<SectionsBuilderResponseDto?> ExtractSectionsFromUrlAsync(
            SectionsBuilderRequestDto request, 
            CancellationToken cancellationToken = default)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Url))
            {
                throw new ArgumentException("Target URL cannot be empty.", nameof(request));
            }

            try
            {
                _logger.LogInformation("Sending extraction request to Python service for URL: {Url}", request.Url);

                var response = await _httpClient.PostAsJsonAsync(
                    "sections-builder-from-url/extract", 
                    request, 
                    cancellationToken);

                if (!response.IsSuccessStatusCode)
                {
                    var errBody = await response.Content.ReadAsStringAsync(cancellationToken);
                    _logger.LogError("SectionsBuilder API returned status {StatusCode}: {Error}", response.StatusCode, errBody);
                    throw new InvalidOperationException($"Extraction service failed ({response.StatusCode}): {errBody}");
                }

                var result = await response.Content.ReadFromJsonAsync<SectionsBuilderResponseDto>(
                    cancellationToken: cancellationToken);

                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to communicate with SectionsBuilder API at {BaseUrl}", _httpClient.BaseAddress);
                throw;
            }
        }

        public async Task<SectionsBuilderResponseDto?> ExtractSectionsFromSourceAsync(
            SectionsBuilderFromSourceRequestDto request, 
            CancellationToken cancellationToken = default)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.HtmlSource))
            {
                throw new ArgumentException("HTML source cannot be empty.", nameof(request));
            }

            try
            {
                _logger.LogInformation("Sending raw page source extraction request to Python service.");

                var response = await _httpClient.PostAsJsonAsync(
                    "sections-builder-from-url/extract-from-source", 
                    request, 
                    cancellationToken);

                if (!response.IsSuccessStatusCode)
                {
                    var errBody = await response.Content.ReadAsStringAsync(cancellationToken);
                    _logger.LogError("SectionsBuilder Source API returned status {StatusCode}: {Error}", response.StatusCode, errBody);
                    throw new InvalidOperationException($"Source extraction failed ({response.StatusCode}): {errBody}");
                }

                var result = await response.Content.ReadFromJsonAsync<SectionsBuilderResponseDto>(
                    cancellationToken: cancellationToken);

                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to communicate with SectionsBuilder Source API at {BaseUrl}", _httpClient.BaseAddress);
                throw;
            }
        }

        public async Task<RawAssetsInspectResponseDto?> InspectRawAssetsAsync(
            RawAssetsInspectRequestDto request, 
            CancellationToken cancellationToken = default)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.HtmlSource))
            {
                throw new ArgumentException("HTML source cannot be empty.", nameof(request));
            }

            try
            {
                _logger.LogInformation("Sending raw assets inspection request to Python service.");

                var response = await _httpClient.PostAsJsonAsync(
                    "sections-builder-from-url/inspect-assets", 
                    request, 
                    cancellationToken);

                if (!response.IsSuccessStatusCode)
                {
                    var errBody = await response.Content.ReadAsStringAsync(cancellationToken);
                    _logger.LogError("InspectAssets API returned status {StatusCode}: {Error}", response.StatusCode, errBody);
                    throw new InvalidOperationException($"Asset inspection failed ({response.StatusCode}): {errBody}");
                }

                var result = await response.Content.ReadFromJsonAsync<RawAssetsInspectResponseDto>(
                    cancellationToken: cancellationToken);

                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to communicate with InspectAssets API at {BaseUrl}", _httpClient.BaseAddress);
                throw;
            }
        }

        public async Task<SectionsBuilderResponseDto?> SliceAndScopeAsync(
            SliceAndScopeRequestDto request, 
            CancellationToken cancellationToken = default)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.HtmlSource))
            {
                throw new ArgumentException("HTML source cannot be empty.", nameof(request));
            }

            try
            {
                _logger.LogInformation("Sending slice and scope request to Python service.");

                var response = await _httpClient.PostAsJsonAsync(
                    "sections-builder-from-url/slice-and-scope", 
                    request, 
                    cancellationToken);

                if (!response.IsSuccessStatusCode)
                {
                    var errBody = await response.Content.ReadAsStringAsync(cancellationToken);
                    _logger.LogError("SliceAndScope API returned status {StatusCode}: {Error}", response.StatusCode, errBody);
                    throw new InvalidOperationException($"Slice and scope failed ({response.StatusCode}): {errBody}");
                }

                var result = await response.Content.ReadFromJsonAsync<SectionsBuilderResponseDto>(
                    cancellationToken: cancellationToken);

                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to communicate with SliceAndScope API at {BaseUrl}", _httpClient.BaseAddress);
                throw;
            }
        }
    }
}
