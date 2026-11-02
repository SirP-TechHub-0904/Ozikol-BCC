using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol.MasterDomain.Models
{
    /// <summary>
    /// Represents an application release for client platforms (Windows, macOS, Linux, Android, iOS, Web).
    /// Used by the Central Client Release Engine to power in-app OTA updates, flexible downloads, and mandatory security patches.
    /// </summary>
    [Table("MasterClientReleases")]
    public class MasterClientRelease
    {
        /// <summary>
        /// Gets or sets the unique primary key identifier.
        /// </summary>
        [Key]
        public Guid Id { get; set; } = Guid.NewGuid();

        /// <summary>
        /// Gets or sets the target platform ("windows", "macos", "linux", "android", "ios", "web").
        /// </summary>
        [Required]
        [MaxLength(50)]
        public string Platform { get; set; } = "windows";

        /// <summary>
        /// Gets or sets the release channel ("stable", "beta", "canary").
        /// </summary>
        [Required]
        [MaxLength(50)]
        public string Channel { get; set; } = "stable";

        /// <summary>
        /// Gets or sets the semantic version string (e.g., "1.1.0").
        /// </summary>
        [Required]
        [MaxLength(50)]
        public string Version { get; set; } = "1.0.0";

        /// <summary>
        /// Gets or sets the sequential build number (e.g., 25).
        /// </summary>
        public int BuildNumber { get; set; } = 1;

        /// <summary>
        /// Gets or sets the minimum supported version. Clients with versions below this MUST perform an immediate mandatory update.
        /// </summary>
        [MaxLength(50)]
        public string MinSupportedVersion { get; set; } = "1.0.0";

        /// <summary>
        /// Gets or sets markdown-formatted release notes and changelog.
        /// </summary>
        [MaxLength(4000)]
        public string ReleaseNotes { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the direct download URL for the package installer or app store redirect.
        /// </summary>
        [Required]
        [MaxLength(1000)]
        public string DownloadUrl { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the cryptographic SHA-256 checksum for verification of downloaded installer binaries.
        /// </summary>
        [MaxLength(128)]
        public string Sha256Checksum { get; set; } = string.Empty;

        /// <summary>
        /// Gets or sets the total installer payload size in bytes (for download progress bars).
        /// </summary>
        public long FileSizeBytes { get; set; } = 0;

        /// <summary>
        /// Gets or sets a value indicating whether this release is mandatory (blocks app usage until updated).
        /// </summary>
        public bool IsMandatory { get; set; } = false;

        /// <summary>
        /// Gets or sets a value indicating whether this release is currently active and eligible for distribution.
        /// </summary>
        public bool IsActive { get; set; } = true;

        /// <summary>
        /// Gets or sets the publication timestamp in UTC.
        /// </summary>
        public DateTime PublishedAtUtc { get; set; } = DateTime.UtcNow;

        /// <summary>
        /// Gets or sets the record creation timestamp in UTC.
        /// </summary>
        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    }
}
