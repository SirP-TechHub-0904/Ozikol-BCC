using System;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;
using Ozikol_BCC.Infrastructure.Services.Email;

namespace Ozikol_BCC.Worker.Workers;

/// <summary>
/// Autonomous background worker that continuously monitors the central <c>MasterMessagePools</c> outbox in MasterCatalogDbContext
/// and securely transmits queued transactional and marketing emails exclusively through Mailcow SMTP (<c>mail.ozikol.cloud</c>).
/// Dispatches emails globally across all tenants with ZERO tenant database access.
/// </summary>
public sealed class MailcowWorker : BackgroundService
{
    private static readonly TimeSpan PollInterval = TimeSpan.FromSeconds(10);
    private const int BatchSize = 50;
    private const int MaxAllowedRetries = 5;

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<MailcowWorker> _logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="MailcowWorker"/> class.
    /// </summary>
    /// <param name="scopeFactory">Scope factory used to resolve MasterCatalogDbContext and SMTP services.</param>
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
        _logger.LogInformation("📬 [MailcowWorker] Started Central Master Outbox Mailcow Email Dispatcher with {Interval}s polling interval (Zero Tenant DB Access).", PollInterval.TotalSeconds);

        using var timer = new PeriodicTimer(PollInterval);
        do
        {
            try
            {
                await ProcessMasterOutboxAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ [MailcowWorker] Master outbox cycle error: {Message}", ex.Message);
            }
        }
        while (await WaitForNextTickAsync(timer, stoppingToken));
    }

    private static async Task<bool> WaitForNextTickAsync(PeriodicTimer timer, CancellationToken token)
    {
        try { return await timer.WaitForNextTickAsync(token); }
        catch (OperationCanceledException) { return false; }
    }

    private async Task ProcessMasterOutboxAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var masterDb = scope.ServiceProvider.GetRequiredService<MasterCatalogDbContext>();
        var smtpDispatcher = scope.ServiceProvider.GetRequiredService<ISmtpEmailDispatcher>();
        var now = DateTime.UtcNow;

        // 1. Stale Lease Recovery: Recover any emails stuck in Processing > 2 minutes back to Queued
        var staleCutoff = now.AddMinutes(-2);
        var staleItems = await masterDb.MasterMessagePools
            .Where(m => m.Channel == "Email"
                     && m.Provider == "Mailcow"
                     && m.Status == "Processing"
                     && m.CreatedAt <= staleCutoff)
            .OrderBy(m => m.CreatedAt)
            .Take(BatchSize)
            .ToListAsync(ct);

        if (staleItems.Count > 0)
        {
            _logger.LogWarning("⚠️ [MailcowWorker] Recovering {Count} stale Processing Mailcow email(s) in Master outbox back to Queued.", staleItems.Count);
            foreach (var stale in staleItems)
            {
                stale.Retries++;
                stale.Status = (stale.Retries >= MaxAllowedRetries || stale.Retries >= stale.MaxRetries) ? "Failed" : "Queued";
                if (stale.Status == "Failed" && string.IsNullOrWhiteSpace(stale.LastError))
                {
                    stale.LastError = "Exceeded delivery retry limit while in Processing state (stale worker lease).";
                }
            }
            await masterDb.SaveChangesAsync(ct);
        }

        // 2. Fetch pending Mailcow emails strictly matching Provider == Mailcow and Status == Queued
        var pendingItems = await masterDb.MasterMessagePools
            .Where(m => m.Channel == "Email"
                     && m.Provider == "Mailcow"
                     && m.Status == "Queued"
                     && m.Retries < MaxAllowedRetries
                     && (m.ScheduledAt == null || m.ScheduledAt <= now))
            .OrderByDescending(m => m.Priority)
            .ThenBy(m => m.CreatedAt)
            .Take(BatchSize)
            .ToListAsync(ct);

        if (pendingItems.Count == 0)
        {
            return;
        }

        _logger.LogInformation("📨 [MailcowWorker] Processing {Count} queued Mailcow email(s) from Central Master Outbox.", pendingItems.Count);

        // Claim batch as Processing before outbound SMTP calls so overlapping ticks do not double-send
        foreach (var item in pendingItems)
        {
            item.Status = "Processing";
        }
        await masterDb.SaveChangesAsync(ct);

        foreach (var item in pendingItems)
        {
            if (ct.IsCancellationRequested) break;

            try
            {
                bool delivered = await DeliverEmailAsync(item, smtpDispatcher, ct);

                if (delivered)
                {
                    item.Status = "Sent";
                    item.SentAt = DateTime.UtcNow;
                    item.LastError = null;
                    _logger.LogInformation("✅ [MailcowWorker] Successfully dispatched email #{Id} to {Recipient} (Tenant: '{TenantKey}')",
                        item.Id, item.RecipientAddress, item.TenantKey);
                }
                else
                {
                    MarkFailedAttempt(item, "Mailcow SMTP transmission returned unconfirmed delivery.");
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "❌ [MailcowWorker] Delivery failed for email #{Id} ({Recipient}): {Msg}",
                    item.Id, item.RecipientAddress, ex.Message);
                MarkFailedAttempt(item, ex.Message);
            }

            await masterDb.SaveChangesAsync(ct);
        }
    }

    private static async Task<bool> DeliverEmailAsync(
        MasterMessagePool item,
        ISmtpEmailDispatcher smtpDispatcher,
        CancellationToken ct)
    {
        var (metaFromEmail, metaFromName) = ExtractEmailMetadata(item.MetadataJson);

        var fromEmail = !string.IsNullOrWhiteSpace(item.SenderOrTemplateName)
            ? item.SenderOrTemplateName.Trim()
            : (!string.IsNullOrWhiteSpace(metaFromEmail)
                ? metaFromEmail
                : $"noreply@{item.TenantKey.Trim().ToLowerInvariant()}.ozikol.cloud");

        var fromName = !string.IsNullOrWhiteSpace(metaFromName)
            ? metaFromName
            : (!string.IsNullOrWhiteSpace(item.OrganizationName) ? item.OrganizationName.Trim() : "Ozikol BCC");

        return await smtpDispatcher.SendEmailAsync(
            toEmail: item.RecipientAddress,
            subject: item.Subject ?? "Notification",
            htmlBody: item.Content,
            fromEmail: fromEmail,
            fromName: fromName,
            replyTo: null,
            isCentralPlatformEmail: false,
            tenantName: fromName,
            tenantAdminEmail: null,
            cancellationToken: ct,
            strictDeliveryCheck: true);
    }

    private static void MarkFailedAttempt(MasterMessagePool item, string error)
    {
        item.Retries++;
        item.LastError = error.Length > 3800 ? error.Substring(0, 3800) : error;

        if (item.Retries >= MaxAllowedRetries || item.Retries >= item.MaxRetries)
        {
            item.Status = "Failed";
        }
        else
        {
            item.Status = "Queued";
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
