using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;

namespace Ozikol_BCC.Website.Areas.BcpIdentity.Pages.Console;

[Authorize]
public class PasswordPolicyModel : PageModel
{
    private readonly DashboardDbContext _context;

    public PasswordPolicyModel(DashboardDbContext context)
    {
        _context = context;
    }

    [BindProperty]
    public InputModel Input { get; set; } = new();

    [TempData]
    public string? StatusMessage { get; set; }

    public async Task OnGetAsync()
    {
        var settings = await _context.BcpSettings.FirstOrDefaultAsync();

        if (settings != null)
        {
            Input = new InputModel
            {
                PasswordMinLength = settings.PasswordMinLength,
                PasswordRequireDigit = settings.PasswordRequireDigit,
                PasswordRequireLowercase = settings.PasswordRequireLowercase,
                PasswordRequireUppercase = settings.PasswordRequireUppercase,
                PasswordRequireNonAlphanumeric = settings.PasswordRequireNonAlphanumeric,
                PasswordExpirationDays = settings.PasswordExpirationDays,
                MaxFailedAccessAttempts = settings.MaxFailedAccessAttempts,
                LockoutDurationMinutes = settings.LockoutDurationMinutes
            };
        }
    }

    public async Task<IActionResult> OnPostAsync()
    {
        if (!ModelState.IsValid)
        {
            return Page();
        }

        var settings = await _context.BcpSettings.FirstOrDefaultAsync();
        if (settings == null)
        {
            settings = new BcpSetting();
            _context.BcpSettings.Add(settings);
        }

        settings.PasswordMinLength = Input.PasswordMinLength;
        settings.PasswordRequireDigit = Input.PasswordRequireDigit;
        settings.PasswordRequireLowercase = Input.PasswordRequireLowercase;
        settings.PasswordRequireUppercase = Input.PasswordRequireUppercase;
        settings.PasswordRequireNonAlphanumeric = Input.PasswordRequireNonAlphanumeric;
        settings.PasswordExpirationDays = Input.PasswordExpirationDays;
        settings.MaxFailedAccessAttempts = Input.MaxFailedAccessAttempts;
        settings.LockoutDurationMinutes = Input.LockoutDurationMinutes;

        await _context.SaveChangesAsync();
        StatusMessage = "Password policy security rules updated successfully.";

        return RedirectToPage();
    }

    public class InputModel
    {
        [Required, Range(6, 64, ErrorMessage = "Minimum password length must be between 6 and 64 characters.")]
        [Display(Name = "Minimum Password Length")]
        public int PasswordMinLength { get; set; } = 8;

        [Display(Name = "Require Digit (0-9)")]
        public bool PasswordRequireDigit { get; set; } = true;

        [Display(Name = "Require Lowercase (a-z)")]
        public bool PasswordRequireLowercase { get; set; } = true;

        [Display(Name = "Require Uppercase (A-Z)")]
        public bool PasswordRequireUppercase { get; set; } = true;

        [Display(Name = "Require Non-Alphanumeric Special Characters (!@#$)")]
        public bool PasswordRequireNonAlphanumeric { get; set; } = true;

        [Required, Range(0, 365, ErrorMessage = "Password expiration days must be between 0 and 365.")]
        [Display(Name = "Password Expiration (Days, 0 to disable)")]
        public int PasswordExpirationDays { get; set; } = 90;

        [Required, Range(1, 20, ErrorMessage = "Max failed attempts must be between 1 and 20.")]
        [Display(Name = "Max Failed Attempts Before Lockout")]
        public int MaxFailedAccessAttempts { get; set; } = 5;

        [Required, Range(1, 1440, ErrorMessage = "Lockout duration must be between 1 and 1440 minutes.")]
        [Display(Name = "Lockout Duration (Minutes)")]
        public int LockoutDurationMinutes { get; set; } = 15;
    }
}