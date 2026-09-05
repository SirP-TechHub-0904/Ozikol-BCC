using System;
using System.Globalization;
using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.Extensions.Localization;
using Ozikol.Central.Models.Careers;
using Ozikol.Central.Services;
using Ozikol.Central.Services.Careers;

namespace Ozikol.Central.Pages;

/// <summary>
/// Page model handling the individual career role view, detailed requirements, benefits,
/// and file-attached candidate application submissions.
/// </summary>
public class CareersDetailModel : PageModel
{
    private readonly ICareersService _careersService;
    private readonly IRecaptchaService _recaptchaService;
    private readonly IStringLocalizer<SharedResource> _localizer;

    /// <summary>
    /// Initializes a new instance of the <see cref="CareersDetailModel"/> class.
    /// </summary>
    /// <param name="careersService">Careers content and application provider.</param>
    /// <param name="recaptchaService">Google reCAPTCHA verification provider.</param>
    /// <param name="localizer">Shared localization provider.</param>
    public CareersDetailModel(
        ICareersService careersService,
        IRecaptchaService recaptchaService,
        IStringLocalizer<SharedResource> localizer)
    {
        _careersService = careersService ?? throw new ArgumentNullException(nameof(careersService));
        _recaptchaService = recaptchaService ?? throw new ArgumentNullException(nameof(recaptchaService));
        _localizer = localizer ?? throw new ArgumentNullException(nameof(localizer));
    }

    /// <summary>
    /// Gets the resolved active career opportunity.
    /// </summary>
    public JobOpeningModel Opening { get; private set; } = null!;

    /// <summary>
    /// Gets the active 2-letter ISO language code for localized URL routing.
    /// </summary>
    public string CurrentCulture { get; private set; } = "en";

    /// <summary>
    /// Gets or sets the candidate application input form model.
    /// </summary>
    [BindProperty]
    public JobApplicationInput Input { get; set; } = new();

    /// <summary>
    /// Gets a value indicating whether the application was successfully submitted.
    /// </summary>
    public bool IsSubmitted { get; set; }

    /// <summary>
    /// Gets the assigned unique candidate application tracking reference code.
    /// </summary>
    public string AssignedReference { get; set; } = string.Empty;

    /// <summary>
    /// Gets the public Google reCAPTCHA site key.
    /// </summary>
    public string RecaptchaSiteKey => _recaptchaService.SiteKey;

    /// <summary>
    /// Handles GET requests to load and display the role description and application form.
    /// </summary>
    /// <param name="slug">The job permalink slug.</param>
    /// <returns>Page result or NotFound if the position does not exist.</returns>
    public async Task<IActionResult> OnGetAsync(string slug)
    {
        ResolveCulture();

        if (string.IsNullOrWhiteSpace(slug))
        {
            return RedirectToPage("/Careers", new { culture = CurrentCulture });
        }

        var opening = await _careersService.GetOpeningBySlugAsync(slug);
        if (opening == null)
        {
            return NotFound();
        }

        Opening = opening;
        Input.JobOpeningId = opening.Id;
        return Page();
    }

    /// <summary>
    /// Handles POST requests to validate candidate submissions and store CV and passport attachments.
    /// </summary>
    /// <param name="slug">The job permalink slug.</param>
    /// <returns>Confirmation view or page result with validation messages.</returns>
    public async Task<IActionResult> OnPostAsync(string slug)
    {
        ResolveCulture();

        var opening = await _careersService.GetOpeningBySlugAsync(slug);
        if (opening == null)
        {
            return NotFound();
        }

        Opening = opening;

        // 1. Verify Google reCAPTCHA
        var recaptchaResponse = Request.Form["g-recaptcha-response"].ToString();
        var clientIp = HttpContext.Connection.RemoteIpAddress?.ToString();
        var isCaptchaValid = await _recaptchaService.ValidateTokenAsync(recaptchaResponse, clientIp);

        if (!isCaptchaValid)
        {
            ModelState.AddModelError(string.Empty, _localizer["Careers_Error_Captcha"]);
            return Page();
        }

        // 2. Validate Terms agreement
        if (!Input.AgreeTerms)
        {
            ModelState.AddModelError("Input.AgreeTerms", _localizer["Careers_Error_AgreeTerms"]);
            return Page();
        }

        // 3. Validate CV attachment
        if (Input.CvFile == null || Input.CvFile.Length == 0)
        {
            ModelState.AddModelError("Input.CvFile", _localizer["Careers_Error_CvMissing"]);
            return Page();
        }

        var cvExt = Path.GetExtension(Input.CvFile.FileName).ToLowerInvariant();
        if (cvExt is not (".pdf" or ".docx" or ".doc"))
        {
            ModelState.AddModelError("Input.CvFile", _localizer["Careers_Error_CvFormat"]);
            return Page();
        }

        if (Input.CvFile.Length > 10 * 1024 * 1024)
        {
            ModelState.AddModelError("Input.CvFile", _localizer["Careers_Error_CvSize"]);
            return Page();
        }

        // 4. Validate Passport attachment
        if (Input.PassportFile == null || Input.PassportFile.Length == 0)
        {
            ModelState.AddModelError("Input.PassportFile", _localizer["Careers_Error_PassportMissing"]);
            return Page();
        }

        var passportExt = Path.GetExtension(Input.PassportFile.FileName).ToLowerInvariant();
        if (passportExt is not (".pdf" or ".jpg" or ".jpeg" or ".png"))
        {
            ModelState.AddModelError("Input.PassportFile", _localizer["Careers_Error_PassportFormat"]);
            return Page();
        }

        if (Input.PassportFile.Length > 10 * 1024 * 1024)
        {
            ModelState.AddModelError("Input.PassportFile", _localizer["Careers_Error_PassportSize"]);
            return Page();
        }

        if (!ModelState.IsValid)
        {
            return Page();
        }

        // 5. Submit application and upload files
        Input.JobOpeningId = opening.Id;
        var referenceCode = await _careersService.SubmitApplicationAsync(Input, clientIp);

        IsSubmitted = true;
        AssignedReference = referenceCode;
        return Page();
    }

    /// <summary>
    /// Resolves the current UI culture for language-aware link routing.
    /// </summary>
    private void ResolveCulture()
    {
        var culture = CultureInfo.CurrentUICulture.TwoLetterISOLanguageName.ToLowerInvariant();
        CurrentCulture = culture is "en" or "fr" or "es" or "de" ? culture : "en";
    }
}
