using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Ozikol.Central.Services;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Areas.Centralwks.Pages.Templates
{
    /// <summary>
    /// PageModel for extracting, auditing, previewing, and importing modular section templates
    /// from live website URLs directly into the Central Master Marketplace.
    /// Manages dual-series group codes (Suite-level and Page-level) and single/batch publishing.
    /// </summary>
    public class ImportModel : PageModel
    {
        private readonly ISectionsBuilderClientService _sectionsBuilderClient;
        private readonly MasterCatalogDbContext _dbContext;
        private readonly ILogger<ImportModel> _logger;

        public ImportModel(
            ISectionsBuilderClientService sectionsBuilderClient,
            MasterCatalogDbContext dbContext,
            ILogger<ImportModel> logger)
        {
            _sectionsBuilderClient = sectionsBuilderClient;
            _dbContext = dbContext;
            _logger = logger;
            ExtractorBaseUrl = _sectionsBuilderClient.GetExtractorBaseUrl();
        }

        /// <summary>
        /// Currently active extraction tab: "url" (Live Website URL) or "source" (Paste Page Source / HTML).
        /// </summary>
        [BindProperty]
        public string ActiveTab { get; set; } = "url";

        /// <summary>
        /// Target website URL to crawl and decompose into modular sections.
        /// </summary>
        [BindProperty]
        public string TargetUrl { get; set; } = string.Empty;

        /// <summary>
        /// Custom design theme suite name (e.g. "Apex Modern Suite", "Bexon Corporate").
        /// </summary>
        [BindProperty]
        public string SuiteName { get; set; } = string.Empty;

        /// <summary>
        /// Brand identity name to use for dynamic template debranding.
        /// </summary>
        [BindProperty]
        public string BrandName { get; set; } = string.Empty;

        /// <summary>
        /// Whether to automatically discover and crawl subpages found in the navigation menu.
        /// </summary>
        [BindProperty]
        public bool CrawlSubpages { get; set; } = true;

        /// <summary>
        /// Maximum number of discovered subpages to process.
        /// </summary>
        [BindProperty]
        public int MaxSubpages { get; set; } = 5;

        /// <summary>
        /// JSON array of user-selected page URLs to extract (when using 2-step discovery flow).
        /// </summary>
        [BindProperty]
        public string? SelectedPageUrlsJson { get; set; }

        /// <summary>
        /// Current active studio step (1 = Input, 2 = Inspect Code & Assets Workbench, 3/4 = Sliced Sections & Preview, 5 = Install).
        /// </summary>
        [BindProperty]
        public int CurrentStep { get; set; } = 1;

        /// <summary>
        /// Raw HTML page source pasted directly from "View Source" / Ctrl+U.
        /// </summary>
        [BindProperty]
        public string? HtmlSource { get; set; }

        /// <summary>
        /// Optional base URL for resolving relative image and asset paths in pasted HTML source.
        /// </summary>
        [BindProperty]
        public string? SourceBaseUrl { get; set; }

        /// <summary>
        /// Custom suite name for pasted page source.
        /// </summary>
        [BindProperty]
        public string? SourceSuiteName { get; set; }

        /// <summary>
        /// Brand identity name for debranding pasted page source.
        /// </summary>
        [BindProperty]
        public string? SourceBrandName { get; set; }

        /// <summary>
        /// Optional custom or raw stylesheet CSS pasted by the user.
        /// </summary>
        [BindProperty]
        public string? SourceCustomCss { get; set; }

        /// <summary>
        /// Edited HTML from Step 2 Workbench.
        /// </summary>
        [BindProperty]
        public string? EditedHtmlSource { get; set; }

        /// <summary>
        /// JSON array of edited stylesheets from Step 2 Workbench.
        /// </summary>
        [BindProperty]
        public string? EditedStylesheetsJson { get; set; }

        /// <summary>
        /// Inspected raw assets result for Step 2 Workbench.
        /// </summary>
        public RawAssetsInspectResponseDto? InspectResult { get; set; }

        /// <summary>
        /// Serialized JSON of inspected raw assets.
        /// </summary>
        public string InspectResultJson { get; set; } = "null";

        /// <summary>
        /// The base URL of the Python extractor service for live iframe sandboxes.
        /// </summary>
        public string ExtractorBaseUrl { get; set; } = "http://localhost:8001";

        /// <summary>
        /// Stored or active extraction result containing all modular sections and discovered pages.
        /// </summary>
        public SectionsBuilderResponseDto? ExtractionResult { get; set; }

        /// <summary>
        /// Serialized JSON of the entire extraction result for client-side filtering and preview state.
        /// </summary>
        public string ExtractionResultJson { get; set; } = "null";

        /// <summary>
        /// Status or error messages.
        /// </summary>
        [TempData]
        public string? StatusMessage { get; set; }

        public string? ErrorMessage { get; set; }

        /// <summary>
        /// Handles HTTP GET requests to prepare the import studio.
        /// </summary>
        public void OnGet()
        {
            // Initial view state
        }

        /// <summary>
        /// AJAX endpoint for rapidly discovering all menu pages from the website URL without slicing sections.
        /// </summary>
        public async Task<IActionResult> OnPostDiscoverPagesAsync([FromBody] DiscoverPagesRequest request, CancellationToken cancellationToken)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Url))
            {
                return BadRequest(new { success = false, message = "Target URL is required for page discovery." });
            }

            try
            {
                var discoveryResult = await _sectionsBuilderClient.DiscoverPagesAsync(request.Url.Trim(), cancellationToken);
                if (discoveryResult == null)
                {
                    return BadRequest(new { success = false, message = "No pages could be discovered from this website." });
                }

                return new JsonResult(new
                {
                    success = true,
                    sourceUrl = discoveryResult.SourceUrl,
                    totalPages = discoveryResult.TotalPages,
                    pages = discoveryResult.Pages,
                    message = discoveryResult.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to discover menu pages for {Url}", request.Url);
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// Handles HTTP POST requests to crawl the target URL and extract modular sections.
        /// </summary>
        public async Task<IActionResult> OnPostExtractAsync(CancellationToken cancellationToken)
        {
            ActiveTab = "url";
            if (string.IsNullOrWhiteSpace(TargetUrl))
            {
                ErrorMessage = "Please provide a valid website URL to extract.";
                return Page();
            }

            try
            {
                _logger.LogInformation("Starting live website extraction for: {Url}", TargetUrl);

                List<string>? selectedUrls = null;
                if (!string.IsNullOrWhiteSpace(SelectedPageUrlsJson))
                {
                    try
                    {
                        selectedUrls = JsonSerializer.Deserialize<List<string>>(SelectedPageUrlsJson);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Could not deserialize SelectedPageUrlsJson; continuing with default crawl.");
                    }
                }

                var request = new SectionsBuilderRequestDto
                {
                    Url = TargetUrl.Trim(),
                    SuiteName = string.IsNullOrWhiteSpace(SuiteName) ? null : SuiteName.Trim(),
                    BrandName = string.IsNullOrWhiteSpace(BrandName) ? "Enterprise Workspace" : BrandName.Trim(),
                    CrawlSubpages = CrawlSubpages,
                    MaxSubpages = Math.Clamp(MaxSubpages, 1, 20),
                    SelectedPageUrls = selectedUrls,
                    DeepDebrand = true,
                    IncludeCodeInjections = true
                };

                ExtractionResult = await _sectionsBuilderClient.ExtractSectionsFromUrlAsync(request, cancellationToken);

                if (ExtractionResult != null)
                {
                    ExtractionResultJson = JsonSerializer.Serialize(ExtractionResult, new JsonSerializerOptions
                    {
                        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                        Encoder = System.Text.Encodings.Web.JavaScriptEncoder.Default,
                        WriteIndented = false
                    });

                    StatusMessage = $"Extraction complete! Discovered {ExtractionResult.TotalPages} pages and extracted {ExtractionResult.TotalSections} modular sections.";
                }
                else
                {
                    ErrorMessage = "Extraction service did not return any sections. Please check the URL and try again.";
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Website extraction failed for {Url}", TargetUrl);
                ErrorMessage = $"Extraction failed: {ex.Message}";
            }

            return Page();
        }

        /// <summary>
        /// Handles HTTP POST requests to slice modular sections directly from raw HTML page source in real time.
        /// </summary>
        public async Task<IActionResult> OnPostExtractFromSourceAsync(CancellationToken cancellationToken)
        {
            ActiveTab = "source";
            if (string.IsNullOrWhiteSpace(HtmlSource))
            {
                ErrorMessage = "Please paste the raw HTML page source to extract.";
                return Page();
            }

            try
            {
                _logger.LogInformation("Starting direct page source extraction.");

                var request = new SectionsBuilderFromSourceRequestDto
                {
                    HtmlSource = HtmlSource.Trim(),
                    BaseUrl = string.IsNullOrWhiteSpace(SourceBaseUrl) ? null : SourceBaseUrl.Trim(),
                    SuiteName = string.IsNullOrWhiteSpace(SourceSuiteName) ? "Pasted Source Suite" : SourceSuiteName.Trim(),
                    BrandName = string.IsNullOrWhiteSpace(SourceBrandName) ? "Enterprise Workspace" : SourceBrandName.Trim(),
                    CustomCss = string.IsNullOrWhiteSpace(SourceCustomCss) ? null : SourceCustomCss.Trim(),
                    DeepDebrand = true,
                    IncludeCodeInjections = true
                };

                ExtractionResult = await _sectionsBuilderClient.ExtractSectionsFromSourceAsync(request, cancellationToken);

                if (ExtractionResult != null)
                {
                    ExtractionResultJson = JsonSerializer.Serialize(ExtractionResult, new JsonSerializerOptions
                    {
                        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                        Encoder = System.Text.Encodings.Web.JavaScriptEncoder.Default,
                        WriteIndented = false
                    });

                    StatusMessage = $"Direct source extraction complete! Sliced {ExtractionResult.TotalSections} modular sections in < 0.2s.";
                }
                else
                {
                    ErrorMessage = "Source extraction did not return any sections. Please verify the HTML markup.";
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Direct page source extraction failed");
                ErrorMessage = $"Source extraction failed: {ex.Message}";
            }

            return Page();
        }

        /// <summary>
        /// Step 2 Handler: Fetches and inspects all raw HTML markup, CSS stylesheets, JS scripts, and Fonts.
        /// </summary>
        public async Task<IActionResult> OnPostInspectAssetsAsync(CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(HtmlSource))
            {
                ErrorMessage = "Please paste the HTML page source or upload a file.";
                CurrentStep = 1;
                return Page();
            }

            try
            {
                _logger.LogInformation("Inspecting raw assets for base URL: {BaseUrl}", SourceBaseUrl);

                var request = new RawAssetsInspectRequestDto
                {
                    HtmlSource = HtmlSource.Trim(),
                    BaseUrl = string.IsNullOrWhiteSpace(SourceBaseUrl) ? null : SourceBaseUrl.Trim(),
                    SuiteName = string.IsNullOrWhiteSpace(SourceSuiteName) ? "Pasted Source Suite" : SourceSuiteName.Trim(),
                    BrandName = string.IsNullOrWhiteSpace(SourceBrandName) ? "Enterprise Workspace" : SourceBrandName.Trim()
                };

                InspectResult = await _sectionsBuilderClient.InspectRawAssetsAsync(request, cancellationToken);

                if (InspectResult != null)
                {
                    InspectResultJson = JsonSerializer.Serialize(InspectResult, new JsonSerializerOptions
                    {
                        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                        Encoder = System.Text.Encodings.Web.JavaScriptEncoder.Default,
                        WriteIndented = false
                    });

                    CurrentStep = 2;
                    StatusMessage = $"Fetched {InspectResult.Stylesheets.Count} stylesheets ({InspectResult.TotalCssKb} KB) and {InspectResult.Scripts.Count} scripts ready for inspection.";
                }
                else
                {
                    ErrorMessage = "Failed to inspect raw assets. Please check the markup and URL.";
                    CurrentStep = 1;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to inspect raw assets");
                ErrorMessage = $"Asset inspection failed: {ex.Message}";
                CurrentStep = 1;
            }

            return Page();
        }

        /// <summary>
        /// Step 3 & 4 Handler: Slices confirmed/edited HTML & CSS from Step 2 into modular sections.
        /// </summary>
        public async Task<IActionResult> OnPostSliceAndScopeAsync(CancellationToken cancellationToken)
        {
            var html = !string.IsNullOrWhiteSpace(EditedHtmlSource) ? EditedHtmlSource : HtmlSource;

            if (string.IsNullOrWhiteSpace(html))
            {
                ErrorMessage = "HTML page source is missing. Please start from Step 1.";
                CurrentStep = 1;
                return Page();
            }

            try
            {
                _logger.LogInformation("Slicing and scoping modular sections from Step 2 Workbench.");

                List<RawAssetItemDto>? parsedStylesheets = null;
                if (!string.IsNullOrWhiteSpace(EditedStylesheetsJson))
                {
                    try
                    {
                        parsedStylesheets = JsonSerializer.Deserialize<List<RawAssetItemDto>>(EditedStylesheetsJson, new JsonSerializerOptions
                        {
                            PropertyNameCaseInsensitive = true
                        });
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Could not deserialize EditedStylesheetsJson; continuing with default.");
                    }
                }

                var request = new SliceAndScopeRequestDto
                {
                    HtmlSource = html.Trim(),
                    Stylesheets = parsedStylesheets,
                    CustomCss = string.IsNullOrWhiteSpace(SourceCustomCss) ? null : SourceCustomCss.Trim(),
                    BaseUrl = string.IsNullOrWhiteSpace(SourceBaseUrl) ? null : SourceBaseUrl.Trim(),
                    SuiteName = string.IsNullOrWhiteSpace(SourceSuiteName) ? "Source Suite" : SourceSuiteName.Trim(),
                    BrandName = string.IsNullOrWhiteSpace(SourceBrandName) ? "Enterprise Workspace" : SourceBrandName.Trim(),
                    DeepDebrand = true,
                    IncludeCodeInjections = true
                };

                ExtractionResult = await _sectionsBuilderClient.SliceAndScopeAsync(request, cancellationToken);

                if (ExtractionResult != null)
                {
                    ExtractionResultJson = JsonSerializer.Serialize(ExtractionResult, new JsonSerializerOptions
                    {
                        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                        Encoder = System.Text.Encodings.Web.JavaScriptEncoder.Default,
                        WriteIndented = false
                    });

                    CurrentStep = 3;
                    StatusMessage = $"Sliced {ExtractionResult.TotalSections} modular sections with precision scoped CSS!";
                }
                else
                {
                    ErrorMessage = "Section slicing did not return any sections. Please check your HTML.";
                    CurrentStep = 2;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to slice and scope sections");
                ErrorMessage = $"Section slicing failed: {ex.Message}";
                CurrentStep = 2;
            }

            return Page();
        }

        /// <summary>
        /// AJAX endpoint for publishing an individual extracted section into the Master Catalog Marketplace.
        /// </summary>
        public async Task<IActionResult> OnPostPublishSectionAsync([FromBody] PublishSectionRequest payload)
        {
            if (payload == null || string.IsNullOrWhiteSpace(payload.HtmlTemplate))
            {
                return BadRequest(new { success = false, message = "Invalid section payload." });
            }

            try
            {
                var cleanCategoryKey = string.IsNullOrWhiteSpace(payload.CategoryKey) ? "body" : payload.CategoryKey.Trim().ToLowerInvariant();
                var cleanVariant = string.IsNullOrWhiteSpace(payload.VariantCode) 
                    ? $"Sec_{Guid.NewGuid().ToString("N")[..8]}" 
                    : payload.VariantCode.Trim();

                // 1. Ensure Marketplace Category exists in master DB
                var category = await _dbContext.MasterMarketplaceCategories
                    .FirstOrDefaultAsync(c => c.CategoryKey.ToLower() == cleanCategoryKey);

                if (category == null)
                {
                    category = new MasterMarketplaceCategory
                    {
                        Id = Guid.NewGuid(),
                        CategoryKey = cleanCategoryKey,
                        Name = GetCategoryDisplayName(cleanCategoryKey),
                        Description = $"Marketplace section category for {cleanCategoryKey} components.",
                        Icon = GetCategoryIcon(cleanCategoryKey),
                        SortOrder = GetCategorySortOrder(cleanCategoryKey),
                        IsActive = true
                    };
                    _dbContext.MasterMarketplaceCategories.Add(category);
                    await _dbContext.SaveChangesAsync();
                }

                // 2. Check if variant code exists (update existing or create new)
                var existingTemplate = await _dbContext.MasterMarketplaceTemplates
                    .FirstOrDefaultAsync(t => t.VariantCode.ToLower() == cleanVariant.ToLower());

                if (existingTemplate != null)
                {
                    existingTemplate.Name = payload.Name.Trim();
                    existingTemplate.CategoryId = category.Id;
                    existingTemplate.CategoryKey = category.CategoryKey;
                    existingTemplate.Tag = string.IsNullOrWhiteSpace(payload.SuiteCode) ? "modern" : payload.SuiteCode.Trim().ToLowerInvariant();
                    existingTemplate.Badge = string.IsNullOrWhiteSpace(payload.Badge) ? "New" : payload.Badge.Trim();
                    existingTemplate.Description = payload.Description?.Trim();
                    existingTemplate.HtmlTemplate = payload.HtmlTemplate;
                    existingTemplate.CssStyles = payload.ScopedCss ?? string.Empty;
                    existingTemplate.JsScript = string.IsNullOrWhiteSpace(payload.JsScript) ? null : payload.JsScript;
                    existingTemplate.DefaultSectionListsJson = payload.SampleContentJson;
                    existingTemplate.UpdatedUtc = DateTime.UtcNow;
                    existingTemplate.IsActive = true;
                }
                else
                {
                    var newTemplate = new MasterMarketplaceTemplate
                    {
                        Id = Guid.NewGuid(),
                        CategoryId = category.Id,
                        CategoryKey = category.CategoryKey,
                        Name = payload.Name.Trim(),
                        VariantCode = cleanVariant,
                        Tag = string.IsNullOrWhiteSpace(payload.SuiteCode) ? "modern" : payload.SuiteCode.Trim().ToLowerInvariant(),
                        Badge = string.IsNullOrWhiteSpace(payload.Badge) ? "New" : payload.Badge.Trim(),
                        Description = payload.Description?.Trim(),
                        ThumbnailGradient = string.IsNullOrWhiteSpace(payload.ThumbnailGradient)
                            ? "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)"
                            : payload.ThumbnailGradient.Trim(),
                        PreviewIcon = string.IsNullOrWhiteSpace(payload.PreviewIcon) ? "widgets" : payload.PreviewIcon.Trim(),
                        PreviewTitle = payload.Name.Trim(),
                        HtmlTemplate = payload.HtmlTemplate,
                        CssStyles = payload.ScopedCss ?? string.Empty,
                        JsScript = string.IsNullOrWhiteSpace(payload.JsScript) ? null : payload.JsScript,
                        DefaultSectionListsJson = payload.SampleContentJson,
                        Version = "1.0.0",
                        SortOrder = payload.SortOrder,
                        IsActive = true,
                        CreatedUtc = DateTime.UtcNow,
                        UpdatedUtc = DateTime.UtcNow
                    };
                    _dbContext.MasterMarketplaceTemplates.Add(newTemplate);
                }

                await _dbContext.SaveChangesAsync();

                return new JsonResult(new
                {
                    success = true,
                    variantCode = cleanVariant,
                    message = $"Template '{payload.Name}' successfully published to the Central Marketplace."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to publish section to marketplace");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        /// <summary>
        /// AJAX endpoint for publishing multiple selected sections in a single batch.
        /// </summary>
        public async Task<IActionResult> OnPostPublishBatchAsync([FromBody] PublishBatchRequest payload)
        {
            if (payload == null || payload.Sections == null || !payload.Sections.Any())
            {
                return BadRequest(new { success = false, message = "No sections selected for batch publishing." });
            }

            try
            {
                int publishedCount = 0;
                var suiteCode = string.IsNullOrWhiteSpace(payload.SuiteCode) ? "suite_extracted" : payload.SuiteCode.Trim().ToLowerInvariant();

                // Pre-fetch all marketplace categories
                var allCategories = await _dbContext.MasterMarketplaceCategories.ToListAsync();

                foreach (var sec in payload.Sections)
                {
                    var catKey = string.IsNullOrWhiteSpace(sec.CategoryKey) ? "body" : sec.CategoryKey.Trim().ToLowerInvariant();
                    var category = allCategories.FirstOrDefault(c => c.CategoryKey.ToLower() == catKey);

                    if (category == null)
                    {
                        category = new MasterMarketplaceCategory
                        {
                            Id = Guid.NewGuid(),
                            CategoryKey = catKey,
                            Name = GetCategoryDisplayName(catKey),
                            Description = $"Marketplace category for {catKey} components.",
                            Icon = GetCategoryIcon(catKey),
                            SortOrder = GetCategorySortOrder(catKey),
                            IsActive = true
                        };
                        _dbContext.MasterMarketplaceCategories.Add(category);
                        await _dbContext.SaveChangesAsync();
                        allCategories.Add(category);
                    }

                    var cleanVariant = string.IsNullOrWhiteSpace(sec.VariantCode)
                        ? $"Sec_{Guid.NewGuid().ToString("N")[..8]}"
                        : sec.VariantCode.Trim();

                    var existing = await _dbContext.MasterMarketplaceTemplates
                        .FirstOrDefaultAsync(t => t.VariantCode.ToLower() == cleanVariant.ToLower());

                    if (existing != null)
                    {
                        existing.Name = sec.Name.Trim();
                        existing.CategoryId = category.Id;
                        existing.CategoryKey = category.CategoryKey;
                        existing.Tag = suiteCode;
                        existing.Badge = string.IsNullOrWhiteSpace(sec.Badge) ? "New" : sec.Badge.Trim();
                        existing.Description = sec.Description?.Trim();
                        existing.HtmlTemplate = sec.HtmlTemplate;
                        existing.CssStyles = sec.ScopedCss ?? string.Empty;
                        existing.JsScript = string.IsNullOrWhiteSpace(sec.JsScript) ? null : sec.JsScript;
                        existing.DefaultSectionListsJson = sec.SampleContentJson;
                        existing.UpdatedUtc = DateTime.UtcNow;
                        existing.IsActive = true;
                    }
                    else
                    {
                        var newTemplate = new MasterMarketplaceTemplate
                        {
                            Id = Guid.NewGuid(),
                            CategoryId = category.Id,
                            CategoryKey = category.CategoryKey,
                            Name = sec.Name.Trim(),
                            VariantCode = cleanVariant,
                            Tag = suiteCode,
                            Badge = string.IsNullOrWhiteSpace(sec.Badge) ? "New" : sec.Badge.Trim(),
                            Description = sec.Description?.Trim(),
                            ThumbnailGradient = string.IsNullOrWhiteSpace(sec.ThumbnailGradient)
                                ? "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)"
                                : sec.ThumbnailGradient.Trim(),
                            PreviewIcon = string.IsNullOrWhiteSpace(sec.PreviewIcon) ? "widgets" : sec.PreviewIcon.Trim(),
                            PreviewTitle = sec.Name.Trim(),
                            HtmlTemplate = sec.HtmlTemplate,
                            CssStyles = sec.ScopedCss ?? string.Empty,
                            JsScript = string.IsNullOrWhiteSpace(sec.JsScript) ? null : sec.JsScript,
                            DefaultSectionListsJson = sec.SampleContentJson,
                            Version = "1.0.0",
                            SortOrder = sec.SortOrder,
                            IsActive = true,
                            CreatedUtc = DateTime.UtcNow,
                            UpdatedUtc = DateTime.UtcNow
                        };
                        _dbContext.MasterMarketplaceTemplates.Add(newTemplate);
                    }

                    publishedCount++;
                }

                await _dbContext.SaveChangesAsync();

                return new JsonResult(new
                {
                    success = true,
                    publishedCount = publishedCount,
                    message = $"Successfully published {publishedCount} sections to the Master Marketplace under suite '{suiteCode}'."
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to execute batch publish to marketplace");
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        private static string GetCategoryDisplayName(string key) => key switch
        {
            "menu" => "Navigation & Menus",
            "hero" => "Hero Sliders & Banners",
            "body" => "Body Features & Content Blocks",
            "footer" => "Footers",
            "blog" => "Blogs & News",
            "ecommerce" => "E-Commerce Showcases",
            "breadcrumb" => "Breadcrumbs & Page Headers",
            _ => "Modular Sections"
        };

        private static string GetCategoryIcon(string key) => key switch
        {
            "menu" => "menu",
            "hero" => "view_carousel",
            "body" => "view_quilt",
            "footer" => "dock_to_bottom",
            "blog" => "newspaper",
            "ecommerce" => "shopping_bag",
            "breadcrumb" => "linear_scale",
            _ => "widgets"
        };

        private static int GetCategorySortOrder(string key) => key switch
        {
            "menu" => 1,
            "hero" => 2,
            "body" => 3,
            "footer" => 4,
            "blog" => 5,
            "ecommerce" => 6,
            "breadcrumb" => 7,
            _ => 10
        };
    }

    public class PublishSectionRequest
    {
        public string Name { get; set; } = string.Empty;
        public string VariantCode { get; set; } = string.Empty;
        public string CategoryKey { get; set; } = "body";
        public string SuiteCode { get; set; } = string.Empty;
        public string? Badge { get; set; } = "New";
        public string? Description { get; set; }
        public string HtmlTemplate { get; set; } = string.Empty;
        public string? ScopedCss { get; set; }
        public string? JsScript { get; set; }
        public string? SampleContentJson { get; set; }
        public string PreviewIcon { get; set; } = "widgets";
        public string ThumbnailGradient { get; set; } = "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)";
        public int SortOrder { get; set; } = 10;
    }

    public class PublishBatchRequest
    {
        public string SuiteCode { get; set; } = string.Empty;
        public List<PublishSectionRequest> Sections { get; set; } = new();
    }

    public class DiscoverPagesRequest
    {
        public string Url { get; set; } = string.Empty;
    }
}
