using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Api.Models;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Infrastructure.Services.Recaptcha;
using Ozikol_BCC.Persistence.EF.SQL;
using Ozikol_BCC.Infrastructure.TenantSupport;

namespace Ozikol_BCC.Api.Controllers
{
    /// <summary>
    /// Public content delivery API for the client website, landing pages, and UI.
    /// Fully anonymous, delivering published pages (including legal/terms SecurityPages),
    /// navigation categories, layout sections, FAQs, and visitor telemetry.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [AllowAnonymous]
    [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
    [Tags("Website Content Delivery - Public UI")]
    public class WebsiteContentApiController : ControllerBase
    {
        private readonly DashboardDbContext _context;
        private readonly IRecaptchaService _recaptchaService;
        private readonly ITenantProvider? _tenantProvider;

        public WebsiteContentApiController(
            DashboardDbContext context,
            IRecaptchaService recaptchaService,
            ITenantProvider? tenantProvider = null)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _recaptchaService = recaptchaService ?? throw new ArgumentNullException(nameof(recaptchaService));
            _tenantProvider = tenantProvider;
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

            // Normalize system auth and registration page URLs so published menus never point to raw CMS slugs
            foreach (var p in pages)
            {
                var clean = (p.DirectUrl ?? string.Empty).Trim().Trim('/').ToLowerInvariant();
                if (clean == "auth-login" || clean == "login" || clean == "auth/login")
                {
                    p.DirectUrl = "/auth/login";
                }
                else if (clean == "auth-register" || clean == "register" || clean == "auth/register")
                {
                    p.DirectUrl = "/register";
                }
            }

            return Ok(ApiResponse<object>.SuccessResponse(pages, "Published web pages retrieved successfully."));
        }

        /// <summary>
        /// Retrieves full published page details and layout sections by unique slug.
        /// </summary>
        /// <param name="slug">The direct URL slug of the page.</param>
        /// <returns>Published page entity with ordered sections, lists, and forms.</returns>
        [HttpGet("pages/slug/{slug}")]
        public async Task<IActionResult> GetPublishedPageBySlug(string slug)
        {
            var cleanSlug = (slug ?? string.Empty).Trim().ToLowerInvariant().Trim('/');
            if (cleanSlug == "auth-login" || cleanSlug == "login" || cleanSlug == "auth/login")
            {
                return NotFound(ApiResponse<object>.FailureResponse("Authentication routes are system pages and must be accessed via /auth/login."));
            }
            if (cleanSlug == "auth-register" || cleanSlug == "register" || cleanSlug == "auth/register")
            {
                return NotFound(ApiResponse<object>.FailureResponse("Registration routes are system pages and must be accessed via /register."));
            }
            var slashSlug = "/" + cleanSlug;

            var page = await _context.WebPages
                .Include(p => p.PageCategory)
                .Include(p => p.PageSections!.Where(s => !s.Disable).OrderBy(s => s.PageSortOrder))
                    .ThenInclude(s => s.PageSectionLists!.Where(l => !l.Disable).OrderBy(l => l.SortOrder))
                .Include(p => p.PageSections!.Where(s => !s.Disable).OrderBy(s => s.PageSortOrder))
                    .ThenInclude(s => s.PageForm)
                        .ThenInclude(f => f!.Fields!.OrderBy(fld => fld.SortOrder))
                .FirstOrDefaultAsync(p => p.Publish && p.DirectUrl != null &&
                    (p.DirectUrl.ToLower() == cleanSlug || p.DirectUrl.ToLower() == slashSlug));

            if (page == null)
            {
                return NotFound(ApiResponse<object>.FailureResponse($"Page with slug '{slug}' was not found or is unpublished."));
            }

            await MergeLinkedSectionsAsync(page);

            return Ok(ApiResponse<object>.SuccessResponse(page, "Page details retrieved."));
        }

        /// <summary>
        /// Retrieves full published page details and layout sections by ID.
        /// </summary>
        /// <param name="id">The unique GUID identifier of the web page.</param>
        /// <returns>Published page entity with ordered sections, lists, and forms.</returns>
        [HttpGet("pages/{id:guid}")]
        public async Task<IActionResult> GetPublishedPageById(Guid id)
        {
            var page = await _context.WebPages
                .Include(p => p.PageCategory)
                .Include(p => p.PageSections!.Where(s => !s.Disable).OrderBy(s => s.PageSortOrder))
                    .ThenInclude(s => s.PageSectionLists!.Where(l => !l.Disable).OrderBy(l => l.SortOrder))
                .Include(p => p.PageSections!.Where(s => !s.Disable).OrderBy(s => s.PageSortOrder))
                    .ThenInclude(s => s.PageForm)
                        .ThenInclude(f => f!.Fields!.OrderBy(fld => fld.SortOrder))
                .FirstOrDefaultAsync(p => p.Publish && p.Id == id);

            if (page == null)
            {
                return NotFound(ApiResponse<object>.FailureResponse("Page was not found or is unpublished."));
            }

            await MergeLinkedSectionsAsync(page);

            return Ok(ApiResponse<object>.SuccessResponse(page, "Page details retrieved."));
        }

        /// <summary>
        /// Populates and merges secondary shared PageSections linked to this page via WebPageSectionLink,
        /// sorting the combined collection by each section's effective PageSortOrder.
        /// </summary>
        /// <param name="page">The target WebPage entity to hydrate with linked sections.</param>
        private async Task MergeLinkedSectionsAsync(WebPage page)
        {
            if (page == null) return;

            var linkedSections = await _context.WebPageSectionLinks
                .Where(l => l.WebPageId == page.Id && l.IsVisible && l.PageSection != null && !l.PageSection.Disable)
                .Include(l => l.PageSection!)
                    .ThenInclude(s => s.PageSectionLists!.Where(item => !item.Disable).OrderBy(item => item.SortOrder))
                .Include(l => l.PageSection!)
                    .ThenInclude(s => s.PageForm)
                        .ThenInclude(f => f!.Fields!.OrderBy(fld => fld.SortOrder))
                .ToListAsync();

            if (linkedSections.Count > 0)
            {
                var combined = (page.PageSections ?? new List<PageSection>()).ToList();
                foreach (var link in linkedSections)
                {
                    if (link.PageSection != null && !combined.Any(s => s.Id == link.PageSectionId))
                    {
                        var clone = link.PageSection;
                        clone.PageSortOrder = link.PageSortOrder;
                        clone.IsLinkedSection = true;
                        combined.Add(clone);
                    }
                }
                page.PageSections = combined.OrderBy(s => s.PageSortOrder).ToList();
            }
        }

        // ==========================================
        // 2. PUBLIC NAVIGATION CATEGORIES
        // ==========================================

        /// <summary>
        /// Retrieves published menu categories and their published pages for navbar dropdowns.
        /// Filters out categories with zero published child pages to avoid empty dropdown placeholders.
        /// </summary>
        [HttpGet("categories")]
        public async Task<IActionResult> GetPublishedCategories()
        {
            var categories = await _context.PageCategories
                .Where(c => c.Publish && c.ShowInMenu && c.WebPages.Any(p => p.Publish && p.ShowInMenuDropDown))
                .Include(c => c.WebPages!.Where(p => p.Publish && p.ShowInMenuDropDown).OrderBy(p => p.DropdownSortOrder != 0 ? p.DropdownSortOrder : p.SortOrder))
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

            Guid? targetPageId = null;
            if (webPageId.HasValue)
            {
                targetPageId = webPageId.Value;
                query = query.Where(s => s.WebPageId == webPageId.Value).OrderBy(s => s.PageSortOrder);
            }
            else if (pageSet == "home" || string.IsNullOrEmpty(pageSet))
            {
                var homePage = await _context.WebPages.FirstOrDefaultAsync(p => p.IsHomePage || p.DirectUrl == "/" || p.DirectUrl == "home" || p.DirectUrl == "index");
                if (homePage != null)
                {
                    targetPageId = homePage.Id;
                    query = query.Where(s => s.WebPageId == homePage.Id).OrderBy(s => s.PageSortOrder);
                }
                else
                {
                    query = query.OrderBy(s => s.PageSortOrder);
                }
            }

            var sections = await query.ToListAsync();

            if (targetPageId.HasValue)
            {
                var linkedSections = await _context.WebPageSectionLinks
                    .Where(l => l.WebPageId == targetPageId.Value && l.IsVisible && l.PageSection != null && !l.PageSection.Disable)
                    .Include(l => l.PageSection!)
                        .ThenInclude(s => s.PageSectionLists!.Where(item => !item.Disable).OrderBy(item => item.SortOrder))
                    .Include(l => l.PageSection!)
                        .ThenInclude(s => s.PageForm)
                            .ThenInclude(f => f!.Fields!.OrderBy(fld => fld.SortOrder))
                    .ToListAsync();

                if (linkedSections.Count > 0)
                {
                    foreach (var link in linkedSections)
                    {
                        if (link.PageSection != null && !sections.Any(s => s.Id == link.PageSectionId))
                        {
                            var clone = link.PageSection;
                            clone.PageSortOrder = link.PageSortOrder;
                            clone.IsLinkedSection = true;
                            sections.Add(clone);
                        }
                    }
                    sections = sections.OrderBy(s => s.PageSortOrder).ToList();
                }
            }

            return Ok(ApiResponse<object>.SuccessResponse(sections, "Page layout sections retrieved."));
        }


        // ==========================================
        // 4. PUBLIC VISITOR TELEMETRY
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

            // Resolve page entity: first by PageId, and if not provided or Guid.Empty, by PageUrl/DirectUrl
            WebPage? page = null;
            if (request.PageId.HasValue && request.PageId.Value != Guid.Empty)
            {
                page = await _context.WebPages.FindAsync(request.PageId.Value);
            }

            if (page == null && !string.IsNullOrWhiteSpace(request.PageUrl))
            {
                var clean = request.PageUrl.Trim().ToLowerInvariant().Trim('/');
                if (clean.StartsWith("page/"))
                {
                    clean = clean.Substring(5).Trim('/');
                }

                var slashClean = "/" + clean;

                if (string.IsNullOrWhiteSpace(clean) || clean == "home" || clean == "index")
                {
                    page = await _context.WebPages.FirstOrDefaultAsync(p => p.IsHomePage || p.DirectUrl == "/" || p.DirectUrl == "home" || p.DirectUrl == "index");
                }
                else
                {
                    page = await _context.WebPages.FirstOrDefaultAsync(p => p.DirectUrl != null && 
                        (p.DirectUrl.ToLower() == clean || 
                         p.DirectUrl.ToLower() == slashClean || 
                         p.DirectUrl.ToLower().Trim('/') == clean ||
                         p.Title.ToLower() == clean));
                }
            }

            var log = new WebPageViewLog
            {
                WebPageId = page?.Id ?? request.PageId,
                PageUrl = request.PageUrl,
                PageTitle = request.PageTitle ?? page?.Title,
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

            if (page != null)
            {
                page.ViewCount += 1;
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
        /// <summary>
        /// Retrieves public active code injections (Head, Body Open, Footer) for the storefront and preview.
        /// Supports per-page dynamic SEO metadata resolution when pageSlug or webPageId is provided,
        /// and token preservation for real-time single-page application client routing.
        /// </summary>
        /// <param name="suiteCode">Optional theme suite code filter for preview simulation.</param>
        /// <param name="pageSlug">Optional direct URL slug of the active page.</param>
        /// <param name="webPageId">Optional unique identifier of the active page.</param>
        /// <param name="preserveTokens">True to retain page-level tokens for real-time client hydration.</param>
        /// <returns>Grouped active code injection tags.</returns>
        [HttpGet("code-injections")]
        public async Task<IActionResult> GetPublicCodeInjections(
            [FromQuery] string? suiteCode = null,
            [FromQuery] string? pageSlug = null,
            [FromQuery] Guid? webPageId = null,
            [FromQuery] bool preserveTokens = false)
        {
            var query = _context.SiteCodeInjectionTags.Where(t => t.IsActive);

            if (!string.IsNullOrWhiteSpace(suiteCode) && suiteCode.ToLowerInvariant() != "all")
            {
                var cleanSuite = suiteCode.Trim().ToLowerInvariant();
                query = query.Where(t => t.SuiteCode == null || t.SuiteCode == "global" || t.SuiteCode.ToLower() == cleanSuite);
            }

            var activeTags = await query
                .OrderBy(t => t.SortOrder)
                .ThenBy(t => t.CreatedAtUtc)
                .ToListAsync();

            // Resolve tenant brand settings to hydrate placeholders dynamically from MisWebsiteSettings
            var siteSetting = await _context.MisWebsiteSettings.AsNoTracking().FirstOrDefaultAsync();

            var brandName = !string.IsNullOrWhiteSpace(siteSetting?.BrandName)
                ? siteSetting.BrandName
                : (!string.IsNullOrWhiteSpace(siteSetting?.CompanyName)
                    ? siteSetting.CompanyName
                    : (!string.IsNullOrWhiteSpace(siteSetting?.WebsiteTitle) ? siteSetting.WebsiteTitle : "Workspace"));

            var faviconUrl = !string.IsNullOrWhiteSpace(siteSetting?.FaviconUrl)
                ? siteSetting.FaviconUrl
                : (!string.IsNullOrWhiteSpace(siteSetting?.CompanyIconUrl) && siteSetting.CompanyIconUrl != "/favicon.ico"
                    ? siteSetting.CompanyIconUrl
                    : (!string.IsNullOrWhiteSpace(siteSetting?.CompanyLogoUrl) ? siteSetting.CompanyLogoUrl : "/favicon.ico"));

            var appleTouchIconUrl = !string.IsNullOrWhiteSpace(siteSetting?.CompanyIconUrl)
                ? siteSetting.CompanyIconUrl
                : faviconUrl;

            var brandIconUrl = !string.IsNullOrWhiteSpace(siteSetting?.CompanyIconUrl)
                ? siteSetting.CompanyIconUrl
                : (!string.IsNullOrWhiteSpace(siteSetting?.FaviconUrl)
                    ? siteSetting.FaviconUrl
                    : (!string.IsNullOrWhiteSpace(siteSetting?.LogoUrl) ? siteSetting.LogoUrl : (!string.IsNullOrWhiteSpace(siteSetting?.CompanyLogoUrl) ? siteSetting.CompanyLogoUrl : "/favicon.ico")));

            var logoUrl = !string.IsNullOrWhiteSpace(siteSetting?.LogoUrl)
                ? siteSetting.LogoUrl
                : (!string.IsNullOrWhiteSpace(siteSetting?.CompanyLogoUrl) ? siteSetting.CompanyLogoUrl : faviconUrl);

            var defaultDescription = siteSetting?.CompanyDescription ?? siteSetting?.Tagline ?? string.Empty;
            var baseUrl = $"{Request.Scheme}://{Request.Host}";
            var domainName = Request.Host.Value;
            var themeColor = "#0050E5";

            // Attempt to resolve target page metadata if pageSlug or webPageId is specified
            WebPage? targetPage = null;
            if (webPageId.HasValue && webPageId.Value != Guid.Empty)
            {
                targetPage = await _context.WebPages.AsNoTracking().FirstOrDefaultAsync(p => p.Id == webPageId.Value);
            }
            else if (!string.IsNullOrWhiteSpace(pageSlug))
            {
                var cleanSlug = pageSlug.Trim().Trim('/').ToLowerInvariant();
                var slashSlug = "/" + cleanSlug;
                targetPage = await _context.WebPages.AsNoTracking().FirstOrDefaultAsync(p => p.DirectUrl != null &&
                    (p.DirectUrl.ToLower() == cleanSlug || p.DirectUrl.ToLower() == slashSlug));
            }

            var resolvedTitle = targetPage != null
                ? (!string.IsNullOrWhiteSpace(targetPage.MetaTitle) ? targetPage.MetaTitle : (!string.IsNullOrWhiteSpace(targetPage.Title) ? targetPage.Title : brandName))
                : (!string.IsNullOrWhiteSpace(siteSetting?.WebsiteTitle) ? siteSetting.WebsiteTitle : brandName);

            var resolvedDescription = targetPage != null && !string.IsNullOrWhiteSpace(targetPage.MetaDescription)
                ? targetPage.MetaDescription
                : defaultDescription;

            var resolvedKeywords = targetPage != null && !string.IsNullOrWhiteSpace(targetPage.MetaKeywords)
                ? targetPage.MetaKeywords
                : (targetPage?.Tags ?? string.Empty);

            var resolvedImageUrl = targetPage != null && !string.IsNullOrWhiteSpace(targetPage.ImageUrl)
                ? targetPage.ImageUrl
                : brandIconUrl;

            var resolvedCanonicalUrl = targetPage != null && !string.IsNullOrWhiteSpace(targetPage.DirectUrl) && targetPage.DirectUrl != "/"
                ? $"{baseUrl}/{targetPage.DirectUrl.TrimStart('/')}"
                : baseUrl;

            // Hydrate dynamic tokens so client receives valid URLs with zero empty hrefs
            foreach (var tag in activeTags)
            {
                if (string.IsNullOrWhiteSpace(tag.Content)) continue;

                var hydrated = tag.Content
                    .Replace("{{ FaviconUrl }}", faviconUrl, StringComparison.OrdinalIgnoreCase)
                    .Replace("{{ Favicon }}", faviconUrl, StringComparison.OrdinalIgnoreCase)
                    .Replace("{{ AppleTouchIconUrl }}", appleTouchIconUrl, StringComparison.OrdinalIgnoreCase)
                    .Replace("{{ Icon32Url }}", faviconUrl, StringComparison.OrdinalIgnoreCase)
                    .Replace("{{ Icon16Url }}", faviconUrl, StringComparison.OrdinalIgnoreCase)
                    .Replace("{{ IconUrl }}", brandIconUrl, StringComparison.OrdinalIgnoreCase)
                    .Replace("{{ LogoUrl }}", logoUrl, StringComparison.OrdinalIgnoreCase)
                    .Replace("{{ BrandName }}", brandName, StringComparison.OrdinalIgnoreCase)
                    .Replace("{{ ThemeColor }}", themeColor, StringComparison.OrdinalIgnoreCase)
                    .Replace("{{ DomainName }}", domainName, StringComparison.OrdinalIgnoreCase);

                if (!preserveTokens)
                {
                    hydrated = hydrated
                        .Replace("{{ Title }}", resolvedTitle, StringComparison.OrdinalIgnoreCase)
                        .Replace("{{ MetaDescription }}", resolvedDescription, StringComparison.OrdinalIgnoreCase)
                        .Replace("{{ Description }}", resolvedDescription, StringComparison.OrdinalIgnoreCase)
                        .Replace("{{ Keywords }}", resolvedKeywords, StringComparison.OrdinalIgnoreCase)
                        .Replace("{{ MetaKeywords }}", resolvedKeywords, StringComparison.OrdinalIgnoreCase)
                        .Replace("{{ CanonicalUrl }}", resolvedCanonicalUrl, StringComparison.OrdinalIgnoreCase)
                        .Replace("{{ ImageUrl }}", resolvedImageUrl, StringComparison.OrdinalIgnoreCase)
                        .Replace("{{ Author }}", brandName, StringComparison.OrdinalIgnoreCase);
                }

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
        /// Retrieves the public Google reCAPTCHA site key for client form rendering.
        /// </summary>
        [HttpGet("recaptcha-config")]
        public IActionResult GetRecaptchaConfig()
        {
            return Ok(ApiResponse<object>.SuccessResponse(new
            {
                siteKey = _recaptchaService.SiteKey
            }, "Google reCAPTCHA configuration retrieved successfully."));
        }

        /// <summary>
        /// Retrieves public schema and field definitions for an active website form.
        /// Used by public website sections (Contact Us, Newsletter, Service Request, etc.).
        /// Normalizes hyphens, underscores, and canonical form keys.
        /// </summary>
        /// <param name="formKey">The programmatic key of the form (e.g. "contact-us", "Contact_Us", "newsletter", "service-request").</param>
        /// <returns>Form schema, ordered interactive fields, and reCAPTCHA site key.</returns>
        [HttpGet("forms/{formKey}")]
        public async Task<IActionResult> GetPublicFormByKey(string formKey)
        {
            if (string.IsNullOrWhiteSpace(formKey))
            {
                return BadRequest(ApiResponse.FailureResponse("Form key is required."));
            }

            var form = await FindMatchingFormAsync(formKey);
            if (form == null)
            {
                return NotFound(ApiResponse.FailureResponse($"Active form '{formKey.Trim()}' was not found."));
            }

            var publicForm = new
            {
                form.Id,
                form.Title,
                form.FormKey,
                form.Description,
                form.SubmitButtonText,
                form.SuccessMessage,
                recaptchaSiteKey = _recaptchaService.SiteKey,
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
        /// Validates Google reCAPTCHA challenge, required fields, maps synonyms, captures visitor telemetry, and returns success message.
        /// </summary>
        /// <param name="formKey">The programmatic key of the form to submit to.</param>
        /// <param name="payload">Visitor submitted key-value data, reCAPTCHA token, and source URL.</param>
        /// <returns>Confirmation and custom form success message.</returns>
        [HttpPost("forms/{formKey}/submit")]
        public async Task<IActionResult> SubmitPublicForm(string formKey, [FromBody] PublicFormSubmissionPayload payload)
        {
            if (string.IsNullOrWhiteSpace(formKey))
            {
                return BadRequest(ApiResponse.FailureResponse("Form key is required."));
            }

            var form = await FindMatchingFormAsync(formKey);
            if (form == null)
            {
                return NotFound(ApiResponse.FailureResponse($"Active form '{formKey.Trim()}' was not found."));
            }

            var data = payload?.Data ?? new Dictionary<string, object>();

            var clientIp = HttpContext.Connection.RemoteIpAddress?.ToString();

            // 1. Compulsory Google reCAPTCHA Verification across ALL public and CMS forms
            var recaptchaToken = payload?.RecaptchaToken;
            if (string.IsNullOrWhiteSpace(recaptchaToken) && data.TryGetValue("g-recaptcha-response", out var gToken) && gToken != null)
            {
                recaptchaToken = gToken.ToString();
            }
            if (string.IsNullOrWhiteSpace(recaptchaToken) && data.TryGetValue("recaptchaToken", out var rToken) && rToken != null)
            {
                recaptchaToken = rToken.ToString();
            }

            var isCaptchaValid = await _recaptchaService.ValidateTokenAsync(recaptchaToken, clientIp);
            if (!isCaptchaValid)
            {
                return BadRequest(ApiResponse.FailureResponse("Security verification failed. Please complete the reCAPTCHA challenge and try again."));
            }

            // 2. Validate all required fields with synonym support
            var missingRequiredFields = new List<string>();
            foreach (var field in form.Fields.Where(f => f.IsRequired))
            {
                var val = ResolveFieldValue(field.FieldKey, data);
                if (val == null || string.IsNullOrWhiteSpace(val.ToString()))
                {
                    missingRequiredFields.Add(field.Label);
                }
                else
                {
                    // Ensure canonical key is populated in data payload
                    data[field.FieldKey] = val;
                }
            }

            if (missingRequiredFields.Count > 0)
            {
                return BadRequest(ApiResponse.FailureResponse(
                    $"Please fill in all required fields: {string.Join(", ", missingRequiredFields)}"));
            }

            // Remove reCAPTCHA token from persistent submission data if present to keep records clean
            data.Remove("g-recaptcha-response");
            data.Remove("recaptchaToken");

            var submission = new PageFormSubmission
            {
                Id = Guid.NewGuid(),
                PageFormId = form.Id,
                DataJson = System.Text.Json.JsonSerializer.Serialize(data),
                SourcePageUrl = payload?.SourcePageUrl?.Trim(),
                Status = "New",
                SubmittedAtUtc = DateTime.UtcNow,
                IpAddress = clientIp,
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

        /// <summary>
        /// Locates an active PageForm by key, handling hyphen/underscore variations and canonical prefixes.
        /// </summary>
        private async Task<PageForm?> FindMatchingFormAsync(string formKey)
        {
            if (string.IsNullOrWhiteSpace(formKey)) return null;

            var raw = formKey.Trim();
            var lower = raw.ToLowerInvariant();
            var withUnderscore = lower.Replace("-", "_");
            var withHyphen = lower.Replace("_", "-");
            var alphanumericOnly = new string(lower.Where(char.IsLetterOrDigit).ToArray());

            var forms = await _context.PageForms
                .Include(f => f.Fields.OrderBy(fl => fl.SortOrder))
                .Where(f => f.IsActive)
                .ToListAsync();

            return forms.FirstOrDefault(f =>
            {
                var fkLower = f.FormKey.ToLowerInvariant();
                var fkUnderscore = fkLower.Replace("-", "_");
                var fkHyphen = fkLower.Replace("_", "-");
                var fkAlpha = new string(fkLower.Where(char.IsLetterOrDigit).ToArray());

                return fkLower == lower
                    || fkUnderscore == withUnderscore
                    || fkHyphen == withHyphen
                    || fkAlpha == alphanumericOnly
                    || (lower.Contains("contact") && fkLower.Contains("contact"))
                    || (lower.Contains("newsletter") && fkLower.Contains("newsletter"))
                    || (lower.Contains("service") && fkLower.Contains("service"));
            });
        }

        /// <summary>
        /// Resolves field values from visitor submission payload supporting common HTML input name synonyms.
        /// </summary>
        private static object? ResolveFieldValue(string fieldKey, Dictionary<string, object> dict)
        {
            if (dict.TryGetValue(fieldKey, out var direct) && direct != null && !string.IsNullOrWhiteSpace(direct.ToString()))
                return direct;

            var entry = dict.FirstOrDefault(kvp => string.Equals(kvp.Key, fieldKey, StringComparison.OrdinalIgnoreCase));
            if (entry.Value != null && !string.IsNullOrWhiteSpace(entry.Value.ToString()))
                return entry.Value;

            var keyLower = fieldKey.ToLowerInvariant().Replace("-", "_");
            if (keyLower is "full_name" or "name")
            {
                var match = dict.FirstOrDefault(kvp => kvp.Key.ToLowerInvariant() is "name" or "fullname" or "full_name" or "contact_name" or "client_name" or "user_name" or "your_name");
                if (match.Value != null && !string.IsNullOrWhiteSpace(match.Value.ToString())) return match.Value;
            }
            else if (keyLower is "email")
            {
                var match = dict.FirstOrDefault(kvp => kvp.Key.ToLowerInvariant() is "email" or "work_email" or "workemail" or "contact_email" or "email_address");
                if (match.Value != null && !string.IsNullOrWhiteSpace(match.Value.ToString())) return match.Value;
            }
            else if (keyLower is "phone" or "phone_number")
            {
                var match = dict.FirstOrDefault(kvp => kvp.Key.ToLowerInvariant() is "phone" or "phone_number" or "phonenumber" or "tel" or "telephone" or "mobile");
                if (match.Value != null && !string.IsNullOrWhiteSpace(match.Value.ToString())) return match.Value;
            }
            else if (keyLower is "subject")
            {
                var match = dict.FirstOrDefault(kvp => kvp.Key.ToLowerInvariant() is "subject" or "title" or "topic" or "inquiry");
                if (match.Value != null && !string.IsNullOrWhiteSpace(match.Value.ToString())) return match.Value;
            }
            else if (keyLower is "message")
            {
                var match = dict.FirstOrDefault(kvp => kvp.Key.ToLowerInvariant() is "message" or "comments" or "comment" or "notes" or "details" or "description" or "body" or "your_message");
                if (match.Value != null && !string.IsNullOrWhiteSpace(match.Value.ToString())) return match.Value;
            }
            else if (keyLower is "organization_name" or "company")
            {
                var match = dict.FirstOrDefault(kvp => kvp.Key.ToLowerInvariant() is "company" or "organization" or "organization_name" or "org_name" or "firm");
                if (match.Value != null && !string.IsNullOrWhiteSpace(match.Value.ToString())) return match.Value;
            }
            else if (keyLower is "service_required" or "service")
            {
                var match = dict.FirstOrDefault(kvp => kvp.Key.ToLowerInvariant() is "service_required" or "service" or "scope" or "service_type");
                if (match.Value != null && !string.IsNullOrWhiteSpace(match.Value.ToString())) return match.Value;
            }

            return null;
        }

        // ==========================================
        // 10. PUBLIC THEME & ACTIVE TEMPLATES
        // ==========================================

        /// <summary>
        /// Retrieves all currently active UI templates installed for this tenant.
        /// Delivers layout templates (menu, hero, body, footer, breadcrumb) to public visitors
        /// without requiring administrative authentication.
        /// </summary>
        /// <returns>A collection of active UI templates ordered by category.</returns>
        [HttpGet("theme/active-templates")]
        public async Task<IActionResult> GetActiveThemeTemplates()
        {
            // Query active installed templates from the tenant database
            var activeTemplates = await _context.TenantInstalledTemplates
                .AsNoTracking()
                .Where(t => t.IsActive)
                .OrderBy(t => t.CategoryKey)
                .ThenBy(t => t.InstalledUtc)
                .Select(t => new
                {
                    t.Id,
                    t.TemplateKey,
                    t.CategoryKey,
                    t.Name,
                    t.VariantCode,
                    t.HtmlTemplate,
                    t.CssStyles,
                    t.JsScript,
                    t.DefaultContentJson,
                    t.InstalledVersion
                })
                .ToListAsync();

            return Ok(ApiResponse<object>.SuccessResponse(activeTemplates, "Active website theme templates retrieved successfully."));
        }

        // ==========================================
        // 11. PUBLIC BLOG ARTICLES & ARCHIVE
        // ==========================================

        /// <summary>
        /// Retrieves published blog articles for the public website blog archive or homepage widget.
        /// </summary>
        /// <param name="categoryId">Optional blog category ID to filter by.</param>
        /// <param name="limit">Optional maximum number of articles to return.</param>
        /// <returns>List of published blog articles with category metadata.</returns>
        [HttpGet("blogs")]
        public async Task<IActionResult> GetPublishedBlogs([FromQuery] Guid? categoryId = null, [FromQuery] int? limit = null)
        {
            // Fetch published articles ordered chronologically descending
            var query = _context.Blogs
                .Include(b => b.BlogCategory)
                .AsNoTracking()
                .Where(b => b.Publish);

            if (categoryId.HasValue)
            {
                query = query.Where(b => b.BlogCategoryId == categoryId.Value);
            }

            query = query.OrderByDescending(b => b.Date).ThenBy(b => b.SortOrder);

            if (limit.HasValue && limit.Value > 0)
            {
                query = query.Take(limit.Value);
            }

            var blogs = await query.ToListAsync();
            return Ok(ApiResponse<object>.SuccessResponse(blogs, "Published blog articles retrieved successfully."));
        }

        /// <summary>
        /// Retrieves a single published blog article by its ID for reader view.
        /// </summary>
        /// <param name="id">Unique identifier of the blog article.</param>
        /// <returns>Full blog article details if published; otherwise 404 NotFound.</returns>
        [HttpGet("blogs/{id:guid}")]
        public async Task<IActionResult> GetPublishedBlogById(Guid id)
        {
            var blog = await _context.Blogs
                .Include(b => b.BlogCategory)
                .AsNoTracking()
                .FirstOrDefaultAsync(b => b.Id == id && b.Publish);

            if (blog == null)
            {
                return NotFound(ApiResponse<object>.FailureResponse($"Published article with ID '{id}' was not found."));
            }

            return Ok(ApiResponse<object>.SuccessResponse(blog, "Blog article retrieved successfully."));
        }

        /// <summary>
        /// Retrieves the public brand identity, contact channels, and UI configuration settings for visitor UI rendering.
        /// </summary>
        /// <returns>Public-safe UI settings record.</returns>
        [HttpGet("ui-settings")]
        public async Task<IActionResult> GetPublicUiSettings()
        {
            var setting = await _context.MisWebsiteSettings.AsNoTracking().FirstOrDefaultAsync();
            var channels = await _context.MisWebsiteContactChannels
                .AsNoTracking()
                .Where(c => c.IsPublished)
                .OrderBy(c => c.SortOrder)
                .ToListAsync();

            // Contact details are strictly derived from the dedicated MisWebsiteContactChannels table
            var primaryEmail = channels.FirstOrDefault(c => c.ChannelType == ContactChannelTypes.Email && c.IsDefault)?.Value
                ?? channels.FirstOrDefault(c => c.ChannelType == ContactChannelTypes.Email)?.Value
                ?? string.Empty;

            var primaryPhone = channels.FirstOrDefault(c => c.ChannelType == ContactChannelTypes.Phone && c.IsDefault)?.Value
                ?? channels.FirstOrDefault(c => c.ChannelType == ContactChannelTypes.Phone)?.Value
                ?? string.Empty;

            var primaryAddress = channels.FirstOrDefault(c => c.ChannelType == ContactChannelTypes.Address && c.IsDefault)?.Value
                ?? channels.FirstOrDefault(c => c.ChannelType == ContactChannelTypes.Address)?.Value
                ?? string.Empty;

            var primaryHours = channels.FirstOrDefault(c => (c.ChannelType == "Hours" || c.ChannelType == "WorkingHours") && c.IsDefault)?.Value
                ?? channels.FirstOrDefault(c => c.ChannelType == "Hours" || c.ChannelType == "WorkingHours")?.Value
                ?? string.Empty;

            if (setting != null)
            {
                var payload = new
                {
                    tenantKey = _tenantProvider?.CurrentTenant,
                    setting.Id,
                    setting.BrandName,
                    setting.CompanyName,
                    setting.CompanyNameAbbreviation,
                    setting.SiteTitle,
                    setting.WebsiteTitle,
                    setting.DashboardTitle,
                    setting.Tagline,
                    setting.CompanyDescription,
                    setting.FooterDescription,
                    setting.CompanyWebsiteLink,
                    setting.LogoUrl,
                    setting.CompanyLogoUrl,
                    setting.WhiteLogoUrl,
                    setting.CompanyWhiteLogoUrl,
                    setting.FaviconUrl,
                    setting.CompanyIconUrl,
                    setting.LoginTitle,
                    setting.LoginButtonText,
                    setting.ActivateLogin,
                    setting.ActivateLoginInMenu,
                    setting.ActivateLoginInFooter,
                    contactEmail = primaryEmail,
                    supportEmail = primaryEmail,
                    primaryPhone = primaryPhone,
                    address = primaryAddress,
                    workingHours = primaryHours,
                    setting.CopyrightNotice,
                    setting.EnableComingSoon,
                    setting.RemovePlatformWatermark,
                    recaptchaSiteKey = _recaptchaService.SiteKey,
                    contactChannels = channels,
                    ribbonTicker = new
                    {
                        enabled = setting.EnableBreakingNewsRibon,
                        title = !string.IsNullOrWhiteSpace(setting.BreakingNewsRibonTitle) ? setting.BreakingNewsRibonTitle : "BREAKING NEWS",
                        position = !string.IsNullOrWhiteSpace(setting.BreakingNewsRibonPosition) ? setting.BreakingNewsRibonPosition : "after_menu"
                    },
                    cookieConsent = new
                    {
                        enabled = setting.EnableCookieConsent,
                        title = !string.IsNullOrWhiteSpace(setting.CookieConsentTitle) ? setting.CookieConsentTitle : "Cookie Preferences & Privacy",
                        message = !string.IsNullOrWhiteSpace(setting.CookieConsentMessage) ? setting.CookieConsentMessage : "We use cookies to optimize site performance, analyze traffic, and ensure you get the best browsing experience on our website.",
                        acceptText = !string.IsNullOrWhiteSpace(setting.CookieConsentAcceptText) ? setting.CookieConsentAcceptText : "Accept All",
                        declineText = !string.IsNullOrWhiteSpace(setting.CookieConsentDeclineText) ? setting.CookieConsentDeclineText : "Decline",
                        policyUrl = !string.IsNullOrWhiteSpace(setting.CookieConsentPolicyUrl) ? setting.CookieConsentPolicyUrl : "/privacy-policy"
                    },
                    whatsAppChat = new
                    {
                        enabled = setting.EnableWhatsAppChat,
                        number = setting.WhatsAppNumber ?? string.Empty,
                        promptMessage = !string.IsNullOrWhiteSpace(setting.WhatsAppPromptMessage) ? setting.WhatsAppPromptMessage : "Hello! I have an inquiry regarding your services.",
                        widgetTitle = !string.IsNullOrWhiteSpace(setting.WhatsAppWidgetTitle) ? setting.WhatsAppWidgetTitle : "Chat with Us",
                        widgetSubtitle = !string.IsNullOrWhiteSpace(setting.WhatsAppWidgetSubtitle) ? setting.WhatsAppWidgetSubtitle : "Typically replies within minutes"
                    }
                };

                return Ok(ApiResponse<object>.SuccessResponse(payload, "Public UI settings retrieved."));
            }

            var defaultSetting = new
            {
                tenantKey = _tenantProvider?.CurrentTenant,
                BrandName = string.Empty,
                SiteTitle = string.Empty,
                Tagline = string.Empty,
                contactEmail = primaryEmail,
                supportEmail = primaryEmail,
                primaryPhone = primaryPhone,
                address = primaryAddress,
                workingHours = primaryHours,
                EnableComingSoon = false,
                RemovePlatformWatermark = false,
                recaptchaSiteKey = _recaptchaService.SiteKey,
                contactChannels = channels,
                ribbonTicker = new
                {
                    enabled = false,
                    title = "BREAKING NEWS",
                    position = "after_menu"
                },
                cookieConsent = new
                {
                    enabled = true,
                    title = "Cookie Preferences & Privacy",
                    message = "We use cookies to optimize site performance, analyze traffic, and ensure you get the best browsing experience on our website.",
                    acceptText = "Accept All",
                    declineText = "Decline",
                    policyUrl = "/privacy-policy"
                },
                whatsAppChat = new
                {
                    enabled = false,
                    number = string.Empty,
                    promptMessage = "Hello! I have an inquiry regarding your services.",
                    widgetTitle = "Chat with Us",
                    widgetSubtitle = "Typically replies within minutes"
                }
            };

            return Ok(ApiResponse<object>.SuccessResponse(defaultSetting, "Default public UI settings retrieved."));
        }

        /// <summary>
        /// Serves dynamic HTML pre-populated with OpenGraph (og:title, og:description, og:image)
        /// and Twitter Card meta tags for social media scrapers (WhatsApp, Facebook, Twitter/X, Telegram, LinkedIn, Discord).
        /// Ensures rich link cards display the tenant's brand name, logo thumbnail, and description when shared.
        /// </summary>
        /// <returns>The complete HTML shell with injected OpenGraph and Twitter Card metadata.</returns>
        [HttpGet("social-preview")]
        [Produces("text/html")]
        public async Task<IActionResult> GetSocialPreview()
        {
            var setting = await _context.MisWebsiteSettings.AsNoTracking().FirstOrDefaultAsync();
            var brandName = !string.IsNullOrWhiteSpace(setting?.BrandName)
                ? setting.BrandName.Trim()
                : (!string.IsNullOrWhiteSpace(setting?.CompanyName) ? setting.CompanyName.Trim() : "Workspace");

            var title = !string.IsNullOrWhiteSpace(setting?.WebsiteTitle)
                ? setting.WebsiteTitle.Trim()
                : (!string.IsNullOrWhiteSpace(setting?.SiteTitle) ? setting.SiteTitle.Trim() : brandName);

            var description = !string.IsNullOrWhiteSpace(setting?.CompanyDescription)
                ? setting.CompanyDescription.Trim()
                : (!string.IsNullOrWhiteSpace(setting?.FooterDescription)
                    ? setting.FooterDescription.Trim()
                    : (!string.IsNullOrWhiteSpace(setting?.Tagline) ? setting.Tagline.Trim() : $"{brandName} Official Workspace"));

            // Prioritize square icon (CompanyIconUrl) for social preview cards so it doesn't get cropped
            var imageUrl = !string.IsNullOrWhiteSpace(setting?.CompanyIconUrl)
                ? setting.CompanyIconUrl.Trim()
                : (!string.IsNullOrWhiteSpace(setting?.CompanyLogoUrl)
                    ? setting.CompanyLogoUrl.Trim()
                    : (!string.IsNullOrWhiteSpace(setting?.LogoUrl) ? setting.LogoUrl.Trim() : "https://ozikol.cloud/assets/images/ozikol.png"));

            var faviconUrl = !string.IsNullOrWhiteSpace(setting?.FaviconUrl) ? setting.FaviconUrl.Trim() : imageUrl;

            var host = Request.Headers["X-Forwarded-Host"].FirstOrDefault()
                ?? Request.Headers["X-Tenant-Custom-Domain"].FirstOrDefault()
                ?? Request.Host.Value;

            var scheme = Request.Headers["X-Forwarded-Proto"].FirstOrDefault() ?? Request.Scheme;
            var canonicalUrl = $"{scheme}://{host}/";

            // Locate client index.html to inject into
            var clientIndexPath = "/var/www/ozikol-client/index.html";
            if (!System.IO.File.Exists(clientIndexPath))
            {
                clientIndexPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "index.html");
            }

            string baseHtml;
            if (System.IO.File.Exists(clientIndexPath))
            {
                baseHtml = await System.IO.File.ReadAllTextAsync(clientIndexPath);
            }
            else
            {
                baseHtml = "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\"><title></title></head><body><app-root></app-root></body></html>";
            }

            var safeTitle = System.Net.WebUtility.HtmlEncode(title);
            var safeDesc = System.Net.WebUtility.HtmlEncode(description);
            var safeBrand = System.Net.WebUtility.HtmlEncode(brandName);

            var metaTags = new StringBuilder();
            metaTags.AppendLine($"  <title>{safeTitle}</title>");
            metaTags.AppendLine($"  <meta name=\"description\" content=\"{safeDesc}\" />");
            metaTags.AppendLine($"  <link rel=\"icon\" href=\"{faviconUrl}\" />");
            metaTags.AppendLine($"  <link rel=\"shortcut icon\" href=\"{faviconUrl}\" />");
            metaTags.AppendLine($"  <link rel=\"apple-touch-icon\" href=\"{imageUrl}\" />");
            metaTags.AppendLine($"  <link rel=\"canonical\" href=\"{canonicalUrl}\" />");
            metaTags.AppendLine();
            metaTags.AppendLine("  <!-- Open Graph Protocol (WhatsApp, Facebook, LinkedIn, Telegram, Discord, Slack) -->");
            metaTags.AppendLine("  <meta property=\"og:type\" content=\"website\" />");
            metaTags.AppendLine($"  <meta property=\"og:site_name\" content=\"{safeBrand}\" />");
            metaTags.AppendLine($"  <meta property=\"og:title\" content=\"{safeTitle}\" />");
            metaTags.AppendLine($"  <meta property=\"og:description\" content=\"{safeDesc}\" />");
            metaTags.AppendLine($"  <meta property=\"og:image\" content=\"{imageUrl}\" />");
            metaTags.AppendLine($"  <meta property=\"og:image:secure_url\" content=\"{imageUrl}\" />");
            metaTags.AppendLine("  <meta property=\"og:image:width\" content=\"1200\" />");
            metaTags.AppendLine("  <meta property=\"og:image:height\" content=\"630\" />");
            metaTags.AppendLine($"  <meta property=\"og:url\" content=\"{canonicalUrl}\" />");
            metaTags.AppendLine();
            metaTags.AppendLine("  <!-- Twitter / X Cards -->");
            metaTags.AppendLine("  <meta name=\"twitter:card\" content=\"summary_large_image\" />");
            metaTags.AppendLine($"  <meta name=\"twitter:title\" content=\"{safeTitle}\" />");
            metaTags.AppendLine($"  <meta name=\"twitter:description\" content=\"{safeDesc}\" />");
            metaTags.AppendLine($"  <meta name=\"twitter:image\" content=\"{imageUrl}\" />");

            // Strip existing empty <title> tag
            var injectedHtml = System.Text.RegularExpressions.Regex.Replace(
                baseHtml,
                @"<title>.*?</title>",
                string.Empty,
                System.Text.RegularExpressions.RegexOptions.IgnoreCase | System.Text.RegularExpressions.RegexOptions.Singleline);

            if (injectedHtml.Contains("<head>", StringComparison.OrdinalIgnoreCase))
            {
                injectedHtml = injectedHtml.Replace("<head>", "<head>\n" + metaTags.ToString(), StringComparison.OrdinalIgnoreCase);
            }
            else
            {
                injectedHtml = metaTags.ToString() + injectedHtml;
            }

            return Content(injectedHtml, "text/html; charset=utf-8");
        }

        /// <summary>
        /// Retrieves active ticker items from published blog articles and web pages flagged with AddToRibon.
        /// Ordered by RibonSortOrder ascending.
        /// </summary>
        /// <returns>Collection of marquee ticker items.</returns>
        [HttpGet("ticker")]
        public async Task<IActionResult> GetPublicTicker()
        {
            var blogItems = await _context.Blogs
                .AsNoTracking()
                .Where(b => b.Publish && b.AddToRibon)
                .Select(b => new
                {
                    id = b.Id,
                    type = "blog",
                    title = !string.IsNullOrWhiteSpace(b.RibonCustomDisplayTitle) ? b.RibonCustomDisplayTitle : (b.Title ?? string.Empty),
                    url = $"/blog/{b.Id}",
                    sortOrder = b.RibonSortOrder,
                    createdAtUtc = b.Date
                })
                .ToListAsync();

            var pageItems = await _context.WebPages
                .AsNoTracking()
                .Where(p => p.Publish && p.AddToRibon)
                .Select(p => new
                {
                    id = p.Id,
                    type = "page",
                    title = !string.IsNullOrWhiteSpace(p.RibonCustomDisplayTitle) ? p.RibonCustomDisplayTitle : p.Title,
                    url = !string.IsNullOrWhiteSpace(p.DirectUrl) ? (p.DirectUrl.StartsWith("/") ? p.DirectUrl : $"/{p.DirectUrl}") : $"/page/{p.Id}",
                    sortOrder = p.RibonSortOrder,
                    createdAtUtc = p.CreatedAtUtc
                })
                .ToListAsync();

            var combined = blogItems
                .Concat(pageItems)
                .OrderBy(item => item.sortOrder)
                .ThenByDescending(item => item.createdAtUtc)
                .ToList();

            // Fallback: If tenant has not yet explicitly flagged any blog or page with AddToRibon,
            // stream the latest published blogs and published pages so the marquee ticker displays immediately.
            if (combined.Count == 0)
            {
                var fallbackBlogs = await _context.Blogs
                    .AsNoTracking()
                    .Where(b => b.Publish)
                    .OrderByDescending(b => b.Date)
                    .Take(5)
                    .Select(b => new
                    {
                        id = b.Id,
                        type = "blog",
                        title = b.Title ?? string.Empty,
                        url = $"/blog/{b.Id}",
                        sortOrder = 0,
                        createdAtUtc = b.Date
                    })
                    .ToListAsync();

                var fallbackPages = await _context.WebPages
                    .AsNoTracking()
                    .Where(p => p.Publish && !p.IsHomePage)
                    .OrderBy(p => p.SortOrder)
                    .Take(5)
                    .Select(p => new
                    {
                        id = p.Id,
                        type = "page",
                        title = p.Title,
                        url = !string.IsNullOrWhiteSpace(p.DirectUrl) ? (p.DirectUrl.StartsWith("/") ? p.DirectUrl : $"/{p.DirectUrl}") : $"/page/{p.Id}",
                        sortOrder = 0,
                        createdAtUtc = p.CreatedAtUtc
                    })
                    .ToListAsync();

                combined = fallbackBlogs
                    .Concat(fallbackPages)
                    .ToList();
            }

            return Ok(ApiResponse<object>.SuccessResponse(combined, "Ticker items retrieved successfully."));
        }

        /// <summary>
        /// Retrieves published website contact channels and social media profiles.
        /// </summary>
        /// <returns>List of published contact channels ordered by sort index.</returns>
        [HttpGet("contact-channels")]
        public async Task<IActionResult> GetPublishedContactChannels()
        {
            var channels = await _context.MisWebsiteContactChannels
                .AsNoTracking()
                .Where(c => c.IsPublished)
                .OrderBy(c => c.SortOrder)
                .ToListAsync();

            return Ok(ApiResponse<object>.SuccessResponse(channels, "Published contact channels retrieved."));
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

        /// <summary>
        /// Optional Google reCAPTCHA response token from client challenge widget.
        /// </summary>
        public string? RecaptchaToken { get; set; }
    }
}
