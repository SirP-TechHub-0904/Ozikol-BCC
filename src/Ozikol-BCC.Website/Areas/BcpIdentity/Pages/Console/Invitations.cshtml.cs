using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;

namespace Ozikol_BCC.Website.Areas.BcpIdentity.Pages.Console;

[Authorize]
public class InvitationsModel : PageModel
{
    private readonly DashboardDbContext _context;
    private readonly RoleManager<AppRole> _roleManager;
    private readonly UserManager<Profile> _userManager;

    public InvitationsModel(DashboardDbContext context, RoleManager<AppRole> roleManager, UserManager<Profile> userManager)
    {
        _context = context;
        _roleManager = roleManager;
        _userManager = userManager;
    }

    [BindProperty]
    public InputModel Input { get; set; } = new();

    public List<BcpUserInvitationItem> Invitations { get; set; } = [];
    public List<SelectListItem> CategoryOptions { get; set; } = [];
    public List<SelectListItem> RoleOptions { get; set; } = [];

    [TempData]
    public string? StatusMessage { get; set; }

    public async Task OnGetAsync()
    {
        await LoadOptionsAndListAsync();
    }

    public async Task<IActionResult> OnPostAsync()
    {
        await LoadOptionsAndListAsync();

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

        var token = Guid.NewGuid().ToString("N");
        var currentUser = await _userManager.GetUserAsync(User);

        var invitation = new BcpUserInvitation
        {
            Email = Input.Email,
            Token = token,
            RoleName = Input.RoleName,
            BcpUserCategoryId = Input.BcpUserCategoryId,
            InvitedByProfileId = currentUser?.Id,
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            IsAccepted = false
        };

        _context.BcpUserInvitations.Add(invitation);
        await _context.SaveChangesAsync();

        StatusMessage = $"Invitation created for {Input.Email}. Invitation link token: {token}";
        return RedirectToPage();
    }

    public async Task<IActionResult> OnPostCancelAsync(Guid id)
    {
        var invitation = await _context.BcpUserInvitations.FindAsync(id);
        if (invitation != null)
        {
            _context.BcpUserInvitations.Remove(invitation);
            await _context.SaveChangesAsync();
            StatusMessage = "Invitation cancelled.";
        }

        return RedirectToPage();
    }

    private async Task LoadOptionsAndListAsync()
    {
        CategoryOptions = await _context.BcpUserCategories
            .OrderBy(x => x.SortOrder)
            .Select(x => new SelectListItem(x.Name, x.Id.ToString()))
            .ToListAsync();
        CategoryOptions.Insert(0, new SelectListItem("Select Category (Optional)", string.Empty));

        RoleOptions = await _roleManager.Roles
            .Where(x => x.Name != "SuperAdmin" && x.Name != "PlatformOwner")
            .OrderBy(x => x.Name)
            .Select(x => new SelectListItem(x.Name, x.Name))
            .ToListAsync();
        RoleOptions.Insert(0, new SelectListItem("Select Initial Role (Optional)", string.Empty));

        Invitations = await _context.BcpUserInvitations
            .Include(x => x.BcpUserCategory)
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new BcpUserInvitationItem
            {
                Id = x.Id,
                Email = x.Email,
                Token = x.Token,
                RoleName = x.RoleName,
                CategoryName = x.BcpUserCategory != null ? x.BcpUserCategory.Name : null,
                CreatedAt = x.CreatedAt,
                ExpiresAt = x.ExpiresAt,
                IsAccepted = x.IsAccepted,
                AcceptedAt = x.AcceptedAt
            })
            .ToListAsync();
    }

    public class InputModel
    {
        [Required, EmailAddress]
        [Display(Name = "Recipient Email Address")]
        public string Email { get; set; } = string.Empty;

        [Display(Name = "Assign User Category")]
        public Guid? BcpUserCategoryId { get; set; }

        [Display(Name = "Assign Role")]
        public string? RoleName { get; set; }
    }

    public class BcpUserInvitationItem
    {
        public Guid Id { get; set; }
        public string Email { get; set; } = string.Empty;
        public string Token { get; set; } = string.Empty;
        public string? RoleName { get; set; }
        public string? CategoryName { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime ExpiresAt { get; set; }
        public bool IsAccepted { get; set; }
        public DateTime? AcceptedAt { get; set; }
    }
}