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
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Areas.Centralwks.Pages.Users
{
    /// <summary>
    /// Page model for managing role-based access control (RBAC) security roles, descriptions,
    /// and reviewing operator assignment counts in Centralwks.
    /// </summary>
    public class RolesModel : PageModel
    {
        private readonly RoleManager<CentralRole> _roleManager;
        private readonly UserManager<CentralUser> _userManager;
        private readonly MasterCatalogDbContext _context;
        private readonly ILogger<RolesModel> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="RolesModel"/> class.
        /// </summary>
        /// <param name="roleManager">Role manager for CentralRole.</param>
        /// <param name="userManager">User manager for CentralUser.</param>
        /// <param name="context">Master catalog database context.</param>
        /// <param name="logger">Structured logging service.</param>
        public RolesModel(
            RoleManager<CentralRole> roleManager,
            UserManager<CentralUser> userManager,
            MasterCatalogDbContext context,
            ILogger<RolesModel> logger)
        {
            _roleManager = roleManager ?? throw new ArgumentNullException(nameof(roleManager));
            _userManager = userManager ?? throw new ArgumentNullException(nameof(userManager));
            _context = context ?? throw new ArgumentNullException(nameof(context));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>
        /// View model representing a security role row with user count.
        /// </summary>
        public class RoleRowViewModel
        {
            /// <summary>Gets or sets the role ID.</summary>
            public string Id { get; set; } = string.Empty;

            /// <summary>Gets or sets role name.</summary>
            public string Name { get; set; } = string.Empty;

            /// <summary>Gets or sets role description.</summary>
            public string? Description { get; set; }

            /// <summary>Gets or sets role creation timestamp.</summary>
            public DateTime CreatedUtc { get; set; }

            /// <summary>Gets or sets total operators assigned to this role.</summary>
            public int UserCount { get; set; }
        }

        /// <summary>
        /// Gets or sets the list of roles.
        /// </summary>
        public IList<RoleRowViewModel> Roles { get; set; } = new List<RoleRowViewModel>();

        /// <summary>
        /// Gets or sets form input model for creating a new role.
        /// </summary>
        [BindProperty]
        public CreateRoleInput Input { get; set; } = new CreateRoleInput();

        /// <summary>
        /// Gets or sets status notification message.
        /// </summary>
        [TempData]
        public string? StatusMessage { get; set; }

        /// <summary>
        /// Form input model for creating a security role.
        /// </summary>
        public class CreateRoleInput
        {
            /// <summary>Gets or sets role name.</summary>
            [Required(ErrorMessage = "Role name is required.")]
            [MaxLength(100)]
            public string RoleName { get; set; } = string.Empty;

            /// <summary>Gets or sets role description.</summary>
            [MaxLength(500)]
            public string? Description { get; set; }
        }

        /// <summary>
        /// Handles HTTP GET request to list security roles and user counts.
        /// </summary>
        public async Task OnGetAsync()
        {
            var roleEntities = await _roleManager.Roles
                .OrderBy(r => r.Name)
                .ToListAsync();

            var list = new List<RoleRowViewModel>();
            foreach (var role in roleEntities)
            {
                var usersInRole = await _userManager.GetUsersInRoleAsync(role.Name!);
                list.Add(new RoleRowViewModel
                {
                    Id = role.Id,
                    Name = role.Name ?? string.Empty,
                    Description = role.Description,
                    CreatedUtc = role.CreatedUtc,
                    UserCount = usersInRole.Count
                });
            }

            Roles = list;
        }

        /// <summary>
        /// Handles HTTP POST request to create a new security role.
        /// </summary>
        /// <returns>Redirect back to roles page.</returns>
        public async Task<IActionResult> OnPostCreateRoleAsync()
        {
            if (!ModelState.IsValid)
            {
                await OnGetAsync();
                return Page();
            }

            var trimmedName = Input.RoleName.Trim();
            if (await _roleManager.RoleExistsAsync(trimmedName))
            {
                ModelState.AddModelError("Input.RoleName", "A role with this name already exists.");
                await OnGetAsync();
                return Page();
            }

            var role = new CentralRole(trimmedName, Input.Description?.Trim() ?? string.Empty);
            var result = await _roleManager.CreateAsync(role);

            if (result.Succeeded)
            {
                _logger.LogInformation("Central operator created new role {RoleName}", trimmedName);
                StatusMessage = $"Role '{trimmedName}' created successfully.";
            }
            else
            {
                StatusMessage = $"Failed to create role: {string.Join(", ", result.Errors.Select(e => e.Description))}";
            }

            return RedirectToPage();
        }

        /// <summary>
        /// Deletes a security role if no users are currently assigned.
        /// </summary>
        /// <param name="id">The role ID.</param>
        /// <returns>Redirect back to roles page.</returns>
        public async Task<IActionResult> OnPostDeleteRoleAsync(string id)
        {
            var role = await _roleManager.FindByIdAsync(id);
            if (role == null)
            {
                return NotFound();
            }

            var usersInRole = await _userManager.GetUsersInRoleAsync(role.Name!);
            if (usersInRole.Any())
            {
                StatusMessage = $"Cannot delete role '{role.Name}' because {usersInRole.Count} operator(s) are assigned to it.";
                return RedirectToPage();
            }

            var result = await _roleManager.DeleteAsync(role);
            if (result.Succeeded)
            {
                _logger.LogWarning("Central operator deleted role {RoleName}", role.Name);
                StatusMessage = $"Role '{role.Name}' deleted.";
            }
            else
            {
                StatusMessage = $"Failed to delete role: {string.Join(", ", result.Errors.Select(e => e.Description))}";
            }

            return RedirectToPage();
        }
    }
}
