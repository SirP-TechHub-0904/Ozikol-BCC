using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol.MasterDomain.Models
{
    /// <summary>
    /// Represents an automated application build job and distribution release record.
    /// Powers the Central App Builder to generate, track, and distribute Windows Workstation (.exe),
    /// Android (.apk), Android Play Store (.aab), and iOS (.ipa) builds for General (multi-tenant)
    /// and dedicated Tenant White-Label releases via GitHub Actions cloud runners.
    /// </summary>
    [Table("MasterTenantAppBuilds")]
    public class MasterTenantAppBuild
    {
        /// <summary>
        /// Gets or sets the unique primary key identifier.
        /// </summary>
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        /// <summary>
        /// Gets or sets the application mode: "General" (universal Ozikol BCC multi-tenant app) or "WhiteLabel" (single-tenant dedicated app).
        /// </summary>
        [Required]
        [MaxLength(50)]
        public string AppMode { get; set; } = "WhiteLabel";

        /// <summary>
        /// Gets or sets the associated tenant ID (null for General multi-tenant app).
        /// </summary>
        public Guid? TenantId { get; set; }

        /// <summary>
        /// Gets or sets the tenant key slug (e.g., "cocacola" or "global").
        /// </summary>
        [Required]
        [MaxLength(100)]
        public string TenantKey { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the organization or brand name stamped onto the application (e.g. "Coca-Cola MKL" or "Ozikol BCC").
        /// </summary>
        [Required]
        [MaxLength(200)]
        public string BrandName { get; set; } = "Workspace Command Center";

        /// <summary>
        /// Gets or sets the target platform: "WindowsExe", "AndroidApk", "AndroidAab", "IosIpa".
        /// </summary>
        [Required]
        [MaxLength(50)]
        public string Platform { get; set; } = "WindowsExe";

        /// <summary>
        /// Gets or sets the semantic version string (e.g., "1.0.0").
        /// </summary>
        [Required]
        [MaxLength(50)]
        public string Version { get; set; } = "1.0.0";

        /// <summary>
        /// Gets or sets the sequential build number (e.g., 1, 2, 3).
        /// </summary>
        public int BuildNumber { get; set; } = 1;

        /// <summary>
        /// Gets or sets the target API base URL baked into the binary (e.g., "https://api.ozikol.cloud").
        /// </summary>
        [MaxLength(500)]
        public string ApiBaseUrl { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the primary custom domain locked into the binary (e.g., "workspace.client.com").
        /// </summary>
        [MaxLength(255)]
        public string? PrimaryDomain { get; set; }

        /// <summary>
        /// Gets or sets the brand icon URL or local asset path used during compilation.
        /// </summary>
        [MaxLength(1000)]
        public string? IconUrl { get; set; }

        /// <summary>
        /// Gets or sets the brand logo URL used during compilation.
        /// </summary>
        [MaxLength(1000)]
        public string? LogoUrl { get; set; }

        /// <summary>
        /// Gets or sets the primary brand hexadecimal color (e.g., "#0050E5").
        /// </summary>
        [MaxLength(50)]
        public string PrimaryColor { get; set; } = "#0050E5";

        /// <summary>
        /// Gets or sets the build lifecycle status: "Queued", "Building", "Succeeded", "Failed", "Cancelled".
        /// </summary>
        [Required]
        [MaxLength(50)]
        public string Status { get; set; } = "Queued";

        /// <summary>
        /// Gets or sets the public or authenticated download URL for the compiled binary installer or package.
        /// </summary>
        [MaxLength(1000)]
        public string? DownloadUrl { get; set; }

        /// <summary>
        /// Gets or sets the physical file path or relative storage path on the distribution server.
        /// </summary>
        [MaxLength(1000)]
        public string? StoragePath { get; set; }

        /// <summary>
        /// Gets or sets the total size of the compiled artifact in bytes.
        /// </summary>
        public long FileSizeBytes { get; set; } = 0;

        /// <summary>
        /// Gets or sets the SHA-256 cryptographic hash of the compiled artifact for integrity verification.
        /// </summary>
        [MaxLength(128)]
        public string? Sha256Checksum { get; set; }

        /// <summary>
        /// Gets or sets the GitHub Actions workflow run identifier.
        /// </summary>
        public long? GitHubRunId { get; set; }

        /// <summary>
        /// Gets or sets the URL to the GitHub Actions workflow run for live log monitoring and debugging.
        /// </summary>
        [MaxLength(1000)]
        public string? GitHubRunUrl { get; set; }

        /// <summary>
        /// Gets or sets failure or warning details if the build encountered an error.
        /// </summary>
        [MaxLength(4000)]
        public string? ErrorMessage { get; set; }

        /// <summary>
        /// Gets or sets the detailed build terminal log output.
        /// </summary>
        public string? BuildLog { get; set; }

        /// <summary>
        /// Gets or sets the administrator username or email who initiated the build.
        /// </summary>
        [MaxLength(200)]
        public string? TriggeredBy { get; set; }

        /// <summary>
        /// Gets or sets the creation timestamp in UTC.
        /// </summary>
        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Gets or sets the timestamp in UTC when the build job started compiling.
        /// </summary>
        public DateTime? StartedAtUtc { get; set; }

        /// <summary>
        /// Gets or sets the timestamp in UTC when the build job finished.
        /// </summary>
        public DateTime? CompletedAtUtc { get; set; }
    }
}
