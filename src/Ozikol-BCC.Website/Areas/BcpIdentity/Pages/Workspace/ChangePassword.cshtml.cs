using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Website.Services;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Website.Areas.BcpIdentity.Pages.Workspace;

[Authorize]
public class ChangePasswordModel : PageModel
{
    private readonly UserManager<Profile> _userManager;
    private readonly IBcpMessageQueueService _messageQueue;

    public ChangePasswordModel(UserManager<Profile> userManager, IBcpMessageQueueService messageQueue)
    {
        _userManager = userManager;
        _messageQueue = messageQueue;
    }

    [BindProperty]
    public InputModel Input { get; set; } = new();

    [TempData]
    public string? StatusMessage { get; set; }

    public void OnGet()
    {
    }

    public async Task<IActionResult> OnPostAsync()
    {
        if (!ModelState.IsValid)
        {
            return Page();
        }

        var user = await _userManager.GetUserAsync(User);
        if (user == null)
        {
            return NotFound("Unable to load user.");
        }

        var changePasswordResult = await _userManager.ChangePasswordAsync(user, Input.OldPassword, Input.NewPassword);
        if (!changePasswordResult.Succeeded)
        {
            foreach (var error in changePasswordResult.Errors)
            {
                ModelState.AddModelError(string.Empty, error.Description);
            }
            return Page();
        }

        await _messageQueue.EnqueueAsync(
            BcpEventType.PasswordChanged,
            user.Id,
            "Password Changed",
            "Your account password was changed successfully. If you did not make this change, please contact your administrator immediately.",
            actionUrl: "/BcpIdentity/Workspace/Security");

        StatusMessage = "Your password has been changed successfully.";
        return RedirectToPage();
    }

    public class InputModel
    {
        [Required]
        [DataType(DataType.Password)]
        [Display(Name = "Current Password")]
        public string OldPassword { get; set; } = string.Empty;

        [Required]
        [DataType(DataType.Password)]
        [Display(Name = "New Password")]
        public string NewPassword { get; set; } = string.Empty;

        [DataType(DataType.Password)]
        [Display(Name = "Confirm New Password")]
        [Compare("NewPassword", ErrorMessage = "The new password and confirmation password do not match.")]
        public string ConfirmPassword { get; set; } = string.Empty;
    }
}