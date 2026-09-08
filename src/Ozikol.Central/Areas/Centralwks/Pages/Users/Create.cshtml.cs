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
    /// Page model for onboarding and provisioning new platform operator accounts in Centralwks.
    /// </summary>
    public class CreateModel : PageModel
    {
        private readonly UserManager<CentralUser> _userManager;
        private readonly RoleManager<CentralRole> _roleManager;
        private readonly ILogger<CreateModel> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="CreateModel"/> class.
        /// </summary>
        /// <param name="userManager">Identity user manager for CentralUser.</param>
        /// <param name="roleManager">Identity role manager for CentralRole.</param>
        /// <param name="logger">Structured logging service.</param>
        public CreateModel(
            UserManager<CentralUser> userManager,
            RoleManager<CentralRole> roleManager,
            ILogger<CreateModel> logger)
        {
            _userManager = userManager ?? throw new ArgumentNullException(nameof(userManager));
            _roleManager = roleManager ?? throw new ArgumentNullException(nameof(roleManager));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>
        /// Gets or sets the user creation form input model.
        /// </summary>
        [BindProperty]
        public UserInputModel Input { get; set; } = new UserInputModel();

        /// <summary>
        /// Gets or sets available roles for selection.
        /// </summary>
        public IList<string> AvailableRoles { get; set; } = new List<string>();

        /// <summary>
        /// Input model for creating a platform operator.
        /// </summary>
        public class UserInputModel
        {
            /// <summary>Gets or sets operator first name.</summary>
            [Required(ErrorMessage = "First name is required.")]
            [MaxLength(100)]
            public string FirstName { get; set; } = string.Empty;

            /// <summary>Gets or sets operator last name.</summary>
            [Required(ErrorMessage = "Last name is required.")]
            [MaxLength(100)]
            public string LastName { get; set; } = string.Empty;

            /// <summary>Gets or sets operator email address.</summary>
            [Required(ErrorMessage = "Email address is required.")]
            [EmailAddress]
            [MaxLength(150)]
            public string Email { get; set; } = string.Empty;

            /// <summary>Gets or sets login username.</summary>
            [Required(ErrorMessage = "Username is required.")]
            [MaxLength(100)]
            public string UserName { get; set; } = string.Empty;

            /// <summary>Gets or sets organizational department.</summary>
            [MaxLength(100)]
            public string Department { get; set; } = "Engineering & Architecture";

            /// <summary>Gets or sets initial role assignment.</summary>
            [Required(ErrorMessage = "Please assign a role.")]
            public string SelectedRole { get; set; } = "Admin";

            /// <summary>Gets or sets account password.</summary>
            [Required(ErrorMessage = "Password is required.")]
            [StringLength(100, MinimumLength = 8, ErrorMessage = "Password must be at least 8 characters long.")]
            [DataType(DataType.Password)]
            public string Password { get; set; } = string.Empty;

            /// <summary>Gets or sets confirmation password.</summary>
            [DataType(DataType.Password)]
            [Compare("Password", ErrorMessage = "The password and confirmation password do not match.")]
            public string ConfirmPassword { get; set; } = string.Empty;

            /// <summary>Gets or sets whether the account is immediately active.</summary>
            public bool IsActive { get; set; } = true;
        }

        /// <summary>
        /// Handles HTTP GET request to initialize the creation form.
        /// </summary>
        public async Task OnGetAsync()
        {
            AvailableRoles = await _roleManager.Roles
                .Select(r => r.Name!)
                .Where(r => r != null)
                .OrderBy(r => r)
                .ToListAsync();
        }

        /// <summary>
        /// Handles HTTP POST request to provision the new operator identity.
        /// </summary>
        /// <returns>Redirect to users index on success or page on error.</returns>
        public async Task<IActionResult> OnPostAsync()
        {
            AvailableRoles = await _roleManager.Roles
                .Select(r => r.Name!)
                .Where(r => r != null)
                .OrderBy(r => r)
                .ToListAsync();

            if (!ModelState.IsValid)
            {
                return Page();
            }

            var existingUser = await _userManager.FindByEmailAsync(Input.Email);
            if (existingUser != null)
            {
                ModelState.AddModelError("Input.Email", "A user account with this email address already exists.");
                return Page();
            }

            var existingByName = await _userManager.FindByNameAsync(Input.UserName);
            if (existingByName != null)
            {
                ModelState.AddModelError("Input.UserName", "This username is already taken.");
                return Page();
            }

            var user = new CentralUser
            {
                UserName = Input.UserName.Trim(),
                Email = Input.Email.Trim().ToLowerInvariant(),
                FirstName = Input.FirstName.Trim(),
                LastName = Input.LastName.Trim(),
                Department = Input.Department?.Trim(),
                IsActive = Input.IsActive,
                EmailConfirmed = true,
                CreatedUtc = DateTime.UtcNow
            };

            var createResult = await _userManager.CreateAsync(user, Input.Password);
            if (!createResult.Succeeded)
            {
                foreach (var err in createResult.Errors)
                {
                    ModelState.AddModelError(string.Empty, err.Description);
                }
                return Page();
            }

            // Assign initial security role
            if (!string.IsNullOrWhiteSpace(Input.SelectedRole))
            {
                if (await _roleManager.RoleExistsAsync(Input.SelectedRole))
                {
                    await _userManager.AddToRoleAsync(user, Input.SelectedRole);
                }
            }

            _logger.LogInformation("Central operator provisioned new user {UserId} ({UserName}) with role {Role}", user.Id, user.UserName, Input.SelectedRole);
            TempData["StatusMessage"] = $"Operator account '{user.UserName}' provisioned successfully.";

            return RedirectToPage("/Users/Index");
        }
    }
}
