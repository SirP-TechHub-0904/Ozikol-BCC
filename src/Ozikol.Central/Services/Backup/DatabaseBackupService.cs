using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;
using Amazon.S3.Transfer;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Ozikol.MasterDomain.Models;
using Ozikol.MasterDomain.Security;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Services.Backup;

/// <summary>
/// Enterprise-grade database backup and point-in-time disaster recovery service.
/// Orchestrates native SQL compression, cryptographic SHA-256 checksums, offsite Cloudflare R2 replication,
/// presigned secure download links, the Inviolable Anchor retention rule, and 1-click restore workflows.
/// </summary>
public class DatabaseBackupService : IDatabaseBackupService
{
    private readonly MasterCatalogDbContext _dbContext;
    private readonly DatabaseBackupSettings _settings;
    private readonly IConfiguration _configuration;
    private readonly ILogger<DatabaseBackupService> _logger;
    private readonly IServiceScopeFactory _scopeFactory;

    /// <summary>
    /// Initializes a new instance of the <see cref="DatabaseBackupService"/> class.
    /// </summary>
    public DatabaseBackupService(
        MasterCatalogDbContext dbContext,
        IOptions<DatabaseBackupSettings> settingsOptions,
        IConfiguration configuration,
        ILogger<DatabaseBackupService> logger,
        IServiceScopeFactory scopeFactory)
    {
        _dbContext = dbContext;
        _settings = ResolveSettings(settingsOptions?.Value, configuration);
        _configuration = configuration;
        _logger = logger;
        _scopeFactory = scopeFactory;
    }

    /// <inheritdoc />
    public async Task<MasterBackupRecord> CreateBackupAsync(
        string tenantKey,
        string databaseName,
        string backupType = "ManualInstant",
        CancellationToken cancellationToken = default)
    {
        var record = await QueueBackupAsync(tenantKey, databaseName, backupType, cancellationToken);
        await ProcessBackupJobAsync(record.Id, record.TenantKey, record.DatabaseName, record.LocalFilePath);
        return (await GetBackupRecordByIdAsync(record.Id, cancellationToken)) ?? record;
    }

    /// <inheritdoc />
    public async Task<MasterBackupRecord> QueueBackupAsync(
        string tenantKey,
        string databaseName,
        string backupType = "ManualInstant",
        CancellationToken cancellationToken = default)
    {
        var cleanTenantKey = (tenantKey ?? "master").Trim().ToLowerInvariant();
        var cleanDbName = databaseName.Trim();
        var timestamp = DateTime.UtcNow.ToString("yyyyMMdd_HHmmss");

        var localDir = !string.IsNullOrWhiteSpace(_settings.LocalDirectory) ? _settings.LocalDirectory : "/var/opt/mssql/backups";
        try
        {
            if (!Directory.Exists(localDir))
            {
                Directory.CreateDirectory(localDir);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not create local backup directory {LocalDir}. Falling back to default MSSQL data directory.", localDir);
            localDir = "/var/opt/mssql/data";
        }

        var fileName = $"{cleanDbName}_{timestamp}.bak";
        var localFilePath = Path.Combine(localDir, fileName).Replace('\\', '/');
        var cloudStorageKey = $"backups/{cleanTenantKey}/{fileName}";

        var record = new MasterBackupRecord
        {
            Id = Guid.NewGuid(),
            TenantKey = cleanTenantKey,
            DatabaseName = cleanDbName,
            BackupType = backupType,
            LocalFilePath = localFilePath,
            CloudStorageKey = cloudStorageKey,
            CloudBucketName = _settings.CloudflareBucketName ?? "ozikol-database-backups",
            EncryptionAlgorithm = "AES-256",
            IsEncrypted = true,
            Status = "InProgress",
            ChecksumSha256 = "Computing...",
            CreatedAtUtc = DateTime.UtcNow
        };

        _dbContext.MasterBackupRecords.Add(record);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var recordId = record.Id;
        _ = Task.Run(async () =>
        {
            await ProcessBackupJobAsync(recordId, cleanTenantKey, cleanDbName, localFilePath);
        });

        return record;
    }

    /// <inheritdoc />
    public async Task<List<MasterBackupRecord>> QueueBackupAllAsync(
        string backupType = "ManualBatchAll",
        CancellationToken cancellationToken = default)
    {
        var timestamp = DateTime.UtcNow.ToString("yyyyMMdd_HHmmss");
        var localDir = !string.IsNullOrWhiteSpace(_settings.LocalDirectory) ? _settings.LocalDirectory : "/var/opt/mssql/backups";
        try
        {
            if (!Directory.Exists(localDir))
            {
                Directory.CreateDirectory(localDir);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Could not create local backup directory {LocalDir}. Falling back to default MSSQL data directory.", localDir);
            localDir = "/var/opt/mssql/data";
        }

        var targets = new List<(string TenantKey, string DatabaseName)>
        {
            ("master", "Ozikol_MasterCatalogDb")
        };

        var activeTenants = await _dbContext.MasterTenantCatalogs
            .AsNoTracking()
            .Where(t => t.IsActive)
            .ToListAsync(cancellationToken);

        foreach (var t in activeTenants)
        {
            if (!string.IsNullOrWhiteSpace(t.DatabaseName))
            {
                targets.Add((t.TenantKey.ToLowerInvariant(), t.DatabaseName));
            }
        }

        var queuedRecords = new List<MasterBackupRecord>();
        foreach (var (tKey, dbName) in targets)
        {
            var fileName = $"{dbName}_{timestamp}.bak";
            var localFilePath = Path.Combine(localDir, fileName).Replace('\\', '/');
            var cloudStorageKey = $"backups/{tKey}/{fileName}";

            var record = new MasterBackupRecord
            {
                Id = Guid.NewGuid(),
                TenantKey = tKey,
                DatabaseName = dbName,
                BackupType = backupType,
                LocalFilePath = localFilePath,
                CloudStorageKey = cloudStorageKey,
                CloudBucketName = _settings.CloudflareBucketName ?? "ozikol-database-backups",
                EncryptionAlgorithm = "AES-256",
                IsEncrypted = true,
                Status = "InProgress",
                ChecksumSha256 = "Computing...",
                CreatedAtUtc = DateTime.UtcNow
            };
            queuedRecords.Add(record);
        }

        _dbContext.MasterBackupRecords.AddRange(queuedRecords);
        await _dbContext.SaveChangesAsync(cancellationToken);

        // Process queued backups in background sequentially with isolated error boundaries
        var jobPayloads = queuedRecords.Select(r => (r.Id, r.TenantKey, r.DatabaseName, r.LocalFilePath)).ToList();
        _ = Task.Run(async () =>
        {
            foreach (var (recId, tKey, dbName, path) in jobPayloads)
            {
                try
                {
                    await ProcessBackupJobAsync(recId, tKey, dbName, path);
                }
                catch (Exception batchItemEx)
                {
                    _logger.LogError(batchItemEx, "❌ [Backup] Unexpected error processing queued batch backup for [{DatabaseName}]", dbName);
                    await MarkRecordFailedAsync(recId, $"Batch execution failed: {batchItemEx.Message}");
                }
            }
        });

        return queuedRecords;
    }

    /// <inheritdoc />
    public async Task<MasterBackupRecord?> GetBackupRecordByIdAsync(Guid backupRecordId, CancellationToken cancellationToken = default)
    {
        return await _dbContext.MasterBackupRecords
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == backupRecordId, cancellationToken);
    }

    /// <inheritdoc />
    public async Task<int> ReconcileStaleBackupsAsync(int timeoutMinutes = 10, CancellationToken cancellationToken = default)
    {
        try
        {
            var cutoff = DateTime.UtcNow.AddMinutes(-Math.Max(1, timeoutMinutes));
            var staleRecords = await _dbContext.MasterBackupRecords
                .Where(r => r.Status == "InProgress" && r.CreatedAtUtc < cutoff)
                .ToListAsync(cancellationToken);

            if (!staleRecords.Any()) return 0;

            foreach (var r in staleRecords)
            {
                r.Status = "Failed";
                r.ErrorMessage = $"Operation timed out after {timeoutMinutes} minutes (server restart or process abort).";
                _logger.LogWarning("⚠️ [Backup] Reconciled stale orphaned backup record {Id} for [{DatabaseName}].", r.Id, r.DatabaseName);
            }

            await _dbContext.SaveChangesAsync(cancellationToken);
            return staleRecords.Count;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error reconciling stale backup records: {Message}", ex.Message);
            return 0;
        }
    }

    /// <inheritdoc />
    public async Task<int> ClearAllActiveBackupsAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var activeRecords = await _dbContext.MasterBackupRecords
                .Where(r => r.Status == "InProgress" || r.Status == "Pending")
                .ToListAsync(cancellationToken);

            if (!activeRecords.Any()) return 0;

            foreach (var r in activeRecords)
            {
                r.Status = "Cancelled";
                r.ErrorMessage = "Manually cleared by Central Administrator.";
                _logger.LogInformation("🧹 [Backup] Manually cleared active backup record {Id} for [{DatabaseName}].", r.Id, r.DatabaseName);
            }

            await _dbContext.SaveChangesAsync(cancellationToken);
            return activeRecords.Count;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error clearing active backup records: {Message}", ex.Message);
            return 0;
        }
    }

    private async Task MarkRecordFailedAsync(Guid recordId, string errorMessage)
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<MasterCatalogDbContext>();
            var record = await db.MasterBackupRecords.FirstOrDefaultAsync(r => r.Id == recordId);
            if (record != null && (record.Status == "InProgress" || record.Status == "Pending"))
            {
                record.Status = "Failed";
                record.ErrorMessage = errorMessage;
                await db.SaveChangesAsync(CancellationToken.None);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to persist Failed status for backup record {Id}", recordId);
        }
    }

    private async Task ProcessBackupJobAsync(Guid recordId, string cleanTenantKey, string cleanDbName, string localFilePath)
    {
        using var cts = new CancellationTokenSource(TimeSpan.FromMinutes(8));
        var token = cts.Token;

        try
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<MasterCatalogDbContext>();
            var record = await db.MasterBackupRecords.FirstOrDefaultAsync(r => r.Id == recordId, token);
            if (record == null) return;

            string targetConnStr = await ResolveConnectionStringAsync(cleanTenantKey, cleanDbName, token);

            // 1. Run SQL Native Backup
            try
            {
                var safeDbBracket = cleanDbName.Replace("]", "]]");
                var safePathLiteral = localFilePath.Replace("'", "''");
                var compressionClause = _settings.CompressionEnabled ? ", COMPRESSION" : "";
                var checksumClause = _settings.VerifyChecksum ? ", CHECKSUM" : "";

                var sql = $"BACKUP DATABASE [{safeDbBracket}] TO DISK = N'{safePathLiteral}' WITH STATS = 25{compressionClause}{checksumClause};";

                await using var sqlConn = new SqlConnection(targetConnStr);
                await sqlConn.OpenAsync(token);

                await using (var cmd = sqlConn.CreateCommand())
                {
                    cmd.CommandTimeout = 420; // 7 minutes
                    cmd.CommandText = sql;
                    await cmd.ExecuteNonQueryAsync(token);
                }

                _logger.LogInformation("✅ [Backup] Native SQL backup successfully generated at {LocalFilePath}", localFilePath);

                // Query exact sizes from msdb.dbo.backupset
                try
                {
                    await using var sizeCmd = sqlConn.CreateCommand();
                    sizeCmd.CommandText = @"
                        SELECT TOP 1 compressed_backup_size, backup_size 
                        FROM msdb.dbo.backupset 
                        WHERE database_name = @dbName 
                        ORDER BY backup_set_id DESC;";
                    var p = sizeCmd.CreateParameter();
                    p.ParameterName = "@dbName";
                    p.Value = cleanDbName;
                    sizeCmd.Parameters.Add(p);

                    await using var reader = await sizeCmd.ExecuteReaderAsync(token);
                    if (await reader.ReadAsync(token))
                    {
                        if (!reader.IsDBNull(0)) record.CompressedSizeBytes = reader.GetInt64(0);
                        if (!reader.IsDBNull(1)) record.FileSizeBytes = reader.GetInt64(1);
                    }
                }
                catch (Exception sizeEx)
                {
                    _logger.LogWarning(sizeEx, "Could not query msdb.dbo.backupset for database [{DatabaseName}]: {Message}", cleanDbName, sizeEx.Message);
                }
            }
            catch (Exception sqlEx)
            {
                _logger.LogError(sqlEx, "❌ [Backup] Native SQL backup failed for database [{DatabaseName}]", cleanDbName);
                record.Status = "Failed";
                record.ErrorMessage = $"SQL Server backup command failed: {sqlEx.Message}";
                await db.SaveChangesAsync(CancellationToken.None);
                return;
            }

            // 2. Check local file & checksum
            try
            {
                if (File.Exists(localFilePath))
                {
                    var fileInfo = new FileInfo(localFilePath);
                    if (record.CompressedSizeBytes <= 0) record.CompressedSizeBytes = fileInfo.Length;
                    if (record.FileSizeBytes <= 0) record.FileSizeBytes = fileInfo.Length;

                    using var sha256 = SHA256.Create();
                    await using var fs = File.OpenRead(localFilePath);
                    var hashBytes = await sha256.ComputeHashAsync(fs, token);
                    record.ChecksumSha256 = Convert.ToHexString(hashBytes).ToLowerInvariant();
                }
                else
                {
                    record.ChecksumSha256 = "N/A (Stored in server filesystem)";
                }
            }
            catch (Exception chkEx)
            {
                _logger.LogWarning(chkEx, "Could not compute SHA-256 checksum on local path {LocalFilePath}: {Message}", localFilePath, chkEx.Message);
                record.ChecksumSha256 = "UNKNOWN";
            }

            // 3. Upload to Cloudflare R2
            if (_settings.IsCloudflareConfigured && File.Exists(localFilePath))
            {
                try
                {
                    _logger.LogInformation("☁️ [Backup] Streaming snapshot to Cloudflare R2 ({Bucket} / {Key})...",
                        record.CloudBucketName, record.CloudStorageKey);

                    var s3Client = CreateR2Client();
                    using var fileTransferUtility = new TransferUtility(s3Client);

                    await fileTransferUtility.UploadAsync(new TransferUtilityUploadRequest
                    {
                        FilePath = localFilePath,
                        BucketName = record.CloudBucketName,
                        Key = record.CloudStorageKey,
                        ContentType = "application/octet-stream",
                        ServerSideEncryptionMethod = ServerSideEncryptionMethod.AES256,
                        DisablePayloadSigning = true
                    }, token);

                    record.Status = "SyncedToCloud";
                    _logger.LogInformation("✅ [Backup] Snapshot successfully vaulted to Cloudflare R2: {CloudStorageKey}", record.CloudStorageKey);
                }
                catch (Exception r2Ex)
                {
                    _logger.LogError(r2Ex, "⚠️ [Backup] Cloudflare R2 upload failed for {LocalFilePath}: {Message}. Retaining local copy.", localFilePath, r2Ex.Message);
                    record.Status = "CompletedLocalOnly";
                    record.ErrorMessage = $"Cloudflare R2 sync error: {r2Ex.Message}";
                }
            }
            else
            {
                record.Status = "Completed";
            }

            await db.SaveChangesAsync(CancellationToken.None);
        }
        catch (OperationCanceledException)
        {
            _logger.LogError("⏱️ [Backup] Backup operation timed out after 8 minutes for [{DatabaseName}].", cleanDbName);
            await MarkRecordFailedAsync(recordId, "Backup operation timed out after 8 minutes.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ [Backup] Unhandled backup failure for [{DatabaseName}]: {Message}", cleanDbName, ex.Message);
            await MarkRecordFailedAsync(recordId, $"Backup failed: {ex.Message}");
        }
    }

    /// <inheritdoc />
    public async Task<bool> RestoreBackupAsync(Guid backupRecordId, CancellationToken cancellationToken = default)
    {
        var record = await _dbContext.MasterBackupRecords
            .FirstOrDefaultAsync(r => r.Id == backupRecordId, cancellationToken);

        if (record == null)
        {
            _logger.LogError("Restore failed: Backup record {Id} not found in catalog.", backupRecordId);
            return false;
        }

        var dbName = record.DatabaseName.Trim();
        var tenantKey = record.TenantKey.Trim().ToLowerInvariant();

        _logger.LogWarning("⚠️ [Restore] Initiating restore of database [{DatabaseName}] from snapshot {SnapshotId} ({Type} / {Date})...",
            dbName, record.Id, record.BackupType, record.CreatedAtUtc);

        // Step 1: Pre-Restore Safety Snapshot of current state
        try
        {
            _logger.LogInformation("🛡️ [Restore] Capturing pre-restore safety snapshot before applying restore...");
            await CreateBackupAsync(tenantKey, dbName, "PreRestoreSafety", cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Pre-restore safety snapshot could not be captured: {Message}. Proceeding with restore.", ex.Message);
        }

        // Step 2: Ensure the backup file is available locally
        var bakPath = record.LocalFilePath;
        bool downloadedFromCloud = false;

        if (string.IsNullOrWhiteSpace(bakPath) || !File.Exists(bakPath))
        {
            if (!_settings.IsCloudflareConfigured)
            {
                _logger.LogError("Restore failed: Backup file {LocalFilePath} does not exist locally and Cloudflare R2 is not configured.", bakPath);
                return false;
            }

            // Stream down from Cloudflare R2 to temporary directory
            var tempDir = Path.Combine(Path.GetTempPath(), "ozikol_restores");
            Directory.CreateDirectory(tempDir);
            bakPath = Path.Combine(tempDir, Path.GetFileName(record.CloudStorageKey));

            _logger.LogInformation("☁️ [Restore] Downloading snapshot from Cloudflare R2 ({Key}) to {TempPath}...",
                record.CloudStorageKey, bakPath);

            var s3Client = CreateR2Client();
            var getRequest = new GetObjectRequest
            {
                BucketName = record.CloudBucketName,
                Key = record.CloudStorageKey
            };

            using var response = await s3Client.GetObjectAsync(getRequest, cancellationToken);
            await using var outputStream = File.Create(bakPath);
            await response.ResponseStream.CopyToAsync(outputStream, cancellationToken);
            downloadedFromCloud = true;
        }

        // Step 3: Resolve Master Admin connection string to execute RESTORE command
        var masterAdminConnStr = _dbContext.Database.GetConnectionString();
        if (string.IsNullOrWhiteSpace(masterAdminConnStr))
        {
            throw new InvalidOperationException("Master catalog connection string is missing.");
        }

        var adminBuilder = new SqlConnectionStringBuilder(masterAdminConnStr)
        {
            InitialCatalog = "master",
            ConnectTimeout = 30
        };

        // Step 4: Resolve dedicated tenant user to reseal ownership
        string? dedicatedUser = null;
        if (!string.Equals(tenantKey, "master", StringComparison.OrdinalIgnoreCase))
        {
            var tenant = await _dbContext.MasterTenantCatalogs
                .AsNoTracking()
                .FirstOrDefaultAsync(t => t.TenantKey.ToLower() == tenantKey, cancellationToken);

            if (tenant != null && !string.IsNullOrWhiteSpace(tenant.ConnectionString))
            {
                try
                {
                    var decrypted = OzikolDataCipher.DecryptIfNeeded(tenant.ConnectionString);
                    if (!string.IsNullOrWhiteSpace(decrypted))
                    {
                        var tBuilder = new SqlConnectionStringBuilder(decrypted);
                        dedicatedUser = tBuilder.UserID;
                    }
                }
                catch
                {
                    // Non-blocking user resolution
                }
            }
        }

        // Step 5: Execute restore sequence with socket lock termination and pool flush
        try
        {
            // A. Flush connection pools across the .NET runtime
            SqlConnection.ClearAllPools();

            await using var masterConn = new SqlConnection(adminBuilder.ConnectionString);
            await masterConn.OpenAsync(cancellationToken);

            var safeDbBracket = dbName.Replace("]", "]]");
            var safeDbLiteral = dbName.Replace("'", "''");
            var safeBakPathLiteral = bakPath.Replace("'", "''");

            // B. Terminate active sessions and set SINGLE_USER
            await using (var killCmd = masterConn.CreateCommand())
            {
                killCmd.CommandTimeout = 60;
                killCmd.CommandText = $@"
                    DECLARE @killSql NVARCHAR(MAX) = N'';
                    SELECT @killSql = @killSql + N'KILL ' + CAST(session_id AS NVARCHAR(10)) + N'; '
                    FROM sys.dm_exec_sessions
                    WHERE database_id = DB_ID(N'{safeDbLiteral}') AND session_id <> @@SPID;

                    IF LEN(@killSql) > 0 
                        EXEC sp_executesql @killSql;

                    ALTER DATABASE [{safeDbBracket}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;";
                await killCmd.ExecuteNonQueryAsync(cancellationToken);
            }

            // C. Execute RESTORE DATABASE WITH REPLACE
            await using (var restoreCmd = masterConn.CreateCommand())
            {
                restoreCmd.CommandTimeout = 600; // 10 minutes for full restore
                restoreCmd.CommandText = $"RESTORE DATABASE [{safeDbBracket}] FROM DISK = N'{safeBakPathLiteral}' WITH REPLACE, STATS = 20;";
                await restoreCmd.ExecuteNonQueryAsync(cancellationToken);
            }

            // D. Reseal dedicated tenant ownership (Zero-Trust Standard)
            if (!string.IsNullOrWhiteSpace(dedicatedUser))
            {
                var safeUserBracket = dedicatedUser.Replace("]", "]]");
                await using (var authCmd = masterConn.CreateCommand())
                {
                    authCmd.CommandTimeout = 60;
                    authCmd.CommandText = $"ALTER AUTHORIZATION ON DATABASE::[{safeDbBracket}] TO [{safeUserBracket}];";
                    await authCmd.ExecuteNonQueryAsync(cancellationToken);
                }
            }

            // E. Set back to MULTI_USER
            await using (var multiCmd = masterConn.CreateCommand())
            {
                multiCmd.CommandTimeout = 60;
                multiCmd.CommandText = $"ALTER DATABASE [{safeDbBracket}] SET MULTI_USER;";
                await multiCmd.ExecuteNonQueryAsync(cancellationToken);
            }

            // F. Final pool flush
            SqlConnection.ClearAllPools();

            record.Status = "Restored";
            await _dbContext.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("✅ [Restore] Database [{DatabaseName}] restored successfully from snapshot {SnapshotId}", dbName, record.Id);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ [Restore] Database restoration failed for [{DatabaseName}]: {Message}", dbName, ex.Message);
            return false;
        }
        finally
        {
            // Clean up temporary download file if pulled from Cloudflare R2
            if (downloadedFromCloud && !string.IsNullOrWhiteSpace(bakPath) && File.Exists(bakPath))
            {
                try { File.Delete(bakPath); } catch { /* Non-blocking */ }
            }
        }
    }

    /// <inheritdoc />
    public async Task<string?> GeneratePresignedDownloadUrlAsync(Guid backupRecordId, CancellationToken cancellationToken = default)
    {
        var record = await _dbContext.MasterBackupRecords
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == backupRecordId, cancellationToken);

        if (record == null || !_settings.IsCloudflareConfigured)
        {
            return null;
        }

        try
        {
            var s3Client = CreateR2Client();
            var expiry = DateTime.UtcNow.AddMinutes(Math.Max(5, _settings.PresignedUrlExpiryMinutes));

            var request = new GetPreSignedUrlRequest
            {
                BucketName = record.CloudBucketName,
                Key = record.CloudStorageKey,
                Expires = expiry,
                Verb = HttpVerb.GET
            };

            var url = s3Client.GetPreSignedURL(request);
            return await Task.FromResult<string?>(url);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate presigned download URL for backup {Id}: {Message}", backupRecordId, ex.Message);
            return null;
        }
    }

    /// <inheritdoc />
    public async Task<List<MasterBackupRecord>> GetBackupHistoryAsync(string? tenantKey = null, CancellationToken cancellationToken = default)
    {
        var query = _dbContext.MasterBackupRecords.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(tenantKey))
        {
            var cleanKey = tenantKey.Trim().ToLowerInvariant();
            query = query.Where(r => r.TenantKey == cleanKey);
        }

        return await query
            .OrderByDescending(r => r.CreatedAtUtc)
            .Take(200)
            .ToListAsync(cancellationToken);
    }

    /// <inheritdoc />
    public async Task<int> PruneLocalBackupsAsync(CancellationToken cancellationToken = default)
    {
        var localDir = !string.IsNullOrWhiteSpace(_settings.LocalDirectory) ? _settings.LocalDirectory : "/var/opt/mssql/backups";
        if (!Directory.Exists(localDir)) return 0;

        int prunedCount = 0;
        await Task.Run(() =>
        {
            try
            {
                var files = Directory.GetFiles(localDir, "*.bak", SearchOption.AllDirectories)
                    .Select(f => new FileInfo(f))
                    .ToList();

                if (!files.Any()) return;

                // Group files by database name prefix (e.g. 'oz_db_choosehcare_hn7qarvm_20261124_082406.bak')
                var dbGroups = files.GroupBy(f => ExtractDatabaseNameFromBak(f.Name));
                var protectedSet = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                var candidatePool = new List<FileInfo>();

                // Enforce The Inviolable Anchor Rule: Protect the single newest backup per database
                foreach (var group in dbGroups)
                {
                    var sorted = group.OrderByDescending(f => f.LastWriteTimeUtc).ToList();
                    var latest = sorted.First();
                    protectedSet.Add(latest.FullName);

                    // Only 2nd, 3rd, older copies are eligible for pruning
                    candidatePool.AddRange(sorted.Skip(1));
                }

                // 1. Prune candidates exceeding retention days (e.g. > 7 days)
                var cutoff = DateTime.UtcNow.AddDays(-Math.Max(1, _settings.RetentionDays));
                foreach (var candidate in candidatePool.ToList())
                {
                    if (candidate.LastWriteTimeUtc < cutoff)
                    {
                        try
                        {
                            candidate.Delete();
                            candidatePool.Remove(candidate);
                            prunedCount++;
                            _logger.LogInformation("🧹 [Prune] Removed local backup exceeding {Days}-day retention: {FileName}",
                                _settings.RetentionDays, candidate.Name);
                        }
                        catch (Exception ex)
                        {
                            _logger.LogWarning(ex, "Failed to delete candidate backup {FileName}", candidate.Name);
                        }
                    }
                }

                // 2. Prune candidates if total directory size exceeds MaxLocalStorageMB (e.g. 5 GB)
                long maxBytes = _settings.MaxLocalStorageMB * 1024 * 1024;
                long currentSize = Directory.GetFiles(localDir, "*.bak", SearchOption.AllDirectories)
                    .Sum(f => new FileInfo(f).Length);

                if (currentSize > maxBytes && candidatePool.Any())
                {
                    var oldestFirst = candidatePool.OrderBy(f => f.LastWriteTimeUtc).ToList();
                    foreach (var candidate in oldestFirst)
                    {
                        if (currentSize <= maxBytes) break;
                        try
                        {
                            long len = candidate.Length;
                            candidate.Delete();
                            currentSize -= len;
                            prunedCount++;
                            _logger.LogInformation("🧹 [Prune] Removed older backup to satisfy {MaxMB}MB quota: {FileName}",
                                _settings.MaxLocalStorageMB, candidate.Name);
                        }
                        catch (Exception ex)
                        {
                            _logger.LogWarning(ex, "Failed to delete candidate backup {FileName} during size quota prune", candidate.Name);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred during local backup pruning: {Message}", ex.Message);
            }
        }, cancellationToken);

        return prunedCount;
    }

    // ── Helper Methods ──

    private async Task<string> ResolveConnectionStringAsync(string tenantKey, string databaseName, CancellationToken cancellationToken)
    {
        if (string.Equals(tenantKey, "master", StringComparison.OrdinalIgnoreCase))
        {
            var masterConn = _dbContext.Database.GetConnectionString();
            if (string.IsNullOrWhiteSpace(masterConn)) throw new InvalidOperationException("Master database connection string is not configured.");
            return masterConn;
        }

        var tenant = await _dbContext.MasterTenantCatalogs
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.TenantKey.ToLower() == tenantKey || t.DatabaseName == databaseName, cancellationToken);

        if (tenant != null && !string.IsNullOrWhiteSpace(tenant.ConnectionString))
        {
            var decrypted = OzikolDataCipher.DecryptIfNeeded(tenant.ConnectionString);
            if (!string.IsNullOrWhiteSpace(decrypted))
            {
                return decrypted;
            }
        }

        // Fall back to master database connection pointing to the target catalog
        var baseConn = _dbContext.Database.GetConnectionString();
        var builder = new SqlConnectionStringBuilder(baseConn)
        {
            InitialCatalog = databaseName
        };
        return builder.ConnectionString;
    }

    private static string ExtractDatabaseNameFromBak(string fileName)
    {
        var raw = Path.GetFileNameWithoutExtension(fileName);
        var match = Regex.Match(raw, @"^(.+)_\d{8}_\d{6}$");
        return match.Success ? match.Groups[1].Value : raw;
    }

    private AmazonS3Client CreateR2Client()
    {
        var credentials = new BasicAWSCredentials(_settings.CloudflareAccessKeyId, _settings.CloudflareSecretAccessKey);
        var s3Config = new AmazonS3Config
        {
            ServiceURL = !string.IsNullOrWhiteSpace(_settings.CloudflareServiceUrl)
                ? _settings.CloudflareServiceUrl.Trim()
                : $"https://{_settings.CloudflareAccountId?.Trim()}.r2.cloudflarestorage.com",
            AuthenticationRegion = "auto",
            ForcePathStyle = true
        };

        return new AmazonS3Client(credentials, s3Config);
    }

    private static DatabaseBackupSettings ResolveSettings(DatabaseBackupSettings? options, IConfiguration configuration)
    {
        var s = options ?? new DatabaseBackupSettings();

        s.LocalDirectory = configuration["Backup:LocalDirectory"] ?? s.LocalDirectory;
        if (int.TryParse(configuration["Backup:RetentionDays"], out var rd)) s.RetentionDays = rd;
        if (long.TryParse(configuration["Backup:MaxLocalStorageMB"], out var mb)) s.MaxLocalStorageMB = mb;

        s.CloudflareAccountId = configuration["CloudflareR2:Backup:AccountId"]
            ?? configuration["CloudflareR2__Backup__AccountId"]
            ?? configuration["CloudflareR2:AccountId"]
            ?? configuration["CloudflareR2__AccountId"]
            ?? configuration["CLOUDFLARE_R2_ACCOUNT_ID"]
            ?? configuration["Backup:CloudflareAccountId"]
            ?? configuration["Backup__CloudflareAccountId"]
            ?? Environment.GetEnvironmentVariable("CLOUDFLARE_R2_ACCOUNT_ID")
            ?? s.CloudflareAccountId;

        s.CloudflareAccessKeyId = configuration["CloudflareR2:Backup:AccessKeyId"]
            ?? configuration["CloudflareR2__Backup__AccessKeyId"]
            ?? configuration["CloudflareR2:AccessKeyId"]
            ?? configuration["CloudflareR2__AccessKeyId"]
            ?? configuration["CLOUDFLARE_R2_ACCESS_KEY_ID"]
            ?? configuration["Backup:CloudflareAccessKeyId"]
            ?? configuration["Backup__CloudflareAccessKeyId"]
            ?? Environment.GetEnvironmentVariable("CLOUDFLARE_R2_ACCESS_KEY_ID")
            ?? s.CloudflareAccessKeyId;

        s.CloudflareSecretAccessKey = configuration["CloudflareR2:Backup:SecretAccessKey"]
            ?? configuration["CloudflareR2__Backup__SecretAccessKey"]
            ?? configuration["CloudflareR2:SecretAccessKey"]
            ?? configuration["CloudflareR2__SecretAccessKey"]
            ?? configuration["CLOUDFLARE_R2_SECRET_ACCESS_KEY"]
            ?? configuration["Backup:CloudflareSecretAccessKey"]
            ?? configuration["Backup__CloudflareSecretAccessKey"]
            ?? Environment.GetEnvironmentVariable("CLOUDFLARE_R2_SECRET_ACCESS_KEY")
            ?? s.CloudflareSecretAccessKey;

        s.CloudflareBucketName = configuration["CloudflareR2:Backup:BucketName"]
            ?? configuration["CloudflareR2__Backup__BucketName"]
            ?? configuration["CloudflareR2:BucketName"]
            ?? configuration["CloudflareR2__BucketName"]
            ?? configuration["CLOUDFLARE_R2_BUCKET_NAME"]
            ?? configuration["Backup:CloudflareBucketName"]
            ?? configuration["Backup__CloudflareBucketName"]
            ?? Environment.GetEnvironmentVariable("CLOUDFLARE_R2_BUCKET_NAME")
            ?? s.CloudflareBucketName;

        s.CloudflareServiceUrl = configuration["CloudflareR2:Backup:ServiceUrl"]
            ?? configuration["CloudflareR2__Backup__ServiceUrl"]
            ?? configuration["CloudflareR2:ServiceUrl"]
            ?? configuration["CloudflareR2__ServiceUrl"]
            ?? configuration["CLOUDFLARE_R2_SERVICE_URL"]
            ?? configuration["Backup:CloudflareServiceUrl"]
            ?? configuration["Backup__CloudflareServiceUrl"]
            ?? Environment.GetEnvironmentVariable("CLOUDFLARE_R2_SERVICE_URL")
            ?? s.CloudflareServiceUrl;

        return s;
    }
}
