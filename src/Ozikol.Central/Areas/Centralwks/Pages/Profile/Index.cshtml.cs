using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Ozikol.Central.Services;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Areas.Centralwks.Pages.Profile
{
    /// <summary>
    /// Self-service profile, credentials, two-factor authentication (2FA), and RBAC capabilities hub
    /// for the currently authenticated platform operator in Centralwks.
    /// </summary>
    public class IndexModel : PageModel
    {
        private readonly UserManager<CentralUser> _userManager;
        private readonly SignInManager<CentralUser> _signInManager;
        private readonly RoleManager<CentralRole> _roleManager;
        private readonly ICentralEmailService _centralEmailService;
        private readonly MasterCatalogDbContext _context;
        private readonly ILogger<IndexModel> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="IndexModel"/> class.
        /// </summary>
        /// <param name="userManager">Identity user manager.</param>
        /// <param name="signInManager">Identity sign in manager.</param>
        /// <param name="roleManager">Identity role manager.</param>
        /// <param name="centralEmailService">Central email transactional service.</param>
        /// <param name="context">Master catalog database context.</param>
        /// <param name="logger">Structured logger instance.</param>
        public IndexModel(
            UserManager<CentralUser> userManager,
            SignInManager<CentralUser> signInManager,
            RoleManager<CentralRole> roleManager,
            ICentralEmailService centralEmailService,
            MasterCatalogDbContext context,
            ILogger<IndexModel> logger)
        {
            _userManager = userManager ?? throw new ArgumentNullException(nameof(userManager));
            _signInManager = signInManager ?? throw new ArgumentNullException(nameof(signInManager));
            _roleManager = roleManager ?? throw new ArgumentNullException(nameof(roleManager));
            _centralEmailService = centralEmailService ?? throw new ArgumentNullException(nameof(centralEmailService));
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>Gets or sets the target authenticated operator.</summary>
        public CentralUser CurrentUser { get; set; } = null!;

        /// <summary>Gets or sets assigned security roles.</summary>
        public IList<string> AssignedRoles { get; set; } = new List<string>();

        /// <summary>Gets or sets personal activity and audit trail logs.</summary>
        public IList<MasterAuditLog> PersonalAuditLogs { get; set; } = new List<MasterAuditLog>();

        /// <summary>Gets or sets the active tab identifier.</summary>
        public string ActiveTab { get; set; } = "profile";

        /// <summary>Gets or sets status notification banner message.</summary>
        [TempData]
        public string? StatusMessage { get; set; }

        /// <summary>Gets or sets personal profile input data.</summary>
        [BindProperty]
        public ProfileInputModel ProfileInput { get; set; } = new();

        /// <summary>Gets or sets password change input data.</summary>
        [BindProperty]
        public PasswordInputModel PasswordInput { get; set; } = new();

        /// <summary>
        /// Input model for editing personal profile information.
        /// </summary>
        public class ProfileInputModel
        {
            /// <summary>Gets or sets first name.</summary>
            [Required(ErrorMessage = "First name is required.")]
            [MaxLength(100)]
            public string FirstName { get; set; } = string.Empty;

            /// <summary>Gets or sets last name.</summary>
            [Required(ErrorMessage = "Last name is required.")]
            [MaxLength(100)]
            public string LastName { get; set; } = string.Empty;

            /// <summary>Gets or sets phone number.</summary>
            [MaxLength(30)]
            public string? PhoneNumber { get; set; }

            /// <summary>Gets or sets department.</summary>
            [MaxLength(100)]
            public string? Department { get; set; }
        }

        /// <summary>
        /// Input model for updating password credentials.
        /// </summary>
        public class PasswordInputModel
        {
            /// <summary>Gets or sets current password.</summary>
            [Required(ErrorMessage = "Current password is required.")]
            [DataType(DataType.Password)]
            public string CurrentPassword { get; set; } = string.Empty;

            /// <summary>Gets or sets new password.</summary>
            [Required(ErrorMessage = "New password is required.")]
            [StringLength(100, MinimumLength = 8, ErrorMessage = "New password must be at least 8 characters long.")]
            [DataType(DataType.Password)]
            public string NewPassword { get; set; } = string.Empty;

            /// <summary>Gets or sets confirmation password.</summary>
            [DataType(DataType.Password)]
            [Compare("NewPassword", ErrorMessage = "New password and confirmation password do not match.")]
            public string ConfirmPassword { get; set; } = string.Empty;
        }

        /// <summary>
        /// Handles HTTP GET request to populate the operator profile hub.
        /// </summary>
        /// <param name="tab">Optional active tab query string.</param>
        /// <returns>Page result or Redirect to login if unauthenticated.</returns>
        public async Task<IActionResult> OnGetAsync(string? tab = null)
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null)
            {
                return RedirectToPage("/Login");
            }

            CurrentUser = user;
            ActiveTab = !string.IsNullOrWhiteSpace(tab) ? tab.ToLowerInvariant() : "profile";

            ProfileInput = new ProfileInputModel
            {
                FirstName = user.FirstName ?? string.Empty,
                LastName = user.LastName ?? string.Empty,
                PhoneNumber = user.PhoneNumber,
                Department = user.Department ?? "Administration"
            };

            await LoadSecurityAndTelemetryAsync(user);
            return Page();
        }

        /// <summary>
        /// Handles HTTP POST request to update personal profile information.
        /// </summary>
        /// <returns>Redirect back to profile page.</returns>
        public async Task<IActionResult> OnPostUpdateProfileAsync()
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null) return RedirectToPage("/Login");

            CurrentUser = user;
            ActiveTab = "profile";

            if (!ModelState.IsValid)
            {
                await LoadSecurityAndTelemetryAsync(user);
                return Page();
            }

            user.FirstName = ProfileInput.FirstName.Trim();
            user.LastName = ProfileInput.LastName.Trim();
            user.PhoneNumber = ProfileInput.PhoneNumber?.Trim();
            user.Department = ProfileInput.Department?.Trim();

            var result = await _userManager.UpdateAsync(user);
            if (result.Succeeded)
            {
                StatusMessage = "Personal profile details updated successfully.";
                _logger.LogInformation("Operator {UserId} ({UserName}) updated personal profile", user.Id, user.UserName);
            }
            else
            {
                StatusMessage = $"Failed to update profile: {string.Join(", ", result.Errors.Select(e => e.Description))}";
            }

            return RedirectToPage(new { tab = "profile" });
        }

        /// <summary>
        /// Handles HTTP POST request to change the operator password.
        /// </summary>
        /// <returns>Redirect back to security tab.</returns>
        public async Task<IActionResult> OnPostChangePasswordAsync()
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null) return RedirectToPage("/Login");

            CurrentUser = user;
            ActiveTab = "security";

            if (!ModelState.IsValid)
            {
                await LoadSecurityAndTelemetryAsync(user);
                return Page();
            }

            var result = await _userManager.ChangePasswordAsync(user, PasswordInput.CurrentPassword, PasswordInput.NewPassword);
            if (result.Succeeded)
            {
                await _signInManager.RefreshSignInAsync(user);
                StatusMessage = "Password changed successfully. Your active session has been refreshed.";
                _logger.LogInformation("Operator {UserId} ({UserName}) successfully changed password", user.Id, user.UserName);
            }
            else
            {
                StatusMessage = $"Password update failed: {string.Join(", ", result.Errors.Select(e => e.Description))}";
            }

            return RedirectToPage(new { tab = "security" });
        }

        /// <summary>
        /// Handles HTTP POST request to toggle Two-Factor Authentication (2FA) status.
        /// </summary>
        /// <returns>Redirect back to 2fa tab.</returns>
        public async Task<IActionResult> OnPostToggleTwoFactorAsync()
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null) return RedirectToPage("/Login");

            user.TwoFactorEnabled = !user.TwoFactorEnabled;
            var result = await _userManager.UpdateAsync(user);

            if (result.Succeeded)
            {
                StatusMessage = user.TwoFactorEnabled
                    ? "Two-Factor Authentication (2FA) is now ENFORCED on your account. You will receive a 6-digit email OTP at every login."
                    : "Two-Factor Authentication (2FA) has been DISABLED on your account.";

                _logger.LogInformation("Operator {UserId} ({UserName}) toggled 2FA to {TwoFactorEnabled}", user.Id, user.UserName, user.TwoFactorEnabled);
            }
            else
            {
                StatusMessage = "Failed to toggle 2FA configuration.";
            }

            return RedirectToPage(new { tab = "2fa" });
        }

        /// <summary>
        /// Handles HTTP POST request to test-dispatch a 2FA OTP code to the operator's email.
        /// </summary>
        /// <returns>Redirect back to 2fa tab.</returns>
        public async Task<IActionResult> OnPostSendTwoFactorOtpTestAsync()
        {
            var user = await _userManager.GetUserAsync(User);
            if (user == null || string.IsNullOrWhiteSpace(user.Email)) return RedirectToPage("/Login");

            var randomCode = RandomNumberGenerator.GetInt32(100000, 999999).ToString();
            var sent = await _centralEmailService.SendTwoFactorCodeEmailAsync(user.Email, randomCode);

            StatusMessage = sent
                ? $"Test 2FA OTP verification code successfully sent to {user.Email}."
                : "Failed to dispatch test 2FA OTP. Please check Postmark configuration.";

            return RedirectToPage(new { tab = "2fa" });
        }

        private async Task LoadSecurityAndTelemetryAsync(CentralUser user)
        {
            AssignedRoles = await _userManager.GetRolesAsync(user);

            PersonalAuditLogs = await _context.MasterAuditLogs
                .Where(l => l.UserId == user.Id || l.UserName == user.UserName)
                .OrderByDescending(l => l.CreatedUtc)
                .Take(25)
                .AsNoTracking()
                .ToListAsync();
        }
    }
}
