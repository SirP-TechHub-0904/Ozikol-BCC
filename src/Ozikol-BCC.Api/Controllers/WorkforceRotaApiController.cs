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
    /// Core operational API controller for Staff Rota &amp; Shift Management (<c>bcp-staff-rota</c>).
    /// Manages 24/7 cross-midnight shift scheduling, client site geofences, guard shift confirmations,
    /// peer shift swaps, open-shift claims, and staff leave blackouts.
    /// </summary>
    [ApiController]
    [Route("api/workforce")]
    [Authorize]
    [Tags("Workforce Rota & Shift Operations")]
    public class WorkforceRotaApiController : ControllerBase
    {
        private readonly DashboardDbContext _db;
        private readonly ICentralNotificationDispatcher? _notificationDispatcher;
        private readonly ITenantProvider? _tenantProvider;
        private readonly ITenantFeatureGateService? _featureGateService;

        /// <summary>
        /// Initializes a new instance of the <see cref="WorkforceRotaApiController"/> class.
        /// </summary>
        public WorkforceRotaApiController(
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
        private string CurrentUserName => User.FindFirst(ClaimTypes.Name)?.Value ?? User.FindFirst("name")?.Value ?? "Staff Member";

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
        // 1. CLIENT SITES & POSTS
        // =========================================================================

        /// <summary>
        /// Retrieves the list of active client operating sites with geofence profiles and post assignment instructions.
        /// </summary>
        [HttpGet("sites")]
        public async Task<ActionResult<ApiResponse<List<ClientSiteDto>>>> GetSites(CancellationToken ct)
        {
            var sites = await _db.BcpClientSites
                .AsNoTracking()
                .Where(s => s.TenantKey == CurrentTenantKey && s.IsActive)
                .OrderBy(s => s.SiteName)
                .Select(s => new ClientSiteDto
                {
                    Id = s.Id,
                    SiteCode = s.SiteCode,
                    SiteName = s.SiteName,
                    Address = s.Address,
                    City = s.City,
                    PostalCode = s.PostalCode,
                    Latitude = s.Latitude,
                    Longitude = s.Longitude,
                    GeofenceRadiusMeters = s.GeofenceRadiusMeters,
                    EmergencyContactName = s.EmergencyContactName,
                    EmergencyContactPhone = s.EmergencyContactPhone,
                    SiteAssignmentInstructions = s.SiteAssignmentInstructions,
                    RequiredSiaLicenceType = s.RequiredSiaLicenceType,
                    ActiveShiftsCount = s.Shifts.Count(sh => sh.Status == "Scheduled" || sh.Status == "InProgress")
                })
                .ToListAsync(ct);

            return Ok(ApiResponse<List<ClientSiteDto>>.SuccessResponse(sites, "Client sites retrieved successfully."));
        }

        /// <summary>
        /// Retrieves a single client operating site by ID.
        /// </summary>
        [HttpGet("sites/{id:guid}")]
        public async Task<ActionResult<ApiResponse<ClientSiteDto>>> GetSiteById(Guid id, CancellationToken ct)
        {
            var s = await _db.BcpClientSites
                .AsNoTracking()
                .Where(s => s.TenantKey == CurrentTenantKey && s.Id == id && s.IsActive)
                .Select(s => new ClientSiteDto
                {
                    Id = s.Id,
                    SiteCode = s.SiteCode,
                    SiteName = s.SiteName,
                    Address = s.Address,
                    City = s.City,
                    PostalCode = s.PostalCode,
                    Latitude = s.Latitude,
                    Longitude = s.Longitude,
                    GeofenceRadiusMeters = s.GeofenceRadiusMeters,
                    EmergencyContactName = s.EmergencyContactName,
                    EmergencyContactPhone = s.EmergencyContactPhone,
                    SiteAssignmentInstructions = s.SiteAssignmentInstructions,
                    RequiredSiaLicenceType = s.RequiredSiaLicenceType,
                    ActiveShiftsCount = s.Shifts.Count(sh => sh.Status == "Scheduled" || sh.Status == "InProgress")
                })
                .FirstOrDefaultAsync(ct);

            if (s == null)
            {
                return NotFound(ApiResponse<ClientSiteDto>.FailureResponse("Client site not found.", errorCode: "ERR-2004"));
            }

            return Ok(ApiResponse<ClientSiteDto>.SuccessResponse(s, "Client site retrieved successfully."));
        }

        /// <summary>
        /// Creates or updates a client site profile, including GPS geofence boundary coordinates and emergency contact details.
        /// </summary>
        [HttpPost("sites")]
        public async Task<ActionResult<ApiResponse<Guid>>> UpsertSite([FromBody] UpsertClientSiteRequest request, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(request.SiteName) || string.IsNullOrWhiteSpace(request.SiteCode))
            {
                return BadRequest(ApiResponse<Guid>.FailureResponse("Site code and site name are mandatory.", errorCode: "ERR-2002"));
            }

            BcpClientSite site;
            if (request.Id.HasValue && request.Id != Guid.Empty)
            {
                site = await _db.BcpClientSites.FirstOrDefaultAsync(s => s.Id == request.Id.Value && s.TenantKey == CurrentTenantKey, ct);
                if (site == null)
                {
                    return NotFound(ApiResponse<Guid>.FailureResponse("Client site not found.", errorCode: "ERR-2004"));
                }
            }
            else
            {
                site = new BcpClientSite
                {
                    Id = Guid.CreateVersion7(),
                    TenantKey = CurrentTenantKey,
                    CreatedUtc = DateTime.UtcNow
                };
                _db.BcpClientSites.Add(site);
            }

            site.SiteCode = request.SiteCode.Trim().ToUpperInvariant();
            site.SiteName = request.SiteName.Trim();
            site.Address = request.Address?.Trim() ?? string.Empty;
            site.City = request.City?.Trim() ?? string.Empty;
            site.PostalCode = request.PostalCode?.Trim() ?? string.Empty;
            site.Latitude = request.Latitude;
            site.Longitude = request.Longitude;
            site.GeofenceRadiusMeters = request.GeofenceRadiusMeters > 0 ? request.GeofenceRadiusMeters : 150;
            site.EmergencyContactName = request.EmergencyContactName?.Trim();
            site.EmergencyContactPhone = request.EmergencyContactPhone?.Trim();
            site.SiteAssignmentInstructions = request.SiteAssignmentInstructions?.Trim();
            site.RequiredSiaLicenceType = request.RequiredSiaLicenceType?.Trim();
            site.UpdatedUtc = DateTime.UtcNow;

            await _db.SaveChangesAsync(ct);
            return Ok(ApiResponse<Guid>.SuccessResponse(site.Id, "Client site saved successfully."));
        }

        // =========================================================================
        // 2. SHIFTS & ROSTER SCHEDULING (Single Source of Truth)
        // =========================================================================

        /// <summary>
        /// Queries scheduled shifts across a specific date range with optional filtering by site, guard, or status.
        /// </summary>
        [HttpGet("shifts")]
        public async Task<ActionResult<ApiResponse<List<ShiftDto>>>> GetShifts(
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate,
            [FromQuery] Guid? siteId,
            [FromQuery] string? userId,
            [FromQuery] string? status,
            CancellationToken ct)
        {
            var query = _db.BcpShifts
                .AsNoTracking()
                .Include(s => s.ClientSite)
                .Include(s => s.AttendanceRecord)
                .Where(s => s.TenantKey == CurrentTenantKey);

            if (startDate.HasValue)
                query = query.Where(s => s.StartsAtUtc >= startDate.Value.ToUniversalTime());
            if (endDate.HasValue)
                query = query.Where(s => s.EndsAtUtc <= endDate.Value.ToUniversalTime());
            if (siteId.HasValue && siteId != Guid.Empty)
                query = query.Where(s => s.ClientSiteId == siteId.Value);
            if (!string.IsNullOrWhiteSpace(userId))
                query = query.Where(s => s.AssignedUserId == userId);
            if (!string.IsNullOrWhiteSpace(status))
                query = query.Where(s => s.Status == status);

            var shifts = await query
                .OrderBy(s => s.StartsAtUtc)
                .Select(s => new ShiftDto
                {
                    Id = s.Id,
                    ShiftCode = s.ShiftCode,
                    ClientSiteId = s.ClientSiteId,
                    SiteName = s.ClientSite != null ? s.ClientSite.SiteName : "Unknown Site",
                    SiteAddress = s.ClientSite != null ? s.ClientSite.Address : string.Empty,
                    PostName = s.PostName,
                    FacilityName = s.FacilityName,
                    Address = s.Address,
                    PostCode = s.PostCode,
                    EventTag = s.EventTag,
                    AssignedUserId = s.AssignedUserId,
                    AssignedUserName = s.AssignedUserName,
                    StartsAtUtc = s.StartsAtUtc,
                    EndsAtUtc = s.EndsAtUtc,
                    IsOvernight = s.IsOvernight,
                    BreakMinutes = s.BreakMinutes,
                    PlannedDurationHours = s.PlannedDurationHours,
                    HourlyPayRate = s.HourlyPayRate,
                    HourlyChargeRate = s.HourlyChargeRate,
                    RequiredWorkspaceStationId = s.RequiredWorkspaceStationId,
                    RequiredWorkspaceStationName = s.RequiredWorkspaceStationName,
                    Status = s.Status,
                    IsConfirmedByGuard = s.IsConfirmedByGuard,
                    ConfirmedAtUtc = s.ConfirmedAtUtc,
                    AcceptanceDeadlineUtc = s.AcceptanceDeadlineUtc,
                    AcceptanceCountdownMinutes = s.AcceptanceDeadlineUtc.HasValue ? (int)Math.Max(0, (s.AcceptanceDeadlineUtc.Value - DateTime.UtcNow).TotalMinutes) : null,
                    Notes = s.Notes,
                    IsClockedIn = s.AttendanceRecord != null && s.AttendanceRecord.ClockInUtc.HasValue && !s.AttendanceRecord.ClockOutUtc.HasValue,
                    IsClockedOut = s.AttendanceRecord != null && s.AttendanceRecord.ClockOutUtc.HasValue
                })
                .ToListAsync(ct);

            return Ok(ApiResponse<List<ShiftDto>>.SuccessResponse(shifts, "Shifts retrieved successfully."));
        }

        /// <summary>
        /// Returns all upcoming and current shifts assigned specifically to the logged-in member.
        /// </summary>
        [HttpGet("shifts/my")]
        public async Task<ActionResult<ApiResponse<List<ShiftDto>>>> GetMyShifts(CancellationToken ct)
        {
            var nowUtc = DateTime.UtcNow.AddHours(-12); // Include recent shifts
            var myShifts = await _db.BcpShifts
                .AsNoTracking()
                .Include(s => s.ClientSite)
                .Include(s => s.AttendanceRecord)
                .Where(s => s.TenantKey == CurrentTenantKey && s.AssignedUserId == CurrentUserId && s.EndsAtUtc >= nowUtc)
                .OrderBy(s => s.StartsAtUtc)
                .Select(s => new ShiftDto
                {
                    Id = s.Id,
                    ShiftCode = s.ShiftCode,
                    ClientSiteId = s.ClientSiteId,
                    SiteName = s.ClientSite != null ? s.ClientSite.SiteName : "Site",
                    SiteAddress = s.ClientSite != null ? s.ClientSite.Address : string.Empty,
                    PostName = s.PostName,
                    FacilityName = s.FacilityName,
                    Address = s.Address,
                    PostCode = s.PostCode,
                    EventTag = s.EventTag,
                    AssignedUserId = s.AssignedUserId,
                    AssignedUserName = s.AssignedUserName,
                    StartsAtUtc = s.StartsAtUtc,
                    EndsAtUtc = s.EndsAtUtc,
                    IsOvernight = s.IsOvernight,
                    BreakMinutes = s.BreakMinutes,
                    PlannedDurationHours = s.PlannedDurationHours,
                    HourlyPayRate = s.HourlyPayRate,
                    HourlyChargeRate = s.HourlyChargeRate,
                    RequiredWorkspaceStationId = s.RequiredWorkspaceStationId,
                    RequiredWorkspaceStationName = s.RequiredWorkspaceStationName,
                    Status = s.Status,
                    IsConfirmedByGuard = s.IsConfirmedByGuard,
                    ConfirmedAtUtc = s.ConfirmedAtUtc,
                    AcceptanceDeadlineUtc = s.AcceptanceDeadlineUtc,
                    AcceptanceCountdownMinutes = s.AcceptanceDeadlineUtc.HasValue ? (int)Math.Max(0, (s.AcceptanceDeadlineUtc.Value - DateTime.UtcNow).TotalMinutes) : null,
                    Notes = s.Notes,
                    SiteAssignmentInstructions = s.ClientSite != null ? s.ClientSite.SiteAssignmentInstructions : null,
                    EmergencyContactPhone = s.ClientSite != null ? s.ClientSite.EmergencyContactPhone : null,
                    IsClockedIn = s.AttendanceRecord != null && s.AttendanceRecord.ClockInUtc.HasValue && !s.AttendanceRecord.ClockOutUtc.HasValue,
                    IsClockedOut = s.AttendanceRecord != null && s.AttendanceRecord.ClockOutUtc.HasValue
                })
                .ToListAsync(ct);

            return Ok(ApiResponse<List<ShiftDto>>.SuccessResponse(myShifts, "Personal shift roster retrieved."));
        }

        /// <summary>
        /// Creates a new planned shift with automatic cross-midnight overnight detection, break deduction,
        /// and rest-period/double-booking conflict checks.
        /// </summary>
        [HttpPost("shifts")]
        public async Task<ActionResult<ApiResponse<Guid>>> CreateShift([FromBody] CreateShiftRequest request, CancellationToken ct)
        {
            if (request.ClientSiteId == Guid.Empty || request.StartsAtUtc >= request.EndsAtUtc)
            {
                return BadRequest(ApiResponse<Guid>.FailureResponse("Valid site and end time greater than start time are required.", errorCode: "ERR-2001"));
            }

            var startUtc = request.StartsAtUtc.ToUniversalTime();
            var endUtc = request.EndsAtUtc.ToUniversalTime();

            // Conflict Check: Double-booking prevention
            if (!string.IsNullOrWhiteSpace(request.AssignedUserId))
            {
                var hasOverlap = await _db.BcpShifts.AnyAsync(s =>
                    s.TenantKey == CurrentTenantKey &&
                    s.AssignedUserId == request.AssignedUserId &&
                    s.Status != "Cancelled" &&
                    s.StartsAtUtc < endUtc &&
                    s.EndsAtUtc > startUtc, ct);

                if (hasOverlap)
                {
                    return Conflict(ApiResponse<Guid>.FailureResponse("This officer is already scheduled for another shift during these hours.", errorCode: "ERR-2005"));
                }
            }

            // Cross-Midnight Overnight Shift Calculation
            bool isOvernight = endUtc.Date > startUtc.Date;
            int breakMins = request.BreakMinutes >= 0 ? request.BreakMinutes : 0;
            decimal totalHours = (decimal)(endUtc - startUtc).TotalHours;
            decimal plannedNetHours = Math.Max(0, totalHours - (breakMins / 60.0m));

            // Generate deterministic shift reference code
            var countToday = await _db.BcpShifts.CountAsync(s => s.TenantKey == CurrentTenantKey && s.StartsAtUtc.Date == startUtc.Date, ct);
            var shiftCode = $"SHF-{startUtc:yyyyMMdd}-{countToday + 1:D3}";

            var shift = new BcpShift
            {
                Id = Guid.CreateVersion7(),
                TenantKey = CurrentTenantKey,
                ShiftCode = shiftCode,
                ClientSiteId = request.ClientSiteId,
                AssignedUserId = request.AssignedUserId,
                AssignedUserName = request.AssignedUserName,
                PostName = string.IsNullOrWhiteSpace(request.PostName) ? "General Post" : request.PostName.Trim(),
                FacilityName = request.FacilityName?.Trim(),
                Address = request.Address?.Trim(),
                PostCode = request.PostCode?.Trim(),
                EventTag = request.EventTag?.Trim(),
                StartsAtUtc = startUtc,
                EndsAtUtc = endUtc,
                IsOvernight = isOvernight,
                BreakMinutes = breakMins,
                PlannedDurationHours = Math.Round(plannedNetHours, 2),
                RequiredWorkspaceStationId = request.RequiredWorkspaceStationId,
                RequiredWorkspaceStationName = request.RequiredWorkspaceStationName,
                HourlyPayRate = request.HourlyPayRate,
                HourlyChargeRate = request.HourlyChargeRate,
                AcceptanceDeadlineUtc = request.AcceptanceDeadlineUtc,
                Status = "Scheduled",
                IsConfirmedByGuard = false,
                Notes = request.Notes?.Trim(),
                CreatedByUserId = CurrentUserId,
                CreatedUtc = DateTime.UtcNow
            };

            _db.BcpShifts.Add(shift);
            await _db.SaveChangesAsync(ct);

            // Dispatch notification to assigned guard
            if (!string.IsNullOrWhiteSpace(shift.AssignedUserId) && _notificationDispatcher != null)
            {
                try
                {
                    await _notificationDispatcher.DispatchAsync(new NotificationDispatchPayload
                    {
                        TargetType = NotificationDispatchTarget.SingleUser,
                        TargetUserId = shift.AssignedUserId,
                        TenantKey = CurrentTenantKey,
                        Title = "New Shift Assigned",
                        Message = $"You have been assigned to shift {shift.ShiftCode} ({startUtc:ddd, dd MMM HH:mm} - {endUtc:HH:mm}). Please review and confirm.",
                        Category = BcpMessageCategory.General,
                        Severity = NotificationSeverity.NewFeature,
                        Channels = NotificationChannels.InApp,
                        Module = "Workforce",
                        Icon = "calendar_month",
                        ActionUrl = "/workforce/my-shifts"
                    }, ct);
                }
                catch
                {
                    // Non-blocking notification dispatch
                }
            }

            return Ok(ApiResponse<Guid>.SuccessResponse(shift.Id, $"Shift {shift.ShiftCode} created successfully."));
        }

        /// <summary>
        /// Allows a scheduled guard to review and confirm acceptance of their assigned shift.
        /// </summary>
        [HttpPost("shifts/{id}/confirm")]
        public async Task<ActionResult<ApiResponse<bool>>> ConfirmShift(Guid id, CancellationToken ct)
        {
            var shift = await _db.BcpShifts.FirstOrDefaultAsync(s => s.Id == id && s.TenantKey == CurrentTenantKey, ct);
            if (shift == null)
            {
                return NotFound(ApiResponse<bool>.FailureResponse("Shift not found.", errorCode: "ERR-2004"));
            }

            shift.IsConfirmedByGuard = true;
            shift.ConfirmedAtUtc = DateTime.UtcNow;
            shift.Status = "Confirmed";
            shift.UpdatedUtc = DateTime.UtcNow;

            await _db.SaveChangesAsync(ct);
            return Ok(ApiResponse<bool>.SuccessResponse(true, "Shift confirmed successfully."));
        }

        // =========================================================================
        // 3. SHIFT SWAPS & OPEN SHIFTS
        // =========================================================================

        /// <summary>
        /// Initiates a peer shift swap request or posts an assigned shift to the open claim market.
        /// </summary>
        [HttpPost("swaps")]
        public async Task<ActionResult<ApiResponse<Guid>>> RequestSwap([FromBody] CreateSwapRequest request, CancellationToken ct)
        {
            var shift = await _db.BcpShifts.FirstOrDefaultAsync(s => s.Id == request.ShiftId && s.TenantKey == CurrentTenantKey, ct);
            if (shift == null)
            {
                return NotFound(ApiResponse<Guid>.FailureResponse("Shift not found.", errorCode: "ERR-2004"));
            }

            var swap = new BcpShiftSwapRequest
            {
                Id = Guid.CreateVersion7(),
                TenantKey = CurrentTenantKey,
                ShiftId = shift.Id,
                RequestingUserId = CurrentUserId,
                RequestingUserName = CurrentUserName,
                OfferedToUserId = request.OfferedToUserId,
                OfferedToUserName = request.OfferedToUserName,
                TargetShiftId = request.TargetShiftId,
                Reason = request.Reason?.Trim(),
                Status = string.IsNullOrWhiteSpace(request.OfferedToUserId) ? "PendingSupervisor" : "PendingPeer",
                CreatedUtc = DateTime.UtcNow
            };

            _db.BcpShiftSwapRequests.Add(swap);
            await _db.SaveChangesAsync(ct);

            return Ok(ApiResponse<Guid>.SuccessResponse(swap.Id, "Shift swap request submitted for approval."));
        }

        /// <summary>
        /// Claims an open or offered shift from the workforce shift market.
        /// </summary>
        [HttpPost("swaps/{id}/claim")]
        public async Task<ActionResult<ApiResponse<bool>>> ClaimOpenShift(Guid id, CancellationToken ct)
        {
            var swap = await _db.BcpShiftSwapRequests
                .Include(s => s.Shift)
                .FirstOrDefaultAsync(s => s.Id == id && s.TenantKey == CurrentTenantKey, ct);

            if (swap == null || swap.Shift == null)
            {
                return NotFound(ApiResponse<bool>.FailureResponse("Swap request not found.", errorCode: "ERR-2004"));
            }

            swap.OfferedToUserId = CurrentUserId;
            swap.OfferedToUserName = CurrentUserName;
            swap.Status = "PendingSupervisor";

            await _db.SaveChangesAsync(ct);
            return Ok(ApiResponse<bool>.SuccessResponse(true, "Shift claimed. Pending supervisor approval."));
        }

        /// <summary>
        /// Approves or rejects a shift swap, automatically updating shift ownership upon approval.
        /// </summary>
        [HttpPost("swaps/{id}/review")]
        public async Task<ActionResult<ApiResponse<bool>>> ReviewSwap(
            Guid id,
            [FromBody] ReviewSwapRequest review,
            CancellationToken ct)
        {
            var swap = await _db.BcpShiftSwapRequests
                .Include(s => s.Shift)
                .FirstOrDefaultAsync(s => s.Id == id && s.TenantKey == CurrentTenantKey, ct);

            if (swap == null || swap.Shift == null)
            {
                return NotFound(ApiResponse<bool>.FailureResponse("Swap request not found.", errorCode: "ERR-2004"));
            }

            if (review.IsApproved)
            {
                swap.Status = "Approved";
                swap.SupervisorApprovedBy = CurrentUserName;
                swap.SupervisorApprovedAtUtc = DateTime.UtcNow;

                // Transfer Shift to new officer
                if (!string.IsNullOrWhiteSpace(swap.OfferedToUserId))
                {
                    swap.Shift.AssignedUserId = swap.OfferedToUserId;
                    swap.Shift.AssignedUserName = swap.OfferedToUserName;
                    swap.Shift.IsConfirmedByGuard = false;
                    swap.Shift.Status = "Scheduled";
                    swap.Shift.UpdatedUtc = DateTime.UtcNow;
                }
            }
            else
            {
                swap.Status = "Rejected";
                swap.SupervisorApprovedBy = CurrentUserName;
                swap.SupervisorApprovedAtUtc = DateTime.UtcNow;
                swap.SupervisorRejectionReason = review.RejectionReason;
            }

            await _db.SaveChangesAsync(ct);
            return Ok(ApiResponse<bool>.SuccessResponse(true, review.IsApproved ? "Swap approved and shift transferred." : "Swap request rejected."));
        }

        // =========================================================================
        // 4. LEAVE & TIME-OFF REQUESTS
        // =========================================================================

        /// <summary>
        /// Submits a staff leave request to black out unavailability from the scheduling calendar.
        /// </summary>
        [HttpPost("leave")]
        public async Task<ActionResult<ApiResponse<Guid>>> RequestLeave([FromBody] SubmitLeaveRequest request, CancellationToken ct)
        {
            if (request.StartDate > request.EndDate)
            {
                return BadRequest(ApiResponse<Guid>.FailureResponse("End date must be after start date.", errorCode: "ERR-2001"));
            }

            var days = (decimal)(request.EndDate - request.StartDate).TotalDays + 1;
            var leave = new BcpShiftLeaveRequest
            {
                Id = Guid.CreateVersion7(),
                TenantKey = CurrentTenantKey,
                UserId = CurrentUserId,
                UserName = CurrentUserName,
                LeaveType = string.IsNullOrWhiteSpace(request.LeaveType) ? "Annual" : request.LeaveType,
                StartDate = request.StartDate.Date,
                EndDate = request.EndDate.Date,
                TotalDays = Math.Max(1.0m, Math.Round(days, 1)),
                Reason = request.Reason?.Trim(),
                AttachmentUrl = request.AttachmentUrl?.Trim(),
                Status = "Pending",
                CreatedUtc = DateTime.UtcNow
            };

            _db.BcpShiftLeaveRequests.Add(leave);
            await _db.SaveChangesAsync(ct);

            return Ok(ApiResponse<Guid>.SuccessResponse(leave.Id, "Leave request submitted for review."));
        }

        // =========================================================================
        // 5. STAFF ONBOARDING & INVITATION
        // =========================================================================

        /// <summary>
        /// Enrolls a staff member into the workforce rota system, configuring their job title,
        /// contracted hours, default hourly rate, and triggers a transactional onboarding email.
        /// </summary>
        [HttpPost("members/enroll")]
        public async Task<ActionResult<ApiResponse<Guid>>> EnrollStaffMember([FromBody] EnrollStaffMemberRequest request, CancellationToken ct)
        {
            var userId = request.UserId?.Trim();
            if (string.IsNullOrWhiteSpace(userId))
            {
                userId = Guid.CreateVersion7().ToString();
            }

            var profile = await _db.BcpShiftStaffProfiles
                .FirstOrDefaultAsync(p => p.TenantKey == CurrentTenantKey && p.UserId == userId, ct);

            if (profile == null)
            {
                profile = new BcpShiftStaffProfile
                {
                    Id = Guid.CreateVersion7(),
                    TenantKey = CurrentTenantKey,
                    UserId = userId,
                    CreatedUtc = DateTime.UtcNow
                };
                _db.BcpShiftStaffProfiles.Add(profile);
            }

            profile.JobTitle = string.IsNullOrWhiteSpace(request.JobTitle) ? "Staff Member" : request.JobTitle.Trim();
            profile.DefaultHourlyRate = request.DefaultHourlyRate;
            profile.ContractedWeeklyHours = request.ContractedWeeklyHours;
            profile.IsActive = true;
            profile.UpdatedUtc = DateTime.UtcNow;

            await _db.SaveChangesAsync(ct);

            // Trigger Transactional Welcome & Onboarding Email via Central Notification Dispatcher
            if (_notificationDispatcher != null && (!string.IsNullOrWhiteSpace(request.Email) || !string.IsNullOrWhiteSpace(userId)))
            {
                try
                {
                    await _notificationDispatcher.DispatchAsync(new NotificationDispatchPayload
                    {
                        TargetType = NotificationDispatchTarget.SingleUser,
                        TargetUserId = userId,
                        RecipientEmail = request.Email?.Trim(),
                        RecipientName = request.FullName?.Trim() ?? "Staff Member",
                        TenantKey = CurrentTenantKey,
                        Title = "Welcome to Your Workforce Rota & Shift Workspace",
                        Message = $"Hello {request.FullName ?? "Team Member"},\n\nYou have been invited to join the Workforce Rota system as a **{profile.JobTitle}**.\n\nPlease log in to your workspace to configure your availability, upload required compliance documents, and set your shift reminder preferences.",
                        Category = BcpMessageCategory.Account,
                        Severity = NotificationSeverity.NewFeature,
                        Channels = NotificationChannels.InApp | NotificationChannels.Email,
                        SendEmailCopy = true,
                        Module = "Workforce",
                        Icon = "badge",
                        ActionUrl = "/workforce/workspace/my-shifts"
                    }, ct);
                }
                catch
                {
                    // Non-blocking notification dispatch
                }
            }

            return Ok(ApiResponse<Guid>.SuccessResponse(profile.Id, "Staff member successfully enrolled and onboarding email dispatched."));
        }

        /// <summary>
        /// Returns all enrolled workforce staff members with aggregated ratings, completed shifts, and punctuality scores.
        /// </summary>
        [HttpGet("members")]
        public async Task<ActionResult<ApiResponse<List<StaffMemberDto>>>> GetStaffMembers(CancellationToken ct)
        {
            var profiles = await _db.BcpShiftStaffProfiles
                .AsNoTracking()
                .Where(p => p.TenantKey == CurrentTenantKey && p.IsActive)
                .OrderBy(p => p.JobTitle)
                .ToListAsync(ct);

            // Cross-reference with central users table where available
            var userIds = profiles.Select(p => p.UserId).Distinct().ToList();
            var users = await _db.Users
                .AsNoTracking()
                .Where(u => userIds.Contains(u.Id))
                .ToDictionaryAsync(u => u.Id, u => new { u.FullName, u.Email, u.PhoneNumber }, ct);

            var result = profiles.Select(p =>
            {
                users.TryGetValue(p.UserId, out var u);
                return new StaffMemberDto
                {
                    ProfileId = p.Id,
                    UserId = p.UserId,
                    FullName = u?.FullName ?? "Staff Member",
                    Email = u?.Email ?? string.Empty,
                    PhoneNumber = u?.PhoneNumber,
                    JobTitle = p.JobTitle,
                    DefaultHourlyRate = p.DefaultHourlyRate,
                    ContractedWeeklyHours = p.ContractedWeeklyHours,
                    AverageRating = p.AverageRating,
                    TotalRatingsCount = p.TotalRatingsCount,
                    TotalShiftsCompleted = p.TotalShiftsCompleted,
                    PunctualityScorePercent = p.PunctualityScorePercent,
                    NoShowCount = p.NoShowCount,
                    IsActive = p.IsActive,
                    EnrolledUtc = p.CreatedUtc
                };
            }).ToList();

            return Ok(ApiResponse<List<StaffMemberDto>>.SuccessResponse(result, "Workforce staff members retrieved."));
        }

        // =========================================================================
        // 6. GRAPHICAL ANALYTICS & KPIS
        // =========================================================================

        /// <summary>
        /// Computes graphical analytics, KPIs, fulfillment rates, punctuality scores, and labor spend for administrators.
        /// </summary>
        [HttpGet("analytics")]
        public async Task<ActionResult<ApiResponse<WorkforceAnalyticsDto>>> GetWorkforceAnalytics(CancellationToken ct)
        {
            var nowUtc = DateTime.UtcNow;
            var thirtyDaysAgo = nowUtc.AddDays(-30);

            var shifts = await _db.BcpShifts
                .AsNoTracking()
                .Include(s => s.ClientSite)
                .Include(s => s.AttendanceRecord)
                .Where(s => s.TenantKey == CurrentTenantKey && s.StartsAtUtc >= thirtyDaysAgo)
                .ToListAsync(ct);

            int totalShifts = shifts.Count;
            int completedShifts = shifts.Count(s => s.Status == "Completed");
            int openShifts = shifts.Count(s => string.IsNullOrWhiteSpace(s.AssignedUserId));
            int activeOnDuty = shifts.Count(s => s.AttendanceRecord != null && s.AttendanceRecord.ClockInUtc.HasValue && !s.AttendanceRecord.ClockOutUtc.HasValue);

            decimal scheduledHours = shifts.Sum(s => s.PlannedDurationHours);
            decimal workedHours = shifts.Where(s => s.AttendanceRecord?.ActualDurationHours != null).Sum(s => s.AttendanceRecord!.ActualDurationHours!.Value);

            decimal totalSpend = shifts.Sum(s =>
            {
                var rate = s.HourlyPayRate ?? 0;
                var hours = s.AttendanceRecord?.BillableHours ?? s.PlannedDurationHours;
                return rate * hours;
            });

            decimal fulfillmentRate = totalShifts > 0
                ? Math.Round(((decimal)(totalShifts - openShifts) / totalShifts) * 100m, 1)
                : 0.0m;

            var attendances = shifts.Where(s => s.AttendanceRecord != null).Select(s => s.AttendanceRecord!).ToList();
            int onTimeCount = attendances.Count(a => a.LateArrivalMinutes <= 5 && !a.IsFlagged);
            int lateCount = attendances.Count(a => a.LateArrivalMinutes > 5);
            int geofenceViolations = attendances.Count(a => !a.IsClockInGeofenceVerified);
            int noShows = shifts.Count(s => s.Status == "Absent");

            decimal punctualityPercent = attendances.Count > 0
                ? Math.Round(((decimal)onTimeCount / attendances.Count) * 100m, 1)
                : 0.0m;

            var siteBreakdowns = shifts
                .GroupBy(s => new { s.ClientSiteId, SiteName = s.ClientSite?.SiteName ?? "Unassigned Venue" })
                .Select(g => new SiteHoursBreakdownDto
                {
                    SiteId = g.Key.ClientSiteId,
                    SiteName = g.Key.SiteName,
                    TotalHours = g.Sum(s => s.AttendanceRecord?.BillableHours ?? s.PlannedDurationHours),
                    TotalSpend = g.Sum(s => (s.HourlyPayRate ?? 0) * (s.AttendanceRecord?.BillableHours ?? s.PlannedDurationHours)),
                    ShiftCount = g.Count()
                })
                .OrderByDescending(b => b.TotalHours)
                .ToList();

            var dto = new WorkforceAnalyticsDto
            {
                ShiftFulfillmentRatePercent = fulfillmentRate,
                OverallPunctualityPercent = punctualityPercent,
                ActiveOnDutyCount = activeOnDuty,
                TotalScheduledHours = Math.Round(scheduledHours, 1),
                TotalWorkedHours = Math.Round(workedHours, 1),
                TotalGrossLaborSpend = Math.Round(totalSpend, 2),
                TotalShiftsCount = totalShifts,
                CompletedShiftsCount = completedShifts,
                OpenShiftsCount = openShifts,
                FlaggedAttendanceCount = attendances.Count(a => a.IsFlagged),
                SiteBreakdowns = siteBreakdowns,
                AttendanceDistribution = new AttendanceDistributionDto
                {
                    OnTime = onTimeCount,
                    LateArrivals = lateCount,
                    GeofenceViolations = geofenceViolations,
                    NoShows = noShows
                }
            };

            return Ok(ApiResponse<WorkforceAnalyticsDto>.SuccessResponse(dto, "Workforce graphical analytics computed successfully."));
        }

        // =========================================================================
        // 7. STAFF PERFORMANCE RATINGS
        // =========================================================================

        /// <summary>
        /// Submits a supervisor or manager post-shift evaluation rating for a staff member,
        /// automatically recalculating the worker's average rating and punctuality score.
        /// </summary>
        [HttpPost("ratings")]
        public async Task<ActionResult<ApiResponse<Guid>>> SubmitStaffRating([FromBody] SubmitRatingRequest request, CancellationToken ct)
        {
            var shift = await _db.BcpShifts
                .FirstOrDefaultAsync(s => s.Id == request.ShiftId && s.TenantKey == CurrentTenantKey, ct);

            if (shift == null)
            {
                return NotFound(ApiResponse<Guid>.FailureResponse("Shift not found.", errorCode: "ERR-2004"));
            }

            var rating = new BcpShiftStaffRating
            {
                Id = Guid.CreateVersion7(),
                TenantKey = CurrentTenantKey,
                ShiftId = shift.Id,
                UserId = request.UserId,
                RatedByUserId = CurrentUserId,
                RatedByUserName = CurrentUserName,
                RatingStars = Math.Clamp(request.RatingStars, 1, 5),
                PunctualityScore = Math.Clamp(request.PunctualityScore, 1, 5),
                FeedbackNotes = request.FeedbackNotes?.Trim(),
                CreatedUtc = DateTime.UtcNow
            };

            _db.BcpShiftStaffRatings.Add(rating);
            await _db.SaveChangesAsync(ct);

            // Update Staff Profile Aggregates
            var profile = await _db.BcpShiftStaffProfiles
                .FirstOrDefaultAsync(p => p.TenantKey == CurrentTenantKey && p.UserId == request.UserId, ct);

            if (profile != null)
            {
                var allRatings = await _db.BcpShiftStaffRatings
                    .Where(r => r.TenantKey == CurrentTenantKey && r.UserId == request.UserId)
                    .ToListAsync(ct);

                profile.TotalRatingsCount = allRatings.Count;
                profile.AverageRating = Math.Round((decimal)allRatings.Average(r => r.RatingStars), 2);
                profile.PunctualityScorePercent = Math.Round(((decimal)allRatings.Count(r => r.PunctualityScore >= 4) / allRatings.Count) * 100m, 1);
                profile.UpdatedUtc = DateTime.UtcNow;

                await _db.SaveChangesAsync(ct);
            }

            return Ok(ApiResponse<Guid>.SuccessResponse(rating.Id, "Staff rating successfully recorded."));
        }

        /// <summary>
        /// Returns all supervisor ratings and feedback for a specific staff member.
        /// </summary>
        [HttpGet("ratings/{userId}")]
        public async Task<ActionResult<ApiResponse<List<StaffRatingDto>>>> GetStaffRatings(string userId, CancellationToken ct)
        {
            var ratings = await _db.BcpShiftStaffRatings
                .AsNoTracking()
                .Where(r => r.TenantKey == CurrentTenantKey && r.UserId == userId)
                .OrderByDescending(r => r.CreatedUtc)
                .Select(r => new StaffRatingDto
                {
                    Id = r.Id,
                    ShiftId = r.ShiftId,
                    UserId = r.UserId,
                    RatedByUserId = r.RatedByUserId,
                    RatedByUserName = r.RatedByUserName,
                    RatingStars = r.RatingStars,
                    PunctualityScore = r.PunctualityScore,
                    FeedbackNotes = r.FeedbackNotes,
                    CreatedUtc = r.CreatedUtc
                })
                .ToListAsync(ct);

            return Ok(ApiResponse<List<StaffRatingDto>>.SuccessResponse(ratings, "Staff ratings retrieved."));
        }

        // =========================================================================
        // 8. TRI-STATE AVAILABILITY MANAGEMENT
        // =========================================================================

        /// <summary>
        /// Returns availability records for the current user or a targeted worker.
        /// </summary>
        [HttpGet("availability")]
        public async Task<ActionResult<ApiResponse<List<StaffAvailabilityDto>>>> GetAvailability(
            [FromQuery] string? userId,
            [FromQuery] DateTime? fromDate,
            [FromQuery] DateTime? toDate,
            CancellationToken ct)
        {
            var targetUserId = string.IsNullOrWhiteSpace(userId) ? CurrentUserId : userId.Trim();
            var query = _db.BcpShiftAvailabilities
                .AsNoTracking()
                .Where(a => a.TenantKey == CurrentTenantKey && a.UserId == targetUserId);

            if (fromDate.HasValue)
            {
                query = query.Where(a => a.TargetDate >= fromDate.Value.Date);
            }
            if (toDate.HasValue)
            {
                query = query.Where(a => a.TargetDate <= toDate.Value.Date);
            }

            var list = await query
                .OrderBy(a => a.TargetDate)
                .Select(a => new StaffAvailabilityDto
                {
                    Id = a.Id,
                    UserId = a.UserId,
                    TargetDate = a.TargetDate,
                    State = a.State,
                    UnavailableFromTime = a.UnavailableFromTime,
                    UnavailableToTime = a.UnavailableToTime,
                    Reason = a.Reason
                })
                .ToListAsync(ct);

            return Ok(ApiResponse<List<StaffAvailabilityDto>>.SuccessResponse(list, "Availability schedule retrieved."));
        }

        /// <summary>
        /// Creates or updates a tri-state availability entry (Available, Unavailable, PartlyUnavailable) for a specific date.
        /// </summary>
        [HttpPost("availability")]
        public async Task<ActionResult<ApiResponse<Guid>>> UpsertAvailability([FromBody] UpsertAvailabilityRequest request, CancellationToken ct)
        {
            var targetDate = request.TargetDate.Date;
            var record = await _db.BcpShiftAvailabilities
                .FirstOrDefaultAsync(a => a.TenantKey == CurrentTenantKey && a.UserId == CurrentUserId && a.TargetDate == targetDate, ct);

            if (record == null)
            {
                record = new BcpShiftAvailability
                {
                    Id = Guid.CreateVersion7(),
                    TenantKey = CurrentTenantKey,
                    UserId = CurrentUserId,
                    TargetDate = targetDate,
                    CreatedUtc = DateTime.UtcNow
                };
                _db.BcpShiftAvailabilities.Add(record);
            }

            record.State = string.IsNullOrWhiteSpace(request.State) ? "Available" : request.State.Trim();
            record.UnavailableFromTime = request.UnavailableFromTime;
            record.UnavailableToTime = request.UnavailableToTime;
            record.Reason = request.Reason?.Trim();
            record.UpdatedUtc = DateTime.UtcNow;

            await _db.SaveChangesAsync(ct);
            return Ok(ApiResponse<Guid>.SuccessResponse(record.Id, "Availability updated successfully."));
        }

        // =========================================================================
        // 9. COMPLIANCE & DOCUMENT VAULT
        // =========================================================================

        /// <summary>
        /// Returns compliance credentials, licenses, and proof documents uploaded by staff.
        /// </summary>
        [HttpGet("documents")]
        public async Task<ActionResult<ApiResponse<List<StaffDocumentDto>>>> GetDocuments([FromQuery] string? userId, CancellationToken ct)
        {
            var targetUserId = string.IsNullOrWhiteSpace(userId) ? CurrentUserId : userId.Trim();
            var docs = await _db.BcpShiftDocuments
                .AsNoTracking()
                .Where(d => d.TenantKey == CurrentTenantKey && d.UserId == targetUserId)
                .OrderByDescending(d => d.CreatedUtc)
                .Select(d => new StaffDocumentDto
                {
                    Id = d.Id,
                    UserId = d.UserId,
                    DocumentType = d.DocumentType,
                    DocumentName = d.DocumentName,
                    Description = d.Description,
                    FileUrl = d.FileUrl,
                    UploadedBy = d.UploadedBy,
                    ExpiryDateUtc = d.ExpiryDateUtc,
                    IsVerified = d.IsVerified,
                    CreatedUtc = d.CreatedUtc
                })
                .ToListAsync(ct);

            return Ok(ApiResponse<List<StaffDocumentDto>>.SuccessResponse(docs, "Compliance documents retrieved."));
        }

        /// <summary>
        /// Uploads a new staff credential, license scan, right-to-work proof, or baseline headshot.
        /// </summary>
        [HttpPost("documents")]
        public async Task<ActionResult<ApiResponse<Guid>>> UploadDocument([FromBody] UploadDocumentRequest request, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(request.FileUrl) || string.IsNullOrWhiteSpace(request.DocumentName))
            {
                return BadRequest(ApiResponse<Guid>.FailureResponse("Document name and file URL are mandatory.", errorCode: "ERR-2002"));
            }

            var doc = new BcpShiftDocument
            {
                Id = Guid.CreateVersion7(),
                TenantKey = CurrentTenantKey,
                UserId = CurrentUserId,
                DocumentType = string.IsNullOrWhiteSpace(request.DocumentType) ? "General" : request.DocumentType.Trim(),
                DocumentName = request.DocumentName.Trim(),
                Description = request.Description?.Trim(),
                FileUrl = request.FileUrl.Trim(),
                UploadedBy = CurrentUserName,
                ExpiryDateUtc = request.ExpiryDateUtc,
                IsVerified = false,
                CreatedUtc = DateTime.UtcNow
            };

            _db.BcpShiftDocuments.Add(doc);
            await _db.SaveChangesAsync(ct);

            return Ok(ApiResponse<Guid>.SuccessResponse(doc.Id, "Compliance document uploaded successfully."));
        }

        // =========================================================================
        // 10. CUSTOM NOTIFICATION & REMINDER PREFERENCES
        // =========================================================================

        /// <summary>
        /// Returns the staff member's personalized 3-slot shift departure reminder schedule.
        /// </summary>
        [HttpGet("notifications/preferences")]
        public async Task<ActionResult<ApiResponse<StaffNotificationPreferenceDto>>> GetNotificationPreferences(CancellationToken ct)
        {
            var pref = await _db.BcpShiftNotificationPreferences
                .AsNoTracking()
                .FirstOrDefaultAsync(p => p.TenantKey == CurrentTenantKey && p.UserId == CurrentUserId, ct);

            var dto = new StaffNotificationPreferenceDto
            {
                Id = pref?.Id ?? Guid.Empty,
                UserId = CurrentUserId,
                Slot1MinutesBefore = pref?.Slot1MinutesBefore ?? 1440,
                EnableSlot1 = pref?.EnableSlot1 ?? true,
                Slot2MinutesBefore = pref?.Slot2MinutesBefore ?? 240,
                EnableSlot2 = pref?.EnableSlot2 ?? true,
                Slot3MinutesBefore = pref?.Slot3MinutesBefore ?? 30,
                EnableSlot3 = pref?.EnableSlot3 ?? true,
                EnableInApp = pref?.EnableInApp ?? true,
                EnableEmail = pref?.EnableEmail ?? true,
                EnableWhatsApp = pref?.EnableWhatsApp ?? true,
                PreferredContactPhone = pref?.PreferredContactPhone
            };

            return Ok(ApiResponse<StaffNotificationPreferenceDto>.SuccessResponse(dto, "Notification preferences retrieved."));
        }

        /// <summary>
        /// Updates the staff member's custom 3-slot shift reminder schedule and delivery channel toggles.
        /// </summary>
        [HttpPost("notifications/preferences")]
        public async Task<ActionResult<ApiResponse<bool>>> UpdateNotificationPreferences(
            [FromBody] UpdateNotificationPreferenceRequest request,
            CancellationToken ct)
        {
            var pref = await _db.BcpShiftNotificationPreferences
                .FirstOrDefaultAsync(p => p.TenantKey == CurrentTenantKey && p.UserId == CurrentUserId, ct);

            if (pref == null)
            {
                pref = new BcpShiftNotificationPreference
                {
                    Id = Guid.CreateVersion7(),
                    TenantKey = CurrentTenantKey,
                    UserId = CurrentUserId,
                    CreatedUtc = DateTime.UtcNow
                };
                _db.BcpShiftNotificationPreferences.Add(pref);
            }

            pref.Slot1MinutesBefore = Math.Max(1, request.Slot1MinutesBefore);
            pref.EnableSlot1 = request.EnableSlot1;
            pref.Slot2MinutesBefore = Math.Max(1, request.Slot2MinutesBefore);
            pref.EnableSlot2 = request.EnableSlot2;
            pref.Slot3MinutesBefore = Math.Max(1, request.Slot3MinutesBefore);
            pref.EnableSlot3 = request.EnableSlot3;
            pref.EnableInApp = request.EnableInApp;
            pref.EnableEmail = request.EnableEmail;
            pref.EnableWhatsApp = request.EnableWhatsApp;
            pref.PreferredContactPhone = request.PreferredContactPhone?.Trim();
            pref.UpdatedUtc = DateTime.UtcNow;

            await _db.SaveChangesAsync(ct);
            return Ok(ApiResponse<bool>.SuccessResponse(true, "Shift reminder preferences updated successfully."));
        }
    }

    // =========================================================================
    // DTO CONTRACTS
    // =========================================================================

    public class ClientSiteDto
    {
        public Guid Id { get; set; }
        public string SiteCode { get; set; } = string.Empty;
        public string SiteName { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string City { get; set; } = string.Empty;
        public string PostalCode { get; set; } = string.Empty;
        public double? Latitude { get; set; }
        public double? Longitude { get; set; }
        public int GeofenceRadiusMeters { get; set; }
        public string? EmergencyContactName { get; set; }
        public string? EmergencyContactPhone { get; set; }
        public string? SiteAssignmentInstructions { get; set; }
        public string? RequiredSiaLicenceType { get; set; }
        public int ActiveShiftsCount { get; set; }
    }

    public class UpsertClientSiteRequest
    {
        public Guid? Id { get; set; }
        public string SiteCode { get; set; } = string.Empty;
        public string SiteName { get; set; } = string.Empty;
        public string? Address { get; set; }
        public string? City { get; set; }
        public string? PostalCode { get; set; }
        public double? Latitude { get; set; }
        public double? Longitude { get; set; }
        public int GeofenceRadiusMeters { get; set; } = 150;
        public string? EmergencyContactName { get; set; }
        public string? EmergencyContactPhone { get; set; }
        public string? SiteAssignmentInstructions { get; set; }
        public string? RequiredSiaLicenceType { get; set; }
    }

    public class ShiftDto
    {
        public Guid Id { get; set; }
        public string ShiftCode { get; set; } = string.Empty;
        public Guid ClientSiteId { get; set; }
        public string SiteName { get; set; } = string.Empty;
        public string SiteAddress { get; set; } = string.Empty;
        public string PostName { get; set; } = string.Empty;
        public string? FacilityName { get; set; }
        public string? Address { get; set; }
        public string? PostCode { get; set; }
        public string? EventTag { get; set; }
        public string? AssignedUserId { get; set; }
        public string? AssignedUserName { get; set; }
        public DateTime StartsAtUtc { get; set; }
        public DateTime EndsAtUtc { get; set; }
        public bool IsOvernight { get; set; }
        public int BreakMinutes { get; set; }
        public decimal PlannedDurationHours { get; set; }
        public decimal? HourlyPayRate { get; set; }
        public decimal? HourlyChargeRate { get; set; }
        public Guid? RequiredWorkspaceStationId { get; set; }
        public string? RequiredWorkspaceStationName { get; set; }
        public string Status { get; set; } = "Scheduled";
        public bool IsConfirmedByGuard { get; set; }
        public DateTime? ConfirmedAtUtc { get; set; }
        public DateTime? AcceptanceDeadlineUtc { get; set; }
        public int? AcceptanceCountdownMinutes { get; set; }
        public string? Notes { get; set; }
        public string? SiteAssignmentInstructions { get; set; }
        public string? EmergencyContactPhone { get; set; }
        public bool IsClockedIn { get; set; }
        public bool IsClockedOut { get; set; }
    }

    public class CreateShiftRequest
    {
        public Guid ClientSiteId { get; set; }
        public string? AssignedUserId { get; set; }
        public string? AssignedUserName { get; set; }
        public string PostName { get; set; } = "General Post";
        public string? FacilityName { get; set; }
        public string? Address { get; set; }
        public string? PostCode { get; set; }
        public string? EventTag { get; set; }
        public DateTime StartsAtUtc { get; set; }
        public DateTime EndsAtUtc { get; set; }
        public int BreakMinutes { get; set; } = 0;
        public Guid? RequiredWorkspaceStationId { get; set; }
        public string? RequiredWorkspaceStationName { get; set; }
        public decimal? HourlyPayRate { get; set; }
        public decimal? HourlyChargeRate { get; set; }
        public DateTime? AcceptanceDeadlineUtc { get; set; }
        public string? Notes { get; set; }
    }

    public class CreateSwapRequest
    {
        public Guid ShiftId { get; set; }
        public string? OfferedToUserId { get; set; }
        public string? OfferedToUserName { get; set; }
        public Guid? TargetShiftId { get; set; }
        public string? Reason { get; set; }
    }

    public class ReviewSwapRequest
    {
        public bool IsApproved { get; set; }
        public string? RejectionReason { get; set; }
    }

    public class SubmitLeaveRequest
    {
        public string LeaveType { get; set; } = "Annual";
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string? Reason { get; set; }
        public string? AttachmentUrl { get; set; }
    }

    public class EnrollStaffMemberRequest
    {
        public string? UserId { get; set; }
        public string? Email { get; set; }
        public string? FullName { get; set; }
        public string? PhoneNumber { get; set; }
        public string JobTitle { get; set; } = "Staff Member";
        public decimal? DefaultHourlyRate { get; set; }
        public decimal? ContractedWeeklyHours { get; set; }
    }

    public class StaffMemberDto
    {
        public Guid ProfileId { get; set; }
        public string UserId { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? PhoneNumber { get; set; }
        public string JobTitle { get; set; } = "Staff Member";
        public decimal? DefaultHourlyRate { get; set; }
        public decimal? ContractedWeeklyHours { get; set; }
        public decimal AverageRating { get; set; }
        public int TotalRatingsCount { get; set; }
        public int TotalShiftsCompleted { get; set; }
        public decimal PunctualityScorePercent { get; set; }
        public int NoShowCount { get; set; }
        public bool IsActive { get; set; }
        public DateTime EnrolledUtc { get; set; }
    }

    public class WorkforceAnalyticsDto
    {
        public decimal ShiftFulfillmentRatePercent { get; set; }
        public decimal OverallPunctualityPercent { get; set; }
        public int ActiveOnDutyCount { get; set; }
        public decimal TotalScheduledHours { get; set; }
        public decimal TotalWorkedHours { get; set; }
        public decimal TotalGrossLaborSpend { get; set; }
        public int TotalShiftsCount { get; set; }
        public int CompletedShiftsCount { get; set; }
        public int OpenShiftsCount { get; set; }
        public int FlaggedAttendanceCount { get; set; }
        public List<SiteHoursBreakdownDto> SiteBreakdowns { get; set; } = new();
        public AttendanceDistributionDto AttendanceDistribution { get; set; } = new();
    }

    public class SiteHoursBreakdownDto
    {
        public Guid SiteId { get; set; }
        public string SiteName { get; set; } = string.Empty;
        public decimal TotalHours { get; set; }
        public decimal TotalSpend { get; set; }
        public int ShiftCount { get; set; }
    }

    public class AttendanceDistributionDto
    {
        public int OnTime { get; set; }
        public int LateArrivals { get; set; }
        public int GeofenceViolations { get; set; }
        public int NoShows { get; set; }
    }

    public class SubmitRatingRequest
    {
        public Guid ShiftId { get; set; }
        public string UserId { get; set; } = string.Empty;
        public int RatingStars { get; set; } = 5;
        public int PunctualityScore { get; set; } = 5;
        public string? FeedbackNotes { get; set; }
    }

    public class StaffRatingDto
    {
        public Guid Id { get; set; }
        public Guid ShiftId { get; set; }
        public string UserId { get; set; } = string.Empty;
        public string RatedByUserId { get; set; } = string.Empty;
        public string? RatedByUserName { get; set; }
        public int RatingStars { get; set; }
        public int PunctualityScore { get; set; }
        public string? FeedbackNotes { get; set; }
        public DateTime CreatedUtc { get; set; }
    }

    public class UpsertAvailabilityRequest
    {
        public DateTime TargetDate { get; set; }
        public string State { get; set; } = "Available";
        public TimeSpan? UnavailableFromTime { get; set; }
        public TimeSpan? UnavailableToTime { get; set; }
        public string? Reason { get; set; }
    }

    public class StaffAvailabilityDto
    {
        public Guid Id { get; set; }
        public string UserId { get; set; } = string.Empty;
        public DateTime TargetDate { get; set; }
        public string State { get; set; } = "Available";
        public TimeSpan? UnavailableFromTime { get; set; }
        public TimeSpan? UnavailableToTime { get; set; }
        public string? Reason { get; set; }
    }

    public class UploadDocumentRequest
    {
        public string DocumentType { get; set; } = "General";
        public string DocumentName { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string FileUrl { get; set; } = string.Empty;
        public DateTime? ExpiryDateUtc { get; set; }
    }

    public class StaffDocumentDto
    {
        public Guid Id { get; set; }
        public string UserId { get; set; } = string.Empty;
        public string DocumentType { get; set; } = "General";
        public string DocumentName { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string FileUrl { get; set; } = string.Empty;
        public string UploadedBy { get; set; } = "Staff";
        public DateTime? ExpiryDateUtc { get; set; }
        public bool IsVerified { get; set; }
        public DateTime CreatedUtc { get; set; }
    }

    public class UpdateNotificationPreferenceRequest
    {
        public int Slot1MinutesBefore { get; set; } = 1440;
        public bool EnableSlot1 { get; set; } = true;
        public int Slot2MinutesBefore { get; set; } = 240;
        public bool EnableSlot2 { get; set; } = true;
        public int Slot3MinutesBefore { get; set; } = 30;
        public bool EnableSlot3 { get; set; } = true;
        public bool EnableInApp { get; set; } = true;
        public bool EnableEmail { get; set; } = true;
        public bool EnableWhatsApp { get; set; } = true;
        public string? PreferredContactPhone { get; set; }
    }

    public class StaffNotificationPreferenceDto
    {
        public Guid Id { get; set; }
        public string UserId { get; set; } = string.Empty;
        public int Slot1MinutesBefore { get; set; }
        public bool EnableSlot1 { get; set; }
        public int Slot2MinutesBefore { get; set; }
        public bool EnableSlot2 { get; set; }
        public int Slot3MinutesBefore { get; set; }
        public bool EnableSlot3 { get; set; }
        public bool EnableInApp { get; set; }
        public bool EnableEmail { get; set; }
        public bool EnableWhatsApp { get; set; }
        public string? PreferredContactPhone { get; set; }
    }
}

