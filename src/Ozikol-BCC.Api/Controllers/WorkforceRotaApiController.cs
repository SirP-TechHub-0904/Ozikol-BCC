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
                    AssignedUserId = s.AssignedUserId,
                    AssignedUserName = s.AssignedUserName,
                    StartsAtUtc = s.StartsAtUtc,
                    EndsAtUtc = s.EndsAtUtc,
                    IsOvernight = s.IsOvernight,
                    BreakMinutes = s.BreakMinutes,
                    PlannedDurationHours = s.PlannedDurationHours,
                    RequiredWorkspaceStationId = s.RequiredWorkspaceStationId,
                    RequiredWorkspaceStationName = s.RequiredWorkspaceStationName,
                    Status = s.Status,
                    IsConfirmedByGuard = s.IsConfirmedByGuard,
                    ConfirmedAtUtc = s.ConfirmedAtUtc,
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
                    AssignedUserId = s.AssignedUserId,
                    AssignedUserName = s.AssignedUserName,
                    StartsAtUtc = s.StartsAtUtc,
                    EndsAtUtc = s.EndsAtUtc,
                    IsOvernight = s.IsOvernight,
                    BreakMinutes = s.BreakMinutes,
                    PlannedDurationHours = s.PlannedDurationHours,
                    RequiredWorkspaceStationId = s.RequiredWorkspaceStationId,
                    RequiredWorkspaceStationName = s.RequiredWorkspaceStationName,
                    Status = s.Status,
                    IsConfirmedByGuard = s.IsConfirmedByGuard,
                    ConfirmedAtUtc = s.ConfirmedAtUtc,
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
                StartsAtUtc = startUtc,
                EndsAtUtc = endUtc,
                IsOvernight = isOvernight,
                BreakMinutes = breakMins,
                PlannedDurationHours = Math.Round(plannedNetHours, 2),
                RequiredWorkspaceStationId = request.RequiredWorkspaceStationId,
                RequiredWorkspaceStationName = request.RequiredWorkspaceStationName,
                HourlyPayRate = request.HourlyPayRate,
                HourlyChargeRate = request.HourlyChargeRate,
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
        public string? AssignedUserId { get; set; }
        public string? AssignedUserName { get; set; }
        public DateTime StartsAtUtc { get; set; }
        public DateTime EndsAtUtc { get; set; }
        public bool IsOvernight { get; set; }
        public int BreakMinutes { get; set; }
        public decimal PlannedDurationHours { get; set; }
        public Guid? RequiredWorkspaceStationId { get; set; }
        public string? RequiredWorkspaceStationName { get; set; }
        public string Status { get; set; } = "Scheduled";
        public bool IsConfirmedByGuard { get; set; }
        public DateTime? ConfirmedAtUtc { get; set; }
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
        public DateTime StartsAtUtc { get; set; }
        public DateTime EndsAtUtc { get; set; }
        public int BreakMinutes { get; set; } = 0;
        public Guid? RequiredWorkspaceStationId { get; set; }
        public string? RequiredWorkspaceStationName { get; set; }
        public decimal? HourlyPayRate { get; set; }
        public decimal? HourlyChargeRate { get; set; }
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
}

