using Ozikol_BCC.Application.Repository.NotifyRegister;
using Ozikol_BCC.Domain.Enum;
using DomainEnum = Ozikol_BCC.Domain.Enum.Enum;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace Ozikol_BCC.Application.Services
{
    /// <summary>
    /// Tenant-aware hosted worker that sends scheduled BCP SMS campaigns when their due time arrives.
    /// Campaign state is persisted after each transition so interrupted runs can resume safely.
    /// </summary>
    public class SmsSchedulerBackgroundService : BackgroundService
    {
        private readonly ILogger<SmsSchedulerBackgroundService> _logger;
        private readonly IServiceProvider _serviceProvider;

        public SmsSchedulerBackgroundService(ILogger<SmsSchedulerBackgroundService> logger, IServiceProvider serviceProvider)
        {
            _logger = logger;
            _serviceProvider = serviceProvider;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    // SMS scheduling is polling based. Failed loop iterations are logged and retried
                    // on the next tick so the hosted service remains alive.
                    await ProcessScheduledCampaignsAsync();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error occurred executing Scheduled SMS Campaigns.");
                }

                // Wait 1 minute before polling again
                await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
            }
        }

        private async Task ProcessScheduledCampaignsAsync()
        {
            using (var rootScope = _serviceProvider.CreateScope())
            {
                var tenantOptions = rootScope.ServiceProvider.GetRequiredService<Microsoft.Extensions.Options.IOptions<Ozikol_BCC.Infrastructure.TenantSupport.TenantConfigurationOptions>>().Value;
                var tenantProvider = rootScope.ServiceProvider.GetRequiredService<Ozikol_BCC.Infrastructure.TenantSupport.ITenantProvider>();

                var tenantsToProcess = tenantOptions.Tenants.Select(t => t.Name).ToList();
                tenantsToProcess.Insert(0, null);

                // Process the default/system database plus each configured tenant database.
                // Tenant scopes are isolated so one tenant's SMS configuration cannot leak into another.
                foreach (var tenantName in tenantsToProcess.Distinct())
                {
                    var safeTenantName = (tenantName ?? "System").Replace(":", "_");
                    using (Serilog.Context.LogContext.PushProperty("Tenant", safeTenantName))
                    {
                        try
                        {
                            using (tenantProvider.BeginScope(tenantName))
                            {
                                using (var scope = _serviceProvider.CreateScope())
                                {
                                    var context = scope.ServiceProvider.GetRequiredService<DashboardDbContext>();
                                    var smsService = scope.ServiceProvider.GetRequiredService<ISmsSendService>();

                                    // 1) Process transactional SMS queue
                                    var pendingSms = await context.BcpSmsQueue
                                        .Where(x => (x.Status == DomainEnum.BcpQueueStatus.Queued ||
                                                     x.Status == DomainEnum.BcpQueueStatus.Failed) &&
                                                     x.Retries < x.MaxRetries)
                                        .OrderBy(x => x.CreatedAt)
                                        .Take(50)
                                        .ToListAsync();

                                    foreach (var sms in pendingSms)
                                    {
                                        sms.Retries++;
                                        sms.Status = DomainEnum.BcpQueueStatus.Processing;
                                        await context.SaveChangesAsync();

                                        try
                                        {
                                            var isSent = await smsService.SendSmsWithResult(sms.RecipientPhone, sms.Message);
                                            if (isSent)
                                            {
                                                sms.Status = DomainEnum.BcpQueueStatus.Sent;
                                                sms.SentAt = DateTime.UtcNow;
                                                sms.LastError = null;
                                            }
                                            else
                                            {
                                                sms.Status = DomainEnum.BcpQueueStatus.Failed;
                                                sms.LastError = "Failed to send SMS through SMS provider.";
                                                _logger.LogWarning($"Failed to send SMS {sms.Id} for tenant {tenantName}: {sms.LastError}");
                                            }
                                        }
                                        catch (Exception ex)
                                        {
                                            sms.Status = DomainEnum.BcpQueueStatus.Failed;
                                            sms.LastError = ex.Message;
                                            _logger.LogError(ex, $"Error sending SMS {sms.Id} for tenant {tenantName}");
                                        }

                                        await context.SaveChangesAsync();
                                    }

                                    // 2) Pick due scheduled campaigns and pending retries for this tenant.
                                    var pendingCampaigns = await context.BcpSmsCampaigns
                                        .Include(c => c.Recipients)
                                        .Where(c => (c.Status == DomainEnum.BcpSmsCampaignStatus.Scheduled && c.ScheduledDate.HasValue && c.ScheduledDate.Value <= DateTime.UtcNow) ||
                                                    c.Status == DomainEnum.BcpSmsCampaignStatus.Pending)
                                        .ToListAsync();

                                    foreach (var campaign in pendingCampaigns)
                                    {
                                        // Mark as Sending before calling the provider to avoid concurrent workers
                                        // picking the same campaign as scheduled/pending in the same polling window.
                                        campaign.Status = DomainEnum.BcpSmsCampaignStatus.Sending;
                                        await context.SaveChangesAsync();

                                        try
                                        {
                                            if (campaign.Recipients == null || !campaign.Recipients.Any())
                                            {
                                                campaign.Status = DomainEnum.BcpSmsCampaignStatus.Failed;
                                                await context.SaveChangesAsync();
                                                continue;
                                            }

                                            // Collect active contacts
                                            var contacts = campaign.Recipients.Select(r => r.PhoneNumber).ToList();
                                            string commaSeparatedContacts = string.Join(",", contacts);

                                            if (string.IsNullOrEmpty(commaSeparatedContacts))
                                            {
                                                campaign.Status = DomainEnum.BcpSmsCampaignStatus.Failed;
                                                await context.SaveChangesAsync();
                                                continue;
                                            }

                                            // Campaign sends use the bulk/campaign gateway path.
                                            var sendResult = await smsService.SendCampaignSmsAsync(commaSeparatedContacts, campaign.Message ?? "", campaign.SenderId ?? "SMS");

                                            if (sendResult == SmsSendResult.Success)
                                            {
                                                // Completed is terminal for this scheduler; it will not be retried.
                                                campaign.Status = DomainEnum.BcpSmsCampaignStatus.Completed;
                                                foreach(var rec in campaign.Recipients)
                                                {
                                                    rec.DeliveryStatus = DomainEnum.BcpSmsDeliveryStatus.Sent;
                                                }
                                            }
                                            else if (sendResult == SmsSendResult.InsufficientKudiBalance)
                                            {
                                                // Keep it in Pending so it auto-retries when admin funds the Kudi account
                                                // This is the one provider failure treated as retryable by design.
                                                campaign.Status = DomainEnum.BcpSmsCampaignStatus.Pending;
                                                // Delivery status remains Pending
                                            }
                                            else
                                            {
                                                campaign.Status = DomainEnum.BcpSmsCampaignStatus.Failed;
                                                foreach (var rec in campaign.Recipients)
                                                {
                                                    rec.DeliveryStatus = DomainEnum.BcpSmsDeliveryStatus.Failed;
                                                }
                                            }

                                            await context.SaveChangesAsync();
                                        }
                                        catch (Exception ex)
                                        {
                                            _logger.LogError(ex, $"Failed to process SMS campaign {campaign.Id} for tenant {tenantName}");
                                            campaign.Status = DomainEnum.BcpSmsCampaignStatus.Failed;
                                            await context.SaveChangesAsync();
                                        }
                                    }
                                }
                            }
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, $"Failed to process SMS for tenant: {tenantName ?? "default"}");
                        }
                    }
                }
            }
        }
    }
}


