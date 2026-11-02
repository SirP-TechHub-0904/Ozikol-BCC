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
    /// Supports multi-role assignment and organizational department categorization.
    /// </summary>
    public class CreateModel : PageModel
    {
        private readonly UserManager<CentralUser> _userManager;
        private readonly RoleManager<CentralRole> _roleManager;
        private readonly Ozikol.Central.Services.ICentralEmailService _centralEmailService;
        private readonly IConfiguration _configuration;
        private readonly ILogger<CreateModel> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="CreateModel"/> class.
        /// </summary>
        /// <param name="userManager">Identity user manager for CentralUser.</param>
        /// <param name="roleManager">Identity role manager for CentralRole.</param>
        /// <param name="centralEmailService">Central email transactional service.</param>
        /// <param name="configuration">Application configuration.</param>
        /// <param name="logger">Structured logging service.</param>
        public CreateModel(
            UserManager<CentralUser> userManager,
            RoleManager<CentralRole> roleManager,
            Ozikol.Central.Services.ICentralEmailService centralEmailService,
            IConfiguration configuration,
            ILogger<CreateModel> logger)
        {
            _userManager = userManager ?? throw new ArgumentNullException(nameof(userManager));
            _roleManager = roleManager ?? throw new ArgumentNullException(nameof(roleManager));
            _centralEmailService = centralEmailService ?? throw new ArgumentNullException(nameof(centralEmailService));
            _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>
        /// View model representing an available role with its description for UI selection.
        /// </summary>
        public class RoleOptionViewModel
        {
            /// <summary>Gets or sets the role name.</summary>
            public string Name { get; set; } = string.Empty;

            /// <summary>Gets or sets the role description.</summary>
            public string Description { get; set; } = string.Empty;

            /// <summary>Gets or sets whether this role is selected.</summary>
            public bool IsSelected { get; set; }
        }

        /// <summary>
        /// Gets or sets the user creation form input model.
        /// </summary>
        [BindProperty]
        public UserInputModel Input { get; set; } = new UserInputModel();

        /// <summary>
        /// Gets or sets available roles with metadata for selection.
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

            /// <summary>Gets or sets phone number.</summary>
            [MaxLength(30)]
            public string? PhoneNumber { get; set; }

            /// <summary>Gets or sets organizational department.</summary>
            [MaxLength(100)]
            public string Department { get; set; } = "Administration";

            /// <summary>Gets or sets assigned roles.</summary>
            public List<string> SelectedRoles { get; set; } = new List<string> { "Admin" };

            /// <summary>Gets or sets whether the account is immediately active.</summary>
            public bool IsActive { get; set; } = true;

            /// <summary>Gets or sets whether 2FA is enforced.</summary>
            public bool TwoFactorEnabled { get; set; } = false;

            /// <summary>Gets or sets whether to send an invitation onboarding email with activation link.</summary>
            public bool SendInviteEmail { get; set; } = true;
        }

        /// <summary>
        /// Handles HTTP GET request to initialize the creation form.
        /// </summary>
        public async Task OnGetAsync()
        {
            await LoadAvailableRolesAsync();
        }

        /// <summary>
        /// Handles HTTP POST request to provision the new operator identity.
        /// </summary>
        /// <returns>Redirect to users index on success or page on error.</returns>
        public async Task<IActionResult> OnPostAsync()
        {
            // Disallow assigning SuperAdmin to new operators
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
                await LoadAvailableRolesAsync();
                return Page();
            }

            var existingUser = await _userManager.FindByEmailAsync(Input.Email);
            if (existingUser != null)
            {
                ModelState.AddModelError("Input.Email", "A user account with this email address already exists.");
                await LoadAvailableRolesAsync();
                return Page();
            }

            var existingByName = await _userManager.FindByNameAsync(Input.UserName);
            if (existingByName != null)
            {
                ModelState.AddModelError("Input.UserName", "This username is already taken.");
                await LoadAvailableRolesAsync();
                return Page();
            }

            var user = new CentralUser
            {
                UserName = Input.UserName.Trim(),
                Email = Input.Email.Trim().ToLowerInvariant(),
                FirstName = Input.FirstName.Trim(),
                LastName = Input.LastName.Trim(),
                PhoneNumber = Input.PhoneNumber?.Trim(),
                Department = Input.Department?.Trim(),
                IsActive = Input.IsActive,
                TwoFactorEnabled = Input.TwoFactorEnabled,
                EmailConfirmed = false,
                CreatedUtc = DateTime.UtcNow
            };

            // Provision with a temporary high-entropy key; the operator establishes their own secret password via the activation link
            var tempSeedPassword = "Op!" + Guid.NewGuid().ToString("N").Substring(0, 12) + "9A";
            var createResult = await _userManager.CreateAsync(user, tempSeedPassword);
            if (!createResult.Succeeded)
            {
                foreach (var err in createResult.Errors)
                {
                    ModelState.AddModelError(string.Empty, err.Description);
                }
                await LoadAvailableRolesAsync();
                return Page();
            }

            // Assign security roles
            if (Input.SelectedRoles != null && Input.SelectedRoles.Any())
            {
                var validRoles = new List<string>();
                foreach (var role in Input.SelectedRoles)
                {
                    if (await _roleManager.RoleExistsAsync(role))
                    {
                        validRoles.Add(role);
                    }
                }

                if (validRoles.Any())
                {
                    await _userManager.AddToRolesAsync(user, validRoles);
                }
            }

            // Generate secure account activation and password establishment token
            var token = await _userManager.GeneratePasswordResetTokenAsync(user);
            var baseUrl = _configuration["BaseUrl"]?.TrimEnd('/') 
                       ?? _configuration["App:BaseUrl"]?.TrimEnd('/') 
                       ?? $"{Request.Scheme}://{Request.Host}";
            var setupUrl = $"{baseUrl}/centralwks/setup-password?userId={user.Id}&token={Uri.EscapeDataString(token)}";

            _logger.LogInformation("Central operator provisioned new user {UserId} ({UserName}) with roles: {Roles}", user.Id, user.UserName, string.Join(", ", Input.SelectedRoles ?? new List<string>()));

            // Dispatch operator invitation onboarding email
            if (Input.SendInviteEmail)
            {
                try
                {
                    var fullName = $"{user.FirstName} {user.LastName}".Trim();
                    await _centralEmailService.SendOperatorInvitationEmailAsync(
                        user.Email!,
                        fullName,
                        user.UserName!,
                        user.Department ?? "Administration",
                        Input.SelectedRoles ?? new List<string>(),
                        setupUrl);

                    TempData["StatusMessage"] = $"Operator account '{user.UserName}' provisioned and activation email dispatched to {user.Email}.";
                }
                catch (Exception emailEx)
                {
                    _logger.LogWarning(emailEx, "Failed to dispatch operator invitation email for {Email}", user.Email);
                    TempData["StatusMessage"] = $"Operator account '{user.UserName}' provisioned successfully (invitation email could not be delivered).";
                }
            }
            else
            {
                TempData["StatusMessage"] = $"Operator account '{user.UserName}' provisioned successfully.";
            }

            // Store copyable invitation details for direct clipboard copying by the administrator
            TempData["NewOperatorName"] = $"{user.FirstName} {user.LastName}".Trim();
            TempData["NewOperatorUserName"] = user.UserName;
            TempData["NewOperatorEmail"] = user.Email;
            TempData["NewOperatorDepartment"] = user.Department ?? "Administration";
            TempData["NewOperatorRoles"] = string.Join(", ", Input.SelectedRoles ?? new List<string>());
            TempData["NewOperatorSetupUrl"] = setupUrl;

            return RedirectToPage("/Users/Index");
        }

        private async Task LoadAvailableRolesAsync()
        {
            // SuperAdmin is strictly reserved for the root sovereign seed account; exclude from operator creation
            var roles = await _roleManager.Roles
                .Where(r => r.Name != "SuperAdmin")
                .OrderBy(r => r.Name)
                .ToListAsync();

            AvailableRoles = roles.Select(r => new RoleOptionViewModel
            {
                Name = r.Name ?? string.Empty,
                Description = string.IsNullOrEmpty(r.Description) ? "Standard security role" : r.Description,
                IsSelected = Input.SelectedRoles != null && Input.SelectedRoles.Contains(r.Name ?? string.Empty)
            }).ToList();
        }
    }
}
