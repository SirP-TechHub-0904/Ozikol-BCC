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
    /// Page model for managing central platform operators, system administrators, and staff identities in Centralwks.
    /// </summary>
    public class IndexModel : PageModel
    {
        private readonly UserManager<CentralUser> _userManager;
        private readonly RoleManager<CentralRole> _roleManager;
        private readonly MasterCatalogDbContext _context;
        private readonly ILogger<IndexModel> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="IndexModel"/> class.
        /// </summary>
        /// <param name="userManager">Identity user manager for CentralUser.</param>
        /// <param name="roleManager">Identity role manager for CentralRole.</param>
        /// <param name="context">Master catalog database context.</param>
        /// <param name="logger">Structured logging service.</param>
        public IndexModel(
            UserManager<CentralUser> userManager,
            RoleManager<CentralRole> roleManager,
            MasterCatalogDbContext context,
            ILogger<IndexModel> logger)
        {
            _userManager = userManager ?? throw new ArgumentNullException(nameof(userManager));
            _roleManager = roleManager ?? throw new ArgumentNullException(nameof(roleManager));
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>
        /// View model representing an operator user row with computed roles and lockout state.
        /// </summary>
        public class UserRowViewModel
        {
            /// <summary>Gets or sets the user ID.</summary>
            public string Id { get; set; } = string.Empty;

            /// <summary>Gets or sets username.</summary>
            public string UserName { get; set; } = string.Empty;

            /// <summary>Gets or sets candidate or operator full name.</summary>
            public string FullName { get; set; } = string.Empty;

            /// <summary>Gets or sets email address.</summary>
            public string Email { get; set; } = string.Empty;

            /// <summary>Gets or sets organizational department.</summary>
            public string? Department { get; set; }

            /// <summary>Gets or sets whether account is active.</summary>
            public bool IsActive { get; set; }

            /// <summary>Gets or sets whether account is locked out.</summary>
            public bool IsLockedOut { get; set; }

            /// <summary>Gets or sets whether two-factor authentication is enabled.</summary>
            public bool TwoFactorEnabled { get; set; }

            /// <summary>Gets or sets assigned role names.</summary>
            public IList<string> Roles { get; set; } = new List<string>();

            /// <summary>Gets or sets last successful login in UTC.</summary>
            public DateTime? LastLoginUtc { get; set; }

            /// <summary>Gets or sets account creation timestamp.</summary>
            public DateTime CreatedUtc { get; set; }
        }

        /// <summary>
        /// Gets or sets the list of operator users.
        /// </summary>
        public IList<UserRowViewModel> Users { get; set; } = new List<UserRowViewModel>();

        /// <summary>
        /// Gets or sets available roles for filtering.
        /// </summary>
        public IList<string> AvailableRoles { get; set; } = new List<string>();

        /// <summary>
        /// Gets or sets total operator count.
        /// </summary>
        public int TotalCount { get; set; }

        /// <summary>
        /// Gets or sets active operator count.
        /// </summary>
        public int ActiveCount { get; set; }

        /// <summary>
        /// Gets or sets search query.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? Search { get; set; }

        /// <summary>
        /// Gets or sets role filter.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? RoleFilter { get; set; }

        /// <summary>
        /// Gets or sets status filter (All, Active, Inactive, LockedOut).
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? StatusFilter { get; set; }

        /// <summary>
        /// Gets or sets notification message.
        /// </summary>
        [TempData]
        public string? StatusMessage { get; set; }

        /// <summary>
        /// Handles HTTP GET request to query and display platform operators.
        /// </summary>
        public async Task OnGetAsync()
        {
            TotalCount = await _userManager.Users.CountAsync();
            ActiveCount = await _userManager.Users.CountAsync(u => u.IsActive);

            AvailableRoles = await _roleManager.Roles
                .Select(r => r.Name!)
                .Where(r => r != null)
                .OrderBy(r => r)
                .ToListAsync();

            var query = _userManager.Users.AsQueryable();

            if (!string.IsNullOrWhiteSpace(Search))
            {
                var term = Search.Trim().ToLowerInvariant();
                query = query.Where(u => u.UserName!.ToLower().Contains(term)
                                      || u.Email!.ToLower().Contains(term)
                                      || u.FirstName.ToLower().Contains(term)
                                      || u.LastName.ToLower().Contains(term)
                                      || (u.Department != null && u.Department.ToLower().Contains(term)));
            }

            if (!string.IsNullOrWhiteSpace(StatusFilter))
            {
                if (StatusFilter.Equals("Active", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(u => u.IsActive);
                }
                else if (StatusFilter.Equals("Inactive", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(u => !u.IsActive);
                }
            }

            var usersList = await query
                .OrderByDescending(u => u.CreatedUtc)
                .ToListAsync();

            var result = new List<UserRowViewModel>();
            var now = DateTimeOffset.UtcNow;

            foreach (var user in usersList)
            {
                var roles = await _userManager.GetRolesAsync(user);

                // Apply role filter in memory if specified
                if (!string.IsNullOrWhiteSpace(RoleFilter) && RoleFilter != "All" && !roles.Contains(RoleFilter))
                {
                    continue;
                }

                var isLockedOut = user.LockoutEnd.HasValue && user.LockoutEnd.Value > now;

                if (StatusFilter != null && StatusFilter.Equals("LockedOut", StringComparison.OrdinalIgnoreCase) && !isLockedOut)
                {
                    continue;
                }

                result.Add(new UserRowViewModel
                {
                    Id = user.Id,
                    UserName = user.UserName ?? string.Empty,
                    FullName = user.FullName,
                    Email = user.Email ?? string.Empty,
                    Department = user.Department,
                    IsActive = user.IsActive,
                    IsLockedOut = isLockedOut,
                    TwoFactorEnabled = user.TwoFactorEnabled,
                    Roles = roles,
                    LastLoginUtc = user.LastLoginUtc,
                    CreatedUtc = user.CreatedUtc
                });
            }

            Users = result;
        }

        /// <summary>
        /// Toggles account activation status for an operator.
        /// </summary>
        /// <param name="id">The user ID.</param>
        /// <returns>Redirect back to index.</returns>
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
            return RedirectToPage();
        }

        /// <summary>
        /// Unlocks an operator account that was locked due to excessive failed password attempts.
        /// </summary>
        /// <param name="id">The user ID.</param>
        /// <returns>Redirect back to index.</returns>
        public async Task<IActionResult> OnPostUnlockAsync(string id)
        {
            var user = await _userManager.FindByIdAsync(id);
            if (user == null)
            {
                return NotFound();
            }

            await _userManager.SetLockoutEndDateAsync(user, null);
            await _userManager.ResetAccessFailedCountAsync(user);

            StatusMessage = $"Account '{user.UserName}' has been unlocked.";
            _logger.LogInformation("Central operator unlocked user account {UserId}", id);

            return RedirectToPage();
        }

        /// <summary>
        /// Deletes an operator user account.
        /// </summary>
        /// <param name="id">The user ID.</param>
        /// <returns>Redirect back to index.</returns>
        public async Task<IActionResult> OnPostDeleteAsync(string id)
        {
            var user = await _userManager.FindByIdAsync(id);
            if (user != null)
            {
                var result = await _userManager.DeleteAsync(user);
                if (result.Succeeded)
                {
                    _logger.LogWarning("Central operator deleted user {UserId} ({UserName})", id, user.UserName);
                    StatusMessage = $"User '{user.UserName}' deleted.";
                }
                else
                {
                    StatusMessage = $"Failed to delete user: {string.Join(", ", result.Errors.Select(e => e.Description))}";
                }
            }

            return RedirectToPage();
        }
    }
}
