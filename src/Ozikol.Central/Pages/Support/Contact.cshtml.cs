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

namespace Ozikol.Central.Pages.Support
{
    /// <summary>
    /// PageModel presenting the dedicated enterprise contact and support ticket submission portal.
    /// </summary>
    public class ContactModel : PageModel
    {
        private readonly ISupportService _supportService;
        private readonly IRecaptchaService _recaptchaService;
        private readonly IStringLocalizer<SharedResource> _localizer;
        private readonly ILogger<ContactModel> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="ContactModel"/> class.
        /// </summary>
        public ContactModel(
            ISupportService supportService,
            IRecaptchaService recaptchaService,
            IStringLocalizer<SharedResource> localizer,
            ILogger<ContactModel> logger)
        {
            _supportService = supportService ?? throw new ArgumentNullException(nameof(supportService));
            _recaptchaService = recaptchaService ?? throw new ArgumentNullException(nameof(recaptchaService));
            _localizer = localizer ?? throw new ArgumentNullException(nameof(localizer));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>
        /// Gets the active 2-letter ISO culture code.
        /// </summary>
        public string CurrentCulture { get; private set; } = "en";

        /// <summary>
        /// Gets the public Google reCAPTCHA v2 site key.
        /// </summary>
        public string RecaptchaSiteKey => _recaptchaService.SiteKey;

        /// <summary>
        /// Gets the list of 9 enterprise suites for form categorization.
        /// </summary>
        public IReadOnlyList<SuiteSupportViewModel> Suites { get; private set; } = new List<SuiteSupportViewModel>();

        /// <summary>
        /// Gets the dynamic support frequently asked questions loaded from the master database.
        /// </summary>
        public IReadOnlyList<MasterSupportFaq> Faqs { get; private set; } = new List<MasterSupportFaq>();

        /// <summary>
        /// Gets a value indicating whether an inquiry was submitted successfully.
        /// </summary>
        public bool IsSubmitted { get; set; }

        /// <summary>
        /// Gets the assigned unique reference tracking number.
        /// </summary>
        public string AssignedReference { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the form input model.
        /// </summary>
        [BindProperty]
        public SupportInquiryInput Input { get; set; } = new();

        /// <summary>
        /// Handles GET requests to display the contact form and office locations.
        /// </summary>
        /// <param name="type">Optional pre-selected inquiry type (e.g. Sales, Support).</param>
        /// <param name="suite">Optional pre-selected suite code.</param>
        public async Task OnGetAsync(string? type, string? suite)
        {
            ResolveCulture();
            if (!string.IsNullOrWhiteSpace(type))
            {
                Input.InquiryType = type;
            }
            if (!string.IsNullOrWhiteSpace(suite))
            {
                Input.SuiteCode = suite;
            }

            Suites = await _supportService.GetSuitesWithHierarchyAsync(CurrentCulture);
            Faqs = await _supportService.GetFaqsAsync(CurrentCulture);
        }

        /// <summary>
        /// Handles POST requests to validate and persist the submitted ticket.
        /// </summary>
        public async Task<IActionResult> OnPostSubmitInquiryAsync()
        {
            ResolveCulture();

            var recaptchaResponse = Request.Form["g-recaptcha-response"].ToString();
            var clientIp = HttpContext.Connection.RemoteIpAddress?.ToString();
            var isCaptchaValid = await _recaptchaService.ValidateTokenAsync(recaptchaResponse, clientIp);

            if (!isCaptchaValid)
            {
                ModelState.AddModelError(string.Empty, _localizer["Careers_Error_Captcha"]);
            }

            if (!ModelState.IsValid)
            {
                Suites = await _supportService.GetSuitesWithHierarchyAsync(CurrentCulture);
                Faqs = await _supportService.GetFaqsAsync(CurrentCulture);
                return Page();
            }

            try
            {
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
                ModelState.Clear();
                Input = new SupportInquiryInput();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error transmitting contact inquiry for {Email}", Input.Email);
                ModelState.AddModelError(string.Empty, "An unexpected error occurred while transmitting your request. Please retry.");
            }

            Suites = await _supportService.GetSuitesWithHierarchyAsync(CurrentCulture);
            Faqs = await _supportService.GetFaqsAsync(CurrentCulture);
            return Page();
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
