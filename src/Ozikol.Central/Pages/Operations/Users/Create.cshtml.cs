using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Ozikol_BCC.Domain.Models;

namespace Ozikol.Central.Pages.Operations.Users;

public class CreateModel : PageModel
{
    private readonly UserManager<CentralUser> _userManager;
    private readonly RoleManager<CentralRole> _roleManager;
    private readonly ILogger<CreateModel> _logger;

    [BindProperty]
    public InputModel Input { get; set; } = new();

    public string? ErrorMessage { get; set; }

    public class InputModel
    {
        [Required(ErrorMessage = "First Name is required")]
        public string FirstName { get; set; } = string.Empty;

        [Required(ErrorMessage = "Last Name is required")]
        public string LastName { get; set; } = string.Empty;

        [Required(ErrorMessage = "Email Address is required")]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        public string? Department { get; set; } = "Operations";

        [Required(ErrorMessage = "Password is required")]
        [StringLength(100, MinimumLength = 6, ErrorMessage = "Password must be at least 6 characters")]
        [DataType(DataType.Password)]
        public string Password { get; set; } = string.Empty;

        [Required(ErrorMessage = "Please select a Role")]
        public string Role { get; set; } = "Admin";
    }

    public CreateModel(
        UserManager<CentralUser> userManager,
        RoleManager<CentralRole> roleManager,
        ILogger<CreateModel> logger)
    {
        _userManager = userManager;
        _roleManager = roleManager;
        _logger = logger;
    }

    public void OnGet()
    {
    }

    public async Task<IActionResult> OnPostAsync()
    {
        if (!ModelState.IsValid)
        {
            return Page();
        }

        var cleanEmail = Input.Email.Trim().ToLowerInvariant();
        var existing = await _userManager.FindByEmailAsync(cleanEmail);
        if (existing != null)
        {
            ErrorMessage = $"An operator with email '{cleanEmail}' already exists.";
            return Page();
        }

        var newStaff = new CentralUser
        {
            UserName = cleanEmail,
            Email = cleanEmail,
            EmailConfirmed = true,
            FirstName = Input.FirstName.Trim(),
            LastName = Input.LastName.Trim(),
            Department = Input.Department,
            IsActive = true,
            CreatedUtc = DateTime.UtcNow
        };

        var result = await _userManager.CreateAsync(newStaff, Input.Password);
        if (!result.Succeeded)
        {
            ErrorMessage = string.Join("; ", result.Errors.Select(e => e.Description));
            return Page();
        }

        // Assign Role
        if (await _roleManager.RoleExistsAsync(Input.Role))
        {
            await _userManager.AddToRoleAsync(newStaff, Input.Role);
        }

        _logger.LogInformation("SuperAdmin created new staff operator: {Email} with role {Role}", cleanEmail, Input.Role);

        return RedirectToPage("/Operations/Users/Index");
    }
}
