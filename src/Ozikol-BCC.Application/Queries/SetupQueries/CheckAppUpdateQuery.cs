using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol_BCC.Application.Queries.SetupQueries
{
    /// <summary>
    /// Data transfer object representing the result of an in-app update check.
    /// Distributed to Flutter Mobile, Flutter Desktop, and Web clients.
    /// </summary>
    public class AppUpdateCheckResultDto
    {
        /// <summary>
        /// Gets or sets a value indicating whether a newer version or build is available.
        /// </summary>
        public bool HasUpdate { get; set; }

        /// <summary>
        /// Gets or sets a value indicating whether the update is mandatory (blocks usage until applied).
        /// True if the current client version is below the minimum supported version or the release is marked mandatory.
        /// </summary>
        public bool IsMandatory { get; set; }

        /// <summary>
        /// Gets or sets the latest available semantic version string (e.g. "1.1.0").
        /// </summary>
        public string LatestVersion { get; set; } = "1.0.0";

        /// <summary>
        /// Gets or sets the latest sequential build number (e.g. 26).
        /// </summary>
        public int LatestBuildNumber { get; set; }

        /// <summary>
        /// Gets or sets the minimum supported version required by the API.
        /// </summary>
        public string MinSupportedVersion { get; set; } = "1.0.0";

        /// <summary>
        /// Gets or sets markdown-formatted release notes and changelog.
        /// </summary>
        public string ReleaseNotes { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the direct download URL for the package installer or app store redirect.
        /// </summary>
        public string DownloadUrl { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the cryptographic SHA-256 hash for verifying the integrity of downloaded binaries.
        /// </summary>
        public string Sha256Checksum { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the installer binary payload size in bytes.
        /// </summary>
        public long FileSizeBytes { get; set; }

        /// <summary>
        /// Gets or sets the publication timestamp in UTC.
        /// </summary>
        public DateTime? PublishedAtUtc { get; set; }

        /// <summary>
        /// Gets or sets the target platform ("windows", "macos", "linux", "android", "ios", "web").
        /// </summary>
        public string Platform { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the release distribution channel ("stable", "beta", "canary").
        /// </summary>
        public string Channel { get; set; } = "stable";
    }

    /// <summary>
    /// Query requesting an update evaluation for a specific client platform, version, and build.
    /// </summary>
    public class CheckAppUpdateQuery : IRequest<AppUpdateCheckResultDto>
    {
        /// <summary>
        /// Gets the client operating system platform ("windows", "macos", "linux", "android", "ios", "web").
        /// </summary>
        public string Platform { get; }

        /// <summary>
        /// Gets the current running application semantic version (e.g. "1.0.0").
        /// </summary>
        public string CurrentVersion { get; }

        /// <summary>
        /// Gets the current running application build number.
        /// </summary>
        public int CurrentBuildNumber { get; }

        /// <summary>
        /// Gets the requested distribution channel ("stable", "beta", "canary").
        /// </summary>
        public string Channel { get; }

        /// <summary>
        /// Initializes a new instance of the <see cref="CheckAppUpdateQuery"/> class.
        /// </summary>
        /// <param name="platform">Client OS platform.</param>
        /// <param name="currentVersion">Current running client version.</param>
        /// <param name="currentBuildNumber">Current running build number.</param>
        /// <param name="channel">Target release channel (defaults to "stable").</param>
        public CheckAppUpdateQuery(string platform, string currentVersion, int currentBuildNumber, string channel = "stable")
        {
            Platform = platform?.Trim().ToLowerInvariant() ?? "windows";
            CurrentVersion = currentVersion?.Trim() ?? "1.0.0";
            CurrentBuildNumber = currentBuildNumber;
            Channel = string.IsNullOrWhiteSpace(channel) ? "stable" : channel.Trim().ToLowerInvariant();
        }
    }

    /// <summary>
    /// Handler executing semantic version evaluation against the Central Master Catalog releases.
    /// </summary>
    public class CheckAppUpdateQueryHandler : IRequestHandler<CheckAppUpdateQuery, AppUpdateCheckResultDto>
    {
        private readonly MasterCatalogDbContext? _masterContext;

        /// <summary>
        /// Initializes a new instance of the <see cref="CheckAppUpdateQueryHandler"/> class.
        /// </summary>
        /// <param name="masterContext">Central master catalog database context.</param>
        public CheckAppUpdateQueryHandler(MasterCatalogDbContext? masterContext = null)
        {
            _masterContext = masterContext;
        }

        /// <summary>
        /// Handles the update evaluation and determines whether flexible or mandatory update is required.
        /// </summary>
        /// <param name="request">Update check query parameters.</param>
        /// <param name="cancellationToken">Cancellation token.</param>
        /// <returns>A populated <see cref="AppUpdateCheckResultDto"/>.</returns>
        public async Task<AppUpdateCheckResultDto> Handle(CheckAppUpdateQuery request, CancellationToken cancellationToken)
        {
            var fallback = new AppUpdateCheckResultDto
            {
                HasUpdate = false,
                IsMandatory = false,
                LatestVersion = request.CurrentVersion,
                LatestBuildNumber = request.CurrentBuildNumber,
                Platform = request.Platform,
                Channel = request.Channel
            };

            if (_masterContext == null)
            {
                return fallback;
            }

            try
            {
                // Query active releases for target platform and channel, descending by publication date
                var latestRelease = await _masterContext.MasterClientReleases
                    .AsNoTracking()
                    .Where(r => r.IsActive &&
                                r.Platform.ToLower() == request.Platform &&
                                r.Channel.ToLower() == request.Channel)
                    .OrderByDescending(r => r.PublishedAtUtc)
                    .FirstOrDefaultAsync(cancellationToken);

                if (latestRelease == null)
                {
                    return fallback;
                }

                var hasNewerVersion = CompareVersions(latestRelease.Version, latestRelease.BuildNumber, request.CurrentVersion, request.CurrentBuildNumber) > 0;
                var isMandatory = latestRelease.IsMandatory ||
                                  (!string.IsNullOrWhiteSpace(latestRelease.MinSupportedVersion) &&
                                   CompareSemVer(request.CurrentVersion, latestRelease.MinSupportedVersion) < 0);

                return new AppUpdateCheckResultDto
                {
                    HasUpdate = hasNewerVersion,
                    IsMandatory = isMandatory,
                    LatestVersion = latestRelease.Version,
                    LatestBuildNumber = latestRelease.BuildNumber,
                    MinSupportedVersion = latestRelease.MinSupportedVersion,
                    ReleaseNotes = latestRelease.ReleaseNotes,
                    DownloadUrl = latestRelease.DownloadUrl,
                    Sha256Checksum = latestRelease.Sha256Checksum,
                    FileSizeBytes = latestRelease.FileSizeBytes,
                    PublishedAtUtc = latestRelease.PublishedAtUtc,
                    Platform = latestRelease.Platform,
                    Channel = latestRelease.Channel
                };
            }
            catch
            {
                return fallback;
            }
        }

        /// <summary>
        /// Compares two version strings along with build numbers.
        /// Returns 1 if v1 is newer, -1 if v2 is newer, and 0 if equal.
        /// </summary>
        public static int CompareVersions(string v1, int build1, string v2, int build2)
        {
            var semVerComparison = CompareSemVer(v1, v2);
            if (semVerComparison != 0)
            {
                return semVerComparison;
            }

            return build1.CompareTo(build2);
        }

        /// <summary>
        /// Compares two standard semantic version strings (e.g., "1.2.0" vs "1.1.9").
        /// </summary>
        public static int CompareSemVer(string v1, string v2)
        {
            if (string.IsNullOrWhiteSpace(v1) && string.IsNullOrWhiteSpace(v2)) return 0;
            if (string.IsNullOrWhiteSpace(v1)) return -1;
            if (string.IsNullOrWhiteSpace(v2)) return 1;

            // Strip pre-release or build suffixes for base comparison (e.g. "1.1.0-beta" -> "1.1.0")
            var clean1 = v1.Split('-', '+')[0];
            var clean2 = v2.Split('-', '+')[0];

            if (Version.TryParse(clean1, out var parsed1) && Version.TryParse(clean2, out var parsed2))
            {
                return parsed1.CompareTo(parsed2);
            }

            var parts1 = clean1.Split('.').Select(p => int.TryParse(p, out var n) ? n : 0).ToArray();
            var parts2 = clean2.Split('.').Select(p => int.TryParse(p, out var n) ? n : 0).ToArray();

            var maxLen = Math.Max(parts1.Length, parts2.Length);
            for (var i = 0; i < maxLen; i++)
            {
                var val1 = i < parts1.Length ? parts1[i] : 0;
                var val2 = i < parts2.Length ? parts2[i] : 0;
                if (val1 > val2) return 1;
                if (val1 < val2) return -1;
            }

            return 0;
        }
    }
}
