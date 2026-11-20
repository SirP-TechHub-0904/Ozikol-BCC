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
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Infrastructure.Services.Email;
using Ozikol_BCC.Infrastructure.TenantSupport;
using Ozikol_BCC.Persistence.EF.SQL;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Worker.Workers;

/// <summary>
/// Dedicated background worker that continuously monitors <c>BcpMessagePools</c> across all active tenant databases
/// and securely transmits queued transactional and marketing emails exclusively through Mailcow SMTP (<c>mail.ozikol.cloud</c>).
/// Automatically recovers stale leases and retries failed attempts up to 5 times before marking permanent failure.
/// </summary>
public sealed class MailcowWorker : BackgroundService
{
    private static readonly TimeSpan PollInterval = TimeSpan.FromSeconds(10);
    private const int BatchSizePerTenant = 25;
    private const int MaxAllowedRetries = 5;

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<MailcowWorker> _logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="MailcowWorker"/> class.
    /// </summary>
    /// <param name="scopeFactory">Scope factory used to resolve master and tenant-scoped services.</param>
    /// <param name="logger">Structured logger instance.</param>
    public MailcowWorker(
        IServiceScopeFactory scopeFactory,
        ILogger<MailcowWorker> logger)
    {
        _scopeFactory = scopeFactory ?? throw new ArgumentNullException(nameof(scopeFactory));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <inheritdoc />
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("📬 [MailcowWorker] Started Mailcow Email Dispatcher with {Interval}s polling interval.", PollInterval.TotalSeconds);

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
                _logger.LogError(ex, "❌ [MailcowWorker] Cycle error: {Message}", ex.Message);
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
                _logger.LogWarning(ex, "⚠️ [MailcowWorker] Failed processing tenant '{TenantKey}': {Message}", tenantKey, ex.Message);
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

        // 1. Stale Lease Recovery: Recover any Mailcow emails stuck in Processing > 2 minutes back to Queued (if under retry cap)
        var staleCutoff = now.AddMinutes(-2);
        var staleItems = await db.BcpMessagePools
            .Where(m => m.Channel == BcpMessageChannel.Email
                     && m.Provider == BcpMessageProvider.Mailcow
                     && m.Status == BcpQueueStatus.Processing
                     && m.CreatedAt <= staleCutoff)
            .Take(BatchSizePerTenant)
            .ToListAsync(ct);

        if (staleItems.Count > 0)
        {
            _logger.LogWarning("⚠️ [MailcowWorker] Recovering {Count} stale Processing Mailcow email(s) for tenant '{TenantKey}' back to Queued.",
                staleItems.Count, tenantKey);
            foreach (var stale in staleItems)
            {
                stale.Retries++;
                stale.Status = (stale.Retries >= MaxAllowedRetries || stale.Retries >= stale.MaxRetries) ? BcpQueueStatus.Failed : BcpQueueStatus.Queued;
                if (stale.Status == BcpQueueStatus.Failed && string.IsNullOrWhiteSpace(stale.LastError))
                {
                    stale.LastError = "Exceeded delivery retry limit while in Processing state (stale worker lease).";
                }
            }
            await db.SaveChangesAsync(ct);
        }

        // 2. Fetch pending Mailcow emails strictly matching Provider == Mailcow and Status == Queued
        var pendingItems = await db.BcpMessagePools
            .Where(m => m.Channel == BcpMessageChannel.Email
                     && m.Provider == BcpMessageProvider.Mailcow
                     && m.Status == BcpQueueStatus.Queued
                     && m.Retries < MaxAllowedRetries
                     && (m.ScheduledAt == null || m.ScheduledAt <= now))
            .OrderByDescending(m => m.Priority)
            .ThenBy(m => m.CreatedAt)
            .Take(BatchSizePerTenant)
            .ToListAsync(ct);

        if (pendingItems.Count == 0)
        {
            return;
        }

        _logger.LogInformation("📨 [MailcowWorker] Processing {Count} queued Mailcow email(s) for tenant '{TenantKey}'.", pendingItems.Count, tenantKey);

        // Claim batch as Processing before outbound SMTP calls so overlapping ticks do not double-send
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

        // Safely resolve Mailcow SMTP dispatcher
        ISmtpEmailDispatcher? smtpDispatcher = null;
        try { smtpDispatcher = tenantScopeRoot.ServiceProvider.GetService<ISmtpEmailDispatcher>(); }
        catch (Exception ex) { _logger.LogWarning(ex, "⚠️ [MailcowWorker] Could not resolve ISmtpEmailDispatcher: {Msg}", ex.Message); }

        foreach (var item in pendingItems)
        {
            if (ct.IsCancellationRequested) break;

            try
            {
                bool delivered = await DeliverEmailAsync(item, tenantKey, tenantBrand, siteConfig, smtpDispatcher, ct);

                if (delivered)
                {
                    item.Status = BcpQueueStatus.Sent;
                    item.SentAt = DateTime.UtcNow;
                    item.LastError = null;
                }
                else
                {
                    MarkFailedAttempt(item, "Mailcow SMTP transmission returned unconfirmed delivery.");
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "❌ [MailcowWorker] Delivery failed for Mailcow email #{Id} ({Recipient}): {Msg}",
                    item.Id, item.RecipientAddress, ex.Message);
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
        CancellationToken ct)
    {
        if (smtpDispatcher == null)
        {
            throw new InvalidOperationException("ISmtpEmailDispatcher is not registered or configured in the worker.");
        }

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

    private static void MarkFailedAttempt(BcpMessagePool item, string error)
    {
        item.Retries++;
        item.LastError = error.Length > 3800 ? error.Substring(0, 3800) : error;

        // When max retries (5) reached, mark as permanently Failed so worker never calls it again
        if (item.Retries >= MaxAllowedRetries || item.Retries >= item.MaxRetries)
        {
            item.Status = BcpQueueStatus.Failed;
        }
        else
        {
            item.Status = BcpQueueStatus.Queued;
        }
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
