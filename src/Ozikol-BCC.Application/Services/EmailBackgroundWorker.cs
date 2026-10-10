using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;
using Microsoft.EntityFrameworkCore;
using static Ozikol_BCC.Domain.Enum.Enum;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Ozikol_BCC.Application.Repository.NotifyRegister;

namespace Ozikol_BCC.Application.Services
{
    /// <summary>
    /// Tenant-aware hosted worker that drains queued newsletter/email logs through ZeptoMail.
    /// It processes each configured tenant separately so one tenant's email settings or failures
    /// do not block another tenant's queue.
    /// </summary>
    public class EmailBackgroundWorker : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<EmailBackgroundWorker> _logger;

        public EmailBackgroundWorker(IServiceProvider serviceProvider, ILogger<EmailBackgroundWorker> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    // Each loop is independent. Failures are logged and the worker retries on the next tick
                    // instead of stopping the hosted service.
                    await ProcessEmailsAsync();
                    await PruneOldLogsAsync();
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error occurred in EmailBackgroundWorker.");
                }

                // Wait for 1 minute before checking again
                await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
            }
        }

        private async Task ProcessEmailsAsync()
        {
            using var rootScope = _serviceProvider.CreateScope();
            var tenantOptions = rootScope.ServiceProvider.GetRequiredService<Microsoft.Extensions.Options.IOptions<Ozikol_BCC.Infrastructure.TenantSupport.TenantConfigurationOptions>>().Value;
            var tenantProvider = rootScope.ServiceProvider.GetRequiredService<Ozikol_BCC.Infrastructure.TenantSupport.ITenantProvider>();

            var tenantsToProcess = tenantOptions.Tenants.Select(t => t.Name).ToList();
            tenantsToProcess.Insert(0, null);

            // Include the default/system database plus each configured tenant database.
            // Do not process one tenant inside another tenant's scope; each database must be isolated.
            foreach (var tenantName in tenantsToProcess.Distinct())
            {
                var safeTenantName = (tenantName ?? "System").Replace(":", "_");
                using (Serilog.Context.LogContext.PushProperty("Tenant", safeTenantName))
                {
                    try
                    {
                        using (tenantProvider.BeginScope(tenantName))
                        {
                            using var scope = _serviceProvider.CreateScope();
                            var context = scope.ServiceProvider.GetRequiredService<DashboardDbContext>();
                            var zeptoMailService = scope.ServiceProvider.GetRequiredService<IZeptoMailService>();

                             var settings = await context.MisConfigurationSettings.FirstOrDefaultAsync();
                            if (settings == null || string.IsNullOrWhiteSpace(settings.ZeptoMailApiKey))
                                continue; // ZeptoMail not configured for this tenant

                            int maxRetries = settings.EmailMaxRetries > 0 ? settings.EmailMaxRetries : 5;

                            // 1) Process transactional emails from BcpEmailQueue
                            var transactionalEmails = await context.BcpEmailQueue
                                .Where(x => (x.Status == BcpQueueStatus.Queued || 
                                             x.Status == BcpQueueStatus.Failed) && 
                                             x.Retries < x.MaxRetries)
                                .OrderBy(x => x.CreatedAt)
                                .Take(50)
                                .ToListAsync();

                            foreach (var email in transactionalEmails)
                            {
                                email.Retries++;
                                email.Status = BcpQueueStatus.Processing;
                                await context.SaveChangesAsync();

                                var result = await zeptoMailService.SendEmailAsync(
                                    email.RecipientEmail, 
                                    email.RecipientName ?? "Recipient", 
                                    email.Subject, 
                                    email.HtmlBody, 
                                    email.Id.ToString());

                                if (result.IsSuccess)
                                {
                                    email.Status = BcpQueueStatus.Sent;
                                    email.SentAt = DateTime.UtcNow;
                                    email.LastError = null;
                                }
                                else
                                {
                                    email.Status = BcpQueueStatus.Failed;
                                    email.LastError = result.ErrorMessage ?? "Unknown ZeptoMail error.";
                                    _logger.LogWarning($"Failed to send transactional email {email.Id} for tenant {tenantName}: {email.LastError}");
                                }

                                await context.SaveChangesAsync();
                            }

                            // 2) Process newsletter email logs
                            // Retry only pending/failed messages under the tenant retry limit.
                            // Sent messages are terminal and must not be resent by this worker.
                            var emailsToSend = await context.BcpNewsletterEmailLogs
                                .Where(x => (x.Status == Ozikol_BCC.Domain.Enum.Enum.EmailLogStatus.Pending || 
                                             x.Status == Ozikol_BCC.Domain.Enum.Enum.EmailLogStatus.Failed) && 
                                             x.RetryCount < maxRetries)
                                .OrderBy(x => x.SentDatetime)
                                .Take(50) // Process in batches of 50
                                .ToListAsync();

                            foreach (var email in emailsToSend)
                            {
                                // Increment before sending so repeated provider failures eventually stop retrying.
                                email.RetryCount++;
                                
                                var result = await zeptoMailService.SendEmailAsync(email.EmailAddress, "Recipient", email.Subject, email.MailBody, Guid.NewGuid().ToString());

                                if (result.IsSuccess)
                                {
                                    email.Status = Ozikol_BCC.Domain.Enum.Enum.EmailLogStatus.Sent;
                                    email.ReceivedDatetime = DateTime.UtcNow;
                                    email.ErrorMessage = null;
                                }
                                else
                                {
                                    email.Status = Ozikol_BCC.Domain.Enum.Enum.EmailLogStatus.Failed;
                                    email.ErrorMessage = result.ErrorMessage ?? "Unknown ZeptoMail error.";
                                    _logger.LogWarning($"Failed to send email {email.Id} for tenant {tenantName}: {email.ErrorMessage}");
                                }

                                await context.SaveChangesAsync();
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, $"Failed to process emails for tenant: {tenantName ?? "default"}");
                    }
                }
            }
        }

        private async Task PruneOldLogsAsync()
        {
            using var rootScope = _serviceProvider.CreateScope();
            var tenantOptions = rootScope.ServiceProvider.GetRequiredService<Microsoft.Extensions.Options.IOptions<Ozikol_BCC.Infrastructure.TenantSupport.TenantConfigurationOptions>>().Value;
            var tenantProvider = rootScope.ServiceProvider.GetRequiredService<Ozikol_BCC.Infrastructure.TenantSupport.ITenantProvider>();

            var tenantsToProcess = tenantOptions.Tenants.Select(t => t.Name).ToList();
            tenantsToProcess.Insert(0, null);

            foreach (var tenantName in tenantsToProcess.Distinct())
            {
                var safeTenantName = (tenantName ?? "System").Replace(":", "_");
                using (Serilog.Context.LogContext.PushProperty("Tenant", safeTenantName))
                {
                    try
                    {
                        using (tenantProvider.BeginScope(tenantName))
                        {
                            using var scope = _serviceProvider.CreateScope();
                            var context = scope.ServiceProvider.GetRequiredService<DashboardDbContext>();

                            int maxLogs = 10000;
                            DateTime cutoffDate = DateTime.UtcNow.AddDays(-30);

                            // Log pruning protects tenant databases from unbounded email-log growth.
                            // It only removes old logs after the tenant exceeds the configured cap.
                            var totalCount = await context.BcpNewsletterEmailLogs.CountAsync();

                            if (totalCount > maxLogs)
                            {
                                var oldLogs = await context.BcpNewsletterEmailLogs
                                    .Where(x => x.SentDatetime < cutoffDate)
                                    .OrderBy(x => x.SentDatetime)
                                    .Take(1000)
                                    .ToListAsync();

                                if (oldLogs.Any())
                                {
                                    context.BcpNewsletterEmailLogs.RemoveRange(oldLogs);
                                    await context.SaveChangesAsync();
                                    _logger.LogInformation($"Pruned {oldLogs.Count} old email logs for tenant {tenantName ?? "default"}.");
                                }
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, $"Failed to prune email logs for tenant: {tenantName ?? "default"}");
                    }
                }
            }
        }
    }
}

