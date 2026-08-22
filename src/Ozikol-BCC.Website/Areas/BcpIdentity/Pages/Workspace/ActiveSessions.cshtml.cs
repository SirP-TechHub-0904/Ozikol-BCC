using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;
using Ozikol_BCC.Website.Services;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Website.Areas.BcpIdentity.Pages.Workspace;

[Authorize]
public class ActiveSessionsModel : PageModel
{
    private readonly UserManager<Profile> _userManager;
    private readonly SignInManager<Profile> _signInManager;
    private readonly DashboardDbContext _dbContext;
    private readonly IBcpMessageQueueService _messageQueue;

    public ActiveSessionsModel(UserManager<Profile> userManager, SignInManager<Profile> signInManager, DashboardDbContext dbContext, IBcpMessageQueueService messageQueue)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _dbContext = dbContext;
        _messageQueue = messageQueue;
    }

    public List<UserDeviceSessionItem> ActiveSessions { get; set; } = [];
    public string CurrentSessionKey { get; set; } = string.Empty;

    [TempData]
    public string? StatusMessage { get; set; }

    public async Task<IActionResult> OnGetAsync()
    {
        var user = await _userManager.GetUserAsync(User);
        if (user == null)
        {
            return NotFound("Unable to load user.");
        }

        CurrentSessionKey = Request.Cookies["BCP_SessionKey"] ?? string.Empty;

        var sessions = await _dbContext.UserDeviceSessions
            .Where(s => s.ProfileId == user.Id && !s.IsRevoked)
            .OrderByDescending(s => s.LastActiveAt)
            .ToListAsync();

        ActiveSessions = sessions.Select(s => new UserDeviceSessionItem
        {
            Id = s.Id,
            DeviceType = s.DeviceType,
            DeviceName = s.DeviceName,
            IpAddress = s.IpAddress,
            CreatedAt = s.CreatedAt,
            LastActiveAt = s.LastActiveAt,
            IsCurrentSession = !string.IsNullOrWhiteSpace(CurrentSessionKey) && s.SessionKey == CurrentSessionKey
        }).ToList();

        return Page();
    }

    public async Task<IActionResult> OnPostRevokeSingleAsync(string id)
    {
        var user = await _userManager.GetUserAsync(User);
        if (user == null) return NotFound();

        var session = await _dbContext.UserDeviceSessions
            .FirstOrDefaultAsync(s => s.Id == id && s.ProfileId == user.Id && !s.IsRevoked);

        if (session != null)
        {
            session.IsRevoked = true;
            session.RevokedAt = DateTime.UtcNow;
            await _dbContext.SaveChangesAsync();

            await _messageQueue.EnqueueAsync(
                BcpEventType.SessionRevokedByUser,
                user.Id,
                "Device Session Revoked",
                $"You revoked a session for '{session.DeviceName}' (IP: {session.IpAddress}).",
                actionUrl: "/BcpIdentity/Workspace/ActiveSessions");

            StatusMessage = $"Session for '{session.DeviceName}' has been logged out.";
        }

        return RedirectToPage();
    }

    public async Task<IActionResult> OnPostRevokeOthersAsync()
    {
        var user = await _userManager.GetUserAsync(User);
        if (user == null) return NotFound();

        CurrentSessionKey = Request.Cookies["BCP_SessionKey"] ?? string.Empty;

        var otherSessions = await _dbContext.UserDeviceSessions
            .Where(s => s.ProfileId == user.Id && !s.IsRevoked && s.SessionKey != CurrentSessionKey)
            .ToListAsync();

        foreach (var session in otherSessions)
        {
            session.IsRevoked = true;
            session.RevokedAt = DateTime.UtcNow;
        }

        await _dbContext.SaveChangesAsync();
        await _userManager.UpdateSecurityStampAsync(user);
        await _signInManager.SignInAsync(user, isPersistent: false);

        StatusMessage = "All other sessions have been logged out successfully.";
        return RedirectToPage();
    }

    public class UserDeviceSessionItem
    {
        public string Id { get; set; } = string.Empty;
        public string DeviceType { get; set; } = "Desktop";
        public string DeviceName { get; set; } = string.Empty;
        public string IpAddress { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime LastActiveAt { get; set; }
        public bool IsCurrentSession { get; set; }
    }
}