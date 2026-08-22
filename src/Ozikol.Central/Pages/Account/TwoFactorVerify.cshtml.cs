using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Ozikol.Central.Services;
using Ozikol_BCC.Domain.Models;

namespace Ozikol.Central.Pages.Account;

public class TwoFactorVerifyModel : PageModel
{
    private readonly UserManager<CentralUser> _userManager;
    private readonly SignInManager<CentralUser> _signInManager;
    private readonly ICentralTwoFactorService _twoFactorService;
    private readonly ICentralEmailService _emailService;
    private readonly ILogger<TwoFactorVerifyModel> _logger;

    [BindProperty]
    public InputModel Input { get; set; } = new();

    public string OperatorEmail { get; set; } = string.Empty;
    public string? ReturnUrl { get; set; }
    public string? ErrorMessage { get; set; }
    public string? InfoMessage { get; set; }

    public class InputModel
    {
        [Required(ErrorMessage = "6-digit verification code is required")]
        [StringLength(6, MinimumLength = 6, ErrorMessage = "Code must be exactly 6 digits")]
        [RegularExpression(@"^[0-9]{6}$", ErrorMessage = "Code must be numeric")]
        public string Code { get; set; } = string.Empty;

        public string Method { get; set; } = "Email"; // Email or Authenticator
    }

    public TwoFactorVerifyModel(
        UserManager<CentralUser> userManager,
        SignInManager<CentralUser> signInManager,
        ICentralTwoFactorService twoFactorService,
        ICentralEmailService emailService,
        ILogger<TwoFactorVerifyModel> logger)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _twoFactorService = twoFactorService;
        _emailService = emailService;
        _logger = logger;
    }

    public async Task<IActionResult> OnGetAsync(string? email, string? returnUrl = null)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            return RedirectToPage("/Account/Login");
        }

        var user = await _userManager.FindByEmailAsync(email);
        if (user == null || !user.IsActive)
        {
            return RedirectToPage("/Account/Login");
        }

        OperatorEmail = email;
        ReturnUrl = returnUrl ?? Url.Content("~/Operations/Fleet");
        InfoMessage = $"A 6-digit security code was dispatched to {email}. Check your inbox or use your Authenticator app.";

        return Page();
    }

    public async Task<IActionResult> OnPostAsync(string? email, string? returnUrl = null)
    {
        ReturnUrl = returnUrl ?? Url.Content("~/Operations/Fleet");

        if (string.IsNullOrWhiteSpace(email))
        {
            return RedirectToPage("/Account/Login");
        }

        OperatorEmail = email;

        if (!ModelState.IsValid)
        {
            return Page();
        }

        var user = await _userManager.FindByEmailAsync(email);
        if (user == null || !user.IsActive)
        {
            ErrorMessage = "Operator account not found or deactivated.";
            return Page();
        }

        bool isVerified = false;

        // 1. Check Email OTP
        if (_twoFactorService.VerifyEmailOtp(user.Email!, Input.Code))
        {
            isVerified = true;
        }
        // 2. Check Authenticator TOTP if user has a 2FA key
        else
        {
            var userKey = await _userManager.GetAuthenticatorKeyAsync(user);
            if (!string.IsNullOrEmpty(userKey) && _twoFactorService.VerifyTotpCode(userKey, Input.Code))
            {
                isVerified = true;
            }
        }

        if (isVerified)
        {
            user.LastLoginUtc = DateTime.UtcNow;
            await _userManager.UpdateAsync(user);

            await _signInManager.SignInAsync(user, isPersistent: true);
            _logger.LogInformation("Operator {Email} successfully authenticated with 2FA.", user.Email);

            return LocalRedirect(ReturnUrl);
        }

        ErrorMessage = "Invalid or expired 2FA code. Please verify and try again.";
        return Page();
    }

    public async Task<IActionResult> OnPostResendCodeAsync(string? email, string? returnUrl = null)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            return RedirectToPage("/Account/Login");
        }

        var user = await _userManager.FindByEmailAsync(email);
        if (user != null && user.IsActive)
        {
            var otp = _twoFactorService.GenerateEmailOtp(user.Email!);
            await _emailService.SendTwoFactorCodeEmailAsync(user.Email!, otp);
            InfoMessage = $"A fresh 6-digit verification code has been dispatched to {email}.";
        }

        OperatorEmail = email;
        ReturnUrl = returnUrl ?? Url.Content("~/Operations/Fleet");
        return Page();
    }
}
