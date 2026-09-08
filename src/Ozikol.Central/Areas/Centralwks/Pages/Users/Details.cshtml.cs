using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Areas.Centralwks.Pages.Users
{
    /// <summary>
    /// Page model for inspecting an operator's full security dossier, RBAC privileges,
    /// login timestamps, and account activity in Centralwks.
    /// </summary>
    public class DetailsModel : PageModel
    {
        private readonly UserManager<CentralUser> _userManager;
        private readonly MasterCatalogDbContext _context;
        private readonly ILogger<DetailsModel> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="DetailsModel"/> class.
        /// </summary>
        /// <param name="userManager">Identity user manager for CentralUser.</param>
        /// <param name="context">Master catalog database context.</param>
        /// <param name="logger">Structured logging service.</param>
        public DetailsModel(
            UserManager<CentralUser> userManager,
            MasterCatalogDbContext context,
            ILogger<DetailsModel> logger)
        {
            _userManager = userManager ?? throw new ArgumentNullException(nameof(userManager));
            _context = context ?? throw new ArgumentNullException(nameof(context));
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

            Operator = user;
            AssignedRoles = await _userManager.GetRolesAsync(user);

            IsLockedOut = user.LockoutEnd.HasValue && user.LockoutEnd.Value > DateTimeOffset.UtcNow;

            RecentAuditLogs = await _context.MasterAuditLogs
                .Where(l => l.UserId == id || l.UserName == user.UserName)
                .OrderByDescending(l => l.CreatedUtc)
                .Take(10)
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
            if (user == null)
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
            if (user == null)
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
        /// Deletes the operator user account.
        /// </summary>
        /// <param name="id">The user ID.</param>
        /// <returns>Redirect to users index page.</returns>
        public async Task<IActionResult> OnPostDeleteAsync(string id)
        {
            var user = await _userManager.FindByIdAsync(id);
            if (user != null)
            {
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
