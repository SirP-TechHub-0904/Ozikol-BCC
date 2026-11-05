using System.ComponentModel.DataAnnotations;

using Microsoft.AspNetCore.Mvc;

using Microsoft.AspNetCore.Mvc.RazorPages;

using Microsoft.EntityFrameworkCore;

using Microsoft.Extensions.Caching.Memory;

using Ozikol.Central.Services;

using Ozikol.MasterPersistence.EF.MasterSQL;



namespace Ozikol.Central.Pages

{

    /// <summary>

    /// Input data model capturing organization information and administrator credentials for organization workspace registration.

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

        /// Organization workspace address identifier (subdomain slug, e.g. "acme").

        /// </summary>

        [Required(ErrorMessage = "Please choose a workspace address.")]

        [RegularExpression(@"^[a-z0-9]+(?:-[a-z0-9]+)*$", ErrorMessage = "Workspace address can only contain lowercase letters, numbers, and hyphens.")]

        [Display(Name = "Workspace Address")]

        [MaxLength(80)]

        public string WorkspaceSlug { get; set; } = string.Empty;



        /// <summary>

        /// Administrator email address for workspace ownership and root account authentication.

        /// </summary>

        [Required(ErrorMessage = "Please enter your admin email address.")]

        [EmailAddress(ErrorMessage = "Please enter a valid email address.")]

        [Display(Name = "Admin Email Address")]

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



        /// <summary>

        /// Whether to automatically provision the turnkey default website suite.

        /// </summary>

        public bool SeedDefaultWebsite { get; set; } = true;

    }



    /// <summary>

    /// PageModel orchestrating new organization onboarding, organization workspace provisioning, and live address verification.

    /// Integrates dynamic multi-currency regional pricing, configurable trial periods, and Google reCAPTCHA verification.

    /// </summary>

    [IgnoreAntiforgeryToken]

    public class GetStartedModel : PageModel

    {

        private readonly ITenantOnboardingService _onboardingService;

        private readonly ICentralEmailService _emailService;

        private readonly MasterCatalogDbContext _dbContext;

        private readonly Microsoft.Extensions.Caching.Memory.IMemoryCache _cache;

        private readonly IRecaptchaService _recaptchaService;

        private readonly ICurrencyService _currencyService;

        private readonly Ozikol.Central.Services.Validation.IEmailValidationService _emailValidationService;

        private readonly Microsoft.Extensions.Options.IOptions<PricingSettings> _pricingSettings;

        private readonly ILogger<GetStartedModel> _logger;



        /// <summary>

        /// Initializes a new instance of the <see cref="GetStartedModel"/> class.

        /// </summary>

        /// <param name="onboardingService">The workspace onboarding service.</param>

        /// <param name="emailService">Transactional email service for setup confirmation.</param>

        /// <param name="dbContext">Central master catalog database context for loading feature plans.</param>

        /// <param name="cache">Memory cache used to store one-time setup summaries.</param>

        /// <param name="recaptchaService">Google reCAPTCHA verification service.</param>

        /// <param name="currencyService">Dynamic location-based currency and pricing service.</param>

        /// <param name="emailValidationService">Email format and disposable domain verification service.</param>

        /// <param name="pricingSettings">Configured pricing options provider.</param>

        /// <param name="logger">Application logger instance.</param>

        public GetStartedModel(

            ITenantOnboardingService onboardingService,

            ICentralEmailService emailService,

            MasterCatalogDbContext dbContext,

            Microsoft.Extensions.Caching.Memory.IMemoryCache cache,

            IRecaptchaService recaptchaService,

            ICurrencyService currencyService,

            Ozikol.Central.Services.Validation.IEmailValidationService emailValidationService,

            Microsoft.Extensions.Options.IOptions<PricingSettings> pricingSettings,

            ILogger<GetStartedModel> logger)

        {

            _onboardingService = onboardingService ?? throw new ArgumentNullException(nameof(onboardingService));

            _emailService = emailService ?? throw new ArgumentNullException(nameof(emailService));

            _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));

            _cache = cache ?? throw new ArgumentNullException(nameof(cache));

            _recaptchaService = recaptchaService ?? throw new ArgumentNullException(nameof(recaptchaService));

            _currencyService = currencyService ?? throw new ArgumentNullException(nameof(currencyService));

            _emailValidationService = emailValidationService ?? throw new ArgumentNullException(nameof(emailValidationService));

            _pricingSettings = pricingSettings ?? throw new ArgumentNullException(nameof(pricingSettings));

            _logger = logger ?? throw new ArgumentNullException(nameof(logger));

        }



        /// <summary>

        /// Bound input model for form submission.

        /// </summary>

        [BindProperty]

        public GetStartedInputModel Input { get; set; } = new();



        /// <summary>

        /// All active platform features, shown display-only in Step 2 (no billing or selection).

        /// </summary>

        public List<Ozikol.MasterDomain.Models.MasterFeatureCatalog> AllFeatures { get; set; } = new();



        /// <summary>

        /// Gets the public Google reCAPTCHA site key for widget rendering.

        /// </summary>

        public string RecaptchaSiteKey => _recaptchaService.SiteKey;



        /// <summary>

        /// Gets or sets the number of free trial days granted when registering without a coupon.

        /// </summary>

        public int TrialDays { get; set; } = 14;



        /// <summary>

        /// Gets or sets the 3-letter ISO currency code resolved for the current user (e.g. USD, NGN, GBP, EUR).

        /// </summary>

        public string ActiveCurrencyCode { get; set; } = "USD";



        /// <summary>

        /// Gets or sets the visual currency symbol for the current user (e.g. $, ₦, £, €).

        /// </summary>

        public string ActiveCurrencySymbol { get; set; } = "$";



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

        public async Task OnGetAsync(string? refCode = null, string? email = null, string? name = null, string? org = null)

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



            await LoadCatalogFeaturesAsync();

        }



        private async Task LoadCatalogFeaturesAsync()

        {

            // 1. Resolve user's localized currency (kept for downstream services; not shown on this page)

            ActiveCurrencyCode = _currencyService.ResolveCurrencyCodeFromRequest(HttpContext, null);

            ActiveCurrencySymbol = _currencyService.ResolveCurrency(ActiveCurrencyCode).Symbol;



            // 2. Resolve default trial days from MasterPlatformSettings table or fallback configuration

            try

            {

                var platformSetting = await _dbContext.MasterPlatformSettings.AsNoTracking().FirstOrDefaultAsync();

                TrialDays = platformSetting?.DefaultTrialDays ?? _pricingSettings.Value.DefaultTrialDays;

            }

            catch (Exception ex)

            {

                _logger.LogWarning(ex, "Could not query MasterPlatformSettings for trial days; using default config.");

                TrialDays = _pricingSettings.Value.DefaultTrialDays;

            }



            if (TrialDays <= 0)

            {

                TrialDays = 14;

            }



            // 3. Query all catalog features (without publish or active restriction, matching the solutions mega-menu showcase)

            List<Ozikol.MasterDomain.Models.MasterFeatureCatalog> rawFeatures;

            try

            {

                rawFeatures = await _dbContext.MasterFeatureCatalogs

                    .AsNoTracking()

                    .Include(f => f.Suite)

                    .ToListAsync();

            }

            catch

            {

                rawFeatures = await _dbContext.MasterFeatureCatalogs

                    .AsNoTracking()

                    .ToListAsync();

            }



            // Display-only list aligned with MasterFeatureSuites.SortOrder and MasterFeatureCatalogs.SortOrder

            AllFeatures = rawFeatures

                .OrderBy(f => f.Suite?.SortOrder ?? GetSuiteOrder(f.Category))

                .ThenBy(f => f.SortOrder)

                .ThenBy(f => f.Name)

                .ToList();

        }



        /// <summary>

        /// Resolves the canonical sequence index for a given suite name matching the CentralWorks catalog.

        /// </summary>

        /// <param name="category">The suite or category name.</param>

        /// <returns>Zero-based canonical sequence index, or 500 if unrecognized.</returns>

        public static int GetSuiteOrder(string? category)

        {

            if (string.IsNullOrWhiteSpace(category)) return 999;

            var idx = Array.FindIndex(Ozikol.Central.Areas.Centralwks.Pages.Features.IndexModel.CanonicalSuites,

                s => s.Equals(category.Trim(), StringComparison.OrdinalIgnoreCase));

            return idx >= 0 ? idx : 500;

        }



        /// <summary>

        /// Resolves the canonical single-letter designation (A-K) for a given suite name.

        /// </summary>

        /// <param name="category">The suite or category name.</param>

        /// <returns>Suite character ('A'-'K'), or '•' if unrecognized.</returns>

        public static char GetSuiteLetter(string? category)

        {

            var idx = GetSuiteOrder(category);

            return (idx >= 0 && idx < 26) ? (char)('A' + idx) : '•';

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

        /// Handles HTTP POST requests to validate registration input and provision the organization workspace.

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



            // 1. Verify Google reCAPTCHA

            var recaptchaResponse = Request.Form["g-recaptcha-response"].ToString();

            var clientIp = HttpContext.Connection.RemoteIpAddress?.ToString();

            var isCaptchaValid = await _recaptchaService.ValidateTokenAsync(recaptchaResponse, clientIp);

            if (!isCaptchaValid)

            {

                ModelState.AddModelError(string.Empty, "Security verification failed. Please complete the reCAPTCHA challenge and try again.");

                ErrorMessage = "Security verification failed. Please complete the reCAPTCHA challenge and try again.";

                return await ReturnValidationFailureAsync();

            }



            if (!_emailValidationService.IsValidEmail(Input.WorkEmail, out var emailError))

            {

                ModelState.AddModelError(nameof(Input.WorkEmail), emailError ?? "Please provide a valid work email address.");

                ErrorMessage = emailError ?? "Please provide a valid work email address.";

                return await ReturnValidationFailureAsync();

            }



            if (!ModelState.IsValid)

            {

                return await ReturnValidationFailureAsync();

            }



            // Verify slug is not reserved

            if (ReservedWorkspaceNames.IsReserved(Input.WorkspaceSlug))

            {

                ModelState.AddModelError(nameof(Input.WorkspaceSlug), "This workspace address is reserved by the system. Please choose another address.");

                ErrorMessage = "The workspace address you selected is reserved by the system. Please choose another address.";

                return await ReturnValidationFailureAsync();

            }



            // Verify slug availability

            bool isAvailable = await _onboardingService.IsTenantKeyAvailableAsync(Input.WorkspaceSlug);

            if (!isAvailable)

            {

                ModelState.AddModelError(nameof(Input.WorkspaceSlug), "This workspace address is already registered. Please choose another address.");

                ErrorMessage = "The workspace address you selected is already taken. Please choose another address.";

                return await ReturnValidationFailureAsync();

            }



            // Validate partner code if provided

            if (!string.IsNullOrWhiteSpace(Input.ReferralCode))

            {

                bool isValidPartner = await _onboardingService.IsReferralCodeValidAsync(Input.ReferralCode);

                if (!isValidPartner)

                {

                    ModelState.AddModelError(nameof(Input.ReferralCode), "The referral code provided is invalid or inactive.");

                    ErrorMessage = "The referral code is invalid or inactive. You can leave it blank to proceed.";

                    return await ReturnValidationFailureAsync();

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

                ReferredBy = string.IsNullOrWhiteSpace(Input.ReferralCode) ? null : Input.ReferralCode.Trim(),

                Sector = string.IsNullOrWhiteSpace(Input.OrganizationType) ? "Business & Enterprise" : Input.OrganizationType.Trim(),

                TrialDays = TrialDays > 0 ? TrialDays : 14,

                SeedDefaultWebsite = false // Modal prompt decides immediately after migrations!

            };



            _logger.LogInformation("Initializing organization workspace registration for [{WorkspaceSlug}] - {OrgName}", Input.WorkspaceSlug, Input.OrganizationName);



            var result = await _onboardingService.OnboardNewTenantAsync(onboardingRequest);



            if (!result.Success)

            {

                _logger.LogWarning("Workspace registration failed for [{WorkspaceSlug}]: {Message}", Input.WorkspaceSlug, result.Message);

                ErrorMessage = result.Message;

                return await ReturnValidationFailureAsync();

            }



            _logger.LogInformation("Successfully provisioned organization workspace [{WorkspaceSlug}]. Target portal: {RedirectUrl}", Input.WorkspaceSlug, result.RedirectUrl);



            // 1. Dispatch dual onboarding emails: Welcome Email (from template) and Workspace Setup Details

            try

            {

                // Dispatches personalized welcome email from MasterEmailTemplates

                await _emailService.SendWelcomeEmailAsync(

                    Input.WorkEmail.Trim().ToLowerInvariant(),

                    Input.OrganizationName.Trim());



                // Dispatches workspace setup confirmation and access URLs

                await _emailService.SendWelcomeWorkspaceEmailAsync(

                    Input.WorkEmail.Trim().ToLowerInvariant(),

                    Input.OrganizationName.Trim(),

                    result.PrimaryDomain);

            }

            catch (Exception ex)

            {

                _logger.LogWarning(ex, "Failed to dispatch onboarding emails to {Email}", Input.WorkEmail);

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

            SuccessMessage = $"Your workspace for '{Input.OrganizationName}' is ready!";



            // If AJAX submission, return clean JSON payload targeting one-time page

            if (IsAjaxRequest())

            {

                return new JsonResult(new

                {

                    success = true,

                    redirectUrl = oneTimeDetailsUrl,

                    tenantKey = result.TenantKey,

                    orgName = Input.OrganizationName,

                    message = SuccessMessage

                });

            }



            // Standard POST redirect to one-time details page

            return Redirect(oneTimeDetailsUrl);

        }



        private async Task<IActionResult> ReturnValidationFailureAsync()

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



            await LoadCatalogFeaturesAsync();

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



        /// <summary>

        /// AJAX handler: Seeds the turnkey default website suite for the newly provisioned tenant.

        /// </summary>

        /// <param name="tenantKey">The tenant identifier passed via query string.</param>

        /// <param name="orgName">The optional organization name passed via query string.</param>

        /// <param name="formTenantKey">The optional tenant identifier passed via form body.</param>

        /// <param name="formOrgName">The optional organization name passed via form body.</param>

        /// <returns>JSON result indicating outcome and message.</returns>

        public async Task<IActionResult> OnPostSeedDefaultsAsync(

            [FromQuery] string? tenantKey = null,

            [FromQuery] string? orgName = null,

            [FromForm] string? formTenantKey = null,

            [FromForm] string? formOrgName = null)

        {

            var effectiveKey = (!string.IsNullOrWhiteSpace(tenantKey) ? tenantKey : formTenantKey)?.Trim();

            var effectiveOrg = (!string.IsNullOrWhiteSpace(orgName) ? orgName : formOrgName)?.Trim();



            _logger.LogInformation("==================================================================");

            _logger.LogInformation("📥 [Central OnPostSeedDefaultsAsync] Request received. TenantKey: '{TenantKey}', OrgName: '{OrgName}'", effectiveKey, effectiveOrg);



            if (string.IsNullOrWhiteSpace(effectiveKey))

            {

                _logger.LogWarning("❌ [Central OnPostSeedDefaultsAsync] Tenant key is missing from both query and form!");

                return new JsonResult(new { success = false, message = "Missing tenant key." });

            }



            _logger.LogInformation("🌱 [Central Seeding] Dispatching SeedTenantDefaultWebsiteAsync for [{TenantKey}]...", effectiveKey);

            var success = await _onboardingService.SeedTenantDefaultWebsiteAsync(effectiveKey, effectiveOrg);

            _logger.LogInformation("🎯 [Central Seeding] Finished for [{TenantKey}]. Result: {Success}", effectiveKey, success ? "SUCCESS (Turnkey suite active)" : "FAILED");

            _logger.LogInformation("==================================================================");



            return new JsonResult(new { success = success, message = success ? "Default website seeded successfully!" : "Failed to seed default website." });

        }



        /// <summary>

        /// AJAX handler: Skips default website seeding and marks tenant in blank canvas mode.

        /// </summary>

        /// <param name="tenantKey">The tenant identifier passed via query string.</param>

        /// <param name="formTenantKey">The optional tenant identifier passed via form body.</param>

        /// <returns>JSON result indicating outcome and message.</returns>

        public async Task<IActionResult> OnPostSkipDefaultsAsync(

            [FromQuery] string? tenantKey = null,

            [FromForm] string? formTenantKey = null)

        {

            var effectiveKey = (!string.IsNullOrWhiteSpace(tenantKey) ? tenantKey : formTenantKey)?.Trim();



            if (string.IsNullOrWhiteSpace(effectiveKey))

            {

                _logger.LogWarning("OnPostSkipDefaultsAsync: Tenant key is missing.");

                return new JsonResult(new { success = false, message = "Missing tenant key." });

            }



            _logger.LogInformation("⚪ Marking tenant [{TenantKey}] in blank canvas mode.", effectiveKey);

            var success = await _onboardingService.SkipTenantDefaultWebsiteAsync(effectiveKey);

            return new JsonResult(new { success = success, message = "Blank canvas initialized." });

        }

    }

}

