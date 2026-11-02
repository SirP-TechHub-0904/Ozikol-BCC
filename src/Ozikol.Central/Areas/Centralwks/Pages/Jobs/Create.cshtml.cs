using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.AspNetCore.Mvc.Rendering;
using Microsoft.EntityFrameworkCore;
using Ozikol.Central.Services.Jobs;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Areas.Centralwks.Pages.Jobs
{
    /// <summary>
    /// Page model for registering new Central platform or Tenant project background jobs.
    /// </summary>
    [Authorize]
    public class CreateModel : PageModel
    {
        private readonly MasterCatalogDbContext _masterCatalogDbContext;
        private readonly IEnumerable<IBackgroundJobHandler> _handlers;

        /// <summary>
        /// Initializes a new instance of the <see cref="CreateModel"/> class.
        /// </summary>
        /// <param name="masterCatalogDbContext">Master Catalog database context.</param>
        /// <param name="handlers">Registered background job handlers.</param>
        public CreateModel(
            MasterCatalogDbContext masterCatalogDbContext,
            IEnumerable<IBackgroundJobHandler> handlers)
        {
            _masterCatalogDbContext = masterCatalogDbContext;
            _handlers = handlers;
        }

        /// <summary>
        /// Input model containing job registration fields.
        /// </summary>
        [BindProperty]
        public CreateJobInputModel Input { get; set; } = new CreateJobInputModel();

        /// <summary>
        /// List of available tenant organizations for selection.
        /// </summary>
        public List<SelectListItem> TenantOptions { get; set; } = new List<SelectListItem>();

        /// <summary>
        /// List of registered job handlers.
        /// </summary>
        public List<IBackgroundJobHandler> AvailableHandlers { get; set; } = new List<IBackgroundJobHandler>();

        /// <summary>
        /// Handles HTTP GET requests to populate dropdown options.
        /// </summary>
        public async Task<IActionResult> OnGetAsync()
        {
            await PopulateDropdownsAsync();
            return Page();
        }

        /// <summary>
        /// Handles HTTP POST requests to validate and save the new background job.
        /// </summary>
        public async Task<IActionResult> OnPostAsync()
        {
            if (!ModelState.IsValid)
            {
                await PopulateDropdownsAsync();
                return Page();
            }

            var cleanKey = Input.JobKey.Trim().ToLowerInvariant();

            // Check if job key already exists for this scope/tenant
            var existing = await _masterCatalogDbContext.MasterBackgroundJobs
                .AnyAsync(j => j.JobKey == cleanKey && j.TargetTenantCatalogId == Input.TargetTenantCatalogId);

            if (existing)
            {
                ModelState.AddModelError("Input.JobKey", $"A background job with key '{cleanKey}' is already registered for this target.");
                await PopulateDropdownsAsync();
                return Page();
            }

            var now = DateTime.UtcNow;
            var job = new MasterBackgroundJob
            {
                Id = Guid.NewGuid(),
                JobKey = cleanKey,
                Name = Input.Name.Trim(),
                Description = Input.Description?.Trim(),
                Category = string.IsNullOrWhiteSpace(Input.Category) ? "General" : Input.Category.Trim(),
                Scope = Input.Scope,
                TargetTenantCatalogId = Input.Scope == BackgroundJobScope.Tenant ? Input.TargetTenantCatalogId : null,
                IntervalSeconds = Input.IntervalSeconds > 0 ? Input.IntervalSeconds : 3600,
                ScheduleCron = string.IsNullOrWhiteSpace(Input.ScheduleCron) ? null : Input.ScheduleCron.Trim(),
                JobParametersJson = string.IsNullOrWhiteSpace(Input.JobParametersJson) ? null : Input.JobParametersJson.Trim(),
                IsEnabled = Input.IsEnabled,
                Status = Input.IsEnabled ? BackgroundJobStatus.Idle : BackgroundJobStatus.Paused,
                CreatedUtc = now,
                NextRunUtc = Input.IsEnabled ? now.AddSeconds(10) : null
            };

            _masterCatalogDbContext.MasterBackgroundJobs.Add(job);
            await _masterCatalogDbContext.SaveChangesAsync();

            TempData["Success"] = $"Background job '{job.Name}' registered successfully.";
            return RedirectToPage("/Jobs/Index");
        }

        private async Task PopulateDropdownsAsync()
        {
            AvailableHandlers = _handlers.ToList();

            var tenants = await _masterCatalogDbContext.MasterTenantCatalogs
                .Where(t => t.IsActive)
                .OrderBy(t => t.OrganizationName)
                .Select(t => new { t.Id, t.OrganizationName, t.TenantKey })
                .ToListAsync();

            TenantOptions = new List<SelectListItem>
            {
                new SelectListItem("All Active Tenants (Global Execution)", "")
            };

            TenantOptions.AddRange(tenants.Select(t => new SelectListItem($"{t.OrganizationName} ({t.TenantKey})", t.Id.ToString())));
        }

        /// <summary>
        /// Input model validation for creating a background job.
        /// </summary>
        public class CreateJobInputModel
        {
            [Required(ErrorMessage = "Please enter or select a job key")]
            [MaxLength(100)]
            [Display(Name = "Job Key / Handler")]
            public string JobKey { get; set; } = string.Empty;

            [Required(ErrorMessage = "Please enter a descriptive name")]
            [MaxLength(150)]
            [Display(Name = "Job Display Name")]
            public string Name { get; set; } = string.Empty;

            [MaxLength(500)]
            [Display(Name = "Description")]
            public string? Description { get; set; }

            [MaxLength(100)]
            [Display(Name = "Category")]
            public string Category { get; set; } = "Tenant Operations";

            [Required]
            [Display(Name = "Operational Scope")]
            public BackgroundJobScope Scope { get; set; } = BackgroundJobScope.Tenant;

            [Display(Name = "Target Tenant Organization")]
            public int? TargetTenantCatalogId { get; set; }

            [Display(Name = "Execution Interval (Seconds)")]
            public int IntervalSeconds { get; set; } = 3600;

            [MaxLength(50)]
            [Display(Name = "Cron Schedule (Optional)")]
            public string? ScheduleCron { get; set; }

            [Display(Name = "Job Parameters (JSON)")]
            public string? JobParametersJson { get; set; }

            [Display(Name = "Enable Immediately")]
            public bool IsEnabled { get; set; } = true;
        }
    }
}
