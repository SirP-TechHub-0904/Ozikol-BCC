using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Ozikol.MasterDomain.Models;

namespace Ozikol.Central.Services.Backup;

/// <summary>
/// Service interface defining local and cloud-vaulted database backups, point-in-time restores,
/// cryptographic checksum validation, presigned download URLs, and retention lifecycle governance.
/// </summary>
public interface IDatabaseBackupService
{
    /// <summary>
    /// Executes a compressed native SQL Server backup for the specified database, verifies its SHA-256 checksum,
    /// streams it to the dedicated Cloudflare R2 offsite vault, and logs the snapshot in MasterBackupRecords.
    /// </summary>
    /// <param name="tenantKey">The tenant slug (e.g. 'choosehcare', 'nightpress', or 'master').</param>
    /// <param name="databaseName">The exact SQL database name (e.g. 'oz_db_choosehcare_hn7qarvm').</param>
    /// <param name="backupType">Operational trigger: 'ScheduledDaily', 'PrePurgeArchive', 'PreRestoreSafety', or 'ManualInstant'.</param>
    /// <param name="cancellationToken">Cancellation token for async operations.</param>
    /// <returns>The persisted <see cref="MasterBackupRecord"/> telemetry entry.</returns>
    Task<MasterBackupRecord> CreateBackupAsync(
        string tenantKey,
        string databaseName,
        string backupType = "ManualInstant",
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Restores a database from a historical snapshot, automatically taking a pre-restore safety snapshot first,
    /// terminating active connection pool sockets, restoring with replace, and resealing dedicated tenant user ownership.
    /// </summary>
    /// <param name="backupRecordId">Unique primary key of the MasterBackupRecord to restore.</param>
    /// <param name="cancellationToken">Cancellation token for async operations.</param>
    /// <returns>True if restoration completed successfully; otherwise, false.</returns>
    Task<bool> RestoreBackupAsync(Guid backupRecordId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Generates a temporary, 15-minute secure presigned download URL for the snapshot from Cloudflare R2,
    /// ensuring sensitive database archives are never exposed to public unauthenticated access.
    /// </summary>
    /// <param name="backupRecordId">Unique primary key of the MasterBackupRecord.</param>
    /// <param name="cancellationToken">Cancellation token for async operations.</param>
    /// <returns>A signed download URL, or null if Cloudflare R2 is not configured or the record is missing.</returns>
    Task<string?> GeneratePresignedDownloadUrlAsync(Guid backupRecordId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Retrieves the ordered historical list of backup snapshots, optionally filtered by tenant slug.
    /// </summary>
    /// <param name="tenantKey">Optional tenant slug filter. If null, returns all platform snapshots.</param>
    /// <param name="cancellationToken">Cancellation token for async operations.</param>
    /// <returns>List of matching <see cref="MasterBackupRecord"/> entries.</returns>
    Task<List<MasterBackupRecord>> GetBackupHistoryAsync(string? tenantKey = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Executes local disk retention pruning enforcing the Sacred Anchor Rule:
    /// Deletes candidates older than retention threshold and trims directory to quota,
    /// but NEVER deletes the single newest backup copy of any database.
    /// </summary>
    /// <param name="cancellationToken">Cancellation token for async operations.</param>
    /// <returns>The number of local backup files safely pruned.</returns>
    Task<int> PruneLocalBackupsAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Enqueues and initiates a compressed database backup in the background, creating an immediate
    /// 'InProgress' MasterBackupRecord so callers return instantly without blocking HTTP threads.
    /// </summary>
    /// <param name="tenantKey">The tenant slug (e.g. 'choosehcare', 'nightpress', or 'master').</param>
    /// <param name="databaseName">The exact SQL database name (e.g. 'oz_db_choosehcare_hn7qarvm').</param>
    /// <param name="backupType">Operational trigger: 'ScheduledDaily', 'PrePurgeArchive', 'PreRestoreSafety', or 'ManualInstant'.</param>
    /// <param name="cancellationToken">Cancellation token for async operations.</param>
    /// <returns>The initial <see cref="MasterBackupRecord"/> in 'InProgress' status.</returns>
    Task<MasterBackupRecord> QueueBackupAsync(
        string tenantKey,
        string databaseName,
        string backupType = "ManualInstant",
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Enqueues backup jobs for the Master Catalog database and ALL active sovereign tenant databases at once.
    /// Creates immediate 'InProgress' records for each database and processes them asynchronously in the background.
    /// </summary>
    /// <param name="backupType">Operational trigger: defaults to 'ManualBatchAll'.</param>
    /// <param name="cancellationToken">Cancellation token for async operations.</param>
    /// <returns>The initial list of created <see cref="MasterBackupRecord"/> entries in 'InProgress' status.</returns>
    Task<List<MasterBackupRecord>> QueueBackupAllAsync(
        string backupType = "ManualBatchAll",
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Retrieves a single backup record by its primary key ID.
    /// </summary>
    /// <param name="backupRecordId">Unique primary key of the MasterBackupRecord.</param>
    /// <param name="cancellationToken">Cancellation token for async operations.</param>
    /// <returns>The record if found; otherwise, null.</returns>
    Task<MasterBackupRecord?> GetBackupRecordByIdAsync(Guid backupRecordId, CancellationToken cancellationToken = default);
}
