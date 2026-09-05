using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Globalization;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.Extensions.Localization;
using Microsoft.Extensions.Logging;
using Ozikol.Central.Services;
using Ozikol.Central.Services.Support;
using Ozikol.MasterDomain.Models;

namespace Ozikol.Central.Pages
{
    /// <summary>
    /// PageModel orchestrating the comprehensive, dynamic multi-suite Support Portal,
    /// knowledge base article reader modals, YouTube visual guides, and enterprise ticket handling.
    /// </summary>
    public class SupportModel : PageModel
    {
        private readonly ISupportService _supportService;
        private readonly IRecaptchaService _recaptchaService;
        private readonly IStringLocalizer<SharedResource> _localizer;
        private readonly ILogger<SupportModel> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="SupportModel"/> class.
        /// </summary>
        /// <param name="supportService">Support content and inquiry service.</param>
        /// <param name="recaptchaService">Google reCAPTCHA verification service.</param>
        /// <param name="localizer">Shared multilingual string localizer.</param>
        /// <param name="logger">System logger instance.</param>
        public SupportModel(
            ISupportService supportService,
            IRecaptchaService recaptchaService,
            IStringLocalizer<SharedResource> localizer,
            ILogger<SupportModel> logger)
        {
            _supportService = supportService ?? throw new ArgumentNullException(nameof(supportService));
            _recaptchaService = recaptchaService ?? throw new ArgumentNullException(nameof(recaptchaService));
            _localizer = localizer ?? throw new ArgumentNullException(nameof(localizer));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>
        /// Gets the active 2-letter ISO language code (e.g. en, fr, es, de).
        /// </summary>
        public string CurrentCulture { get; private set; } = "en";

        /// <summary>
        /// Gets the public Google reCAPTCHA v2 site key.
        /// </summary>
        public string RecaptchaSiteKey => _recaptchaService.SiteKey;

        /// <summary>
        /// Gets the hierarchical list of 9 enterprise suites and child features.
        /// </summary>
        public IReadOnlyList<SuiteSupportViewModel> Suites { get; private set; } = new List<SuiteSupportViewModel>();

        /// <summary>
        /// Gets the list of published helpdesk articles matching active filters.
        /// </summary>
        public IReadOnlyList<MasterHelpdeskArticle> Articles { get; private set; } = new List<MasterHelpdeskArticle>();

        /// <summary>
        /// Gets the list of YouTube video tutorials matching active filters.
        /// </summary>
        public IReadOnlyList<MasterVideoGuide> Videos { get; private set; } = new List<MasterVideoGuide>();

        /// <summary>
        /// Gets or sets the currently selected suite code filter (e.g. suite-workforce).
        /// </summary>
        public string? ActiveSuiteCode { get; set; }

        /// <summary>
        /// Gets or sets the currently selected feature code filter (e.g. staff-rota).
        /// </summary>
        public string? ActiveFeatureCode { get; set; }

        /// <summary>
        /// Gets or sets the active search query.
        /// </summary>
        public string? SearchQuery { get; set; }

        /// <summary>
        /// Gets a value indicating whether an inquiry was successfully submitted in this session.
        /// </summary>
        public bool IsSubmitted { get; set; }

        /// <summary>
        /// Gets the unique tracking reference assigned to a newly created ticket.
        /// </summary>
        public string AssignedReference { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the bound inquiry submission form input.
        /// </summary>
        [BindProperty]
        public SupportInquiryInput Input { get; set; } = new();

        /// <summary>
        /// Handles HTTP GET requests to load suite hierarchies, video guides, and helpdesk articles.
        /// </summary>
        /// <param name="suite">Optional suite filter.</param>
        /// <param name="feature">Optional feature filter.</param>
        /// <param name="q">Optional keyword search query.</param>
        public async Task OnGetAsync(string? suite, string? feature, string? q)
        {
            ResolveCulture();
            ActiveSuiteCode = suite;
            ActiveFeatureCode = feature;
            SearchQuery = q;

            await LoadPortalContentAsync();
        }

        /// <summary>
        /// Handles HTTP POST requests for submitting support inquiries and lead capture requests.
        /// </summary>
        public async Task<IActionResult> OnPostSubmitInquiryAsync()
        {
            ResolveCulture();

            // 1. Verify Google reCAPTCHA Token
            var recaptchaResponse = Request.Form["g-recaptcha-response"].ToString();
            var clientIp = HttpContext.Connection.RemoteIpAddress?.ToString();
            var isCaptchaValid = await _recaptchaService.ValidateTokenAsync(recaptchaResponse, clientIp);

            if (!isCaptchaValid)
            {
                ModelState.AddModelError(string.Empty, _localizer["Careers_Error_Captcha"]);
            }

            // 2. Validate ModelState
            if (!ModelState.IsValid)
            {
                await LoadPortalContentAsync();
                return Page();
            }

            try
            {
                // 3. Persist inquiry into MasterCatalogDbContext
                var inquiry = new MasterSupportInquiry
                {
                    FullName = Input.FullName.Trim(),
                    Email = Input.Email.Trim(),
                    Phone = string.IsNullOrWhiteSpace(Input.Phone) ? null : Input.Phone.Trim(),
                    Organization = Input.Organization.Trim(),
                    JobTitle = string.IsNullOrWhiteSpace(Input.JobTitle) ? null : Input.JobTitle.Trim(),
                    InquiryType = Input.InquiryType,
                    SuiteCode = string.IsNullOrWhiteSpace(Input.SuiteCode) ? null : Input.SuiteCode.Trim(),
                    FeatureCode = string.IsNullOrWhiteSpace(Input.FeatureCode) ? null : Input.FeatureCode.Trim(),
                    Subject = Input.Subject.Trim(),
                    Message = Input.Message.Trim(),
                    Culture = CurrentCulture,
                    IpAddress = clientIp
                };

                AssignedReference = await _supportService.SubmitInquiryAsync(inquiry);
                IsSubmitted = true;

                // Reset form inputs
                ModelState.Clear();
                Input = new SupportInquiryInput();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to submit support inquiry for {Email}", Input.Email);
                ModelState.AddModelError(string.Empty, "An unexpected error occurred while transmitting your request. Please retry or contact our emergency hotline.");
            }

            await LoadPortalContentAsync();
            return Page();
        }

        /// <summary>
        /// AJAX endpoint returning full article content payload for the interactive article reader modal.
        /// </summary>
        /// <param name="id">The unique article GUID.</param>
        public async Task<IActionResult> OnGetArticleDetailsAsync(Guid id)
        {
            var article = await _supportService.GetArticleByIdAsync(id);
            if (article == null)
            {
                return NotFound(new { message = "Article not found." });
            }

            return new JsonResult(new
            {
                id = article.Id,
                title = article.Title,
                summary = article.Summary,
                contentHtml = article.ContentHtml,
                category = article.Category,
                suiteCode = article.SuiteCode,
                featureCode = article.FeatureCode,
                readMinutes = article.EstimatedReadMinutes,
                viewCount = article.ViewCount,
                helpfulCount = article.HelpfulCount,
                updated = article.UpdatedUtc.ToString("MMMM dd, yyyy")
            });
        }

        /// <summary>
        /// AJAX endpoint returning video metadata and YouTube embed payload for the video player modal.
        /// </summary>
        /// <param name="id">The unique video GUID.</param>
        public async Task<IActionResult> OnGetVideoDetailsAsync(Guid id)
        {
            var video = await _supportService.GetVideoByIdAsync(id);
            if (video == null)
            {
                return NotFound(new { message = "Video not found." });
            }

            return new JsonResult(new
            {
                id = video.Id,
                title = video.Title,
                description = video.Description,
                youtubeId = video.YouTubeVideoId,
                durationSeconds = video.DurationSeconds,
                suiteCode = video.SuiteCode,
                featureCode = video.FeatureCode,
                viewCount = video.ViewCount
            });
        }

        /// <summary>
        /// AJAX endpoint for recording positive feedback votes on knowledge base articles.
        /// </summary>
        /// <param name="id">The article GUID.</param>
        /// <param name="helpful">True if voted helpful.</param>
        public async Task<IActionResult> OnPostVoteArticleAsync([FromForm] Guid id, [FromForm] bool helpful)
        {
            await _supportService.RecordArticleVoteAsync(id, helpful);
            return new JsonResult(new { success = true });
        }

        private void ResolveCulture()
        {
            var routeCulture = RouteData.Values["culture"]?.ToString()?.ToLowerInvariant();
            if (routeCulture is "en" or "fr" or "es" or "de")
            {
                CurrentCulture = routeCulture;
                return;
            }

            var current = CultureInfo.CurrentUICulture.TwoLetterISOLanguageName.ToLowerInvariant();
            CurrentCulture = current is "en" or "fr" or "es" or "de" ? current : "en";
        }

        private async Task LoadPortalContentAsync()
        {
            Suites = await _supportService.GetSuitesWithHierarchyAsync(CurrentCulture);
            Articles = await _supportService.GetArticlesAsync(ActiveSuiteCode, ActiveFeatureCode, SearchQuery, CurrentCulture);
            Videos = await _supportService.GetVideosAsync(ActiveSuiteCode, ActiveFeatureCode, CurrentCulture);
        }
    }

    /// <summary>
    /// Input model for submitting support inquiries, ticket requests, and sales consultations.
    /// </summary>
    public class SupportInquiryInput
    {
        /// <summary>
        /// Gets or sets the inquirer's full name.
        /// </summary>
        [Required(ErrorMessage = "Please enter your full name.")]
        [StringLength(120, MinimumLength = 2, ErrorMessage = "Full name must be between 2 and 120 characters.")]
        public string FullName { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the work email address.
        /// </summary>
        [Required(ErrorMessage = "Please enter your work email address.")]
        [EmailAddress(ErrorMessage = "Please enter a valid email address.")]
        [StringLength(150, ErrorMessage = "Email cannot exceed 150 characters.")]
        public string Email { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the optional international telephone number.
        /// </summary>
        [Phone(ErrorMessage = "Please enter a valid telephone number.")]
        [StringLength(40, ErrorMessage = "Phone number cannot exceed 40 characters.")]
        public string? Phone { get; set; }

        /// <summary>
        /// Gets or sets the company, estate, or institutional organization name.
        /// </summary>
        [Required(ErrorMessage = "Please provide your organization or company name.")]
        [StringLength(150, MinimumLength = 2, ErrorMessage = "Organization name must be between 2 and 150 characters.")]
        public string Organization { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the professional job title or administrative role.
        /// </summary>
        [StringLength(100, ErrorMessage = "Job title cannot exceed 100 characters.")]
        public string? JobTitle { get; set; }

        /// <summary>
        /// Gets or sets the inquiry classification category.
        /// </summary>
        [Required(ErrorMessage = "Please select an inquiry classification.")]
        [StringLength(50)]
        public string InquiryType { get; set; } = "Support";

        /// <summary>
        /// Gets or sets the optional targeted enterprise suite code.
        /// </summary>
        [StringLength(80)]
        public string? SuiteCode { get; set; }

        /// <summary>
        /// Gets or sets the optional targeted feature module code.
        /// </summary>
        [StringLength(80)]
        public string? FeatureCode { get; set; }

        /// <summary>
        /// Gets or sets the subject headline of the inquiry.
        /// </summary>
        [Required(ErrorMessage = "Please provide a subject summary.")]
        [StringLength(200, MinimumLength = 5, ErrorMessage = "Subject must be between 5 and 200 characters.")]
        public string Subject { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the detailed ticket message or question.
        /// </summary>
        [Required(ErrorMessage = "Please provide detailed information regarding your inquiry.")]
        [StringLength(3000, MinimumLength = 15, ErrorMessage = "Message must be between 15 and 3000 characters.")]
        public string Message { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the user's consent acknowledgment to the privacy policy.
        /// </summary>
        [Range(typeof(bool), "true", "true", ErrorMessage = "You must agree to the processing of your inquiry.")]
        public bool Consent { get; set; }
    }
}
