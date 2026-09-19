using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;
using Ozikol_BCC.EmailServices.Postmark.Interfaces;

namespace Ozikol.Central.Services.Jobs.Handlers
{
    /// <summary>
    /// Central Background Job Handler that identifies subscriptions expiring within 7 days or 3 days
    /// and dispatches proactive renewal reminder notices to tenant administrators.
    /// </summary>
    public class RenewalWarningJobHandler : IBackgroundJobHandler
    {
        private readonly MasterCatalogDbContext _masterCatalogDbContext;
        private readonly IPostmarkEmailService _emailService;
        private readonly ILogger<RenewalWarningJobHandler> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="RenewalWarningJobHandler"/> class.
        /// </summary>
        /// <param name="masterCatalogDbContext">Master Catalog database context.</param>
        /// <param name="emailService">Postmark email service for notifications.</param>
        /// <param name="logger">Structured logger instance.</param>
        public RenewalWarningJobHandler(
            MasterCatalogDbContext masterCatalogDbContext,
            IPostmarkEmailService emailService,
            ILogger<RenewalWarningJobHandler> logger)
        {
            _masterCatalogDbContext = masterCatalogDbContext;
            _emailService = emailService;
            _logger = logger;
        }

        /// <inheritdoc />
        public string JobKey => "central.renewal-warning";

        /// <inheritdoc />
        public string DisplayName => "Upcoming Renewal Notification Dispatcher";

        /// <inheritdoc />
        public string Category => "Billing & Subscriptions";

        /// <inheritdoc />
        public BackgroundJobScope Scope => BackgroundJobScope.Central;

        /// <inheritdoc />
        public string Description => "Dispatches proactive email warnings to tenant administrators for feature subscriptions expiring within 7 days and 3 days.";

        /// <inheritdoc />
        public int DefaultIntervalSeconds => 86400; // Run once daily

        /// <inheritdoc />
        public async Task<JobExecutionResult> ExecuteAsync(JobExecutionContext context, CancellationToken cancellationToken = default)
        {
            var logs = new List<string>();
            var now = DateTime.UtcNow;
            var sevenDaysThreshold = now.AddDays(7);

            logs.Add($"[{now:yyyy-MM-dd HH:mm:ss} UTC] 🔍 Scanning for active subscriptions expiring between {now:MMM dd} and {sevenDaysThreshold:MMM dd, yyyy}...");

            var expiringSubscriptions = await _masterCatalogDbContext.MasterTenantFeatureSubscriptions
                .Include(s => s.MasterTenantCatalog)
                .Include(s => s.MasterFeatureCatalog)
                .Where(s => s.IsActive && s.Status == "Active" && s.ExpiresAtUtc > now && s.ExpiresAtUtc <= sevenDaysThreshold)
                .ToListAsync(cancellationToken);

            if (expiringSubscriptions.Count == 0)
            {
                logs.Add($"[{DateTime.UtcNow:HH:mm:ss}] ✅ Zero subscriptions expiring in the next 7 days.");
                return JobExecutionResult.Succeeded(0, "Zero subscriptions expiring in the next 7 days.", logs);
            }

            logs.Add($"[{DateTime.UtcNow:HH:mm:ss}] 📢 Found {expiringSubscriptions.Count} subscription line-item(s) expiring soon.");
            int noticesSent = 0;

            var groupedByTenant = expiringSubscriptions.GroupBy(s => s.MasterTenantCatalog);

            foreach (var tenantGroup in groupedByTenant)
            {
                var tenant = tenantGroup.Key;
                var items = tenantGroup.ToList();
                var earliestExpiry = items.Min(i => i.ExpiresAtUtc);
                var daysRemaining = Math.Max(1, (int)Math.Ceiling((earliestExpiry - now).TotalDays));

                logs.Add($"   ├── Tenant [{tenant.TenantKey}] '{tenant.OrganizationName}': {items.Count} feature(s) expiring in ~{daysRemaining} day(s)");

                if (!string.IsNullOrWhiteSpace(tenant.AdminEmail))
                {
                    try
                    {
                        var emailBody = $@"
                            <div style='font-family: Arial, sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px;'>
                                <h2 style='color: #2563eb; margin-top: 0;'>Upcoming Subscription Renewal Notice</h2>
                                <p>Dear <strong>{tenant.OrganizationName}</strong> Administrator,</p>
                                <p>This is a courtesy notification that the following capabilities are scheduled to expire in <strong>{daysRemaining} day(s)</strong> (on {earliestExpiry:MMM dd, yyyy}):</p>
                                <ul style='background: #f8fafc; padding: 16px 32px; border-radius: 6px;'>
                                    {string.Join("", items.Select(f => $"<li style='margin-bottom: 6px;'><strong>{f.MasterFeatureCatalog.Name}</strong> — Expires {f.ExpiresAtUtc:MMM dd, yyyy} ({f.RecurringPrice:C2}/{f.DurationType})</li>"))}
                                </ul>
                                <p>Please ensure your payment details are up to date to prevent any disruption in access.</p>
                                <div style='margin-top: 24px;'>
                                    <a href='https://{tenant.PrimaryDomain}' style='background: #2563eb; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold;'>Review Subscriptions</a>
                                </div>
                                <hr style='margin-top: 32px; border: 0; border-top: 1px solid #e2e8f0;' />
                                <p style='font-size: 11px; color: #94a3b8;'>Ozikol Central Renewal Automation System</p>
                            </div>";

                        await _emailService.SendHtmlEmailAsync(
                            to: tenant.AdminEmail,
                            subject: $"[Ozikol Notice] Subscriptions Expiring Soon for {tenant.OrganizationName}",
                            htmlBody: emailBody);

                        noticesSent++;
                        logs.Add($"   │   └── ✉️ Renewal reminder email sent to {tenant.AdminEmail}");
                    }
                    catch (Exception ex)
                    {
                        logs.Add($"   │   └── ⚠️ Failed to send reminder email to {tenant.AdminEmail}: {ex.Message}");
                        _logger.LogWarning(ex, "Failed to send renewal warning email to {Email}", tenant.AdminEmail);
                    }
                }
            }

            return JobExecutionResult.Succeeded(
                noticesSent,
                $"Sent {noticesSent} renewal reminder notice(s) across {groupedByTenant.Count()} tenant organization(s).",
                logs);
        }
    }
}
