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
using Ozikol_BCC.Infrastructure.Services.Email;

namespace Ozikol_BCC.Application.Services
{
    /// <summary>
    /// Tenant-aware hosted worker that drains queued transactional and newsletter emails through Mailcow SMTP.
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
                    await ProcessEmailsAsync(stoppingToken);
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

        private async Task ProcessEmailsAsync(CancellationToken stoppingToken = default)
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
                            var smtpDispatcher = scope.ServiceProvider.GetService<ISmtpEmailDispatcher>();
                            var emailShellService = scope.ServiceProvider.GetService<Ozikol_BCC.Application.Interfaces.Services.ITenantEmailShellService>();

                            var settings = await context.MisConfigurationSettings.FirstOrDefaultAsync();
                            bool hasMailcow = smtpDispatcher != null;

                            if (!hasMailcow)
                                continue; // No email dispatcher configured for this tenant

                            int maxRetries = settings?.EmailMaxRetries > 0 ? settings.EmailMaxRetries : 5;

                            // Process newsletter email logs
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
                                
                                bool isSuccess = false;
                                string? errorMessage = null;

                                var fromEmail = !string.IsNullOrWhiteSpace(settings?.SenderEmail)
                                    ? settings.SenderEmail
                                    : $"noreply@{safeTenantName}.ozikol.cloud";

                                var fromName = !string.IsNullOrWhiteSpace(settings?.SenderName)
                                    ? settings.SenderName
                                    : safeTenantName;

                                var sent = await smtpDispatcher.SendEmailAsync(
                                    toEmail: email.EmailAddress,
                                    subject: email.Subject,
                                    htmlBody: email.MailBody,
                                    fromEmail: fromEmail,
                                    fromName: fromName,
                                    replyTo: fromEmail,
                                    isCentralPlatformEmail: false,
                                    tenantName: fromName,
                                    cancellationToken: stoppingToken);

                                isSuccess = sent;
                                if (!sent)
                                {
                                    errorMessage = "Failed to dispatch newsletter email over Mailcow SMTP.";
                                }

                                if (isSuccess)
                                {
                                    email.Status = Ozikol_BCC.Domain.Enum.Enum.EmailLogStatus.Sent;
                                    email.ReceivedDatetime = DateTime.UtcNow;
                                    email.ErrorMessage = null;
                                }
                                else
                                {
                                    email.Status = Ozikol_BCC.Domain.Enum.Enum.EmailLogStatus.Failed;
                                    email.ErrorMessage = errorMessage ?? "Unknown email dispatch error.";
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

