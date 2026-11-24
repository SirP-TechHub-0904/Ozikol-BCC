using System;

namespace Ozikol.Central.Services.Backup;

/// <summary>
/// Configuration options governing local and offsite database backups, Cloudflare R2 vaults,
/// retention schedules, and point-in-time disaster recovery checkpoints.
/// </summary>
public class DatabaseBackupSettings
{
    /// <summary>
    /// Configuration section key for binding from appsettings.json or environment variables.
    /// </summary>
    public const string SectionName = "Backup";

    /// <summary>
    /// Local filesystem directory on the host where compressed .bak files are written.
    /// Defaults to '/var/opt/mssql/backups' on Linux.
    /// </summary>
    public string LocalDirectory { get; set; } = "/var/opt/mssql/backups";

    /// <summary>
    /// Maximum number of days to retain backups on the local VPS disk before pruning. Defaults to 7.
    /// </summary>
    public int RetentionDays { get; set; } = 7;

    /// <summary>
    /// Maximum disk quota in megabytes allocated to the local backup directory before aggressive pruning occurs.
    /// Defaults to 5000 MB (5 GB).
    /// </summary>
    public long MaxLocalStorageMB { get; set; } = 5000;

    /// <summary>
    /// Inviolable minimum number of backup copies to keep per database regardless of age or storage quota.
    /// Enforces the Sacred Anchor rule so no database can ever be left with 0 backups. Defaults to 1.
    /// </summary>
    public int MinimumFloorPerDatabase { get; set; } = 1;

    /// <summary>
    /// Controls whether native SQL Server backup compression is enabled. Defaults to true.
    /// </summary>
    public bool CompressionEnabled { get; set; } = true;

    /// <summary>
    /// Controls whether CHECKSUM validation is enforced during backup write and restore. Defaults to true.
    /// </summary>
    public bool VerifyChecksum { get; set; } = true;

    // ── Dedicated Cloudflare R2 Vault Settings ──

    /// <summary>
    /// Cloudflare Account ID powering the R2 object storage endpoint.
    /// </summary>
    public string? CloudflareAccountId { get; set; }

    /// <summary>
    /// Cloudflare R2 API Access Key ID with Read &amp; Write permissions on the backup bucket.
    /// </summary>
    public string? CloudflareAccessKeyId { get; set; }

    /// <summary>
    /// Cloudflare R2 API Secret Access Key.
    /// </summary>
    public string? CloudflareSecretAccessKey { get; set; }

    /// <summary>
    /// The dedicated Cloudflare R2 bucket name storing all offsite database archives.
    /// Defaults to 'ozikol-database-backups'.
    /// </summary>
    public string CloudflareBucketName { get; set; } = "ozikol-database-backups";

    /// <summary>
    /// Custom S3 Service URL if overriding the default Cloudflare R2 endpoint.
    /// </summary>
    public string? CloudflareServiceUrl { get; set; }

    /// <summary>
    /// Retention period in days for offsite backups in Cloudflare R2. Defaults to 30 days.
    /// </summary>
    public int CloudflareRetentionDays { get; set; } = 30;

    /// <summary>
    /// Lifespan in minutes for temporary secure presigned download links. Defaults to 15 minutes.
    /// </summary>
    public int PresignedUrlExpiryMinutes { get; set; } = 15;

    /// <summary>
    /// Determines whether Cloudflare R2 credentials are fully populated for offsite replication.
    /// </summary>
    public bool IsCloudflareConfigured =>
        !string.IsNullOrWhiteSpace(CloudflareAccountId) &&
        !string.IsNullOrWhiteSpace(CloudflareAccessKeyId) &&
        !string.IsNullOrWhiteSpace(CloudflareSecretAccessKey) &&
        !string.IsNullOrWhiteSpace(CloudflareBucketName);
}
