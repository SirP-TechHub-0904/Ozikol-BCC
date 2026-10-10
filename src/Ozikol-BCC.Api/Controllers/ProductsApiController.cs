using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Api.Models;
using Ozikol_BCC.Application.Services.Cloudinary;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;
using System.Security.Claims;
using System.Text.Json;
using System.Text.RegularExpressions;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Tags("Commerce Studio - Products, Categories, Orders & Marketing")]
    public class ProductsApiController : ControllerBase
    {
        private readonly DashboardDbContext _context;
        private readonly ICloudinaryService _cloudinaryService;

        public ProductsApiController(DashboardDbContext context, ICloudinaryService cloudinaryService)
        {
            _context = context;
            _cloudinaryService = cloudinaryService;
        }

        private async Task<(string Code, string Symbol)> GetActiveCurrencyAsync()
        {
            var setting = await _context.MisConfigurationSettings.AsNoTracking().FirstOrDefaultAsync();
            string code = string.IsNullOrWhiteSpace(setting?.CurrencyCode) ? "USD" : setting.CurrencyCode.Trim().ToUpperInvariant();
            string symbol = string.IsNullOrWhiteSpace(setting?.CurrencySymbol) ? "$" : setting.CurrencySymbol.Trim();
            return (code, symbol);
        }

        private string GenerateSlug(string title)
        {
            string slug = title.ToLowerInvariant().Trim();
            slug = Regex.Replace(slug, @"[^a-z0-9\s-]", "");
            slug = Regex.Replace(slug, @"\s+", "-").Trim('-');
            return string.IsNullOrWhiteSpace(slug) ? Guid.NewGuid().ToString("N")[..8] : slug;
        }

        // ==========================================
        // 0. MEDIA UPLOAD (Cloudinary)
        // ==========================================

        [HttpPost("upload-media")]
        [Consumes("multipart/form-data")]
        [Authorize(Roles = "SuperAdmin,Admin,CommerceManager,CmsManager")]
        public async Task<IActionResult> UploadMedia([FromForm] ProductMediaUploadRequest request)
        {
            var file = request.File;
            var folder = string.IsNullOrWhiteSpace(request.Folder) ? "bcp-products" : request.Folder;
            if (file == null || file.Length == 0)
                return BadRequest(ApiResponse<object>.FailureResponse("No file was uploaded."));

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
                }, "Product media uploaded successfully."));
            }
            catch (Exception ex)
            {
                return StatusCode(500, ApiResponse<object>.FailureResponse($"Cloudinary upload failed: {ex.Message}"));
            }
        }

        // ==========================================
        // 1. PRODUCTS MANAGEMENT (CRUD)
        // ==========================================

        [HttpGet]
        [Authorize(Roles = "SuperAdmin,Admin,CommerceManager,CmsManager")]
        public async Task<IActionResult> GetProducts(
            [FromQuery] string? search,
            [FromQuery] Guid? categoryId,
            [FromQuery] ProductType? type,
            [FromQuery] ProductPublishStatus? status,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var query = _context.BcpProducts.Include(p => p.Category).AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                string s = search.Trim().ToLower();
                query = query.Where(p => p.Title.ToLower().Contains(s) || (p.Sku != null && p.Sku.ToLower().Contains(s)) || (p.ShortDescription != null && p.ShortDescription.ToLower().Contains(s)));
            }

            if (categoryId.HasValue && categoryId.Value != Guid.Empty)
                query = query.Where(p => p.BcpProductCategoryId == categoryId.Value);

            if (type.HasValue)
                query = query.Where(p => p.Type == type.Value);

            if (status.HasValue)
                query = query.Where(p => p.PublishStatus == status.Value);

            int totalCount = await query.CountAsync();
            var items = await query.OrderByDescending(p => p.CreatedAtUtc)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(p => new
                {
                    p.Id,
                    p.Title,
                    p.Slug,
                    p.ShortDescription,
                    p.Type,
                    TypeName = p.Type.ToString(),
                    p.PublishStatus,
                    StatusName = p.PublishStatus.ToString(),
                    p.Price,
                    p.CompareAtPrice,
                    p.Currency,
                    p.Sku,
                    p.CoverImageUrl,
                    p.StockQuantity,
                    p.TrackInventory,
                    p.IsFeatured,
                    p.IsScheduled,
                    p.ScheduledReleaseUtc,
                    p.PublishedAtUtc,
                    p.CreatedAtUtc,
                    p.BcpProductCategoryId,
                    CategoryTitle = p.Category != null ? p.Category.Title : "Uncategorized",
                    OrderCount = _context.BcpProductOrderItems.Count(i => i.BcpProductId == p.Id)
                })
                .ToListAsync();

            var (currCode, currSymbol) = await GetActiveCurrencyAsync();

            return Ok(ApiResponse<object>.SuccessResponse(new
            {
                items,
                totalCount,
                page,
                pageSize,
                currencyCode = currCode,
                currencySymbol = currSymbol
            }));
        }

        [HttpGet("{id:guid}")]
        [Authorize(Roles = "SuperAdmin,Admin,CommerceManager,CmsManager")]
        public async Task<IActionResult> GetProductById(Guid id)
        {
            var product = await _context.BcpProducts.Include(p => p.Category).AsNoTracking().FirstOrDefaultAsync(p => p.Id == id);
            if (product == null)
                return NotFound(ApiResponse<object>.FailureResponse("Product not found."));

            int orderCount = await _context.BcpProductOrderItems.CountAsync(i => i.BcpProductId == id);
            var (currCode, currSymbol) = await GetActiveCurrencyAsync();

            return Ok(ApiResponse<object>.SuccessResponse(new
            {
                product,
                orderCount,
                canDelete = orderCount == 0,
                currencyCode = currCode,
                currencySymbol = currSymbol
            }));
        }

        [HttpGet("by-slug/{slug}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetProductBySlug(string slug)
        {
            var product = await _context.BcpProducts
                .Include(p => p.Category)
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.Slug.ToLower() == slug.ToLower() && p.PublishStatus == ProductPublishStatus.Published);

            if (product == null)
                return NotFound(ApiResponse<object>.FailureResponse("Product not found or unavailable."));

            var (currCode, currSymbol) = await GetActiveCurrencyAsync();

            return Ok(ApiResponse<object>.SuccessResponse(new
            {
                product = new
                {
                    product.Id,
                    product.Title,
                    product.Slug,
                    product.ShortDescription,
                    product.FullDescription,
                    product.Type,
                    TypeName = product.Type.ToString(),
                    product.Price,
                    product.CompareAtPrice,
                    product.Currency,
                    product.Sku,
                    product.CoverImageUrl,
                    product.GalleryImagesJson,
                    product.DemoVideoUrl,
                    product.StockQuantity,
                    product.TrackInventory,
                    product.RequiresShipping,
                    product.DeliveryTimeframeDays,
                    product.RequiresBookingSchedule,
                    product.ConsultationDurationMinutes,
                    product.DeliverablesSummary,
                    product.VersionTag,
                    product.FileSize,
                    product.RequiresLicenseKey,
                    product.BillingInterval,
                    product.TrialPeriodDays,
                    product.Category,
                    product.Tags,
                    product.IsFeatured,
                    product.MetaTitle,
                    product.MetaDescription,
                    product.CreatedAtUtc
                },
                currencyCode = currCode,
                currencySymbol = currSymbol
            }));
        }

        [HttpGet("public/catalog")]
        [AllowAnonymous]
        public async Task<IActionResult> GetPublicCatalog(
            [FromQuery] string? search,
            [FromQuery] Guid? categoryId,
            [FromQuery] ProductType? type,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 24)
        {
            var query = _context.BcpProducts
                .Include(p => p.Category)
                .AsNoTracking()
                .Where(p => p.PublishStatus == ProductPublishStatus.Published);

            if (!string.IsNullOrWhiteSpace(search))
            {
                string s = search.Trim().ToLower();
                query = query.Where(p => p.Title.ToLower().Contains(s) || (p.ShortDescription != null && p.ShortDescription.ToLower().Contains(s)) || (p.Tags != null && p.Tags.ToLower().Contains(s)));
            }

            if (categoryId.HasValue && categoryId.Value != Guid.Empty)
                query = query.Where(p => p.BcpProductCategoryId == categoryId.Value);

            if (type.HasValue)
                query = query.Where(p => p.Type == type.Value);

            int totalCount = await query.CountAsync();
            var items = await query.OrderByDescending(p => p.IsFeatured).ThenByDescending(p => p.CreatedAtUtc)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(p => new
                {
                    p.Id,
                    p.Title,
                    p.Slug,
                    p.ShortDescription,
                    p.Type,
                    TypeName = p.Type.ToString(),
                    p.Price,
                    p.CompareAtPrice,
                    p.Currency,
                    p.CoverImageUrl,
                    p.StockQuantity,
                    p.TrackInventory,
                    p.IsFeatured,
                    p.Tags,
                    CategoryTitle = p.Category != null ? p.Category.Title : "General"
                })
                .ToListAsync();

            var (currCode, currSymbol) = await GetActiveCurrencyAsync();

            return Ok(ApiResponse<object>.SuccessResponse(new
            {
                items,
                totalCount,
                page,
                pageSize,
                currencyCode = currCode,
                currencySymbol = currSymbol
            }));
        }

        [HttpPost]
        [Authorize(Roles = "SuperAdmin,Admin,CommerceManager,CmsManager")]
        public async Task<IActionResult> CreateProduct([FromBody] BcpProduct dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Title))
                return BadRequest(ApiResponse<object>.FailureResponse("Product title is required."));

            var (currCode, _) = await GetActiveCurrencyAsync();

            string baseSlug = string.IsNullOrWhiteSpace(dto.Slug) ? GenerateSlug(dto.Title) : GenerateSlug(dto.Slug);
            string finalSlug = baseSlug;
            int counter = 1;
            while (await _context.BcpProducts.AnyAsync(p => p.Slug.ToLower() == finalSlug.ToLower()))
            {
                finalSlug = $"{baseSlug}-{counter++}";
            }

            var product = new BcpProduct
            {
                Id = Guid.CreateVersion7(),
                Title = dto.Title.Trim(),
                Slug = finalSlug,
                ShortDescription = dto.ShortDescription,
                FullDescription = dto.FullDescription,
                Type = dto.Type,
                PublishStatus = dto.PublishStatus,
                Price = dto.Price,
                CompareAtPrice = dto.CompareAtPrice,
                Currency = currCode,
                Sku = dto.Sku,
                Barcode = dto.Barcode,
                CoverImageUrl = dto.CoverImageUrl,
                CoverImageKey = dto.CoverImageKey,
                GalleryImagesJson = dto.GalleryImagesJson,
                DemoVideoUrl = dto.DemoVideoUrl,
                IsScheduled = dto.IsScheduled,
                ScheduledReleaseUtc = dto.IsScheduled ? dto.ScheduledReleaseUtc : null,
                PublishedAtUtc = dto.PublishStatus == ProductPublishStatus.Published ? DateTime.UtcNow : null,
                DownloadFileUrl = dto.DownloadFileUrl,
                VersionTag = dto.VersionTag,
                FileSize = dto.FileSize,
                RequiresLicenseKey = dto.RequiresLicenseKey,
                LicenseKeyPattern = dto.LicenseKeyPattern,
                DeliveryTimeframeDays = dto.DeliveryTimeframeDays,
                RequiresBookingSchedule = dto.RequiresBookingSchedule,
                ConsultationDurationMinutes = dto.ConsultationDurationMinutes,
                DeliverablesSummary = dto.DeliverablesSummary,
                TrackInventory = dto.TrackInventory,
                StockQuantity = dto.StockQuantity,
                LowStockThreshold = dto.LowStockThreshold,
                WeightKg = dto.WeightKg,
                RequiresShipping = dto.RequiresShipping,
                BillingInterval = dto.BillingInterval,
                TrialPeriodDays = dto.TrialPeriodDays,
                AutoRenew = dto.AutoRenew,
                BcpProductCategoryId = dto.BcpProductCategoryId != Guid.Empty ? dto.BcpProductCategoryId : null,
                Tags = dto.Tags,
                IsFeatured = dto.IsFeatured,
                MetaTitle = dto.MetaTitle,
                MetaDescription = dto.MetaDescription,
                CreatedAtUtc = DateTime.UtcNow
            };

            _context.BcpProducts.Add(product);

            // If scheduled release, enqueue to JobQueue (BcpScheduledJobQueue)
            if (product.IsScheduled && product.ScheduledReleaseUtc.HasValue)
            {
                _context.BcpScheduledJobQueues.Add(new BcpScheduledJobQueue
                {
                    Id = Guid.CreateVersion7(),
                    SourceId = product.Id.ToString(),
                    SourceModel = "Product",
                    ActionType = "PublishScheduledProduct",
                    ScheduledAt = product.ScheduledReleaseUtc.Value,
                    Status = BcpQueueStatus.Queued,
                    Payload = JsonSerializer.Serialize(new { ProductId = product.Id, product.Title }),
                    CreatedAt = DateTime.UtcNow
                });
            }

            await _context.SaveChangesAsync();
            return Ok(ApiResponse<object>.SuccessResponse(product, "Product created successfully."));
        }

        [HttpPut("{id:guid}")]
        [Authorize(Roles = "SuperAdmin,Admin,CommerceManager,CmsManager")]
        public async Task<IActionResult> UpdateProduct(Guid id, [FromBody] BcpProduct dto)
        {
            var product = await _context.BcpProducts.FirstOrDefaultAsync(p => p.Id == id);
            if (product == null)
                return NotFound(ApiResponse<object>.FailureResponse("Product not found."));

            if (string.IsNullOrWhiteSpace(dto.Title))
                return BadRequest(ApiResponse<object>.FailureResponse("Product title is required."));

            string baseSlug = string.IsNullOrWhiteSpace(dto.Slug) ? GenerateSlug(dto.Title) : GenerateSlug(dto.Slug);
            string finalSlug = baseSlug;
            int counter = 1;
            while (await _context.BcpProducts.AnyAsync(p => p.Slug.ToLower() == finalSlug.ToLower() && p.Id != id))
            {
                finalSlug = $"{baseSlug}-{counter++}";
            }

            product.Title = dto.Title.Trim();
            product.Slug = finalSlug;
            product.ShortDescription = dto.ShortDescription;
            product.FullDescription = dto.FullDescription;
            product.Type = dto.Type;
            product.PublishStatus = dto.PublishStatus;
            product.Price = dto.Price;
            product.CompareAtPrice = dto.CompareAtPrice;
            product.Sku = dto.Sku;
            product.Barcode = dto.Barcode;
            product.CoverImageUrl = dto.CoverImageUrl;
            product.CoverImageKey = dto.CoverImageKey;
            product.GalleryImagesJson = dto.GalleryImagesJson;
            product.DemoVideoUrl = dto.DemoVideoUrl;
            product.IsScheduled = dto.IsScheduled;
            product.ScheduledReleaseUtc = dto.IsScheduled ? dto.ScheduledReleaseUtc : null;
            product.PublishedAtUtc = dto.PublishStatus == ProductPublishStatus.Published && product.PublishedAtUtc == null ? DateTime.UtcNow : product.PublishedAtUtc;
            product.DownloadFileUrl = dto.DownloadFileUrl;
            product.VersionTag = dto.VersionTag;
            product.FileSize = dto.FileSize;
            product.RequiresLicenseKey = dto.RequiresLicenseKey;
            product.LicenseKeyPattern = dto.LicenseKeyPattern;
            product.DeliveryTimeframeDays = dto.DeliveryTimeframeDays;
            product.RequiresBookingSchedule = dto.RequiresBookingSchedule;
            product.ConsultationDurationMinutes = dto.ConsultationDurationMinutes;
            product.DeliverablesSummary = dto.DeliverablesSummary;
            product.TrackInventory = dto.TrackInventory;
            product.StockQuantity = dto.StockQuantity;
            product.LowStockThreshold = dto.LowStockThreshold;
            product.WeightKg = dto.WeightKg;
            product.RequiresShipping = dto.RequiresShipping;
            product.BillingInterval = dto.BillingInterval;
            product.TrialPeriodDays = dto.TrialPeriodDays;
            product.AutoRenew = dto.AutoRenew;
            product.BcpProductCategoryId = dto.BcpProductCategoryId != Guid.Empty ? dto.BcpProductCategoryId : null;
            product.Tags = dto.Tags;
            product.IsFeatured = dto.IsFeatured;
            product.MetaTitle = dto.MetaTitle;
            product.MetaDescription = dto.MetaDescription;
            product.UpdatedAtUtc = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(ApiResponse<object>.SuccessResponse(product, "Product updated successfully."));
        }

        [HttpDelete("{id:guid}")]
        [Authorize(Roles = "SuperAdmin,Admin,CommerceManager,CmsManager")]
        public async Task<IActionResult> DeleteProduct(Guid id)
        {
            var product = await _context.BcpProducts.FirstOrDefaultAsync(p => p.Id == id);
            if (product == null)
                return NotFound(ApiResponse<object>.FailureResponse("Product not found."));

            // ⚠️ STRICT ORDER-LINKED DELETION SAFEGUARD
            int orderCount = await _context.BcpProductOrderItems.CountAsync(i => i.BcpProductId == id);
            if (orderCount > 0)
            {
                return BadRequest(ApiResponse<object>.FailureResponse(
                    $"This product cannot be deleted because it is linked to {orderCount} customer order record(s). To preserve historical financial integrity, please disable or archive the product instead."));
            }

            _context.BcpProducts.Remove(product);
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<object>.SuccessResponse(null, $"Product '{product.Title}' deleted successfully."));
        }

        [HttpPut("{id:guid}/disable")]
        [Authorize(Roles = "SuperAdmin,Admin,CommerceManager,CmsManager")]
        public async Task<IActionResult> DisableProduct(Guid id)
        {
            var product = await _context.BcpProducts.FirstOrDefaultAsync(p => p.Id == id);
            if (product == null)
                return NotFound(ApiResponse<object>.FailureResponse("Product not found."));

            product.PublishStatus = ProductPublishStatus.Archived;
            product.UpdatedAtUtc = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<object>.SuccessResponse(product, $"Product '{product.Title}' has been disabled and archived."));
        }

        // ==========================================
        // 2. CATEGORIES MANAGEMENT (CRUD)
        // ==========================================

        [HttpGet("categories")]
        [AllowAnonymous]
        public async Task<IActionResult> GetCategories()
        {
            var categories = await _context.BcpProductCategories
                .AsNoTracking()
                .OrderBy(c => c.SortOrder)
                .ThenBy(c => c.Title)
                .Select(c => new
                {
                    c.Id,
                    c.Title,
                    c.Slug,
                    c.Description,
                    c.Icon,
                    c.BannerUrl,
                    c.ParentId,
                    c.SortOrder,
                    c.Publish,
                    c.CreatedAtUtc,
                    ProductCount = _context.BcpProducts.Count(p => p.BcpProductCategoryId == c.Id)
                })
                .ToListAsync();

            return Ok(ApiResponse<object>.SuccessResponse(categories));
        }

        [HttpGet("categories/{id:guid}")]
        [Authorize(Roles = "SuperAdmin,Admin,CommerceManager,CmsManager")]
        public async Task<IActionResult> GetCategoryById(Guid id)
        {
            var category = await _context.BcpProductCategories.AsNoTracking().FirstOrDefaultAsync(c => c.Id == id);
            if (category == null)
                return NotFound(ApiResponse<object>.FailureResponse("Category not found."));

            int productCount = await _context.BcpProducts.CountAsync(p => p.BcpProductCategoryId == id);
            return Ok(ApiResponse<object>.SuccessResponse(new { category, productCount }));
        }

        [HttpPost("categories")]
        [Authorize(Roles = "SuperAdmin,Admin,CommerceManager,CmsManager")]
        public async Task<IActionResult> CreateCategory([FromBody] BcpProductCategory dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Title))
                return BadRequest(ApiResponse<object>.FailureResponse("Category title is required."));

            string baseSlug = string.IsNullOrWhiteSpace(dto.Slug) ? GenerateSlug(dto.Title) : GenerateSlug(dto.Slug);
            string finalSlug = baseSlug;
            int counter = 1;
            while (await _context.BcpProductCategories.AnyAsync(c => c.Slug.ToLower() == finalSlug.ToLower()))
            {
                finalSlug = $"{baseSlug}-{counter++}";
            }

            var category = new BcpProductCategory
            {
                Id = Guid.CreateVersion7(),
                Title = dto.Title.Trim(),
                Slug = finalSlug,
                Description = dto.Description,
                Icon = string.IsNullOrWhiteSpace(dto.Icon) ? "category" : dto.Icon.Trim(),
                BannerUrl = dto.BannerUrl,
                BannerKey = dto.BannerKey,
                ParentId = dto.ParentId != Guid.Empty ? dto.ParentId : null,
                SortOrder = dto.SortOrder,
                Publish = dto.Publish,
                CreatedAtUtc = DateTime.UtcNow
            };

            _context.BcpProductCategories.Add(category);
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<object>.SuccessResponse(category, "Category created successfully."));
        }

        [HttpPut("categories/{id:guid}")]
        [Authorize(Roles = "SuperAdmin,Admin,CommerceManager,CmsManager")]
        public async Task<IActionResult> UpdateCategory(Guid id, [FromBody] BcpProductCategory dto)
        {
            var category = await _context.BcpProductCategories.FirstOrDefaultAsync(c => c.Id == id);
            if (category == null)
                return NotFound(ApiResponse<object>.FailureResponse("Category not found."));

            if (string.IsNullOrWhiteSpace(dto.Title))
                return BadRequest(ApiResponse<object>.FailureResponse("Category title is required."));

            string baseSlug = string.IsNullOrWhiteSpace(dto.Slug) ? GenerateSlug(dto.Title) : GenerateSlug(dto.Slug);
            string finalSlug = baseSlug;
            int counter = 1;
            while (await _context.BcpProductCategories.AnyAsync(c => c.Slug.ToLower() == finalSlug.ToLower() && c.Id != id))
            {
                finalSlug = $"{baseSlug}-{counter++}";
            }

            category.Title = dto.Title.Trim();
            category.Slug = finalSlug;
            category.Description = dto.Description;
            category.Icon = string.IsNullOrWhiteSpace(dto.Icon) ? "category" : dto.Icon.Trim();
            category.BannerUrl = dto.BannerUrl;
            category.BannerKey = dto.BannerKey;
            category.ParentId = dto.ParentId != Guid.Empty ? dto.ParentId : null;
            category.SortOrder = dto.SortOrder;
            category.Publish = dto.Publish;
            category.UpdatedAtUtc = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(ApiResponse<object>.SuccessResponse(category, "Category updated successfully."));
        }

        [HttpDelete("categories/{id:guid}")]
        [Authorize(Roles = "SuperAdmin,Admin,CommerceManager,CmsManager")]
        public async Task<IActionResult> DeleteCategory(Guid id)
        {
            var category = await _context.BcpProductCategories.FirstOrDefaultAsync(c => c.Id == id);
            if (category == null)
                return NotFound(ApiResponse<object>.FailureResponse("Category not found."));

            // Safely unlink products
            var products = await _context.BcpProducts.Where(p => p.BcpProductCategoryId == id).ToListAsync();
            foreach (var p in products)
            {
                p.BcpProductCategoryId = null;
            }

            _context.BcpProductCategories.Remove(category);
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<object>.SuccessResponse(null, $"Category '{category.Title}' deleted and {products.Count} product(s) unlinked."));
        }

        // ==========================================
        // 3. PRODUCT EMAIL BROADCAST & MARKETING
        // ==========================================

        public class ProductBroadcastRequest
        {
            public string CampaignName { get; set; } = string.Empty;
            public string EmailSubject { get; set; } = string.Empty;
            public Guid? ProductId { get; set; }
            public string TemplateType { get; set; } = "ProductLaunch";
            public string HtmlContent { get; set; } = string.Empty;
            public string? AudienceFilter { get; set; } // "AllMembers", "Category:Guid", "ManualUpload"
            public List<string>? ManualEmails { get; set; }
        }

        [HttpPost("marketing/dispatch")]
        [Authorize(Roles = "SuperAdmin,Admin,CommerceManager,CmsManager")]
        public async Task<IActionResult> DispatchMarketingCampaign([FromBody] ProductBroadcastRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.CampaignName) || string.IsNullOrWhiteSpace(req.EmailSubject))
                return BadRequest(ApiResponse<object>.FailureResponse("Campaign Name and Subject are required."));

            var recipients = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            // 1. Gather Manual / CSV Emails
            if (req.ManualEmails != null && req.ManualEmails.Count > 0)
            {
                foreach (var em in req.ManualEmails)
                {
                    string clean = em.Trim();
                    if (!string.IsNullOrWhiteSpace(clean) && clean.Contains('@'))
                        recipients.Add(clean);
                }
            }

            // 2. Gather from Member Audience Filter
            if (req.AudienceFilter == "AllMembers")
            {
                var userEmails = await _context.Users.AsNoTracking().Where(u => !string.IsNullOrEmpty(u.Email)).Select(u => u.Email!).ToListAsync();
                foreach (var em in userEmails) recipients.Add(em);
            }
            else if (!string.IsNullOrEmpty(req.AudienceFilter) && req.AudienceFilter.StartsWith("Category:"))
            {
                if (Guid.TryParse(req.AudienceFilter.Replace("Category:", ""), out var catId))
                {
                    var catUserEmails = await _context.Users.AsNoTracking().Where(u => u.BcpUserCategoryId == catId && !string.IsNullOrEmpty(u.Email)).Select(u => u.Email!).ToListAsync();
                    foreach (var em in catUserEmails) recipients.Add(em);
                }
            }

            if (recipients.Count == 0)
                return BadRequest(ApiResponse<object>.FailureResponse("No valid recipient email addresses found for this campaign."));

            string userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "System";

            var campaign = new BcpMarketingCampaign
            {
                Id = Guid.CreateVersion7(),
                CampaignName = req.CampaignName.Trim(),
                EmailSubject = req.EmailSubject.Trim(),
                BcpProductId = req.ProductId,
                TemplateType = req.TemplateType,
                HtmlContent = req.HtmlContent,
                AudienceFilter = req.AudienceFilter ?? "Manual",
                TotalRecipients = recipients.Count,
                SentCount = 0,
                FailedCount = 0,
                Status = "Queued",
                CreatedByUserId = userId,
                CreatedAtUtc = DateTime.UtcNow
            };

            _context.BcpMarketingCampaigns.Add(campaign);

            // Enqueue into BcpEmailQueue
            foreach (var email in recipients)
            {
                _context.BcpEmailQueue.Add(new BcpEmailQueue
                {
                    Id = Guid.CreateVersion7(),
                    RecipientEmail = email,
                    Subject = req.EmailSubject.Trim(),
                    HtmlBody = req.HtmlContent,
                    Category = BcpMessageCategory.Marketing,
                    Priority = BcpMessagePriority.Normal,
                    Status = BcpQueueStatus.Queued,
                    ScheduledAt = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow
                });
            }

            await _context.SaveChangesAsync();

            return Ok(ApiResponse<object>.SuccessResponse(new
            {
                campaignId = campaign.Id,
                totalRecipients = recipients.Count
            }, $"Campaign '{campaign.CampaignName}' successfully enqueued with {recipients.Count} recipient(s) in EmailQueue."));
        }

        [HttpGet("marketing/campaigns")]
        [Authorize(Roles = "SuperAdmin,Admin,CommerceManager,CmsManager")]
        public async Task<IActionResult> GetMarketingCampaigns([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            var query = _context.BcpMarketingCampaigns.Include(c => c.Product).AsNoTracking().OrderByDescending(c => c.CreatedAtUtc);
            int totalCount = await query.CountAsync();
            var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

            return Ok(ApiResponse<object>.SuccessResponse(new { items, totalCount, page, pageSize }));
        }

        // ==========================================
        // 4. STOREFRONT CHECKOUT & ORDERS
        // ==========================================

        public class CheckoutItemRequest
        {
            public Guid ProductId { get; set; }
            public int Quantity { get; set; } = 1;
        }

        public class CheckoutRequest
        {
            public string CustomerName { get; set; } = string.Empty;
            public string CustomerEmail { get; set; } = string.Empty;
            public string? CustomerPhone { get; set; }
            public string? ShippingAddressLine1 { get; set; }
            public string? ShippingAddressLine2 { get; set; }
            public string? ShippingCity { get; set; }
            public string? ShippingState { get; set; }
            public string? ShippingCountry { get; set; }
            public string? ShippingPostalCode { get; set; }
            public string PaymentMethod { get; set; } = "Manual"; // "Manual", "Card", "BankTransfer"
            public List<CheckoutItemRequest> Items { get; set; } = new();
        }

        [HttpPost("orders/checkout")]
        [AllowAnonymous]
        public async Task<IActionResult> CheckoutOrder([FromBody] CheckoutRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.CustomerName) || string.IsNullOrWhiteSpace(req.CustomerEmail))
                return BadRequest(ApiResponse<object>.FailureResponse("Customer Name and Email are required."));

            if (req.Items == null || req.Items.Count == 0)
                return BadRequest(ApiResponse<object>.FailureResponse("Your cart is empty."));

            var (currCode, currSymbol) = await GetActiveCurrencyAsync();
            var productIds = req.Items.Select(i => i.ProductId).Distinct().ToList();
            var products = await _context.BcpProducts.Where(p => productIds.Contains(p.Id)).ToListAsync();

            if (products.Count == 0)
                return BadRequest(ApiResponse<object>.FailureResponse("Products not found in catalog."));

            string orderNumber = $"ORD-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..6].ToUpper()}";
            string? customerUserId = User.Identity?.IsAuthenticated == true ? User.FindFirstValue(ClaimTypes.NameIdentifier) : null;

            decimal subtotal = 0;
            var orderItems = new List<BcpProductOrderItem>();

            foreach (var itemReq in req.Items)
            {
                var prod = products.FirstOrDefault(p => p.Id == itemReq.ProductId);
                if (prod == null) continue;

                int qty = Math.Max(1, itemReq.Quantity);
                decimal lineTotal = prod.Price * qty;
                subtotal += lineTotal;

                // Inventory decrement for physical goods
                if (prod.Type == ProductType.Physical && prod.TrackInventory)
                {
                    prod.StockQuantity = Math.Max(0, prod.StockQuantity - qty);
                }

                // Generate license key if required
                string? licenseKey = null;
                if (prod.Type == ProductType.Software && prod.RequiresLicenseKey)
                {
                    licenseKey = $"LIC-{Guid.NewGuid().ToString("N")[..4].ToUpper()}-{Guid.NewGuid().ToString("N")[..4].ToUpper()}-{Guid.NewGuid().ToString("N")[..4].ToUpper()}";
                }

                orderItems.Add(new BcpProductOrderItem
                {
                    Id = Guid.CreateVersion7(),
                    BcpProductId = prod.Id,
                    ProductTitle = prod.Title,
                    ProductType = prod.Type,
                    UnitPrice = prod.Price,
                    Quantity = qty,
                    TotalPrice = lineTotal,
                    GeneratedLicenseKey = licenseKey,
                    DownloadAccessToken = prod.Type == ProductType.Software ? Guid.NewGuid().ToString("N") : null,
                    CreatedAtUtc = DateTime.UtcNow
                });
            }

            var order = new BcpProductOrder
            {
                Id = Guid.CreateVersion7(),
                OrderNumber = orderNumber,
                CustomerUserId = customerUserId,
                CustomerName = req.CustomerName.Trim(),
                CustomerEmail = req.CustomerEmail.Trim(),
                CustomerPhone = req.CustomerPhone,
                ShippingAddressLine1 = req.ShippingAddressLine1,
                ShippingAddressLine2 = req.ShippingAddressLine2,
                ShippingCity = req.ShippingCity,
                ShippingState = req.ShippingState,
                ShippingCountry = req.ShippingCountry,
                ShippingPostalCode = req.ShippingPostalCode,
                Subtotal = subtotal,
                TotalAmount = subtotal,
                Currency = currCode,
                PaymentMethod = req.PaymentMethod,
                PaymentStatus = PaymentStatus.Pending,
                OrderStatus = ProductOrderStatus.Pending,
                CreatedAtUtc = DateTime.UtcNow,
                Items = orderItems
            };

            _context.BcpProductOrders.Add(order);

            // Central Financial Ledger Integration: Write to BcpFinanceTransactions with Feature = "ProductCatalog"
            _context.BcpFinanceTransactions.Add(new BcpFinanceTransaction
            {
                Id = Guid.CreateVersion7(),
                UserId = customerUserId,
                DonorName = req.CustomerName.Trim(),
                DonorEmail = req.CustomerEmail.Trim(),
                DonorPhone = req.CustomerPhone,
                Amount = subtotal,
                Currency = currCode,
                TransactionReference = orderNumber,
                PaymentProvider = req.PaymentMethod,
                Feature = "ProductCatalog",
                SourceId = order.Id.ToString(),
                Status = PaymentStatus.Pending,
                CreatedAt = DateTime.UtcNow,
                Notes = $"Commerce Order #{orderNumber} for {orderItems.Count} item(s)."
            });

            // Enqueue Order Confirmation Email in BcpEmailQueue
            _context.BcpEmailQueue.Add(new BcpEmailQueue
            {
                Id = Guid.CreateVersion7(),
                RecipientEmail = order.CustomerEmail,
                RecipientName = order.CustomerName,
                Subject = $"Order Confirmation #{orderNumber}",
                HtmlBody = $@"
                    <div style='font-family:Arial,sans-serif; max-width:600px; margin:0 auto; padding:20px; border:1px solid #e2e8f0; border-radius:8px;'>
                        <h2 style='color:#0050e5;'>Thank You for Your Order!</h2>
                        <p>Hi <strong>{order.CustomerName}</strong>, your order <strong>#{orderNumber}</strong> has been received.</p>
                        <hr style='border:0; border-top:1px solid #eee; margin:16px 0;'/>
                        <table style='width:100%; border-collapse:collapse;'>
                            <thead>
                                <tr style='background:#f8fafc; text-align:left;'>
                                    <th style='padding:8px;'>Item</th>
                                    <th style='padding:8px; text-align:center;'>Qty</th>
                                    <th style='padding:8px; text-align:right;'>Price</th>
                                </tr>
                            </thead>
                            <tbody>
                                {string.Join("", orderItems.Select(i => $"<tr><td style='padding:8px; border-bottom:1px solid #eee;'>{i.ProductTitle}</td><td style='padding:8px; border-bottom:1px solid #eee; text-align:center;'>{i.Quantity}</td><td style='padding:8px; border-bottom:1px solid #eee; text-align:right;'>{currSymbol}{i.TotalPrice:N2}</td></tr>"))}
                            </tbody>
                        </table>
                        <h3 style='text-align:right; margin-top:16px;'>Total: {currSymbol}{subtotal:N2} {currCode}</h3>
                        <p style='color:#64748b; font-size:13px; margin-top:20px;'>If you have any questions, simply reply to this email.</p>
                    </div>",
                Category = BcpMessageCategory.Account,
                Priority = BcpMessagePriority.High,
                Status = BcpQueueStatus.Queued,
                ScheduledAt = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();

            return Ok(ApiResponse<object>.SuccessResponse(new
            {
                orderId = order.Id,
                orderNumber = order.OrderNumber,
                totalAmount = subtotal,
                currencyCode = currCode,
                currencySymbol = currSymbol,
                items = orderItems.Select(i => new
                {
                    i.ProductTitle,
                    i.ProductType,
                    i.Quantity,
                    i.TotalPrice,
                    i.GeneratedLicenseKey,
                    i.DownloadAccessToken
                })
            }, "Order placed successfully."));
        }

        [HttpGet("my-orders")]
        [Authorize]
        public async Task<IActionResult> GetMyOrders()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(ApiResponse<object>.FailureResponse("Unauthorized access."));

            var orders = await _context.BcpProductOrders
                .Include(o => o.Items)
                .AsNoTracking()
                .Where(o => o.CustomerUserId == userId)
                .OrderByDescending(o => o.CreatedAtUtc)
                .ToListAsync();

            var (currCode, currSymbol) = await GetActiveCurrencyAsync();
            return Ok(ApiResponse<object>.SuccessResponse(new { items = orders, currencyCode = currCode, currencySymbol = currSymbol }));
        }

        [HttpGet("orders")]
        [Authorize(Roles = "SuperAdmin,Admin,CommerceManager,CmsManager")]
        public async Task<IActionResult> GetOrders(
            [FromQuery] string? search,
            [FromQuery] ProductOrderStatus? status,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var query = _context.BcpProductOrders.Include(o => o.Items).AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                string s = search.Trim().ToLower();
                query = query.Where(o => o.OrderNumber.ToLower().Contains(s) || o.CustomerName.ToLower().Contains(s) || o.CustomerEmail.ToLower().Contains(s));
            }

            if (status.HasValue)
                query = query.Where(o => o.OrderStatus == status.Value);

            int totalCount = await query.CountAsync();
            var items = await query.OrderByDescending(o => o.CreatedAtUtc)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var (currCode, currSymbol) = await GetActiveCurrencyAsync();

            return Ok(ApiResponse<object>.SuccessResponse(new { items, totalCount, page, pageSize, currencyCode = currCode, currencySymbol = currSymbol }));
        }

        [HttpGet("orders/{id:guid}")]
        [Authorize(Roles = "SuperAdmin,Admin,CommerceManager,CmsManager")]
        public async Task<IActionResult> GetOrderById(Guid id)
        {
            var order = await _context.BcpProductOrders.Include(o => o.Items).ThenInclude(i => i.Product).AsNoTracking().FirstOrDefaultAsync(o => o.Id == id);
            if (order == null)
                return NotFound(ApiResponse<object>.FailureResponse("Order not found."));

            var (currCode, currSymbol) = await GetActiveCurrencyAsync();
            return Ok(ApiResponse<object>.SuccessResponse(new { order, currencyCode = currCode, currencySymbol = currSymbol }));
        }

        [HttpPut("orders/{id:guid}/status")]
        [Authorize(Roles = "SuperAdmin,Admin,CommerceManager,CmsManager")]
        public async Task<IActionResult> UpdateOrderStatus(Guid id, [FromBody] BcpProductOrder dto)
        {
            var order = await _context.BcpProductOrders.FirstOrDefaultAsync(o => o.Id == id);
            if (order == null)
                return NotFound(ApiResponse<object>.FailureResponse("Order not found."));

            // If order status is changing to Refunded, log a reverse ledger entry
            if (dto.OrderStatus == ProductOrderStatus.Refunded && order.OrderStatus != ProductOrderStatus.Refunded)
            {
                _context.BcpFinanceTransactions.Add(new BcpFinanceTransaction
                {
                    Id = Guid.CreateVersion7(),
                    UserId = order.CustomerUserId,
                    DonorName = order.CustomerName,
                    DonorEmail = order.CustomerEmail,
                    DonorPhone = order.CustomerPhone,
                    Amount = -order.TotalAmount,
                    Currency = order.Currency,
                    TransactionReference = $"REF-{order.OrderNumber}",
                    PaymentProvider = order.PaymentMethod ?? "Refund",
                    Feature = "ProductCatalog",
                    SourceId = order.Id.ToString(),
                    Status = PaymentStatus.Success,
                    CreatedAt = DateTime.UtcNow,
                    Notes = $"Refund for Order #{order.OrderNumber}"
                });

                // Also update the original transaction status to Failed or Refunded?
                // Let's find the original transaction and mark it
                var origTx = await _context.BcpFinanceTransactions.FirstOrDefaultAsync(t => t.SourceId == order.Id.ToString() && t.Amount > 0);
                if (origTx != null)
                {
                    origTx.Notes = (origTx.Notes ?? "") + " (Refunded)";
                }
            }

            order.OrderStatus = dto.OrderStatus;
            order.PaymentStatus = dto.PaymentStatus;
            order.TrackingNumber = dto.TrackingNumber;
            order.CourierName = dto.CourierName;
            order.AdminNotes = dto.AdminNotes;

            if (dto.OrderStatus == ProductOrderStatus.Completed && order.FulfilledAtUtc == null)
                order.FulfilledAtUtc = DateTime.UtcNow;

            if (dto.PaymentStatus == PaymentStatus.Success && order.PaidAtUtc == null)
                order.PaidAtUtc = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(ApiResponse<object>.SuccessResponse(order, "Order status updated successfully."));
        }

        // ==========================================
        // 5. FEATURE TRANSACTION HISTORY (Central Ledger Filtered)
        // ==========================================

        [HttpGet("transactions")]
        [Authorize(Roles = "SuperAdmin,Admin,CommerceManager,CmsManager")]
        public async Task<IActionResult> GetProductTransactions(
            [FromQuery] string? search,
            [FromQuery] PaymentStatus? status,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20)
        {
            var query = _context.BcpFinanceTransactions.AsNoTracking().Where(t => t.Feature == "ProductCatalog");

            if (!string.IsNullOrWhiteSpace(search))
            {
                string s = search.Trim().ToLower();
                query = query.Where(t => (t.TransactionReference != null && t.TransactionReference.ToLower().Contains(s)) ||
                                         (t.DonorName != null && t.DonorName.ToLower().Contains(s)) ||
                                         (t.DonorEmail != null && t.DonorEmail.ToLower().Contains(s)));
            }

            if (status.HasValue)
                query = query.Where(t => t.Status == status.Value);

            int totalCount = await query.CountAsync();
            decimal totalRevenue = await query.Where(t => t.Status == PaymentStatus.Success).SumAsync(t => (decimal?)t.Amount) ?? 0;

            var items = await query.OrderByDescending(t => t.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var (currCode, currSymbol) = await GetActiveCurrencyAsync();

            return Ok(ApiResponse<object>.SuccessResponse(new
            {
                items,
                totalCount,
                totalRevenue,
                page,
                pageSize,
                currencyCode = currCode,
                currencySymbol = currSymbol
            }));
        }

        // ==========================================
        // 6. QUEUES MONITOR (Email, SMS, Scheduled Jobs)
        // ==========================================

        [HttpGet("queues/summary")]
        [Authorize(Roles = "SuperAdmin,Admin,CommerceManager,CmsManager")]
        public async Task<IActionResult> GetQueuesSummary()
        {
            int pendingEmails = await _context.BcpEmailQueue.CountAsync(q => q.Status == BcpQueueStatus.Queued || q.Status == BcpQueueStatus.Processing);
            int failedEmails = await _context.BcpEmailQueue.CountAsync(q => q.Status == BcpQueueStatus.Failed);
            int sentEmails = await _context.BcpEmailQueue.CountAsync(q => q.Status == BcpQueueStatus.Sent);

            int pendingSms = await _context.BcpSmsQueue.CountAsync(q => q.Status == BcpQueueStatus.Queued || q.Status == BcpQueueStatus.Processing);
            int failedSms = await _context.BcpSmsQueue.CountAsync(q => q.Status == BcpQueueStatus.Failed);
            int sentSms = await _context.BcpSmsQueue.CountAsync(q => q.Status == BcpQueueStatus.Sent);

            int pendingJobs = await _context.BcpScheduledJobQueues.CountAsync(q => q.Status == BcpQueueStatus.Queued || q.Status == BcpQueueStatus.Processing);
            int failedJobs = await _context.BcpScheduledJobQueues.CountAsync(q => q.Status == BcpQueueStatus.Failed);
            int completedJobs = await _context.BcpScheduledJobQueues.CountAsync(q => q.Status == BcpQueueStatus.Sent);

            var recentEmailQueue = await _context.BcpEmailQueue.AsNoTracking().OrderByDescending(q => q.CreatedAt).Take(15).Select(q => new
            {
                q.Id,
                q.RecipientEmail,
                q.RecipientName,
                q.Subject,
                q.Status,
                StatusName = q.Status.ToString(),
                q.Retries,
                q.LastError,
                q.ScheduledAt,
                q.SentAt,
                q.CreatedAt
            }).ToListAsync();

            var recentJobQueue = await _context.BcpScheduledJobQueues.AsNoTracking().OrderByDescending(q => q.CreatedAt).Take(15).Select(q => new
            {
                q.Id,
                q.SourceId,
                q.SourceModel,
                q.ActionType,
                q.Status,
                StatusName = q.Status.ToString(),
                q.ScheduledAt,
                q.ExecutedAt,
                q.Retries,
                q.LastError,
                q.CreatedAt
            }).ToListAsync();



            return Ok(ApiResponse<object>.SuccessResponse(new
            {
                emailQueue = new { pending = pendingEmails, failed = failedEmails, completed = sentEmails, recent = recentEmailQueue },
                smsQueue = new { pending = pendingSms, failed = failedSms, completed = sentSms },
                jobQueue = new { pending = pendingJobs, failed = failedJobs, completed = completedJobs, recent = recentJobQueue }
            }));
        }
    }

    public class ProductMediaUploadRequest
    {
        public IFormFile File { get; set; } = null!;
        public string Folder { get; set; } = "bcp-products";
    }
}
