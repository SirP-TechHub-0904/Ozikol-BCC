using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Ozikol.Central.Services;

namespace Ozikol.Central.Pages;

public class SignupModel : PageModel
{
    private readonly ITenantOnboardingService _onboardingService;
    private readonly IConfiguration _configuration;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<SignupModel> _logger;

    [BindProperty]
    public InputModel Input { get; set; } = new();

    public string? ErrorMessage { get; set; }
    public bool IsSuccess { get; set; }
    public string? RedirectUrl { get; set; }
    public string GoogleRecaptchaSiteKey { get; set; } = string.Empty;

    public class InputModel
    {
        [Required(ErrorMessage = "Organization / Company Name is required")]
        [StringLength(100, MinimumLength = 2)]
        public string OrganizationName { get; set; } = string.Empty;

        [Required(ErrorMessage = "Desired Subdomain / Workspace Key is required")]
        [RegularExpression(@"^[a-z0-9\-]+$", ErrorMessage = "Workspace key must only contain lowercase letters, numbers, and hyphens.")]
        [StringLength(50, MinimumLength = 3)]
        public string TenantKey { get; set; } = string.Empty;

        [Required(ErrorMessage = "First Name is required")]
        public string AdminFirstName { get; set; } = string.Empty;

        [Required(ErrorMessage = "Last Name is required")]
        public string AdminLastName { get; set; } = string.Empty;

        [Required(ErrorMessage = "Admin Email is required")]
        [EmailAddress]
        public string AdminEmail { get; set; } = string.Empty;

        [Required(ErrorMessage = "Password is required")]
        [StringLength(100, MinimumLength = 6, ErrorMessage = "Password must be at least 6 characters")]
        [DataType(DataType.Password)]
        public string AdminPassword { get; set; } = string.Empty;

        [Required(ErrorMessage = "Please confirm your password")]
        [DataType(DataType.Password)]
        [Compare("AdminPassword", ErrorMessage = "The password and confirmation password do not match.")]
        public string ConfirmPassword { get; set; } = string.Empty;

        [Phone]
        public string? PhoneNumber { get; set; }

        public string? CustomDomain { get; set; }

        public string? ReferredBy { get; set; }
    }

    public SignupModel(
        ITenantOnboardingService onboardingService,
        IConfiguration configuration,
        IHttpClientFactory httpClientFactory,
        ILogger<SignupModel> logger)
    {
        _onboardingService = onboardingService;
        _configuration = configuration;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public void OnGet(string? @ref)
    {
        GoogleRecaptchaSiteKey = GetSiteKey();
        if (!string.IsNullOrWhiteSpace(@ref))
        {
            Input.ReferredBy = @ref.Trim().ToUpperInvariant();
        }
    }

    public async Task<IActionResult> OnPostAsync()
    {
        GoogleRecaptchaSiteKey = GetSiteKey();

        if (!ModelState.IsValid)
        {
            return Page();
        }

        // 1. Validate Google reCAPTCHA
        string? recaptchaResponse = Request.Form["g-recaptcha-response"];
        bool captchaValid = await ValidateGoogleRecaptchaAsync(recaptchaResponse);
        if (!captchaValid)
        {
            ErrorMessage = "Security check failed. Please check the reCAPTCHA box.";
            return Page();
        }

        // 2. Validate Referral Code if provided
        if (!string.IsNullOrWhiteSpace(Input.ReferredBy))
        {
            bool referralValid = await _onboardingService.IsReferralCodeValidAsync(Input.ReferredBy);
            if (!referralValid)
            {
                ErrorMessage = $"The referral partner code '{Input.ReferredBy}' is invalid or inactive.";
                return Page();
            }
        }

        var result = await _onboardingService.OnboardNewTenantAsync(new TenantOnboardingRequest
        {
            OrganizationName = Input.OrganizationName,
            TenantKey = Input.TenantKey,
            AdminFirstName = Input.AdminFirstName,
            AdminLastName = Input.AdminLastName,
            AdminEmail = Input.AdminEmail,
            AdminPassword = Input.AdminPassword,
            PhoneNumber = Input.PhoneNumber,
            CustomDomain = Input.CustomDomain,
            ReferredBy = Input.ReferredBy
        });

        if (!result.Success)
        {
            ErrorMessage = result.Message;
            return Page();
        }

        IsSuccess = true;
        RedirectUrl = result.RedirectUrl;

        // Auto-redirect to the provisioned tenant MIS dashboard
        return Redirect(result.RedirectUrl);
    }

    private string GetSiteKey()
    {
        return _configuration["GoogleReCaptcha:SiteKey"]
            ?? Environment.GetEnvironmentVariable("GoogleReCaptcha__SiteKey")
            ?? "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"; // Google public test site key
    }

    private async Task<bool> ValidateGoogleRecaptchaAsync(string? recaptchaResponse)
    {
        var secretKey = _configuration["GoogleReCaptcha:SecretKey"]
            ?? Environment.GetEnvironmentVariable("GoogleReCaptcha__SecretKey");

        // If secret key is not configured in environment, allow seamless bypass for development/staging
        if (string.IsNullOrWhiteSpace(secretKey))
        {
            return true;
        }

        if (string.IsNullOrWhiteSpace(recaptchaResponse))
        {
            return false;
        }

        try
        {
            var client = _httpClientFactory.CreateClient();
            var content = new FormUrlEncodedContent(new[]
            {
                new KeyValuePair<string, string>("secret", secretKey),
                new KeyValuePair<string, string>("response", recaptchaResponse)
            });

            var response = await client.PostAsync("https://www.google.com/recaptcha/api/siteverify", content);
            if (response.IsSuccessStatusCode)
            {
                var json = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(json);
                if (doc.RootElement.TryGetProperty("success", out var successElement))
                {
                    return successElement.GetBoolean();
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error verifying Google reCAPTCHA");
            return true;
        }

        return false;
    }
}
