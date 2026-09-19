using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Ozikol.Central.Services;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Areas.Centralwks.Pages.Users
{
    /// <summary>
    /// Page model for inspecting an operator's full security dossier, RBAC privileges,
    /// login timestamps, account activity, and dispatching administrative notices in Centralwks.
    /// </summary>
    public class DetailsModel : PageModel
    {
        private const string RootAdminEmail = "superadmin@ozikol.cloud";
        private readonly UserManager<CentralUser> _userManager;
        private readonly MasterCatalogDbContext _context;
        private readonly ICentralEmailService _centralEmailService;
        private readonly IConfiguration _configuration;
        private readonly ILogger<DetailsModel> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="DetailsModel"/> class.
        /// </summary>
        /// <param name="userManager">Identity user manager for CentralUser.</param>
        /// <param name="context">Master catalog database context.</param>
        /// <param name="centralEmailService">Central email transactional service.</param>
        /// <param name="configuration">Application configuration.</param>
        /// <param name="logger">Structured logging service.</param>
        public DetailsModel(
            UserManager<CentralUser> userManager,
            MasterCatalogDbContext context,
            ICentralEmailService centralEmailService,
            IConfiguration configuration,
            ILogger<DetailsModel> logger)
        {
            _userManager = userManager ?? throw new ArgumentNullException(nameof(userManager));
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _centralEmailService = centralEmailService ?? throw new ArgumentNullException(nameof(centralEmailService));
            _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>
        /// Gets or sets the target operator user.
        /// </summary>
        public CentralUser Operator { get; set; } = null!;

        /// <summary>
        /// Gets or sets assigned security roles.
        /// </summary>
        public IList<string> AssignedRoles { get; set; } = new List<string>();

        /// <summary>
        /// Gets or sets whether the account is locked out.
        /// </summary>
        public bool IsLockedOut { get; set; }

        /// <summary>
        /// Gets or sets whether this is the root system administrator account.
        /// </summary>
        public bool IsRootAccount { get; set; }

        /// <summary>
        /// Gets or sets recent audit activity logs attributed to this operator.
        /// </summary>
        public IList<MasterAuditLog> RecentAuditLogs { get; set; } = new List<MasterAuditLog>();

        /// <summary>
        /// Gets or sets status notification message.
        /// </summary>
        [TempData]
        public string? StatusMessage { get; set; }

        /// <summary>
        /// Handles HTTP GET request to load operator details.
        /// </summary>
        /// <param name="id">The user ID.</param>
        /// <returns>Page result or NotFound.</returns>
        public async Task<IActionResult> OnGetAsync(string id)
        {
            var user = await _userManager.FindByIdAsync(id);
            if (user == null)
            {
                return NotFound();
            }

            IsRootAccount = user.Email == RootAdminEmail || user.UserName == RootAdminEmail;
            Operator = user;
            AssignedRoles = await _userManager.GetRolesAsync(user);

            IsLockedOut = user.LockoutEnd.HasValue && user.LockoutEnd.Value > DateTimeOffset.UtcNow;

            RecentAuditLogs = await _context.MasterAuditLogs
                .Where(l => l.UserId == id || l.UserName == user.UserName)
                .OrderByDescending(l => l.CreatedUtc)
                .Take(25)
                .AsNoTracking()
                .ToListAsync();

            return Page();
        }

        /// <summary>
        /// Toggles account activation status.
        /// </summary>
        /// <param name="id">The user ID.</param>
        /// <returns>Redirect back to details page.</returns>
        public async Task<IActionResult> OnPostToggleActiveAsync(string id)
        {
            var user = await _userManager.FindByIdAsync(id);
            if (user == null || user.Email == RootAdminEmail || user.UserName == RootAdminEmail)
            {
                return NotFound();
            }

            user.IsActive = !user.IsActive;
            await _userManager.UpdateAsync(user);

            StatusMessage = user.IsActive
                ? $"Account '{user.UserName}' activated."
                : $"Account '{user.UserName}' suspended.";

            _logger.LogInformation("Central operator toggled user {UserId} active state to {IsActive}", id, user.IsActive);
            return RedirectToPage(new { id });
        }

        /// <summary>
        /// Unlocks the operator account.
        /// </summary>
        /// <param name="id">The user ID.</param>
        /// <returns>Redirect back to details page.</returns>
        public async Task<IActionResult> OnPostUnlockAsync(string id)
        {
            var user = await _userManager.FindByIdAsync(id);
            if (user == null || user.Email == RootAdminEmail || user.UserName == RootAdminEmail)
            {
                return NotFound();
            }

            await _userManager.SetLockoutEndDateAsync(user, null);
            await _userManager.ResetAccessFailedCountAsync(user);

            StatusMessage = $"Account '{user.UserName}' unlocked.";
            _logger.LogInformation("Central operator unlocked user account {UserId}", id);

            return RedirectToPage(new { id });
        }

        /// <summary>
        /// Generates a fresh 24-hour activation and password setup link for an operator.
        /// </summary>
        /// <param name="id">The operator user ID.</param>
        /// <returns>Redirect back to details page with copyable activation details.</returns>
        public async Task<IActionResult> OnPostGenerateActivationLinkAsync(string id)
        {
            var user = await _userManager.FindByIdAsync(id);
            if (user == null || user.Email == RootAdminEmail || user.UserName == RootAdminEmail)
            {
                return NotFound();
            }

            var token = await _userManager.GeneratePasswordResetTokenAsync(user);
            var baseUrl = _configuration["BaseUrl"]?.TrimEnd('/') 
                       ?? _configuration["App:BaseUrl"]?.TrimEnd('/') 
                       ?? $"{Request.Scheme}://{Request.Host}";
            var setupUrl = $"{baseUrl}/centralwks/setup-password?userId={user.Id}&token={Uri.EscapeDataString(token)}";
            var roles = await _userManager.GetRolesAsync(user);

            TempData["NewOperatorName"] = $"{user.FirstName} {user.LastName}".Trim();
            TempData["NewOperatorUserName"] = user.UserName;
            TempData["NewOperatorEmail"] = user.Email;
            TempData["NewOperatorDepartment"] = user.Department ?? "Administration";
            TempData["NewOperatorRoles"] = string.Join(", ", roles);
            TempData["NewOperatorSetupUrl"] = setupUrl;
            TempData["StatusMessage"] = $"Generated a fresh 24-hour activation link for '{user.UserName}'.";

            _logger.LogInformation("Administrator generated fresh activation link for operator {UserId} ({UserName})", id, user.UserName);
            return RedirectToPage(new { id });
        }

        /// <summary>
        /// Dispatches an official administrative notice, warning, or instruction email directly to the operator.
        /// </summary>
        /// <param name="id">The operator user ID.</param>
        /// <param name="noticeType">Category of notice (e.g. Warning, Instruction, Security Advisory).</param>
        /// <param name="subject">Notice email subject.</param>
        /// <param name="messageBody">Detailed notice content.</param>
        /// <returns>Redirect back to details page.</returns>
        public async Task<IActionResult> OnPostSendNoticeAsync(
            string id,
            string noticeType,
            string subject,
            string messageBody)
        {
            var user = await _userManager.FindByIdAsync(id);
            if (user == null || string.IsNullOrWhiteSpace(user.Email))
            {
                return NotFound();
            }

            if (string.IsNullOrWhiteSpace(subject) || string.IsNullOrWhiteSpace(messageBody))
            {
                StatusMessage = "Subject line and message body are required to send an operator notice.";
                return RedirectToPage(new { id });
            }

            var adminName = User.Identity?.Name ?? "Security Administrator";
            var badgeColor = noticeType.Contains("Warning", StringComparison.OrdinalIgnoreCase) || noticeType.Contains("Suspension", StringComparison.OrdinalIgnoreCase) ? "#dc2626" : "#2563eb";
            var badgeBg = noticeType.Contains("Warning", StringComparison.OrdinalIgnoreCase) || noticeType.Contains("Suspension", StringComparison.OrdinalIgnoreCase) ? "#fef2f2" : "#eff6ff";
            var badgeBorder = noticeType.Contains("Warning", StringComparison.OrdinalIgnoreCase) || noticeType.Contains("Suspension", StringComparison.OrdinalIgnoreCase) ? "#fecaca" : "#bfdbfe";

            var htmlBody = $@"
                <div style='font-family: -apple-system, BlinkMacSystemFont, ""Segoe UI"", Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; background: #ffffff; color: #0f172a; padding: 32px; border: 1px solid #e2e8f0; border-radius: 12px;'>
                    <div style='text-align: center; margin-bottom: 24px;'>
                        <span style='background: {badgeBg}; color: {badgeColor}; border: 1px solid {badgeBorder}; padding: 4px 14px; border-radius: 9999px; font-size: 12px; font-weight: 800; letter-spacing: 0.5px;'>ADMINISTRATIVE NOTICE &bull; {noticeType.ToUpperInvariant()}</span>
                        <h2 style='color: #0f172a; margin: 12px 0 6px 0; font-size: 22px; font-weight: 800;'>{subject}</h2>
                        <p style='color: #64748b; font-size: 13.5px; margin: 0;'>Attention {user.FirstName} {user.LastName} (<code>@{user.UserName}</code>)</p>
                    </div>

                    <div style='background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 20px; margin: 24px 0; font-size: 14px; line-height: 1.6; color: #1e293b; white-space: pre-wrap;'>{messageBody}</div>

                    <div style='background: #f1f5f9; border-radius: 8px; padding: 14px; font-size: 12px; color: #64748b; margin-bottom: 24px;'>
                        <strong>Dispatched By:</strong> {adminName}<br/>
                        <strong>Recipient:</strong> {user.Email} &bull; <strong>Department:</strong> {user.Department ?? "Administration"}<br/>
                        <strong>Timestamp:</strong> {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss} UTC
                    </div>

                    <hr style='border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;' />
                    <p style='color: #94a3b8; font-size: 11.5px; text-align: center; margin: 0;'>
                        Ozikol Central Platform Governance &bull; Official Administrator Directive
                    </p>
                </div>
            ";

            var sent = await _centralEmailService.SendEmailAsync(user.Email, subject, htmlBody);

            // Record audit log entry
            var auditLog = new MasterAuditLog
            {
                Id = Guid.NewGuid(),
                UserId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value,
                UserName = User.Identity?.Name ?? "Administrator",
                Action = "NoticeSent",
                EntityType = "User",
                EntityId = user.Id,
                Summary = $"Dispatched {noticeType} email to operator '{user.UserName}' ({user.Email}). Subject: {subject}",
                IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
                UserAgent = Request.Headers.UserAgent.ToString(),
                CreatedUtc = DateTime.UtcNow
            };

            _context.MasterAuditLogs.Add(auditLog);
            await _context.SaveChangesAsync();

            StatusMessage = sent
                ? $"Official {noticeType} email dispatched successfully to {user.Email}."
                : $"Failed to dispatch notice email to {user.Email}. Please check Postmark delivery logs.";

            _logger.LogInformation("Administrator dispatched {NoticeType} to operator {UserId} ({Email})", noticeType, user.Id, user.Email);
            return RedirectToPage(new { id });
        }

        /// <summary>
        /// Deletes the operator user account.
        /// </summary>
        /// <param name="id">The user ID.</param>
        /// <returns>Redirect to users index page.</returns>
        public async Task<IActionResult> OnPostDeleteAsync(string id)
        {
            var user = await _userManager.FindByIdAsync(id);
            if (user != null)
            {
                if (user.Email == RootAdminEmail || user.UserName == RootAdminEmail)
                {
                    StatusMessage = "Root system account cannot be deleted.";
                    return RedirectToPage(new { id });
                }

                var result = await _userManager.DeleteAsync(user);
                if (result.Succeeded)
                {
                    _logger.LogWarning("Central operator deleted user {UserId} ({UserName})", id, user.UserName);
                    TempData["StatusMessage"] = $"Operator '{user.UserName}' deleted.";
                    return RedirectToPage("/Users/Index");
                }
                StatusMessage = $"Failed to delete operator: {string.Join(", ", result.Errors.Select(e => e.Description))}";
            }

            return RedirectToPage(new { id });
        }
    }
}
