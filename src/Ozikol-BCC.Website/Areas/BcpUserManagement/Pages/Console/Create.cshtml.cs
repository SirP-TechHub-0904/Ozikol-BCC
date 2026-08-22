using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Website.Areas.BcpUserManagement.Pages.Console;

[Authorize]
public class CreateModel : PageModel
{
    private readonly UserManager<Profile> _userManager;
    private readonly RoleManager<AppRole> _roleManager;
    private readonly DashboardDbContext _context;

    public CreateModel(UserManager<Profile> userManager, RoleManager<AppRole> roleManager, DashboardDbContext context)
    {
        _userManager = userManager;
        _roleManager = roleManager;
        _context = context;
    }

    [BindProperty] public InputModel Input { get; set; } = new();
    public List<SelectListItem> CategoryOptions { get; private set; } = [];
    public List<SelectListItem> RoleOptions { get; private set; } = [];
    public List<SelectListItem> StatusOptions { get; private set; } = [];

    public async Task OnGetAsync() => await LoadOptionsAsync();

    public async Task<IActionResult> OnPostAsync()
    {
        await LoadOptionsAsync();
        var emailClean = Input.Email.Trim();
        var existingEmail = await _userManager.FindByEmailAsync(emailClean);
        if (existingEmail != null)
        {
            ModelState.AddModelError("Input.Email", "A user account with this email address already exists.");
            return Page();
        }

        if (!string.IsNullOrWhiteSpace(Input.PhoneNumber))
        {
            var phoneClean = Input.PhoneNumber.Trim();
            var existingPhone = await _userManager.Users.AnyAsync(u => u.PhoneNumber == phoneClean);
            if (existingPhone)
            {
                ModelState.AddModelError("Input.PhoneNumber", "A user account with this phone number already exists.");
                return Page();
            }
        }

        var user = new Profile
        {
            UserName = emailClean,
            Email = emailClean,
            EmailConfirmed = Input.AutoConfirmEmail,
            Title = Input.Title,
            FirstName = Input.FirstName,
            LastName = Input.LastName,
            PhoneNumber = Input.PhoneNumber,
            BcpUserCategoryId = Input.BcpUserCategoryId,
            UserStatus = Input.UserStatus
        };

        var result = await _userManager.CreateAsync(user, Input.Password);
        if (!result.Succeeded)
        {
            foreach (var error in result.Errors) ModelState.AddModelError(string.Empty, error.Description);
            return Page();
        }

        if (!string.IsNullOrWhiteSpace(Input.RoleName))
        {
            await _userManager.AddToRoleAsync(user, Input.RoleName);
        }

        return RedirectToPage("/Console/Details", new { area = "BcpUserManagement", id = user.Id });
    }

    private async Task LoadOptionsAsync()
    {
        CategoryOptions = await _context.BcpUserCategories.OrderBy(x => x.SortOrder).Select(x => new SelectListItem(x.Name, x.Id.ToString())).ToListAsync();
        CategoryOptions.Insert(0, new SelectListItem("No category", string.Empty));
        RoleOptions = await _roleManager.Roles.Where(x => x.Name != "SuperAdmin" && x.Name != "PlatformOwner").OrderBy(x => x.Name).Select(x => new SelectListItem(x.Name, x.Name)).ToListAsync();
        RoleOptions.Insert(0, new SelectListItem("No role", string.Empty));
        StatusOptions = System.Enum.GetValues<UserStatus>().Select(x => new SelectListItem(x.ToString(), x.ToString())).ToList();
    }

    public class InputModel
    {
        public string? Title { get; set; }
        [Required, EmailAddress] public string Email { get; set; } = string.Empty;
        [Required] public string FirstName { get; set; } = string.Empty;
        [Required] public string LastName { get; set; } = string.Empty;
        public string? PhoneNumber { get; set; }
        [Required, MinLength(6)] public string Password { get; set; } = string.Empty;
        public Guid? BcpUserCategoryId { get; set; }
        public string? RoleName { get; set; }
        public UserStatus UserStatus { get; set; } = UserStatus.Active;
        [Display(Name = "Auto-confirm Email Address")]
        public bool AutoConfirmEmail { get; set; } = true;
    }
}
