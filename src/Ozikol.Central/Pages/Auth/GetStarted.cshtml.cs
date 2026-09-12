using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.Extensions.Caching.Memory;
using Ozikol.Central.Services;

namespace Ozikol.Central.Pages
{
    /// <summary>
    /// Input data model capturing organization information and administrator credentials for sovereign workspace registration.
    /// </summary>
    public class GetStartedInputModel
    {
        /// <summary>
        /// Administrator's full name (first and last name).
        /// </summary>
        [Required(ErrorMessage = "Please enter your full name.")]
        [Display(Name = "Full Name")]
        [MaxLength(150)]
        public string FullName { get; set; } = string.Empty;

        /// <summary>
        /// Organization, company, or institutional display name.
        /// </summary>
        [Required(ErrorMessage = "Please enter your organization or company name.")]
        [Display(Name = "Organization Name")]
        [MaxLength(200)]
        public string OrganizationName { get; set; } = string.Empty;

        /// <summary>
        /// Sovereign workspace address identifier (subdomain slug, e.g. "acme").
        /// </summary>
        [Required(ErrorMessage = "Please choose a workspace address.")]
        [RegularExpression(@"^[a-z0-9]+(?:-[a-z0-9]+)*$", ErrorMessage = "Workspace address can only contain lowercase letters, numbers, and hyphens.")]
        [Display(Name = "Workspace Address")]
        [MaxLength(80)]
        public string WorkspaceSlug { get; set; } = string.Empty;

        /// <summary>
        /// Corporate or work email address for workspace ownership.
        /// </summary>
        [Required(ErrorMessage = "Please enter your work email address.")]
        [EmailAddress(ErrorMessage = "Please enter a valid work email address.")]
        [Display(Name = "Work Email")]
        [MaxLength(256)]
        public string WorkEmail { get; set; } = string.Empty;

        /// <summary>
        /// Strong password for administrator access.
        /// </summary>
        [Required(ErrorMessage = "Password is required.")]
        [MinLength(6, ErrorMessage = "Password must be at least 6 characters.")]
        [DataType(DataType.Password)]
        [Display(Name = "Password")]
        public string Password { get; set; } = string.Empty;

        /// <summary>
        /// Primary contact phone number for security and recovery.
        /// </summary>
        [Display(Name = "Phone Number")]
        [MaxLength(40)]
        public string? PhoneNumber { get; set; }

        /// <summary>
        /// Sector or industry classification of the organization.
        /// </summary>
        [Display(Name = "Organization Type")]
        [MaxLength(100)]
        public string OrganizationType { get; set; } = "Business & Enterprise";

        /// <summary>
        /// Optional referral partner code for platform attribution.
        /// </summary>
        [Display(Name = "Referral Code")]
        [MaxLength(100)]
        public string? ReferralCode { get; set; }
    }

    /// <summary>
    /// PageModel orchestrating new organization onboarding, sovereign workspace provisioning, and live address verification.
    /// </summary>
    public class GetStartedModel : PageModel
    {
        private readonly ITenantOnboardingService _onboardingService;
        private readonly ICentralEmailService _emailService;
        private readonly Microsoft.Extensions.Caching.Memory.IMemoryCache _cache;
        private readonly ILogger<GetStartedModel> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="GetStartedModel"/> class.
        /// </summary>
        /// <param name="onboardingService">The workspace onboarding service.</param>
        /// <param name="emailService">Transactional email service for setup confirmation.</param>
        /// <param name="cache">Memory cache used to store one-time setup summaries.</param>
        /// <param name="logger">Application logger instance.</param>
        public GetStartedModel(
            ITenantOnboardingService onboardingService,
            ICentralEmailService emailService,
            Microsoft.Extensions.Caching.Memory.IMemoryCache cache,
            ILogger<GetStartedModel> logger)
        {
            _onboardingService = onboardingService;
            _emailService = emailService;
            _cache = cache;
            _logger = logger;
        }

        /// <summary>
        /// Bound input model for form submission.
        /// </summary>
        [BindProperty]
        public GetStartedInputModel Input { get; set; } = new();

        /// <summary>
        /// User-friendly error message if onboarding or validation encounters an issue.
        /// </summary>
        public string? ErrorMessage { get; set; }

        /// <summary>
        /// Success message displayed when workspace initialization completes.
        /// </summary>
        public string? SuccessMessage { get; set; }

        /// <summary>
        /// Target URL of the provisioned workspace portal.
        /// </summary>
        public string? ProvisionedRedirectUrl { get; set; }

        /// <summary>
        /// Indicates whether the workspace has just been successfully created in this request.
        /// </summary>
        public bool IsProvisioned { get; set; }

        /// <summary>
        /// Handles HTTP GET requests to render the onboarding portal, supporting pre-filled partner codes and social profile queries.
        /// </summary>
        /// <param name="refCode">Optional partner referral code.</param>
        /// <param name="email">Optional pre-filled email from social identity.</param>
        /// <param name="name">Optional pre-filled full name from social identity.</param>
        /// <param name="org">Optional pre-filled organization name.</param>
        public void OnGet(string? refCode = null, string? email = null, string? name = null, string? org = null)
        {
            if (!string.IsNullOrWhiteSpace(refCode))
            {
                Input.ReferralCode = refCode.Trim();
            }

            if (!string.IsNullOrWhiteSpace(email))
            {
                Input.WorkEmail = email.Trim();
            }

            if (!string.IsNullOrWhiteSpace(name))
            {
                Input.FullName = name.Trim();
            }

            if (!string.IsNullOrWhiteSpace(org))
            {
                Input.OrganizationName = org.Trim();
                Input.WorkspaceSlug = SanitizeSlug(org);
            }
        }

        /// <summary>
        /// AJAX handler to check whether a given workspace address slug is currently available.
        /// </summary>
        /// <param name="slug">The proposed workspace slug.</param>
        /// <returns>JSON object with availability status and formatted preview domain.</returns>
        public async Task<IActionResult> OnGetCheckWorkspaceAsync(string slug)
        {
            if (string.IsNullOrWhiteSpace(slug))
            {
                return new JsonResult(new { available = false, message = "Please enter a workspace address." });
            }

            var cleanSlug = SanitizeSlug(slug);
            if (cleanSlug.Length < 3)
            {
                return new JsonResult(new { available = false, message = "Workspace address must be at least 3 characters.", slug = cleanSlug });
            }

            if (ReservedWorkspaceNames.IsReserved(cleanSlug))
            {
                return new JsonResult(new
                {
                    available = false,
                    slug = cleanSlug,
                    message = "This workspace address is reserved by the system and cannot be used."
                });
            }

            bool isAvailable = await _onboardingService.IsTenantKeyAvailableAsync(cleanSlug);
            return new JsonResult(new
            {
                available = isAvailable,
                slug = cleanSlug,
                message = isAvailable ? "Workspace address is available!" : "This workspace address is already in use."
            });
        }

        /// <summary>
        /// Handles HTTP POST requests to validate registration input and provision the sovereign organization workspace.
        /// </summary>
        /// <returns>Page result or redirection to the newly provisioned workspace portal.</returns>
        public async Task<IActionResult> OnPostAsync()
        {
            // Normalize slug
            if (!string.IsNullOrWhiteSpace(Input.WorkspaceSlug))
            {
                Input.WorkspaceSlug = SanitizeSlug(Input.WorkspaceSlug);
            }
            else if (!string.IsNullOrWhiteSpace(Input.OrganizationName))
            {
                Input.WorkspaceSlug = SanitizeSlug(Input.OrganizationName);
            }

            if (!ModelState.IsValid)
            {
                return ReturnValidationFailure();
            }

            // Verify slug is not reserved
            if (ReservedWorkspaceNames.IsReserved(Input.WorkspaceSlug))
            {
                ModelState.AddModelError(nameof(Input.WorkspaceSlug), "This workspace address is reserved by the system. Please choose another address.");
                ErrorMessage = "The workspace address you selected is reserved by the system. Please choose another address.";
                return ReturnValidationFailure();
            }

            // Verify slug availability
            bool isAvailable = await _onboardingService.IsTenantKeyAvailableAsync(Input.WorkspaceSlug);
            if (!isAvailable)
            {
                ModelState.AddModelError(nameof(Input.WorkspaceSlug), "This workspace address is already registered. Please choose another address.");
                ErrorMessage = "The workspace address you selected is already taken. Please choose another address.";
                return ReturnValidationFailure();
            }

            // Validate partner code if provided
            if (!string.IsNullOrWhiteSpace(Input.ReferralCode))
            {
                bool isValidPartner = await _onboardingService.IsReferralCodeValidAsync(Input.ReferralCode);
                if (!isValidPartner)
                {
                    ModelState.AddModelError(nameof(Input.ReferralCode), "The referral code provided is invalid or inactive.");
                    ErrorMessage = "The referral code is invalid or inactive. You can leave it blank to proceed.";
                    return ReturnValidationFailure();
                }
            }

            // Split Full Name into First and Last names
            var nameParts = (Input.FullName ?? "").Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
            string firstName = nameParts.Length > 0 ? nameParts[0] : "Administrator";
            string lastName = nameParts.Length > 1 ? string.Join(" ", nameParts.Skip(1)) : "Admin";

            var onboardingRequest = new TenantOnboardingRequest
            {
                OrganizationName = Input.OrganizationName.Trim(),
                TenantKey = Input.WorkspaceSlug,
                AdminFirstName = firstName,
                AdminLastName = lastName,
                AdminEmail = Input.WorkEmail.Trim().ToLowerInvariant(),
                AdminPassword = Input.Password,
                PhoneNumber = string.IsNullOrWhiteSpace(Input.PhoneNumber) ? null : Input.PhoneNumber.Trim(),
                ReferredBy = string.IsNullOrWhiteSpace(Input.ReferralCode) ? null : Input.ReferralCode.Trim()
            };

            _logger.LogInformation("Initializing sovereign workspace registration for [{WorkspaceSlug}] - {OrgName}", Input.WorkspaceSlug, Input.OrganizationName);

            var result = await _onboardingService.OnboardNewTenantAsync(onboardingRequest);

            if (!result.Success)
            {
                _logger.LogWarning("Workspace registration failed for [{WorkspaceSlug}]: {Message}", Input.WorkspaceSlug, result.Message);
                ErrorMessage = result.Message;
                return ReturnValidationFailure();
            }

            _logger.LogInformation("Successfully provisioned sovereign workspace [{WorkspaceSlug}]. Target portal: {RedirectUrl}", Input.WorkspaceSlug, result.RedirectUrl);

            // 1. Dispatch confirmation email with setup links
            try
            {
                await _emailService.SendWelcomeWorkspaceEmailAsync(
                    Input.WorkEmail.Trim().ToLowerInvariant(),
                    Input.OrganizationName.Trim(),
                    result.PrimaryDomain);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to dispatch welcome email to {Email}", Input.WorkEmail);
            }

            // 2. Generate secure one-time token for setup confirmation page
            var oneTimeToken = Guid.NewGuid().ToString("N");
            var setupPayload = new Ozikol.Central.Pages.Auth.WorkspaceSetupPayload
            {
                OrganizationName = Input.OrganizationName.Trim(),
                WorkspaceSlug = Input.WorkspaceSlug,
                WebsiteUrl = $"https://{result.PrimaryDomain}",
                LoginUrl = result.RedirectUrl,
                AdminEmail = Input.WorkEmail.Trim().ToLowerInvariant(),
                ProvisionedUtc = DateTime.UtcNow
            };

            _cache.Set($"WorkspaceSetup_{oneTimeToken}", setupPayload, TimeSpan.FromMinutes(30));
            string oneTimeDetailsUrl = $"/auth/workspace-setup-details?token={oneTimeToken}";

            IsProvisioned = true;
            ProvisionedRedirectUrl = oneTimeDetailsUrl;
            SuccessMessage = $"Your sovereign workspace for '{Input.OrganizationName}' is ready!";

            // If AJAX submission, return clean JSON payload targeting one-time page
            if (IsAjaxRequest())
            {
                return new JsonResult(new
                {
                    success = true,
                    redirectUrl = oneTimeDetailsUrl,
                    message = SuccessMessage
                });
            }

            // Standard POST redirect to one-time details page
            return Redirect(oneTimeDetailsUrl);
        }

        private IActionResult ReturnValidationFailure()
        {
            if (IsAjaxRequest())
            {
                var errors = ModelState.Values
                    .SelectMany(v => v.Errors)
                    .Select(e => e.ErrorMessage)
                    .ToList();

                return new JsonResult(new
                {
                    success = false,
                    message = ErrorMessage ?? errors.FirstOrDefault() ?? "Please verify the highlighted fields."
                });
            }

            return Page();
        }

        private bool IsAjaxRequest()
        {
            return Request.Headers["X-Requested-With"] == "XMLHttpRequest" ||
                   (Request.Headers["Accept"].ToString().Contains("application/json", StringComparison.OrdinalIgnoreCase));
        }

        private static string SanitizeSlug(string input)
        {
            if (string.IsNullOrWhiteSpace(input)) return string.Empty;
            var clean = input.Trim().ToLowerInvariant()
                .Replace(" ", "-")
                .Replace("_", "-")
                .Replace(".", "-");

            var chars = clean.Where(c => char.IsLetterOrDigit(c) || c == '-').ToArray();
            var result = new string(chars);

            while (result.Contains("--"))
            {
                result = result.Replace("--", "-");
            }

            return result.Trim('-');
        }
    }
}
