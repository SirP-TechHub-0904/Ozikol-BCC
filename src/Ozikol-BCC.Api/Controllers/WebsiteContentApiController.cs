using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Api.Models;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Infrastructure.Services.Recaptcha;
using Ozikol_BCC.Persistence.EF.SQL;

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
    [Tags("Website Content Delivery - Public UI")]
    public class WebsiteContentApiController : ControllerBase
    {
        private readonly DashboardDbContext _context;
        private readonly IRecaptchaService _recaptchaService;

        public WebsiteContentApiController(DashboardDbContext context, IRecaptchaService recaptchaService)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _recaptchaService = recaptchaService ?? throw new ArgumentNullException(nameof(recaptchaService));
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
        /// <param name="slug">The direct URL slug of the page.</param>
        /// <returns>Published page entity with ordered sections, lists, and forms.</returns>
        [HttpGet("pages/slug/{slug}")]
        public async Task<IActionResult> GetPublishedPageBySlug(string slug)
        {
            var cleanSlug = (slug ?? string.Empty).Trim().ToLowerInvariant().Trim('/');
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

            // Increment public page view counter
            page.ViewCount++;
            await _context.SaveChangesAsync();

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

            return Ok(ApiResponse<object>.SuccessResponse(page, "Page details retrieved."));
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

            if (webPageId.HasValue)
            {
                query = query.Where(s => s.WebPageId == webPageId.Value).OrderBy(s => s.PageSortOrder);
            }
            else if (pageSet == "home" || string.IsNullOrEmpty(pageSet))
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

            var sections = await query.ToListAsync();
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
        /// <summary>
        /// Retrieves public active code injections (Head, Body Open, Footer) for the storefront and preview.
        /// </summary>
        /// <param name="suiteCode">Optional theme suite code filter for preview simulation.</param>
        /// <returns>Grouped active code injection tags.</returns>
        [HttpGet("code-injections")]
        public async Task<IActionResult> GetPublicCodeInjections([FromQuery] string? suiteCode = null)
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
                    : (!string.IsNullOrWhiteSpace(siteSetting?.WebsiteTitle) ? siteSetting.WebsiteTitle : "Ozikol"));

            var faviconUrl = !string.IsNullOrWhiteSpace(siteSetting?.FaviconUrl)
                ? siteSetting.FaviconUrl
                : (!string.IsNullOrWhiteSpace(siteSetting?.CompanyIconUrl) && siteSetting.CompanyIconUrl != "/favicon.ico"
                    ? siteSetting.CompanyIconUrl
                    : (!string.IsNullOrWhiteSpace(siteSetting?.CompanyLogoUrl) ? siteSetting.CompanyLogoUrl : string.Empty));

            var logoUrl = !string.IsNullOrWhiteSpace(siteSetting?.LogoUrl)
                ? siteSetting.LogoUrl
                : (!string.IsNullOrWhiteSpace(siteSetting?.CompanyLogoUrl) ? siteSetting.CompanyLogoUrl : faviconUrl);

            var description = siteSetting?.CompanyDescription ?? siteSetting?.Tagline ?? string.Empty;
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

            // 1. Dynamic Google reCAPTCHA Verification
            // Single-field email forms (e.g. newsletter subscriptions, waitlists, alert captures) are compact inline inputs designed for narrow footers/sidebars where reCAPTCHA boxes do not fit.
            // Multi-field forms (2+ fields: contact inquiries, service requests, quote requests) enforce reCAPTCHA challenge verification to eliminate bot spam.
            var isSingleFieldEmailCapture = form.Fields.Count <= 1 &&
                form.Fields.All(f => f.FieldType.Equals("email", StringComparison.OrdinalIgnoreCase) ||
                                     f.FieldKey.Contains("email", StringComparison.OrdinalIgnoreCase));

            if (!isSingleFieldEmailCapture)
            {
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
                    contactChannels = channels
                };

                return Ok(ApiResponse<object>.SuccessResponse(payload, "Public UI settings retrieved."));
            }

            var defaultSetting = new
            {
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
                contactChannels = channels
            };

            return Ok(ApiResponse<object>.SuccessResponse(defaultSetting, "Default public UI settings retrieved."));
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
