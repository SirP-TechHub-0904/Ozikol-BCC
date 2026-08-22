using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;

namespace Ozikol_BCC.Website.Areas.BcpIdentity.Pages.Authenticate;

public class InviteAcceptModel : PageModel
{
    private readonly DashboardDbContext _context;
    private readonly UserManager<Profile> _userManager;
    private readonly SignInManager<Profile> _signInManager;

    public InviteAcceptModel(DashboardDbContext context, UserManager<Profile> userManager, SignInManager<Profile> signInManager)
    {
        _context = context;
        _userManager = userManager;
        _signInManager = signInManager;
    }

    [BindProperty]
    public InputModel Input { get; set; } = new();

    public string InvitationEmail { get; set; } = string.Empty;
    public bool IsInvalidToken { get; set; }

    public async Task<IActionResult> OnGetAsync(string? token)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            IsInvalidToken = true;
            return Page();
        }

        var invitation = await _context.BcpUserInvitations.FirstOrDefaultAsync(x => x.Token == token && !x.IsAccepted);
        if (invitation == null || invitation.ExpiresAt < DateTime.UtcNow)
        {
            IsInvalidToken = true;
            return Page();
        }

        InvitationEmail = invitation.Email;
        Input.Token = token;
        return Page();
    }

    public async Task<IActionResult> OnPostAsync()
    {
        if (!ModelState.IsValid)
        {
            return Page();
        }

        var invitation = await _context.BcpUserInvitations.FirstOrDefaultAsync(x => x.Token == Input.Token && !x.IsAccepted);
        if (invitation == null || invitation.ExpiresAt < DateTime.UtcNow)
        {
            IsInvalidToken = true;
            return Page();
        }

        InvitationEmail = invitation.Email;

        var existingUser = await _userManager.FindByEmailAsync(invitation.Email);
        if (existingUser != null)
        {
            ModelState.AddModelError(string.Empty, "An account with this email address already exists.");
            return Page();
        }

        var newUser = new Profile
        {
            UserName = invitation.Email,
            Email = invitation.Email,
            EmailConfirmed = true,
            Title = Input.Title,
            FirstName = Input.FirstName,
            LastName = Input.LastName,
            PhoneNumber = Input.PhoneNumber,
            BcpUserCategoryId = invitation.BcpUserCategoryId,
            UserStatus = Ozikol_BCC.Domain.Enum.Enum.UserStatus.Active
        };

        var result = await _userManager.CreateAsync(newUser, Input.Password);
        if (!result.Succeeded)
        {
            foreach (var error in result.Errors)
            {
                ModelState.AddModelError(string.Empty, error.Description);
            }
            return Page();
        }

        if (!string.IsNullOrWhiteSpace(invitation.RoleName))
        {
            await _userManager.AddToRoleAsync(newUser, invitation.RoleName);
        }

        invitation.IsAccepted = true;
        invitation.AcceptedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        await _signInManager.SignInAsync(newUser, isPersistent: false);
        return RedirectToPage("/Workspace/Dashboard", new { area = "BcpWorkspace" });
    }

    public class InputModel
    {
        [Required]
        public string Token { get; set; } = string.Empty;

        public string? Title { get; set; }

        [Required]
        [Display(Name = "First Name")]
        public string FirstName { get; set; } = string.Empty;

        [Required]
        [Display(Name = "Last Name")]
        public string LastName { get; set; } = string.Empty;

        [Display(Name = "Phone Number")]
        public string? PhoneNumber { get; set; }

        [Required]
        [DataType(DataType.Password)]
        [Display(Name = "Create Password")]
        public string Password { get; set; } = string.Empty;

        [DataType(DataType.Password)]
        [Display(Name = "Confirm Password")]
        [Compare("Password", ErrorMessage = "The password and confirmation password do not match.")]
        public string ConfirmPassword { get; set; } = string.Empty;
    }
}