using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Api.Models;
using Ozikol_BCC.Application.Services.Cloudinary;
using Ozikol_BCC.Application.Services.Cloudflare;
using Ozikol_BCC.Infrastructure.TenantSupport;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Domain.Models.Ai;
using Ozikol_BCC.Persistence.EF.SQL;
using Ozikol_BCC.Persistence.EF.SQL.Extensions;
using Ozikol_BCC.Persistence.EF.SQL.Infrastructure;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterDomain.Blueprints;
using Ozikol.MasterPersistence.EF.MasterSQL;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace Ozikol_BCC.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "SuperAdmin,Admin,CmsManager,ContentManager,GlobalEditor,Global Editor,FeatureEditor,Feature Editor,ReadOnly,Read Only")]
    [Tags("Content CMS Suite - Studio Management")]
    public class ContentApiController : ControllerBase
    {
        private readonly DashboardDbContext _context;
        private readonly MasterCatalogDbContext? _masterCatalogDbContext;
        private readonly IMediator _mediator;
        private readonly ICloudinaryService _cloudinaryService;
        private readonly ICloudflareR2StorageService _r2Storage;
        private readonly ITenantProvider? _tenantProvider;
        private readonly Ozikol_BCC.Api.Services.ITemplateSecurityInspectorService _templateSecurityInspector;
        private readonly Ozikol_BCC.Application.Interfaces.Services.IAiSmartAssistService? _aiService;
        private readonly IServiceScopeFactory? _serviceScopeFactory;
        private readonly ILogger<ContentApiController>? _logger;

        public ContentApiController(
            DashboardDbContext context, 
            IMediator mediator, 
            ICloudinaryService cloudinaryService,
            ICloudflareR2StorageService r2Storage,
            ITenantProvider? tenantProvider = null,
            MasterCatalogDbContext? masterCatalogDbContext = null,
            Ozikol_BCC.Api.Services.ITemplateSecurityInspectorService? templateSecurityInspector = null,
            Ozikol_BCC.Application.Interfaces.Services.IAiSmartAssistService? aiService = null,
            IServiceScopeFactory? serviceScopeFactory = null,
            ILogger<ContentApiController>? logger = null)
        {
            _context = context;
            _mediator = mediator;
            _cloudinaryService = cloudinaryService;
            _r2Storage = r2Storage;
            _tenantProvider = tenantProvider;
            _masterCatalogDbContext = masterCatalogDbContext;
            _templateSecurityInspector = templateSecurityInspector ?? new Ozikol_BCC.Api.Services.TemplateSecurityInspectorService();
            _aiService = aiService;
            _serviceScopeFactory = serviceScopeFactory;
            _logger = logger;
        }

        // ==========================================
        // 0. MEDIA UPLOAD (Cloudinary)
        // ==========================================

        [HttpPost("upload-media")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UploadMedia([FromForm] ContentMediaUploadRequest request)
        {
            var file = request.File;
            var folder = string.IsNullOrWhiteSpace(request.Folder) ? "bcp-cms" : request.Folder;
            if (file == null || file.Length == 0)
            {
                return BadRequest(ApiResponse<object>.FailureResponse("No file was uploaded."));
            }

            try
            {
                // Check if tenant has activated their own Bring-Your-Own-Storage (BYOS) Cloudinary credentials
                var config = await _context.MisConfigurationSettings.AsNoTracking().FirstOrDefaultAsync();
                string? customCloud = null;
                string? customKey = null;
                string? customSecret = null;

                if (config?.UseCustomStorage == true &&
                    !string.IsNullOrWhiteSpace(config.CustomCloudinaryCloudName) &&
                    !string.IsNullOrWhiteSpace(config.CustomCloudinaryApiKey) &&
                    !string.IsNullOrWhiteSpace(config.CustomCloudinaryApiSecret))
                {
                    customCloud = config.CustomCloudinaryCloudName;
                    customKey = config.CustomCloudinaryApiKey;
                    customSecret = config.CustomCloudinaryApiSecret;
                }

                var (secureUrl, publicId) = await _cloudinaryService.UploadImageWithPublicIdAsync(file, folder, customCloud, customKey, customSecret);
                return Ok(ApiResponse<object>.SuccessResponse(new
                {
                    url = secureUrl,
                    key = publicId,
                    fileName = file.FileName,
                    fileSize = file.Length,
                    contentType = file.ContentType
                }, "Media uploaded successfully to Cloudinary."));
            }
            catch (Exception ex)
            {
                return StatusCode(500, ApiResponse<object>.FailureResponse($"Cloudinary upload failed: {ex.Message}"));
            }
        }

        // ==========================================
        // 0.1. CSS ASSET UPLOAD & CLOUDFLARE R2 + CDN HOSTING
        // ==========================================

        /// <summary>
        /// Uploads a custom CSS stylesheet file to Cloudflare R2 Object Storage with Cloudflare Global CDN distribution.
        /// Returns the high-speed global CDN stylesheet URL, metadata, and raw CSS content.
        /// </summary>
        /// <param name="file">The .css stylesheet file to upload.</param>
        /// <returns>JSON payload containing the public Cloudflare CDN stylesheet URL, metadata, and raw CSS content.</returns>
        [HttpPost("upload-css")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UploadCss([FromForm] IFormFile file)
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest(ApiResponse<object>.FailureResponse("No file was uploaded."));
            }

            var rawFileName = file.FileName ?? "stylesheet.css";
            var fileName = rawFileName;
            if (fileName.EndsWith(".download", StringComparison.OrdinalIgnoreCase))
            {
                fileName = fileName.Substring(0, fileName.Length - 9);
            }

            var extension = Path.GetExtension(fileName).ToLowerInvariant();
            if (extension != ".css")
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Only CSS (.css) stylesheet files are permitted."));
            }

            try
            {
                // Pre-flight security scan: Read CSS file stream and verify zero malicious signatures before storing
                using (var reader = new StreamReader(file.OpenReadStream()))
                {
                    var cssText = await reader.ReadToEndAsync();
                    var scan = _templateSecurityInspector.Inspect(null, cssText, null, null);
                    if (!scan.IsPassed)
                    {
                        var threat = scan.CriticalViolations.FirstOrDefault() ?? scan.Violations.FirstOrDefault();
                        return BadRequest(ApiResponse<object>.FailureResponse(
                            $"Security scan failed for stylesheet '{fileName}': {threat?.Message ?? "Prohibited CSS signature detected."}",
                            null,
                            scan.Violations.Select(v => $"[{v.Severity}] {v.Category}: {v.Message}").ToList()));
                    }
                }

                var tenantSlug = _tenantProvider?.CurrentTenant ?? "portal";
                string finalUrl;
                string storageType;
                string safeName;
                string? contentPreview = null;

                if (_r2Storage.IsConfigured())
                {
                    await using var stream = file.OpenReadStream();
                    var result = await _r2Storage.UploadCssAsync(stream, fileName, tenantSlug);

                    if (result.Success && !string.IsNullOrWhiteSpace(result.Url))
                    {
                        finalUrl = result.Url;
                        storageType = "Cloudflare R2 + Cloudflare CDN";
                        safeName = result.SafeFileName ?? fileName;
                        contentPreview = result.ContentPreview;
                    }
                    else
                    {
                        // Fallback to local server storage if R2 bucket upload failed
                        var localDir = Path.Combine(AppContext.BaseDirectory, "uploads", "assets", "css");
                        Directory.CreateDirectory(localDir);
                        safeName = $"{Path.GetFileNameWithoutExtension(fileName).Replace(" ", "-").ToLowerInvariant()}-{Guid.NewGuid().ToString("N")[..8]}.css";
                        var localPath = Path.Combine(localDir, safeName);
                        
                        await using (var localStream = new FileStream(localPath, FileMode.Create))
                        {
                            file.OpenReadStream().CopyTo(localStream);
                        }

                        using var textReader = new StreamReader(file.OpenReadStream());
                        contentPreview = await textReader.ReadToEndAsync();
                        finalUrl = $"{Request.Scheme}://{Request.Host}{Request.PathBase}/api/ContentApi/assets/css/{safeName}";
                        storageType = "Local Server Storage (Fallback)";
                    }
                }
                else
                {
                    // Fallback to local server storage when R2 is unconfigured
                    var localDir = Path.Combine(AppContext.BaseDirectory, "uploads", "assets", "css");
                    Directory.CreateDirectory(localDir);
                    safeName = $"{Path.GetFileNameWithoutExtension(fileName).Replace(" ", "-").ToLowerInvariant()}-{Guid.NewGuid().ToString("N")[..8]}.css";
                    var localPath = Path.Combine(localDir, safeName);
                    
                    await using (var localStream = new FileStream(localPath, FileMode.Create))
                    {
                        await file.CopyToAsync(localStream);
                    }

                    using var textReader = new StreamReader(file.OpenReadStream());
                    contentPreview = await textReader.ReadToEndAsync();
                    finalUrl = $"{Request.Scheme}://{Request.Host}{Request.PathBase}/api/ContentApi/assets/css/{safeName}";
                    storageType = "Local Server Storage";
                }

                return Ok(ApiResponse<object>.SuccessResponse(new
                {
                    url = finalUrl,
                    key = safeName,
                    fileName = fileName,
                    safeName = safeName,
                    size = file.Length,
                    storage = storageType,
                    content = contentPreview
                }, "CSS stylesheet uploaded successfully."));
            }
            catch (Exception ex)
            {
                return StatusCode(500, ApiResponse<object>.FailureResponse($"Failed to process CSS upload: {ex.Message}"));
            }
        }

        /// <summary>
        /// Uploads a custom JavaScript file (.js or .js.download) to Cloudflare R2 Object Storage or local server storage with automatic CDN distribution.
        /// </summary>
        /// <param name="file">The .js script file to upload.</param>
        /// <returns>JSON payload containing the public script URL, metadata, and raw JS content.</returns>
        [HttpPost("upload-js")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UploadJs([FromForm] IFormFile file)
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest(ApiResponse<object>.FailureResponse("No file was uploaded."));
            }

            var rawFileName = file.FileName ?? "script.js";
            var fileName = rawFileName;
            if (fileName.EndsWith(".download", StringComparison.OrdinalIgnoreCase))
            {
                fileName = fileName.Substring(0, fileName.Length - 9);
            }

            var extension = Path.GetExtension(fileName).ToLowerInvariant();
            if (extension != ".js")
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Only JavaScript (.js) script files are permitted."));
            }

            try
            {
                // Pre-flight security scan: Read JavaScript file stream and verify zero malicious signatures before storing
                using (var reader = new StreamReader(file.OpenReadStream()))
                {
                    var jsText = await reader.ReadToEndAsync();
                    var scan = _templateSecurityInspector.Inspect(null, null, jsText, null);
                    if (!scan.IsPassed)
                    {
                        var threat = scan.CriticalViolations.FirstOrDefault() ?? scan.Violations.FirstOrDefault();
                        return BadRequest(ApiResponse<object>.FailureResponse(
                            $"Security scan failed for script '{fileName}': {threat?.Message ?? "Prohibited JavaScript execution signature detected."}",
                            null,
                            scan.Violations.Select(v => $"[{v.Severity}] {v.Category}: {v.Message}").ToList()));
                    }
                }

                var tenantSlug = _tenantProvider?.CurrentTenant ?? "portal";
                string finalUrl;
                string storageType;
                string safeName;
                string? contentPreview = null;

                if (_r2Storage.IsConfigured())
                {
                    await using var stream = file.OpenReadStream();
                    var result = await _r2Storage.UploadAssetAsync(stream, fileName, "application/javascript", $"tenants/{tenantSlug}/js");

                    if (result.Success && !string.IsNullOrWhiteSpace(result.Url))
                    {
                        finalUrl = result.Url;
                        storageType = "Cloudflare R2 + Cloudflare CDN";
                        safeName = result.SafeFileName ?? fileName;
                        contentPreview = result.ContentPreview;
                    }
                    else
                    {
                        // Fallback to local server storage
                        var localDir = Path.Combine(AppContext.BaseDirectory, "uploads", "assets", "js");
                        Directory.CreateDirectory(localDir);
                        safeName = $"{Path.GetFileNameWithoutExtension(fileName).Replace(" ", "-").ToLowerInvariant()}-{Guid.NewGuid().ToString("N")[..8]}.js";
                        var localPath = Path.Combine(localDir, safeName);
                        
                        await using (var localStream = new FileStream(localPath, FileMode.Create))
                        {
                            file.OpenReadStream().CopyTo(localStream);
                        }

                        using var textReader = new StreamReader(file.OpenReadStream());
                        contentPreview = await textReader.ReadToEndAsync();
                        finalUrl = $"{Request.Scheme}://{Request.Host}{Request.PathBase}/api/ContentApi/assets/js/{safeName}";
                        storageType = "Local Server Storage (Fallback)";
                    }
                }
                else
                {
                    // Fallback to local server storage when R2 is unconfigured
                    var localDir = Path.Combine(AppContext.BaseDirectory, "uploads", "assets", "js");
                    Directory.CreateDirectory(localDir);
                    safeName = $"{Path.GetFileNameWithoutExtension(fileName).Replace(" ", "-").ToLowerInvariant()}-{Guid.NewGuid().ToString("N")[..8]}.js";
                    var localPath = Path.Combine(localDir, safeName);
                    
                    await using (var localStream = new FileStream(localPath, FileMode.Create))
                    {
                        await file.CopyToAsync(localStream);
                    }

                    using var textReader = new StreamReader(file.OpenReadStream());
                    contentPreview = await textReader.ReadToEndAsync();
                    finalUrl = $"{Request.Scheme}://{Request.Host}{Request.PathBase}/api/ContentApi/assets/js/{safeName}";
                    storageType = "Local Server Storage";
                }

                return Ok(ApiResponse<object>.SuccessResponse(new
                {
                    url = finalUrl,
                    key = safeName,
                    fileName = fileName,
                    safeName = safeName,
                    size = file.Length,
                    storage = storageType,
                    content = contentPreview
                }, "JavaScript file uploaded successfully."));
            }
            catch (Exception ex)
            {
                return StatusCode(500, ApiResponse<object>.FailureResponse($"Failed to process JS upload: {ex.Message}"));
            }
        }

        /// <summary>
        /// Serves an uploaded CSS stylesheet asset with proper text/css content type and caching headers.
        /// </summary>
        /// <param name="fileName">The stored CSS filename.</param>
        /// <returns>The CSS stylesheet file stream.</returns>
        [HttpGet("css/{fileName}")]
        [AllowAnonymous]
        public IActionResult GetCssAsset(string fileName)
        {
            return GetStaticAsset("css", fileName);
        }

        /// <summary>
        /// Serves an uploaded JavaScript script asset with proper application/javascript content type.
        /// </summary>
        /// <param name="fileName">The stored JS filename.</param>
        /// <returns>The JavaScript file stream.</returns>
        [HttpGet("js/{fileName}")]
        [AllowAnonymous]
        public IActionResult GetJsAsset(string fileName)
        {
            return GetStaticAsset("js", fileName);
        }

        /// <summary>
        /// Serves any uploaded static asset (CSS, JS, Fonts, Images) with appropriate MIME content type and caching headers.
        /// </summary>
        /// <param name="folder">Asset subfolder: "css", "js", "fonts", or "assets".</param>
        /// <param name="fileName">The stored asset filename.</param>
        /// <returns>The physical file stream.</returns>
        [HttpGet("assets/{folder}/{fileName}")]
        [AllowAnonymous]
        public IActionResult GetStaticAsset(string folder, string fileName)
        {
            if (string.IsNullOrWhiteSpace(fileName) || fileName.Contains("..") || Path.GetInvalidFileNameChars().Any(fileName.Contains))
            {
                return BadRequest("Invalid filename.");
            }

            var cleanFolder = (folder ?? "assets").Trim().ToLowerInvariant();
            if (cleanFolder != "css" && cleanFolder != "js" && cleanFolder != "fonts" && cleanFolder != "assets")
            {
                return BadRequest("Invalid asset folder.");
            }

            var uploadsDir = Path.Combine(AppContext.BaseDirectory, "uploads", "assets", cleanFolder);
            var filePath = Path.Combine(uploadsDir, fileName);

            if (!System.IO.File.Exists(filePath))
            {
                // Fallback to legacy single-level uploads folder
                var legacyPath = Path.Combine(AppContext.BaseDirectory, "uploads", cleanFolder, fileName);
                if (System.IO.File.Exists(legacyPath))
                {
                    filePath = legacyPath;
                }
                else
                {
                    return NotFound($"Static asset '{fileName}' not found in folder '{cleanFolder}'.");
                }
            }

            var ext = Path.GetExtension(fileName).ToLowerInvariant();
            var contentType = ext switch
            {
                ".js" => "application/javascript",
                ".css" => "text/css",
                ".woff2" => "font/woff2",
                ".woff" => "font/woff",
                ".ttf" => "font/ttf",
                ".otf" => "font/otf",
                ".eot" => "application/vnd.ms-fontobject",
                ".svg" => "image/svg+xml",
                ".json" => "application/json",
                ".png" => "image/png",
                ".jpg" or ".jpeg" => "image/jpeg",
                ".webp" => "image/webp",
                _ => "application/octet-stream"
            };

            Response.Headers["Cache-Control"] = "public, max-age=31536000, immutable";
            return PhysicalFile(filePath, contentType, enableRangeProcessing: true);
        }

        // ==========================================
        // 1. WEB PAGES (CMS Management)
        // ==========================================

        [HttpGet("pages")]
        public async Task<IActionResult> GetPages()
        {
            var pages = await _context.WebPages
                .Include(p => p.PageCategory)
                .OrderBy(p => p.SortOrder)
                .ToListAsync();

            var sectionCounts = await _context.PageSections
                .Where(s => s.WebPageId.HasValue)
                .GroupBy(s => s.WebPageId!.Value)
                .Select(g => new { WebPageId = g.Key, Count = g.Count() })
                .ToDictionaryAsync(g => g.WebPageId, g => g.Count);

            foreach (var p in pages)
            {
                if (sectionCounts.TryGetValue(p.Id, out var count))
                {
                    p.SectionCount = count;
                }
            }

            return Ok(ApiResponse<object>.SuccessResponse(pages, "Web pages retrieved successfully."));
        }

        [HttpGet("pages/{id:guid}")]
        public async Task<IActionResult> GetPageById(Guid id)
        {
            var page = await _context.WebPages
                .Include(p => p.PageCategory)
                .Include(p => p.PageSections!.OrderBy(s => s.PageSortOrder))
                    .ThenInclude(s => s.PageSectionLists!.OrderBy(l => l.SortOrder))
                .FirstOrDefaultAsync(p => p.Id == id);

            if (page == null) return NotFound(ApiResponse<object>.FailureResponse("Page not found."));
            page.SectionCount = await _context.PageSections.CountAsync(s => s.WebPageId == page.Id);
            return Ok(ApiResponse<object>.SuccessResponse(page, "Page details retrieved."));
        }

        [HttpGet("pages/slug/{slug}")]
        public async Task<IActionResult> GetPageBySlug(string slug)
        {
            var cleanSlug = slug.Trim().ToLowerInvariant();
            var page = await _context.WebPages
                .Include(p => p.PageCategory)
                .Include(p => p.PageSections!.OrderBy(s => s.PageSortOrder))
                    .ThenInclude(s => s.PageSectionLists!.OrderBy(l => l.SortOrder))
                .FirstOrDefaultAsync(p => p.Publish && p.DirectUrl != null && p.DirectUrl.ToLower() == cleanSlug);

            if (page == null) return NotFound(ApiResponse<object>.FailureResponse($"Page with slug '{slug}' was not found or is unpublished."));

            page.SectionCount = await _context.PageSections.CountAsync(s => s.WebPageId == page.Id);
            return Ok(ApiResponse<object>.SuccessResponse(page, "Page details retrieved."));
        }

        /// <summary>
        /// Retrieves all unique tags currently assigned across all web pages.
        /// Used for autocomplete in the page editor tags chips input.
        /// </summary>
        /// <returns>A sorted list of unique tag strings.</returns>
        [HttpGet("page-tags")]
        public async Task<IActionResult> GetPageTags()
        {
            var rawTags = await _context.WebPages
                .Where(p => !string.IsNullOrWhiteSpace(p.Tags))
                .Select(p => p.Tags!)
                .ToListAsync();

            var uniqueTags = rawTags
                .SelectMany(t => t.Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries))
                .Select(t => t.Trim().ToLowerInvariant())
                .Where(t => !string.IsNullOrWhiteSpace(t))
                .Distinct()
                .OrderBy(t => t)
                .ToList();

            return Ok(ApiResponse<List<string>>.SuccessResponse(uniqueTags, "Page tags retrieved successfully."));
        }

        [HttpPost("pages")]
        public async Task<IActionResult> CreatePage([FromBody] CreateWebPageRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Title))
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Page Title is required."));
            }

            try
            {
                // Unique slug generation with proper whitespace handling
                var rawSlug = !string.IsNullOrWhiteSpace(request.Slug)
                    ? request.Slug
                    : (!string.IsNullOrWhiteSpace(request.DirectUrl) ? request.DirectUrl : request.Title);

                var uniqueSlug = await GenerateUniqueSlugAsync(rawSlug);

                Guid? categoryId = request.PageCategoryId;
                if (categoryId == Guid.Empty) categoryId = null;

                var page = new WebPage
                {
                    Id = Guid.NewGuid(),
                    Title = request.Title.Trim(),
                    DirectUrl = uniqueSlug,
                    EnableDirectUrl = true,
                    IsHomePage = request.IsHomePage,
                    PageCategoryId = categoryId,
                    ShowInTopBar = request.ShowInTopBar,
                    TopBarSortOrder = request.TopBarSortOrder,
                    ShowInMainMenu = request.ShowInMenu || request.ShowInMainMenu,
                    MainMenuSortOrder = request.MainMenuSortOrder != 0 ? request.MainMenuSortOrder : request.SortOrder,
                    ShowInMenuDropDown = request.ShowInMenuDropDown,
                    DropdownSortOrder = request.DropdownSortOrder,
                    ShowInFooter = request.ShowInFooter,
                    FooterSortOrder = request.FooterSortOrder,
                    ShowInFooterBottom = request.ShowInFooterBottom,
                    FooterBottomSortOrder = request.FooterBottomSortOrder,
                    IsLegal = request.IsLegal,
                    IsMenuCTA = request.IsMenuCTA,
                    MenuCtaText = request.MenuCtaText?.Trim(),
                    MenuCtaUrl = request.MenuCtaUrl?.Trim(),
                    MenuCtaStyle = string.IsNullOrWhiteSpace(request.MenuCtaStyle) ? "primary" : request.MenuCtaStyle.Trim(),
                    Tags = request.Tags,
                    Publish = request.IsPublished || request.Publish,
                    SecurityPage = request.SecurityPage,
                    SortOrder = request.SortOrder,
                    MenuPosition = request.MenuPosition != 0 ? request.MenuPosition : Ozikol_BCC.Domain.Enum.Enum.MenuPosition.First,
                    CustomClass = request.CustomClass,
                    ImageUrl = request.ImageUrl,
                    ImageKey = request.ImageKey,
                    MetaTitle = request.MetaTitle,
                    MetaDescription = request.MetaDescription,
                    MetaKeywords = request.MetaKeywords,
                DisableAiAutoFill = request.DisableAiAutoFill,
                    MainPageId = request.MainPageId,
                    AddToRibon = request.AddToRibon,
                    RibonCustomDisplayTitle = request.RibonCustomDisplayTitle,
                    RibonSortOrder = request.RibonSortOrder,
                    CreatedAtUtc = DateTime.UtcNow
                };

                _context.WebPages.Add(page);
                await _context.SaveChangesAsync();

                return Ok(ApiResponse<object>.SuccessResponse(page, "Web page created successfully."));
            }
            catch (Exception ex)
            {
                return StatusCode(500, ApiResponse<object>.FailureResponse(ex.InnerException?.Message ?? ex.Message));
            }
        }

        [HttpPut("pages/{id:guid}")]
        public async Task<IActionResult> UpdatePage(Guid id, [FromBody] WebPage updated)
        {
            var existing = await _context.WebPages.FindAsync(id);
            if (existing == null) return NotFound(ApiResponse<object>.FailureResponse("Page not found."));

            // Ensure unique slug if modified
            var targetSlug = !string.IsNullOrWhiteSpace(updated.DirectUrl) ? updated.DirectUrl : updated.Title;
            if (!string.IsNullOrWhiteSpace(targetSlug) && targetSlug != existing.DirectUrl)
            {
                existing.DirectUrl = await GenerateUniqueSlugAsync(targetSlug, id);
            }

            existing.Title = updated.Title;
            existing.EnableDirectUrl = updated.EnableDirectUrl;
            existing.IsHomePage = updated.IsHomePage;
            existing.Publish = updated.Publish;
            existing.SecurityPage = updated.SecurityPage;
            existing.ShowInTopBar = updated.ShowInTopBar;
            existing.TopBarSortOrder = updated.TopBarSortOrder;
            existing.ShowInMainMenu = updated.ShowInMainMenu;
            existing.MainMenuSortOrder = updated.MainMenuSortOrder;
            existing.ShowInMenuDropDown = updated.ShowInMenuDropDown;
            existing.DropdownSortOrder = updated.DropdownSortOrder;
            existing.ShowInFooter = updated.ShowInFooter;
            existing.FooterSortOrder = updated.FooterSortOrder;
            existing.ShowInFooterBottom = updated.ShowInFooterBottom;
            existing.FooterBottomSortOrder = updated.FooterBottomSortOrder;
            existing.IsLegal = updated.IsLegal;
            existing.IsMenuCTA = updated.IsMenuCTA;
            existing.MenuCtaText = updated.MenuCtaText?.Trim();
            existing.MenuCtaUrl = updated.MenuCtaUrl?.Trim();
            existing.MenuCtaStyle = string.IsNullOrWhiteSpace(updated.MenuCtaStyle) ? "primary" : updated.MenuCtaStyle.Trim();
            existing.Tags = updated.Tags;
            existing.SortOrder = updated.SortOrder;
            existing.MenuPosition = updated.MenuPosition != 0 ? updated.MenuPosition : Ozikol_BCC.Domain.Enum.Enum.MenuPosition.First;
            existing.CustomClass = updated.CustomClass;
            existing.PageCategoryId = updated.PageCategoryId == Guid.Empty ? null : updated.PageCategoryId;
            existing.ImageUrl = updated.ImageUrl;
            existing.ImageKey = updated.ImageKey;
            existing.MetaTitle = updated.MetaTitle;
            existing.MetaDescription = updated.MetaDescription;
            existing.MetaKeywords = updated.MetaKeywords;
            existing.MainPageId = updated.MainPageId;
            existing.AddToRibon = updated.AddToRibon;
            existing.DisableAiAutoFill = updated.DisableAiAutoFill;
            existing.RibonCustomDisplayTitle = updated.RibonCustomDisplayTitle;
            existing.RibonSortOrder = updated.RibonSortOrder;
            existing.UpdatedAtUtc = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(ApiResponse<object>.SuccessResponse(existing, "Web page updated successfully."));
        }

        /// <summary>
        /// Analyzes the full page content (title, category, headline, attached layout sections, and repeating sub-items)
        /// and uses AI to generate or update high-CTR, SEO-optimized Meta Title, Meta Description, and Meta Keywords.
        /// Respects the <see cref="WebPage.DisableAiAutoFill"/> toggle.
        /// </summary>
        /// <param name="page">The target web page entity.</param>
        /// <param name="force">True to force regeneration even if metadata fields already contain text.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>True if metadata was updated; false if skipped or disabled.</returns>
        private async Task<bool> StudyAndOptimizePageSeoMetaAsync(WebPage page, bool force = false, CancellationToken cancellationToken = default)
        {
            if (page == null || _aiService == null) return false;

            // Strict check: if administrator disabled AI auto-fill for this page, never touch or overwrite it
            if (page.DisableAiAutoFill && !force)
            {
                return false;
            }

            try
            {
                // Gather sections and repeating cards attached to this page
                var sections = await _context.PageSections
                    .Where(s => s.WebPageId == page.Id)
                    .OrderBy(s => s.SortOrder)
                    .ToListAsync(cancellationToken);

                var sectionIds = sections.Select(s => s.Id).ToList();
                var subItems = await _context.PageSectionLists
                    .Where(l => sectionIds.Contains(l.PageSectionId))
                    .OrderBy(l => l.SortOrder)
                    .ToListAsync(cancellationToken);

                var contentSummary = new System.Text.StringBuilder();
                contentSummary.AppendLine($"Page Title: {page.Title}");
                if (!string.IsNullOrWhiteSpace(page.Headline)) contentSummary.AppendLine($"Headline: {page.Headline}");
                if (!string.IsNullOrWhiteSpace(page.Description)) contentSummary.AppendLine($"Description: {page.Description}");
                if (!string.IsNullOrWhiteSpace(page.Category)) contentSummary.AppendLine($"Category: {page.Category}");
                if (!string.IsNullOrWhiteSpace(page.DirectUrl)) contentSummary.AppendLine($"Route Slug: {page.DirectUrl}");

                if (sections.Any())
                {
                    contentSummary.AppendLine("Attached Layout Sections:");
                    foreach (var s in sections)
                    {
                        contentSummary.AppendLine($"- Section: {s.Title} ({s.MiniTitle ?? "Standard"}): {s.Description}");
                    }
                }

                if (subItems.Any())
                {
                    contentSummary.AppendLine("Repeating Sub-Items & Feature Highlights:");
                    foreach (var item in subItems)
                    {
                        contentSummary.AppendLine($"* {item.Title} - {item.Description}");
                    }
                }

                var prompt = $@"Study the following web page content and synthesize high-CTR, professional SEO metadata:
{contentSummary}

Generate a JSON object with exactly these 3 keys:
- ""metaTitle"": (50 to 60 chars maximum. High click-through rate, captivating title for Google search snippets and browser tabs. Do NOT append brand name suffix.)
- ""metaDescription"": (150 to 160 chars maximum. Engaging summary of value proposition for Google search result snippets.)
- ""metaKeywords"": (6 to 10 high-relevance comma-separated keywords for crawler indexing.)

Reply ONLY with the valid JSON object.";

                var aiRequest = new Ozikol_BCC.Application.Interfaces.Services.AiCompletionRequest
                {
                    SystemInstruction = "You are an expert SEO copywriter and crawler indexing specialist. Always respond with pure, valid JSON with keys: metaTitle, metaDescription, metaKeywords.",
                    Prompt = prompt,
                    Temperature = 0.3f,
                    MaxTokens = 500
                };

                var result = await _aiService.GenerateCompletionAsync(aiRequest, cancellationToken);
                if (!result.IsSuccess || string.IsNullOrWhiteSpace(result.Content))
                {
                    return false;
                }

                // Parse AI JSON response
                var rawJson = result.Content.Trim();
                if (rawJson.StartsWith("```json")) rawJson = rawJson.Substring(7);
                if (rawJson.StartsWith("```")) rawJson = rawJson.Substring(3);
                if (rawJson.EndsWith("```")) rawJson = rawJson.Substring(0, rawJson.Length - 3);
                rawJson = rawJson.Trim();

                using var doc = JsonDocument.Parse(rawJson);
                var root = doc.RootElement;

                var newTitle = root.TryGetProperty("metaTitle", out var tElem) ? tElem.GetString() : null;
                var newDesc = root.TryGetProperty("metaDescription", out var dElem) ? dElem.GetString() : null;
                var newKeywords = root.TryGetProperty("metaKeywords", out var kElem) ? kElem.GetString() : null;

                bool modified = false;
                if (!string.IsNullOrWhiteSpace(newTitle) && (force || string.IsNullOrWhiteSpace(page.MetaTitle)))
                {
                    page.MetaTitle = newTitle.Trim();
                    modified = true;
                }
                if (!string.IsNullOrWhiteSpace(newDesc) && (force || string.IsNullOrWhiteSpace(page.MetaDescription)))
                {
                    page.MetaDescription = newDesc.Trim();
                    modified = true;
                }
                if (!string.IsNullOrWhiteSpace(newKeywords) && (force || string.IsNullOrWhiteSpace(page.MetaKeywords)))
                {
                    page.MetaKeywords = newKeywords.Trim();
                    modified = true;
                }

                if (modified)
                {
                    page.UpdatedAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync(cancellationToken);
                }

                return modified;
            }
            catch (Exception ex)
            {
                _logger?.LogWarning(ex, "Failed to auto-generate SEO metadata for page {PageId}", page.Id);
                return false;
            }
        }

        /// <summary>
        /// Explicitly triggers an AI study of the web page and its attached layout sections to synthesize or optimize
        /// high-CTR SEO metadata (Meta Title, Description, and Keywords).
        /// </summary>
        /// <param name="id">The unique identifier of the web page.</param>
        /// <returns>A standardized API response returning the updated page with generated SEO fields.</returns>
        [HttpPost("pages/{id:guid}/generate-seo")]
        public async Task<IActionResult> GeneratePageSeo(Guid id)
        {
            var page = await _context.WebPages.FindAsync(id);
            if (page == null) return NotFound(ApiResponse<object>.FailureResponse("Web page not found."));

            var updated = await StudyAndOptimizePageSeoMetaAsync(page, force: true);
            return Ok(ApiResponse<object>.SuccessResponse(new
            {
                page.Id,
                page.Title,
                page.MetaTitle,
                page.MetaDescription,
                page.MetaKeywords,
                page.DisableAiAutoFill,
                IsOptimized = updated
            }, updated ? "AI SEO metadata generated and saved successfully." : "AI SEO metadata generated."));
        }


        /// <summary>
        /// Permanently deletes a web page if it has no attached layout sections.
        /// If sections exist, blocks deletion and returns a clear custom error requesting their removal.
        /// </summary>
        /// <param name="id">The unique identifier of the web page to delete.</param>
        /// <param name="forceCascade">Whether to forcefully delete the web page along with all attached layout sections and sub-items.</param>
        /// <returns>A standardized API response confirming the deletion or reporting existing sections.</returns>
        [HttpDelete("pages/{id:guid}")]
        public async Task<IActionResult> DeletePage(Guid id, [FromQuery] bool forceCascade = false)
        {
            var existing = await _context.WebPages.FindAsync(id);
            if (existing == null) return NotFound(ApiResponse<object>.FailureResponse("Page not found."));

            // 1. Guard check: Restrict deletion if the page contains layout sections
            var sectionCount = await _context.PageSections.CountAsync(s => s.WebPageId == id);
            if (sectionCount > 0 && !forceCascade)
            {
                return BadRequest(ApiResponse<object>.FailureResponse(
                    $"Cannot delete web page '{existing.Title}' because it contains {sectionCount} layout section(s). Please remove all attached sections before deleting.",
                    null,
                    "ERR-2005",
                    $"WebPage {id} contains {sectionCount} linked PageSections. Restricting deletion."));
            }

            if (forceCascade && sectionCount > 0)
            {
                var sections = await _context.PageSections
                    .Where(s => s.WebPageId == id)
                    .Include(s => s.PageSectionLists)
                    .ToListAsync();

                foreach (var sec in sections)
                {
                    if (sec.PageSectionLists != null && sec.PageSectionLists.Any())
                    {
                        _context.PageSectionLists.RemoveRange(sec.PageSectionLists);
                    }
                }

                _context.PageSections.RemoveRange(sections);
            }

            // 2. Cascade delete WebPageViewLogs referencing this page
            var viewLogs = await _context.WebPageViewLogs
                .Where(l => l.WebPageId == id)
                .ToListAsync();

            if (viewLogs.Any())
            {
                _context.WebPageViewLogs.RemoveRange(viewLogs);
            }

            // 3. Unlink any child sub-pages referencing this page as their parent MainPageId
            var childPages = await _context.WebPages
                .Where(p => p.MainPageId == id)
                .ToListAsync();

            foreach (var child in childPages)
            {
                child.MainPageId = null;
            }

            // 4. Remove the parent web page
            _context.WebPages.Remove(existing);
            await _context.SaveChangesAsync();
            return Ok(ApiResponse<object>.SuccessResponse(null, "Web page deleted successfully."));
        }

        /// <summary>
        /// Request model for batch deleting multiple web pages.
        /// </summary>
        public class BulkDeletePagesRequest
        {
            /// <summary>
            /// List of web page identifiers to delete.
            /// </summary>
            public List<Guid> Ids { get; set; } = new();

            /// <summary>
            /// Whether to forcefully purge all attached layout sections and repeating cards.
            /// </summary>
            public bool ForceCascade { get; set; } = true;
        }

        /// <summary>
        /// Atomically bulk deletes multiple web pages, and optionally cascades to all attached layout sections and repeating cards.
        /// </summary>
        /// <param name="request">Payload containing list of page GUIDs to delete.</param>
        /// <returns>Standardized API response confirming number of deleted records.</returns>
        [HttpPost("pages/bulk-delete")]
        public async Task<IActionResult> BulkDeletePages([FromBody] BulkDeletePagesRequest request)
        {
            if (request?.Ids == null || request.Ids.Count == 0)
            {
                return BadRequest(ApiResponse<object>.FailureResponse("No web page identifiers provided for bulk deletion."));
            }

            var targetIds = request.Ids.Distinct().ToList();
            var pages = await _context.WebPages
                .Where(p => targetIds.Contains(p.Id))
                .ToListAsync();

            if (!pages.Any())
            {
                return NotFound(ApiResponse<object>.FailureResponse("None of the specified web pages were found."));
            }

            var foundIds = pages.Select(p => p.Id).ToList();

            // Guard check if cascade is false: restrict deletion of pages that have attached sections
            if (!request.ForceCascade)
            {
                var pagesWithSections = await _context.PageSections
                    .Where(s => s.WebPageId.HasValue && foundIds.Contains(s.WebPageId.Value))
                    .Select(s => s.WebPageId!.Value)
                    .Distinct()
                    .ToListAsync();

                if (pagesWithSections.Any())
                {
                    return BadRequest(ApiResponse<object>.FailureResponse(
                        $"Cannot bulk delete because {pagesWithSections.Count} selected page(s) contain attached layout sections. Enable Force Cascade or remove sections first.",
                        null,
                        "ERR-2005",
                        $"{pagesWithSections.Count} pages have linked sections."));
                }
            }
            else
            {
                // Cascade delete all sections and sub-items attached to these pages
                var sections = await _context.PageSections
                    .Where(s => s.WebPageId.HasValue && foundIds.Contains(s.WebPageId.Value))
                    .Include(s => s.PageSectionLists)
                    .ToListAsync();

                foreach (var sec in sections)
                {
                    if (sec.PageSectionLists != null && sec.PageSectionLists.Any())
                    {
                        _context.PageSectionLists.RemoveRange(sec.PageSectionLists);
                    }
                }

                if (sections.Any())
                {
                    _context.PageSections.RemoveRange(sections);
                }

                // Clean up view logs
                var viewLogs = await _context.WebPageViewLogs
                    .Where(l => l.WebPageId.HasValue && foundIds.Contains(l.WebPageId.Value))
                    .ToListAsync();

                if (viewLogs.Any())
                {
                    _context.WebPageViewLogs.RemoveRange(viewLogs);
                }
            }

            // Unlink any child sub-pages referencing these pages
            var childPages = await _context.WebPages
                .Where(p => p.MainPageId.HasValue && foundIds.Contains(p.MainPageId.Value))
                .ToListAsync();

            foreach (var child in childPages)
            {
                child.MainPageId = null;
            }

            _context.WebPages.RemoveRange(pages);
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<object>.SuccessResponse(new
            {
                deletedCount = pages.Count
            }, $"{pages.Count} web page(s) deleted successfully."));
        }



        private async Task<string> GenerateUniqueSlugAsync(string rawInput, Guid? excludePageId = null)
        {
            if (string.IsNullOrWhiteSpace(rawInput)) rawInput = "page";
            // Strip leading / trailing slashes and normalize
            var cleaned = rawInput.Trim().Trim('/');
            var baseSlug = Regex.Replace(cleaned.ToLowerInvariant(), @"[^a-z0-9\-_]", "-");
            baseSlug = Regex.Replace(baseSlug, @"-+", "-").Trim('-');
            if (string.IsNullOrEmpty(baseSlug)) baseSlug = "page";

            var slug = baseSlug;
            int counter = 2;
            while (await _context.WebPages.AnyAsync(p => p.DirectUrl == slug && (!excludePageId.HasValue || p.Id != excludePageId.Value)))
            {
                slug = $"{baseSlug}-{counter}";
                counter++;
            }
            return slug;
        }

        // ==========================================
        // 2. PAGE CATEGORIES (Dropdown Menus)
        // ==========================================

        [HttpGet("categories")]
        public async Task<IActionResult> GetCategories()
        {
            var categories = await _context.PageCategories
                .Include(c => c.WebPages!.OrderBy(p => p.SortOrder))
                .OrderBy(c => c.MenuSortOrder)
                .ToListAsync();

            return Ok(ApiResponse<object>.SuccessResponse(categories, "Categories retrieved."));
        }

        [HttpGet("categories/{id:guid}")]
        public async Task<IActionResult> GetCategoryById(Guid id)
        {
            var category = await _context.PageCategories
                .Include(c => c.WebPages)
                .Include(c => c.Children)
                .FirstOrDefaultAsync(c => c.Id == id);

            if (category == null) return NotFound(ApiResponse<object>.FailureResponse("Category not found."));
            return Ok(ApiResponse<object>.SuccessResponse(category, "Category details retrieved."));
        }

        [HttpPost("categories")]
        public async Task<IActionResult> CreateCategory([FromBody] CreatePageCategoryRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Title))
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Category Title is required."));
            }

            try
            {
                var category = new PageCategory
                {
                    Id = Guid.NewGuid(),
                    Title = request.Title.Trim(),
                    MenuPosition = request.MenuPosition != 0 ? request.MenuPosition : Ozikol_BCC.Domain.Enum.Enum.MenuPosition.Middle,
                    MenuSortOrder = request.MenuSortOrder,
                    CustomClass = request.CustomClass?.Trim(),
                    Publish = request.Publish,
                    ShowInMenu = request.ShowInMenu,
                    ShowInFooter = request.ShowInFooter,
                    FooterSortOrder = request.FooterSortOrder,
                    FooterDisplayTitle = request.FooterDisplayTitle?.Trim(),
                    ParentId = request.ParentId == Guid.Empty ? null : request.ParentId,
                    Icon = request.Icon,
                    CreatedAtUtc = DateTime.UtcNow
                };

                _context.PageCategories.Add(category);
                await _context.SaveChangesAsync();

                return Ok(ApiResponse<object>.SuccessResponse(category, "Page category created successfully."));
            }
            catch (Exception ex)
            {
                return StatusCode(500, ApiResponse<object>.FailureResponse(ex.InnerException?.Message ?? ex.Message));
            }
        }

        [HttpPut("categories/{id:guid}")]
        public async Task<IActionResult> UpdateCategory(Guid id, [FromBody] PageCategory updated)
        {
            try
            {
                var existing = await _context.PageCategories.FindAsync(id);
                if (existing == null) return NotFound(ApiResponse<object>.FailureResponse("Category not found."));

                existing.Title = updated.Title;
                existing.MenuPosition = updated.MenuPosition != 0 ? updated.MenuPosition : Ozikol_BCC.Domain.Enum.Enum.MenuPosition.Middle;
                existing.MenuSortOrder = updated.MenuSortOrder;
                existing.CustomClass = updated.CustomClass?.Trim();
                existing.Publish = updated.Publish;
                existing.ShowInMenu = updated.ShowInMenu;
                existing.ShowInFooter = updated.ShowInFooter;
                existing.FooterSortOrder = updated.FooterSortOrder;
                existing.FooterDisplayTitle = updated.FooterDisplayTitle?.Trim();
                existing.ParentId = updated.ParentId == Guid.Empty ? null : updated.ParentId;
                existing.Icon = updated.Icon;
                existing.UpdatedAtUtc = DateTime.UtcNow;

                await _context.SaveChangesAsync();
                return Ok(ApiResponse<object>.SuccessResponse(existing, "Category updated successfully."));
            }
            catch (Exception ex)
            {
                return StatusCode(500, ApiResponse<object>.FailureResponse(ex.InnerException?.Message ?? ex.Message));
            }
        }

        [HttpDelete("categories/{id:guid}")]
        public async Task<IActionResult> DeleteCategory(Guid id, [FromQuery] string? confirmationTitle = null)
        {
            var existing = await _context.PageCategories.Include(c => c.WebPages).FirstOrDefaultAsync(c => c.Id == id);
            if (existing == null) return NotFound(ApiResponse<object>.FailureResponse("Category not found."));

            if (existing.WebPages != null && existing.WebPages.Any())
            {
                var pageTitles = existing.WebPages.Select(p => p.Title).ToList();
                return BadRequest(ApiResponse<object>.FailureResponse($"Cannot delete category '{existing.Title}' because {existing.WebPages.Count} web page(s) belong to it: [{string.Join(", ", pageTitles)}]. Move or delete those pages first."));
            }

            if (!string.IsNullOrWhiteSpace(confirmationTitle) && !string.Equals(confirmationTitle.Trim(), existing.Title?.Trim(), StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest(ApiResponse<object>.FailureResponse($"Confirmation title mismatch. Please type '{existing.Title}' exactly."));
            }

            _context.PageCategories.Remove(existing);
            await _context.SaveChangesAsync();
            return Ok(ApiResponse<object>.SuccessResponse(null, $"Category '{existing.Title}

        /// <summary>
        /// Request model for batch deleting multiple web categories.
        /// </summary>
        public class BulkDeleteCategoriesRequest
        {
            /// <summary>
            /// List of category identifiers to delete.
            /// </summary>
            public List<Guid> Ids { get; set; } = new();

            /// <summary>
            /// Whether to unbind pages from deleted categories (setting PageCategoryId = null) instead of blocking deletion.
            /// </summary>
            public bool UnlinkPages { get; set; } = true;
        }

        /// <summary>
        /// Atomically bulk deletes multiple web navigation categories and unlinks attached web pages.
        /// </summary>
        /// <param name="request">Payload containing list of category GUIDs to delete.</param>
        /// <returns>Standardized API response confirming number of deleted records.</returns>
        [HttpPost("categories/bulk-delete")]
        public async Task<IActionResult> BulkDeleteCategories([FromBody] BulkDeleteCategoriesRequest request)
        {
            if (request?.Ids == null || request.Ids.Count == 0)
            {
                return BadRequest(ApiResponse<object>.FailureResponse("No category identifiers provided for bulk deletion."));
            }

            var targetIds = request.Ids.Distinct().ToList();
            var categories = await _context.PageCategories
                .Where(c => targetIds.Contains(c.Id))
                .Include(c => c.WebPages)
                .ToListAsync();

            if (!categories.Any())
            {
                return NotFound(ApiResponse<object>.FailureResponse("None of the specified categories were found."));
            }

            foreach (var cat in categories)
            {
                if (cat.WebPages != null && cat.WebPages.Any())
                {
                    if (request.UnlinkPages)
                    {
                        foreach (var page in cat.WebPages)
                        {
                            page.PageCategoryId = null;
                        }
                    }
                    else
                    {
                        return BadRequest(ApiResponse<object>.FailureResponse(
                            $"Cannot delete category '{cat.Title}' because it contains {cat.WebPages.Count} linked web page(s). Enable page unlinking to proceed."));
                    }
                }
            }

            _context.PageCategories.RemoveRange(categories);
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<object>.SuccessResponse(new
            {
                deletedCount = categories.Count
            }, $"{categories.Count} category/categories deleted successfully."));
        }

        // ==========================================
        // 3. PAGE SECTIONS & SECTION LISTS
        // ==========================================

        /// <summary>
        /// Retrieves layout sections with optional filtering by web page or home landing preset.
        /// Returns all sections across all pages with attached web page metadata when pageSet is 'all' or empty.
        /// </summary>
        /// <param name="pageSet">Optional preset filter: 'home' for landing page only, 'all' for all pages.</param>
        /// <param name="webPageId">Optional specific web page identifier.</param>
        /// <returns>A standardized API response with layout sections.</returns>
        [HttpGet("sections")]
        public async Task<IActionResult> GetSections([FromQuery] string? pageSet = null, [FromQuery] Guid? webPageId = null)
        {
            var query = _context.PageSections
                .Include(s => s.WebPage)
                .Include(s => s.PageSectionLists!.OrderBy(l => l.SortOrder))
                .Include(s => s.PageForm)
                    .ThenInclude(f => f!.Fields!.OrderBy(fld => fld.SortOrder))
                .AsQueryable();

            if (webPageId.HasValue)
            {
                query = query.Where(s => s.WebPageId == webPageId.Value).OrderBy(s => s.PageSortOrder);
            }
            else if (pageSet == "home")
            {
                var homePage = await _context.WebPages.FirstOrDefaultAsync(p => p.IsHomePage || p.DirectUrl == "/" || p.DirectUrl == "home" || p.DirectUrl == "index");
                if (homePage != null)
                {
                    query = query.Where(s => s.WebPageId == homePage.Id).OrderBy(s => s.PageSortOrder);
                }
                else
                {
                    query = query.OrderBy(s => s.PageSortOrder);
                }
            }
            else
            {
                query = query.OrderBy(s => s.WebPageId).ThenBy(s => s.PageSortOrder);
            }

            var sections = await query.ToListAsync();
            return Ok(ApiResponse<object>.SuccessResponse(sections, "Page sections retrieved."));
        }

        [HttpGet("sections/{id:guid}")]
        public async Task<IActionResult> GetSectionById(Guid id)
        {
            var section = await _context.PageSections
                .Include(s => s.WebPage)
                .Include(s => s.PageSectionLists!.OrderBy(l => l.SortOrder))
                .Include(s => s.PageForm)
                    .ThenInclude(f => f!.Fields!.OrderBy(fld => fld.SortOrder))
                .FirstOrDefaultAsync(s => s.Id == id);

            if (section == null) return NotFound(ApiResponse<object>.FailureResponse("Section not found."));
            section.ListCount = await _context.PageSectionLists.CountAsync(l => l.PageSectionId == id);
            return Ok(ApiResponse<object>.SuccessResponse(section, "Section details retrieved."));
        }

        [HttpPost("sections")]
        public async Task<IActionResult> CreateSection([FromBody] PageSection section)
        {
            section.Id = Guid.NewGuid();
            if (section.WebPageId == Guid.Empty) section.WebPageId = null;
            if (section.PageFormId == Guid.Empty) section.PageFormId = null;
            _context.PageSections.Add(section);
            await _context.SaveChangesAsync();
            return Ok(ApiResponse<object>.SuccessResponse(section, "Page section created successfully."));
        }

        [HttpPut("sections/{id:guid}")]
        public async Task<IActionResult> UpdateSection(Guid id, [FromBody] PageSection updated)
        {
            var existing = await _context.PageSections.FindAsync(id);
            if (existing == null) return NotFound(ApiResponse<object>.FailureResponse("Section not found."));

            existing.Title = updated.Title;
            existing.MiniTitle = updated.MiniTitle;
            existing.Qoute = updated.Qoute;
            existing.Description = updated.Description;
            existing.FullDescription = updated.FullDescription;
            existing.IconText = updated.IconText;
            existing.ButtonText = updated.ButtonText;
            existing.ButtonLink = updated.ButtonLink;
            existing.SecondButtonText = updated.SecondButtonText;
            existing.SecondButtonLink = updated.SecondButtonLink;
            existing.DisableButton = updated.DisableButton;
            existing.DirectUrl = updated.DirectUrl;
            existing.ImageUrl = updated.ImageUrl;
            existing.ImageKey = updated.ImageKey;
            existing.SecondImageUrl = updated.SecondImageUrl;
            existing.SecondImageKey = updated.SecondImageKey;
            existing.VideoUrl = updated.VideoUrl;
            existing.VideoKey = updated.VideoKey;
            existing.YoutubeUrlLink = updated.YoutubeUrlLink;
            existing.TemplateKey = updated.TemplateKey;
            existing.CustomClass = updated.CustomClass;
            existing.BackgroundColor = updated.BackgroundColor;
            existing.Disable = updated.Disable;
            existing.FixedAfterFooter = updated.FixedAfterFooter;
            existing.PageSortOrder = updated.PageSortOrder;
            existing.AddToRibon = updated.AddToRibon;
            existing.RibonCustomDisplayTitle = updated.RibonCustomDisplayTitle;
            existing.RibonSortOrder = updated.RibonSortOrder;
            existing.WebPageId = updated.WebPageId == Guid.Empty ? null : updated.WebPageId;
            existing.PageFormId = updated.PageFormId == Guid.Empty ? null : updated.PageFormId;
            existing.FormKey = updated.FormKey;

            await _context.SaveChangesAsync();
            return Ok(ApiResponse<object>.SuccessResponse(existing, "Section updated successfully."));
        }

        /// <summary>
        /// Permanently deletes a layout section if it has no repeating child list items.
        /// If sub-items exist, blocks deletion and returns a clear custom error requesting their removal.
        /// </summary>
        /// <param name="id">The unique identifier of the section to delete.</param>
        /// <param name="forceCascade">Whether to forcefully delete the layout section along with all repeating sub-items.</param>
        /// <returns>A standardized API response confirming the deletion or reporting existing sub-items.</returns>
        [HttpDelete("sections/{id:guid}")]
        public async Task<IActionResult> DeleteSection(Guid id, [FromQuery] bool forceCascade = false)
        {
            var existing = await _context.PageSections.FindAsync(id);
            if (existing == null) return NotFound(ApiResponse<object>.FailureResponse("Section not found."));

            // Guard check: Restrict deletion if the section contains repeating sub-items
            var listCount = await _context.PageSectionLists.CountAsync(l => l.PageSectionId == id);
            if (listCount > 0 && !forceCascade)
            {
                return BadRequest(ApiResponse<object>.FailureResponse(
                    $"Cannot delete section '{existing.Title ?? "Layout Section"}' because it contains {listCount} repeating sub-item(s). Please remove all sub-items before deleting.",
                    null,
                    "ERR-2005",
                    $"PageSection {id} contains {listCount} linked PageSectionLists. Restricting deletion."));
            }

            if (forceCascade && listCount > 0)
            {
                var subItems = await _context.PageSectionLists
                    .Where(l => l.PageSectionId == id)
                    .ToListAsync();

                if (subItems.Any())
                {
                    _context.PageSectionLists.RemoveRange(subItems);
                }
            }

            _context.PageSections.Remove(existing);
            await _context.SaveChangesAsync();
            return Ok(ApiResponse<object>.SuccessResponse(null, "Section deleted successfully."));
        }

        /// <summary>
        /// Request model for batch deleting multiple layout sections.
        /// </summary>
        public class BulkDeleteSectionsRequest
        {
            /// <summary>
            /// List of section identifiers to delete.
            /// </summary>
            public List<Guid> Ids { get; set; } = new();

            /// <summary>
            /// Whether to forcefully delete associated repeating sub-items.
            /// </summary>
            public bool ForceCascade { get; set; } = true;
        }

        /// <summary>
        /// Atomically bulk deletes multiple page layout sections and their child repeating sub-items.
        /// </summary>
        /// <param name="request">Payload containing list of section GUIDs to delete.</param>
        /// <returns>Standardized API response confirming number of deleted records.</returns>
        [HttpPost("sections/bulk-delete")]
        public async Task<IActionResult> BulkDeleteSections([FromBody] BulkDeleteSectionsRequest request)
        {
            if (request?.Ids == null || request.Ids.Count == 0)
            {
                return BadRequest(ApiResponse<object>.FailureResponse("No section identifiers provided for bulk deletion."));
            }

            var targetIds = request.Ids.Distinct().ToList();
            var sections = await _context.PageSections
                .Where(s => targetIds.Contains(s.Id))
                .ToListAsync();

            if (!sections.Any())
            {
                return NotFound(ApiResponse<object>.FailureResponse("None of the specified sections were found."));
            }

            var foundIds = sections.Select(s => s.Id).ToList();

            // Cascade delete child repeating sub-items if requested
            if (request.ForceCascade)
            {
                var subItems = await _context.PageSectionLists
                    .Where(l => l.PageSectionId.HasValue && foundIds.Contains(l.PageSectionId.Value))
                    .ToListAsync();

                if (subItems.Any())
                {
                    _context.PageSectionLists.RemoveRange(subItems);
                }
            }

            _context.PageSections.RemoveRange(sections);
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<object>.SuccessResponse(new
            {
                deletedCount = sections.Count
            }, $"{sections.Count} layout section(s) deleted successfully."));
        }

        public class BulkTransferSectionsRequest
        {
            /// <summary>
            /// List of section GUIDs to move or copy.
            /// </summary>
            public List<Guid> Ids { get; set; } = new();

            /// <summary>
            /// Destination WebPage ID.
            /// </summary>
            public Guid TargetPageId { get; set; }

            /// <summary>
            /// Transfer action mode: "move" or "copy".
            /// </summary>
            public string Action { get; set; } = "move";
        }

        /// <summary>
        /// Bulk moves or copies layout sections to a destination web page.
        /// When moving, updates WebPageId. When copying, creates cloned PageSections with newly assigned GUIDs
        /// and clones all attached child PageSectionLists (sub-items/cards).
        /// </summary>
        [HttpPost("sections/bulk-transfer")]
        public async Task<IActionResult> BulkTransferSections([FromBody] BulkTransferSectionsRequest request)
        {
            if (request?.Ids == null || request.Ids.Count == 0)
            {
                return BadRequest(ApiResponse<object>.FailureResponse("No section identifiers provided."));
            }

            var targetPage = await _context.WebPages.FindAsync(request.TargetPageId);
            if (targetPage == null)
            {
                return NotFound(ApiResponse<object>.FailureResponse("Target web page not found."));
            }

            var isCopy = string.Equals(request.Action, "copy", StringComparison.OrdinalIgnoreCase);
            var targetIds = request.Ids.Distinct().ToList();

            if (isCopy)
            {
                var originalSections = await _context.PageSections
                    .Include(s => s.PageSectionLists)
                    .Where(s => targetIds.Contains(s.Id))
                    .ToListAsync();

                if (!originalSections.Any())
                {
                    return NotFound(ApiResponse<object>.FailureResponse("None of the specified sections were found to copy."));
                }

                var currentMaxSort = await _context.PageSections
                    .Where(s => s.WebPageId == request.TargetPageId)
                    .MaxAsync(s => (int?)s.PageSortOrder) ?? 0;

                var clonedSections = new List<PageSection>();

                foreach (var orig in originalSections)
                {
                    currentMaxSort++;
                    var cloned = new PageSection
                    {
                        Id = Guid.NewGuid(),
                        WebPageId = request.TargetPageId,
                        TemplateKey = orig.TemplateKey,
                        MasterTemplateId = orig.MasterTemplateId,
                        Title = orig.Title != null ? $"{orig.Title} (Copy)" : "Untitled (Copy)",
                        MiniTitle = orig.MiniTitle,
                        Qoute = orig.Qoute,
                        Description = orig.Description,
                        FullDescription = orig.FullDescription,
                        ImageUrl = orig.ImageUrl,
                        ImageKey = orig.ImageKey,
                        SecondImageUrl = orig.SecondImageUrl,
                        SecondImageKey = orig.SecondImageKey,
                        VideoUrl = orig.VideoUrl,
                        VideoKey = orig.VideoKey,
                        YoutubeUrlLink = orig.YoutubeUrlLink,
                        IconText = orig.IconText,
                        ButtonText = orig.ButtonText,
                        ButtonLink = orig.ButtonLink,
                        SecondButtonText = orig.SecondButtonText,
                        SecondButtonLink = orig.SecondButtonLink,
                        DirectUrl = orig.DirectUrl,
                        DisableButton = orig.DisableButton,
                        Disable = orig.Disable,
                        FixedAfterFooter = orig.FixedAfterFooter,
                        PageSortOrder = currentMaxSort,
                        HtmlTemplate = orig.HtmlTemplate,
                        CssStyles = orig.CssStyles,
                        JsScript = orig.JsScript,
                        CustomClass = orig.CustomClass,
                        BackgroundColor = orig.BackgroundColor,
                        IsCustomized = orig.IsCustomized,
                        IsDefault = false,
                        AddToRibon = orig.AddToRibon,
                        RibonCustomDisplayTitle = orig.RibonCustomDisplayTitle,
                        RibonSortOrder = orig.RibonSortOrder,
                        PageFormId = orig.PageFormId,
                        FormKey = orig.FormKey
                    };

                    if (orig.PageSectionLists != null && orig.PageSectionLists.Any())
                    {
                        foreach (var sub in orig.PageSectionLists)
                        {
                            cloned.PageSectionLists.Add(new PageSectionList
                            {
                                Id = Guid.NewGuid(),
                                PageSectionId = cloned.Id,
                                Title = sub.Title,
                                MiniTitle = sub.MiniTitle,
                                Description = sub.Description,
                                MoreDescription = sub.MoreDescription,
                                ImageUrl = sub.ImageUrl,
                                ImageKey = sub.ImageKey,
                                SecondImageUrl = sub.SecondImageUrl,
                                IconText = sub.IconText,
                                ButtonText = sub.ButtonText,
                                ButtonLink = sub.ButtonLink,
                                SortOrder = sub.SortOrder,
                                Disable = sub.Disable,
                                DisableButton = sub.DisableButton,
                                CustomClass = sub.CustomClass
                            });
                        }
                    }

                    clonedSections.Add(cloned);
                }

                _context.PageSections.AddRange(clonedSections);
                await _context.SaveChangesAsync();

                return Ok(ApiResponse<object>.SuccessResponse(new
                {
                    count = clonedSections.Count,
                    targetPageTitle = targetPage.Title
                }, $"{clonedSections.Count} section(s) copied successfully to '{targetPage.Title}'."));
            }
            else
            {
                // MOVE
                var sections = await _context.PageSections
                    .Where(s => targetIds.Contains(s.Id))
                    .ToListAsync();

                if (!sections.Any())
                {
                    return NotFound(ApiResponse<object>.FailureResponse("None of the specified sections were found to move."));
                }

                var currentMaxSort = await _context.PageSections
                    .Where(s => s.WebPageId == request.TargetPageId)
                    .MaxAsync(s => (int?)s.PageSortOrder) ?? 0;

                foreach (var section in sections)
                {
                    currentMaxSort++;
                    section.WebPageId = request.TargetPageId;
                    section.PageSortOrder = currentMaxSort;
                }

                await _context.SaveChangesAsync();

                return Ok(ApiResponse<object>.SuccessResponse(new
                {
                    count = sections.Count,
                    targetPageTitle = targetPage.Title
                }, $"{sections.Count} section(s) moved successfully to '{targetPage.Title}'."));
            }
        }



        // ==========================================
        // 3B. PAGE SECTION LISTS (Sub-Items)
        // ==========================================

        /// <summary>
        /// Retrieves all repeating sub-items across all layout sections irrespective of parent page,
        /// including parent section and parent web page metadata for global overview.
        /// </summary>
        /// <param name="sectionId">Optional filter for a specific section.</param>
        /// <returns>A standardized API response with the list of section sub-items.</returns>
        [HttpGet("section-lists")]
        public async Task<IActionResult> GetAllSectionLists([FromQuery] Guid? sectionId = null)
        {
            var query = _context.PageSectionLists
                .Include(l => l.PageSection)
                    .ThenInclude(s => s!.WebPage)
                .AsQueryable();

            if (sectionId.HasValue)
            {
                query = query.Where(l => l.PageSectionId == sectionId.Value);
            }

            var items = await query.OrderBy(l => l.PageSectionId).ThenBy(l => l.SortOrder).ToListAsync();
            return Ok(ApiResponse<object>.SuccessResponse(items, "Section sub-items retrieved successfully."));
        }

        [HttpGet("section-lists/{id:guid}")]
        public async Task<IActionResult> GetSectionListById(Guid id)
        {
            var item = await _context.PageSectionLists.FindAsync(id);
            if (item == null) return NotFound(ApiResponse<object>.FailureResponse("Section item not found."));
            return Ok(ApiResponse<object>.SuccessResponse(item, "Section item retrieved."));
        }

        [HttpPost("section-lists")]
        public async Task<IActionResult> CreateSectionList([FromBody] PageSectionList item)
        {
            item.Id = Guid.NewGuid();
            _context.PageSectionLists.Add(item);
            await _context.SaveChangesAsync();
            return Ok(ApiResponse<object>.SuccessResponse(item, "Section sub-item created successfully."));
        }

        [HttpPut("section-lists/{id:guid}")]
        public async Task<IActionResult> UpdateSectionList(Guid id, [FromBody] PageSectionList updated)
        {
            var existing = await _context.PageSectionLists.FindAsync(id);
            if (existing == null) return NotFound(ApiResponse<object>.FailureResponse("Section item not found."));

            existing.Title = updated.Title;
            existing.MiniTitle = updated.MiniTitle;
            existing.Description = updated.Description;
            existing.MoreDescription = updated.MoreDescription;
            existing.IconText = updated.IconText;
            existing.ImageUrl = updated.ImageUrl;
            existing.ImageKey = updated.ImageKey;
            existing.VideoUrl = updated.VideoUrl;
            existing.VideoKey = updated.VideoKey;
            existing.ButtonText = updated.ButtonText;
            existing.ButtonLink = updated.ButtonLink;
            existing.DirectUrl = updated.DirectUrl;
            existing.SortOrder = updated.SortOrder;
            existing.Disable = updated.Disable;
            existing.AddToRibon = updated.AddToRibon;
            existing.RibonCustomDisplayTitle = updated.RibonCustomDisplayTitle;
            existing.RibonSortOrder = updated.RibonSortOrder;
            existing.PageSectionId = updated.PageSectionId == Guid.Empty ? null : updated.PageSectionId;

            await _context.SaveChangesAsync();
            return Ok(ApiResponse<object>.SuccessResponse(existing, "Section sub-item updated successfully."));
        }

        [HttpDelete("section-lists/{id:guid}")]
        public async Task<IActionResult> DeleteSectionList(Guid id)
        {
            var existing = await _context.PageSectionLists.FindAsync(id);
            if (existing == null) return NotFound(ApiResponse<object>.FailureResponse("Section item not found."));

            _context.PageSectionLists.Remove(existing);
            await _context.SaveChangesAsync();
            return Ok(ApiResponse<object>.SuccessResponse(null, "Section sub-item deleted successfully."));
        }

        /// <summary>
        /// Request model for batch deleting multiple repeating sub-items / cards.
        /// </summary>
        public class BulkDeleteSectionListsRequest
        {
            /// <summary>
            /// List of sub-item identifiers to delete.
            /// </summary>
            public List<Guid> Ids { get; set; } = new();
        }

        /// <summary>
        /// Atomically bulk deletes multiple repeating sub-items / card items.
        /// </summary>
        /// <param name="request">Payload containing list of sub-item GUIDs to delete.</param>
        /// <returns>Standardized API response confirming number of deleted records.</returns>
        [HttpPost("section-lists/bulk-delete")]
        public async Task<IActionResult> BulkDeleteSectionLists([FromBody] BulkDeleteSectionListsRequest request)
        {
            if (request?.Ids == null || request.Ids.Count == 0)
            {
                return BadRequest(ApiResponse<object>.FailureResponse("No sub-item identifiers provided for bulk deletion."));
            }

            var targetIds = request.Ids.Distinct().ToList();
            var subItems = await _context.PageSectionLists
                .Where(l => targetIds.Contains(l.Id))
                .ToListAsync();

            if (!subItems.Any())
            {
                return NotFound(ApiResponse<object>.FailureResponse("None of the specified sub-items were found."));
            }

            _context.PageSectionLists.RemoveRange(subItems);
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<object>.SuccessResponse(new
            {
                deletedCount = subItems.Count
            }, $"{subItems.Count} repeating sub-item(s) deleted successfully."));
        }

        public class BulkTransferSectionListsRequest
        {
            /// <summary>
            /// List of sub-item / card GUIDs to move or copy.
            /// </summary>
            public List<Guid> Ids { get; set; } = new();

            /// <summary>
            /// Destination PageSection ID.
            /// </summary>
            public Guid TargetSectionId { get; set; }

            /// <summary>
            /// Transfer action mode: "move" or "copy".
            /// </summary>
            public string Action { get; set; } = "move";
        }

        /// <summary>
        /// Bulk moves or copies repeating sub-items/cards to a destination page section.
        /// When moving, updates PageSectionId. When copying, creates cloned PageSectionList records with newly assigned GUIDs.
        /// </summary>
        [HttpPost("section-lists/bulk-transfer")]
        public async Task<IActionResult> BulkTransferSectionLists([FromBody] BulkTransferSectionListsRequest request)
        {
            if (request?.Ids == null || request.Ids.Count == 0)
            {
                return BadRequest(ApiResponse<object>.FailureResponse("No sub-item identifiers provided."));
            }

            var targetSection = await _context.PageSections.FindAsync(request.TargetSectionId);
            if (targetSection == null)
            {
                return NotFound(ApiResponse<object>.FailureResponse("Target layout section not found."));
            }

            var isCopy = string.Equals(request.Action, "copy", StringComparison.OrdinalIgnoreCase);
            var targetIds = request.Ids.Distinct().ToList();

            if (isCopy)
            {
                var originalItems = await _context.PageSectionLists
                    .Where(l => targetIds.Contains(l.Id))
                    .ToListAsync();

                if (!originalItems.Any())
                {
                    return NotFound(ApiResponse<object>.FailureResponse("None of the specified sub-items were found to copy."));
                }

                var currentMaxSort = await _context.PageSectionLists
                    .Where(l => l.PageSectionId == request.TargetSectionId)
                    .MaxAsync(l => (int?)l.SortOrder) ?? 0;

                var clonedItems = new List<PageSectionList>();

                foreach (var orig in originalItems)
                {
                    currentMaxSort++;
                    clonedItems.Add(new PageSectionList
                    {
                        Id = Guid.NewGuid(),
                        PageSectionId = request.TargetSectionId,
                        Title = orig.Title != null ? $"{orig.Title} (Copy)" : "Untitled (Copy)",
                        MiniTitle = orig.MiniTitle,
                        Description = orig.Description,
                        MoreDescription = orig.MoreDescription,
                        ImageUrl = orig.ImageUrl,
                        ImageKey = orig.ImageKey,
                        SecondImageUrl = orig.SecondImageUrl,
                        IconText = orig.IconText,
                        ButtonText = orig.ButtonText,
                        ButtonLink = orig.ButtonLink,
                        SortOrder = currentMaxSort,
                        Disable = orig.Disable,
                        DisableButton = orig.DisableButton,
                        CustomClass = orig.CustomClass
                    });
                }

                _context.PageSectionLists.AddRange(clonedItems);
                await _context.SaveChangesAsync();

                return Ok(ApiResponse<object>.SuccessResponse(new
                {
                    count = clonedItems.Count,
                    targetSectionTitle = targetSection.Title
                }, $"{clonedItems.Count} sub-item(s) copied successfully to section '{targetSection.Title}'."));
            }
            else
            {
                // MOVE
                var subItems = await _context.PageSectionLists
                    .Where(l => targetIds.Contains(l.Id))
                    .ToListAsync();

                if (!subItems.Any())
                {
                    return NotFound(ApiResponse<object>.FailureResponse("None of the specified sub-items were found to move."));
                }

                var currentMaxSort = await _context.PageSectionLists
                    .Where(l => l.PageSectionId == request.TargetSectionId)
                    .MaxAsync(l => (int?)l.SortOrder) ?? 0;

                foreach (var item in subItems)
                {
                    currentMaxSort++;
                    item.PageSectionId = request.TargetSectionId;
                    item.SortOrder = currentMaxSort;
                }

                await _context.SaveChangesAsync();

                return Ok(ApiResponse<object>.SuccessResponse(new
                {
                    count = subItems.Count,
                    targetSectionTitle = targetSection.Title
                }, $"{subItems.Count} sub-item(s) moved successfully to section '{targetSection.Title}'."));
            }
        }




        // ==========================================
        // 8. BLOG CATEGORIES
        // ==========================================

        [HttpGet("blog-categories")]
        [AllowAnonymous]
        public async Task<IActionResult> GetBlogCategories()
        {
            var categories = await _context.BlogCategories
                .AsNoTracking()
                .OrderBy(c => c.Title)
                .Select(c => new
                {
                    c.Id,
                    c.Title,
                    c.Publish,
                    c.ParentId,
                    ParentTitle = c.Parent != null ? c.Parent.Title : null,
                    PostCount = _context.Blogs.Count(b => b.BlogCategoryId == c.Id)
                })
                .ToListAsync();

            return Ok(ApiResponse<object>.SuccessResponse(categories, "Blog categories retrieved successfully."));
        }

        [HttpPost("blog-categories")]
        public async Task<IActionResult> CreateBlogCategory([FromBody] CreateBlogCategoryRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Title))
                return BadRequest(ApiResponse<object>.FailureResponse("Category title is required."));

            var category = new BlogCategory
            {
                Id = Guid.NewGuid(),
                Title = request.Title.Trim(),
                Publish = request.Publish,
                ParentId = request.ParentId.HasValue && request.ParentId.Value != Guid.Empty ? request.ParentId : null
            };

            _context.BlogCategories.Add(category);
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<object>.SuccessResponse(category, "Blog category created successfully."));
        }

        [HttpPut("blog-categories/{id:guid}")]
        public async Task<IActionResult> UpdateBlogCategory(Guid id, [FromBody] CreateBlogCategoryRequest request)
        {
            var category = await _context.BlogCategories.FindAsync(id);
            if (category == null) return NotFound(ApiResponse<object>.FailureResponse("Blog category not found."));

            category.Title = request.Title?.Trim() ?? category.Title;
            category.Publish = request.Publish;
            category.ParentId = request.ParentId.HasValue && request.ParentId.Value != Guid.Empty ? request.ParentId : null;

            await _context.SaveChangesAsync();
            return Ok(ApiResponse<object>.SuccessResponse(category, "Blog category updated successfully."));
        }

        [HttpDelete("blog-categories/{id:guid}")]
        public async Task<IActionResult> DeleteBlogCategory(Guid id)
        {
            var category = await _context.BlogCategories.FindAsync(id);
            if (category == null) return NotFound(ApiResponse<object>.FailureResponse("Blog category not found."));

            var hasPosts = await _context.Blogs.AnyAsync(b => b.BlogCategoryId == id);
            if (hasPosts)
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Cannot delete category because it contains associated blog posts."));
            }

            _context.BlogCategories.Remove(category);
            await _context.SaveChangesAsync();
            return Ok(ApiResponse<object>.SuccessResponse(null, "Blog category deleted successfully."));
        }

        /// <summary>
        /// Request model for batch deleting multiple blog categories.
        /// </summary>
        public class BulkDeleteBlogCategoriesRequest
        {
            /// <summary>
            /// List of blog category identifiers to delete.
            /// </summary>
            public List<Guid> Ids { get; set; } = new();

            /// <summary>
            /// Whether to unbind blog posts from deleted categories (setting BlogCategoryId = null) instead of blocking.
            /// </summary>
            public bool UnlinkPosts { get; set; } = true;
        }

        /// <summary>
        /// Atomically bulk deletes multiple blog categories.
        /// </summary>
        /// <param name="request">Payload containing list of blog category GUIDs to delete.</param>
        /// <returns>Standardized API response confirming number of deleted records.</returns>
        [HttpPost("blog-categories/bulk-delete")]
        public async Task<IActionResult> BulkDeleteBlogCategories([FromBody] BulkDeleteBlogCategoriesRequest request)
        {
            if (request?.Ids == null || request.Ids.Count == 0)
            {
                return BadRequest(ApiResponse<object>.FailureResponse("No blog category identifiers provided for bulk deletion."));
            }

            var targetIds = request.Ids.Distinct().ToList();
            var categories = await _context.BlogCategories
                .Where(c => targetIds.Contains(c.Id))
                .ToListAsync();

            if (!categories.Any())
            {
                return NotFound(ApiResponse<object>.FailureResponse("None of the specified blog categories were found."));
            }

            var posts = await _context.Blogs
                .Where(b => b.BlogCategoryId.HasValue && targetIds.Contains(b.BlogCategoryId.Value))
                .ToListAsync();

            if (posts.Any())
            {
                if (request.UnlinkPosts)
                {
                    foreach (var post in posts)
                    {
                        post.BlogCategoryId = null;
                    }
                }
                else
                {
                    return BadRequest(ApiResponse<object>.FailureResponse(
                        $"Cannot delete categories because {posts.Count} blog post(s) are linked to them. Enable post unlinking to proceed."));
                }
            }

            _context.BlogCategories.RemoveRange(categories);
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<object>.SuccessResponse(new
            {
                deletedCount = categories.Count
            }, $"{categories.Count} blog category/categories deleted successfully."));
        }



        // ==========================================
        // 9. BLOG POSTS & ARTICLES
        // ==========================================

        [HttpGet("blogs")]
        [AllowAnonymous]
        public async Task<IActionResult> GetBlogs([FromQuery] Guid? categoryId, [FromQuery] string? search, [FromQuery] bool? publishedOnly)
        {
            var query = _context.Blogs
                .Include(b => b.BlogCategory)
                .AsNoTracking()
                .AsQueryable();

            if (categoryId.HasValue && categoryId.Value != Guid.Empty)
            {
                query = query.Where(b => b.BlogCategoryId == categoryId.Value);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLower();
                query = query.Where(b => (b.Title != null && b.Title.ToLower().Contains(s)) ||
                                         (b.Description != null && b.Description.ToLower().Contains(s)));
            }

            if (publishedOnly == true)
            {
                query = query.Where(b => b.Publish);
            }

            var blogs = await query
                .OrderByDescending(b => b.Date)
                .Select(b => new
                {
                    b.Id,
                    b.Title,
                    b.Date,
                    b.Publish,
                    b.IsScheduled,
                    b.ScheduledPublishDate,
                    b.SortOrder,
                    b.ImageUrl,
                    b.ImageKey,
                    b.VideoUrl,
                    b.BlogCategoryId,
                    CategoryTitle = b.BlogCategory != null ? b.BlogCategory.Title : "Uncategorized",
                    b.Description,
                    b.FullDescription,
                    b.AddToRibon,
                    b.RibonCustomDisplayTitle,
                    b.RibonSortOrder
                })
                .ToListAsync();

            return Ok(ApiResponse<object>.SuccessResponse(blogs, "Blog articles retrieved successfully."));
        }

        [HttpGet("blogs/{id:guid}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetBlogById(Guid id)
        {
            var blog = await _context.Blogs
                .Include(b => b.BlogCategory)
                .AsNoTracking()
                .FirstOrDefaultAsync(b => b.Id == id);

            if (blog == null) return NotFound(ApiResponse<object>.FailureResponse("Blog post not found."));

            return Ok(ApiResponse<object>.SuccessResponse(new
            {
                blog.Id,
                blog.Title,
                blog.Date,
                blog.Publish,
                blog.IsScheduled,
                blog.ScheduledPublishDate,
                blog.SortOrder,
                blog.ImageUrl,
                blog.ImageKey,
                blog.VideoUrl,
                blog.BlogCategoryId,
                CategoryTitle = blog.BlogCategory != null ? blog.BlogCategory.Title : "Uncategorized",
                blog.Description,
                blog.FullDescription,
                blog.AddToRibon,
                blog.RibonCustomDisplayTitle,
                blog.RibonSortOrder
            }, "Blog article retrieved successfully."));
        }

        [HttpPost("blogs")]
        public async Task<IActionResult> CreateBlog([FromBody] CreateBlogRequest request)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(request.Title))
                    return BadRequest(ApiResponse<object>.FailureResponse("Blog title is required."));

                var isScheduled = request.IsScheduled && request.ScheduledPublishDate.HasValue && request.ScheduledPublishDate.Value > DateTime.UtcNow;

                var blog = new Blog
                {
                    Id = Guid.NewGuid(),
                    Title = request.Title.Trim(),
                    Description = request.Description?.Trim(),
                    FullDescription = request.FullDescription?.Trim(),
                    Date = request.Date ?? DateTime.UtcNow,
                    Publish = isScheduled ? false : request.Publish,
                    IsScheduled = isScheduled,
                    ScheduledPublishDate = isScheduled ? request.ScheduledPublishDate : null,
                    SortOrder = request.SortOrder,
                    ImageUrl = request.ImageUrl?.Trim(),
                    ImageKey = request.ImageKey?.Trim(),
                    VideoUrl = request.VideoUrl?.Trim(),
                    BlogCategoryId = request.BlogCategoryId.HasValue && request.BlogCategoryId.Value != Guid.Empty ? request.BlogCategoryId : null,
                    AddToRibon = request.AddToRibon,
                    RibonCustomDisplayTitle = request.RibonCustomDisplayTitle?.Trim(),
                    RibonSortOrder = request.RibonSortOrder
                };

                _context.Blogs.Add(blog);

                if (isScheduled && request.ScheduledPublishDate.HasValue)
                {
                    _context.BcpScheduledJobQueues.Add(new BcpScheduledJobQueue
                    {
                        SourceId = blog.Id.ToString(),
                        SourceModel = "Blog",
                        ActionType = "PublishBlog",
                        ScheduledAt = request.ScheduledPublishDate.Value,
                        Status = Ozikol_BCC.Domain.Enum.Enum.BcpQueueStatus.Queued,
                        CreatedAt = DateTime.UtcNow
                    });
                }

                await _context.SaveChangesAsync();
                return Ok(ApiResponse<object>.SuccessResponse(blog, "Blog article created successfully."));
            }
            catch (Exception ex)
            {
                var msg = ex.InnerException != null ? $"{ex.Message} -> {ex.InnerException.Message}" : ex.Message;
                return StatusCode(500, ApiResponse<object>.FailureResponse($"Failed to save blog article: {msg}"));
            }
        }

        [HttpPut("blogs/{id:guid}")]
        public async Task<IActionResult> UpdateBlog(Guid id, [FromBody] CreateBlogRequest request)
        {
            try
            {
                var blog = await _context.Blogs.FindAsync(id);
                if (blog == null) return NotFound(ApiResponse<object>.FailureResponse("Blog post not found."));

                var isScheduled = request.IsScheduled && request.ScheduledPublishDate.HasValue && request.ScheduledPublishDate.Value > DateTime.UtcNow;

                blog.Title = request.Title?.Trim() ?? blog.Title;
                blog.Description = request.Description?.Trim() ?? blog.Description;
                blog.FullDescription = request.FullDescription?.Trim() ?? blog.FullDescription;
                blog.Publish = isScheduled ? false : request.Publish;
                blog.IsScheduled = isScheduled;
                blog.ScheduledPublishDate = isScheduled ? request.ScheduledPublishDate : null;
                blog.SortOrder = request.SortOrder;
                blog.ImageUrl = request.ImageUrl?.Trim() ?? blog.ImageUrl;
                blog.ImageKey = request.ImageKey?.Trim() ?? blog.ImageKey;
                blog.VideoUrl = request.VideoUrl?.Trim() ?? blog.VideoUrl;
                blog.BlogCategoryId = request.BlogCategoryId.HasValue && request.BlogCategoryId.Value != Guid.Empty ? request.BlogCategoryId : null;
                blog.AddToRibon = request.AddToRibon;
                blog.RibonCustomDisplayTitle = request.RibonCustomDisplayTitle?.Trim() ?? blog.RibonCustomDisplayTitle;
                blog.RibonSortOrder = request.RibonSortOrder;

                if (request.Date.HasValue)
                {
                    blog.Date = request.Date.Value;
                }

                if (isScheduled && request.ScheduledPublishDate.HasValue)
                {
                    var existingJob = await _context.BcpScheduledJobQueues
                        .FirstOrDefaultAsync(q => q.SourceId == blog.Id.ToString() && q.SourceModel == "Blog" && q.Status == Ozikol_BCC.Domain.Enum.Enum.BcpQueueStatus.Queued);

                    if (existingJob != null)
                    {
                        existingJob.ScheduledAt = request.ScheduledPublishDate.Value;
                    }
                    else
                    {
                        _context.BcpScheduledJobQueues.Add(new BcpScheduledJobQueue
                        {
                            SourceId = blog.Id.ToString(),
                            SourceModel = "Blog",
                            ActionType = "PublishBlog",
                            ScheduledAt = request.ScheduledPublishDate.Value,
                            Status = Ozikol_BCC.Domain.Enum.Enum.BcpQueueStatus.Queued,
                            CreatedAt = DateTime.UtcNow
                        });
                    }
                }

                await _context.SaveChangesAsync();
                return Ok(ApiResponse<object>.SuccessResponse(blog, "Blog article updated successfully."));
            }
            catch (Exception ex)
            {
                var msg = ex.InnerException != null ? $"{ex.Message} -> {ex.InnerException.Message}" : ex.Message;
                return StatusCode(500, ApiResponse<object>.FailureResponse($"Failed to update blog article: {msg}"));
            }
        }

        [HttpPut("blogs/{id:guid}/toggle-publish")]
        public async Task<IActionResult> TogglePublishBlog(Guid id)
        {
            var blog = await _context.Blogs.FindAsync(id);
            if (blog == null) return NotFound(ApiResponse<object>.FailureResponse("Blog post not found."));

            blog.Publish = !blog.Publish;
            if (blog.Publish)
            {
                blog.IsScheduled = false;
            }
            await _context.SaveChangesAsync();
            return Ok(ApiResponse<object>.SuccessResponse(new { blog.Id, blog.Publish }, $"Blog post {(blog.Publish ? "published" : "unpublished")} successfully."));
        }

        [HttpDelete("blogs/{id:guid}")]
        public async Task<IActionResult> DeleteBlog(Guid id)
        {
            var blog = await _context.Blogs.FindAsync(id);
            if (blog == null) return NotFound(ApiResponse<object>.FailureResponse("Blog post not found."));

            _context.Blogs.Remove(blog);
            await _context.SaveChangesAsync();
            return Ok(ApiResponse<object>.SuccessResponse(null, "Blog article deleted successfully."));
        }

        /// <summary>
        /// Request model for batch deleting multiple blog posts.
        /// </summary>
        public class BulkDeleteBlogsRequest
        {
            /// <summary>
            /// List of blog article identifiers to delete.
            /// </summary>
            public List<Guid> Ids { get; set; } = new();
        }

        /// <summary>
        /// Atomically bulk deletes multiple blog articles.
        /// </summary>
        /// <param name="request">Payload containing list of blog post GUIDs to delete.</param>
        /// <returns>Standardized API response confirming number of deleted records.</returns>
        [HttpPost("blogs/bulk-delete")]
        public async Task<IActionResult> BulkDeleteBlogs([FromBody] BulkDeleteBlogsRequest request)
        {
            if (request?.Ids == null || request.Ids.Count == 0)
            {
                return BadRequest(ApiResponse<object>.FailureResponse("No blog identifiers provided for bulk deletion."));
            }

            var targetIds = request.Ids.Distinct().ToList();
            var blogs = await _context.Blogs
                .Where(b => targetIds.Contains(b.Id))
                .ToListAsync();

            if (!blogs.Any())
            {
                return NotFound(ApiResponse<object>.FailureResponse("None of the specified blog posts were found."));
            }

            _context.Blogs.RemoveRange(blogs);
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<object>.SuccessResponse(new
            {
                deletedCount = blogs.Count
            }, $"{blogs.Count} blog article(s) deleted successfully."));
        }



        // ==========================================
        // 9. TENANT INSTALLED UI TEMPLATES & MARKETPLACE
        // ==========================================

        /// <summary>
        /// Retrieves the default template blueprint package directly from the central blueprint files (template.html, styles.css, script.js, sample-content.json).
        /// Powers the CMS Visual Studios by eliminating hardcoded inline templates from TypeScript components.
        /// </summary>
        /// <param name="category">Template category key (e.g. "footer", "menu", "hero", "breadcrumb", "body", "blog", "blog-detail").</param>
        /// <param name="preset">Optional sub-preset key (e.g. for body section archetypes).</param>
        /// <param name="reload">Optional flag to force reload fresh file contents from disk.</param>
        /// <returns>Populated blueprint package with raw file contents and structured sample data.</returns>
        [HttpGet("templates/blueprint/{category}")]
        public IActionResult GetCategoryBlueprint(string category, [FromQuery] string? preset = null, [FromQuery] bool reload = false)
        {
            try
            {
                var bp = CentralBlueprintLoader.GetBlueprint(category, preset, reload);
                object? sampleObj = null;
                if (!string.IsNullOrWhiteSpace(bp.SampleContentJson))
                {
                    try
                    {
                        sampleObj = JsonSerializer.Deserialize<object>(bp.SampleContentJson);
                    }
                    catch
                    {
                        sampleObj = bp.SampleContentJson;
                    }
                }

                return Ok(ApiResponse<object>.SuccessResponse(new
                {
                    name = bp.Name,
                    categoryKey = bp.CategoryKey,
                    variantCode = bp.VariantCode,
                    description = bp.Description,
                    icon = bp.Icon,
                    badge = bp.Badge,
                    htmlTemplate = bp.HtmlTemplate,
                    cssStyles = bp.CssStyles,
                    jsScript = bp.JsScript,
                    sampleContent = sampleObj,
                    sampleContentJson = bp.SampleContentJson
                }, $"Default blueprint for '{category}' retrieved from central files."));
            }
            catch (Exception ex)
            {
                return NotFound(ApiResponse<object>.FailureResponse($"Blueprint for category '{category}' not found: {ex.Message}"));
            }
        }

        /// <summary>
        /// Retrieves all canonical body section archetype presets directly from the central blueprint suite.
        /// Powers the Body Visual Studio archetype selector by eliminating hardcoded inline presets from TypeScript.
        /// </summary>
        /// <param name="reload">Optional flag to force reload fresh file contents from disk.</param>
        /// <returns>Collection of all 12 section archetypes populated with markup, styles, scripts, and sample content.</returns>
        [HttpGet("templates/blueprint/body/presets")]
        public IActionResult GetBodyPresets([FromQuery] bool reload = false)
        {
            try
            {
                if (reload)
                {
                    CentralBlueprintLoader.InvalidateCache();
                }
                var presets = CentralBlueprintLoader.GetBodySectionBlueprints();
                var dtos = presets.Select(p =>
                {
                    object? sampleObj = null;
                    if (!string.IsNullOrWhiteSpace(p.SampleContentJson))
                    {
                        try
                        {
                            sampleObj = JsonSerializer.Deserialize<object>(p.SampleContentJson);
                        }
                        catch
                        {
                            sampleObj = p.SampleContentJson;
                        }
                    }

                    return new
                    {
                        name = p.Name,
                        icon = p.Icon,
                        badge = p.Badge,
                        description = p.Description,
                        html = p.HtmlTemplate,
                        css = p.CssStyles,
                        js = p.JsScript,
                        sampleContent = sampleObj
                    };
                }).ToList();

                return Ok(ApiResponse<object>.SuccessResponse(dtos, "Body section presets retrieved from central files."));
            }
            catch (Exception ex)
            {
                return BadRequest(ApiResponse<object>.FailureResponse($"Failed to load body section presets: {ex.Message}"));
            }
        }


        /// <summary>
        /// Retrieves all installed UI templates for this tenant from DashboardDbContext.
        /// </summary>
        [HttpGet("templates/installed")]
        public async Task<IActionResult> GetInstalledTemplates()
        {
            try
            {
                var list = await _context.TenantInstalledTemplates
                    .OrderByDescending(t => t.InstalledUtc)
                    .ToListAsync();

                return Ok(ApiResponse<object>.SuccessResponse(list, "Installed tenant UI templates retrieved successfully."));
            }
            catch (Exception ex)
            {
                var msg = ex.InnerException != null ? $"{ex.Message} -> {ex.InnerException.Message}" : ex.Message;
                return StatusCode(500, ApiResponse<object>.FailureResponse($"Failed to fetch installed templates: {msg}"));
            }
        }

        /// <summary>
        /// Installs or replaces a template into the tenant's database.
        /// Enforces Singleton Rule: Only ONE Menu (Navigation) and ONE Footer can be active at any time.
        /// Multi-instance modular categories (body, hero, etc.) can have unlimited installed templates.
        /// </summary>
        [HttpPost("templates/install")]
        public async Task<IActionResult> InstallTemplate([FromBody] InstallTemplateRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.TemplateKey) || string.IsNullOrWhiteSpace(request.CategoryKey))
            {
                return BadRequest(ApiResponse<object>.FailureResponse("TemplateKey and CategoryKey are required."));
            }

            // Pre-persistence Security Gatekeeper: Inspect incoming HTML, CSS, JS, and JSON
            var scanResult = _templateSecurityInspector.Inspect(
                request.HtmlTemplate,
                request.CssStyles,
                request.JsScript,
                request.DefaultContentJson);

            if (!scanResult.IsSecure)
            {
                var criticalCount = scanResult.Violations.Count(v => v.Severity == "Critical");
                return BadRequest(ApiResponse<object>.FailureResponse(
                    $"Template installation blocked: {criticalCount} security violation(s) detected.",
                    new { violations = scanResult.Violations }));
            }

            try
            {
                var catKey = request.CategoryKey.Trim().ToLowerInvariant();

                // 1. Singleton enforcement for Menu and Footer categories
                if (catKey == "menu")
                {
                    // Deactivate any existing active menu templates for this tenant
                    var existingMenus = await _context.TenantInstalledTemplates
                        .Where(t => t.CategoryKey.ToLower() == "menu" && t.IsActive)
                        .ToListAsync();

                    foreach (var m in existingMenus)
                    {
                        m.IsActive = false;
                    }
                }
                else if (catKey == "footer")
                {
                    // Deactivate any existing active footer templates for this tenant
                    var existingFooters = await _context.TenantInstalledTemplates
                        .Where(t => t.CategoryKey.ToLower() == "footer" && t.IsActive)
                        .ToListAsync();

                    foreach (var f in existingFooters)
                    {
                        f.IsActive = false;
                    }
                }

                // 2. Check if this specific template key was already installed previously
                var template = await _context.TenantInstalledTemplates
                    .FirstOrDefaultAsync(t => t.TemplateKey == request.TemplateKey || t.VariantCode == request.VariantCode);

                if (template != null)
                {
                    // Update and activate existing record
                    template.Name = request.Name;
                    template.CategoryKey = request.CategoryKey;
                    template.VariantCode = request.VariantCode;
                    template.HtmlTemplate = request.HtmlTemplate;
                    template.CssStyles = request.CssStyles;
                    template.JsScript = request.JsScript;
                    template.DefaultContentJson = request.DefaultContentJson;
                    template.InstalledVersion = string.IsNullOrWhiteSpace(request.InstalledVersion) ? "1.0.0" : request.InstalledVersion;
                    template.IsActive = true;
                    template.LastUpdatedUtc = DateTime.UtcNow;
                    if (request.MasterTemplateId.HasValue)
                    {
                        template.MasterTemplateId = request.MasterTemplateId.Value;
                    }
                }
                else
                {
                    // Create new installed template record
                    template = new TenantInstalledTemplate
                    {
                        MasterTemplateId = request.MasterTemplateId,
                        TemplateKey = request.TemplateKey,
                        CategoryKey = request.CategoryKey,
                        Name = request.Name,
                        VariantCode = request.VariantCode,
                        HtmlTemplate = request.HtmlTemplate,
                        CssStyles = request.CssStyles,
                        JsScript = request.JsScript,
                        DefaultContentJson = request.DefaultContentJson,
                        InstalledVersion = string.IsNullOrWhiteSpace(request.InstalledVersion) ? "1.0.0" : request.InstalledVersion,
                        IsActive = true,
                        IsCustomized = false,
                        InstalledUtc = DateTime.UtcNow
                    };
                    _context.TenantInstalledTemplates.Add(template);
                }

                await _context.SaveChangesAsync();

                var actionVerb = (catKey == "menu" || catKey == "footer") ? "activated as primary layout" : "installed";
                return Ok(ApiResponse<object>.SuccessResponse(template, $"Template '{template.Name}' successfully {actionVerb} in tenant library."));
            }
            catch (Exception ex)
            {
                var msg = ex.InnerException != null ? $"{ex.Message} -> {ex.InnerException.Message}" : ex.Message;
                return StatusCode(500, ApiResponse<object>.FailureResponse($"Failed to install template: {msg}"));
            }
        }

        /// <summary>
        /// Sets a specific installed template as active (e.g. switching active menu, hero, breadcrumb, or footer).
        /// Automatically deactivates competing templates within the same singleton category.
        /// Accepts either a Guid identifier, TemplateKey, or VariantCode.
        /// </summary>
        /// <param name="id">The unique identifier, variant code, or template key to activate.</param>
        /// <returns>The activated template record.</returns>
        [HttpPost("templates/{id}/set-active")]
        public async Task<IActionResult> SetActiveTemplate(string id)
        {
            if (string.IsNullOrWhiteSpace(id))
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Template identifier is required."));
            }

            TenantInstalledTemplate? template = null;
            if (Guid.TryParse(id, out var guidId))
            {
                template = await _context.TenantInstalledTemplates.FindAsync(guidId);
            }

            if (template == null)
            {
                var normalizedId = id.Trim().ToLowerInvariant();
                template = await _context.TenantInstalledTemplates
                    .FirstOrDefaultAsync(t => t.VariantCode.ToLower() == normalizedId || t.TemplateKey.ToLower() == normalizedId);
            }

            if (template == null) return NotFound(ApiResponse<object>.FailureResponse("Installed template not found."));

            var catKey = template.CategoryKey.Trim().ToLowerInvariant();
            var singletonCategories = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                "menu", "hero", "footer", "breadcrumb", "blog", "blog_detail", "ecommerce"
            };

            if (singletonCategories.Contains(catKey))
            {
                var sameCategory = await _context.TenantInstalledTemplates
                    .Where(t => t.CategoryKey.ToLower() == catKey && t.Id != template.Id && t.IsActive)
                    .ToListAsync();

                foreach (var item in sameCategory)
                {
                    item.IsActive = false;
                }
            }

            template.IsActive = true;
            template.LastUpdatedUtc = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<object>.SuccessResponse(template, $"Template '{template.Name}' is now active."));
        }

        /// <summary>
        /// Activates all structural layout templates (Menu, Hero, Breadcrumb, Footer, Blog, Blog Detail, Ecommerce)
        /// belonging to the specified Theme Suite, while safely deactivating competing structural templates.
        /// </summary>
        /// <param name="suiteCode">The theme suite code identifier (e.g., 'suite_apexmodern', 'suite_corporate').</param>
        /// <returns>Summary of the activated suite.</returns>
        [HttpPost("templates/activate-suite/{suiteCode}")]
        public async Task<IActionResult> ActivateThemeSuite(string suiteCode)
        {
            if (string.IsNullOrWhiteSpace(suiteCode))
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Suite code is required."));
            }

            try
            {
                var cleanCode = suiteCode.Trim().ToLowerInvariant();
                var allTemplates = await _context.TenantInstalledTemplates.ToListAsync();
                var singletonCategories = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
                {
                    "menu", "hero", "footer", "breadcrumb", "blog", "blog_detail", "ecommerce"
                };

                // Helper to resolve the canonical theme suite code for any installed template
                string GetTemplateSuiteCode(TenantInstalledTemplate t)
                {
                    var vCode = (t.VariantCode ?? string.Empty).ToUpperInvariant();
                    var tKey = (t.TemplateKey ?? string.Empty).ToUpperInvariant();
                    var name = (t.Name ?? string.Empty).ToUpperInvariant();

                    if (vCode.Contains("SUITE_APEXMODERN") || tKey.Contains("SUITE_APEXMODERN") || name.Contains("APEX MODERN"))
                    {
                        return "suite_apexmodern";
                    }

                    var match = System.Text.RegularExpressions.Regex.Match(vCode, @"SUITE_([A-Z0-9]+)");
                    if (!match.Success)
                    {
                        match = System.Text.RegularExpressions.Regex.Match(tKey, @"SUITE_([A-Z0-9]+)");
                    }

                    if (match.Success)
                    {
                        return $"suite_{match.Groups[1].Value.ToLowerInvariant()}";
                    }

                    return "suite_corporate";
                }

                // Helper to check if a template belongs to the requested suite
                bool BelongsToSuite(TenantInstalledTemplate t)
                {
                    var templateSuite = GetTemplateSuiteCode(t);
                    return string.Equals(templateSuite, cleanCode, StringComparison.OrdinalIgnoreCase)
                        || cleanCode.Contains(templateSuite)
                        || templateSuite.Contains(cleanCode);
                }

                int activatedCount = 0;
                var suiteSingletons = allTemplates
                    .Where(t => BelongsToSuite(t) && singletonCategories.Contains(t.CategoryKey))
                    .ToList();

                var suiteSingletonCategories = suiteSingletons.Select(s => s.CategoryKey.ToLowerInvariant()).ToHashSet();

                // Deactivate competing singletons and activate suite singletons
                foreach (var item in allTemplates.Where(t => singletonCategories.Contains(t.CategoryKey)))
                {
                    if (BelongsToSuite(item))
                    {
                        item.IsActive = true;
                        item.LastUpdatedUtc = DateTime.UtcNow;
                        activatedCount++;
                    }
                    else if (suiteSingletonCategories.Contains(item.CategoryKey.ToLowerInvariant()))
                    {
                        item.IsActive = false;
                        item.LastUpdatedUtc = DateTime.UtcNow;
                    }
                }

                // Synchronize SiteCodeInjectionTags (Head stylesheets, fonts, footer scripts)
                var allTags = await _context.SiteCodeInjectionTags.ToListAsync();
                foreach (var tag in allTags)
                {
                    var tagSuite = (tag.SuiteCode ?? string.Empty).ToLowerInvariant();
                    if (tagSuite == "global" || string.IsNullOrWhiteSpace(tagSuite))
                    {
                        // Global tags (e.g. general analytics, universal meta tags) stay active
                        tag.IsActive = true;
                    }
                    else if (tagSuite.Equals(cleanCode, StringComparison.OrdinalIgnoreCase) ||
                             (cleanCode == "suite_corporate" && (tagSuite == "suite_corporate" || tag.IsDefault)))
                    {
                        tag.IsActive = true;
                        tag.UpdatedAtUtc = DateTime.UtcNow;
                    }
                    else
                    {
                        // Deactivate competing suite-specific stylesheets and scripts
                        tag.IsActive = false;
                        tag.UpdatedAtUtc = DateTime.UtcNow;
                    }
                }

                await _context.SaveChangesAsync();

                return Ok(ApiResponse<object>.SuccessResponse(new
                {
                    SuiteCode = suiteCode,
                    ActivatedCount = activatedCount
                }, $"Theme suite '{suiteCode}' activated successfully with {activatedCount} core components and isolated code injections."));
            }
            catch (Exception ex)
            {
                var msg = ex.InnerException != null ? $"{ex.Message} -> {ex.InnerException.Message}" : ex.Message;
                return StatusCode(500, ApiResponse<object>.FailureResponse($"Failed to activate theme suite: {msg}"));
            }
        }

        /// <summary>
        /// Retrieves an inventory of all active PageSections using a specific installed template blueprint.
        /// Powers the interactive deletion modal allowing admins to preview affected content.
        /// Accepts either a Guid identifier, TemplateKey, or VariantCode.
        /// </summary>
        /// <param name="id">The unique identifier (Guid string, TemplateKey, or VariantCode) of the installed template.</param>
        /// <returns>A collection of linked PageSections with parent WebPage details.</returns>
        [HttpGet("templates/{id}/linked-content")]
        public async Task<IActionResult> GetTemplateLinkedContent(string id)
        {
            if (string.IsNullOrWhiteSpace(id))
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Template identifier is required."));
            }

            try
            {
                TenantInstalledTemplate? template = null;

                // 1. Resolve template by Guid primary key if parsed successfully
                if (Guid.TryParse(id, out var guidId))
                {
                    template = await _context.TenantInstalledTemplates.FindAsync(guidId);
                }

                // 2. Fallback to resolving by TemplateKey or VariantCode
                if (template == null)
                {
                    template = await _context.TenantInstalledTemplates
                        .FirstOrDefaultAsync(t => t.TemplateKey == id || t.VariantCode == id);
                }

                if (template == null)
                {
                    return NotFound(ApiResponse<object>.FailureResponse($"Installed template '{id}' not found."));
                }

                var tKey = template.TemplateKey;
                var vCode = template.VariantCode;

                var linkedSections = await _context.PageSections
                    .Where(s => s.TemplateKey != null && (s.TemplateKey == tKey || (vCode != null && s.TemplateKey == vCode)))
                    .Select(s => new
                    {
                        SectionId = s.Id,
                        SectionTitle = s.Title ?? "(Untitled Section)",
                        MiniTitle = s.MiniTitle,
                        WebPageId = s.WebPageId,
                        WebPageTitle = s.WebPage != null ? s.WebPage.Title : "Unassigned Page",
                        WebPageSlug = s.WebPage != null ? (s.WebPage.DirectUrl ?? s.WebPage.Title) : "home",
                        SubItemCount = s.PageSectionLists != null ? s.PageSectionLists.Count : 0
                    })
                    .ToListAsync();

                return Ok(ApiResponse<object>.SuccessResponse(new
                {
                    TemplateId = template.Id,
                    TemplateName = template.Name,
                    TemplateKey = template.TemplateKey,
                    CategoryKey = template.CategoryKey,
                    IsDefault = template.IsDefault,
                    LinkedSectionCount = linkedSections.Count,
                    LinkedSections = linkedSections
                }, "Linked content inventory retrieved successfully."));
            }
            catch (Exception ex)
            {
                var msg = ex.InnerException != null ? $"{ex.Message} -> {ex.InnerException.Message}" : ex.Message;
                return StatusCode(500, ApiResponse<object>.FailureResponse($"Failed to retrieve template linked content: {msg}"));
            }
        }

        /// <summary>
        /// Uninstalls / removes a template from the tenant database, with optional cascading deletion of linked page sections.
        /// Accepts either a Guid identifier, TemplateKey, or VariantCode.
        /// </summary>
        /// <param name="id">The unique identifier (Guid string, TemplateKey, or VariantCode) of the installed template.</param>
        /// <param name="deleteLinkedContent">If true, permanently deletes all PageSections linked to this template. If false, unlinks the TemplateKey.</param>
        /// <returns>Confirmation of the deletion operation.</returns>
        [HttpDelete("templates/installed/{id}")]
        public async Task<IActionResult> UninstallTemplate(string id, [FromQuery] bool deleteLinkedContent = false)
        {
            if (string.IsNullOrWhiteSpace(id))
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Template identifier is required."));
            }

            try
            {
                TenantInstalledTemplate? template = null;

                // 1. Resolve template by Guid primary key if parsed successfully
                if (Guid.TryParse(id, out var guidId))
                {
                    template = await _context.TenantInstalledTemplates.FindAsync(guidId);
                }

                // 2. Fallback to resolving by TemplateKey or VariantCode
                if (template == null)
                {
                    template = await _context.TenantInstalledTemplates
                        .FirstOrDefaultAsync(t => t.TemplateKey == id || t.VariantCode == id);
                }

                if (template == null)
                {
                    return NotFound(ApiResponse<object>.FailureResponse($"Installed template '{id}' not found."));
                }

                var tKey = template.TemplateKey;
                var vCode = template.VariantCode;

                var linkedSections = await _context.PageSections
                    .Where(s => s.TemplateKey != null && (s.TemplateKey == tKey || (vCode != null && s.TemplateKey == vCode)))
                    .ToListAsync();

                int affectedSectionCount = linkedSections.Count;

                if (deleteLinkedContent)
                {
                    // Cascade delete linked sections and their sub-items
                    if (linkedSections.Count > 0)
                    {
                        var sectionIds = linkedSections.Select(s => s.Id).ToList();
                        var childLists = await _context.PageSectionLists
                            .Where(l => l.PageSectionId.HasValue && sectionIds.Contains(l.PageSectionId.Value))
                            .ToListAsync();

                        if (childLists.Count > 0)
                        {
                            _context.PageSectionLists.RemoveRange(childLists);
                        }

                        _context.PageSections.RemoveRange(linkedSections);
                    }
                }
                else
                {
                    // Preserve section content; unassign template key so layout fallback is engaged safely
                    foreach (var sec in linkedSections)
                    {
                        sec.TemplateKey = null;
                    }
                }

                // Remove the template record permanently from tenant database
                _context.TenantInstalledTemplates.Remove(template);
                await _context.SaveChangesAsync();

                string msg = deleteLinkedContent && affectedSectionCount > 0
                    ? $"Template '{template.Name}' and {affectedSectionCount} linked page section(s) were permanently deleted."
                    : $"Template '{template.Name}' removed from library. {affectedSectionCount} page section(s) were unlinked and preserved.";

                return Ok(ApiResponse<object>.SuccessResponse(new { templateId = template.Id, templateKey = template.TemplateKey }, msg));
            }
            catch (Exception ex)
            {
                var msg = ex.InnerException != null ? $"{ex.Message} -> {ex.InnerException.Message}" : ex.Message;
                return StatusCode(500, ApiResponse<object>.FailureResponse($"Failed to delete installed template: {msg}"));
            }
        }

        /// <summary>
        /// Clears all installed templates and site code injections from the tenant database.
        /// Provides a clean slate for fresh website template imports.
        /// </summary>
        /// <param name="wipeContent">If true, permanently wipes all PageSections and unpublishes WebPages.</param>
        /// <returns>A confirmation of the vault purge.</returns>
        [HttpDelete("templates/clear-all")]
        public async Task<IActionResult> ClearAllTemplatesAndInjections([FromQuery] bool wipeContent = false)
        {
            try
            {
                var templates = await _context.TenantInstalledTemplates.ToListAsync();
                if (templates.Count > 0)
                {
                    _context.TenantInstalledTemplates.RemoveRange(templates);
                }

                var tags = await _context.SiteCodeInjectionTags.ToListAsync();
                if (tags.Count > 0)
                {
                    _context.SiteCodeInjectionTags.RemoveRange(tags);
                }

                if (wipeContent)
                {
                    var sectionLists = await _context.PageSectionLists.ToListAsync();
                    if (sectionLists.Count > 0) _context.PageSectionLists.RemoveRange(sectionLists);

                    var sections = await _context.PageSections.ToListAsync();
                    if (sections.Count > 0) _context.PageSections.RemoveRange(sections);
                }

                await _context.SaveChangesAsync();

                string msg = wipeContent
                    ? "All installed templates, code injections, and website page sections have been permanently wiped."
                    : "All installed templates and code injections have been successfully cleared from the tenant database.";
                return Ok(ApiResponse<object>.SuccessResponse(null, msg));
            }
            catch (Exception ex)
            {
                var msg = ex.InnerException != null ? $"{ex.Message} -> {ex.InnerException.Message}" : ex.Message;
                return StatusCode(500, ApiResponse<object>.FailureResponse($"Failed to clear templates: {msg}"));
            }
        }

        /// <summary>
        /// Retrieves the complete inventory of installed templates, code injections, and linked page sections for a specific Theme Suite.
        /// Powers the suite deletion safety modal and inventory inspector.
        /// </summary>
        /// <param name="suiteCode">The theme suite code identifier (e.g. 'suite_pincret', 'suite_corporate').</param>
        /// <returns>Summary of templates, code injections, and linked content for the suite.</returns>
        [HttpGet("templates/suites/{suiteCode}/linked-content")]
        public async Task<IActionResult> GetThemeSuiteLinkedContent(string suiteCode)
        {
            if (string.IsNullOrWhiteSpace(suiteCode))
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Suite code is required."));
            }

            var cleanCode = suiteCode.Trim().ToLowerInvariant();
            var allTemplates = await _context.TenantInstalledTemplates.ToListAsync();

            string GetTemplateSuiteCode(TenantInstalledTemplate t)
            {
                var vCode = (t.VariantCode ?? string.Empty).ToUpperInvariant();
                var tKey = (t.TemplateKey ?? string.Empty).ToUpperInvariant();
                var name = (t.Name ?? string.Empty).ToUpperInvariant();

                if (vCode.Contains("SUITE_APEXMODERN") || tKey.Contains("SUITE_APEXMODERN") || name.Contains("APEX MODERN"))
                    return "suite_apexmodern";

                var match = System.Text.RegularExpressions.Regex.Match(vCode, @"SUITE_([A-Z0-9]+)");
                if (!match.Success)
                    match = System.Text.RegularExpressions.Regex.Match(tKey, @"SUITE_([A-Z0-9]+)");

                if (match.Success)
                    return $"suite_{match.Groups[1].Value.ToLowerInvariant()}";

                return "suite_corporate";
            }

            bool BelongsToSuite(TenantInstalledTemplate t)
            {
                var templateSuite = GetTemplateSuiteCode(t);
                return string.Equals(templateSuite, cleanCode, StringComparison.OrdinalIgnoreCase)
                    || cleanCode.Contains(templateSuite)
                    || templateSuite.Contains(cleanCode);
            }

            var suiteTemplates = allTemplates.Where(BelongsToSuite).ToList();
            var templateKeysList = suiteTemplates
                .SelectMany(t => new[] { t.TemplateKey, t.VariantCode })
                .Where(k => !string.IsNullOrWhiteSpace(k))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            var suiteTags = await _context.SiteCodeInjectionTags
                .Where(t => t.SuiteCode != null && t.SuiteCode.ToLower() == cleanCode)
                .ToListAsync();

            var linkedSections = await _context.PageSections
                .Include(s => s.WebPage)
                .Include(s => s.PageSectionLists)
                .Where(s => s.TemplateKey != null && templateKeysList.Contains(s.TemplateKey))
                .Select(s => new
                {
                    SectionId = s.Id,
                    SectionTitle = s.Title ?? "(Untitled Section)",
                    MiniTitle = s.MiniTitle,
                    TemplateKey = s.TemplateKey,
                    WebPageId = s.WebPageId,
                    WebPageTitle = s.WebPage != null ? s.WebPage.Title : "Unassigned Page",
                    WebPageSlug = s.WebPage != null ? (s.WebPage.DirectUrl ?? s.WebPage.Title) : "home",
                    SubItemCount = s.PageSectionLists != null ? s.PageSectionLists.Count : 0
                })
                .ToListAsync();

            var suiteName = suiteTemplates.FirstOrDefault()?.Name?.Split('(')[0]?.Trim() ?? suiteCode;

            return Ok(ApiResponse<object>.SuccessResponse(new
            {
                SuiteCode = suiteCode,
                SuiteName = suiteName,
                TemplateCount = suiteTemplates.Count,
                Templates = suiteTemplates.Select(t => new { t.Id, t.Name, t.CategoryKey, t.VariantCode, t.TemplateKey, t.IsActive }),
                CodeInjectionCount = suiteTags.Count,
                CodeInjections = suiteTags.Select(tg => new { tg.Id, tg.Name, tg.Zone, tg.TagType, tg.SortOrder }),
                LinkedSectionCount = linkedSections.Count,
                LinkedSections = linkedSections
            }, "Theme suite linked content inventory retrieved successfully."));
        }

        /// <summary>
        /// Uninstalls / deletes all templates and code injections belonging to a specific Theme Suite,
        /// with an optional parameter to also cascade delete associated page sections.
        /// </summary>
        /// <param name="suiteCode">The theme suite code identifier (e.g. 'suite_pincret', 'suite_corporate').</param>
        /// <param name="deleteLinkedContent">If true, deletes all associated PageSections; if false, unlinks them.</param>
        /// <returns>Confirmation of the suite deletion.</returns>
        [HttpDelete("templates/suites/{suiteCode}")]
        public async Task<IActionResult> DeleteThemeSuite(string suiteCode, [FromQuery] bool deleteLinkedContent = false)
        {
            if (string.IsNullOrWhiteSpace(suiteCode))
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Suite code is required."));
            }

            try
            {
                var cleanCode = suiteCode.Trim().ToLowerInvariant();
                var allTemplates = await _context.TenantInstalledTemplates.ToListAsync();

                string GetTemplateSuiteCode(TenantInstalledTemplate t)
                {
                    var vCode = (t.VariantCode ?? string.Empty).ToUpperInvariant();
                    var tKey = (t.TemplateKey ?? string.Empty).ToUpperInvariant();
                    var name = (t.Name ?? string.Empty).ToUpperInvariant();

                    if (vCode.Contains("SUITE_APEXMODERN") || tKey.Contains("SUITE_APEXMODERN") || name.Contains("APEX MODERN"))
                        return "suite_apexmodern";

                    var match = System.Text.RegularExpressions.Regex.Match(vCode, @"SUITE_([A-Z0-9]+)");
                    if (!match.Success)
                        match = System.Text.RegularExpressions.Regex.Match(tKey, @"SUITE_([A-Z0-9]+)");

                    if (match.Success)
                        return $"suite_{match.Groups[1].Value.ToLowerInvariant()}";

                    return "suite_corporate";
                }

                bool BelongsToSuite(TenantInstalledTemplate t)
                {
                    var templateSuite = GetTemplateSuiteCode(t);
                    return string.Equals(templateSuite, cleanCode, StringComparison.OrdinalIgnoreCase)
                        || cleanCode.Contains(templateSuite)
                        || templateSuite.Contains(cleanCode);
                }

                var suiteTemplates = allTemplates.Where(BelongsToSuite).ToList();
                if (suiteTemplates.Count == 0)
                {
                    return NotFound(ApiResponse<object>.FailureResponse($"No installed templates found for suite '{suiteCode}'."));
                }

                var templateKeysList = suiteTemplates
                    .SelectMany(t => new[] { t.TemplateKey, t.VariantCode })
                    .Where(k => !string.IsNullOrWhiteSpace(k))
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToList();

                var linkedSections = await _context.PageSections
                    .Include(s => s.PageSectionLists)
                    .Where(s => s.TemplateKey != null && templateKeysList.Contains(s.TemplateKey))
                    .ToListAsync();

                int affectedSectionCount = linkedSections.Count;

                if (deleteLinkedContent)
                {
                    if (linkedSections.Count > 0)
                    {
                        var sectionIds = linkedSections.Select(s => s.Id).ToList();
                        var childLists = await _context.PageSectionLists
                            .Where(l => l.PageSectionId.HasValue && sectionIds.Contains(l.PageSectionId.Value))
                            .ToListAsync();

                        if (childLists.Count > 0)
                        {
                            _context.PageSectionLists.RemoveRange(childLists);
                        }

                        _context.PageSections.RemoveRange(linkedSections);
                    }
                }
                else
                {
                    foreach (var sec in linkedSections)
                    {
                        sec.TemplateKey = null;
                    }
                }

                // Delete Suite Code Injections
                var suiteTags = await _context.SiteCodeInjectionTags
                    .Where(t => t.SuiteCode != null && t.SuiteCode.ToLower() == cleanCode)
                    .ToListAsync();

                if (suiteTags.Count > 0)
                {
                    _context.SiteCodeInjectionTags.RemoveRange(suiteTags);
                }

                // Delete Suite Templates
                _context.TenantInstalledTemplates.RemoveRange(suiteTemplates);

                await _context.SaveChangesAsync();

                string msg = deleteLinkedContent && affectedSectionCount > 0
                    ? $"Theme suite '{suiteCode}' ({suiteTemplates.Count} templates, {suiteTags.Count} tags) and {affectedSectionCount} linked page section(s) were permanently deleted."
                    : $"Theme suite '{suiteCode}' ({suiteTemplates.Count} templates, {suiteTags.Count} tags) removed from vault. {affectedSectionCount} page section(s) were unlinked and preserved.";

                return Ok(ApiResponse<object>.SuccessResponse(null, msg));
            }
            catch (Exception ex)
            {
                var msg = ex.InnerException != null ? $"{ex.Message} -> {ex.InnerException.Message}" : ex.Message;
                return StatusCode(500, ApiResponse<object>.FailureResponse($"Failed to delete theme suite: {msg}"));
            }
        }

        /// <summary>
        /// Retrieves the current workspace initialization status.
        /// Checks if the tenant has completed or skipped the first-run setup modal.
        /// </summary>
        /// <returns>Setup status payload with initialized flag, UTC timestamp, and chosen mode.</returns>
        [HttpGet("workspace/setup-status")]
        public async Task<IActionResult> GetWorkspaceSetupStatus()
        {
            var setting = await _context.MisWebsiteSettings.AsNoTracking().FirstOrDefaultAsync();
            
            // Check explicit flag or fallback to detecting existing pages or templates
            bool isExplicitlyInitialized = setting?.IsWorkspaceInitialized ?? false;
            bool hasExistingContent = await _context.WebPages.AnyAsync() || await _context.TenantInstalledTemplates.AnyAsync();
            bool isInitialized = isExplicitlyInitialized || hasExistingContent;

            return Ok(ApiResponse<object>.SuccessResponse(new
            {
                isInitialized = isInitialized,
                initializedUtc = setting?.WorkspaceInitializedUtc,
                mode = setting?.WorkspaceInitializationMode ?? (isInitialized ? "default_suite" : null)
            }));
        }

        /// <summary>
        /// Skips default website seeding, permanently marking the workspace as initialized in blank canvas mode.
        /// </summary>
        /// <returns>Confirmation result.</returns>
        [HttpPost("workspace/skip-setup")]
        public async Task<IActionResult> SkipWorkspaceSetup()
        {
            var setting = await _context.MisWebsiteSettings.FirstOrDefaultAsync();
            if (setting == null)
            {
                setting = new MisWebsiteSetting
                {
                    BrandName = "Organization",
                    WebsiteTitle = "Organization Command Center"
                };
                _context.MisWebsiteSettings.Add(setting);
            }

            setting.IsWorkspaceInitialized = true;
            setting.WorkspaceInitializedUtc = DateTime.UtcNow;
            setting.WorkspaceInitializationMode = "blank_canvas";
            setting.UpdatedAtUtc = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(ApiResponse<object>.SuccessResponse(new
            {
                isInitialized = true,
                initializedUtc = setting.WorkspaceInitializedUtc,
                mode = setting.WorkspaceInitializationMode
            }, "Workspace marked as blank canvas successfully."));
        }

        /// <summary>
        /// Restores only the canonical Corporate Theme Suite template blueprints and 3-zone code injection tags into the vault.
        /// Does NOT seed or alter website pages, sections, blogs, or forms.
        /// </summary>
        /// <returns>A confirmation of the templates-only vault restoration.</returns>
        [HttpPost("templates/reinstall-templates-only")]
        public async Task<IActionResult> ReinstallTemplatesOnly()
        {
            await TenantDefaultWebsiteSeeder.SeedCorporateSuiteTemplatesAsync(_context);

            return Ok(ApiResponse<object>.SuccessResponse(new
            {
                templatesRestored = true
            }, "Default Corporate Theme Suite templates and code injection tags restored to your vault."));
        }

        /// <summary>
        /// Seeds the complete turnkey website defaults into the tenant database:
        /// 1. 3 Standard CMS Forms (Contact Us, Newsletter, Service Request)
        /// 2. 3 Rich Editorial Blog Posts (Excerpts + Full Rich-Text HTML)
        /// 3. Standard Navigation Categories and WebPages
        /// 4. 10 Dedicated Body Sections distributed across Home, Services, About, and Contact pages
        /// 5. Installed Category Templates (Menu, Hero, 10 Body Sections, Blog Feed, Blog Detail, Footer)
        /// 6. Comprehensive SEO, Social, Favicon &amp; Mobile PWA tags in &lt;head&gt;
        /// Stamps IsWorkspaceInitialized = true with current UTC timestamp.
        /// </summary>
        /// <returns>A confirmation of the turnkey setup.</returns>
        [HttpPost("workspace/seed-defaults")]
        [HttpPost("website/seed-default-suite")]
        [HttpPost("templates/reinstall-defaults")]
        public async Task<IActionResult> SeedWorkspaceDefaults()
        {
            var setting = await _context.MisWebsiteSettings.FirstOrDefaultAsync();
            string orgName = setting?.BrandName ?? "Our Firm";

            await TenantDefaultWebsiteSeeder.SeedDefaultWebsiteSuiteAsync(_context, orgName);

            var updatedSetting = await _context.MisWebsiteSettings.AsNoTracking().FirstOrDefaultAsync();
            return Ok(ApiResponse<object>.SuccessResponse(new
            {
                isInitialized = true,
                initializedUtc = updatedSetting?.WorkspaceInitializedUtc,
                mode = updatedSetting?.WorkspaceInitializationMode
            }, "Complete turnkey website defaults, forms, blog articles, and sections initialized successfully!"));
        }

        /// <summary>
        /// Clears all demo pages, blog articles, and sections, resetting the workspace to a pristine blank canvas.
        /// </summary>
        /// <returns>Status payload confirming blank canvas state.</returns>
        [HttpPost("workspace/reset-blank")]
        public async Task<IActionResult> ResetWorkspaceToBlank()
        {
            await TenantDefaultWebsiteSeeder.ResetToBlankCanvasAsync(_context);

            var updatedSetting = await _context.MisWebsiteSettings.AsNoTracking().FirstOrDefaultAsync();
            return Ok(ApiResponse<object>.SuccessResponse(new
            {
                isInitialized = true,
                initializedUtc = updatedSetting?.WorkspaceInitializedUtc,
                mode = updatedSetting?.WorkspaceInitializationMode
            }, "Workspace successfully reset to a clean blank canvas."));
        }

        // ==========================================
        // 13. DIRECT CUSTOM SECTION TEMPLATES
        // ==========================================

        /// <summary>
        /// Creates or saves a section template directly in the tenant database without requiring a marketplace installation.
        /// Supports {{ Placeholders }} and optional CSS (CSS can be left blank when relying on global theme styles).
        /// </summary>
        /// <param name="request">The custom template definition.</param>
        /// <returns>The created or updated TenantInstalledTemplate.</returns>
        [HttpPost("templates")]
        [HttpPost("templates/custom")]
        public async Task<IActionResult> CreateCustomTemplate([FromBody] CreateCustomTemplateRequest request)
        {
            var rawCategory = string.IsNullOrWhiteSpace(request.CategoryKey) ? request.Category : request.CategoryKey;
            if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(rawCategory))
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Template Name and Category are required."));
            }

            // Pre-persistence Security Gatekeeper: Inspect incoming HTML, CSS, JS, and JSON
            var scanResult = _templateSecurityInspector.Inspect(
                request.HtmlTemplate,
                request.CssStyles,
                request.JsScript,
                request.DefaultContentJson);

            if (!scanResult.IsSecure)
            {
                var criticalCount = scanResult.Violations.Count(v => v.Severity == "Critical");
                return BadRequest(ApiResponse<object>.FailureResponse(
                    $"Template creation blocked: {criticalCount} security violation(s) detected.",
                    new { violations = scanResult.Violations }));
            }

            try
            {
                var catKey = rawCategory.Trim().ToLowerInvariant();
                var cleanName = request.Name.Trim();
                var cleanVariant = string.IsNullOrWhiteSpace(request.VariantCode)
                    ? $"{char.ToUpper(catKey[0])}{catKey[1..]}_{Guid.NewGuid().ToString("N")[..6]}"
                    : request.VariantCode.Trim();

                var cleanKey = string.IsNullOrWhiteSpace(request.TemplateKey)
                    ? cleanVariant
                    : request.TemplateKey.Trim();

                // 1. Singleton enforcement for Menu and Footer categories
                if (catKey == "menu")
                {
                    var existingMenus = await _context.TenantInstalledTemplates
                        .Where(t => t.CategoryKey.ToLower() == "menu" && t.IsActive)
                        .ToListAsync();

                    foreach (var m in existingMenus)
                    {
                        m.IsActive = false;
                    }
                }
                else if (catKey == "footer")
                {
                    var existingFooters = await _context.TenantInstalledTemplates
                        .Where(t => t.CategoryKey.ToLower() == "footer" && t.IsActive)
                        .ToListAsync();

                    foreach (var f in existingFooters)
                    {
                        f.IsActive = false;
                    }
                }

                // 2. Add or update tenant template
                var template = await _context.TenantInstalledTemplates
                    .FirstOrDefaultAsync(t => t.TemplateKey == cleanKey || t.VariantCode == cleanVariant);

                var versionString = string.IsNullOrWhiteSpace(request.InstalledVersion)
                    ? (string.IsNullOrWhiteSpace(request.Version) ? "1.0.0" : request.Version.Trim())
                    : request.InstalledVersion.Trim();

                if (template != null)
                {
                    template.Name = cleanName;
                    template.CategoryKey = catKey;
                    template.VariantCode = cleanVariant;
                    template.HtmlTemplate = request.HtmlTemplate ?? string.Empty;
                    template.CssStyles = request.CssStyles ?? string.Empty;
                    template.JsScript = request.JsScript;
                    template.DefaultContentJson = request.DefaultContentJson;
                    template.InstalledVersion = versionString;
                    template.IsCustomized = true;
                    template.IsActive = true;
                    template.LastUpdatedUtc = DateTime.UtcNow;
                }
                else
                {
                    template = new TenantInstalledTemplate
                    {
                        Id = Guid.NewGuid(),
                        TemplateKey = cleanKey,
                        CategoryKey = catKey,
                        Name = cleanName,
                        VariantCode = cleanVariant,
                        HtmlTemplate = request.HtmlTemplate ?? string.Empty,
                        CssStyles = request.CssStyles ?? string.Empty,
                        JsScript = request.JsScript,
                        DefaultContentJson = request.DefaultContentJson,
                        InstalledVersion = versionString,
                        IsCustomized = true,
                        IsActive = true,
                        InstalledUtc = DateTime.UtcNow
                    };
                    _context.TenantInstalledTemplates.Add(template);
                }

                await _context.SaveChangesAsync();
                return Ok(ApiResponse<object>.SuccessResponse(template, $"Custom template '{template.Name}' saved successfully."));
            }
            catch (Exception ex)
            {
                var msg = ex.InnerException != null ? $"{ex.Message} -> {ex.InnerException.Message}" : ex.Message;
                return StatusCode(500, ApiResponse<object>.FailureResponse($"Failed to save custom template: {msg}"));
            }
        }

        /// <summary>
        /// Retrieves an installed UI template by its unique identifier (Guid string, TemplateKey, or VariantCode).
        /// </summary>
        /// <param name="id">The unique identifier, template key, or variant code of the template.</param>
        /// <returns>The installed template record.</returns>
        [HttpGet("templates/{id}")]
        public async Task<IActionResult> GetTemplateById(string id)
        {
            if (string.IsNullOrWhiteSpace(id))
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Template identifier is required."));
            }

            try
            {
                TenantInstalledTemplate? template = null;
                if (Guid.TryParse(id, out var guidId))
                {
                    template = await _context.TenantInstalledTemplates.FindAsync(guidId);
                }

                if (template == null)
                {
                    var normalizedId = id.Trim().ToLowerInvariant();
                    template = await _context.TenantInstalledTemplates
                        .FirstOrDefaultAsync(t => t.VariantCode.ToLower() == normalizedId || t.TemplateKey.ToLower() == normalizedId);
                }

                if (template == null)
                {
                    return NotFound(ApiResponse<object>.FailureResponse("Template not found."));
                }

                return Ok(ApiResponse<object>.SuccessResponse(template, "Template retrieved successfully."));
            }
            catch (Exception ex)
            {
                var msg = ex.InnerException != null ? $"{ex.Message} -> {ex.InnerException.Message}" : ex.Message;
                return StatusCode(500, ApiResponse<object>.FailureResponse($"Failed to fetch template: {msg}"));
            }
        }

        /// <summary>
        /// Updates an existing installed UI template by its unique identifier (Guid string, TemplateKey, or VariantCode).
        /// </summary>
        /// <param name="id">The unique identifier, template key, or variant code of the template to update.</param>
        /// <param name="request">The updated template content.</param>
        /// <returns>The updated template record.</returns>
        [HttpPut("templates/{id}")]
        public async Task<IActionResult> UpdateTemplate(string id, [FromBody] CreateCustomTemplateRequest request)
        {
            if (string.IsNullOrWhiteSpace(id))
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Template identifier is required."));
            }

            // Pre-persistence Security Gatekeeper: Inspect incoming HTML, CSS, JS, and JSON
            var scanResult = _templateSecurityInspector.Inspect(
                request.HtmlTemplate,
                request.CssStyles,
                request.JsScript,
                request.DefaultContentJson);

            if (!scanResult.IsSecure)
            {
                var criticalCount = scanResult.Violations.Count(v => v.Severity == "Critical");
                return BadRequest(ApiResponse<object>.FailureResponse(
                    $"Template update blocked: {criticalCount} security violation(s) detected.",
                    new { violations = scanResult.Violations }));
            }

            try
            {
                TenantInstalledTemplate? template = null;
                if (Guid.TryParse(id, out var guidId))
                {
                    template = await _context.TenantInstalledTemplates.FindAsync(guidId);
                }

                if (template == null)
                {
                    var normalizedId = id.Trim().ToLowerInvariant();
                    template = await _context.TenantInstalledTemplates
                        .FirstOrDefaultAsync(t => t.VariantCode.ToLower() == normalizedId || t.TemplateKey.ToLower() == normalizedId);
                }

                if (template == null)
                {
                    return NotFound(ApiResponse<object>.FailureResponse("Template not found."));
                }

                var rawCategory = string.IsNullOrWhiteSpace(request.CategoryKey) ? request.Category : request.CategoryKey;
                var catKey = !string.IsNullOrWhiteSpace(rawCategory) ? rawCategory.Trim().ToLowerInvariant() : template.CategoryKey;

                // Singleton enforcement if category is active menu or footer
                if (catKey == "menu")
                {
                    var existingMenus = await _context.TenantInstalledTemplates
                        .Where(t => t.CategoryKey.ToLower() == "menu" && t.Id != template.Id && t.IsActive)
                        .ToListAsync();
                    foreach (var m in existingMenus) m.IsActive = false;
                }
                else if (catKey == "footer")
                {
                    var existingFooters = await _context.TenantInstalledTemplates
                        .Where(t => t.CategoryKey.ToLower() == "footer" && t.Id != template.Id && t.IsActive)
                        .ToListAsync();
                    foreach (var f in existingFooters) f.IsActive = false;
                }

                if (!string.IsNullOrWhiteSpace(request.Name)) template.Name = request.Name.Trim();
                template.CategoryKey = catKey;
                if (!string.IsNullOrWhiteSpace(request.VariantCode)) template.VariantCode = request.VariantCode.Trim();
                if (request.HtmlTemplate != null) template.HtmlTemplate = request.HtmlTemplate;
                if (request.CssStyles != null) template.CssStyles = request.CssStyles;
                if (request.JsScript != null) template.JsScript = request.JsScript;
                if (request.DefaultContentJson != null) template.DefaultContentJson = request.DefaultContentJson;

                var versionString = string.IsNullOrWhiteSpace(request.InstalledVersion)
                    ? (string.IsNullOrWhiteSpace(request.Version) ? template.InstalledVersion : request.Version.Trim())
                    : request.InstalledVersion.Trim();
                template.InstalledVersion = versionString;

                template.IsCustomized = true;
                template.IsActive = true;
                template.LastUpdatedUtc = DateTime.UtcNow;

                await _context.SaveChangesAsync();
                return Ok(ApiResponse<object>.SuccessResponse(template, $"Template '{template.Name}' updated successfully."));
            }
            catch (Exception ex)
            {
                var msg = ex.InnerException != null ? $"{ex.Message} -> {ex.InnerException.Message}" : ex.Message;
                return StatusCode(500, ApiResponse<object>.FailureResponse($"Failed to update template: {msg}"));
            }
        }

        /// <summary>
        /// Snapshot of a single form input field, label, placeholder, and value from the active screen DOM.
        /// </summary>
        public class PageFormFieldSnapshotDto
        {
            public string? Name { get; set; }
            public string? Id { get; set; }
            public string? Label { get; set; }
            public string? Value { get; set; }
            public string? Placeholder { get; set; }
            public string? Type { get; set; }
        }

        /// <summary>
        /// Request model for AI template co-pilot analysis and generation.
        /// </summary>
        public class AiTemplateCopilotRequest
        {
            /// <summary>Prompt instructions from the user.</summary>
            public string Prompt { get; set; } = string.Empty;

            /// <summary>Raw HTML to study or convert.</summary>
            public string? RawHtml { get; set; }

            /// <summary>Raw CSS stylesheet to scope and study.</summary>
            public string? RawCss { get; set; }

            /// <summary>Raw JavaScript logic.</summary>
            public string? RawJs { get; set; }

            /// <summary>Selected AI provider engine (gemini, deepseek, qwen, ozi-flash, ozi-coder, ozi-deep).</summary>
            public string Provider { get; set; } = "ozi-flash";

            /// <summary>Category role hint (e.g. hero, cards, pricing, bento, faq, footer).</summary>
            public string? Category { get; set; }

            /// <summary>Current template name if editing.</summary>
            public string? CurrentTemplateName { get; set; }

            /// <summary>Console or studio page route where prompt was sent (e.g. /content/console/templates/create).</summary>
            public string? PageRoute { get; set; }

            /// <summary>Page title hint for history auditing.</summary>
            public string? PageTitle { get; set; }

            /// <summary>Optional uploaded or pasted visual mockup image URL or base64 data.</summary>
            public string? AttachedImageUrl { get; set; }

            /// <summary>Real-time harvested form fields, labels, placeholders, and current values from the active screen.</summary>
            public List<PageFormFieldSnapshotDto>? FormFields { get; set; }
        }

        /// <summary>
        /// Request model for marking an AI generated blueprint as implemented with snapshot.
        /// </summary>
        public class AiHistoryImplementRequest
        {
            /// <summary>The ID of the chat history interaction record.</summary>
            public Guid HistoryId { get; set; }

            /// <summary>Serialized JSON snapshot of the editor state prior to applying this AI result.</summary>
            public string? SnapshotJson { get; set; }
        }

        /// <summary>
        /// Request model for rolling back an implemented AI blueprint.
        /// </summary>
        public class AiHistoryRestoreRequest
        {
            /// <summary>The ID of the chat history interaction record to roll back.</summary>
            public Guid HistoryId { get; set; }
        }

        /// <summary>
        /// AI Template Co-pilot endpoint.
        /// Studies pasted raw code or generative prompts, cleans/scopes CSS,
        /// and converts hardcoded HTML elements into standard Ozikol CMS tokens.
        /// Automatically saves the interaction in the persistent tenant chat history.
        /// Outputs real-time execution logs to the developer console/terminal.
        /// </summary>
        /// <param name="request">The co-pilot request parameters.</param>
        /// <returns>Structured template blueprint with tokens, scoped styles, and history record identifier.</returns>
        [HttpPost("templates/ai-copilot")]
        public async Task<IActionResult> ProcessAiTemplateCopilot([FromBody] AiTemplateCopilotRequest request)
        {
            if (request == null || (string.IsNullOrWhiteSpace(request.Prompt) && string.IsNullOrWhiteSpace(request.RawHtml) && string.IsNullOrWhiteSpace(request.AttachedImageUrl)))
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Please provide a prompt, image, or raw code for the AI to analyze."));
            }

            var totalTimer = Stopwatch.StartNew();

            try
            {
                var prompt = request.Prompt?.Trim() ?? string.Empty;
                var rawHtml = request.RawHtml?.Trim() ?? string.Empty;
                var rawCss = request.RawCss?.Trim() ?? string.Empty;
                var rawJs = request.RawJs?.Trim() ?? string.Empty;
                var provider = string.IsNullOrWhiteSpace(request.Provider) ? "ozi-flash" : request.Provider.Trim().ToLowerInvariant();
                var cat = string.IsNullOrWhiteSpace(request.Category) ? "cards" : request.Category.Trim().ToLowerInvariant();

                var brandModelName = provider switch
                {
                    "ozi-coder" or "qwen" => "Ozi Coder",
                    "ozi-deep" or "deepseek" => "Ozi Deep",
                    _ => "Ozi Flash"
                };

                var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var currentUserEmail = User.FindFirst(ClaimTypes.Email)?.Value ?? User.Identity?.Name ?? "Studio User";

                // Formatted Boxed Header for Developer Terminal / CMD
                Console.WriteLine();
                Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] ╔═══════════════════════════════════════════════════════════════════════════════╗");
                Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] ║ [OZI AI CO-PILOT] Incoming Request from {currentUserEmail}".PadRight(79) + "║");
                Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] ║ Model Engine  : {brandModelName} ({provider})".PadRight(79) + "║");
                Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] ║ Active Screen : {request.PageTitle ?? "Studio Console"} ({request.PageRoute ?? "/content/console"})".PadRight(79) + "║");
                Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] ║ User Prompt   : \"{(prompt.Length > 55 ? prompt[..52] + "..." : prompt)}\"".PadRight(79) + "║");
                Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] ╚═══════════════════════════════════════════════════════════════════════════════╝");

                // Construct real-time screen and DOM context summary
                var screenContextBuilder = new System.Text.StringBuilder();
                screenContextBuilder.AppendLine($"ACTIVE SCREEN CONTEXT:");
                screenContextBuilder.AppendLine($"- Page: {request.PageTitle ?? "Studio Console"} ({request.PageRoute ?? "/content/console"})");

                if (request.FormFields != null && request.FormFields.Count > 0)
                {
                    Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] 📋 Harvested {request.FormFields.Count} Screen Form Input(s) / Placeholder(s):");
                    screenContextBuilder.AppendLine("- Visible Form Inputs & Placeholders on Screen:");
                    foreach (var field in request.FormFields.Take(20))
                    {
                        var labelStr = !string.IsNullOrWhiteSpace(field.Label) ? $"Label: \"{field.Label}\"" : $"Field: \"{field.Name ?? field.Id}\"";
                        var valStr = !string.IsNullOrWhiteSpace(field.Value) ? $"Current Value: \"{field.Value}\"" : "Current Value: (empty)";
                        var phStr = !string.IsNullOrWhiteSpace(field.Placeholder) ? $"Placeholder: \"{field.Placeholder}\"" : "Placeholder: (none)";
                        screenContextBuilder.AppendLine($"  * {labelStr} | {valStr} | {phStr}");
                        Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}]    • {labelStr} | {valStr} | {phStr}");
                    }
                }

                if (!string.IsNullOrWhiteSpace(request.AttachedImageUrl))
                {
                    Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] 🖼️ Visual Mockup Image Attached ({request.AttachedImageUrl.Length} chars/bytes)");
                    screenContextBuilder.AppendLine("- User attached a visual mockup image for conversion/inspection.");
                }

                if (!string.IsNullOrWhiteSpace(rawHtml))
                {
                    screenContextBuilder.AppendLine($"- Active HTML in Editor Buffer:\n{rawHtml}");
                    Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] 📄 Active Editor HTML Buffer: {rawHtml.Length} chars");
                }
                if (!string.IsNullOrWhiteSpace(rawCss))
                {
                    screenContextBuilder.AppendLine($"- Active CSS in Editor Buffer:\n{rawCss}");
                    Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] 🎨 Active Editor CSS Buffer: {rawCss.Length} chars");
                }

                var screenContext = screenContextBuilder.ToString();

                var lowerPrompt = prompt.ToLowerInvariant().Trim();
                var explicitCreationKeywords = new[] { "build", "create", "generate", "make", "design", "write code", "tokenize", "convert this", "refactor this", "re-style", "create section", "build section", "pricing table", "hero section", "cards section", "blueprint", "clean it up", "put placeholder", "menu", "navbar", "header" };
                
                // Comprehensive HTML, XML, doctypes, and comment symbols detection
                var isHtmlMarkup = Regex.IsMatch(prompt, @"(<!--[\s\S]*?-->|<\/?(?:html|head|body|header|nav|main|section|article|aside|footer|div|span|p|a|ul|ol|li|table|thead|tbody|tr|td|th|form|input|button|textarea|select|option|img|svg|i|h[1-6]|style|script|link|meta|figure|figcaption|video|audio|canvas|iframe|template|slot)\b|<!DOCTYPE)", RegexOptions.IgnoreCase)
                    || prompt.Contains("<!--")
                    || prompt.Contains("-->")
                    || prompt.Contains("</")
                    || (prompt.Contains("<") && prompt.Contains(">") && (prompt.Contains("class=") || prompt.Contains("id=") || prompt.Contains("href=") || prompt.Contains("src=") || prompt.Contains("style=")));

                var isExplicitQuestion = !isHtmlMarkup && (lowerPrompt.StartsWith("how") || lowerPrompt.StartsWith("what") || lowerPrompt.StartsWith("why") || lowerPrompt.StartsWith("where") || lowerPrompt.StartsWith("can you explain") || lowerPrompt.StartsWith("tell me"));
                var isCodeBlueprint = isHtmlMarkup || (!isExplicitQuestion && explicitCreationKeywords.Any(k => lowerPrompt.Contains(k))) || !string.IsNullOrWhiteSpace(request.AttachedImageUrl);

                string? parsedReply = null;
                string? generatedHtml = null;
                string? generatedCss = null;
                string? generatedCategory = cat;
                string? generatedTemplateName = null;

                var isSurgicalTransformation = prompt.Contains("surgical code transformer", StringComparison.OrdinalIgnoreCase) 
                                            || prompt.Contains("SURGICAL REPLACEMENT", StringComparison.OrdinalIgnoreCase)
                                            || prompt.Contains("YOUR MISSION:", StringComparison.OrdinalIgnoreCase)
                                            || prompt.Contains("TARGET PLACEHOLDERS:", StringComparison.OrdinalIgnoreCase);

                // Prompt construction for LLM with complete canonical Ozikol token reference
                string llmPrompt;
                if (isSurgicalTransformation && !string.IsNullOrWhiteSpace(rawHtml))
                {
                    isCodeBlueprint = true;
                    llmPrompt = $@"{prompt}

RAW HTML CODE TO SURGICALLY TRANSFORM (REPLACE PLACEHOLDERS IN-PLACE, PRESERVE 100% OF CSS CLASSES, TAGS, AND STRUCTURE):
```html
{rawHtml}
```

ABSOLUTE MANDATORY ARCHITECTURAL RULES:
1. 100% PRESERVATION: Keep EVERY single existing CSS class, ID, HTML tag, attribute, style, and structure from the RAW HTML CODE above exactly as-is.
2. ZERO INVENTIONS: DO NOT inject, invent, or append any element (such as sidebars, search boxes, widgets, newsletter boxes, or footer columns) that does not exist in the RAW HTML CODE above.
3. ZERO GENERIC OVERWRITES: NEVER replace original CSS classes with generic classes (e.g. NEVER use 'oz-blog-section', 'oz-blog-card', 'oz-blog-grid', etc.). Keep the original classes from the RAW HTML CODE verbatim.
4. REPEATED ITEMS & SLIDERS:
   - When repeated cards/columns/slides are found, keep ONLY ONE clean instance wrapped in the appropriate loop (e.g. {{{{#each PageSectionLists}}}} ... {{{{#/each}}}}) and remove the duplicate static cards.
   - SLIDERS/CAROUSELS CLEANUP (Swiper, Slick, Owl, Splide, Bootstrap, etc.):
     * Discard all cloned slides (e.g. 'swiper-slide-duplicate', 'slick-cloned', 'cloned').
     * Strip library runtime state classes from slides (remove 'swiper-slide-active', 'swiper-slide-duplicate', 'swiper-slide-visible', 'slick-active', etc.) while keeping base layout classes ('swiper-slide', 'slide-item', etc.).
     * Strip library runtime classes from slider containers (remove 'swiper-initialized', 'swiper-pointer-events', 'swiper-watch-progress', 'slick-initialized', etc.) while keeping base classes ('swiper', 'hero-slider', etc.).
     * Strip runtime inline styles ('width: ...px', 'transform: translate3d(...)', 'opacity: 0|1', 'transition-duration: ...') injected by slider engines, while preserving intentional background design styles (e.g. style=""background-image: url('{{{{ ImageUrl }}}}');"").
     * Strip auto-generated IDs (e.g. id=""swiper-wrapper-..."") and runtime aria attributes (data-swiper-slide-index=""..."", aria-label=""1 / 2"").
5. ROOT CLASS: Ensure the root container element includes {{{{ CustomClass }}}}.
6. OUTPUT ONLY: Return ONLY the complete transformed raw HTML. No markdown code fences, no explanations, no <style> tags.";
                }
                else if (isCodeBlueprint)
                {
                    llmPrompt = $@"You are Ozi AI, an expert front-end design copilot for Ozikol CMS.
Active Screen: {request.PageTitle ?? "Studio Console"} ({request.PageRoute ?? "/content/console"})

Context & Form Fields on Active Screen:
{screenContext}

User Request: ""{prompt}""

CANONICAL OZIKOL TOKENS SPECIFICATION (STRICT RULE: NEVER INVENT NON-EXISTENT TOKENS):

1. Navigation Menus & Headers (Category: menu / header):
   - Brand Logo Anchor:
     <a href=""{{{{ HomeUrl }}}}"">
       {{{{#if BrandLogo}}}}
         <img src=""{{{{ BrandLogo }}}}"" alt=""{{{{ BrandName }}}}"" class=""[keep original classes]"" />
       {{{{else}}}}
         <span class=""[keep original classes]"">{{{{ BrandName }}}}</span>
       {{{{/if}}}}
     </a>
   - Sequential 3-Zone Navigation (Desktop <ul> and Off-Canvas Mobile Drawer <ul>):
     Inside every navigation <ul> list, render the 3 sequential zones:
     {{{{#each NavItems=""first""}}}}
       {{{{#if IsDropdown}}}}
         <li class=""[original dropdown classes] {{{{ CustomClass }}}}"">
           <a href=""{{{{ Url }}}}"" class=""[original toggle classes]"">{{{{ Title }}}} [keep original chevron/indicator]</a>
           {{{{#if Pages}}}}
             <ul class=""[original dropdown-menu classes]"">
               {{{{#each Pages}}}}
                 <li><a href=""{{{{ Url }}}}"" class=""[original item classes] {{{{ CustomClass }}}}"">{{{{ Title }}}}</a></li>
               {{{{/each}}}}
             </ul>
           {{{{/if}}}}
         </li>
       {{{{else}}}}
         <li class=""[original classes] {{{{ CustomClass }}}}"">
           <a href=""{{{{ Url }}}}"" class=""[original classes]"">{{{{ Title }}}}</a>
         </li>
       {{{{/if}}}}
     {{{{/each}}}}

     {{{{#each NavItems=""middle""}}}}
       {{{{#if IsDropdown}}}}
         <li class=""[original dropdown classes] {{{{ CustomClass }}}}"">
           <a href=""{{{{ Url }}}}"" class=""[original toggle classes]"">{{{{ Title }}}}</a>
           {{{{#if Pages}}}}
             <ul class=""[original dropdown-menu classes]"">
               {{{{#each Pages}}}}
                 <li><a href=""{{{{ Url }}}}"" class=""[original item classes] {{{{ CustomClass }}}}"">{{{{ Title }}}}</a></li>
               {{{{/each}}}}
             </ul>
           {{{{/if}}}}
         </li>
       {{{{else}}}}
         <li class=""[original classes] {{{{ CustomClass }}}}"">
           <a href=""{{{{ Url }}}}"" class=""[original classes]"">{{{{ Title }}}}</a>
         </li>
       {{{{/if}}}}
     {{{{/each}}}}

     {{{{#each NavItems=""last""}}}}
       {{{{#if IsDropdown}}}}
         <li class=""[original dropdown classes] {{{{ CustomClass }}}}"">
           <a href=""{{{{ Url }}}}"" class=""[original toggle classes]"">{{{{ Title }}}}</a>
           {{{{#if Pages}}}}
             <ul class=""[original dropdown-menu classes]"">
               {{{{#each Pages}}}}
                 <li><a href=""{{{{ Url }}}}"" class=""[original item classes] {{{{ CustomClass }}}}"">{{{{ Title }}}}</a></li>
               {{{{/each}}}}
             </ul>
           {{{{/if}}}}
         </li>
       {{{{else}}}}
         <li class=""[original classes] {{{{ CustomClass }}}}"">
           <a href=""{{{{ Url }}}}"" class=""[original classes]"">{{{{ Title }}}}</a>
         </li>
       {{{{/if}}}}
     {{{{/each}}}}

   - CTA BUTTONS & DYNAMIC AUTHENTICATION (LOGIN) POSITIONING:
     * Condition A (Navbar has an original CTA button, e.g. [Add Listing], [Book Now], [Get Started]):
       - Replace the CTA button with:
         {{{{#each MenuCtaButtons}}}}
           <li class=""[original button classes] {{{{ CustomClass }}}}""><a href=""{{{{ Url }}}}"">{{{{ Title }}}}</a></li>
         {{{{/each}}}}
       - Include the dynamic Login link alongside the CTA area: href=""{{{{ LoginUrl }}}}"" with {{{{ LoginText }}}}.
     * Condition B (Navbar has NO original CTA button):
       - DO NOT invent or add {{{{#each MenuCtaButtons}}}}.
       - Instead, append the dynamic Login link as the last item inside the navigation <ul> list (right after NavItems=""last""):
         <li class=""[original nav item classes]""><a href=""{{{{ LoginUrl }}}}"" class=""[original nav link classes]"">{{{{ LoginText }}}}</a></li>

   - Top Utility Bar Site Links:
     ONLY if the topbar has site navigation page links:
     {{{{#each MainMenuItems=""top""}}}}<a href=""{{{{ Url }}}}"" class=""{{{{ CustomClass }}}}"">{{{{ Title }}}}</a>{{{{/each}}}}

   - MULTIPLE NAVIGATION INSTANCES (Desktop, Sticky Clones & Off-Canvas Mobile Drawers):
     Raw HTML templates frequently contain separate desktop navbars, clone sticky navbars, and mobile slide-out drawers (e.g. #ltn__utilize-mobile-menu).
     * DO NOT CUT OFF, DROP, ASSUME, OR SUMMARIZE ANY PART.
     * You MUST replace the navigation items with the 3 sequential zones (first, middle, last) and logo in EVERY SINGLE navigation <ul> and logo instance found across the entire document.

   - ZERO PHANTOM TOKENS & 100% PRESERVATION:
     * Keep all email links (mailto:...), phone numbers (tel:...), physical street addresses, support widgets, language selectors, social icons, off-canvas cart drawers (#ltn__utilize-cart-menu), and mobile slide-out menus 100% intact as static HTML.
     * NEVER invent non-existent tokens like Brand.Email, Brand.Address, Brand.Phone, Brand.LogoUrl, or PageCategories.
     * NEVER truncate or stop after closing header tags. Return 100% of the entire HTML document including all sibling drawers and overlays.

2. Hero Banners & Image Sliders (Category: hero / slider):
   - Static Hero: Headline {{{{ Title }}}}, Eyebrow {{{{ MiniTitle }}}}, Lead {{{{ Description }}}}, Image src=""{{{{ ImageUrl }}}}"" or style=""background-image: url('{{{{ ImageUrl }}}}');"".
   - Primary Action Button: {{{{ #if ButtonText }}}}<a href=""{{{{ ButtonLink }}}}"">{{{{ ButtonText }}}}</a>{{{{ /if }}}}.
   - Secondary Action Button: {{{{ #if SecondaryButtonText }}}}<a href=""{{{{ SecondaryButtonLink }}}}"">{{{{ SecondaryButtonText }}}}</a>{{{{ /if }}}}.
   - Slider / Carousel Mode (Swiper, Slick, Owl, Splide, Bootstrap Carousel):
     * Discard infinite-loop cloned slides (e.g. 'swiper-slide-duplicate', 'slick-cloned').
     * Strip library runtime state classes from slides ('swiper-slide-active', 'swiper-slide-visible', 'slick-active') and containers ('swiper-initialized', 'slick-initialized').
     * Strip runtime inline styling ('width: ...px', 'transform: translate3d(...)', 'opacity: 0|1') while keeping background-image: url('{{{{ ImageUrl }}}}').
     * Strip auto-generated IDs and aria attributes (id=""swiper-wrapper-..."", data-swiper-slide-index=""..."").
     * Wrap repeating slides in:
       {{{{#each PageSectionLists}}}}
         <div class=""[clean slide classes]"">
           {{{{#if ImageUrl}}}}<div class=""item-bg"" style=""background-image: url('{{{{ ImageUrl }}}}');""></div>{{{{/if}}}}
           {{{{#if MiniTitle}}}}<span class=""[original classes]"">{{{{ MiniTitle }}}}</span>{{{{/if}}}}
           <h1 class=""[original classes]"">{{{{ Title }}}}</h1>
           <p class=""[original classes]"">{{{{ Description }}}}</p>
           {{{{#if ButtonText}}}}<a href=""{{{{ ButtonLink }}}}"">{{{{ ButtonText }}}}</a>{{{{/if}}}}
           {{{{#if SecondaryButtonText}}}}<a href=""{{{{ SecondaryButtonLink }}}}"">{{{{ SecondaryButtonText }}}}</a>{{{{/if}}}}
         </div>
       {{{{/each}}}}

3. Body Sections & Content Blocks (Category: body / bodysections / PageSection):
   - Page Headline: {{{{ Title }}}}
   - Subtitle / Eyebrow Badge: {{{{ MiniTitle }}}}
   - Summary Paragraph: {{{{ Description }}}}
   - Pure Rich HTML Body (Terms & Conditions, Privacy Policy, Story Narrative): {{{{ FullDescription }}}}
   - Highlight / Quote: {{{{ Qoute }}}}
   - Primary Image: src=""{{{{ ImageUrl }}}}""
   - Secondary Image / Collage: src=""{{{{ SecondImageUrl }}}}""
   - Video URL: src=""{{{{ VideoUrl }}}}""
   - YouTube Embed: src=""{{{{ YoutubeUrlLink }}}}""
   - Root Icon Class: <i class=""{{{{ IconText }}}}""></i>
   - Primary CTA Button: {{{{ ButtonText }}}} with href=""{{{{ ButtonLink }}}}""
   - Secondary CTA Button: {{{{ SecondaryButtonText }}}} with href=""{{{{ SecondaryButtonLink }}}}""
   - Route / Anchor: href=""{{{{ DirectUrl }}}}""
   - Dynamic Form Embeds (Contact Us, Newsletter, Quote Request): {{{{ Form ""Contact_Us"" }}}} or {{{{ FormEmbed }}}}
   - Custom Container Class: {{{{ CustomClass }}}}

3. Repeatable Child Cards (PageSectionList for Feature Grids, Services, FAQs, Pricing, Testimonials):
   Wrap repeating cards/items in:
   {{{{#each PageSectionLists}}}}
     <div class=""card"">
       <i class=""{{{{ IconText }}}}""></i>
       <span class=""badge"">{{{{ MiniTitle }}}}</span>
       <img src=""{{{{ ImageUrl }}}}"" alt=""{{{{ Title }}}}"" />
       <h3>{{{{ Title }}}}</h3>
       <p>{{{{ Description }}}}</p>
       <small>{{{{ MoreDescription }}}}</small>
       <a href=""{{{{ ButtonLink }}}}"" class=""btn"">{{{{ ButtonText }}}}</a>
     </div>
   {{{{/each}}}}

4. Footers (Category: footer):
   - Brand Identity:
     <a href=""{{{{ HomeUrl }}}}"">
       {{{{#if BrandLogo}}}}
         <img src=""{{{{ BrandLogo }}}}"" alt=""{{{{ BrandName }}}}"" class=""[original logo classes]"" />
       {{{{else}}}}
         <span class=""[original brand text classes]"">{{{{ BrandName }}}}</span>
       {{{{/if}}}}
     </a> (or {{{{ BrandIdentity }}}})
   - Description / Tagline: {{{{ Description }}}}
   - Dynamic Categories Multi-Column Links Loop:
     {{{{#each FooterCategories}}}}
       <div class=""[original column classes]"">
         <h4 class=""[original title classes]"">{{{{ Title }}}}</h4>
         <ul class=""[original list classes]"">
           {{{{#each Pages}}}}
             <li><a href=""{{{{ Url }}}}"" class=""[original link classes]"">{{{{ Title }}}}</a></li>
           {{{{/each}}}}
         </ul>
       </div>
     {{{{/each}}}}
   - Tagged Quick Links Column:
     {{{{#each TaggedPages ""quicklinks""}}}}
       <li><a href=""{{{{ Url }}}}"" class=""[original link classes]"">{{{{ Title }}}}</a></li>
     {{{{/each}}}}
   - Legal Policy Links Loop:
     {{{{#each LegalPages}}}}
       <a href=""{{{{ Url }}}}"" class=""[original link classes]"">{{{{ Title }}}}</a>
     {{{{/each}}}}
   - Social Media Channels:
     {{{{#if HasSocialLinks}}}}
       {{{{#each SocialLinks}}}}
         <a href=""{{{{ Url }}}}"" title=""{{{{ Platform }}}}"" class=""[original link classes]"" target=""_blank"" rel=""noopener""><i class=""{{{{ IconClass }}}}""></i></a>
       {{{{/each}}}}
     {{{{/if}}}}
   - Dedicated Opening Hours / Schedule Widget:
     When a widget or column displays opening/working hours:
     {{{{#if WorkingHours}}}}
       <div class=""[original schedule item classes]"">
         <span>Hours</span>
         <span>{{{{ WorkingHours }}}}</span>
       </div>
     {{{{/if}}}}
     (Do NOT wrap generic ContactItems under an Opening Hours title).
   - Structured Contact Items Loop:
     {{{{#if HasContactInfo}}}}
       {{{{#each ContactItems}}}}
         <div class=""[original item classes]"">
           <i class=""{{{{ IconClass }}}}""></i>
           <span class=""[original title classes]"">{{{{ Title }}}}</span>
           <a href=""{{{{ Url }}}}"" class=""[original link classes]"">{{{{ Content }}}}</a>
         </div>
       {{{{/each}}}}
     {{{{/if}}}}
   - Contact CTA Action Button: <a href=""{{{{ ContactUrl }}}}"" class=""[original classes]"">[button text]</a>
   - Simple Text Touchpoints: {{{{ Email }}}}, {{{{ Phone }}}}, {{{{ Address }}}}, {{{{ WorkingHours }}}}, {{{{ ContactUrl }}}}
   - Newsletter Subscription Form: {{{{ Form ""Newsletter_Subscribe"" }}}}
   - Copyright Notice: © {{{{ Year }}}} {{{{ BrandName }}}}. All rights reserved. (or {{{{ Copyright }}}})
   - Root Container Class: {{{{ CustomClass }}}}

5. Blog Feeds & Archives (Category: blog):
   - Section Header:
     * Eyebrow / Tagline: {{{{ #if MiniTitle }}}}<span class=""[original eyebrow classes]"">{{{{ MiniTitle }}}}</span>{{{{ /if }}}}
     * Section Headline: <h2 class=""[original title classes]"">{{{{ Title }}}}</h2>
     * Intro Description: {{{{ #if Description }}}}<p class=""[original desc classes]"">{{{{ Description }}}}</p>{{{{ /if }}}}
   - Category Filter Pills / Taxonomy Bar (if present):
     {{{{#each BlogCategories}}}}
       <a href=""{{{{ Url }}}}"" class=""[original filter link classes]"">{{{{ Name }}}} <span class=""[original count classes]"">({{{{ Count }}}})</span></a>
     {{{{/each}}}}
   - Article Cards Feed Loop:
     Keep ONLY ONE representative article card/column and discard static duplicate cards:
     {{{{#each Articles}}}}
       <article class=""[original article classes]"">
         {{{{#if CoverImageUrl}}}}
           <div class=""[original media wrapper classes]"">
             <img src=""{{{{ CoverImageUrl }}}}"" alt=""{{{{ Title }}}}"" class=""[original thumbnail classes]"" />
             {{{{#if Category}}}}<span class=""[original category badge classes]"">{{{{ Category }}}}</span>{{{{/if}}}}
           </div>
         {{{{/if}}}}
         <div class=""[original content classes]"">
           <div class=""[original meta classes]"">
             {{{{#if PublishedDate}}}}<span class=""[original date classes]"">{{{{ PublishedDate }}}}</span>{{{{/if}}}}
             {{{{#if AuthorName}}}}<span class=""[original author classes]"">{{{{ AuthorName }}}}</span>{{{{/if}}}}
           </div>
           <h3 class=""[original title classes]""><a href=""{{{{ Url }}}}"" class=""[original title link classes]"">{{{{ Title }}}}</a></h3>
           {{{{#if Summary}}}}<p class=""[original summary classes]"">{{{{ Summary }}}}</p>{{{{/if}}}}
           <div class=""[original footer classes]"">
             <a href=""{{{{ Url }}}}"" class=""[original read-more link classes]"">Read Article</a>
           </div>
         </div>
       </article>
     {{{{/each}}}}
   - Slider / Carousel Mode (Swiper, Slick, Owl, Splide):
     * Discard infinite cloned slides ('swiper-slide-duplicate', 'slick-cloned').
     * Strip runtime state classes ('swiper-slide-active', 'swiper-initialized', etc.) and runtime inline styles.
     * Wrap the single clean slide inside {{{{#each Articles}}}} ... {{{{#/each}}}}.
   - View All Posts / More News Action Button:
     If a container <div> or button for ""View All Posts"", ""View All News"", ""All Articles"", ""More Posts"", or similar blog page link is present in the input HTML:
     * Preserve the wrapper <div> and all layout, centering, alignment, and spacing classes (e.g. text-center, mt-5, action-wrap, col-12).
     * Implement the placeholder: {{{{#if ButtonText}}}}<div class=""[original wrapper classes]""><a href=""{{{{ ButtonLink }}}}"" class=""[original button classes]""><span>{{{{ ButtonText }}}}</span> [preserve original icon/arrow if present]</a></div>{{{{/if}}}} (or wrap the <a> tag inside the existing container: {{{{#if ButtonText}}}}<a href=""{{{{ ButtonLink }}}}"" ...>{{{{ ButtonText }}}}</a>{{{{/if}}}}).
     * If no such container <div> or button exists in the original HTML, do not invent one.
   - Tags Cloud (if present):
     {{{{#each Tags}}}}<a href=""{{{{ Url }}}}"" class=""[original tag classes]"">{{{{ Name }}}}</a>{{{{/each}}}}
   - Root Container Class: {{{{ CustomClass }}}}

6. Blog Article Details (Category: blog_detail):
   - Article Header & Meta: Headline {{{{ Title }}}}, Category {{{{#if Category}}}}{{{{ Category }}}}{{{{/if}}}}, Published Date {{{{#if PublishedDate}}}}{{{{ PublishedDate }}}}{{{{/if}}}}, Reading Time {{{{#if ReadingTime}}}}{{{{ ReadingTime }}}}{{{{/if}}}}
   - Header Comment Counters: Replace static count numbers (e.g. ""05 comments"") with neutral link: <span>Discussion</span> <h5><a href=""#review"">Join the conversation</a></h5>
   - Article Cover Image: {{{{#if CoverImageUrl}}}}<img src=""{{{{ CoverImageUrl }}}}"" alt=""{{{{ Title }}}}"" ... />{{{{/if}}}}
   - Article Content Body: {{{{{{ Body }}}}}} (CRITICAL: MUST use triple braces {{{{{{ Body }}}}}} to allow rich HTML formatting without escaping). If paragraphs and headings are direct children without a container, wrap them in <div class=""post-body"">{{{{{{ Body }}}}}}</div>.
   - Article Summary / Lead Excerpt: {{{{#if Summary}}}}<p class=""lead"">{{{{ Summary }}}}</p>{{{{/if}}}}
   - Author Profile Card: {{{{ AuthorName }}}}, {{{{#if AuthorRole}}}}{{{{ AuthorRole }}}}{{{{/if}}}}, {{{{#if AuthorBio}}}}{{{{ AuthorBio }}}}{{{{/if}}}}, Avatar src=""{{{{ AuthorAvatarUrl }}}}""
   - Topic Tags vs Social Share: If tags share a row with Social Share buttons, wrap ONLY the tag cloud wrapper in {{{{#if Tags}}}}...{{{{/if}}}} (never the shared row), so social share links remain visible when tags are empty.
   - Comments & Discussion (if comments/reply block is present in input HTML):
     * Discard all static mock visitor comment lists (<ol class=""comment-list"">, <div class=""post-comments"">, dummy commenters, replies).
     * Replace the static submission <form> ... </form> section with {{{{ Form ""Comment_Submit"" }}}}
   - Sidebar & ScrollTrigger: If a <div class=""pin-spacer"" ...> wrapper exists around the sidebar, strip it and keep the inner sidebar directly inside its column.
   - Sidebar Widgets: Wrap in {{{{#if RecentArticles}}}}, {{{{#if BlogCategories}}}}, {{{{#if Tags}}}} respectively.
   - Back to Blog Navigation: <a href=""/blog"" ...>All Articles</a>
   - Custom Class: {{{{ CustomClass }}}}

7. Breadcrumbs & Page Banners (Category: breadcrumb):
   - Page Headline / Title: {{{{ PageTitle }}}} or {{{{ Title }}}}
   - Subtitle / Eyebrow: {{{{ SubTitle }}}} or {{{{ MiniTitle }}}}
   - Banner Background Image: src=""{{{{ BackgroundImageUrl }}}}"" or style=""background-image: url('{{{{ BackgroundImageUrl }}}}')""
   - Navigational Trail Repeater (collapse all static items into 1 dynamic item):
     {{{{#each Breadcrumbs}}}}
       <li class=""breadcrumb-item {{{{if IsActive}}}}active{{{{/if}}}}"" {{{{if IsActive}}}}aria-current=""page""{{{{/if}}}}>
         {{{{#if IsActive}}}}
           <span>{{{{ Title }}}}</span>
         {{{{else}}}}
           <a href=""{{{{ Url }}}}"">{{{{ Title }}}}</a>
         {{{{/if}}}}
         {{{{#unless IsLast}}}}[preserve original separator icon or slash here if present inside li]{{{{/unless}}}}
       </li>
     {{{{/each}}}}
   - Custom Class: {{{{ CustomClass }}}}

Task:
1. Provide a 1-sentence friendly confirmation of what you designed.
2. Generate the complete HTML template without truncating. Use ONLY the canonical Ozikol tokens above.
3. Generate modern scoped CSS inside <style>...</style>.";
                }
                else
                {
                    llmPrompt = $@"You are Ozi AI, an intelligent, helpful, and friendly studio co-pilot for Ozikol CMS.
Active Screen: {request.PageTitle ?? "Studio Console"} ({request.PageRoute ?? "/content/console"})

Context & Form Fields on Active Screen:
{screenContext}

User Message: ""{prompt}""

CANONICAL OZIKOL TOKENS KNOWLEDGE:
- Navigation Menus: {{{{ HomeUrl }}}}, {{{{ BrandLogo }}}}, {{{{ BrandName }}}}, {{{{ BrandIdentity }}}}, {{{{#each NavItems=""first""}}}}, {{{{#each NavItems=""middle""}}}}, {{{{#each NavItems=""last""}}}}, {{{{#each MainMenuItems=""top""}}}}, {{{{#each MenuCtaButtons}}}}, {{{{ LoginUrl }}}}, {{{{ LoginText }}}}.
- Root Section Tokens: {{{{ Title }}}}, {{{{ MiniTitle }}}}, {{{{ Description }}}}, {{{{ FullDescription }}}}, {{{{ Qoute }}}}, {{{{ ImageUrl }}}}, {{{{ SecondImageUrl }}}}, {{{{ VideoUrl }}}}, {{{{ YoutubeUrlLink }}}}, {{{{ IconText }}}}, {{{{ ButtonText }}}}, {{{{ ButtonLink }}}}, {{{{ SecondButtonText }}}}, {{{{ SecondButtonLink }}}}, {{{{ DirectUrl }}}}.
- Repeating Cards Loop: {{{{#SectionLists}}}} ... {{{{#/SectionLists}}}} (using child tokens: {{{{ Title }}}}, {{{{ MiniTitle }}}}, {{{{ Description }}}}, {{{{ MoreDescription }}}}, {{{{ IconText }}}}, {{{{ ImageUrl }}}}, {{{{ ButtonText }}}}, {{{{ ButtonLink }}}}).

Instructions:
- If the user is greeting you (e.g. 'hi', 'hello', 'hey'), respond warmly, concisely and naturally as Ozi AI, mentioning how you can assist them on this active screen ({request.PageTitle ?? "Studio Console"}). Do NOT repeat robotic scripts.
- If the user asks about placeholders, form inputs, or how tokens work, explain the exact canonical tokens above clearly.
- Keep your response friendly, professional, and concise. Do NOT output raw HTML/CSS unless explicitly requested.";
                }

                // =========================================================
                // 1. PRIMARY ENGINE: Google Gemini from Central DB Key Pool
                // =========================================================
                MasterAiApiKey? activeGeminiKey = null;
                if (_masterCatalogDbContext != null)
                {
                    try
                    {
                        var nowUtc = DateTime.UtcNow;
                        activeGeminiKey = await _masterCatalogDbContext.MasterAiApiKeys
                            .Where(k => k.Provider == "Gemini" && k.IsActive 
                                     && (!k.RateLimitCooldownUntilUtc.HasValue || k.RateLimitCooldownUntilUtc.Value <= nowUtc)
                                     && k.TodayRequestsCount < k.DailyQuotaLimit)
                            .OrderBy(k => k.TodayRequestsCount)
                            .FirstOrDefaultAsync();
                    }
                    catch (Exception dbKeyEx)
                    {
                        Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] ⚠️ Key Pool check exception: {dbKeyEx.Message}");
                    }
                }

                if (activeGeminiKey != null && !string.IsNullOrWhiteSpace(activeGeminiKey.ApiKey))
                {
                    provider = $"Gemini 2.5 Flash ({activeGeminiKey.KeyAlias})";
                    Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] 🚀 Dispatching prompt to Primary Provider: Google Gemini ({activeGeminiKey.KeyAlias}) ...");
                    var geminiTimer = Stopwatch.StartNew();

                    try
                    {
                        using var geminiClient = new HttpClient { Timeout = TimeSpan.FromSeconds(25) };
                        var geminiPayload = new
                        {
                            contents = new[]
                            {
                                new
                                {
                                    role = "user",
                                    parts = new[] { new { text = llmPrompt } }
                                }
                            },
                            generationConfig = new
                            {
                                temperature = 0.2,
                                maxOutputTokens = 8192
                            }
                        };

                        var geminiModels = new[] { "gemini-2.0-flash", "gemini-1.5-flash", "gemini-2.0-flash-exp", "gemini-1.5-flash-latest", "gemini-1.5-pro", "gemini-1.5-flash-8b" };
                        HttpResponseMessage? geminiResponse = null;
                        string matchedModel = "gemini-1.5-flash";

                        foreach (var gModel in geminiModels)
                        {
                            var geminiUrl = $"https://generativelanguage.googleapis.com/v1beta/models/{gModel}:generateContent?key={activeGeminiKey.ApiKey}";
                            try
                            {
                                using var modelCts = new CancellationTokenSource(TimeSpan.FromSeconds(25));
                                geminiResponse = await geminiClient.PostAsJsonAsync(geminiUrl, geminiPayload, modelCts.Token);
                                if (geminiResponse.IsSuccessStatusCode)
                                {
                                    matchedModel = gModel;
                                    break;
                                }
                                else
                                {
                                    var errContent = await geminiResponse.Content.ReadAsStringAsync();
                                    Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] ⚠️ Gemini ({gModel}) with key [{activeGeminiKey.KeyAlias}] returned {(int)geminiResponse.StatusCode} {geminiResponse.StatusCode}: {errContent}");
                                }
                            }
                            catch (Exception ex)
                            {
                                Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] ⚠️ Gemini ({gModel}) dispatch exception: {ex.Message}");
                            }
                        }

                        geminiTimer.Stop();

                        if (geminiResponse != null && geminiResponse.IsSuccessStatusCode)
                        {
                            using var gDoc = await JsonDocument.ParseAsync(await geminiResponse.Content.ReadAsStreamAsync());
                            var gText = string.Empty;
                            if (gDoc.RootElement.TryGetProperty("candidates", out var cands) && cands.GetArrayLength() > 0)
                            {
                                var firstCand = cands[0];
                                if (firstCand.TryGetProperty("content", out var candContent) && candContent.TryGetProperty("parts", out var candParts) && candParts.GetArrayLength() > 0)
                                {
                                    if (candParts[0].TryGetProperty("text", out var textProp))
                                    {
                                        gText = textProp.GetString()?.Trim() ?? string.Empty;
                                    }
                                }
                            }

                            if (!string.IsNullOrWhiteSpace(gText))
                            {
                                Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] ✔ Google Gemini completed in {geminiTimer.ElapsedMilliseconds}ms ({gText.Length} chars)");

                                try
                                {
                                    activeGeminiKey.TodayRequestsCount++;
                                    activeGeminiKey.TotalRequestsCount++;
                                    activeGeminiKey.LastUsedAtUtc = DateTime.UtcNow;
                                    await _masterCatalogDbContext!.SaveChangesAsync();
                                }
                                catch (Exception dbKeySaveEx)
                                {
                                    Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] ⚠️ Gemini key usage save notice: {dbKeySaveEx.Message}");
                                }

                                if (isCodeBlueprint || gText.Contains("<") && gText.Contains(">"))
                                {
                                    isCodeBlueprint = true;

                                    var cssMatch = Regex.Match(gText, @"<style[^>]*>([\s\S]*?)<\/style>", RegexOptions.IgnoreCase);
                                    if (cssMatch.Success) generatedCss = cssMatch.Groups[1].Value.Trim();

                                    // Extract from ```html markdown codeblock if present
                                    var codeBlockMatch = Regex.Match(gText, @"```html\s*([\s\S]*?)```", RegexOptions.IgnoreCase);
                                    if (codeBlockMatch.Success)
                                    {
                                        var rawBlock = codeBlockMatch.Groups[1].Value.Trim();
                                        if (!cssMatch.Success)
                                        {
                                            var innerCss = Regex.Match(rawBlock, @"<style[^>]*>([\s\S]*?)<\/style>", RegexOptions.IgnoreCase);
                                            if (innerCss.Success) generatedCss = innerCss.Groups[1].Value.Trim();
                                        }
                                        generatedHtml = Regex.Replace(rawBlock, @"<style[\s\S]*?<\/style>", "", RegexOptions.IgnoreCase).Trim();
                                    }
                                    else
                                    {
                                        var fullHtml = Regex.Replace(gText, @"<style[\s\S]*?<\/style>", "", RegexOptions.IgnoreCase).Trim();
                                        fullHtml = Regex.Replace(fullHtml, @"^```(?:html|css)?\s*", "", RegexOptions.IgnoreCase);
                                        fullHtml = Regex.Replace(fullHtml, @"\s*```$", "", RegexOptions.IgnoreCase).Trim();
                                        generatedHtml = fullHtml;
                                    }

                                    var cleanReply = Regex.Replace(gText, @"<style[\s\S]*?<\/style>", "", RegexOptions.IgnoreCase);
                                    cleanReply = Regex.Replace(cleanReply, @"```(?:html|css)?[\s\S]*?```", "", RegexOptions.IgnoreCase).Trim();

                                    parsedReply = !string.IsNullOrWhiteSpace(cleanReply)
                                        ? cleanReply
                                        : $"Generated template blueprint with Google Gemini using canonical Ozikol tokens.";
                                }
                                else
                                {
                                    parsedReply = gText;
                                }
                            }
                        }
                    }
                    catch (Exception gEx)
                    {
                        Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] ⚠️ Gemini error: {gEx.Message} -> Falling over to secondary providers...");
                    }
                }

                // =========================================================
                // 2. SECONDARY FAILOVER: DeepSeek from Central DB Key Pool
                // =========================================================
                if (string.IsNullOrWhiteSpace(parsedReply) && _masterCatalogDbContext != null)
                {
                    MasterAiApiKey? activeDeepSeekKey = null;
                    try
                    {
                        var nowUtc = DateTime.UtcNow;
                        activeDeepSeekKey = await _masterCatalogDbContext.MasterAiApiKeys
                            .Where(k => k.Provider == "DeepSeek" && k.IsActive 
                                     && (!k.RateLimitCooldownUntilUtc.HasValue || k.RateLimitCooldownUntilUtc.Value <= nowUtc)
                                     && k.TodayRequestsCount < k.DailyQuotaLimit)
                            .OrderBy(k => k.TodayRequestsCount)
                            .FirstOrDefaultAsync();
                    }
                    catch { }

                    if (activeDeepSeekKey != null && !string.IsNullOrWhiteSpace(activeDeepSeekKey.ApiKey))
                    {
                        provider = $"DeepSeek ({activeDeepSeekKey.KeyAlias})";
                        Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] 🚀 Dispatching prompt to Secondary Provider: DeepSeek ({activeDeepSeekKey.KeyAlias}) ...");
                        var dsTimer = Stopwatch.StartNew();

                        try
                        {
                            using var dsClient = new HttpClient { Timeout = TimeSpan.FromSeconds(35) };
                            dsClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", activeDeepSeekKey.ApiKey);

                            var dsPayload = new
                            {
                                model = "deepseek-chat",
                                messages = new[] { new { role = "user", content = llmPrompt } },
                                max_tokens = 8192,
                                temperature = 0.2
                            };

                            var dsResponse = await dsClient.PostAsJsonAsync("https://api.deepseek.com/chat/completions", dsPayload);
                            dsTimer.Stop();

                            if (dsResponse.IsSuccessStatusCode)
                            {
                                using var dsDoc = await JsonDocument.ParseAsync(await dsResponse.Content.ReadAsStreamAsync());
                                var dsText = string.Empty;
                                if (dsDoc.RootElement.TryGetProperty("choices", out var choices) && choices.GetArrayLength() > 0)
                                {
                                    var firstChoice = choices[0];
                                    if (firstChoice.TryGetProperty("message", out var msgProp) && msgProp.TryGetProperty("content", out var contentProp))
                                    {
                                        dsText = contentProp.GetString()?.Trim() ?? string.Empty;
                                    }
                                }

                                if (!string.IsNullOrWhiteSpace(dsText))
                                {
                                    Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] ✔ DeepSeek completed in {dsTimer.ElapsedMilliseconds}ms ({dsText.Length} chars)");

                                    try
                                    {
                                        activeDeepSeekKey.TodayRequestsCount++;
                                        activeDeepSeekKey.TotalRequestsCount++;
                                        activeDeepSeekKey.LastUsedAtUtc = DateTime.UtcNow;
                                        await _masterCatalogDbContext.SaveChangesAsync();
                                    }
                                    catch (Exception dbKeySaveEx)
                                    {
                                        Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] ⚠️ DeepSeek key usage save notice: {dbKeySaveEx.Message}");
                                    }

                                    if (isCodeBlueprint || dsText.Contains("<", StringComparison.OrdinalIgnoreCase) && dsText.Contains(">", StringComparison.OrdinalIgnoreCase))
                                    {
                                        isCodeBlueprint = true;

                                        var cssMatch = Regex.Match(dsText, @"<style[^>]*>([\s\S]*?)<\/style>", RegexOptions.IgnoreCase);
                                        if (cssMatch.Success) generatedCss = cssMatch.Groups[1].Value.Trim();

                                        // Extract full code without slicing at </header> or </section>
                                        var codeBlockMatch = Regex.Match(dsText, @"```html\s*([\s\S]*?)```", RegexOptions.IgnoreCase);
                                        if (codeBlockMatch.Success)
                                        {
                                            var rawBlock = codeBlockMatch.Groups[1].Value.Trim();
                                            if (!cssMatch.Success)
                                            {
                                                var innerCss = Regex.Match(rawBlock, @"<style[^>]*>([\s\S]*?)<\/style>", RegexOptions.IgnoreCase);
                                                if (innerCss.Success) generatedCss = innerCss.Groups[1].Value.Trim();
                                            }
                                            generatedHtml = Regex.Replace(rawBlock, @"<style[\s\S]*?<\/style>", "", RegexOptions.IgnoreCase).Trim();
                                        }
                                        else
                                        {
                                            var fullHtml = Regex.Replace(dsText, @"<style[\s\S]*?<\/style>", "", RegexOptions.IgnoreCase).Trim();
                                            fullHtml = Regex.Replace(fullHtml, @"^```(?:html|css)?\s*", "", RegexOptions.IgnoreCase);
                                            fullHtml = Regex.Replace(fullHtml, @"\s*```$", "", RegexOptions.IgnoreCase).Trim();
                                            generatedHtml = fullHtml;
                                        }

                                        var cleanReply = Regex.Replace(dsText, @"<style[\s\S]*?<\/style>", "", RegexOptions.IgnoreCase);
                                        cleanReply = Regex.Replace(cleanReply, @"```(?:html|css)?[\s\S]*?```", "", RegexOptions.IgnoreCase).Trim();

                                        parsedReply = !string.IsNullOrWhiteSpace(cleanReply)
                                            ? cleanReply
                                            : $"Generated template blueprint with DeepSeek using canonical Ozikol tokens.";
                                    }
                                    else
                                    {
                                        parsedReply = dsText;
                                    }
                                }
                            }
                        }
                        catch (Exception dsEx)
                        {
                            Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] ⚠️ DeepSeek error: {dsEx.Message}");
                        }
                    }
                }

                // =========================================================
                // 3. TERTIARY FALLBACK: Local Ollama / Standby Runner
                // =========================================================
                if (string.IsNullOrWhiteSpace(parsedReply))
                {
                    try
                    {
                        Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] 🚀 Dispatching prompt to Ollama LLM (qwen2.5-coder:1.5b) at https://ozi-ai.ozikol.cloud/api/generate ...");
                        var llmTimer = Stopwatch.StartNew();

                        using var httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(30) };
                        var ollamaPayload = new
                        {
                            model = "qwen2.5-coder:1.5b",
                            prompt = llmPrompt,
                            stream = false
                        };

                        var response = await httpClient.PostAsJsonAsync("https://ozi-ai.ozikol.cloud/api/generate", ollamaPayload);
                        llmTimer.Stop();

                        if (response.IsSuccessStatusCode)
                        {
                            using var doc = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync());
                            if (doc.RootElement.TryGetProperty("response", out var respProp))
                            {
                                var rawResponseStr = respProp.GetString()?.Trim() ?? string.Empty;
                                Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] ✔ Ollama response received in {llmTimer.ElapsedMilliseconds}ms ({rawResponseStr.Length} chars)");

                                if (isCodeBlueprint || rawResponseStr.Contains("<section", StringComparison.OrdinalIgnoreCase) || rawResponseStr.Contains("<header", StringComparison.OrdinalIgnoreCase))
                                {
                                    isCodeBlueprint = true;

                                    // Extract CSS if present
                                    var cssMatch = Regex.Match(rawResponseStr, @"<style[^>]*>([\s\S]*?)<\/style>", RegexOptions.IgnoreCase);
                                    if (cssMatch.Success)
                                    {
                                        generatedCss = cssMatch.Groups[1].Value.Trim();
                                    }

                                    // Extract HTML section if present
                                    var sectionMatch = Regex.Match(rawResponseStr, @"(<(?:section|header)[\s\S]*?<\/(?:section|header)>)", RegexOptions.IgnoreCase);
                                    if (sectionMatch.Success)
                                    {
                                        generatedHtml = Regex.Replace(sectionMatch.Groups[1].Value.Trim(), @"<style[\s\S]*?<\/style>", "", RegexOptions.IgnoreCase).Trim();
                                    }

                                    // Clean explanation text
                                    var cleanReply = Regex.Replace(rawResponseStr, @"<style[\s\S]*?<\/style>", "", RegexOptions.IgnoreCase);
                                    cleanReply = Regex.Replace(cleanReply, @"```(?:html|css)?[\s\S]*?```", "", RegexOptions.IgnoreCase);
                                    cleanReply = Regex.Replace(cleanReply, @"<(?:section|header)[\s\S]*?<\/(?:section|header)>", "", RegexOptions.IgnoreCase).Trim();

                                    parsedReply = !string.IsNullOrWhiteSpace(cleanReply) 
                                        ? cleanReply 
                                        : $"Generated custom section blueprint tailored for '{request.PageTitle ?? "Studio"}' with scoped styles and dynamic tokens.";
                                }
                                else
                                {
                                    parsedReply = rawResponseStr;
                                }
                            }
                        }
                        else
                        {
                            Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] ⚠️ Ollama returned HTTP {response.StatusCode} ({llmTimer.ElapsedMilliseconds}ms) -> Using local fallback");
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] ⚠️ Ollama endpoint notice: {ex.Message} -> Engaging local fallback");
                    }
                }

                // If all external AI providers failed to return a response, report clear error
                if (string.IsNullOrWhiteSpace(parsedReply))
                {
                    return StatusCode(503, ApiResponse<object>.FailureResponse("All AI provider keys are currently offline or unreachable. Please verify your active Gemini / DeepSeek API keys in Central Works (/centralwks/aikeys)."));
                }

                Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] 🎯 Final Resolved Intent: {(isCodeBlueprint ? "Code Blueprint Generation" : "Conversational Q&A / DOM Inspection")}");

                // Case 1: Pure Conversational / Q&A / Form Assistance
                if (!isCodeBlueprint)
                {
                    var chatRecord = new BcpAiChatHistory
                    {
                        UserId = currentUserId,
                        UserEmail = currentUserEmail,
                        PageRoute = string.IsNullOrWhiteSpace(request.PageRoute) ? "/content/console" : request.PageRoute.Trim(),
                        PageTitle = request.PageTitle ?? "Studio Page",
                        ProviderUsed = provider,
                        PromptText = prompt,
                        ResponseText = parsedReply,
                        GeneratedCodeJson = null,
                        IsImplemented = false,
                        CreatedAt = DateTime.UtcNow
                    };

                    try
                    {
                        _context.AiChatHistories.Add(chatRecord);
                        await _context.SaveChangesAsync();
                        Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] 💾 Persisted Interaction Record to BcpAiChatHistories (ID: {chatRecord.Id})");
                    }
                    catch (Exception histEx)
                    {
                        Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] ⚠️ Chat history save notice: {histEx.Message}");
                    }

                    totalTimer.Stop();
                    Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] 🏁 Total Ozi AI Execution Completed in {totalTimer.ElapsedMilliseconds}ms");
                    Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] ═══════════════════════════════════════════════════════════════════════════════\n");

                    return Ok(ApiResponse<object>.SuccessResponse(new
                    {
                        historyId = chatRecord.Id,
                        explanation = parsedReply,
                        htmlTemplate = (string?)null,
                        isImplemented = false,
                        createdAt = chatRecord.CreatedAt
                    }, "AI response generated successfully."));
                }

                // Case 2: Generative Code Blueprint
                var finalHtml = generatedHtml;
                var tokensFound = new List<string>();

                if (string.IsNullOrWhiteSpace(finalHtml))
                {
                    if (!string.IsNullOrWhiteSpace(rawHtml))
                    {
                        finalHtml = rawHtml;
                        if (Regex.IsMatch(finalHtml, @"<h[1-2][^>]*>(.*?)<\/h[1-2]>", RegexOptions.IgnoreCase))
                        {
                            finalHtml = Regex.Replace(finalHtml, @"<h[1-2][^>]*>(.*?)<\/h[1-2]>", "<h1 class=\"oz-title\">{{ Title }}</h1>", RegexOptions.IgnoreCase);
                            tokensFound.Add("Title");
                        }
                        if (Regex.IsMatch(finalHtml, @"<p[^>]*class=""[^""]*(?:lead|desc|subtitle)[^""]*""[^>]*>(.*?)<\/p>", RegexOptions.IgnoreCase))
                        {
                            finalHtml = Regex.Replace(finalHtml, @"<p([^>]*)class=""([^""]*(?:lead|desc|subtitle)[^""]*)""([^>]*)>(.*?)<\/p>", "<p$1class=\"$2\"$3>{{ Description }}</p>", RegexOptions.IgnoreCase);
                            tokensFound.Add("Description");
                        }
                    }
                    else if (generatedCategory == "pricing")
                    {
                        finalHtml = @"<section class=""oz-pricing-section"">
  <div class=""oz-pricing-container"">
    <span class=""oz-pill"">{{ MiniTitle }}</span>
    <h2 class=""oz-title"">{{ Title }}</h2>
    <p class=""oz-desc"">{{ Description }}</p>
    <div class=""oz-pricing-grid"">
      {{#each PageSectionLists}}
      <div class=""oz-price-card"">
        <span class=""material-symbols-outlined oz-card-icon"">{{ Icon }}</span>
        <h3 class=""oz-card-title"">{{ Title }}</h3>
        <span class=""oz-price-tag"">{{ SubTitle }}</span>
        <p class=""oz-card-desc"">{{ Description }}</p>
        <a href=""{{ ButtonLink }}"" class=""btn oz-btn-tier"">{{ ButtonText }}</a>
      </div>
      {{/each}}
    </div>
  </div>
</section>";
                        tokensFound.AddRange(new[] { "MiniTitle", "Title", "Description", "PageSectionLists", "Icon", "SubTitle", "ButtonText", "ButtonLink" });
                    }
                    else
                    {
                        finalHtml = @"<section class=""oz-custom-section"">
  <div class=""oz-custom-container"">
    <span class=""oz-eyebrow"">{{ MiniTitle }}</span>
    <h2 class=""oz-headline"">{{ Title }}</h2>
    <p class=""oz-body-lead"">{{ Description }}</p>
    <div class=""oz-cards-grid"">
      {{#each PageSectionLists}}
      <div class=""oz-feature-box"">
        <span class=""material-symbols-outlined"">{{ Icon }}</span>
        <h4>{{ Title }}</h4>
        <p>{{ Description }}</p>
      </div>
      {{/each}}
    </div>
  </div>
</section>";
                        tokensFound.AddRange(new[] { "MiniTitle", "Title", "Description", "PageSectionLists", "Icon" });
                    }
                }
                else
                {
                    if (finalHtml.Contains("{{ Title }}")) tokensFound.Add("Title");
                    if (finalHtml.Contains("{{ MiniTitle }}")) tokensFound.Add("MiniTitle");
                    if (finalHtml.Contains("{{ Description }}")) tokensFound.Add("Description");
                    if (finalHtml.Contains("{{ ButtonText }}")) tokensFound.Add("ButtonText");
                    if (finalHtml.Contains("{{ PageSectionLists }}")) tokensFound.Add("PageSectionLists");
                }

                var finalTemplateName = !string.IsNullOrWhiteSpace(generatedTemplateName)
                    ? generatedTemplateName
                    : (!string.IsNullOrWhiteSpace(request.CurrentTemplateName) ? request.CurrentTemplateName : $"{char.ToUpper(generatedCategory[0])}{generatedCategory[1..]} Blueprint ({brandModelName})");

                var resultPayload = new
                {
                    templateName = finalTemplateName,
                    categoryKey = generatedCategory,
                    variantCode = $"OZI_{generatedCategory.ToUpper()}_{Guid.NewGuid().ToString("N")[..5].ToUpper()}",
                    htmlTemplate = finalHtml,
                    cssStyles = generatedCss ?? rawCss,
                    jsScript = rawJs,
                    explanation = parsedReply,
                    tokensExtracted = tokensFound,
                    mockContent = new
                    {
                        title = "Enterprise Grade Digital Architecture",
                        miniTitle = "SCALABLE PLATFORM",
                        description = "Deploy resilient components with integrated tokenization and responsive layout structures.",
                        buttonText = "Get Started Now",
                        buttonLink = "#pricing"
                    }
                };

                // Persist interaction to BcpAiChatHistories table
                var historyRecord = new BcpAiChatHistory
                {
                    UserId = currentUserId,
                    UserEmail = currentUserEmail,
                    PageRoute = string.IsNullOrWhiteSpace(request.PageRoute) ? "/content/console" : request.PageRoute.Trim(),
                    PageTitle = request.PageTitle ?? "Studio Page",
                    ProviderUsed = provider,
                    PromptText = !string.IsNullOrWhiteSpace(prompt) ? prompt : "Analyze attached visual mockup",
                    ResponseText = parsedReply,
                    AttachedImageUrl = request.AttachedImageUrl,
                    GeneratedCodeJson = JsonSerializer.Serialize(resultPayload),
                    IsImplemented = false,
                    CreatedAt = DateTime.UtcNow
                };

                try
                {
                    _context.AiChatHistories.Add(historyRecord);
                    await _context.SaveChangesAsync();
                    Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] 💾 Persisted Blueprint Record to BcpAiChatHistories (ID: {historyRecord.Id})");
                }
                catch (Exception histEx)
                {
                    Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] ⚠️ Blueprint history save notice: {histEx.Message}");
                }

                totalTimer.Stop();
                Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] 🛠️ Generated Blueprint '{finalTemplateName}' ({tokensFound.Count} tokens: {string.Join(", ", tokensFound)})");
                Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] 🏁 Total Ozi AI Request Latency: {totalTimer.ElapsedMilliseconds}ms");
                Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] ═══════════════════════════════════════════════════════════════════════════════\n");

                var responseData = new
                {
                    historyId = historyRecord.Id,
                    templateName = resultPayload.templateName,
                    categoryKey = resultPayload.categoryKey,
                    variantCode = resultPayload.variantCode,
                    htmlTemplate = resultPayload.htmlTemplate,
                    cssStyles = resultPayload.cssStyles,
                    jsScript = resultPayload.jsScript,
                    explanation = resultPayload.explanation,
                    tokensExtracted = resultPayload.tokensExtracted,
                    mockContent = resultPayload.mockContent,
                    isImplemented = false,
                    createdAt = historyRecord.CreatedAt
                };

                return Ok(ApiResponse<object>.SuccessResponse(responseData, "AI template blueprint generated and saved to history."));
            }
            catch (Exception ex)
            {
                totalTimer.Stop();
                Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] ❌ [OZI AI ERROR] Exception after {totalTimer.ElapsedMilliseconds}ms: {ex.Message}");
                if (ex.InnerException != null)
                {
                    Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}]    • Inner Exception: {ex.InnerException.Message}");
                }
                var msg = ex.InnerException != null ? $"{ex.Message} -> {ex.InnerException.Message}" : ex.Message;
                return StatusCode(500, ApiResponse<object>.FailureResponse($"AI Generation error: {msg}"));
            }
        }

        /// <summary>
        /// Analyzes real-time browser runtime errors, network failures, and template code using the Central AI key pool.
        /// </summary>
        /// <param name="request">The captured runtime diagnostic payload.</param>
        /// <returns>A structured AI health report card with root-cause explanations and fix suggestions.</returns>
        [HttpPost("ai/diagnose-runtime")]
        public async Task<IActionResult> DiagnoseRuntime([FromBody] DiagnoseRuntimeRequest request)
        {
            var totalTimer = Stopwatch.StartNew();
            var currentUserEmail = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.Email)?.Value ?? "anonymous@ozikol.cloud";

            Console.WriteLine($"\n[{DateTime.Now:HH:mm:ss.fff}] ═══════════════════════════════════════════════════════════════════════════════");
            Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] 🩺 [AI RUNTIME DIAGNOSTIC] Initiating Deep Analysis for {currentUserEmail}");
            Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}]    • Captured Errors: {request.CapturedErrors.Count}");
            Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}]    • Captured Warnings: {request.CapturedWarnings.Count}");
            Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}]    • Header Tags: {request.HeaderTags.Count} | Footer Scripts: {request.FooterScripts.Count}");

            var errorSummary = request.CapturedErrors.Count > 0 ? string.Join("\n - ", request.CapturedErrors) : "None (No runtime exceptions thrown)";
            var warningSummary = request.CapturedWarnings.Count > 0 ? string.Join("\n - ", request.CapturedWarnings) : "None";
            var headerSummary = request.HeaderTags.Count > 0 ? string.Join("\n - ", request.HeaderTags) : "None";
            var footerSummary = request.FooterScripts.Count > 0 ? string.Join("\n - ", request.FooterScripts) : "None";

            var prompt = $@"You are the Ozikol CMS Web Platform AI Diagnostic Engine.
Analyze the following REAL runtime telemetry and browser console errors captured from the user's live website bundle:

ACTIVE TEMPLATE: {request.ActiveTemplateName} ({request.ActiveTemplateCategory})

CAPTURED BROWSER RUNTIME ERRORS:
 - {errorSummary}

CAPTURED NETWORK / CORS WARNINGS:
 - {warningSummary}

ACTIVE HEADER TAGS (<head>):
 - {headerSummary}

ACTIVE FOOTER SCRIPTS (</body> in order):
 - {footerSummary}

INSTRUCTIONS:
1. Examine the exact errors that occurred (e.g. ReferenceErrors, missing variables/libraries, execution order inversions, CORS font blocks, 404 dead links).
2. For each error, provide a clear, non-technical plain English Root Cause and a direct, actionable Step-by-Step Fix.
3. Calculate an overall Health Score (0 to 100).

You MUST respond strictly with a valid JSON object matching this schema without markdown code blocks:
{{
  ""healthScore"": 75,
  ""statusTitle"": ""Action Required"",
  ""criticalIssues"": [
    {{
      ""title"": ""Clear issue title"",
      ""rootCause"": ""Detailed explanation of what failed and why"",
      ""recommendation"": ""Exact step-by-step instructions on how to fix it""
    }}
  ],
  ""warnings"": [
    {{
      ""title"": ""Warning title"",
      ""rootCause"": ""Impact explanation"",
      ""recommendation"": ""Actionable suggestion""
    }}
  ],
  ""passedChecks"": [
     ""List of checks that passed cleanly""
  ]
}}";

            string? rawAiJson = null;

            // 1. Primary AI Provider: Gemini
            try
            {
                string? geminiKey = null;
                if (_masterCatalogDbContext != null)
                {
                    var nowUtc = DateTime.UtcNow;
                    var keyEntity = await _masterCatalogDbContext.MasterAiApiKeys
                        .Where(k => k.Provider == "Gemini" && k.IsActive 
                                 && (!k.RateLimitCooldownUntilUtc.HasValue || k.RateLimitCooldownUntilUtc.Value <= nowUtc)
                                 && k.TodayRequestsCount < k.DailyQuotaLimit)
                        .OrderBy(k => k.TodayRequestsCount)
                        .FirstOrDefaultAsync();
                    geminiKey = keyEntity?.ApiKey;
                }

                if (!string.IsNullOrWhiteSpace(geminiKey))
                {
                    using var httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(25) };
                    var geminiUrl = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={geminiKey}";
                    var geminiPayload = new
                    {
                        contents = new[] { new { parts = new[] { new { text = prompt } } } },
                        generationConfig = new { temperature = 0.2, maxOutputTokens = 2048, responseMimeType = "application/json" }
                    };

                    var response = await httpClient.PostAsJsonAsync(geminiUrl, geminiPayload);
                    if (response.IsSuccessStatusCode)
                    {
                        using var doc = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync());
                        var root = doc.RootElement;
                        if (root.TryGetProperty("candidates", out var candidates) && candidates.GetArrayLength() > 0)
                        {
                            var text = candidates[0].GetProperty("content").GetProperty("parts")[0].GetProperty("text").GetString();
                            rawAiJson = text?.Trim();
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] ⚠️ Gemini diagnostic probe notice: {ex.Message}");
            }

            // 2. Secondary Failover: DeepSeek / Ollama Qwen
            if (string.IsNullOrWhiteSpace(rawAiJson))
            {
                try
                {
                    using var httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(25) };
                    var ollamaPayload = new { model = "qwen2.5-coder:1.5b", prompt = prompt, stream = false };
                    var response = await httpClient.PostAsJsonAsync("https://ozi-ai.ozikol.cloud/api/generate", ollamaPayload);
                    if (response.IsSuccessStatusCode)
                    {
                        using var doc = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync());
                        if (doc.RootElement.TryGetProperty("response", out var respProp))
                        {
                            rawAiJson = respProp.GetString()?.Trim();
                        }
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] ⚠️ Ollama diagnostic notice: {ex.Message}");
                }
            }

            // If AI returned JSON, parse and return
            if (!string.IsNullOrWhiteSpace(rawAiJson))
            {
                try
                {
                    var cleanJson = rawAiJson.Replace("```json", "").Replace("```", "").Trim();
                    var parsedObj = JsonSerializer.Deserialize<object>(cleanJson);
                    totalTimer.Stop();
                    Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] ✔ AI Runtime Diagnostic successfully completed in {totalTimer.ElapsedMilliseconds}ms");
                    Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] ═══════════════════════════════════════════════════════════════════════════════\n");
                    return Ok(ApiResponse<object>.SuccessResponse(parsedObj, "AI runtime diagnostic completed."));
                }
                catch (Exception parseEx)
                {
                    Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] ⚠️ AI output parse notice: {parseEx.Message}");
                }
            }

            // Fallback dynamic heuristic analysis if external AI is temporarily offline
            totalTimer.Stop();
            var dynamicFallback = GenerateDynamicFallbackReport(request);
            return Ok(ApiResponse<object>.SuccessResponse(dynamicFallback, "Dynamic runtime diagnostic completed."));
        }

        private static object GenerateDynamicFallbackReport(DiagnoseRuntimeRequest req)
        {
            var criticalIssues = new List<object>();
            var warnings = new List<object>();
            var passedChecks = new List<string>();

            // Parse real captured runtime errors dynamically
            foreach (var err in req.CapturedErrors)
            {
                if (err.Contains("ReferenceError", StringComparison.OrdinalIgnoreCase))
                {
                    var missingMatch = Regex.Match(err, @"ReferenceError:\s*(\w+)\s*is not defined", RegexOptions.IgnoreCase);
                    var missingVar = missingMatch.Success ? missingMatch.Groups[1].Value : "a required library variable";

                    criticalIssues.Add(new
                    {
                        title = $"Uncaught ReferenceError: {missingVar} is not defined",
                        rootCause = $"A script attempted to access '{missingVar}', but '{missingVar}' has not been loaded into the window context.",
                        recommendation = $"Verify that the library providing '{missingVar}' is added as a Header/Footer script tag and scheduled before dependent scripts."
                    });
                }
                else
                {
                    criticalIssues.Add(new
                    {
                        title = "Uncaught JavaScript Runtime Exception",
                        rootCause = err,
                        recommendation = "Review the script line mentioned above and ensure all dependent libraries are loaded in proper sequence."
                    });
                }
            }

            // Parse real captured CORS / network warnings dynamically
            foreach (var warn in req.CapturedWarnings)
            {
                if (warn.Contains("CORS", StringComparison.OrdinalIgnoreCase))
                {
                    var urlMatch = Regex.Match(warn, @"'(https?:\/\/[^']+)'", RegexOptions.IgnoreCase);
                    var blockedUrl = urlMatch.Success ? urlMatch.Groups[1].Value : "an external asset";

                    warnings.Add(new
                    {
                        title = "Cross-Origin Font / Asset Blocked (CORS)",
                        rootCause = $"The browser blocked loading '{blockedUrl}' because the host server does not send the 'Access-Control-Allow-Origin: *' response header.",
                        recommendation = $"Enable CORS on the hosting storage bucket (e.g. Cloudflare R2 CORS Settings) or serve the asset from your own domain."
                    });
                }
                else
                {
                    warnings.Add(new
                    {
                        title = "Browser Warning",
                        rootCause = warn,
                        recommendation = "Inspect the referenced asset or API call to ensure it is published and accessible."
                    });
                }
            }

            if (req.HeaderTags.Count > 0) passedChecks.Add($"{req.HeaderTags.Count} active Header tag(s) loaded");
            if (req.FooterScripts.Count > 0) passedChecks.Add($"{req.FooterScripts.Count} active Footer script(s) loaded");
            if (!string.IsNullOrWhiteSpace(req.ActiveTemplateName)) passedChecks.Add($"Active Template: '{req.ActiveTemplateName}'");

            int score = Math.Max(30, 100 - (criticalIssues.Count * 25) - (warnings.Count * 8));
            var status = criticalIssues.Count > 0 ? "Action Required" : (warnings.Count > 0 ? "Good (Minor Warnings)" : "Excellent");

            return new
            {
                healthScore = score,
                statusTitle = status,
                criticalIssues,
                warnings,
                passedChecks
            };
        }

        /// <summary>
        /// Retrieves saved AI chat history interactions and blueprints for the current user and page route.
        /// </summary>
        /// <param name="pageRoute">Optional page route to filter by. If omitted, returns recent workspace history.</param>
        /// <returns>List of saved AI interactions, code snapshots, and implementation statuses.</returns>
        [HttpGet("ai/history")]
        public async Task<IActionResult> GetAiChatHistory([FromQuery] string? pageRoute = null)
        {
            try
            {
                var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var query = _context.AiChatHistories.AsNoTracking().AsQueryable();

                if (!string.IsNullOrWhiteSpace(currentUserId))
                {
                    query = query.Where(h => h.UserId == currentUserId);
                }

                if (!string.IsNullOrWhiteSpace(pageRoute))
                {
                    var normalizedRoute = pageRoute.Trim().ToLowerInvariant();
                    query = query.Where(h => h.PageRoute.ToLower() == normalizedRoute);
                }

                var records = await query
                    .OrderByDescending(h => h.CreatedAt)
                    .Take(50)
                    .ToListAsync();

                Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] [OZI AI] 📚 History requested for route '{pageRoute ?? "ALL"}' -> Loaded {records.Count} interaction records");

                return Ok(ApiResponse<object>.SuccessResponse(records, "AI Chat history retrieved successfully."));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] ❌ [OZI AI] Failed to retrieve AI history: {ex.Message}");
                return StatusCode(500, ApiResponse<object>.FailureResponse($"Failed to retrieve AI history: {ex.Message}"));
            }
        }

        /// <summary>
        /// Marks an AI proposal as implemented and saves the pre-change snapshot JSON for undo/restore support.
        /// </summary>
        /// <param name="request">The implementation payload containing HistoryId and SnapshotJson.</param>
        /// <returns>Confirmation response with implementation status.</returns>
        [HttpPost("ai/implement")]
        public async Task<IActionResult> ImplementAiProposal([FromBody] AiHistoryImplementRequest request)
        {
            if (request == null || request.HistoryId == Guid.Empty)
            {
                return BadRequest(ApiResponse<object>.FailureResponse("History ID is required."));
            }

            try
            {
                var record = await _context.AiChatHistories.FindAsync(request.HistoryId);
                if (record == null)
                {
                    return NotFound(ApiResponse<object>.FailureResponse("AI chat history record not found."));
                }

                record.PreviousSnapshotJson = request.SnapshotJson;
                record.IsImplemented = true;
                record.ImplementedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();
                Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] [OZI AI] ✔ Blueprint Implemented for History ID: {record.Id} (by {User.Identity?.Name ?? "User"})");

                return Ok(ApiResponse<object>.SuccessResponse(new
                {
                    historyId = record.Id,
                    isImplemented = true,
                    implementedAt = record.ImplementedAt
                }, "AI proposal marked as implemented."));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] ❌ [OZI AI] Failed to record implementation: {ex.Message}");
                return StatusCode(500, ApiResponse<object>.FailureResponse($"Failed to record implementation: {ex.Message}"));
            }
        }

        /// <summary>
        /// Rolls back an implemented AI proposal and returns the previous editor snapshot JSON for one-click restore.
        /// </summary>
        /// <param name="request">The restore payload containing HistoryId.</param>
        /// <returns>Previous snapshot JSON and status.</returns>
        [HttpPost("ai/restore")]
        public async Task<IActionResult> RestoreAiProposal([FromBody] AiHistoryRestoreRequest request)
        {
            if (request == null || request.HistoryId == Guid.Empty)
            {
                return BadRequest(ApiResponse<object>.FailureResponse("History ID is required."));
            }

            try
            {
                var record = await _context.AiChatHistories.FindAsync(request.HistoryId);
                if (record == null)
                {
                    return NotFound(ApiResponse<object>.FailureResponse("AI chat history record not found."));
                }

                record.IsImplemented = false;
                await _context.SaveChangesAsync();
                Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] [OZI AI] ↩ Rollback / Restore Triggered for History ID: {record.Id}");

                return Ok(ApiResponse<object>.SuccessResponse(new
                {
                    historyId = record.Id,
                    isImplemented = false,
                    previousSnapshotJson = record.PreviousSnapshotJson
                }, "AI proposal rolled back. Restored previous snapshot."));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] ❌ [OZI AI] Failed to restore AI proposal: {ex.Message}");
                return StatusCode(500, ApiResponse<object>.FailureResponse($"Failed to restore AI proposal: {ex.Message}"));
            }
        }

        /// <summary>
        /// Clears AI chat history records for the current user and specified page route (or all).
        /// </summary>
        /// <param name="pageRoute">Optional page route to clear.</param>
        /// <param name="historyId">Optional specific record ID to delete.</param>
        /// <returns>Confirmation response.</returns>
        [HttpDelete("ai/history")]
        public async Task<IActionResult> ClearAiChatHistory([FromQuery] string? pageRoute = null, [FromQuery] Guid? historyId = null)
        {
            try
            {
                var currentUserId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                var query = _context.AiChatHistories.AsQueryable();

                if (!string.IsNullOrWhiteSpace(currentUserId))
                {
                    query = query.Where(h => h.UserId == currentUserId);
                }

                if (historyId.HasValue && historyId.Value != Guid.Empty)
                {
                    query = query.Where(h => h.Id == historyId.Value);
                }
                else if (!string.IsNullOrWhiteSpace(pageRoute))
                {
                    var normalized = pageRoute.Trim().ToLowerInvariant();
                    query = query.Where(h => h.PageRoute.ToLower() == normalized);
                }

                var toRemove = await query.ToListAsync();
                if (toRemove.Count > 0)
                {
                    _context.AiChatHistories.RemoveRange(toRemove);
                    await _context.SaveChangesAsync();
                }

                Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] [OZI AI] 🗑️ Cleared {toRemove.Count} interaction history record(s) for Route: '{pageRoute ?? "ALL"}'");

                return Ok(ApiResponse<object>.SuccessResponse(new { deletedCount = toRemove.Count }, "AI Chat history cleared successfully."));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[{DateTime.Now:HH:mm:ss.fff}] ❌ [OZI AI] Failed to clear AI history: {ex.Message}");
                return StatusCode(500, ApiResponse<object>.FailureResponse($"Failed to clear AI history: {ex.Message}"));
            }
        }

        /// <summary>
        /// Inserts a section into a WebPage (or Homepage) instantiated from an installed UI template.
        /// Automatically parses DefaultContentJson (or provided CustomContentJson) to populate the
        /// PageSection scalar fields (Title, MiniTitle, Description, ImageUrl, ButtonText, ButtonLink)
        /// and its child PageSectionList items.
        /// </summary>
        /// <param name="request">The assignment parameters and content payload.</param>
        /// <returns>The newly created and populated PageSection.</returns>
        [HttpPost("templates/assign-to-page")]
        public async Task<IActionResult> AssignTemplateToPage([FromBody] AssignTemplateToPageRequest request)
        {
            if (request == null)
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Invalid request payload."));
            }

            try
            {
                // 1. Locate template from installed templates
                TenantInstalledTemplate? template = null;
                if (request.TemplateId.HasValue && request.TemplateId.Value != Guid.Empty)
                {
                    template = await _context.TenantInstalledTemplates.FindAsync(request.TemplateId.Value);
                }

                if (template == null && !string.IsNullOrWhiteSpace(request.TemplateKey))
                {
                    var cleanKey = request.TemplateKey.Trim();
                    template = await _context.TenantInstalledTemplates
                        .FirstOrDefaultAsync(t => t.TemplateKey == cleanKey || t.VariantCode == cleanKey);
                }

                if (template == null && !string.IsNullOrWhiteSpace(request.VariantCode))
                {
                    var cleanVariant = request.VariantCode.Trim();
                    template = await _context.TenantInstalledTemplates
                        .FirstOrDefaultAsync(t => t.VariantCode == cleanVariant);
                }

                // 2. Resolve target WebPage
                WebPage? targetPage = null;
                var isHomePage = false;

                if (request.WebPageId.HasValue && request.WebPageId.Value != Guid.Empty)
                {
                    targetPage = await _context.WebPages.FindAsync(request.WebPageId.Value);
                }
                else if (!string.IsNullOrWhiteSpace(request.TargetPageSlug))
                {
                    var slug = request.TargetPageSlug.Trim().ToLowerInvariant();
                    if (slug == "home" || slug == "/")
                    {
                        isHomePage = true;
                        targetPage = await _context.WebPages
                            .FirstOrDefaultAsync(p => p.DirectUrl == "home" || p.DirectUrl == "/" || p.DirectUrl == "" || p.Title.ToLower() == "home");
                    }
                    else
                    {
                        targetPage = await _context.WebPages
                            .FirstOrDefaultAsync(p => p.DirectUrl != null && p.DirectUrl.ToLower() == slug);
                    }
                }

                // 3. Determine order
                var insertAtTop = string.Equals(request.InsertPosition, "top", StringComparison.OrdinalIgnoreCase);
                int sortOrder = 10;

                if (targetPage != null)
                {
                    var existingOrders = await _context.PageSections
                        .Where(s => s.WebPageId == targetPage.Id)
                        .Select(s => s.PageSortOrder)
                        .ToListAsync();

                    if (existingOrders.Any())
                    {
                        sortOrder = insertAtTop ? Math.Max(1, existingOrders.Min() - 5) : existingOrders.Max() + 10;
                    }
                }
                else if (isHomePage)
                {
                    var homePage = await _context.WebPages.FirstOrDefaultAsync(p => p.IsHomePage || p.DirectUrl == "/" || p.DirectUrl == "home" || p.DirectUrl == "index");
                    if (homePage != null)
                    {
                        var existingOrders = await _context.PageSections
                            .Where(s => s.WebPageId == homePage.Id)
                            .Select(s => s.PageSortOrder)
                            .ToListAsync();

                        if (existingOrders.Any())
                        {
                            sortOrder = insertAtTop ? Math.Max(1, existingOrders.Min() - 5) : existingOrders.Max() + 10;
                        }
                    }
                }

                // 4. Parse content JSON (user's edited content or template's default content)
                var rawJson = !string.IsNullOrWhiteSpace(request.CustomContentJson)
                    ? request.CustomContentJson
                    : template?.DefaultContentJson;

                TemplateContentPayload? contentData = null;
                if (!string.IsNullOrWhiteSpace(rawJson))
                {
                    try
                    {
                        contentData = JsonSerializer.Deserialize<TemplateContentPayload>(rawJson, new JsonSerializerOptions
                        {
                            PropertyNameCaseInsensitive = true
                        });
                    }
                    catch
                    {
                        // Fallback gracefully if parsing fails
                    }
                }

                // 5. Build PageSection entity
                var section = new PageSection
                {
                    Id = Guid.NewGuid(),
                    WebPageId = targetPage?.Id,
                    TemplateKey = template?.TemplateKey ?? request.TemplateKey ?? template?.VariantCode ?? "Section_Custom",
                    MasterTemplateId = template?.MasterTemplateId,
                    IsCustomized = template?.IsCustomized ?? true,
                    HtmlTemplate = template?.HtmlTemplate ?? string.Empty,
                    CssStyles = template?.CssStyles ?? string.Empty,
                    JsScript = template?.JsScript,
                    Title = contentData?.Title ?? template?.Name ?? "New Section",
                    MiniTitle = contentData?.MiniTitle,
                    Description = contentData?.Description,
                    ImageUrl = contentData?.ImageUrl,
                    ButtonText = contentData?.ButtonText,
                    ButtonLink = contentData?.ButtonLink,
                    PageSortOrder = sortOrder,
                    Disable = false
                };

                _context.PageSections.Add(section);

                // 6. If repeating sub-items exist, populate PageSectionList children
                if (contentData?.Items != null && contentData.Items.Any())
                {
                    int itemOrder = 1;
                    foreach (var item in contentData.Items)
                    {
                        var child = new PageSectionList
                        {
                            Id = Guid.NewGuid(),
                            PageSectionId = section.Id,
                            Title = item.Title ?? $"Item {itemOrder}",
                            MiniTitle = item.MiniTitle,
                            Description = item.Description,
                            ImageUrl = item.ImageUrl,
                            ButtonText = item.ButtonText,
                            ButtonLink = item.ButtonLink,
                            SortOrder = itemOrder++
                        };
                        _context.PageSectionLists.Add(child);
                    }
                }

                await _context.SaveChangesAsync();

                // Reload section with children to return complete object
                var saved = await _context.PageSections
                    .Include(s => s.WebPage)
                    .Include(s => s.PageSectionLists!.OrderBy(l => l.SortOrder))
                    .FirstOrDefaultAsync(s => s.Id == section.Id);

                return Ok(ApiResponse<object>.SuccessResponse(saved, $"Template section successfully inserted into {(targetPage != null ? targetPage.Title : "Home")} page."));
            }
            catch (Exception ex)
            {
                var msg = ex.InnerException != null ? $"{ex.Message} -> {ex.InnerException.Message}" : ex.Message;
                return StatusCode(500, ApiResponse<object>.FailureResponse($"Failed to assign template section: {msg}"));
            }
        }

        /// <summary>
        /// Resolves dynamic metadata for the Template Editor Token Ribbon:
        /// real published forms, menu dropdowns, footer column groups, legal compliance pages, and brand settings.
        /// </summary>
        /// <returns>Structured token metadata for live one-click token insertion.</returns>
        [HttpGet("templates/editor-tokens")]
        public async Task<IActionResult> GetTemplateEditorTokens()
        {
            try
            {
                // 1. Published Forms
                var forms = await _context.PageForms
                    .AsNoTracking()
                    .Where(f => f.IsActive)
                    .OrderBy(f => f.Title)
                    .Select(f => new
                    {
                        key = f.FormKey,
                        title = f.Title,
                        description = f.Description,
                        submitText = f.SubmitButtonText
                    })
                    .ToListAsync();

                // 2. Menu Dropdown Categories (Publish == true && ShowInMenu == true)
                var rawCategories = await _context.PageCategories
                    .AsNoTracking()
                    .Where(c => c.Publish)
                    .Include(c => c.WebPages)
                    .OrderBy(c => c.MenuSortOrder)
                    .ToListAsync();

                // Dropdowns for header navigation (only categories with ShowInMenu == true and active child pages)
                var dropdowns = rawCategories
                    .Where(c => c.ShowInMenu && (c.WebPages != null && c.WebPages.Any(p => p.Publish && p.ShowInMenuDropDown)))
                    .Select(c => new
                    {
                        id = c.Id,
                        title = c.Title,
                        footerTitle = c.FooterDisplayTitle ?? c.Title,
                        showInFooter = c.ShowInFooter,
                        pages = (c.WebPages ?? new List<WebPage>())
                            .Where(p => p.Publish && p.ShowInMenuDropDown)
                            .OrderBy(p => p.DropdownSortOrder != 0 ? p.DropdownSortOrder : p.SortOrder)
                            .Select(p => new
                            {
                                id = p.Id,
                                title = p.Title,
                                slug = p.DirectUrl,
                                url = "/" + (p.DirectUrl ?? p.Id.ToString()),
                                showInFooter = p.ShowInFooter,
                                showInMenu = true
                            })
                            .ToList()
                    }).ToList();

                // 3. Footer Groups (Categories specifically enabled for the footer, sorted by FooterSortOrder)
                var footerGroups = rawCategories
                    .Where(c => c.ShowInFooter)
                    .OrderBy(c => c.FooterSortOrder)
                    .Select(c => new
                    {
                        id = c.Id,
                        name = c.Title,
                        displayTitle = !string.IsNullOrWhiteSpace(c.FooterDisplayTitle) ? c.FooterDisplayTitle : c.Title,
                        pages = (c.WebPages ?? new List<WebPage>())
                            .Where(p => p.Publish && p.ShowInFooter)
                            .OrderBy(p => p.FooterSortOrder != 0 ? p.FooterSortOrder : p.SortOrder)
                            .Select(p => new
                            {
                                id = p.Id,
                                title = p.Title,
                                slug = p.DirectUrl,
                                url = "/" + (p.DirectUrl ?? p.Id.ToString()),
                                showInFooter = true,
                                showInMenu = p.ShowInMenuDropDown || p.ShowInMainMenu
                            })
                            .ToList()
                    })
                    .ToList();

                // 4. Footer Bottom Compliance / Legal Pages (ShowInFooterBottom == true or IsLegal == true)
                var legalPages = await _context.WebPages
                    .AsNoTracking()
                    .Where(p => (p.ShowInFooterBottom || p.IsLegal) && p.Publish)
                    .OrderBy(p => p.FooterBottomSortOrder)
                    .Select(p => new
                    {
                        id = p.Id,
                        title = p.Title,
                        slug = p.DirectUrl,
                        url = "/" + (p.DirectUrl ?? p.Id.ToString())
                    })
                    .ToListAsync();

                // 4a. Top Utility Bar Pages (ShowInTopBar == true && Publish == true)
                var topBarPages = await _context.WebPages
                    .AsNoTracking()
                    .Where(p => p.ShowInTopBar && p.Publish)
                    .OrderBy(p => p.TopBarSortOrder)
                    .Select(p => new
                    {
                        id = p.Id,
                        title = p.Title,
                        slug = p.DirectUrl,
                        url = "/" + (p.DirectUrl ?? p.Id.ToString())
                    })
                    .ToListAsync();

                // 4b. Menu CTA Action Buttons (IsMenuCTA == true or fallback to platform defaults)
                var dbCtaButtons = await _context.WebPages
                    .AsNoTracking()
                    .Where(p => p.IsMenuCTA && p.Publish)
                    .OrderBy(p => p.SortOrder)
                    .Select(p => new
                    {
                        id = p.Id,
                        title = p.MenuCtaText ?? p.Title,
                        slug = p.DirectUrl,
                        url = !string.IsNullOrWhiteSpace(p.MenuCtaUrl) ? p.MenuCtaUrl : ("/" + (p.DirectUrl ?? p.Id.ToString())),
                        customClass = p.MenuCtaStyle == "outline" ? "oz-btn-ghost" : "oz-btn-primary",
                        buttonClass = p.MenuCtaStyle == "outline" ? "oz-btn-ghost" : "oz-btn-primary"
                    })
                    .ToListAsync();

                // Resolve tenant dynamic registration vanity slug
                string regSlug = "register";
                try
                {
                    var misConfig = await _context.MisConfigurationSettings.AsNoTracking().FirstOrDefaultAsync();
                    if (!string.IsNullOrWhiteSpace(misConfig?.RegistrationUrlSlug))
                    {
                        regSlug = misConfig.RegistrationUrlSlug.Trim().TrimStart('/');
                    }
                    else
                    {
                        var policyField = await _context.BcpRegistrationFormFields.AsNoTracking().FirstOrDefaultAsync(f => f.FieldKey == "__form_layout_policy__");
                        if (policyField != null && !string.IsNullOrWhiteSpace(policyField.OptionsJson))
                        {
                            var extra = JsonSerializer.Deserialize<RegistrationLayoutConfigExtra>(policyField.OptionsJson);
                            if (!string.IsNullOrWhiteSpace(extra?.RegistrationUrlSlug))
                                regSlug = extra.RegistrationUrlSlug.Trim().TrimStart('/');
                        }
                    }
                }
                catch { }

                string regUrl = regSlug == "register" ? "/auth/register" : $"/auth/{regSlug}";

                var menuCtaButtons = new List<object>();
                if (dbCtaButtons.Count > 0)
                {
                    foreach (var btn in dbCtaButtons)
                    {
                        string btnUrl = btn.url;
                        if (btnUrl == "/register" || btnUrl == "/auth/register" || btnUrl == "register")
                        {
                            btnUrl = regUrl;
                        }
                        menuCtaButtons.Add(new
                        {
                            btn.id,
                            btn.title,
                            slug = (btn.slug == "auth/register" || btn.slug == "register") ? regUrl.TrimStart('/') : btn.slug,
                            url = btnUrl,
                            btn.customClass,
                            btn.buttonClass
                        });
                    }
                }
                else
                {
                    // Fallback to platform default action buttons (Login & Get Started)
                    menuCtaButtons.Add(new
                    {
                        id = Guid.NewGuid(),
                        title = "Login",
                        slug = "auth/login",
                        url = "/auth/login",
                        customClass = "oz-btn-ghost",
                        buttonClass = "oz-btn-ghost"
                    });
                    menuCtaButtons.Add(new
                    {
                        id = Guid.NewGuid(),
                        title = "Get Started",
                        slug = regUrl.TrimStart('/'),
                        url = regUrl,
                        customClass = "oz-btn-primary",
                        buttonClass = "oz-btn-primary"
                    });
                }

                // 4c. Top-Level Main Menu Items (ShowInMainMenu == true)
                var topMenuItems = await _context.WebPages
                    .AsNoTracking()
                    .Where(p => p.ShowInMainMenu && p.Publish)
                    .OrderBy(p => p.MainMenuSortOrder != 0 ? p.MainMenuSortOrder : p.SortOrder)
                    .Select(p => new
                    {
                        id = p.Id,
                        title = p.Title,
                        slug = p.DirectUrl,
                        url = "/" + (p.DirectUrl ?? p.Id.ToString())
                    })
                    .ToListAsync();

                // 4d. Tagged Pages for Footer Link Grouping (Publish == true && ShowInFooter == true && Tags != null)
                var taggedWebPages = await _context.WebPages
                    .AsNoTracking()
                    .Where(p => p.Publish && p.ShowInFooter && !string.IsNullOrWhiteSpace(p.Tags))
                    .OrderBy(p => p.FooterSortOrder != 0 ? p.FooterSortOrder : p.SortOrder)
                    .Select(p => new
                    {
                        id = p.Id,
                        title = p.Title,
                        slug = p.DirectUrl,
                        url = "/" + (p.DirectUrl ?? p.Id.ToString()),
                        tags = p.Tags
                    })
                    .ToListAsync();

                var taggedPagesDict = new Dictionary<string, List<object>>(StringComparer.OrdinalIgnoreCase);
                foreach (var p in taggedWebPages)
                {
                    var tokens = (p.tags ?? "")
                        .Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries)
                        .Select(t => t.Trim())
                        .Where(t => !string.IsNullOrWhiteSpace(t));

                    foreach (var rawTag in tokens)
                    {
                        var tag = rawTag.ToLowerInvariant();
                        if (!taggedPagesDict.TryGetValue(tag, out var list))
                        {
                            list = new List<object>();
                            taggedPagesDict[tag] = list;
                        }
                        list.Add(new
                        {
                            id = p.id,
                            title = p.title,
                            slug = p.slug,
                            url = p.url
                        });
                    }
                }

                var taggedPages = taggedPagesDict.Select(kvp => new
                {
                    tag = kvp.Key,
                    pages = kvp.Value
                }).OrderBy(g => g.tag).ToList();

                // 5a. Dynamic Contact Channels & Social Media Profiles
                var contactChannels = new List<object>();
                var socialLinks = new List<object>();
                var contactPhones = new List<object>();
                var contactEmails = new List<object>();
                var contactAddresses = new List<object>();

                var dbChannels = await _context.MisWebsiteContactChannels
                    .AsNoTracking()
                    .Where(c => c.IsPublished)
                    .OrderBy(c => c.SortOrder)
                    .ToListAsync();

                if (dbChannels.Any())
                {
                    foreach (var c in dbChannels)
                    {
                        var item = new
                        {
                            id = c.Id,
                            channelType = c.ChannelType,
                            platform = c.Platform ?? c.ChannelType,
                            title = c.Title,
                            description = c.Description ?? string.Empty,
                            value = c.Value,
                            content = c.Value,
                            url = c.Value,
                            iconClass = c.IconClass ?? string.Empty,
                            isDefault = c.IsDefault,
                            sortOrder = c.SortOrder
                        };

                        contactChannels.Add(item);

                        if (string.Equals(c.ChannelType, ContactChannelTypes.SocialMedia, StringComparison.OrdinalIgnoreCase))
                        {
                            socialLinks.Add(item);
                        }
                        else if (string.Equals(c.ChannelType, ContactChannelTypes.Phone, StringComparison.OrdinalIgnoreCase))
                        {
                            contactPhones.Add(item);
                        }
                        else if (string.Equals(c.ChannelType, ContactChannelTypes.Email, StringComparison.OrdinalIgnoreCase))
                        {
                            contactEmails.Add(item);
                        }
                        else if (string.Equals(c.ChannelType, ContactChannelTypes.Address, StringComparison.OrdinalIgnoreCase))
                        {
                            contactAddresses.Add(item);
                        }
                    }
                }

                var primaryEmail = dbChannels.FirstOrDefault(c => c.ChannelType == ContactChannelTypes.Email && c.IsDefault)?.Value
                    ?? dbChannels.FirstOrDefault(c => c.ChannelType == ContactChannelTypes.Email)?.Value
                    ?? string.Empty;
                var primaryPhone = dbChannels.FirstOrDefault(c => c.ChannelType == ContactChannelTypes.Phone && c.IsDefault)?.Value
                    ?? dbChannels.FirstOrDefault(c => c.ChannelType == ContactChannelTypes.Phone)?.Value
                    ?? string.Empty;
                var primaryAddress = dbChannels.FirstOrDefault(c => c.ChannelType == ContactChannelTypes.Address && c.IsDefault)?.Value
                    ?? dbChannels.FirstOrDefault(c => c.ChannelType == ContactChannelTypes.Address)?.Value
                    ?? string.Empty;

                var facebookUrl = dbChannels.FirstOrDefault(c => (c.Platform != null && c.Platform.ToLower().Contains("facebook")) || (c.Title != null && c.Title.ToLower().Contains("facebook")))?.Value ?? string.Empty;
                var twitterUrl = dbChannels.FirstOrDefault(c => (c.Platform != null && (c.Platform.ToLower().Contains("twitter") || c.Platform.ToLower() == "x")) || (c.Title != null && (c.Title.ToLower().Contains("twitter") || c.Title.ToLower() == "x")))?.Value ?? string.Empty;
                var instagramUrl = dbChannels.FirstOrDefault(c => (c.Platform != null && c.Platform.ToLower().Contains("instagram")) || (c.Title != null && c.Title.ToLower().Contains("instagram")))?.Value ?? string.Empty;
                var youtubeUrl = dbChannels.FirstOrDefault(c => (c.Platform != null && c.Platform.ToLower().Contains("youtube")) || (c.Title != null && c.Title.ToLower().Contains("youtube")))?.Value ?? string.Empty;
                var tiktokUrl = dbChannels.FirstOrDefault(c => (c.Platform != null && c.Platform.ToLower().Contains("tiktok")) || (c.Title != null && c.Title.ToLower().Contains("tiktok")))?.Value ?? string.Empty;

                // 5. Tenant Brand Settings
                var config = await _context.MisWebsiteSettings.AsNoTracking().FirstOrDefaultAsync();
                var brand = new
                {
                    name = config?.BrandName ?? config?.CompanyName ?? "Organization Portal",
                    logoUrl = config?.LogoUrl ?? config?.CompanyLogoUrl ?? string.Empty,
                    whiteLogoUrl = config?.WhiteLogoUrl ?? config?.CompanyWhiteLogoUrl ?? string.Empty,
                    tagline = config?.Tagline ?? config?.CompanyDescription ?? string.Empty,
                    email = primaryEmail,
                    phone = primaryPhone,
                    address = primaryAddress,
                    facebook = facebookUrl,
                    twitter = twitterUrl,
                    instagram = instagramUrl,
                    youtube = youtubeUrl,
                    tiktok = tiktokUrl
                };


                // MisWebsiteContactChannels is the authoritative single source of truth for all contact and social channels.

                return Ok(ApiResponse<object>.SuccessResponse(new
                {
                    publishedForms = forms,
                    topBarPages = topBarPages,
                    menuDropdowns = dropdowns,
                    topMenuItems = topMenuItems,
                    menuCtaButtons = menuCtaButtons,
                    footerGroups = footerGroups,
                    taggedPages = taggedPages,
                    legalPages = legalPages,
                    brand = brand,
                    contactChannels = contactChannels,
                    socialLinks = socialLinks,
                    contactPhones = contactPhones,
                    contactEmails = contactEmails,
                    contactAddresses = contactAddresses
                }, "Template editor tokens loaded successfully."));
            }
            catch (Exception ex)
            {
                return StatusCode(500, ApiResponse<object>.FailureResponse($"Failed to load template editor tokens: {ex.Message}"));
            }
        }

        // ==========================================
        // 13.1. IMPORT & ADOPT FULL WEBSITE TEMPLATE SUITE
        // ==========================================

        /// <summary>
        /// Atomically imports a complete AI-debranded website template suite package into the tenant database.
        /// Installs or updates TenantInstalledTemplates, SiteCodeInjectionTags, PageCategories, WebPages, Sliders, PageSections, and PageSectionLists.
        /// </summary>
        /// <param name="request">The complete suite payload containing templates, code injection tags, categories, pages, and layout sections.</param>
        /// <returns>Execution summary with imported entity counts.</returns>
        [HttpPost("templates/import-website-suite")]
        public async Task<IActionResult> ImportWebsiteSuite([FromBody] ImportWebsiteSuiteRequest request)
        {
            if (request == null)
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Invalid payload. Request body cannot be empty."));
            }

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                int templatesImported = 0;
                int tagsImported = 0;
                int categoriesImported = 0;
                int pagesImported = 0;
                int sectionsImported = 0;

                var suiteName = string.IsNullOrWhiteSpace(request.SuiteName) ? "Imported Modern Suite" : request.SuiteName.Trim();
                var groupCode = string.IsNullOrWhiteSpace(request.GroupCode) ? "SUITE_IMPORTED" : request.GroupCode.Trim();

                var singletonCategories = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
                {
                    "menu", "hero", "footer", "breadcrumb", "blog", "blog_detail", "ecommerce"
                };

                // If adopting / overriding, deactivate previous competing singleton templates
                if (request.OverrideExisting)
                {
                    var incomingSingletonCats = (request.Templates ?? new List<ImportableTemplateDto>())
                        .Where(t => singletonCategories.Contains(t.CategoryKey))
                        .Select(t => t.CategoryKey.ToLowerInvariant())
                        .ToHashSet();

                    if (incomingSingletonCats.Any())
                    {
                        var activeSingletons = await _context.TenantInstalledTemplates
                            .Where(t => incomingSingletonCats.Contains(t.CategoryKey.ToLower()) && t.IsActive)
                            .ToListAsync();

                        foreach (var oldSingleton in activeSingletons)
                        {
                            oldSingleton.IsActive = false;
                        }
                    }
                }

                // 1. Process TenantInstalledTemplates
                if (request.Templates != null && request.Templates.Any())
                {
                    foreach (var t in request.Templates)
                    {
                        var existing = await _context.TenantInstalledTemplates
                            .FirstOrDefaultAsync(x => x.TemplateKey == t.TemplateKey || x.VariantCode == t.VariantCode);

                        if (existing != null)
                        {
                            if (request.OverrideExisting)
                            {
                                existing.Name = t.Name;
                                existing.CategoryKey = t.CategoryKey;
                                existing.HtmlTemplate = t.HtmlTemplate;
                                existing.CssStyles = t.CssStyles ?? string.Empty;
                                existing.JsScript = t.JsScript;
                                existing.DefaultContentJson = t.DefaultContentJson;
                                existing.IsCustomized = true;
                                existing.IsActive = true;
                                existing.LastUpdatedUtc = DateTime.UtcNow;
                                templatesImported++;
                            }
                        }
                        else
                        {
                            var newTemplate = new TenantInstalledTemplate
                            {
                                Id = Guid.NewGuid(),
                                TemplateKey = t.TemplateKey,
                                CategoryKey = t.CategoryKey,
                                Name = t.Name,
                                VariantCode = t.VariantCode,
                                HtmlTemplate = t.HtmlTemplate,
                                CssStyles = t.CssStyles ?? string.Empty,
                                JsScript = t.JsScript,
                                DefaultContentJson = t.DefaultContentJson,
                                InstalledVersion = "1.0.0",
                                IsCustomized = true,
                                IsActive = true,
                                InstalledUtc = DateTime.UtcNow
                            };
                            _context.TenantInstalledTemplates.Add(newTemplate);
                            templatesImported++;
                        }
                    }
                }

                var cleanSuiteCode = groupCode.StartsWith("SUITE_", StringComparison.OrdinalIgnoreCase)
                    ? $"suite_{groupCode.Substring(6).ToLowerInvariant()}"
                    : $"suite_{groupCode.ToLowerInvariant()}";

                // 2. Process SiteCodeInjectionTags (Head, Body Open, Footer)
                if (request.CodeInjections != null && request.CodeInjections.Any())
                {
                    // If adopting with override, deactivate competing suite-specific stylesheets/scripts
                    if (request.OverrideExisting)
                    {
                        var competingTags = await _context.SiteCodeInjectionTags
                            .Where(t => t.SuiteCode != null && t.SuiteCode != cleanSuiteCode && t.SuiteCode != "global" && t.IsActive)
                            .ToListAsync();

                        foreach (var ct in competingTags)
                        {
                            ct.IsActive = false;
                        }
                    }

                    foreach (var tag in request.CodeInjections)
                    {
                        var targetSuiteCode = !string.IsNullOrWhiteSpace(tag.SuiteCode) ? tag.SuiteCode.Trim().ToLowerInvariant() : cleanSuiteCode;

                        var existingTag = await _context.SiteCodeInjectionTags
                            .FirstOrDefaultAsync(x => x.Name == tag.Name && x.Zone == tag.Zone);

                        if (existingTag != null)
                        {
                            if (request.OverrideExisting)
                            {
                                existingTag.Content = tag.Content;
                                existingTag.TagType = tag.TagType;
                                existingTag.SuiteCode = targetSuiteCode;
                                existingTag.SortOrder = tag.SortOrder;
                                existingTag.IsActive = true;
                                existingTag.UpdatedAtUtc = DateTime.UtcNow;
                                tagsImported++;
                            }
                        }
                        else
                        {
                            var newTag = new SiteCodeInjectionTag
                            {
                                Id = Guid.NewGuid(),
                                Name = tag.Name,
                                Zone = tag.Zone,
                                TagType = tag.TagType,
                                SuiteCode = targetSuiteCode,
                                Content = tag.Content,
                                SortOrder = tag.SortOrder,
                                IsActive = true,
                                CreatedAtUtc = DateTime.UtcNow
                            };
                            _context.SiteCodeInjectionTags.Add(newTag);
                            tagsImported++;
                        }
                    }
                }

                // 3. Process PageCategories
                var categoryMap = new Dictionary<string, Guid>(StringComparer.OrdinalIgnoreCase);
                if (request.Categories != null && request.Categories.Any())
                {
                    foreach (var cat in request.Categories)
                    {
                        var existingCat = await _context.PageCategories
                            .FirstOrDefaultAsync(x => x.Title == cat.Title);

                        if (existingCat == null)
                        {
                            var newCat = new PageCategory
                            {
                                Id = Guid.NewGuid(),
                                Title = cat.Title,
                                MenuSortOrder = cat.MenuSortOrder,
                                Publish = true,
                                ShowInFooter = cat.ShowInFooter,
                                FooterDisplayTitle = cat.FooterDisplayTitle ?? cat.Title
                            };
                            _context.PageCategories.Add(newCat);
                            categoryMap[cat.Title] = newCat.Id;
                            categoriesImported++;
                        }
                        else
                        {
                            categoryMap[cat.Title] = existingCat.Id;
                        }
                    }
                }

                // 3.5. Unpublish existing pages and disable existing sections to prevent content contradiction
                if (request.OverrideExisting)
                {
                    var allExistingPages = await _context.WebPages.ToListAsync();
                    foreach (var oldPage in allExistingPages)
                    {
                        oldPage.Publish = false;
                    }

                    var allExistingSections = await _context.PageSections.ToListAsync();
                    foreach (var oldSec in allExistingSections)
                    {
                        oldSec.Disable = true;
                    }
                }

                // 4. Process WebPages and their PageSections
                if (request.Pages != null && request.Pages.Any())
                {
                    foreach (var p in request.Pages)
                    {
                        var existingPage = await _context.WebPages
                            .Include(wp => wp.PageSections)
                            .FirstOrDefaultAsync(x => x.DirectUrl == p.Slug || x.Title == p.Title);

                        Guid pageId;

                        if (existingPage != null)
                        {
                            pageId = existingPage.Id;
                            existingPage.Title = p.Title;
                            existingPage.DirectUrl = p.Slug;
                            existingPage.EnableDirectUrl = !string.IsNullOrWhiteSpace(p.Slug);
                            existingPage.MetaDescription = p.Summary;
                            existingPage.ShowInMainMenu = p.ShowInMainMenu;
                            existingPage.ShowInMenuDropDown = p.ShowInMenuDropDown;
                            existingPage.ShowInFooter = p.ShowInFooter;
                            existingPage.IsLegal = p.IsLegal;
                            existingPage.IsMenuCTA = p.IsMenuCTA;
                            existingPage.SortOrder = p.SortOrder;
                            existingPage.Publish = true;

                            if (!string.IsNullOrWhiteSpace(p.CategoryTitle) && categoryMap.TryGetValue(p.CategoryTitle, out var catId))
                            {
                                existingPage.PageCategoryId = catId;
                            }
                        }
                        else
                        {
                            var newPage = new WebPage
                            {
                                Id = Guid.NewGuid(),
                                Title = p.Title,
                                DirectUrl = p.Slug,
                                EnableDirectUrl = !string.IsNullOrWhiteSpace(p.Slug),
                                MetaDescription = p.Summary,
                                ShowInMainMenu = p.ShowInMainMenu,
                                ShowInMenuDropDown = p.ShowInMenuDropDown,
                                ShowInFooter = p.ShowInFooter,
                                IsLegal = p.IsLegal,
                                IsMenuCTA = p.IsMenuCTA,
                                SortOrder = p.SortOrder,
                                Publish = true
                            };

                            if (!string.IsNullOrWhiteSpace(p.CategoryTitle) && categoryMap.TryGetValue(p.CategoryTitle, out var catId))
                            {
                                newPage.PageCategoryId = catId;
                            }

                            _context.WebPages.Add(newPage);
                            pageId = newPage.Id;
                            pagesImported++;
                        }

                        // If overriding existing page, purge old page sections to avoid merging old and new layouts
                        if (existingPage != null && request.OverrideExisting)
                        {
                            if (existingPage.PageSections != null && existingPage.PageSections.Any())
                            {
                                _context.PageSections.RemoveRange(existingPage.PageSections);
                            }
                        }

                        // Attach sections if provided
                        if (p.Sections != null && p.Sections.Any())
                        {
                            foreach (var s in p.Sections)
                            {
                                var matchingTemplate = request.Templates?.FirstOrDefault(t => t.TemplateKey == s.TemplateKey);
                                var section = new PageSection
                                {
                                    Id = Guid.NewGuid(),
                                    WebPageId = pageId,
                                    TemplateKey = s.TemplateKey,
                                    Title = s.Title ?? matchingTemplate?.Name ?? "Section",
                                    MiniTitle = s.MiniTitle,
                                    Description = s.Description,
                                    ImageUrl = s.ImageUrl,
                                    ButtonText = s.ButtonText,
                                    ButtonLink = s.ButtonLink,
                                    HtmlTemplate = matchingTemplate?.HtmlTemplate ?? string.Empty,
                                    CssStyles = matchingTemplate?.CssStyles ?? string.Empty,
                                    PageSortOrder = s.PageSortOrder,
                                    Disable = false,
                                    IsCustomized = true
                                };

                                _context.PageSections.Add(section);
                                sectionsImported++;

                                if (s.Items != null && s.Items.Any())
                                {
                                    int itemSort = 1;
                                    foreach (var item in s.Items)
                                    {
                                        var child = new PageSectionList
                                        {
                                            Id = Guid.NewGuid(),
                                            PageSectionId = section.Id,
                                            Title = item.Title ?? $"Item {itemSort}",
                                            MiniTitle = item.MiniTitle,
                                            Description = item.Description,
                                            ImageUrl = item.ImageUrl,
                                            ButtonText = item.ButtonText,
                                            ButtonLink = item.ButtonLink,
                                            SortOrder = itemSort++
                                        };
                                        _context.PageSectionLists.Add(child);
                                    }
                                }
                            }
                        }
                    }
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(ApiResponse<object>.SuccessResponse(new
                {
                    suiteName = suiteName,
                    groupCode = groupCode,
                    templatesImported = templatesImported,
                    tagsImported = tagsImported,
                    categoriesImported = categoriesImported,
                    pagesImported = pagesImported,
                    sectionsImported = sectionsImported
                }, $"Website template suite '{suiteName}' imported and adopted successfully."));
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                var msg = ex.InnerException != null ? $"{ex.Message} -> {ex.InnerException.Message}" : ex.Message;
                return StatusCode(500, ApiResponse<object>.FailureResponse($"Failed to import website template suite: {msg}"));
            }
        }

        // ==========================================
        // 14. 3-ZONE CODE INJECTION (HEAD, BODY OPEN, FOOTER)
        // ==========================================

        /// <summary>
        /// Retrieves code injection tags for the tenant, optionally filtered by zone ("head", "body_open", "footer").
        /// Sorted by SortOrder ascending.
        /// </summary>
        /// <summary>
        /// Retrieves all ordered code injection tags for the tenant, with optional zone or suite filtering.
        /// </summary>
        /// <param name="zone">Optional filter: 'head', 'body_open', or 'footer'.</param>
        /// <param name="suiteCode">Optional theme suite code filter (e.g. 'suite_pincretthe', 'suite_corporate', or 'all').</param>
        /// <returns>List of SiteCodeInjectionTag items.</returns>
        [HttpGet("code-injections")]
        public async Task<IActionResult> GetCodeInjections([FromQuery] string? zone = null, [FromQuery] string? suiteCode = null)
        {
            try
            {
                var query = _context.SiteCodeInjectionTags.AsQueryable();

                if (!string.IsNullOrWhiteSpace(zone))
                {
                    var cleanZone = zone.Trim().ToLowerInvariant();
                    query = query.Where(t => t.Zone.ToLower() == cleanZone);
                }

                if (!string.IsNullOrWhiteSpace(suiteCode) && suiteCode.ToLowerInvariant() != "all")
                {
                    var cleanSuite = suiteCode.Trim().ToLowerInvariant();
                    query = query.Where(t => t.SuiteCode == null || t.SuiteCode == "global" || t.SuiteCode.ToLower() == cleanSuite);
                }

                var list = await query
                    .OrderBy(t => t.SortOrder)
                    .ThenBy(t => t.CreatedAtUtc)
                    .ToListAsync();

                return Ok(ApiResponse<object>.SuccessResponse(list, "Code injection tags retrieved successfully."));
            }
            catch (Exception ex)
            {
                return StatusCode(500, ApiResponse<object>.FailureResponse($"Failed to fetch code injection tags: {ex.Message}"));
            }
        }

        /// <summary>
        /// Creates a new ordered code injection tag for head, body_open, or footer.
        /// </summary>
        /// <param name="request">Tag parameters.</param>
        /// <returns>Created SiteCodeInjectionTag record.</returns>
        [HttpPost("code-injections")]
        public async Task<IActionResult> CreateCodeInjection([FromBody] CreateCodeInjectionRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Content))
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Tag Name and Content are required."));
            }

            var cleanZone = (request.Zone ?? "head").Trim().ToLowerInvariant();
            if (cleanZone != "head" && cleanZone != "body_open" && cleanZone != "footer")
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Zone must be 'head', 'body_open', or 'footer'."));
            }

            // Pre-flight security scan: prevent SQL injection, malicious scripts, or blacklisted URLs
            var tagTypeLower = (request.TagType ?? string.Empty).ToLowerInvariant();
            var isCss = tagTypeLower.Contains("css") || tagTypeLower.Contains("stylesheet");
            var isJs = tagTypeLower.Contains("script") || tagTypeLower.Contains("js");
            var scan = _templateSecurityInspector.Inspect(
                htmlTemplate: (!isCss && !isJs) ? request.Content : null,
                cssStyles: isCss ? request.Content : null,
                jsScript: isJs ? request.Content : null,
                defaultContentJson: null);

            if (!scan.IsPassed)
            {
                var threat = scan.CriticalViolations.FirstOrDefault() ?? scan.Violations.FirstOrDefault();
                return BadRequest(ApiResponse<object>.FailureResponse(
                    $"Security inspection failed for tag '{request.Name}': {threat?.Message ?? "Prohibited code signature detected."}",
                    null,
                    scan.Violations.Select(v => $"[{v.Severity}] {v.Category}: {v.Message}").ToList()));
            }

            try
            {
                var tagId = Guid.NewGuid();
                var resolvedContent = request.Content.Trim();
                var resolvedTagType = string.IsNullOrWhiteSpace(request.TagType) ? "raw_html" : request.TagType.Trim().ToLowerInvariant();

                // Cloudflare R2 Auto-Offloader: If R2 is configured and user submitted inline CSS or JS,
                // compile the code into a standalone CDN asset and save the CDN <link> or <script> tag in the database.
                if (_r2Storage.IsConfigured())
                {
                    var tenantSlug = _tenantProvider?.CurrentTenant ?? "portal";
                    var safeTenant = tenantSlug.Trim().ToLowerInvariant();
                    var safeName = System.Text.RegularExpressions.Regex.Replace(request.Name.ToLowerInvariant(), @"[^a-z0-9\-_]", "-").Trim('-');
                    if (string.IsNullOrWhiteSpace(safeName)) safeName = "custom";

                    if (IsInlineCss(resolvedContent, resolvedTagType))
                    {
                        var cleanCss = ExtractCleanCss(resolvedContent);
                        if (!string.IsNullOrWhiteSpace(cleanCss))
                        {
                            var objectKey = $"tenants/{safeTenant}/injections/{safeName}-{tagId.ToString("N")[..8]}.css";
                            var cdnUrl = _r2Storage.GetPublicCdnUrl(objectKey);
                            var uploadRes = await _r2Storage.SaveAssetTextAsync(cdnUrl, cleanCss, "text/css");
                            if (uploadRes.Success && !string.IsNullOrWhiteSpace(uploadRes.Url))
                            {
                                resolvedContent = $"<link rel=\"stylesheet\" href=\"{uploadRes.Url}\" />";
                                resolvedTagType = "css_link";
                            }
                        }
                    }
                    else if (IsInlineJs(resolvedContent, resolvedTagType))
                    {
                        var cleanJs = ExtractCleanJs(resolvedContent);
                        if (!string.IsNullOrWhiteSpace(cleanJs))
                        {
                            var objectKey = $"tenants/{safeTenant}/injections/{safeName}-{tagId.ToString("N")[..8]}.js";
                            var cdnUrl = _r2Storage.GetPublicCdnUrl(objectKey);
                            var uploadRes = await _r2Storage.SaveAssetTextAsync(cdnUrl, cleanJs, "application/javascript");
                            if (uploadRes.Success && !string.IsNullOrWhiteSpace(uploadRes.Url))
                            {
                                resolvedContent = $"<script src=\"{uploadRes.Url}\"></script>";
                                resolvedTagType = "script_link";
                            }
                        }
                    }
                }

                var tag = new SiteCodeInjectionTag
                {
                    Id = tagId,
                    Name = request.Name.Trim(),
                    Zone = cleanZone,
                    TagType = resolvedTagType,
                    SuiteCode = string.IsNullOrWhiteSpace(request.SuiteCode) ? "global" : request.SuiteCode.Trim().ToLowerInvariant(),
                    Content = resolvedContent,
                    SortOrder = request.SortOrder,
                    IsActive = request.IsActive,
                    CreatedAtUtc = DateTime.UtcNow
                };

                _context.SiteCodeInjectionTags.Add(tag);
                await _context.SaveChangesAsync();

                return Ok(ApiResponse<object>.SuccessResponse(tag, $"Tag '{tag.Name}' created in {cleanZone} zone."));
            }
            catch (Exception ex)
            {
                return StatusCode(500, ApiResponse<object>.FailureResponse($"Failed to create code injection tag: {ex.Message}"));
            }
        }

        /// <summary>
        /// Uploads multiple CSS or JS asset files in bulk to Cloudflare R2 or local server storage,
        /// extracts/applies custom or auto-derived tag names, and creates active SiteCodeInjectionTag entries.
        /// </summary>
        /// <param name="files">The collection of files to upload.</param>
        /// <param name="names">Optional list of custom tag names corresponding to each file in the queue.</param>
        /// <param name="zone">Target browser zone: 'head', 'body_open', or 'footer'. Defaults to 'head'.</param>
        /// <param name="suiteCode">Theme suite scope: 'global' or a specific theme suite code. Defaults to 'global'.</param>
        /// <param name="startSortOrder">Starting sort order. Defaults to 10.</param>
        /// <param name="sortIncrement">Sort order increment per item. Defaults to 10.</param>
        /// <returns>List of newly created and injected SiteCodeInjectionTag entities.</returns>
        [HttpPost("code-injections/bulk-upload")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> BulkUploadCodeInjections(
            [FromForm] List<IFormFile> files,
            [FromForm] List<string>? names = null,
            [FromForm] string zone = "head",
            [FromForm] string suiteCode = "global",
            [FromForm] int startSortOrder = 10,
            [FromForm] int sortIncrement = 10)
        {
            if (files == null || files.Count == 0)
            {
                return BadRequest(ApiResponse<object>.FailureResponse("No files were provided for bulk upload."));
            }

            var cleanZone = (zone ?? "head").Trim().ToLowerInvariant();
            if (cleanZone != "head" && cleanZone != "body_open" && cleanZone != "footer")
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Zone must be 'head', 'body_open', or 'footer'."));
            }

            var cleanSuite = string.IsNullOrWhiteSpace(suiteCode) ? "global" : suiteCode.Trim().ToLowerInvariant();
            var tenantSlug = _tenantProvider?.CurrentTenant ?? "portal";

            var createdTags = new List<SiteCodeInjectionTag>();
            int currentSort = startSortOrder;

            // Get maximum existing sort order in this zone to append cleanly if startSortOrder is default
            if (startSortOrder == 10)
            {
                var maxSort = await _context.SiteCodeInjectionTags
                    .Where(t => t.Zone == cleanZone)
                    .Select(t => (int?)t.SortOrder)
                    .MaxAsync();
                if (maxSort.HasValue && maxSort.Value >= 10)
                {
                    currentSort = maxSort.Value + sortIncrement;
                }
            }

            for (int i = 0; i < files.Count; i++)
            {
                var file = files[i];
                if (file == null || file.Length == 0) continue;

                var rawFileName = file.FileName ?? "asset";
                var fileName = rawFileName;

                // Handle files ending with .download (e.g. main.js.download or style.css.download)
                if (fileName.EndsWith(".download", StringComparison.OrdinalIgnoreCase))
                {
                    fileName = fileName.Substring(0, fileName.Length - 9);
                }

                // Determine tag name: prioritize custom user input from names array, otherwise strip technical file extensions
                string tagName;
                if (names != null && names.Count > i && !string.IsNullOrWhiteSpace(names[i]))
                {
                    tagName = names[i].Trim();
                }
                else
                {
                    var cleanDerived = System.Text.RegularExpressions.Regex.Replace(
                        fileName,
                        @"\.(bundle\.min|min|bundle)\.(js|css)$|\.(js|css|woff2|woff|ttf|otf|eot|svg)$",
                        string.Empty,
                        System.Text.RegularExpressions.RegexOptions.IgnoreCase);
                    tagName = string.IsNullOrWhiteSpace(cleanDerived) ? fileName : cleanDerived.Trim();
                }

                var ext = Path.GetExtension(fileName).ToLowerInvariant();
                var isJs = ext == ".js" || rawFileName.EndsWith(".js.download", StringComparison.OrdinalIgnoreCase);
                var isFont = ext == ".woff2" || ext == ".woff" || ext == ".ttf" || ext == ".otf" || ext == ".eot" || ext == ".svg";
                var tagType = isJs 
                    ? (cleanZone == "footer" ? "footer_script_url" : "script_url") 
                    : (isFont ? "raw_css" : "link_stylesheet");

                // Pre-flight security scan: inspect text files (.css, .js) prior to storage
                if (isJs || (!isFont && ext == ".css"))
                {
                    using (var reader = new StreamReader(file.OpenReadStream()))
                    {
                        var textContent = await reader.ReadToEndAsync();
                        var fileScan = isJs
                            ? _templateSecurityInspector.Inspect(null, null, textContent, null)
                            : _templateSecurityInspector.Inspect(null, textContent, null, null);

                        if (!fileScan.IsPassed)
                        {
                            var threat = fileScan.CriticalViolations.FirstOrDefault() ?? fileScan.Violations.FirstOrDefault();
                            return BadRequest(ApiResponse<object>.FailureResponse(
                                $"Security inspection failed for file '{fileName}': {threat?.Message ?? "Prohibited code signature detected."}",
                                null,
                                fileScan.Violations.Select(v => $"[{v.Severity}] {v.Category}: {v.Message}").ToList()));
                        }
                    }
                }

                try
                {
                    string assetUrl;

                    if (_r2Storage.IsConfigured())
                    {
                        await using var stream = file.OpenReadStream();
                        CloudflareR2UploadResult result;
                        if (isJs)
                        {
                            result = await _r2Storage.UploadAssetAsync(stream, fileName, "application/javascript", $"tenants/{tenantSlug}/js");
                        }
                        else if (isFont)
                        {
                            var contentType = ext switch
                            {
                                ".woff2" => "font/woff2",
                                ".woff" => "font/woff",
                                ".ttf" => "font/ttf",
                                ".otf" => "font/otf",
                                ".eot" => "application/vnd.ms-fontobject",
                                ".svg" => "image/svg+xml",
                                _ => "application/octet-stream"
                            };
                            result = await _r2Storage.UploadAssetAsync(stream, fileName, contentType, $"tenants/{tenantSlug}/fonts");
                        }
                        else
                        {
                            result = await _r2Storage.UploadCssAsync(stream, fileName, tenantSlug);
                        }

                        if (result.Success && !string.IsNullOrWhiteSpace(result.Url))
                        {
                            assetUrl = result.Url;
                        }
                        else
                        {
                            // Fallback to local server storage if R2 upload fails
                            var subFolder = isJs ? "js" : (isFont ? "fonts" : "css");
                            var localDir = Path.Combine(AppContext.BaseDirectory, "uploads", "assets", subFolder);
                            Directory.CreateDirectory(localDir);

                            var safeBaseName = Path.GetFileNameWithoutExtension(fileName).Replace(" ", "-").ToLowerInvariant();
                            var uniqueFileName = $"{safeBaseName}-{Guid.NewGuid().ToString("N")[..8]}{ext}";
                            var localPath = Path.Combine(localDir, uniqueFileName);

                            await using (var localStream = new FileStream(localPath, FileMode.Create))
                            {
                                file.OpenReadStream().CopyTo(localStream);
                            }

                            assetUrl = $"{Request.Scheme}://{Request.Host}{Request.PathBase}/api/ContentApi/assets/{subFolder}/{uniqueFileName}";
                        }
                    }
                    else
                    {
                        // Fallback to local server storage when R2 is unconfigured
                        var subFolder = isJs ? "js" : (isFont ? "fonts" : "css");
                        var localDir = Path.Combine(AppContext.BaseDirectory, "uploads", "assets", subFolder);
                        Directory.CreateDirectory(localDir);

                        var safeBaseName = Path.GetFileNameWithoutExtension(fileName).Replace(" ", "-").ToLowerInvariant();
                        var uniqueFileName = $"{safeBaseName}-{Guid.NewGuid().ToString("N")[..8]}{ext}";
                        var localPath = Path.Combine(localDir, uniqueFileName);

                        await using (var localStream = new FileStream(localPath, FileMode.Create))
                        {
                            await file.CopyToAsync(localStream);
                        }

                        assetUrl = $"{Request.Scheme}://{Request.Host}{Request.PathBase}/api/ContentApi/assets/{subFolder}/{uniqueFileName}";
                    }

                    string tagContent;
                    if (isJs)
                    {
                        tagContent = $"<script src=\"{assetUrl}\"></script>";
                    }
                    else if (isFont)
                    {
                        var fontFormat = ext switch
                        {
                            ".woff2" => "woff2",
                            ".woff" => "woff",
                            ".ttf" => "truetype",
                            ".otf" => "opentype",
                            ".eot" => "embedded-opentype",
                            ".svg" => "svg",
                            _ => "woff2"
                        };
                        tagContent = $"<style>\n@font-face {{\n  font-family: '{tagName}';\n  src: url('{assetUrl}') format('{fontFormat}');\n  font-weight: normal;\n  font-style: normal;\n  font-display: swap;\n}}\n</style>";
                    }
                    else
                    {
                        tagContent = $"<link rel=\"stylesheet\" href=\"{assetUrl}\" />";
                    }

                    var tag = new SiteCodeInjectionTag
                    {
                        Id = Guid.NewGuid(),
                        Name = tagName,
                        Zone = cleanZone,
                        TagType = tagType,
                        SuiteCode = cleanSuite,
                        Content = tagContent,
                        SortOrder = currentSort,
                        IsActive = true,
                        CreatedAtUtc = DateTime.UtcNow
                    };

                    _context.SiteCodeInjectionTags.Add(tag);
                    createdTags.Add(tag);
                    currentSort += sortIncrement;
                }
                catch (Exception ex)
                {
                    return StatusCode(500, ApiResponse<object>.FailureResponse($"Failed to upload file '{fileName}': {ex.Message}"));
                }
            }

            await _context.SaveChangesAsync();
            return Ok(ApiResponse<object>.SuccessResponse(createdTags, $"{createdTags.Count} code injection tag(s) uploaded and injected successfully."));
        }

        /// <summary>
        /// Updates an existing code injection tag.
        /// </summary>
        /// <param name="id">Tag identifier.</param>
        /// <param name="request">Updated tag fields.</param>
        /// <returns>Updated SiteCodeInjectionTag record.</returns>
        [HttpPut("code-injections/{id:guid}")]
        public async Task<IActionResult> UpdateCodeInjection(Guid id, [FromBody] UpdateCodeInjectionRequest request)
        {
            var tag = await _context.SiteCodeInjectionTags.FindAsync(id);
            if (tag == null)
            {
                return NotFound(ApiResponse<object>.FailureResponse("Code injection tag not found."));
            }

            if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Content))
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Tag Name and Content are required."));
            }

            var cleanZone = (request.Zone ?? tag.Zone).Trim().ToLowerInvariant();
            if (cleanZone != "head" && cleanZone != "body_open" && cleanZone != "footer")
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Zone must be 'head', 'body_open', or 'footer'."));
            }

            // Pre-flight security scan: prevent SQL injection, malicious scripts, or blacklisted URLs
            var tagTypeLower = (request.TagType ?? tag.TagType ?? string.Empty).ToLowerInvariant();
            var isCss = tagTypeLower.Contains("css") || tagTypeLower.Contains("stylesheet");
            var isJs = tagTypeLower.Contains("script") || tagTypeLower.Contains("js");
            var scan = _templateSecurityInspector.Inspect(
                htmlTemplate: (!isCss && !isJs) ? request.Content : null,
                cssStyles: isCss ? request.Content : null,
                jsScript: isJs ? request.Content : null,
                defaultContentJson: null);

            if (!scan.IsPassed)
            {
                var threat = scan.CriticalViolations.FirstOrDefault() ?? scan.Violations.FirstOrDefault();
                return BadRequest(ApiResponse<object>.FailureResponse(
                    $"Security inspection failed for tag '{request.Name}': {threat?.Message ?? "Prohibited code signature detected."}",
                    null,
                    scan.Violations.Select(v => $"[{v.Severity}] {v.Category}: {v.Message}").ToList()));
            }

            var incomingContent = request.Content.Trim();
            var incomingTagType = string.IsNullOrWhiteSpace(request.TagType) ? tag.TagType : request.TagType.Trim().ToLowerInvariant();

            // Cloudflare R2 Auto-Offloader on Update:
            if (_r2Storage.IsConfigured())
            {
                var existingUrl = ExtractUrlFromTag(tag.Content);
                var tenantSlug = _tenantProvider?.CurrentTenant ?? "portal";
                var safeTenant = tenantSlug.Trim().ToLowerInvariant();
                var safeName = System.Text.RegularExpressions.Regex.Replace(request.Name.ToLowerInvariant(), @"[^a-z0-9\-_]", "-").Trim('-');
                if (string.IsNullOrWhiteSpace(safeName)) safeName = "custom";

                if (!string.IsNullOrWhiteSpace(existingUrl) && (existingUrl.Contains(".r2.dev") || existingUrl.Contains(".r2.cloudflarestorage.com") || existingUrl.Contains("/tenants/")))
                {
                    var incomingUrl = ExtractUrlFromTag(incomingContent);
                    if (string.IsNullOrWhiteSpace(incomingUrl) || incomingUrl != existingUrl)
                    {
                        var isJs = incomingTagType.Contains("script") || incomingTagType.Contains("js") || existingUrl.EndsWith(".js", StringComparison.OrdinalIgnoreCase);
                        var rawText = isJs ? ExtractCleanJs(incomingContent) : ExtractCleanCss(incomingContent);
                        var contentType = isJs ? "application/javascript" : "text/css";
                        var updateRes = await _r2Storage.SaveAssetTextAsync(existingUrl, rawText, contentType);
                        if (updateRes.Success)
                        {
                            incomingContent = isJs ? $"<script src=\"{existingUrl}\"></script>" : $"<link rel=\"stylesheet\" href=\"{existingUrl}\" />";
                            incomingTagType = isJs ? "script_link" : "css_link";
                        }
                    }
                }
                else if (IsInlineCss(incomingContent, incomingTagType))
                {
                    var cleanCss = ExtractCleanCss(incomingContent);
                    if (!string.IsNullOrWhiteSpace(cleanCss))
                    {
                        var objectKey = $"tenants/{safeTenant}/injections/{safeName}-{tag.Id.ToString("N")[..8]}.css";
                        var cdnUrl = _r2Storage.GetPublicCdnUrl(objectKey);
                        var uploadRes = await _r2Storage.SaveAssetTextAsync(cdnUrl, cleanCss, "text/css");
                        if (uploadRes.Success && !string.IsNullOrWhiteSpace(uploadRes.Url))
                        {
                            incomingContent = $"<link rel=\"stylesheet\" href=\"{uploadRes.Url}\" />";
                            incomingTagType = "css_link";
                        }
                    }
                }
                else if (IsInlineJs(incomingContent, incomingTagType))
                {
                    var cleanJs = ExtractCleanJs(incomingContent);
                    if (!string.IsNullOrWhiteSpace(cleanJs))
                    {
                        var objectKey = $"tenants/{safeTenant}/injections/{safeName}-{tag.Id.ToString("N")[..8]}.js";
                        var cdnUrl = _r2Storage.GetPublicCdnUrl(objectKey);
                        var uploadRes = await _r2Storage.SaveAssetTextAsync(cdnUrl, cleanJs, "application/javascript");
                        if (uploadRes.Success && !string.IsNullOrWhiteSpace(uploadRes.Url))
                        {
                            incomingContent = $"<script src=\"{uploadRes.Url}\"></script>";
                            incomingTagType = "script_link";
                        }
                    }
                }
            }

            tag.Name = request.Name.Trim();
            tag.Zone = cleanZone;
            tag.TagType = incomingTagType;
            if (request.SuiteCode != null)
            {
                tag.SuiteCode = string.IsNullOrWhiteSpace(request.SuiteCode) ? "global" : request.SuiteCode.Trim().ToLowerInvariant();
            }
            tag.Content = incomingContent;
            tag.SortOrder = request.SortOrder;
            tag.IsActive = request.IsActive;
            tag.UpdatedAtUtc = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(ApiResponse<object>.SuccessResponse(tag, $"Tag '{tag.Name}' updated successfully."));
        }

        /// <summary>
        /// Batch reorders multiple code injection tags atomically with updated SortOrder values.
        /// </summary>
        /// <param name="items">List of tag IDs and their newly assigned sort orders.</param>
        /// <returns>Success response.</returns>
        [HttpPut("code-injections/reorder")]
        public async Task<IActionResult> ReorderCodeInjections([FromBody] List<ReorderCodeInjectionItem> items)
        {
            if (items == null || items.Count == 0)
            {
                return BadRequest(ApiResponse<object>.FailureResponse("No reorder items provided."));
            }

            var ids = items.Select(i => i.Id).ToList();
            var tags = await _context.SiteCodeInjectionTags
                .Where(t => ids.Contains(t.Id))
                .ToListAsync();

            var itemMap = items.ToDictionary(i => i.Id, i => i.SortOrder);
            foreach (var tag in tags)
            {
                if (itemMap.TryGetValue(tag.Id, out var newSortOrder))
                {
                    tag.SortOrder = newSortOrder;
                    tag.UpdatedAtUtc = DateTime.UtcNow;
                }
            }

            await _context.SaveChangesAsync();
            return Ok(ApiResponse<object>.SuccessResponse(null, $"{tags.Count} tag(s) reordered successfully."));
        }

        /// <summary>
        /// Deletes a code injection tag.
        /// </summary>
        /// <param name="id">Tag identifier.</param>
        /// <returns>Success response.</returns>
        [HttpDelete("code-injections/{id:guid}")]
        public async Task<IActionResult> DeleteCodeInjection(Guid id)
        {
            var tag = await _context.SiteCodeInjectionTags.FindAsync(id);
            if (tag == null)
            {
                return NotFound(ApiResponse<object>.FailureResponse("Code injection tag not found."));
            }

            _context.SiteCodeInjectionTags.Remove(tag);
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<object>.SuccessResponse(null, $"Tag '{tag.Name}' deleted successfully."));
        }

        /// <summary>
        /// Toggles active/inactive state of a code injection tag.
        /// </summary>
        /// <param name="id">Tag identifier.</param>
        /// <returns>Updated status response.</returns>
        [HttpPost("code-injections/{id:guid}/toggle")]
        public async Task<IActionResult> ToggleCodeInjection(Guid id)
        {
            var tag = await _context.SiteCodeInjectionTags.FindAsync(id);
            if (tag == null)
            {
                return NotFound(ApiResponse<object>.FailureResponse("Code injection tag not found."));
            }

            tag.IsActive = !tag.IsActive;
            tag.UpdatedAtUtc = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<object>.SuccessResponse(tag, $"Tag '{tag.Name}' status set to {(tag.IsActive ? "Active" : "Disabled")}."));
        }

        /// <summary>
        /// Retrieves the raw text content of a code injection asset (either inline HTML/CSS/JS or fetched from Cloudflare R2 / CDN).
        /// </summary>
        /// <param name="id">Tag identifier.</param>
        /// <returns>Raw content text payload, URL, and asset metadata.</returns>
        [HttpGet("code-injections/{id:guid}/raw-content")]
        public async Task<IActionResult> GetCodeInjectionRawContent(Guid id)
        {
            var tag = await _context.SiteCodeInjectionTags.FindAsync(id);
            if (tag == null)
            {
                return NotFound(ApiResponse<object>.FailureResponse("Code injection tag not found."));
            }

            var extractedUrl = ExtractUrlFromTag(tag.Content);
            if (!string.IsNullOrWhiteSpace(extractedUrl))
            {
                var content = await _r2Storage.GetAssetTextAsync(extractedUrl);
                return Ok(ApiResponse<object>.SuccessResponse(new
                {
                    tagId = tag.Id,
                    name = tag.Name,
                    tagType = tag.TagType,
                    zone = tag.Zone,
                    suiteCode = tag.SuiteCode,
                    isExternalCdn = true,
                    assetUrl = extractedUrl,
                    rawContent = content ?? string.Empty,
                    originalTagContent = tag.Content
                }, "Asset content retrieved successfully."));
            }

            // Inline content
            return Ok(ApiResponse<object>.SuccessResponse(new
            {
                tagId = tag.Id,
                name = tag.Name,
                tagType = tag.TagType,
                zone = tag.Zone,
                suiteCode = tag.SuiteCode,
                isExternalCdn = false,
                assetUrl = (string?)null,
                rawContent = tag.Content,
                originalTagContent = tag.Content
            }, "Inline code content retrieved successfully."));
        }

        /// <summary>
        /// Saves updated raw text content for a code injection tag. If the tag links to a Cloudflare R2 asset,
        /// overwrites the asset in R2 object storage with updated CDN headers.
        /// </summary>
        /// <param name="id">Tag identifier.</param>
        /// <param name="request">Payload containing the updated raw text content.</param>
        /// <returns>Updated tag details and asset metadata.</returns>
        [HttpPut("code-injections/{id:guid}/save-asset-content")]
        public async Task<IActionResult> SaveCodeInjectionAssetContent(Guid id, [FromBody] SaveAssetContentRequest request)
        {
            var tag = await _context.SiteCodeInjectionTags.FindAsync(id);
            if (tag == null)
            {
                return NotFound(ApiResponse<object>.FailureResponse("Code injection tag not found."));
            }

            var updatedText = request?.RawContent ?? string.Empty;

            // Pre-flight security scan: inspect updated asset text prior to overwriting R2 or database content
            var tagTypeLower = (tag.TagType ?? string.Empty).ToLowerInvariant();
            var isCssAsset = tagTypeLower.Contains("css") || tagTypeLower.Contains("stylesheet");
            var isJsAsset = tagTypeLower.Contains("script") || tagTypeLower.Contains("js");
            var scan = _templateSecurityInspector.Inspect(
                htmlTemplate: (!isCssAsset && !isJsAsset) ? updatedText : null,
                cssStyles: isCssAsset ? updatedText : null,
                jsScript: isJsAsset ? updatedText : null,
                defaultContentJson: null);

            if (!scan.IsPassed)
            {
                var threat = scan.CriticalViolations.FirstOrDefault() ?? scan.Violations.FirstOrDefault();
                return BadRequest(ApiResponse<object>.FailureResponse(
                    $"Security inspection failed for asset content: {threat?.Message ?? "Prohibited code signature detected."}",
                    null,
                    scan.Violations.Select(v => $"[{v.Severity}] {v.Category}: {v.Message}").ToList()));
            }

            var extractedUrl = ExtractUrlFromTag(tag.Content);

            if (!string.IsNullOrWhiteSpace(extractedUrl))
            {
                var isJs = tag.TagType.Contains("script") || extractedUrl.EndsWith(".js", StringComparison.OrdinalIgnoreCase);
                var contentType = isJs ? "application/javascript" : "text/css";

                var saveResult = await _r2Storage.SaveAssetTextAsync(extractedUrl, updatedText, contentType);
                if (!saveResult.Success)
                {
                    return StatusCode(500, ApiResponse<object>.FailureResponse(saveResult.Message));
                }

                tag.UpdatedAtUtc = DateTime.UtcNow;
                await _context.SaveChangesAsync();

                return Ok(ApiResponse<object>.SuccessResponse(new
                {
                    tagId = tag.Id,
                    name = tag.Name,
                    cdnUrl = saveResult.Url,
                    fileSizeBytes = saveResult.FileSizeBytes,
                    updatedAt = tag.UpdatedAtUtc
                }, "Asset file successfully saved and updated on Cloudflare CDN."));
            }

            // Inline tag content update
            tag.Content = updatedText;
            tag.UpdatedAtUtc = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<object>.SuccessResponse(new
            {
                tagId = tag.Id,
                name = tag.Name,
                updatedAt = tag.UpdatedAtUtc
            }, "Inline code injection tag updated successfully."));
        }

        /// <summary>
        /// Uploads font files (.woff2, .woff, .ttf, .eot, .otf, .svg) to Cloudflare R2 object storage under the tenant fonts repository.
        /// Returns public CDN URLs and pre-formatted @font-face CSS snippets.
        /// </summary>
        /// <param name="files">Collection of font files.</param>
        /// <returns>List of uploaded font assets with public CDN links and CSS snippets.</returns>
        [HttpPost("fonts/upload")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UploadFonts([FromForm] List<IFormFile> files)
        {
            if (files == null || files.Count == 0)
            {
                return BadRequest(ApiResponse<object>.FailureResponse("No font files were provided for upload."));
            }

            if (!_r2Storage.IsConfigured())
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Cloudflare R2 storage is not configured. Please define CloudflareR2 credentials in environment settings."));
            }

            var tenantSlug = _tenantProvider?.CurrentTenant ?? "portal";
            var fontFolder = $"tenants/{tenantSlug.Trim().ToLowerInvariant()}/fonts";
            var results = new List<object>();

            foreach (var file in files)
            {
                if (file == null || file.Length == 0) continue;

                var fileName = file.FileName;
                var ext = Path.GetExtension(fileName).ToLowerInvariant();
                var contentType = ext switch
                {
                    ".woff2" => "font/woff2",
                    ".woff" => "font/woff",
                    ".ttf" => "font/ttf",
                    ".otf" => "font/otf",
                    ".eot" => "application/vnd.ms-fontobject",
                    ".svg" => "image/svg+xml",
                    _ => "application/octet-stream"
                };

                try
                {
                    await using var stream = file.OpenReadStream();
                    var uploadResult = await _r2Storage.UploadAssetAsync(stream, fileName, contentType, fontFolder);
                    if (uploadResult.Success)
                    {
                        var fontFamilyName = Path.GetFileNameWithoutExtension(fileName).Split('.')[0];
                        var fontFormat = ext switch
                        {
                            ".woff2" => "woff2",
                            ".woff" => "woff",
                            ".ttf" => "truetype",
                            ".otf" => "opentype",
                            ".eot" => "embedded-opentype",
                            ".svg" => "svg",
                            _ => "woff2"
                        };

                        var fontFaceSnippet = $"@font-face {{\n  font-family: '{fontFamilyName}';\n  src: url('{uploadResult.Url}') format('{fontFormat}');\n  font-weight: normal;\n  font-style: normal;\n  font-display: swap;\n}}";

                        results.Add(new
                        {
                            fileName,
                            fontFamilyName,
                            cdnUrl = uploadResult.Url,
                            fileSizeBytes = uploadResult.FileSizeBytes,
                            format = fontFormat,
                            fontFaceSnippet
                        });
                    }
                    else
                    {
                        return StatusCode(500, ApiResponse<object>.FailureResponse($"Failed to upload font '{fileName}': {uploadResult.Message}"));
                    }
                }
                catch (Exception ex)
                {
                    return StatusCode(500, ApiResponse<object>.FailureResponse($"Failed to upload font '{fileName}': {ex.Message}"));
                }
            }

            return Ok(ApiResponse<object>.SuccessResponse(results, $"{results.Count} font file(s) uploaded successfully to Cloudflare CDN."));
        }

        /// <summary>
        /// Extracts an HTTP/HTTPS URL from a HTML tag or string.
        /// </summary>
        
        /// <summary>
        /// Detects if the tag content represents inline CSS styles.
        /// </summary>
        private static bool IsInlineCss(string content, string? tagType)
        {
            if (string.IsNullOrWhiteSpace(content)) return false;
            var typeLower = (tagType ?? string.Empty).ToLowerInvariant();
            if (typeLower == "inline_css" || typeLower == "css" || typeLower == "stylesheet") return true;
            var trimmed = content.Trim();
            return trimmed.StartsWith("<style", StringComparison.OrdinalIgnoreCase) && trimmed.EndsWith("</style>", StringComparison.OrdinalIgnoreCase);
        }

        /// <summary>
        /// Detects if the tag content represents inline JavaScript.
        /// </summary>
        private static bool IsInlineJs(string content, string? tagType)
        {
            if (string.IsNullOrWhiteSpace(content)) return false;
            var typeLower = (tagType ?? string.Empty).ToLowerInvariant();
            if (typeLower == "inline_js" || typeLower == "script" || typeLower == "javascript") return true;
            var trimmed = content.Trim();
            return trimmed.StartsWith("<script", StringComparison.OrdinalIgnoreCase) && trimmed.EndsWith("</script>", StringComparison.OrdinalIgnoreCase);
        }

        /// <summary>
        /// Extracts clean CSS text by stripping wrapping &lt;style&gt; tags if present.
        /// </summary>
        private static string ExtractCleanCss(string content)
        {
            if (string.IsNullOrWhiteSpace(content)) return string.Empty;
            var trimmed = content.Trim();
            var match = System.Text.RegularExpressions.Regex.Match(trimmed, @"<style[^>]*>([\s\S]*?)<\/style>", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
            return match.Success ? match.Groups[1].Value.Trim() : trimmed;
        }

        /// <summary>
        /// Extracts clean JavaScript text by stripping wrapping &lt;script&gt; tags if present.
        /// </summary>
        private static string ExtractCleanJs(string content)
        {
            if (string.IsNullOrWhiteSpace(content)) return string.Empty;
            var trimmed = content.Trim();
            var match = System.Text.RegularExpressions.Regex.Match(trimmed, @"<script[^>]*>([\s\S]*?)<\/script>", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
            return match.Success ? match.Groups[1].Value.Trim() : trimmed;
        }

        private static string? ExtractUrlFromTag(string content)
        {
            if (string.IsNullOrWhiteSpace(content)) return null;
            var trimmed = content.Trim();
            if (trimmed.StartsWith("http://", StringComparison.OrdinalIgnoreCase) || trimmed.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
            {
                return trimmed;
            }

            var hrefMatch = System.Text.RegularExpressions.Regex.Match(content, @"href=[""']([^""']+)[""']", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
            if (hrefMatch.Success) return hrefMatch.Groups[1].Value;

            var srcMatch = System.Text.RegularExpressions.Regex.Match(content, @"src=[""']([^""']+)[""']", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
            if (srcMatch.Success) return srcMatch.Groups[1].Value;

            return null;
        }
    }

    /// <summary>
    /// Payload model for saving updated asset code content.
    /// </summary>
    public class SaveAssetContentRequest
    {
        public string RawContent { get; set; } = string.Empty;
    }

    /// <summary>
    /// Request model for creating a custom section template directly in the tenant vault.
    /// </summary>
    public class CreateCustomTemplateRequest
    {
        public string Name { get; set; } = string.Empty;
        public string? CategoryKey { get; set; }
        public string? Category { get; set; }
        public string? Description { get; set; }
        public string? TemplateKey { get; set; }
        public string? VariantCode { get; set; }
        public string? HtmlTemplate { get; set; }
        public string? CssStyles { get; set; }
        public string? JsScript { get; set; }
        public string? DefaultContentJson { get; set; }
        public string? Version { get; set; }
        public string? InstalledVersion { get; set; } = "1.0.0";
    }

    /// <summary>
    /// Request model for assigning an installed template into a specific WebPage or Homepage.
    /// </summary>
    public class AssignTemplateToPageRequest
    {
        public Guid? TemplateId { get; set; }
        public string? TemplateKey { get; set; }
        public string? VariantCode { get; set; }
        public Guid? WebPageId { get; set; }
        public string? TargetPageSlug { get; set; }
        public string InsertPosition { get; set; } = "bottom";
        public string? CustomContentJson { get; set; }
    }

    /// <summary>
    /// Serialized JSON schema representation of default or custom sample showcase content for template hydration.
    /// </summary>
    public class TemplateContentPayload
    {
        public string? Title { get; set; }
        public string? MiniTitle { get; set; }
        public string? Description { get; set; }
        public string? ImageUrl { get; set; }
        public string? ButtonText { get; set; }
        public string? ButtonLink { get; set; }
        public List<TemplateContentItemPayload>? Items { get; set; }
    }

    /// <summary>
    /// Serialized JSON item schema for repeatable loop cards (PageSectionLists).
    /// </summary>
    public class TemplateContentItemPayload
    {
        public string? Title { get; set; }
        public string? MiniTitle { get; set; }
        public string? Description { get; set; }
        public string? ImageUrl { get; set; }
        public string? ButtonText { get; set; }
        public string? ButtonLink { get; set; }
    }

    public class CreateCodeInjectionRequest
    {
        public string Name { get; set; } = string.Empty;
        public string Zone { get; set; } = "head";
        public string TagType { get; set; } = "raw_html";
        public string? SuiteCode { get; set; } = "global";
        public string Content { get; set; } = string.Empty;
        public int SortOrder { get; set; } = 0;
        public bool IsActive { get; set; } = true;
    }

    public class UpdateCodeInjectionRequest
    {
        public string Name { get; set; } = string.Empty;
        public string Zone { get; set; } = "head";
        public string TagType { get; set; } = "raw_html";
        public string? SuiteCode { get; set; } = "global";
        public string Content { get; set; } = string.Empty;
        public int SortOrder { get; set; } = 0;
        public bool IsActive { get; set; } = true;
    }

    public class InstallTemplateRequest
    {
        public Guid? MasterTemplateId { get; set; }
        public string TemplateKey { get; set; } = string.Empty;
        public string CategoryKey { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string VariantCode { get; set; } = string.Empty;
        public string HtmlTemplate { get; set; } = string.Empty;
        public string CssStyles { get; set; } = string.Empty;
        public string? JsScript { get; set; }
        public string? DefaultContentJson { get; set; }
        public string? InstalledVersion { get; set; } = "1.0.0";
    }

    public class CreateWebPageRequest
    {
        public string Title { get; set; } = string.Empty;
        public string? Slug { get; set; }
        public string? DirectUrl { get; set; }
        public Guid? PageCategoryId { get; set; }
        public bool ShowInMainTop { get; set; } = false;
        public bool ShowInMenu { get; set; } = true;
        public bool ShowInMainMenu { get; set; } = true;
        public bool ShowInMenuDropDown { get; set; } = false;
        public bool ShowInFooter { get; set; } = true;
        public bool IsLegal { get; set; } = false;
        public bool IsMenuCTA { get; set; } = false;
        public string? Tags { get; set; }
        public bool IsPublished { get; set; } = true;
        public bool Publish { get; set; } = true;
        public bool SecurityPage { get; set; } = false;
        public int SortOrder { get; set; } = 0;
        public Ozikol_BCC.Domain.Enum.Enum.MenuPosition MenuPosition { get; set; } = Ozikol_BCC.Domain.Enum.Enum.MenuPosition.First;
        public string? CustomClass { get; set; }
        public string? ImageUrl { get; set; }
        public string? ImageKey { get; set; }
        public string? MetaTitle { get; set; }
        public string? MetaDescription { get; set; }
        public string? MetaKeywords { get; set; }
        public bool DisableAiAutoFill { get; set; } = false;
        public Ozikol_BCC.Domain.Enum.Enum.HomeSortFrom HomeSortFrom { get; set; }
        public Guid? MainPageId { get; set; }
        public bool IsHomePage { get; set; } = false;
        public bool ShowInTopBar { get; set; } = false;
        public int TopBarSortOrder { get; set; } = 0;
        public int MainMenuSortOrder { get; set; } = 0;
        public int DropdownSortOrder { get; set; } = 0;
        public int FooterSortOrder { get; set; } = 0;
        public bool ShowInFooterBottom { get; set; } = false;
        public int FooterBottomSortOrder { get; set; } = 0;
        public string? MenuCtaText { get; set; }
        public string? MenuCtaUrl { get; set; }
        public string? MenuCtaStyle { get; set; } = "primary";
        public bool AddToRibon { get; set; } = false;
        public string? RibonCustomDisplayTitle { get; set; }
        public int RibonSortOrder { get; set; } = 0;
    }

    public class CreatePageCategoryRequest
    {
        public string Title { get; set; } = string.Empty;
        public int MenuSortOrder { get; set; } = 0;
        public Ozikol_BCC.Domain.Enum.Enum.MenuPosition MenuPosition { get; set; } = Ozikol_BCC.Domain.Enum.Enum.MenuPosition.Middle;
        public string? CustomClass { get; set; }
        public bool Publish { get; set; } = true;
        public bool ShowInMenu { get; set; } = true;
        public bool ShowInFooter { get; set; } = true;
        public int FooterSortOrder { get; set; } = 0;
        public string? FooterDisplayTitle { get; set; }
        public Guid? ParentId { get; set; }
        public string? Icon { get; set; }
    }

    public class CreateBlogCategoryRequest
    {
        public string Title { get; set; } = string.Empty;
        public bool Publish { get; set; } = true;
        public Guid? ParentId { get; set; }
    }

    public class CreateBlogRequest
    {
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string? FullDescription { get; set; }
        public DateTime? Date { get; set; }
        public bool Publish { get; set; } = true;
        public bool IsScheduled { get; set; } = false;
        public DateTime? ScheduledPublishDate { get; set; }
        public int SortOrder { get; set; } = 0;
        public string? ImageUrl { get; set; }
        public string? ImageKey { get; set; }
        public string? VideoUrl { get; set; }
        public Guid? BlogCategoryId { get; set; }
        public bool AddToRibon { get; set; } = false;
        public string? RibonCustomDisplayTitle { get; set; }
        public int RibonSortOrder { get; set; } = 0;
    }

    public class ContentMediaUploadRequest
    {
        public IFormFile File { get; set; } = null!;
        public string Folder { get; set; } = "bcp-cms";
    }

    /// <summary>
    /// Payload representing a complete AI-debranded website template suite package for atomic tenant database import.
    /// </summary>
    public class ImportWebsiteSuiteRequest
    {
        public string SuiteName { get; set; } = "Imported Modern Suite";
        public string GroupCode { get; set; } = "SUITE_IMPORTED";
        public string SourceUrl { get; set; } = string.Empty;
        public bool OverrideExisting { get; set; } = true;
        public List<ImportableTemplateDto>? Templates { get; set; }
        public List<ImportableTagDto>? CodeInjections { get; set; }
        public List<ImportableCategoryDto>? Categories { get; set; }
        public List<ImportablePageDto>? Pages { get; set; }
    }

    public class ImportableTemplateDto
    {
        public string TemplateKey { get; set; } = string.Empty;
        public string CategoryKey { get; set; } = "body";
        public string Name { get; set; } = string.Empty;
        public string VariantCode { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string HtmlTemplate { get; set; } = string.Empty;
        public string? CssStyles { get; set; }
        public string? JsScript { get; set; }
        public string? DefaultContentJson { get; set; }
    }

    public class ImportableTagDto
    {
        public string Name { get; set; } = string.Empty;
        public string Zone { get; set; } = "head";
        public string TagType { get; set; } = "link_stylesheet";
        public string? SuiteCode { get; set; }
        public string Content { get; set; } = string.Empty;
        public int SortOrder { get; set; } = 10;
    }

    public class ImportableCategoryDto
    {
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public int MenuSortOrder { get; set; } = 10;
        public bool ShowInMenuDropDown { get; set; } = true;
        public bool ShowInFooter { get; set; } = true;
        public string? FooterDisplayTitle { get; set; }
    }

    public class ImportablePageSectionDto
    {
        public string TemplateKey { get; set; } = string.Empty;
        public string? Title { get; set; }
        public string? MiniTitle { get; set; }
        public string? Description { get; set; }
        public string? ImageUrl { get; set; }
        public string? ButtonText { get; set; }
        public string? ButtonLink { get; set; }
        public int PageSortOrder { get; set; } = 1;
        public List<ImportablePageSectionItemDto>? Items { get; set; }
    }

    public class ImportablePageSectionItemDto
    {
        public string? Title { get; set; }
        public string? MiniTitle { get; set; }
        public string? Description { get; set; }
        public string? ImageUrl { get; set; }
        public string? ButtonText { get; set; }
        public string? ButtonLink { get; set; }
    }

    public class ImportablePageDto
    {
        public string Title { get; set; } = string.Empty;
        public string Slug { get; set; } = string.Empty;
        public string? Summary { get; set; }
        public string? CategoryTitle { get; set; }
        public bool ShowInMainMenu { get; set; } = true;
        public bool ShowInMenuDropDown { get; set; } = false;
        public bool ShowInFooter { get; set; } = false;
        public bool IsLegal { get; set; } = false;
        public bool IsMenuCTA { get; set; } = false;
        public int SortOrder { get; set; } = 10;
        public List<ImportablePageSectionDto>? Sections { get; set; }
    }

    /// <summary>
    /// Payload item for updating the SortOrder of an individual code injection tag during batch reordering.
    /// </summary>
    public class ReorderCodeInjectionItem
    {
        public Guid Id { get; set; }
        public int SortOrder { get; set; }
    }

    /// <summary>
    /// Request model for submitting real-time browser telemetry, captured errors, and active tags for AI diagnostic analysis.
    /// </summary>
    public class DiagnoseRuntimeRequest
    {
        public List<string> HeaderTags { get; set; } = new();
        public List<string> FooterScripts { get; set; } = new();
        public List<string> CapturedErrors { get; set; } = new();
        public List<string> CapturedWarnings { get; set; } = new();
        public string ActiveTemplateName { get; set; } = string.Empty;
        public string ActiveTemplateCategory { get; set; } = string.Empty;
        public string? ScopedCss { get; set; }
        public string? ScopedJs { get; set; }
    }
}

