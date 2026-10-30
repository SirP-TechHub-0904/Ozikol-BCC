using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Ozikol.MasterPersistence.EF.MasterSQL;
using Ozikol_BCC.Api.Models;
using Ozikol_BCC.Application.Hubs;

namespace Ozikol_BCC.Api.Services
{
    /// <summary>
    /// Watches the master catalog for subscription, invoice, and catalog changes and pushes them to tenants over
    /// the notification WebSocket (<c>/hubs/notifications</c>) within seconds.
    /// <para>
    /// Changes made in the central portal (activations, suspensions, expiry edits, paid invoices) happen in a
    /// different process, so this worker detects them by fingerprinting each tenant's billing state and, when a
    /// fingerprint changes, rebroadcasts the snapshot (<c>BillingUpdated</c>). Renewal thresholds crossed
    /// (14 days, 3 days, expired) additionally raise <c>FeatureExpiryAlert</c>. The expiry bucket is part of the
    /// fingerprint, so purely time-driven transitions are pushed as well.
    /// </para>
    /// </summary>
    public class BillingRealtimeWorker : BackgroundService
    {
        /// <summary>Socket event raised when a feature crosses a renewal threshold.</summary>
        public const string FeatureExpiryAlertEvent = "FeatureExpiryAlert";

        private static readonly TimeSpan PollInterval = TimeSpan.FromSeconds(3);

        private readonly IServiceScopeFactory _scopeFactory;
        private readonly IHubContext<NotificationHub> _hub;
        private readonly ILogger<BillingRealtimeWorker> _logger;

        // Last published fingerprint per tenant key
        private readonly Dictionary<string, string> _fingerprints = new();
        // Last observed severity per "tenantKey|subscriptionId"
        private readonly Dictionary<string, string> _severities = new();
        private string? _catalogFingerprint;
        private bool _primed;

        /// <summary>
        /// Initializes a new instance of <see cref="BillingRealtimeWorker"/>.
        /// </summary>
        /// <param name="scopeFactory">Scope factory used to resolve scoped database and snapshot services.</param>
        /// <param name="hub">Notification hub context used for socket broadcasts.</param>
        /// <param name="logger">Structured logger.</param>
        public BillingRealtimeWorker(IServiceScopeFactory scopeFactory, IHubContext<NotificationHub> hub, ILogger<BillingRealtimeWorker> logger)
        {
            _scopeFactory = scopeFactory;
            _hub = hub;
            _logger = logger;
        }

        /// <inheritdoc />
        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            using var timer = new PeriodicTimer(PollInterval);
            do
            {
                try
                {
                    await TickAsync(stoppingToken);
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    break;
                }
                catch (Exception ex)
                {
                    // A failed poll must never stop the worker; the next tick retries
                    _logger.LogWarning(ex, "Billing real-time poll failed.");
                }
            }
            while (await WaitAsync(timer, stoppingToken));
        }

        /// <summary>
        /// Waits for the next timer tick, returning false when the host is stopping.
        /// </summary>
        private static async Task<bool> WaitAsync(PeriodicTimer timer, CancellationToken token)
        {
            try { return await timer.WaitForNextTickAsync(token); }
            catch (OperationCanceledException) { return false; }
        }

        /// <summary>
        /// Executes one detection pass: fingerprint every tenant, publish changed tenants, and raise threshold alerts.
        /// </summary>
        private async Task TickAsync(CancellationToken ct)
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<MasterCatalogDbContext>();
            var snapshots = scope.ServiceProvider.GetRequiredService<IBillingSnapshotService>();

            var now = DateTime.UtcNow;

            List<(Guid Id, string TenantKey, bool UseCustomPricing, bool UseCustomAvailability)> tenants;
            try
            {
                var rawTenants = await db.MasterTenantCatalogs.AsNoTracking()
                    .Select(t => new { t.Id, t.TenantKey, t.UseCustomPricing, t.UseCustomAvailability })
                    .ToListAsync(ct);
                tenants = rawTenants.Select(t => (t.Id, t.TenantKey, t.UseCustomPricing, t.UseCustomAvailability)).ToList();
            }
            catch
            {
                var fallbackTenants = await db.MasterTenantCatalogs.AsNoTracking()
                    .Select(t => new { t.Id, t.TenantKey })
                    .ToListAsync(ct);
                tenants = fallbackTenants.Select(t => (t.Id, t.TenantKey, false, false)).ToList();
            }
            var keyById = tenants.ToDictionary(t => t.Id, t => t.TenantKey.ToLowerInvariant());

            List<(Guid Id, Guid MasterTenantCatalogId, DateTime ExpiresAtUtc, bool IsActive, string Status, bool AutoRenew, int DurationType, decimal? CustomPriceOverride, bool? IsAvailableForUseOverride, decimal RecurringPrice, bool IsCompulsory, string FeatureCode, string FeatureName)> subs;
            try
            {
                var rawSubs = await db.MasterTenantFeatureSubscriptions.AsNoTracking()
                    .Select(s => new
                    {
                        s.Id,
                        s.MasterTenantCatalogId,
                        s.ExpiresAtUtc,
                        s.IsActive,
                        s.Status,
                        s.AutoRenew,
                        DurationType = (int)s.DurationType,
                        s.CustomPriceOverride,
                        s.IsAvailableForUseOverride,
                        s.RecurringPrice,
                        IsCompulsory = s.MasterFeatureCatalog.IsCompulsory,
                        FeatureCode = s.MasterFeatureCatalog.FeatureCode,
                        FeatureName = s.MasterFeatureCatalog.Name
                    })
                    .ToListAsync(ct);
                subs = rawSubs.Select(s => (s.Id, s.MasterTenantCatalogId, s.ExpiresAtUtc, s.IsActive, s.Status, s.AutoRenew, s.DurationType, s.CustomPriceOverride, s.IsAvailableForUseOverride, s.RecurringPrice, s.IsCompulsory, s.FeatureCode, s.FeatureName)).ToList();
            }
            catch
            {
                var fallbackSubs = await db.MasterTenantFeatureSubscriptions.AsNoTracking()
                    .Select(s => new
                    {
                        s.Id,
                        s.MasterTenantCatalogId,
                        s.ExpiresAtUtc,
                        s.IsActive,
                        s.Status,
                        s.AutoRenew,
                        DurationType = (int)s.DurationType,
                        s.CustomPriceOverride,
                        s.RecurringPrice,
                        IsCompulsory = s.MasterFeatureCatalog.IsCompulsory,
                        FeatureCode = s.MasterFeatureCatalog.FeatureCode,
                        FeatureName = s.MasterFeatureCatalog.Name
                    })
                    .ToListAsync(ct);
                subs = fallbackSubs.Select(s => (s.Id, s.MasterTenantCatalogId, s.ExpiresAtUtc, s.IsActive, s.Status, s.AutoRenew, s.DurationType, s.CustomPriceOverride, (bool?)null, s.RecurringPrice, s.IsCompulsory, s.FeatureCode, s.FeatureName)).ToList();
            }

            // Only fingerprint Completed (paid) invoices so creating or editing Pending invoices
            // (e.g. preparing an invoice, changing duration, or initializing checkout) never triggers a false "Catalog Synchronized" menu toast.
            var invoices = await db.MasterBillingTransactions.AsNoTracking()
                .Where(x => x.Status == "Completed")
                .GroupBy(t => t.MasterTenantCatalogId)
                .Select(g => new
                {
                    TenantId = g.Key,
                    Completed = g.Count(),
                    LastCompleted = g.Max(x => x.UpdatedUtc ?? x.CreatedUtc)
                })
                .ToListAsync(ct);

            // Catalog-wide fingerprint: an availability, activation, price, or suite change affects every tenant
            var catalogSb = new StringBuilder();
            try
            {
                var catalog = await db.MasterFeatureCatalogs.AsNoTracking()
                    .OrderBy(f => f.Id)
                    .Select(f => new
                    {
                        f.Id,
                        f.Name,
                        f.Category,
                        f.IsActive,
                        f.IsPublished,
                        f.IsAvailableForUse,
                        f.IsCompulsory,
                        f.IsInBeta,
                        f.MonthlyPrice,
                        f.QuarterlyPrice,
                        f.YearlyPrice,
                        f.SortOrder
                    })
                    .ToListAsync(ct);

                foreach (var f in catalog)
                {
                    catalogSb.Append(f.Id).Append('|').Append(f.Name).Append('|').Append(f.Category).Append('|')
                             .Append(f.IsActive).Append('|').Append(f.IsPublished).Append('|').Append(f.IsAvailableForUse).Append('|')
                             .Append(f.IsCompulsory).Append('|').Append(f.IsInBeta).Append('|').Append(f.MonthlyPrice).Append('|')
                             .Append(f.QuarterlyPrice).Append('|').Append(f.YearlyPrice).Append('|').Append(f.SortOrder).Append(';');
                }
            }
            catch
            {
                var catalogFallback = await db.MasterFeatureCatalogs.AsNoTracking()
                    .OrderBy(f => f.Id)
                    .Select(f => new { f.Id, f.Name, f.Category, f.IsActive, f.IsCompulsory, f.MonthlyPrice, f.QuarterlyPrice, f.YearlyPrice, f.SortOrder })
                    .ToListAsync(ct);

                foreach (var f in catalogFallback)
                {
                    catalogSb.Append(f.Id).Append('|').Append(f.Name).Append('|').Append(f.Category).Append('|')
                             .Append(f.IsActive).Append('|').Append(f.IsCompulsory).Append('|').Append(f.MonthlyPrice).Append('|')
                             .Append(f.QuarterlyPrice).Append('|').Append(f.YearlyPrice).Append('|').Append(f.SortOrder).Append(';');
                }
            }

            var catalogFingerprint = catalogSb.ToString();
            var catalogChanged = _catalogFingerprint != null && _catalogFingerprint != catalogFingerprint;
            _catalogFingerprint = catalogFingerprint;

            var builders = tenants.ToDictionary(
                t => t.TenantKey.ToLowerInvariant(),
                t => new StringBuilder().Append("policy|").Append(t.UseCustomPricing).Append('|').Append(t.UseCustomAvailability).Append(';'));
            var alerts = new List<(string TenantKey, FeatureExpiryAlertDto Alert)>();

            foreach (var s in subs.OrderBy(s => s.Id))
            {
                if (!keyById.TryGetValue(s.MasterTenantCatalogId, out var key)) continue;

                var days = (int)Math.Ceiling((s.ExpiresAtUtc - now).TotalDays);
                var pending = string.Equals(s.Status, "Pending", StringComparison.OrdinalIgnoreCase);
                var severity = (!s.IsCompulsory && s.IsActive && !pending) ? BillingSnapshotService.SeverityFor(days) : "None";

                builders[key].Append(s.Id).Append('|').Append(s.ExpiresAtUtc.Ticks).Append('|').Append(s.IsActive).Append('|')
                             .Append(s.Status).Append('|').Append(s.AutoRenew).Append('|').Append(s.DurationType).Append('|')
                             .Append(s.CustomPriceOverride).Append('|').Append(s.IsAvailableForUseOverride).Append('|')
                             .Append(s.RecurringPrice).Append('|').Append(severity).Append(';');

                var severityKey = $"{key}|{s.Id}";
                _severities.TryGetValue(severityKey, out var previous);
                if (_primed && severity != "None" && (previous ?? "None") != severity)
                {
                    alerts.Add((key, new FeatureExpiryAlertDto
                    {
                        FeatureCode = s.FeatureCode,
                        FeatureName = s.FeatureName,
                        Severity = severity,
                        DaysRemaining = days,
                        ExpiresAtUtc = s.ExpiresAtUtc,
                        Message = BillingSnapshotService.MessageFor(s.FeatureName, days)
                    }));
                }
                _severities[severityKey] = severity;
            }

            foreach (var inv in invoices)
            {
                if (keyById.TryGetValue(inv.TenantId, out var key))
                    builders[key].Append("inv|").Append(inv.Completed).Append('|').Append(inv.LastCompleted.Ticks).Append(';');
            }

            var toPublish = new List<string>();
            foreach (var (key, sb) in builders)
            {
                var fingerprint = sb.ToString();
                var changed = !_fingerprints.TryGetValue(key, out var old) || old != fingerprint;
                _fingerprints[key] = fingerprint;
                if (_primed && (changed || catalogChanged)) toPublish.Add(key);
            }

            if (!_primed)
            {
                // First pass only records the baseline so a restart does not flood every tenant with updates
                _primed = true;
                return;
            }

            if (catalogChanged)
            {
                // Broadcast global catalog update so localhost and all connected workspace clients refresh immediately
                await snapshots.PublishAsync("workspace", ct);
            }

            foreach (var key in toPublish)
            {
                await snapshots.PublishAsync(key, ct);
            }

            foreach (var (key, alert) in alerts)
            {
                await _hub.Clients.Group($"tenant_{key}").SendAsync(FeatureExpiryAlertEvent, alert, ct);
            }

            if (toPublish.Count > 0 || alerts.Count > 0)
            {
                _logger.LogInformation("Billing real-time: published {Updates} update(s) and {Alerts} alert(s).", toPublish.Count, alerts.Count);
            }
        }
    }
}
