using System;
using System.ComponentModel.DataAnnotations;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.Extensions.Logging;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Areas.Centralwks.Pages
{
    /// <summary>
    /// Self-service onboarding activation page where invited central operators establish their secret password
    /// and activate their administrative credentials.
    /// </summary>
    [AllowAnonymous]
    public class SetupPasswordModel : PageModel
    {
        private readonly UserManager<CentralUser> _userManager;
        private readonly MasterCatalogDbContext _dbContext;
        private readonly ILogger<SetupPasswordModel> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="SetupPasswordModel"/> class.
        /// </summary>
        /// <param name="userManager">Identity user manager.</param>
        /// <param name="dbContext">Master catalog database context.</param>
        /// <param name="logger">Structured logger instance.</param>
        public SetupPasswordModel(
            UserManager<CentralUser> userManager,
            MasterCatalogDbContext dbContext,
            ILogger<SetupPasswordModel> logger)
        {
            _userManager = userManager ?? throw new ArgumentNullException(nameof(userManager));
            _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>Gets or sets target user ID.</summary>
        [BindProperty(SupportsGet = true)]
        public string UserId { get; set; } = string.Empty;

        /// <summary>Gets or sets password setup token.</summary>
        [BindProperty(SupportsGet = true)]
        public string Token { get; set; } = string.Empty;

        /// <summary>Gets or sets operator display name.</summary>
        public string OperatorName { get; set; } = string.Empty;

        /// <summary>Gets or sets operator email.</summary>
        public string OperatorEmail { get; set; } = string.Empty;

        /// <summary>Gets or sets operator username.</summary>
        public string OperatorUserName { get; set; } = string.Empty;

        /// <summary>Gets or sets password input model.</summary>
        [BindProperty]
        public PasswordInputModel Input { get; set; } = new PasswordInputModel();

        /// <summary>Error message banner.</summary>
        public string? ErrorMessage { get; set; }

        /// <summary>
        /// Input model schema for password establishment.
        /// </summary>
        public class PasswordInputModel
        {
            /// <summary>New secret password.</summary>
            [Required(ErrorMessage = "Password is required.")]
            [StringLength(100, MinimumLength = 8, ErrorMessage = "Password must be at least 8 characters long.")]
            [DataType(DataType.Password)]
            [Display(Name = "Create Password")]
            public string Password { get; set; } = string.Empty;

            /// <summary>Confirmation password.</summary>
            [Required(ErrorMessage = "Please confirm your password.")]
            [DataType(DataType.Password)]
            [Compare("Password", ErrorMessage = "The password and confirmation password do not match.")]
            [Display(Name = "Confirm Password")]
            public string ConfirmPassword { get; set; } = string.Empty;
        }

        /// <summary>
        /// Handles HTTP GET request to validate the activation token and display the setup form.
        /// </summary>
        public async Task<IActionResult> OnGetAsync()
        {
            if (string.IsNullOrWhiteSpace(UserId) || string.IsNullOrWhiteSpace(Token))
            {
                ErrorMessage = "Invalid or missing activation parameters. Please check your invitation link.";
                return Page();
            }

            var user = await _userManager.FindByIdAsync(UserId);
            if (user == null)
            {
                ErrorMessage = "Operator account not found or has been removed.";
                return Page();
            }

            OperatorName = user.FullName ?? $"{user.FirstName} {user.LastName}".Trim();
            if (string.IsNullOrWhiteSpace(OperatorName)) OperatorName = user.UserName ?? "Operator";
            OperatorEmail = user.Email ?? string.Empty;
            OperatorUserName = user.UserName ?? string.Empty;

            return Page();
        }

        /// <summary>
        /// Handles HTTP POST request to establish the password and activate the operator identity.
        /// </summary>
        public async Task<IActionResult> OnPostAsync()
        {
            if (string.IsNullOrWhiteSpace(UserId) || string.IsNullOrWhiteSpace(Token))
            {
                ErrorMessage = "Invalid activation session. Please use the original link from your invitation.";
                return Page();
            }

            var user = await _userManager.FindByIdAsync(UserId);
            if (user == null)
            {
                ErrorMessage = "Operator account not found.";
                return Page();
            }

            OperatorName = user.FullName ?? $"{user.FirstName} {user.LastName}".Trim();
            OperatorEmail = user.Email ?? string.Empty;
            OperatorUserName = user.UserName ?? string.Empty;

            if (!ModelState.IsValid)
            {
                return Page();
            }

            // Reset password using the activation token
            var result = await _userManager.ResetPasswordAsync(user, Token, Input.Password);
            if (result.Succeeded)
            {
                user.EmailConfirmed = true;
                user.IsActive = true;
                await _userManager.UpdateAsync(user);

                // Audit log
                _dbContext.MasterAuditLogs.Add(new MasterAuditLog
                {
                    Id = Guid.NewGuid(),
                    UserId = user.Id,
                    UserName = user.UserName,
                    Action = "ActivateAccount",
                    EntityType = "User",
                    EntityId = user.Id,
                    Summary = $"Operator {user.UserName} completed initial password setup and activated their account.",
                    IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                    UserAgent = Request.Headers["User-Agent"].ToString(),
                    CreatedUtc = DateTime.UtcNow
                });
                await _dbContext.SaveChangesAsync();

                _logger.LogInformation("✅ Operator {UserName} successfully set initial password and activated account.", user.UserName);
                TempData["StatusMessage"] = "Account activated successfully! You can now sign in with your username and newly established password.";
                return Redirect("/centralwks/login");
            }

            foreach (var error in result.Errors)
            {
                ModelState.AddModelError(string.Empty, error.Description);
            }

            ErrorMessage = "Failed to set password. The activation link may have expired (24-hour validity). Please contact your platform administrator.";
            return Page();
        }
    }
}
