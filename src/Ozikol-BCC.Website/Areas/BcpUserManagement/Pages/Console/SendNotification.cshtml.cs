using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;
using Ozikol_BCC.Website.Services;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Website.Areas.BcpUserManagement.Pages.Console;

[Authorize]
public class SendNotificationModel : PageModel
{
    private readonly UserManager<Profile> _userManager;
    private readonly DashboardDbContext _dbContext;
    private readonly IBcpMessageQueueService _messageQueue;

    public SendNotificationModel(
        UserManager<Profile> userManager,
        DashboardDbContext dbContext,
        IBcpMessageQueueService messageQueue)
    {
        _userManager = userManager;
        _dbContext = dbContext;
        _messageQueue = messageQueue;
    }

    // ── Form inputs ──────────────────────────────────────────────────────
    [BindProperty]
    public string Title { get; set; } = string.Empty;

    [BindProperty]
    public string Body { get; set; } = string.Empty;

    /// <summary>
    /// "all" | "selected" — determines recipient scope.
    /// </summary>
    [BindProperty]
    public string RecipientMode { get; set; } = "all";

    /// <summary>
    /// User IDs selected when RecipientMode == "selected".
    /// </summary>
    [BindProperty]
    public List<string> SelectedUserIds { get; set; } = [];

    /// <summary>
    /// Channels to send through (checkboxes).
    /// </summary>
    [BindProperty]
    public bool SendInApp { get; set; } = true;

    [BindProperty]
    public bool SendEmail { get; set; }

    [BindProperty]
    public bool SendSms { get; set; }

    // ── Page data ────────────────────────────────────────────────────────
    public List<SelectListItem> UserOptions { get; set; } = [];

    [TempData]
    public string? StatusMessage { get; set; }

    /// <summary>
    /// Recent notifications sent from this page (last 20).
    /// </summary>
    public List<BcpNotification> RecentlySent { get; set; } = [];

    public async Task OnGetAsync()
    {
        await LoadPageDataAsync();
    }

    public async Task<IActionResult> OnPostAsync()
    {
        if (string.IsNullOrWhiteSpace(Title) || string.IsNullOrWhiteSpace(Body))
        {
            StatusMessage = "Title and message body are required.";
            await LoadPageDataAsync();
            return Page();
        }

        if (!SendInApp && !SendEmail && !SendSms)
        {
            StatusMessage = "Please select at least one delivery channel.";
            await LoadPageDataAsync();
            return Page();
        }

        // Determine recipients
        List<Profile> recipients;

        if (RecipientMode == "selected" && SelectedUserIds.Count > 0)
        {
            recipients = await _userManager.Users
                .Where(u => SelectedUserIds.Contains(u.Id))
                .ToListAsync();
        }
        else
        {
            // "all" mode — every active user
            recipients = await _userManager.Users.ToListAsync();
        }

        if (recipients.Count == 0)
        {
            StatusMessage = "No recipients found.";
            await LoadPageDataAsync();
            return Page();
        }

        int inAppCount = 0, emailCount = 0, smsCount = 0;
        bool isBroadcast = RecipientMode == "all";

        // For broadcast in-app, create a single broadcast notification
        if (SendInApp && isBroadcast)
        {
            await _messageQueue.EnqueueBroadcastAsync(
                BcpEventType.SystemAnnouncement,
                Title,
                Body,
                icon: "campaign");
            inAppCount = recipients.Count;
        }

        foreach (var user in recipients)
        {
            // In-app notification (per-user for selected mode)
            if (SendInApp && !isBroadcast)
            {
                _dbContext.BcpNotifications.Add(new BcpNotification
                {
                    UserId = user.Id,
                    Title = Title,
                    Message = Body,
                    Icon = "campaign",
                    Module = "UserManagement",
                    Category = BcpMessageCategory.UserManagement,
                    Priority = BcpMessagePriority.Normal,
                    EventType = BcpEventType.SystemAnnouncement,
                    IsBroadcast = false,
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow
                });
                inAppCount++;
            }

            // Email queue
            if (SendEmail && !string.IsNullOrWhiteSpace(user.Email))
            {
                await _messageQueue.EnqueueEmailAsync(
                    recipientEmail: user.Email,
                    recipientName: user.FullName,
                    subject: Title,
                    htmlBody: BuildEmailHtml(Title, Body),
                    category: BcpMessageCategory.UserManagement,
                    priority: BcpMessagePriority.Normal,
                    relatedUserId: user.Id,
                    eventType: BcpEventType.SystemAnnouncement);
                emailCount++;
            }

            // SMS queue
            if (SendSms && !string.IsNullOrWhiteSpace(user.PhoneNumber))
            {
                await _messageQueue.EnqueueSmsAsync(
                    recipientPhone: user.PhoneNumber,
                    message: $"{Title}: {Body}",
                    category: BcpMessageCategory.UserManagement,
                    priority: BcpMessagePriority.Normal,
                    relatedUserId: user.Id,
                    eventType: BcpEventType.SystemAnnouncement);
                smsCount++;
            }
        }

        // Save any pending in-app notifications added directly to DbContext
        if (!isBroadcast && SendInApp)
        {
            await _dbContext.SaveChangesAsync();
        }

        var parts = new List<string>();
        if (inAppCount > 0) parts.Add($"{inAppCount} in-app notification(s)");
        if (emailCount > 0) parts.Add($"{emailCount} email(s)");
        if (smsCount > 0) parts.Add($"{smsCount} SMS message(s)");

        StatusMessage = $"Successfully queued: {string.Join(", ", parts)}.";
        return RedirectToPage();
    }

    private async Task LoadPageDataAsync()
    {
        var users = await _userManager.Users
            .OrderBy(u => u.FirstName)
            .ThenBy(u => u.LastName)
            .ToListAsync();

        UserOptions = users.Select(u => new SelectListItem
        {
            Value = u.Id,
            Text = $"{u.FullName} ({u.Email})"
        }).ToList();

        RecentlySent = await _dbContext.BcpNotifications
            .Where(n => n.EventType == BcpEventType.SystemAnnouncement && n.Module == "UserManagement")
            .OrderByDescending(n => n.CreatedAt)
            .Take(20)
            .ToListAsync();
    }

    private static string BuildEmailHtml(string title, string body)
    {
        return $@"
<div style=""max-width:600px;margin:0 auto;font-family:'Segoe UI',Arial,sans-serif;color:#1e293b;padding:32px;"">
    <h2 style=""margin:0 0 16px 0;font-size:20px;color:#0f172a;"">{title}</h2>
    <p style=""margin:0;font-size:15px;line-height:1.6;color:#475569;"">{body}</p>
    <hr style=""margin:32px 0 16px 0;border:none;border-top:1px solid #e2e8f0;""/>
    <p style=""font-size:12px;color:#94a3b8;margin:0;"">This is a notification from your administrator. Please do not reply to this email.</p>
</div>";
    }
}
