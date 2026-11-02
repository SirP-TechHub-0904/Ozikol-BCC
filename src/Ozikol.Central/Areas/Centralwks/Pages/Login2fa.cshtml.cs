using System;
using System.ComponentModel.DataAnnotations;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.Extensions.Logging;
using Ozikol.Central.Services;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Areas.Centralwks.Pages
{
    /// <summary>
    /// PageModel verifying 2FA security codes (email OTP or TOTP) for operator authentication into Centralwks.
    /// </summary>
    public class Login2faModel : PageModel
    {
        private readonly SignInManager<CentralUser> _signInManager;
        private readonly UserManager<CentralUser> _userManager;
        private readonly ICentralTwoFactorService _twoFactorService;
        private readonly ICentralEmailService _emailService;
        private readonly MasterCatalogDbContext _dbContext;
        private readonly ILogger<Login2faModel> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="Login2faModel"/> class.
        /// </summary>
        /// <param name="signInManager">ASP.NET Identity sign-in manager for CentralUser.</param>
        /// <param name="userManager">Identity user manager for CentralUser.</param>
        /// <param name="twoFactorService">Security service for validating OTP verification codes.</param>
        /// <param name="emailService">Service for dispatching OTP notification emails.</param>
        /// <param name="dbContext">Master catalog database context for logging security audit events.</param>
        /// <param name="logger">Security diagnostics logger.</param>
        public Login2faModel(
            SignInManager<CentralUser> signInManager,
            UserManager<CentralUser> userManager,
            ICentralTwoFactorService twoFactorService,
            ICentralEmailService emailService,
            MasterCatalogDbContext dbContext,
            ILogger<Login2faModel> logger)
        {
            _signInManager = signInManager ?? throw new ArgumentNullException(nameof(signInManager));
            _userManager = userManager ?? throw new ArgumentNullException(nameof(userManager));
            _twoFactorService = twoFactorService ?? throw new ArgumentNullException(nameof(twoFactorService));
            _emailService = emailService ?? throw new ArgumentNullException(nameof(emailService));
            _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>
        /// Operator email address under authentication challenge.
        /// </summary>
        [BindProperty]
        [Required(ErrorMessage = "Email address is required.")]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        /// <summary>
        /// 6-digit numeric verification code entered by the operator.
        /// </summary>
        [BindProperty]
        [Required(ErrorMessage = "Please enter the 6-digit verification code.")]
        [StringLength(6, MinimumLength = 6, ErrorMessage = "Verification code must be exactly 6 digits.")]
        [RegularExpression(@"^\d{6}$", ErrorMessage = "Verification code must consist of 6 digits.")]
        public string Code { get; set; } = string.Empty;

        /// <summary>
        /// Indicates whether the authenticated operator session should persist.
        /// </summary>
        [BindProperty]
        public bool RememberMe { get; set; }

        /// <summary>
        /// Destination return URL after completing verification. Defaults to /centralwks/dashboard.
        /// </summary>
        [BindProperty]
        public string? ReturnUrl { get; set; }

        /// <summary>
        /// Contextual error message displayed upon verification failure.
        /// </summary>
        public string? ErrorMessage { get; set; }

        /// <summary>
        /// Contextual status message (e.g., following code resend).
        /// </summary>
        [TempData]
        public string? StatusMessage { get; set; }

        /// <summary>
        /// Handles HTTP GET requests to display the 2FA verification challenge screen.
        /// </summary>
        /// <param name="email">The operator work email address.</param>
        /// <param name="rememberMe">Whether to persist the session cookie.</param>
        /// <param name="returnUrl">Optional destination URL.</param>
        /// <returns>Page result.</returns>
        public IActionResult OnGet(string email, bool rememberMe = false, string? returnUrl = null)
        {
            if (string.IsNullOrWhiteSpace(email))
            {
                return Redirect("/centralwks/login");
            }

            Email = email.Trim();
            RememberMe = rememberMe;
            ReturnUrl = returnUrl;

            return Page();
        }

        /// <summary>
        /// Handles HTTP POST requests to verify the 6-digit OTP code and sign the operator into Centralwks.
        /// </summary>
        /// <returns>Redirect to admin dashboard on success, or page with error message on failure.</returns>
        public async Task<IActionResult> OnPostAsync()
        {
            if (!ModelState.IsValid)
            {
                return Page();
            }

            var cleanEmail = Email.Trim().ToLowerInvariant();
            var cleanCode = Code.Trim();

            var user = await _userManager.FindByEmailAsync(cleanEmail);
            if (user == null || !user.IsActive)
            {
                _logger.LogWarning("2FA challenge rejected: User '{Email}' not found or deactivated.", cleanEmail);
                ErrorMessage = "Administrator account could not be found or has been deactivated.";
                return Page();
            }

            // Verify against Email OTP cache
            var isValid = _twoFactorService.VerifyEmailOtp(cleanEmail, cleanCode);

            if (!isValid)
            {
                _logger.LogWarning("2FA verification failed for operator {Email} with code {Code}", cleanEmail, cleanCode);
                ErrorMessage = "The 6-digit security code is invalid or has expired. Please try again or request a new code.";
                return Page();
            }

            // Sign operator in directly via SignInManager
            await _signInManager.SignInAsync(user, isPersistent: RememberMe);
            _logger.LogInformation("Operator '{Email}' successfully completed 2FA challenge.", cleanEmail);

            // Record audit trail event
            try
            {
                _dbContext.MasterAuditLogs.Add(new MasterAuditLog
                {
                    UserId = user.Id,
                    UserName = user.FullName ?? user.UserName,
                    Action = "Login-2FA",
                    EntityType = "User",
                    EntityId = user.Id,
                    Summary = $"Administrator verified 2FA security code and logged into Central Console from IP {HttpContext.Connection.RemoteIpAddress}",
                    IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                    UserAgent = Request.Headers["User-Agent"].ToString(),
                    CreatedUtc = DateTime.UtcNow
                });
                await _dbContext.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to record audit log for 2FA login of {Email}.", cleanEmail);
            }

            if (!string.IsNullOrWhiteSpace(ReturnUrl) && Url.IsLocalUrl(ReturnUrl))
            {
                return Redirect(ReturnUrl);
            }

            return Redirect("/centralwks/dashboard");
        }

        /// <summary>
        /// Dispatches a fresh 6-digit security code to the operator's email.
        /// </summary>
        /// <returns>Page result with confirmation notification.</returns>
        public async Task<IActionResult> OnPostResendAsync()
        {
            var cleanEmail = Email.Trim().ToLowerInvariant();
            var user = await _userManager.FindByEmailAsync(cleanEmail);

            if (user != null && user.IsActive)
            {
                _logger.LogInformation("Resending fresh 2FA security code to operator {Email}", cleanEmail);
                var code = _twoFactorService.GenerateEmailOtp(cleanEmail);
                await _emailService.SendTwoFactorCodeEmailAsync(cleanEmail, code);
                StatusMessage = "A fresh 6-digit verification code has been dispatched to your email.";
            }

            return Page();
        }
    }
}
