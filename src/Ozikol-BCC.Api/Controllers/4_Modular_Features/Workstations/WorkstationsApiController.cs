using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;
using Ozikol_BCC.Application.Interfaces.Services;
using Ozikol_BCC.Application.Services.Cloudinary;
using Ozikol_BCC.Api.Authorization;
using static Ozikol_BCC.Domain.Enum.Enum;

namespace Ozikol_BCC.Api.Controllers
{
    /// <summary>
    /// Governs enterprise workstations, application whitelisting, background process enforcement,
    /// document sandboxing, and station telemetry for the "Workspace (Desktop only)" suite (bcp-workspace).
    /// </summary>
    [ApiController]
    [Route("api/Workstations")]
    [RequireFeature("bcp-workspace")]
    [Tags("Workstations & Application Gatekeeper")]
    public class WorkstationsApiController : ControllerBase
    {
        private readonly DashboardDbContext _db;
        private readonly ITenantActivityLogger? _activityLogger;
        private readonly ICentralNotificationDispatcher? _notificationDispatcher;
        private readonly ICloudinaryService? _cloudinaryService;

        private static readonly ConcurrentDictionary<string, bool> _pendingScreenshotRequests = new(StringComparer.OrdinalIgnoreCase);
        private static bool _activityTableChecked = false;

        public WorkstationsApiController(
            DashboardDbContext db,
            ITenantActivityLogger? activityLogger = null,
            ICentralNotificationDispatcher? notificationDispatcher = null,
            ICloudinaryService? cloudinaryService = null)
        {
            _db = db;
            _activityLogger = activityLogger;
            _notificationDispatcher = notificationDispatcher;
            _cloudinaryService = cloudinaryService;
        }

        // =====================================================================
        // 1. WORKSTATION REGISTRY & TELEMETRY HEARTBEATS
        // =====================================================================

        /// <summary>
        /// Lists all registered workstations with live heartbeat status, assigned users, and active windows.
        /// </summary>
        [HttpGet("stations")]
        public async Task<IActionResult> GetStations()
        {
            var now = DateTime.UtcNow;
            var stations = await _db.BcpWorkstations
                .AsNoTracking()
                .OrderByDescending(s => s.LastHeartbeat)
                .ToListAsync();

            // Refresh online status based on active Work Mode 18-second heartbeat window
            var deduplicated = stations.GroupBy(s => (!string.IsNullOrEmpty(s.StationKey) ? s.StationKey : s.MachineName).Trim().ToUpperInvariant()).Select(g => g.OrderByDescending(x => x.LastHeartbeat ?? x.CreatedAt).First()).ToList();
            var result = deduplicated.Select(s =>
            {
                var online = s.IsOnline && s.LastHeartbeat.HasValue && (now - s.LastHeartbeat.Value).TotalSeconds <= 18;
                return new
                {
                    s.Id,
                    s.StationKey,
                    s.MachineName,
                    s.HardwareGuid,
                    s.AssignedUserId,
                    s.AssignedUserName,
                    s.AssignedUserEmail,
                    s.Department,
                    s.IpAddress,
                    s.OsVersion,
                    s.ClientVersion,
                    IsOnline = online,
                    s.LastHeartbeat,
                    CurrentProcessName = online ? s.CurrentProcessName : null,
                    CurrentWindowTitle = online ? s.CurrentWindowTitle : null,
                    CurrentDocumentPath = online ? s.CurrentDocumentPath : null,
                    s.IsLocked,
                    s.LockReason,
                    s.KioskEnforced,
                    s.CreatedAt,
                    s.UpdatedAt
                };
            });

            return Ok(new { success = true, data = result });
        }

        /// <summary>
        /// Registers or syncs a desktop computer handshake upon starting the BCC desktop app.
        /// </summary>
        [HttpPost("register")]
        public async Task<IActionResult> RegisterStation([FromBody] RegisterStationDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.MachineName))
            {
                return BadRequest(new { success = false, message = "MachineName is required." });
            }

            var stationKey = !string.IsNullOrWhiteSpace(dto.StationKey)
                ? dto.StationKey.Trim().ToUpperInvariant()
                : dto.MachineName.Trim().ToUpperInvariant();

            var existing = await _db.BcpWorkstations
                .FirstOrDefaultAsync(s => s.StationKey == stationKey || 
                                          (!string.IsNullOrEmpty(dto.HardwareGuid) && s.HardwareGuid == dto.HardwareGuid));

            var clientIp = HttpContext.Connection.RemoteIpAddress?.ToString();
            var previousUserName = existing?.AssignedUserName;
            var previousUserEmail = existing?.AssignedUserEmail;
            var isDifferentUserOnPc = existing != null &&
                                      !string.IsNullOrWhiteSpace(previousUserName) &&
                                      !string.IsNullOrWhiteSpace(dto.UserName) &&
                                      !string.Equals(previousUserName.Trim(), dto.UserName.Trim(), StringComparison.OrdinalIgnoreCase);

            if (existing == null)
            {
                existing = new BcpWorkstation
                {
                    StationKey = stationKey,
                    MachineName = dto.MachineName.Trim(),
                    HardwareGuid = dto.HardwareGuid?.Trim(),
                    AssignedUserId = dto.UserId,
                    AssignedUserName = dto.UserName,
                    AssignedUserEmail = dto.UserEmail,
                    Department = dto.Department,
                    IpAddress = clientIp,
                    OsVersion = dto.OsVersion,
                    ClientVersion = dto.ClientVersion,
                    IsOnline = false,
                    LastHeartbeat = null,
                    KioskEnforced = dto.KioskEnforced
                };
                _db.BcpWorkstations.Add(existing);
            }
            else
            {
                existing.MachineName = dto.MachineName.Trim();
                if (!string.IsNullOrEmpty(dto.HardwareGuid)) existing.HardwareGuid = dto.HardwareGuid.Trim();
                if (!string.IsNullOrEmpty(dto.UserId)) existing.AssignedUserId = dto.UserId;
                if (!string.IsNullOrEmpty(dto.UserName)) existing.AssignedUserName = dto.UserName;
                if (!string.IsNullOrEmpty(dto.UserEmail)) existing.AssignedUserEmail = dto.UserEmail;
                if (!string.IsNullOrEmpty(dto.Department)) existing.Department = dto.Department;
                existing.IpAddress = clientIp;
                existing.OsVersion = dto.OsVersion ?? existing.OsVersion;
                existing.ClientVersion = dto.ClientVersion ?? existing.ClientVersion;
                existing.UpdatedAt = DateTime.UtcNow;
            }

            await _db.SaveChangesAsync();

            // Notify administrators if a different operator signed into this physical PC
            try
            {
                if (isDifferentUserOnPc)
                {
                    await DispatchWorkstationNotificationAsync(
                        title: $"Operator Account Changed on PC {existing.MachineName}",
                        message: $"<strong>{existing.AssignedUserName}</strong> ({existing.AssignedUserEmail ?? "N/A"}) signed into the desktop app on workstation <strong>{existing.MachineName} ({existing.StationKey})</strong>, which was previously used by <strong>{previousUserName}</strong>.",
                        severity: NotificationSeverity.Update,
                        targetUserIdOrEmail: existing.AssignedUserEmail ?? existing.AssignedUserId,
                        targetUserName: existing.AssignedUserName,
                        sendEmail: true,
                        icon: "switch_account"
                    );
                }
            }
            catch
            {
                // Non-blocking notification
            }

            // Return active station state along with active app whitelist and file rules
            var appPolicies = await _db.BcpWorkstationAppPolicies
                .AsNoTracking()
                .Where(p => p.IsAllowed)
                .Select(p => p.ProcessName.ToLowerInvariant())
                .ToListAsync();

            var filePolicy = await _db.BcpWorkstationFilePolicies.AsNoTracking().FirstOrDefaultAsync();

            return Ok(new
            {
                success = true,
                data = new
                {
                    stationId = existing.Id,
                    stationKey = existing.StationKey,
                    isLocked = existing.IsLocked,
                    lockReason = existing.LockReason,
                    kioskEnforced = existing.KioskEnforced,
                    allowedProcesses = appPolicies,
                    approvedDirectory = !string.IsNullOrWhiteSpace(filePolicy?.ApprovedDirectoryPath) ? filePolicy.ApprovedDirectoryPath : await ResolveDefaultApprovedDirectoryAsync(),
                    blockUsbStorage = filePolicy?.BlockUsbStorage ?? true
                }
            });
        }

        /// <summary>
        /// Regular telemetry heartbeat from native desktop client (sends active window/document, receives remote lock signals).
        /// </summary>
        [HttpPost("heartbeat")]
        public async Task<IActionResult> Heartbeat([FromBody] StationHeartbeatDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.StationKey))
            {
                return BadRequest(new { success = false, message = "StationKey is required." });
            }

            var key = dto.StationKey.Trim().ToUpperInvariant();
            var station = await _db.BcpWorkstations.FirstOrDefaultAsync(s => s.StationKey == key);
            if (station == null)
            {
                return NotFound(new { success = false, message = "Station not found." });
            }

            if (string.Equals(dto.CurrentProcessName, "SHIFT_CLOSED", StringComparison.OrdinalIgnoreCase))
            {
                station.IsOnline = false;
                station.LastHeartbeat = null;
                station.CurrentProcessName = null;
                station.CurrentWindowTitle = null;
                station.CurrentDocumentPath = null;
            }
            else
            {
                station.IsOnline = true;
                station.LastHeartbeat = DateTime.UtcNow;
                station.CurrentProcessName = dto.CurrentProcessName;
                station.CurrentWindowTitle = dto.CurrentWindowTitle;
                station.CurrentDocumentPath = dto.CurrentDocumentPath;
            }
            if (!string.IsNullOrEmpty(dto.IpAddress)) station.IpAddress = dto.IpAddress;

            await _db.SaveChangesAsync();

            // Check if there are active temporary access approvals for this station / user
            var activeApprovals = await _db.BcpWorkstationAccessRequests
                .AsNoTracking()
                .Where(r => r.MachineName == station.MachineName &&
                            r.Status == "Approved" &&
                            r.ApprovedUntil.HasValue &&
                            r.ApprovedUntil.Value > DateTime.UtcNow)
                .Select(r => r.RequestedProcessName.ToLowerInvariant())
                .ToListAsync();

            // Check if an admin requested an immediate screenshot from this workstation
            var captureScreenshotNow = _pendingScreenshotRequests.TryRemove(station.StationKey, out _) ||
                                       _pendingScreenshotRequests.TryRemove(station.MachineName, out _);

            return Ok(new
            {
                success = true,
                data = new
                {
                    isLocked = station.IsLocked,
                    lockReason = station.LockReason,
                    kioskEnforced = station.KioskEnforced,
                    approvedTemporaryProcesses = activeApprovals,
                    captureScreenshotNow = captureScreenshotNow
                }
            });
        }

        /// <summary>
        /// Remotely or locally (on inactivity) locks or unlocks an office computer.
        /// Supports lookup by either StationId (Web Admin Console) or StationKey (Native Desktop Client).
        /// </summary>
        [HttpPost("lock")]
        public async Task<IActionResult> SetLockState([FromBody] RemoteLockStationDto dto)
        {
            BcpWorkstation? station = null;

            if (dto.StationId.HasValue && dto.StationId.Value != Guid.Empty)
            {
                station = await _db.BcpWorkstations.FindAsync(dto.StationId.Value);
            }

            if (station == null && !string.IsNullOrWhiteSpace(dto.StationKey))
            {
                var key = dto.StationKey.Trim().ToUpperInvariant();
                station = await _db.BcpWorkstations
                    .OrderByDescending(s => s.LastHeartbeat)
                    .FirstOrDefaultAsync(s => s.StationKey.ToUpper() == key || s.MachineName.ToUpper() == key);
            }

            if (station == null)
            {
                return NotFound(new { success = false, message = "Station not found." });
            }

            var targetLock = dto.Lock ?? dto.IsLocked ?? false;
            var reasonText = !string.IsNullOrWhiteSpace(dto.Reason) ? dto.Reason : dto.LockReason;
            var previousLockTime = station.UpdatedAt;

            station.IsLocked = targetLock;
            station.LockReason = targetLock ? (reasonText ?? "Locked due to workstation inactivity.") : null;
            station.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();

            try
            {
                await EnsureActivityLogTableExistsAsync();
                int? lockedSeconds = null;
                if (!targetLock && previousLockTime.HasValue)
                {
                    lockedSeconds = Math.Max(1, (int)(DateTime.UtcNow - previousLockTime.Value).TotalSeconds);
                }

                var isPasswordResume = !targetLock && (reasonText?.Contains("password", StringComparison.OrdinalIgnoreCase) == true);
                var isIdleLock = targetLock && (station.LockReason?.Contains("inactivity", StringComparison.OrdinalIgnoreCase) == true);

                _db.BcpWorkstationActivityLogs.Add(new BcpWorkstationActivityLog
                {
                    WorkstationId = station.Id,
                    StationKey = station.StationKey,
                    MachineName = station.MachineName,
                    UserId = station.AssignedUserId,
                    UserName = station.AssignedUserName ?? "Station Staff",
                    UserEmail = station.AssignedUserEmail,
                    EventType = targetLock
                        ? (isIdleLock ? "IDLE_LOCKED" : "ADMIN_LOCKED")
                        : (isPasswordResume ? "PASSWORD_RESUMED" : "ADMIN_UNLOCKED"),
                    StartedAt = !targetLock && previousLockTime.HasValue ? previousLockTime.Value : DateTime.UtcNow,
                    EndedAt = !targetLock ? DateTime.UtcNow : null,
                    DurationSeconds = lockedSeconds,
                    Details = targetLock
                        ? (station.LockReason ?? "Workstation locked.")
                        : (isPasswordResume
                            ? $"Operator verified account password and resumed work duty{(lockedSeconds.HasValue ? $" after {lockedSeconds.Value}s locked" : "")}."
                            : "Workstation unlocked by Administrator."),
                    Timestamp = DateTime.UtcNow
                });
                await _db.SaveChangesAsync();
            }
            catch { }

            if (_activityLogger != null)
            {
                await _activityLogger.LogAsync(
                    targetLock ? "WORKSTATION_LOCKED" : "WORKSTATION_UNLOCKED",
                    $"Station '{station.MachineName}' was {(targetLock ? "locked" : "unlocked")}. Reason: {station.LockReason ?? reasonText ?? "User authenticated"}",
                    module: "Workstations"
                );
            }

            await DispatchWorkstationNotificationAsync(
                title: targetLock ? $"Workstation Locked: {station.MachineName}" : $"Workstation Unlocked: {station.MachineName}",
                message: targetLock
                    ? $"Workstation <strong>{station.MachineName}</strong> (Operator: <strong>{station.AssignedUserName ?? "Staff"}</strong>) has been locked. Reason: {station.LockReason ?? "Inactivity or remote lock"}."
                    : $"Workstation <strong>{station.MachineName}</strong> (Operator: <strong>{station.AssignedUserName ?? "Staff"}</strong>) has been unlocked and resumed active duty.",
                severity: targetLock ? NotificationSeverity.Failed : NotificationSeverity.Success,
                targetUserIdOrEmail: station.AssignedUserId ?? station.AssignedUserEmail,
                targetUserName: station.AssignedUserName,
                sendEmail: targetLock,
                icon: targetLock ? "lock" : "lock_open"
            );

            return Ok(new
            {
                success = true,
                message = $"Workstation {station.MachineName} has been {(targetLock ? "locked" : "unlocked")}.",
                isLocked = station.IsLocked
            });
        }

        // =====================================================================
        // 2. APPLICATION WHITELIST & FILE POLICIES
        // =====================================================================

        /// <summary>
        /// Retrieves the current application whitelist, approved document paths, and USB policies.
        /// </summary>
        [HttpGet("policies")]
        public async Task<IActionResult> GetPolicies()
        {
            var allPolicies = await _db.BcpWorkstationAppPolicies
                .OrderBy(p => p.CreatedAt)
                .ToListAsync();

            var approvedRequests = await _db.BcpWorkstationAccessRequests
                .AsNoTracking()
                .Where(r => r.Status == "Approved")
                .ToListAsync();

            var approvedProcessSet = approvedRequests
                .Select(r => (r.RequestedProcessName ?? string.Empty).Trim().ToLowerInvariant())
                .Where(s => !string.IsNullOrEmpty(s))
                .ToHashSet();

            var legacyAutoSeedIcons = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                "description", "table_view", "slideshow", "picture_as_pdf", "calculate", "chat"
            };

            var seenProcesses = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var toRemove = new List<BcpWorkstationAppPolicy>();

            foreach (var policy in allPolicies)
            {
                var procKey = (policy.ProcessName ?? string.Empty).Trim().ToLowerInvariant();
                if (string.IsNullOrEmpty(procKey))
                {
                    toRemove.Add(policy);
                    continue;
                }

                // Remove legacy hardcoded auto-seeded presets if the admin never approved them
                var isLegacyAutoSeed = !string.IsNullOrEmpty(policy.IconName) &&
                                       legacyAutoSeedIcons.Contains(policy.IconName) &&
                                       !approvedProcessSet.Contains(procKey);
                if (isLegacyAutoSeed)
                {
                    toRemove.Add(policy);
                    continue;
                }

                // Remove duplicate entries for the same executable
                if (!seenProcesses.Add(procKey))
                {
                    toRemove.Add(policy);
                }
            }

            // Ensure every explicitly Approved access request is present in the whitelist once
            var addedAny = false;
            foreach (var req in approvedRequests)
            {
                var procKey = (req.RequestedProcessName ?? string.Empty).Trim().ToLowerInvariant();
                if (!string.IsNullOrEmpty(procKey) && seenProcesses.Add(procKey))
                {
                    var baseTitle = System.IO.Path.GetFileNameWithoutExtension(procKey);
                    var friendlyName = !string.IsNullOrWhiteSpace(baseTitle)
                        ? char.ToUpperInvariant(baseTitle[0]) + baseTitle.Substring(1)
                        : procKey;

                    _db.BcpWorkstationAppPolicies.Add(new BcpWorkstationAppPolicy
                    {
                        DisplayName = friendlyName,
                        ProcessName = procKey,
                        Category = "Approved Requests",
                        IsAllowed = true,
                        IconName = "apps"
                    });
                    addedAny = true;
                }
            }

            if (toRemove.Count > 0 || addedAny)
            {
                if (toRemove.Count > 0)
                {
                    _db.BcpWorkstationAppPolicies.RemoveRange(toRemove);
                }
                await _db.SaveChangesAsync();
            }

            var appPolicies = await _db.BcpWorkstationAppPolicies
                .AsNoTracking()
                .OrderBy(p => p.DisplayName)
                .ToListAsync();

            var filePolicy = await _db.BcpWorkstationFilePolicies
                .AsNoTracking()
                .FirstOrDefaultAsync();

            if (filePolicy == null)
            {
                filePolicy = new BcpWorkstationFilePolicy
                {
                    ApprovedDirectoryPath = await ResolveDefaultApprovedDirectoryAsync(),
                    BlockUsbStorage = true,
                    UsbStoragePolicy = "Blocked",
                    EnforceDirectorySandbox = true
                };
            }

            return Ok(new
            {
                success = true,
                data = new
                {
                    apps = appPolicies,
                    filePolicy = filePolicy
                }
            });
        }

        /// <summary>
        /// Adds a new application to the approved whitelist.
        /// </summary>
        [HttpPost("policies/apps")]
        public async Task<IActionResult> AddAppPolicy([FromBody] AddAppPolicyDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.DisplayName) || string.IsNullOrWhiteSpace(dto.ProcessName))
            {
                return BadRequest(new { success = false, message = "DisplayName and ProcessName are required." });
            }

            var cleanProcess = dto.ProcessName.Trim().ToLowerInvariant();
            if (!cleanProcess.EndsWith(".exe") && !cleanProcess.Contains('.'))
            {
                cleanProcess += ".exe";
            }

            var existing = await _db.BcpWorkstationAppPolicies
                .FirstOrDefaultAsync(p => p.ProcessName.ToLower() == cleanProcess);

            if (existing != null)
            {
                existing.DisplayName = dto.DisplayName.Trim();
                existing.Category = dto.Category?.Trim() ?? existing.Category;
                existing.IsAllowed = dto.IsAllowed;
                existing.ApplicableRole = dto.ApplicableRole;
                existing.IconName = dto.IconName ?? existing.IconName;
                existing.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                existing = new BcpWorkstationAppPolicy
                {
                    DisplayName = dto.DisplayName.Trim(),
                    ProcessName = cleanProcess,
                    Category = dto.Category?.Trim() ?? "General",
                    IsAllowed = dto.IsAllowed,
                    ApplicableRole = dto.ApplicableRole,
                    IconName = dto.IconName ?? "apps"
                };
                _db.BcpWorkstationAppPolicies.Add(existing);
            }

            await _db.SaveChangesAsync();

            return Ok(new { success = true, message = "App policy saved successfully.", data = existing });
        }

        /// <summary>
        /// Removes an application rule from the whitelist.
        /// </summary>
        [HttpDelete("policies/apps/{id}")]
        public async Task<IActionResult> DeleteAppPolicy(Guid id)
        {
            var policy = await _db.BcpWorkstationAppPolicies.FindAsync(id);
            if (policy == null)
            {
                return NotFound(new { success = false, message = "Policy not found." });
            }

            _db.BcpWorkstationAppPolicies.Remove(policy);
            await _db.SaveChangesAsync();

            return Ok(new { success = true, message = "App policy removed." });
        }

        /// <summary>
        /// Updates document sandbox paths and USB lockdown rules.
        /// </summary>
        [HttpPost("policies/file-rules")]
        public async Task<IActionResult> UpdateFileRules([FromBody] UpdateFilePolicyDto dto)
        {
            var policy = await _db.BcpWorkstationFilePolicies.FirstOrDefaultAsync();
            if (policy == null)
            {
                policy = new BcpWorkstationFilePolicy();
                _db.BcpWorkstationFilePolicies.Add(policy);
            }

            if (!string.IsNullOrWhiteSpace(dto.ApprovedDirectoryPath))
            {
                policy.ApprovedDirectoryPath = dto.ApprovedDirectoryPath.Trim();
            }

            policy.BlockUsbStorage = dto.BlockUsbStorage;
            policy.UsbStoragePolicy = dto.UsbStoragePolicy ?? (dto.BlockUsbStorage ? "Blocked" : "Allowed");
            policy.EnforceDirectorySandbox = dto.EnforceDirectorySandbox;
            policy.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();

            return Ok(new { success = true, message = "File and USB policies updated successfully.", data = policy });
        }

        // =====================================================================
        // 3. VIOLATION INTERCEPTIONS & SECURITY AUDIT FEED
        // =====================================================================

        /// <summary>
        /// Reported by the native desktop client whenever an unauthorized application is killed or blocked.
        /// </summary>
        [HttpPost("violations")]
        public async Task<IActionResult> ReportViolation([FromBody] ReportViolationDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.ProcessName))
            {
                return BadRequest(new { success = false, message = "ProcessName is required." });
            }

            var log = new BcpWorkstationViolationLog
            {
                WorkstationId = dto.WorkstationId,
                MachineName = dto.MachineName ?? "Unknown PC",
                UserId = dto.UserId,
                UserName = dto.UserName ?? "Station Staff",
                ProcessName = dto.ProcessName.Trim(),
                WindowTitle = dto.WindowTitle,
                FilePath = dto.FilePath,
                ActionTaken = dto.ActionTaken ?? "TERMINATED",
                ViolationType = dto.ViolationType ?? "UNAPPROVED_APP",
                Timestamp = DateTime.UtcNow
            };

            _db.BcpWorkstationViolationLogs.Add(log);

            // Also mirror to global Activity Logs for unified compliance visibility
            if (_activityLogger != null)
            {
                await _activityLogger.LogAsync(
                    "WORKSTATION_VIOLATION_INTERCEPTED",
                    $"Unauthorized process '{log.ProcessName}' ({log.WindowTitle ?? "No Title"}) was intercepted on station '{log.MachineName}' by user '{log.UserName}'.",
                    module: "Workstations"
                );
            }

            await _db.SaveChangesAsync();

            await DispatchWorkstationNotificationAsync(
                title: $"Security Violation Intercepted on {log.MachineName}",
                message: $"Unauthorized application <code>{log.ProcessName}</code> ({log.WindowTitle ?? "Restricted Process"}) was intercepted and {log.ActionTaken.ToLowerInvariant()} on workstation <strong>{log.MachineName}</strong> (Operator: <strong>{log.UserName}</strong>).",
                severity: NotificationSeverity.Error,
                targetUserIdOrEmail: log.UserId,
                targetUserName: log.UserName,
                sendEmail: true,
                icon: "gavel"
            );

            return Ok(new { success = true, message = "Violation logged.", logId = log.Id });
        }

        /// <summary>
        /// Retrieves the list of workstation violation events for management audit.
        /// </summary>
        [HttpGet("violations")]
        public async Task<IActionResult> GetViolations([FromQuery] int limit = 50)
        {
            var logs = await _db.BcpWorkstationViolationLogs
                .AsNoTracking()
                .OrderByDescending(v => v.Timestamp)
                .Take(Math.Min(limit, 200))
                .ToListAsync();

            return Ok(new { success = true, data = logs });
        }

        // =====================================================================
        // 4. EMPLOYEE ACCESS REQUESTS & APPROVALS
        // =====================================================================

        /// <summary>
        /// Submitted by an employee from their workstation requesting permission to run a restricted app.
        /// </summary>
        [HttpPost("request-access")]
        public async Task<IActionResult> RequestAccess([FromBody] CreateAccessRequestDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.RequestedProcessName) || string.IsNullOrWhiteSpace(dto.Reason))
            {
                return BadRequest(new { success = false, message = "RequestedProcessName and Reason are required." });
            }

            var req = new BcpWorkstationAccessRequest
            {
                WorkstationId = dto.WorkstationId,
                MachineName = dto.MachineName ?? "Workstation",
                UserId = dto.UserId ?? "Unknown",
                UserName = dto.UserName ?? "Staff Member",
                RequestedProcessName = dto.RequestedProcessName.Trim().ToLowerInvariant(),
                Reason = dto.Reason.Trim(),
                Status = "Pending",
                CreatedAt = DateTime.UtcNow
            };

            _db.BcpWorkstationAccessRequests.Add(req);
            await _db.SaveChangesAsync();

            await DispatchWorkstationNotificationAsync(
                title: $"App Access Request: {req.RequestedProcessName} ({req.MachineName})",
                message: $"<strong>{req.UserName}</strong> on workstation <strong>{req.MachineName}</strong> requested permission to use <code>{req.RequestedProcessName}</code>.<br/><br/><strong>Reason:</strong> {req.Reason}",
                severity: NotificationSeverity.Update,
                targetUserIdOrEmail: req.UserId,
                targetUserName: req.UserName,
                sendEmail: true,
                icon: "pending_actions"
            );

            return Ok(new { success = true, message = "Access request submitted. Awaiting manager approval.", requestId = req.Id });
        }

        /// <summary>
        /// Lists pending or historical application access requests.
        /// </summary>
        [HttpGet("requests")]
        public async Task<IActionResult> GetAccessRequests([FromQuery] string? status = null)
        {
            var query = _db.BcpWorkstationAccessRequests.AsNoTracking();
            if (!string.IsNullOrEmpty(status))
            {
                query = query.Where(r => r.Status == status);
            }

            var requests = await query.OrderByDescending(r => r.CreatedAt).Take(100).ToListAsync();

            return Ok(new { success = true, data = requests });
        }

        /// <summary>
        /// Administrator approves or denies an employee's application access request.
        /// </summary>
        [HttpPost("requests/{id}/respond")]
        public async Task<IActionResult> RespondToAccessRequest(Guid id, [FromBody] RespondAccessRequestDto dto)
        {
            var req = await _db.BcpWorkstationAccessRequests.FindAsync(id);
            if (req == null)
            {
                return NotFound(new { success = false, message = "Request not found." });
            }

            req.Status = dto.Approve ? "Approved" : "Denied";
            req.ReviewedByUserId = dto.AdminUserId ?? "Administrator";
            req.ReviewedAt = DateTime.UtcNow;

            if (dto.Approve)
            {
                // Set approval duration (e.g. 2 hours, 8 hours, 24 hours, or permanent)
                var hours = dto.DurationHours ?? 4;
                req.ApprovedUntil = DateTime.UtcNow.AddHours(hours);

                // If approved permanently, add to permanent app policies
                if (dto.AddToPermanentWhitelist)
                {
                    var clean = req.RequestedProcessName.ToLowerInvariant();
                    var existingPolicy = await _db.BcpWorkstationAppPolicies.FirstOrDefaultAsync(p => p.ProcessName.ToLower() == clean);
                    if (existingPolicy == null)
                    {
                        _db.BcpWorkstationAppPolicies.Add(new BcpWorkstationAppPolicy
                        {
                            DisplayName = dto.DisplayName ?? req.RequestedProcessName,
                            ProcessName = clean,
                            Category = "Approved Requests",
                            IsAllowed = true
                        });
                    }
                }
            }

            await _db.SaveChangesAsync();

            await DispatchWorkstationNotificationAsync(
                title: dto.Approve
                    ? $"Application Approved: {req.RequestedProcessName}"
                    : $"Application Request Denied: {req.RequestedProcessName}",
                message: dto.Approve
                    ? $"Good news! Your request to run <code>{req.RequestedProcessName}</code> on workstation <strong>{req.MachineName}</strong> has been <strong>Approved</strong> by the administrator. You can now launch it from your Approved Apps list."
                    : $"Your request to run <code>{req.RequestedProcessName}</code> on workstation <strong>{req.MachineName}</strong> was <strong>Denied</strong> by the administrator.",
                severity: dto.Approve ? NotificationSeverity.Success : NotificationSeverity.Error,
                targetUserIdOrEmail: req.UserId,
                targetUserName: req.UserName,
                sendEmail: true,
                icon: dto.Approve ? "verified" : "block"
            );

            return Ok(new
            {
                success = true,
                message = $"Request {(dto.Approve ? "Approved" : "Denied")} successfully.",
                data = req
            });
        }

        /// <summary>
        /// Dispatches real-time In-App notifications and transactional Email alerts to Workspace Admins and the station's assigned operator.
        /// </summary>
        private async Task DispatchWorkstationNotificationAsync(
            string title,
            string message,
            NotificationSeverity severity,
            string? targetUserIdOrEmail,
            string? targetUserName,
            bool sendEmail,
            string icon = "desktop_windows")
        {
            if (_notificationDispatcher == null) return;

            try
            {
                var channels = sendEmail
                    ? (NotificationChannels.InApp | NotificationChannels.Email)
                    : NotificationChannels.InApp;

                var adminEmail = await _db.Users
                    .AsNoTracking()
                    .Where(u => u.Email != null && u.Email != "")
                    .Select(u => u.Email)
                    .FirstOrDefaultAsync();

                // Resolve employee Profile if possible (by Id, Email, or station assignment)
                Profile? operatorProfile = null;
                if (!string.IsNullOrWhiteSpace(targetUserIdOrEmail) && targetUserIdOrEmail != "Unknown")
                {
                    var key = targetUserIdOrEmail.Trim();
                    operatorProfile = await _db.Users
                        .AsNoTracking()
                        .FirstOrDefaultAsync(u => u.Id == key || (u.Email != null && u.Email.ToLower() == key.ToLower()));
                }

                // 1. Broadcast In-App notification + Admin Email copy so the Admin Console & Notification Bell update in real time
                await _notificationDispatcher.DispatchAsync(new NotificationDispatchPayload
                {
                    TargetType = NotificationDispatchTarget.BroadcastAll,
                    RecipientEmail = sendEmail ? (adminEmail ?? operatorProfile?.Email) : null,
                    RecipientName = targetUserName ?? operatorProfile?.FirstName ?? "Administrator",
                    Title = title,
                    Message = message,
                    EmailSubject = title,
                    Severity = severity,
                    Channels = channels,
                    SendEmailCopy = sendEmail,
                    Module = "Workstations",
                    Icon = icon,
                    Category = BcpMessageCategory.Security,
                    Priority = severity == NotificationSeverity.Error ? BcpMessagePriority.High : BcpMessagePriority.Normal,
                    ActionUrl = "/workspace/stations"
                });

                // 2. If we resolved a specific operator profile (or valid email), also send a direct SingleUser notification + email
                if (operatorProfile != null)
                {
                    await _notificationDispatcher.DispatchAsync(new NotificationDispatchPayload
                    {
                        TargetType = NotificationDispatchTarget.SingleUser,
                        TargetUserId = operatorProfile.Id,
                        RecipientEmail = operatorProfile.Email,
                        RecipientName = !string.IsNullOrWhiteSpace(operatorProfile.FirstName)
                            ? $"{operatorProfile.FirstName} {operatorProfile.LastName}".Trim()
                            : (targetUserName ?? operatorProfile.UserName),
                        Title = title,
                        Message = message,
                        EmailSubject = title,
                        Severity = severity,
                        Channels = channels,
                        SendEmailCopy = sendEmail,
                        Module = "Workstations",
                        Icon = icon,
                        Category = BcpMessageCategory.Security,
                        Priority = severity == NotificationSeverity.Error ? BcpMessagePriority.High : BcpMessagePriority.Normal,
                        ActionUrl = "/workspace/stations"
                    });
                }
                else if (sendEmail && !string.IsNullOrWhiteSpace(targetUserIdOrEmail) && targetUserIdOrEmail.Contains('@'))
                {
                    await _notificationDispatcher.DispatchAsync(new NotificationDispatchPayload
                    {
                        TargetType = NotificationDispatchTarget.SingleUser,
                        RecipientEmail = targetUserIdOrEmail.Trim(),
                        RecipientName = targetUserName ?? "Workspace Operator",
                        Title = title,
                        Message = message,
                        EmailSubject = title,
                        Severity = severity,
                        Channels = NotificationChannels.Email,
                        SendEmailCopy = true,
                        Module = "Workstations",
                        Icon = icon,
                        Category = BcpMessageCategory.Security,
                        ActionUrl = "/workspace/stations"
                    });
                }
            }
            catch
            {
                // Non-blocking: never fail the workstation API call if email/notification dispatch encounters an issue
            }
        }
        /// <summary>
        /// Dynamically resolves the approved company document path from the tenant's brand name.
        /// Guaranteed 100% white-label: uses the tenant's brand name (e.g. C:\AcmeGlobal-Workspace) instead of any hardcoded vendor name.
        /// </summary>
        private async Task<string> ResolveDefaultApprovedDirectoryAsync()
        {
            var siteSetting = await _db.MisWebsiteSettings.AsNoTracking().FirstOrDefaultAsync();
            var brand = siteSetting?.BrandName ?? "Workspace";
            var safeBrand = System.Text.RegularExpressions.Regex.Replace(brand, @"[^a-zA-Z0-9_\-]", "");
            if (string.IsNullOrWhiteSpace(safeBrand)) safeBrand = "Workspace";
            return $@"C:\{safeBrand}-Workspace";
        }

        // =====================================================================
        // 5. DETAILED WORKSTATION ACTIVITY LOGS & PERIODIC SCREENSHOTS
        // =====================================================================

        /// <summary>
        /// Records a workstation activity event (app opened/closed with duration, active file path/name,
        /// idle warning, idle lock, password resume, shift state changes, and periodic desktop screenshots).
        /// </summary>
        [HttpPost("activity-logs")]
        public async Task<IActionResult> LogActivity([FromBody] LogWorkstationActivityDto dto)
        {
            await EnsureActivityLogTableExistsAsync();

            // Never log the workstation compliance agent binary itself or background webview helpers as a user application
            if ((!string.IsNullOrWhiteSpace(dto.ProcessName) && (dto.ProcessName.Contains("ozikol", StringComparison.OrdinalIgnoreCase) || dto.ProcessName.Contains("webview2", StringComparison.OrdinalIgnoreCase))) ||
                (!string.IsNullOrWhiteSpace(dto.AppDisplayName) && (dto.AppDisplayName.Contains("ozikol", StringComparison.OrdinalIgnoreCase) || dto.AppDisplayName.Contains("webview2", StringComparison.OrdinalIgnoreCase))) ||
                string.Equals(dto.WindowTitle?.Trim(), "Business Command Center", StringComparison.OrdinalIgnoreCase))
            {
                return Ok(new { success = true, skipped = true });
            }

            var siteSetting = await _db.MisWebsiteSettings.AsNoTracking().FirstOrDefaultAsync();
            var tenantBrand = !string.IsNullOrWhiteSpace(siteSetting?.BrandName) ? siteSetting.BrandName : "Workspace";

            string? SanitizeBrandText(string? input)
            {
                if (string.IsNullOrWhiteSpace(input)) return input;
                return input
                    .Replace("OzikolBCCClient", tenantBrand, StringComparison.OrdinalIgnoreCase)
                    .Replace("Ozikol-BCC", $"{tenantBrand}-Workspace", StringComparison.OrdinalIgnoreCase)
                    .Replace("Ozikol", tenantBrand, StringComparison.OrdinalIgnoreCase)
                    .Trim();
            }

            var procLower = (dto.ProcessName ?? string.Empty).Trim().ToLowerInvariant();
            var isBrowser = procLower.Contains("chrome") || procLower.Contains("msedge") || procLower.Contains("firefox") || procLower.Contains("brave");
            var eventTypeUpper = !string.IsNullOrWhiteSpace(dto.EventType) ? dto.EventType.Trim().ToUpperInvariant() : "APP_OPENED";
            var isScreenshotOrLink = eventTypeUpper == "SCREENSHOT_CAPTURED" || eventTypeUpper == "BROWSER_LINK_VISITED";
            var isRealPathOrUrl = !string.IsNullOrWhiteSpace(dto.FilePath) &&
                                  (dto.FilePath.Contains(":\\") || dto.FilePath.StartsWith("\\\\") || dto.FilePath.StartsWith("http://", StringComparison.OrdinalIgnoreCase) || dto.FilePath.StartsWith("https://", StringComparison.OrdinalIgnoreCase));

            var rawFileName = SanitizeBrandText(dto.FileName);
            var rawFilePath = isRealPathOrUrl ? dto.FilePath?.Trim() : SanitizeBrandText(dto.FilePath);
            var hasRealExtension = !string.IsNullOrWhiteSpace(rawFileName) && System.IO.Path.HasExtension(rawFileName);

            // Prevent web browser tab titles from being stored as fake disk file paths or "FILE WORKED ON" events
            if (isBrowser && !hasRealExtension && !isScreenshotOrLink)
            {
                if (eventTypeUpper == "DOCUMENT_ACTIVE")
                {
                    return Ok(new { success = true, skipped = true });
                }
                rawFileName = null;
                rawFilePath = null;
            }

            var machine = !string.IsNullOrWhiteSpace(dto.MachineName) ? dto.MachineName.Trim() : "Workstation";
            var stationKey = !string.IsNullOrWhiteSpace(dto.StationKey)
                ? dto.StationKey.Trim().ToUpperInvariant()
                : $"WS-{machine.ToUpperInvariant()}";

            var station = await _db.BcpWorkstations
                .AsNoTracking()
                .OrderByDescending(s => s.LastHeartbeat)
                .FirstOrDefaultAsync(s => s.StationKey == stationKey || s.MachineName == machine);

            var cleanWindow = SanitizeBrandText(dto.WindowTitle);
            var cleanDetails = SanitizeBrandText(dto.Details);
            if (isBrowser && !isScreenshotOrLink && rawFileName == null && !string.IsNullOrWhiteSpace(cleanDetails) && cleanDetails.Contains("working on", StringComparison.OrdinalIgnoreCase))
            {
                cleanDetails = $"Active browser window: {cleanWindow ?? "Web Browser"}";
            }

            // Never store raw Base64 image data inside the SQL database; persist as a file/cloud URL
            var resolvedScreenshotUrl = dto.ScreenshotUrl?.Trim();
            if (!string.IsNullOrWhiteSpace(resolvedScreenshotUrl) &&
                resolvedScreenshotUrl.StartsWith("data:image/", StringComparison.OrdinalIgnoreCase))
            {
                resolvedScreenshotUrl = await PersistDataUriScreenshotAsync(resolvedScreenshotUrl, stationKey);
            }

            var entry = new BcpWorkstationActivityLog
            {
                WorkstationId = dto.WorkstationId ?? station?.Id,
                StationKey = stationKey,
                MachineName = station?.MachineName ?? machine,
                UserId = !string.IsNullOrWhiteSpace(dto.UserId) ? dto.UserId : station?.AssignedUserId,
                UserName = !string.IsNullOrWhiteSpace(dto.UserName) ? dto.UserName : (station?.AssignedUserName ?? "Station Staff"),
                UserEmail = !string.IsNullOrWhiteSpace(dto.UserEmail) ? dto.UserEmail : station?.AssignedUserEmail,
                EventType = eventTypeUpper,
                ProcessName = dto.ProcessName?.Trim(),
                AppDisplayName = SanitizeBrandText(dto.AppDisplayName),
                WindowTitle = cleanWindow,
                FileName = rawFileName,
                FilePath = rawFilePath,
                StartedAt = dto.StartedAt ?? DateTime.UtcNow,
                EndedAt = dto.EndedAt,
                DurationSeconds = dto.DurationSeconds,
                ScreenshotUrl = resolvedScreenshotUrl,
                Details = cleanDetails,
                Timestamp = DateTime.UtcNow
            };

            _db.BcpWorkstationActivityLogs.Add(entry);
            await _db.SaveChangesAsync();

            return Ok(new { success = true, logId = entry.Id });
        }

        /// <summary>
        /// Retrieves comprehensive workstation activity logs (apps opened/closed, duration, file paths, idle/password resume, screenshots).
        /// Supports filtering by stationKey, machineName, userId, or eventType.
        /// </summary>
        [HttpGet("activity-logs")]
        public async Task<IActionResult> GetActivityLogs(
            [FromQuery] string? stationKey = null,
            [FromQuery] string? machineName = null,
            [FromQuery] string? userId = null,
            [FromQuery] string? eventType = null,
            [FromQuery] int limit = 150)
        {
            await EnsureActivityLogTableExistsAsync();

            var siteSetting = await _db.MisWebsiteSettings.AsNoTracking().FirstOrDefaultAsync();
            var tenantBrand = !string.IsNullOrWhiteSpace(siteSetting?.BrandName) ? siteSetting.BrandName : "Workspace";

            var query = _db.BcpWorkstationActivityLogs
                .AsNoTracking()
                .Where(l => (l.ProcessName == null || !l.ProcessName.ToLower().Contains("ozikol")) &&
                            (l.AppDisplayName == null || !l.AppDisplayName.ToLower().Contains("ozikol")))
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(stationKey))
            {
                var sk = stationKey.Trim().ToUpperInvariant();
                query = query.Where(l => l.StationKey != null && l.StationKey.ToUpper() == sk);
            }

            if (!string.IsNullOrWhiteSpace(machineName))
            {
                var mn = machineName.Trim().ToLowerInvariant();
                query = query.Where(l => l.MachineName.ToLower() == mn);
            }

            if (!string.IsNullOrWhiteSpace(userId))
            {
                var uid = userId.Trim().ToLowerInvariant();
                query = query.Where(l => (l.UserId != null && l.UserId.ToLower() == uid) ||
                                         (l.UserEmail != null && l.UserEmail.ToLower() == uid));
            }

            if (!string.IsNullOrWhiteSpace(eventType) && !string.Equals(eventType, "all", StringComparison.OrdinalIgnoreCase))
            {
                var et = eventType.Trim().ToUpperInvariant();
                query = query.Where(l => l.EventType == et);
            }

            var logs = await query
                .OrderByDescending(l => l.Timestamp)
                .Take(Math.Min(limit, 300))
                .ToListAsync();

            string? CleanText(string? s)
            {
                if (string.IsNullOrWhiteSpace(s)) return s;
                return s
                    .Replace("OzikolBCCClient", tenantBrand, StringComparison.OrdinalIgnoreCase)
                    .Replace("Ozikol-BCC", $"{tenantBrand}-Workspace", StringComparison.OrdinalIgnoreCase)
                    .Replace("Ozikol", tenantBrand, StringComparison.OrdinalIgnoreCase);
            }

            var filteredLogs = new List<BcpWorkstationActivityLog>();
            foreach (var l in logs)
            {
                var proc = (l.ProcessName ?? l.AppDisplayName ?? string.Empty).ToLowerInvariant();
                if (proc.Contains("webview2")) continue;

                var isBrowser = proc.Contains("chrome") || proc.Contains("msedge") || proc.Contains("firefox") || proc.Contains("brave");
                var isScreenshotOrLink = l.EventType == "SCREENSHOT_CAPTURED" || l.EventType == "BROWSER_LINK_VISITED";
                var hasExt = !string.IsNullOrWhiteSpace(l.FileName) && System.IO.Path.HasExtension(l.FileName);
                if (isBrowser && l.EventType == "DOCUMENT_ACTIVE" && !hasExt)
                {
                    continue;
                }

                var isRealPathOrUrl = !string.IsNullOrWhiteSpace(l.FilePath) &&
                                      (l.FilePath.Contains(":\\") || l.FilePath.StartsWith("\\\\") || l.FilePath.StartsWith("http://", StringComparison.OrdinalIgnoreCase) || l.FilePath.StartsWith("https://", StringComparison.OrdinalIgnoreCase));

                l.WindowTitle = CleanText(l.WindowTitle);
                l.FileName = CleanText(l.FileName);
                if (!isRealPathOrUrl)
                {
                    l.FilePath = CleanText(l.FilePath);
                }
                l.Details = CleanText(l.Details);

                if (isBrowser && !hasExt && !isScreenshotOrLink)
                {
                    l.FileName = null;
                    l.FilePath = null;
                    l.Details = $"Opened {l.AppDisplayName ?? "Chrome"} ({l.WindowTitle ?? "Web Browser"})";
                }
                filteredLogs.Add(l);
            }

            return Ok(new { success = true, data = filteredLogs });
        }

        /// <summary>
        /// Queues an immediate on-demand screenshot capture for the specified workstation on its next 4-second heartbeat.
        /// </summary>
        [HttpPost("request-screenshot")]
        public IActionResult RequestStationScreenshot([FromBody] RequestScreenshotDto dto)
        {
            var key = !string.IsNullOrWhiteSpace(dto.StationKey) ? dto.StationKey.Trim() : dto.MachineName?.Trim();
            if (string.IsNullOrWhiteSpace(key))
            {
                return BadRequest(new { success = false, message = "StationKey or MachineName is required." });
            }

            _pendingScreenshotRequests[key] = true;
            if (!string.IsNullOrWhiteSpace(dto.MachineName))
            {
                _pendingScreenshotRequests[dto.MachineName.Trim()] = true;
            }

            return Ok(new { success = true, message = $"Screenshot capture queued for {key}. It will appear in the activity feed within 4 seconds." });
        }

        /// <summary>
        /// Uploads a binary workstation screenshot file (multipart/form-data) to Cloudinary or local file storage
        /// and returns the hosted URL so zero image bytes are ever stored in SQL Server.
        /// </summary>
        [HttpPost("upload-screenshot")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UploadWorkstationScreenshot([FromForm] UploadWorkstationScreenshotRequest request)
        {
            if (request?.File == null || request.File.Length == 0)
            {
                return BadRequest(new { success = false, message = "No screenshot file uploaded." });
            }

            var stationPrefix = !string.IsNullOrWhiteSpace(request.StationKey)
                ? request.StationKey.Trim().ToLowerInvariant()
                : "ws";

            // 1. Try Cloudinary first (platform standard media storage)
            if (_cloudinaryService != null)
            {
                try
                {
                    var (secureUrl, publicId) = await _cloudinaryService.UploadImageWithPublicIdAsync(
                        request.File,
                        "workstation-screenshots");
                    if (!string.IsNullOrWhiteSpace(secureUrl))
                    {
                        return Ok(new { success = true, url = secureUrl, key = publicId });
                    }
                }
                catch
                {
                    // Fall back to local file storage if offline
                }
            }

            // 2. Local file storage fallback (Uploads/workstation-screenshots/)
            using var ms = new MemoryStream();
            await request.File.CopyToAsync(ms);
            var localUrl = await SaveScreenshotBytesToDiskAsync(ms.ToArray(), stationPrefix, Path.GetExtension(request.File.FileName));
            return Ok(new { success = true, url = localUrl });
        }

        /// <summary>
        /// Serves locally stored workstation screenshot files when running offline or in local development.
        /// </summary>
        [HttpGet("screenshots/{fileName}")]
        [AllowAnonymous]
        public IActionResult GetWorkstationScreenshotFile(string fileName)
        {
            var safeFile = Path.GetFileName(fileName);
            if (string.IsNullOrWhiteSpace(safeFile)) return NotFound();

            var folder = Path.Combine(AppContext.BaseDirectory, "Uploads", "workstation-screenshots");
            var fullPath = Path.Combine(folder, safeFile);
            if (!System.IO.File.Exists(fullPath)) return NotFound();

            var ext = Path.GetExtension(safeFile).ToLowerInvariant();
            var contentType = ext == ".jpg" || ext == ".jpeg" ? "image/jpeg" : "image/png";
            return PhysicalFile(fullPath, contentType);
        }

        private async Task<string?> PersistDataUriScreenshotAsync(string dataUri, string stationKey)
        {
            try
            {
                var commaIdx = dataUri.IndexOf(',');
                if (commaIdx < 0) return null;
                var header = dataUri.Substring(0, commaIdx).ToLowerInvariant();
                var b64 = dataUri.Substring(commaIdx + 1).Trim();
                var bytes = Convert.FromBase64String(b64);
                var ext = header.Contains("jpeg") || header.Contains("jpg") ? ".jpg" : ".png";
                var contentType = ext == ".jpg" ? "image/jpeg" : "image/png";
                var fileName = $"{stationKey.ToLowerInvariant()}_{DateTime.UtcNow:yyyyMMdd_HHmmssfff}{ext}";

                if (_cloudinaryService != null)
                {
                    try
                    {
                        using var stream = new MemoryStream(bytes);
                        var formFile = new FormFile(stream, 0, bytes.Length, "file", fileName)
                        {
                            Headers = new HeaderDictionary(),
                            ContentType = contentType
                        };
                        var (secureUrl, _) = await _cloudinaryService.UploadImageWithPublicIdAsync(formFile, "workstation-screenshots");
                        if (!string.IsNullOrWhiteSpace(secureUrl))
                        {
                            return secureUrl;
                        }
                    }
                    catch
                    {
                        // Fall back to local disk file
                    }
                }

                return await SaveScreenshotBytesToDiskAsync(bytes, stationKey, ext);
            }
            catch
            {
                return null;
            }
        }

        private async Task<string> SaveScreenshotBytesToDiskAsync(byte[] bytes, string stationKey, string? ext = ".png")
        {
            var cleanExt = string.IsNullOrWhiteSpace(ext) || !ext.StartsWith(".") ? ".png" : ext.ToLowerInvariant();
            var safePrefix = new string((stationKey ?? "ws").Where(c => char.IsLetterOrDigit(c) || c == '-' || c == '_').ToArray()).ToLowerInvariant();
            var fileName = $"{safePrefix}_{DateTime.UtcNow:yyyyMMdd_HHmmssfff}_{Guid.NewGuid().ToString("N")[..6]}{cleanExt}";
            var folder = Path.Combine(AppContext.BaseDirectory, "Uploads", "workstation-screenshots");
            Directory.CreateDirectory(folder);
            var fullPath = Path.Combine(folder, fileName);
            await System.IO.File.WriteAllBytesAsync(fullPath, bytes);
            return $"{Request.Scheme}://{Request.Host}/api/Workstations/screenshots/{fileName}";
        }

        /// <summary>
        /// Ensures [dbo].[BcpWorkstationActivityLogs] exists in the tenant database without requiring a manual migration.
        /// Also purges any legacy Base64 data URIs so zero image blobs are stored in SQL Server.
        /// </summary>
        private async Task EnsureActivityLogTableExistsAsync()
        {
            if (_activityTableChecked) return;
            try
            {
                const string sql = @"
IF OBJECT_ID(N'[dbo].[BcpWorkstationActivityLogs]', N'U') IS NULL
BEGIN
    CREATE TABLE [dbo].[BcpWorkstationActivityLogs] (
        [Id] uniqueidentifier NOT NULL PRIMARY KEY,
        [WorkstationId] uniqueidentifier NULL,
        [StationKey] nvarchar(100) NULL,
        [MachineName] nvarchar(150) NOT NULL,
        [UserId] nvarchar(100) NULL,
        [UserName] nvarchar(255) NULL,
        [UserEmail] nvarchar(255) NULL,
        [EventType] nvarchar(60) NOT NULL,
        [ProcessName] nvarchar(150) NULL,
        [AppDisplayName] nvarchar(200) NULL,
        [WindowTitle] nvarchar(500) NULL,
        [FileName] nvarchar(260) NULL,
        [FilePath] nvarchar(1000) NULL,
        [StartedAt] datetime2 NOT NULL,
        [EndedAt] datetime2 NULL,
        [DurationSeconds] int NULL,
        [ScreenshotUrl] nvarchar(1000) NULL,
        [Details] nvarchar(1000) NULL,
        [Timestamp] datetime2 NOT NULL
    );
    CREATE INDEX [IX_BcpWorkstationActivityLogs_Timestamp] ON [dbo].[BcpWorkstationActivityLogs] ([Timestamp] DESC);
    CREATE INDEX [IX_BcpWorkstationActivityLogs_MachineName] ON [dbo].[BcpWorkstationActivityLogs] ([MachineName]);
END
ELSE
BEGIN
    DELETE FROM [dbo].[BcpWorkstationActivityLogs] WHERE [ScreenshotUrl] LIKE N'data:image/%';
END";
                await _db.Database.ExecuteSqlRawAsync(sql);
                _activityTableChecked = true;
            }
            catch
            {
                // Ignore if already exists or non-SQL Server provider
            }
        }
    }

    // =========================================================================
    // DTOs
    // =========================================================================

    public class RegisterStationDto
    {
        public string? StationKey { get; set; }
        public string MachineName { get; set; } = string.Empty;
        public string? HardwareGuid { get; set; }
        public string? UserId { get; set; }
        public string? UserName { get; set; }
        public string? UserEmail { get; set; }
        public string? Department { get; set; }
        public string? OsVersion { get; set; }
        public string? ClientVersion { get; set; }
        public bool KioskEnforced { get; set; }
    }

    public class StationHeartbeatDto
    {
        public string StationKey { get; set; } = string.Empty;
        public string? CurrentProcessName { get; set; }
        public string? CurrentWindowTitle { get; set; }
        public string? CurrentDocumentPath { get; set; }
        public string? IpAddress { get; set; }
    }

    public class RemoteLockStationDto
    {
        public Guid? StationId { get; set; }
        public string? StationKey { get; set; }
        public bool? Lock { get; set; }
        public bool? IsLocked { get; set; }
        public string? Reason { get; set; }
        public string? LockReason { get; set; }
    }

    public class AddAppPolicyDto
    {
        public string DisplayName { get; set; } = string.Empty;
        public string ProcessName { get; set; } = string.Empty;
        public string? Category { get; set; }
        public bool IsAllowed { get; set; } = true;
        public string? ApplicableRole { get; set; }
        public string? IconName { get; set; }
    }

    public class UpdateFilePolicyDto
    {
        public string? ApprovedDirectoryPath { get; set; }
        public bool BlockUsbStorage { get; set; } = true;
        public string? UsbStoragePolicy { get; set; }
        public bool EnforceDirectorySandbox { get; set; } = true;
    }

    public class ReportViolationDto
    {
        public Guid? WorkstationId { get; set; }
        public string? MachineName { get; set; }
        public string? UserId { get; set; }
        public string? UserName { get; set; }
        public string ProcessName { get; set; } = string.Empty;
        public string? WindowTitle { get; set; }
        public string? FilePath { get; set; }
        public string? ActionTaken { get; set; }
        public string? ViolationType { get; set; }
    }

    public class CreateAccessRequestDto
    {
        public Guid? WorkstationId { get; set; }
        public string? MachineName { get; set; }
        public string? UserId { get; set; }
        public string? UserName { get; set; }
        public string RequestedProcessName { get; set; } = string.Empty;
        public string Reason { get; set; } = string.Empty;
    }

    public class RespondAccessRequestDto
    {
        public bool Approve { get; set; }
        public string? AdminUserId { get; set; }
        public int? DurationHours { get; set; }
        public bool AddToPermanentWhitelist { get; set; }
        public string? DisplayName { get; set; }
    }

    public class LogWorkstationActivityDto
    {
        public Guid? WorkstationId { get; set; }
        public string? StationKey { get; set; }
        public string? MachineName { get; set; }
        public string? UserId { get; set; }
        public string? UserName { get; set; }
        public string? UserEmail { get; set; }
        public string EventType { get; set; } = "APP_OPENED";
        public string? ProcessName { get; set; }
        public string? AppDisplayName { get; set; }
        public string? WindowTitle { get; set; }
        public string? FileName { get; set; }
        public string? FilePath { get; set; }
        public DateTime? StartedAt { get; set; }
        public DateTime? EndedAt { get; set; }
        public int? DurationSeconds { get; set; }
        public string? ScreenshotUrl { get; set; }
        public string? Details { get; set; }
    }

    public class RequestScreenshotDto
    {
        public string? StationKey { get; set; }
        public string? MachineName { get; set; }
    }

    public class UploadWorkstationScreenshotRequest
    {
        public IFormFile? File { get; set; }
        public string? StationKey { get; set; }
        public string? MachineName { get; set; }
    }
}
