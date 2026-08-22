using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Application.Services;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Website.Services;
using System;
using System.Threading.Tasks;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Website.Areas.BcpIdentity.Pages.Workspace;

[Authorize]
public class ProfileModel : PageModel
{
    private readonly UserManager<Profile> _userManager;
    private readonly IBcpMessageQueueService _messageQueue;
    private readonly SignInManager<Profile> _signInManager;
    private readonly IOtpVerificationService _otpService;

    public ProfileModel(
        UserManager<Profile> userManager,
        IBcpMessageQueueService messageQueue,
        SignInManager<Profile> signInManager,
        IOtpVerificationService otpService)
    {
        _userManager = userManager;
        _messageQueue = messageQueue;
        _signInManager = signInManager;
        _otpService = otpService;
    }

    [BindProperty]
    public InputModel Input { get; set; } = new();

    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// Full profile with category for the "Profile Summary" section (merged from User Management).
    /// </summary>
    public Profile? UserProfile { get; set; }

    [TempData]
    public string? StatusMessage { get; set; }

    // ── Email Update Verification Properties ──────────────────────────
    [BindProperty]
    [EmailAddress]
    public string? NewEmail { get; set; }

    [BindProperty]
    public string? OtpCodeInput { get; set; }

    [BindProperty]
    public string? PhoneOtpInput { get; set; }

    public bool IsOtpSent { get; set; }
    public string? PendingEmail { get; set; }
    public bool IsEmailConfirmed { get; set; }
    public bool IsPhoneConfirmed { get; set; }

    public async Task<IActionResult> OnGetAsync()
    {
        var user = await _userManager.GetUserAsync(User);
        if (user == null)
        {
            return NotFound("Unable to load user profile.");
        }

        Email = user.Email ?? string.Empty;
        IsEmailConfirmed = user.EmailConfirmed;
        IsPhoneConfirmed = user.PhoneNumberConfirmed;
        Input = new InputModel
        {
            Title = user.Title,
            FirstName = user.FirstName ?? string.Empty,
            MiddleName = user.MiddleName,
            LastName = user.LastName ?? string.Empty,
            PhoneNumber = user.PhoneNumber
        };

        // Load active OTP status from DB user tokens
        var activeOtp = await _userManager.GetAuthenticationTokenAsync(user, "BcpEmailChange", "OtpCode");
        PendingEmail = await _userManager.GetAuthenticationTokenAsync(user, "BcpEmailChange", "NewEmail");
        IsOtpSent = !string.IsNullOrWhiteSpace(activeOtp) && !string.IsNullOrWhiteSpace(PendingEmail);

        // Load full profile with category for the summary section
        UserProfile = await _userManager.Users
            .Include(x => x.BcpUserCategory)
            .FirstOrDefaultAsync(x => x.Id == user.Id);

        return Page();
    }

    public async Task<IActionResult> OnPostAsync()
    {
        var user = await _userManager.GetUserAsync(User);
        if (user == null)
        {
            return NotFound("Unable to load user profile.");
        }

        Email = user.Email ?? string.Empty;

        // Restore active OTP state
        var activeOtp = await _userManager.GetAuthenticationTokenAsync(user, "BcpEmailChange", "OtpCode");
        PendingEmail = await _userManager.GetAuthenticationTokenAsync(user, "BcpEmailChange", "NewEmail");
        IsOtpSent = !string.IsNullOrWhiteSpace(activeOtp) && !string.IsNullOrWhiteSpace(PendingEmail);

        if (!ModelState.IsValid)
        {
            UserProfile = await _userManager.Users.Include(x => x.BcpUserCategory).FirstOrDefaultAsync(x => x.Id == user.Id);
            return Page();
        }

        if (!string.IsNullOrWhiteSpace(Input.PhoneNumber))
        {
            var phoneClean = Input.PhoneNumber.Trim();
            var existingPhone = await _userManager.Users.AnyAsync(u => u.Id != user.Id && u.PhoneNumber == phoneClean);
            if (existingPhone)
            {
                ModelState.AddModelError("Input.PhoneNumber", "This phone number is already registered to another account.");
                UserProfile = await _userManager.Users.Include(x => x.BcpUserCategory).FirstOrDefaultAsync(x => x.Id == user.Id);
                return Page();
            }
        }

        user.Title = Input.Title;
        user.FirstName = Input.FirstName;
        user.MiddleName = Input.MiddleName;
        user.LastName = Input.LastName;
        user.PhoneNumber = Input.PhoneNumber;

        var result = await _userManager.UpdateAsync(user);
        if (!result.Succeeded)
        {
            foreach (var error in result.Errors)
            {
                ModelState.AddModelError(string.Empty, error.Description);
            }
            UserProfile = await _userManager.Users.Include(x => x.BcpUserCategory).FirstOrDefaultAsync(x => x.Id == user.Id);
            return Page();
        }

        StatusMessage = "Your profile has been updated.";

        await _messageQueue.EnqueueAsync(
            BcpEventType.ProfileUpdated,
            user.Id,
            "Profile Updated",
            "Your personal profile information has been updated.",
            actionUrl: "/BcpIdentity/Workspace/Profile");

        return RedirectToPage();
    }

    // Handler to send OTP to the new email address
    public async Task<IActionResult> OnPostSendOtpAsync()
    {
        var user = await _userManager.GetUserAsync(User);
        if (user == null) return NotFound();

        Email = user.Email ?? string.Empty;
        UserProfile = await _userManager.Users.Include(x => x.BcpUserCategory).FirstOrDefaultAsync(x => x.Id == user.Id);

        if (string.IsNullOrWhiteSpace(NewEmail))
        {
            ModelState.AddModelError("NewEmail", "New email address is required.");
            return Page();
        }

        var newEmailClean = NewEmail.Trim().ToLower();

        if (newEmailClean == Email.ToLower())
        {
            ModelState.AddModelError("NewEmail", "Please enter a different email address from your current one.");
            return Page();
        }

        // Check if email is already taken
        var emailExists = await _userManager.Users.AnyAsync(u => u.Email == newEmailClean);
        if (emailExists)
        {
            ModelState.AddModelError("NewEmail", "Another user account is already registered with this email address.");
            return Page();
        }

        // Generate 6-digit numeric OTP
        var random = new Random();
        var otp = random.Next(100000, 999999).ToString();

        // Save verification data using built-in ASP.NET Identity User Tokens
        await _userManager.SetAuthenticationTokenAsync(user, "BcpEmailChange", "OtpCode", otp);
        await _userManager.SetAuthenticationTokenAsync(user, "BcpEmailChange", "NewEmail", newEmailClean);

        // Queue verification email to the new address
        var subject = "Email Address Change Verification Code";
        var body = $"Your verification code to update your BCP profile email address to '{newEmailClean}' is {otp}. This code is valid for 30 minutes.";
        var htmlBody = $@"
<div style=""max-width:600px;margin:0 auto;font-family:'Segoe UI',Arial,sans-serif;color:#1e293b;padding:32px;"">
    <h2 style=""margin:0 0 16px 0;font-size:20px;color:#0f172a;"">Verify Your New Email</h2>
    <p style=""margin:0;font-size:15px;line-height:1.6;color:#475569;"">You requested to update your email address on the Business Command Platform.</p>
    <p style=""margin:20px 0;font-size:24px;font-weight:700;color:#4f46e5;letter-spacing:2px;text-align:center;"">{otp}</p>
    <p style=""margin:0;font-size:13px;color:#64748b;"">Enter this 6-digit code on the profile page to complete the change. If you did not make this request, please change your password immediately.</p>
</div>";

        await _messageQueue.EnqueueEmailAsync(
            recipientEmail: newEmailClean,
            recipientName: user.FullName,
            subject: subject,
            htmlBody: htmlBody,
            category: BcpMessageCategory.Security,
            priority: BcpMessagePriority.Urgent,
            relatedUserId: user.Id,
            eventType: BcpEventType.ProfileUpdated
        );

        StatusMessage = $"A 6-digit verification code has been sent to {newEmailClean}. Please check your inbox.";
        return RedirectToPage();
    }

    // Handler to verify the OTP and apply the email change
    public async Task<IActionResult> OnPostConfirmEmailAsync()
    {
        var user = await _userManager.GetUserAsync(User);
        if (user == null) return NotFound();

        Email = user.Email ?? string.Empty;
        UserProfile = await _userManager.Users.Include(x => x.BcpUserCategory).FirstOrDefaultAsync(x => x.Id == user.Id);

        var savedOtp = await _userManager.GetAuthenticationTokenAsync(user, "BcpEmailChange", "OtpCode");
        var savedNewEmail = await _userManager.GetAuthenticationTokenAsync(user, "BcpEmailChange", "NewEmail");

        if (string.IsNullOrWhiteSpace(savedOtp) || string.IsNullOrWhiteSpace(savedNewEmail))
        {
            ModelState.AddModelError(string.Empty, "Email change session expired or invalid. Please send a new code.");
            return Page();
        }

        if (string.IsNullOrWhiteSpace(OtpCodeInput) || OtpCodeInput.Trim() != savedOtp.Trim())
        {
            ModelState.AddModelError("OtpCodeInput", "Verification code is incorrect.");
            IsOtpSent = true;
            PendingEmail = savedNewEmail;
            return Page();
        }

        // Apply email & username updates
        user.Email = savedNewEmail;
        user.UserName = savedNewEmail;
        user.NormalizedEmail = _userManager.NormalizeEmail(savedNewEmail);
        user.NormalizedUserName = _userManager.NormalizeName(savedNewEmail);

        var updateResult = await _userManager.UpdateAsync(user);
        if (!updateResult.Succeeded)
        {
            foreach (var error in updateResult.Errors)
            {
                ModelState.AddModelError(string.Empty, error.Description);
            }
            IsOtpSent = true;
            PendingEmail = savedNewEmail;
            return Page();
        }

        // Clear temporary user tokens
        await _userManager.RemoveAuthenticationTokenAsync(user, "BcpEmailChange", "OtpCode");
        await _userManager.RemoveAuthenticationTokenAsync(user, "BcpEmailChange", "NewEmail");

        // Refresh sign-in cookies since UserName/Email changed
        await _signInManager.RefreshSignInAsync(user);

        // Queue success notification
        await _messageQueue.EnqueueAsync(
            BcpEventType.ProfileUpdated,
            user.Id,
            "Email Address Updated",
            $"Your BCP login email address was updated successfully to '{savedNewEmail}'.",
            actionUrl: "/BcpIdentity/Workspace/Profile"
        );

        StatusMessage = $"Your email address was successfully updated to {savedNewEmail}.";
        return RedirectToPage();
    }

    // ── Phone Verification Handlers ──

    public async Task<IActionResult> OnPostSendPhoneOtpAsync()
    {
        var user = await _userManager.GetUserAsync(User);
        if (user == null) return NotFound();

        if (string.IsNullOrWhiteSpace(user.PhoneNumber))
        {
            StatusMessage = "Error: Please set and save your phone number before requesting verification.";
            return RedirectToPage();
        }

        var sent = await _otpService.SendPhoneOtpAsync(user.Id, user.PhoneNumber);
        if (sent.Success)
        {
            StatusMessage = $"A 6-digit OTP code has been sent via SMS to {user.PhoneNumber}.";
        }
        else
        {
            StatusMessage = "Error: Failed to send Phone OTP. Please try again.";
        }

        return RedirectToPage();
    }

    public async Task<IActionResult> OnPostVerifyPhoneOtpAsync()
    {
        var user = await _userManager.GetUserAsync(User);
        if (user == null) return NotFound();

        if (string.IsNullOrWhiteSpace(PhoneOtpInput))
        {
            StatusMessage = "Error: Please enter the 6-digit phone OTP code.";
            return RedirectToPage();
        }

        var (success, msg) = await _otpService.VerifyPhoneOtpAsync(user.Id, PhoneOtpInput);
        StatusMessage = success ? msg : $"Error: {msg}";
        return RedirectToPage();
    }
}

public class InputModel
{
    public string? Title { get; set; }

    [Required]
    [Display(Name = "First Name")]
    public string FirstName { get; set; } = string.Empty;

    [Display(Name = "Middle Name")]
    public string? MiddleName { get; set; }

    [Required]
    [Display(Name = "Last Name")]
    public string LastName { get; set; } = string.Empty;

    [Display(Name = "Phone Number")]
    [Phone]
    public string? PhoneNumber { get; set; }
}