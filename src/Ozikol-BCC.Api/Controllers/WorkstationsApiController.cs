using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Persistence.EF.SQL;
using Ozikol_BCC.Application.Interfaces.Services;

namespace Ozikol_BCC.Api.Controllers
{
    /// <summary>
    /// Governs enterprise workstations, application whitelisting, background process enforcement,
    /// document sandboxing, and station telemetry for the "Workspace (Desktop only)" suite (bcp-workspace).
    /// </summary>
    [ApiController]
    [Route("api/Workstations")]
    [Tags("Workstations & Application Gatekeeper")]
    public class WorkstationsApiController : ControllerBase
    {
        private readonly DashboardDbContext _db;
        private readonly ITenantActivityLogger? _activityLogger;

        public WorkstationsApiController(
            DashboardDbContext db,
            ITenantActivityLogger? activityLogger = null)
        {
            _db = db;
            _activityLogger = activityLogger;
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

            // Refresh online status based on 45-second heartbeat window
            var deduplicated = stations.GroupBy(s => (!string.IsNullOrEmpty(s.StationKey) ? s.StationKey : s.MachineName).Trim().ToUpperInvariant()).Select(g => g.OrderByDescending(x => x.LastHeartbeat ?? x.CreatedAt).First()).ToList();
            var result = deduplicated.Select(s => new
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
                IsOnline = s.LastHeartbeat.HasValue && (now - s.LastHeartbeat.Value).TotalSeconds <= 45,
                s.LastHeartbeat,
                s.CurrentProcessName,
                s.CurrentWindowTitle,
                s.CurrentDocumentPath,
                s.IsLocked,
                s.LockReason,
                s.KioskEnforced,
                s.CreatedAt,
                s.UpdatedAt
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
                    IsOnline = true,
                    LastHeartbeat = DateTime.UtcNow,
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
                existing.IsOnline = true;
                existing.LastHeartbeat = DateTime.UtcNow;
                existing.UpdatedAt = DateTime.UtcNow;
            }

            await _db.SaveChangesAsync();

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

            station.IsOnline = true;
            station.LastHeartbeat = DateTime.UtcNow;
            station.CurrentProcessName = dto.CurrentProcessName;
            station.CurrentWindowTitle = dto.CurrentWindowTitle;
            station.CurrentDocumentPath = dto.CurrentDocumentPath;
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

            return Ok(new
            {
                success = true,
                data = new
                {
                    isLocked = station.IsLocked,
                    lockReason = station.LockReason,
                    kioskEnforced = station.KioskEnforced,
                    approvedTemporaryProcesses = activeApprovals
                }
            });
        }

        /// <summary>
        /// Remotely locks or unlocks an office computer from the Web Command Center.
        /// </summary>
        [HttpPost("lock")]
        public async Task<IActionResult> SetLockState([FromBody] RemoteLockStationDto dto)
        {
            var station = await _db.BcpWorkstations.FindAsync(dto.StationId);
            if (station == null)
            {
                return NotFound(new { success = false, message = "Station not found." });
            }

            station.IsLocked = dto.Lock;
            station.LockReason = dto.Lock ? (dto.Reason ?? "Remote lock enforced by administrator.") : null;
            station.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();

            if (_activityLogger != null)
            {
                await _activityLogger.LogAsync(
                    dto.Lock ? "WORKSTATION_LOCKED" : "WORKSTATION_UNLOCKED",
                    $"Station '{station.MachineName}' was {(dto.Lock ? "locked" : "unlocked")} remotely. Reason: {station.LockReason ?? "None"}",
                    module: "Workstations"
                );
            }

            return Ok(new
            {
                success = true,
                message = $"Workstation {station.MachineName} has been {(dto.Lock ? "locked" : "unlocked")}.",
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
            var appPolicies = await _db.BcpWorkstationAppPolicies
                .AsNoTracking()
                .OrderBy(p => p.Category)
                .ThenBy(p => p.DisplayName)
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

            // Seed standard presets if whitelist is empty
            if (!appPolicies.Any())
            {
                var defaults = new List<BcpWorkstationAppPolicy>
                {
                    new() { DisplayName = "Microsoft Word", ProcessName = "winword.exe", Category = "Productivity", IsAllowed = true, IconName = "description" },
                    new() { DisplayName = "Microsoft Excel", ProcessName = "excel.exe", Category = "Productivity", IsAllowed = true, IconName = "table_view" },
                    new() { DisplayName = "Microsoft PowerPoint", ProcessName = "powerpnt.exe", Category = "Productivity", IsAllowed = true, IconName = "slideshow" },
                    new() { DisplayName = "Adobe Acrobat Reader", ProcessName = "acrord32.exe", Category = "Documents", IsAllowed = true, IconName = "picture_as_pdf" },
                    new() { DisplayName = "Windows Calculator", ProcessName = "calc.exe", Category = "Utilities", IsAllowed = true, IconName = "calculate" },
                    new() { DisplayName = "Microsoft Teams", ProcessName = "ms-teams.exe", Category = "Communication", IsAllowed = true, IconName = "chat" },
                };
                _db.BcpWorkstationAppPolicies.AddRange(defaults);
                await _db.SaveChangesAsync();
                appPolicies = defaults;
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

            return Ok(new
            {
                success = true,
                message = $"Request {(dto.Approve ? "Approved" : "Denied")} successfully.",
                data = req
            });
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
        public Guid StationId { get; set; }
        public bool Lock { get; set; }
        public string? Reason { get; set; }
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
}
