using System.IO;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Ozikol_BCC.Application.Services.Cloudinary;
using Ozikol_BCC.Application.Services.Cloudflare;
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
using Ozikol.MasterDomain.Models;
using Ozikol.MasterPersistence.EF.MasterSQL;
using Ozikol_BCC.Api.Authorization;
using Ozikol_BCC.Api.Models;
using Ozikol_BCC.Application.Common.Errors;
using Ozikol_BCC.Application.Interfaces.Services;
using Ozikol_BCC.Domain.Models;
using Ozikol_BCC.Infrastructure.TenantSupport;
using Ozikol_BCC.Persistence.EF.SQL;

namespace Ozikol_BCC.Api.Controllers
{
    /// <summary>
    /// Dedicated Member Personal Workspace API controller for Staff Rota, Attendance &amp; Shift Operations.
    /// Strictly serves authenticated staff members / guards for their own personal schedule, timesheets,
    /// duty clock-ins, availability blackouts, compliance vault, and peer shift swaps.
    /// Isolated from Administration Rota Controllers (<see cref="WorkforceRotaApiController"/>).
    /// </summary>
    [ApiController]
    [Route("api/workforce")]
    [Authorize]
    [RequireFeature("bcp-staff-rota", allowReadOnly: true, allowMemberAccess: true)]
    [Tags("3. Workforce Member Personal Workspace")]
    public class WorkforceMemberWorkspaceApiController : ControllerBase
    {
        private readonly DashboardDbContext _db;
        private readonly MasterCatalogDbContext? _master;
        private readonly ICentralNotificationDispatcher? _notificationDispatcher;
        private readonly ITenantProvider? _tenantProvider;
        private readonly ICloudflareR2StorageService? _r2Storage;
        private readonly ICloudinaryService? _cloudinaryService;
        private readonly ILogger<WorkforceMemberWorkspaceApiController>? _logger;

        /// <summary>
        /// Initializes a new instance of the <see cref="WorkforceMemberWorkspaceApiController"/> class.
        /// </summary>
        public WorkforceMemberWorkspaceApiController(
            DashboardDbContext db,
            MasterCatalogDbContext? master = null,
            ICentralNotificationDispatcher? notificationDispatcher = null,
            ITenantProvider? tenantProvider = null,
            ICloudflareR2StorageService? r2Storage = null,
            ICloudinaryService? cloudinaryService = null,
            ILogger<WorkforceMemberWorkspaceApiController>? logger = null)
        {
            _db = db;
            _master = master;
            _notificationDispatcher = notificationDispatcher;
            _tenantProvider = tenantProvider;
            _r2Storage = r2Storage;
            _cloudinaryService = cloudinaryService;
            _logger = logger;
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

        /// <summary>
        /// Resolves the active running currency code and symbol for the current tenant.
        /// </summary>
        private async Task<(string Code, string Symbol)> ResolveTenantCurrencyAsync(CancellationToken ct = default)
        {
            try
            {
                var config = await _db.MisConfigurationSettings.AsNoTracking().FirstOrDefaultAsync(ct);
                if (config != null && !string.IsNullOrWhiteSpace(config.CurrencyCode))
                {
                    var configuredCode = config.CurrencyCode.Trim().ToUpperInvariant();
                    var configuredSymbol = !string.IsNullOrWhiteSpace(config.CurrencySymbol)
                        ? config.CurrencySymbol.Trim()
                        : (configuredCode == "NGN" ? "₦" : "$");
                    return (configuredCode, configuredSymbol);
                }
            }
            catch
            {
                // Fall through to Central Master Catalog resolution if tenant configuration query fails
            }

            if (_master == null) return ("USD", "$");
            try
            {
                var tenantKey = CurrentTenantKey;
                var tenant = await _master.MasterTenantCatalogs.AsNoTracking()
                    .FirstOrDefaultAsync(t => t.TenantKey.ToLower() == tenantKey.ToLower(), ct);

                var currCode = !string.IsNullOrWhiteSpace(tenant?.DefaultCurrencyCode)
                    ? tenant.DefaultCurrencyCode.Trim().ToUpperInvariant()
                    : "USD";

                var rateObj = await _master.MasterCurrencyRates.AsNoTracking()
                    .FirstOrDefaultAsync(r => r.IsActive && r.CurrencyCode.ToUpper() == currCode, ct);

                var symbol = rateObj?.CurrencySymbol ?? (currCode == "NGN" ? "₦" : "$");
                return (currCode, symbol);
            }
            catch
            {
                return ("USD", "$");
            }
        }

        // =========================================================================
        // 1. PERSONAL SHIFT SCHEDULE & ROSTER
        // =========================================================================

        /// <summary>
        /// Returns all upcoming, in-progress, and recent shifts assigned specifically to the logged-in member.
        /// </summary>
        [HttpGet("shifts/my")]
        public async Task<ActionResult<ApiResponse<List<ShiftDto>>>> GetMyShifts(CancellationToken ct)
        {
            var nowUtc = DateTime.UtcNow.AddHours(-12);
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
                    AssignmentMode = s.AssignmentMode,
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
        /// Returns all unassigned open shifts available for claiming by active staff members.
        /// </summary>
        [HttpGet("shifts/open")]
        public async Task<ActionResult<ApiResponse<List<ShiftDto>>>> GetOpenShifts(CancellationToken ct)
        {
            var nowUtc = DateTime.UtcNow;
            var openShifts = await _db.BcpShifts
                .AsNoTracking()
                .Include(s => s.ClientSite)
                .Where(s => s.TenantKey == CurrentTenantKey &&
                            (string.IsNullOrEmpty(s.AssignedUserId) || s.Status == "Open" || s.Status == "Draft") &&
                            s.EndsAtUtc >= nowUtc)
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
                    StartsAtUtc = s.StartsAtUtc,
                    EndsAtUtc = s.EndsAtUtc,
                    IsOvernight = s.IsOvernight,
                    BreakMinutes = s.BreakMinutes,
                    PlannedDurationHours = s.PlannedDurationHours,
                    HourlyPayRate = s.HourlyPayRate,
                    HourlyChargeRate = s.HourlyChargeRate,
                    RequireClaimApproval = s.RequireClaimApproval,
                    Status = "Open",
                    Notes = s.Notes,
                    SiteAssignmentInstructions = s.ClientSite != null ? s.ClientSite.SiteAssignmentInstructions : null
                })
                .ToListAsync(ct);

            return Ok(ApiResponse<List<ShiftDto>>.SuccessResponse(openShifts, "Open shifts retrieved."));
        }

        /// <summary>
        /// Allows the signed-in member to claim an unassigned open shift directly from the rota market.
        /// </summary>
        [HttpPost("shifts/{id:guid}/claim")]
        public async Task<ActionResult<ApiResponse<bool>>> ClaimOpenShiftDirect(Guid id, CancellationToken ct)
        {
            var shift = await _db.BcpShifts
                .FirstOrDefaultAsync(s => s.Id == id && s.TenantKey == CurrentTenantKey, ct);

            if (shift == null)
            {
                return NotFound(ApiResponse<bool>.FailureResponse("Shift not found.", errorCode: "ERR-4004"));
            }

            if (!string.IsNullOrEmpty(shift.AssignedUserId) && shift.AssignedUserId != CurrentUserId)
            {
                return Conflict(ApiResponse<bool>.FailureResponse("This shift has already been claimed by another officer.", errorCode: "ERR-2005"));
            }

            if (shift.RequireClaimApproval)
            {
                shift.AssignedUserId = CurrentUserId;
                shift.AssignedUserName = CurrentUserName;
                shift.Status = "ClaimPending";
                shift.IsConfirmedByGuard = false;
                shift.ConfirmedAtUtc = null;
                shift.UpdatedUtc = DateTime.UtcNow;

                await _db.SaveChangesAsync(ct);

                // Dispatch claim pending notifications
                if (_notificationDispatcher != null)
                {
                    try
                    {
                        var channels = await ResolveStaffNotificationChannelsAsync(CurrentUserId, ct);
                        await _notificationDispatcher.DispatchAsync(new NotificationDispatchPayload
                        {
                            TargetType = NotificationDispatchTarget.SingleUser,
                            TargetUserId = CurrentUserId,
                            TenantKey = CurrentTenantKey,
                            Title = "Shift Claim Submitted",
                            Message = $"Your request to claim open shift {shift.ShiftCode} ({shift.StartsAtUtc:ddd, dd MMM HH:mm} - {shift.EndsAtUtc:HH:mm}) at {shift.PostName} has been submitted for supervisor approval.",
                            Category = BcpMessageCategory.General,
                            Severity = NotificationSeverity.Update,
                            Channels = channels,
                            Module = "Workforce",
                            Icon = "hourglass_top",
                            ActionUrl = "/workforce/workspace/my-shifts"
                        }, ct);

                        var supervisorTarget = !string.IsNullOrWhiteSpace(shift.CreatedByUserId) ? shift.CreatedByUserId : null;
                        await NotifySupervisorsOrAdminsAsync(supervisorTarget, new NotificationDispatchPayload
                        {
                            TenantKey = CurrentTenantKey,
                            Title = "Shift Claim Awaiting Approval",
                            Message = $"Officer {CurrentUserName} requested to claim open shift {shift.ShiftCode} at {shift.PostName} ({shift.StartsAtUtc:ddd, dd MMM HH:mm}). Supervisor review required.",
                            Category = BcpMessageCategory.General,
                            Severity = NotificationSeverity.Update,
                            Channels = NotificationChannels.InApp | NotificationChannels.Push,
                            Module = "Workforce",
                            Icon = "pending_actions",
                            ActionUrl = "/workforce/console/shifts"
                        }, ct);
                    }
                    catch
                    {
                        // Non-blocking notification dispatch
                    }
                }

                return Ok(ApiResponse<bool>.SuccessResponse(true, "Your request to claim this shift has been submitted for supervisor approval."));
            }

            shift.AssignedUserId = CurrentUserId;
            shift.AssignedUserName = CurrentUserName;
            shift.Status = "Assigned";
            shift.IsConfirmedByGuard = true;
            shift.ConfirmedAtUtc = DateTime.UtcNow;
            shift.UpdatedUtc = DateTime.UtcNow;

            await _db.SaveChangesAsync(ct);

            // Dispatch confirmation notifications
            if (_notificationDispatcher != null)
            {
                try
                {
                    var channels = await ResolveStaffNotificationChannelsAsync(CurrentUserId, ct);
                    await _notificationDispatcher.DispatchAsync(new NotificationDispatchPayload
                    {
                        TargetType = NotificationDispatchTarget.SingleUser,
                        TargetUserId = CurrentUserId,
                        TenantKey = CurrentTenantKey,
                        Title = "Shift Claim Confirmed",
                        Message = $"You have successfully claimed shift {shift.ShiftCode} ({shift.StartsAtUtc:ddd, dd MMM HH:mm} - {shift.EndsAtUtc:HH:mm}) at {shift.PostName}. It has been added to your roster.",
                        Category = BcpMessageCategory.General,
                        Severity = NotificationSeverity.Update,
                        Channels = channels,
                        Module = "Workforce",
                        Icon = "check_circle",
                        ActionUrl = "/workforce/my-shifts"
                    }, ct);

                    var supervisorTarget = !string.IsNullOrWhiteSpace(shift.CreatedByUserId) ? shift.CreatedByUserId : null;
                    await NotifySupervisorsOrAdminsAsync(supervisorTarget, new NotificationDispatchPayload
                    {
                        TenantKey = CurrentTenantKey,
                        Title = "Open Shift Claimed",
                        Message = $"Officer {CurrentUserName} has claimed open shift {shift.ShiftCode} at {shift.PostName} ({shift.StartsAtUtc:ddd, dd MMM HH:mm}).",
                        Category = BcpMessageCategory.General,
                        Severity = NotificationSeverity.Update,
                        Channels = NotificationChannels.InApp | NotificationChannels.Push,
                        Module = "Workforce",
                        Icon = "person_check",
                        ActionUrl = "/workforce/console/schedule"
                    }, ct);
                }
                catch
                {
                    // Non-blocking notification dispatch
                }
            }

            return Ok(ApiResponse<bool>.SuccessResponse(true, "Shift claimed successfully. It has been added to your schedule."));
        }

        /// <summary>
        /// Allows a scheduled guard to review and confirm acceptance of their assigned shift.
        /// </summary>
        [HttpPost("shifts/{id:guid}/confirm")]
        public async Task<ActionResult<ApiResponse<bool>>> ConfirmShift(Guid id, CancellationToken ct)
        {
            var shift = await _db.BcpShifts
                .FirstOrDefaultAsync(s => s.Id == id && s.TenantKey == CurrentTenantKey, ct);

            if (shift == null)
            {
                return NotFound(ApiResponse<bool>.FailureResponse("Shift not found.", errorCode: "ERR-2004"));
            }

            if (shift.AssignedUserId != CurrentUserId)
            {
                return Forbid();
            }

            shift.IsConfirmedByGuard = true;
            shift.ConfirmedAtUtc = DateTime.UtcNow;
            if (shift.Status == "Draft" || shift.Status == "Scheduled")
            {
                shift.Status = "Confirmed";
            }

            await _db.SaveChangesAsync(ct);

            // Notify scheduler that officer confirmed duty readiness
            if (_notificationDispatcher != null)
            {
                try
                {
                    var supervisorTarget = !string.IsNullOrWhiteSpace(shift.CreatedByUserId) ? shift.CreatedByUserId : null;
                    await NotifySupervisorsOrAdminsAsync(supervisorTarget, new NotificationDispatchPayload
                    {
                        TenantKey = CurrentTenantKey,
                        Title = "Duty Confirmed by Officer",
                        Message = $"Officer {CurrentUserName} has confirmed duty for shift {shift.ShiftCode} at {shift.PostName} ({shift.StartsAtUtc:ddd, dd MMM HH:mm}).",
                        Category = BcpMessageCategory.General,
                        Severity = NotificationSeverity.Update,
                        Channels = NotificationChannels.InApp | NotificationChannels.Push,
                        Module = "Workforce",
                        Icon = "verified",
                        ActionUrl = "/workforce/console/schedule"
                    }, ct);
                }
                catch
                {
                    // Non-blocking notification dispatch
                }
            }

            return Ok(ApiResponse<bool>.SuccessResponse(true, "Shift confirmed successfully."));
        }

        /// <summary>
        /// Allows an assigned staff member to decline an offered shift that they have not yet accepted.
        /// Mandatory duties cannot be declined (staff must request a swap or excuse instead).
        /// The shift returns to the Open pool and the scheduling administrator is notified.
        /// </summary>
        [HttpPost("shifts/{id:guid}/decline")]
        public async Task<ActionResult<ApiResponse<bool>>> DeclineShiftOffer(Guid id, CancellationToken ct)
        {
            var shift = await _db.BcpShifts
                .FirstOrDefaultAsync(s => s.Id == id && s.TenantKey == CurrentTenantKey, ct);

            if (shift == null)
            {
                return NotFound(ApiResponse<bool>.FailureResponse("Shift not found.", errorCode: "ERR-2004"));
            }

            if (shift.AssignedUserId != CurrentUserId)
            {
                return Forbid();
            }

            if (shift.AssignmentMode == "Mandatory")
            {
                return BadRequest(ApiResponse<bool>.FailureResponse("This is a mandatory duty and cannot be declined. Please request a shift swap or submit an excuse for approval."));
            }

            if (shift.IsConfirmedByGuard || shift.Status is "InProgress" or "Completed")
            {
                return BadRequest(ApiResponse<bool>.FailureResponse("This shift has already been accepted. Please request a swap or excuse instead."));
            }

            shift.AssignedUserId = null;
            shift.AssignedUserName = null;
            shift.Status = "Open";
            shift.AcceptanceDeadlineUtc = null;
            shift.UpdatedUtc = DateTime.UtcNow;
            await _db.SaveChangesAsync(ct);

            if (_notificationDispatcher != null)
            {
                try
                {
                    var supervisorTarget = !string.IsNullOrWhiteSpace(shift.CreatedByUserId) ? shift.CreatedByUserId : null;
                    await NotifySupervisorsOrAdminsAsync(supervisorTarget, new NotificationDispatchPayload
                    {
                        TenantKey = CurrentTenantKey,
                        Title = $"Shift Offer Declined ({shift.ShiftCode})",
                        Message = $"{CurrentUserName} declined shift {shift.ShiftCode} at {shift.PostName} ({shift.StartsAtUtc:ddd, dd MMM HH:mm}). It is open again.",
                        Category = BcpMessageCategory.General,
                        Severity = NotificationSeverity.Update,
                        Channels = NotificationChannels.InApp | NotificationChannels.Push,
                        Module = "Workforce",
                        Icon = "person_off",
                        ActionUrl = "/workforce/console/shifts"
                    }, ct);
                }
                catch
                {
                    // Non-blocking notification dispatch
                }
            }

            return Ok(ApiResponse<bool>.SuccessResponse(true, "Shift declined and returned to the open pool."));
        }

        /// <summary>
        /// Returns past duty history and attendance records for the current staff member's timesheet calculations.
        /// </summary>
        [HttpGet("shifts/timesheets")]
        public async Task<ActionResult<ApiResponse<List<ShiftDto>>>> GetMyTimesheets(
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate,
            CancellationToken ct)
        {
            var query = _db.BcpShifts
                .AsNoTracking()
                .Include(s => s.ClientSite)
                .Include(s => s.AttendanceRecord)
                .Where(s => s.TenantKey == CurrentTenantKey && s.AssignedUserId == CurrentUserId);

            if (startDate.HasValue)
                query = query.Where(s => s.StartsAtUtc >= startDate.Value.ToUniversalTime());
            if (endDate.HasValue)
                query = query.Where(s => s.EndsAtUtc <= endDate.Value.ToUniversalTime());

            var history = await query
                .OrderByDescending(s => s.StartsAtUtc)
                .Select(s => new ShiftDto
                {
                    Id = s.Id,
                    ShiftCode = s.ShiftCode,
                    ClientSiteId = s.ClientSiteId,
                    SiteName = s.ClientSite != null ? s.ClientSite.SiteName : "Site",
                    SiteAddress = s.ClientSite != null ? s.ClientSite.Address : string.Empty,
                    PostName = s.PostName,
                    FacilityName = s.FacilityName,
                    StartsAtUtc = s.StartsAtUtc,
                    EndsAtUtc = s.EndsAtUtc,
                    PlannedDurationHours = s.PlannedDurationHours,
                    BreakMinutes = s.BreakMinutes,
                    HourlyPayRate = s.HourlyPayRate,
                    Status = s.Status,
                    IsConfirmedByGuard = s.IsConfirmedByGuard,
                    AssignmentMode = s.AssignmentMode,
                    IsClockedIn = s.AttendanceRecord != null && s.AttendanceRecord.ClockInUtc.HasValue,
                    IsClockedOut = s.AttendanceRecord != null && s.AttendanceRecord.ClockOutUtc.HasValue,
                    ClockInUtc = s.AttendanceRecord != null ? s.AttendanceRecord.ClockInUtc : null,
                    ClockOutUtc = s.AttendanceRecord != null ? s.AttendanceRecord.ClockOutUtc : null,
                    ActualDurationHours = s.AttendanceRecord != null && s.AttendanceRecord.ClockInUtc.HasValue && s.AttendanceRecord.ClockOutUtc.HasValue
                        ? (decimal)Math.Round((s.AttendanceRecord.ClockOutUtc.Value - s.AttendanceRecord.ClockInUtc.Value).TotalHours, 2)
                        : s.PlannedDurationHours,
                    FineAttached = s.FineAttached,
                    FineAmount = s.FineAmount,
                    FineReason = s.FineReason,
                    FineAuthorizedBy = s.FineAuthorizedBy,
                    FineStatus = s.FineStatus,
                    ReportSubmissionUtc = s.ReportSubmissionUtc,
                    ReportContent = s.ReportContent
                })
                .ToListAsync(ct);

            return Ok(ApiResponse<List<ShiftDto>>.SuccessResponse(history, "Timesheets retrieved."));
        }

        // =========================================================================
        // 2. PEER SHIFT SWAPS
        // =========================================================================

        /// <summary>
        /// Initiates a peer shift swap request by offering an assigned shift to team colleagues.
        /// </summary>
        [HttpPost("swaps")]
        public async Task<ActionResult<ApiResponse<Guid>>> RequestShiftSwap([FromBody] CreateSwapRequest request, CancellationToken ct)
        {
            var shift = await _db.BcpShifts
                .FirstOrDefaultAsync(s => s.Id == request.ShiftId && s.TenantKey == CurrentTenantKey, ct);

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
            shift.Status = "SwapOffered";

            await _db.SaveChangesAsync(ct);

            // Dispatch notification to colleague or team
            if (_notificationDispatcher != null)
            {
                try
                {
                    if (!string.IsNullOrWhiteSpace(request.OfferedToUserId))
                    {
                        var channels = await ResolveStaffNotificationChannelsAsync(request.OfferedToUserId, ct);
                        await _notificationDispatcher.DispatchAsync(new NotificationDispatchPayload
                        {
                            TargetType = NotificationDispatchTarget.SingleUser,
                            TargetUserId = request.OfferedToUserId,
                            TenantKey = CurrentTenantKey,
                            Title = "Peer Shift Swap Offered",
                            Message = $"Officer {CurrentUserName} has offered to swap shift {shift.ShiftCode} ({shift.StartsAtUtc:ddd, dd MMM HH:mm}) with you. Reason: {request.Reason}",
                            Category = BcpMessageCategory.General,
                            Severity = NotificationSeverity.Update,
                            Channels = channels,
                            Module = "Workforce",
                            Icon = "swap_horiz",
                            ActionUrl = "/workforce/my-shifts"
                        }, ct);
                    }
                    else
                    {
                        await _notificationDispatcher.DispatchAsync(new NotificationDispatchPayload
                        {
                            TargetType = NotificationDispatchTarget.BroadcastAll,
                            TenantKey = CurrentTenantKey,
                            Title = "Available Shift Swap",
                            Message = $"A shift swap is available for shift {shift.ShiftCode} at {shift.PostName} ({shift.StartsAtUtc:ddd, dd MMM HH:mm}). Tap to review and claim.",
                            Category = BcpMessageCategory.General,
                            Severity = NotificationSeverity.Update,
                            Channels = NotificationChannels.InApp,
                            Module = "Workforce",
                            Icon = "swap_horiz",
                            ActionUrl = "/workforce/my-shifts"
                        }, ct);
                    }
                }
                catch
                {
                    // Non-blocking notification dispatch
                }
            }

            return Ok(ApiResponse<Guid>.SuccessResponse(swap.Id, "Shift swap request broadcasted."));
        }

        /// <summary>
        /// Allows a colleague to accept or claim an offered shift swap pending supervisor approval.
        /// </summary>
        [HttpPost("swaps/{id:guid}/claim")]
        public async Task<ActionResult<ApiResponse<bool>>> ClaimShiftSwap(Guid id, CancellationToken ct)
        {
            var swap = await _db.BcpShiftSwapRequests
                .Include(s => s.Shift)
                .FirstOrDefaultAsync(s => s.Id == id && s.TenantKey == CurrentTenantKey && (s.Status == "PendingPeer" || s.Status == "Offered"), ct);

            if (swap == null)
            {
                return NotFound(ApiResponse<bool>.FailureResponse("Swap request not found or no longer available.", errorCode: "ERR-2004"));
            }

            swap.OfferedToUserId = CurrentUserId;
            swap.OfferedToUserName = CurrentUserName;
            swap.Status = "PendingSupervisor";

            await _db.SaveChangesAsync(ct);

            // Notify original requester and supervisor
            if (_notificationDispatcher != null)
            {
                try
                {
                    var requesterChannels = await ResolveStaffNotificationChannelsAsync(swap.RequestingUserId, ct);
                    await _notificationDispatcher.DispatchAsync(new NotificationDispatchPayload
                    {
                        TargetType = NotificationDispatchTarget.SingleUser,
                        TargetUserId = swap.RequestingUserId,
                        TenantKey = CurrentTenantKey,
                        Title = "Shift Swap Accepted by Colleague",
                        Message = $"Officer {CurrentUserName} has accepted your shift swap offer for shift {swap.Shift?.ShiftCode ?? "assignment"}. It is now awaiting supervisor review.",
                        Category = BcpMessageCategory.General,
                        Severity = NotificationSeverity.Update,
                        Channels = requesterChannels,
                        Module = "Workforce",
                        Icon = "swap_horiz",
                        ActionUrl = "/workforce/my-shifts"
                    }, ct);

                    await _notificationDispatcher.DispatchAsync(new NotificationDispatchPayload
                    {
                        TargetType = NotificationDispatchTarget.BroadcastAll,
                        TenantKey = CurrentTenantKey,
                        Title = "Shift Swap Awaiting Review",
                        Message = $"Officers {swap.RequestingUserName} and {CurrentUserName} have agreed on a shift swap for {swap.Shift?.ShiftCode ?? "duty"} and are awaiting administrative approval.",
                        Category = BcpMessageCategory.General,
                        Severity = NotificationSeverity.Update,
                        Channels = NotificationChannels.InApp | NotificationChannels.Push,
                        Module = "Workforce",
                        Icon = "supervisor_account",
                        ActionUrl = "/workforce/console/schedule"
                    }, ct);
                }
                catch
                {
                    // Non-blocking notification dispatch
                }
            }

            return Ok(ApiResponse<bool>.SuccessResponse(true, "Swap claimed and submitted for administrative approval."));
        }

        /// <summary>
        /// Allows a staff member to withdraw/cancel their offered shift swap before supervisor sign-off.
        /// </summary>
        [HttpPost("swaps/{id:guid}/cancel")]
        [HttpDelete("swaps/{id:guid}")]
        public async Task<ActionResult<ApiResponse<bool>>> CancelShiftSwap(Guid id, CancellationToken ct)
        {
            var swap = await _db.BcpShiftSwapRequests
                .Include(s => s.Shift)
                .FirstOrDefaultAsync(s => s.Id == id && s.TenantKey == CurrentTenantKey, ct);

            if (swap == null)
            {
                return NotFound(ApiResponse<bool>.FailureResponse("Swap request not found.", errorCode: "ERR-2004"));
            }

            if (swap.RequestingUserId != CurrentUserId)
            {
                return Forbid();
            }

            if (swap.Status == "Approved")
            {
                return BadRequest(ApiResponse<bool>.FailureResponse("Cannot cancel a shift swap that has already been approved.", errorCode: "ERR-2002"));
            }

            swap.Status = "Cancelled";
            if (swap.Shift != null && swap.Shift.Status == "SwapOffered")
            {
                swap.Shift.Status = "Assigned";
            }

            await _db.SaveChangesAsync(ct);
            return Ok(ApiResponse<bool>.SuccessResponse(true, "Shift swap offer withdrawn successfully."));
        }

        // =========================================================================
        // 3. TIME-OFF & LEAVE REQUESTS
        // =========================================================================

        /// <summary>
        /// Returns all time-off and absence requests submitted by the logged-in staff member.
        /// </summary>
        [HttpGet("leave/my")]
        public async Task<ActionResult<ApiResponse<List<BcpShiftLeaveRequest>>>> GetMyLeaveRequests(CancellationToken ct)
        {
            var requests = await _db.BcpShiftLeaveRequests
                .AsNoTracking()
                .Where(l => l.TenantKey == CurrentTenantKey && l.UserId == CurrentUserId)
                .OrderByDescending(l => l.CreatedUtc)
                .ToListAsync(ct);

            return Ok(ApiResponse<List<BcpShiftLeaveRequest>>.SuccessResponse(requests, "Staff leave records retrieved."));
        }

        /// <summary>
        /// Submits a staff leave request to black out unavailability from the scheduling calendar.
        /// </summary>
        [HttpPost("leave")]
        public async Task<ActionResult<ApiResponse<Guid>>> SubmitLeaveRequest([FromBody] SubmitLeaveRequest request, CancellationToken ct)
        {
            if (request.StartDate > request.EndDate)
            {
                return BadRequest(ApiResponse<Guid>.FailureResponse("End date must be greater than or equal to start date.", errorCode: "ERR-2001"));
            }

            var days = (decimal)Math.Max(1, (request.EndDate.Date - request.StartDate.Date).TotalDays + 1);

            var leave = new BcpShiftLeaveRequest
            {
                Id = Guid.CreateVersion7(),
                TenantKey = CurrentTenantKey,
                UserId = CurrentUserId,
                UserName = CurrentUserName,
                LeaveType = string.IsNullOrWhiteSpace(request.LeaveType) ? "Annual" : request.LeaveType.Trim(),
                StartDate = request.StartDate.Date,
                EndDate = request.EndDate.Date,
                TotalDays = days,
                Reason = request.Reason?.Trim(),
                Status = "Pending",
                CreatedUtc = DateTime.UtcNow
            };

            _db.BcpShiftLeaveRequests.Add(leave);
            await _db.SaveChangesAsync(ct);

            // Notify supervisor / management of new time-off request
            if (_notificationDispatcher != null)
            {
                try
                {
                    await _notificationDispatcher.DispatchAsync(new NotificationDispatchPayload
                    {
                        TargetType = NotificationDispatchTarget.BroadcastAll,
                        TenantKey = CurrentTenantKey,
                        Title = "New Time-Off Request",
                        Message = $"Officer {CurrentUserName} requested {leave.LeaveType} leave ({leave.StartDate:dd MMM yyyy} - {leave.EndDate:dd MMM yyyy}). Reason: {leave.Reason ?? "Not specified"}",
                        Category = BcpMessageCategory.General,
                        Severity = NotificationSeverity.Update,
                        Channels = NotificationChannels.InApp | NotificationChannels.Push,
                        Module = "Workforce",
                        Icon = "event_busy",
                        ActionUrl = "/workforce/console/schedule"
                    }, ct);
                }
                catch
                {
                    // Non-blocking notification dispatch
                }
            }

            return Ok(ApiResponse<Guid>.SuccessResponse(leave.Id, "Leave request submitted for review."));
        }

        // =========================================================================
        // 4. WORKER AVAILABILITY
        // =========================================================================

        /// <summary>
        /// Returns availability records for the current user.
        /// </summary>
        [HttpGet("availability")]
        public async Task<ActionResult<ApiResponse<List<StaffAvailabilityDto>>>> GetAvailability(
            [FromQuery] DateTime? fromDate,
            [FromQuery] DateTime? toDate,
            CancellationToken ct)
        {
            var query = _db.BcpShiftAvailabilities
                .AsNoTracking()
                .Where(a => a.TenantKey == CurrentTenantKey && a.UserId == CurrentUserId);

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
        /// Creates or updates an availability entry for a specific date.
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
        // 5. COMPLIANCE & DOCUMENT VAULT
        // =========================================================================

        /// <summary>
        /// Returns compliance credentials and licenses uploaded by the current staff member.
        /// </summary>
        [HttpGet("documents")]
        public async Task<ActionResult<ApiResponse<List<StaffDocumentDto>>>> GetDocuments(CancellationToken ct)
        {
            var docs = await _db.BcpShiftDocuments
                .AsNoTracking()
                .Where(d => d.TenantKey == CurrentTenantKey && d.UserId == CurrentUserId)
                .OrderByDescending(d => d.CreatedUtc)
                .Select(d => new StaffDocumentDto
                {
                    Id = d.Id,
                    UserId = d.UserId,
                    DocumentType = d.DocumentType,
                    DocumentName = d.DocumentName,
                    Description = d.Description,
                    ReferenceNumber = d.ReferenceNumber,
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
                ReferenceNumber = request.ReferenceNumber?.Trim(),
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

        /// <summary>
        /// Uploads a staff member compliance credential file (SIA license, passport, certificate, right-to-work scan)
        /// directly to Cloudinary.
        /// </summary>
        [HttpPost("documents/upload-media")]
        [Consumes("multipart/form-data")]
        public async Task<IActionResult> UploadComplianceMedia(
            [FromForm] IFormFile file,
            [FromForm] string? folder = "bcp-compliance-vault",
            CancellationToken ct = default)
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest(ApiResponse<object>.FailureResponse("No file was uploaded.", errorCode: "ERR-2001"));
            }

            var folderTarget = string.IsNullOrWhiteSpace(folder) ? "bcp-compliance-vault" : folder.Trim();

            // Validate file extension for safe compliance documents
            var rawExt = Path.GetExtension(file.FileName);
            var normalizedExt = rawExt?.TrimStart('.').ToUpperInvariant();
            var permittedExts = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                "PNG", "JPG", "JPEG", "WEBP", "GIF", "SVG", "HEIC",
                "PDF", "DOC", "DOCX", "ODT", "RTF", "TXT"
            };

            if (string.IsNullOrWhiteSpace(normalizedExt) || !permittedExts.Contains(normalizedExt))
            {
                return BadRequest(ApiResponse<object>.FailureResponse(
                    $"File format '{rawExt}' is not permitted for compliance credentials. Supported formats: images (JPG, PNG, WEBP, HEIC) and documents (PDF, DOC, DOCX).",
                    errorCode: "ERR-2002"));
            }

            // Reject disguised executable/script payloads
            var lowerFileName = file.FileName.ToLowerInvariant();
            if (lowerFileName.Contains('\0') ||
                lowerFileName.EndsWith(".exe") ||
                lowerFileName.Contains(".php.") ||
                lowerFileName.Contains(".asp.") ||
                lowerFileName.Contains(".aspx.") ||
                lowerFileName.Contains(".jsp.") ||
                lowerFileName.Contains(".sh.") ||
                lowerFileName.Contains(".bat."))
            {
                return BadRequest(ApiResponse<object>.FailureResponse("File name contains suspicious patterns and cannot be uploaded.", errorCode: "ERR-2003"));
            }

            folderTarget = !string.IsNullOrWhiteSpace(folder) ? folder.Trim() : $"tenants/{CurrentTenantKey}/compliance-documents";

            // 1. Primary Cloud Storage: Cloudflare R2 Global Edge CDN
            if (_r2Storage != null)
            {
                try
                {
                    await using var stream = file.OpenReadStream();
                    var contentType = string.IsNullOrWhiteSpace(file.ContentType) ? "application/octet-stream" : file.ContentType;
                    var r2Result = await _r2Storage.UploadAssetAsync(stream, file.FileName, contentType, folderTarget);
                    if (r2Result.Success && !string.IsNullOrWhiteSpace(r2Result.Url))
                    {
                        return Ok(ApiResponse<object>.SuccessResponse(new
                        {
                            url = r2Result.Url,
                            key = r2Result.Key ?? r2Result.SafeFileName ?? file.FileName,
                            fileName = file.FileName,
                            fileSize = file.Length,
                            contentType = file.ContentType
                        }, "Compliance document uploaded successfully to Cloudflare CDN."));
                    }
                }
                catch (Exception r2Ex)
                {
                    _logger?.LogWarning(r2Ex, "[Workforce] Cloudflare R2 upload attempt encountered an issue: {Message}. Trying secondary cloud provider.", r2Ex.Message);
                }
            }

            // 2. Secondary Cloud Storage: Cloudinary
            if (_cloudinaryService != null)
            {
                try
                {
                    string? customCloud = null;
                    string? customKey = null;
                    string? customSecret = null;
                    var config = await _db.MisConfigurationSettings.AsNoTracking().FirstOrDefaultAsync(ct);
                    if (config?.UseCustomStorage == true &&
                        !string.IsNullOrWhiteSpace(config.CustomCloudinaryCloudName) &&
                        !string.IsNullOrWhiteSpace(config.CustomCloudinaryApiKey) &&
                        !string.IsNullOrWhiteSpace(config.CustomCloudinaryApiSecret))
                    {
                        customCloud = config.CustomCloudinaryCloudName;
                        customKey = config.CustomCloudinaryApiKey;
                        customSecret = config.CustomCloudinaryApiSecret;
                    }

                    var isImage = new[] { "PNG", "JPG", "JPEG", "WEBP", "GIF", "SVG", "HEIC" }.Contains(normalizedExt);
                    if (isImage)
                    {
                        var uploadResult = await _cloudinaryService.UploadImageWithPublicIdAsync(file, folderTarget, customCloud, customKey, customSecret);
                        if (!string.IsNullOrWhiteSpace(uploadResult.Url))
                        {
                            return Ok(ApiResponse<object>.SuccessResponse(new
                            {
                                url = uploadResult.Url,
                                key = uploadResult.PublicId,
                                fileName = file.FileName,
                                fileSize = file.Length,
                                contentType = file.ContentType
                            }, "Compliance document uploaded successfully."));
                        }
                    }
                    else
                    {
                        var uploadResult = await _cloudinaryService.UploadRawDocumentWithPublicIdAsync(file, folderTarget, customCloud, customKey, customSecret);
                        if (!string.IsNullOrWhiteSpace(uploadResult.Url))
                        {
                            return Ok(ApiResponse<object>.SuccessResponse(new
                            {
                                url = uploadResult.Url,
                                key = uploadResult.PublicId,
                                fileName = file.FileName,
                                fileSize = file.Length,
                                contentType = file.ContentType
                            }, "Compliance document uploaded successfully."));
                        }
                    }
                }
                catch (Exception cloudEx)
                {
                    _logger?.LogWarning(cloudEx, "[Workforce] Cloudinary storage attempt encountered an issue: {Message}", cloudEx.Message);
                }
            }

            // Zero local disk storage fallback - strictly return error if cloud CDN is unavailable
            _logger?.LogError("[Workforce] All cloud storage options (Cloudflare R2 CDN and Cloudinary) are unavailable for file {FileName}.", file.FileName);
            return StatusCode(500, ApiResponse<object>.FailureResponse("Cloud storage service is currently unavailable. Please verify Cloudflare CDN credentials and try again.", errorCode: "ERR-STORAGE-UNAVAILABLE"));
        }

        // =========================================================================
        // 6. SHIFT REMINDERS & NOTIFICATION PREFERENCES
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
            return Ok(ApiResponse<bool>.SuccessResponse(true, "Notification preferences updated."));
        }

        // =========================================================================
        // 7. RUNNING CURRENCY RESOLUTION
        // =========================================================================

        /// <summary>
        /// Retrieves the active tenant running currency code and symbol configured in the Central Master Catalog.
        /// </summary>
        [HttpGet("currency")]
        public async Task<ActionResult<ApiResponse<object>>> GetTenantCurrency(CancellationToken ct)
        {
            var (code, symbol) = await ResolveTenantCurrencyAsync(ct);
            return Ok(ApiResponse<object>.SuccessResponse(new { currencyCode = code, currencySymbol = symbol }, "Tenant currency resolved successfully."));
        }

        // =========================================================================
        // 8. DUTY ATTENDANCE (CLOCK-IN, CLOCK-OUT, WELFARE CHECK)
        // =========================================================================

        /// <summary>
        /// Records a guard's live Clock-In, calculating Haversine distance against the client site's geofence radius.
        /// </summary>
        [HttpPost("attendance/clock-in")]
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
            shift.IsConfirmedByGuard = true;
            shift.UpdatedUtc = nowUtc;

            await _db.SaveChangesAsync(ct);

            // Dispatch alert to supervisor if arrival is late or outside geofence boundary
            if (isFlagged && _notificationDispatcher != null)
            {
                try
                {
                    var supervisorTarget = !string.IsNullOrWhiteSpace(shift.CreatedByUserId) ? shift.CreatedByUserId : null;
                    await NotifySupervisorsOrAdminsAsync(supervisorTarget, new NotificationDispatchPayload
                    {
                        TenantKey = CurrentTenantKey,
                        Title = "⚠️ Duty Clock-In Alert: " + (isLate && !isInsideGeofence ? "Out of Geofence & Late" : !isInsideGeofence ? "Out of Geofence" : "Late Arrival"),
                        Message = $"Officer {CurrentUserName} clocked in for shift {shift.ShiftCode} at {shift.PostName} with alert: {flagReason}",
                        Category = BcpMessageCategory.General,
                        Severity = NotificationSeverity.Error,
                        Channels = NotificationChannels.InApp | NotificationChannels.Push | NotificationChannels.Email,
                        Module = "Workforce",
                        Icon = "warning",
                        ActionUrl = "/workforce/console/live"
                    }, ct);
                }
                catch
                {
                    // Non-blocking notification dispatch
                }
            }

            return Ok(ApiResponse<ClockInResultDto>.SuccessResponse(new ClockInResultDto
            {
                AttendanceId = attendance.Id,
                ClockInUtc = nowUtc,
                IsGeofenceVerified = isInsideGeofence,
                DistanceFromSiteMeters = Math.Round(distanceMeters, 1),
                IsFlagged = isFlagged,
                FlagReason = flagReason,
                RequiredStationUnlocked = true,
                BiometricVerified = request.BiometricVerified,
                PhotoUrl = request.PhotoUrl
            }, isFlagged ? $"Clock-In recorded with alert: {flagReason}" : "Clock-In successfully verified inside venue geofence."));
        }

        /// <summary>
        /// Records a guard's live Clock-Out, calculating final duty hours, billable time, and overtime duration.
        /// </summary>
        [HttpPost("attendance/clock-out")]
        public async Task<ActionResult<ApiResponse<ClockOutResultDto>>> ClockOut([FromBody] ClockOutRequest request, CancellationToken ct)
        {
            var shift = await _db.BcpShifts
                .Include(s => s.AttendanceRecord)
                .Include(s => s.ClientSite)
                .FirstOrDefaultAsync(s => s.Id == request.ShiftId && s.TenantKey == CurrentTenantKey, ct);

            if (shift == null || shift.AttendanceRecord == null || !shift.AttendanceRecord.ClockInUtc.HasValue)
            {
                return BadRequest(ApiResponse<ClockOutResultDto>.FailureResponse("Active clock-in session not found for this shift.", errorCode: "ERR-2004"));
            }

            var nowUtc = DateTime.UtcNow;
            var att = shift.AttendanceRecord;
            att.ClockOutUtc = nowUtc;
            att.ClockOutLatitude = request.Latitude;
            att.ClockOutLongitude = request.Longitude;
            att.ClockOutAccuracyMeters = request.AccuracyMeters;
            att.ClockOutMethod = string.IsNullOrWhiteSpace(request.Method) ? "MobileGps" : request.Method;
            att.ClockOutPhotoUrl = request.PhotoUrl;

            var actualTotalHours = (decimal)(nowUtc - att.ClockInUtc.Value).TotalHours;
            var netBillableHours = Math.Max(0, actualTotalHours - (shift.BreakMinutes / 60.0m));
            var overtimeHours = Math.Max(0, netBillableHours - shift.PlannedDurationHours);

            att.ActualDurationHours = Math.Round(actualTotalHours, 2);
            att.BillableHours = Math.Round(netBillableHours, 2);
            att.OvertimeHours = Math.Round(overtimeHours, 2);
            att.SupervisorApproved = false;
            att.UpdatedUtc = nowUtc;

            shift.Status = "Completed";
            shift.UpdatedUtc = nowUtc;

            await _db.SaveChangesAsync(ct);

            return Ok(ApiResponse<ClockOutResultDto>.SuccessResponse(new ClockOutResultDto
            {
                AttendanceId = att.Id,
                ClockOutUtc = nowUtc,
                TotalDurationHours = Math.Round(actualTotalHours, 2),
                BillableHours = Math.Round(netBillableHours, 2),
                OvertimeHours = Math.Round(overtimeHours, 2)
            }, "Duty concluded. Clock-out logged successfully."));
        }

        /// <summary>
        /// Records a mandatory welfare or lone-worker periodic check-in ping from an active post.
        /// </summary>
        [HttpPost("attendance/welfare-check")]
        public async Task<ActionResult<ApiResponse<bool>>> LogWelfareCheck([FromBody] WelfareCheckRequest request, CancellationToken ct)
        {
            var shift = await _db.BcpShifts
                .Include(s => s.AttendanceRecord)
                .FirstOrDefaultAsync(s => s.Id == request.ShiftId && s.TenantKey == CurrentTenantKey, ct);

            if (shift == null || shift.AttendanceRecord == null)
            {
                return NotFound(ApiResponse<bool>.FailureResponse("Active duty attendance session not found.", errorCode: "ERR-2004"));
            }

            shift.AttendanceRecord.LastWelfareCheckAtUtc = DateTime.UtcNow;
            shift.AttendanceRecord.WelfareChecksCompletedCount += 1;
            shift.AttendanceRecord.UpdatedUtc = DateTime.UtcNow;

            await _db.SaveChangesAsync(ct);
            return Ok(ApiResponse<bool>.SuccessResponse(true, "Welfare ping acknowledged. Lone-worker safety verified."));
        }

        // =========================================================================
        // 14. EMERGENCY SOS PROTOCOLS & SHIFT DUTY REPORTS
        // =========================================================================

        /// <summary>
        /// Retrieves the active emergency and security incident categories configured for this tenant organization.
        /// Returns dynamic categories configured by the business in shift settings, or platform baseline categories if not customized.
        /// </summary>
        /// <param name="ct">Cancellation token.</param>
        /// <returns>List of emergency incident category definitions.</returns>
        [HttpGet("emergency/categories")]
        public async Task<ActionResult<ApiResponse<object>>> GetEmergencyCategories(CancellationToken ct)
        {
            string? json = null;
            try
            {
                var policy = await _db.BcpWorkforcePolicySettings
                    .AsNoTracking()
                    .FirstOrDefaultAsync(p => p.TenantKey == CurrentTenantKey, ct);

                json = policy?.EmergencyCategoriesJson;
            }
            catch (Exception ex)
            {
                _logger?.LogWarning(ex, "Could not read EmergencyCategoriesJson from database (pending migration). Using defaults.");
            }

            if (string.IsNullOrWhiteSpace(json))
            {
                json = WorkforceRotaApiController.GetDefaultEmergencyCategoriesJson();
            }

            try
            {
                var parsed = System.Text.Json.JsonSerializer.Deserialize<object>(json);
                return Ok(ApiResponse<object>.SuccessResponse(parsed, "Emergency categories retrieved successfully."));
            }
            catch
            {
                return Ok(ApiResponse<string>.SuccessResponse(json, "Emergency categories retrieved successfully."));
            }
        }

        /// <summary>
        /// Submits or updates the activity report and occurrence log for an active or completed duty shift.
        /// </summary>
        /// <param name="id">Unique identifier of the shift.</param>
        /// <param name="request">Duty report summary details.</param>
        /// <param name="ct">Cancellation token.</param>
        /// <returns>Success confirmation boolean.</returns>
        [HttpPost("shifts/{id:guid}/duty-report")]
        public async Task<ActionResult<ApiResponse<bool>>> SubmitShiftDutyReport(Guid id, [FromBody] MemberShiftDutyReportRequest request, CancellationToken ct)
        {
            var shift = await _db.BcpShifts.FirstOrDefaultAsync(s => s.Id == id && s.TenantKey == CurrentTenantKey, ct);
            if (shift == null)
            {
                return NotFound(ApiResponse<bool>.FailureResponse("Shift record not found.", errorCode: "ERR-2004"));
            }

            // Ensure the shift belongs to current user or attendance record matches current user
            if (!string.Equals(shift.AssignedUserId, CurrentUserId, StringComparison.OrdinalIgnoreCase))
            {
                var isAttendanceUser = await _db.BcpShiftAttendances.AnyAsync(a => a.ShiftId == id && a.UserId == CurrentUserId && a.TenantKey == CurrentTenantKey, ct);
                if (!isAttendanceUser)
                {
                    return Forbid();
                }
            }

            shift.ReportContent = request.ReportContent;
            shift.ReportSubmissionUtc = DateTime.UtcNow;
            shift.UpdatedUtc = DateTime.UtcNow;

            await _db.SaveChangesAsync(ct);
            return Ok(ApiResponse<bool>.SuccessResponse(true, "Shift duty report submitted successfully."));
        }

        /// <summary>
        /// Dispatches an immediate high-priority Emergency SOS alert across SMS, Email, WhatsApp, and Web Push notifications
        /// to operations administration, supervisors, and incident response controllers.
        /// </summary>
        /// <param name="id">Unique identifier of the shift where the emergency occurred.</param>
        /// <param name="request">Emergency incident details including category, description, and GPS coordinates.</param>
        /// <param name="ct">Cancellation token.</param>
        /// <returns>Success confirmation boolean.</returns>
        [HttpPost("shifts/{id:guid}/emergency-sos")]
        public async Task<ActionResult<ApiResponse<bool>>> DispatchEmergencySos(Guid id, [FromBody] MemberEmergencySosRequest request, CancellationToken ct)
        {
            var shift = await _db.BcpShifts
                .Include(s => s.ClientSite)
                .FirstOrDefaultAsync(s => s.Id == id && s.TenantKey == CurrentTenantKey, ct);

            if (shift == null)
            {
                return NotFound(ApiResponse<bool>.FailureResponse("Shift record not found.", errorCode: "ERR-2004"));
            }

            var siteName = shift.ClientSite?.SiteName ?? "Assigned Site";
            var postName = shift.PostName ?? "Main Post";
            var categoryName = !string.IsNullOrWhiteSpace(request.CategoryName) ? request.CategoryName.Trim() : "Security Incident";
            var timeUtc = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss");

            var locationString = (request.Latitude.HasValue && request.Longitude.HasValue)
                ? $"{request.Latitude.Value:F5}, {request.Longitude.Value:F5}"
                : "GPS unavailable";

            var alertTitle = $"🚨 CRITICAL SOS: {categoryName} at {siteName}";
            var alertMessage = $"URGENT EMERGENCY ALERT: Officer {CurrentUserName} engaged panic alert at {siteName} ({postName}). Category: {categoryName}. Details: {request.Description}. Location: {locationString}. Time: {timeUtc} UTC.";

            // 1. Log incident permanently into Shift occurrence / duty report
            var incidentLogEntry = $"\n[{timeUtc} UTC] 🚨 EMERGENCY SOS TRIGGERED: {categoryName}\nOfficer: {CurrentUserName}\nDetails: {request.Description}\nGPS: {locationString}\n";
            shift.ReportContent = string.IsNullOrWhiteSpace(shift.ReportContent)
                ? incidentLogEntry
                : shift.ReportContent + "\n" + incidentLogEntry;
            shift.UpdatedUtc = DateTime.UtcNow;

            await _db.SaveChangesAsync(ct);

            // 2. Dispatch across ALL channels simultaneously (SMS, Email, WhatsApp, Push) via CentralNotificationDispatcher
            if (_notificationDispatcher != null)
            {
                try
                {
                    await _notificationDispatcher.DispatchAsync(new NotificationDispatchPayload
                    {
                        TargetType = NotificationDispatchTarget.BroadcastAll,
                        TenantKey = CurrentTenantKey,
                        Title = alertTitle,
                        Message = alertMessage,
                        Category = BcpMessageCategory.Security,
                        Severity = NotificationSeverity.Error,
                        Channels = NotificationChannels.All,
                        Module = "Workforce",
                        Icon = "emergency",
                        ActionUrl = "/workforce/console/live"
                    }, ct);
                }
                catch (Exception ex)
                {
                    _logger?.LogError(ex, "Failed to broadcast Emergency SOS notifications for shift {ShiftId}", id);
                }
            }

            return Ok(ApiResponse<bool>.SuccessResponse(true, "Emergency SOS broadcasted successfully across SMS, Email, WhatsApp, and Push notifications."));
        }

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

        private async Task NotifySupervisorsOrAdminsAsync(
            string? supervisorTarget,
            NotificationDispatchPayload payload,
            CancellationToken ct)
        {
            if (_notificationDispatcher == null) return;

            var targetId = supervisorTarget;
            if (string.IsNullOrWhiteSpace(targetId))
            {
                var admin = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id != CurrentUserId, ct);
                targetId = admin?.Id;
            }

            if (!string.IsNullOrWhiteSpace(targetId))
            {
                payload.TargetType = NotificationDispatchTarget.SingleUser;
                payload.TargetUserId = targetId;
                await _notificationDispatcher.DispatchAsync(payload, ct);
            }
        }

        private static double ToRadians(double degrees) => degrees * Math.PI / 180.0;
    }

    /// <summary>
    /// Payload submitted by a rostered staff member to record duty report activity, occurrence checks, or handover remarks.
    /// </summary>
    public class MemberShiftDutyReportRequest
    {
        /// <summary>
        /// Textual summary of duty checks, occurrence observations, access control logs, and handover remarks.
        /// </summary>
        public string ReportContent { get; set; } = string.Empty;
    }

    /// <summary>
    /// Payload dispatched by a staff member on active duty to trigger a critical emergency SOS security broadcast.
    /// </summary>
    public class MemberEmergencySosRequest
    {
        /// <summary>
        /// Identifier of the dynamic emergency category selected by the staff member.
        /// </summary>
        public string CategoryId { get; set; } = string.Empty;

        /// <summary>
        /// Display title or classification of the incident (e.g. Intruder, Violence, Fire).
        /// </summary>
        public string CategoryName { get; set; } = string.Empty;

        /// <summary>
        /// Severity classification (e.g. Critical, High).
        /// </summary>
        public string Severity { get; set; } = "Critical";

        /// <summary>
        /// Urgent incident description or assistance requirements submitted by the staff member.
        /// </summary>
        public string Description { get; set; } = string.Empty;

        /// <summary>
        /// Optional GPS latitude of the staff member when the SOS trigger was engaged.
        /// </summary>
        public double? Latitude { get; set; }

        /// <summary>
        /// Optional GPS longitude of the staff member when the SOS trigger was engaged.
        /// </summary>
        public double? Longitude { get; set; }
    }
}
