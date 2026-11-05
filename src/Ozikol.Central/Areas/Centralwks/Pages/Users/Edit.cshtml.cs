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
using Ozikol.MasterDomain.Models;

namespace Ozikol.Central.Areas.Centralwks.Pages.Users
{
    /// <summary>
    /// Page model for editing an existing operator's profile, role assignments, or resetting their credentials in Centralwks.
    /// Supports multi-role assignment and organizational department categorization.
    /// </summary>
    public class EditModel : PageModel
    {
        private const string RootAdminEmail = "superadmin@ozikol.cloud";
        private readonly UserManager<CentralUser> _userManager;
        private readonly RoleManager<CentralRole> _roleManager;
        private readonly ILogger<EditModel> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="EditModel"/> class.
        /// </summary>
        /// <param name="userManager">Identity user manager for CentralUser.</param>
        /// <param name="roleManager">Identity role manager for CentralRole.</param>
        /// <param name="logger">Structured logging service.</param>
        public EditModel(
            UserManager<CentralUser> userManager,
            RoleManager<CentralRole> roleManager,
            ILogger<EditModel> logger)
        {
            _userManager = userManager ?? throw new ArgumentNullException(nameof(userManager));
            _roleManager = roleManager ?? throw new ArgumentNullException(nameof(roleManager));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>
        /// View model representing an available role with metadata.
        /// </summary>
        public class RoleOptionViewModel
        {
            /// <summary>Gets or sets role name.</summary>
            public string Name { get; set; } = string.Empty;

            /// <summary>Gets or sets role description.</summary>
            public string Description { get; set; } = string.Empty;

            /// <summary>Gets or sets whether this role is currently assigned.</summary>
            public bool IsSelected { get; set; }
        }

        /// <summary>
        /// Gets or sets the operator ID.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string Id { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the username for display.
        /// </summary>
        public string UserName { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the user edit form model.
        /// </summary>
        [BindProperty]
        public UserEditModel Input { get; set; } = new UserEditModel();

        /// <summary>
        /// Gets or sets available roles for selection.
        /// </summary>
        public IList<RoleOptionViewModel> AvailableRoles { get; set; } = new List<RoleOptionViewModel>();

        /// <summary>
        /// Standard departments list across the central platform.
        /// </summary>
        public static readonly string[] DepartmentOptions = new[]
        {
            "Administration",
            "Engineering & Architecture",
            "Cloud Operations & SRE",
            "Security & Compliance",
            "Customer Success & Support",
            "Billing & Finance",
            "Commercial & Partnerships"
        };

        /// <summary>
        /// Input model for modifying an operator account.
        /// </summary>
        public class UserEditModel
        {
            /// <summary>Gets or sets first name.</summary>
            [Required(ErrorMessage = "First name is required.")]
            [MaxLength(100)]
            public string FirstName { get; set; } = string.Empty;

            /// <summary>Gets or sets last name.</summary>
            [Required(ErrorMessage = "Last name is required.")]
            [MaxLength(100)]
            public string LastName { get; set; } = string.Empty;

            /// <summary>Gets or sets email address.</summary>
            [Required(ErrorMessage = "Email address is required.")]
            [EmailAddress]
            [MaxLength(150)]
            public string Email { get; set; } = string.Empty;

            /// <summary>Gets or sets phone number.</summary>
            [MaxLength(30)]
            public string? PhoneNumber { get; set; }

            /// <summary>Gets or sets organizational department.</summary>
            [MaxLength(100)]
            public string? Department { get; set; } = "Administration";

            /// <summary>Gets or sets assigned roles list.</summary>
            public List<string> SelectedRoles { get; set; } = new List<string>();

            /// <summary>Gets or sets whether account is active.</summary>
            public bool IsActive { get; set; }

            /// <summary>Gets or sets whether Two-Factor Authentication (2FA) is enforced.</summary>
            public bool TwoFactorEnabled { get; set; }

            /// <summary>Gets or sets optional new password to reset credentials.</summary>
            [StringLength(100, MinimumLength = 8, ErrorMessage = "New password must be at least 8 characters long.")]
            [DataType(DataType.Password)]
            public string? NewPassword { get; set; }
        }

        /// <summary>
        /// Handles HTTP GET request to prefill operator data.
        /// </summary>
        /// <param name="id">The user identifier.</param>
        /// <returns>Page result or NotFound.</returns>
        public async Task<IActionResult> OnGetAsync(string id)
        {
            var user = await _userManager.FindByIdAsync(id);
            if (user == null || user.Email == RootAdminEmail || user.UserName == RootAdminEmail)
            {
                return NotFound();
            }

            Id = id;
            UserName = user.UserName ?? string.Empty;

            var currentRoles = (await _userManager.GetRolesAsync(user)).ToList();

            Input = new UserEditModel
            {
                FirstName = user.FirstName,
                LastName = user.LastName,
                Email = user.Email ?? string.Empty,
                PhoneNumber = user.PhoneNumber,
                Department = user.Department ?? "Administration",
                SelectedRoles = currentRoles,
                IsActive = user.IsActive,
                TwoFactorEnabled = user.TwoFactorEnabled
            };

            await LoadAvailableRolesAsync(currentRoles);

            return Page();
        }

        /// <summary>
        /// Handles HTTP POST request to save operator updates and optional password reset.
        /// </summary>
        /// <param name="id">The user identifier.</param>
        /// <returns>Redirect to details or page on validation error.</returns>
        public async Task<IActionResult> OnPostAsync(string id)
        {
            // Disallow assigning SuperAdmin to operators
            if (Input.SelectedRoles != null)
            {
                Input.SelectedRoles = Input.SelectedRoles.Where(r => !r.Equals("SuperAdmin", StringComparison.OrdinalIgnoreCase)).ToList();
            }

            if (Input.SelectedRoles == null || !Input.SelectedRoles.Any())
            {
                ModelState.AddModelError("Input.SelectedRoles", "Please assign at least one administrative security role.");
            }

            if (!ModelState.IsValid)
            {
                await LoadAvailableRolesAsync(Input.SelectedRoles ?? new List<string>());
                return Page();
            }

            var user = await _userManager.FindByIdAsync(id);
            if (user == null || user.Email == RootAdminEmail || user.UserName == RootAdminEmail)
            {
                return NotFound();
            }

            UserName = user.UserName ?? string.Empty;

            // Check email collision
            var emailCollision = await _userManager.Users
                .AnyAsync(u => u.Email == Input.Email.Trim().ToLowerInvariant() && u.Id != id);

            if (emailCollision)
            {
                ModelState.AddModelError("Input.Email", "Another user account already uses this email address.");
                await LoadAvailableRolesAsync(Input.SelectedRoles ?? new List<string>());
                return Page();
            }

            user.FirstName = Input.FirstName.Trim();
            user.LastName = Input.LastName.Trim();
            user.Email = Input.Email.Trim().ToLowerInvariant();
            user.PhoneNumber = Input.PhoneNumber?.Trim();
            user.Department = Input.Department?.Trim();
            user.IsActive = Input.IsActive;
            user.TwoFactorEnabled = Input.TwoFactorEnabled;

            var updateResult = await _userManager.UpdateAsync(user);
            if (!updateResult.Succeeded)
            {
                foreach (var err in updateResult.Errors)
                {
                    ModelState.AddModelError(string.Empty, err.Description);
                }
                await LoadAvailableRolesAsync(Input.SelectedRoles ?? new List<string>());
                return Page();
            }

            // Sync role assignments
            var currentRoles = await _userManager.GetRolesAsync(user);
            var desiredRoles = Input.SelectedRoles ?? new List<string>();

            var rolesToRemove = currentRoles.Except(desiredRoles).ToList();
            var rolesToAdd = desiredRoles.Except(currentRoles).ToList();

            if (rolesToRemove.Any())
            {
                await _userManager.RemoveFromRolesAsync(user, rolesToRemove);
            }

            if (rolesToAdd.Any())
            {
                var validRolesToAdd = new List<string>();
                foreach (var r in rolesToAdd)
                {
                    if (await _roleManager.RoleExistsAsync(r))
                    {
                        validRolesToAdd.Add(r);
                    }
                }
                if (validRolesToAdd.Any())
                {
                    await _userManager.AddToRolesAsync(user, validRolesToAdd);
                }
            }

            // Reset password if provided
            if (!string.IsNullOrWhiteSpace(Input.NewPassword))
            {
                var token = await _userManager.GeneratePasswordResetTokenAsync(user);
                var resetResult = await _userManager.ResetPasswordAsync(user, token, Input.NewPassword);
                if (!resetResult.Succeeded)
                {
                    foreach (var err in resetResult.Errors)
                    {
                        ModelState.AddModelError(string.Empty, err.Description);
                    }
                    await LoadAvailableRolesAsync(desiredRoles);
                    return Page();
                }
                _logger.LogInformation("Central operator reset password for user {UserId} ({UserName})", id, user.UserName);
            }

            _logger.LogInformation("Central operator updated user {UserId} ({UserName}) with roles: {Roles}", id, user.UserName, string.Join(", ", desiredRoles));
            TempData["StatusMessage"] = $"Operator '{user.UserName}' updated successfully.";

            return RedirectToPage("/Users/Details", new { id });
        }

        private async Task LoadAvailableRolesAsync(List<string> selectedRoles)
        {
            // SuperAdmin is strictly reserved for the root sovereign seed account; exclude from operator assignment
            var roles = await _roleManager.Roles
                .Where(r => r.Name != "SuperAdmin")
                .OrderBy(r => r.Name)
                .ToListAsync();

            AvailableRoles = roles.Select(r => new RoleOptionViewModel
            {
                Name = r.Name ?? string.Empty,
                Description = string.IsNullOrEmpty(r.Description) ? "Standard security role" : r.Description,
                IsSelected = selectedRoles != null && selectedRoles.Contains(r.Name ?? string.Empty)
            }).ToList();
        }
    }
}
