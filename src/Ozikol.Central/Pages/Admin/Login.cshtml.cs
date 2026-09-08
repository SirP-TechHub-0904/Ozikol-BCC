using System;
using System.ComponentModel.DataAnnotations;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.Extensions.Logging;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Pages.Admin
{
    /// <summary>
    /// PageModel authenticating Platform SuperAdmins and administrative operators into the Central Administration Console.
    /// Validates administrator role credentials and records sign-in audit trail events.
    /// </summary>
    public class LoginModel : PageModel
    {
        private readonly SignInManager<CentralUser> _signInManager;
        private readonly UserManager<CentralUser> _userManager;
        private readonly MasterCatalogDbContext _dbContext;
        private readonly ILogger<LoginModel> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="LoginModel"/> class.
        /// </summary>
        /// <param name="signInManager">ASP.NET Identity sign-in manager for CentralUser accounts.</param>
        /// <param name="userManager">ASP.NET Identity user manager for CentralUser accounts.</param>
        /// <param name="dbContext">Master catalog database context for audit logging.</param>
        /// <param name="logger">Logging facility for security diagnostics.</param>
        public LoginModel(
            SignInManager<CentralUser> signInManager,
            UserManager<CentralUser> userManager,
            MasterCatalogDbContext dbContext,
            ILogger<LoginModel> logger)
        {
            _signInManager = signInManager;
            _userManager = userManager;
            _dbContext = dbContext;
            _logger = logger;
        }

        /// <summary>
        /// Work email address of the platform administrator.
        /// </summary>
        [BindProperty]
        [Required(ErrorMessage = "Please enter your administrator email.")]
        [EmailAddress(ErrorMessage = "Please enter a valid email address.")]
        [Display(Name = "Admin Email")]
        public string Email { get; set; } = string.Empty;

        /// <summary>
        /// Secret password for administrative account authentication.
        /// </summary>
        [BindProperty]
        [Required(ErrorMessage = "Please enter your password.")]
        [DataType(DataType.Password)]
        [Display(Name = "Password")]
        public string Password { get; set; } = string.Empty;

        /// <summary>
        /// Indicates whether administrative session cookies should persist across browser restarts.
        /// </summary>
        [BindProperty]
        [Display(Name = "Keep me signed in")]
        public bool RememberMe { get; set; }

        /// <summary>
        /// Destination URL after successful sign-in. Defaults to /admin/dashboard.
        /// </summary>
        public string? ReturnUrl { get; set; }

        /// <summary>
        /// Contextual error message displayed upon authentication failure.
        /// </summary>
        public string? ErrorMessage { get; set; }

        /// <summary>
        /// Handles HTTP GET requests to display the Admin sign-in interface.
        /// If user is already authenticated as admin, redirects directly to the dashboard.
        /// </summary>
        /// <param name="returnUrl">Optional destination URL.</param>
        /// <returns>Page result or redirect if already authenticated.</returns>
        public IActionResult OnGet(string? returnUrl = null)
        {
            ReturnUrl = returnUrl;

            // If already authenticated and active, route directly to console
            if (User.Identity?.IsAuthenticated == true)
            {
                return RedirectToPage("/Admin/Dashboard/Index");
            }

            return Page();
        }

        /// <summary>
        /// Handles HTTP POST requests to authenticate administrative personnel.
        /// </summary>
        /// <param name="returnUrl">Optional destination URL.</param>
        /// <returns>Redirect to admin dashboard on success, or redisplayed page with error messages on failure.</returns>
        public async Task<IActionResult> OnPostAsync(string? returnUrl = null)
        {
            ReturnUrl = returnUrl;

            if (!ModelState.IsValid)
            {
                return Page();
            }

            var cleanEmail = Email.Trim().ToLowerInvariant();
            var user = await _userManager.FindByEmailAsync(cleanEmail);

            if (user == null || !user.IsActive)
            {
                _logger.LogWarning("Admin login rejected: Account '{Email}' not found or deactivated.", cleanEmail);
                ErrorMessage = "Invalid administrator credentials or account deactivated.";
                return Page();
            }

            // Verify that the user holds an administrative role
            var isAdmin = await _userManager.IsInRoleAsync(user, "SuperAdmin")
                       || await _userManager.IsInRoleAsync(user, "Admin")
                       || await _userManager.IsInRoleAsync(user, "BillingAdmin")
                       || await _userManager.IsInRoleAsync(user, "Operator")
                       || await _userManager.IsInRoleAsync(user, "SupportAgent")
                       || await _userManager.IsInRoleAsync(user, "TemplateManager")
                       || await _userManager.IsInRoleAsync(user, "ReferralManager");

            if (!isAdmin)
            {
                _logger.LogWarning("Admin login denied: User '{Email}' lacks console administration roles.", cleanEmail);
                ErrorMessage = "Access denied. Your account does not have administrative portal privileges.";
                return Page();
            }

            var result = await _signInManager.PasswordSignInAsync(user, Password, RememberMe, lockoutOnFailure: true);

            if (result.Succeeded)
            {
                _logger.LogInformation("Admin operator '{Email}' authenticated successfully.", cleanEmail);

                // Record audit log entry for console login
                try
                {
                    _dbContext.MasterAuditLogs.Add(new MasterAuditLog
                    {
                        UserId = user.Id,
                        UserName = user.FullName ?? user.UserName,
                        Action = "Login",
                        EntityType = "User",
                        EntityId = user.Id,
                        Summary = $"Administrator logged into Central Console from IP {HttpContext.Connection.RemoteIpAddress}",
                        IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                        UserAgent = Request.Headers["User-Agent"].ToString(),
                        CreatedUtc = DateTime.UtcNow
                    });
                    await _dbContext.SaveChangesAsync();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to write audit log for user login {Email}.", cleanEmail);
                }

                if (!string.IsNullOrWhiteSpace(returnUrl) && Url.IsLocalUrl(returnUrl))
                {
                    return Redirect(returnUrl);
                }

                return RedirectToPage("/Admin/Dashboard/Index");
            }

            if (result.IsLockedOut)
            {
                _logger.LogWarning("Admin account '{Email}' locked out due to failed attempts.", cleanEmail);
                ErrorMessage = "This administrator account is temporarily locked out. Please contact security.";
                return Page();
            }

            ErrorMessage = "Invalid email or password. Please verify your credentials.";
            return Page();
        }
    }
}
