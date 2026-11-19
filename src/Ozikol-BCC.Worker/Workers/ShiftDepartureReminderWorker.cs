using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Ozikol.MasterPersistence.EF.MasterSQL;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Infrastructure.TenantSupport;
using Ozikol_BCC.Persistence.EF.SQL;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Worker.Workers;

/// <summary>
/// Autonomous background service that periodically scans upcoming shifts across all active tenant workspaces
/// and enqueues automated departure reminders (24h, 4h, and 30m slots) into <see cref="BcpMessagePool"/>
/// based on each staff member's configured preferences (In-App, Email, WhatsApp).
/// </summary>
public sealed class ShiftDepartureReminderWorker : BackgroundService
{
    private static readonly TimeSpan ScanInterval = TimeSpan.FromMinutes(3);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ShiftDepartureReminderWorker> _logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="ShiftDepartureReminderWorker"/> class.
    /// </summary>
    /// <param name="scopeFactory">Scope factory used to resolve master and tenant services.</param>
    /// <param name="logger">Structured logger instance.</param>
    public ShiftDepartureReminderWorker(
        IServiceScopeFactory scopeFactory,
        ILogger<ShiftDepartureReminderWorker> logger)
    {
        _scopeFactory = scopeFactory ?? throw new ArgumentNullException(nameof(scopeFactory));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <inheritdoc />
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("⏰ [ShiftDepartureReminderWorker] Started with {Interval}m scanning interval.", ScanInterval.TotalMinutes);

        using var timer = new PeriodicTimer(ScanInterval);
        do
        {
            try
            {
                await ScanAllTenantsAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ [ShiftDepartureReminderWorker] Error in reminder scan cycle: {Message}", ex.Message);
            }
        }
        while (await WaitForNextTickAsync(timer, stoppingToken));
    }

    private static async Task<bool> WaitForNextTickAsync(PeriodicTimer timer, CancellationToken token)
    {
        try { return await timer.WaitForNextTickAsync(token); }
        catch (OperationCanceledException) { return false; }
    }

    private async Task ScanAllTenantsAsync(CancellationToken ct)
    {
        List<string> activeTenantKeys;

        using (var masterScope = _scopeFactory.CreateScope())
        {
            var masterDb = masterScope.ServiceProvider.GetRequiredService<MasterCatalogDbContext>();
            activeTenantKeys = await masterDb.MasterTenantCatalogs
                .AsNoTracking()
                .Where(t => t.IsActive && !t.IsDeleted && !t.IsSuspended && !string.IsNullOrWhiteSpace(t.TenantKey))
                .Select(t => t.TenantKey)
                .ToListAsync(ct);
        }

        foreach (var tenantKey in activeTenantKeys)
        {
            if (ct.IsCancellationRequested) break;

            try
            {
                await ScanTenantUpcomingShiftsAsync(tenantKey, ct);
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "⚠️ [ShiftDepartureReminderWorker] Failed scanning tenant '{TenantKey}': {Message}", tenantKey, ex.Message);
            }
        }
    }

    private async Task ScanTenantUpcomingShiftsAsync(string tenantKey, CancellationToken ct)
    {
        using var tenantScope = _scopeFactory.CreateScope();
        var tenantProvider = tenantScope.ServiceProvider.GetRequiredService<ITenantProvider>();
        using var _ = tenantProvider.BeginScope(tenantKey);

        var db = tenantScope.ServiceProvider.GetRequiredService<DashboardDbContext>();
        var nowUtc = DateTime.UtcNow;
        var windowEnd = nowUtc.AddHours(26);

        // Retrieve upcoming active shifts within 26 hours that have an assigned officer
        var upcomingShifts = await db.BcpShifts
            .AsNoTracking()
            .Include(s => s.ClientSite)
            .Where(s => s.TenantKey == tenantKey &&
                        !string.IsNullOrEmpty(s.AssignedUserId) &&
                        s.StartsAtUtc > nowUtc &&
                        s.StartsAtUtc <= windowEnd &&
                        s.Status != "Cancelled" &&
                        s.Status != "Completed")
            .ToListAsync(ct);

        if (upcomingShifts.Count == 0) return;

        var userIds = upcomingShifts.Select(s => s.AssignedUserId!).Distinct().ToList();

        // Pre-fetch staff notification preferences
        var preferences = await db.BcpShiftNotificationPreferences
            .AsNoTracking()
            .Where(p => p.TenantKey == tenantKey && userIds.Contains(p.UserId))
            .ToDictionaryAsync(p => p.UserId, ct);

        // Pre-fetch user contact details
        var users = await db.Users
            .AsNoTracking()
            .Where(u => userIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => new { u.FullName, u.Email, u.PhoneNumber }, ct);

        var newMessages = new List<BcpMessagePool>();

        foreach (var shift in upcomingShifts)
        {
            var userId = shift.AssignedUserId!;
            users.TryGetValue(userId, out var userContact);

            preferences.TryGetValue(userId, out var pref);
            var slot1Mins = pref != null && pref.EnableSlot1 ? pref.Slot1MinutesBefore : 1440; // 24h
            var slot2Mins = pref != null && pref.EnableSlot2 ? pref.Slot2MinutesBefore : 240;  // 4h
            var slot3Mins = pref != null && pref.EnableSlot3 ? pref.Slot3MinutesBefore : 30;   // 30m

            var slots = new[]
            {
                (Index: 1, Minutes: slot1Mins, Label: FormatMinutes(slot1Mins)),
                (Index: 2, Minutes: slot2Mins, Label: FormatMinutes(slot2Mins)),
                (Index: 3, Minutes: slot3Mins, Label: FormatMinutes(slot3Mins))
            };

            var allowInApp = pref?.EnableInApp ?? true;
            var allowEmail = pref?.EnableEmail ?? true;
            var allowWhatsApp = pref?.EnableWhatsApp ?? true;

            var userEmail = userContact?.Email;
            var userPhone = pref?.PreferredContactPhone ?? userContact?.PhoneNumber;
            var userName = userContact?.FullName ?? shift.AssignedUserName ?? "Staff Member";
            var siteName = shift.ClientSite?.SiteName ?? shift.PostName;
            var venueLocation = shift.Address ?? shift.FacilityName ?? shift.ClientSite?.Address ?? siteName;

            foreach (var slot in slots)
            {
                if (slot.Minutes <= 0) continue;

                var reminderTriggerTime = shift.StartsAtUtc.AddMinutes(-slot.Minutes);

                // Check if we are inside the reminder window (within trigger time and before shift start)
                if (nowUtc >= reminderTriggerTime && nowUtc < shift.StartsAtUtc)
                {
                    var slotMetaMatch = $"\"shiftId\":\"{shift.Id}\",\"slot\":{slot.Index}";

                    // Check idempotency: make sure this specific slot reminder was not already queued
                    var alreadyQueued = await db.BcpMessagePools
                        .AnyAsync(m => m.MetadataJson != null && m.MetadataJson.Contains(slotMetaMatch), ct);

                    if (alreadyQueued) continue;

                    var metaJson = $"{{\"shiftId\":\"{shift.Id}\",\"slot\":{slot.Index}}}";
                    var timeStr = shift.StartsAtUtc.ToString("ddd, dd MMM HH:mm");

                    // 1. In-App Notification
                    if (allowInApp)
                    {
                        newMessages.Add(new BcpMessagePool
                        {
                            Id = Guid.CreateVersion7(),
                            Channel = BcpMessageChannel.InAppNotification,
                            Status = BcpQueueStatus.Queued,
                            Priority = BcpMessagePriority.High,
                            Category = BcpMessageCategory.General,
                            Severity = NotificationSeverity.Update,
                            RelatedUserId = userId,
                            RecipientAddress = userId,
                            RecipientName = userName,
                            Subject = $"Upcoming Shift in {slot.Label}: {siteName}",
                            Content = $"Duty Reminder: Your scheduled shift at {siteName} begins in {slot.Label} ({timeStr}). Venue: {venueLocation}.",
                            ActionUrl = "/workforce/my-shifts",
                            Icon = "alarm",
                            MetadataJson = metaJson,
                            CreatedAt = nowUtc
                        });
                    }

                    // 2. Transactional Email
                    if (allowEmail && !string.IsNullOrWhiteSpace(userEmail))
                    {
                        var emailBody = $@"
                            <div style=""font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b;"">
                                <h2 style=""color: #0050e5; margin-bottom: 8px;"">Duty Departure Reminder</h2>
                                <p style=""font-size: 15px;"">Hello <strong>{userName}</strong>,</p>
                                <p style=""font-size: 14px; line-height: 1.5;"">
                                    This is a departure reminder that your scheduled duty at <strong>{siteName}</strong> commences in <strong>{slot.Label}</strong>.
                                </p>
                                <div style=""background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;"">
                                    <p style=""margin: 4px 0;""><strong>Shift Code:</strong> {shift.ShiftCode}</p>
                                    <p style=""margin: 4px 0;""><strong>Time:</strong> {timeStr} - {shift.EndsAtUtc:HH:mm}</p>
                                    <p style=""margin: 4px 0;""><strong>Post / Station:</strong> {shift.PostName}</p>
                                    <p style=""margin: 4px 0;""><strong>Venue Location:</strong> {venueLocation}</p>
                                </div>
                                <p style=""font-size: 13px; color: #64748b;"">Please ensure you arrive on time and verify geofence clock-in via your staff dashboard.</p>
                            </div>";

                        newMessages.Add(new BcpMessagePool
                        {
                            Id = Guid.CreateVersion7(),
                            Channel = BcpMessageChannel.Email,
                            Status = BcpQueueStatus.Queued,
                            Priority = BcpMessagePriority.High,
                            Category = BcpMessageCategory.General,
                            Severity = NotificationSeverity.Update,
                            RelatedUserId = userId,
                            RecipientAddress = userEmail,
                            RecipientName = userName,
                            Subject = $"Duty Reminder: Shift at {siteName} in {slot.Label}",
                            Content = emailBody,
                            PlainTextFallback = $"Duty Reminder: Your scheduled shift at {siteName} begins in {slot.Label} ({timeStr}). Venue: {venueLocation}.",
                            ActionUrl = "/workforce/my-shifts",
                            MetadataJson = metaJson,
                            CreatedAt = nowUtc
                        });
                    }

                    // 3. WhatsApp Message
                    if (allowWhatsApp && !string.IsNullOrWhiteSpace(userPhone))
                    {
                        var whatsAppText = $"*⏰ Duty Reminder ({slot.Label})*\n\n" +
                                           $"Hello *{userName}*, your scheduled shift at *{siteName}* starts in {slot.Label}.\n" +
                                           $"📅 *Time:* {timeStr} - {shift.EndsAtUtc:HH:mm}\n" +
                                           $"📍 *Venue:* {venueLocation}\n" +
                                           $"🔗 *Check Schedule:* https://ozikol.cloud/workforce/my-shifts";

                        newMessages.Add(new BcpMessagePool
                        {
                            Id = Guid.CreateVersion7(),
                            Channel = BcpMessageChannel.WhatsApp,
                            Status = BcpQueueStatus.Queued,
                            Priority = BcpMessagePriority.High,
                            Category = BcpMessageCategory.General,
                            Severity = NotificationSeverity.Update,
                            RelatedUserId = userId,
                            RecipientAddress = userPhone,
                            RecipientName = userName,
                            Subject = $"WhatsApp Reminder: {siteName}",
                            Content = whatsAppText,
                            MetadataJson = metaJson,
                            CreatedAt = nowUtc
                        });
                    }
                }
            }
        }

        if (newMessages.Count > 0)
        {
            db.BcpMessagePools.AddRange(newMessages);
            await db.SaveChangesAsync(ct);
            _logger.LogInformation("📢 [ShiftDepartureReminderWorker] Queued {Count} reminder messages for tenant '{TenantKey}'.", newMessages.Count, tenantKey);
        }
    }

    private static string FormatMinutes(int minutes)
    {
        if (minutes >= 1440) return $"{minutes / 1440} day{(minutes >= 2880 ? "s" : "")}";
        if (minutes >= 60) return $"{minutes / 60} hour{(minutes >= 120 ? "s" : "")}";
        return $"{minutes} mins";
    }
}
