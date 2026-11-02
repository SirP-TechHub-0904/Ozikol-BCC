using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Areas.Centralwks.Pages.AppReleases
{
    /// <summary>
    /// Page model for managing desktop and mobile client releases, in-app update metadata,
    /// mandatory version thresholds, and direct package distribution channels.
    /// </summary>
    public class IndexModel : PageModel
    {
        private readonly MasterCatalogDbContext _dbContext;
        private readonly ILogger<IndexModel> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="IndexModel"/> class.
        /// </summary>
        public IndexModel(MasterCatalogDbContext dbContext, ILogger<IndexModel> logger)
        {
            _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <summary>Gets or sets the filtered releases list.</summary>
        public List<MasterClientRelease> Releases { get; set; } = new();

        /// <summary>Gets or sets the selected platform filter.</summary>
        [BindProperty(SupportsGet = true)]
        public string? SelectedPlatform { get; set; }

        /// <summary>Gets or sets the selected channel filter.</summary>
        [BindProperty(SupportsGet = true)]
        public string? SelectedChannel { get; set; }

        /// <summary>Gets or sets the input model for creating/editing a release.</summary>
        [BindProperty]
        public ReleaseInputModel Input { get; set; } = new();

        /// <summary>Gets or sets status feedback message.</summary>
        [TempData]
        public string? StatusMessage { get; set; }

        /// <summary>Gets or sets error message.</summary>
        [TempData]
        public string? ErrorMessage { get; set; }

        /// <summary>Total releases count across all platforms.</summary>
        public int TotalReleasesCount { get; set; }

        /// <summary>Windows platform releases count.</summary>
        public int WindowsReleasesCount { get; set; }

        /// <summary>Android platform releases count.</summary>
        public int AndroidReleasesCount { get; set; }

        /// <summary>macOS platform releases count.</summary>
        public int MacOsReleasesCount { get; set; }

        /// <summary>iOS platform releases count.</summary>
        public int IosReleasesCount { get; set; }

        /// <summary>
        /// Form binding model for creating or updating a client application release.
        /// </summary>
        public class ReleaseInputModel
        {
            /// <summary>Gets or sets release ID when editing.</summary>
            public Guid? Id { get; set; }

            /// <summary>Gets or sets target platform (windows, macos, linux, android, ios, web).</summary>
            [Required(ErrorMessage = "Platform is required.")]
            [MaxLength(50)]
            public string Platform { get; set; } = "windows";

            /// <summary>Gets or sets distribution channel (stable, beta, canary).</summary>
            [Required(ErrorMessage = "Channel is required.")]
            [MaxLength(50)]
            public string Channel { get; set; } = "stable";

            /// <summary>Gets or sets semantic version string (e.g. 1.0.0).</summary>
            [Required(ErrorMessage = "Version is required (e.g. 1.0.0).")]
            [MaxLength(50)]
            public string Version { get; set; } = string.Empty;

            /// <summary>Gets or sets sequential build number.</summary>
            [Required(ErrorMessage = "Build number is required.")]
            [Range(1, int.MaxValue, ErrorMessage = "Build number must be at least 1.")]
            public int BuildNumber { get; set; } = 1;

            /// <summary>Gets or sets minimum supported version before mandatory upgrade.</summary>
            [MaxLength(50)]
            public string MinSupportedVersion { get; set; } = "1.0.0";

            /// <summary>Gets or sets direct binary installer or store download URL.</summary>
            [Required(ErrorMessage = "Download URL is required.")]
            [MaxLength(1000)]
            [Url(ErrorMessage = "Please provide a valid URL.")]
            public string DownloadUrl { get; set; } = string.Empty;

            /// <summary>Gets or sets cryptographic SHA-256 checksum for verification.</summary>
            [MaxLength(128)]
            public string? Sha256Checksum { get; set; }

            /// <summary>Gets or sets payload size in bytes.</summary>
            public long FileSizeBytes { get; set; }

            /// <summary>Gets or sets whether this release is mandatory.</summary>
            public bool IsMandatory { get; set; } = false;

            /// <summary>Gets or sets whether this release is active and eligible for distribution.</summary>
            public bool IsActive { get; set; } = true;

            /// <summary>Gets or sets release notes and changelog.</summary>
            [MaxLength(4000)]
            public string? ReleaseNotes { get; set; }
        }

        /// <summary>
        /// Handles HTTP GET request to load filtered client releases and statistics.
        /// </summary>
        public async Task OnGetAsync()
        {
            var query = _dbContext.MasterClientReleases.AsNoTracking().AsQueryable();

            TotalReleasesCount = await query.CountAsync();
            WindowsReleasesCount = await query.CountAsync(r => r.Platform == "windows");
            AndroidReleasesCount = await query.CountAsync(r => r.Platform == "android");
            MacOsReleasesCount = await query.CountAsync(r => r.Platform == "macos");
            IosReleasesCount = await query.CountAsync(r => r.Platform == "ios");

            if (!string.IsNullOrWhiteSpace(SelectedPlatform) && SelectedPlatform != "all")
            {
                query = query.Where(r => r.Platform == SelectedPlatform.ToLowerInvariant());
            }

            if (!string.IsNullOrWhiteSpace(SelectedChannel) && SelectedChannel != "all")
            {
                query = query.Where(r => r.Channel == SelectedChannel.ToLowerInvariant());
            }

            Releases = await query
                .OrderByDescending(r => r.PublishedAtUtc)
                .ToListAsync();
        }

        /// <summary>
        /// Handles HTTP POST request to create or update an app release.
        /// </summary>
        public async Task<IActionResult> OnPostSaveReleaseAsync()
        {
            if (!ModelState.IsValid)
            {
                ErrorMessage = "Please correct the form validation errors.";
                await OnGetAsync();
                return Page();
            }

            if (Input.Id.HasValue && Input.Id.Value != Guid.Empty)
            {
                var existing = await _dbContext.MasterClientReleases.FirstOrDefaultAsync(r => r.Id == Input.Id.Value);
                if (existing == null)
                {
                    ErrorMessage = "Release not found.";
                    return RedirectToPage();
                }

                existing.Platform = Input.Platform.Trim().ToLowerInvariant();
                existing.Channel = Input.Channel.Trim().ToLowerInvariant();
                existing.Version = Input.Version.Trim();
                existing.BuildNumber = Input.BuildNumber;
                existing.MinSupportedVersion = string.IsNullOrWhiteSpace(Input.MinSupportedVersion) ? "1.0.0" : Input.MinSupportedVersion.Trim();
                existing.DownloadUrl = Input.DownloadUrl.Trim();
                existing.Sha256Checksum = Input.Sha256Checksum?.Trim() ?? string.Empty;
                existing.FileSizeBytes = Input.FileSizeBytes;
                existing.IsMandatory = Input.IsMandatory;
                existing.IsActive = Input.IsActive;
                existing.ReleaseNotes = Input.ReleaseNotes?.Trim() ?? string.Empty;

                await _dbContext.SaveChangesAsync();
                _logger.LogInformation("Updated client release {Version} ({Platform})", existing.Version, existing.Platform);
                StatusMessage = $"Release {existing.Version} ({existing.Platform}) updated successfully.";
            }
            else
            {
                var newRelease = new MasterClientRelease
                {
                    Id = Guid.NewGuid(),
                    Platform = Input.Platform.Trim().ToLowerInvariant(),
                    Channel = Input.Channel.Trim().ToLowerInvariant(),
                    Version = Input.Version.Trim(),
                    BuildNumber = Input.BuildNumber,
                    MinSupportedVersion = string.IsNullOrWhiteSpace(Input.MinSupportedVersion) ? "1.0.0" : Input.MinSupportedVersion.Trim(),
                    DownloadUrl = Input.DownloadUrl.Trim(),
                    Sha256Checksum = Input.Sha256Checksum?.Trim() ?? string.Empty,
                    FileSizeBytes = Input.FileSizeBytes,
                    IsMandatory = Input.IsMandatory,
                    IsActive = Input.IsActive,
                    ReleaseNotes = Input.ReleaseNotes?.Trim() ?? string.Empty,
                    PublishedAtUtc = DateTime.UtcNow,
                    CreatedAtUtc = DateTime.UtcNow
                };

                _dbContext.MasterClientReleases.Add(newRelease);
                await _dbContext.SaveChangesAsync();
                _logger.LogInformation("Created new client release {Version} ({Platform})", newRelease.Version, newRelease.Platform);
                StatusMessage = $"New release {newRelease.Version} ({newRelease.Platform}) published successfully.";
            }

            return RedirectToPage(new { platform = SelectedPlatform, channel = SelectedChannel });
        }

        /// <summary>
        /// Handles HTTP POST request to toggle active status for a release.
        /// </summary>
        public async Task<IActionResult> OnPostToggleActiveAsync(Guid id)
        {
            var release = await _dbContext.MasterClientReleases.FirstOrDefaultAsync(r => r.Id == id);
            if (release != null)
            {
                release.IsActive = !release.IsActive;
                await _dbContext.SaveChangesAsync();
                StatusMessage = $"Release {release.Version} ({release.Platform}) is now {(release.IsActive ? "active" : "inactive")}.";
            }
            return RedirectToPage(new { platform = SelectedPlatform, channel = SelectedChannel });
        }

        /// <summary>
        /// Handles HTTP POST request to toggle mandatory status for a release.
        /// </summary>
        public async Task<IActionResult> OnPostToggleMandatoryAsync(Guid id)
        {
            var release = await _dbContext.MasterClientReleases.FirstOrDefaultAsync(r => r.Id == id);
            if (release != null)
            {
                release.IsMandatory = !release.IsMandatory;
                await _dbContext.SaveChangesAsync();
                StatusMessage = $"Release {release.Version} ({release.Platform}) marked as {(release.IsMandatory ? "mandatory" : "optional")}.";
            }
            return RedirectToPage(new { platform = SelectedPlatform, channel = SelectedChannel });
        }

        /// <summary>
        /// Handles HTTP POST request to delete a release.
        /// </summary>
        public async Task<IActionResult> OnPostDeleteAsync(Guid id)
        {
            var release = await _dbContext.MasterClientReleases.FirstOrDefaultAsync(r => r.Id == id);
            if (release != null)
            {
                _dbContext.MasterClientReleases.Remove(release);
                await _dbContext.SaveChangesAsync();
                StatusMessage = $"Release {release.Version} ({release.Platform}) was deleted.";
            }
            return RedirectToPage(new { platform = SelectedPlatform, channel = SelectedChannel });
        }
    }
}
