using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Services.Jobs
{
    /// <summary>
    /// Hosted background service that orchestrates, schedules, executes, and logs both Central system jobs
    /// and Tenant project background jobs, and provides API methods for on-demand triggers and pause/resume toggling.
    /// </summary>
    public class CentralBackgroundJobOrchestrator : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<CentralBackgroundJobOrchestrator> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="CentralBackgroundJobOrchestrator"/> class.
        /// </summary>
        /// <param name="serviceProvider">Root service provider for resolving scoped DbContext and handlers.</param>
        /// <param name="logger">Structured logger instance.</param>
        public CentralBackgroundJobOrchestrator(
            IServiceProvider serviceProvider,
            ILogger<CentralBackgroundJobOrchestrator> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        /// <summary>
        /// Background execution loop running periodically while the application is alive.
        /// </summary>
        /// <param name="stoppingToken">Cancellation token triggered on application shutdown.</param>
        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("🚀 [BackgroundJobs] Central Background Job Orchestrator started.");

            // Step 1: Ensure baseline canonical jobs exist in Master DB
            try
            {
                await EnsureBaselineJobsSeededAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "⚠️ [BackgroundJobs] Initial baseline job seeding encountered a transient connection issue; will continue and retry in scheduler loop.");
            }

            // Main recurring scheduler loop
            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await CheckAndExecuteScheduledJobsAsync(stoppingToken);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "❌ [BackgroundJobs] Error occurred during scheduled job orchestration cycle.");
                }

                // Poll interval check every 30 seconds
                try
                {
                    await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
                }
                catch (TaskCanceledException)
                {
                    break;
                }
            }

            _logger.LogInformation("🛑 [BackgroundJobs] Central Background Job Orchestrator stopped.");
        }

        /// <summary>
        /// Ensures default platform system jobs and canonical tenant job templates are registered in the Master DB.
        /// </summary>
        /// <param name="cancellationToken">Cancellation token.</param>
        public async Task EnsureBaselineJobsSeededAsync(CancellationToken cancellationToken = default)
        {
            using var scope = _serviceProvider.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<MasterCatalogDbContext>();

            var handlers = scope.ServiceProvider.GetServices<IBackgroundJobHandler>().ToList();

            foreach (var handler in handlers)
            {
                var existing = await db.MasterBackgroundJobs
                    .FirstOrDefaultAsync(j => j.JobKey == handler.JobKey && j.TargetTenantCatalogId == null, cancellationToken);

                if (existing == null)
                {
                    var now = DateTime.UtcNow;
                    var job = new MasterBackgroundJob
                    {
                        Id = Guid.NewGuid(),
                        JobKey = handler.JobKey,
                        Name = handler.DisplayName,
                        Description = handler.Description,
                        Category = handler.Category,
                        Scope = handler.Scope,
                        TargetTenantCatalogId = null,
                        IntervalSeconds = handler.DefaultIntervalSeconds,
                        IsEnabled = true,
                        Status = BackgroundJobStatus.Idle,
                        CreatedUtc = now,
                        NextRunUtc = now.AddSeconds(15) // Initial startup run
                    };

                    db.MasterBackgroundJobs.Add(job);
                    _logger.LogInformation("🌱 [BackgroundJobs] Registered baseline job: [{JobKey}] - {Name}", handler.JobKey, handler.DisplayName);
                }
            }

            await db.SaveChangesAsync(cancellationToken);
        }

        /// <summary>
        /// Evaluates registered enabled jobs and executes any whose NextRunUtc is due.
        /// </summary>
        /// <param name="cancellationToken">Cancellation token.</param>
        private async Task CheckAndExecuteScheduledJobsAsync(CancellationToken cancellationToken)
        {
            using var scope = _serviceProvider.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<MasterCatalogDbContext>();

            var now = DateTime.UtcNow;
            var dueJobs = await db.MasterBackgroundJobs
                .Where(j => j.IsEnabled && j.Status != BackgroundJobStatus.Running && (j.NextRunUtc == null || j.NextRunUtc <= now))
                .ToListAsync(cancellationToken);

            foreach (var job in dueJobs)
            {
                await ExecuteJobInternalAsync(job.Id, isManual: false, cancellationToken);
            }
        }

        /// <summary>
        /// Triggers immediate execution of a registered background job on demand.
        /// </summary>
        /// <param name="jobId">The ID of the job to execute.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>Execution result tuple with success flag, summary message, and duration.</returns>
        public async Task<(bool Success, string Message, long DurationMs)> TriggerJobNowAsync(Guid jobId, CancellationToken cancellationToken = default)
        {
            return await ExecuteJobInternalAsync(jobId, isManual: true, cancellationToken);
        }

        /// <summary>
        /// Toggles the enabled/paused state of a background job.
        /// </summary>
        /// <param name="jobId">The background job ID.</param>
        /// <param name="isEnabled">True to enable/resume; false to pause.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>True if successfully updated; false otherwise.</returns>
        public async Task<bool> ToggleJobStateAsync(Guid jobId, bool isEnabled, CancellationToken cancellationToken = default)
        {
            using var scope = _serviceProvider.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<MasterCatalogDbContext>();

            var job = await db.MasterBackgroundJobs.FindAsync(new object[] { jobId }, cancellationToken);
            if (job == null) return false;

            job.IsEnabled = isEnabled;
            job.Status = isEnabled ? BackgroundJobStatus.Idle : BackgroundJobStatus.Paused;
            job.UpdatedUtc = DateTime.UtcNow;

            if (isEnabled && (job.NextRunUtc == null || job.NextRunUtc < DateTime.UtcNow))
            {
                job.NextRunUtc = DateTime.UtcNow.AddSeconds(5);
            }

            await db.SaveChangesAsync(cancellationToken);
            return true;
        }

        /// <summary>
        /// Internal worker that resolves the handler, manages state transitions, runs logic, and records logs.
        /// </summary>
        private async Task<(bool Success, string Message, long DurationMs)> ExecuteJobInternalAsync(
            Guid jobId,
            bool isManual,
            CancellationToken cancellationToken)
        {
            using var scope = _serviceProvider.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<MasterCatalogDbContext>();

            var job = await db.MasterBackgroundJobs
                .Include(j => j.TargetTenantCatalog)
                .FirstOrDefaultAsync(j => j.Id == jobId, cancellationToken);

            if (job == null)
            {
                return (false, "Job not found in Master DB.", 0);
            }

            var handlers = scope.ServiceProvider.GetServices<IBackgroundJobHandler>();
            var handler = handlers.FirstOrDefault(h => h.JobKey == job.JobKey);

            if (handler == null)
            {
                job.Status = BackgroundJobStatus.Failed;
                job.LastResultSummary = $"No registered C# handler found for JobKey '{job.JobKey}'.";
                job.UpdatedUtc = DateTime.UtcNow;
                await db.SaveChangesAsync(cancellationToken);
                return (false, job.LastResultSummary, 0);
            }

            var startUtc = DateTime.UtcNow;
            job.Status = BackgroundJobStatus.Running;
            await db.SaveChangesAsync(cancellationToken);

            var logEntry = new MasterBackgroundJobLog
            {
                Id = Guid.NewGuid(),
                JobId = job.Id,
                TargetTenantCatalogId = job.TargetTenantCatalogId,
                TenantKey = job.TargetTenantCatalog?.TenantKey,
                StartedAtUtc = startUtc,
                Status = JobExecutionStatus.Running
            };
            db.MasterBackgroundJobLogs.Add(logEntry);
            await db.SaveChangesAsync(cancellationToken);

            var context = new JobExecutionContext
            {
                JobId = job.Id,
                JobKey = job.JobKey,
                Scope = job.Scope,
                TargetTenantCatalogId = job.TargetTenantCatalogId,
                TargetTenantKey = job.TargetTenantCatalog?.TenantKey,
                TargetOrganizationName = job.TargetTenantCatalog?.OrganizationName,
                ParametersJson = job.JobParametersJson,
                StartedAtUtc = startUtc,
                IsManualTrigger = isManual
            };

            var sw = Stopwatch.StartNew();
            JobExecutionResult result;

            try
            {
                _logger.LogInformation("⚡ [BackgroundJobs] Executing [{JobKey}] - {Name} (Scope: {Scope})...", job.JobKey, job.Name, job.Scope);
                result = await handler.ExecuteAsync(context, cancellationToken);
                sw.Stop();
            }
            catch (Exception ex)
            {
                sw.Stop();
                _logger.LogError(ex, "❌ [BackgroundJobs] Exception in [{JobKey}]: {Message}", job.JobKey, ex.Message);
                result = JobExecutionResult.Failed(ex.ToString(), $"Unhandled exception: {ex.Message}");
            }

            var endUtc = DateTime.UtcNow;
            var durationMs = sw.ElapsedMilliseconds;

            // Update MasterBackgroundJob status & schedule
            job.Status = result.Success ? BackgroundJobStatus.Idle : BackgroundJobStatus.Failed;
            job.LastRunUtc = endUtc;
            job.LastDurationMs = durationMs;
            job.LastResultSummary = result.SummaryMessage;
            job.NextRunUtc = endUtc.AddSeconds(job.IntervalSeconds > 0 ? job.IntervalSeconds : 3600);
            job.UpdatedUtc = endUtc;

            // Update MasterBackgroundJobLog
            logEntry.CompletedAtUtc = endUtc;
            logEntry.DurationMs = durationMs;
            logEntry.Status = result.Success ? JobExecutionStatus.Success : JobExecutionStatus.Failed;
            logEntry.ItemsProcessedCount = result.ItemsProcessedCount;
            logEntry.SummaryMessage = result.SummaryMessage;
            logEntry.LogOutput = result.LogLines != null ? string.Join(Environment.NewLine, result.LogLines) : null;
            logEntry.ErrorDetails = result.ErrorMessage;

            await db.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("✅ [BackgroundJobs] Completed [{JobKey}] in {Duration}ms. Result: {Summary}",
                job.JobKey, durationMs, result.SummaryMessage);

            return (result.Success, result.SummaryMessage, durationMs);
        }
    }
}
