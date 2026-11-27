using static Ozikol_BCC.Domain.Enum.Enum;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Ozikol_BCC.Api.Models;
using Ozikol_BCC.Application.Interfaces.Services;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Infrastructure.TenantSupport;
using Ozikol_BCC.Persistence.EF.SQL;

using Ozikol_BCC.Api.Authorization;

namespace Ozikol_BCC.Api.Controllers
{
    /// <summary>
    /// Core operational API controller for Time, Attendance &amp; Geofence Verification (<c>bcp-attendance-tracking</c>).
    /// Handles GPS geofenced clock-in/out, late arrival flags, lone-worker hourly safety checks,
    /// timesheet supervisor sign-offs, and workstation shift hardware gatekeeping.
    /// </summary>
    [ApiController]
    [Route("api/workforce/attendance")]
    [RequireFeature("bcp-attendance-tracking")]
    [Tags("Workforce Attendance & Geofencing")]
    public class WorkforceAttendanceApiController : ControllerBase
    {
        private readonly DashboardDbContext _db;
        private readonly ICentralNotificationDispatcher? _notificationDispatcher;
        private readonly ITenantProvider? _tenantProvider;
        private readonly ITenantFeatureGateService? _featureGateService;

        /// <summary>
        /// Initializes a new instance of the <see cref="WorkforceAttendanceApiController"/> class.
        /// </summary>
        public WorkforceAttendanceApiController(
            DashboardDbContext db,
            ICentralNotificationDispatcher? notificationDispatcher = null,
            ITenantProvider? tenantProvider = null,
            ITenantFeatureGateService? featureGateService = null)
        {
            _db = db;
            _notificationDispatcher = notificationDispatcher;
            _tenantProvider = tenantProvider;
            _featureGateService = featureGateService;
        }

        private string CurrentTenantKey => ResolveCurrentTenantKey();
        private string CurrentUserId => User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "anonymous";
        private string CurrentUserName => User.FindFirst(ClaimTypes.Name)?.Value ?? User.FindFirst("name")?.Value ?? "Officer";

        private string ResolveCurrentTenantKey()
        {
            var candidate = _tenantProvider?.CurrentTenant;
            if (!string.IsNullOrWhiteSpace(candidate)) return candidate.Trim().ToLowerInvariant();
            var headerKey = HttpContext.Request.Headers["X-Tenant-Key"].ToString()?.Trim();
            if (!string.IsNullOrWhiteSpace(headerKey)) return headerKey.ToLowerInvariant();
            var host = HttpContext.Request.Host.Host.ToLowerInvariant();
            var parts = host.Split('.');
            if (parts.Length > 1 && !new[] { "localhost", "127", "www", "api", "central", "admin" }.Contains(parts[0]))
            {
                return parts[0];
            }
            return "default";
        }

        private async Task<NotificationChannels> ResolveStaffNotificationChannelsAsync(string userId, CancellationToken ct)
        {
            var pref = await _db.BcpShiftNotificationPreferences
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.TenantKey == CurrentTenantKey && p.UserId == userId, ct);

            if (pref == null)
            {
                return NotificationChannels.InApp | NotificationChannels.Push | NotificationChannels.Email;
            }

            var channels = NotificationChannels.None;
            if (pref.EnableInApp) channels |= (NotificationChannels.InApp | NotificationChannels.Push);
            if (pref.EnableEmail) channels |= NotificationChannels.Email;
            if (pref.EnableWhatsApp) channels |= NotificationChannels.WhatsApp;

            return channels == NotificationChannels.None ? (NotificationChannels.InApp | NotificationChannels.Push) : channels;
        }

        // =========================================================================
        // 1. LIVE SITE MONITOR & SUPERVISOR TIMESHEETS
        // =========================================================================

        /// <summary>
        /// Real-time operations feed displaying all guards on duty, GPS validity, and late/missed clock-ins.
        /// </summary>
        [HttpGet("live-monitor")]
        public async Task<ActionResult<ApiResponse<List<LiveDutyMonitorDto>>>> GetLiveDutyMonitor(CancellationToken ct)
        {
            var nowUtc = DateTime.UtcNow;
            var windowStart = nowUtc.AddHours(-18);
            var windowEnd = nowUtc.AddHours(12);

            var activeShifts = await _db.BcpShifts
                .AsNoTracking()
                .Include(s => s.ClientSite)
                .Include(s => s.AttendanceRecord)
                .Where(s => s.TenantKey == CurrentTenantKey &&
                            s.StartsAtUtc >= windowStart &&
                            s.StartsAtUtc <= windowEnd &&
                            s.Status != "Cancelled")
                .OrderBy(s => s.StartsAtUtc)
                .Select(s => new LiveDutyMonitorDto
                {
                    ShiftId = s.Id,
                    ShiftCode = s.ShiftCode,
                    SiteName = s.ClientSite != null ? s.ClientSite.SiteName : "Unknown Site",
                    PostName = s.PostName,
                    GuardName = s.Assignments.Where(a => a.IsLeadOfficer).Select(a => a.StaffFullName).FirstOrDefault() ?? s.Assignments.Select(a => a.StaffFullName).FirstOrDefault() ?? "Unassigned",
                    GuardId = s.Assignments.Where(a => a.IsLeadOfficer).Select(a => a.UserId).FirstOrDefault() ?? s.Assignments.Select(a => a.UserId).FirstOrDefault(),
                    StartsAtUtc = s.StartsAtUtc,
                    EndsAtUtc = s.EndsAtUtc,
                    IsOvernight = s.IsOvernight,
                    ShiftStatus = s.Status,
                    ClockInUtc = s.AttendanceRecord != null ? s.AttendanceRecord.ClockInUtc : null,
                    IsGeofenceVerified = s.AttendanceRecord != null && s.AttendanceRecord.IsClockInGeofenceVerified,
                    DistanceFromSiteMeters = s.AttendanceRecord != null ? s.AttendanceRecord.ClockInDistanceFromSiteMeters : null,
                    IsFlagged = s.AttendanceRecord != null && s.AttendanceRecord.IsFlagged,
                    FlagReason = s.AttendanceRecord != null ? s.AttendanceRecord.FlagReason : null,
                    LastWelfareCheckAtUtc = s.AttendanceRecord != null ? s.AttendanceRecord.LastWelfareCheckAtUtc : null,
                    IsMissedClockIn = !s.AttendanceRecord.ClockInUtc.HasValue && nowUtc > s.StartsAtUtc.AddMinutes(15)
                })
                .ToListAsync(ct);

            return Ok(ApiResponse<List<LiveDutyMonitorDto>>.SuccessResponse(activeShifts, "Live duty monitor feed retrieved."));
        }

        /// <summary>
        /// Dispatches a multi-channel operational notification (Push/In-App, Email, WhatsApp, SMS)
        /// to a specific active on-duty staff member or broadcasts to all active on-duty staff.
        /// </summary>
        [HttpPost("notify-active")]
        public async Task<ActionResult<ApiResponse<object>>> NotifyActiveDutyStaff(
            [FromBody] NotifyActiveStaffRequest request,
            CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(request.Title) || string.IsNullOrWhiteSpace(request.Message))
            {
                return BadRequest(ApiResponse<object>.FailureResponse("Notification title and message are required."));
            }

            var channels = NotificationChannels.None;
            if (request.SendPush) channels |= (NotificationChannels.InApp | NotificationChannels.Push);
            if (request.SendEmail) channels |= NotificationChannels.Email;
            if (request.SendWhatsApp) channels |= NotificationChannels.WhatsApp;
            if (request.SendSms) channels |= NotificationChannels.Sms;

            if (channels == NotificationChannels.None)
            {
                channels = NotificationChannels.InApp | NotificationChannels.Push;
            }

            var targetUserIds = new List<string>();
            if (!string.IsNullOrWhiteSpace(request.TargetUserId) && !string.Equals(request.TargetUserId, "all", StringComparison.OrdinalIgnoreCase))
            {
                targetUserIds.Add(request.TargetUserId.Trim());
            }
            else
            {
                var nowUtc = DateTime.UtcNow;
                var windowStart = nowUtc.AddHours(-18);
                var windowEnd = nowUtc.AddHours(12);

                targetUserIds = await _db.BcpShiftAssignments
                    .AsNoTracking()
                    .Include(a => a.Shift)
                    .Where(a => a.TenantKey == CurrentTenantKey &&
                                !string.IsNullOrWhiteSpace(a.UserId) &&
                                a.Shift != null &&
                                a.Shift.StartsAtUtc >= windowStart &&
                                a.Shift.StartsAtUtc <= windowEnd &&
                                a.Shift.Status != "Cancelled" &&
                                a.Shift.Status != "Completed")
                    .Select(a => a.UserId)
                    .Distinct()
                    .ToListAsync(ct);
            }

            if (targetUserIds.Count == 0)
            {
                return BadRequest(ApiResponse<object>.FailureResponse("No active on-duty staff members found to notify."));
            }

            var users = await _db.Users
                .AsNoTracking()
                .Where(u => targetUserIds.Contains(u.Id))
                .Select(u => new { u.Id, u.FullName, u.Email, u.PhoneNumber })
                .ToListAsync(ct);

            int dispatchedCount = 0;
            if (_notificationDispatcher != null)
            {
                foreach (var u in users)
                {
                    try
                    {
                        await _notificationDispatcher.DispatchAsync(new NotificationDispatchPayload
                        {
                            TargetType = NotificationDispatchTarget.SingleUser,
                            TargetUserId = u.Id,
                            RecipientEmail = u.Email,
                            RecipientName = u.FullName ?? "Staff Member",
                            TenantKey = CurrentTenantKey,
                            Title = request.Title.Trim(),
                            Message = request.Message.Trim(),
                            Category = BcpMessageCategory.General,
                            Severity = NotificationSeverity.Update,
                            Channels = channels,
                            SendEmailCopy = request.SendEmail,
                            Module = "Workforce",
                            Icon = "campaign",
                            ActionUrl = "/workforce/workspace/clock"
                        }, ct);
                        dispatchedCount++;
                    }
                    catch
                    {
                        // Non-blocking per-recipient dispatch
                    }
                }
            }

            return Ok(ApiResponse<object>.SuccessResponse(new
            {
                DispatchedCount = dispatchedCount,
                TotalTargets = targetUserIds.Count
            }, $"Notification dispatched to {dispatchedCount} active on-duty staff member(s)."));
        }

        /// <summary>
        /// Approves an attendance timesheet with supervisor sign-off and optional billable hours adjustment.
        /// </summary>
        [HttpPost("timesheets/{id}/approve")]
        public async Task<ActionResult<ApiResponse<bool>>> ApproveTimesheet(
            Guid id,
            [FromBody] ApproveTimesheetRequest request,
            CancellationToken ct)
        {
            var attendance = await _db.BcpShiftAttendances
                .FirstOrDefaultAsync(a => a.Id == id && a.TenantKey == CurrentTenantKey, ct);

            if (attendance == null)
            {
                return NotFound(ApiResponse<bool>.FailureResponse("Timesheet attendance record not found.", errorCode: "ERR-2004"));
            }

            attendance.SupervisorApproved = true;
            attendance.SupervisorApprovedBy = CurrentUserName;
            attendance.SupervisorApprovedAtUtc = DateTime.UtcNow;
            attendance.SupervisorNotes = request.SupervisorNotes?.Trim();

            if (request.AdjustedBillableHours.HasValue)
            {
                attendance.BillableHours = Math.Round(request.AdjustedBillableHours.Value, 2);
            }

            attendance.UpdatedUtc = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);

            // Notify staff member of timesheet approval
            if (_notificationDispatcher != null)
            {
                try
                {
                    var channels = await ResolveStaffNotificationChannelsAsync(attendance.UserId, ct);
                    await _notificationDispatcher.DispatchAsync(new NotificationDispatchPayload
                    {
                        TargetType = NotificationDispatchTarget.SingleUser,
                        TargetUserId = attendance.UserId,
                        TenantKey = CurrentTenantKey,
                        Title = "Timesheet Approved & Signed Off",
                        Message = $"Your timesheet for duty ({attendance.BillableHours} billable hours) has been approved by {CurrentUserName} and signed off for payroll.",
                        Category = BcpMessageCategory.General,
                        Severity = NotificationSeverity.Success,
                        Channels = channels,
                        Module = "Workforce",
                        Icon = "verified",
                        ActionUrl = "/workforce/workspace/timesheets"
                    }, ct);
                }
                catch
                {
                    // Non-blocking notification dispatch
                }
            }

            return Ok(ApiResponse<bool>.SuccessResponse(true, "Timesheet approved and signed off for payroll."));
        }

        /// <summary>
        /// Retrieves all duty attendance timesheets across the tenant workspace for supervisor approval and payroll sign-off.
        /// </summary>
        [HttpGet("timesheets")]
        public async Task<ActionResult<ApiResponse<List<object>>>> GetSupervisorTimesheets(
            [FromQuery] string? status,
            CancellationToken ct)
        {
            var query = _db.BcpShiftAttendances
                .AsNoTracking()
                .Include(a => a.Shift)
                .ThenInclude(s => s!.ClientSite)
                .Where(a => a.TenantKey == CurrentTenantKey);

            if (status == "pending")
            {
                query = query.Where(a => !a.SupervisorApproved);
            }
            else if (status == "approved")
            {
                query = query.Where(a => a.SupervisorApproved);
            }

            var userIds = await query.Select(a => a.UserId).Distinct().ToListAsync(ct);
            var users = await _db.Users
                .AsNoTracking()
                .Where(u => userIds.Contains(u.Id))
                .ToDictionaryAsync(u => u.Id, u => u.FullName, ct);

            var items = await query
                .OrderByDescending(a => a.ClockInUtc ?? a.CreatedUtc)
                .Take(100)
                .Select(a => new
                {
                    a.Id,
                    a.ShiftId,
                    ShiftCode = a.Shift != null ? a.Shift.ShiftCode : "Unknown",
                    PostName = a.Shift != null ? a.Shift.PostName : "Post",
                    SiteName = a.Shift != null && a.Shift.ClientSite != null ? a.Shift.ClientSite.SiteName : "Site",
                    a.UserId,
                    a.ClockInUtc,
                    a.ClockOutUtc,
                    a.ActualDurationHours,
                    a.BillableHours,
                    a.OvertimeHours,
                    a.IsClockInGeofenceVerified,
                    a.IsFlagged,
                    a.FlagReason,
                    a.SupervisorApproved,
                    a.SupervisorApprovedBy,
                    a.SupervisorApprovedAtUtc,
                    a.SupervisorNotes,
                    a.CreatedUtc
                })
                .ToListAsync(ct);

            var result = items.Select(i => (object)new
            {
                i.Id,
                i.ShiftId,
                i.ShiftCode,
                i.PostName,
                i.SiteName,
                i.UserId,
                OfficerName = users.TryGetValue(i.UserId, out var name) ? name : "Staff Officer",
                i.ClockInUtc,
                i.ClockOutUtc,
                i.ActualDurationHours,
                i.BillableHours,
                i.OvertimeHours,
                i.IsClockInGeofenceVerified,
                i.IsFlagged,
                i.FlagReason,
                i.SupervisorApproved,
                i.SupervisorApprovedBy,
                i.SupervisorApprovedAtUtc,
                i.SupervisorNotes,
                i.CreatedUtc
            }).ToList();

            return Ok(ApiResponse<List<object>>.SuccessResponse(result, "Supervisor timesheets retrieved."));
        }

        // =========================================================================
        // 4. HARDWARE GATEKEEPER INTEGRATION (bcp-workspace Handshake)
        // =========================================================================

        /// <summary>
        /// Validates whether the signed-in user is scheduled and actively clocked in to unlock a designated workstation/laptop.
        /// Handshake rule used by the Desktop Application to prevent unauthorized station access.
        /// </summary>
        [HttpGet("validate-station-access")]
        public async Task<ActionResult<ApiResponse<StationAccessValidationDto>>> ValidateStationAccess(
            [FromQuery] Guid stationId,
            CancellationToken ct)
        {
            var nowUtc = DateTime.UtcNow;

            // Find shifts requiring this station scheduled around current time (+/- 1 hour buffer)
            var activeShift = await _db.BcpShifts
                .Include(s => s.AttendanceRecord)
                .Include(s => s.Assignments)
                .Where(s => s.TenantKey == CurrentTenantKey &&
                            s.RequiredWorkspaceStationId == stationId &&
                            s.Assignments.Any(a => a.UserId == CurrentUserId) &&
                            s.StartsAtUtc <= nowUtc.AddMinutes(30) &&
                            s.EndsAtUtc >= nowUtc.AddMinutes(-30))
                .FirstOrDefaultAsync(ct);

            if (activeShift == null)
            {
                return Ok(ApiResponse<StationAccessValidationDto>.SuccessResponse(new StationAccessValidationDto
                {
                    IsAuthorized = false,
                    RequiresClockIn = false,
                    Message = "No scheduled shift found for this officer on this workstation."
                }, "Validation completed."));
            }

            // Check if actively clocked in
            bool isClockedIn = activeShift.AttendanceRecord != null &&
                               activeShift.AttendanceRecord.ClockInUtc.HasValue &&
                               !activeShift.AttendanceRecord.ClockOutUtc.HasValue;

            if (!isClockedIn)
            {
                return Ok(ApiResponse<StationAccessValidationDto>.SuccessResponse(new StationAccessValidationDto
                {
                    IsAuthorized = false,
                    RequiresClockIn = true,
                    ShiftId = activeShift.Id,
                    ShiftCode = activeShift.ShiftCode,
                    Message = $"Shift {activeShift.ShiftCode} starts at {activeShift.StartsAtUtc:HH:mm}. Please clock in on mobile to unlock this workstation."
                }, "Validation completed."));
            }

            return Ok(ApiResponse<StationAccessValidationDto>.SuccessResponse(new StationAccessValidationDto
            {
                IsAuthorized = true,
                RequiresClockIn = false,
                ShiftId = activeShift.Id,
                ShiftCode = activeShift.ShiftCode,
                Message = "Workstation unlocked. Active shift verified."
            }, "Workstation access granted."));
        }

        // =========================================================================
        // HELPER UTILITIES: Haversine Formula
        // =========================================================================

        private static double CalculateHaversineDistanceMeters(double lat1, double lon1, double lat2, double lon2)
        {
            const double earthRadiusMeters = 6371000;
            double dLat = ToRadians(lat2 - lat1);
            double dLon = ToRadians(lon2 - lon1);

            double a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                       Math.Cos(ToRadians(lat1)) * Math.Cos(ToRadians(lat2)) *
                       Math.Sin(dLon / 2) * Math.Sin(dLon / 2);

            double c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
            return earthRadiusMeters * c;
        }

        private static double ToRadians(double degrees) => degrees * Math.PI / 180.0;
    }

    // =========================================================================
    // DTO CONTRACTS
    // =========================================================================

    public class ClockInRequest
    {
        public Guid ShiftId { get; set; }
        public double? Latitude { get; set; }
        public double? Longitude { get; set; }
        public double? AccuracyMeters { get; set; }
        public string? Method { get; set; } = "MobileGps";
        public bool BiometricVerified { get; set; }
        public string? BiometricType { get; set; }
        public string? PhotoUrl { get; set; }
    }

    public class ClockInResultDto
    {
        public Guid AttendanceId { get; set; }
        public DateTime ClockInUtc { get; set; }
        public bool IsGeofenceVerified { get; set; }
        public double DistanceFromSiteMeters { get; set; }
        public bool IsFlagged { get; set; }
        public string? FlagReason { get; set; }
        public bool RequiredStationUnlocked { get; set; }
        public bool BiometricVerified { get; set; }
        public string? PhotoUrl { get; set; }
    }

    public class ClockOutRequest
    {
        public Guid ShiftId { get; set; }
        public double? Latitude { get; set; }
        public double? Longitude { get; set; }
        public double? AccuracyMeters { get; set; }
        public string? Method { get; set; } = "MobileGps";
        public string? PhotoUrl { get; set; }
    }

    public class ClockOutResultDto
    {
        public Guid AttendanceId { get; set; }
        public DateTime ClockOutUtc { get; set; }
        public decimal TotalDurationHours { get; set; }
        public decimal BillableHours { get; set; }
        public decimal OvertimeHours { get; set; }
    }

    public class WelfareCheckRequest
    {
        public Guid ShiftId { get; set; }
    }

    public class LiveDutyMonitorDto
    {
        public Guid ShiftId { get; set; }
        public string ShiftCode { get; set; } = string.Empty;
        public string SiteName { get; set; } = string.Empty;
        public string PostName { get; set; } = string.Empty;
        public string GuardName { get; set; } = string.Empty;
        public string? GuardId { get; set; }
        public DateTime StartsAtUtc { get; set; }
        public DateTime EndsAtUtc { get; set; }
        public bool IsOvernight { get; set; }
        public string ShiftStatus { get; set; } = "Scheduled";
        public DateTime? ClockInUtc { get; set; }
        public bool IsGeofenceVerified { get; set; }
        public double? DistanceFromSiteMeters { get; set; }
        public bool IsFlagged { get; set; }
        public string? FlagReason { get; set; }
        public DateTime? LastWelfareCheckAtUtc { get; set; }
        public bool IsMissedClockIn { get; set; }
    }

    public class ApproveTimesheetRequest
    {
        public decimal? AdjustedBillableHours { get; set; }
        public string? SupervisorNotes { get; set; }
    }

    public class StationAccessValidationDto
    {
        public bool IsAuthorized { get; set; }
        public bool RequiresClockIn { get; set; }
        public Guid? ShiftId { get; set; }
        public string? ShiftCode { get; set; }
        public string Message { get; set; } = string.Empty;
    }

    public class NotifyActiveStaffRequest
    {
        public string? TargetUserId { get; set; }
        public Guid? ShiftId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public bool SendPush { get; set; } = true;
        public bool SendEmail { get; set; } = true;
        public bool SendWhatsApp { get; set; } = false;
        public bool SendSms { get; set; } = false;
    }
}

