using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;
using Ozikol_BCC.Website.Services;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Website.Areas.BcpIdentity.Pages.Console;

[Authorize]
public class SessionsModel : PageModel
{
    private readonly UserManager<Profile> _userManager;
    private readonly DashboardDbContext _dbContext;
    private readonly IBcpMessageQueueService _messageQueue;

    public SessionsModel(UserManager<Profile> userManager, DashboardDbContext dbContext, IBcpMessageQueueService messageQueue)
    {
        _userManager = userManager;
        _dbContext = dbContext;
        _messageQueue = messageQueue;
    }

    public List<UserSessionItem> ActiveUserSessions { get; set; } = [];

    [TempData]
    public string? StatusMessage { get; set; }

    public async Task OnGetAsync()
    {
        var dbSessions = await _dbContext.UserDeviceSessions
            .Include(s => s.Profile)
            .Where(s => !s.IsRevoked)
            .OrderByDescending(s => s.LastActiveAt)
            .Take(100)
            .ToListAsync();

        ActiveUserSessions = dbSessions.Select(s => new UserSessionItem
        {
            SessionId = s.Id,
            UserId = s.ProfileId,
            Email = s.Profile?.Email ?? string.Empty,
            FullName = s.Profile?.FullName ?? s.Profile?.Email ?? "User",
            DeviceType = s.DeviceType,
            DeviceName = s.DeviceName,
            IpAddress = s.IpAddress,
            CreatedAt = s.CreatedAt,
            LastActiveAt = s.LastActiveAt
        }).ToList();
    }

    public async Task<IActionResult> OnPostRevokeSingleAsync(string sessionId)
    {
        if (string.IsNullOrWhiteSpace(sessionId)) return RedirectToPage();

        var session = await _dbContext.UserDeviceSessions
            .Include(s => s.Profile)
            .FirstOrDefaultAsync(s => s.Id == sessionId);

        if (session != null)
        {
            session.IsRevoked = true;
            session.RevokedAt = DateTime.UtcNow;
            await _dbContext.SaveChangesAsync();

            await _messageQueue.EnqueueAsync(
                BcpEventType.SessionRevokedByAdmin,
                session.ProfileId,
                "Session Revoked by Administrator",
                $"An administrator revoked your session on '{session.DeviceName}' (IP: {session.IpAddress}).",
                actionUrl: "/BcpIdentity/Workspace/ActiveSessions");

            StatusMessage = $"Revoked session '{session.DeviceName}' for user {session.Profile?.Email}.";
        }

        return RedirectToPage();
    }

    public async Task<IActionResult> OnPostRevokeUserAllAsync(string userId)
    {
        if (string.IsNullOrWhiteSpace(userId)) return RedirectToPage();

        var user = await _userManager.FindByIdAsync(userId);
        if (user != null)
        {
            var userSessions = await _dbContext.UserDeviceSessions
                .Where(s => s.ProfileId == userId && !s.IsRevoked)
                .ToListAsync();

            foreach (var s in userSessions)
            {
                s.IsRevoked = true;
                s.RevokedAt = DateTime.UtcNow;
            }

            await _dbContext.SaveChangesAsync();
            await _userManager.UpdateSecurityStampAsync(user);

            await _messageQueue.EnqueueAsync(
                BcpEventType.SessionRevokedByAdmin,
                userId,
                "All Sessions Revoked by Administrator",
                "An administrator has logged out all your active device sessions. Please sign in again.",
                actionUrl: "/BcpIdentity/Workspace/ActiveSessions");

            StatusMessage = $"All active device sessions for {user.Email} have been revoked.";
        }

        return RedirectToPage();
    }

    public class UserSessionItem
    {
        public string SessionId { get; set; } = string.Empty;
        public string UserId { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string DeviceType { get; set; } = "Desktop";
        public string DeviceName { get; set; } = string.Empty;
        public string IpAddress { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public DateTime LastActiveAt { get; set; }
    }
}