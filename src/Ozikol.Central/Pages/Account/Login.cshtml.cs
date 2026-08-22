using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Ozikol.Central.Services;
using Ozikol_BCC.Domain.Models;

namespace Ozikol.Central.Pages.Account;

public class LoginModel : PageModel
{
    private readonly UserManager<CentralUser> _userManager;
    private readonly ICentralTwoFactorService _twoFactorService;
    private readonly ICentralEmailService _emailService;
    private readonly ILogger<LoginModel> _logger;

    [BindProperty]
    public InputModel Input { get; set; } = new();

    public string? ErrorMessage { get; set; }

    public class InputModel
    {
        [Required(ErrorMessage = "Operator Email is required")]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required(ErrorMessage = "Password is required")]
        [DataType(DataType.Password)]
        public string Password { get; set; } = string.Empty;

        public bool RememberMe { get; set; }
    }

    public LoginModel(
        UserManager<CentralUser> userManager,
        ICentralTwoFactorService twoFactorService,
        ICentralEmailService emailService,
        ILogger<LoginModel> logger)
    {
        _userManager = userManager;
        _twoFactorService = twoFactorService;
        _emailService = emailService;
        _logger = logger;
    }

    public void OnGet()
    {
    }

    public async Task<IActionResult> OnPostAsync(string? returnUrl = null)
    {
        returnUrl ??= Url.Content("~/Operations/Fleet");

        if (!ModelState.IsValid)
        {
            return Page();
        }

        var user = await _userManager.FindByEmailAsync(Input.Email);
        if (user == null || !user.IsActive)
        {
            ErrorMessage = "Invalid operator credentials or account is suspended.";
            return Page();
        }

        var passwordValid = await _userManager.CheckPasswordAsync(user, Input.Password);
        if (!passwordValid)
        {
            ErrorMessage = "Invalid operator credentials.";
            return Page();
        }

        // Generate and dispatch Email OTP 2FA code
        var otp = _twoFactorService.GenerateEmailOtp(user.Email!);
        await _emailService.SendTwoFactorCodeEmailAsync(user.Email!, otp);

        _logger.LogInformation("Compulsory 2FA required for operator: {Email}. Dispatched OTP.", user.Email);

        // Redirect to 2FA verification step
        return RedirectToPage("/Account/TwoFactorVerify", new { email = user.Email, returnUrl });
    }
}
