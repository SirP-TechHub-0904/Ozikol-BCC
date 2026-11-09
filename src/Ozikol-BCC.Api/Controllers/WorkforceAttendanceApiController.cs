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

namespace Ozikol_BCC.Api.Controllers
{
    /// <summary>
    /// Core operational API controller for Time, Attendance &amp; Geofence Verification (<c>bcp-attendance-tracking</c>).
    /// Handles GPS geofenced clock-in/out, late arrival flags, lone-worker hourly safety checks,
    /// timesheet supervisor sign-offs, and workstation shift hardware gatekeeping.
    /// </summary>
    [ApiController]
    [Route("api/workforce/attendance")]
    [Authorize]
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

        // =========================================================================
        // 1. LIVE GEOFENCED CLOCK-IN & CLOCK-OUT
        // =========================================================================

        /// <summary>
        /// Records a guard's live Clock-In, calculating Haversine distance against the client site's geofence radius.
        /// Unlocks assigned desktop workstation access upon successful check-in.
        /// </summary>
        [HttpPost("clock-in")]
        public async Task<ActionResult<ApiResponse<ClockInResultDto>>> ClockIn([FromBody] ClockInRequest request, CancellationToken ct)
        {
            var shift = await _db.BcpShifts
                .Include(s => s.ClientSite)
                .Include(s => s.AttendanceRecord)
                .FirstOrDefaultAsync(s => s.Id == request.ShiftId && s.TenantKey == CurrentTenantKey, ct);

            if (shift == null || shift.ClientSite == null)
            {
                return NotFound(ApiResponse<ClockInResultDto>.FailureResponse("Assigned shift or client site not found.", errorCode: "ERR-2004"));
            }

            var nowUtc = DateTime.UtcNow;

            // Distance calculation using Haversine Formula
            double distanceMeters = 0;
            bool isInsideGeofence = true;

            if (shift.ClientSite.Latitude.HasValue && shift.ClientSite.Longitude.HasValue &&
                request.Latitude.HasValue && request.Longitude.HasValue)
            {
                distanceMeters = CalculateHaversineDistanceMeters(
                    shift.ClientSite.Latitude.Value,
                    shift.ClientSite.Longitude.Value,
                    request.Latitude.Value,
                    request.Longitude.Value);

                isInsideGeofence = distanceMeters <= shift.ClientSite.GeofenceRadiusMeters;
            }

            // Late Arrival Detection (>15 mins after scheduled start)
            var lateMinutes = (int)(nowUtc - shift.StartsAtUtc).TotalMinutes;
            bool isLate = lateMinutes > 15;
            bool isFlagged = !isInsideGeofence || isLate;
            string? flagReason = null;

            if (!isInsideGeofence && isLate)
                flagReason = $"Out of geofence ({Math.Round(distanceMeters)}m away, limit: {shift.ClientSite.GeofenceRadiusMeters}m) and {lateMinutes} mins late.";
            else if (!isInsideGeofence)
                flagReason = $"Out of geofence ({Math.Round(distanceMeters)}m away from post, limit: {shift.ClientSite.GeofenceRadiusMeters}m).";
            else if (isLate)
                flagReason = $"Late arrival by {lateMinutes} minutes.";

            var attendance = shift.AttendanceRecord ?? new BcpShiftAttendance
            {
                Id = Guid.CreateVersion7(),
                TenantKey = CurrentTenantKey,
                ShiftId = shift.Id,
                CreatedUtc = nowUtc
            };

            attendance.UserId = CurrentUserId;
            attendance.ClockInUtc = nowUtc;
            attendance.ClockInLatitude = request.Latitude;
            attendance.ClockInLongitude = request.Longitude;
            attendance.ClockInAccuracyMeters = request.AccuracyMeters;
            attendance.ClockInDistanceFromSiteMeters = Math.Round(distanceMeters, 1);
            attendance.IsClockInGeofenceVerified = isInsideGeofence;
            attendance.ClockInMethod = string.IsNullOrWhiteSpace(request.Method) ? "MobileGps" : request.Method;
            attendance.ClockInBiometricVerified = request.BiometricVerified;
            attendance.ClockInBiometricType = request.BiometricType;
            attendance.ClockInPhotoUrl = request.PhotoUrl;
            attendance.LateArrivalMinutes = Math.Max(0, lateMinutes);
            attendance.IsFlagged = isFlagged;
            attendance.FlagReason = flagReason;
            attendance.LastWelfareCheckAtUtc = nowUtc;
            attendance.UpdatedUtc = nowUtc;

            if (shift.AttendanceRecord == null)
            {
                _db.BcpShiftAttendances.Add(attendance);
            }

            shift.Status = "InProgress";
            shift.UpdatedUtc = nowUtc;

            await _db.SaveChangesAsync(ct);

            // Alert Duty Manager if officer clocked in out-of-range or excessively late
            if (isFlagged && _notificationDispatcher != null)
            {
                try
                {
                    await _notificationDispatcher.DispatchAsync(new NotificationDispatchPayload
                    {
                        TargetType = NotificationDispatchTarget.BroadcastAll,
                        TenantKey = CurrentTenantKey,
                        Title = isLate ? "Late Shift Clock-In Alert" : "Geofence Boundary Violation",
                        Message = $"Officer {CurrentUserName} clocked into {shift.ShiftCode} at {shift.ClientSite.SiteName}. Flag: {flagReason}",
                        Category = BcpMessageCategory.Security,
                        Severity = NotificationSeverity.Error,
                        Channels = NotificationChannels.InApp,
                        Module = "Workforce",
                        Icon = "warning",
                        ActionUrl = "/admin/attendance/live"
                    }, ct);
                }
                catch
                {
                    // Non-blocking notification safeguard
                }
            }

            var result = new ClockInResultDto
            {
                AttendanceId = attendance.Id,
                ClockInUtc = nowUtc,
                IsGeofenceVerified = isInsideGeofence,
                DistanceFromSiteMeters = Math.Round(distanceMeters, 1),
                IsFlagged = isFlagged,
                FlagReason = flagReason,
                RequiredStationUnlocked = shift.RequiredWorkspaceStationId.HasValue,
                BiometricVerified = request.BiometricVerified,
                PhotoUrl = request.PhotoUrl
            };

            return Ok(ApiResponse<ClockInResultDto>.SuccessResponse(result, isInsideGeofence ? "Clock-in successful and verified on site." : "Clock-in recorded with geofence warning."));
        }

        /// <summary>
        /// Records a guard's Clock-Out, calculating total duration, net billable hours, and overtime.
        /// </summary>
        [HttpPost("clock-out")]
        public async Task<ActionResult<ApiResponse<ClockOutResultDto>>> ClockOut([FromBody] ClockOutRequest request, CancellationToken ct)
        {
            var shift = await _db.BcpShifts
                .Include(s => s.AttendanceRecord)
                .Include(s => s.ClientSite)
                .FirstOrDefaultAsync(s => s.Id == request.ShiftId && s.TenantKey == CurrentTenantKey, ct);

            if (shift == null || shift.AttendanceRecord == null || !shift.AttendanceRecord.ClockInUtc.HasValue)
            {
                return BadRequest(ApiResponse<ClockOutResultDto>.FailureResponse("No active clock-in found for this shift.", errorCode: "ERR-2005"));
            }

            var attendance = shift.AttendanceRecord;
            var nowUtc = DateTime.UtcNow;

            double distanceMeters = 0;
            bool isInsideGeofence = true;
            if (shift.ClientSite?.Latitude.HasValue == true && shift.ClientSite.Longitude.HasValue &&
                request.Latitude.HasValue && request.Longitude.HasValue)
            {
                distanceMeters = CalculateHaversineDistanceMeters(
                    shift.ClientSite.Latitude.Value,
                    shift.ClientSite.Longitude.Value,
                    request.Latitude.Value,
                    request.Longitude.Value);

                isInsideGeofence = distanceMeters <= shift.ClientSite.GeofenceRadiusMeters;
            }

            var actualTotalHours = (decimal)(nowUtc - attendance.ClockInUtc.Value).TotalHours;
            var netBillableHours = Math.Max(0, actualTotalHours - (shift.BreakMinutes / 60.0m));
            var overtimeHours = Math.Max(0, netBillableHours - shift.PlannedDurationHours);

            attendance.ClockOutUtc = nowUtc;
            attendance.ClockOutLatitude = request.Latitude;
            attendance.ClockOutLongitude = request.Longitude;
            attendance.ClockOutAccuracyMeters = request.AccuracyMeters;
            attendance.ClockOutDistanceFromSiteMeters = Math.Round(distanceMeters, 1);
            attendance.IsClockOutGeofenceVerified = isInsideGeofence;
            attendance.ClockOutMethod = string.IsNullOrWhiteSpace(request.Method) ? "MobileGps" : request.Method;
            attendance.ClockOutPhotoUrl = request.PhotoUrl;
            attendance.ActualDurationHours = Math.Round(actualTotalHours, 2);
            attendance.BillableHours = Math.Round(netBillableHours, 2);
            attendance.OvertimeHours = Math.Round(overtimeHours, 2);
            attendance.UpdatedUtc = nowUtc;

            shift.Status = "Completed";
            shift.UpdatedUtc = nowUtc;

            await _db.SaveChangesAsync(ct);

            var result = new ClockOutResultDto
            {
                AttendanceId = attendance.Id,
                ClockOutUtc = nowUtc,
                TotalDurationHours = Math.Round(actualTotalHours, 2),
                BillableHours = Math.Round(netBillableHours, 2),
                OvertimeHours = Math.Round(overtimeHours, 2)
            };

            return Ok(ApiResponse<ClockOutResultDto>.SuccessResponse(result, "Clock-out recorded successfully. Timesheet submitted for supervisor review."));
        }

        // =========================================================================
        // 2. LONE WORKER SAFETY & WELFARE CHECK-CALLS
        // =========================================================================

        /// <summary>
        /// Acknowledges an hourly lone-worker safety check prompt to confirm officer well-being on site.
        /// </summary>
        [HttpPost("welfare-check")]
        public async Task<ActionResult<ApiResponse<bool>>> ConfirmWelfareCheck([FromBody] WelfareCheckRequest request, CancellationToken ct)
        {
            var attendance = await _db.BcpShiftAttendances
                .FirstOrDefaultAsync(a => a.ShiftId == request.ShiftId && a.TenantKey == CurrentTenantKey, ct);

            if (attendance == null)
            {
                return NotFound(ApiResponse<bool>.FailureResponse("Active attendance record not found.", errorCode: "ERR-2004"));
            }

            attendance.LastWelfareCheckAtUtc = DateTime.UtcNow;
            attendance.WelfareChecksCompletedCount += 1;
            attendance.UpdatedUtc = DateTime.UtcNow;

            await _db.SaveChangesAsync(ct);
            return Ok(ApiResponse<bool>.SuccessResponse(true, "Welfare check-call confirmed. Stay safe on site."));
        }

        // =========================================================================
        // 3. LIVE SITE MONITOR & SUPERVISOR TIMESHEETS
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
                    GuardName = s.AssignedUserName ?? "Unassigned",
                    GuardId = s.AssignedUserId,
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

            return Ok(ApiResponse<bool>.SuccessResponse(true, "Timesheet approved and signed off for payroll."));
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
                .Where(s => s.TenantKey == CurrentTenantKey &&
                            s.RequiredWorkspaceStationId == stationId &&
                            s.AssignedUserId == CurrentUserId &&
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
}

