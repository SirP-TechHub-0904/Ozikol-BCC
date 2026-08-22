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
public class EditModel : PageModel
{
    private readonly UserManager<Profile> _userManager;
    private readonly DashboardDbContext _context;

    public EditModel(UserManager<Profile> userManager, DashboardDbContext context)
    {
        _userManager = userManager;
        _context = context;
    }

    [BindProperty] public InputModel Input { get; set; } = new();
    public List<SelectListItem> CategoryOptions { get; private set; } = [];
    public List<SelectListItem> StatusOptions { get; private set; } = [];

    public async Task<IActionResult> OnGetAsync(string id)
    {
        await LoadOptionsAsync();
        var user = await _userManager.Users.FirstOrDefaultAsync(x => x.Id == id);
        if (user is null) return NotFound();
        Input = new InputModel { Id = user.Id, Title = user.Title, Email = user.Email ?? string.Empty, FirstName = user.FirstName ?? string.Empty, MiddleName = user.MiddleName, LastName = user.LastName ?? string.Empty, PhoneNumber = user.PhoneNumber, BcpUserCategoryId = user.BcpUserCategoryId, UserStatus = user.UserStatus };
        return Page();
    }

    public async Task<IActionResult> OnPostAsync()
    {
        await LoadOptionsAsync();
        if (!ModelState.IsValid) return Page();
        var user = await _userManager.FindByIdAsync(Input.Id);
        if (user is null) return NotFound();

        var emailClean = Input.Email.Trim();
        var existingEmail = await _userManager.Users.AnyAsync(u => u.Id != Input.Id && u.Email == emailClean);
        if (existingEmail)
        {
            ModelState.AddModelError("Input.Email", "Another user account with this email address already exists.");
            return Page();
        }

        if (!string.IsNullOrWhiteSpace(Input.PhoneNumber))
        {
            var phoneClean = Input.PhoneNumber.Trim();
            var existingPhone = await _userManager.Users.AnyAsync(u => u.Id != Input.Id && u.PhoneNumber == phoneClean);
            if (existingPhone)
            {
                ModelState.AddModelError("Input.PhoneNumber", "Another user account with this phone number already exists.");
                return Page();
            }
        }

        user.Title = Input.Title;
        user.Email = emailClean;
        user.UserName = emailClean;
        user.FirstName = Input.FirstName;
        user.MiddleName = Input.MiddleName;
        user.LastName = Input.LastName;
        user.PhoneNumber = Input.PhoneNumber;
        user.BcpUserCategoryId = Input.BcpUserCategoryId;
        user.UserStatus = Input.UserStatus;
        var result = await _userManager.UpdateAsync(user);
        if (!result.Succeeded)
        {
            foreach (var error in result.Errors) ModelState.AddModelError(string.Empty, error.Description);
            return Page();
        }
        return RedirectToPage("/Console/Details", new { area = "BcpUserManagement", id = user.Id });
    }

    private async Task LoadOptionsAsync()
    {
        CategoryOptions = await _context.BcpUserCategories.OrderBy(x => x.SortOrder).Select(x => new SelectListItem(x.Name, x.Id.ToString())).ToListAsync();
        CategoryOptions.Insert(0, new SelectListItem("No category", string.Empty));
        StatusOptions = System.Enum.GetValues<UserStatus>().Select(x => new SelectListItem(x.ToString(), x.ToString())).ToList();
    }

    public class InputModel
    {
        public string Id { get; set; } = string.Empty;
        public string? Title { get; set; }
        [Required, EmailAddress] public string Email { get; set; } = string.Empty;
        [Required] public string FirstName { get; set; } = string.Empty;
        public string? MiddleName { get; set; }
        [Required] public string LastName { get; set; } = string.Empty;
        public string? PhoneNumber { get; set; }
        public Guid? BcpUserCategoryId { get; set; }
        public UserStatus UserStatus { get; set; }
    }
}
