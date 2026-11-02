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
    /// Page model for inspecting background job details, configuration, and execution audit history.
    /// </summary>
    [Authorize]
    public class DetailsModel : PageModel
    {
        private readonly MasterCatalogDbContext _masterCatalogDbContext;
        private readonly CentralBackgroundJobOrchestrator _orchestrator;

        /// <summary>
        /// Initializes a new instance of the <see cref="DetailsModel"/> class.
        /// </summary>
        /// <param name="masterCatalogDbContext">Master Catalog DbContext.</param>
        /// <param name="orchestrator">Central background job orchestrator.</param>
        public DetailsModel(
            MasterCatalogDbContext masterCatalogDbContext,
            CentralBackgroundJobOrchestrator orchestrator)
        {
            _masterCatalogDbContext = masterCatalogDbContext;
            _orchestrator = orchestrator;
        }

        /// <summary>
        /// The background job entity.
        /// </summary>
        public MasterBackgroundJob Job { get; set; } = null!;

        /// <summary>
        /// Execution audit logs for this job.
        /// </summary>
        public List<MasterBackgroundJobLog> Logs { get; set; } = new List<MasterBackgroundJobLog>();

        /// <summary>
        /// Current page index for pagination.
        /// </summary>
        [BindProperty(SupportsGet = true)]
        public int CurrentPage { get; set; } = 1;

        /// <summary>
        /// Total count of log entries.
        /// </summary>
        public int TotalLogsCount { get; set; }

        /// <summary>
        /// Total pages count.
        /// </summary>
        public int TotalPages { get; set; }

        /// <summary>
        /// Handles HTTP GET requests to load job details and paginated logs.
        /// </summary>
        /// <param name="jobId">Background job ID.</param>
        public async Task<IActionResult> OnGetAsync(Guid jobId)
        {
            var job = await _masterCatalogDbContext.MasterBackgroundJobs
                .Include(j => j.TargetTenantCatalog)
                .FirstOrDefaultAsync(j => j.Id == jobId);

            if (job == null)
            {
                TempData["Error"] = "Background job not found.";
                return RedirectToPage("/Jobs/Index");
            }

            Job = job;

            const int pageSize = 20;
            if (CurrentPage < 1) CurrentPage = 1;

            IQueryable<MasterBackgroundJobLog> logQuery = _masterCatalogDbContext.MasterBackgroundJobLogs
                .Include(l => l.TargetTenantCatalog)
                .Where(l => l.JobId == jobId)
                .OrderByDescending(l => l.StartedAtUtc);

            TotalLogsCount = await logQuery.CountAsync();
            TotalPages = (int)Math.Ceiling(TotalLogsCount / (double)pageSize);

            Logs = await logQuery
                .Skip((CurrentPage - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return Page();
        }

        /// <summary>
        /// Handles on-demand trigger from the details page.
        /// </summary>
        public async Task<IActionResult> OnPostRunNowAsync(Guid jobId)
        {
            var (success, message, duration) = await _orchestrator.TriggerJobNowAsync(jobId);
            if (success)
            {
                TempData["Success"] = $"Job executed successfully in {duration}ms: {message}";
            }
            else
            {
                TempData["Error"] = $"Job execution failed ({duration}ms): {message}";
            }

            return RedirectToPage(new { jobId });
        }

        /// <summary>
        /// Handles toggling job state from the details page.
        /// </summary>
        public async Task<IActionResult> OnPostToggleStateAsync(Guid jobId, bool enable)
        {
            var updated = await _orchestrator.ToggleJobStateAsync(jobId, enable);
            if (updated)
            {
                TempData["Success"] = enable ? "Background job resumed." : "Background job paused.";
            }

            return RedirectToPage(new { jobId });
        }
    }
}
