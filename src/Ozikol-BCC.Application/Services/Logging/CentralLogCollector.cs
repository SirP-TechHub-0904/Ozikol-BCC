using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using MongoDB.Driver;
using Ozikol.MasterPersistence.EF.MasterSQL;
using Ozikol_BCC.Application.Commands.SetupCommands;
using Ozikol_BCC.Application.Interfaces.Services;
using Ozikol_BCC.Application.Models.Logging;

namespace Ozikol_BCC.Application.Services.Logging
{
    /// <summary>
    /// Central log collector that persists platform-wide telemetry, API crash reports,
    /// and client crashes into MongoDB. Dynamically resolves the MongoDB connection string
    /// from the Central Master Catalog database (MasterPlatformSettings) with zero hardcoded credentials.
    /// </summary>
    public class CentralLogCollector : ICentralLogCollector
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly IConfiguration _configuration;
        private readonly ILogger<CentralLogCollector> _logger;

        private static MongoClient? _mongoClient;
        private static string? _cachedConnectionString;
        private static bool _ttlIndexCreated;
        private static readonly SemaphoreSlim _initLock = new(1, 1);

        /// <summary>
        /// Initializes a new instance of the <see cref="CentralLogCollector"/> class.
        /// </summary>
        /// <param name="serviceProvider">Service provider to resolve scoped DbContext on demand.</param>
        /// <param name="configuration">Configuration for environment variable fallbacks.</param>
        /// <param name="logger">Diagnostic logger instance.</param>
        public CentralLogCollector(
            IServiceProvider serviceProvider,
            IConfiguration configuration,
            ILogger<CentralLogCollector> logger)
        {
            _serviceProvider = serviceProvider ?? throw new ArgumentNullException(nameof(serviceProvider));
            _configuration = configuration ?? throw new ArgumentNullException(nameof(configuration));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <inheritdoc />
        public async Task LogSystemExceptionAsync(
            Exception ex,
            string route,
            string method,
            string? tenantKey,
            string traceId,
            string? ipAddress = null,
            string? systemId = null,
            string? userId = null,
            string? userEmail = null,
            string? userAgent = null,
            Dictionary<string, object?>? metadata = null,
            CancellationToken cancellationToken = default)
        {
            var doc = new CentralLogDocument
            {
                TimestampUtc = DateTime.UtcNow,
                Level = "Error",
                Category = "SystemCrash",
                Application = "Ozikol-BCC.Api",
                TenantKey = tenantKey,
                TraceId = traceId,
                Route = route,
                HttpMethod = method,
                IpAddress = ipAddress,
                SystemId = systemId,
                UserId = userId,
                UserEmail = userEmail,
                UserAgent = userAgent,
                Message = $"{ex.GetType().FullName}: {ex.Message}",
                StackTrace = ex.StackTrace,
                Metadata = metadata
            };

            await LogTraceAsync(doc, cancellationToken);
        }

        /// <inheritdoc />
        public async Task LogClientCrashAsync(CrashReportDto report, CancellationToken cancellationToken = default)
        {
            var doc = new CentralLogDocument
            {
                TimestampUtc = report.OccurredAtUtc,
                Level = "Critical",
                Category = "ClientCrash",
                Application = $"ClientApp-{report.Platform}",
                TenantKey = report.ActiveTenantKey,
                Platform = report.Platform,
                IpAddress = report.IpAddress,
                SystemId = report.SystemId,
                UserId = report.UserId,
                UserEmail = report.UserEmail,
                Message = report.ExceptionMessage,
                StackTrace = report.StackTrace,
                Breadcrumbs = report.DiagnosticMetadata,
                Metadata = new Dictionary<string, object?>
                {
                    { "appVersion", report.AppVersion },
                    { "buildNumber", report.BuildNumber },
                    { "platform", report.Platform }
                }
            };

            await LogTraceAsync(doc, cancellationToken);
        }

        /// <inheritdoc />
        public async Task LogCentralEventAsync(CentralLogDocument document, CancellationToken cancellationToken = default)
        {
            await LogTraceAsync(document, cancellationToken);
        }

        /// <inheritdoc />
        public async Task LogSecurityAlertAsync(
            string alertType,
            string message,
            string? tenantKey,
            string? ipAddress,
            Dictionary<string, object?>? metadata = null,
            CancellationToken cancellationToken = default)
        {
            var mergedMeta = metadata ?? new Dictionary<string, object?>();
            if (!string.IsNullOrWhiteSpace(ipAddress))
            {
                mergedMeta["ipAddress"] = ipAddress;
            }

            var doc = new CentralLogDocument
            {
                TimestampUtc = DateTime.UtcNow,
                Level = "Warning",
                Category = "SecurityAlert",
                Application = "Ozikol-BCC.PlatformSecurity",
                TenantKey = tenantKey,
                Message = $"[{alertType}] {message}",
                Metadata = mergedMeta
            };

            await LogTraceAsync(doc, cancellationToken);
        }

        /// <inheritdoc />
        public async Task LogTraceAsync(CentralLogDocument document, CancellationToken cancellationToken = default)
        {
            try
            {
                var collection = await GetLogCollectionAsync(cancellationToken);
                if (collection == null)
                {
                    // MongoDB is not configured; fallback to structured ILogger
                    _logger.LogInformation(
                        "[CentralLogFallback] ({Category}/{Level}) {App} - {Message}",
                        document.Category,
                        document.Level,
                        document.Application,
                        document.Message);
                    return;
                }

                await collection.InsertOneAsync(document, cancellationToken: cancellationToken);
            }
            catch (Exception ex)
            {
                // Central log collector must never throw exceptions or disrupt API traffic
                _logger.LogWarning(ex, "Failed to persist central log document to MongoDB.");
            }
        }

        /// <summary>
        /// Resolves the MongoDB log collection dynamically from MasterPlatformSettings or environment fallback.
        /// </summary>
        private async Task<IMongoCollection<CentralLogDocument>?> GetLogCollectionAsync(CancellationToken cancellationToken)
        {
            string? connectionString = null;
            var databaseName = "OzikolLogsDb";
            var collectionName = "central_system_logs";

            // 1. Resolve dynamically from Central Master Catalog database
            try
            {
                using var scope = _serviceProvider.CreateScope();
                var masterContext = scope.ServiceProvider.GetService<MasterCatalogDbContext>();
                if (masterContext != null)
                {
                    var settings = await masterContext.MasterPlatformSettings
                        .AsNoTracking()
                        .FirstOrDefaultAsync(cancellationToken);

                    if (settings != null)
                    {
                        if (!string.IsNullOrWhiteSpace(settings.MongoLogsConnectionString))
                        {
                            connectionString = settings.MongoLogsConnectionString.Trim();
                        }

                        if (!string.IsNullOrWhiteSpace(settings.MongoLogsDatabaseName))
                        {
                            databaseName = settings.MongoLogsDatabaseName.Trim();
                        }

                        if (!string.IsNullOrWhiteSpace(settings.MongoLogsCollectionName))
                        {
                            collectionName = settings.MongoLogsCollectionName.Trim();
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogDebug(ex, "Unable to query Mongo settings from MasterCatalogDbContext; checking fallback.");
            }

            // 2. Fallback to environment variable or appsettings if not found in Central DB
            if (string.IsNullOrWhiteSpace(connectionString))
            {
                connectionString = _configuration["MONGODB_LOGS_CONNECTION_STRING"]
                                ?? _configuration["MongoDb:LogsConnectionString"]
                                ?? Environment.GetEnvironmentVariable("MONGODB_LOGS_CONNECTION_STRING");
            }

            if (string.IsNullOrWhiteSpace(connectionString))
            {
                return null;
            }

            // 3. Cache client instance thread-safely
            if (_mongoClient == null || _cachedConnectionString != connectionString)
            {
                await _initLock.WaitAsync(cancellationToken);
                try
                {
                    if (_mongoClient == null || _cachedConnectionString != connectionString)
                    {
                        _mongoClient = new MongoClient(connectionString);
                        _cachedConnectionString = connectionString;
                        _ttlIndexCreated = false;
                    }
                }
                finally
                {
                    _initLock.Release();
                }
            }

            var database = _mongoClient.GetDatabase(databaseName);
            var collection = database.GetCollection<CentralLogDocument>(collectionName);

            // 4. Ensure TTL index (30 days automatic expiration)
            if (!_ttlIndexCreated)
            {
                await _initLock.WaitAsync(cancellationToken);
                try
                {
                    if (!_ttlIndexCreated)
                    {
                        var indexKeys = Builders<CentralLogDocument>.IndexKeys.Ascending(doc => doc.TimestampUtc);
                        var indexOptions = new CreateIndexOptions { ExpireAfter = TimeSpan.FromDays(30), Name = "ttl_30d_timestamp" };
                        var indexModel = new CreateIndexModel<CentralLogDocument>(indexKeys, indexOptions);

                        var systemIdIndex = new CreateIndexModel<CentralLogDocument>(
                            Builders<CentralLogDocument>.IndexKeys.Ascending(doc => doc.SystemId),
                            new CreateIndexOptions { Name = "idx_systemId", Sparse = true });

                        var userIndex = new CreateIndexModel<CentralLogDocument>(
                            Builders<CentralLogDocument>.IndexKeys.Ascending(doc => doc.UserId).Ascending(doc => doc.UserEmail),
                            new CreateIndexOptions { Name = "idx_userId_email", Sparse = true });

                        var ipIndex = new CreateIndexModel<CentralLogDocument>(
                            Builders<CentralLogDocument>.IndexKeys.Ascending(doc => doc.IpAddress),
                            new CreateIndexOptions { Name = "idx_ipAddress", Sparse = true });

                        var tenantIndex = new CreateIndexModel<CentralLogDocument>(
                            Builders<CentralLogDocument>.IndexKeys.Ascending(doc => doc.TenantKey).Descending(doc => doc.TimestampUtc),
                            new CreateIndexOptions { Name = "idx_tenant_timestamp", Sparse = true });

                        await collection.Indexes.CreateManyAsync(new[] { indexModel, systemIdIndex, userIndex, ipIndex, tenantIndex }, cancellationToken: cancellationToken);
                        _ttlIndexCreated = true;
                    }
                }
                catch (Exception idxEx)
                {
                    _logger.LogDebug(idxEx, "TTL index creation check completed or already exists.");
                    _ttlIndexCreated = true; // Avoid retrying on every log write
                }
                finally
                {
                    _initLock.Release();
                }
            }

            return collection;
        }
    }
}
