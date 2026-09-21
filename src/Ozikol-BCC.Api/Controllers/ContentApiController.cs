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
using Ozikol_BCC.Persistence.EF.SQL;
using Ozikol_BCC.Persistence.EF.SQL.Extensions;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace Ozikol_BCC.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "SuperAdmin,Admin,CmsManager")]
    [Tags("Content CMS Suite - Studio Management")]
    public class ContentApiController : ControllerBase
    {
        private readonly DashboardDbContext _context;
        private readonly IMediator _mediator;
        private readonly ICloudinaryService _cloudinaryService;
        private readonly ICloudflareR2StorageService _r2Storage;
        private readonly ITenantProvider? _tenantProvider;

        public ContentApiController(
            DashboardDbContext context, 
            IMediator mediator, 
            ICloudinaryService cloudinaryService,
            ICloudflareR2StorageService r2Storage,
            ITenantProvider? tenantProvider = null)
        {
            _context = context;
            _mediator = mediator;
            _cloudinaryService = cloudinaryService;
            _r2Storage = r2Storage;
            _tenantProvider = tenantProvider;
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
                var (secureUrl, publicId) = await _cloudinaryService.UploadImageWithPublicIdAsync(file, folder);
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

            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (extension != ".css")
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Only CSS (.css) stylesheet files are permitted."));
            }

            try
            {
                // Verify Cloudflare R2 storage credentials
                if (!_r2Storage.IsConfigured())
                {
                    // If not yet configured in .env, read content so user can embed inline and inform them
                    using var inlineReader = new StreamReader(file.OpenReadStream());
                    var rawContent = await inlineReader.ReadToEndAsync();

                    return BadRequest(ApiResponse<object>.FailureResponse(
                        "Cloudflare R2 storage is not configured. Please define CloudflareR2__AccountId, CloudflareR2__AccessKeyId, CloudflareR2__SecretAccessKey, CloudflareR2__BucketName, and CloudflareR2__PublicCdnUrl in your .env or environment variables. You can also click 'Import as Inline CSS' to embed the stylesheet directly without third-party storage."));
                }

                // Resolve tenant slug for multi-tenant asset folder isolation
                var tenantSlug = _tenantProvider?.CurrentTenant;

                // Upload to Cloudflare R2 with automatic edge CDN caching headers
                await using var stream = file.OpenReadStream();
                var result = await _r2Storage.UploadCssAsync(stream, file.FileName, tenantSlug);

                if (!result.Success)
                {
                    return StatusCode(500, ApiResponse<object>.FailureResponse(result.Message));
                }

                return Ok(ApiResponse<object>.SuccessResponse(new
                {
                    url = result.Url,
                    key = result.Key,
                    fileName = result.OriginalFileName,
                    safeName = result.SafeFileName,
                    size = result.FileSizeBytes,
                    storage = "Cloudflare R2 + Cloudflare CDN",
                    content = result.ContentPreview
                }, "CSS stylesheet uploaded to Cloudflare R2 and distributed via Cloudflare CDN successfully."));
            }
            catch (Exception ex)
            {
                return StatusCode(500, ApiResponse<object>.FailureResponse($"Failed to process Cloudflare R2 CSS upload: {ex.Message}"));
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
            if (string.IsNullOrWhiteSpace(fileName) || fileName.Contains("..") || Path.GetInvalidFileNameChars().Any(fileName.Contains))
            {
                return BadRequest("Invalid filename.");
            }

            var uploadsDir = Path.Combine(AppContext.BaseDirectory, "uploads", "css");
            var filePath = Path.Combine(uploadsDir, fileName);

            if (!System.IO.File.Exists(filePath))
            {
                return NotFound("CSS asset not found.");
            }

            return PhysicalFile(filePath, "text/css", enableRangeProcessing: true);
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
                .FirstOrDefaultAsync(p => p.DirectUrl != null && p.DirectUrl.ToLower() == cleanSlug);

            if (page == null) return NotFound(ApiResponse<object>.FailureResponse($"Page with slug '{slug}' not found."));

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
                // Unique slug generation
                var uniqueSlug = await GenerateUniqueSlugAsync(request.Slug ?? request.DirectUrl ?? request.Title);

                Guid? categoryId = request.PageCategoryId;
                if (categoryId == Guid.Empty) categoryId = null;

                var page = new WebPage
                {
                    Id = Guid.NewGuid(),
                    Title = request.Title.Trim(),
                    DirectUrl = uniqueSlug,
                    EnableDirectUrl = true,
                    PageCategoryId = categoryId,
                    ShowInMainTop = request.ShowInMainTop,
                    ShowInMainMenu = request.ShowInMenu || request.ShowInMainMenu,
                    ShowInMenuDropDown = request.ShowInMenuDropDown,
                    ShowInFooter = request.ShowInFooter,
                    IsLegal = request.IsLegal,
                    IsMenuCTA = request.IsMenuCTA,
                    Tags = request.Tags,
                    Publish = request.IsPublished || request.Publish,
                    SecurityPage = request.SecurityPage,
                    SortOrder = request.SortOrder,
                    ImageUrl = request.ImageUrl,
                    ImageKey = request.ImageKey,
                    MetaTitle = request.MetaTitle,
                    MetaDescription = request.MetaDescription,
                    MetaKeywords = request.MetaKeywords,
                    HomeSortFrom = request.HomeSortFrom,
                    MainPageId = request.MainPageId,
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
            if (!string.IsNullOrWhiteSpace(updated.DirectUrl) && updated.DirectUrl != existing.DirectUrl)
            {
                existing.DirectUrl = await GenerateUniqueSlugAsync(updated.DirectUrl, id);
            }

            existing.Title = updated.Title;
            existing.EnableDirectUrl = updated.EnableDirectUrl;
            existing.Publish = updated.Publish;
            existing.SecurityPage = updated.SecurityPage;
            existing.ShowInMainTop = updated.ShowInMainTop;
            existing.ShowInMainMenu = updated.ShowInMainMenu;
            existing.ShowInMenuDropDown = updated.ShowInMenuDropDown;
            existing.ShowInFooter = updated.ShowInFooter;
            existing.IsLegal = updated.IsLegal;
            existing.IsMenuCTA = updated.IsMenuCTA;
            existing.Tags = updated.Tags;
            existing.SortOrder = updated.SortOrder;
            existing.PageCategoryId = updated.PageCategoryId == Guid.Empty ? null : updated.PageCategoryId;
            existing.ImageUrl = updated.ImageUrl;
            existing.ImageKey = updated.ImageKey;
            existing.MetaTitle = updated.MetaTitle;
            existing.MetaDescription = updated.MetaDescription;
            existing.MetaKeywords = updated.MetaKeywords;
            existing.HomeSortFrom = updated.HomeSortFrom;
            existing.MainPageId = updated.MainPageId;
            existing.UpdatedAtUtc = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(ApiResponse<object>.SuccessResponse(existing, "Web page updated successfully."));
        }

        [HttpDelete("pages/{id:guid}")]
        public async Task<IActionResult> DeletePage(Guid id)
        {
            var existing = await _context.WebPages.FindAsync(id);
            if (existing == null) return NotFound(ApiResponse<object>.FailureResponse("Page not found."));

            _context.WebPages.Remove(existing);
            await _context.SaveChangesAsync();
            return Ok(ApiResponse<object>.SuccessResponse(null, "Web page deleted successfully."));
        }

        private async Task<string> GenerateUniqueSlugAsync(string rawInput, Guid? excludePageId = null)
        {
            if (string.IsNullOrWhiteSpace(rawInput)) rawInput = "page";
            var baseSlug = Regex.Replace(rawInput.Trim().ToLowerInvariant(), @"[^a-z0-9\-_]", "-").Trim('-');
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

            var category = new PageCategory
            {
                Id = Guid.NewGuid(),
                Title = request.Title.Trim(),
                MenuSortOrder = request.MenuSortOrder,
                Publish = request.Publish,
                ParentId = request.ParentId,
                Icon = request.Icon,
                HomeSortFrom = request.HomeSortFrom,
                CreatedAtUtc = DateTime.UtcNow
            };

            _context.PageCategories.Add(category);
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<object>.SuccessResponse(category, "Page category created successfully."));
        }

        [HttpPut("categories/{id:guid}")]
        public async Task<IActionResult> UpdateCategory(Guid id, [FromBody] PageCategory updated)
        {
            var existing = await _context.PageCategories.FindAsync(id);
            if (existing == null) return NotFound(ApiResponse<object>.FailureResponse("Category not found."));

            existing.Title = updated.Title;
            existing.MenuSortOrder = updated.MenuSortOrder;
            existing.Publish = updated.Publish;
            existing.ParentId = updated.ParentId == Guid.Empty ? null : updated.ParentId;
            existing.Icon = updated.Icon;
            existing.HomeSortFrom = updated.HomeSortFrom;

            await _context.SaveChangesAsync();
            return Ok(ApiResponse<object>.SuccessResponse(existing, "Category updated successfully."));
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
            return Ok(ApiResponse<object>.SuccessResponse(null, $"Category '{existing.Title}' deleted successfully."));
        }

        // ==========================================
        // 3. PAGE SECTIONS & SECTION LISTS
        // ==========================================

        [HttpGet("sections")]
        public async Task<IActionResult> GetSections([FromQuery] string? pageSet = null, [FromQuery] Guid? webPageId = null)
        {
            var query = _context.PageSections
                .Include(s => s.PageSectionLists!.OrderBy(l => l.SortOrder))
                .Include(s => s.PageForm)
                    .ThenInclude(f => f!.Fields!.OrderBy(fld => fld.SortOrder))
                .AsQueryable();

            if (webPageId.HasValue)
            {
                query = query.Where(s => s.WebPageId == webPageId.Value).OrderBy(s => s.PageSortOrder);
            }
            else if (pageSet == "home" || string.IsNullOrEmpty(pageSet))
            {
                query = query.Where(s => s.ShowInHome).OrderBy(s => s.HomePageSortOrder);
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
            existing.ButtonText = updated.ButtonText;
            existing.ButtonLink = updated.ButtonLink;
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
            existing.ShowInHome = updated.ShowInHome;
            existing.Disable = updated.Disable;
            existing.FixedAfterFooter = updated.FixedAfterFooter;
            existing.HomePageSortOrder = updated.HomePageSortOrder;
            existing.PageSortOrder = updated.PageSortOrder;
            existing.HomeSortFrom = updated.HomeSortFrom;
            existing.ShowSectionInBlog = updated.ShowSectionInBlog;
            existing.BlogSectionPosition = updated.BlogSectionPosition;
            existing.AddToRibon = updated.AddToRibon;
            existing.RibonCustomDisplayTitle = updated.RibonCustomDisplayTitle;
            existing.RibonSortOrder = updated.RibonSortOrder;
            existing.WebPageId = updated.WebPageId == Guid.Empty ? null : updated.WebPageId;
            existing.PageFormId = updated.PageFormId == Guid.Empty ? null : updated.PageFormId;
            existing.FormKey = updated.FormKey;

            await _context.SaveChangesAsync();
            return Ok(ApiResponse<object>.SuccessResponse(existing, "Section updated successfully."));
        }

        [HttpDelete("sections/{id:guid}")]
        public async Task<IActionResult> DeleteSection(Guid id)
        {
            var existing = await _context.PageSections.FindAsync(id);
            if (existing == null) return NotFound(ApiResponse<object>.FailureResponse("Section not found."));

            _context.PageSections.Remove(existing);
            await _context.SaveChangesAsync();
            return Ok(ApiResponse<object>.SuccessResponse(null, "Section deleted successfully."));
        }

        // ==========================================
        // 3B. PAGE SECTION LISTS (Sub-Items)
        // ==========================================

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

        // ==========================================
        // 4. SLIDERS (Hero Carousel)
        // ==========================================

        [HttpGet("sliders")]
        public async Task<IActionResult> GetSliders()
        {
            var sliders = await _context.Sliders
                .OrderBy(s => s.SortOrder)
                .ToListAsync();

            return Ok(ApiResponse<object>.SuccessResponse(sliders, "Sliders retrieved successfully."));
        }

        [HttpGet("sliders/{id:guid}")]
        public async Task<IActionResult> GetSliderById(Guid id)
        {
            var slider = await _context.Sliders.FindAsync(id);
            if (slider == null) return NotFound(ApiResponse<object>.FailureResponse("Slider not found."));
            return Ok(ApiResponse<object>.SuccessResponse(slider, "Slider details retrieved."));
        }

        [HttpPost("sliders")]
        public async Task<IActionResult> CreateSlider([FromBody] Slider slider)
        {
            slider.Id = Guid.NewGuid();
            slider.Show = true;
            _context.Sliders.Add(slider);
            await _context.SaveChangesAsync();
            return Ok(ApiResponse<object>.SuccessResponse(slider, "Slider created successfully."));
        }

        [HttpPut("sliders/{id:guid}")]
        public async Task<IActionResult> UpdateSlider(Guid id, [FromBody] Slider updated)
        {
            var existing = await _context.Sliders.FindAsync(id);
            if (existing == null) return NotFound(ApiResponse<object>.FailureResponse("Slider not found."));

            existing.Title = updated.Title;
            existing.MiniTitle = updated.MiniTitle;
            existing.Text = updated.Text;
            existing.ButtonText = updated.ButtonText;
            existing.ButtonLink = updated.ButtonLink;
            existing.Url = updated.Url;
            existing.Key = updated.Key;
            existing.SecondUrl = updated.SecondUrl;
            existing.SecondKey = updated.SecondKey;
            existing.YoutubeVideo = updated.YoutubeVideo;
            existing.IsVideo = updated.IsVideo;
            existing.DisableVideoButton = updated.DisableVideoButton;
            existing.VideoLink = updated.VideoLink;
            existing.VideoButtonText = updated.VideoButtonText;
            existing.SortOrder = updated.SortOrder;
            existing.Show = updated.Show;
            existing.TemplateKey = updated.TemplateKey;

            await _context.SaveChangesAsync();
            return Ok(ApiResponse<object>.SuccessResponse(existing, "Slider updated successfully."));
        }

        [HttpDelete("sliders/{id:guid}")]
        public async Task<IActionResult> DeleteSlider(Guid id)
        {
            var existing = await _context.Sliders.FindAsync(id);
            if (existing == null) return NotFound(ApiResponse<object>.FailureResponse("Slider not found."));

            _context.Sliders.Remove(existing);
            await _context.SaveChangesAsync();
            return Ok(ApiResponse<object>.SuccessResponse(null, "Slider deleted successfully."));
        }

        // ==========================================
        // 5. FAQ CATEGORIES & FAQs
        // ==========================================

        [HttpGet("faq-categories")]
        public async Task<IActionResult> GetFaqCategories()
        {
            var categories = await _context.FAQCategories
                .Include(c => c.FAQs!.OrderBy(f => f.SortOrder))
                .OrderBy(c => c.SortOrder)
                .ToListAsync();

            return Ok(ApiResponse<object>.SuccessResponse(categories, "FAQ categories retrieved."));
        }

        [HttpPost("faq-categories")]
        public async Task<IActionResult> CreateFaqCategory([FromBody] FAQCategory category)
        {
            if (string.IsNullOrWhiteSpace(category.Title))
            {
                return BadRequest(ApiResponse<object>.FailureResponse("FAQ Category Title is required."));
            }

            category.CreatedAtUtc = DateTime.UtcNow;
            _context.FAQCategories.Add(category);
            await _context.SaveChangesAsync();
            return Ok(ApiResponse<object>.SuccessResponse(category, "FAQ Category created successfully."));
        }

        [HttpPut("faq-categories/{id:int}")]
        public async Task<IActionResult> UpdateFaqCategory(int id, [FromBody] FAQCategory updated)
        {
            var existing = await _context.FAQCategories.FindAsync(id);
            if (existing == null) return NotFound(ApiResponse<object>.FailureResponse("FAQ Category not found."));

            existing.Title = updated.Title;
            existing.SortOrder = updated.SortOrder;
            existing.Publish = updated.Publish;

            await _context.SaveChangesAsync();
            return Ok(ApiResponse<object>.SuccessResponse(existing, "FAQ Category updated successfully."));
        }

        [HttpDelete("faq-categories/{id:int}")]
        public async Task<IActionResult> DeleteFaqCategory(int id)
        {
            var existing = await _context.FAQCategories.Include(c => c.FAQs).FirstOrDefaultAsync(c => c.Id == id);
            if (existing == null) return NotFound(ApiResponse<object>.FailureResponse("FAQ Category not found."));

            _context.FAQCategories.Remove(existing);
            await _context.SaveChangesAsync();
            return Ok(ApiResponse<object>.SuccessResponse(null, "FAQ Category deleted successfully."));
        }

        [HttpGet("faqs")]
        public async Task<IActionResult> GetFaqs([FromQuery] int? categoryId = null)
        {
            var query = _context.FAQs.Include(f => f.FAQCategory).AsQueryable();

            if (categoryId.HasValue)
            {
                query = query.Where(f => f.FAQCategoryId == categoryId.Value);
            }

            var faqs = await query.OrderBy(f => f.SortOrder).ToListAsync();
            return Ok(ApiResponse<object>.SuccessResponse(faqs, "FAQs retrieved successfully."));
        }

        [HttpGet("faqs/{id:int}")]
        public async Task<IActionResult> GetFaqById(int id)
        {
            var faq = await _context.FAQs.Include(f => f.FAQCategory).FirstOrDefaultAsync(f => f.Id == id);
            if (faq == null) return NotFound(ApiResponse<object>.FailureResponse("FAQ not found."));
            return Ok(ApiResponse<object>.SuccessResponse(faq, "FAQ details retrieved."));
        }

        [HttpPost("faqs")]
        public async Task<IActionResult> CreateFaq([FromBody] FAQ faq)
        {
            faq.CreatedAtUtc = DateTime.UtcNow;
            if (faq.FAQCategoryId <= 0) faq.FAQCategoryId = null;

            _context.FAQs.Add(faq);
            await _context.SaveChangesAsync();
            return Ok(ApiResponse<object>.SuccessResponse(faq, "FAQ created successfully."));
        }

        [HttpPut("faqs/{id:int}")]
        public async Task<IActionResult> UpdateFaq(int id, [FromBody] FAQ updated)
        {
            var existing = await _context.FAQs.FindAsync(id);
            if (existing == null) return NotFound(ApiResponse<object>.FailureResponse("FAQ not found."));

            existing.Title = updated.Title;
            existing.Message = updated.Message;
            existing.SortOrder = updated.SortOrder;
            existing.Show = updated.Show;
            existing.FAQCategoryId = updated.FAQCategoryId <= 0 ? null : updated.FAQCategoryId;

            await _context.SaveChangesAsync();
            return Ok(ApiResponse<object>.SuccessResponse(existing, "FAQ updated successfully."));
        }

        [HttpDelete("faqs/{id:int}")]
        public async Task<IActionResult> DeleteFaq(int id)
        {
            var existing = await _context.FAQs.FindAsync(id);
            if (existing == null) return NotFound(ApiResponse<object>.FailureResponse("FAQ not found."));

            _context.FAQs.Remove(existing);
            await _context.SaveChangesAsync();
            return Ok(ApiResponse<object>.SuccessResponse(null, "FAQ deleted successfully."));
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

        // ==========================================
        // 9. TENANT INSTALLED UI TEMPLATES & MARKETPLACE
        // ==========================================

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
        /// </summary>
        /// <param name="id">The unique identifier of the template to activate.</param>
        /// <returns>The activated template record.</returns>
        [HttpPost("templates/{id:guid}/set-active")]
        public async Task<IActionResult> SetActiveTemplate(Guid id)
        {
            var template = await _context.TenantInstalledTemplates.FindAsync(id);
            if (template == null) return NotFound(ApiResponse<object>.FailureResponse("Installed template not found."));

            var catKey = template.CategoryKey.Trim().ToLowerInvariant();
            var singletonCategories = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                "menu", "hero", "footer", "breadcrumb", "blog", "ecommerce"
            };

            if (singletonCategories.Contains(catKey))
            {
                var sameCategory = await _context.TenantInstalledTemplates
                    .Where(t => t.CategoryKey.ToLower() == catKey && t.Id != id && t.IsActive)
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
        /// Activates all structural layout templates (Menu, Hero, Breadcrumb, Footer, Blog, Ecommerce)
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
                    "menu", "hero", "footer", "breadcrumb", "blog", "ecommerce"
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
        /// Retrieves all CMS content entities (WebPages, PageSections) that are currently linked to and rendered by a specific template.
        /// Powers the interactive deletion modal allowing admins to preview affected content.
        /// </summary>
        /// <param name="id">The unique identifier of the installed template.</param>
        /// <returns>A collection of linked PageSections with parent WebPage details.</returns>
        [HttpGet("templates/{id:guid}/linked-content")]
        public async Task<IActionResult> GetTemplateLinkedContent(Guid id)
        {
            var template = await _context.TenantInstalledTemplates.FindAsync(id);
            if (template == null) return NotFound(ApiResponse<object>.FailureResponse("Installed template not found."));

            var matchingKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            if (!string.IsNullOrWhiteSpace(template.TemplateKey)) matchingKeys.Add(template.TemplateKey);
            if (!string.IsNullOrWhiteSpace(template.VariantCode)) matchingKeys.Add(template.VariantCode);

            var linkedSections = await _context.PageSections
                .Include(s => s.WebPage)
                .Include(s => s.PageSectionLists)
                .Where(s => s.TemplateKey != null && matchingKeys.Contains(s.TemplateKey))
                .Select(s => new
                {
                    SectionId = s.Id,
                    SectionTitle = s.Title ?? "(Untitled Section)",
                    MiniTitle = s.MiniTitle,
                    WebPageId = s.WebPageId,
                    WebPageTitle = s.WebPage != null ? s.WebPage.Title : (s.ShowInHome ? "Homepage" : "Unassigned Page"),
                    WebPageSlug = s.WebPage != null ? (s.WebPage.DirectUrl ?? s.WebPage.Title) : "home",
                    ShowInHome = s.ShowInHome,
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

        /// <summary>
        /// Uninstalls / removes a template from the tenant database, with optional cascading deletion of linked page sections.
        /// </summary>
        /// <param name="id">The unique identifier of the installed template.</param>
        /// <param name="deleteLinkedContent">If true, permanently deletes all PageSections linked to this template. If false, unlinks the TemplateKey.</param>
        /// <returns>Confirmation of the deletion operation.</returns>
        [HttpDelete("templates/installed/{id:guid}")]
        public async Task<IActionResult> UninstallTemplate(Guid id, [FromQuery] bool deleteLinkedContent = false)
        {
            var template = await _context.TenantInstalledTemplates.FindAsync(id);
            if (template == null) return NotFound(ApiResponse<object>.FailureResponse("Installed template not found."));

            var matchingKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            if (!string.IsNullOrWhiteSpace(template.TemplateKey)) matchingKeys.Add(template.TemplateKey);
            if (!string.IsNullOrWhiteSpace(template.VariantCode)) matchingKeys.Add(template.VariantCode);

            var linkedSections = await _context.PageSections
                .Include(s => s.PageSectionLists)
                .Where(s => s.TemplateKey != null && matchingKeys.Contains(s.TemplateKey))
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
                // Preserve section content; unassign template key
                foreach (var sec in linkedSections)
                {
                    sec.TemplateKey = null;
                }
            }

            _context.TenantInstalledTemplates.Remove(template);
            await _context.SaveChangesAsync();

            string msg = deleteLinkedContent && affectedSectionCount > 0
                ? $"Template '{template.Name}' and {affectedSectionCount} linked page section(s) were permanently deleted."
                : $"Template '{template.Name}' removed from library. {affectedSectionCount} page section(s) were unlinked and preserved.";

            return Ok(ApiResponse<object>.SuccessResponse(null, msg));
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
                await DefaultThemeSeeder.ClearAllTemplatesAndInjectionsAsync(_context, wipeContent);
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
            var templateKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var t in suiteTemplates)
            {
                if (!string.IsNullOrWhiteSpace(t.TemplateKey)) templateKeys.Add(t.TemplateKey);
                if (!string.IsNullOrWhiteSpace(t.VariantCode)) templateKeys.Add(t.VariantCode);
            }

            var suiteTags = await _context.SiteCodeInjectionTags
                .Where(t => t.SuiteCode != null && t.SuiteCode.ToLower() == cleanCode)
                .ToListAsync();

            var linkedSections = await _context.PageSections
                .Include(s => s.WebPage)
                .Include(s => s.PageSectionLists)
                .Where(s => s.TemplateKey != null && templateKeys.Contains(s.TemplateKey))
                .Select(s => new
                {
                    SectionId = s.Id,
                    SectionTitle = s.Title ?? "(Untitled Section)",
                    MiniTitle = s.MiniTitle,
                    TemplateKey = s.TemplateKey,
                    WebPageId = s.WebPageId,
                    WebPageTitle = s.WebPage != null ? s.WebPage.Title : (s.ShowInHome ? "Homepage" : "Unassigned Page"),
                    WebPageSlug = s.WebPage != null ? (s.WebPage.DirectUrl ?? s.WebPage.Title) : "home",
                    ShowInHome = s.ShowInHome,
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

                var templateKeys = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                foreach (var t in suiteTemplates)
                {
                    if (!string.IsNullOrWhiteSpace(t.TemplateKey)) templateKeys.Add(t.TemplateKey);
                    if (!string.IsNullOrWhiteSpace(t.VariantCode)) templateKeys.Add(t.VariantCode);
                }

                var linkedSections = await _context.PageSections
                    .Include(s => s.PageSectionLists)
                    .Where(s => s.TemplateKey != null && templateKeys.Contains(s.TemplateKey))
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
        /// Reinstalls the complete turnkey default Corporate Theme Suite (16 templates) and default 3-zone code injections.
        /// </summary>
        /// <returns>A confirmation of the reinstallation.</returns>
        [HttpPost("templates/reinstall-defaults")]
        public async Task<IActionResult> ReinstallDefaultTemplates()
        {
            try
            {
                var config = await _context.ConfigSettings.FirstOrDefaultAsync();
                var brandName = !string.IsNullOrWhiteSpace(config?.CompanyName) ? config.CompanyName : "Organization";

                await DefaultThemeSeeder.ReinstallDefaultsAsync(_context, brandName);
                return Ok(ApiResponse<object>.SuccessResponse(null, "Default Corporate Theme Suite (16 templates) and default code injections have been cleanly restored."));
            }
            catch (Exception ex)
            {
                var msg = ex.InnerException != null ? $"{ex.Message} -> {ex.InnerException.Message}" : ex.Message;
                return StatusCode(500, ApiResponse<object>.FailureResponse($"Failed to reinstall default templates: {msg}"));
            }
        }

        // ==========================================
        // 13. DIRECT CUSTOM SECTION TEMPLATES
        // ==========================================

        /// <summary>
        /// Creates a custom section template directly in the tenant database without requiring a marketplace installation.
        /// Supports {{ Placeholders }} and optional CSS (CSS can be left blank when relying on global theme styles).
        /// </summary>
        /// <param name="request">The custom template definition.</param>
        /// <returns>The created or updated TenantInstalledTemplate.</returns>
        [HttpPost("templates/custom")]
        public async Task<IActionResult> CreateCustomTemplate([FromBody] CreateCustomTemplateRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.CategoryKey))
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Template Name and Category are required."));
            }

            try
            {
                var catKey = request.CategoryKey.Trim().ToLowerInvariant();
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

                if (template != null)
                {
                    template.Name = cleanName;
                    template.CategoryKey = catKey;
                    template.VariantCode = cleanVariant;
                    template.HtmlTemplate = request.HtmlTemplate ?? string.Empty;
                    template.CssStyles = request.CssStyles ?? string.Empty;
                    template.JsScript = request.JsScript;
                    template.DefaultContentJson = request.DefaultContentJson;
                    template.InstalledVersion = string.IsNullOrWhiteSpace(request.InstalledVersion) ? "1.0.0" : request.InstalledVersion;
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
                        InstalledVersion = string.IsNullOrWhiteSpace(request.InstalledVersion) ? "1.0.0" : request.InstalledVersion,
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
                    var existingOrders = await _context.PageSections
                        .Where(s => s.ShowInHome)
                        .Select(s => s.HomePageSortOrder)
                        .ToListAsync();

                    if (existingOrders.Any())
                    {
                        sortOrder = insertAtTop ? Math.Max(1, existingOrders.Min() - 5) : existingOrders.Max() + 10;
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
                    InstalledVersion = template?.InstalledVersion ?? "1.0.0",
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
                    ShowInHome = isHomePage || (targetPage == null),
                    PageSortOrder = sortOrder,
                    HomePageSortOrder = sortOrder,
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

                // 2. Menu Dropdown Categories
                var rawCategories = await _context.PageCategories
                    .AsNoTracking()
                    .Where(c => c.Publish)
                    .Include(c => c.WebPages)
                    .OrderBy(c => c.MenuSortOrder)
                    .ToListAsync();

                var dropdowns = rawCategories.Select(c => new
                {
                    id = c.Id,
                    title = c.Title,
                    footerTitle = c.FooterDisplayTitle ?? c.Title,
                    showInFooter = c.ShowInFooter,
                    pages = (c.WebPages ?? new List<WebPage>())
                        .Where(p => p.Publish)
                        .OrderBy(p => p.SortOrder)
                        .Select(p => new
                        {
                            id = p.Id,
                            title = p.Title,
                            slug = p.DirectUrl,
                            url = "/" + (p.DirectUrl ?? p.Id.ToString()),
                            showInFooter = p.ShowInFooter,
                            showInMenu = p.ShowInMenuDropDown || p.ShowInMainMenu
                        })
                        .ToList()
                }).ToList();

                // 3. Footer Groups (Categories specifically enabled for the footer)
                var footerGroups = dropdowns
                    .Where(d => d.showInFooter)
                    .Select(d => new
                    {
                        id = d.id,
                        name = d.title,
                        displayTitle = d.footerTitle,
                        pages = d.pages.Where(p => p.showInFooter).ToList()
                    })
                    .ToList();

                // 4. Legal Compliance Pages (Only published and enabled for footer)
                var legalPages = await _context.WebPages
                    .AsNoTracking()
                    .Where(p => p.IsLegal && p.Publish && p.ShowInFooter)
                    .OrderBy(p => p.SortOrder)
                    .Select(p => new
                    {
                        id = p.Id,
                        title = p.Title,
                        slug = p.DirectUrl,
                        url = "/" + (p.DirectUrl ?? p.Id.ToString())
                    })
                    .ToListAsync();

                // 4b. Menu CTA Action Buttons (IsMenuCTA == true)
                var menuCtaButtons = await _context.WebPages
                    .AsNoTracking()
                    .Where(p => p.IsMenuCTA && p.Publish)
                    .OrderBy(p => p.SortOrder)
                    .Select(p => new
                    {
                        id = p.Id,
                        title = p.Title,
                        slug = p.DirectUrl,
                        url = "/" + (p.DirectUrl ?? p.Id.ToString())
                    })
                    .ToListAsync();

                // 4c. Top-Level Main Menu Items (ShowInMainMenu == true)
                var topMenuItems = await _context.WebPages
                    .AsNoTracking()
                    .Where(p => p.ShowInMainMenu && p.Publish)
                    .OrderBy(p => p.SortOrder)
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
                    .OrderBy(p => p.SortOrder)
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

                    foreach (var tag in tokens)
                    {
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

                // 5. Tenant Brand Settings
                var config = await _context.ConfigSettings.AsNoTracking().FirstOrDefaultAsync();
                var brand = new
                {
                    name = config?.CompanyName ?? "Organization Portal",
                    logoUrl = config?.CompanyLogoUrl ?? string.Empty,
                    whiteLogoUrl = config?.CompanyWhiteLogoUrl ?? string.Empty,
                    tagline = config?.CompanyDescription ?? string.Empty,
                    email = config?.EmailOne ?? string.Empty,
                    phone = config?.PhoneOne ?? string.Empty,
                    address = config?.AddressOne ?? string.Empty,
                    facebook = config?.FacebookPage ?? string.Empty,
                    twitter = config?.TwitterPage ?? string.Empty,
                    instagram = config?.InstagramPage ?? string.Empty,
                    youtube = config?.YoutubeChannel ?? string.Empty,
                    tiktok = config?.TiktokPage ?? string.Empty
                };

                return Ok(ApiResponse<object>.SuccessResponse(new
                {
                    publishedForms = forms,
                    menuDropdowns = dropdowns,
                    topMenuItems = topMenuItems,
                    menuCtaButtons = menuCtaButtons,
                    footerGroups = footerGroups,
                    taggedPages = taggedPages,
                    legalPages = legalPages,
                    brand = brand
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
                    "menu", "hero", "footer", "breadcrumb", "blog", "ecommerce"
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
                        oldSec.ShowInHome = false;
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

                            // If this is the Homepage, also remove other legacy orphan home sections
                            if (p.Slug != null && p.Slug.Equals("home", StringComparison.OrdinalIgnoreCase))
                            {
                                var otherHomeSections = await _context.PageSections
                                    .Where(s => s.ShowInHome && s.WebPageId != pageId)
                                    .ToListAsync();

                                foreach (var ohs in otherHomeSections)
                                {
                                    ohs.ShowInHome = false;
                                }
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
                                    ShowInHome = s.ShowInHome || (p.Slug != null && p.Slug.Equals("home", StringComparison.OrdinalIgnoreCase)),
                                    PageSortOrder = s.PageSortOrder,
                                    HomePageSortOrder = s.PageSortOrder,
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
        /// <param name="zone">Optional zone filter: "head", "body_open", or "footer".</param>
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

            try
            {
                var tag = new SiteCodeInjectionTag
                {
                    Id = Guid.NewGuid(),
                    Name = request.Name.Trim(),
                    Zone = cleanZone,
                    TagType = string.IsNullOrWhiteSpace(request.TagType) ? "raw_html" : request.TagType.Trim().ToLowerInvariant(),
                    SuiteCode = string.IsNullOrWhiteSpace(request.SuiteCode) ? "global" : request.SuiteCode.Trim().ToLowerInvariant(),
                    Content = request.Content.Trim(),
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
        /// Uploads multiple CSS or JS asset files to Cloudflare R2 Object Storage in bulk,
        /// automatically extracts the tag name from the filename prefix (before the first dot),
        /// generates global CDN URLs, and creates active SiteCodeInjectionTag entries with incrementing SortOrders.
        /// </summary>
        /// <param name="files">The collection of files to upload.</param>
        /// <param name="zone">Target browser zone: 'head', 'body_open', or 'footer'. Defaults to 'head'.</param>
        /// <param name="suiteCode">Theme suite scope: 'global' or a specific theme suite code. Defaults to 'global'.</param>
        /// <param name="startSortOrder">Starting sort order. Defaults to 10.</param>
        /// <param name="sortIncrement">Sort order increment per item. Defaults to 10.</param>
        /// <returns>List of newly created and injected SiteCodeInjectionTag entities.</returns>
        [HttpPost("code-injections/bulk-upload")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> BulkUploadCodeInjections(
            [FromForm] List<IFormFile> files,
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

            foreach (var file in files)
            {
                if (file == null || file.Length == 0) continue;

                var fileName = file.FileName;
                // Auto-Naming Rule: use string before the first dot as the tag name
                var nameBeforeDot = fileName.Contains('.') ? fileName.Substring(0, fileName.IndexOf('.')) : fileName;
                var tagName = string.IsNullOrWhiteSpace(nameBeforeDot) ? fileName : nameBeforeDot.Trim();

                var ext = Path.GetExtension(fileName).ToLowerInvariant();
                var isJs = ext == ".js";
                var isFont = ext == ".woff2" || ext == ".woff" || ext == ".ttf" || ext == ".otf" || ext == ".eot" || ext == ".svg";
                var tagType = isJs 
                    ? (cleanZone == "footer" ? "footer_script_url" : "script_url") 
                    : (isFont ? "raw_css" : "link_stylesheet");

                try
                {
                    using var stream = file.OpenReadStream();
                    CloudflareR2UploadResult result;
                    if (isJs)
                    {
                        result = await _r2Storage.UploadAssetAsync(stream, fileName, "application/javascript", "js");
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

                    var cdnUrl = result.Url;
                    string tagContent;
                    if (isJs)
                    {
                        tagContent = $"<script src=\"{cdnUrl}\"></script>";
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
                        tagContent = $"<style>\n@font-face {{\n  font-family: '{tagName}';\n  src: url('{cdnUrl}') format('{fontFormat}');\n  font-weight: normal;\n  font-style: normal;\n  font-display: swap;\n}}\n</style>";
                    }
                    else
                    {
                        tagContent = $"<link rel=\"stylesheet\" href=\"{cdnUrl}\" />";
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

            tag.Name = request.Name.Trim();
            tag.Zone = cleanZone;
            tag.TagType = string.IsNullOrWhiteSpace(request.TagType) ? tag.TagType : request.TagType.Trim().ToLowerInvariant();
            if (request.SuiteCode != null)
            {
                tag.SuiteCode = string.IsNullOrWhiteSpace(request.SuiteCode) ? "global" : request.SuiteCode.Trim().ToLowerInvariant();
            }
            tag.Content = request.Content.Trim();
            tag.SortOrder = request.SortOrder;
            tag.IsActive = request.IsActive;
            tag.UpdatedAtUtc = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(ApiResponse<object>.SuccessResponse(tag, $"Tag '{tag.Name}' updated successfully."));
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
        public string CategoryKey { get; set; } = string.Empty;
        public string? TemplateKey { get; set; }
        public string? VariantCode { get; set; }
        public string? HtmlTemplate { get; set; }
        public string? CssStyles { get; set; }
        public string? JsScript { get; set; }
        public string? DefaultContentJson { get; set; }
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
        public string? ImageUrl { get; set; }
        public string? ImageKey { get; set; }
        public string? MetaTitle { get; set; }
        public string? MetaDescription { get; set; }
        public string? MetaKeywords { get; set; }
        public Ozikol_BCC.Domain.Enum.Enum.HomeSortFrom HomeSortFrom { get; set; }
        public Guid? MainPageId { get; set; }
    }

    public class CreatePageCategoryRequest
    {
        public string Title { get; set; } = string.Empty;
        public int MenuSortOrder { get; set; } = 0;
        public bool Publish { get; set; } = true;
        public Guid? ParentId { get; set; }
        public string? Icon { get; set; }
        public Ozikol_BCC.Domain.Enum.Enum.HomeSortFrom HomeSortFrom { get; set; }
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
        public bool ShowInHome { get; set; } = false;
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
}
