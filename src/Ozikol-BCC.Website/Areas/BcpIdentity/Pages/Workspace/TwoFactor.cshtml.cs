using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;
using Ozikol_BCC.Website.Services;
using System;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using System.Text.Encodings.Web;
using System.Threading.Tasks;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Website.Areas.BcpIdentity.Pages.Workspace
{
    [Authorize]
    public class TwoFactorModel : PageModel
    {
        private readonly UserManager<Profile> _userManager;
        private readonly UrlEncoder _urlEncoder;
        private readonly IBcpMessageQueueService _messageQueue;
        private readonly DashboardDbContext _context;

        public TwoFactorModel(
            UserManager<Profile> userManager,
            UrlEncoder urlEncoder,
            IBcpMessageQueueService messageQueue,
            DashboardDbContext context)
        {
            _userManager = userManager;
            _urlEncoder = urlEncoder;
            _messageQueue = messageQueue;
            _context = context;
        }

        public bool Is2FaEnabled { get; set; }
        public BcpTwoFactorProvider ActiveProvider { get; set; }

        public bool IsEmailConfirmed { get; set; }
        public bool IsPhoneConfirmed { get; set; }
        public bool HasAuthenticatorKey { get; set; }

        // TOTP Authenticator Fields
        public string SharedKey { get; set; } = string.Empty;
        public string AuthenticatorUri { get; set; } = string.Empty;

        // Current user contact details for display
        public string? EmailAddress { get; set; }
        public string? PhoneNumber { get; set; }

        [BindProperty]
        public InputModel Input { get; set; } = new();

        [TempData]
        public string? StatusMessage { get; set; }

        public async Task<IActionResult> OnGetAsync()
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null) return NotFound("Unable to load user.");

            Is2FaEnabled = await _userManager.GetTwoFactorEnabledAsync(user);
            ActiveProvider = user.PreferredTwoFactorProvider;
            EmailAddress = user.Email;
            PhoneNumber = user.PhoneNumber;
            IsEmailConfirmed = user.EmailConfirmed;
            IsPhoneConfirmed = user.PhoneNumberConfirmed;

            // Pre-generate TOTP Authenticator keys in case they want to set up Google/Microsoft Authenticator
            var key = await _userManager.GetAuthenticatorKeyAsync(user);
            if (string.IsNullOrEmpty(key))
            {
                await _userManager.ResetAuthenticatorKeyAsync(user);
                key = await _userManager.GetAuthenticatorKeyAsync(user);
            }

            // Retrieve company name from ConfigSettings
            var config = await _context.ConfigSettings.FirstOrDefaultAsync();
            var companyName = config?.CompanyName ?? "Ozikol BCP";

            SharedKey = FormatKey(key!);
            AuthenticatorUri = GenerateQrCodeUri(companyName, user.Email ?? "user", key!);
            
            // Checking if the user has verified/configured the key at least once
            HasAuthenticatorKey = !string.IsNullOrEmpty(key) && (user.PreferredTwoFactorProvider == BcpTwoFactorProvider.GoogleAuthenticator || user.PreferredTwoFactorProvider == BcpTwoFactorProvider.MicrosoftAuthenticator || user.TwoFactorEnabled);

            return Page();
        }

        // --- HANDLER: ENABLE GOOGLE/MICROSOFT AUTHENTICATOR ---
        public async Task<IActionResult> OnPostEnableAuthenticatorAsync(BcpTwoFactorProvider provider)
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null) return NotFound("Unable to load user.");

            // Enforce disabling any active 2FA first
            if (await _userManager.GetTwoFactorEnabledAsync(user))
            {
                StatusMessage = "Error: Please disable your current active 2FA method first.";
                return RedirectToPage();
            }

            if (string.IsNullOrWhiteSpace(Input.Code))
            {
                StatusMessage = "Error: Verification code is required.";
                return RedirectToPage();
            }

            var verificationCode = Input.Code.Replace(" ", string.Empty).Replace("-", string.Empty);
            var isValid = await _userManager.VerifyTwoFactorTokenAsync(
                user, _userManager.Options.Tokens.AuthenticatorTokenProvider, verificationCode);

            if (!isValid)
            {
                StatusMessage = "Error: Verification code is invalid.";
                return RedirectToPage();
            }

            user.PreferredTwoFactorProvider = provider;
            await _userManager.SetTwoFactorEnabledAsync(user, true);
            await _userManager.UpdateAsync(user);

            await _messageQueue.EnqueueAsync(
                BcpEventType.TwoFactorEnabled,
                user.Id,
                "Two-Factor Authentication Enabled",
                $"You enabled {provider} as your preferred two-factor provider.",
                actionUrl: "/BcpIdentity/Workspace/TwoFactor");

            StatusMessage = $"Your {provider} app has been verified and set as preferred.";
            
            if (await _userManager.CountRecoveryCodesAsync(user) == 0)
            {
                await _userManager.GenerateNewTwoFactorRecoveryCodesAsync(user, 10);
            }

            return RedirectToPage();
        }

        // --- HANDLER: SEND EMAIL 2FA VERIFICATION CODE ---
        public async Task<IActionResult> OnPostSendEmailCodeAsync()
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null) return NotFound("Unable to load user.");

            // Enforce disabling any active 2FA first
            if (await _userManager.GetTwoFactorEnabledAsync(user))
            {
                StatusMessage = "Error: Please disable your current active 2FA method first.";
                return RedirectToPage();
            }

            if (string.IsNullOrWhiteSpace(user.Email))
            {
                StatusMessage = "Error: A verified email address is required.";
                return RedirectToPage();
            }

            // Generate token
            var token = await _userManager.GenerateTwoFactorTokenAsync(user, "Email");

            // Dispatch directly via Email queue
            await _messageQueue.EnqueueEmailAsync(
                user.Email!,
                user.FullName,
                "2FA Verification Code",
                $"Your two-factor verification code is: {token}. Use this to complete setting up Email 2FA.",
                BcpMessageCategory.Security,
                BcpMessagePriority.Urgent,
                user.Id,
                BcpEventType.LoginOtp);

            StatusMessage = "Verification code sent to your registered email address.";
            return RedirectToPage();
        }

        // --- HANDLER: ENABLE EMAIL 2FA ---
        public async Task<IActionResult> OnPostEnableEmailAsync()
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null) return NotFound("Unable to load user.");

            // Enforce disabling any active 2FA first
            if (await _userManager.GetTwoFactorEnabledAsync(user))
            {
                StatusMessage = "Error: Please disable your current active 2FA method first.";
                return RedirectToPage();
            }

            if (string.IsNullOrWhiteSpace(Input.Code))
            {
                StatusMessage = "Error: Verification code is required.";
                return RedirectToPage();
            }

            var isValid = await _userManager.VerifyTwoFactorTokenAsync(user, "Email", Input.Code);
            if (!isValid)
            {
                StatusMessage = "Error: Verification code is invalid.";
                return RedirectToPage();
            }

            user.PreferredTwoFactorProvider = BcpTwoFactorProvider.Email;
            await _userManager.SetTwoFactorEnabledAsync(user, true);
            await _userManager.UpdateAsync(user);

            await _messageQueue.EnqueueAsync(
                BcpEventType.TwoFactorEnabled,
                user.Id,
                "Two-Factor Authentication Enabled",
                "You have enabled Email as your preferred 2FA provider.",
                actionUrl: "/BcpIdentity/Workspace/TwoFactor");

            StatusMessage = "Email two-factor verification is now active.";
            return RedirectToPage();
        }

        // --- HANDLER: SEND SMS 2FA VERIFICATION CODE ---
        public async Task<IActionResult> OnPostSendSmsCodeAsync(string phoneNumber)
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null) return NotFound("Unable to load user.");

            // Enforce disabling any active 2FA first
            if (await _userManager.GetTwoFactorEnabledAsync(user))
            {
                StatusMessage = "Error: Please disable your current active 2FA method first.";
                return RedirectToPage();
            }

            if (string.IsNullOrWhiteSpace(phoneNumber))
            {
                StatusMessage = "Error: Phone number is required.";
                return RedirectToPage();
            }

            // Temporarily set and update phone number (requires confirmation)
            user.PhoneNumber = phoneNumber;
            await _userManager.UpdateAsync(user);

            // Generate Phone token
            var token = await _userManager.GenerateTwoFactorTokenAsync(user, "Phone");

            // Dispatch directly via SMS queue
            await _messageQueue.EnqueueSmsAsync(
                phoneNumber,
                $"Your Ozikol 2FA code is: {token}",
                BcpMessageCategory.Security,
                BcpMessagePriority.Urgent,
                user.Id,
                BcpEventType.LoginOtp);

            StatusMessage = $"Verification code sent to {phoneNumber}.";
            return RedirectToPage();
        }

        // --- HANDLER: ENABLE SMS 2FA ---
        public async Task<IActionResult> OnPostEnableSmsAsync()
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null) return NotFound("Unable to load user.");

            // Enforce disabling any active 2FA first
            if (await _userManager.GetTwoFactorEnabledAsync(user))
            {
                StatusMessage = "Error: Please disable your current active 2FA method first.";
                return RedirectToPage();
            }

            if (string.IsNullOrWhiteSpace(Input.Code))
            {
                StatusMessage = "Error: Verification code is required.";
                return RedirectToPage();
            }

            var isValid = await _userManager.VerifyTwoFactorTokenAsync(user, "Phone", Input.Code);
            if (!isValid)
            {
                StatusMessage = "Error: Verification code is invalid.";
                return RedirectToPage();
            }

            // Set phone confirmed
            user.PhoneNumberConfirmed = true;
            user.PreferredTwoFactorProvider = BcpTwoFactorProvider.SMS;
            await _userManager.SetTwoFactorEnabledAsync(user, true);
            await _userManager.UpdateAsync(user);

            await _messageQueue.EnqueueAsync(
                BcpEventType.TwoFactorEnabled,
                user.Id,
                "Two-Factor Authentication Enabled",
                "You have enabled SMS as your preferred 2FA provider.",
                actionUrl: "/BcpIdentity/Workspace/TwoFactor");

            StatusMessage = "SMS two-factor verification is now active.";
            return RedirectToPage();
        }

        // --- HANDLER: DISABLE 2FA ---
        public async Task<IActionResult> OnPostDisableAsync()
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null) return NotFound("Unable to load user.");

            user.PreferredTwoFactorProvider = BcpTwoFactorProvider.None;
            await _userManager.SetTwoFactorEnabledAsync(user, false);
            await _userManager.UpdateAsync(user);

            await _messageQueue.EnqueueAsync(
                BcpEventType.TwoFactorDisabled,
                user.Id,
                "Two-Factor Authentication Disabled",
                "Two-Factor Authentication has been disabled on your account.",
                actionUrl: "/BcpIdentity/Workspace/TwoFactor");

            StatusMessage = "Two-Factor Authentication has been disabled.";
            return RedirectToPage();
        }

        // --- HANDLER: SET AS PREFERRED ---
        public async Task<IActionResult> OnPostSetPreferredAsync(BcpTwoFactorProvider provider)
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null) return NotFound("Unable to load user.");

            // Enforce disabling any active 2FA first
            if (await _userManager.GetTwoFactorEnabledAsync(user))
            {
                StatusMessage = "Error: Please disable your current active 2FA method first.";
                return RedirectToPage();
            }

            // Verify they have configured/confirmed the method
            if (provider == BcpTwoFactorProvider.Email && !user.EmailConfirmed)
            {
                StatusMessage = "Error: You must confirm your email before enabling Email 2FA.";
                return RedirectToPage();
            }
            if (provider == BcpTwoFactorProvider.SMS)
            {
                if (string.IsNullOrWhiteSpace(user.PhoneNumber))
                {
                    StatusMessage = "Error: You must set a phone number before enabling SMS 2FA.";
                    return RedirectToPage();
                }
                user.PhoneNumberConfirmed = true;
            }

            user.PreferredTwoFactorProvider = provider;
            await _userManager.SetTwoFactorEnabledAsync(user, true);
            await _userManager.UpdateAsync(user);

            await _messageQueue.EnqueueAsync(
                BcpEventType.TwoFactorEnabled,
                user.Id,
                "Two-Factor Preferred Method Changed",
                $"You updated your preferred 2FA method to {provider}.",
                actionUrl: "/BcpIdentity/Workspace/TwoFactor");

            StatusMessage = $"Successfully set {provider} as your preferred two-factor method.";
            return RedirectToPage();
        }

        private string FormatKey(string unformattedKey)
        {
            var result = new System.Text.StringBuilder();
            int currentPosition = 0;
            while (currentPosition + 4 < unformattedKey.Length)
            {
                result.Append(unformattedKey.AsSpan(currentPosition, 4)).Append(' ');
                currentPosition += 4;
            }
            if (currentPosition < unformattedKey.Length)
            {
                result.Append(unformattedKey.AsSpan(currentPosition));
            }

            return result.ToString().ToLowerInvariant();
        }

        private string GenerateQrCodeUri(string companyName, string email, string unformattedKey)
        {
            var issuer = companyName.Trim();
            return string.Format(
                "otpauth://totp/{0}:{1}?secret={2}&issuer={0}&digits=6",
                _urlEncoder.Encode(issuer),
                _urlEncoder.Encode(email),
                unformattedKey);
        }

        public class InputModel
        {
            [Required]
            [DataType(DataType.Text)]
            [Display(Name = "Code")]
            public string Code { get; set; } = string.Empty;
        }
    }
}