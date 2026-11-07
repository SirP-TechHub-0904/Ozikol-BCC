using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Ozikol.Central.Services.AppBuilder;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Areas.Centralwks.Pages.AppBuilder
{
    /// <summary>
    /// Page model for the Central App Builder Hub.
    /// Manages automated cloud builds for Windows Workstations (.exe) and Android Mobile (.apk, .aab)
    /// across General (multi-tenant) and dedicated Tenant White-Label releases via GitHub Actions.
    /// </summary>
    public class IndexModel : PageModel
    {
        private readonly MasterCatalogDbContext _dbContext;
        private readonly IAppBuilderDispatcherService _dispatcher;
        private readonly ILogger<IndexModel> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="IndexModel"/> class.
        /// </summary>
        public IndexModel(
            MasterCatalogDbContext dbContext,
            IAppBuilderDispatcherService dispatcher,
            ILogger<IndexModel> logger)
        {
            _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
            _dispatcher = dispatcher ?? throw new ArgumentNullException(nameof(dispatcher));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>Gets or sets the filtered builds history list.</summary>
        public List<MasterTenantAppBuild> Builds { get; set; } = new();

        /// <summary>Gets or sets active tenants available for white-label builds.</summary>
        public List<MasterTenantCatalog> Tenants { get; set; } = new();

        /// <summary>Gets or sets the platform settings for GitHub configuration.</summary>
        public MasterPlatformSetting? PlatformSettings { get; set; }

        /// <summary>Gets or sets the input model for triggering a new build.</summary>
        [BindProperty]
        public BuildTriggerInputModel BuildInput { get; set; } = new();

        /// <summary>Gets or sets the settings input model.</summary>
        [BindProperty]
        public AppBuilderSettingsInputModel SettingsInput { get; set; } = new();

        /// <summary>Filter by platform.</summary>
        [BindProperty(SupportsGet = true)]
        public string? FilterPlatform { get; set; }

        /// <summary>Filter by status.</summary>
        [BindProperty(SupportsGet = true)]
        public string? FilterStatus { get; set; }

        /// <summary>Filter by tenant.</summary>
        [BindProperty(SupportsGet = true)]
        public string? FilterTenant { get; set; }

        /// <summary>Status feedback toast message.</summary>
        [TempData]
        public string? StatusMessage { get; set; }

        /// <summary>Error feedback toast message.</summary>
        [TempData]
        public string? ErrorMessage { get; set; }

        /// <summary>KPI: Total builds count.</summary>
        public int TotalBuildsCount { get; set; }

        /// <summary>KPI: Windows builds count.</summary>
        public int WindowsBuildsCount { get; set; }

        /// <summary>KPI: Android builds count.</summary>
        public int AndroidBuildsCount { get; set; }

        /// <summary>KPI: In-progress / building count.</summary>
        public int ActiveBuildingCount { get; set; }

        /// <summary>Indicates if GitHub PAT is configured.</summary>
        public bool IsGitHubConfigured { get; set; }

        /// <summary>
        /// Handles HTTP GET requests to load builds, metrics, and tenants.
        /// </summary>
        public async Task OnGetAsync()
        {
            PlatformSettings = await _dbContext.MasterPlatformSettings.FirstOrDefaultAsync(s => s.Id == 1);
            IsGitHubConfigured = await _dispatcher.IsConfiguredAsync();

            Tenants = await _dbContext.MasterTenantCatalogs
                .AsNoTracking()
                .OrderBy(t => t.OrganizationName)
                .ToListAsync();

            var query = _dbContext.MasterTenantAppBuilds.AsNoTracking().AsQueryable();

            TotalBuildsCount = await query.CountAsync();
            WindowsBuildsCount = await query.CountAsync(b => b.Platform == "WindowsExe");
            AndroidBuildsCount = await query.CountAsync(b => b.Platform == "AndroidApk" || b.Platform == "AndroidAab");
            ActiveBuildingCount = await query.CountAsync(b => b.Status == "Queued" || b.Status == "Building");

            if (!string.IsNullOrWhiteSpace(FilterPlatform))
            {
                query = query.Where(b => b.Platform == FilterPlatform);
            }
            if (!string.IsNullOrWhiteSpace(FilterStatus))
            {
                query = query.Where(b => b.Status == FilterStatus);
            }
            if (!string.IsNullOrWhiteSpace(FilterTenant))
            {
                query = query.Where(b => b.TenantKey == FilterTenant);
            }

            Builds = await query
                .OrderByDescending(b => b.CreatedAtUtc)
                .Take(100)
                .ToListAsync();

            if (PlatformSettings != null)
            {
                SettingsInput.GitHubAppBuilderToken = PlatformSettings.GitHubAppBuilderToken;
                SettingsInput.GitHubAppBuilderOwner = PlatformSettings.GitHubAppBuilderOwner ?? "SirP-TechHub-0904";
                SettingsInput.GitHubAppBuilderRepo = PlatformSettings.GitHubAppBuilderRepo ?? "Ozikol-BCC";
                SettingsInput.GitHubAppBuilderWorkflow = PlatformSettings.GitHubAppBuilderWorkflow ?? "build-tenant-apps.yml";
                SettingsInput.AppBuilderDownloadBaseUrl = PlatformSettings.AppBuilderDownloadBaseUrl ?? "/downloads/builds";
            }
        }

        /// <summary>
        /// Handles triggering new build workflows.
        /// </summary>
        public async Task<IActionResult> OnPostTriggerBuildAsync()
        {
            if (!ModelState.IsValid)
            {
                ErrorMessage = "Please correct the form inputs before submitting.";
                await OnGetAsync();
                return Page();
            }

            if (!BuildInput.BuildWindows && !BuildInput.BuildAndroid)
            {
                ErrorMessage = "Please select at least one target platform (Windows Workstation or Android Mobile).";
                await OnGetAsync();
                return Page();
            }

            var isWhiteLabel = BuildInput.AppMode?.ToLowerInvariant() == "whitelabel";
            var tenantKey = isWhiteLabel ? (BuildInput.TenantKey?.Trim().ToLowerInvariant() ?? "custom") : "global";
            var brandName = isWhiteLabel ? (BuildInput.BrandName?.Trim() ?? "Workspace Command Center") : "Ozikol Business Command Center";
            var version = string.IsNullOrWhiteSpace(BuildInput.Version) ? "1.0.0" : BuildInput.Version.Trim();
            var buildNumber = BuildInput.BuildNumber > 0 ? BuildInput.BuildNumber : 1;

            Guid? tenantId = null;
            string? primaryDomain = BuildInput.PrimaryDomain?.Trim();
            string? apiUrl = BuildInput.ApiBaseUrl?.Trim();

            if (isWhiteLabel && !string.IsNullOrWhiteSpace(tenantKey))
            {
                var tenant = await _dbContext.MasterTenantCatalogs.FirstOrDefaultAsync(t => t.TenantKey == tenantKey);
                if (tenant != null)
                {
                    tenantId = tenant.Id;
                    if (string.IsNullOrWhiteSpace(brandName) || brandName == "Workspace Command Center")
                        brandName = tenant.OrganizationName;
                    if (string.IsNullOrWhiteSpace(primaryDomain))
                        primaryDomain = tenant.CustomDomain ?? tenant.PrimaryDomain;
                    if (string.IsNullOrWhiteSpace(apiUrl))
                        apiUrl = tenant.ApiUrl;
                }
            }

            if (string.IsNullOrWhiteSpace(apiUrl))
            {
                apiUrl = "https://api.ozikol.cloud";
            }

            var createdBuilds = new List<MasterTenantAppBuild>();
            var callbackBaseUrl = $"{Request.Scheme}://{Request.Host}";

            // Create Windows build record if selected
            if (BuildInput.BuildWindows)
            {
                var winBuild = new MasterTenantAppBuild
                {
                    Id = Guid.NewGuid(),
                    AppMode = isWhiteLabel ? "WhiteLabel" : "General",
                    TenantId = tenantId,
                    TenantKey = tenantKey,
                    BrandName = brandName,
                    Platform = "WindowsExe",
                    Version = version,
                    BuildNumber = buildNumber,
                    ApiBaseUrl = apiUrl,
                    PrimaryDomain = primaryDomain,
                    Status = "Queued",
                    TriggeredBy = User.Identity?.Name ?? "Admin",
                    CreatedAtUtc = DateTime.UtcNow
                };
                _dbContext.MasterTenantAppBuilds.Add(winBuild);
                createdBuilds.Add(winBuild);
            }

            // Create Android build record if selected
            if (BuildInput.BuildAndroid)
            {
                var androidBuild = new MasterTenantAppBuild
                {
                    Id = Guid.NewGuid(),
                    AppMode = isWhiteLabel ? "WhiteLabel" : "General",
                    TenantId = tenantId,
                    TenantKey = tenantKey,
                    BrandName = brandName,
                    Platform = "AndroidApk",
                    Version = version,
                    BuildNumber = buildNumber,
                    ApiBaseUrl = apiUrl,
                    PrimaryDomain = primaryDomain,
                    Status = "Queued",
                    TriggeredBy = User.Identity?.Name ?? "Admin",
                    CreatedAtUtc = DateTime.UtcNow
                };
                _dbContext.MasterTenantAppBuilds.Add(androidBuild);
                createdBuilds.Add(androidBuild);
            }

            await _dbContext.SaveChangesAsync();

            // Dispatch to GitHub Actions
            var primaryJob = createdBuilds.First();
            var dispatchResult = await _dispatcher.DispatchBuildAsync(primaryJob, callbackBaseUrl);

            if (dispatchResult.Success)
            {
                foreach (var b in createdBuilds)
                {
                    b.Status = "Building";
                    b.StartedAtUtc = DateTime.UtcNow;
                    b.GitHubRunUrl = dispatchResult.WorkflowUrl;
                }
                await _dbContext.SaveChangesAsync();

                StatusMessage = $"Build workflow dispatched to GitHub Actions successfully! Track execution on the builds table.";
            }
            else
            {
                foreach (var b in createdBuilds)
                {
                    b.Status = "Failed";
                    b.ErrorMessage = dispatchResult.ErrorMessage;
                    b.CompletedAtUtc = DateTime.UtcNow;
                }
                await _dbContext.SaveChangesAsync();

                ErrorMessage = $"Build job queued, but GitHub Actions dispatch failed: {dispatchResult.ErrorMessage}";
            }

            return RedirectToPage();
        }

        /// <summary>
        /// Handles updating GitHub App Builder settings.
        /// </summary>
        public async Task<IActionResult> OnPostSaveSettingsAsync()
        {
            var settings = await _dbContext.MasterPlatformSettings.FirstOrDefaultAsync(s => s.Id == 1);
            if (settings == null)
            {
                settings = new MasterPlatformSetting { Id = 1, PlatformName = "Ozikol" };
                _dbContext.MasterPlatformSettings.Add(settings);
            }

            if (!string.IsNullOrWhiteSpace(SettingsInput.GitHubAppBuilderToken))
            {
                settings.GitHubAppBuilderToken = SettingsInput.GitHubAppBuilderToken.Trim();
            }
            settings.GitHubAppBuilderOwner = SettingsInput.GitHubAppBuilderOwner?.Trim() ?? "SirP-TechHub-0904";
            settings.GitHubAppBuilderRepo = SettingsInput.GitHubAppBuilderRepo?.Trim() ?? "Ozikol-BCC";
            settings.GitHubAppBuilderWorkflow = SettingsInput.GitHubAppBuilderWorkflow?.Trim() ?? "build-tenant-apps.yml";
            settings.AppBuilderDownloadBaseUrl = SettingsInput.AppBuilderDownloadBaseUrl?.Trim() ?? "/downloads/builds";
            settings.UpdatedUtc = DateTime.UtcNow;

            await _dbContext.SaveChangesAsync();
            StatusMessage = "GitHub App Builder configuration updated successfully.";
            return RedirectToPage();
        }

        /// <summary>
        /// Handles deleting a build record from history.
        /// </summary>
        public async Task<IActionResult> OnPostDeleteBuildAsync(Guid id)
        {
            var record = await _dbContext.MasterTenantAppBuilds.FindAsync(id);
            if (record != null)
            {
                _dbContext.MasterTenantAppBuilds.Remove(record);
                await _dbContext.SaveChangesAsync();
                StatusMessage = "Build record deleted from history.";
            }
            return RedirectToPage();
        }

        /// <summary>
        /// Form input model for requesting a new cloud build.
        /// </summary>
        public class BuildTriggerInputModel
        {
            /// <summary>Mode: "whitelabel" or "general".</summary>
            [Required]
            public string AppMode { get; set; } = "whitelabel";

            /// <summary>Target tenant key when in whitelabel mode.</summary>
            public string? TenantKey { get; set; }

            /// <summary>Brand name for title bar and setup files.</summary>
            public string? BrandName { get; set; }

            /// <summary>Semantic version.</summary>
            [Required]
            public string Version { get; set; } = "1.0.0";

            /// <summary>Build sequence integer.</summary>
            public int BuildNumber { get; set; } = 1;

            /// <summary>API base URL baked into binary.</summary>
            public string? ApiBaseUrl { get; set; }

            /// <summary>Primary custom domain.</summary>
            public string? PrimaryDomain { get; set; }

            /// <summary>Flag to compile Windows .exe.</summary>
            public bool BuildWindows { get; set; } = true;

            /// <summary>Flag to compile Android .apk & .aab.</summary>
            public bool BuildAndroid { get; set; } = true;
        }

        /// <summary>
        /// Form input model for configuring GitHub App Builder credentials.
        /// </summary>
        public class AppBuilderSettingsInputModel
        {
            /// <summary>GitHub Personal Access Token.</summary>
            public string? GitHubAppBuilderToken { get; set; }

            /// <summary>GitHub repository owner.</summary>
            public string? GitHubAppBuilderOwner { get; set; }

            /// <summary>GitHub repository name.</summary>
            public string? GitHubAppBuilderRepo { get; set; }

            /// <summary>GitHub workflow file name.</summary>
            public string? GitHubAppBuilderWorkflow { get; set; }

            /// <summary>Public downloads base URL.</summary>
            public string? AppBuilderDownloadBaseUrl { get; set; }
        }
    }
}
