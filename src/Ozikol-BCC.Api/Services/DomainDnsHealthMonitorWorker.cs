using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Ozikol.MasterPersistence.EF.MasterSQL;
using Ozikol_BCC.Infrastructure.Services.Email;

namespace Ozikol_BCC.Api.Services;

/// <summary>
/// Autonomous 24/7 background worker that periodically inspects live public DNS health for all active
/// custom domains configured across tenant organizations.
/// <para>
/// Runs every 3 hours independently of user login activity. If any email authentication record
/// (MX, SPF, DKIM, DMARC) fails live verification or is removed/corrupted at the registrar,
/// it immediately dispatches an urgent action email to the registered root account administrator.
/// When DNS records are restored, it automatically sends a resolution confirmation.
/// </para>
/// </summary>
public sealed class DomainDnsHealthMonitorWorker : BackgroundService
{
    /// <summary>
    /// Periodic health check interval (3 hours).
    /// </summary>
    private static readonly TimeSpan CheckInterval = TimeSpan.FromHours(3);

    /// <summary>
    /// Initial warmup delay after application startup before the first DNS probe cycle begins.
    /// </summary>
    private static readonly TimeSpan StartupWarmupDelay = TimeSpan.FromMinutes(2);

    /// <summary>
    /// Throttle threshold for recurring failure reminders (24 hours) to prevent inbox flooding while an issue persists.
    /// </summary>
    private static readonly TimeSpan ReminderThrottle = TimeSpan.FromHours(24);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<DomainDnsHealthMonitorWorker> _logger;

    /// <summary>
    /// In-memory health cache tracking DNS state per normalized domain name.
    /// </summary>
    private readonly ConcurrentDictionary<string, DomainHealthState> _domainStateCache = new(StringComparer.OrdinalIgnoreCase);

    /// <summary>
    /// Initializes a new instance of the <see cref="DomainDnsHealthMonitorWorker"/> class.
    /// </summary>
    /// <param name="scopeFactory">Service scope factory for resolving scoped dependencies.</param>
    /// <param name="logger">Structured logger instance.</param>
    public DomainDnsHealthMonitorWorker(
        IServiceScopeFactory scopeFactory,
        ILogger<DomainDnsHealthMonitorWorker> logger)
    {
        _scopeFactory = scopeFactory ?? throw new ArgumentNullException(nameof(scopeFactory));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <inheritdoc />
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("🛡️ [DomainDnsHealthMonitorWorker] Autonomous 24/7 DNS Guardian started with 3-hour check interval.");

        try
        {
            // Initial warmup delay to allow API and database migrations to complete startup smoothly
            await Task.Delay(StartupWarmupDelay, stoppingToken);
        }
        catch (OperationCanceledException)
        {
            return;
        }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ExecuteDnsHealthScanAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ [DomainDnsHealthMonitorWorker] Unexpected error during DNS health scan cycle.");
            }

            try
            {
                await Task.Delay(CheckInterval, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
        }

        _logger.LogInformation("🛑 [DomainDnsHealthMonitorWorker] 24/7 DNS Guardian stopped.");
    }

    /// <summary>
    /// Queries the Master Catalog for all active custom domains, executes public DNS verification,
    /// and triggers email alerts to root administrators if anomalies or resolution transitions occur.
    /// </summary>
    /// <param name="cancellationToken">Cancellation token.</param>
    private async Task ExecuteDnsHealthScanAsync(CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var masterDb = scope.ServiceProvider.GetRequiredService<MasterCatalogDbContext>();
        var domainEmailService = scope.ServiceProvider.GetRequiredService<IDomainEmailProvisioningService>();

        // Query active, non-deleted tenants with custom domains configured
        var tenants = await masterDb.MasterTenantCatalogs
            .AsNoTracking()
            .Where(t => !t.IsDeleted && !t.IsSuspended && !string.IsNullOrWhiteSpace(t.CustomDomain) && !string.IsNullOrWhiteSpace(t.AdminEmail))
            .Select(t => new
            {
                t.TenantKey,
                t.OrganizationName,
                CustomDomain = t.CustomDomain!,
                AdminEmail = t.AdminEmail!
            })
            .ToListAsync(cancellationToken);

        if (tenants.Count == 0)
        {
            _logger.LogDebug("[DomainDnsHealthMonitorWorker] No custom domains found to monitor during this cycle.");
            return;
        }

        _logger.LogInformation("🔍 [DomainDnsHealthMonitorWorker] Running DNS health inspection across {Count} custom domains...", tenants.Count);

        foreach (var tenant in tenants)
        {
            if (cancellationToken.IsCancellationRequested) break;

            var cleanDomain = tenant.CustomDomain.Trim().ToLowerInvariant();
            var adminEmail = tenant.AdminEmail.Trim();

            try
            {
                // Probe all 4 critical email DNS records in parallel
                var mxTask = domainEmailService.VerifyDnsRecordAsync(cleanDomain, "MX", cancellationToken);
                var spfTask = domainEmailService.VerifyDnsRecordAsync(cleanDomain, "SPF", cancellationToken);
                var dkimTask = domainEmailService.VerifyDnsRecordAsync(cleanDomain, "DKIM", cancellationToken);
                var dmarcTask = domainEmailService.VerifyDnsRecordAsync(cleanDomain, "DMARC", cancellationToken);

                await Task.WhenAll(mxTask, spfTask, dkimTask, dmarcTask);

                var failures = new List<EmailDnsVerificationResult>();
                if (!mxTask.Result.IsVerified) failures.Add(mxTask.Result);
                if (!spfTask.Result.IsVerified) failures.Add(spfTask.Result);
                if (!dkimTask.Result.IsVerified) failures.Add(dkimTask.Result);
                if (!dmarcTask.Result.IsVerified) failures.Add(dmarcTask.Result);

                var state = _domainStateCache.GetOrAdd(cleanDomain, _ => new DomainHealthState { IsFirstRun = true });

                if (failures.Count > 0)
                {
                    // Case 1: Transition from Healthy -> Failing, or recurring reminder after 24h
                    var shouldAlert = state.WasHealthy
                        || state.IsFirstRun
                        || state.LastAlertUtc == null
                        || (DateTime.UtcNow - state.LastAlertUtc.Value) >= ReminderThrottle;

                    if (shouldAlert)
                    {
                        var failureSummary = string.Join(", ", failures.Select(f => f.SubType ?? f.RecordType));
                        _logger.LogWarning("⚠️ [DomainDnsHealthMonitorWorker] Domain '{Domain}' ({Tenant}) has {Count} failing DNS record(s): {Failures}. Sending urgent alert to {Email}.",
                            cleanDomain, tenant.OrganizationName, failures.Count, failureSummary, adminEmail);

                        var (sent, msg) = await domainEmailService.SendDnsAlertEmailAsync(
                            cleanDomain,
                            adminEmail,
                            tenant.OrganizationName,
                            failures,
                            isResolved: false,
                            cancellationToken);

                        if (sent)
                        {
                            state.LastAlertUtc = DateTime.UtcNow;
                        }
                        else
                        {
                            _logger.LogWarning("⚠️ [DomainDnsHealthMonitorWorker] Failed to deliver DNS alert email to {Email}: {Message}", adminEmail, msg);
                        }
                    }

                    state.WasHealthy = false;
                    state.IsFirstRun = false;
                }
                else
                {
                    // Case 2: Transition from Failing -> Healthy (Resolved!)
                    if (!state.WasHealthy && !state.IsFirstRun)
                    {
                        _logger.LogInformation("✅ [DomainDnsHealthMonitorWorker] Domain '{Domain}' ({Tenant}) DNS records have been restored. Sending resolution confirmation to {Email}.",
                            cleanDomain, tenant.OrganizationName, adminEmail);

                        await domainEmailService.SendDnsAlertEmailAsync(
                            cleanDomain,
                            adminEmail,
                            tenant.OrganizationName,
                            failures,
                            isResolved: true,
                            cancellationToken);
                    }

                    state.WasHealthy = true;
                    state.IsFirstRun = false;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "⚠️ [DomainDnsHealthMonitorWorker] Failed to verify DNS for domain '{Domain}'.", cleanDomain);
            }
        }

        _logger.LogInformation("🏁 [DomainDnsHealthMonitorWorker] Completed DNS health cycle. Next scheduled run in {Hours} hours.", CheckInterval.TotalHours);
    }

    /// <summary>
    /// Internal snapshot capturing the health state and notification history for a monitored custom domain.
    /// </summary>
    private sealed class DomainHealthState
    {
        /// <summary>
        /// Gets or sets a value indicating whether all DNS records were healthy during the previous probe cycle.
        /// Defaults to true so that an initial failing state properly triggers the alert.
        /// </summary>
        public bool WasHealthy { get; set; } = true;

        /// <summary>
        /// Gets or sets a value indicating whether this is the first observation cycle for the domain.
        /// </summary>
        public bool IsFirstRun { get; set; } = true;

        /// <summary>
        /// UTC timestamp of the last dispatched failure alert email.
        /// </summary>
        public DateTime? LastAlertUtc { get; set; }
    }
}
