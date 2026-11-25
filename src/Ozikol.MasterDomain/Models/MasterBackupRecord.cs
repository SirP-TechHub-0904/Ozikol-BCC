using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Ozikol.MasterDomain.Models;

/// <summary>
/// Represents a point-in-time database backup snapshot for either the Central Master Catalog
/// or an individual sovereign tenant organization. Tracks local storage path, Cloudflare R2 cloud key,
/// cryptographic checksum, encryption algorithm, and operational restoration status.
/// </summary>
[Table("MasterBackupRecords")]
public class MasterBackupRecord
{
    /// <summary>
    /// Unique primary key identifier for this backup snapshot record.
    /// </summary>
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// The unique slug or tenant key identifier (e.g. 'choosehcare', 'nightpress', 'master').
    /// </summary>
    [Required]
    [MaxLength(100)]
    public string TenantKey { get; set; } = string.Empty;

    /// <summary>
    /// The exact physical SQL Server database catalog name (e.g. 'oz_db_choosehcare_hn7qarvm', 'Ozikol_MasterCatalogDb').
    /// </summary>
    [Required]
    [MaxLength(128)]
    public string DatabaseName { get; set; } = string.Empty;

    /// <summary>
    /// The type of operational trigger that initiated this snapshot:
    /// 'ScheduledDaily', 'TransactionLog15m', 'PrePurgeArchive', 'PreRestoreSafety', or 'ManualInstant'.
    /// </summary>
    [Required]
    [MaxLength(50)]
    public string BackupType { get; set; } = "ScheduledDaily";

    /// <summary>
    /// Raw uncompressed file size in bytes.
    /// </summary>
    public long FileSizeBytes { get; set; }

    /// <summary>
    /// Native SQL compressed file size in bytes stored on disk and in cloud storage.
    /// </summary>
    public long CompressedSizeBytes { get; set; }

    /// <summary>
    /// The absolute local file path on the Linux host (e.g. '/var/opt/mssql/backups/daily/choosehcare_20261124.bak').
    /// Null if the file has been pruned from local VPS disk and resides exclusively in the Cloudflare R2 vault.
    /// </summary>
    [MaxLength(500)]
    public string? LocalFilePath { get; set; }

    /// <summary>
    /// The object storage key in the dedicated Cloudflare R2 bucket (e.g. 'backups/choosehcare/2026-11-24_082406.bak').
    /// </summary>
    [Required]
    [MaxLength(500)]
    public string CloudStorageKey { get; set; } = string.Empty;

    /// <summary>
    /// The target Cloudflare R2 bucket name (e.g. 'ozikol-database-backups').
    /// </summary>
    [Required]
    [MaxLength(100)]
    public string CloudBucketName { get; set; } = "ozikol-database-backups";

    /// <summary>
    /// SHA-256 cryptographic hash calculated upon creation to guarantee backup integrity and detect corruption or tampering.
    /// </summary>
    [Required]
    [MaxLength(64)]
    public string ChecksumSha256 { get; set; } = string.Empty;

    /// <summary>
    /// Indicates whether the backup payload is encrypted at rest using AES-256.
    /// </summary>
    public bool IsEncrypted { get; set; } = true;

    /// <summary>
    /// Name of the encryption algorithm used to protect the payload (e.g. 'AES-256').
    /// </summary>
    [Required]
    [MaxLength(50)]
    public string EncryptionAlgorithm { get; set; } = "AES-256";

    /// <summary>
    /// Operational status of the snapshot: 'Completed', 'SyncedToCloud', 'Failed', or 'Restored'.
    /// </summary>
    [Required]
    [MaxLength(50)]
    public string Status { get; set; } = "Completed";

    /// <summary>
    /// Detailed error explanation if the backup, compression, or cloud sync operation failed.
    /// </summary>
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// Timestamp when this backup record and physical snapshot were initiated in UTC.
    /// </summary>
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Timestamp when the physical backup file was pruned from local VPS disk (if rotated per 7-day retention).
    /// </summary>
    public DateTime? PurgedFromLocalUtc { get; set; }
}
