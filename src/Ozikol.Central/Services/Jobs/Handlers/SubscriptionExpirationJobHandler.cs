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
    /// Central Background Job Handler that scans for expired line-item feature subscriptions and trials,
    /// marks them as Suspended/Expired in the Master DB, and dispatches automated expiration notification emails.
    /// </summary>
    public class SubscriptionExpirationJobHandler : IBackgroundJobHandler
    {
        private readonly MasterCatalogDbContext _masterCatalogDbContext;
        private readonly IPostmarkEmailService _emailService;
        private readonly ILogger<SubscriptionExpirationJobHandler> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="SubscriptionExpirationJobHandler"/> class.
        /// </summary>
        /// <param name="masterCatalogDbContext">Master Catalog database context.</param>
        /// <param name="emailService">Postmark email service for notifications.</param>
        /// <param name="logger">Structured logger instance.</param>
        public SubscriptionExpirationJobHandler(
            MasterCatalogDbContext masterCatalogDbContext,
            IPostmarkEmailService emailService,
            ILogger<SubscriptionExpirationJobHandler> logger)
        {
            _masterCatalogDbContext = masterCatalogDbContext;
            _emailService = emailService;
            _logger = logger;
        }

        /// <inheritdoc />
        public string JobKey => "central.subscription-expiration";

        /// <inheritdoc />
        public string DisplayName => "Subscription & Trial Expiration Engine";

        /// <inheritdoc />
        public string Category => "Billing & Subscriptions";

        /// <inheritdoc />
        public BackgroundJobScope Scope => BackgroundJobScope.Central;

        /// <inheritdoc />
        public string Description => "Scans active tenant subscriptions and trials in the Master DB, transitions expired line items to Suspended, and sends expiration notices.";

        /// <inheritdoc />
        public int DefaultIntervalSeconds => 3600; // Run every 1 hour

        /// <inheritdoc />
        public async Task<JobExecutionResult> ExecuteAsync(JobExecutionContext context, CancellationToken cancellationToken = default)
        {
            var logs = new List<string>();
            var now = DateTime.UtcNow;
            logs.Add($"[{now:yyyy-MM-dd HH:mm:ss} UTC] 🔍 Scanning Master DB for expired feature subscriptions (Threshold <= {now:yyyy-MM-dd HH:mm:ss} UTC)...");

            var expiredSubscriptions = await _masterCatalogDbContext.MasterTenantFeatureSubscriptions
                .Include(s => s.MasterTenantCatalog)
                .Include(s => s.MasterFeatureCatalog)
                .Where(s => s.IsActive && s.Status == "Active" && s.ExpiresAtUtc <= now)
                .ToListAsync(cancellationToken);

            if (expiredSubscriptions.Count == 0)
            {
                logs.Add($"[{DateTime.UtcNow:HH:mm:ss}] ✅ Zero expired subscriptions found. All active capabilities are within valid expiration horizons.");
                return JobExecutionResult.Succeeded(0, "Zero expired subscriptions found.", logs);
            }

            logs.Add($"[{DateTime.UtcNow:HH:mm:ss}] ⚠️ Found {expiredSubscriptions.Count} expired subscription line-item(s) across tenants.");
            int processedCount = 0;

            // Group by tenant to batch notification emails cleanly
            var groupedByTenant = expiredSubscriptions.GroupBy(s => s.MasterTenantCatalog);

            foreach (var tenantGroup in groupedByTenant)
            {
                var tenant = tenantGroup.Key;
                var expiredFeatures = tenantGroup.ToList();
                var featureNames = string.Join(", ", expiredFeatures.Select(f => f.MasterFeatureCatalog.Name));

                logs.Add($"   ├── Tenant [{tenant.TenantKey}] '{tenant.OrganizationName}': {expiredFeatures.Count} feature(s) expired ({featureNames})");

                foreach (var sub in expiredFeatures)
                {
                    sub.Status = "Suspended";
                    sub.IsActive = false;
                    processedCount++;
                }

                // Dispatch notification email to tenant administrator
                if (!string.IsNullOrWhiteSpace(tenant.AdminEmail))
                {
                    try
                    {
                        var emailBody = $@"
                            <div style='font-family: Arial, sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px;'>
                                <h2 style='color: #dc2626; margin-top: 0;'>Action Required: Feature Subscription Expired</h2>
                                <p>Dear <strong>{tenant.OrganizationName}</strong> Administrator,</p>
                                <p>The following modular capabilities or trial period associated with your organization expired on <strong>{now:MMM dd, yyyy}</strong>:</p>
                                <ul style='background: #f8fafc; padding: 16px 32px; border-radius: 6px;'>
                                    {string.Join("", expiredFeatures.Select(f => $"<li style='margin-bottom: 6px;'><strong>{f.MasterFeatureCatalog.Name}</strong> ({f.DurationType} plan)</li>"))}
                                </ul>
                                <p>To reactivate these capabilities and ensure uninterrupted workflow for your team, please sign in to your Central Workspace to renew your subscriptions.</p>
                                <div style='margin-top: 24px;'>
                                    <a href='https://{tenant.PrimaryDomain}' style='background: #2563eb; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold;'>Manage Subscriptions</a>
                                </div>
                                <hr style='margin-top: 32px; border: 0; border-top: 1px solid #e2e8f0;' />
                                <p style='font-size: 11px; color: #94a3b8;'>This is an automated platform alert from Ozikol Central.</p>
                            </div>";

                        await _emailService.SendHtmlEmailAsync(
                            to: tenant.AdminEmail,
                            subject: $"[Ozikol Alert] Subscription Expired for {tenant.OrganizationName}",
                            htmlBody: emailBody);

                        logs.Add($"   │   └── ✉️ Expiration email alert successfully sent to {tenant.AdminEmail}");
                    }
                    catch (Exception ex)
                    {
                        logs.Add($"   │   └── ⚠️ Failed to send expiration email to {tenant.AdminEmail}: {ex.Message}");
                        _logger.LogWarning(ex, "Failed to send subscription expiration email to tenant admin {Email}", tenant.AdminEmail);
                    }
                }
            }

            await _masterCatalogDbContext.SaveChangesAsync(cancellationToken);
            logs.Add($"[{DateTime.UtcNow:HH:mm:ss}] ✅ Successfully processed and transitioned {processedCount} expired subscription(s) to Suspended.");

            return JobExecutionResult.Succeeded(
                processedCount,
                $"Processed {processedCount} expired subscription(s) across {groupedByTenant.Count()} tenant organization(s).",
                logs);
        }
    }
}
