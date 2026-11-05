using System;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Ozikol.MasterPersistence.EF.MasterSQL;

namespace Ozikol.Central.Services
{
    /// <summary>
    /// Data transfer object holding real-time VPS server hardware, operating system, and storage metrics.
    /// </summary>
    public class VpsSystemTelemetryDto
    {
        /// <summary>Total NVMe SSD / disk capacity in Gigabytes.</summary>
        public double TotalDiskGb { get; set; }

        /// <summary>Used disk space in Gigabytes.</summary>
        public double UsedDiskGb { get; set; }

        /// <summary>Free available disk space in Gigabytes.</summary>
        public double FreeDiskGb { get; set; }

        /// <summary>Disk utilization percentage (0 - 100%).</summary>
        public double DiskPercentUsed { get; set; }

        /// <summary>Health status of disk capacity ("Healthy", "Warning", or "Critical").</summary>
        public string DiskStatus { get; set; } = "Healthy";

        /// <summary>Mounted disk partition name or drive root (e.g. "/" or "C:\").</summary>
        public string DiskDeviceName { get; set; } = "/";

        /// <summary>Total system physical RAM in Megabytes.</summary>
        public double TotalRamMb { get; set; }

        /// <summary>Used system physical RAM in Megabytes.</summary>
        public double UsedRamMb { get; set; }

        /// <summary>Free / available system RAM in Megabytes.</summary>
        public double FreeRamMb { get; set; }

        /// <summary>RAM utilization percentage (0 - 100%).</summary>
        public double RamPercentUsed { get; set; }

        /// <summary>Health status of server RAM ("Healthy", "Warning", or "Critical").</summary>
        public string RamStatus { get; set; } = "Healthy";

        /// <summary>Total virtual CPU (vCPU) cores available on the server.</summary>
        public int CpuCoresCount { get; set; }

        /// <summary>Operating system description and kernel version.</summary>
        public string OperatingSystemDescription { get; set; } = string.Empty;

        /// <summary>Machine / container host name.</summary>
        public string MachineName { get; set; } = string.Empty;

        /// <summary>Total count of tenant organizations registered in Master Catalog.</summary>
        public int TotalTenantsCount { get; set; }

        /// <summary>Total count of active tenant databases provisioned.</summary>
        public int ActiveTenantsCount { get; set; }

        /// <summary>UTC timestamp when this telemetry snapshot was captured.</summary>
        public DateTime MeasuredAtUtc { get; set; } = DateTime.UtcNow;
    }

    /// <summary>
    /// Contract for collecting real-time server operating system, storage, and memory telemetry.
    /// </summary>
    public interface IVpsSystemTelemetryService
    {
        /// <summary>
        /// Collects real-time VPS hardware metrics including NVMe disk space, RAM consumption, and database counts.
        /// </summary>
        /// <param name="cancellationToken">Cancellation token for async operations.</param>
        /// <returns>Populated telemetry snapshot.</returns>
        Task<VpsSystemTelemetryDto> GetTelemetryAsync(CancellationToken cancellationToken = default);
    }

    /// <summary>
    /// Enterprise VPS System Telemetry service.
    /// Probes Linux (/proc/meminfo) and cross-platform DriveInfo to provide zero-dependency,
    /// live server resource metrics directly to Central operations without external third-party daemons.
    /// </summary>
    public class VpsSystemTelemetryService : IVpsSystemTelemetryService
    {
        private readonly MasterCatalogDbContext _dbContext;
        private readonly ILogger<VpsSystemTelemetryService> _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="VpsSystemTelemetryService"/> class.
        /// </summary>
        /// <param name="dbContext">Master catalog database context.</param>
        /// <param name="logger">Structured logger instance.</param>
        public VpsSystemTelemetryService(
            MasterCatalogDbContext dbContext,
            ILogger<VpsSystemTelemetryService> logger)
        {
            _dbContext = dbContext ?? throw new ArgumentNullException(nameof(dbContext));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        }

        /// <inheritdoc />
        public async Task<VpsSystemTelemetryDto> GetTelemetryAsync(CancellationToken cancellationToken = default)
        {
            var telemetry = new VpsSystemTelemetryDto
            {
                CpuCoresCount = Environment.ProcessorCount,
                OperatingSystemDescription = RuntimeInformation.OSDescription,
                MachineName = Environment.MachineName,
                MeasuredAtUtc = DateTime.UtcNow
            };

            // 1. Resolve NVMe / Disk Storage Metrics
            ResolveDiskMetrics(telemetry);

            // 2. Resolve RAM / Memory Metrics (Linux /proc/meminfo or GC fallback)
            ResolveRamMetrics(telemetry);

            // 3. Resolve Tenant Database Aggregates from Master Catalog
            try
            {
                telemetry.TotalTenantsCount = await _dbContext.MasterTenantCatalogs
                    .AsNoTracking()
                    .CountAsync(cancellationToken);

                telemetry.ActiveTenantsCount = await _dbContext.MasterTenantCatalogs
                    .AsNoTracking()
                    .CountAsync(t => t.IsActive, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to count tenant database records for VPS telemetry snapshot.");
            }

            return telemetry;
        }

        /// <summary>
        /// Inspects mounted drive volumes to calculate total, used, and free disk capacity.
        /// </summary>
        /// <param name="dto">Target telemetry DTO to populate.</param>
        private void ResolveDiskMetrics(VpsSystemTelemetryDto dto)
        {
            try
            {
                // In Linux containers, "/" represents the root volume mount.
                // In Windows development, find the drive hosting the application directory.
                DriveInfo? targetDrive = null;
                var drives = DriveInfo.GetDrives().Where(d => d.IsReady).ToList();

                if (RuntimeInformation.IsOSPlatform(OSPlatform.Linux))
                {
                    targetDrive = drives.FirstOrDefault(d => d.Name == "/")
                        ?? drives.FirstOrDefault(d => d.DriveType == DriveType.Fixed)
                        ?? drives.FirstOrDefault();
                }
                else
                {
                    var baseDriveName = Path.GetPathRoot(AppContext.BaseDirectory);
                    targetDrive = drives.FirstOrDefault(d => string.Equals(d.Name, baseDriveName, StringComparison.OrdinalIgnoreCase))
                        ?? drives.FirstOrDefault(d => d.DriveType == DriveType.Fixed)
                        ?? drives.FirstOrDefault();
                }

                if (targetDrive != null && targetDrive.TotalSize > 0)
                {
                    double totalGb = targetDrive.TotalSize / (1024.0 * 1024.0 * 1024.0);
                    double freeGb = targetDrive.AvailableFreeSpace / (1024.0 * 1024.0 * 1024.0);
                    double usedGb = Math.Max(0, totalGb - freeGb);
                    double percentUsed = Math.Round((usedGb / totalGb) * 100.0, 1);

                    dto.TotalDiskGb = Math.Round(totalGb, 1);
                    dto.UsedDiskGb = Math.Round(usedGb, 1);
                    dto.FreeDiskGb = Math.Round(freeGb, 1);
                    dto.DiskPercentUsed = percentUsed;
                    dto.DiskDeviceName = targetDrive.Name;

                    dto.DiskStatus = percentUsed switch
                    {
                        >= 90.0 => "Critical",
                        >= 80.0 => "Warning",
                        _ => "Healthy"
                    };
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Unable to inspect disk storage metrics on this environment.");
                dto.DiskStatus = "Unavailable";
            }
        }

        /// <summary>
        /// Reads physical memory metrics directly from /proc/meminfo in Linux or fallback to GC environment info.
        /// </summary>
        /// <param name="dto">Target telemetry DTO to populate.</param>
        private void ResolveRamMetrics(VpsSystemTelemetryDto dto)
        {
            // Path A: Linux kernel /proc/meminfo (Standard on Ubuntu / Debian / Docker on Linux)
            if (RuntimeInformation.IsOSPlatform(OSPlatform.Linux) && File.Exists("/proc/meminfo"))
            {
                try
                {
                    var lines = File.ReadAllLines("/proc/meminfo");
                    long memTotalKb = 0;
                    long memAvailableKb = 0;

                    foreach (var line in lines)
                    {
                        if (line.StartsWith("MemTotal:", StringComparison.OrdinalIgnoreCase))
                        {
                            memTotalKb = ParseMemInfoValueKb(line);
                        }
                        else if (line.StartsWith("MemAvailable:", StringComparison.OrdinalIgnoreCase))
                        {
                            memAvailableKb = ParseMemInfoValueKb(line);
                        }
                    }

                    if (memTotalKb > 0)
                    {
                        double totalMb = memTotalKb / 1024.0;
                        double availableMb = memAvailableKb / 1024.0;
                        double usedMb = Math.Max(0, totalMb - availableMb);
                        double percentUsed = Math.Round((usedMb / totalMb) * 100.0, 1);

                        dto.TotalRamMb = Math.Round(totalMb, 0);
                        dto.UsedRamMb = Math.Round(usedMb, 0);
                        dto.FreeRamMb = Math.Round(availableMb, 0);
                        dto.RamPercentUsed = percentUsed;

                        dto.RamStatus = percentUsed switch
                        {
                            >= 90.0 => "Critical",
                            >= 80.0 => "Warning",
                            _ => "Healthy"
                        };
                        return;
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogDebug(ex, "Failed to parse /proc/meminfo; attempting cross-platform fallback.");
                }
            }

            // Path B: Cross-platform GC memory inspection fallback
            try
            {
                var gcInfo = GC.GetGCMemoryInfo();
                double totalMb = gcInfo.TotalAvailableMemoryBytes / (1024.0 * 1024.0);
                double memoryLoadMb = gcInfo.MemoryLoadBytes / (1024.0 * 1024.0);

                if (totalMb > 0)
                {
                    double usedMb = Math.Min(memoryLoadMb, totalMb);
                    double freeMb = Math.Max(0, totalMb - usedMb);
                    double percentUsed = Math.Round((usedMb / totalMb) * 100.0, 1);

                    dto.TotalRamMb = Math.Round(totalMb, 0);
                    dto.UsedRamMb = Math.Round(usedMb, 0);
                    dto.FreeRamMb = Math.Round(freeMb, 0);
                    dto.RamPercentUsed = percentUsed;

                    dto.RamStatus = percentUsed switch
                    {
                        >= 90.0 => "Critical",
                        >= 80.0 => "Warning",
                        _ => "Healthy"
                    };
                }
                else
                {
                    // Fallback to current process working set if total memory is unreported
                    long workingSetBytes = Environment.WorkingSet;
                    dto.UsedRamMb = Math.Round(workingSetBytes / (1024.0 * 1024.0), 0);
                    dto.TotalRamMb = 8192; // Nominal 8 GB
                    dto.FreeRamMb = Math.Max(0, dto.TotalRamMb - dto.UsedRamMb);
                    dto.RamPercentUsed = Math.Round((dto.UsedRamMb / dto.TotalRamMb) * 100.0, 1);
                    dto.RamStatus = "Healthy";
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Unable to calculate memory load metrics.");
                dto.RamStatus = "Unavailable";
            }
        }

        /// <summary>
        /// Parses numeric kB values from Linux /proc/meminfo lines.
        /// Example format: "MemTotal:       8149840 kB"
        /// </summary>
        private static long ParseMemInfoValueKb(string line)
        {
            var parts = line.Split(':', StringSplitOptions.TrimEntries);
            if (parts.Length < 2) return 0;

            var numericPart = new string(parts[1].Where(char.IsDigit).ToArray());
            return long.TryParse(numericPart, out var result) ? result : 0;
        }
    }
}
