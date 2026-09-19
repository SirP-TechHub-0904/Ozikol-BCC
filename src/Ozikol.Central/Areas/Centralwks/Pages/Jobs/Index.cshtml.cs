using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Ozikol.Central.Services.Jobs;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Areas.Centralwks.Pages.Jobs
{
    /// <summary>
    /// Page model for the Background Jobs Command Center in Central.
    /// Provides listing, real-time KPI metrics, on-demand execution triggers, and pause/resume controls.
    /// </summary>
    [Authorize]
    public class IndexModel : PageModel
    {
        private readonly MasterCatalogDbContext _masterCatalogDbContext;
        private readonly CentralBackgroundJobOrchestrator _orchestrator;

        /// <summary>
        /// Initializes a new instance of the <see cref="IndexModel"/> class.
        /// </summary>
        /// <param name="masterCatalogDbContext">Master Catalog DbContext.</param>
        /// <param name="orchestrator">Central background job orchestrator.</param>
        public IndexModel(
            MasterCatalogDbContext masterCatalogDbContext,
            CentralBackgroundJobOrchestrator orchestrator)
        {
            _masterCatalogDbContext = masterCatalogDbContext;
            _orchestrator = orchestrator;
        }

        /// <summary>
        /// List of background jobs matching the current filter.
        /// </summary>
        public List<MasterBackgroundJob> Jobs { get; set; } = new List<MasterBackgroundJob>();

        /// <summary>
        /// Active filter scope ("all", "central", "tenant").
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string ScopeFilter { get; set; } = "all";

        /// <summary>
        /// Active filter status ("all", "active", "paused", "failed").
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string StatusFilter { get; set; } = "all";

        /// <summary>
        /// Search query string.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public string? Query { get; set; }

        // KPI metrics
        public int TotalJobsCount { get; set; }
        public int CentralJobsCount { get; set; }
        public int TenantJobsCount { get; set; }
        public int ActiveJobsCount { get; set; }
        public int Executions24hCount { get; set; }
        public int Failed24hCount { get; set; }

        /// <summary>
        /// Handles HTTP GET requests to load background jobs and calculate KPI stats.
        /// </summary>
        public async Task<IActionResult> OnGetAsync()
        {
            // Calculate global KPI stats
            TotalJobsCount = await _masterCatalogDbContext.MasterBackgroundJobs.CountAsync();
            CentralJobsCount = await _masterCatalogDbContext.MasterBackgroundJobs.CountAsync(j => j.Scope == BackgroundJobScope.Central);
            TenantJobsCount = await _masterCatalogDbContext.MasterBackgroundJobs.CountAsync(j => j.Scope == BackgroundJobScope.Tenant);
            ActiveJobsCount = await _masterCatalogDbContext.MasterBackgroundJobs.CountAsync(j => j.IsEnabled && j.Status != BackgroundJobStatus.Paused);

            var past24h = DateTime.UtcNow.AddHours(-24);
            Executions24hCount = await _masterCatalogDbContext.MasterBackgroundJobLogs.CountAsync(l => l.StartedAtUtc >= past24h);
            Failed24hCount = await _masterCatalogDbContext.MasterBackgroundJobLogs.CountAsync(l => l.StartedAtUtc >= past24h && l.Status == JobExecutionStatus.Failed);

            // Query filtered jobs
            IQueryable<MasterBackgroundJob> query = _masterCatalogDbContext.MasterBackgroundJobs
                .Include(j => j.TargetTenantCatalog)
                .AsNoTracking();

            if (!string.IsNullOrWhiteSpace(ScopeFilter) && ScopeFilter != "all")
            {
                if (ScopeFilter.Equals("central", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(j => j.Scope == BackgroundJobScope.Central);
                }
                else if (ScopeFilter.Equals("tenant", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(j => j.Scope == BackgroundJobScope.Tenant);
                }
            }

            if (!string.IsNullOrWhiteSpace(StatusFilter) && StatusFilter != "all")
            {
                if (StatusFilter.Equals("active", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(j => j.IsEnabled && j.Status != BackgroundJobStatus.Paused);
                }
                else if (StatusFilter.Equals("paused", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(j => !j.IsEnabled || j.Status == BackgroundJobStatus.Paused);
                }
                else if (StatusFilter.Equals("failed", StringComparison.OrdinalIgnoreCase))
                {
                    query = query.Where(j => j.Status == BackgroundJobStatus.Failed);
                }
            }

            if (!string.IsNullOrWhiteSpace(Query))
            {
                var cleanQ = Query.Trim().ToLower();
                query = query.Where(j => j.Name.ToLower().Contains(cleanQ)
                                      || j.JobKey.ToLower().Contains(cleanQ)
                                      || (j.Category != null && j.Category.ToLower().Contains(cleanQ))
                                      || (j.TargetTenantCatalog != null && j.TargetTenantCatalog.OrganizationName.ToLower().Contains(cleanQ)));
            }

            Jobs = await query
                .OrderBy(j => j.Scope)
                .ThenBy(j => j.Name)
                .ToListAsync();

            return Page();
        }

        /// <summary>
        /// Handles on-demand manual trigger of a background job.
        /// </summary>
        /// <param name="id">Background job ID.</param>
        public async Task<IActionResult> OnPostRunNowAsync(Guid id)
        {
            var (success, message, duration) = await _orchestrator.TriggerJobNowAsync(id);
            if (success)
            {
                TempData["Success"] = $"Job executed successfully in {duration}ms: {message}";
            }
            else
            {
                TempData["Error"] = $"Job execution failed ({duration}ms): {message}";
            }

            return RedirectToPage(new { scopeFilter = ScopeFilter, statusFilter = StatusFilter, query = Query });
        }

        /// <summary>
        /// Handles toggling a background job between enabled and paused.
        /// </summary>
        /// <param name="id">Background job ID.</param>
        /// <param name="enable">True to enable; false to pause.</param>
        public async Task<IActionResult> OnPostToggleStateAsync(Guid id, bool enable)
        {
            var updated = await _orchestrator.ToggleJobStateAsync(id, enable);
            if (updated)
            {
                TempData["Success"] = enable ? "Background job resumed and scheduled." : "Background job paused.";
            }
            else
            {
                TempData["Error"] = "Failed to update job status.";
            }

            return RedirectToPage(new { scopeFilter = ScopeFilter, statusFilter = StatusFilter, query = Query });
        }

        /// <summary>
        /// Handles deleting a custom background job.
        /// </summary>
        /// <param name="id">Background job ID.</param>
        public async Task<IActionResult> OnPostDeleteJobAsync(Guid id)
        {
            var job = await _masterCatalogDbContext.MasterBackgroundJobs.FindAsync(id);
            if (job != null)
            {
                _masterCatalogDbContext.MasterBackgroundJobs.Remove(job);
                await _masterCatalogDbContext.SaveChangesAsync();
                TempData["Success"] = $"Background job '{job.Name}' has been removed.";
            }

            return RedirectToPage(new { scopeFilter = ScopeFilter, statusFilter = StatusFilter, query = Query });
        }
    }
}
