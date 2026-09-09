using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Api.Models;
using Ozikol_BCC.Application.Services.Cloudinary;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;
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

        public ContentApiController(
            DashboardDbContext context, 
            IMediator mediator, 
            ICloudinaryService cloudinaryService)
        {
            _context = context;
            _mediator = mediator;
            _cloudinaryService = cloudinaryService;
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
                .FirstOrDefaultAsync(s => s.Id == id);

            if (section == null) return NotFound(ApiResponse<object>.FailureResponse("Section not found."));
            return Ok(ApiResponse<object>.SuccessResponse(section, "Section details retrieved."));
        }

        [HttpPost("sections")]
        public async Task<IActionResult> CreateSection([FromBody] PageSection section)
        {
            section.Id = Guid.NewGuid();
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
        /// Sets a specific installed template as active (e.g. switching active menu or footer).
        /// </summary>
        [HttpPost("templates/{id:guid}/set-active")]
        public async Task<IActionResult> SetActiveTemplate(Guid id)
        {
            var template = await _context.TenantInstalledTemplates.FindAsync(id);
            if (template == null) return NotFound(ApiResponse<object>.FailureResponse("Installed template not found."));

            var catKey = template.CategoryKey.Trim().ToLowerInvariant();

            if (catKey == "menu" || catKey == "footer")
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
        /// Uninstalls / removes a template from the tenant database.
        /// </summary>
        [HttpDelete("templates/installed/{id:guid}")]
        public async Task<IActionResult> UninstallTemplate(Guid id)
        {
            var template = await _context.TenantInstalledTemplates.FindAsync(id);
            if (template == null) return NotFound(ApiResponse<object>.FailureResponse("Installed template not found."));

            _context.TenantInstalledTemplates.Remove(template);
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<object>.SuccessResponse(null, $"Template '{template.Name}' removed from tenant library."));
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

        // ==========================================
        // 14. 3-ZONE CODE INJECTION (HEAD, BODY OPEN, FOOTER)
        // ==========================================

        /// <summary>
        /// Retrieves code injection tags for the tenant, optionally filtered by zone ("head", "body_open", "footer").
        /// Sorted by SortOrder ascending.
        /// </summary>
        /// <param name="zone">Optional zone filter: "head", "body_open", or "footer".</param>
        /// <returns>List of SiteCodeInjectionTag items.</returns>
        [HttpGet("code-injections")]
        public async Task<IActionResult> GetCodeInjections([FromQuery] string? zone = null)
        {
            try
            {
                var query = _context.SiteCodeInjectionTags.AsQueryable();

                if (!string.IsNullOrWhiteSpace(zone))
                {
                    var cleanZone = zone.Trim().ToLowerInvariant();
                    query = query.Where(t => t.Zone.ToLower() == cleanZone);
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
        public string Content { get; set; } = string.Empty;
        public int SortOrder { get; set; } = 0;
        public bool IsActive { get; set; } = true;
    }

    public class UpdateCodeInjectionRequest
    {
        public string Name { get; set; } = string.Empty;
        public string Zone { get; set; } = "head";
        public string TagType { get; set; } = "raw_html";
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
}
