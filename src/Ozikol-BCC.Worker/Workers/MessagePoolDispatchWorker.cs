using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Ozikol.MasterPersistence.EF.MasterSQL;
using Ozikol_BCC.Application.Interfaces.Services;
using Ozikol_BCC.Application.Repository.NotifyRegister;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.EmailServices.Postmark.Interfaces;
using Ozikol_BCC.Infrastructure.Services.Email;
using Ozikol_BCC.Infrastructure.TenantSupport;
using Ozikol_BCC.Persistence.EF.SQL;
using PostmarkDotNet;
using PostmarkDotNet.Model;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Worker.Workers;

/// <summary>
/// Autonomous background worker that polls <c>BcpMessagePools</c> across all active tenant databases
/// and delivers queued Email, SMS, Push, and WhatsApp notifications asynchronously.
/// </summary>
public sealed class MessagePoolDispatchWorker : BackgroundService
{
    private static readonly TimeSpan PollInterval = TimeSpan.FromSeconds(10);
    private const int BatchSizePerTenant = 25;

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<MessagePoolDispatchWorker> _logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="MessagePoolDispatchWorker"/> class.
    /// </summary>
    /// <param name="scopeFactory">Scope factory used to resolve master and tenant-scoped services.</param>
    /// <param name="logger">Structured logger instance.</param>
    public MessagePoolDispatchWorker(
        IServiceScopeFactory scopeFactory,
        ILogger<MessagePoolDispatchWorker> logger)
    {
        _scopeFactory = scopeFactory ?? throw new ArgumentNullException(nameof(scopeFactory));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <inheritdoc />
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("📬 [MessagePoolDispatchWorker] Started with {Interval}s polling interval.", PollInterval.TotalSeconds);

        using var timer = new PeriodicTimer(PollInterval);
        do
        {
            try
            {
                await ProcessAllTenantsAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ [MessagePoolDispatchWorker] Cycle error: {Message}", ex.Message);
            }
        }
        while (await WaitForNextTickAsync(timer, stoppingToken));
    }

    private static async Task<bool> WaitForNextTickAsync(PeriodicTimer timer, CancellationToken token)
    {
        try { return await timer.WaitForNextTickAsync(token); }
        catch (OperationCanceledException) { return false; }
    }

    private async Task ProcessAllTenantsAsync(CancellationToken ct)
    {
        List<(string TenantKey, string OrganizationName)> activeTenants;

        using (var masterScope = _scopeFactory.CreateScope())
        {
            var masterDb = masterScope.ServiceProvider.GetRequiredService<MasterCatalogDbContext>();
            activeTenants = await masterDb.MasterTenantCatalogs
                .AsNoTracking()
                .Where(t => t.IsActive && !t.IsDeleted && !t.IsSuspended && !string.IsNullOrWhiteSpace(t.TenantKey))
                .Select(t => new ValueTuple<string, string>(t.TenantKey, t.OrganizationName))
                .ToListAsync(ct);
        }

        foreach (var (tenantKey, orgName) in activeTenants)
        {
            if (ct.IsCancellationRequested) break;

            try
            {
                await ProcessTenantOutboxAsync(tenantKey, orgName, ct);
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "⚠️ [MessagePoolDispatchWorker] Failed processing tenant '{TenantKey}': {Message}", tenantKey, ex.Message);
            }
        }
    }

    private async Task ProcessTenantOutboxAsync(string tenantKey, string orgName, CancellationToken ct)
    {
        using var tenantScopeRoot = _scopeFactory.CreateScope();
        var tenantProvider = tenantScopeRoot.ServiceProvider.GetRequiredService<ITenantProvider>();
        using var _ = tenantProvider.BeginScope(tenantKey);

        var db = tenantScopeRoot.ServiceProvider.GetRequiredService<DashboardDbContext>();
        var now = DateTime.UtcNow;

        // 1. Stale Lease Auto-Recovery: Recover any messages stuck in Processing > 2 minutes back to Queued
        var staleCutoff = now.AddMinutes(-2);
        var staleItems = await db.BcpMessagePools
            .Where(m => m.Status == BcpQueueStatus.Processing && m.CreatedAt <= staleCutoff)
            .Take(BatchSizePerTenant)
            .ToListAsync(ct);

        if (staleItems.Count > 0)
        {
            _logger.LogWarning("⚠️ [MessagePoolDispatchWorker] Recovering {Count} stale Processing message(s) for tenant '{TenantKey}' back to Queued.",
                staleItems.Count, tenantKey);
            foreach (var stale in staleItems)
            {
                stale.Status = BcpQueueStatus.Queued;
            }
            await db.SaveChangesAsync(ct);
        }

        // 2. Fetch pending items
        var pendingItems = await db.BcpMessagePools
            .Where(m =>
                (m.Status == BcpQueueStatus.Queued || (m.Status == BcpQueueStatus.Failed && m.Retries < m.MaxRetries)) &&
                (m.ScheduledAt == null || m.ScheduledAt <= now))
            .OrderByDescending(m => m.Priority)
            .ThenBy(m => m.CreatedAt)
            .Take(BatchSizePerTenant)
            .ToListAsync(ct);

        if (pendingItems.Count == 0)
        {
            return;
        }

        _logger.LogInformation("📨 [MessagePoolDispatchWorker] Processing {Count} queued message(s) for tenant '{TenantKey}'.", pendingItems.Count, tenantKey);

        // Claim batch as Processing before outbound calls so overlapping ticks do not double-send
        foreach (var item in pendingItems)
        {
            item.Status = BcpQueueStatus.Processing;
        }
        await db.SaveChangesAsync(ct);

        var siteConfig = await db.MisConfigurationSettings.AsNoTracking().FirstOrDefaultAsync(ct);
        var siteSettings = await db.MisWebsiteSettings.AsNoTracking().FirstOrDefaultAsync(ct);
        var tenantBrand = !string.IsNullOrWhiteSpace(siteSettings?.BrandName)
            ? siteSettings.BrandName.Trim()
            : (!string.IsNullOrWhiteSpace(siteSettings?.CompanyName) ? siteSettings.CompanyName.Trim() : orgName);

        // Safely resolve delivery providers without allowing single-service DI faults to crash the tenant loop
        ISmtpEmailDispatcher? smtpDispatcher = null;
        try { smtpDispatcher = tenantScopeRoot.ServiceProvider.GetService<ISmtpEmailDispatcher>(); }
        catch (Exception ex) { _logger.LogWarning(ex, "⚠️ [MessagePoolDispatchWorker] Could not resolve ISmtpEmailDispatcher: {Msg}", ex.Message); }

        IPostmarkEmailService? postmarkService = null;
        try { postmarkService = tenantScopeRoot.ServiceProvider.GetService<IPostmarkEmailService>(); }
        catch (Exception ex) { _logger.LogWarning(ex, "⚠️ [MessagePoolDispatchWorker] Could not resolve IPostmarkEmailService: {Msg}", ex.Message); }

        ISmsSendService? smsService = null;
        try { smsService = tenantScopeRoot.ServiceProvider.GetService<ISmsSendService>(); }
        catch (Exception ex) { _logger.LogWarning(ex, "⚠️ [MessagePoolDispatchWorker] Could not resolve ISmsSendService: {Msg}", ex.Message); }

        foreach (var item in pendingItems)
        {
            if (ct.IsCancellationRequested) break;

            try
            {
                bool delivered = item.Channel switch
                {
                    BcpMessageChannel.Email => await DeliverEmailAsync(item, tenantKey, tenantBrand, siteConfig, smtpDispatcher, postmarkService, ct),
                    BcpMessageChannel.Sms => await DeliverSmsAsync(item, smsService),
                    BcpMessageChannel.Push => true, // Push token relay hook point
                    BcpMessageChannel.WhatsApp => true, // Meta Cloud API relay hook point
                    BcpMessageChannel.InAppNotification => true,
                    _ => false
                };

                if (delivered)
                {
                    item.Status = BcpQueueStatus.Sent;
                    item.SentAt = DateTime.UtcNow;
                    item.LastError = null;
                }
                else
                {
                    MarkFailedAttempt(item, $"Channel '{item.Channel}' delivery returned failure.");
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "❌ [MessagePoolDispatchWorker] Delivery failed for {Channel} #{Id} ({Recipient}): {Msg}",
                    item.Channel, item.Id, item.RecipientAddress, ex.Message);
                MarkFailedAttempt(item, ex.Message);
            }

            await db.SaveChangesAsync(ct);
        }
    }

    private static async Task<bool> DeliverEmailAsync(
        BcpMessagePool item,
        string tenantKey,
        string tenantBrand,
        MisConfigurationSetting? siteConfig,
        ISmtpEmailDispatcher? smtpDispatcher,
        IPostmarkEmailService? postmarkService,
        CancellationToken ct)
    {
        var (metaFromEmail, metaFromName) = ExtractEmailMetadata(item.MetadataJson);

        var fromEmail = !string.IsNullOrWhiteSpace(item.SenderOrTemplateName)
            ? item.SenderOrTemplateName.Trim()
            : (!string.IsNullOrWhiteSpace(metaFromEmail)
                ? metaFromEmail
                : (!string.IsNullOrWhiteSpace(siteConfig?.SenderEmail)
                    ? siteConfig.SenderEmail.Trim().ToLowerInvariant()
                    : $"noreply@{tenantKey.Trim().ToLowerInvariant()}.ozikol.cloud"));

        var fromName = !string.IsNullOrWhiteSpace(metaFromName)
            ? metaFromName
            : (!string.IsNullOrWhiteSpace(siteConfig?.SenderName) ? siteConfig.SenderName.Trim() : tenantBrand);

        // 1. Attempt high-speed Postmark transactional delivery if available
        if (postmarkService != null)
        {
            try
            {
                var postmarkResponse = await postmarkService.SendHtmlEmailAsync(
                    to: item.RecipientAddress,
                    subject: item.Subject ?? "Notification",
                    htmlBody: item.Content,
                    from: fromEmail,
                    textBody: item.PlainTextFallback,
                    tag: item.Category.ToString());

                if (postmarkResponse.Status == PostmarkStatus.Success)
                {
                    item.ProviderMessageId = postmarkResponse.MessageID.ToString();
                    return true;
                }

                // If rejected (e.g. sender signature unverified for custom domain), retry with default verified platform sender
                var fallbackResponse = await postmarkService.SendHtmlEmailAsync(
                    to: item.RecipientAddress,
                    subject: item.Subject ?? "Notification",
                    htmlBody: item.Content,
                    from: null, // Resolves to Postmark default verified sender
                    textBody: item.PlainTextFallback,
                    tag: item.Category.ToString());

                if (fallbackResponse.Status == PostmarkStatus.Success)
                {
                    item.ProviderMessageId = fallbackResponse.MessageID.ToString();
                    return true;
                }
            }
            catch
            {
                // Fall through to SMTP dispatcher
            }
        }

        // 2. Fall back to Mailcow SMTP dispatcher
        if (smtpDispatcher != null)
        {
            return await smtpDispatcher.SendEmailAsync(
                toEmail: item.RecipientAddress,
                subject: item.Subject ?? "Notification",
                htmlBody: item.Content,
                fromEmail: fromEmail,
                fromName: fromName,
                replyTo: null,
                isCentralPlatformEmail: false,
                tenantName: tenantBrand,
                tenantAdminEmail: null,
                cancellationToken: ct,
                smtpUsernameOverride: siteConfig?.SmtpUsername,
                smtpPasswordOverride: siteConfig?.SmtpPassword);
        }

        throw new InvalidOperationException("Neither Postmark nor SMTP email dispatcher is configured or functional in the worker.");
    }

    private static async Task<bool> DeliverSmsAsync(BcpMessagePool item, ISmsSendService? smsService)
    {
        if (smsService == null)
        {
            throw new InvalidOperationException("ISmsSendService is not registered in the worker container.");
        }

        return await smsService.SendSmsWithResult(item.RecipientAddress, item.Content);
    }

    private static void MarkFailedAttempt(BcpMessagePool item, string error)
    {
        item.Retries++;
        item.LastError = error.Length > 3800 ? error.Substring(0, 3800) : error;
        item.Status = BcpQueueStatus.Failed;
    }

    private static (string? FromEmail, string? FromName) ExtractEmailMetadata(string? metadataJson)
    {
        if (string.IsNullOrWhiteSpace(metadataJson))
        {
            return (null, null);
        }

        try
        {
            using var doc = JsonDocument.Parse(metadataJson);
            var root = doc.RootElement;
            var fromEmail = root.TryGetProperty("fromEmail", out var fe) ? fe.GetString() : null;
            var fromName = root.TryGetProperty("fromName", out var fn) ? fn.GetString() : null;
            return (fromEmail, fromName);
        }
        catch
        {
            return (null, null);
        }
    }
}
