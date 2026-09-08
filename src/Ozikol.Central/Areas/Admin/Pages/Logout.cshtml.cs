using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.Extensions.Logging;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Areas.Admin.Pages
{
    /// <summary>
    /// PageModel handling session termination and audit logging for Central Administration operators.
    /// </summary>
    public class LogoutModel : PageModel
    {
        private readonly SignInManager<CentralUser> _signInManager;
        private readonly UserManager<CentralUser> _userManager;
        private readonly MasterCatalogDbContext _dbContext;
        private readonly ILogger<LogoutModel> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="LogoutModel"/> class.
        /// </summary>
        /// <param name="signInManager">ASP.NET Identity sign-in manager.</param>
        /// <param name="userManager">ASP.NET Identity user manager.</param>
        /// <param name="dbContext">Master catalog database context for audit logging.</param>
        /// <param name="logger">Diagnostic logging facility.</param>
        public LogoutModel(
            SignInManager<CentralUser> signInManager,
            UserManager<CentralUser> userManager,
            MasterCatalogDbContext dbContext,
            ILogger<LogoutModel> logger)
        {
            _signInManager = signInManager;
            _userManager = userManager;
            _dbContext = dbContext;
            _logger = logger;
        }

        /// <summary>
        /// Handles HTTP GET requests by redirecting directly to the login portal.
        /// </summary>
        /// <returns>Redirect to admin login.</returns>
        public IActionResult OnGet()
        {
            return RedirectToPage("/Admin/Login");
        }

        /// <summary>
        /// Handles HTTP POST requests to securely terminate the operator session and record an audit log entry.
        /// </summary>
        /// <returns>Redirect to the admin login page.</returns>
        public async Task<IActionResult> OnPostAsync()
        {
            var user = await _userManager.GetUserAsync(User);
            if (user != null)
            {
                try
                {
                    _dbContext.MasterAuditLogs.Add(new MasterAuditLog
                    {
                        UserId = user.Id,
                        UserName = user.FullName ?? user.UserName,
                        Action = "Logout",
                        EntityType = "User",
                        EntityId = user.Id,
                        Summary = $"Administrator logged out of Central Console from IP {HttpContext.Connection.RemoteIpAddress}",
                        IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                        UserAgent = Request.Headers["User-Agent"].ToString(),
                        CreatedUtc = DateTime.UtcNow
                    });
                    await _dbContext.SaveChangesAsync();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to record audit log on admin sign-out for user {UserId}.", user.Id);
                }
            }

            await _signInManager.SignOutAsync();
            _logger.LogInformation("Administrator successfully signed out of Central Console.");

            return RedirectToPage("/Admin/Login");
        }
    }
}
