using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Api.Models;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;

namespace Ozikol_BCC.Api.Controllers
{
    /// <summary>
    /// Public content delivery API for the client website, landing pages, and UI.
    /// Fully anonymous, delivering published pages (including legal/terms SecurityPages),
    /// navigation categories, layout sections, sliders, FAQs, and visitor telemetry.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [AllowAnonymous]
    [Tags("Website Content Delivery - Public UI")]
    public class WebsiteContentApiController : ControllerBase
    {
        private readonly DashboardDbContext _context;

        public WebsiteContentApiController(DashboardDbContext context)
        {
            _context = context;
        }

        // ==========================================
        // 1. PUBLIC WEB PAGES
        // ==========================================

        /// <summary>
        /// Retrieves all published website pages for navigation and footer links.
        /// Includes standard pages and institutional/legal pages (marked with SecurityPage).
        /// </summary>
        [HttpGet("pages")]
        public async Task<IActionResult> GetPublishedPages([FromQuery] bool? securityPagesOnly = null)
        {
            var query = _context.WebPages
                .Include(p => p.PageCategory)
                .Where(p => p.Publish);

            if (securityPagesOnly.HasValue)
            {
                query = query.Where(p => p.SecurityPage == securityPagesOnly.Value);
            }

            var pages = await query
                .OrderBy(p => p.SortOrder)
                .ToListAsync();

            return Ok(ApiResponse<object>.SuccessResponse(pages, "Published web pages retrieved successfully."));
        }

        /// <summary>
        /// Retrieves full published page details and layout sections by unique slug.
        /// </summary>
        [HttpGet("pages/slug/{slug}")]
        public async Task<IActionResult> GetPublishedPageBySlug(string slug)
        {
            var cleanSlug = slug.Trim().ToLowerInvariant();
            var page = await _context.WebPages
                .Include(p => p.PageCategory)
                .Include(p => p.PageSections!.Where(s => !s.Disable).OrderBy(s => s.PageSortOrder))
                    .ThenInclude(s => s.PageSectionLists!.Where(l => !l.Disable).OrderBy(l => l.SortOrder))
                .Include(p => p.PageSections!.Where(s => !s.Disable))
                    .ThenInclude(s => s.PageForm)
                        .ThenInclude(f => f!.Fields!.OrderBy(fld => fld.SortOrder))
                .FirstOrDefaultAsync(p => p.Publish && p.DirectUrl != null && p.DirectUrl.ToLower() == cleanSlug);

            if (page == null)
            {
                return NotFound(ApiResponse<object>.FailureResponse($"Page with slug '{slug}' was not found or is unpublished."));
            }

            // Increment public page view counter
            page.ViewCount++;
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<object>.SuccessResponse(page, "Page details retrieved."));
        }

        /// <summary>
        /// Retrieves full published page details and layout sections by ID.
        /// </summary>
        [HttpGet("pages/{id:guid}")]
        public async Task<IActionResult> GetPublishedPageById(Guid id)
        {
            var page = await _context.WebPages
                .Include(p => p.PageCategory)
                .Include(p => p.PageSections!.Where(s => !s.Disable).OrderBy(s => s.PageSortOrder))
                    .ThenInclude(s => s.PageSectionLists!.Where(l => !l.Disable).OrderBy(l => l.SortOrder))
                .Include(p => p.PageSections!.Where(s => !s.Disable))
                    .ThenInclude(s => s.PageForm)
                        .ThenInclude(f => f!.Fields!.OrderBy(fld => fld.SortOrder))
                .FirstOrDefaultAsync(p => p.Publish && p.Id == id);

            if (page == null)
            {
                return NotFound(ApiResponse<object>.FailureResponse("Page was not found or is unpublished."));
            }

            return Ok(ApiResponse<object>.SuccessResponse(page, "Page details retrieved."));
        }

        // ==========================================
        // 2. PUBLIC NAVIGATION CATEGORIES
        // ==========================================

        /// <summary>
        /// Retrieves published menu categories and their published pages for navbar dropdowns.
        /// </summary>
        [HttpGet("categories")]
        public async Task<IActionResult> GetPublishedCategories()
        {
            var categories = await _context.PageCategories
                .Where(c => c.Publish)
                .Include(c => c.WebPages!.Where(p => p.Publish).OrderBy(p => p.SortOrder))
                .OrderBy(c => c.MenuSortOrder)
                .ToListAsync();

            return Ok(ApiResponse<object>.SuccessResponse(categories, "Public navigation categories retrieved."));
        }

        // ==========================================
        // 3. PUBLIC PAGE SECTIONS
        // ==========================================

        /// <summary>
        /// Retrieves published page sections for the homepage or a specific page.
        /// </summary>
        [HttpGet("sections")]
        public async Task<IActionResult> GetPublishedSections([FromQuery] string? pageSet = null, [FromQuery] Guid? webPageId = null)
        {
            var query = _context.PageSections
                .Include(s => s.PageSectionLists!.Where(l => !l.Disable).OrderBy(l => l.SortOrder))
                .Include(s => s.PageForm)
                    .ThenInclude(f => f!.Fields!.OrderBy(fld => fld.SortOrder))
                .Where(s => !s.Disable)
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
            return Ok(ApiResponse<object>.SuccessResponse(sections, "Page layout sections retrieved."));
        }

        // ==========================================
        // 4. PUBLIC HERO SLIDERS
        // ==========================================

        /// <summary>
        /// Retrieves all active hero carousels/sliders for the website.
        /// </summary>
        [HttpGet("sliders")]
        public async Task<IActionResult> GetPublishedSliders()
        {
            var sliders = await _context.Sliders
                .Where(s => s.Show)
                .OrderBy(s => s.SortOrder)
                .ToListAsync();

            return Ok(ApiResponse<object>.SuccessResponse(sliders, "Hero sliders retrieved."));
        }

        // ==========================================
        // 5. PUBLIC FAQs
        // ==========================================

        /// <summary>
        /// Retrieves published FAQ categories with active FAQs.
        /// </summary>
        [HttpGet("faq-categories")]
        public async Task<IActionResult> GetPublishedFaqCategories()
        {
            var categories = await _context.FAQCategories
                .Where(c => c.Publish)
                .Include(c => c.FAQs!.Where(f => f.Show).OrderBy(f => f.SortOrder))
                .OrderBy(c => c.SortOrder)
                .ToListAsync();

            return Ok(ApiResponse<object>.SuccessResponse(categories, "FAQ categories retrieved."));
        }

        /// <summary>
        /// Retrieves active FAQs, optionally filtered by FAQ category.
        /// </summary>
        [HttpGet("faqs")]
        public async Task<IActionResult> GetPublishedFaqs([FromQuery] int? categoryId = null)
        {
            var query = _context.FAQs
                .Include(f => f.FAQCategory)
                .Where(f => f.Show)
                .AsQueryable();

            if (categoryId.HasValue)
            {
                query = query.Where(f => f.FAQCategoryId == categoryId.Value);
            }

            var faqs = await query.OrderBy(f => f.SortOrder).ToListAsync();
            return Ok(ApiResponse<object>.SuccessResponse(faqs, "FAQs retrieved."));
        }

        // ==========================================
        // 6. PUBLIC VISITOR TELEMETRY
        // ==========================================

        public class TrackViewRequest
        {
            public Guid? PageId { get; set; }
            public string PageUrl { get; set; } = string.Empty;
            public string? PageTitle { get; set; }
            public int DurationSeconds { get; set; } = 0;
            public int StatusCode { get; set; } = 200;
        }

        /// <summary>
        /// Records anonymous visitor telemetry and view logs.
        /// </summary>
        [HttpPost("track-view")]
        public async Task<IActionResult> TrackPageView([FromBody] TrackViewRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.PageUrl))
            {
                request.PageUrl = "/";
            }

            var userAgent = Request.Headers["User-Agent"].ToString();
            var referer = Request.Headers["Referer"].ToString();
            var ip = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";

            var (deviceType, browser) = ParseClientDeviceAndBrowser(userAgent);

            var log = new WebPageViewLog
            {
                WebPageId = request.PageId,
                PageUrl = request.PageUrl,
                PageTitle = request.PageTitle,
                DeviceType = deviceType,
                Browser = browser,
                UserAgent = userAgent,
                IpAddress = ip,
                Referer = referer,
                DurationSeconds = request.DurationSeconds,
                StatusCode = request.StatusCode,
                CreatedAtUtc = DateTime.UtcNow
            };

            _context.WebPageViewLogs.Add(log);

            if (request.PageId.HasValue && request.PageId.Value != Guid.Empty)
            {
                var page = await _context.WebPages.FindAsync(request.PageId.Value);
                if (page != null)
                {
                    page.ViewCount += 1;
                }
            }

            await _context.SaveChangesAsync();
            return Ok(ApiResponse<object>.SuccessResponse(new { logId = log.Id, deviceType, browser }, "Page view recorded."));
        }

        private static (string Device, string Browser) ParseClientDeviceAndBrowser(string? ua)
        {
            if (string.IsNullOrWhiteSpace(ua))
            {
                return ("Desktop (Windows/Mac)", "Other Browsers");
            }

            string device = "Desktop (Windows/Mac)";
            if (ua.Contains("Huawei", StringComparison.OrdinalIgnoreCase) || ua.Contains("Honor", StringComparison.OrdinalIgnoreCase))
            {
                device = "Huawei & Other";
            }
            else if (ua.Contains("iPhone", StringComparison.OrdinalIgnoreCase) || ua.Contains("iPad", StringComparison.OrdinalIgnoreCase) || ua.Contains("iPod", StringComparison.OrdinalIgnoreCase))
            {
                device = "iOS (iPhone/iPad)";
            }
            else if (ua.Contains("Android", StringComparison.OrdinalIgnoreCase))
            {
                device = "Android Mobile";
            }

            string browser = "Other Browsers";
            if (ua.Contains("Edg/", StringComparison.OrdinalIgnoreCase) || ua.Contains("Edge/", StringComparison.OrdinalIgnoreCase))
            {
                browser = "Microsoft Edge";
            }
            else if (ua.Contains("Chrome/", StringComparison.OrdinalIgnoreCase) && !ua.Contains("Edg/", StringComparison.OrdinalIgnoreCase))
            {
                browser = "Google Chrome";
            }
            else if (ua.Contains("Safari/", StringComparison.OrdinalIgnoreCase) && !ua.Contains("Chrome/", StringComparison.OrdinalIgnoreCase))
            {
                browser = "Apple Safari";
            }
            else if (ua.Contains("Firefox/", StringComparison.OrdinalIgnoreCase))
            {
                browser = "Mozilla Firefox";
            }

            return (device, browser);
        }

        // ==========================================
        // 7. PUBLIC 3-ZONE CODE INJECTIONS
        // ==========================================

        /// <summary>
        /// Retrieves all active code injection tags for public UI rendering,
        /// grouped by zone ("head", "body_open", "footer") and ordered by SortOrder ascending.
        /// Resolves dynamic brand placeholders (FaviconUrl, LogoUrl, BrandName, CanonicalUrl)
        /// with guaranteed fallbacks to prevent empty attribute references.
        /// </summary>
        /// <returns>Grouped active code injection tags.</returns>
        [HttpGet("code-injections")]
        public async Task<IActionResult> GetPublicCodeInjections()
        {
            var activeTags = await _context.SiteCodeInjectionTags
                .Where(t => t.IsActive)
                .OrderBy(t => t.SortOrder)
                .ThenBy(t => t.CreatedAtUtc)
                .ToListAsync();

            // Resolve tenant brand settings to hydrate placeholders dynamically
            var config = await _context.ConfigSettings.AsNoTracking().FirstOrDefaultAsync();
            var brandName = !string.IsNullOrWhiteSpace(config?.CompanyName)
                ? config.CompanyName
                : (!string.IsNullOrWhiteSpace(config?.WebsiteTitle) ? config.WebsiteTitle : "Ozikol");
            var faviconUrl = !string.IsNullOrWhiteSpace(config?.CompanyIconUrl)
                ? config.CompanyIconUrl
                : (!string.IsNullOrWhiteSpace(config?.CompanyLogoUrl) ? config.CompanyLogoUrl : "/favicon.ico");
            var logoUrl = !string.IsNullOrWhiteSpace(config?.CompanyLogoUrl)
                ? config.CompanyLogoUrl
                : faviconUrl;
            var description = config?.CompanyDescription ?? string.Empty;
            var baseUrl = $"{Request.Scheme}://{Request.Host}";

            // Hydrate dynamic tokens so client receives valid URLs with zero empty hrefs
            foreach (var tag in activeTags)
            {
                if (string.IsNullOrWhiteSpace(tag.Content)) continue;

                var hydrated = tag.Content
                    .Replace("{{ FaviconUrl }}", faviconUrl, StringComparison.OrdinalIgnoreCase)
                    .Replace("{{ Favicon }}", faviconUrl, StringComparison.OrdinalIgnoreCase)
                    .Replace("{{ LogoUrl }}", logoUrl, StringComparison.OrdinalIgnoreCase)
                    .Replace("{{ BrandName }}", brandName, StringComparison.OrdinalIgnoreCase)
                    .Replace("{{ Title }}", brandName, StringComparison.OrdinalIgnoreCase)
                    .Replace("{{ MetaDescription }}", description, StringComparison.OrdinalIgnoreCase)
                    .Replace("{{ Description }}", description, StringComparison.OrdinalIgnoreCase)
                    .Replace("{{ CanonicalUrl }}", baseUrl, StringComparison.OrdinalIgnoreCase);

                // Universal safety guard: replace empty href="" on shortcut icon / icon tags with fallback
                hydrated = System.Text.RegularExpressions.Regex.Replace(
                    hydrated,
                    @"(<link[^>]*rel=[""'](?:shortcut icon|icon)[""'][^>]*href=[""'])\s*([""'])",
                    $"$1{faviconUrl}$2",
                    System.Text.RegularExpressions.RegexOptions.IgnoreCase);

                tag.Content = hydrated;
            }

            var head = activeTags.Where(t => t.Zone.Equals("head", StringComparison.OrdinalIgnoreCase)).ToList();
            var bodyOpen = activeTags.Where(t => t.Zone.Equals("body_open", StringComparison.OrdinalIgnoreCase)).ToList();
            var footer = activeTags.Where(t => t.Zone.Equals("footer", StringComparison.OrdinalIgnoreCase)).ToList();

            return Ok(ApiResponse<object>.SuccessResponse(new
            {
                head,
                bodyOpen,
                footer
            }, "Active code injection tags retrieved."));
        }

        // ==========================================
        // 9. PUBLIC PAGE FORMS & DYNAMIC SUBMISSIONS
        // ==========================================

        /// <summary>
        /// Retrieves the public schema and field definitions of an active website form by its key.
        /// Used by public website sections (Contact Us, Newsletter, Service Request, etc.).
        /// </summary>
        /// <param name="formKey">The programmatic key of the form (e.g. "contact-us", "newsletter", "service-request").</param>
        /// <returns>Form schema and ordered interactive fields.</returns>
        [HttpGet("forms/{formKey}")]
        public async Task<IActionResult> GetPublicFormByKey(string formKey)
        {
            if (string.IsNullOrWhiteSpace(formKey))
            {
                return BadRequest(ApiResponse.FailureResponse("Form key is required."));
            }

            var cleanKey = formKey.Trim().ToLowerInvariant();
            var form = await _context.PageForms
                .Include(f => f.Fields.OrderBy(fl => fl.SortOrder))
                .AsNoTracking()
                .FirstOrDefaultAsync(f => f.FormKey == cleanKey && f.IsActive);

            if (form == null)
            {
                return NotFound(ApiResponse.FailureResponse($"Active form '{cleanKey}' was not found."));
            }

            var publicForm = new
            {
                form.Id,
                form.Title,
                form.FormKey,
                form.Description,
                form.SubmitButtonText,
                form.SuccessMessage,
                Fields = form.Fields.OrderBy(fl => fl.SortOrder).Select(fl => new
                {
                    fl.Id,
                    fl.FieldKey,
                    fl.Label,
                    fl.Placeholder,
                    fl.FieldType,
                    fl.OptionsJson,
                    fl.IsRequired,
                    fl.SortOrder,
                    fl.GridWidth,
                    fl.HelpText
                })
            };

            return Ok(ApiResponse<object>.SuccessResponse(publicForm, "Form schema retrieved successfully."));
        }

        /// <summary>
        /// Submits visitor input to an active dynamic website form.
        /// Validates required fields, stores the payload, captures visitor telemetry, and returns the custom success message.
        /// </summary>
        /// <param name="formKey">The programmatic key of the form to submit to.</param>
        /// <param name="payload">Visitor submitted key-value data and optional referral/source URL.</param>
        /// <returns>Confirmation and custom form success message.</returns>
        [HttpPost("forms/{formKey}/submit")]
        public async Task<IActionResult> SubmitPublicForm(string formKey, [FromBody] PublicFormSubmissionPayload payload)
        {
            if (string.IsNullOrWhiteSpace(formKey))
            {
                return BadRequest(ApiResponse.FailureResponse("Form key is required."));
            }

            var cleanKey = formKey.Trim().ToLowerInvariant();
            var form = await _context.PageForms
                .Include(f => f.Fields)
                .FirstOrDefaultAsync(f => f.FormKey == cleanKey && f.IsActive);

            if (form == null)
            {
                return NotFound(ApiResponse.FailureResponse($"Active form '{cleanKey}' was not found."));
            }

            var data = payload?.Data ?? new Dictionary<string, object>();

            // Validate all required fields
            var missingRequiredFields = new List<string>();
            foreach (var field in form.Fields.Where(f => f.IsRequired))
            {
                if (!data.TryGetValue(field.FieldKey, out var val) || val == null || string.IsNullOrWhiteSpace(val.ToString()))
                {
                    missingRequiredFields.Add(field.Label);
                }
            }

            if (missingRequiredFields.Count > 0)
            {
                return BadRequest(ApiResponse.FailureResponse(
                    $"Please fill in all required fields: {string.Join(", ", missingRequiredFields)}"));
            }

            var submission = new PageFormSubmission
            {
                Id = Guid.NewGuid(),
                PageFormId = form.Id,
                DataJson = System.Text.Json.JsonSerializer.Serialize(data),
                SourcePageUrl = payload?.SourcePageUrl?.Trim(),
                Status = "New",
                SubmittedAtUtc = DateTime.UtcNow,
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers.UserAgent.ToString()
            };

            _context.PageFormSubmissions.Add(submission);
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<object>.SuccessResponse(new
            {
                submissionId = submission.Id,
                message = form.SuccessMessage
            }, form.SuccessMessage));
        }
    }

    /// <summary>
    /// Payload DTO for public dynamic form submissions.
    /// </summary>
    public class PublicFormSubmissionPayload
    {
        /// <summary>
        /// Dynamic field key-value pairs submitted by the visitor.
        /// </summary>
        public Dictionary<string, object>? Data { get; set; }

        /// <summary>
        /// Optional public website URL or path where the submission originated.
        /// </summary>
        public string? SourcePageUrl { get; set; }
    }
}
