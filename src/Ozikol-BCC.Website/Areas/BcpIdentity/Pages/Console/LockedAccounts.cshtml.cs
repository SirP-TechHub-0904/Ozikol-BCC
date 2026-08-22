using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Website.Services;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Website.Areas.BcpIdentity.Pages.Console;

[Authorize]
public class LockedAccountsModel : PageModel
{
    private readonly UserManager<Profile> _userManager;
    private readonly IBcpMessageQueueService _messageQueue;

    public LockedAccountsModel(UserManager<Profile> userManager, IBcpMessageQueueService messageQueue)
    {
        _userManager = userManager;
        _messageQueue = messageQueue;
    }

    public List<LockedUserItem> LockedUsers { get; set; } = [];

    [TempData]
    public string? StatusMessage { get; set; }

    public async Task OnGetAsync()
    {
        var now = DateTimeOffset.UtcNow;
        var users = await _userManager.Users
            .Where(u => u.LockoutEnd.HasValue && u.LockoutEnd.Value > now)
            .OrderByDescending(u => u.LockoutEnd)
            .ToListAsync();

        LockedUsers = users.Select(u => new LockedUserItem
        {
            Id = u.Id,
            Email = u.Email ?? string.Empty,
            FullName = u.FullName,
            LockoutEnd = u.LockoutEnd,
            AccessFailedCount = u.AccessFailedCount
        }).ToList();
    }

    public async Task<IActionResult> OnPostUnlockAsync(string userId)
    {
        if (string.IsNullOrWhiteSpace(userId))
        {
            return RedirectToPage();
        }

        var user = await _userManager.FindByIdAsync(userId);
        if (user != null)
        {
            await _userManager.SetLockoutEndDateAsync(user, null);
            await _userManager.ResetAccessFailedCountAsync(user);

            await _messageQueue.EnqueueAsync(
                BcpEventType.AccountUnlocked,
                user.Id,
                "Account Unlocked",
                "Your account has been unlocked by an administrator. You can now sign in.",
                actionUrl: "/BcpIdentity/Workspace/Security");

            StatusMessage = $"Successfully unlocked account for {user.Email}.";
        }

        return RedirectToPage();
    }

    public class LockedUserItem
    {
        public string Id { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public DateTimeOffset? LockoutEnd { get; set; }
        public int AccessFailedCount { get; set; }
    }
}